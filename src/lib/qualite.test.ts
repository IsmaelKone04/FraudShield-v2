import { describe, expect, it } from "vitest"

import type { PeriodeQualite, SeuilDerive } from "@/lib/schemas/qualite.schema"
import {
  derivesConstatees,
  dernierMois,
  fauxPositifsImputables,
  integrerDecisions,
  parMois,
  parTypeDeFraude,
  precision,
  rappelEstime,
  registreDesCauses,
  tauxFauxPositifs,
  tauxFauxPositifsModele,
  totaliser,
  tranches,
  type DecisionMesurable,
} from "@/lib/qualite"

/*
  Cet écran mesure le détecteur, pas la fraude. La règle qui traverse tout le
  module tient en une phrase : **un dossier refermé sans conclusion n'est ni une
  réussite ni un échec**. Le compter au dénominateur ferait baisser la précision
  à chaque dossier abandonné faute de pièces, ce qui n'apprend rien sur le
  modèle. La plupart des tests ci-dessous éprouvent cette frontière-là, et celle
  qui sépare un faux positif imputable au modèle d'un problème de transmission.
*/

/** Une case du tableau, dont on ne renseigne que ce que le test regarde. */
function periode(partiel: Partial<PeriodeQualite> = {}): PeriodeQualite {
  return {
    mois: "2026-05",
    moisLibelle: "Mai 2026",
    typeFraude: "Double facturation",
    clos: 0,
    confirmes: 0,
    fauxPositifs: 0,
    nonConcluants: 0,
    fauxPositifsParCause: [],
    manquesEstimes: 0,
    baseEstimation: "sondage de 120 dossiers",
    ...partiel,
  }
}

describe("fauxPositifsImputables", () => {
  it("ne retient que les causes qui se corrigent dans le modèle", () => {
    // `seuil_trop_bas` et `contexte_medical` sont imputables au modèle ;
    // `doublon_administratif` relève de la transmission.
    const p = periode({
      fauxPositifsParCause: [
        { cause: "seuil_trop_bas", quantite: 4 },
        { cause: "contexte_medical", quantite: 2 },
        { cause: "doublon_administratif", quantite: 9 },
      ],
    })
    expect(fauxPositifsImputables(p)).toBe(6)
  })

  it("vaut zéro quand aucune cause n'a été retenue", () => {
    expect(fauxPositifsImputables(periode())).toBe(0)
  })
})

describe("totaliser", () => {
  it("additionne case par case, y compris la part imputable au modèle", () => {
    const totaux = totaliser([
      periode({
        clos: 10,
        confirmes: 6,
        fauxPositifs: 3,
        nonConcluants: 1,
        manquesEstimes: 2,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 3 }],
      }),
      periode({
        clos: 5,
        confirmes: 1,
        fauxPositifs: 4,
        nonConcluants: 0,
        manquesEstimes: 1,
        fauxPositifsParCause: [{ cause: "doublon_administratif", quantite: 4 }],
      }),
    ])

    expect(totaux).toEqual({
      clos: 15,
      confirmes: 7,
      fauxPositifs: 7,
      nonConcluants: 1,
      fauxPositifsModele: 3,
      manquesEstimes: 3,
    })
  })

  it("rend des totaux nuls sur une liste vide", () => {
    expect(totaliser([])).toEqual({
      clos: 0,
      confirmes: 0,
      fauxPositifs: 0,
      nonConcluants: 0,
      fauxPositifsModele: 0,
      manquesEstimes: 0,
    })
  })

  it("ne conserve rien d'un appel à l'autre", () => {
    // L'accumulateur part d'une constante partagée : la muter ferait dériver
    // tous les totaux suivants.
    const un = totaliser([periode({ clos: 3, confirmes: 3 })])
    const deux = totaliser([])
    expect(un.clos).toBe(3)
    expect(deux.clos).toBe(0)
  })
})

describe("les dénominateurs", () => {
  const totaux = totaliser([
    periode({ clos: 20, confirmes: 12, fauxPositifs: 4, nonConcluants: 4 }),
  ])

  it("ne compte comme tranchés que les dossiers ayant un verdict", () => {
    // 12 + 4, et non 20 : les quatre non concluants n'ont rien tranché.
    expect(tranches(totaux)).toBe(16)
  })

  it("juge la précision sur ce seul dénominateur", () => {
    expect(precision(totaux)).toBeCloseTo(12 / 16, 10)
  })

  it("donne un taux de faux positifs complémentaire de la précision", () => {
    expect((precision(totaux) ?? 0) + (tauxFauxPositifs(totaux) ?? 0)).toBeCloseTo(1, 10)
  })
})

describe("les taux devant l'absence de données", () => {
  const vide = totaliser([periode({ clos: 3, nonConcluants: 3 })])

  it("refusent de conclure plutôt que d'écrire zéro", () => {
    // « 0 % » ferait d'un mois sans dossier tranché un mois à précision nulle,
    // et la courbe plongerait sans qu'il ne se soit rien passé.
    expect(precision(vide)).toBeNull()
    expect(tauxFauxPositifs(vide)).toBeNull()
    expect(tauxFauxPositifsModele(vide)).toBeNull()
  })

  it("distinguent bien de zéro pour de vrai", () => {
    const zero = totaliser([periode({ clos: 5, fauxPositifs: 5 })])
    expect(precision(zero)).toBe(0)
  })
})

describe("tauxFauxPositifsModele", () => {
  it("écarte les faux positifs qui ne se corrigent pas dans le modèle", () => {
    const totaux = totaliser([
      periode({
        clos: 10,
        confirmes: 2,
        fauxPositifs: 8,
        fauxPositifsParCause: [
          { cause: "seuil_trop_bas", quantite: 2 },
          { cause: "doublon_administratif", quantite: 6 },
        ],
      }),
    ])
    // Le taux brut vaut 8/10 ; celui qui déclenche la dérive, 2/10.
    expect(tauxFauxPositifs(totaux)).toBeCloseTo(0.8, 10)
    expect(tauxFauxPositifsModele(totaux)).toBeCloseTo(0.2, 10)
  })
})

describe("rappelEstime", () => {
  it("rapporte les fraudes signalées à celles qu'on estime réelles", () => {
    const totaux = totaliser([
      periode({ clos: 10, confirmes: 8, manquesEstimes: 2 }),
    ])
    expect(rappelEstime(totaux)).toBeCloseTo(8 / 10, 10)
  })

  it("refuse de conclure quand aucune fraude n'est connue ni estimée", () => {
    const totaux = totaliser([periode({ clos: 4, fauxPositifs: 4 })])
    expect(rappelEstime(totaux)).toBeNull()
  })

  it("ne dépend pas des dossiers non concluants", () => {
    // Le dénominateur est une estimation de ce qui existe, pas un comptage de
    // ce qui a été instruit.
    const sans = totaliser([periode({ confirmes: 8, manquesEstimes: 2 })])
    const avec = totaliser([
      periode({ confirmes: 8, manquesEstimes: 2, nonConcluants: 50 }),
    ])
    expect(rappelEstime(sans)).toBe(rappelEstime(avec))
  })
})

describe("parMois", () => {
  const periodes = [
    periode({ mois: "2026-05", moisLibelle: "Mai 2026", clos: 2 }),
    periode({ mois: "2026-03", moisLibelle: "Mars 2026", clos: 1 }),
    periode({
      mois: "2026-05",
      moisLibelle: "Mai 2026",
      typeFraude: "Acte fictif",
      clos: 3,
    }),
  ]

  it("range les mois par ordre chronologique", () => {
    expect(parMois(periodes).map((s) => s.mois)).toEqual(["2026-03", "2026-05"])
  })

  it("fond les types de fraude d'un même mois", () => {
    const mai = parMois(periodes).find((s) => s.mois === "2026-05")
    expect(mai?.totaux.clos).toBe(5)
  })

  it("reprend le libellé écrit du mois", () => {
    expect(parMois(periodes)[0].moisLibelle).toBe("Mars 2026")
  })

  it("rend une série vide sur une liste vide", () => {
    expect(parMois([])).toEqual([])
  })
})

describe("parTypeDeFraude", () => {
  it("classe du plus bruyant au moins bruyant", () => {
    const series = parTypeDeFraude([
      periode({ typeFraude: "Calme", clos: 10, confirmes: 9, fauxPositifs: 1 }),
      periode({ typeFraude: "Bruyant", clos: 10, confirmes: 2, fauxPositifs: 8 }),
    ])
    expect(series.map((s) => s.typeFraude)).toEqual(["Bruyant", "Calme"])
  })

  it("range en dernier un type dont rien n'a été tranché", () => {
    // Son taux est inconnu, pas nul : le placer en tête le ferait passer pour
    // le plus bruyant.
    const series = parTypeDeFraude([
      periode({ typeFraude: "Inconnu", clos: 4, nonConcluants: 4 }),
      periode({ typeFraude: "Mesuré", clos: 10, confirmes: 9, fauxPositifs: 1 }),
    ])
    expect(series[series.length - 1].typeFraude).toBe("Inconnu")
  })
})

describe("registreDesCauses", () => {
  const periodes = [
    periode({
      fauxPositifsParCause: [
        { cause: "seuil_trop_bas", quantite: 3 },
        { cause: "doublon_administratif", quantite: 5 },
      ],
    }),
    periode({
      mois: "2026-04",
      fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 1 }],
    }),
  ]

  it("agrège une même cause à travers les mois et les types", () => {
    const registre = registreDesCauses(periodes)
    expect(registre.find((l) => l.cause === "seuil_trop_bas")?.quantite).toBe(4)
  })

  it("classe de la cause la plus fréquente à la moins fréquente", () => {
    expect(registreDesCauses(periodes).map((l) => l.cause)).toEqual([
      "doublon_administratif",
      "seuil_trop_bas",
    ])
  })

  it("donne des parts qui font un", () => {
    const somme = registreDesCauses(periodes).reduce((s, l) => s + l.part, 0)
    expect(somme).toBeCloseTo(1, 10)
  })

  it("reporte l'imputabilité de chaque cause", () => {
    const registre = registreDesCauses(periodes)
    expect(registre.find((l) => l.cause === "seuil_trop_bas")?.imputableAuModele).toBe(true)
    expect(
      registre.find((l) => l.cause === "doublon_administratif")?.imputableAuModele
    ).toBe(false)
  })

  it("rend un registre vide plutôt qu'une division par zéro", () => {
    expect(registreDesCauses([periode()])).toEqual([])
  })
})

describe("dernierMois", () => {
  it("rend le mois le plus récent, quel que soit l'ordre reçu", () => {
    expect(
      dernierMois([periode({ mois: "2026-03" }), periode({ mois: "2026-05" })])
    ).toBe("2026-05")
  })

  it("rend null sur une liste vide", () => {
    expect(dernierMois([])).toBeNull()
  })
})

describe("derivesConstatees", () => {
  const seuils: SeuilDerive[] = [
    {
      typeFraude: "Double facturation",
      seuil: 0.2,
      justification: "se tranche sur pièces",
    },
    {
      typeFraude: "Acte fictif",
      seuil: 0.4,
      justification: "demande un avis médical",
    },
  ]

  it("signale un type dont le taux imputable dépasse son seuil", () => {
    const periodes = [
      periode({
        typeFraude: "Double facturation",
        clos: 20,
        confirmes: 8,
        fauxPositifs: 12,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 12 }],
      }),
    ]
    const derives = derivesConstatees(periodes, seuils)
    expect(derives).toHaveLength(1)
    expect(derives[0].typeFraude).toBe("Double facturation")
    expect(derives[0].taux).toBeCloseTo(0.6, 10)
  })

  it("ne compte pas les faux positifs qui ne relèvent pas du modèle", () => {
    // Douze dossiers écartés pour doublon administratif : le taux brut crève le
    // seuil, mais réclamer un réentraînement n'y changerait rien.
    const periodes = [
      periode({
        typeFraude: "Double facturation",
        clos: 20,
        confirmes: 8,
        fauxPositifs: 12,
        fauxPositifsParCause: [{ cause: "doublon_administratif", quantite: 12 }],
      }),
    ]
    expect(derivesConstatees(periodes, seuils)).toEqual([])
  })

  it("se tait en dessous du minimum de dossiers tranchés", () => {
    // Deux dossiers sur trois écartés font 67 %, et ne disent rien.
    const periodes = [
      periode({
        typeFraude: "Double facturation",
        clos: 3,
        confirmes: 1,
        fauxPositifs: 2,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 2 }],
      }),
    ]
    expect(derivesConstatees(periodes, seuils)).toEqual([])
    expect(derivesConstatees(periodes, seuils, 3)).toHaveLength(1)
  })

  it("respecte le seuil propre à chaque type de fraude", () => {
    // Le même taux de 30 % dépasse le seuil de la double facturation (20 %) et
    // reste sous celui de l'acte fictif (40 %).
    const bruit = (typeFraude: string) =>
      periode({
        typeFraude,
        clos: 20,
        confirmes: 14,
        fauxPositifs: 6,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 6 }],
      })
    const derives = derivesConstatees(
      [bruit("Double facturation"), bruit("Acte fictif")],
      seuils
    )
    expect(derives.map((d) => d.typeFraude)).toEqual(["Double facturation"])
  })

  it("n'observe que le dernier mois du jeu", () => {
    const periodes = [
      periode({
        mois: "2026-03",
        typeFraude: "Double facturation",
        clos: 20,
        confirmes: 2,
        fauxPositifs: 18,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 18 }],
      }),
      periode({
        mois: "2026-05",
        typeFraude: "Double facturation",
        clos: 20,
        confirmes: 19,
        fauxPositifs: 1,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 1 }],
      }),
    ]
    expect(derivesConstatees(periodes, seuils)).toEqual([])
  })

  it("classe par ampleur du dépassement, pas par taux brut", () => {
    const periodes = [
      // 60 % contre un seuil de 20 : dépassement de 40 points.
      periode({
        typeFraude: "Double facturation",
        clos: 20,
        confirmes: 8,
        fauxPositifs: 12,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 12 }],
      }),
      // 90 % contre un seuil de 40 : dépassement de 50 points.
      periode({
        typeFraude: "Acte fictif",
        clos: 20,
        confirmes: 2,
        fauxPositifs: 18,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 18 }],
      }),
    ]
    expect(derivesConstatees(periodes, seuils).map((d) => d.typeFraude)).toEqual([
      "Acte fictif",
      "Double facturation",
    ])
  })

  it("porte la justification du seuil jusqu'au bandeau", () => {
    // Sans elle, « dérive constatée » est une alarme sans motif.
    const periodes = [
      periode({
        typeFraude: "Double facturation",
        clos: 20,
        confirmes: 8,
        fauxPositifs: 12,
        fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 12 }],
      }),
    ]
    expect(derivesConstatees(periodes, seuils)[0].justification).toBe(
      "se tranche sur pièces"
    )
  })

  it("ne signale rien sur un jeu vide", () => {
    expect(derivesConstatees([], seuils)).toEqual([])
  })
})

describe("integrerDecisions", () => {
  const base = [
    periode({
      mois: "2026-04",
      typeFraude: "Double facturation",
      clos: 5,
      confirmes: 5,
    }),
    periode({
      mois: "2026-05",
      typeFraude: "Double facturation",
      clos: 10,
      confirmes: 6,
      fauxPositifs: 4,
      fauxPositifsParCause: [{ cause: "seuil_trop_bas", quantite: 4 }],
    }),
  ]

  const decision = (partiel: Partial<DecisionMesurable> = {}): DecisionMesurable => ({
    typeFraude: "Double facturation",
    type: "fraude_confirmee",
    ...partiel,
  })

  it("rattache la décision au dernier mois observé", () => {
    // Et non au mois réel : le jeu s'arrête à mai 2026, et ouvrir un mois vide
    // entre les deux ferait plonger toutes les courbes pour rien.
    const apres = integrerDecisions(base, [decision()])
    const mai = apres.find((p) => p.mois === "2026-05")
    expect(mai?.confirmes).toBe(7)
    expect(mai?.clos).toBe(11)
  })

  it("laisse le jeu d'origine intact", () => {
    // L'écran recalcule à chaque décision : muter le jeu servi cumulerait les
    // décisions à chaque rendu.
    integrerDecisions(base, [decision()])
    expect(base.find((p) => p.mois === "2026-05")?.confirmes).toBe(6)
    expect(
      base.find((p) => p.mois === "2026-05")?.fauxPositifsParCause[0].quantite
    ).toBe(4)
  })

  it("compte un classement sans suite sous sa cause", () => {
    const apres = integrerDecisions(base, [
      decision({ type: "classee_sans_suite", cause: "contexte_medical" }),
    ])
    const mai = apres.find((p) => p.mois === "2026-05")
    expect(mai?.fauxPositifs).toBe(5)
    expect(
      mai?.fauxPositifsParCause.find((l) => l.cause === "contexte_medical")?.quantite
    ).toBe(1)
  })

  it("incrémente une cause déjà présente au lieu de la dupliquer", () => {
    const apres = integrerDecisions(base, [
      decision({ type: "classee_sans_suite", cause: "seuil_trop_bas" }),
    ])
    const lignes = apres.find((p) => p.mois === "2026-05")!.fauxPositifsParCause
    expect(lignes).toHaveLength(1)
    expect(lignes[0].quantite).toBe(5)
  })

  it("ne compte pas une demande de pièce", () => {
    // Le dossier reste ouvert : il n'a rien tranché.
    const apres = integrerDecisions(base, [decision({ type: "piece_demandee" })])
    const mai = apres.find((p) => p.mois === "2026-05")
    expect(mai?.clos).toBe(10)
  })

  it("ouvre une case pour un type de fraude absent du mois", () => {
    const apres = integrerDecisions(base, [
      decision({ typeFraude: "Acte fictif" }),
    ])
    const nouvelle = apres.find(
      (p) => p.mois === "2026-05" && p.typeFraude === "Acte fictif"
    )
    expect(nouvelle?.confirmes).toBe(1)
    expect(nouvelle?.moisLibelle).toBe("Mai 2026")
    expect(nouvelle?.baseEstimation).toContain("Aucun sondage")
  })

  it("rend le jeu tel quel quand il n'y a rien à intégrer", () => {
    expect(integrerDecisions(base, [])).toBe(base)
  })

  it("ne fabrique rien sur un jeu vide", () => {
    expect(integrerDecisions([], [decision()])).toEqual([])
  })

  it("déplace effectivement la précision du mois", () => {
    // C'est la promesse de la boucle de rétroaction : classer un dossier sans
    // suite change l'écran de qualité, au lieu de disparaître dans un statut.
    const avant = precision(totaliser(base.filter((p) => p.mois === "2026-05")))
    const apres = integrerDecisions(base, [
      decision({ type: "classee_sans_suite", cause: "seuil_trop_bas" }),
    ])
    const recalcule = precision(totaliser(apres.filter((p) => p.mois === "2026-05")))
    expect(recalcule).toBeLessThan(avant!)
  })
})
