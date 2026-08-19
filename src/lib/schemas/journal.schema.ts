import { z } from "zod"

/**
 * La piste d'audit : ce qui a été fait, par qui, quand, et à partir de quel état.
 *
 * Le reste du store ne garde que l'**état courant** des écarts — c'est son
 * contrat, et c'est ce qui l'empêche de diverger du serveur (ADR-004). Un
 * journal a besoin de l'inverse : il conserve les faits dans l'ordre où ils se
 * sont produits, et rien ne les efface. « Revenir sur la décision » remet le
 * dossier dans l'état où il était et supprime la décision du store ; sans
 * journal séparé, plus personne ne saurait qu'une décision a été prise, ni
 * qu'elle a été défaite. C'est précisément ce qu'un contrôleur vient chercher.
 *
 * D'où deux collections distinctes, deux clés de stockage, deux cycles de vie :
 * les écarts se modifient et se remettent à zéro, les entrées du journal
 * s'ajoutent et rien d'autre.
 */

/** Numéro de format du journal, indépendant de celui des modifications. */
export const VERSION_JOURNAL = 1

/**
 * Ce que la console sait faire, et donc ce qu'elle sait journaliser.
 *
 * La liste est fermée : une action métier ajoutée demain doit y figurer pour
 * pouvoir passer par le store, et le compilateur le rappellera.
 */
export const ACTIONS_JOURNAL = [
  "statut_alerte",
  "assignation_alerte",
  "decision",
  "annulation_decision",
  "note_ajoutee",
  "note_supprimee",
  "statut_investigation",
  "assignation_investigation",
  "parametre_modifie",
  "parametres_reinitialises",
  "modifications_reinitialisees",
] as const
export const actionJournalSchema = z.enum(ACTIONS_JOURNAL)
export type ActionJournal = z.infer<typeof actionJournalSchema>

/**
 * Longueur maximale d'un avant, d'un après ou d'un motif.
 *
 * Alignée sur le plus long des champs journalisables — le texte d'une note. Le
 * journal ne tronque donc jamais : un motif coupé au milieu ne serait pas
 * opposable, et c'est bien pour être opposable qu'on l'exige.
 */
const LONGUEUR_MAX = 2000

/** Valeur d'un champ avant ou après l'action, mise en forme pour être lue. */
const valeurSchema = z.string().max(LONGUEUR_MAX).nullable()

export const entreeJournalSchema = z.object({
  id: z.string().min(1),
  horodatage: z.iso.datetime(),
  /**
   * Qui. L'adresse du compte connecté au moment de l'action — ou, à défaut, une
   * mention explicite : voir `ACTEUR_INCONNU`.
   */
  acteur: z.string().min(1),
  action: actionJournalSchema,
  /**
   * Sur quoi : l'identifiant de l'alerte ou du dossier, le nom du réglage
   * touché, ou `null` quand l'action porte sur la console entière.
   */
  cible: z.string().min(1).nullable(),
  /** L'état d'avant, écrit tel qu'il s'affichait. `null` s'il n'y en avait pas. */
  avant: valeurSchema,
  /** L'état d'après. `null` quand l'action retire la valeur au lieu d'en poser une. */
  apres: valeurSchema,
  /**
   * Pourquoi, quand l'action en exige un.
   *
   * Une décision et un classement sans suite en portent un par contrat ; un
   * changement de statut depuis la liste n'en demande pas. Le champ reste donc
   * `null` dans ce cas plutôt que de recevoir une phrase que personne n'a
   * écrite — un motif inventé vaut moins que pas de motif.
   */
  motif: valeurSchema,
})
export type EntreeJournal = z.infer<typeof entreeJournalSchema>

/**
 * Forme attendue de ce qui revient du `localStorage`, validée comme une réponse
 * d'API (ADR-002). Une entrée illisible ne doit pas faire tomber les autres :
 * c'est le store qui écarte les mauvaises et conserve le reste.
 */
export const journalPersisteSchema = z.object({
  entrees: z.array(entreeJournalSchema),
})
export type JournalPersiste = z.infer<typeof journalPersisteSchema>
