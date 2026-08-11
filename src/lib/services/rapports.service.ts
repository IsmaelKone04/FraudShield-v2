import { z } from "zod"
import { chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import { statSchema, type Stat } from "@/lib/schemas/commun"
import {
  categorieRapportSchema,
  rapportSchema,
  rapportsDataSchema,
  type CategorieRapport,
  type Rapport,
  type RapportsData,
} from "@/lib/schemas/rapports.schema"

const ORIGINE = "rapports/data.json"

const chargerJeuLocal = (): Promise<RapportsData> =>
  chargerMock(
    () => import("@/app/rapports/data.json"),
    rapportsDataSchema,
    ORIGINE
  )

export const rapportsService = {
  async getStats(): Promise<Stat[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).stats
    return fetchFromAPI("/rapports/stats", z.array(statSchema))
  },

  async getCategories(): Promise<CategorieRapport[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).categories
    return fetchFromAPI("/rapports/categories", z.array(categorieRapportSchema))
  },

  async getRapports(): Promise<Rapport[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).rapports
    return fetchFromAPI("/rapports", z.array(rapportSchema))
  },
}
