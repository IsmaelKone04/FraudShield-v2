import { z } from "zod"
import { chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import { statSchema, type Stat } from "@/lib/schemas/commun"
import {
  alerteSchema,
  alertesDataSchema,
  type Alerte,
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

  /** Une alerte par son identifiant, `null` si elle n'existe pas. */
  async getAlerte(id: string): Promise<Alerte | null> {
    if (USE_MOCK) {
      const { alertes } = await chargerJeuLocal()
      return alertes.find((a) => a.id === id) ?? null
    }
    return fetchFromAPI(
      `/alertes/${encodeURIComponent(id)}`,
      alerteSchema.nullable()
    )
  },
}
