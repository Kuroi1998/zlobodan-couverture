import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Configuration Vitest.
 *
 * `tsconfig.json` déclare `"jsx": "preserve"`, comme l'exige Next.js : c'est le
 * compilateur du framework qui transforme le JSX, pas TypeScript. Le
 * transformateur de Vitest lit ce même `tsconfig` et, sans instruction
 * contraire, laisse donc le JSX intact — ce qui produit du JavaScript invalide
 * dès qu'un test importe un composant `.tsx`.
 *
 * Vitest 4 s'appuie sur **rolldown/oxc** et non plus sur esbuild : la clé
 * `esbuild.jsx` n'est plus lue. Les deux sont déclarées afin que la
 * configuration reste correcte quel que soit le moteur retenu.
 */
export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Les tests de sécurité ne doivent jamais atteindre une base réelle :
    // ils portent sur la logique de décision, pas sur l'intégration.
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
