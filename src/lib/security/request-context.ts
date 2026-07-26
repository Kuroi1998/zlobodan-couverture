import type { NextRequest } from "next/server";
import { getTrustedProxyMode } from "@/config/env";

/**
 * Extraction d'une adresse IP *de confiance*.
 *
 * `x-forwarded-for` est écrit par le client et donc entièrement falsifiable :
 * s'y fier revient à offrir un contournement gratuit de tout compteur qui s'en
 * sert, et à empoisonner l'audit log (audit M6). Ce module ne lui accorde
 * aucune confiance par défaut.
 *
 * Limite à connaître : ce contrôle ne vaut que si le pare-feu de l'origine
 * n'accepte le trafic HTTP que depuis les plages du CDN. Sans cette règle,
 * n'importe qui peut atteindre l'origine directement et forger
 * `CF-Connecting-IP`. Cette partie ne vit pas dans le code — voir le runbook,
 * section « Pare-feu de l'origine ».
 */

// Le mode de proxy de confiance vient de la configuration centrale.

/** IPv4/IPv6 sommaire : on rejette tout ce qui n'a pas la forme d'une adresse. */
const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;

function sanitizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  if (!first || !IP_PATTERN.test(first)) return null;
  return first;
}

/**
 * Retourne l'IP cliente ou `null` si aucune source fiable n'est disponible.
 * Un `null` doit être traité comme « inconnu », jamais comme « autorisé ».
 */
export function getTrustedIp(req: NextRequest): string | null {
  if (getTrustedProxyMode() === "cloudflare") {
    const cf = sanitizeIp(req.headers.get("cf-connecting-ip"));
    if (cf) return cf;
  }

  // `NextRequest.ip` a été retiré en Next.js 16 : l'adresse dépend de
  // l'hébergeur, le framework ne la devine plus. Aucun repli sur
  // `x-forwarded-for`, qui est écrit par le client et donc falsifiable — c'est
  // précisément ce que ce module refuse de faire.
  //
  // Sans `TRUSTED_PROXY=cloudflare`, l'IP est donc « inconnue », ce que
  // l'appelant traite comme tel et jamais comme « autorisé ».
  return null;
}

/**
 * Clé de limitation stable même quand l'IP est inconnue : on retombe alors sur
 * une valeur commune, ce qui regroupe le trafic non identifiable sous un même
 * quota plutôt que de le laisser passer sans compteur.
 */
export function rateLimitIdentity(req: NextRequest): string {
  return getTrustedIp(req) ?? "unknown-origin";
}

export function getUserAgent(req: NextRequest): string | null {
  const ua = req.headers.get("user-agent");
  if (!ua) return null;
  return ua.length > 300 ? ua.slice(0, 300) : ua;
}
