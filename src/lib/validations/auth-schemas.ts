import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { normalizeEmail } from "./normalize";

const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 30;
const NAME_MAX_LENGTH = 100;

const NormalizedEmail = z
  .string()
  .max(EMAIL_MAX_LENGTH, "Adresse e-mail trop longue.")
  .transform(normalizeEmail)
  .pipe(z.string().email("Adresse e-mail invalide.").max(EMAIL_MAX_LENGTH));

const BoundedPassword = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`
  );

const PhoneNumber = z
  .string()
  .max(PHONE_MAX_LENGTH, "Numéro de téléphone trop long.")
  .regex(/^[+0-9 ().-]{8,30}$/, "Numéro de téléphone invalide.");

const PersonName = z
  .string()
  .trim()
  .min(1, "Ce champ est requis.")
  .max(NAME_MAX_LENGTH, "Nom trop long.");

const OpaqueToken = z
  .string()
  .length(64, "Jeton invalide.")
  .regex(/^[0-9a-f]+$/, "Jeton invalide.");

export const RegisterSchema = z
  .object({
    firstName: PersonName,
    lastName: PersonName,
    email: NormalizedEmail,
    password: BoundedPassword,
    passwordConfirmation: z.string().max(PASSWORD_MAX_LENGTH),
    phone: z.union([PhoneNumber, z.literal("")]).optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Vous devez accepter les conditions." }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({
        message: "Vous devez accepter la politique de confidentialité.",
      }),
    }),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Les mots de passe ne correspondent pas.",
  });

export const LoginSchema = z.object({
  email: NormalizedEmail,
  password: z.string().min(1, "Mot de passe requis.").max(PASSWORD_MAX_LENGTH),
  totpCode: z.string().max(32).optional(),
  recoveryCode: z.string().max(32).optional(),
  captchaToken: z.string().max(2048).optional(),
  next: z.string().max(512).optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: NormalizedEmail,
});

export const PasswordResetConfirmSchema = z
  .object({
    token: OpaqueToken,
    newPassword: BoundedPassword,
    passwordConfirmation: z.string().max(PASSWORD_MAX_LENGTH),
  })
  .refine((value) => value.newPassword === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Les mots de passe ne correspondent pas.",
  });

export const TotpVerifySchema = z.object({
  totpCode: z
    .string()
    .regex(/^[0-9]{6}$/, "Le code TOTP doit comporter 6 chiffres."),
});

export const ResendVerificationSchema = z.object({ email: NormalizedEmail });

export const TwoFactorChallengeSchema = z
  .object({
    code: z.string().trim().min(1).max(32),
    method: z.enum(["totp", "recovery"]).default("totp"),
  })
  .superRefine((value, context) => {
    if (value.method === "totp" && !/^\d{6}$/.test(value.code)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["code"],
        message: "Le code doit comporter 6 chiffres.",
      });
    }
  });

export const SensitiveAccountActionSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  verificationCode: z.string().trim().min(1).max(32).optional(),
});

export const ChangePasswordSchema = SensitiveAccountActionSchema.extend({
  newPassword: BoundedPassword,
  passwordConfirmation: z.string().max(PASSWORD_MAX_LENGTH),
}).refine((value) => value.newPassword === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Les mots de passe ne correspondent pas.",
});

export const ChangeEmailSchema = SensitiveAccountActionSchema.extend({
  newEmail: NormalizedEmail,
});

export const ConfirmEmailChangeSchema = z.object({ token: OpaqueToken });

export const ConfirmTwoFactorSetupSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Le code doit comporter 6 chiffres."),
});

export const DisableTwoFactorSchema = SensitiveAccountActionSchema.extend({
  confirmation: z.literal(true),
});

export const RevokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const AdminAccountStatusSchema = z.object({
  status: z.enum(["active", "disabled"]),
  reason: z.string().trim().min(3).max(500),
});

export const AUTH_FIELD_LIMITS = {
  EMAIL_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  NAME_MAX_LENGTH,
};
