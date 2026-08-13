import type {
  Comparatif,
  Decomposition,
  FacteurRisque,
} from "@/lib/schemas/alertes.schema"

/**
 * De la décomposition du score à une phrase opposable.
 *
 * Un score seul ne se conteste pas : l'établissement mis en cause ne peut ni
 * l'admettre ni le réfuter. Ce module transforme les facteurs en français
 * lisible — c'est ce qui transforme « 94 » en un motif que l'on peut écrire
 * dans un courrier.
 *
 * Tout y est **déterministe** : aucun modèle de langue, aucune génération. La
 * même décomposition donne toujours la même phrase, ce qui est la condition
 * pour qu'elle figure dans une pièce de dossier.
 */

/** Les facteurs du plus lourd au plus léger, quel que soit leur sens. */
export function facteursTries(explication: Decomposition): FacteurRisque[] {
  return [...explication.facteurs].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  )
}

/** Ce qui a fait monter le score, du plus lourd au plus léger. */
export function aggravants(explication: Decomposition): FacteurRisque[] {
  return facteursTries(explication).filter((f) => f.contribution > 0)
}

/** Ce qui l'a fait baisser. Un dossier n'a pas que des charges. */
export function attenuants(explication: Decomposition): FacteurRisque[] {
  return facteursTries(explication).filter((f) => f.contribution < 0)
}

/** Points apportés par les facteurs aggravants, cumulés. */
export function totalAggravant(explication: Decomposition): number {
  return aggravants(explication).reduce((s, f) => s + f.contribution, 0)
}

/** Points retirés par les facteurs atténuants, cumulés (négatif). */
export function totalAttenuant(explication: Decomposition): number {
  return attenuants(explication).reduce((s, f) => s + f.contribution, 0)
}

/**
 * Le qualificatif du score, aligné sur les seuils d'affichage de `ScoreIA`.
 *
 * Les mêmes bornes que les couleurs : un score écrit « très élevé » alors que
 * la barre est orange serait un désaccord entre deux parties du même écran.
 */
function qualificatif(score: number): string {
  if (score >= 80) return "Score très élevé"
  if (score >= 50) return "Score intermédiaire"
  return "Score faible"
}

/**
 * Enchaîne des propositions après « parce que » : « A, que B et que C ».
 *
 * Le « que » est répété devant chaque proposition — sans lui, la phrase se lit
 * comme une énumération de groupes nominaux et devient ambiguë dès que l'une
 * des propositions contient elle-même une virgule.
 */
function enchainer(enonces: string[], liaison = ""): string {
  if (enonces.length === 1) return enonces[0]
  const rappel = liaison === "" ? "" : `${liaison} `
  const debut = enonces.slice(0, -1)
  const fin = enonces[enonces.length - 1]
  return `${debut.join(`, ${rappel}`)} et ${rappel}${fin}`
}

/**
 * La phrase d'explication, composée des facteurs dominants.
 *
 * Trois aggravants au plus : au-delà, la phrase cesse d'être lue. Deux
 * atténuants au plus, et seulement s'il y en a — taire ce qui joue en faveur
 * du dossier reviendrait à écrire un réquisitoire, pas une explication.
 */
export function phraseExplicative(
  score: number,
  explication: Decomposition
): string {
  const charges = aggravants(explication).slice(0, 3)
  const decharges = attenuants(explication).slice(0, 2)

  const tete =
    charges.length > 0
      ? `${qualificatif(score)} (${score}/100), principalement parce que ` +
        `${enchainer(charges.map((f) => f.enonce), "que")}.`
      : // Possible : un dossier dont tous les facteurs jouent en sa faveur
        // reste au-dessous de la valeur de base. Il ne faut pas pour autant
        // lui inventer une charge.
        `${qualificatif(score)} (${score}/100) : aucun facteur aggravant n'a ` +
        `été relevé sur ce dossier.`

  if (decharges.length === 0) return tete

  const enSaFaveur = enchainer(decharges.map((f) => f.enonce))
  const queue =
    charges.length > 0
      ? `En sens inverse, ${enSaFaveur}.`
      : `Jouent en sa faveur : ${enSaFaveur}.`

  return `${tete} ${queue}`
}

/**
 * Le comparatif rendu en une proposition : « 14 fois le montant moyen… ».
 *
 * Renvoie `null` quand la cohorte est à zéro — un rapport à zéro ne se dit
 * pas, et l'écran affiche alors les deux valeurs brutes sans commentaire.
 */
export function rapportCohorte(comparatif: Comparatif): string | null {
  const { valeurDossier, valeurCohorte } = comparatif
  if (valeurCohorte === 0) return null
  const rapport = valeurDossier / valeurCohorte
  if (rapport >= 1.1) {
    return `${arrondir(rapport)} fois la référence`
  }
  if (rapport <= 0.9) {
    return `${arrondir(1 / rapport)} fois moins que la référence`
  }
  return "au niveau de la référence"
}

/** « 2,5 » — une décimale, virgule française, sans « 1,0 fois ». */
function arrondir(valeur: number): string {
  const arrondi = Math.round(valeur * 10) / 10
  return Number.isInteger(arrondi)
    ? String(arrondi)
    : arrondi.toFixed(1).replace(".", ",")
}
