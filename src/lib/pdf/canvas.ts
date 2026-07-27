import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { toPdfSafeText, wrapText } from "./text";
import { PdfWriter } from "./writer";
import {
  A4_HEIGHT,
  COLOR,
  MARGIN,
  SIZE,
  lineHeightFor,
  type TableColumn,
} from "./theme";

export type { TableColumn, CellAlign, PdfMetadata } from "./theme";

/**
 * Composition de haut niveau : sections, grilles d'information, bandeaux,
 * tableaux paginés.
 *
 * Hérite de `PdfWriter`, qui gère le flux et le dessin. La séparation garde
 * chaque module lisible et permet de tester les primitives indépendamment de la
 * mise en forme.
 */
export class PdfCanvas extends PdfWriter {
  static override async create(): Promise<PdfCanvas> {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfCanvas(doc, regular, bold);
  }

  /**
   * Titre de section, précédé d'un filet.
   *
   * Le titre réserve la place d'au moins deux lignes de contenu : un intertitre
   * seul en bas de page, orphelin de ce qu'il annonce, est un défaut de mise en
   * page courant et facile à éviter.
   */
  sectionTitle(label: string): void {
    this.moveDown(10);
    this.ensureSpace(
      lineHeightFor(SIZE.heading) + 2 * lineHeightFor(SIZE.body) + 12
    );

    this.page.drawLine({
      start: { x: MARGIN.left, y: A4_HEIGHT - this.cursorY },
      end: { x: this.pageWidth - MARGIN.right, y: A4_HEIGHT - this.cursorY },
      thickness: 0.75,
      color: COLOR.rule,
    });

    this.moveDown(8);
    this.text(label.toUpperCase(), {
      size: SIZE.heading,
      bold: true,
      color: COLOR.accent,
    });
    this.moveDown(3);
  }

  /**
   * Grille d'informations sur deux colonnes.
   *
   * Chaque paire libellé/valeur reste solidaire : la valeur ne peut pas se
   * retrouver sur la page suivante sans son libellé.
   */
  fieldGrid(fields: ReadonlyArray<{ label: string; value: string }>): void {
    const columnWidth = (this.contentWidth - 16) / 2;
    const labelHeight = lineHeightFor(SIZE.small);

    for (let index = 0; index < fields.length; index += 2) {
      const pair = [fields[index], fields[index + 1]].filter(
        (field): field is { label: string; value: string } => field !== undefined
      );

      const blockHeight =
        labelHeight +
        Math.max(
          ...pair.map(
            (field) =>
              wrapText(
                toPdfSafeText(field.value),
                this.regular,
                SIZE.body,
                columnWidth
              ).length * lineHeightFor(SIZE.body)
          )
        );

      this.ensureSpace(blockHeight + 6);
      const rowTop = this.cursorY;
      let consumed = 0;

      pair.forEach((field, column) => {
        const left = MARGIN.left + column * (columnWidth + 16);
        this.cursorY = rowTop;

        this.drawLine(
          field.label.toUpperCase(),
          left,
          this.cursorY,
          SIZE.small,
          true,
          COLOR.muted
        );
        this.cursorY += labelHeight;

        for (const line of wrapText(
          toPdfSafeText(field.value),
          this.regular,
          SIZE.body,
          columnWidth
        )) {
          this.drawLine(line, left, this.cursorY, SIZE.body, false, COLOR.ink);
          this.cursorY += lineHeightFor(SIZE.body);
        }

        consumed = Math.max(consumed, this.cursorY - rowTop);
      });

      this.cursorY = rowTop + consumed + 8;
    }
  }

  /** Bandeau de mise en exergue, utilisé pour la référence et le statut. */
  banner(left: string, right: string): void {
    const height = 26;
    this.ensureSpace(height + 8);

    this.page.drawRectangle({
      x: MARGIN.left,
      y: A4_HEIGHT - this.cursorY - height,
      width: this.contentWidth,
      height,
      color: COLOR.band,
      borderColor: COLOR.rule,
      borderWidth: 0.75,
    });

    const textTop = this.cursorY + (height - SIZE.body) / 2 - 1;
    this.drawLine(left, MARGIN.left + 10, textTop, SIZE.body, true, COLOR.ink);

    const rightX = this.alignedX(
      right,
      MARGIN.left,
      this.contentWidth - 10,
      SIZE.body,
      false,
      "right"
    );
    this.drawLine(right, rightX, textTop, SIZE.body, false, COLOR.muted);

    this.cursorY += height + 10;
  }

  private drawTableHeader(columns: readonly TableColumn[]): void {
    const height = lineHeightFor(SIZE.small) + 8;

    this.page.drawRectangle({
      x: MARGIN.left,
      y: A4_HEIGHT - this.cursorY - height,
      width: this.contentWidth,
      height,
      color: COLOR.headerBand,
    });

    let left = MARGIN.left;
    for (const column of columns) {
      const width = column.width * this.contentWidth;
      const x = this.alignedX(
        column.header,
        left + 6,
        width - 12,
        SIZE.small,
        true,
        column.align ?? "left"
      );
      this.drawLine(
        column.header,
        x,
        this.cursorY + 4,
        SIZE.small,
        true,
        COLOR.onDark
      );
      left += width;
    }

    this.cursorY += height;
  }

  /**
   * Tableau paginé, à en-tête répété sur chaque page.
   *
   * Une ligne n'est jamais coupée en deux : si elle ne tient pas dans ce qui
   * reste, elle bascule entière sur la page suivante. Une ligne tronquée à
   * mi-hauteur est illisible et fait douter de la valeur qu'elle porte.
   */
  table(
    columns: readonly TableColumn[],
    rows: ReadonlyArray<readonly string[]>
  ): void {
    if (rows.length === 0) return;

    this.ensureSpace(
      lineHeightFor(SIZE.small) + 8 + lineHeightFor(SIZE.body) + 10
    );
    this.drawTableHeader(columns);

    rows.forEach((row, rowIndex) => {
      const wrapped = columns.map((column, columnIndex) =>
        wrapText(
          toPdfSafeText(row[columnIndex] ?? ""),
          this.regular,
          SIZE.body,
          column.width * this.contentWidth - 12
        )
      );

      const rowHeight =
        Math.max(1, ...wrapped.map((cell) => cell.length)) *
          lineHeightFor(SIZE.body) +
        8;

      if (this.ensureSpace(rowHeight)) {
        this.drawTableHeader(columns);
      }

      if (rowIndex % 2 === 1) {
        this.page.drawRectangle({
          x: MARGIN.left,
          y: A4_HEIGHT - this.cursorY - rowHeight,
          width: this.contentWidth,
          height: rowHeight,
          color: COLOR.band,
        });
      }

      let left = MARGIN.left;
      columns.forEach((column, columnIndex) => {
        const width = column.width * this.contentWidth;
        let lineTop = this.cursorY + 4;

        for (const line of wrapped[columnIndex] ?? []) {
          const x = this.alignedX(
            line,
            left + 6,
            width - 12,
            SIZE.body,
            false,
            column.align ?? "left"
          );
          this.drawLine(line, x, lineTop, SIZE.body, false, COLOR.ink);
          lineTop += lineHeightFor(SIZE.body);
        }

        left += width;
      });

      this.cursorY += rowHeight;
      this.page.drawLine({
        start: { x: MARGIN.left, y: A4_HEIGHT - this.cursorY },
        end: { x: this.pageWidth - MARGIN.right, y: A4_HEIGHT - this.cursorY },
        thickness: 0.5,
        color: COLOR.rule,
      });
    });

    this.cursorY += 6;
  }
}
