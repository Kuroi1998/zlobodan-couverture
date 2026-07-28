export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_DISABLED"
  | "TWO_FACTOR_REQUIRED"
  | "INVALID_TWO_FACTOR_CODE"
  | "INVALID_RECOVERY_CODE"
  | "SESSION_EXPIRED"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "RATE_LIMITED"
  | "CHALLENGE_REQUIRED"
  | "CHALLENGE_FAILED"
  | "WEAK_PASSWORD"
  | "PWNED_PASSWORD"
  | "REAUTHENTICATION_REQUIRED"
  | "EMAIL_CONFLICT";

export const GENERIC_CREDENTIALS =
  "Adresse e-mail ou mot de passe incorrect.";
export const TEMPORARY_AUTH_FAILURE =
  "La connexion est temporairement indisponible. Veuillez réessayer.";

const PUBLIC_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: GENERIC_CREDENTIALS,
  EMAIL_NOT_VERIFIED: GENERIC_CREDENTIALS,
  ACCOUNT_LOCKED: GENERIC_CREDENTIALS,
  ACCOUNT_DISABLED: GENERIC_CREDENTIALS,
  TWO_FACTOR_REQUIRED: "Un second facteur est requis pour terminer la connexion.",
  INVALID_TWO_FACTOR_CODE: "Le code d'authentification est invalide ou expiré.",
  INVALID_RECOVERY_CODE: "Le code de récupération est invalide ou déjà utilisé.",
  SESSION_EXPIRED: "Votre session a expiré. Reconnectez-vous.",
  TOKEN_INVALID: "Ce lien est invalide ou a déjà été utilisé.",
  TOKEN_EXPIRED: "Ce lien est invalide ou a expiré.",
  RATE_LIMITED: "Trop de tentatives. Veuillez patienter avant de réessayer.",
  CHALLENGE_REQUIRED: "Merci de valider le contrôle anti-robot pour continuer.",
  CHALLENGE_FAILED: "Le contrôle anti-robot n'a pas abouti. Réessayez.",
  WEAK_PASSWORD: "Le mot de passe ne respecte pas la politique de sécurité.",
  PWNED_PASSWORD:
    "Ce mot de passe apparaît dans des fuites publiques. Choisissez-en un autre.",
  REAUTHENTICATION_REQUIRED:
    "Confirmez votre mot de passe et votre second facteur pour continuer.",
  EMAIL_CONFLICT: "Cette adresse ne peut pas être utilisée.",
};

const DEFAULT_STATUS: Record<AuthErrorCode, number> = {
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 401,
  ACCOUNT_LOCKED: 401,
  ACCOUNT_DISABLED: 401,
  TWO_FACTOR_REQUIRED: 202,
  INVALID_TWO_FACTOR_CODE: 401,
  INVALID_RECOVERY_CODE: 401,
  SESSION_EXPIRED: 401,
  TOKEN_INVALID: 400,
  TOKEN_EXPIRED: 400,
  RATE_LIMITED: 429,
  CHALLENGE_REQUIRED: 403,
  CHALLENGE_FAILED: 403,
  WEAK_PASSWORD: 422,
  PWNED_PASSWORD: 422,
  REAUTHENTICATION_REQUIRED: 401,
  EMAIL_CONFLICT: 409,
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly publicMessage: string;
  readonly httpStatus: number;

  constructor(code: AuthErrorCode, httpStatus = DEFAULT_STATUS[code]) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.publicMessage = PUBLIC_MESSAGES[code];
    this.httpStatus = httpStatus;
  }
}

export function toPublicAuthError(
  error: unknown
): { message: string; status: number; code: string } {
  if (error instanceof AuthError) {
    return {
      message: error.publicMessage,
      status: error.httpStatus,
      code: error.code,
    };
  }
  return {
    message: TEMPORARY_AUTH_FAILURE,
    status: 503,
    code: "UNEXPECTED_AUTH_ERROR",
  };
}
