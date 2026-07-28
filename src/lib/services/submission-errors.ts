export class DuplicateSubmissionError extends Error {
  readonly reference: string;

  constructor(reference: string) {
    super("Cette demande a déjà été enregistrée.");
    this.name = "DuplicateSubmissionError";
    this.reference = reference;
  }
}

export class InvalidQuoteDraftError extends Error {
  constructor() {
    super("Brouillon introuvable.");
    this.name = "InvalidQuoteDraftError";
  }
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
