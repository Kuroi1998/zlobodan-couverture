import { z } from "zod";
import { DOCUMENT_TYPES } from "@/db/schema/documents";

/**
 * Validation des demandes de génération.
 *
 * Le type de document est une **union fermée** dérivée du schéma de base, pas
 * une chaîne libre. Accepter un type arbitraire reviendrait à laisser le
 * navigateur choisir quel gabarit exécuter, et à faire échouer la contrainte
 * `CHECK` de PostgreSQL au lieu de refuser proprement en amont.
 *
 * Ce qui n'apparaît volontairement **pas** ici est aussi important que ce qui
 * s'y trouve : ni `ownerUserId`, ni `storageKey`, ni `reference`, ni
 * `visibility`. Ces valeurs engagent la propriété et l'emplacement du document ;
 * elles sont déterminées côté serveur et ne sont jamais reçues.
 */
export const GenerateDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES).default("quote_request_summary"),
  /**
   * Force une nouvelle version alors même que les données n'ont pas changé.
   *
   * Absent ou faux, la génération est idempotente et rend la version en place.
   */
  force: z.boolean().optional().default(false),
});

export type GenerateDocumentInput = z.infer<typeof GenerateDocumentSchema>;
