import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages, contactStatusHistory } from "@/db/schema/contacts";
import { notificationOutbox } from "@/db/schema/notifications";
import { users } from "@/db/schema/users";
import type {
  ContactMessageStatus,
} from "@/domain/request-workflow";
import {
  canTransitionContactMessage,
} from "@/domain/request-workflow";
import { PRIVACY_POLICY_VERSION } from "@/domain/privacy";
import { siteConfig } from "@/config/site";
import type { ContactMessageInput } from "@/lib/validations/contact-schemas";
import { reservePublicReference } from "@/lib/db/public-references";
import {
  DuplicateSubmissionError,
  isPostgresUniqueViolation,
} from "./submission-errors";

export interface CreateContactMessageParams {
  input: ContactMessageInput;
  submissionKey: string;
  userId: string | null;
}

export async function findContactSubmission(
  submissionKey: string
): Promise<{ id: string; reference: string } | null> {
  const rows = await db
    .select({ id: contactMessages.id, reference: contactMessages.reference })
    .from(contactMessages)
    .where(eq(contactMessages.submissionKey, submissionKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function createContactMessage(
  params: CreateContactMessageParams
): Promise<{ id: string; reference: string }> {
  const existing = await findContactSubmission(params.submissionKey);
  if (existing) throw new DuplicateSubmissionError(existing.reference);

  const now = new Date();
  try {
    return await db.transaction(async (transaction) => {
      const reference = await reservePublicReference(transaction, "contact", now);
      const rows = await transaction
        .insert(contactMessages)
        .values({
          reference,
          submissionKey: params.submissionKey,
          fullName: params.input.fullName,
          email: params.input.email,
          phone: params.input.phone,
          subject: params.input.subject,
          message: params.input.message,
          status: "new",
          source: "website",
          userId: params.userId,
          consentPrivacy: params.input.consentPrivacy,
          consentAt: now,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: contactMessages.id, reference: contactMessages.reference });

      const created = rows[0];
      if (!created) throw new Error("Insertion du contact non confirmée.");

      await transaction.insert(contactStatusHistory).values({
        contactMessageId: created.id,
        previousStatus: null,
        newStatus: "new",
        reason: "Soumission du formulaire public",
        createdAt: now,
      });

      await transaction.insert(notificationOutbox).values([
        {
          eventType: "contact.created.admin",
          entityType: "contact_message",
          entityId: created.id,
          recipient: siteConfig.email,
          payload: { reference },
        },
        {
          eventType: "contact.created.receipt",
          entityType: "contact_message",
          entityId: created.id,
          recipient: params.input.email,
          payload: { reference },
        },
      ]);

      return created;
    });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      const duplicate = await findContactSubmission(params.submissionKey);
      if (duplicate) throw new DuplicateSubmissionError(duplicate.reference);
    }
    throw error;
  }
}

export interface ChangeContactStatusParams {
  contactMessageId: string;
  newStatus: ContactMessageStatus;
  changedByUserId: string;
  reason?: string;
  internalNotes?: string;
  assignedToUserId?: string | null;
}

export async function changeContactStatus(params: ChangeContactStatusParams): Promise<void> {
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
    if (!actor[0]) throw new Error("CONTACT_ACTOR_FORBIDDEN");
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
      if (!assignee[0]) throw new Error("CONTACT_ASSIGNEE_INVALID");
    }
    const rows = await transaction
      .select({ status: contactMessages.status })
      .from(contactMessages)
      .where(eq(contactMessages.id, params.contactMessageId))
      .limit(1);
    const current = rows[0]?.status;
    if (!current) throw new Error("CONTACT_NOT_FOUND");
    if (current !== params.newStatus && !canTransitionContactMessage(current, params.newStatus)) {
      throw new Error("CONTACT_TRANSITION_FORBIDDEN");
    }

    const now = new Date();
    const updated = await transaction
      .update(contactMessages)
      .set({
        status: params.newStatus,
        internalNotes: params.internalNotes,
        assignedToUserId: params.assignedToUserId,
        updatedAt: now,
        ...(current === "new" && params.newStatus !== "new" ? { readAt: now } : {}),
        ...(params.newStatus === "replied" ? { repliedAt: now } : {}),
        ...(params.newStatus === "archived" ? { archivedAt: now } : {}),
      })
      .where(and(eq(contactMessages.id, params.contactMessageId), eq(contactMessages.status, current)))
      .returning({ id: contactMessages.id });
    if (updated.length === 0) throw new Error("CONTACT_CONFLICT");

    if (current !== params.newStatus) {
      await transaction.insert(contactStatusHistory).values({
        contactMessageId: params.contactMessageId,
        previousStatus: current,
        newStatus: params.newStatus,
        changedByUserId: params.changedByUserId,
        reason: params.reason,
        createdAt: now,
      });
    }
  });
}

export async function listRecentContactMessages(limit = 20) {
  return db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
