import crypto from "node:crypto";
import { cookies } from "next/headers";
import { requireIpHashSalt } from "@/lib/security/env";

/**
 * Préfixe `__Host-` : le navigateur n'accepte un tel cookie que s'il est
 * `Secure`, posé sur `Path=/` et sans attribut `Domain`. Il devient donc
 * impossible à un sous-domaine compromis d'écraser la session du domaine
 * principal. Le préfixe exige HTTPS, il n'est donc appliqué qu'en production.
 */
const isProduction = process.env.NODE_ENV === "production";

function configuredCookieName(): string {
  const value = process.env.SESSION_COOKIE_NAME?.trim();
  if (!value || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) return "zlobodan_session";
  return value;
}

const baseCookieName = configuredCookieName();

export const SESSION_COOKIE_NAME = isProduction
  ? `__Host-${baseCookieName.replace(/^__Host-/, "")}`
  : baseCookieName.replace(/^__Host-/, "");

export const TWO_FACTOR_CHALLENGE_COOKIE_NAME = isProduction
  ? "__Host-zlobodan_2fa_challenge"
  : "zlobodan_2fa_challenge";

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

export function getSessionCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    // `strict` plutôt que `lax` : aucune navigation entrante d'un site tiers
    // ne doit arriver déjà authentifiée. Le parcours de connexion du site
    // n'en dépend pas, puisqu'il part toujours d'une page du domaine.
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds ?? 7 * 24 * 60 * 60,
  } as const;
}

export function getClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  } as const;
}

export function getChallengeCookieOptions(maxAgeSeconds = 10 * 60) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
  } as const;
}

export function getClearedChallengeCookieOptions() {
  return {
    ...getChallengeCookieOptions(0),
    maxAge: 0,
  } as const;
}

/**
 * Depuis Next.js 15, `cookies()` retourne une promesse : l'API de requête est
 * devenue asynchrone pour permettre le rendu en flux. La fonction suit donc.
 */
export async function getSessionTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getChallengeTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TWO_FACTOR_CHALLENGE_COOKIE_NAME)?.value;
}
