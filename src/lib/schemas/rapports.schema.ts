import { z } from "zod"
import { dateISOSchema, statSchema } from "./commun"

export const categorieRapportSchema = z.object({
  id: z.string(),
  label: z.string(),
})
export type CategorieRapport = z.infer<typeof categorieRapportSchema>

export const rapportSchema = z.object({
  id: z.string(),
  titre: z.string(),
  /** Identifiant de catégorie, à rapprocher de `categories[].id`. */
  categorie: z.string(),
  description: z.string(),
  format: z.enum(["PDF", "CSV", "Excel"]),
  /** Taille du fichier, déjà mise en forme (« 2,4 Mo »). */
  taille: z.string(),
  /**
   * Nombre de pages, `null` quand la notion n'a pas de sens : un export CSV ou
   * Excel n'est pas paginé, et un PDF encore en génération n'a pas de compte.
   */
  pages: z.number().int().nonnegative().nullable(),
  dateGeneration: dateISOSchema,
  dateFormate: z.string(),
  generePar: z.string(),
  statut: z.enum(["Prêt", "En génération"]),
  telechargements: z.number().int().nonnegative(),
  tags: z.array(z.string()),
})
export type Rapport = z.infer<typeof rapportSchema>

export const rapportsDataSchema = z.object({
  stats: z.array(statSchema),
  categories: z.array(categorieRapportSchema),
  rapports: z.array(rapportSchema),
})
export type RapportsData = z.infer<typeof rapportsDataSchema>
