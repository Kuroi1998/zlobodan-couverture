/**
 * Compatibilité ascendante.
 *
 * L'implémentation de la validation d'environnement a été centralisée dans
 * `src/config/env.ts`, seule source de vérité désormais. Ce module se contente
 * de ré-exporter, pour que les importateurs historiques
 * (`@/lib/security/env`) continuent de fonctionner sans changement.
 *
 * Les nouveaux appelants importent directement `@/config/env`.
 */
export * from "@/config/env";
