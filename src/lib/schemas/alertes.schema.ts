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
  /**
   * Adresse de l'analyste en charge, `null` si l'alerte n'est assignée à
   * personne. Le champ est **obligatoire** dans le contrat : une API qui
   * l'omettrait laisserait la console incapable de distinguer « personne » de
   * « information absente ».
   */
  assigneA: z.email().nullable(),
})
export type Alerte = z.infer<typeof alerteSchema>

/**
 * Un acte facturé, tel qu'il figure sur la demande de remboursement.
 *
 * C'est le niveau où la fraude se constate : l'alerte dit qu'il y a un problème,
 * la ligne d'acte dit lequel. Le tarif de référence est conservé à côté du
 * montant facturé — sans lui, « 180 000 FCFA » ne veut rien dire.
 */
export const acteSchema = z.object({
  /** Code de la nomenclature, tel que saisi par l'établissement. */
  code: z.string(),
  libelle: z.string(),
  date: dateISOSchema,
  dateFormate: z.string(),
  quantite: z.number().int().positive(),
  /** Montant facturé pour cette ligne, quantité comprise. */
  montant: z.number().nonnegative(),
  montantFormate: z.string(),
  /** Tarif de la nomenclature pour la même quantité, à titre de comparaison. */
  tarifReference: z.number().nonnegative(),
  /**
   * Ce que le moteur de détection a relevé sur cette ligne précise, `null`
   * quand elle n'appelle aucune remarque. Toutes les lignes d'un dossier
   * signalé ne sont pas fautives — le dire évite de laisser croire l'inverse.
   */
  signal: z.string().nullable(),
})
export type Acte = z.infer<typeof acteSchema>

/**
 * Un événement de la vie du dossier, tel que le serveur le connaît.
 *
 * Les décisions et les notes prises dans la console s'y ajoutent à l'affichage,
 * mais ne sont pas stockées ici : elles vivent dans le store des modifications
 * tant que l'API n'accepte pas les écritures.
 */
export const evenementSchema = z.object({
  horodatage: z.iso.datetime(),
  libelle: z.string(),
  /**
   * Adresse du compte à l'origine de l'événement, `null` quand c'est le moteur
   * de détection. Le nom affiché est résolu par `lib/utilisateurs.ts` : le
   * journal porte l'identifiant, pas une copie du libellé (ADR-010).
   */
  acteur: z.email().nullable(),
})
export type Evenement = z.infer<typeof evenementSchema>

/**
 * Le dossier complet, tel que le rend `GET /alertes/{id}`.
 *
 * La liste ne transporte que le résumé : demander à `GET /alertes` de renvoyer
 * les actes et la chronologie de mille alertes pour n'en afficher que dix
 * lignes n'aurait pas de sens. Le détail étend donc le résumé au lieu de le
 * redéfinir — un champ ajouté à l'alerte se retrouve automatiquement ici.
 */
export const alerteDetailSchema = alerteSchema.extend({
  /** Numéro d'assuré au répertoire de l'organisme. */
  assureRef: z.string(),
  /** Numéro du contrat au titre duquel le remboursement est demandé. */
  contratRef: z.string(),
  /** Identifiant de l'établissement au fichier national. */
  etablissementRef: z.string(),
  praticien: z.string(),
  actes: z.array(acteSchema).min(1),
  chronologie: z.array(evenementSchema).min(1),
})
export type AlerteDetail = z.infer<typeof alerteDetailSchema>

/**
 * Les compléments propres au détail, indexés par identifiant d'alerte.
 *
 * Le jeu local ne recopie pas le résumé dans le détail : le service les
 * assemble. Deux copies de la même alerte finiraient par diverger — c'est
 * exactement le défaut corrigé par l'ADR-004.
 */
export const complementAlerteSchema = alerteDetailSchema.omit({
  id: true,
  type: true,
  assure: true,
  etablissement: true,
  montant: true,
  montantFormate: true,
  scoreIA: true,
  risque: true,
  date: true,
  dateFormate: true,
  statut: true,
  assigneA: true,
})
export type ComplementAlerte = z.infer<typeof complementAlerteSchema>

export const alertesDataSchema = z.object({
  stats: z.array(statSchema),
  alertes: z.array(alerteSchema),
  /** Un complément par alerte ; le service vérifie qu'il n'en manque aucun. */
  details: z.record(z.string(), complementAlerteSchema),
})
export type AlertesData = z.infer<typeof alertesDataSchema>
