import { getTurnstileSecret } from "@/lib/security/env";
import { recordSecurityEvent } from "@/lib/security/security-events";

export type TurnstileOutcome = "passed" | "failed" | "not-configured";

/**
 * Vérification Cloudflare Turnstile.
 *
 * La version précédente retombait sur `1x0000…AA`, la clé de test publique de
 * Cloudflare, qui valide *tous* les jetons. Une variable d'environnement
 * oubliée en production transformait donc l'anti-automate en contrôle qui
 * répond toujours « oui », sans le moindre message (audit H8).
 *
 * Ici, l'absence de configuration retourne `not-configured` — un état distinct
 * de la réussite, que l'appelant doit traiter comme « contrôle non effectué ».
 * En production, `getTurnstileSecret` arrête de toute façon le démarrage.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string | null
): Promise<TurnstileOutcome> {
  const secretKey = getTurnstileSecret();
  if (!secretKey) return "not-configured";

  if (!token) return "failed";

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) formData.append("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      // Un service tiers indisponible ne doit pas retenir la requête.
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });

    if (!res.ok) return "failed";

    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? "passed" : "failed";
  } catch {
    // Échec fermé : une erreur réseau n'est pas une validation.
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "medium",
      detail: {
        control: "turnstile",
        outcome: "transport-error",
        reason: "verification-service-unavailable",
      },
    });
    return "failed";
  }
}

/**
 * Variante booléenne pour les appelants qui exigent un contrôle effectif.
 * `not-configured` y vaut échec : un contrôle absent n'est pas un contrôle
 * réussi.
 */
export async function requireTurnstilePass(
  token: string | undefined,
  remoteIp?: string | null
): Promise<boolean> {
  return (await verifyTurnstile(token, remoteIp)) === "passed";
}
