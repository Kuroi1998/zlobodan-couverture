import { z } from "zod";
import { normalizeEmail, normalizePhone, normalizeText } from "./normalize";
import {
  INTERVENTION_TYPES,
  ROOF_TYPES,
  SURFACE_RANGES,
} from "@/domain/quote-options";

const boundedText = (max: number) =>
  z.string().transform(normalizeText).pipe(z.string().max(max));

const BelgianPostalCode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{3}$/, "Code postal belge invalide (4 chiffres).");

const PhoneNumber = z
  .string()
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .min(8, "Numéro de téléphone trop court.")
      .max(16, "Numéro de téléphone trop long.")
      .regex(/^\+?\d{8,15}$/, "Numéro de téléphone invalide.")
  );

const CheckboxBoolean = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value;
  return ["true", "on", "1", "yes"].includes(value.trim().toLowerCase());
});

export { INTERVENTION_TYPES, ROOF_TYPES, SURFACE_RANGES };

/**
 * Schéma partagé par le navigateur et la route publique. Les listes fermées
 * viennent du vocabulaire métier unique de `domain/quote-options`.
 */
export const QuoteRequestSchema = z
  .object({
    interventionType: z.enum(INTERVENTION_TYPES),
    roofType: z.enum(ROOF_TYPES),
    surface: z.enum(SURFACE_RANGES),
    isUrgent: CheckboxBoolean.default(false),
    postalCode: BelgianPostalCode,
    city: boundedText(100).pipe(z.string().min(1, "Ville requise.")),
    fullName: boundedText(120).pipe(z.string().min(2, "Nom requis.")),
    phone: PhoneNumber,
    email: z
      .string()
      .transform(normalizeEmail)
      .pipe(z.string().email("Adresse email invalide.").max(255)),
    description: boundedText(2000).optional().default(""),
    rgpdConsent: CheckboxBoolean.refine((value) => value, {
      message: "Le consentement au traitement des données est requis.",
    }),
    captchaToken: z.string().max(2048).optional(),
  })
  .strict();

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;

export const QuoteDraftSchema = QuoteRequestSchema.partial()
  .omit({ captchaToken: true, rgpdConsent: true })
  .extend({ rgpdConsent: z.boolean().optional() })
  .strict();

export type QuoteDraftInput = z.infer<typeof QuoteDraftSchema>;

export const HONEYPOT_FIELD = "website_url";
