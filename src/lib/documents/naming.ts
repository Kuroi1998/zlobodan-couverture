import type { DocumentType } from "@/db/schema/documents";

/**
 * Noms de fichiers et clés de stockage.
 *
 * Les deux sont construits **exclusivement côté serveur**, à partir de valeurs
 * que le serveur a lui-même produites : une référence issue d'une séquence
 * PostgreSQL, un identifiant de document, un numéro de version entier. Rien ne
 * vient du navigateur.
 *
 * L'assainissement qui suit est donc une seconde barrière, pas la première.
 * C'est délibéré : une future source d'entrée — un titre saisi par un
 * opérateur, un document téléversé — se brancherait naturellement ici, et la
 * barrière doit déjà tenir ce jour-là.
 *
 * La clé de stockage n'est **jamais** une URL et ne doit jamais être exposée :
 * elle décrit l'organisation interne du dépôt privé.
 */

/** Libellés de fichier par type, en français et sans accent. */
const FILE_LABELS: Record<DocumentType, string> = {
  quote_request_summary: "recapitulatif-demande",
};

/** Segments de répertoire par type, stables dans le temps. */
const STORAGE_SEGMENTS: Record<DocumentType, string> = {
  quote_request_summary: "quote-request-summary",
};

const MAX_SLUG_LENGTH = 80;

/**
 * Réduit une valeur à un segment de nom de fichier sûr.
 *
 * Tout ce qui n'est pas alphanumérique ou tiret disparaît. Cela élimine d'un
 * seul geste la traversée de répertoire (`.` et `/`), les caractères de
 * contrôle, les séparateurs Windows, les espaces et les extensions multiples
 * trompeuses du type `facture.pdf.exe`.
 */
export function slugifySegment(value: string): string {
  const withoutDiacritics = value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");

  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

/**
 * Nom proposé au téléchargement.
 *
 * Forme : `zlobodan-recapitulatif-demande-rec-2026-000001-v2.pdf`. Le numéro de
 * version figure dans le nom pour qu'un client qui télécharge deux fois le même
 * document à des dates différentes ne se retrouve pas avec deux fichiers
 * homonymes dont l'un écrase l'autre.
 */
export function buildDocumentFileName(
  documentType: DocumentType,
  reference: string,
  versionNumber: number
): string {
  const safeReference = slugifySegment(reference) || "document";
  const version = Number.isInteger(versionNumber) && versionNumber > 0 ? versionNumber : 1;

  return `zlobodan-${FILE_LABELS[documentType]}-${safeReference}-v${version}.pdf`;
}

/**
 * Clé interne du stockage privé.
 *
 * Forme : `documents/quote-request-summary/2026/<uuid>/version-2.pdf`.
 *
 * L'identifiant du document sert de répertoire : les versions d'un même
 * document se regroupent, et deux documents ne peuvent pas entrer en collision
 * même à référence identique. Le millésime en tête facilite les politiques de
 * rétention et l'inventaire.
 */
export function buildStorageKey(
  documentType: DocumentType,
  documentId: string,
  versionNumber: number,
  year: number
): string {
  const safeId = slugifySegment(documentId);
  if (safeId.length === 0) {
    throw new Error("Identifiant de document invalide pour la clé de stockage.");
  }
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    throw new Error("Numéro de version invalide pour la clé de stockage.");
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Millésime invalide pour la clé de stockage.");
  }

  return [
    "documents",
    STORAGE_SEGMENTS[documentType],
    String(year),
    safeId,
    `version-${versionNumber}.pdf`,
  ].join("/");
}

/**
 * Titre lisible du document, affiché dans les listes.
 *
 * Distinct du nom de fichier : celui-ci doit rester manipulable par un système
 * de fichiers, celui-là s'adresse à un lecteur.
 */
export function buildDocumentTitle(
  documentType: DocumentType,
  requestReference: string
): string {
  switch (documentType) {
    case "quote_request_summary":
      return `Récapitulatif de demande ${requestReference}`;
  }
}
