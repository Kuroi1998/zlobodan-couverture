import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Configuration ESLint en format « plat », requis depuis ESLint 9.
 *
 * Migrée depuis `.eslintrc.json`. Deux raisons ont imposé ce passage :
 * ESLint 8 portait plusieurs vulnérabilités hautes sans correctif rétroporté,
 * et Next.js 16 a retiré la commande `next lint`, qui masquait jusqu'ici la
 * configuration sous-jacente. Le lint s'exécute désormais par `eslint` en
 * direct, ce qui rend la chaîne explicite et indépendante du framework.
 *
 * `eslint-config-next` 16 expose une configuration plate native : aucun pont
 * de compatibilité n'est nécessaire.
 *
 * ATTENTION — ces règles ne sont pas cosmétiques : elles rendent structurellement
 * impossible d'écrire du SQL brut, du HTML injecté ou un appel shell. Toute
 * exception doit rester nommée et justifiée en fin de fichier.
 */
const config = [
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      ".next-restart/**",
      ".next-production-smoke/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "src/db/migrations/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },

  ...nextCoreWebVitals,

  {
    rules: {
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: false, skipComments: false },
      ],

      // Règle de style, sans portée sécurité : React échappe déjà les nœuds de
      // texte. Désactivée pour qu'un échec de lint signale une vraie violation
      // et non une apostrophe dans un texte commercial.
      "react/no-unescaped-entities": "off",

      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "child_process",
              message:
                "Aucun appel shell dans cette application. Utiliser l'API de la bibliothèque concernée (sharp, etc.), jamais exec avec une chaîne construite.",
            },
            {
              name: "node:child_process",
              message:
                "Aucun appel shell dans cette application. Utiliser l'API de la bibliothèque concernée (sharp, etc.), jamais exec avec une chaîne construite.",
            },
          ],
        },
      ],

      "no-restricted-properties": [
        "error",
        {
          object: "db",
          property: "execute",
          message:
            "SQL brut interdit. Utiliser le query builder Drizzle. Exception justifiée uniquement dans src/lib/db/raw-queries.ts.",
        },
        {
          object: "sql",
          property: "raw",
          message:
            "sql.raw n'échappe rien. Utiliser la liste blanche d'identifiants de src/lib/db/sort.ts ou un paramètre lié.",
        },
      ],

      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML interdit. Rendre le texte via React, ou passer par DOMPurify côté serveur pour du HTML riche.",
        },
        {
          selector: "MemberExpression[property.name='innerHTML']",
          message:
            "innerHTML interdit. Utiliser textContent, ou un encodeur de src/lib/security/encoding.ts.",
        },
        {
          selector: "MemberExpression[property.name='outerHTML']",
          message: "outerHTML interdit pour les mêmes raisons que innerHTML.",
        },
        {
          selector: "CallExpression[callee.name='setTimeout'][arguments.0.type='Literal']",
          message: "setTimeout avec une chaîne équivaut à eval. Passer une fonction.",
        },
        {
          selector: "CallExpression[callee.name='setInterval'][arguments.0.type='Literal']",
          message: "setInterval avec une chaîne équivaut à eval. Passer une fonction.",
        },
        {
          selector: "CallExpression[callee.property.name=/^\\$(query|execute)RawUnsafe$/]",
          message:
            "Variante Unsafe interdite : elle concatène la requête. Utiliser la variante paramétrée.",
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: "new Function équivaut à eval.",
        },
      ],
    },
  },

  // --- Exceptions nommées -----------------------------------------------------

  {
    // Point d'exception unique et documenté pour le SQL brut.
    files: ["src/lib/db/raw-queries.ts"],
    rules: {
      "no-restricted-properties": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    // Le JSON-LD est un bloc de données, pas un script exécutable ; il est
    // sérialisé par `escapeJsonForScript`, qui neutralise `</script>`.
    files: ["src/components/seo/JsonLdSchema.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Les tests de sécurité doivent contenir les charges d'attaque qu'ils
    // vérifient : une suite d'injection sans chaîne "javascript:" ne teste rien.
    files: ["test/**/*.ts"],
    rules: {
      "no-script-url": "off",
    },
  },
];

export default config;
