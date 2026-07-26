import { assertProductionEnvironment, describeEnvironment } from "./env";

/**
 * Vérifications et journalisation de démarrage — **Node uniquement**.
 *
 * Isolé de `config/env.ts` parce que ce dernier est importé par l'Edge
 * middleware (via `csrf`), où `process.stdout` n'existe pas. Ce module, lui,
 * n'est chargé que par `instrumentation.ts`, sous le runtime Node, après avoir
 * vérifié `NEXT_RUNTIME === "nodejs"`.
 *
 * Il ne journalise que des états de présence, jamais une valeur de secret.
 */

function emit(severity: "info" | "medium" | "high", detail: unknown): void {
  process.stdout.write(
    `${JSON.stringify({ channel: "security", kind: "STARTUP_ENV_REPORT", severity, detail })}\n`
  );
}

/**
 * Valide l'environnement — lève si un secret obligatoire est absent ou
 * invalide en production — puis journalise l'état et les avertissements.
 */
export function runStartupChecks(): void {
  const warnings = assertProductionEnvironment();

  emit("info", describeEnvironment());
  for (const warning of warnings) {
    emit("high", warning);
  }
}
