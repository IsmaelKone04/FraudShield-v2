import { fileURLToPath } from "node:url"
import path from "node:path"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

/**
 * Le lancement des tests.
 *
 * Les suites vivaient jusqu'ici hors du dépôt : des scripts qui exigeaient une
 * compilation TypeScript préalable dans un dossier temporaire et un crochet sur
 * la résolution des modules pour comprendre `@/`. Personne d'autre que leur
 * auteur ne pouvait les lancer. Elles rentrent, sous un lanceur que `npm test`
 * suffit à démarrer.
 *
 * L'environnement est déclaré par fichier plutôt qu'ici : la très grande
 * majorité des suites porte sur des fonctions pures, qui n'ont que faire d'un
 * DOM. Celles qui montent un composant ouvrent leur fichier par
 * `// @vitest-environment jsdom`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src") },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    reporters: process.env.CI ? ["default"] : ["dot"],
  },
})
