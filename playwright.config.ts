import { defineConfig, devices } from "@playwright/test"

/**
 * Le seul parcours que les tests unitaires ne peuvent pas prouver : qu'une
 * session s'ouvre réellement, qu'une page se rend dans un navigateur, et
 * qu'une décision survit à un rechargement complet. Un test de composant peut
 * prouver qu'un bouton appelle la bonne fonction ; il ne prouve pas que le
 * navigateur, une fois rechargé, retrouve la même chose.
 *
 * `npm run e2e`. Le serveur de développement est démarré par Playwright
 * lui-même (`webServer`) s'il ne tourne pas déjà — inutile de le lancer à la
 * main avant d'exécuter la suite.
 */
export default defineConfig({
  testDir: "./e2e",
  /*
    Le serveur de développement compile chaque route à la demande, au premier
    hit. Le premier accès à `/alertes/[id]` ou à `/dashboard/admin` dans une
    session de compilation fraîche peut prendre plus de dix secondes à lui
    seul — ce n'est pas une lenteur applicative, c'est Turbopack qui construit
    la route. Un délai généreux absorbe ce coût plutôt que de le confondre avec
    une régression.
  */
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
