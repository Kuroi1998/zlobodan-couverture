/**
 * Erreurs d'authentification à message contrôlé.
 *
 * Les routes renvoyaient `error.message` brut, ce qui exposait au client des
 * messages internes — dont « Un compte existe déjà avec cette adresse email »,
 * qui permet d'énumérer la clientèle alors que le login prend soin, lui,
 * d'utiliser un message générique (audit M4).
 *
 * Ici, chaque erreur porte deux textes : `publicMessage`, seul autorisé à
 * sortir, et `code`, réservé au journal de sécurité.
 */

export type AuthErrorCode =
  | "invalid-credentials"
  | "challenge-required"
  | "challenge-failed"
  | "locked"
  | "totp-required"
  | "totp-invalid"
  | "totp-enrollment-required"
  | "weak-password"
  | "pwned-password";

/** Message unique pour tout ce qui touche aux identifiants : aucune distinction observable. */
const GENERIC_CREDENTIALS = "Identifiants incorrects, ou compte momentanément indisponible.";

const PUBLIC_MESSAGES: Record<AuthErrorCode, string> = {
  "invalid-credentials": GENERIC_CREDENTIALS,
  "locked": GENERIC_CREDENTIALS,
  "challenge-required": "Merci de valider le contrôle anti-robot pour continuer.",
  "challenge-failed": "Le contrôle anti-robot n'a pas abouti. Réessayez.",
  "totp-required": "Code d'authentification à deux facteurs requis.",
  "totp-invalid": "Code d'authentification à deux facteurs invalide.",
  "totp-enrollment-required":
    "Ce compte doit configurer l'authentification à deux facteurs avant de se connecter.",
  "weak-password": "Le mot de passe doit contenir au moins 12 caractères.",
  "pwned-password":
    "Ce mot de passe apparaît dans des fuites de données publiques. Choisissez-en un autre.",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly publicMessage: string;
  readonly httpStatus: number;

  constructor(code: AuthErrorCode, httpStatus = 401) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.publicMessage = PUBLIC_MESSAGES[code];
    this.httpStatus = httpStatus;
  }
}

/**
 * Traduction sûre de n'importe quelle exception en réponse client.
 * Une erreur inattendue ne doit jamais laisser fuiter sa trace.
 */
export function toPublicAuthError(error: unknown): { message: string; status: number; code: string } {
  if (error instanceof AuthError) {
    return { message: error.publicMessage, status: error.httpStatus, code: error.code };
  }
  return { message: GENERIC_CREDENTIALS, status: 401, code: "unexpected" };
}

export { GENERIC_CREDENTIALS };
