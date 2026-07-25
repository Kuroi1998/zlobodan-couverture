/**
 * Routes leurres.
 *
 * Ces chemins n'existent dans aucune version de ce site. Les demander est donc
 * un signal d'analyse automatisée, jamais une erreur d'un visiteur. Le
 * middleware répond 404 et marque la réponse ; le blocage effectif de l'IP est
 * délégué au WAF, qui est la seule couche capable de le faire réellement
 * (règle de corrélation décrite dans le runbook).
 *
 * Volontairement limité aux signatures d'outils courants : un leurre trop
 * large finirait par piéger un crawler légitime.
 */

const DECOY_PREFIXES: readonly string[] = [
  "/wp-admin",
  "/wp-login.php",
  "/wordpress",
  "/phpmyadmin",
  "/pma",
  "/administrator",
  "/adminer.php",
  "/.env",
  "/.git/config",
  "/config.php",
  "/xmlrpc.php",
  "/vendor/phpunit",
  "/solr",
  "/actuator",
  "/_ignition/execute-solution",
];

export function isDecoyAdminPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return DECOY_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export const DECOY_PATHS_FOR_TESTS = DECOY_PREFIXES;
