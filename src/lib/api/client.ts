/**
 * Lecture d'une réponse d'erreur côté navigateur.
 *
 * Le corps est une valeur `unknown` venue du réseau : chaque niveau est vérifié
 * avant d'être lu, et le message n'est retenu que si c'est bien une chaîne. La
 * version naïve — `body.error.message` après un simple `catch` — affiche
 * « undefined » à l'utilisateur dès que la réponse n'a pas la forme attendue
 * (page d'erreur HTML d'un proxy, réponse tronquée, 502 de la plateforme).
 *
 * Ce module est importable par les composants clients : il ne contient aucune
 * dépendance serveur.
 */

function extractMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  // Forme normalisée : { success: false, error: { code, message } }
  if ("error" in body) {
    const error: unknown = (body as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
  }

  // Forme historique, encore produite par quelques points de terminaison.
  if ("message" in body && typeof (body as { message: unknown }).message === "string") {
    return (body as { message: string }).message;
  }

  return null;
}

export async function readApiError(
  response: Response,
  fallback: string
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return extractMessage(body) ?? fallback;
}

/** Variante pour les réponses de succès porteuses d'un message affichable. */
export async function readApiMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof (body as { data: unknown }).data === "object" &&
    (body as { data: unknown }).data !== null
  ) {
    const data = (body as { data: Record<string, unknown> }).data;
    if (typeof data.message === "string") return data.message;
  }
  return extractMessage(body) ?? fallback;
}
