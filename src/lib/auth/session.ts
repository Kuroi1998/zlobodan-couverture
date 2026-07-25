import crypto from "crypto";
import { cookies } from "next/headers";
import { requireIpHashSalt } from "@/lib/security/env";

/**
 * Préfixe `__Host-` : le navigateur n'accepte un tel cookie que s'il est
 * `Secure`, posé sur `Path=/` et sans attribut `Domain`. Il devient donc
 * impossible à un sous-domaine compromis d'écraser la session du domaine
 * principal. Le préfixe exige HTTPS, il n'est donc appliqué qu'en production.
 */
const isProduction = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = isProduction
  ? "__Host-zlobodan_session"
  : "zlobodan_session";

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashIpAddress(ip: string): string {
  // Sel obligatoire : sans lui, l'espace IPv4 se force en quelques minutes et
  // les empreintes de l'audit log redeviennent des adresses en clair.
  const salt = requireIpHashSalt();
  return crypto.createHmac("sha256", salt).update(ip).digest("hex");
}

export function setSessionCookie(token: string, maxAgeSeconds?: number) {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    // `strict` plutôt que `lax` : aucune navigation entrante d'un site tiers
    // ne doit arriver déjà authentifiée. Le parcours de connexion du site
    // n'en dépend pas, puisqu'il part toujours d'une page du domaine.
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds ?? 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionTokenFromCookie(): string | undefined {
  return cookies().get(SESSION_COOKIE_NAME)?.value;
}
