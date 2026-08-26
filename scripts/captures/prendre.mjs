import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"

/**
 * Capture d'écran des cinq différenciateurs et de l'écran de notation, pour
 * illustrer README.md et docs/ARCHITECTURE.md sans les composer à la main.
 *
 * Le projet embarque déjà Playwright pour P5-5b (parcours de bout en bout) —
 * l'ajouter spécifiquement pour des captures ne se justifiait pas (ADR-005),
 * le réutiliser une fois qu'il est là pour une autre raison, si.
 *
 * `npm run captures:prendre` — nécessite le serveur de développement démarré
 * (`npm run dev`), et les comptes de démonstration du dépôt.
 */

const BASE_URL = process.env.CAPTURES_BASE_URL || "http://localhost:3000"
const DOSSIER = path.resolve("docs/captures")
const VIEWPORT = { width: 1440, height: 900 }

async function connexion(page, email) {
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel("Adresse Email").fill(email)
  await page.getByLabel("Mot de passe").fill("Demo1234!")
  await page.getByRole("button", { name: "Se connecter" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

/** Masque l'indicateur de développement de Next.js — hors sujet sur une capture. */
const MASQUER_INDICATEUR_DEV = `
  [data-nextjs-dev-tools-button], #__next-build-watcher, nextjs-portal { display: none !important; }
`

async function capturer(page, url, fichier, { attendre } = {}) {
  await page.goto(`${BASE_URL}${url}`)
  if (attendre) await page.getByText(attendre).first().waitFor({ timeout: 15_000 })
  await page.addStyleTag({ content: MASQUER_INDICATEUR_DEV })
  await page.waitForTimeout(300) // laisse Recharts et les transitions se poser
  await page.screenshot({ path: path.join(DOSSIER, fichier) })
  console.log(`  ✓ ${fichier}`)
}

async function main() {
  await mkdir(DOSSIER, { recursive: true })

  const navigateur = await chromium.launch()
  const contexteAnalyste = await navigateur.newContext({ viewport: VIEWPORT })
  const page = await contexteAnalyste.newPage()

  console.log("Connexion analyste...")
  await connexion(page, "analyste@fraudshield.com")

  console.log("Captures (compte analyste) :")
  await capturer(page, "/dashboard", "01-dashboard.png", { attendre: "Alertes détectées" })
  await capturer(page, "/alertes/A-2026-0125", "02-decomposition-score.png", {
    attendre: "Pourquoi ce score",
  })
  await capturer(page, "/qualite", "03-qualite-boucle-retroaction.png", {
    attendre: "Précision",
  })
  await capturer(page, "/simulation", "04-simulateur-seuils.png", {
    attendre: "Seuil de déclenchement",
  })
  await capturer(page, "/reseaux/RES-2026-001", "05-graphe-reseaux.png", {
    attendre: "Réseau de surfacturation",
  })
  await capturer(page, "/notation", "06-notation-modele-auto.png", {
    attendre: "Notation d'une déclaration",
  })
  await capturer(page, "/portefeuille", "07-portefeuille-reference.png", {
    attendre: "Portefeuille de référence",
  })

  console.log("Connexion administrateur...")
  const contexteAdmin = await navigateur.newContext({ viewport: VIEWPORT })
  const pageAdmin = await contexteAdmin.newPage()
  await connexion(pageAdmin, "admin@fraudshield.com")
  console.log("Captures (compte administrateur) :")
  await capturer(pageAdmin, "/dashboard/admin", "08-piste-audit.png", {
    attendre: "Journal d'audit",
  })

  await navigateur.close()
  console.log(`\nTerminé — captures écrites dans ${DOSSIER}`)
}

main().catch((erreur) => {
  console.error(erreur)
  process.exit(1)
})
