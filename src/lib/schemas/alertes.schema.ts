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
 * Un facteur ayant pesé sur le score, avec ce qu'il a pesé.
 *
 * La forme est calquée sur une valeur SHAP : une contribution **signée**, en
 * points de score, rapportée à une valeur de base commune à tous les dossiers.
 * Un vrai modèle en produit exactement cela ; le jour où l'API en renvoie, elle
 * remplira ce contrat sans qu'il bouge.
 *
 * Il n'y a **pas** de champ « sens » : le signe de `contribution` le porte déjà.
 * Un aggravant à contribution négative serait un état impossible, et c'est
 * précisément le genre de contradiction que deux champs redondants finissent
 * par produire.
 */
export const facteurRisqueSchema = z.object({
  /** Identifiant stable du facteur, pour le rapprocher d'un dossier à l'autre. */
  code: z.string(),
  libelle: z.string(),
  /** Points de score ajoutés (> 0) ou retirés (< 0) par ce facteur. */
  contribution: z.number().int(),
  /** Ce qui a été mesuré sur ce dossier, déjà mis en forme. */
  valeurObservee: z.string(),
  /** Ce à quoi cette mesure a été comparée. */
  valeurAttendue: z.string(),
  /** D'où vient la mesure — la question que pose tout établissement mis en cause. */
  source: z.string(),
  /**
   * Le facteur formulé en proposition insérable dans une phrase, sans
   * majuscule ni point final : « le montant facturé représente 2,5 fois le
   * tarif de la nomenclature ». C'est de ces énoncés qu'est composée la note
   * d'explication.
   */
  enonce: z.string(),
})
export type FacteurRisque = z.infer<typeof facteurRisqueSchema>

/**
 * La décomposition du score, telle qu'elle est opposable.
 *
 * `valeurDeBase` est le score moyen de l'ensemble des demandes analysées : le
 * point de départ commun à tous les dossiers, et non une propriété de
 * celui-ci. La somme des contributions l'amène au score affiché — le service
 * refuse de servir un dossier où ce n'est pas le cas.
 */
export const decompositionSchema = z.object({
  valeurDeBase: scoreSchema,
  facteurs: z.array(facteurRisqueSchema).min(1),
  /** Version du moteur ayant produit ce score, pour l'audit. */
  modele: z.string(),
  calculeLe: z.iso.datetime(),
})
export type Decomposition = z.infer<typeof decompositionSchema>

/**
 * Le dossier replacé face à une population de référence.
 *
 * Un chiffre seul ne se conteste pas : « 2 400 000 FCFA » ne devient un
 * argument que comparé à ce que facture habituellement l'établissement, à ce
 * que coûte l'acte ailleurs, et à ce que la période laissait attendre.
 */
export const comparatifSchema = z.object({
  /** À quoi le dossier est comparé : « L'établissement », « L'acte »… */
  cohorte: z.string(),
  libelle: z.string(),
  valeurDossier: z.number().nonnegative(),
  valeurCohorte: z.number().nonnegative(),
  /** Sur quoi la moyenne est calculée — sans quoi elle ne vaut rien. */
  effectif: z.string(),
  unite: z.enum(["FCFA", "actes", "jours"]),
})
export type Comparatif = z.infer<typeof comparatifSchema>

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
  explication: decompositionSchema,
  comparatifs: z.array(comparatifSchema).min(1),
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
