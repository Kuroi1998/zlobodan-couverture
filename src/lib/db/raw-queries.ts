/**
 * POINT D'EXCEPTION UNIQUE POUR LE SQL BRUT.
 *
 * Ce fichier est le seul du dépôt où la règle ESLint interdisant `db.execute`
 * et `sql.raw` est levée (voir `.eslintrc.json`, section `overrides`).
 *
 * -------------------------------------------------------------------------
 * RÈGLES D'AJOUT — à respecter sans exception
 * -------------------------------------------------------------------------
 * 1. Toute fonction ajoutée ici doit être précédée d'un commentaire indiquant
 *    POURQUOI le query builder Drizzle ne suffit pas.
 * 2. Aucune valeur reçue d'un utilisateur ne peut être interpolée dans la
 *    chaîne SQL. Les valeurs passent en paramètres liés.
 * 3. Un identifiant dynamique (nom de table, de colonne, sens de tri) provient
 *    obligatoirement d'une liste blanche constante définie dans le code —
 *    jamais de la valeur reçue. Voir `src/lib/db/sort.ts`.
 * 4. Toute fonction exportée ici doit être couverte par un test.
 *
 * -------------------------------------------------------------------------
 * ÉTAT ACTUEL : aucune exception nécessaire.
 * -------------------------------------------------------------------------
 * L'intégralité des accès de l'application passe par le query builder Drizzle,
 * qui produit des requêtes paramétrées. Le `statement_timeout` — seul réglage
 * qui aurait pu justifier du SQL brut — est posé au niveau de la connexion
 * dans `src/db/client.ts`, ce qui est à la fois plus sûr et plus fiable qu'un
 * `SET` applicatif susceptible d'être oublié sur un chemin de code.
 *
 * Ce fichier existe donc vide et documenté, à dessein : il donne un endroit
 * unique et visible où une exception devra atterrir si elle devient
 * nécessaire, plutôt que de laisser du SQL brut se disperser dans les
 * services.
 */

export const RAW_QUERY_POLICY = {
  exceptionsCount: 0,
  reviewedAt: "2026-07-25",
} as const;
