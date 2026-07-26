import "server-only";
import { client } from "./client";
import { getMigrationDatabaseUrl, maskDatabaseUrl, requireDatabaseUrl } from "@/config/env";

/**
 * Diagnostic de la connexion PostgreSQL.
 *
 * Une connexion n'est déclarée fonctionnelle qu'après une **requête réelle**,
 * jamais sur la seule construction du pool (qui est paresseuse).
 */

const HEALTHCHECK_TIMEOUT_MS = 5_000;

export interface DatabaseInfo {
  serverVersion: string;
  database: string;
  user: string;
}

export interface DatabaseCheckResult {
  ok: boolean;
  info?: DatabaseInfo;
  /** Message normalisé, sûr à afficher — jamais de secret. */
  error?: string;
  errorCode?: string;
}

interface PostgresErrorLike {
  code?: string;
  message?: string;
}

function isErrorLike(value: unknown): value is PostgresErrorLike {
  return typeof value === "object" && value !== null && ("code" in value || "message" in value);
}

/**
 * Traduit une erreur du pilote en message compréhensible, sans détail
 * technique exploitable ni secret. Le mot de passe ne peut pas y figurer :
 * seuls les codes et un libellé fixe sont utilisés.
 */
export function getDatabaseErrorMessage(error: unknown): string {
  if (!isErrorLike(error)) return "La connexion à la base de données a échoué.";

  switch (error.code) {
    case "28P01":
      return "Authentification PostgreSQL refusée : identifiants invalides.";
    case "28000":
      return "Authentification PostgreSQL refusée : règle d'accès non satisfaite.";
    case "3D000":
      return "La base de données configurée n'existe pas.";
    case "42P01":
      return "Une table attendue est absente : les migrations ne sont pas appliquées.";
    case "23505":
      return "Violation de contrainte d'unicité.";
    case "23503":
      return "Violation de clé étrangère.";
    case "ECONNREFUSED":
      return "Le serveur PostgreSQL refuse la connexion (arrêté ou port incorrect).";
    case "ENOTFOUND":
      return "Hôte PostgreSQL introuvable : nom incorrect ou non résolu.";
    case "ETIMEDOUT":
    case "CONNECT_TIMEOUT":
      return "La connexion PostgreSQL a expiré (serveur injoignable ou pare-feu).";
    case "57P03":
      return "La base de données démarre encore et n'accepte pas de connexion.";
    default:
      return "La connexion à la base de données a échoué.";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error("healthcheck timeout"), { code: "ETIMEDOUT" }));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Vérifie la connexion par une requête réelle et retourne un résultat
 * structuré. Ne lève jamais : l'erreur est normalisée dans `result.error`,
 * pour que les appelants (health endpoint, script CLI) décident du traitement.
 */
export async function checkDatabaseConnection(): Promise<DatabaseCheckResult> {
  try {
    const rows = await withTimeout(
      client<{ version: string; database: string; user: string }[]>`
        SELECT
          version() AS version,
          current_database() AS database,
          current_user AS user
      `,
      HEALTHCHECK_TIMEOUT_MS
    );

    const row = rows[0];
    return {
      ok: true,
      info: {
        // On ne conserve que « PostgreSQL X.Y », pas la bannière complète qui
        // révèle l'OS et l'architecture du serveur.
        serverVersion: (row?.version ?? "").split(" ").slice(0, 2).join(" ") || "inconnue",
        database: row?.database ?? "?",
        user: row?.user ?? "?",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error),
      errorCode: isErrorLike(error) ? error.code : undefined,
    };
  }
}

/** Cible masquée de la connexion applicative, pour un journal sûr. */
export function describeDatabaseTarget(): string {
  return maskDatabaseUrl(requireDatabaseUrl());
}

/** Cible masquée de la connexion de migration. */
export function describeMigrationTarget(): string {
  return maskDatabaseUrl(getMigrationDatabaseUrl());
}

/**
 * Ferme proprement le pool. À appeler à la fin des scripts ponctuels (seed,
 * diagnostic) pour que le processus se termine sans connexion pendante.
 */
export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
