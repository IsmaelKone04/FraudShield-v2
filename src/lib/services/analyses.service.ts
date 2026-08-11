import { z } from "zod"
import { chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import {
  analysesDataSchema,
  comportementAnormalSchema,
  etablissementSuspectSchema,
  segmentRisqueSchema,
  statistiquesGlobalesSchema,
  type AnalysesData,
  type ComportementAnormal,
  type EtablissementSuspect,
  type SegmentRisque,
  type StatistiquesGlobales,
} from "@/lib/schemas/analyses.schema"

const ORIGINE = "analyses/data.json"

const chargerJeuLocal = (): Promise<AnalysesData> =>
  chargerMock(
    () => import("@/app/analyses/data.json"),
    analysesDataSchema,
    ORIGINE
  )

export const analysesService = {
  async getStatistiquesGlobales(): Promise<StatistiquesGlobales> {
    if (USE_MOCK) return (await chargerJeuLocal()).statistiquesGlobales
    return fetchFromAPI("/analyses/statistiques", statistiquesGlobalesSchema)
  },

  async getTopEtablissementsSuspects(): Promise<EtablissementSuspect[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).topEtablissementsSuspects
    return fetchFromAPI(
      "/analyses/etablissements-suspects",
      z.array(etablissementSuspectSchema)
    )
  },

  async getRepartitionRisque(): Promise<SegmentRisque[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).repartitionRisque
    return fetchFromAPI(
      "/analyses/repartition-risque",
      z.array(segmentRisqueSchema)
    )
  },

  async getComportementsAnormaux(): Promise<ComportementAnormal[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).comportementsAnormaux
    return fetchFromAPI(
      "/analyses/comportements-anormaux",
      z.array(comportementAnormalSchema)
    )
  },
}
