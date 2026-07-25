import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { requireDatabaseUrl } from "@/lib/security/env";

/**
 * Connexion PostgreSQL.
 *
 * Deux durcissements par rapport à la version précédente :
 *
 * 1. Plus de chaîne de connexion de repli. Une `DATABASE_URL` absente en
 *    production faisait silencieusement pointer l'application vers un
 *    `localhost` avec des identifiants publics (audit H8) ; elle échoue
 *    désormais au démarrage.
 *
 * 2. Bornes de temps sur les requêtes. Sans `statement_timeout`, dix requêtes
 *    lentes simultanées suffisaient à épuiser le pool et à figer l'application
 *    (audit M1). Une requête coûteuse est maintenant tuée par la base
 *    elle-même, sans dépendre de la bonne volonté du code applicatif.
 */

const connectionString = requireDatabaseUrl();

const STATEMENT_TIMEOUT_MS = 5_000;
const LOCK_TIMEOUT_MS = 3_000;
const IDLE_IN_TRANSACTION_TIMEOUT_MS = 10_000;

export const client = postgres(connectionString, {
  max: 10,
  // Une connexion inactive est rendue au lieu d'être conservée indéfiniment.
  idle_timeout: 30,
  // Refus rapide quand la base est injoignable, plutôt qu'une requête pendante.
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  connection: {
    // Appliqués par la base à chaque session : un chemin de code qui oublierait
    // de les poser reste couvert.
    statement_timeout: STATEMENT_TIMEOUT_MS,
    lock_timeout: LOCK_TIMEOUT_MS,
    idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
    application_name: "zlobodan-web",
  },
  // Aucune requête n'est journalisée avec ses paramètres : ils contiennent
  // des données personnelles et des empreintes de jetons.
  onnotice: () => undefined,
});

export const db = drizzle(client, { schema });

export const DB_TIMEOUTS = {
  STATEMENT_TIMEOUT_MS,
  LOCK_TIMEOUT_MS,
  IDLE_IN_TRANSACTION_TIMEOUT_MS,
};
