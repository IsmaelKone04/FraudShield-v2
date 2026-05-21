/**
 * FraudShield Santé — Dashboard Service
 *
 * Stratégie de transition JSON → API :
 * - En développement : lit les données depuis data.json (mock local)
 * - En production    : appelle le vrai endpoint FastAPI
 *
 * Pour passer à l'API réelle, il suffit de :
 * 1. Mettre USE_MOCK=false dans .env.local
 * 2. Renseigner NEXT_PUBLIC_API_URL dans .env.local
 * Aucun composant n'a besoin d'être modifié.
 */

import type {
  DashboardData,
  KPI,
  AlerteTrend,
  FraudeParType,
  Alerte,
  ScoreRisque,
} from "@/lib/types/dashboard.types"

// ─── Configuration ────────────────────────────────────────────────────────────
const USE_MOCK   = process.env.NEXT_PUBLIC_USE_MOCK !== "false"
const API_URL    = process.env.NEXT_PUBLIC_API_URL  || "http://localhost:8000/api/v1"

// ─── Chargement du mock local ─────────────────────────────────────────────────
async function getMockData(): Promise<DashboardData> {
  // Next.js permet l'import dynamique de JSON — zéro fetch réseau
  const data = await import("@/app/dashboard/data.json")
  return data.default as DashboardData
}

// ─── Appels API réels (activés quand USE_MOCK=false) ─────────────────────────
async function fetchFromAPI<T>(endpoint: string): Promise<T> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Next.js 14 : revalider toutes les 60 secondes
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${endpoint}`)
  }

  return res.json()
}

// ─── Service public ───────────────────────────────────────────────────────────
export const dashboardService = {

  /** Tous les KPIs (cards du haut) */
  async getKPIs(): Promise<KPI[]> {
    if (USE_MOCK) {
      const data = await getMockData()
      return data.kpis
    }
    return fetchFromAPI<KPI[]>("/dashboard/kpis")
  },

  /** Données du graphique évolution alertes */
  async getAlertesTrend(): Promise<AlerteTrend[]> {
    if (USE_MOCK) {
      const data = await getMockData()
      return data.alertesTrend
    }
    return fetchFromAPI<AlerteTrend[]>("/dashboard/alertes-trend")
  },

  /** Répartition des fraudes par type */
  async getFraudeParType(): Promise<FraudeParType[]> {
    if (USE_MOCK) {
      const data = await getMockData()
      return data.fraudeParType
    }
    return fetchFromAPI<FraudeParType[]>("/dashboard/fraude-types")
  },

  /** Dernières alertes pour le tableau */
  async getDernieresAlertes(): Promise<Alerte[]> {
    if (USE_MOCK) {
      const data = await getMockData()
      return data.dernieresAlertes
    }
    return fetchFromAPI<Alerte[]>("/alertes?limit=6&sort=date_desc")
  },

  /** Score de risque global */
  async getScoreRisque(): Promise<ScoreRisque> {
    if (USE_MOCK) {
      const data = await getMockData()
      return data.scoreRisqueGlobal
    }
    return fetchFromAPI<ScoreRisque>("/dashboard/score-risque")
  },
}