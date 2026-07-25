import { z } from "zod";
import { normalizeEmail } from "./normalize";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

/**
 * Schémas d'authentification.
 *
 * Deux durcissements par rapport à la version précédente :
 *
 *  - **Longueur maximale sur tous les champs.** Un mot de passe de 10 Mo
 *    soumis à bcrypt est un déni de service à requête unique. Le plafond est
 *    posé avant toute opération coûteuse.
 *  - **Normalisation Unicode des emails** (NFKC + minuscules + purge des
 *    caractères invisibles), pour qu'une variante visuellement identique ne
 *    crée pas un second compte.
 */

const EMAIL_MAX_LENGTH = 254; // RFC 5321
const PHONE_MAX_LENGTH = 30;

/**
 * Email normalisé.
 *
 * L'ordre compte : on borne la longueur *avant* de normaliser, pour ne pas
 * faire travailler `normalize()` sur une entrée arbitrairement longue.
 */
const NormalizedEmail = z
  .string()
  .max(EMAIL_MAX_LENGTH, "Adresse email trop longue.")
  .transform(normalizeEmail)
  .pipe(z.string().email("Adresse email invalide.").max(EMAIL_MAX_LENGTH));

const BoundedPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(PASSWORD_MAX_LENGTH, `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`);

/**
 * Téléphone : motif linéaire, sans quantificateur imbriqué.
 *
 * Une expression du type `^([0-9]+)+$` s'évalue en temps exponentiel sur une
 * entrée construite — c'est un ReDoS. Ici chaque caractère est examiné une
 * fois, et la longueur est bornée en amont.
 */
const PhoneNumber = z
  .string()
  .max(PHONE_MAX_LENGTH, "Numéro de téléphone trop long.")
  .regex(/^[+0-9 ().-]{8,30}$/, "Numéro de téléphone invalide.");

export const RegisterSchema = z.object({
  email: NormalizedEmail,
  password: BoundedPassword,
  phone: PhoneNumber.optional(),
});

export const LoginSchema = z.object({
  email: NormalizedEmail,
  // Pas de longueur minimale ici : la politique s'applique à l'inscription.
  // Le plafond, lui, reste — il protège du déni de service par bcrypt.
  password: z.string().min(1, "Mot de passe requis.").max(PASSWORD_MAX_LENGTH),
  totpCode: z.string().max(10).optional(),
  captchaToken: z.string().max(2048).optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: NormalizedEmail,
});

export const PasswordResetConfirmSchema = z.object({
  // Jeton hexadécimal de 64 caractères produit par `generateToken()`.
  token: z.string().length(64, "Jeton invalide.").regex(/^[0-9a-f]+$/, "Jeton invalide."),
  newPassword: BoundedPassword,
});

export const TotpVerifySchema = z.object({
  totpCode: z.string().regex(/^[0-9]{6}$/, "Le code TOTP doit comporter 6 chiffres."),
});

export const AUTH_FIELD_LIMITS = { EMAIL_MAX_LENGTH, PHONE_MAX_LENGTH };
