import artefact from "@/lib/modele/modele-fraude-auto.json"
import type { Decomposition, FacteurRisque } from "@/lib/schemas/alertes.schema"

/**
 * Le modèle appris, appliqué à une déclaration.
 *
 * Ce fichier ne calcule rien qui ne soit déjà dans l'artefact : il applique des
 * coefficients, et surtout il traduit. Un coefficient de +1,076 sur
 * `authorities_contacted=None` ne se conteste pas ; « aucune autorité n'a été
 * contactée, alors que la police l'a été dans la plupart des déclarations
 * comparables » se conteste. C'est toute la différence entre un score et un
 * motif.
 *
 * **L'explication referme le score, par construction.** Le contrat de la
 * console l'exige — valeur de base plus contributions doit redonner exactement
 * le chiffre affiché, et le service refuse de servir un dossier où ce n'est pas
 * le cas. C'est le logit qui est mis à l'échelle, jamais la probabilité : le
 * logit est une somme, la probabilité ne l'est pas. Le score reste une
 * transformation monotone de la probabilité, laquelle est publiée à côté.
 */

export type Declaration = Record<string, string | number>

export type Notation = {
  /** Score sur 100, transformation affine du logit. */
  score: number
  /** Probabilité de fraude, calibrée sur le taux de base du portefeuille. */
  probabilite: number
  decomposition: Decomposition
}

const MODELE = artefact
const VERSION = `régression logistique v${MODELE.version}, ${MODELE.source.lignes} déclarations`

/** Le nombre de facteurs détaillés. Au-delà, la liste cesse d'être lue. */
const FACTEURS_DETAILLES = 6

/**
 * Ce que chaque variable veut dire, en français.
 *
 * Sans cette table, l'écran afficherait les noms de colonnes du fichier source.
 * `formuler` reçoit la valeur brute de la déclaration et rend la proposition
 * qui s'insère dans la phrase d'explication.
 */
type Traduction = {
  libelle: string
  source: string
  observee: (d: Declaration) => string
  attendue: string
  formuler: (d: Declaration, aggravant: boolean) => string
}

const francs = (v: number) =>
  `${Math.round(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} $`

const TRADUCTIONS: Record<string, Traduction> = {
  ecart_montant: {
    libelle: "Écart entre montant réclamé et expertise",
    source: "Montants de la déclaration, rapprochés du montant total retenu",
    observee: (d) =>
      francs(Number(d.claim_amount) - Number(d.total_claim_amount)),
    attendue: `moyenne du portefeuille : ${francs(
      MODELE.encodage.stats.ecart_montant.moyenne
    )}`,
    formuler: (d, aggravant) =>
      aggravant
        ? `le montant réclamé dépasse l'expertise de ${francs(
            Number(d.claim_amount) - Number(d.total_claim_amount)
          )}`
        : `le montant réclamé reste en deçà de l'expertise`,
  },
  witnesses: {
    libelle: "Témoins déclarés",
    source: "Déclaration de sinistre",
    observee: (d) => `${d.witnesses} témoin(s)`,
    attendue: `moyenne du portefeuille : ${MODELE.encodage.stats.witnesses.moyenne
      .toFixed(1)
      .replace(".", ",")}`,
    formuler: (d, aggravant) =>
      aggravant
        ? `le sinistre compte peu de témoins (${d.witnesses})`
        : `le sinistre compte ${d.witnesses} témoins`,
  },
  insured_age: {
    libelle: "Âge de l'assuré",
    source: "Contrat",
    observee: (d) => `${d.insured_age} ans`,
    attendue: `moyenne du portefeuille : ${Math.round(
      MODELE.encodage.stats.insured_age.moyenne
    )} ans`,
    formuler: (d) => `l'assuré a ${d.insured_age} ans`,
  },
  total_claim_amount: {
    libelle: "Montant total du sinistre",
    source: "Expertise",
    observee: (d) => francs(Number(d.total_claim_amount)),
    attendue: `moyenne du portefeuille : ${francs(
      MODELE.encodage.stats.total_claim_amount.moyenne
    )}`,
    formuler: (d) => `le sinistre est évalué à ${francs(Number(d.total_claim_amount))}`,
  },
  "authorities_contacted=None": {
    libelle: "Aucune autorité contactée",
    source: "Déclaration de sinistre",
    observee: () => "aucune",
    attendue: "police, pompiers ou secours dans la majorité des déclarations",
    formuler: () =>
      `aucune autorité n'a été contactée au moment du sinistre`,
  },
  "incident_severity=Total Loss": {
    libelle: "Véhicule déclaré en perte totale",
    source: "Expertise",
    observee: () => "perte totale",
    attendue: "dommages partiels dans la majorité des déclarations",
    formuler: () => `le véhicule est déclaré en perte totale`,
  },
  "police_report_available=Yes": {
    libelle: "Constat de police disponible",
    source: "Pièces jointes à la déclaration",
    observee: () => "oui",
    attendue: "—",
    formuler: () => `un constat de police est joint au dossier`,
  },
}

/** Repli lisible pour une variable dont la traduction n'est pas écrite. */
function traduire(nom: string, declaration: Declaration): Traduction {
  const connue = TRADUCTIONS[nom]
  if (connue) return connue
  const [colonne, modalite] = nom.split("=")
  return {
    libelle: modalite ? `${colonne} : ${modalite}` : colonne,
    source: "Déclaration de sinistre",
    observee: () => String(modalite ?? declaration[colonne] ?? "—"),
    attendue: "—",
    formuler: () =>
      modalite
        ? `le dossier relève de la catégorie « ${modalite} »`
        : `${colonne} vaut ${declaration[colonne]}`,
  }
}

/** La valeur encodée d'une variable, telle que le modèle l'attend. */
function valeurEncodee(nom: string, declaration: Declaration): number {
  const stats = MODELE.encodage.stats as Record<
    string,
    { moyenne: number; ecartType: number }
  >
  if (stats[nom]) {
    const brute =
      nom === "ecart_montant"
        ? Number(declaration.claim_amount) - Number(declaration.total_claim_amount)
        : Number(declaration[nom])
    return (brute - stats[nom].moyenne) / stats[nom].ecartType
  }
  const [colonne, modalite] = nom.split("=")
  return String(declaration[colonne]) === modalite ? 1 : 0
}

/**
 * Répartit les arrondis pour que la somme des entiers redonne le total.
 *
 * Arrondir chaque contribution séparément fait perdre ou gagner jusqu'à un
 * point par facteur, et l'égalité ne tombe plus. Les restes sont donc classés,
 * et le point manquant va à celui qui en était le plus près — c'est la
 * répartition au plus fort reste, la même qu'aux élections.
 */
function arrondirEnConservantLaSomme(valeurs: number[], total: number): number[] {
  const bas = valeurs.map((v) => Math.floor(v))
  const restes = valeurs
    .map((v, i) => ({ i, reste: v - Math.floor(v) }))
    .sort((a, b) => b.reste - a.reste)
  let manquant = total - bas.reduce((s, v) => s + v, 0)
  for (const { i } of restes) {
    if (manquant <= 0) break
    bas[i] += 1
    manquant--
  }
  // Un `manquant` négatif signifie qu'il faut retirer : on retire aux plus
  // petits restes, c'est-à-dire à ceux qui ont le moins mérité leur point.
  for (const { i } of [...restes].reverse()) {
    if (manquant >= 0) break
    bas[i] -= 1
    manquant++
  }
  return bas
}

/**
 * Note une déclaration : le score, la probabilité, et pourquoi.
 *
 * Les facteurs négligeables ne sont pas jetés — ils seraient jetés du total en
 * même temps, et l'égalité ne tomberait plus. Ils sont réunis en une ligne, ce
 * qui dit à la fois qu'ils existent et qu'ils ne pèsent rien.
 */
export function noter(declaration: Declaration, calculeLe?: string): Notation {
  const { pente, origine } = MODELE.echelle

  const parts = MODELE.variables.map(({ nom, coefficient }) => ({
    nom,
    points: pente * coefficient * valeurEncodee(nom, declaration),
  }))

  const logit =
    MODELE.biais + parts.reduce((s, p) => s + p.points, 0) / pente
  const probabilite = 1 / (1 + Math.exp(-logit))

  const base = pente * MODELE.biais + origine
  const brut = base + parts.reduce((s, p) => s + p.points, 0)
  const score = Math.min(100, Math.max(0, Math.round(brut)))

  const notables = parts
    .filter((p) => Math.abs(p.points) >= 0.5)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
  const retenus = notables.slice(0, FACTEURS_DETAILLES)
  const restePoints =
    brut - base - retenus.reduce((s, p) => s + p.points, 0)

  /*
    L'échelle s'arrête à 0 et à 100 ; le calcul, non. Un dossier dont tout
    concorde peut sortir à 108 points bruts, et il faut bien que les huit points
    aillent quelque part : sans cela la somme ne retombe pas sur le score
    affiché, et le service refuse précisément les dossiers les plus graves.

    Les répartir sur les autres facteurs les fausserait tous. Ils forment donc
    une ligne à eux, qui dit ce qui s'est passé — l'écrêtage se lit au lieu de
    se deviner.
  */
  const baseEntiere = Math.min(100, Math.max(0, Math.round(base)))
  const ecretage = score - baseEntiere - (brut - base)

  const valeursAArrondir = [
    ...retenus.map((p) => p.points),
    restePoints,
    ecretage,
  ]
  const entiers = arrondirEnConservantLaSomme(
    valeursAArrondir,
    score - baseEntiere
  )

  const facteurs: FacteurRisque[] = retenus.map((p, i) => {
    const t = traduire(p.nom, declaration)
    const aggravant = entiers[i] > 0
    return {
      code: p.nom,
      libelle: t.libelle,
      contribution: entiers[i],
      valeurObservee: t.observee(declaration),
      valeurAttendue: t.attendue,
      source: t.source,
      enonce: t.formuler(declaration, aggravant),
    }
  })

  const pointsEcretage = entiers[entiers.length - 1]
  const reste = entiers[entiers.length - 2]
  if (reste !== 0 || facteurs.length === 0) {
    facteurs.push({
      code: "autres_facteurs",
      libelle: "Ensemble des autres variables",
      contribution: reste,
      valeurObservee: `${MODELE.variables.length - retenus.length} variables`,
      valeurAttendue: "—",
      source: `Modèle appris sur ${MODELE.source.apprentissage} déclarations`,
      enonce:
        "les autres variables du dossier ne pèsent, prises ensemble, que " +
        `${Math.abs(reste)} point${Math.abs(reste) > 1 ? "s" : ""}`,
    })
  }

  if (pointsEcretage !== 0) {
    facteurs.push({
      code: "ecretage_echelle",
      libelle: pointsEcretage < 0 ? "Écrêté à 100" : "Écrêté à 0",
      contribution: pointsEcretage,
      valeurObservee: `${Math.round(brut)} points bruts`,
      valeurAttendue: "échelle de 0 à 100",
      source: "Échelle d'affichage du score",
      enonce:
        pointsEcretage < 0
          ? `le score brut dépasse la borne haute de l'échelle de ${Math.abs(
              pointsEcretage
            )} points`
          : `le score brut passe sous la borne basse de l'échelle de ${pointsEcretage} points`,
    })
  }

  return {
    score,
    probabilite,
    decomposition: {
      valeurDeBase: baseEntiere,
      facteurs,
      modele: VERSION,
      calculeLe: calculeLe ?? MODELE.entraineLe,
    },
  }
}

/**
 * Les modalités connues d'une variable qualitative, référence comprise.
 *
 * L'écran de notation en fait ses listes déroulantes : proposer une valeur que
 * le modèle n'a jamais vue ne produirait pas d'erreur, seulement un dossier
 * traité comme la modalité de référence — un silence pire qu'un refus.
 */
export function modalites(colonne: string): string[] {
  const table = MODELE.encodage.modalites as Record<
    string,
    { reference: string; autres: string[] }
  >
  const entree = table[colonne]
  return entree ? [entree.reference, ...entree.autres] : []
}

/**
 * La déclaration médiane du portefeuille.
 *
 * Point de départ de l'écran de notation, et surtout **repère** : le score
 * qu'elle obtient est celui d'un dossier quelconque. Sans lui, on ne saurait
 * pas si 62 est beaucoup.
 *
 * Les valeurs quantitatives sont les moyennes du jeu d'apprentissage, les
 * qualitatives leur modalité de référence. Ce n'est donc pas une déclaration
 * réelle mais un dossier moyen, et l'écran le dit plutôt que de laisser croire
 * à un cas d'espèce.
 */
export function declarationMediane(): Declaration {
  const stats = MODELE.encodage.stats as Record<string, { moyenne: number }>
  const totalSinistre = Math.round(stats.total_claim_amount.moyenne)
  const ecart = Math.round(stats.ecart_montant.moyenne)

  const base: Declaration = {
    policy_deductible: Math.round(stats.policy_deductible.moyenne),
    policy_annual_premium: Math.round(stats.policy_annual_premium.moyenne),
    insured_age: Math.round(stats.insured_age.moyenne),
    incident_hour_of_the_day: Math.round(stats.incident_hour_of_the_day.moyenne),
    number_of_vehicles_involved: Math.round(
      stats.number_of_vehicles_involved.moyenne
    ),
    bodily_injuries: Math.round(stats.bodily_injuries.moyenne),
    witnesses: Math.round(stats.witnesses.moyenne),
    total_claim_amount: totalSinistre,
    // `claim_amount` n'est pas une variable du modèle : c'est `ecart_montant`
    // qui l'est. Elle est reconstruite pour que la déclaration reste lisible.
    claim_amount: totalSinistre + ecart,
  }

  for (const colonne of MODELE.encodage.categorielles) {
    base[colonne] = modalites(colonne)[0]
  }
  return base
}

/** Ce que vaut le modèle, mesuré sur des déclarations qu'il n'a jamais vues. */
export const MESURES = MODELE.mesures
export const SOURCE_MODELE = MODELE.source
