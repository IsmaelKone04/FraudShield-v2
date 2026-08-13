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
 *
 * Passé à 2 quand le classement sans suite a exigé une cause : un classement
 * enregistré avant, dépourvu de cause, ne satisfait plus le contrat. Plutôt que
 * de laisser la validation jeter l'intégralité du contenu local, une migration
 * défait ces décisions-là et conserve tout le reste (voir `modifications.store`).
 */
export const VERSION_STOCKAGE = 2

/** Horodatage de la modification, pour l'afficher et pour départager plus tard. */
const modifieLeSchema = z.iso.datetime()

/**
 * Ce qu'un analyste peut conclure d'un dossier.
 *
 * Trois issues, et elles ne se recouvrent pas : la fraude est établie, elle ne
 * l'est pas, ou l'instruction ne peut pas se poursuivre en l'état.
 */
export const TYPES_DECISION = [
  "fraude_confirmee",
  "classee_sans_suite",
  "piece_demandee",
] as const
export const typeDecisionSchema = z.enum(TYPES_DECISION)
export type TypeDecision = z.infer<typeof typeDecisionSchema>

/**
 * Pourquoi l'alerte ne tenait pas.
 *
 * Un classement sans suite non qualifié ne compte pour rien : il disparaît dans
 * un statut, et le modèle qui l'a produit continue de produire le même. C'est
 * cette liste — et elle seule — qui alimente le registre des faux positifs.
 *
 * Les causes ne se valent pas. Certaines se corrigent en réglant le modèle,
 * d'autres non : un doublon transmis deux fois par l'établissement est une
 * anomalie réelle que le modèle a eu raison de relever. Les additionner dans un
 * même « taux de faux positifs » produirait un chiffre qu'on ne saurait pas
 * quoi corriger — d'où la distinction portée par `lib/decisions.ts`.
 */
export const CAUSES_FAUX_POSITIF = [
  "seuil_trop_bas",
  "contexte_medical",
  "doublon_administratif",
  "donnee_reference_erronee",
  "regularisation_anterieure",
] as const
export const causeFauxPositifSchema = z.enum(CAUSES_FAUX_POSITIF)
export type CauseFauxPositif = z.infer<typeof causeFauxPositifSchema>

export const decisionSchema = z
  .object({
    type: typeDecisionSchema,
    /**
     * Obligatoire : une décision sans motif n'est pas opposable à
     * l'établissement mis en cause, et ne vaut rien dans un contentieux.
     */
    motif: z.string().trim().min(1).max(1000),
    /**
     * Cause du faux positif — présente si et seulement si le dossier est classé
     * sans suite. Le contrôle est plus bas : c'est une règle entre deux champs,
     * qu'aucun des deux ne peut porter seul.
     */
    cause: causeFauxPositifSchema.optional(),
    /** Adresse du compte qui décide — le « qui » de la piste d'audit. */
    acteur: z.email(),
    horodatage: modifieLeSchema,
    /**
     * Statut du dossier juste avant la décision.
     *
     * Conservé pour deux raisons : revenir sur une décision doit rendre au
     * dossier son état antérieur plutôt qu'un état deviné, et la piste d'audit
     * de la phase 4 attend précisément un avant/après.
     */
    statutAnterieur: statutAlerteSchema,
  })
  .superRefine((decision, ctx) => {
    const doitEtreQualifiee = decision.type === "classee_sans_suite"

    if (doitEtreQualifiee && decision.cause === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["cause"],
        message:
          "Un classement sans suite doit être qualifié : sans cause, il ne " +
          "compte pour rien dans le registre des faux positifs.",
      })
    }
    if (!doitEtreQualifiee && decision.cause !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["cause"],
        message:
          "Seul un classement sans suite porte une cause de faux positif.",
      })
    }
  })
export type Decision = z.infer<typeof decisionSchema>

/** Un commentaire interne porté au dossier. */
export const noteSchema = z.object({
  id: z.string(),
  texte: z.string().trim().min(1).max(2000),
  auteur: z.email(),
  horodatage: modifieLeSchema,
})
export type Note = z.infer<typeof noteSchema>

export const modificationAlerteSchema = z.object({
  statut: statutAlerteSchema.optional(),
  /** Adresse de l'analyste en charge ; `null` remet l'alerte en attente. */
  assigneA: z.string().nullable().optional(),
  /**
   * Ces deux champs sont facultatifs, comme l'a été `parametres` avant eux :
   * un contenu écrit par une version antérieure continue donc d'être lu, et
   * `VERSION_STOCKAGE` n'a pas à bouger — l'incrémenter jetterait au passage
   * les modifications déjà enregistrées (même raisonnement qu'en ADR-008).
   */
  decision: decisionSchema.optional(),
  notes: z.array(noteSchema).optional(),
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
