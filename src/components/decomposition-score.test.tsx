// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DecompositionScore } from "@/components/decomposition-score"
import type { Decomposition, FacteurRisque } from "@/lib/schemas/alertes.schema"

/*
  L'écran qui répond à « pourquoi 94 ? ».

  Le reproche fait aux outils du marché tient en un mot : ils affichent le score
  et s'arrêtent là. Un analyste ne peut alors ni le défendre devant un
  établissement, ni le contester devant son responsable. Ce que ces tests
  éprouvent n'est donc pas la mise en page mais ce qui rend le chiffre
  opposable : l'égalité écrite, la source de chaque facteur, et le fait que ce
  qui joue en faveur du dossier soit montré au même titre que ce qui l'accable.

  Les barres, elles, sont `aria-hidden` : elles doublent une information déjà
  écrite, et rien ici ne les interroge.
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

const explication: Decomposition = {
  valeurDeBase: 18,
  facteurs: [
    facteur({
      code: "ecart_tarif",
      libelle: "Écart au tarif de référence",
      contribution: 34,
      valeurObservee: "2 400 000 FCFA facturés",
      valeurAttendue: "963 000 FCFA au tarif",
      enonce: "le montant facturé représente 2,5 fois le tarif",
    }),
    facteur({
      code: "repetition_acte",
      libelle: "Répétition de l'acte",
      contribution: 48,
      enonce: "le même acte revient quatre fois en dix jours",
    }),
    facteur({
      code: "anciennete_contrat",
      libelle: "Ancienneté du contrat",
      contribution: -6,
      source: "Référentiel des contrats, mai 2026",
      enonce: "l'assuré est couvert depuis onze ans sans incident",
    }),
  ],
  modele: "gradient boosting, version 4.2",
  calculeLe: "2026-05-20T06:12:00.000Z",
}

describe("DecompositionScore", () => {
  it("écrit l'égalité qui referme le score", () => {
    // 18 + 82 − 6 = 94. C'est la garantie que rien n'est laissé de côté : sans
    // elle, l'explication expliquerait un autre chiffre que celui affiché.
    render(<DecompositionScore score={94} explication={explication} />)
    expect(screen.getByText("base 18")).toBeInTheDocument()
    expect(screen.getByText("+82 aggravants")).toBeInTheDocument()
    expect(screen.getByText("−6 atténuants")).toBeInTheDocument()
    expect(screen.getByText("94 / 100")).toBeInTheDocument()
  })

  it("ouvre sur la phrase qui se recopie dans un courrier", () => {
    render(<DecompositionScore score={94} explication={explication} />)
    expect(
      screen.getByText(/Score très élevé \(94\/100\), principalement parce que/)
    ).toBeInTheDocument()
  })

  it("classe les facteurs du plus lourd au plus léger", () => {
    render(<DecompositionScore score={94} explication={explication} />)
    const lignes = screen.getAllByRole("listitem")
    expect(lignes[0]).toHaveTextContent("Répétition de l'acte")
    expect(lignes[1]).toHaveTextContent("Écart au tarif de référence")
    expect(lignes[2]).toHaveTextContent("Ancienneté du contrat")
  })

  it("montre ce qui joue en faveur du dossier", () => {
    // Ne montrer que les charges reviendrait à afficher un réquisitoire.
    render(<DecompositionScore score={94} explication={explication} />)
    const attenuant = screen
      .getAllByRole("listitem")
      .find((l) => l.textContent?.includes("Ancienneté"))
    expect(attenuant).toHaveTextContent("−6")
  })

  it("donne l'observé et l'attendu de chaque facteur", () => {
    // Un facteur sans valeur comparée est une affirmation ; avec elle, c'est
    // un constat que l'établissement peut vérifier.
    render(<DecompositionScore score={94} explication={explication} />)
    const ligne = screen
      .getAllByRole("listitem")
      .find((l) => l.textContent?.includes("Écart au tarif"))!
    expect(within(ligne).getByText(/2 400 000 FCFA facturés/)).toBeInTheDocument()
    expect(within(ligne).getByText(/963 000 FCFA au tarif/)).toBeInTheDocument()
  })

  it("source chaque facteur", () => {
    // Sans source, le chiffre ne se conteste pas : on ne sait pas à quoi il a
    // été comparé.
    render(<DecompositionScore score={94} explication={explication} />)
    // Chacun porte la sienne, et non une mention commune en bas de bloc : deux
    // facteurs comparés à deux référentiels différents ne se sourcent pas
    // ensemble.
    expect(
      screen.getAllByText(/Nomenclature générale des actes professionnels/)
    ).toHaveLength(2)
    expect(screen.getByText(/Référentiel des contrats/)).toBeInTheDocument()
  })

  it("nomme le modèle qui a produit le score", () => {
    render(<DecompositionScore score={94} explication={explication} />)
    expect(screen.getByText(/gradient boosting, version 4.2/)).toBeInTheDocument()
  })

  it("écrit toujours le signe des contributions", () => {
    // « 34 » ne dit pas si le facteur aggrave ou atténue.
    render(<DecompositionScore score={94} explication={explication} />)
    expect(screen.getByText("+48")).toBeInTheDocument()
    expect(screen.getByText("+34")).toBeInTheDocument()
    expect(screen.getByText("−6")).toBeInTheDocument()
  })

  it("tait la ligne des atténuants quand il n'y en a aucun", () => {
    // « +0 atténuants » laisserait croire qu'un facteur favorable a été trouvé
    // et pesé à zéro.
    const sansDecharge: Decomposition = {
      ...explication,
      facteurs: explication.facteurs.filter((f) => f.contribution > 0),
    }
    render(<DecompositionScore score={100} explication={sansDecharge} />)
    expect(screen.queryByText(/atténuants/)).not.toBeInTheDocument()
  })

  it("adapte la mention du modèle à la présence d'atténuants", () => {
    // Annoncer qu'un facteur peut jouer en faveur du dossier alors qu'aucun ne
    // le fait donnerait une explication qui ne décrit pas ce qui est affiché.
    const { unmount } = render(
      <DecompositionScore score={94} explication={explication} />
    )
    expect(
      screen.getByText(/un facteur peut jouer en faveur du dossier/)
    ).toBeInTheDocument()
    unmount()

    const sansDecharge: Decomposition = {
      ...explication,
      facteurs: explication.facteurs.filter((f) => f.contribution > 0),
    }
    render(<DecompositionScore score={100} explication={sansDecharge} />)
    expect(
      screen.queryByText(/un facteur peut jouer en faveur du dossier/)
    ).not.toBeInTheDocument()
  })

  it("tient un dossier réduit à un seul facteur", () => {
    // Le calcul de l'échelle des barres divise par le poids le plus lourd :
    // un seul facteur reste un cas valide, pas une division par zéro.
    const seul: Decomposition = {
      valeurDeBase: 30,
      facteurs: [facteur({ code: "a", libelle: "Unique", contribution: 12 })],
      modele: "gradient boosting, version 4.2",
      calculeLe: "2026-05-20T06:12:00.000Z",
    }
    render(<DecompositionScore score={42} explication={seul} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByText("42 / 100")).toBeInTheDocument()
  })
})
