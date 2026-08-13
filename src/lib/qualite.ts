import { CAUSES } from "@/lib/decisions"
import type {
  PeriodeQualite,
  SeuilDerive,
} from "@/lib/schemas/qualite.schema"
import type {
  CauseFauxPositif,
  TypeDecision,
} from "@/lib/schemas/modifications.schema"

/**
 * Ce que valent les alertes, une fois les dossiers refermés.
 *
 * Tout se calcule ici, à partir de comptages, et rien n'est lu tel quel : un
 * taux servi par l'API ne se recoupe avec aucun autre chiffre de l'écran, et
 * c'est exactement comme cela qu'un tableau de bord finit par afficher une
 * précision qui ne correspond à aucune des lignes du tableau au-dessus.
 *
 * Toutes les fonctions sont pures — elles ne connaissent ni React, ni le store.
 */

export type TotauxQualite = {
  clos: number
  confirmes: number
  fauxPositifs: number
  nonConcluants: number
  /** Faux positifs dont la correction passe par le modèle (voir `CAUSES`). */
  fauxPositifsModele: number
  manquesEstimes: number
}

const ZERO: TotauxQualite = {
  clos: 0,
  confirmes: 0,
  fauxPositifs: 0,
  nonConcluants: 0,
  fauxPositifsModele: 0,
  manquesEstimes: 0,
}

/** Nombre de faux positifs de cette case imputables au modèle. */
export function fauxPositifsImputables(periode: PeriodeQualite): number {
  return periode.fauxPositifsParCause.reduce(
    (somme, ligne) =>
      CAUSES[ligne.cause].imputableAuModele ? somme + ligne.quantite : somme,
    0
  )
}

export function totaliser(periodes: PeriodeQualite[]): TotauxQualite {
  return periodes.reduce<TotauxQualite>(
    (totaux, periode) => ({
      clos: totaux.clos + periode.clos,
      confirmes: totaux.confirmes + periode.confirmes,
      fauxPositifs: totaux.fauxPositifs + periode.fauxPositifs,
      nonConcluants: totaux.nonConcluants + periode.nonConcluants,
      fauxPositifsModele:
        totaux.fauxPositifsModele + fauxPositifsImputables(periode),
      manquesEstimes: totaux.manquesEstimes + periode.manquesEstimes,
    }),
    ZERO
  )
}

/**
 * Dossiers effectivement tranchés — le seul dénominateur qui ait un sens.
 *
 * Un dossier refermé sans conclusion n'est ni une réussite ni un échec du
 * modèle. Le compter au dénominateur ferait baisser la précision à chaque
 * dossier abandonné faute de pièces, ce qui n'apprend rien sur le détecteur.
 */
export function tranches(totaux: TotauxQualite): number {
  return totaux.confirmes + totaux.fauxPositifs
}

/**
 * Les taux renvoient `null` quand rien n'a été tranché.
 *
 * Écrire « 0 % » là où la question ne se pose pas serait un mensonge tranquille :
 * un mois sans dossier clos deviendrait un mois à précision nulle, et la courbe
 * plongerait sans qu'il ne se soit rien passé.
 */
export function precision(totaux: TotauxQualite): number | null {
  const total = tranches(totaux)
  return total === 0 ? null : totaux.confirmes / total
}

export function tauxFauxPositifs(totaux: TotauxQualite): number | null {
  const total = tranches(totaux)
  return total === 0 ? null : totaux.fauxPositifs / total
}

/** Taux de faux positifs que le modèle peut corriger — celui qui déclenche la dérive. */
export function tauxFauxPositifsModele(totaux: TotauxQualite): number | null {
  const total = tranches(totaux)
  return total === 0 ? null : totaux.fauxPositifsModele / total
}

/**
 * Rappel estimé : la part des fraudes réelles que le modèle a signalées.
 *
 * Le dénominateur contient une estimation, jamais une mesure — les fraudes
 * jamais signalées ne se comptent pas, elles se sondent. L'écran doit donc
 * toujours afficher la base d'estimation avec ce chiffre.
 */
export function rappelEstime(totaux: TotauxQualite): number | null {
  const reelles = totaux.confirmes + totaux.manquesEstimes
  return reelles === 0 ? null : totaux.confirmes / reelles
}

// ─── Regroupements ────────────────────────────────────────────────────────────

export type SerieMois = {
  mois: string
  moisLibelle: string
  totaux: TotauxQualite
}

/** Les mois dans l'ordre chronologique, types de fraude confondus. */
export function parMois(periodes: PeriodeQualite[]): SerieMois[] {
  const index = new Map<string, PeriodeQualite[]>()
  for (const periode of periodes) {
    const cases = index.get(periode.mois)
    if (cases) cases.push(periode)
    else index.set(periode.mois, [periode])
  }

  return [...index.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, cases]) => ({
      mois,
      moisLibelle: cases[0].moisLibelle,
      totaux: totaliser(cases),
    }))
}

export type SerieType = {
  typeFraude: string
  totaux: TotauxQualite
}

/** Les types de fraude, du plus bruyant au moins bruyant. */
export function parTypeDeFraude(periodes: PeriodeQualite[]): SerieType[] {
  const index = new Map<string, PeriodeQualite[]>()
  for (const periode of periodes) {
    const cases = index.get(periode.typeFraude)
    if (cases) cases.push(periode)
    else index.set(periode.typeFraude, [periode])
  }

  return [...index.entries()]
    .map(([typeFraude, cases]) => ({ typeFraude, totaux: totaliser(cases) }))
    .sort((a, b) => {
      const ta = tauxFauxPositifs(a.totaux) ?? -1
      const tb = tauxFauxPositifs(b.totaux) ?? -1
      return tb - ta
    })
}

export type LigneRegistre = {
  cause: CauseFauxPositif
  quantite: number
  /** Part de cette cause dans l'ensemble des faux positifs, entre 0 et 1. */
  part: number
  imputableAuModele: boolean
}

/**
 * Le registre des faux positifs : combien, et pour quelle raison.
 *
 * C'est l'écran que la boucle de rétroaction produit. Sans lui, chaque
 * classement sans suite disparaît dans un statut et le modèle qui l'a produit
 * continue de produire le même.
 */
export function registreDesCauses(periodes: PeriodeQualite[]): LigneRegistre[] {
  const comptes = new Map<CauseFauxPositif, number>()
  for (const periode of periodes) {
    for (const ligne of periode.fauxPositifsParCause) {
      comptes.set(ligne.cause, (comptes.get(ligne.cause) ?? 0) + ligne.quantite)
    }
  }

  const total = [...comptes.values()].reduce((somme, n) => somme + n, 0)

  return [...comptes.entries()]
    .map(([cause, quantite]) => ({
      cause,
      quantite,
      part: total === 0 ? 0 : quantite / total,
      imputableAuModele: CAUSES[cause].imputableAuModele,
    }))
    .sort((a, b) => b.quantite - a.quantite)
}

// ─── Dérive ───────────────────────────────────────────────────────────────────

export type Derive = {
  typeFraude: string
  /** Taux de faux positifs imputables au modèle sur le mois observé. */
  taux: number
  seuil: number
  justification: string
  /** Dossiers tranchés sur le mois : un dépassement sur trois dossiers ne vaut rien. */
  tranches: number
}

/** Le mois le plus récent du jeu, `null` s'il est vide. */
export function dernierMois(periodes: PeriodeQualite[]): string | null {
  return periodes.reduce<string | null>(
    (dernier, periode) =>
      dernier === null || periode.mois > dernier ? periode.mois : dernier,
    null
  )
}

/**
 * Les types de fraude dont le modèle décroche sur le dernier mois observé.
 *
 * Deux garde-fous, sans lesquels le bandeau crierait pour rien :
 *
 * 1. seuls les faux positifs **imputables au modèle** comptent — réclamer un
 *    réentraînement parce qu'un établissement a transmis deux fois la même
 *    demande n'aurait aucun sens ;
 * 2. en deçà de `minimumTranches` dossiers, aucun dépassement n'est signalé :
 *    deux dossiers sur trois écartés font 67 %, et ne disent rien.
 */
export function derivesConstatees(
  periodes: PeriodeQualite[],
  seuils: SeuilDerive[],
  minimumTranches = 10
): Derive[] {
  const mois = dernierMois(periodes)
  if (mois === null) return []

  const duMois = periodes.filter((periode) => periode.mois === mois)

  return seuils
    .map((seuil) => {
      const totaux = totaliser(
        duMois.filter((periode) => periode.typeFraude === seuil.typeFraude)
      )
      const taux = tauxFauxPositifsModele(totaux)
      return taux === null
        ? null
        : {
            typeFraude: seuil.typeFraude,
            taux,
            seuil: seuil.seuil,
            justification: seuil.justification,
            tranches: tranches(totaux),
          }
    })
    .filter(
      (derive): derive is Derive =>
        derive !== null &&
        derive.tranches >= minimumTranches &&
        derive.taux > derive.seuil
    )
    .sort((a, b) => b.taux - b.seuil - (a.taux - a.seuil))
}

// ─── Décisions prises dans la console ─────────────────────────────────────────

/** Une décision locale, réduite à ce dont la mesure a besoin. */
export type DecisionMesurable = {
  typeFraude: string
  type: TypeDecision
  cause?: CauseFauxPositif
}

/**
 * Ajoute au jeu observé les décisions prises dans cette console.
 *
 * C'est ce qui referme la boucle **à l'écran** : classer un dossier sans suite
 * déplace le registre et la courbe du mois, au lieu de disparaître dans un
 * statut. Sans cela, l'écran de qualité ne serait qu'un tableau de plus.
 *
 * Les décisions sont rattachées au dernier mois observé et non au mois réel :
 * le jeu de démonstration s'arrête à mai 2026, et ouvrir un mois vide entre les
 * deux ferait plonger toutes les courbes pour une raison qui n'a rien à voir
 * avec le modèle. L'écran le dit.
 *
 * `piece_demandee` n'entre dans aucun compte : le dossier reste ouvert, il n'a
 * donc rien tranché.
 */
export function integrerDecisions(
  periodes: PeriodeQualite[],
  decisions: DecisionMesurable[]
): PeriodeQualite[] {
  const mois = dernierMois(periodes)
  if (mois === null || decisions.length === 0) return periodes

  const libelle =
    periodes.find((periode) => periode.mois === mois)?.moisLibelle ?? mois

  const resultat = periodes.map((periode) => ({
    ...periode,
    fauxPositifsParCause: periode.fauxPositifsParCause.map((ligne) => ({
      ...ligne,
    })),
  }))

  for (const decision of decisions) {
    if (decision.type === "piece_demandee") continue

    let periode = resultat.find(
      (candidate) =>
        candidate.mois === mois && candidate.typeFraude === decision.typeFraude
    )

    if (!periode) {
      periode = {
        mois,
        moisLibelle: libelle,
        typeFraude: decision.typeFraude,
        clos: 0,
        confirmes: 0,
        fauxPositifs: 0,
        nonConcluants: 0,
        fauxPositifsParCause: [],
        manquesEstimes: 0,
        baseEstimation: "Aucun sondage sur ce type ce mois-ci.",
      }
      resultat.push(periode)
    }

    periode.clos += 1

    if (decision.type === "fraude_confirmee") {
      periode.confirmes += 1
      continue
    }

    periode.fauxPositifs += 1
    // Le contrat garantit la cause sur un classement sans suite ; la garde est
    // là pour le jour où une quatrième issue apparaîtrait sans qu'on y pense.
    if (!decision.cause) continue
    const ligne = periode.fauxPositifsParCause.find(
      (candidate) => candidate.cause === decision.cause
    )
    if (ligne) ligne.quantite += 1
    else periode.fauxPositifsParCause.push({ cause: decision.cause, quantite: 1 })
  }

  return resultat
}
