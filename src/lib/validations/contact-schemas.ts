import { z } from "zod";
import { normalizeEmail, normalizePhone, normalizeText } from "./normalize";

export const CONTACT_SUBJECTS = [
  "general",
  "emergency",
  "follow_up",
  "complaint",
  "other",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

const requiredText = (minimum: number, maximum: number, message: string) =>
  z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(minimum, message).max(maximum));

const CheckboxBoolean = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value;
  return ["true", "on", "1", "yes"].includes(value.trim().toLowerCase());
});

export const ContactMessageSchema = z
  .object({
    fullName: requiredText(2, 120, "Nom requis."),
    email: z.string().transform(normalizeEmail).pipe(z.string().email().max(255)),
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(
        z
          .string()
          .min(8, "Numéro de téléphone trop court.")
          .max(30)
          .regex(/^\+?\d{8,15}$/, "Numéro de téléphone invalide.")
      ),
    subject: z.enum(CONTACT_SUBJECTS),
    message: requiredText(10, 5000, "Votre message doit contenir au moins 10 caractères."),
    consentPrivacy: CheckboxBoolean.refine((value) => value, {
      message: "Le consentement au traitement des données est requis.",
    }),
    captchaToken: z.string().max(2048).optional(),
  })
  .strict();

export type ContactMessageInput = z.infer<typeof ContactMessageSchema>;

export const CONTACT_HONEYPOT_FIELD = "company_website";
