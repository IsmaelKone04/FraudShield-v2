import { expect, test, type Page } from "@playwright/test"

/**
 * Le parcours que rien d'autre ne peut prouver : se connecter, ouvrir un
 * dossier, trancher, et retrouver la décision après un rechargement complet.
 *
 * Les tests unitaires prouvent que `deciderAlerte` produit le bon écart et la
 * bonne entrée de journal ; ils ne prouvent pas qu'une session s'ouvre
 * réellement dans un navigateur, ni que ce que le store écrit dans
 * `localStorage` en ressort intact après un rechargement — c'est exactement le
 * mécanisme qui tient lieu de persistance tant qu'aucune API d'écriture
 * n'existe (voir `lib/api/mutations.ts`).
 *
 * A-2026-0125 et A-2026-0124 sont choisis parce qu'ils sont stables dans le
 * jeu de démonstration : « En cours », sans décision — le test échouerait
 * franchement le jour où ce ne serait plus vrai, plutôt que de glisser sur un
 * autre dossier au hasard.
 */

/**
 * Ouvre une session : remplit le formulaire, soumet, attend le tableau de
 * bord. NextAuth vérifie l'empreinte du mot de passe côté serveur — c'est plus
 * lent qu'une navigation ordinaire, d'où le délai généreux plutôt que le délai
 * par défaut de l'assertion.
 */
async function connexion(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("Adresse Email").fill(email)
  await page.getByLabel("Mot de passe").fill("Demo1234!")
  await page.getByRole("button", { name: "Se connecter" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

test("connexion, décision sur un dossier, et persistance au rechargement", async ({
  page,
}) => {
  await connexion(page, "analyste@fraudshield.com")

  await page.goto("/alertes/A-2026-0125")
  await expect(page.getByRole("heading", { name: "Décision" })).toBeVisible()

  // Avant décision : les boutons de décision sont proposés, aucune décision
  // n'est encore affichée.
  await expect(
    page.getByRole("button", { name: "Revenir sur la décision" })
  ).toHaveCount(0)

  await page.getByRole("button", { name: "Confirmer la fraude" }).click()
  await page
    .getByLabel(/Motif/)
    .fill(
      "Trois actes facturés le même jour pour le même assuré, sans justification médicale."
    )
  await page.getByRole("button", { name: "Enregistrer la décision" }).click()

  // La décision remplace les boutons par son propre résumé, et le statut du
  // dossier — affiché ailleurs sur la page — bascule avec elle.
  await expect(page.getByText("Fraude confirmée").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Revenir sur la décision" })
  ).toBeVisible()

  /*
    Un rechargement complet réinitialise React, mais pas `localStorage` : c'est
    précisément ce que ce test vérifie, et ce qu'aucun test de composant ne
    peut vérifier — il monte le composant sans jamais quitter la page.
  */
  await page.reload()
  await expect(page.getByText("Fraude confirmée").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Revenir sur la décision" })
  ).toBeVisible()

  // La revue défait la décision et rend au dossier son statut antérieur — le
  // test se nettoie lui-même plutôt que de laisser un dossier tranché pour la
  // prochaine exécution.
  await page.getByRole("button", { name: "Revenir sur la décision" }).click()
  await expect(
    page.getByRole("button", { name: "Confirmer la fraude" })
  ).toBeVisible()
})

test("la piste d'audit reçoit la décision, avec le motif rédigé", async ({
  page,
}) => {
  await connexion(page, "admin@fraudshield.com")

  await page.goto("/alertes/A-2026-0124")
  await page.getByRole("button", { name: "Demander une pièce" }).click()
  const motif = "Facture de l'établissement manquante au dossier."
  await page.getByLabel(/Motif/).fill(motif)
  await page.getByRole("button", { name: "Enregistrer la décision" }).click()

  // « Pièce demandée » apparaît plusieurs fois sur la page une fois la
  // décision prise (le résumé, l'info-bulle du bouton d'annulation) : on vise
  // le panneau Décision, sans ambiguïté.
  await expect(
    page.getByRole("heading", { name: "Décision" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Revenir sur la décision" })
  ).toBeVisible()

  /*
    Le journal enregistre les états tels qu'ils s'affichaient, jamais les
    valeurs internes (voir ADR de D5) : c'est le motif rédigé par l'analyste,
    et non un code d'action, qui doit apparaître ici.

    La navigation passe par le lien du sommaire, pas par `page.goto` : un
    changement complet de page décharge le document avant que l'écriture dans
    `localStorage` — asynchrone chez Zustand — n'ait forcément eu le temps de
    se terminer. Un clic sur le lien du sommaire est une transition côté
    client : le store reste le même objet en mémoire, sans passer par
    localStorage du tout. C'est aussi le geste qu'un analyste ferait vraiment.
  */
  await page.getByRole("link", { name: /Journal d'audit/ }).click()
  await expect(page.getByText(motif)).toBeVisible()

  // Nettoyage : revenir sur la décision pour ne pas laisser le dossier
  // tranché d'une exécution à l'autre.
  await page.goto("/alertes/A-2026-0124")
  await page.getByRole("button", { name: "Revenir sur la décision" }).click()
})
