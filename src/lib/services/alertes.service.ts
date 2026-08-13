import { z } from "zod"
import { ApiError, chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import { statSchema, type Stat } from "@/lib/schemas/commun"
import {
  alerteDetailSchema,
  alerteSchema,
  alertesDataSchema,
  type Alerte,
  type AlerteDetail,
  type AlertesData,
} from "@/lib/schemas/alertes.schema"

const ORIGINE = "alertes/data.json"

const chargerJeuLocal = (): Promise<AlertesData> =>
  chargerMock(() => import("@/app/alertes/data.json"), alertesDataSchema, ORIGINE)

/**
 * Source unique des alertes.
 *
 * Le tableau de bord n'en garde plus de copie : il appelle `getDernieres()`.
 * Les deux fichiers qui coexistaient auparavant avaient déjà divergé — la même
 * alerte s'affichait avec deux dates différentes selon l'écran.
 */
export const alertesService = {
  async getStats(): Promise<Stat[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).stats
    return fetchFromAPI("/alertes/stats", z.array(statSchema))
  },

  async getAlertes(): Promise<Alerte[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).alertes
    return fetchFromAPI("/alertes", z.array(alerteSchema))
  },

  /** Les `limite` alertes les plus récentes, pour le tableau de bord. */
  async getDernieres(limite = 6): Promise<Alerte[]> {
    if (USE_MOCK) {
      const { alertes } = await chargerJeuLocal()
      return [...alertes]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limite)
    }
    return fetchFromAPI(
      `/alertes?limit=${limite}&sort=date_desc`,
      z.array(alerteSchema)
    )
  },

  /**
   * Le dossier complet d'une alerte, `null` si l'identifiant est inconnu.
   *
   * En mode démonstration, le résumé et son complément sont assemblés ici : le
   * jeu local ne recopie pas l'un dans l'autre, de sorte qu'ils ne puissent pas
   * diverger (ADR-004). En cible, l'API renvoie le dossier d'un seul tenant.
   */
  async getAlerte(id: string): Promise<AlerteDetail | null> {
    if (USE_MOCK) {
      const { alertes, details } = await chargerJeuLocal()
      const alerte = alertes.find((a) => a.id === id)
      if (!alerte) return null

      const complement = details[id]
      if (!complement) {
        throw new ApiError(
          `L'alerte ${id} n'a pas de complément dans le jeu local — ` +
            `ajouter une entrée « ${id} » dans « details » (${ORIGINE})`,
          ORIGINE
        )
      }

      return verifierDecomposition(
        verifierTotalDesActes({ ...alerte, ...complement })
      )
    }
    return fetchFromAPI(
      `/alertes/${encodeURIComponent(id)}`,
      alerteDetailSchema.nullable()
    )
  },
}

/**
 * Vérifie que les actes facturés totalisent bien le montant de l'alerte.
 *
 * Le schéma ne peut rien en dire : chaque ligne est valide isolément, et
 * pourtant l'écran afficherait un total qui ne correspondrait pas au montant
 * annoncé juste au-dessus. Même raisonnement que le contrôle d'annuaire de
 * l'ADR-010 — une incohérence entre deux champs valides se détecte par un
 * contrôle explicite, pas par un schéma plus strict.
 */
function verifierTotalDesActes(dossier: AlerteDetail): AlerteDetail {
  const total = dossier.actes.reduce((somme, acte) => somme + acte.montant, 0)
  if (total !== dossier.montant) {
    throw new ApiError(
      `Le total des actes de ${dossier.id} (${total}) ne correspond pas au ` +
        `montant de l'alerte (${dossier.montant}) — ${ORIGINE}`,
      ORIGINE
    )
  }
  return dossier
}

/**
 * Vérifie que les facteurs expliquent bien le score affiché.
 *
 * C'est la propriété qui fait toute la valeur d'une décomposition : la valeur
 * de base plus les contributions doit **redonner** le score, sinon
 * l'explication n'explique pas ce chiffre-là mais un autre. Une explication
 * qui ne totalise pas est pire que pas d'explication du tout — elle se
 * présente comme opposable en ne l'étant pas.
 *
 * Le contrôle vaut aussi pour l'API : un modèle dont les valeurs SHAP ne
 * referment pas le score est mal intégré, et il vaut mieux le voir tout de
 * suite qu'à l'audience.
 */
function verifierDecomposition(dossier: AlerteDetail): AlerteDetail {
  const { valeurDeBase, facteurs } = dossier.explication
  const total = facteurs.reduce(
    (somme, facteur) => somme + facteur.contribution,
    valeurDeBase
  )
  if (total !== dossier.scoreIA) {
    throw new ApiError(
      `Les facteurs de ${dossier.id} totalisent ${total} points ` +
        `(base ${valeurDeBase}) alors que le score est de ${dossier.scoreIA} ` +
        `— ${ORIGINE}`,
      ORIGINE
    )
  }
  return dossier
}
