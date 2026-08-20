import { describe, expect, it } from "vitest"

import type {
  Comparatif,
  Decomposition,
  FacteurRisque,
} from "@/lib/schemas/alertes.schema"
import {
  aggravants,
  attenuants,
  facteursTries,
  phraseExplicative,
  rapportCohorte,
  totalAggravant,
  totalAttenuant,
} from "@/lib/explication"

/*
  Ce module transforme « 94 » en un motif qu'on peut écrire dans un courrier.
  Sa propriété cardinale est le déterminisme : aucun modèle de langue, aucune
  génération. La même décomposition donne toujours la même phrase — c'est la
  condition pour qu'elle figure dans une pièce de dossier, et c'est ce que les
  tests sur la phrase vérifient, mot pour mot.
*/

function facteur(partiel: Partial<FacteurRisque> & { code: string }): FacteurRisque {
  return {
    libelle: partiel.code,
    contribution: 0,
    valeurObservee: "—",
    valeurAttendue: "—",
    source: "Nomenclature générale des actes professionnels, édition 2026",
    enonce: `l'énoncé de ${partiel.code}`,
    ...partiel,
  }
}

function decomposition(
  facteurs: FacteurRisque[],
  valeurDeBase = 18
): Decomposition {
  return {
    valeurDeBase,
    facteurs,
    modele: "gradient boosting, version 4.2",
    calculeLe: "2026-05-20T06:12:00.000Z",
  }
}

describe("facteursTries", () => {
  it("classe par poids absolu, sens confondus", () => {
    // L'échelle des barres est commune aux deux sens : un atténuant de −38
    // pèse autant qu'un aggravant de +38.
    const d = decomposition([
      facteur({ code: "a", contribution: 12 }),
      facteur({ code: "b", contribution: -38 }),
      facteur({ code: "c", contribution: 25 }),
    ])
    expect(facteursTries(d).map((f) => f.code)).toEqual(["b", "c", "a"])
  })

  it("ne modifie pas la décomposition reçue", () => {
    const d = decomposition([
      facteur({ code: "a", contribution: 1 }),
      facteur({ code: "b", contribution: 9 }),
    ])
    facteursTries(d)
    expect(d.facteurs.map((f) => f.code)).toEqual(["a", "b"])
  })
})

describe("aggravants et attenuants", () => {
  const d = decomposition([
    facteur({ code: "charge", contribution: 34 }),
    facteur({ code: "decharge", contribution: -6 }),
    facteur({ code: "neutre", contribution: 0 }),
  ])

  it("séparent les deux sens", () => {
    expect(aggravants(d).map((f) => f.code)).toEqual(["charge"])
    expect(attenuants(d).map((f) => f.code)).toEqual(["decharge"])
  })

  it("écartent un facteur qui ne pèse rien des deux côtés", () => {
    // Un facteur à zéro n'aggrave ni n'atténue : l'afficher des deux côtés
    // ferait croire à une charge.
    expect([...aggravants(d), ...attenuants(d)].map((f) => f.code)).not.toContain(
      "neutre"
    )
  })

  it("cumulent chacun de leur côté, l'atténuant restant négatif", () => {
    expect(totalAggravant(d)).toBe(34)
    expect(totalAttenuant(d)).toBe(-6)
  })

  it("referment le score avec la valeur de base", () => {
    // C'est l'égalité écrite à l'écran, et la propriété que le service
    // vérifie avant de servir le dossier.
    expect(d.valeurDeBase + totalAggravant(d) + totalAttenuant(d)).toBe(46)
  })
})

describe("phraseExplicative", () => {
  it("qualifie le score sur les mêmes bornes que sa couleur", () => {
    // Un score écrit « très élevé » alors que la barre est orange serait un
    // désaccord entre deux parties du même écran.
    const d = decomposition([facteur({ code: "a", contribution: 10 })])
    expect(phraseExplicative(80, d)).toContain("Score très élevé")
    expect(phraseExplicative(79, d)).toContain("Score intermédiaire")
    expect(phraseExplicative(50, d)).toContain("Score intermédiaire")
    expect(phraseExplicative(49, d)).toContain("Score faible")
  })

  it("enchaîne les charges avec un « que » devant chacune", () => {
    // Sans le « que » répété, la phrase se lit comme une énumération de groupes
    // nominaux et devient ambiguë dès qu'une proposition contient une virgule.
    const d = decomposition([
      facteur({ code: "a", contribution: 30, enonce: "A" }),
      facteur({ code: "b", contribution: 20, enonce: "B" }),
      facteur({ code: "c", contribution: 10, enonce: "C" }),
    ])
    expect(phraseExplicative(94, d)).toBe(
      "Score très élevé (94/100), principalement parce que A, que B et que C."
    )
  })

  it("s'arrête à trois charges", () => {
    // Au-delà, la phrase cesse d'être lue.
    const d = decomposition(
      ["A", "B", "C", "D"].map((e, i) =>
        facteur({ code: e, contribution: 40 - i, enonce: e })
      )
    )
    expect(phraseExplicative(94, d)).not.toContain("D")
  })

  it("dit ce qui joue en faveur du dossier", () => {
    // Le taire reviendrait à écrire un réquisitoire, pas une explication.
    const d = decomposition([
      facteur({ code: "a", contribution: 30, enonce: "A" }),
      facteur({ code: "b", contribution: -8, enonce: "B" }),
    ])
    expect(phraseExplicative(94, d)).toBe(
      "Score très élevé (94/100), principalement parce que A. En sens inverse, B."
    )
  })

  it("s'arrête à deux décharges", () => {
    const d = decomposition([
      facteur({ code: "a", contribution: 30, enonce: "A" }),
      facteur({ code: "x", contribution: -9, enonce: "X" }),
      facteur({ code: "y", contribution: -8, enonce: "Y" }),
      facteur({ code: "z", contribution: -7, enonce: "Z" }),
    ])
    expect(phraseExplicative(60, d)).not.toContain("Z")
  })

  it("n'invente pas de charge à un dossier qui n'en a aucune", () => {
    // Possible : un dossier dont tous les facteurs jouent en sa faveur reste
    // au-dessous de la valeur de base.
    const d = decomposition([facteur({ code: "b", contribution: -6, enonce: "B" })])
    expect(phraseExplicative(12, d)).toBe(
      "Score faible (12/100) : aucun facteur aggravant n'a été relevé sur ce " +
        "dossier. Jouent en sa faveur : B."
    )
  })

  it("rend exactement la même phrase deux fois", () => {
    // Le déterminisme est la condition pour qu'elle figure dans une pièce.
    const d = decomposition([
      facteur({ code: "a", contribution: 30, enonce: "A" }),
      facteur({ code: "b", contribution: -8, enonce: "B" }),
    ])
    expect(phraseExplicative(94, d)).toBe(phraseExplicative(94, d))
  })
})

describe("rapportCohorte", () => {
  const comparatif = (
    valeurDossier: number,
    valeurCohorte: number
  ): Comparatif => ({
    cohorte: "Établissement",
    libelle: "Montant moyen d'une demande",
    valeurDossier,
    valeurCohorte,
    unite: "FCFA",
    effectif: "128 demandes sur trois mois",
  })

  it("exprime un dépassement en multiple de la référence", () => {
    expect(rapportCohorte(comparatif(2400000, 963000))).toBe(
      "2,5 fois la référence"
    )
  })

  it("retourne le rapport quand le dossier est en dessous", () => {
    // « 0,5 fois » se lit mal ; « 2 fois moins » se lit.
    expect(rapportCohorte(comparatif(500, 1000))).toBe(
      "2 fois moins que la référence"
    )
  })

  it("ne signale rien dans la marge de dix pour cent", () => {
    expect(rapportCohorte(comparatif(105, 100))).toBe("au niveau de la référence")
    expect(rapportCohorte(comparatif(95, 100))).toBe("au niveau de la référence")
  })

  it("écrit les entiers sans décimale", () => {
    expect(rapportCohorte(comparatif(300, 100))).toBe("3 fois la référence")
  })

  it("refuse de rapporter à une cohorte vide", () => {
    // Un rapport à zéro ne se dit pas ; l'écran affiche alors les deux valeurs
    // brutes sans commentaire.
    expect(rapportCohorte(comparatif(2400000, 0))).toBeNull()
  })
})
