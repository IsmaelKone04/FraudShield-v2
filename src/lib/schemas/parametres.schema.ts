import { z } from "zod"
import { scoreSchema } from "./commun"

export const utilisateurSchema = z.object({
  id: z.string(),
  nom: z.string(),
  email: z.email(),
  role: z.enum(["Administrateur", "Superviseur", "Agent d'analyse"]),
  statut: z.enum(["Actif", "Inactif"]),
  derniereCo: z.string(),
  /** Initiales affichées dans la pastille, à défaut d'avatar. */
  initiales: z.string(),
  /** Classe Tailwind de fond de la pastille. */
  color: z.string(),
})
export type Utilisateur = z.infer<typeof utilisateurSchema>

export const modeleSchema = z.object({
  id: z.string(),
  nom: z.string(),
  type: z.string(),
  version: z.string(),
  /** Précision annoncée du modèle, sur 100. */
  precision: scoreSchema,
  statut: z.enum(["Actif", "Inactif", "Entraînement"]),
  dernierEntrainement: z.string(),
  dossiersTraites: z.number().int().nonnegative(),
})
export type Modele = z.infer<typeof modeleSchema>

/**
 * Réglages de la console.
 *
 * `seuilAlerteIA` est le paramètre structurant : c'est lui que le simulateur de
 * seuils prévu en phase 4 fera varier.
 */
export const parametresSystemeSchema = z.object({
  seuilAlerteIA: scoreSchema,
  analyseAutomatique: z.boolean(),
  notificationEmail: z.boolean(),
  notificationSMS: z.boolean(),
  exportAutomatique: z.boolean(),
  frequenceAnalyse: z.string(),
  langueInterface: z.string(),
  fuseauHoraire: z.string(),
  /** Durée de rétention des données, en jours. */
  retentionDonnees: z.number().int().positive(),
  niveauLog: z.string(),
})
export type ParametresSysteme = z.infer<typeof parametresSystemeSchema>

export const parametresDataSchema = z.object({
  utilisateurs: z.array(utilisateurSchema),
  modeles: z.array(modeleSchema),
  parametresSysteme: parametresSystemeSchema,
})
export type ParametresData = z.infer<typeof parametresDataSchema>
