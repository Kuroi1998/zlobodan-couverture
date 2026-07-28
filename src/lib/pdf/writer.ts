import "server-only";
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  type RGB,
} from "pdf-lib";
import { toPdfSafeText, wrapText } from "./text";
import {
  A4_HEIGHT,
  A4_WIDTH,
  COLOR,
  MARGIN,
  SIZE,
  lineHeightFor,
  type CellAlign,
  type PdfMetadata,
  type TextOptions,
} from "./theme";

/**
 * Couche basse du moteur PDF : pages, curseur, texte, pied de page.
 *
 * `pdf-lib` ne fournit que des primitives de dessin à coordonnées absolues. Il
 * n'a ni notion de flux, ni de saut de page. Cette classe apporte les deux ;
 * la composition de plus haut niveau — sections, grilles, tableaux — vit dans
 * `PdfCanvas`, qui en hérite.
 *
 * Le repère de `pdf-lib` a son origine en bas à gauche, ce qui est commode pour
 * l'imprimerie et pénible pour un document qui se remplit du haut vers le bas.
 * On maintient donc `cursorY` **depuis le haut** de la page, converti au
 * dernier moment.
 *
 * Deux invariants tiennent le reste :
 *
 *  - **Aucun texte n'atteint `pdf-lib` sans passer par `toPdfSafeText`.** Le
 *    passage est centralisé dans `drawLine`, unique point de dessin de texte.
 *    Une police standard lève une exception sur un caractère hors WinAnsi ;
 *    canaliser le nettoyage ici rend cet échec structurellement impossible.
 *  - **Rien ne déborde en bas de page.** Chaque primitive appelle `ensureSpace`
 *    avant de dessiner. Un débordement en PDF est silencieux : il ne se voit
 *    qu'à l'ouverture du fichier, jamais dans les tests d'appel.
 */
export class PdfWriter {
  protected readonly doc: PDFDocument;
  protected readonly regular: PDFFont;
  protected readonly bold: PDFFont;
  protected readonly pages: PDFPage[] = [];
  protected page: PDFPage;
  /** Distance depuis le haut de la page, en points. */
  protected cursorY: number = MARGIN.top;

  protected constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.page = this.appendPage();
  }

  /**
   * Fabrique asynchrone : la création du document et l'incorporation des
   * polices le sont toutes deux, et un constructeur ne peut pas les attendre.
   */
  static async create(): Promise<PdfWriter> {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfWriter(doc, regular, bold);
  }

  readonly palette = COLOR;
  readonly sizes = SIZE;
  readonly margin = MARGIN;

  get contentWidth(): number {
    return A4_WIDTH - MARGIN.left - MARGIN.right;
  }

  get pageWidth(): number {
    return A4_WIDTH;
  }

  get pageHeight(): number {
    return A4_HEIGHT;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  /** Position courante du curseur, mesurée depuis le haut. */
  get cursor(): number {
    return this.cursorY;
  }

  setCursor(topY: number): void {
    this.cursorY = topY;
  }

  moveDown(amount: number): void {
    this.cursorY += amount;
  }

  protected get bottomLimit(): number {
    return A4_HEIGHT - MARGIN.bottom;
  }

  private appendPage(): PDFPage {
    const page = this.doc.addPage([A4_WIDTH, A4_HEIGHT]);
    this.pages.push(page);
    return page;
  }

  protected font(bold: boolean): PDFFont {
    return bold ? this.bold : this.regular;
  }

  /** Ouvre une page et replace le curseur en haut de la zone de contenu. */
  breakPage(): void {
    this.page = this.appendPage();
    this.cursorY = MARGIN.top;
  }

  /**
   * Garantit `needed` points disponibles, en ouvrant une page si nécessaire.
   *
   * Renvoie `true` si une page a été ouverte, ce dont le tableau se sert pour
   * redessiner sa ligne d'en-tête.
   */
  ensureSpace(needed: number): boolean {
    if (this.cursorY + needed <= this.bottomLimit) return false;
    this.breakPage();
    return true;
  }

  /**
   * Unique point de dessin de texte : c'est ici que l'assainissement WinAnsi
   * est appliqué, et nulle part ailleurs.
   */
  protected drawLine(
    value: string,
    x: number,
    topY: number,
    size: number,
    bold: boolean,
    color: RGB
  ): void {
    const safe = toPdfSafeText(value);
    if (safe.length === 0) return;

    this.page.drawText(safe, {
      x,
      // Le curseur désigne le haut de la ligne ; la ligne de base se place une
      // hauteur de corps plus bas, ce qui cadre bien pour l'Helvetica.
      y: A4_HEIGHT - topY - size,
      size,
      font: this.font(bold),
      color,
    });
  }

  protected alignedX(
    value: string,
    left: number,
    width: number,
    size: number,
    bold: boolean,
    align: CellAlign
  ): number {
    if (align === "left") return left;
    const textWidth = this.font(bold).widthOfTextAtSize(
      toPdfSafeText(value),
      size
    );
    return align === "right"
      ? left + width - textWidth
      : left + (width - textWidth) / 2;
  }

  /**
   * Bloc de texte à flux, coupé sur plusieurs pages si nécessaire.
   *
   * Renvoie la hauteur consommée.
   */
  text(value: string, options: TextOptions = {}): number {
    const size = options.size ?? SIZE.body;
    const bold = options.bold ?? false;
    const color = options.color ?? COLOR.ink;
    const indent = options.indent ?? 0;
    const left = MARGIN.left + indent;
    const maxWidth = options.maxWidth ?? this.contentWidth - indent;

    const lines = wrapText(
      toPdfSafeText(value),
      this.font(bold),
      size,
      maxWidth
    );
    const lineHeight = lineHeightFor(size);
    const startY = this.cursorY;

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.drawLine(line, left, this.cursorY, size, bold, color);
      this.cursorY += lineHeight;
    }

    return this.cursorY - startY;
  }

  /** Dessin de texte à position libre, réservé aux en-têtes de gabarit. */
  textAt(value: string, x: number, topY: number, options: TextOptions = {}): void {
    this.drawLine(
      value,
      x,
      topY,
      options.size ?? SIZE.body,
      options.bold ?? false,
      options.color ?? COLOR.ink
    );
  }

  /** Texte aligné à droite sur la marge, pour les blocs d'en-tête. */
  textRightAt(value: string, topY: number, options: TextOptions = {}): void {
    const size = options.size ?? SIZE.body;
    const bold = options.bold ?? false;
    this.drawLine(
      value,
      this.alignedX(value, MARGIN.left, this.contentWidth, size, bold, "right"),
      topY,
      size,
      bold,
      options.color ?? COLOR.ink
    );
  }

  /**
   * Pied de page appliqué à toutes les pages, une fois le total connu.
   *
   * Le « page n sur N » ne peut être écrit qu'à la fin : tant que le contenu
   * s'écoule, le nombre de pages reste inconnu.
   */
  private stampFooters(metadata: PdfMetadata): void {
    const total = this.pages.length;
    const footerTop = A4_HEIGHT - MARGIN.bottom + 18;
    const previousPage = this.page;

    this.pages.forEach((page, index) => {
      this.page = page;

      page.drawLine({
        start: { x: MARGIN.left, y: A4_HEIGHT - footerTop + 10 },
        end: { x: A4_WIDTH - MARGIN.right, y: A4_HEIGHT - footerTop + 10 },
        thickness: 0.5,
        color: COLOR.rule,
      });

      this.drawLine(
        metadata.reference,
        MARGIN.left,
        footerTop,
        SIZE.footer,
        true,
        COLOR.muted
      );

      const pagination = `Page ${index + 1} sur ${total}`;
      this.drawLine(
        pagination,
        this.alignedX(
          pagination,
          MARGIN.left,
          this.contentWidth,
          SIZE.footer,
          false,
          "right"
        ),
        footerTop,
        SIZE.footer,
        false,
        COLOR.muted
      );
    });

    this.page = previousPage;
  }

  /**
   * Clôt le document et renvoie les octets.
   *
   * Les métadonnées sont posées ici, explicitement : aucun chemin local, nom de
   * machine ni identifiant interne ne doit transparaître dans les propriétés du
   * fichier.
   */
  async finish(metadata: PdfMetadata): Promise<Uint8Array> {
    this.stampFooters(metadata);

    this.doc.setTitle(toPdfSafeText(metadata.title));
    this.doc.setSubject(toPdfSafeText(metadata.subject));
    this.doc.setAuthor("Zlobodan Couverture-Zinguerie SRL");
    this.doc.setCreator("Zlobodan Couverture-Zinguerie SRL");
    this.doc.setProducer("Zlobodan Couverture-Zinguerie SRL");
    this.doc.setCreationDate(metadata.generatedAt);
    this.doc.setModificationDate(metadata.generatedAt);

    return this.doc.save();
  }
}
