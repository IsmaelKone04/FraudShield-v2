import { z } from "zod"

/**
 * Briques partagées entre les six domaines.
 *
 * Les schémas sont la source unique : les types TypeScript en sont **déduits**
 * (`z.infer`), jamais écrits à la main en parallèle. Un type écrit deux fois finit
 * par diverger — c'est déjà arrivé sur ce projet, où la même alerte portait deux
 * dates différentes selon l'écran.
 */

/** Carte de statistique en tête des écrans de liste. */
export const statSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  valueFormate: z.string(),
  description: z.string(),
  color: z.enum(["default", "warning", "info", "success"]),
})
export type Stat = z.infer<typeof statSchema>

/** Niveau de risque d'un dossier, tel qu'affiché à l'analyste. */
export const niveauRisqueSchema = z.enum(["Élevé", "Moyen", "Faible"])
export type NiveauRisque = z.infer<typeof niveauRisqueSchema>

/** Statut d'une alerte dans son cycle de traitement. */
export const statutAlerteSchema = z.enum(["En cours", "À vérifier", "Résolu"])
export type StatutAlerte = z.infer<typeof statutAlerteSchema>

/**
 * Score de confiance du modèle, sur 100.
 *
 * Borné volontairement : un score hors de [0, 100] venant de l'API est un défaut
 * d'intégration, pas une donnée à afficher.
 */
export const scoreSchema = z.number().min(0).max(100)

/** Date au format ISO court (`2026-05-20`), telle que stockée. */
export const dateISOSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "date attendue au format AAAA-MM-JJ",
})

/**
 * Types de fraude connus, pour les couleurs et les filtres.
 *
 * Volontairement **pas** un `z.enum` : le service de détection peut en introduire
 * de nouveaux, et un type inconnu doit s'afficher tel quel plutôt que faire
 * échouer la validation de tout le jeu de données.
 */
export const TYPES_FRAUDE = [
  "Surfacturation",
  "Service non fourni",
  "Double facturation",
  "Usurpation identité",
  "Fréquence anormale",
  "Acte incohérent",
  "Autres",
] as const
