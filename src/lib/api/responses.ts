import { NextResponse } from "next/server";

/**
 * Enveloppe unique des réponses d'API.
 *
 * Deux raisons de la centraliser plutôt que de composer les objets à la main
 * dans chaque handler :
 *
 *  - **le code d'erreur devient stable**. Le client lit `error.code`, jamais
 *    `error.message` : le texte peut être reformulé sans rien casser ;
 *  - **le détail technique ne peut pas fuir par inadvertance**. Aucun handler
 *    ne construit sa propre réponse d'échec, donc aucun ne peut y glisser une
 *    trace d'exécution, un nom de table ou un message du pilote PostgreSQL.
 *
 * Les messages sont en français, destinés à être affichés tels quels.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, readonly string[]>;
  };
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UNSUPPORTED_MEDIA_TYPE: 415,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: "Veuillez vérifier les champs indiqués.",
  UNAUTHENTICATED: "Authentification requise.",
  FORBIDDEN: "Vous n'êtes pas autorisé à effectuer cette action.",
  NOT_FOUND: "Ressource introuvable.",
  CONFLICT: "Cette action entre en conflit avec l'état actuel du dossier.",
  RATE_LIMITED: "Trop de requêtes. Réessayez dans quelques instants.",
  UNSUPPORTED_MEDIA_TYPE: "Type de contenu non pris en charge.",
  BAD_REQUEST: "Requête invalide.",
  INTERNAL_ERROR: "Une erreur est survenue. Réessayez dans quelques instants.",
  SERVICE_UNAVAILABLE: "Service temporairement indisponible.",
};

/** `200 OK` — lecture ou modification aboutie. */
export function apiSuccess<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true as const, data });
}

/** `201 Created` — la ressource existe désormais en base. */
export function apiCreated<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true as const, data }, { status: 201 });
}

/** `204 No Content` — action aboutie, rien à renvoyer. */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export interface ApiErrorOptions {
  /** Remplace le message par défaut. Doit rester compréhensible par un utilisateur final. */
  message?: string;
  /** Erreurs par champ, uniquement pour `VALIDATION_ERROR`. */
  fields?: Record<string, readonly string[]>;
}

export function apiError(
  code: ApiErrorCode,
  options: ApiErrorOptions = {}
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message: options.message ?? DEFAULT_MESSAGE[code],
      ...(options.fields ? { fields: options.fields } : {}),
    },
  };
  return NextResponse.json(body, { status: STATUS_BY_CODE[code] });
}

/**
 * Refus d'appartenance.
 *
 * Systématiquement `404`, jamais `403` : sur un identifiant de demande ou de
 * document, un `403` confirmerait l'existence de la ressource et permettrait
 * d'énumérer le portefeuille client. Fonction distincte de `apiError` pour que
 * l'intention soit lisible à l'appel.
 */
export function apiNotFoundOrForbidden(): NextResponse<ApiErrorBody> {
  return apiError("NOT_FOUND");
}

export const API_ERROR_STATUS = STATUS_BY_CODE;
