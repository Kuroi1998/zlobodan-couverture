import { z } from "zod";
import { stripControlChars } from "./identifiers";

/**
 * Validation de la demande de devis publique.
 *
 * La route lisait auparavant ses champs par `formData.get(...) as string` — un
 * transtypage TypeScript, qui ne valide rien à l'exécution et vaut `null` si le
 * champ est absent (audit H7). Chaque champ est désormais borné en longueur et
 * en forme, ce qui limite aussi le volume qu'un automate peut faire stocker.
 */

const boundedText = (max: number) =>
  z.string().transform(stripControlChars).pipe(z.string().trim().max(max));

/** Code postal belge : quatre chiffres, de 1000 à 9992. */
const BelgianPostalCode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{3}$/, "Code postal belge invalide (4 chiffres).");

/**
 * Numéro de téléphone : chiffres, espaces et séparateurs usuels uniquement.
 * Volontairement permissif sur le format, strict sur le jeu de caractères.
 */
const PhoneNumber = z
  .string()
  .trim()
  .min(8, "Numéro de téléphone trop court.")
  .max(30, "Numéro de téléphone trop long.")
  .regex(/^[+0-9 ().-]+$/, "Numéro de téléphone invalide.");

export const INTERVENTION_TYPES = [
  "reparation",
  "renovation",
  "isolation",
  "nettoyage",
  "zinguerie",
  "velux",
  "urgence",
  "autre",
] as const;

export const ROOF_TYPES = [
  "ardoise",
  "tuile",
  "zinc",
  "roofing",
  "toiture-plate",
  "autre",
] as const;

/**
 * Booléen issu d'un formulaire HTML.
 *
 * `z.coerce.boolean()` applique `Boolean(valeur)` : la chaîne `"false"` y
 * devient donc `true`, comme toute chaîne non vide. Utilisée pour le
 * consentement RGPD, elle acceptait n'importe quelle valeur — le contrôle ne
 * validait rien. Défaut détecté par les tests d'injection.
 */
const CheckboxBoolean = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "on" || normalized === "1" || normalized === "yes";
});

export const QuoteRequestSchema = z.object({
  // Listes fermées : une valeur hors énumération est rejetée, ce qui évite de
  // stocker du texte libre là où le métier attend une catégorie.
  interventionType: z.enum(INTERVENTION_TYPES),
  roofType: z.enum(ROOF_TYPES),
  surface: boundedText(50).pipe(z.string().min(1, "Surface requise.")),
  isUrgent: CheckboxBoolean.default(false),
  postalCode: BelgianPostalCode,
  city: boundedText(100).pipe(z.string().min(1, "Ville requise.")),
  fullName: boundedText(120).pipe(z.string().min(2, "Nom requis.")),
  phone: PhoneNumber,
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(255),
  description: boundedText(2000).optional().default(""),
  rgpdConsent: CheckboxBoolean.refine((v) => v === true, {
    message: "Le consentement au traitement des données est requis.",
  }),
  captchaToken: z.string().max(2048).optional(),
});

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;

/**
 * Champ piège. Invisible pour un humain, rempli par la plupart des automates.
 * Sa présence entraîne une réponse de succès simulée : l'automate croit avoir
 * réussi et ne réessaie pas avec une autre technique.
 */
export const HONEYPOT_FIELD = "website_url";
