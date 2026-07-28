import crypto from "crypto";
import { requireSessionSecret } from "./env";
import { timingSafeEqualHex } from "./constant-time";

/**
 * URL signées de courte durée pour le téléchargement de documents.
 *
 * Trois propriétés voulues :
 *
 *  - **Liées à l'utilisateur.** L'identifiant du destinataire entre dans la
 *    signature : une URL transmise à un tiers ne fonctionne pas chez lui.
 *  - **Courtes.** 10 minutes par défaut, pour que la fuite d'une URL par
 *    l'historique, un journal ou un en-tête `Referer` ait une valeur limitée
 *    dans le temps.
 *  - **Révocables.** La signature intègre un jeton de session ; révoquer les
 *    sessions du compte invalide immédiatement toutes ses URL signées, sans
 *    attendre l'expiration.
 *
 * Ce mécanisme complète le contrôle d'accès serveur, il ne le remplace pas :
 * la route vérifie **aussi** la session et l'appartenance. Une URL signée
 * valide sur une ressource devenue interdite doit échouer.
 */

const DEFAULT_TTL_SECONDS = 10 * 60;
const MAX_TTL_SECONDS = 15 * 60;

export interface SignedPayload {
  documentId: string;
  userId: string;
  /** Époque Unix en secondes. */
  expiresAt: number;
  /** Empreinte courte de la session émettrice, pour la révocation. */
  sessionFingerprint: string;
}

function computeSignature(payload: SignedPayload): string {
  const canonical = [
    payload.documentId,
    payload.userId,
    String(payload.expiresAt),
    payload.sessionFingerprint,
  ].join("|");

  return crypto
    .createHmac("sha256", requireSessionSecret())
    .update(canonical)
    .digest("hex");
}

export function sessionFingerprint(sessionId: string): string {
  return crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 16);
}

export function signDocumentAccess(
  documentId: string,
  userId: string,
  sessionId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): { expiresAt: number; signature: string } {
  const effectiveTtl = Math.min(Math.max(ttlSeconds, 30), MAX_TTL_SECONDS);
  const payload: SignedPayload = {
    documentId,
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + effectiveTtl,
    sessionFingerprint: sessionFingerprint(sessionId),
  };
  return { expiresAt: payload.expiresAt, signature: computeSignature(payload) };
}

export type SignatureVerdict =
  | { valid: true }
  | { valid: false; reason: "expired" | "bad-signature" | "malformed" };

export function verifyDocumentAccess(
  documentId: string,
  userId: string,
  sessionId: string,
  expiresAt: number,
  signature: string
): SignatureVerdict {
  if (!Number.isFinite(expiresAt) || !/^[0-9a-f]{64}$/.test(signature)) {
    return { valid: false, reason: "malformed" };
  }

  // L'expiration est vérifiée avant la signature : inutile de calculer un HMAC
  // pour une URL de toute façon périmée.
  if (expiresAt * 1000 < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  const expected = computeSignature({
    documentId,
    userId,
    expiresAt,
    sessionFingerprint: sessionFingerprint(sessionId),
  });

  // Comparaison en temps constant : un `===` révélerait par sa durée combien
  // d'octets de tête sont corrects, et permettrait de forger la signature.
  return timingSafeEqualHex(expected, signature)
    ? { valid: true }
    : { valid: false, reason: "bad-signature" };
}

/**
 * En-têtes de service d'un fichier.
 *
 * `attachment` force le téléchargement au lieu du rendu : même si un fichier
 * malveillant franchissait la validation de type, il ne s'exécuterait pas dans
 * l'origine du site. Combiné à `nosniff`, cela ferme la réinterprétation du
 * type par le navigateur.
 *
 * L'idéal — servir depuis un domaine distinct, sans cookie de session — relève
 * de l'infrastructure et figure au runbook.
 */
export function documentResponseHeaders(mimeType: string, filename: string): Record<string, string> {
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
  return {
    "Content-Type": mimeType,
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    // Empêche la fuite de l'URL signée vers un tiers via l'en-tête Referer.
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
}

export const SIGNED_URL_LIMITS = { DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS };
