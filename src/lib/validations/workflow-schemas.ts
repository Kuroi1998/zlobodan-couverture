import { z } from "zod";
import {
  CONTACT_MESSAGE_STATUSES,
  QUOTE_REQUEST_STATUSES,
} from "@/domain/request-workflow";
import { normalizeText } from "./normalize";

const optionalText = (maximum: number) =>
  z.string().transform(normalizeText).pipe(z.string().max(maximum)).optional();

export const ContactWorkflowUpdateSchema = z
  .object({
    status: z.enum(CONTACT_MESSAGE_STATUSES),
    reason: optionalText(500),
    internalNotes: optionalText(5000),
    assignedToUserId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const QuoteRequestWorkflowUpdateSchema = z
  .object({
    status: z.enum(QUOTE_REQUEST_STATUSES),
    reason: optionalText(500),
    internalNotes: optionalText(5000),
    assignedToUserId: z.string().uuid().nullable().optional(),
  })
  .strict();
