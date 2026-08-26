import reference from "@/lib/portefeuille/reference.json"
import type { Comparatif } from "@/lib/schemas/alertes.schema"
import { separerMilliers } from "@/lib/formats"

/**
 * Ce qui est normal, dans un portefeuille de 108 653 contrats.
 *
 * Ce jeu ne porte **aucune étiquette de fraude** : `N_SINISTRE` compte les
 * sinistres, il ne les qualifie pas. On n'y apprend donc pas un détecteur, et
 * ce module n'en contient pas. Il répond à une autre question, que la console
 * pose déjà à côté de chaque dossier : *par rapport à quoi ?*
 *
 * Un montant n'est un argument que comparé à ce qui se pratique ailleurs. C'est
 * exactement ce que produit ce module — des `Comparatif`, la même forme que
 * celle affichée sous les dossiers d'alerte depuis D1, et donc le même
 * composant pour les rendre.
 *
 * Les chiffres sont agrégés hors ligne (`npm run portefeuille:agreger`) : le
 * fichier source pèse seize mégaoctets, la table qu'il produit onze kilo-octets.
 */

export type Mesures = {
  contrats: number
  sinistres: number
  /** Sinistres pour mille contrats : 0,114 ne se lit pas, 114 se lit. */
  frequencePourMille: number
  /** Coût moyen d'un sinistre, en euros — rapporté aux sinistres, pas aux contrats. */
  coutMoyenSinistre: number
  /** Coût annuel attendu d'un contrat de la cohorte : fréquence × coût moyen. */
  primePure: number
}

export type Cohorte = Mesures & { cle: string }

export type Dimension = {
  cle: string
  libelle: string
  colonne: string
  modalites: Cohorte[]
  /** Cohortes trop peu fournies pour être publiées. */
  ecartees: number
}

export const ENSEMBLE: Mesures = reference.ensemble
export const DIMENSIONS: Dimension[] = reference.dimensions
export const SOURCE_PORTEFEUILLE = reference.source

/** Un profil : une modalité choisie par dimension, ou aucune. */
export type Profil = Record<string, string | undefined>

/** La dimension portant cette clé, si elle est publiée. */
export function dimension(cle: string): Dimension | undefined {
  return DIMENSIONS.find((d) => d.cle === cle)
}

/** La cohorte choisie dans une dimension, si elle est publiée. */
export function cohorte(cleDimension: string, cleCohorte?: string): Cohorte | undefined {
  if (!cleCohorte) return undefined
  return dimension(cleDimension)?.modalites.find((m) => m.cle === cleCohorte)
}

/**
 * Le profil situé face à l'ensemble du portefeuille.
 *
 * Trois comparaisons par dimension retenue : la fréquence, le coût moyen d'un
 * sinistre, et la prime pure qui résume les deux. La dernière est celle qui se
 * compare d'une cohorte à l'autre sans arbitrage — une cohorte peut déclarer
 * plus souvent des sinistres moins chers, et l'inverse.
 *
 * L'effectif accompagne chaque ligne, parce qu'une moyenne sans effectif ne se
 * conteste pas : c'est la première question que pose qui la reçoit.
 */
export function comparatifs(cleDimension: string, cleCohorte?: string): Comparatif[] {
  const d = dimension(cleDimension)
  const c = cohorte(cleDimension, cleCohorte)
  if (!d || !c) return []

  const effectif =
    `${separerMilliers(c.contrats)} contrats de cette cohorte, ` +
    `${separerMilliers(c.sinistres)} sinistres observés · ` +
    `référence : ${separerMilliers(ENSEMBLE.contrats)} contrats`

  return [
    {
      cohorte: `${d.libelle} — ${c.cle}`,
      libelle: "Sinistres déclarés pour mille contrats",
      valeurDossier: c.frequencePourMille,
      valeurCohorte: ENSEMBLE.frequencePourMille,
      unite: "sinistres",
      effectif,
    },
    {
      cohorte: `${d.libelle} — ${c.cle}`,
      libelle: "Coût moyen d'un sinistre",
      valeurDossier: c.coutMoyenSinistre,
      valeurCohorte: ENSEMBLE.coutMoyenSinistre,
      unite: "€",
      effectif,
    },
    {
      cohorte: `${d.libelle} — ${c.cle}`,
      libelle: "Coût annuel attendu par contrat",
      valeurDossier: c.primePure,
      valeurCohorte: ENSEMBLE.primePure,
      unite: "€",
      effectif,
    },
  ]
}

/**
 * Les cohortes d'une dimension, de la plus sinistrée à la moins sinistrée.
 *
 * L'ordre est un choix : ranger par clé donnerait un classement alphabétique
 * qui ne dit rien, alors que la question posée à cet écran est « où déclare-t-on
 * le plus ? ».
 */
export function parSinistralite(cleDimension: string): Cohorte[] {
  return [...(dimension(cleDimension)?.modalites ?? [])].sort(
    (a, b) => b.frequencePourMille - a.frequencePourMille
  )
}

/**
 * L'amplitude d'une dimension : le rapport entre sa cohorte la plus sinistrée et
 * la moins sinistrée.
 *
 * C'est ce qui dit si le découpage sépare quelque chose. Une dimension dont
 * toutes les cohortes déclarent au même rythme n'est pas une mauvaise nouvelle,
 * c'est une information : ce critère-là ne distingue pas les contrats.
 */
export function amplitude(cleDimension: string): number | null {
  const f = parSinistralite(cleDimension).map((c) => c.frequencePourMille)
  if (f.length < 2 || f[f.length - 1] === 0) return null
  return f[0] / f[f.length - 1]
}
