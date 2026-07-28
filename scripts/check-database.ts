/**
 * Diagnostic de connexion PostgreSQL — `npm run db:check`.
 *
 * Effectue une **vraie requête** (`SELECT version(), current_database(),
 * current_user`), avec timeout, puis ferme proprement le pool. Sortie non
 * nulle en cas d'échec, message normalisé sans secret ni détail exploitable.
 *
 * Exécuté sous tsx avec `tsconfig.scripts.json` (neutralise `server-only`).
 */
import { client } from "../src/db/client";
import {
  checkDatabaseConnection,
  closeDatabase,
  describeDatabaseTarget,
} from "../src/db/diagnostics";

async function checkAuthenticationSchema(): Promise<void> {
  const schema = await client<
    {
      tables_present: number;
      legacy_totp_columns: number;
      invalid_password_hashes: number;
      invalid_session_hashes: number;
      invalid_token_hashes: number;
      invalid_factor_ciphertexts: number;
      invalid_recovery_hashes: number;
    }[]
  >`
    select
      (
        select count(*)::int
        from unnest(array[
          'users', 'sessions', 'email_verification_tokens',
          'password_reset_tokens', 'email_change_requests',
          'user_two_factor', 'two_factor_recovery_codes',
          'auth_challenges', 'security_events', 'notification_outbox'
        ]) expected(name)
        where to_regclass('public.' || expected.name) is not null
      ) as tables_present,
      (
        select count(*)::int
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'users'
          and column_name in ('totp_secret', 'totp_enabled', 'password')
      ) as legacy_totp_columns,
      (
        select count(*)::int from users
        where password_hash !~ '^\\$2[aby]\\$[0-9]{2}\\$'
      ) as invalid_password_hashes,
      (
        select count(*)::int from sessions
        where token_hash !~ '^[0-9a-f]{64}$'
      ) as invalid_session_hashes,
      (
        select
          (select count(*) from email_verification_tokens
            where token_hash !~ '^[0-9a-f]{64}$') +
          (select count(*) from password_reset_tokens
            where token_hash !~ '^[0-9a-f]{64}$') +
          (select count(*) from email_change_requests
            where token_hash !~ '^[0-9a-f]{64}$') +
          (select count(*) from auth_challenges
            where token_hash !~ '^[0-9a-f]{64}$')
      )::int as invalid_token_hashes,
      (
        select count(*)::int from user_two_factor
        where encrypted_secret !~ '^v1\\.'
      ) as invalid_factor_ciphertexts,
      (
        select count(*)::int from two_factor_recovery_codes
        where code_hash !~ '^[0-9a-f]{64}$'
      ) as invalid_recovery_hashes
  `;
  const row = schema[0];
  if (
    !row ||
    row.tables_present !== 10 ||
    row.legacy_totp_columns !== 0 ||
    row.invalid_password_hashes !== 0 ||
    row.invalid_session_hashes !== 0 ||
    row.invalid_token_hashes !== 0 ||
    row.invalid_factor_ciphertexts !== 0 ||
    row.invalid_recovery_hashes !== 0
  ) {
    throw new Error(
      "Le schéma ou les invariants de stockage d'authentification sont invalides."
    );
  }
}

async function main(): Promise<void> {
  process.stdout.write(`Cible : ${describeDatabaseTarget()}\n`);

  const result = await checkDatabaseConnection();

  if (!result.ok) {
    process.stdout.write(`  ✗ ${result.error}\n`);
    if (result.errorCode) process.stdout.write(`    code : ${result.errorCode}\n`);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  }

  process.stdout.write("  ✓ Connexion établie\n");
  process.stdout.write(`  ✓ SELECT 1 réussi\n`);
  if (result.info) {
    process.stdout.write(`  ✓ Version   : ${result.info.serverVersion}\n`);
    process.stdout.write(`  ✓ Base      : ${result.info.database}\n`);
    process.stdout.write(`  ✓ Utilisateur : ${result.info.user}\n`);
  }
  await checkAuthenticationSchema();
  process.stdout.write("  ✓ Schéma d’authentification complet\n");
  process.stdout.write("  ✓ Hashes et secrets chiffrés conformes\n");

  await closeDatabase();
  process.stdout.write("\n✓ Base de données accessible.\n");
}

main().catch(async (error) => {
  // Filet de sécurité : toute erreur inattendue reste sans secret.
  process.stderr.write("✗ Échec du diagnostic de base de données.\n");
  process.stderr.write(`${error instanceof Error ? error.message : "erreur inconnue"}\n`);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
