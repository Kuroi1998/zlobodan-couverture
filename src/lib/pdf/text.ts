/**
 * Réduction du texte au jeu de caractères que les polices standard PDF savent
 * encoder, et découpe en lignes.
 *
 * Les polices standard (Helvetica & co.) utilisent l'encodage WinAnsi, qui
 * couvre le français — accents, cédille, ligatures, guillemets typographiques,
 * tiret cadratin, symbole euro — mais rien au-delà. `pdf-lib` *lève une
 * exception* sur un caractère hors jeu.
 *
 * Or la description d'une demande est un champ libre : un client y colle un
 * emoji, un caractère cyrillique ou une puce exotique, et la génération échoue.
 * Le point de rupture serait alors une erreur 500 sur une donnée parfaitement
 * légitime — exactement le genre d'échec silencieux que la mission proscrit.
 *
 * On translittère donc en amont, une bonne fois, plutôt que d'espérer que les
 * entrées restent sages. Le principe est de dégrader lisiblement : le symbole
 * euro reste lui-même, « ā » devient « a », un emoji devient « ? ». Jamais
 * d'exception.
 *
 * Choix assumé : embarquer une police Unicode complète (TrueType) supprimerait
 * la translittération, au prix d'un fichier binaire versionné dans le dépôt et
 * d'un PDF plus lourd. Le récapitulatif de demande est un document
 * francophone ; la translittération suffit et garde la dépendance à zéro
 * fichier de police.
 */

/**
 * Code points Unicode atteignables par l'encodage WinAnsi dans la plage
 * 0x80–0x9F, où CP1252 diverge de Latin-1.
 */
const CP1252_SPECIALS: ReadonlySet<number> = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Remplacements explicites pour des caractères fréquents hors WinAnsi.
 *
 * La décomposition Unicode ne les traite pas : ce sont des symboles à part
 * entière, pas des lettres accentuées. Les clés sont échappées pour rester
 * lisibles en relecture — plusieurs de ces caractères sont invisibles.
 *
 * L'exposant « ² » n'y figure pas : il appartient à Latin-1 (0xB2), donc il est
 * déjà encodable. C'est heureux, l'unité « m² » est omniprésente ici.
 */
const TRANSLITERATIONS: ReadonlyMap<string, string> = new Map([
  ["′", "'"], // prime
  ["″", '"'], // double prime
  ["−", "-"], // signe moins
  ["‐", "-"], // trait d'union
  ["‑", "-"], // trait d'union insécable
  ["―", "-"], // barre horizontale
  ["≤", "<="],
  ["≥", ">="],
  ["≠", "!="],
  ["≈", "~"],
  ["→", "->"],
  ["←", "<-"],
  // Espaces typographiques absents de WinAnsi, ramenés à l'espace ordinaire.
  // L'espace insécable U+00A0 n'y figure pas : il est déjà encodable (0xA0).
  [" ", " "], // espace demi-cadratin
  [" ", " "], // espace cadratin
  [" ", " "], // espace fine
  [" ", " "], // espace fine insécable
  ["​", ""], // espace sans chasse
  ["﻿", ""], // marque d'ordre des octets
]);

const REPLACEMENT = "?";

/**
 * Bloc des diacritiques combinants (U+0300–U+036F), ce que produit une
 * décomposition NFD sur du latin accentué.
 *
 * Construit depuis une chaîne ASCII plutôt qu'écrit en littéral : les marques
 * combinantes sont invisibles dans un éditeur et se collent au caractère
 * précédent en relecture. `\p{Diacritic}` serait plus expressif mais exige une
 * cible ES2018, alors que ce projet compile en ES5.
 */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function isWinAnsiEncodable(codePoint: number): boolean {
  // Espace à tilde : ASCII imprimable.
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true;
  // Latin-1 supplément, au-delà de la plage de contrôle C1.
  if (codePoint >= 0xa0 && codePoint <= 0xff) return true;
  return CP1252_SPECIALS.has(codePoint);
}

/**
 * Rend une chaîne encodable par une police standard PDF.
 *
 * Les caractères de contrôle disparaissent au lieu d'être remplacés : un « ? »
 * à leur place polluerait le rendu sans rien apporter. Les retours à la ligne
 * sont traités par la découpe, pas ici.
 */
export function toPdfSafeText(input: string): string {
  const normalized = input.normalize("NFC");
  let output = "";

  for (const character of normalized) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;

    // Contrôles C0/C1 et DEL : supprimés sans trace.
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      continue;
    }

    if (isWinAnsiEncodable(codePoint)) {
      output += character;
      continue;
    }

    const explicit = TRANSLITERATIONS.get(character);
    if (explicit !== undefined) {
      output += explicit;
      continue;
    }

    // Dernière chance : retirer les diacritiques pour retomber sur une lettre
    // de base ASCII (ā → a, ř → r). Ne fonctionne que pour les caractères
    // décomposables, ce qui exclut emoji et alphabets non latins.
    //
    // La plage 0300–036F est le bloc des diacritiques combinants, ce que
    // produit une décomposition NFD sur du latin. On évite volontairement
    // `\p{Diacritic}` : les échappements de propriété Unicode exigent une cible
    // ES2018, alors que ce projet compile en ES5.
    const stripped = character.normalize("NFD").replace(COMBINING_MARKS, "");
    const strippedPoint = stripped.codePointAt(0);

    output +=
      stripped.length > 0 &&
      strippedPoint !== undefined &&
      isWinAnsiEncodable(strippedPoint)
        ? stripped
        : REPLACEMENT;
  }

  return output;
}

export interface TextMeasurer {
  widthOfTextAtSize(text: string, size: number): number;
}

/**
 * Découpe un texte déjà assaini en lignes tenant dans `maxWidth`.
 *
 * La coupure se fait aux espaces. Un mot plus long que la largeur disponible —
 * une URL, une référence collée — est coupé caractère par caractère plutôt que
 * de déborder de la page : un débordement ne se verrait qu'à l'ouverture du
 * fichier, jamais à la génération.
 */
export function wrapText(
  text: string,
  font: TextMeasurer,
  size: number,
  maxWidth: number
): string[] {
  if (maxWidth <= 0) return [];

  const lines: string[] = [];

  for (const paragraph of text.split(/\r?\n/)) {
    if (paragraph.trim().length === 0) {
      lines.push("");
      continue;
    }

    let current = "";

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current.length > 0) {
        lines.push(current);
        current = "";
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }

      // Mot insécable trop long : découpe forcée, caractère par caractère.
      let chunk = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(chunk + character, size) > maxWidth) {
          if (chunk.length > 0) lines.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      current = chunk;
    }

    lines.push(current);
  }

  return lines;
}

/**
 * Tronque un texte à une longueur maximale, en signalant la coupure.
 *
 * Utilisé sur les champs libres repris dans des cellules étroites, où une
 * valeur aberrante casserait la mise en page sans apporter d'information.
 */
export function truncate(text: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
