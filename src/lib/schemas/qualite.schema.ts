import { z } from "zod"
import { causeFauxPositifSchema } from "./modifications.schema"

/**
 * Ce que le modèle a produit, jugé sur pièces.
 *
 * L'écran des analyses mesure la fraude ; celui-ci mesure le détecteur. Ce sont
 * deux objets différents, et les confondre revient à juger un modèle sur le
 * nombre d'alertes qu'il lève plutôt que sur ce qu'elles valaient.
 *
 * Toutes les grandeurs sont des **comptages de dossiers clos**, jamais des taux
 * précalculés : un taux servi par l'API ne se recoupe avec rien, alors qu'un
 * comptage se vérifie (voir les contrôles du service).
 */

/** Une case du tableau : un type de fraude, sur un mois. */
export const periodeQualiteSchema = z.object({
  /** Clé triable, « 2026-05 ». */
  mois: z.string().regex(/^\d{4}-\d{2}$/),
  /** Le même mois, écrit — « Mai 2026 ». */
  moisLibelle: z.string(),
  typeFraude: z.string(),
  /** Dossiers refermés dans le mois. La somme des trois issues doit le redonner. */
  clos: z.number().int().nonnegative(),
  confirmes: z.number().int().nonnegative(),
  fauxPositifs: z.number().int().nonnegative(),
  /** Refermés sans conclusion : ni fraude établie, ni alerte écartée. */
  nonConcluants: z.number().int().nonnegative(),
  /** Répartition des faux positifs par cause retenue à la clôture. */
  fauxPositifsParCause: z
    .array(
      z.object({
        cause: causeFauxPositifSchema,
        quantite: z.number().int().positive(),
      })
    )
    .default([]),
  /**
   * Fraudes estimées **non signalées** sur le mois.
   *
   * C'est la grandeur qui manque toujours : on ne connaît pas ce que le modèle
   * n'a pas vu. Elle ne se mesure que par sondage, d'où l'estimation — et d'où
   * l'obligation d'en donner la base juste à côté.
   */
  manquesEstimes: z.number().int().nonnegative(),
  /** Sur quoi repose l'estimation ci-dessus. Sans elle, le rappel ne vaut rien. */
  baseEstimation: z.string(),
})
export type PeriodeQualite = z.infer<typeof periodeQualiteSchema>

/**
 * Le taux de faux positifs imputables au modèle à partir duquel il faut le
 * reprendre, type de fraude par type de fraude.
 *
 * Il n'y a pas de seuil unique : une double facturation se tranche sur pièces,
 * un acte incohérent demande un avis médical. Le second tolère donc plus de
 * bruit que le premier, et un seuil commun ferait crier l'un ou dormir l'autre.
 */
export const seuilDeriveSchema = z.object({
  typeFraude: z.string(),
  /** Part des dossiers tranchés, entre 0 et 1. */
  seuil: z.number().min(0).max(1),
  /** Pourquoi ce seuil-là, pour qui lit le bandeau sans connaître le dossier. */
  justification: z.string(),
})
export type SeuilDerive = z.infer<typeof seuilDeriveSchema>

/**
 * Un établissement rapporté au bruit qu'il génère.
 *
 * Le registre ne sert pas qu'à corriger le modèle : quand un même établissement
 * produit quarante alertes dont trente-deux sont écartées pour doublon
 * administratif, ce n'est pas le modèle qu'il faut reprendre, c'est la
 * transmission.
 */
export const etablissementBruyantSchema = z.object({
  nom: z.string(),
  /** Alertes levées sur l'établissement pendant la période observée. */
  alertes: z.number().int().positive(),
  /** Dont classées sans suite. Ne peut pas dépasser le total. */
  fauxPositifs: z.number().int().nonnegative(),
  /** Cause revenue le plus souvent — c'est elle qui dit où agir. */
  causePrincipale: causeFauxPositifSchema,
})
export type EtablissementBruyant = z.infer<typeof etablissementBruyantSchema>

export const qualiteDataSchema = z.object({
  /** Période couverte par le jeu, écrite pour l'affichage. */
  periodeObservee: z.string(),
  /** Une entrée par couple (mois, type de fraude). */
  periodes: z.array(periodeQualiteSchema).min(1),
  seuils: z.array(seuilDeriveSchema).min(1),
  etablissementsBruyants: z.array(etablissementBruyantSchema),
})
export type QualiteData = z.infer<typeof qualiteDataSchema>
