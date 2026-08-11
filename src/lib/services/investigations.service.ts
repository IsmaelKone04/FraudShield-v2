import { z } from "zod"
import { chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import { statSchema, type Stat } from "@/lib/schemas/commun"
import {
  investigationSchema,
  investigationsDataSchema,
  type Investigation,
  type InvestigationsData,
} from "@/lib/schemas/investigations.schema"

const ORIGINE = "investigations/data.json"

const chargerJeuLocal = (): Promise<InvestigationsData> =>
  chargerMock(
    () => import("@/app/investigations/data.json"),
    investigationsDataSchema,
    ORIGINE
  )

export const investigationsService = {
  async getStats(): Promise<Stat[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).stats
    return fetchFromAPI("/investigations/stats", z.array(statSchema))
  },

  async getInvestigations(): Promise<Investigation[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).investigations
    return fetchFromAPI("/investigations", z.array(investigationSchema))
  },

  /** Un dossier par son identifiant, `null` s'il n'existe pas. */
  async getInvestigation(id: string): Promise<Investigation | null> {
    if (USE_MOCK) {
      const { investigations } = await chargerJeuLocal()
      return investigations.find((i) => i.id === id) ?? null
    }
    return fetchFromAPI(
      `/investigations/${encodeURIComponent(id)}`,
      investigationSchema.nullable()
    )
  },
}
