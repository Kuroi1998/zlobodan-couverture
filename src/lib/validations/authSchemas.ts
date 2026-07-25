import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Adresse email invalide.").transform((val) => val.toLowerCase().trim()),
  password: z.string().min(12, "Le mot de passe doit contenir au moins 12 caractères."),
  phone: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Adresse email invalide.").transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Mot de passe requis."),
  totpCode: z.string().optional(),
  captchaToken: z.string().optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email("Adresse email invalide.").transform((val) => val.toLowerCase().trim()),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1, "Jeton requis."),
  newPassword: z.string().min(12, "Le mot de passe doit contenir au moins 12 caractères."),
});

export const TotpVerifySchema = z.object({
  totpCode: z.string().length(6, "Le code TOTP doit comporter 6 chiffres."),
});
