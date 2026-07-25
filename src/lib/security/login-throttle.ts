import crypto from "crypto";
import { clearCounter, incrementCounter, readCounter } from "./rate-limiter";

/**
 * Blocage progressif de l'authentification.
 *
 * Le verrouillage précédent portait sur le compte seul : cinq mots de passe
 * erronés toutes les quinze minutes suffisaient à maintenir un administrateur
 * hors de son back-office indéfiniment, sans jamais connaître un seul mot de
 * passe (audit H4). Le verrou est donc porté ici par le **couple (IP, compte)**.
 *
 * Un attaquant qui change d'IP repart à zéro sur ce compteur — c'est assumé :
 * le rôle de ce mécanisme est de rendre le forçage coûteux, celui du blocage
 * distribué revient au WAF et à la limitation de débit globale, qui eux voient
 * l'ensemble du trafic.
 *
 * Paliers : 3 échecs → anti-automate exigé, 5 → temporisation croissante,
 * 10 → verrouillage temporaire de la paire et alerte au titulaire.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 heure glissante par fenêtre fixe

export const THRESHOLDS = {
  challenge: 3,
  delay: 5,
  lock: 10,
} as const;

const LOCK_DURATION_SECONDS = 15 * 60;
const MAX_DELAY_MS = 8000;

export interface LoginGate {
  failures: number;
  /** Un jeton anti-automate valide est exigé pour poursuivre. */
  requiresChallenge: boolean;
  /** Temporisation à appliquer avant de répondre. */
  delayMs: number;
  locked: boolean;
  retryAfterSeconds: number;
}

/**
 * L'adresse email n'est jamais utilisée telle quelle comme clé de stockage :
 * elle finirait en clair dans Redis, hors du périmètre de la base.
 */
function accountKey(email: string, ip: string | null): string {
  const digest = crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
  return `login-fail:${ip ?? "unknown-origin"}:${digest}`;
}

/** Temporisation exponentielle bornée, appliquée à partir du palier `delay`. */
function computeDelay(failures: number): number {
  if (failures < THRESHOLDS.delay) return 0;
  const steps = failures - THRESHOLDS.delay + 1;
  return Math.min(MAX_DELAY_MS, 250 * 2 ** steps);
}

export async function getLoginGate(email: string, ip: string | null): Promise<LoginGate> {
  const failures = await readCounter(accountKey(email, ip), WINDOW_MS);

  return {
    failures,
    requiresChallenge: failures >= THRESHOLDS.challenge,
    delayMs: computeDelay(failures),
    locked: failures >= THRESHOLDS.lock,
    retryAfterSeconds: LOCK_DURATION_SECONDS,
  };
}

export async function recordLoginFailure(email: string, ip: string | null): Promise<number> {
  return incrementCounter(accountKey(email, ip), WINDOW_MS);
}

export async function clearLoginFailures(email: string, ip: string | null): Promise<void> {
  await clearCounter(accountKey(email, ip), WINDOW_MS);
}

/**
 * Temporisation effective. Appliquée après un échec, jamais avant la
 * vérification : attendre avant de vérifier révélerait par le temps de réponse
 * que le compte est sous surveillance.
 */
export async function applyThrottleDelay(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
