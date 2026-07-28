/**
 * Verification qu'aucun secret n'a fui dans le bundle servi au navigateur.
 *
 * Tout ce qui atteint `.next/static` est public par construction. Une variable
 * serveur referencee par erreur depuis un composant client s'y retrouve
 * inlinee en clair par le compilateur, sans le moindre avertissement.
 *
 * Ce script echoue avec un code de sortie non nul, ce qui casse la chaine
 * d'integration continue.
 */

const fs = require("fs");
const path = require("path");

const BUNDLE_DIR = path.join(process.cwd(), ".next", "static");

/**
 * Variables dont la valeur ne doit jamais apparaitre cote client.
 * On cherche la VALEUR, pas le nom : c'est la fuite reelle.
 */
const SECRET_ENV_VARS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "IP_HASH_SALT",
  "TURNSTILE_SECRET_KEY",
  "SMTP_PASS",
  "SMTP_USER",
  "UPSTASH_REDIS_REST_TOKEN",
];

/** Motifs de secrets, independamment de l'environnement de build. */
const SECRET_PATTERNS = [
  { name: "chaine de connexion postgres", re: /postgres(ql)?:\/\/[^\s"'`]{8,}/i },
  { name: "cle privee PEM", re: /-----BEGIN[A-Z ]*PRIVATE KEY-----/ },
  { name: "jeton AWS", re: /AKIA[0-9A-Z]{16}/ },
  { name: "jeton Upstash", re: /\bA[A-Za-z0-9_-]{40,}=\b/ },
];

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(js|mjs|css|map|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function main() {
  const files = collectFiles(BUNDLE_DIR);

  if (files.length === 0) {
    console.error("[bundle] Aucun artefact trouve dans .next/static. Lancer `npm run build` d'abord.");
    process.exit(1);
  }

  const findings = [];

  // Valeurs reelles de l'environnement de build.
  const secretValues = SECRET_ENV_VARS.map((name) => ({ name, value: process.env[name] }))
    .filter((e) => typeof e.value === "string" && e.value.length >= 8);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const relative = path.relative(process.cwd(), file);

    for (const { name, value } of secretValues) {
      if (content.includes(value)) {
        findings.push(`${relative} : valeur de ${name} presente en clair`);
      }
    }

    for (const { name, re } of SECRET_PATTERNS) {
      const match = content.match(re);
      if (match) {
        findings.push(`${relative} : motif "${name}" detecte (${match[0].slice(0, 24)}...)`);
      }
    }
  }

  if (findings.length > 0) {
    console.error("[bundle] SECRETS DETECTES DANS LE BUNDLE CLIENT :");
    for (const f of findings) console.error(`  - ${f}`);
    console.error(
      "\nUne variable serveur est referencee depuis un composant client. " +
        "Verifier qu'aucun `process.env` non prefixe NEXT_PUBLIC_ n'est lu cote client."
    );
    process.exit(1);
  }

  console.log(`[bundle] ${files.length} fichiers analyses, aucun secret detecte.`);
}

main();
