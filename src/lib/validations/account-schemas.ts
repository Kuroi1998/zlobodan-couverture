import { z } from "zod";
import { normalizePhone, normalizeText } from "./normalize";
import { INTERNAL_NOTE_ENTITY_TYPES } from "@/db/schema/notes";

/**
 * Schémas des mutations du compte et du back-office.
 *
 * Tous sont `.strict()` : un champ inconnu fait échouer la validation au lieu
 * d'être ignoré. C'est la protection contre l'affectation de masse — sans
 * elle, un formulaire qui poste `{ phone, role: "admin" }` compte sur le fait
 * que la couche suivante n'écrira pas `role`. Ici, la requête est refusée
 * avant d'atteindre cette couche.
 */

/**
 * Modification du profil : liste blanche stricte.
 *
 * Ne figurent ici ni `email`, ni `role`, ni `passwordHash`, ni
 * `emailVerifiedAt`. Ces champs ont chacun leur parcours dédié, ou ne sont pas
 * modifiables du tout.
 *
 * Le téléphone accepte la chaîne vide, qui vaut effacement : l'utilisateur
 * doit pouvoir retirer une donnée personnelle qu'il a fournie.
 */
export const UpdateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(
        z.union([
          z.literal(""),
          z
            .string()
            .min(8, "Numéro de téléphone trop court.")
            .max(30)
            .regex(/^\+?\d{8,15}$/, "Numéro de téléphone invalide."),
        ])
      ),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Création d'une note interne. Le contenu est borné à la limite du `CHECK` SQL. */
export const CreateInternalNoteSchema = z
  .object({
    entityType: z.enum(INTERNAL_NOTE_ENTITY_TYPES),
    entityId: z.string().uuid(),
    content: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "La note ne peut pas être vide.")
          .max(5000, "Note trop longue (5000 caractères maximum).")
      ),
  })
  .strict();

export type CreateInternalNoteInput = z.infer<typeof CreateInternalNoteSchema>;

/**
 * Annulation d'une demande par son propriétaire.
 *
 * La référence est la clé d'accès publique. Le motif est facultatif et
 * volontairement court : il est destiné à l'opérateur, pas à un dossier.
 */
export const CancelQuoteRequestSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .regex(/^(DEV|DEM)-\d{4}-\d{6}$/, "Référence invalide."),
    reason: z
      .string()
      .transform(normalizeText)
      .pipe(z.string().max(300))
      .optional(),
  })
  .strict();

export type CancelQuoteRequestInput = z.infer<typeof CancelQuoteRequestSchema>;
