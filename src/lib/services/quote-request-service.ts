import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  quoteAttachments,
  quoteRequests,
  quoteStatusHistory,
} from "@/db/schema/quotes";
import { notificationOutbox } from "@/db/schema/notifications";
import { users } from "@/db/schema/users";
import type { QuoteRequestStatus } from "@/domain/request-workflow";
import { canTransitionQuoteRequest } from "@/domain/request-workflow";
import { PRIVACY_POLICY_VERSION } from "@/domain/privacy";
import { siteConfig } from "@/config/site";
import type { QuoteRequestInput } from "@/lib/validations/quote-schemas";
import { reservePublicReference } from "@/lib/db/public-references";
import {
  assertBatchWithinLimits,
  prepareSecureUpload,
  type PreparedUpload,
  type SecureUploadInput,
} from "@/lib/security/upload-service";
import {
  deletePrivateObject,
  putPrivateObject,
} from "@/lib/storage/private-object-store";
import { recordSecurityEvent } from "@/lib/security/security-events";
import {
  DuplicateSubmissionError,
  InvalidQuoteDraftError,
  isPostgresUniqueViolation,
} from "./submission-errors";

export interface SubmitQuoteRequestParams {
  input: QuoteRequestInput;
  submissionKey: string;
  userId: string | null;
  files: SecureUploadInput[];
  draftId?: string;
}

export async function findQuoteRequestSubmission(
  submissionKey: string
): Promise<{
  id: string;
  reference: string;
  status: QuoteRequestStatus;
  userId: string | null;
} | null> {
  const rows = await db
    .select({
      id: quoteRequests.id,
      reference: quoteRequests.reference,
      status: quoteRequests.status,
      userId: quoteRequests.userId,
    })
    .from(quoteRequests)
    .where(eq(quoteRequests.submissionKey, submissionKey))
    .limit(1);
  return rows[0] ?? null;
}

async function removeStoredObjects(files: readonly PreparedUpload[]): Promise<void> {
  const failures: string[] = [];
  await Promise.all(
    files.map(async (file) => {
      try {
        await deletePrivateObject(file.storageKey);
      } catch {
        failures.push(file.storageKey);
      }
    })
  );
  if (failures.length > 0) {
    await recordSecurityEvent({
      kind: "UPLOAD_ORPHANED",
      severity: "high",
      detail: { count: failures.length },
    });
  }
}

export async function submitQuoteRequest(
  params: SubmitQuoteRequestParams
): Promise<{ id: string; reference: string; attachmentCount: number }> {
  const existing = await findQuoteRequestSubmission(params.submissionKey);
  if (
    existing &&
    (existing.id !== params.draftId || existing.status !== "draft")
  ) {
    throw new DuplicateSubmissionError(existing.reference);
  }

  if (params.draftId) {
    if (!params.userId) throw new InvalidQuoteDraftError();
    const draft = await db
      .select({ id: quoteRequests.id })
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.id, params.draftId),
          eq(quoteRequests.status, "draft"),
          eq(quoteRequests.userId, params.userId)
        )
      )
      .limit(1);
    if (!draft[0]) throw new InvalidQuoteDraftError();
  }

  await assertBatchWithinLimits(params.files.map((file) => ({ size: file.buffer.length })));

  const prepared: PreparedUpload[] = [];
  try {
    for (const file of params.files) {
      prepared.push(await prepareSecureUpload(file));
    }
    for (const file of prepared) {
      await putPrivateObject(file.storageKey, file.buffer, file.mimeType);
    }
  } catch (error) {
    await removeStoredObjects(prepared);
    throw error;
  }

  const now = new Date();
  try {
    const created = await db.transaction(async (transaction) => {
      let request: { id: string; reference: string } | undefined;
      if (params.draftId && params.userId) {
        const rows = await transaction
          .update(quoteRequests)
          .set({
            submissionKey: params.submissionKey,
            fullName: params.input.fullName,
            email: params.input.email,
            phone: params.input.phone,
            city: params.input.city,
            postalCode: params.input.postalCode,
            interventionType: params.input.interventionType,
            roofType: params.input.roofType,
            surface: params.input.surface,
            isUrgent: params.input.isUrgent,
            description: params.input.description || null,
            status: "submitted",
            consentPrivacy: params.input.rgpdConsent,
            consentAt: now,
            privacyPolicyVersion: PRIVACY_POLICY_VERSION,
            submittedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(quoteRequests.id, params.draftId),
              eq(quoteRequests.userId, params.userId),
              eq(quoteRequests.status, "draft")
            )
          )
          .returning({
            id: quoteRequests.id,
            reference: quoteRequests.reference,
          });
        request = rows[0];
      } else {
        const reference = await reservePublicReference(
          transaction,
          "quote_request",
          now
        );
        const rows = await transaction
          .insert(quoteRequests)
          .values({
            reference,
            submissionKey: params.submissionKey,
            userId: params.userId,
            fullName: params.input.fullName,
            email: params.input.email,
            phone: params.input.phone,
            city: params.input.city,
            postalCode: params.input.postalCode,
            interventionType: params.input.interventionType,
            roofType: params.input.roofType,
            surface: params.input.surface,
            isUrgent: params.input.isUrgent,
            description: params.input.description || null,
            status: "submitted",
            consentPrivacy: params.input.rgpdConsent,
            consentAt: now,
            privacyPolicyVersion: PRIVACY_POLICY_VERSION,
            submittedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning({
            id: quoteRequests.id,
            reference: quoteRequests.reference,
          });
        request = rows[0];
      }
      if (!request && params.draftId) throw new InvalidQuoteDraftError();
      if (!request) throw new Error("Insertion de la demande non confirmée.");

      if (prepared.length > 0) {
        await transaction.insert(quoteAttachments).values(
          prepared.map((file) => ({
            quoteRequestId: request.id,
            storageKey: file.storageKey,
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            width: file.width,
            height: file.height,
            checksum: file.checksum,
            uploadedByUserId: params.userId,
          }))
        );
      }

      await transaction.insert(quoteStatusHistory).values({
        quoteRequestId: request.id,
        previousStatus: params.draftId ? "draft" : null,
        newStatus: "submitted",
        reason: params.draftId
          ? "Soumission du brouillon client"
          : "Soumission du formulaire public",
        createdAt: now,
      });

      await transaction.insert(notificationOutbox).values([
        {
          eventType: "quote_request.created.admin",
          entityType: "quote_request",
          entityId: request.id,
          recipient: siteConfig.email,
          payload: { reference: request.reference },
        },
        {
          eventType: "quote_request.created.receipt",
          entityType: "quote_request",
          entityId: request.id,
          recipient: params.input.email,
          payload: { reference: request.reference },
        },
      ]);

      return request;
    });

    return { ...created, attachmentCount: prepared.length };
  } catch (error) {
    await removeStoredObjects(prepared);
    if (isPostgresUniqueViolation(error)) {
      const duplicate = await findQuoteRequestSubmission(params.submissionKey);
      if (duplicate) throw new DuplicateSubmissionError(duplicate.reference);
    }
    throw error;
  }
}

export interface ChangeQuoteRequestStatusParams {
  quoteRequestId: string;
  newStatus: QuoteRequestStatus;
  changedByUserId: string;
  reason?: string;
  internalNotes?: string;
  assignedToUserId?: string | null;
}

export async function changeQuoteRequestStatus(
  params: ChangeQuoteRequestStatusParams
): Promise<void> {
  await db.transaction(async (transaction) => {
    const actor = await transaction
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, params.changedByUserId),
          inArray(users.role, ["staff", "admin"]),
          isNull(users.deletedAt)
        )
      )
      .limit(1);
    if (!actor[0]) throw new Error("QUOTE_ACTOR_FORBIDDEN");
    if (params.assignedToUserId) {
      const assignee = await transaction
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, params.assignedToUserId),
            inArray(users.role, ["staff", "admin"]),
            isNull(users.deletedAt)
          )
        )
        .limit(1);
      if (!assignee[0]) throw new Error("QUOTE_ASSIGNEE_INVALID");
    }
    const rows = await transaction
      .select({ status: quoteRequests.status })
      .from(quoteRequests)
      .where(eq(quoteRequests.id, params.quoteRequestId))
      .limit(1);
    const current = rows[0]?.status;
    if (!current) throw new Error("QUOTE_REQUEST_NOT_FOUND");
    if (current !== params.newStatus && !canTransitionQuoteRequest(current, params.newStatus)) {
      throw new Error("QUOTE_REQUEST_TRANSITION_FORBIDDEN");
    }

    const updated = await transaction
      .update(quoteRequests)
      .set({
        status: params.newStatus,
        internalNotes: params.internalNotes,
        assignedToUserId: params.assignedToUserId,
        updatedAt: new Date(),
      })
      .where(and(eq(quoteRequests.id, params.quoteRequestId), eq(quoteRequests.status, current)))
      .returning({ id: quoteRequests.id });
    if (updated.length === 0) throw new Error("QUOTE_REQUEST_CONFLICT");

    if (current !== params.newStatus) {
      await transaction.insert(quoteStatusHistory).values({
        quoteRequestId: params.quoteRequestId,
        previousStatus: current,
        newStatus: params.newStatus,
        changedByUserId: params.changedByUserId,
        reason: params.reason,
      });
    }
  });
}

export async function listRecentQuoteRequests(limit = 20) {
  return db
    .select()
    .from(quoteRequests)
    .orderBy(desc(quoteRequests.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
