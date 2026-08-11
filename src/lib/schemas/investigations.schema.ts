import { z } from "zod"
import { dateISOSchema, statSchema } from "./commun"

export const prioriteSchema = z.enum(["Critique", "Élevée", "Moyenne", "Faible"])
export type Priorite = z.infer<typeof prioriteSchema>

export const statutInvestigationSchema = z.enum([
  "En cours",
  "À vérifier",
  "Clôturée",
])
export type StatutInvestigation = z.infer<typeof statutInvestigationSchema>

/** Dossier d'instruction, regroupant plusieurs alertes liées. */
export const investigationSchema = z.object({
  id: z.string(),
  titre: z.string(),
  priorite: prioriteSchema,
  assigne: z.string(),
  dateOuverture: dateISOSchema,
  dateMaj: dateISOSchema,
  statut: statutInvestigationSchema,
  casLies: z.number().int().nonnegative(),
  montantTotal: z.string(),
  description: z.string(),
  /** Identifiants d'alertes rattachées au dossier. */
  alertesLiees: z.array(z.string()),
  etablissements: z.array(z.string()),
})
export type Investigation = z.infer<typeof investigationSchema>

export const investigationsDataSchema = z.object({
  stats: z.array(statSchema),
  investigations: z.array(investigationSchema),
})
export type InvestigationsData = z.infer<typeof investigationsDataSchema>
