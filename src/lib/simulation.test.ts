import { describe, expect, it } from "vitest"

import type {
  SimulationData,
  TrancheScore,
} from "@/lib/schemas/simulation.schema"
import {
  comparer,
  courbe,
  fraudesDeLaPeriode,
  pointRecommande,
  scoreF1,
  seuilsPossibles,
  simuler,
} from "@/lib/simulation"

/*
  Le simulateur répond à « qu'aurait-on vu avec un autre seuil ? ». Son honnêteté
  tient à une distinction portée d'un bout à l'autre : ce qui a été **mesuré**
  (dossiers instruits, sondage) et ce qui est **estimé** (demandes que personne
  n'a regardées). Les tests ci-dessous portent surtout là-dessus — un simulateur
  qui mélangerait les deux promettrait des fraudes qu'il ne peut pas garantir.

  Les tranches sont construites à la main plutôt que lues dans le jeu réel : on
  éprouve le calcul, pas les données. Le jeu réel est éprouvé par les tests du
  service.
*/

/** Une tranche complète, dont on ne renseigne que ce que le test regarde. */
function tranche(partiel: Partial<TrancheScore> & { min: number }): TrancheScore {
  return {
    max: partiel.min + 4,
    demandes: 0,
    fraudes: 0,
    reguliers: 0,
    sansVerdict: 0,
    demandesAuditees: 0,
    fraudesEstimees: 0,
    montantMoyen: 0,
    montantMoyenFraude: 0,
    ...partiel,
  }
}

function population(
  tranches: TrancheScore[],
  partiel: Partial<SimulationData> = {}
): SimulationData {
  return {
    periode: "2026-07",
    seuilActuel: 70,
    joursOuvres: 20,
    capaciteJour: 10,
    baseAudit: "sondage manuel de 400 demandes",
    tranches,
    ...partiel,
  }
}

describe("seuilsPossibles", () => {
  it("rend les bornes basses, de la plus basse à la plus haute", () => {
    const t = [tranche({ min: 80 }), tranche({ min: 60 }), tranche({ min: 70 })]
    expect(seuilsPossibles(t)).toEqual([60, 70, 80])
  })

  it("ne modifie pas le tableau reçu", () => {
    // `sort` trie en place : sans la copie, l'ordre des tranches du jeu de
    // données changerait à la première lecture de la courbe.
    const t = [tranche({ min: 80 }), tranche({ min: 60 })]
    seuilsPossibles(t)
    expect(t.map((x) => x.min)).toEqual([80, 60])
  })
})

describe("fraudesDeLaPeriode", () => {
  const t = [
    tranche({ min: 60, fraudes: 3, fraudesEstimees: 2 }),
    tranche({ min: 80, fraudes: 10, fraudesEstimees: 1 }),
  ]

  it("additionne les fraudes mesurées et estimées de toutes les tranches", () => {
    expect(fraudesDeLaPeriode(t)).toBe(16)
  })

  it("ne dépend pas du seuil", () => {
    // C'est ce qui existe, pas ce qu'on a vu. Un dénominateur qui varierait
    // avec le curseur donnerait un rappel qui monte quand on relève le seuil.
    const bas = simuler(population(t), 60)
    const haut = simuler(population(t), 80)
    expect(bas.fraudesAverees + bas.fraudesEstimees + bas.fraudesManquees).toBe(16)
    expect(haut.fraudesAverees + haut.fraudesEstimees + haut.fraudesManquees).toBe(16)
  })
})

describe("simuler", () => {
  const donnees = population([
    tranche({
      min: 60,
      demandes: 100,
      fraudes: 2,
      reguliers: 8,
      sansVerdict: 90,
      fraudesEstimees: 4,
      montantMoyenFraude: 100000,
    }),
    tranche({
      min: 80,
      demandes: 40,
      fraudes: 12,
      reguliers: 4,
      sansVerdict: 24,
      fraudesEstimees: 2,
      montantMoyenFraude: 500000,
    }),
  ])

  it("retient les tranches dont la borne basse atteint le seuil", () => {
    expect(simuler(donnees, 80).alertes).toBe(40)
    expect(simuler(donnees, 60).alertes).toBe(140)
  })

  it("compte les fraudes écartées comme manquées", () => {
    // 2 mesurées + 4 estimées, celles de la tranche 60.
    expect(simuler(donnees, 80).fraudesManquees).toBe(6)
  })

  it("garde mesuré et estimé dans deux champs distincts", () => {
    const bas = simuler(donnees, 60)
    expect(bas.fraudesAverees).toBe(14)
    expect(bas.fraudesEstimees).toBe(6)
  })

  it("juge la précision sur les seuls dossiers tranchés", () => {
    // Un dossier sans verdict n'est ni une réussite ni un échec : le compter au
    // dénominateur ferait chuter la précision à chaque dossier non instruit.
    expect(simuler(donnees, 80).precision).toBeCloseTo(12 / 16, 10)
  })

  it("rapporte le rappel à toutes les fraudes de la période", () => {
    expect(simuler(donnees, 80).rappel).toBeCloseTo(14 / 20, 10)
  })

  it("refuse une précision quand rien n'a été tranché", () => {
    const aveugle = population([
      tranche({ min: 90, demandes: 10, sansVerdict: 10 }),
    ])
    expect(simuler(aveugle, 90).precision).toBeNull()
  })

  it("refuse un rappel quand la période ne compte aucune fraude", () => {
    const sansFraude = population([
      tranche({ min: 90, demandes: 10, reguliers: 10 }),
    ])
    expect(simuler(sansFraude, 90).rappel).toBeNull()
  })

  it("isole la part estimée du montant couvert", () => {
    const haut = simuler(donnees, 80)
    expect(haut.montantCouvert).toBe(14 * 500000)
    expect(haut.montantEstime).toBe(2 * 500000)
  })

  it("convertit le volume en charge quotidienne", () => {
    expect(simuler(donnees, 80).chargeJour).toBeCloseTo(40 / 20, 10)
  })

  it("déclare intenable un seuil qui dépasse la capacité de la cellule", () => {
    // 140 alertes sur 20 jours ouvrés font 7 par jour : tenable à 10.
    expect(simuler(donnees, 60).tenable).toBe(true)
    const etroite = population(donnees.tranches, { capaciteJour: 5 })
    expect(simuler(etroite, 60).tenable).toBe(false)
  })

  it("tient la capacité pour atteinte, non dépassée, à l'égalité", () => {
    const juste = population(donnees.tranches, { capaciteJour: 7 })
    expect(simuler(juste, 60).chargeJour).toBe(7)
    expect(simuler(juste, 60).tenable).toBe(true)
  })
})

describe("courbe", () => {
  it("rend un point par seuil simulable, du plus bas au plus haut", () => {
    const donnees = population([
      tranche({ min: 80, demandes: 10 }),
      tranche({ min: 60, demandes: 30 }),
    ])
    expect(courbe(donnees).map((p) => p.seuil)).toEqual([60, 80])
  })

  it("donne des alertes décroissantes quand le seuil monte", () => {
    const donnees = population([
      tranche({ min: 60, demandes: 100 }),
      tranche({ min: 70, demandes: 50 }),
      tranche({ min: 80, demandes: 10 }),
    ])
    expect(courbe(donnees).map((p) => p.alertes)).toEqual([160, 60, 10])
  })
})

describe("scoreF1", () => {
  const point = (precision: number | null, rappel: number | null) =>
    ({ precision, rappel }) as Parameters<typeof scoreF1>[0]

  it("est la moyenne harmonique de la précision et du rappel", () => {
    expect(scoreF1(point(0.5, 0.5))).toBeCloseTo(0.5, 10)
    expect(scoreF1(point(1, 0.5))).toBeCloseTo(2 / 3, 10)
  })

  it("vaut zéro quand les deux sont nuls, sans diviser par zéro", () => {
    expect(scoreF1(point(0, 0))).toBe(0)
  })

  it("refuse de conclure quand l'une des deux manque", () => {
    expect(scoreF1(point(null, 0.5))).toBeNull()
    expect(scoreF1(point(0.5, null))).toBeNull()
  })
})

describe("pointRecommande", () => {
  it("énonce la règle appliquée, et pas seulement le résultat", () => {
    // « Recommandé » sans règle énoncée n'est qu'une opinion présentée comme un
    // résultat.
    const donnees = population([
      tranche({ min: 70, demandes: 10, fraudes: 5, reguliers: 5 }),
    ])
    const reco = pointRecommande(donnees)
    expect(reco?.regle).toContain("précision/rappel")
    expect(reco?.regle).toContain(String(donnees.capaciteJour))
  })

  it("retient le meilleur équilibre parmi les seuils tenables", () => {
    const donnees = population(
      [
        // Seuil 60 : beaucoup d'alertes, mauvaise précision.
        tranche({ min: 60, demandes: 200, fraudes: 1, reguliers: 99 }),
        // Seuil 80 : peu d'alertes, excellente précision.
        tranche({ min: 80, demandes: 40, fraudes: 20, reguliers: 4 }),
      ],
      { capaciteJour: 100 }
    )
    expect(pointRecommande(donnees)?.point.seuil).toBe(80)
  })

  it("signale quand la charge a écarté un meilleur point", () => {
    const tranches = [
      tranche({ min: 60, demandes: 200, fraudes: 60, reguliers: 20 }),
      tranche({ min: 80, demandes: 20, fraudes: 5, reguliers: 10 }),
    ]
    const large = pointRecommande(population(tranches, { capaciteJour: 100 }))
    const etroite = pointRecommande(population(tranches, { capaciteJour: 2 }))

    expect(large?.contrainteParLaCharge).toBe(false)
    expect(etroite?.contrainteParLaCharge).toBe(true)
    expect(etroite?.point.seuil).not.toBe(large?.point.seuil)
  })

  it("le dit franchement quand aucun seuil ne tient dans la capacité", () => {
    const donnees = population(
      [tranche({ min: 60, demandes: 1000 }), tranche({ min: 80, demandes: 800 })],
      { capaciteJour: 1 }
    )
    const reco = pointRecommande(donnees)
    expect(reco?.contrainteParLaCharge).toBe(true)
    expect(reco?.point.seuil).toBe(80) // le plus haut, faute de mieux
    expect(reco?.regle).toContain("faute de mieux")
  })

  it("ne recommande rien sur une population vide", () => {
    expect(pointRecommande(population([]))).toBeNull()
  })
})

describe("comparer", () => {
  const donnees = population([
    tranche({
      min: 60,
      demandes: 100,
      fraudes: 2,
      reguliers: 8,
      fraudesEstimees: 4,
      montantMoyenFraude: 100000,
    }),
    tranche({
      min: 80,
      demandes: 40,
      fraudes: 12,
      reguliers: 4,
      fraudesEstimees: 2,
      montantMoyenFraude: 500000,
    }),
  ])

  it("signe les écarts dans le sens départ vers arrivée", () => {
    const ecart = comparer(simuler(donnees, 80), simuler(donnees, 60))
    expect(ecart.alertes).toBe(100)
    expect(ecart.fauxPositifs).toBe(8)
    expect(ecart.chargeJour).toBeCloseTo(5, 10)
  })

  it("compte les fraudes mesurées et estimées ensemble", () => {
    expect(comparer(simuler(donnees, 80), simuler(donnees, 60)).fraudes).toBe(6)
  })

  it("rend des écarts négatifs quand on relève le seuil", () => {
    const ecart = comparer(simuler(donnees, 60), simuler(donnees, 80))
    expect(ecart.alertes).toBe(-100)
    expect(ecart.montantCouvert).toBeLessThan(0)
  })

  it("ne bouge pas entre deux fois le même point", () => {
    const point = simuler(donnees, 70)
    expect(comparer(point, point)).toEqual({
      alertes: 0,
      fraudes: 0,
      fauxPositifs: 0,
      montantCouvert: 0,
      chargeJour: 0,
    })
  })
})
