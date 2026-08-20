import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { MESURES, SOURCE_MODELE, noter, type Declaration } from "@/lib/modele/scorer"
import { decompositionSchema } from "@/lib/schemas/alertes.schema"

/*
  Le modèle appris, éprouvé sur les déclarations elles-mêmes.

  Une propriété domine toutes les autres : **l'explication referme le score**.
  Valeur de base plus contributions doit redonner exactement le chiffre
  affiché. Ce n'est pas une élégance — c'est ce qui distingue une explication
  d'une illustration, et le service refuse de servir un dossier où l'égalité ne
  tombe pas. Elle est donc vérifiée sur des milliers de lignes, et non sur un
  cas choisi.

  Le reste porte sur ce qu'on ne veut pas voir arriver silencieusement : un
  score qui cesserait d'ordonner comme la probabilité, une contribution non
  entière, un facteur sans source.
*/

const CSV = path.resolve(process.cwd(), "donnees/car_insurance_fraud_dataset.csv")
const jeuPresent = fs.existsSync(CSV)

/**
 * Un échantillon de déclarations réelles.
 *
 * Le fichier source pèse plusieurs mégaoctets et n'est pas indispensable au
 * fonctionnement de la console : s'il n'est pas là, les cas qui en dépendent
 * sont annoncés comme ignorés plutôt que réputés passés.
 */
function echantillon(taille: number): Declaration[] {
  const lignes = fs.readFileSync(CSV, "utf8").trim().split(/\r?\n/)
  const entetes = lignes[0].split(",")
  const pas = Math.max(1, Math.floor((lignes.length - 1) / taille))
  const retenues: Declaration[] = []
  for (let i = 1; i < lignes.length && retenues.length < taille; i += pas) {
    const champs = lignes[i].split(",")
    retenues.push(Object.fromEntries(entetes.map((e, j) => [e, champs[j]])))
  }
  return retenues
}

/** Une déclaration complète, dont on ne change que ce que le test regarde. */
function declaration(partiel: Partial<Declaration> = {}): Declaration {
  return {
    policy_state: "GA",
    policy_deductible: 400,
    policy_annual_premium: 1430.78,
    insured_age: 44,
    insured_sex: "MALE",
    insured_education_level: "College",
    insured_occupation: "Manager",
    insured_hobbies: "reading",
    incident_type: "Parked Car",
    collision_type: "Front",
    incident_severity: "Minor Damage",
    authorities_contacted: "Police",
    incident_state: "MI",
    incident_hour_of_the_day: 14,
    number_of_vehicles_involved: 1,
    bodily_injuries: 0,
    witnesses: 3,
    police_report_available: "Yes",
    claim_amount: 10000,
    total_claim_amount: 12000,
    ...partiel,
  }
}

describe("l'égalité qui referme le score", () => {
  it("tombe juste sur une déclaration ordinaire", () => {
    const { score, decomposition } = noter(declaration())
    const total = decomposition.facteurs.reduce(
      (s, f) => s + f.contribution,
      decomposition.valeurDeBase
    )
    expect(total).toBe(score)
  })

  it.skipIf(!jeuPresent)("tombe juste sur deux mille déclarations réelles", () => {
    // Le cas isolé prouve peu : les arrondis ne se trahissent qu'en nombre.
    let verifiees = 0
    for (const d of echantillon(2000)) {
      const { score, decomposition } = noter(d)
      const total = decomposition.facteurs.reduce(
        (s, f) => s + f.contribution,
        decomposition.valeurDeBase
      )
      expect(total).toBe(score)
      verifiees++
    }
    expect(verifiees).toBeGreaterThan(1000)
  })

  it("tombe juste aux extrêmes, là où le score est écrêté", () => {
    // Un dossier très au-dessus de 100 ou très au-dessous de 0 doit voir
    // l'écrêtage absorbé quelque part : si ce n'était pas le cas, ce sont
    // précisément les dossiers les plus graves qui seraient refusés.
    const extremes = [
      declaration({
        authorities_contacted: "None",
        incident_severity: "Total Loss",
        witnesses: 0,
        claim_amount: 30000,
        total_claim_amount: 5000,
        insured_age: 19,
      }),
      declaration({
        authorities_contacted: "Police",
        incident_severity: "Minor Damage",
        witnesses: 5,
        claim_amount: 1000,
        total_claim_amount: 25000,
        insured_age: 78,
      }),
    ]
    for (const d of extremes) {
      const { score, decomposition } = noter(d)
      const total = decomposition.facteurs.reduce(
        (s, f) => s + f.contribution,
        decomposition.valeurDeBase
      )
      expect(total).toBe(score)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })
})

describe("la décomposition produite", () => {
  it("respecte le contrat que le reste de la console attend", () => {
    // C'est ce qui permettra de la servir aux écrans existants sans rien y
    // changer : elle passe le même schéma que les dossiers du jeu de
    // démonstration.
    const { decomposition } = noter(declaration())
    expect(decompositionSchema.safeParse(decomposition).success).toBe(true)
  })

  it("n'annonce que des contributions entières", () => {
    for (const f of noter(declaration()).decomposition.facteurs) {
      expect(Number.isInteger(f.contribution)).toBe(true)
    }
  })

  it("source chaque facteur", () => {
    // Un facteur sans source ne se conteste pas : on ne sait pas à quoi il a
    // été comparé.
    for (const f of noter(declaration()).decomposition.facteurs) {
      expect(f.source.length).toBeGreaterThan(0)
      expect(f.enonce.length).toBeGreaterThan(0)
    }
  })

  it("nomme le modèle et la date du calcul", () => {
    const { decomposition } = noter(declaration(), "2026-08-20T10:00:00.000Z")
    expect(decomposition.modele).toContain("régression logistique")
    expect(decomposition.calculeLe).toBe("2026-08-20T10:00:00.000Z")
  })

  it("réunit les variables négligeables au lieu de les jeter", () => {
    // Les jeter les retirerait aussi du total, et l'égalité ne tomberait plus.
    const facteurs = noter(declaration()).decomposition.facteurs
    expect(facteurs.length).toBeLessThanOrEqual(7)
    expect(facteurs.some((f) => f.code === "autres_facteurs")).toBe(true)
  })

  it("traduit les variables en français plutôt qu'en noms de colonnes", () => {
    const { decomposition } = noter(
      declaration({ authorities_contacted: "None" })
    )
    const facteur = decomposition.facteurs.find(
      (f) => f.code === "authorities_contacted=None"
    )
    expect(facteur?.libelle).toBe("Aucune autorité contactée")
    expect(facteur?.enonce).toContain("aucune autorité")
  })
})

describe("ce que le modèle a appris", () => {
  it("note plus haut une déclaration sans autorité contactée", () => {
    // C'est la variable la plus lourde du modèle : 21,1 % de fraudes quand
    // aucune autorité n'a été contactée, contre 7,8 % avec la police.
    const avec = noter(declaration({ authorities_contacted: "Police" }))
    const sans = noter(declaration({ authorities_contacted: "None" }))
    expect(sans.score).toBeGreaterThan(avec.score)
    expect(sans.probabilite).toBeGreaterThan(avec.probabilite)
  })

  it("note plus haut un montant réclamé qui dépasse l'expertise", () => {
    const dessous = noter(
      declaration({ claim_amount: 8000, total_claim_amount: 14000 })
    )
    const dessus = noter(
      declaration({ claim_amount: 16000, total_claim_amount: 14000 })
    )
    expect(dessus.score).toBeGreaterThan(dessous.score)
  })

  it("note plus haut une perte totale qu'un dommage mineur", () => {
    const mineur = noter(declaration({ incident_severity: "Minor Damage" }))
    const total = noter(declaration({ incident_severity: "Total Loss" }))
    expect(total.score).toBeGreaterThan(mineur.score)
  })

  it("note plus bas un sinistre avec témoins", () => {
    const sans = noter(declaration({ witnesses: 0 }))
    const avec = noter(declaration({ witnesses: 5 }))
    expect(avec.score).toBeLessThan(sans.score)
  })
})

describe("score et probabilité", () => {
  it.skipIf(!jeuPresent)("ordonnent les dossiers de la même façon", () => {
    // Le score est une transformation monotone du logit, donc de la
    // probabilité : trier par l'un ou par l'autre doit donner le même ordre.
    // Sans cette propriété, le seuil du simulateur ne voudrait plus rien dire.
    const notes = echantillon(500)
      .map((d) => noter(d))
      .sort((a, b) => a.probabilite - b.probabilite)
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].score).toBeGreaterThanOrEqual(notes[i - 1].score)
    }
  })

  it("rend une probabilité, pas un score déguisé", () => {
    const { probabilite } = noter(declaration())
    expect(probabilite).toBeGreaterThan(0)
    expect(probabilite).toBeLessThan(1)
  })
})

describe("ce que l'artefact publie sur lui-même", () => {
  it("dit sur combien de déclarations il a été appris, et sur combien mesuré", () => {
    // Un modèle qui ne publie pas son jeu de contrôle ne publie pas ses
    // mesures : il publie une affirmation.
    expect(SOURCE_MODELE.apprentissage).toBeGreaterThan(0)
    expect(SOURCE_MODELE.controle).toBeGreaterThan(0)
    expect(SOURCE_MODELE.apprentissage + SOURCE_MODELE.controle).toBe(
      SOURCE_MODELE.lignes
    )
  })

  it("fait mieux que le hasard, et ne prétend pas faire beaucoup mieux", () => {
    // 0,5 est le tirage au sort. La borne haute n'est pas une modestie de
    // façade : un saut brutal signalerait une fuite du jeu de contrôle dans
    // l'apprentissage, pas un progrès.
    expect(MESURES.aireSousROC).toBeGreaterThan(0.6)
    expect(MESURES.aireSousROC).toBeLessThan(0.9)
  })

  it("tient ses promesses de niveau, pas seulement d'ordre", () => {
    // Une aire sous la courbe excellente avec une calibration fausse donne un
    // classement juste et des chiffres inutilisables — et c'est le chiffre qui
    // s'affiche à côté du dossier.
    expect(MESURES.ecartDeCalibration).toBeLessThan(0.03)
  })

  it("publie des points de fonctionnement, et non un seuil unique", () => {
    // Le seuil est un arbitrage de la cellule, pas une propriété du modèle.
    expect(MESURES.pointsDeFonctionnement.length).toBeGreaterThanOrEqual(4)
    for (const p of MESURES.pointsDeFonctionnement) {
      expect(p.precision).toBeGreaterThan(0)
      expect(p.rappel).toBeGreaterThan(0)
    }
  })

  it("apporte un gain réel sur l'instruction au hasard", () => {
    // La mesure qui parle à une cellule : combien de dossiers instruire pour
    // trouver une fraude, comparé au taux de base du portefeuille.
    const auHasard = 1 / SOURCE_MODELE.tauxDeBase
    const auSeuil = MESURES.pointsDeFonctionnement.find((p) => p.seuil === 60)!
    expect(auSeuil.dossiersParFraude).toBeLessThan(auHasard / 1.5)
  })
})
