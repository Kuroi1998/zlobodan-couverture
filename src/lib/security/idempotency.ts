import crypto from "crypto";
import { clearCounter, incrementCounter } from "./rateLimiter";

/**
 * Clés d'idempotence.
 *
 * Un rejeu réseau, un double clic ou deux onglets ouverts sur le même
 * formulaire produisent deux requêtes identiques. Sans garde, cela donne deux
 * devis, deux factures, ou deux fois le même fichier.
 *
 * Le mécanisme s'appuie sur le compteur partagé Redis : la **première**
 * incrémentation d'une clé vaut 1, toutes les suivantes valent plus. Cette
 * primitive est atomique côté Redis, donc deux requêtes réellement simultanées
 * ne peuvent pas obtenir 1 toutes les deux.
 *
 * Portée : c'est une garde de premier rideau, pas une garantie transactionnelle.
 * La protection de fond reste la contrainte d'unicité en base — ici on évite
 * simplement d'atteindre la base et de lever une erreur pour un double clic.
 */

/** Fenêtre pendant laquelle un rejeu est reconnu comme tel. */
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

export interface IdempotencyVerdict {
  /** `true` si c'est la première exécution observée pour cette clé. */
  first: boolean;
  storageKey: string;
}

/**
 * Construit la clé.
 *
 * Elle mêle l'utilisateur, l'opération et la clé fournie par le client. Sans
 * l'utilisateur, un client pourrait deviner la clé d'un autre et bloquer son
 * opération — un déni de service ciblé et discret.
 */
export function buildIdempotencyKey(
  userId: string,
  operation: string,
  clientKey: string
): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${userId}:${operation}:${clientKey}`)
    .digest("hex")
    .slice(0, 40);
  return `idem:${digest}`;
}

export async function claimIdempotency(
  userId: string,
  operation: string,
  clientKey: string
): Promise<IdempotencyVerdict> {
  const storageKey = buildIdempotencyKey(userId, operation, clientKey);
  const count = await incrementCounter(storageKey, IDEMPOTENCY_WINDOW_MS);
  return { first: count === 1, storageKey };
}

/**
 * Libère la clé lorsque l'opération a échoué.
 *
 * Sans cette libération, un échec transitoire (base momentanément indisponible)
 * empêcherait l'utilisateur de réessayer pendant toute la fenêtre — la garde
 * anti-doublon deviendrait elle-même une panne.
 */
export async function releaseIdempotency(storageKey: string): Promise<void> {
  await clearCounter(storageKey, IDEMPOTENCY_WINDOW_MS);
}

/**
 * Extrait et valide l'en-tête `Idempotency-Key`.
 * Format libre mais borné, pour ne pas devenir un vecteur de stockage.
 */
export function readIdempotencyHeader(headers: Headers): string | null {
  const raw = headers.get("idempotency-key");
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}

export const IDEMPOTENCY = { IDEMPOTENCY_WINDOW_MS };
