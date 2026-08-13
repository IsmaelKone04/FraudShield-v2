import type {
  SimulationData,
  TrancheScore,
} from "@/lib/schemas/simulation.schema"

/**
 * Le rejeu de la population à seuil variable.
 *
 * Tout est calculé ici, par sommes cumulées sur les tranches de score : aucun
 * chiffre du simulateur n'est lu tel quel dans le jeu de données. Fonctions
 * pures — ni React, ni store, ni service.
 *
 * L'honnêteté du simulateur tient à une distinction, portée d'un bout à
 * l'autre : ce qui a été **mesuré** (les dossiers instruits, le sondage) et ce
 * qui est **estimé** (les demandes que personne n'a regardées). Baisser le
 * seuil fait entrer des demandes de la seconde catégorie ; un simulateur qui
 * les mélangerait promettrait des fraudes qu'il ne peut pas garantir.
 */

export type PointDeFonctionnement = {
  seuil: number
  /** Demandes qui déclencheraient une alerte à ce seuil. */
  alertes: number
  /** Fraudes établies parmi elles — mesurées. */
  fraudesAverees: number
  /** Fraudes estimées parmi celles que personne n'a instruites. */
  fraudesEstimees: number
  /** Alertes qui ne mèneraient à rien, sur ce qui a été tranché. */
  fauxPositifs: number
  /** Fraudes qui échapperaient au seuil, mesurées et estimées confondues. */
  fraudesManquees: number
  precision: number | null
  rappel: number | null
  /** Montant de fraude intercepté, estimations comprises. */
  montantCouvert: number
  /** Part de ce montant qui repose sur une estimation. */
  montantEstime: number
  /** Dossiers à instruire par jour ouvré. */
  chargeJour: number
  /** Faux si la charge dépasse ce que la cellule peut absorber. */
  tenable: boolean
}

/** Les seuils simulables : les bornes basses des tranches, du plus bas au plus haut. */
export function seuilsPossibles(tranches: TrancheScore[]): number[] {
  return [...tranches].map((tranche) => tranche.min).sort((a, b) => a - b)
}

/** Fraudes de la tranche, mesurées et estimées confondues. */
function fraudesTotales(tranche: TrancheScore): number {
  return tranche.fraudes + tranche.fraudesEstimees
}

/**
 * Toutes les fraudes de la période — le dénominateur du rappel.
 *
 * Il ne dépend pas du seuil : c'est ce qui existe, pas ce qu'on a vu. Le faire
 * varier avec le curseur donnerait un rappel qui monte quand on relève le
 * seuil, ce qui n'a aucun sens.
 */
export function fraudesDeLaPeriode(tranches: TrancheScore[]): number {
  return tranches.reduce((somme, tranche) => somme + fraudesTotales(tranche), 0)
}

/**
 * Ce que donnerait ce seuil-là.
 *
 * Une demande déclenche une alerte quand son score atteint le seuil ; les
 * tranches étant fermées, cela revient à retenir celles dont la borne basse
 * l'atteint — d'où l'exigence, vérifiée par le service, que le seuil tombe sur
 * une borne.
 */
export function simuler(
  donnees: SimulationData,
  seuil: number
): PointDeFonctionnement {
  const retenues = donnees.tranches.filter((tranche) => tranche.min >= seuil)
  const ecartees = donnees.tranches.filter((tranche) => tranche.min < seuil)

  const alertes = retenues.reduce((somme, t) => somme + t.demandes, 0)
  const fraudesAverees = retenues.reduce((somme, t) => somme + t.fraudes, 0)
  const fraudesEstimees = retenues.reduce((somme, t) => somme + t.fraudesEstimees, 0)
  const reguliers = retenues.reduce((somme, t) => somme + t.reguliers, 0)

  // La précision se juge sur ce qui a été tranché : un dossier sans verdict
  // n'est ni une réussite ni un échec (même règle qu'en D2, ADR-018).
  const tranches = fraudesAverees + reguliers
  const total = fraudesDeLaPeriode(donnees.tranches)
  const attrapees = fraudesAverees + fraudesEstimees

  const montantCouvert = retenues.reduce(
    (somme, t) => somme + fraudesTotales(t) * t.montantMoyenFraude,
    0
  )
  const montantEstime = retenues.reduce(
    (somme, t) => somme + t.fraudesEstimees * t.montantMoyenFraude,
    0
  )

  const chargeJour = alertes / donnees.joursOuvres

  return {
    seuil,
    alertes,
    fraudesAverees,
    fraudesEstimees,
    fauxPositifs: reguliers,
    fraudesManquees: ecartees.reduce((somme, t) => somme + fraudesTotales(t), 0),
    precision: tranches === 0 ? null : fraudesAverees / tranches,
    rappel: total === 0 ? null : attrapees / total,
    montantCouvert,
    montantEstime,
    chargeJour,
    tenable: chargeJour <= donnees.capaciteJour,
  }
}

/** La courbe complète, un point par seuil simulable. */
export function courbe(donnees: SimulationData): PointDeFonctionnement[] {
  return seuilsPossibles(donnees.tranches).map((seuil) => simuler(donnees, seuil))
}

/** Moyenne harmonique de la précision et du rappel, `null` si l'un manque. */
export function scoreF1(point: PointDeFonctionnement): number | null {
  const { precision, rappel } = point
  if (precision === null || rappel === null) return null
  if (precision + rappel === 0) return 0
  return (2 * precision * rappel) / (precision + rappel)
}

export type Recommandation = {
  point: PointDeFonctionnement
  /** La règle appliquée, en toutes lettres — sans elle, « recommandé » ne veut rien dire. */
  regle: string
  /** Vrai quand la capacité de la cellule a écarté un meilleur point. */
  contrainteParLaCharge: boolean
}

/**
 * Le point de fonctionnement recommandé, et la règle qui le désigne.
 *
 * « Recommandé » sans règle énoncée n'est qu'une opinion présentée comme un
 * résultat. La règle est ici : **le meilleur équilibre précision/rappel parmi
 * les seuils que la cellule peut absorber**. Les deux moitiés comptent — un
 * seuil qui maximise le F1 en produisant trois fois plus de dossiers que la
 * cellule n'en instruit ne recommande rien du tout, il déplace le problème vers
 * une file d'attente.
 *
 * Si aucun seuil n'est tenable, le plus haut est retenu, et la fonction le dit
 * plutôt que de faire comme si la contrainte n'existait pas.
 */
export function pointRecommande(
  donnees: SimulationData
): Recommandation | null {
  const points = courbe(donnees)
  if (points.length === 0) return null

  const meilleur = (liste: PointDeFonctionnement[]) =>
    liste.reduce((tenant, candidat) =>
      (scoreF1(candidat) ?? -1) > (scoreF1(tenant) ?? -1) ? candidat : tenant
    )

  const tenables = points.filter((point) => point.tenable)

  if (tenables.length === 0) {
    const plusHaut = points.reduce((a, b) => (b.seuil > a.seuil ? b : a))
    return {
      point: plusHaut,
      regle:
        `Aucun seuil ne tient dans la capacité de la cellule ` +
        `(${donnees.capaciteJour} dossiers par jour). Le seuil le plus haut est ` +
        `retenu faute de mieux : c'est le moins coûteux, pas le meilleur.`,
      contrainteParLaCharge: true,
    }
  }

  const retenu = meilleur(tenables)
  const sansContrainte = meilleur(points)

  return {
    point: retenu,
    regle:
      `Meilleur équilibre précision/rappel parmi les seuils tenables, ` +
      `c'est-à-dire ceux qui restent sous ${donnees.capaciteJour} dossiers à ` +
      `instruire par jour.`,
    contrainteParLaCharge: sansContrainte.seuil !== retenu.seuil,
  }
}

/**
 * Ce qui change entre deux seuils, du point de vue de qui décide.
 *
 * Un simulateur qui n'affiche que l'état d'arrivée oblige à retenir l'état de
 * départ de tête. Les écarts sont donc calculés, et signés.
 */
export type Ecart = {
  alertes: number
  fraudes: number
  fauxPositifs: number
  montantCouvert: number
  chargeJour: number
}

export function comparer(
  depart: PointDeFonctionnement,
  arrivee: PointDeFonctionnement
): Ecart {
  return {
    alertes: arrivee.alertes - depart.alertes,
    fraudes:
      arrivee.fraudesAverees +
      arrivee.fraudesEstimees -
      (depart.fraudesAverees + depart.fraudesEstimees),
    fauxPositifs: arrivee.fauxPositifs - depart.fauxPositifs,
    montantCouvert: arrivee.montantCouvert - depart.montantCouvert,
    chargeJour: arrivee.chargeJour - depart.chargeJour,
  }
}
