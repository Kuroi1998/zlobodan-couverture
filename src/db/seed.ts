import { getServerEnv } from "@/config/env";
import { closeDatabase } from "./diagnostics";

/**
 * Jeu de données de démonstration — `npm run db:seed`.
 *
 * Deux protections avant toute écriture :
 *  - **refus en production** : un seed lancé par erreur ne doit jamais toucher
 *    la base réelle ;
 *  - client canonique et fermeture propre du pool en fin d'exécution.
 *
 * ATTENTION : ce script est aujourd'hui un **squelette**. Il ne crée aucune
 * donnée réelle. Le contenu de démonstration reste à écrire ; il devra être
 * idempotent (upsert plutôt qu'insert), et ne jamais créer de compte
 * administrateur avec un mot de passe faible ou codé en dur.
 */
async function main(): Promise<void> {
  const { nodeEnv } = getServerEnv();

  if (nodeEnv === "production") {
    throw new Error("Le seed est désactivé en production.");
  }

  process.stdout.write(`Seed — environnement ${nodeEnv}\n`);
  process.stdout.write("  (squelette : aucune donnée écrite — voir src/db/seed.ts)\n");

  await closeDatabase();
  process.stdout.write("✓ Terminé.\n");
}

main().catch(async (error) => {
  process.stderr.write(`✗ Seed échoué : ${error instanceof Error ? error.message : "erreur"}\n`);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
