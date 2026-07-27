import { z } from "zod";
import {
  CONTACT_MESSAGE_STATUSES,
  QUOTE_REQUEST_STATUSES,
} from "@/domain/request-workflow";
import { normalizeText } from "./normalize";

/**
 * Mise à jour du flux de travail.
 *
 * Les notes internes ne figurent plus ici : elles ont leur propre point de
 * terminaison et leur propre table. Les mélanger au changement de statut
 * faisait qu'enregistrer une transition écrasait la note de l'opérateur
 * précédent, sans que personne ne l'ait demandé.
 */

const optionalText = (maximum: number) =>
  z.string().transform(normalizeText).pipe(z.string().max(maximum)).optional();

export const ContactWorkflowUpdateSchema = z
  .object({
    status: z.enum(CONTACT_MESSAGE_STATUSES),
    reason: optionalText(500),
    assignedToUserId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const QuoteRequestWorkflowUpdateSchema = z
  .object({
    status: z.enum(QUOTE_REQUEST_STATUSES),
    reason: optionalText(500),
    assignedToUserId: z.string().uuid().nullable().optional(),
  })
  .strict();
