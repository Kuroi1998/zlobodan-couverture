/**
 * Encodage contextuel de sortie.
 *
 * HTML, attribut, URL et JSON embarqué ne s'échappent pas de la même façon :
 * appliquer le mauvais encodeur revient à ne pas en appliquer du tout. Ce
 * module fournit un encodeur par contexte et ne propose volontairement aucune
 * fonction « échappe tout ».
 *
 * Il existe parce que `pdfService` construisait du HTML par interpolation de
 * chaînes, dont un segment provenait directement de l'URL (audit C4).
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Contexte : contenu textuel entre balises.
 * `&` doit être traité en premier, ce que garantit le passage unique par regex.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

/**
 * Contexte : valeur d'attribut HTML.
 *
 * Identique au texte, plus le backtick et le signe égal, qui permettent de
 * sortir d'un attribut non quoté. Les attributs de ce projet sont quotés, mais
 * l'encodeur ne présuppose pas la rigueur du gabarit qui l'appelle.
 */
export function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, "&#x60;").replace(/=/g, "&#x3D;");
}

/**
 * Contexte : valeur insérée dans une URL.
 * Refuse les schémas actifs plutôt que de tenter de les nettoyer.
 */
export function escapeUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (/^(javascript|data|vbscript|file):/i.test(raw)) return "#";
  return encodeURI(raw).replace(/"/g, "%22").replace(/'/g, "%27");
}

/**
 * Contexte : JSON embarqué dans un `<script>`.
 *
 * `JSON.stringify` seul n'échappe pas `</script>`, ni les séparateurs de ligne
 * U+2028/U+2029 qui cassent l'analyse JavaScript. Utilisé pour le JSON-LD.
 */
export function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Contexte : email transactionnel en HTML.
 *
 * Même traitement que le HTML, plus la neutralisation des retours à la ligne
 * qui permettraient d'injecter des en-têtes si la valeur atterrit dans un
 * champ d'en-tête (sujet, nom d'expéditeur).
 */
export function escapeEmailField(value: unknown): string {
  return escapeHtml(value).replace(/[\r\n]+/g, " ").trim();
}

/**
 * Formatage monétaire sûr : garantit qu'un nombre reste un nombre.
 * Une valeur non finie devient `0.00` plutôt qu'un `NaN` affiché au client.
 */
export function formatAmount(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
