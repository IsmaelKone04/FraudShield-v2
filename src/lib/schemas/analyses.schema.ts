import { z } from "zod"
import { scoreSchema } from "./commun"

export const statistiquesGlobalesSchema = z.object({
  totalAnalyses: z.number(),
  casConfirmes: z.number(),
  montantRecupere: z.number(),
  montantRecupereFormate: z.string(),
  /** Confiance moyenne du modèle, sur 100. */
  scoreConfianceIA: scoreSchema,
})
export type StatistiquesGlobales = z.infer<typeof statistiquesGlobalesSchema>

export const etablissementSuspectSchema = z.object({
  nom: z.string(),
  ville: z.string(),
  cas: z.number().int().nonnegative(),
  montant: z.number().nonnegative(),
  /** Évolution en pourcentage ; négative quand la situation s'améliore. */
  evolution: z.number(),
})
export type EtablissementSuspect = z.infer<typeof etablissementSuspectSchema>

export const segmentRisqueSchema = z.object({
  segment: z.string(),
  quantite: z.number().int().nonnegative(),
})
export type SegmentRisque = z.infer<typeof segmentRisqueSchema>

export const comportementAnormalSchema = z.object({
  id: z.string(),
  indicateur: z.string(),
  occurrences: z.number().int().nonnegative(),
  gravite: z.enum(["Critique", "Élevé", "Moyen"]),
  impactFormate: z.string(),
})
export type ComportementAnormal = z.infer<typeof comportementAnormalSchema>

export const analysesDataSchema = z.object({
  statistiquesGlobales: statistiquesGlobalesSchema,
  topEtablissementsSuspects: z.array(etablissementSuspectSchema),
  repartitionRisque: z.array(segmentRisqueSchema),
  comportementsAnormaux: z.array(comportementAnormalSchema),
})
export type AnalysesData = z.infer<typeof analysesDataSchema>
