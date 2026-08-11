import { z } from "zod"
import { scoreSchema } from "./commun"

/** Carte de KPI en tête du tableau de bord. */
export const kpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  valueFormatted: z.string(),
  change: z.number(),
  trend: z.enum(["up", "down"]),
  periode: z.string(),
})
export type KPI = z.infer<typeof kpiSchema>

/** Un point de la courbe d'évolution des alertes. */
export const alerteTrendSchema = z.object({
  date: z.string(),
  alertes: z.number(),
  resolues: z.number(),
})
export type AlerteTrend = z.infer<typeof alerteTrendSchema>

/** Une part de la répartition des fraudes par type. */
export const fraudeParTypeSchema = z.object({
  type: z.string(),
  nombre: z.number(),
  montant: z.number(),
  pourcentage: z.number(),
  /** Couleur du secteur, en hexadécimal. */
  couleur: z.string(),
})
export type FraudeParType = z.infer<typeof fraudeParTypeSchema>

export const scoreRisqueDetailSchema = z.object({
  label: z.string(),
  valeur: z.number(),
  couleur: z.string(),
})
export type ScoreRisqueDetail = z.infer<typeof scoreRisqueDetailSchema>

export const scoreRisqueSchema = z.object({
  score: scoreSchema,
  niveau: z.string(),
  details: z.array(scoreRisqueDetailSchema),
})
export type ScoreRisque = z.infer<typeof scoreRisqueSchema>

/**
 * Contenu de `dashboard/data.json`.
 *
 * Les dernières alertes n'y figurent plus : elles proviennent désormais du même
 * jeu de données que la page « Alertes », via `dashboardService.getDernieresAlertes()`.
 */
export const dashboardDataSchema = z.object({
  kpis: z.array(kpiSchema),
  alertesTrend: z.array(alerteTrendSchema),
  fraudeParType: z.array(fraudeParTypeSchema),
  scoreRisqueGlobal: scoreRisqueSchema,
})
export type DashboardData = z.infer<typeof dashboardDataSchema>
