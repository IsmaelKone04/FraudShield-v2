import { describe, expect, it } from "vitest"

import {
  DIMENSIONS,
  ENSEMBLE,
  SOURCE_PORTEFEUILLE,
  amplitude,
  cohorte,
  comparatifs,
  dimension,
  parSinistralite,
} from "@/lib/portefeuille/reference"
import { comparatifSchema } from "@/lib/schemas/alertes.schema"

/*
  La table de référence, éprouvée sur ce qu'elle promet.

  Deux promesses, et elles ne se ressemblent pas. La première est arithmétique :
  les trois grandeurs publiées doivent se recouper — la prime pure est le
  produit des deux autres, et un total qui ne retombe pas rend la table
  inutilisable pour discuter d'un dossier. La seconde est déontologique : aucune
  cohorte publiée ne doit reposer sur trop peu de contrats, sans quoi la
  « référence » est du bruit présenté comme un fait.
*/

describe("la table publiée", () => {
  it("porte les sept découpages agrégés", () => {
    expect(DIMENSIONS).toHaveLength(7)
    for (const d of DIMENSIONS) {
      expect(d.modalites.length).toBeGreaterThan(0)
      expect(d.libelle.length).toBeGreaterThan(0)
    }
  })

  it("n'a retenu que des cohortes suffisamment fournies", () => {
    // Une fréquence calculée sur trente contrats varie du simple au double
    // selon qu'un seul d'entre eux a déclaré. C'est précisément le chiffre
    // auquel s'accrocherait qui conteste.
    for (const d of DIMENSIONS) {
      for (const c of d.modalites) {
        expect(c.contrats).toBeGreaterThanOrEqual(
          SOURCE_PORTEFEUILLE.effectifMinimal
        )
      }
    }
  })

  it("dit combien de cohortes ont été écartées, plutôt que de les taire", () => {
    // Le nombre est une information : il dit à quel point le découpage est
    // déséquilibré.
    const total = DIMENSIONS.reduce((s, d) => s + d.ecartees, 0)
    expect(total).toBeGreaterThan(0)
    for (const d of DIMENSIONS) expect(d.ecartees).toBeGreaterThanOrEqual(0)
  })

  it("ne publie aucune cohorte plus grosse que le portefeuille", () => {
    for (const d of DIMENSIONS) {
      for (const c of d.modalites) {
        expect(c.contrats).toBeLessThanOrEqual(ENSEMBLE.contrats)
        expect(c.sinistres).toBeLessThanOrEqual(ENSEMBLE.sinistres)
      }
    }
  })
})

describe("les trois grandeurs se recoupent", () => {
  const toutes = [ENSEMBLE, ...DIMENSIONS.flatMap((d) => d.modalites)]

  it("la fréquence est bien celle des comptages", () => {
    for (const c of toutes) {
      expect(c.frequencePourMille).toBe(
        Math.round((c.sinistres / c.contrats) * 1000)
      )
    }
  })

  it("la prime pure est le produit des deux autres, à l'arrondi près", () => {
    // C'est la grandeur qui résume les deux autres : si elle ne retombe pas,
    // une cohorte peut être présentée comme coûteuse sans l'être.
    for (const c of toutes) {
      const attendu = (c.frequencePourMille / 1000) * c.coutMoyenSinistre
      expect(Math.abs(c.primePure - attendu)).toBeLessThan(
        Math.max(2, attendu * 0.01)
      )
    }
  })

  it("rapporte le coût moyen aux sinistres, pas aux contrats", () => {
    // Le diviser par l'ensemble du portefeuille donnerait un chiffre qui ne
    // correspond à aucun sinistre réel — et bien plus bas.
    for (const c of toutes) {
      if (c.sinistres === 0) continue
      expect(c.coutMoyenSinistre).toBeGreaterThan(c.primePure)
    }
  })
})

describe("comparatifs", () => {
  const premiere = DIMENSIONS[0]
  const lignes = comparatifs(premiere.cle, premiere.modalites[0].cle)

  it("rend trois comparaisons pour une cohorte connue", () => {
    expect(lignes).toHaveLength(3)
  })

  it("respecte le contrat des comparatifs de la console", () => {
    // C'est ce qui permet de les rendre avec le composant écrit en D1, sans
    // une ligne de changement.
    for (const ligne of lignes) {
      expect(comparatifSchema.safeParse(ligne).success).toBe(true)
    }
  })

  it("compare la cohorte à l'ensemble du portefeuille", () => {
    const frequence = lignes.find((l) => l.libelle.includes("mille contrats"))
    expect(frequence?.valeurCohorte).toBe(ENSEMBLE.frequencePourMille)
    expect(frequence?.valeurDossier).toBe(
      premiere.modalites[0].frequencePourMille
    )
  })

  it("donne l'effectif sur chaque ligne", () => {
    // Une moyenne sans effectif ne se conteste pas : c'est la première
    // question que pose qui la reçoit.
    for (const ligne of lignes) {
      expect(ligne.effectif).toMatch(/contrats/)
      expect(ligne.effectif).toMatch(/sinistres/)
    }
  })

  it("emploie des unités que l'affichage sait rendre", () => {
    expect(lignes.map((l) => l.unite).sort()).toEqual(["sinistres", "€", "€"].sort())
  })

  it("ne rend rien plutôt que d'inventer sur une cohorte inconnue", () => {
    expect(comparatifs(premiere.cle, "cohorte-qui-n-existe-pas")).toEqual([])
    expect(comparatifs("decoupage-inconnu", "peu-importe")).toEqual([])
    expect(comparatifs(premiere.cle, undefined)).toEqual([])
  })
})

describe("dimension et cohorte", () => {
  it("retrouvent ce qui est publié", () => {
    const d = dimension(DIMENSIONS[0].cle)
    expect(d?.cle).toBe(DIMENSIONS[0].cle)
    expect(cohorte(DIMENSIONS[0].cle, DIMENSIONS[0].modalites[0].cle)).toBeDefined()
  })

  it("rendent undefined sur ce qui ne l'est pas", () => {
    expect(dimension("inconnue")).toBeUndefined()
    expect(cohorte(DIMENSIONS[0].cle, "inconnue")).toBeUndefined()
    expect(cohorte("inconnue", "inconnue")).toBeUndefined()
  })
})

describe("parSinistralite", () => {
  it("classe de la cohorte la plus sinistrée à la moins sinistrée", () => {
    // Ranger par clé donnerait un classement alphabétique qui ne dit rien,
    // alors que la question posée est « où déclare-t-on le plus ? ».
    for (const d of DIMENSIONS) {
      const f = parSinistralite(d.cle).map((c) => c.frequencePourMille)
      expect([...f].sort((a, b) => b - a)).toEqual(f)
    }
  })

  it("rend une liste vide sur un découpage inconnu", () => {
    expect(parSinistralite("inconnue")).toEqual([])
  })
})

describe("amplitude", () => {
  it("mesure si le découpage sépare quelque chose", () => {
    for (const d of DIMENSIONS) {
      const rapport = amplitude(d.cle)
      expect(rapport).not.toBeNull()
      expect(rapport!).toBeGreaterThanOrEqual(1)
    }
  })

  it("reste modeste, et c'est le fait", () => {
    // Aucun découpage ne va au-delà du double. C'est une donnée de sinistralité
    // ordinaire, pas un discriminant : l'écran ne doit pas laisser croire
    // l'inverse.
    for (const d of DIMENSIONS) {
      expect(amplitude(d.cle)!).toBeLessThan(3)
    }
  })

  it("ne conclut pas sur un découpage inconnu", () => {
    expect(amplitude("inconnue")).toBeNull()
  })
})
