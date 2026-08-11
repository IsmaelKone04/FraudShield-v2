import { z } from "zod"
import {
  dateISOSchema,
  niveauRisqueSchema,
  scoreSchema,
  statSchema,
  statutAlerteSchema,
} from "./commun"

/**
 * L'alerte est l'objet central du produit. Sa définition vit ici et nulle part
 * ailleurs : le tableau de bord n'en garde plus de copie, il demande les
 * dernières alertes au même service que la page dédiée.
 */
export const alerteSchema = z.object({
  id: z.string(),
  type: z.string(),
  assure: z.string(),
  etablissement: z.string(),
  /** Montant en francs CFA, pour trier et calculer. */
  montant: z.number().nonnegative(),
  /** Même montant, mis en forme pour l'affichage (« 2 400 000 FCFA »). */
  montantFormate: z.string(),
  /** Score du modèle de détection, sur 100. */
  scoreIA: scoreSchema,
  risque: niveauRisqueSchema,
  date: dateISOSchema,
  /** Même date, en JJ/MM/AAAA. */
  dateFormate: z.string(),
  statut: statutAlerteSchema,
})
export type Alerte = z.infer<typeof alerteSchema>

export const alertesDataSchema = z.object({
  stats: z.array(statSchema),
  alertes: z.array(alerteSchema),
})
export type AlertesData = z.infer<typeof alertesDataSchema>
