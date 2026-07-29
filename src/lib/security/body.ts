import { NextRequest, NextResponse } from "next/server";

/**
 * Lecture bornée et assainie des corps de requête.
 *
 * Trois protections en un point de passage unique :
 *
 * 1. Plafond de taille. Sans lui, un corps de plusieurs centaines de mégaoctets
 *    est accepté puis analysé, ce qui suffit à épuiser la mémoire du processus.
 *
 * 2. Pollution de prototype. `JSON.parse` accepte volontiers une clé
 *    `__proto__` ; le danger n'apparaît qu'au moment d'une fusion récursive ou
 *    d'une affectation dynamique. Ces clés sont refusées à l'entrée, avant
 *    qu'un quelconque code applicatif ne les voie.
 *
 * 3. Opérateurs de requête. Une clé commençant par `$` n'a aucun usage
 *    légitime dans nos charges utiles, mais en a beaucoup dans les couches de
 *    cache et de file d'attente qui manipulent des objets.
 */

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type BodyResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

function reject(status: number, error: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ success: false, error }, { status }) };
}

/**
 * Refus si une clé dangereuse apparaît à n'importe quelle profondeur.
 * On refuse plutôt que de nettoyer : un objet silencieusement amputé masque
 * l'attaque et complique le diagnostic.
 */
export function containsUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 8) return true; // Profondeur anormale : traitée comme hostile.
  if (value === null || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => containsUnsafeKeys(item, depth + 1));
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key) || key.startsWith("$")) return true;
    if (containsUnsafeKeys((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

export async function readJsonBody<T = unknown>(
  req: NextRequest,
  maxBytes = DEFAULT_MAX_BODY_BYTES
): Promise<BodyResult<T>> {
  const mediaType = req.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (
    mediaType !== "application/json" &&
    !(mediaType?.startsWith("application/") && mediaType.endsWith("+json"))
  ) {
    return reject(415, "Type de contenu non pris en charge.");
  }

  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    return reject(413, "Corps de requête trop volumineux.");
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return reject(400, "Corps de requête illisible.");
  }

  // `Content-Length` peut mentir ou être absent : on revérifie sur le contenu
  // réellement reçu.
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return reject(413, "Corps de requête trop volumineux.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return reject(400, "Corps de requête invalide.");
  }

  if (containsUnsafeKeys(parsed)) {
    return reject(400, "Corps de requête invalide.");
  }

  return { ok: true, value: parsed as T };
}

export const BODY_LIMITS = { DEFAULT_MAX_BODY_BYTES };
