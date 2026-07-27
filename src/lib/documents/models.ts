/**
 * Modèles documentaires.
 *
 * Couche intermédiaire entre PostgreSQL et les gabarits PDF. Elle existe pour
 * une raison précise : **ce qui n'est pas dans le modèle ne peut pas être
 * imprimé**.
 *
 * Une ligne `quote_requests` porte des champs qui n'ont rien à faire dans un
 * document remis au client — `submissionKey`, `assignedToUserId`, les
 * identifiants techniques, et par jointure les notes internes. Passer la ligne
 * brute au gabarit ferait reposer leur exclusion sur la vigilance de celui qui
 * écrit le gabarit. Ici, l'omission est structurelle.
 *
 * Les champs sont `readonly` et déjà libellés : le gabarit ne traduit pas de
 * code métier, il compose. Cela garantit aussi qu'un même statut s'écrit de la
 * même façon dans le PDF et dans l'interface, puisque les deux passent par
 * `domain/request-labels`.
 *
 * Ce module ne dépend d'aucun service et reste importable côté test sans base.
 */

/**
 * Identité de l'entreprise telle qu'imprimée sur un document.
 *
 * Tous les champs sauf le nom sont nullables : ils reflètent
 * `config/company.ts`, où seule une donnée prouvée est renseignée. Un document
 * remis à un client ne doit pas porter un numéro d'entreprise ou une assurance
 * que l'entreprise ne peut pas justifier — le PDF circule, s'archive et fait
 * foi bien plus longtemps qu'une page web.
 */
export interface CompanyPdfIdentity {
  readonly name: string;
  readonly address: string | null;
  readonly vatNumber: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly insurance: string | null;
}

export interface SummaryAttachment {
  readonly name: string;
  readonly sizeBytes: number;
  readonly uploadedAt: Date;
}

export interface QuoteRequestSummaryModel {
  /** Référence du document lui-même : REC-2026-000001. */
  readonly documentReference: string;
  readonly versionNumber: number;
  readonly generatedAt: Date;

  readonly company: CompanyPdfIdentity;

  readonly request: {
    /** Référence de la demande d'origine : DEV-2026-000001. */
    readonly reference: string;
    readonly submittedAt: Date | null;
    readonly statusLabel: string;
    readonly isUrgent: boolean;
  };

  readonly customer: {
    readonly fullName: string;
    readonly email: string;
    readonly phone: string;
    readonly city: string;
    readonly postalCode: string;
  };

  readonly project: {
    readonly interventionLabel: string;
    readonly roofLabel: string;
    readonly surfaceLabel: string;
    readonly description: string | null;
  };

  readonly attachments: readonly SummaryAttachment[];
}
