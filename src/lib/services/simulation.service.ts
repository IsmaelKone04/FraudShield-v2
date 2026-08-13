import { ApiError, chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import {
  simulationDataSchema,
  type SimulationData,
  type TrancheScore,
} from "@/lib/schemas/simulation.schema"

const ORIGINE = "simulation/data.json"

/**
 * La population de rejeu, telle que le simulateur la consomme.
 *
 * Comme pour la qualité, le contrat ne porte que des comptages : les taux, les
 * montants couverts et la charge de travail se calculent dans `lib/simulation.ts`.
 */
export const simulationService = {
  async getPopulation(): Promise<SimulationData> {
    const donnees = USE_MOCK
      ? await chargerMock(
          () => import("@/app/simulation/data.json"),
          simulationDataSchema,
          ORIGINE
        )
      : await fetchFromAPI("/simulation/population", simulationDataSchema)

    return verifierSeuil(verifierCouverture(verifierTranches(donnees)))
  },
}

/**
 * Vérifie que chaque tranche totalise ce qu'elle annonce.
 *
 * Trois règles hors de portée d'un schéma : les trois issues doivent redonner
 * le nombre de demandes, le sondage ne peut pas porter sur plus de demandes que
 * la tranche n'en compte, et on ne peut pas estimer plus de fraudes qu'il n'y a
 * de demandes sans verdict. La quatrième tient à la convention d'estimation :
 * une tranche où le sondage n'a rien trouvé ne peut rien estimer.
 */
function verifierTranches(donnees: SimulationData): SimulationData {
  for (const tranche of donnees.tranches) {
    const issues = tranche.fraudes + tranche.reguliers + tranche.sansVerdict
    if (issues !== tranche.demandes) {
      throw new ApiError(
        situer(tranche, `${issues} demandes réparties pour ${tranche.demandes} annoncées`),
        ORIGINE
      )
    }
    if (tranche.demandesAuditees > tranche.demandes) {
      throw new ApiError(
        situer(tranche, `${tranche.demandesAuditees} demandes sondées pour ${tranche.demandes} au total`),
        ORIGINE
      )
    }
    if (tranche.fraudesEstimees > tranche.sansVerdict) {
      throw new ApiError(
        situer(tranche, `${tranche.fraudesEstimees} fraudes estimées parmi ${tranche.sansVerdict} demandes sans verdict`),
        ORIGINE
      )
    }
    if (tranche.fraudesEstimees > 0 && tranche.fraudes === 0) {
      throw new ApiError(
        situer(tranche, "des fraudes y sont estimées alors que le sondage n'en a trouvé aucune — une estimation ne s'extrapole pas à partir de rien"),
        ORIGINE
      )
    }
  }
  return donnees
}

/**
 * Vérifie que les tranches couvrent l'échelle sans trou ni recouvrement.
 *
 * C'est le contrôle qui compte le plus ici : un trou entre deux tranches ferait
 * disparaître des demandes de tous les totaux **sans que rien ne le signale**,
 * et un recouvrement les compterait deux fois. Dans les deux cas le simulateur
 * répondrait avec aplomb à la question qu'on lui pose, et il aurait tort.
 */
function verifierCouverture(donnees: SimulationData): SimulationData {
  const triees = [...donnees.tranches].sort((a, b) => a.min - b.min)

  if (triees[0].min !== 0) {
    throw new ApiError(
      `La population de rejeu commence au score ${triees[0].min} : les demandes ` +
        `en dessous ne seraient comptées nulle part — ${ORIGINE}`,
      ORIGINE
    )
  }

  for (const tranche of triees) {
    if (tranche.max < tranche.min) {
      throw new ApiError(situer(tranche, "borne haute inférieure à la borne basse"), ORIGINE)
    }
  }

  for (let i = 1; i < triees.length; i++) {
    const precedente = triees[i - 1]
    const courante = triees[i]
    if (courante.min !== precedente.max + 1) {
      throw new ApiError(
        `Les tranches ${precedente.min}–${precedente.max} et ${courante.min}–${courante.max} ` +
          `ne s'enchaînent pas : des demandes seraient ${courante.min > precedente.max + 1 ? "perdues" : "comptées deux fois"} — ${ORIGINE}`,
        ORIGINE
      )
    }
  }

  const derniere = triees[triees.length - 1]
  if (derniere.max !== 100) {
    throw new ApiError(
      `La population de rejeu s'arrête au score ${derniere.max} : les demandes ` +
        `au-dessus ne seraient comptées nulle part — ${ORIGINE}`,
      ORIGINE
    )
  }

  return donnees
}

/**
 * Vérifie que le seuil en vigueur tombe sur une borne de tranche.
 *
 * La distribution est fournie par tranches : un seuil au milieu de l'une
 * d'elles ne serait pas simulable sans couper une tranche en deux au jugé, et
 * le curseur afficherait alors un chiffre que rien ne soutient.
 */
function verifierSeuil(donnees: SimulationData): SimulationData {
  if (!donnees.tranches.some((tranche) => tranche.min === donnees.seuilActuel)) {
    throw new ApiError(
      `Le seuil en vigueur (${donnees.seuilActuel}) ne tombe sur aucune borne de ` +
        `tranche : il n'est pas simulable en l'état — ${ORIGINE}`,
      ORIGINE
    )
  }
  return donnees
}

const situer = (tranche: TrancheScore, probleme: string) =>
  `Tranche ${tranche.min}–${tranche.max} : ${probleme} — ${ORIGINE}`
