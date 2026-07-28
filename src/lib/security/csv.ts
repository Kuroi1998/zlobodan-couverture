/**
 * Export CSV sûr.
 *
 * Injection de formule : une cellule commençant par `=`, `+`, `-`, `@` — ou
 * par une tabulation / un retour chariot, que le tableur ignore avant de lire
 * le premier caractère significatif — est interprétée comme une formule à
 * l'ouverture du fichier. `=cmd|'/c calc'!A1` exécute alors du code sur le
 * poste de l'artisan qui ouvre l'export.
 *
 * La faille est particulièrement traître : le serveur est parfaitement sain,
 * c'est le poste du destinataire qui exécute. Elle vient en outre de données
 * saisies par un client — nom, description de chantier — donc entièrement
 * contrôlées par l'attaquant.
 */

/** Caractères qui, en tête de cellule, déclenchent l'interprétation. */
const FORMULA_TRIGGERS = ["=", "+", "-", "@"];

/** Caractères ignorés par le tableur avant le premier caractère significatif. */
const LEADING_NOISE = ["\t", "\r", "\n", " "];

/**
 * Neutralise une valeur destinée à une cellule.
 *
 * On préfixe par une apostrophe plutôt que de retirer le caractère : la valeur
 * reste lisible et exacte pour l'utilisateur, seule son interprétation est
 * désamorcée.
 */
export function neutralizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const asString = String(value);
  if (asString.length === 0) return "";

  // On cherche le premier caractère significatif, en sautant le bruit de tête.
  let index = 0;
  while (index < asString.length && LEADING_NOISE.includes(asString[index])) index += 1;

  const significant = asString[index];
  const needsGuard =
    index > 0 || (significant !== undefined && FORMULA_TRIGGERS.includes(significant));

  return needsGuard ? `'${asString}` : asString;
}

/** Échappement CSV standard (RFC 4180), appliqué après la neutralisation. */
export function escapeCsvField(value: unknown): string {
  const neutralized = neutralizeCsvCell(value);
  if (/[",\r\n;]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/**
 * Sérialise un tableau en CSV.
 *
 * Le séparateur par défaut est le point-virgule : c'est celui qu'attend Excel
 * dans une configuration régionale francophone, où la virgule est le séparateur
 * décimal.
 *
 * Le nombre de lignes est **borné par l'appelant** : un export non filtré du
 * fichier clients complet est à la fois un risque de fuite et un moyen simple
 * de faire tomber l'application.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], separator = ";"): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(separator);
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.value(row))).join(separator)
  );
  // BOM UTF-8 : sans lui, Excel interprète le fichier en ANSI et casse les accents.
  return `﻿${[header, ...body].join("\r\n")}\r\n`;
}

/** En-têtes de réponse d'un export. Le fichier est téléchargé, jamais rendu. */
export function csvResponseHeaders(filename: string): Record<string, string> {
  // Nom de fichier assaini : il ne vient jamais d'une entrée utilisateur, et
  // les guillemets ou retours à la ligne casseraient l'en-tête.
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
}

export const CSV_MAX_EXPORT_ROWS = 5000;
