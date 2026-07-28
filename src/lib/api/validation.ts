import type { ZodError } from "zod";

/**
 * Erreurs de validation, par champ.
 *
 * `flatten()` de Zod renvoie `Record<string, string[] | undefined>`. Les
 * entrées vides sont retirées ici plutôt que par chaque handler : une clé
 * présente avec une valeur `undefined` se sérialise en `null` dans la réponse
 * JSON, ce que le formulaire côté navigateur doit alors savoir ignorer.
 *
 * Seuls les messages sont exposés. Ni le chemin interne du schéma, ni le code
 * d'erreur Zod, ni la valeur reçue : renvoyer la valeur reçue ferait de la
 * réponse d'erreur un miroir capable de refléter du contenu injecté.
 */
export function toFieldErrors(error: ZodError): Record<string, readonly string[]> {
  const flattened = error.flatten().fieldErrors;
  const fields: Record<string, readonly string[]> = {};

  for (const [key, messages] of Object.entries(flattened)) {
    if (messages && messages.length > 0) fields[key] = messages;
  }

  return fields;
}
