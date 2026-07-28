import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";
import { requireDatabaseUrl, getServerEnv } from "@/config/env";

/**
 * Connexion PostgreSQL — client unique et réutilisable.
 *
 * `import "server-only"` interdit à la compilation toute inclusion de ce
 * module dans le bundle navigateur.
 *
 * **Singleton résistant au Hot Reload.** En développement, Next recharge les
 * modules à chaque édition ; sans précaution, chaque rechargement rouvrirait un
 * pool, épuisant les connexions de la base locale. Le pool est donc conservé
 * sur `globalThis` et réutilisé. En production, le module n'est évalué qu'une
 * fois : pas de singleton global, pour ne rien retenir entre déploiements.
 *
 * **SSL.** Le chiffrement en transit est piloté par `sslmode` dans l'URL, seule
 * source de vérité (`config/env` en impose la présence en production). On
 * n'ajoute pas d'option `ssl` concurrente qui pourrait diverger de l'URL.
 *
 * **Pas de connexion à l'import.** postgres.js est paresseux : le pool ne se
 * connecte qu'à la première requête, ce qui laisse `next build`, l'analyse
 * TypeScript et les tests s'exécuter sans base disponible.
 */

const STATEMENT_TIMEOUT_MS = 5_000;
const LOCK_TIMEOUT_MS = 3_000;
const IDLE_IN_TRANSACTION_TIMEOUT_MS = 10_000;

/** Bornes du pool, dimensionnées pour un hébergement modeste, pas serverless massif. */
const POOL_MAX = 10;
const IDLE_TIMEOUT_S = 30;
const CONNECT_TIMEOUT_S = 10;
const MAX_LIFETIME_S = 60 * 30;

function createClient(): Sql {
  return postgres(requireDatabaseUrl(), {
    max: POOL_MAX,
    idle_timeout: IDLE_TIMEOUT_S,
    connect_timeout: CONNECT_TIMEOUT_S,
    max_lifetime: MAX_LIFETIME_S,
    connection: {
      // Appliqués par la base à chaque session : un chemin de code qui
      // oublierait de les poser reste couvert (audit M1).
      statement_timeout: STATEMENT_TIMEOUT_MS,
      lock_timeout: LOCK_TIMEOUT_MS,
      idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
      application_name: "zlobodan-web",
    },
    // Aucune requête n'est journalisée avec ses paramètres : ils contiennent
    // des données personnelles et des empreintes de jetons.
    onnotice: () => undefined,
  });
}

/**
 * Emplacement typé sur `globalThis` — évite `declare global` et `var`, que la
 * configuration ESLint proscrit.
 */
const globalForDb = globalThis as unknown as { __zlobodanPgClient?: Sql };

export const client: Sql =
  globalForDb.__zlobodanPgClient ?? createClient();

if (getServerEnv().nodeEnv !== "production") {
  globalForDb.__zlobodanPgClient = client;
}

export const db = drizzle(client, { schema });

export const DB_TIMEOUTS = {
  STATEMENT_TIMEOUT_MS,
  LOCK_TIMEOUT_MS,
  IDLE_IN_TRANSACTION_TIMEOUT_MS,
} as const;

export const DB_POOL = {
  POOL_MAX,
  IDLE_TIMEOUT_S,
  CONNECT_TIMEOUT_S,
  MAX_LIFETIME_S,
} as const;
