import { rgb, type RGB } from "pdf-lib";

/**
 * Constantes de mise en page et types partagés.
 *
 * Extraits du moteur pour que les gabarits puissent s'y référer sans importer
 * la mécanique de dessin, et pour garder chaque module sous la limite de
 * taille du dépôt.
 */

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

export const MARGIN = { top: 54, right: 48, bottom: 62, left: 48 } as const;

/**
 * Palette volontairement sobre.
 *
 * Le document doit rester lisible imprimé en noir et blanc : l'information
 * n'est jamais portée par la seule couleur, celle-ci ne fait que hiérarchiser.
 */
export const COLOR = {
  ink: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.55),
  accent: rgb(0.85, 0.33, 0.05),
  rule: rgb(0.84, 0.86, 0.9),
  band: rgb(0.96, 0.97, 0.98),
  headerBand: rgb(0.06, 0.09, 0.16),
  onDark: rgb(1, 1, 1),
} as const;

export const SIZE = {
  title: 19,
  heading: 12,
  body: 9.5,
  small: 8.5,
  footer: 7.5,
} as const;

export type CellAlign = "left" | "right" | "center";

export interface TableColumn {
  readonly header: string;
  /** Fraction de la largeur utile. La somme des colonnes doit valoir 1. */
  readonly width: number;
  readonly align?: CellAlign;
}

export interface PdfMetadata {
  readonly title: string;
  readonly subject: string;
  readonly reference: string;
  readonly generatedAt: Date;
}

export interface TextOptions {
  readonly size?: number;
  readonly bold?: boolean;
  readonly color?: RGB;
  readonly indent?: number;
  readonly maxWidth?: number;
}

/** Interligne : compact sans être tassé, y compris sur les longues descriptions. */
export function lineHeightFor(size: number): number {
  return size * 1.38;
}
