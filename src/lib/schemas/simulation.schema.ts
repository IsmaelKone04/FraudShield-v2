import { z } from "zod"
import { scoreSchema } from "./commun"

/**
 * La population de rejeu : toutes les demandes du mois, alertées ou non.
 *
 * Un simulateur de seuils ne peut pas travailler sur la liste des alertes. La
 * question qu'il pose — « qu'aurait-on vu avec un seuil plus bas ? » — porte
 * précisément sur les demandes qui **n'ont pas** déclenché d'alerte, et qui ne
 * figurent donc nulle part dans cette liste.
 *
 * La distribution est fournie par tranches de 5 points plutôt qu'en cinq mille
 * lignes : c'est la forme sous laquelle un entrepôt de données la rend, et le
 * rejeu n'est qu'une somme cumulée.
 */
export const trancheScoreSchema = z.object({
  /** Borne basse incluse. */
  min: scoreSchema,
  /** Borne haute incluse. */
  max: scoreSchema,
  demandes: z.number().int().nonnegative(),
  /** Fraudes établies : instruites, ou trouvées par le sondage. */
  fraudes: z.number().int().nonnegative(),
  /** Demandes régulières : alertes écartées, ou sondées sans rien trouver. */
  reguliers: z.number().int().nonnegative(),
  /**
   * Ni l'un ni l'autre : dossier encore ouvert, refermé sans conclusion, ou
   * jamais regardé. C'est la part de la population sur laquelle on ne sait
   * rien — et la raison pour laquelle tout ce qui est calculé en dessous du
   * seuil est une estimation.
   */
  sansVerdict: z.number().int().nonnegative(),
  /** Demandes de la tranche passées au sondage manuel. */
  demandesAuditees: z.number().int().nonnegative(),
  /**
   * Fraudes estimées parmi les demandes sans verdict, extrapolées du sondage
   * de la tranche.
   *
   * Convention délibérément conservatrice : nulle quand le sondage n'a rien
   * trouvé. Zéro fraude sur huit demandes sondées ne prouve pas zéro fraude,
   * mais avancer un chiffre à partir de rien serait pire. Le total est donc une
   * borne **basse**, et le rappel qui s'en déduit une borne **haute**.
   */
  fraudesEstimees: z.number().int().nonnegative(),
  /** Montant moyen d'une demande de la tranche, en francs CFA. */
  montantMoyen: z.number().nonnegative(),
  /** Montant moyen d'une fraude de la tranche — nul si aucune n'y est établie. */
  montantMoyenFraude: z.number().nonnegative(),
})
export type TrancheScore = z.infer<typeof trancheScoreSchema>

export const simulationDataSchema = z.object({
  periode: z.string(),
  /** Seuil en vigueur : le point de départ du curseur, et le repère du graphique. */
  seuilActuel: scoreSchema,
  /** Jours ouvrés de la période, pour convertir un volume en charge quotidienne. */
  joursOuvres: z.number().int().positive(),
  /** Dossiers que la cellule instruit dans une journée. */
  capaciteJour: z.number().int().positive(),
  /** D'où viennent les issues connues sous le seuil. Affiché avec toute estimation. */
  baseAudit: z.string(),
  tranches: z.array(trancheScoreSchema).min(1),
})
export type SimulationData = z.infer<typeof simulationDataSchema>
