import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/*
  Le journal, éprouvé sur le câblage réel.

  `defaireDecisionsNonQualifiees` (migration.test.ts) et les fonctions pures de
  `lib/journal.ts` portent leurs propres suites ; celle-ci porte sur ce
  qu'aucune des deux ne peut garantir seule : **ce que produit une action de la
  console**. C'est là que se joue la promesse de la tranche D5 — « toute action
  métier laisse une trace » — et deux propriétés qu'une fonction pure ne peut
  pas prouver : qu'une action refusée par le service n'en laisse aucune, et que
  l'annulation d'une décision journalise elle-même une entrée plutôt que de
  faire disparaître la précédente sans rien dire.

  `@/lib/api/mutations` est simulé : c'est la seule façon de provoquer un refus
  du service sans dépendre du réseau, et le store doit se comporter à
  l'identique dans les deux cas — optimiste tant que ça tient, défait dès que ça
  casse.
*/

vi.mock("@/lib/api/mutations", () => ({
  envoyerModificationAlerte: vi.fn(async () => {}),
  envoyerModificationInvestigation: vi.fn(async () => {}),
  envoyerModificationParametres: vi.fn(async () => {}),
}))

const mutations = await import("@/lib/api/mutations")
const { useModificationsStore } = await import("@/lib/store/modifications.store")
const { useJournalStore } = await import("@/lib/store/journal.store")

const ETAT_VIDE = {
  alertes: {},
  investigations: {},
  parametres: null,
} as const

beforeEach(() => {
  // Fusion, pas remplacement : `setState(..., true)` écraserait aussi les
  // actions du store, qui vivent dans le même objet d'état chez Zustand.
  useModificationsStore.setState(ETAT_VIDE)
  useJournalStore.setState({ entrees: [], acteur: "analyste@fraudshield.com" })
  vi.mocked(mutations.envoyerModificationAlerte).mockClear()
  vi.mocked(mutations.envoyerModificationAlerte).mockResolvedValue()
  vi.mocked(mutations.envoyerModificationInvestigation).mockClear()
  vi.mocked(mutations.envoyerModificationInvestigation).mockResolvedValue()
  vi.mocked(mutations.envoyerModificationParametres).mockClear()
  vi.mocked(mutations.envoyerModificationParametres).mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** La dernière entrée écrite au journal — celle que l'action qu'on vient d'appeler a produite. */
const derniereEntree = () => {
  const { entrees } = useJournalStore.getState()
  return entrees[entrees.length - 1]
}

describe("le contrat optimiste", () => {
  it("applique la modification avant même que l'envoi ne réponde", async () => {
    let resoudre!: () => void
    vi.mocked(mutations.envoyerModificationAlerte).mockReturnValue(
      new Promise((r) => (resoudre = r))
    )

    const promesse = useModificationsStore
      .getState()
      .changerStatutAlerte("A-1", "Résolu", "En cours")

    // Avant même que l'envoi ne se résolve, l'écran doit déjà montrer le
    // nouveau statut — c'est tout l'intérêt de l'optimisme.
    expect(useModificationsStore.getState().alertes["A-1"]?.statut).toBe("Résolu")

    resoudre()
    await promesse
  })

  it("défait la modification quand le service refuse", async () => {
    vi.mocked(mutations.envoyerModificationAlerte).mockRejectedValue(
      new Error("503")
    )

    await expect(
      useModificationsStore.getState().changerStatutAlerte("A-1", "Résolu", "En cours")
    ).rejects.toThrow("503")

    // L'écran ne doit garder aucune trace d'un changement que le service a
    // refusé : ni le nouveau statut, ni même l'entrée elle-même si le dossier
    // n'en avait aucune avant.
    expect(useModificationsStore.getState().alertes["A-1"]).toBeUndefined()
  })

  it("restaure l'état antérieur, pas un état vide, sur un dossier déjà modifié", async () => {
    await useModificationsStore.getState().changerStatutAlerte("A-1", "À vérifier", "En cours")

    vi.mocked(mutations.envoyerModificationAlerte).mockRejectedValue(new Error("503"))
    await expect(
      useModificationsStore.getState().changerStatutAlerte("A-1", "Résolu", "À vérifier")
    ).rejects.toThrow()

    // Le refus du second changement ne doit pas effacer le premier.
    expect(useModificationsStore.getState().alertes["A-1"]?.statut).toBe("À vérifier")
  })

  it("ne journalise rien quand le service refuse", async () => {
    // La propriété centrale de cette tranche : le journal consigne ce qui a eu
    // lieu, pas ce qui a été tenté.
    vi.mocked(mutations.envoyerModificationAlerte).mockRejectedValue(new Error("503"))
    await expect(
      useModificationsStore.getState().changerStatutAlerte("A-1", "Résolu", "En cours")
    ).rejects.toThrow()

    expect(useJournalStore.getState().entrees).toHaveLength(0)
  })

  it("journalise après un envoi réussi, jamais avant", async () => {
    await useModificationsStore.getState().changerStatutAlerte("A-1", "Résolu", "En cours")
    expect(useJournalStore.getState().entrees).toHaveLength(1)
    expect(derniereEntree().action).toBe("statut_alerte")
    expect(derniereEntree().avant).toBe("En cours")
    expect(derniereEntree().apres).toBe("Résolu")
  })
})

describe("assignerAlerte", () => {
  it("journalise des noms, pas des adresses", async () => {
    // Le journal enregistre les états tels qu'ils s'affichaient : un
    // contrôleur qui le relit des mois après doit y retrouver ce que
    // l'analyste avait devant lui, pas un identifiant technique.
    await useModificationsStore
      .getState()
      .assignerAlerte("A-1", "analyste@fraudshield.com", null)

    expect(derniereEntree().apres).not.toContain("@")
    expect(derniereEntree().avant).toBe("Non assignée")
  })
})

describe("deciderAlerte et annulerDecisionAlerte", () => {
  it("fait porter le statut du dossier à celui que la décision entraîne", async () => {
    await useModificationsStore.getState().deciderAlerte("A-1", {
      type: "fraude_confirmee",
      motif: "Trois actes facturés le même jour.",
      acteur: "analyste@fraudshield.com",
      statutAnterieur: "En cours",
    })

    expect(useModificationsStore.getState().alertes["A-1"]?.statut).toBe("Résolu")
  })

  it("journalise le motif de la décision", async () => {
    await useModificationsStore.getState().deciderAlerte("A-1", {
      type: "classee_sans_suite",
      cause: "seuil_trop_bas",
      motif: "Le dossier est régulier.",
      acteur: "analyste@fraudshield.com",
      statutAnterieur: "En cours",
    })

    expect(derniereEntree().motif).toBe("Le dossier est régulier.")
    expect(derniereEntree().apres).toContain("Seuil trop bas")
  })

  it("l'annulation rend au dossier son statut antérieur", async () => {
    await useModificationsStore.getState().deciderAlerte("A-1", {
      type: "fraude_confirmee",
      motif: "Motif initial.",
      acteur: "analyste@fraudshield.com",
      statutAnterieur: "En cours",
    })

    await useModificationsStore.getState().annulerDecisionAlerte("A-1")

    expect(useModificationsStore.getState().alertes["A-1"]?.statut).toBe("En cours")
    expect(useModificationsStore.getState().alertes["A-1"]?.decision).toBeUndefined()
  })

  it("l'annulation journalise sa propre entrée, avec le motif de la décision défaite", async () => {
    // Sans cette ligne, rien n'attesterait qu'une décision a existé : elle
    // disparaît du dossier, il ne doit pas disparaître du journal.
    await useModificationsStore.getState().deciderAlerte("A-1", {
      type: "fraude_confirmee",
      motif: "Motif à conserver.",
      acteur: "analyste@fraudshield.com",
      statutAnterieur: "En cours",
    })
    const apresDecision = useJournalStore.getState().entrees.length

    await useModificationsStore.getState().annulerDecisionAlerte("A-1")

    expect(useJournalStore.getState().entrees.length).toBe(apresDecision + 1)
    expect(derniereEntree().action).toBe("annulation_decision")
    expect(derniereEntree().motif).toBe("Motif à conserver.")
  })

  it("n'appelle pas le service et ne journalise rien sur un dossier sans décision", async () => {
    await useModificationsStore.getState().annulerDecisionAlerte("A-1")

    expect(mutations.envoyerModificationAlerte).not.toHaveBeenCalled()
    expect(useJournalStore.getState().entrees).toHaveLength(0)
  })
})

describe("ajouterNote et supprimerNote", () => {
  it("empilent les notes sans écraser les précédentes", async () => {
    await useModificationsStore.getState().ajouterNote("A-1", {
      texte: "Première note.",
      auteur: "analyste@fraudshield.com",
    })
    await useModificationsStore.getState().ajouterNote("A-1", {
      texte: "Seconde note.",
      auteur: "analyste@fraudshield.com",
    })

    expect(useModificationsStore.getState().alertes["A-1"]?.notes).toHaveLength(2)
  })

  it("journalise le texte relevé avant suppression, qui n'existe plus ensuite", async () => {
    await useModificationsStore.getState().ajouterNote("A-1", {
      texte: "À supprimer.",
      auteur: "analyste@fraudshield.com",
    })
    const noteId = useModificationsStore.getState().alertes["A-1"]!.notes![0].id

    await useModificationsStore.getState().supprimerNote("A-1", noteId)

    expect(derniereEntree().action).toBe("note_supprimee")
    expect(derniereEntree().avant).toBe("À supprimer.")
    expect(useModificationsStore.getState().alertes["A-1"]?.notes).toHaveLength(0)
  })
})

describe("reinitialiser", () => {
  it("journalise la remise à zéro elle-même", async () => {
    await useModificationsStore.getState().changerStatutAlerte("A-1", "Résolu", "En cours")

    useModificationsStore.getState().reinitialiser()

    expect(useModificationsStore.getState().alertes).toEqual({})
    expect(derniereEntree().action).toBe("modifications_reinitialisees")
  })

  it("ne journalise rien s'il n'y avait rien à effacer", () => {
    useModificationsStore.getState().reinitialiser()
    expect(useJournalStore.getState().entrees).toHaveLength(0)
  })

  it("ne touche pas aux réglages : ils ont leur propre remise à zéro", async () => {
    await useModificationsStore.getState().enregistrerParametres(
      { seuilAlerteIA: 80 },
      { seuilAlerteIA: 70 } as never,
      { seuilAlerteIA: 80 } as never
    )
    await useModificationsStore.getState().changerStatutAlerte("A-1", "Résolu", "En cours")

    useModificationsStore.getState().reinitialiser()

    expect(useModificationsStore.getState().parametres).not.toBeNull()
  })
})

describe("enregistrerParametres", () => {
  it("efface l'entrée quand l'écart revient à zéro", async () => {
    // Revenir aux valeurs d'origine ne laisse pas de trace : un réglage égal à
    // celui du serveur n'est plus un écart.
    await useModificationsStore.getState().enregistrerParametres(
      {},
      { seuilAlerteIA: 70 } as never,
      { seuilAlerteIA: 70 } as never
    )
    expect(useModificationsStore.getState().parametres).toBeNull()
  })

  it("journalise une entrée par réglage effectivement déplacé, pas une par enregistrement", async () => {
    await useModificationsStore.getState().enregistrerParametres(
      { seuilAlerteIA: 80, retentionDonnees: 90 } as never,
      { seuilAlerteIA: 70, retentionDonnees: 90 } as never,
      { seuilAlerteIA: 80, retentionDonnees: 90 } as never
    )

    const entrees = useJournalStore.getState().entrees
    expect(entrees).toHaveLength(1)
    expect(entrees[0].cible).toBe("seuilAlerteIA")
  })

  it("restaure les réglages précédents quand l'envoi échoue", async () => {
    await useModificationsStore.getState().enregistrerParametres(
      { seuilAlerteIA: 80 } as never,
      { seuilAlerteIA: 70 } as never,
      { seuilAlerteIA: 80 } as never
    )

    vi.mocked(mutations.envoyerModificationParametres).mockRejectedValue(
      new Error("503")
    )
    await expect(
      useModificationsStore
        .getState()
        .enregistrerParametres(
          { seuilAlerteIA: 90 } as never,
          { seuilAlerteIA: 80 } as never,
          { seuilAlerteIA: 90 } as never
        )
    ).rejects.toThrow()

    expect(
      (useModificationsStore.getState().parametres?.valeurs as { seuilAlerteIA?: number })
        ?.seuilAlerteIA
    ).toBe(80)
  })
})
