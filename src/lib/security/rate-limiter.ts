/**
 * Limitation de débit à stockage partagé.
 *
 * La version précédente comptait dans une `Map` du processus, et n'était de
 * toute façon importée nulle part (audit H3). Un compteur en mémoire se divise
 * par le nombre d'instances et se réinitialise à chaque déploiement : sur un
 * hébergement répliqué, il ne limite rien.
 *
 * Backend par défaut : Upstash Redis via son API REST, seule option utilisable
 * depuis un runtime serverless sans connexion TCP persistante.
 *
 * Fenêtre fixe assumée : à cheval sur deux fenêtres, un client peut émettre
 * jusqu'à deux fois le quota. Le surcoût d'une fenêtre glissante n'est pas
 * justifié ici, où les seuils servent à casser l'automatisation, pas à
 * facturer à la requête près.
 */

export interface RateLimitOptions {
  key: string;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  /** `false` quand le compteur n'est pas partagé entre instances. */
  distributed: boolean;
}

interface MemoryRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryRecord>();

/** Garde-fou mémoire : empêche le repli local de devenir une fuite. */
const MEMORY_STORE_MAX_KEYS = 10_000;

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function isDistributedRateLimitConfigured(): boolean {
  return upstashConfig() !== null;
}

function windowKey(key: string, windowMs: number, now: number): string {
  return `rl:${key}:${Math.floor(now / windowMs)}`;
}

/**
 * INCR puis EXPIRE en un aller-retour. L'expiration n'est posée qu'à la
 * première incrémentation (option NX), sinon la fenêtre glisserait à chaque
 * requête et ne se fermerait jamais.
 */
async function upstashIncrement(
  config: { url: string; token: string },
  redisKey: string,
  ttlSeconds: number
): Promise<number | null> {
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(ttlSeconds), "NX"],
      ]),
      // Un limiteur qui pend est pire qu'un limiteur absent.
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Array<{ result?: unknown }>;
    const incr = payload?.[0]?.result;
    return typeof incr === "number" ? incr : null;
  } catch {
    return null;
  }
}

function memoryIncrement(redisKey: string, windowMs: number, now: number): number {
  if (memoryStore.size > MEMORY_STORE_MAX_KEYS) {
    memoryStore.forEach((record, k) => {
      if (record.resetAt <= now) memoryStore.delete(k);
    });
    if (memoryStore.size > MEMORY_STORE_MAX_KEYS) memoryStore.clear();
  }

  const record = memoryStore.get(redisKey);
  if (!record || record.resetAt <= now) {
    memoryStore.set(redisKey, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  record.count += 1;
  return record.count;
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = windowKey(options.key, options.windowMs, now);
  const ttlSeconds = Math.ceil(options.windowMs / 1000);
  const resetAt = (Math.floor(now / options.windowMs) + 1) * options.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  const config = upstashConfig();
  let count: number | null = null;
  let distributed = false;

  if (config) {
    count = await upstashIncrement(config, redisKey, ttlSeconds);
    distributed = count !== null;
  }

  if (count === null) {
    // Repli local : on continue de limiter plutôt que de laisser passer, mais
    // la garantie devient locale à l'instance. `distributed: false` remonte à
    // l'appelant, qui le signale au journal de sécurité.
    count = memoryIncrement(redisKey, options.windowMs, now);
  }

  return {
    allowed: count <= options.maxRequests,
    remaining: Math.max(0, options.maxRequests - count),
    retryAfterSeconds,
    distributed,
  };
}

/** Réinitialisation ciblée, utilisée par les tests et la réponse à incident. */
export function resetMemoryRateLimits(): void {
  memoryStore.clear();
}

// ---------------------------------------------------------------------------
// Compteurs nommés
//
// La limitation de débit incrémente à chaque requête. Le blocage progressif de
// l'authentification a un besoin différent : *lire* un compteur d'échecs pour
// décider du niveau de friction, et ne l'incrémenter qu'en cas d'échec réel.
// ---------------------------------------------------------------------------

async function upstashCommand(
  config: { url: string; token: string },
  command: (string | number)[]
): Promise<unknown | null> {
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([command.map(String)]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{ result?: unknown }>;
    return payload?.[0]?.result ?? null;
  } catch {
    return null;
  }
}

export async function readCounter(key: string, windowMs: number): Promise<number> {
  const now = Date.now();
  const storeKey = windowKey(key, windowMs, now);
  const config = upstashConfig();

  if (config) {
    const value = await upstashCommand(config, ["GET", storeKey]);
    if (value !== null && value !== undefined) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  const record = memoryStore.get(storeKey);
  return record && record.resetAt > now ? record.count : 0;
}

export async function incrementCounter(key: string, windowMs: number): Promise<number> {
  const now = Date.now();
  const storeKey = windowKey(key, windowMs, now);
  const ttlSeconds = Math.ceil(windowMs / 1000);
  const config = upstashConfig();

  if (config) {
    const count = await upstashIncrement(config, storeKey, ttlSeconds);
    if (count !== null) return count;
  }

  return memoryIncrement(storeKey, windowMs, now);
}

export async function clearCounter(key: string, windowMs: number): Promise<void> {
  const now = Date.now();
  const storeKey = windowKey(key, windowMs, now);
  const config = upstashConfig();

  if (config) {
    await upstashCommand(config, ["DEL", storeKey]);
  }
  memoryStore.delete(storeKey);
}
