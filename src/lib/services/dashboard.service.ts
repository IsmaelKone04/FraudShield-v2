import { z } from "zod"
import { chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import {
  alerteTrendSchema,
  dashboardDataSchema,
  fraudeParTypeSchema,
  kpiSchema,
  scoreRisqueSchema,
  type AlerteTrend,
  type DashboardData,
  type FraudeParType,
  type KPI,
  type ScoreRisque,
} from "@/lib/schemas/dashboard.schema"
import type { Alerte } from "@/lib/schemas/alertes.schema"
import { alertesService } from "./alertes.service"

const ORIGINE = "dashboard/data.json"

const chargerJeuLocal = (): Promise<DashboardData> =>
  chargerMock(
    () => import("@/app/dashboard/data.json"),
    dashboardDataSchema,
    ORIGINE
  )

export const dashboardService = {
  /** Cartes de KPI en tête de page. */
  async getKPIs(): Promise<KPI[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).kpis
    return fetchFromAPI("/dashboard/kpis", z.array(kpiSchema))
  },

  /** Courbe d'évolution des alertes. */
  async getAlertesTrend(): Promise<AlerteTrend[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).alertesTrend
    return fetchFromAPI("/dashboard/alertes-trend", z.array(alerteTrendSchema))
  },

  /** Répartition des fraudes par type. */
  async getFraudeParType(): Promise<FraudeParType[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).fraudeParType
    return fetchFromAPI("/dashboard/fraude-types", z.array(fraudeParTypeSchema))
  },

  /**
   * Dernières alertes du tableau de bord.
   *
   * Déléguée au service des alertes : le tableau de bord montre un extrait de la
   * même source que la page dédiée, il n'en détient pas une seconde copie.
   */
  getDernieresAlertes(limite = 6): Promise<Alerte[]> {
    return alertesService.getDernieres(limite)
  },

  /** Score de risque global du portefeuille. */
  async getScoreRisque(): Promise<ScoreRisque> {
    if (USE_MOCK) return (await chargerJeuLocal()).scoreRisqueGlobal
    return fetchFromAPI("/dashboard/score-risque", scoreRisqueSchema)
  },
}
