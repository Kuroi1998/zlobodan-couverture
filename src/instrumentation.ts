/**
 * Point d'entrée exécuté par Next.js au démarrage du serveur, avant la
 * première requête.
 *
 * C'est ici que la configuration est vérifiée : un secret manquant doit
 * empêcher le serveur de démarrer, et non se découvrir à la première
 * connexion d'un visiteur — ou pire, dégrader silencieusement une protection
 * (voir `lib/security/env.ts`).
 */
export async function register(): Promise<void> {
  // Le runtime Edge n'a ni accès complet aux variables d'environnement ni
  // besoin de la couche base : la vérification ne concerne que Node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertProductionEnvironment, describeEnvironment } = await import(
    "@/lib/security/env"
  );

  assertProductionEnvironment();

  const report = describeEnvironment();
  process.stdout.write(
    `${JSON.stringify({
      channel: "security",
      kind: "STARTUP_ENV_REPORT",
      severity: "info",
      detail: report,
    })}\n`
  );

  if (!report.hasDistributedRateLimit) {
    // Sans stockage partagé, la limitation de débit retombe sur un compteur
    // local à l'instance : elle ne tient plus au-delà d'un seul processus.
    process.stdout.write(
      `${JSON.stringify({
        channel: "security",
        kind: "STARTUP_ENV_REPORT",
        severity: "high",
        detail:
          "UPSTASH_REDIS_REST_URL/TOKEN absents : limitation de debit non partagee entre instances.",
      })}\n`
    );
  }
}
