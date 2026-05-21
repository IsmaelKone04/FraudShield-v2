// ─── KPI Cards ────────────────────────────────────────────────────────────────
export interface KPI {
  id:             string
  label:          string
  value:          number
  valueFormatted: string
  change:         number
  trend:          "up" | "down"
  periode:        string
}

// ─── Graphique évolution ──────────────────────────────────────────────────────
export interface AlerteTrend {
  date:     string
  alertes:  number
  resolues: number
}

// ─── Répartition fraudes ──────────────────────────────────────────────────────
export interface FraudeParType {
  type:        string
  nombre:      number
  montant:     number
  pourcentage: number
  couleur:     string
}

// ─── Tableau alertes ──────────────────────────────────────────────────────────
export interface Alerte {
  id:             string
  type:           string
  assure:         string
  etablissement:  string
  montant:        number
  montantFormate: string
  risque:         "Élevé" | "Moyen" | "Faible"
  scoreIA:        number
  date:           string
  statut:         "En cours" | "À vérifier" | "Résolu"
}

// ─── Score risque ─────────────────────────────────────────────────────────────
export interface ScoreRisqueDetail {
  label:   string
  valeur:  number
  couleur: string
}

export interface ScoreRisque {
  score:   number
  niveau:  string
  details: ScoreRisqueDetail[]
}

// ─── Structure complète du data.json ─────────────────────────────────────────
export interface DashboardData {
  kpis:               KPI[]
  alertesTrend:       AlerteTrend[]
  fraudeParType:      FraudeParType[]
  dernieresAlertes:   Alerte[]
  scoreRisqueGlobal:  ScoreRisque
}