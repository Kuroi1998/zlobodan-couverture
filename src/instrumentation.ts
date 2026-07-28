/**
 * Point d'entrée exécuté par Next.js au démarrage du serveur, avant la
 * première requête.
 *
 * C'est ici que la configuration est vérifiée : un secret manquant doit
 * empêcher le serveur de démarrer, et non se découvrir à la première requête
 * d'un visiteur — ou pire, dégrader silencieusement une protection.
 *
 * Ce fichier est analysé par Next pour le runtime Edge autant que pour Node ;
 * il ne doit donc contenir **aucune** API Node (pas de `process.stdout`). Tout
 * le travail réel vit dans `@/config/env`, importé dynamiquement et exécuté
 * uniquement sous Node.
 */
export async function register(): Promise<void> {
  // Le runtime Edge n'a ni accès complet aux variables d'environnement ni
  // besoin de la couche base : la vérification ne concerne que Node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runStartupChecks } = await import("@/config/startup");
  runStartupChecks();
}
