import "server-only";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteRequests, quoteStatusHistory } from "@/db/schema/quotes";
import { PRIVACY_POLICY_VERSION } from "@/domain/privacy";
import { QUOTE_DRAFT_RETENTION_DAYS } from "@/domain/request-workflow";
import { reservePublicReference } from "@/lib/db/public-references";
import type { QuoteDraftInput } from "@/lib/validations/quote-schemas";

const DRAFT_MAX_AGE_MS =
  QUOTE_DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

export class QuoteDraftNotFoundError extends Error {
  constructor() {
    super("Brouillon introuvable.");
    this.name = "QuoteDraftNotFoundError";
  }
}

export interface QuoteDraftView {
  id: string;
  reference: string;
  interventionType: string;
  roofType: string;
  surface: string;
  isUrgent: boolean;
  postalCode: string;
  city: string;
  fullName: string;
  phone: string;
  email: string;
  description: string | null;
  consentPrivacy: boolean;
  updatedAt: Date;
}

export async function getLatestQuoteDraft(
  userId: string
): Promise<QuoteDraftView | null> {
  const rows = await db
    .select({
      id: quoteRequests.id,
      reference: quoteRequests.reference,
      interventionType: quoteRequests.interventionType,
      roofType: quoteRequests.roofType,
      surface: quoteRequests.surface,
      isUrgent: quoteRequests.isUrgent,
      postalCode: quoteRequests.postalCode,
      city: quoteRequests.city,
      fullName: quoteRequests.fullName,
      phone: quoteRequests.phone,
      email: quoteRequests.email,
      description: quoteRequests.description,
      consentPrivacy: quoteRequests.consentPrivacy,
      updatedAt: quoteRequests.updatedAt,
    })
    .from(quoteRequests)
    .where(
      and(
        eq(quoteRequests.userId, userId),
        eq(quoteRequests.status, "draft"),
        gt(quoteRequests.updatedAt, new Date(Date.now() - DRAFT_MAX_AGE_MS))
      )
    )
    .orderBy(desc(quoteRequests.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

interface SaveQuoteDraftParams {
  draftId?: string;
  submissionKey: string;
  userId: string;
  input: QuoteDraftInput;
}

function draftUpdates(input: QuoteDraftInput, now: Date) {
  return {
    updatedAt: now,
    ...(input.interventionType !== undefined
      ? { interventionType: input.interventionType }
      : {}),
    ...(input.roofType !== undefined ? { roofType: input.roofType } : {}),
    ...(input.surface !== undefined ? { surface: input.surface } : {}),
    ...(input.isUrgent !== undefined ? { isUrgent: input.isUrgent } : {}),
    ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.description !== undefined
      ? { description: input.description || null }
      : {}),
    ...(input.rgpdConsent !== undefined
      ? {
          consentPrivacy: input.rgpdConsent,
          consentAt: input.rgpdConsent ? now : null,
          privacyPolicyVersion: input.rgpdConsent
            ? PRIVACY_POLICY_VERSION
            : null,
        }
      : {}),
  };
}

export async function saveQuoteDraft(
  params: SaveQuoteDraftParams
): Promise<{ id: string; reference: string }> {
  const now = new Date();
  if (params.draftId) {
    const rows = await db
      .update(quoteRequests)
      .set(draftUpdates(params.input, now))
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
    if (!rows[0]) throw new QuoteDraftNotFoundError();
    return rows[0];
  }

  return db.transaction(async (transaction) => {
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
        fullName: "",
        email: "",
        phone: "",
        city: "",
        postalCode: "",
        interventionType: inputOr(params.input.interventionType, "refection"),
        roofType: inputOr(params.input.roofType, "ardoise"),
        surface: inputOr(params.input.surface, "50-100"),
        isUrgent: params.input.isUrgent ?? false,
        description: params.input.description || null,
        status: "draft",
        consentPrivacy: params.input.rgpdConsent ?? false,
        consentAt: params.input.rgpdConsent ? now : null,
        privacyPolicyVersion: params.input.rgpdConsent
          ? PRIVACY_POLICY_VERSION
          : null,
        createdAt: now,
        ...draftUpdates(params.input, now),
      })
      .returning({
        id: quoteRequests.id,
        reference: quoteRequests.reference,
      });
    const created = rows[0];
    if (!created) throw new Error("Création du brouillon non confirmée.");
    await transaction.insert(quoteStatusHistory).values({
      quoteRequestId: created.id,
      previousStatus: null,
      newStatus: "draft",
      reason: "Création du brouillon client",
      changedByUserId: params.userId,
      createdAt: now,
    });
    return created;
  });
}

function inputOr<T extends string>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}

export async function deleteQuoteDraft(
  draftId: string,
  userId: string
): Promise<void> {
  const rows = await db
    .delete(quoteRequests)
    .where(
      and(
        eq(quoteRequests.id, draftId),
        eq(quoteRequests.userId, userId),
        eq(quoteRequests.status, "draft")
      )
    )
    .returning({ id: quoteRequests.id });
  if (!rows[0]) throw new QuoteDraftNotFoundError();
}
