import { z } from "zod"
import { statutAlerteSchema } from "./commun"
import { statutInvestigationSchema } from "./investigations.schema"
import { parametresSystemeSchema } from "./parametres.schema"

/**
 * Ce que l'utilisateur a changé, et rien d'autre.
 *
 * Le store ne recopie pas les alertes chargées par le serveur : il n'en mémorise
 * que les écarts, indexés par identifiant. Deux raisons :
 *
 * 1. une copie complète recréerait exactement le défaut corrigé par l'ADR-004 —
 *    deux jeux d'alertes qui finissent par diverger ;
 * 2. le jour où l'API accepte les écritures, un envoi réussi vide simplement
 *    l'entrée correspondante : il ne reste rien à resynchroniser.
 */

/**
 * Numéro de format du contenu stocké dans le navigateur.
 *
 * À incrémenter dès que la forme d'une modification change : `zustand/persist`
 * écarte alors le contenu devenu illisible au lieu de le fusionner de travers.
 */
export const VERSION_STOCKAGE = 1

/** Horodatage de la modification, pour l'afficher et pour départager plus tard. */
const modifieLeSchema = z.iso.datetime()

export const modificationAlerteSchema = z.object({
  statut: statutAlerteSchema.optional(),
  /** Adresse de l'analyste en charge ; `null` remet l'alerte en attente. */
  assigneA: z.string().nullable().optional(),
  modifieLe: modifieLeSchema,
})
export type ModificationAlerte = z.infer<typeof modificationAlerteSchema>

export const modificationInvestigationSchema = z.object({
  statut: statutInvestigationSchema.optional(),
  assigne: z.string().optional(),
  modifieLe: modifieLeSchema,
})
export type ModificationInvestigation = z.infer<
  typeof modificationInvestigationSchema
>

/**
 * Les réglages que l'utilisateur a changés, et eux seuls.
 *
 * Même principe que pour une alerte : on ne recopie pas les dix réglages du
 * serveur, on ne garde que ceux qui s'en écartent. Enregistrer un formulaire sans
 * rien avoir touché ne laisse donc aucune trace, et l'écart se lit directement.
 */
export const modificationParametresSchema = z.object({
  valeurs: parametresSystemeSchema.partial(),
  modifieLe: modifieLeSchema,
})
export type ModificationParametres = z.infer<typeof modificationParametresSchema>

/**
 * Forme attendue de ce qui revient du `localStorage`.
 *
 * Le contenu du navigateur est une donnée hors de notre contrôle : écrite par une
 * version antérieure du site, modifiable à la main dans les outils de développement.
 * Elle est donc validée comme une réponse d'API — même règle, même exigence
 * (ADR-002). Ce qui ne passe pas est écarté plutôt que propagé dans le rendu.
 */
export const etatPersisteSchema = z.object({
  alertes: z.record(z.string(), modificationAlerteSchema),
  investigations: z.record(z.string(), modificationInvestigationSchema),
  /**
   * Absent du contenu écrit avant l'arrivée des paramètres persistants, d'où la
   * valeur par défaut : le champ s'ajoute sans invalider l'existant. C'est
   * précisément pourquoi `VERSION_STOCKAGE` ne bouge pas — l'incrémenter ferait
   * jeter au passage les modifications d'alertes déjà enregistrées.
   */
  parametres: modificationParametresSchema.nullable().default(null),
})
export type EtatPersiste = z.infer<typeof etatPersisteSchema>
