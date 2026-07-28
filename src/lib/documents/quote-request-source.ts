import "server-only";
import crypto from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteAttachments, quoteRequests } from "@/db/schema/quotes";
import { companyIdentity, formatRegisteredAddress, insuranceCoverage } from "@/config/company";
import {
  interventionLabel,
  quoteRequestLabel,
  roofLabel,
  surfaceLabel,
} from "@/domain/request-labels";
import type { CompanyPdfIdentity, QuoteRequestSummaryModel } from "./models";

/**
 * Projection d'une demande PostgreSQL vers le modèle documentaire.
 *
 * Point de passage obligé entre la base et le gabarit. Les colonnes qui n'ont
 * pas à figurer sur un document remis au client — `submissionKey`,
 * `assignedToUserId`, les identifiants techniques — ne sont tout simplement pas
 * sélectionnées : elles ne peuvent donc pas fuiter par distraction.
 *
 * Aucune valeur ne provient de la requête HTTP. L'appelant fournit un
 * identifiant de demande ; tout le reste est relu ici.
 */

/** Partie du modèle connue avant d'attribuer une référence et un numéro de version. */
export type QuoteRequestSummaryBase = Omit<
  QuoteRequestSummaryModel,
  "documentReference" | "versionNumber" | "generatedAt"
>;

export interface QuoteRequestSource {
  readonly requestId: string;
  /**
   * Propriétaire du document à produire.
   *
   * Nul lorsque la demande a été déposée sans compte. Un document sans
   * propriétaire ne peut pas être rattaché à un espace client : l'appelant doit
   * refuser la génération plutôt que d'inventer un titulaire.
   */
  readonly ownerUserId: string | null;
  readonly assignedToUserId: string | null;
  readonly reference: string;
  /**
   * Empreinte des données ayant servi à la génération.
   *
   * Sert uniquement l'idempotence : si elle n'a pas bougé, régénérer
   * produirait le même document et l'on réutilise la version existante. Ce
   * n'est en aucun cas un mécanisme d'autorisation.
   */
  readonly fingerprint: string;
  readonly base: QuoteRequestSummaryBase;
}

/**
 * Identité imprimée sur le document.
 *
 * Ne reprend que les valeurs déclarées vérifiées. Un champ absent n'est pas
 * remplacé par un texte de substitution : il ne s'imprime pas.
 */
function pdfCompanyIdentity(): CompanyPdfIdentity {
  const insurance =
    insuranceCoverage.insurerName && insuranceCoverage.policyNumber
      ? `${insuranceCoverage.coverageLabel ?? "Assurance"} ${insuranceCoverage.insurerName} — police ${insuranceCoverage.policyNumber}`
      : null;

  return {
    name: companyIdentity.tradeName,
    address: formatRegisteredAddress(),
    vatNumber: companyIdentity.vatNumber,
    phone: companyIdentity.publicPhoneLabel,
    email: companyIdentity.publicEmail,
    insurance,
  };
}

/**
 * Empreinte stable des données sources.
 *
 * Construite sur un objet canonique explicite plutôt que sur la ligne entière :
 * `updated_at` bouge à chaque écriture, y compris pour un champ absent du
 * document, et déclencherait des versions inutiles. Ne comptent ici que les
 * valeurs réellement imprimées.
 */
function computeFingerprint(
  base: QuoteRequestSummaryBase,
  requestId: string
): string {
  const canonical = JSON.stringify({
    requestId,
    reference: base.request.reference,
    status: base.request.statusLabel,
    urgent: base.request.isUrgent,
    submittedAt: base.request.submittedAt?.toISOString() ?? null,
    customer: base.customer,
    project: base.project,
    attachments: base.attachments.map((attachment) => ({
      name: attachment.name,
      size: attachment.sizeBytes,
    })),
  });

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export async function loadQuoteRequestSource(
  requestId: string
): Promise<QuoteRequestSource | null> {
  const rows = await db
    .select({
      id: quoteRequests.id,
      reference: quoteRequests.reference,
      userId: quoteRequests.userId,
      assignedToUserId: quoteRequests.assignedToUserId,
      fullName: quoteRequests.fullName,
      email: quoteRequests.email,
      phone: quoteRequests.phone,
      city: quoteRequests.city,
      postalCode: quoteRequests.postalCode,
      interventionType: quoteRequests.interventionType,
      roofType: quoteRequests.roofType,
      surface: quoteRequests.surface,
      isUrgent: quoteRequests.isUrgent,
      description: quoteRequests.description,
      status: quoteRequests.status,
      submittedAt: quoteRequests.submittedAt,
      createdAt: quoteRequests.createdAt,
    })
    .from(quoteRequests)
    .where(eq(quoteRequests.id, requestId))
    .limit(1);

  const request = rows[0];
  if (!request) return null;

  const attachments = await db
    .select({
      originalName: quoteAttachments.originalName,
      sizeBytes: quoteAttachments.sizeBytes,
      createdAt: quoteAttachments.createdAt,
    })
    .from(quoteAttachments)
    .where(
      and(
        eq(quoteAttachments.quoteRequestId, request.id),
        // Une pièce supprimée ne doit pas réapparaître dans un document.
        isNull(quoteAttachments.deletedAt)
      )
    )
    .orderBy(asc(quoteAttachments.createdAt));

  const base: QuoteRequestSummaryBase = {
    company: pdfCompanyIdentity(),
    request: {
      reference: request.reference,
      submittedAt: request.submittedAt ?? request.createdAt,
      statusLabel: quoteRequestLabel(request.status),
      isUrgent: request.isUrgent,
    },
    customer: {
      fullName: request.fullName,
      email: request.email,
      phone: request.phone,
      city: request.city,
      postalCode: request.postalCode,
    },
    project: {
      interventionLabel: interventionLabel(request.interventionType),
      roofLabel: roofLabel(request.roofType),
      surfaceLabel: surfaceLabel(request.surface),
      description: request.description,
    },
    attachments: attachments.map((attachment) => ({
      name: attachment.originalName,
      sizeBytes: attachment.sizeBytes,
      uploadedAt: attachment.createdAt,
    })),
  };

  return {
    requestId: request.id,
    ownerUserId: request.userId,
    assignedToUserId: request.assignedToUserId,
    reference: request.reference,
    fingerprint: computeFingerprint(base, request.id),
    base,
  };
}
