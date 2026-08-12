"use client"

import { useMemo } from "react"

import type { Alerte, AlerteDetail } from "@/lib/schemas/alertes.schema"
import type { Investigation } from "@/lib/schemas/investigations.schema"
import type {
  Decision,
  ModificationAlerte,
  ModificationInvestigation,
  ModificationParametres,
  Note,
} from "@/lib/schemas/modifications.schema"
import type { ParametresSysteme } from "@/lib/schemas/parametres.schema"
import { useModificationsStore } from "./modifications.store"

/**
 * Fusion des données du serveur et des modifications locales.
 *
 * C'est le seul endroit où les deux se rencontrent. Les écrans reçoivent toujours
 * leurs données en props depuis leur composant serveur, passent par ces crochets,
 * et obtiennent la vue à jour — sans qu'aucune copie du jeu de données ne soit
 * conservée côté client.
 */

export type AlerteAvecModifications = Alerte & {
  /** Vrai si l'alerte porte au moins une modification locale. */
  estModifiee: boolean
}

/** Fusion d'une alerte et de sa modification éventuelle. Fonction pure, testée. */
export function fusionnerAlerte(
  alerte: Alerte,
  modification: ModificationAlerte | undefined
): AlerteAvecModifications {
  return {
    ...alerte,
    statut: modification?.statut ?? alerte.statut,
    // `??` serait ici un piège : retirer une assignation la met à `null`, et
    // l'alerte reviendrait alors à l'analyste du jeu de données. Seul
    // `undefined` signifie « non modifié ».
    assigneA:
      modification?.assigneA !== undefined
        ? modification.assigneA
        : alerte.assigneA,
    estModifiee: modification !== undefined,
  }
}

export function useAlertesAvecModifications(
  alertes: Alerte[]
): AlerteAvecModifications[] {
  const modifications = useModificationsStore((etat) => etat.alertes)

  return useMemo(
    () => alertes.map((alerte) => fusionnerAlerte(alerte, modifications[alerte.id])),
    [alertes, modifications]
  )
}

export type AlerteDetailAvecModifications = AlerteDetail &
  AlerteAvecModifications & {
    /** Conclusion de l'analyste, tant qu'il n'en a pas pris. */
    decision: Decision | undefined
    /** Commentaires internes, du plus ancien au plus récent. */
    notes: Note[]
  }

/**
 * Le dossier d'une alerte, à jour de ce qui a été fait dans la console.
 *
 * La décision et les notes n'existent que localement : le contrat de lecture
 * ne les porte pas encore. Elles sont donc lues dans le store et non dans le
 * dossier reçu du serveur — le jour où l'API les renverra, c'est cette fusion
 * qui changera, pas l'écran.
 */
export function useAlerteDetail(
  dossier: AlerteDetail
): AlerteDetailAvecModifications {
  const modification = useModificationsStore((etat) => etat.alertes[dossier.id])

  return useMemo(
    () => ({
      ...dossier,
      ...fusionnerAlerte(dossier, modification),
      decision: modification?.decision,
      notes: modification?.notes ?? [],
    }),
    [dossier, modification]
  )
}

export type InvestigationAvecModifications = Investigation & {
  estModifiee: boolean
}

/** Fusion d'un dossier et de sa modification éventuelle. Fonction pure, testée. */
export function fusionnerInvestigation(
  investigation: Investigation,
  modification: ModificationInvestigation | undefined
): InvestigationAvecModifications {
  return {
    ...investigation,
    statut: modification?.statut ?? investigation.statut,
    // Contrairement à l'alerte, un dossier est toujours assigné : `assigne` n'est
    // pas `nullable` dans le contrat, `??` convient donc ici.
    assigne: modification?.assigne ?? investigation.assigne,
    estModifiee: modification !== undefined,
  }
}

export function useInvestigationsAvecModifications(
  investigations: Investigation[]
): InvestigationAvecModifications[] {
  const modifications = useModificationsStore((etat) => etat.investigations)

  return useMemo(
    () =>
      investigations.map((investigation) =>
        fusionnerInvestigation(investigation, modifications[investigation.id])
      ),
    [investigations, modifications]
  )
}

/** Réglages du serveur, recouverts par ceux que l'utilisateur a enregistrés. */
export function fusionnerParametres(
  reference: ParametresSysteme,
  modification: ModificationParametres | null
): ParametresSysteme {
  return { ...reference, ...modification?.valeurs }
}

/**
 * Ce qui, dans un formulaire enregistré, s'écarte réellement du serveur.
 *
 * Sans ce filtre, enregistrer reviendrait à recopier les dix réglages dans le
 * navigateur : le jour où le serveur en changerait un, la copie locale
 * continuerait de l'écraser sans que personne l'ait demandé.
 */
export function ecartParametres(
  reference: ParametresSysteme,
  valeurs: ParametresSysteme
): Partial<ParametresSysteme> {
  return Object.fromEntries(
    Object.entries(valeurs).filter(
      ([cle, valeur]) => valeur !== reference[cle as keyof ParametresSysteme]
    )
  ) as Partial<ParametresSysteme>
}

export function useParametresSysteme(
  reference: ParametresSysteme
): ParametresSysteme {
  const modification = useModificationsStore((etat) => etat.parametres)

  return useMemo(
    () => fusionnerParametres(reference, modification),
    [reference, modification]
  )
}

/**
 * Seuil de déclenchement en vigueur, réglage local compris.
 *
 * L'écran des alertes n'a besoin que de celui-là : s'abonner au seul champ utile
 * évite de le redessiner quand un tout autre réglage change.
 */
export function useSeuilAlerteIA(defaut: number): number {
  return useModificationsStore(
    (etat) => etat.parametres?.valeurs.seuilAlerteIA ?? defaut
  )
}

/**
 * Nombre d'éléments modifiés localement.
 *
 * En mode démonstration, ces modifications ne quittent pas le navigateur : les
 * écrans s'en servent pour le signaler honnêtement à l'utilisateur.
 */
export function useNombreModifications(): number {
  return useModificationsStore(
    (etat) =>
      Object.keys(etat.alertes).length + Object.keys(etat.investigations).length
  )
}
