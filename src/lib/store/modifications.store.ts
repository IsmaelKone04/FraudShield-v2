import { create } from "zustand"
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware"

import {
  envoyerModificationAlerte,
  envoyerModificationInvestigation,
  envoyerModificationParametres,
  type PatchAlerte,
  type PatchInvestigation,
  type PatchParametres,
} from "@/lib/api/mutations"
import type { StatutAlerte } from "@/lib/schemas/commun"
import type { StatutInvestigation } from "@/lib/schemas/investigations.schema"
import {
  etatPersisteSchema,
  VERSION_STOCKAGE,
  type EtatPersiste,
} from "@/lib/schemas/modifications.schema"

/**
 * État mutable de la console : ce que l'utilisateur a changé depuis le chargement.
 *
 * Le serveur reste la source des alertes et des dossiers ; ce store ne porte que
 * les écarts (voir `modifications.schema.ts`). Les écrans les fusionnent au rendu
 * via les crochets de `use-modifications.ts`.
 */

const CLE_STOCKAGE = "fraudshield.modifications"

const maintenant = () => new Date().toISOString()

/**
 * Stockage neutre pendant le rendu serveur : il n'y a pas de navigateur à
 * interroger. Sans lui, le prérendu touche le `localStorage` global de Node, qui
 * n'existe qu'à titre expérimental et signale un avertissement à chaque build.
 */
const STOCKAGE_NEUTRE: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

type Actions = {
  changerStatutAlerte: (id: string, statut: StatutAlerte) => Promise<void>
  assignerAlerte: (id: string, analyste: string | null) => Promise<void>
  changerStatutInvestigation: (
    id: string,
    statut: StatutInvestigation
  ) => Promise<void>
  assignerInvestigation: (id: string, analyste: string) => Promise<void>
  /**
   * Enregistre les réglages qui s'écartent de ceux du serveur. Un écart vide
   * efface l'entrée : revenir aux valeurs d'origine ne laisse pas de trace.
   */
  enregistrerParametres: (ecart: PatchParametres) => Promise<void>
  /** Rend aux réglages leurs valeurs d'origine. */
  reinitialiserParametres: () => void
  /**
   * Repart du jeu de données d'origine — utile pour rejouer la démonstration.
   * Ne touche pas aux réglages : ils ont leur propre remise à zéro, sur l'écran
   * où ils se modifient. Le bouton des alertes ne doit pas défaire en silence une
   * configuration faite ailleurs.
   */
  reinitialiser: () => void
}

export type StoreModifications = EtatPersiste & Actions

const ETAT_INITIAL: EtatPersiste = {
  alertes: {},
  investigations: {},
  parametres: null,
}

export const useModificationsStore = create<StoreModifications>()(
  persist(
    (set, get) => {
      /**
       * Applique la modification tout de suite, l'envoie, et revient à l'état
       * antérieur si l'envoi échoue.
       *
       * L'affichage réagit donc au clic sans attendre le réseau, mais ne ment
       * jamais : un refus de l'API annule le changement à l'écran et l'erreur
       * remonte à l'appelant, qui l'affiche.
       */
      async function appliquer<C extends "alertes" | "investigations">(
        collection: C,
        id: string,
        patch: C extends "alertes" ? PatchAlerte : PatchInvestigation,
        envoi: () => Promise<void>
      ): Promise<void> {
        const avant = get()[collection][id]

        set((etat) => ({
          [collection]: {
            ...etat[collection],
            [id]: { ...avant, ...patch, modifieLe: maintenant() },
          },
        }))

        try {
          await envoi()
        } catch (erreur) {
          set((etat) => {
            const copie = { ...etat[collection] }
            if (avant) copie[id] = avant
            else delete copie[id]
            return { [collection]: copie }
          })
          throw erreur
        }
      }

      return {
        ...ETAT_INITIAL,

        changerStatutAlerte: (id, statut) =>
          appliquer("alertes", id, { statut }, () =>
            envoyerModificationAlerte(id, { statut })
          ),

        assignerAlerte: (id, analyste) =>
          appliquer("alertes", id, { assigneA: analyste }, () =>
            envoyerModificationAlerte(id, { assigneA: analyste })
          ),

        changerStatutInvestigation: (id, statut) =>
          appliquer("investigations", id, { statut }, () =>
            envoyerModificationInvestigation(id, { statut })
          ),

        assignerInvestigation: (id, analyste) =>
          appliquer("investigations", id, { assigne: analyste }, () =>
            envoyerModificationInvestigation(id, { assigne: analyste })
          ),

        /**
         * Même contrat optimiste que les alertes, sans la mécanique par
         * identifiant : les réglages sont uniques pour la console.
         */
        enregistrerParametres: async (ecart) => {
          const avant = get().parametres

          set({
            parametres:
              Object.keys(ecart).length > 0
                ? { valeurs: ecart, modifieLe: maintenant() }
                : null,
          })

          try {
            await envoyerModificationParametres(ecart)
          } catch (erreur) {
            set({ parametres: avant })
            throw erreur
          }
        },

        reinitialiserParametres: () => set({ parametres: null }),

        reinitialiser: () =>
          set({ alertes: {}, investigations: {} }),
      }
    },
    {
      name: CLE_STOCKAGE,
      version: VERSION_STOCKAGE,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? STOCKAGE_NEUTRE : window.localStorage
      ),

      /** Les actions ne se sérialisent pas : seuls les écarts sont conservés. */
      partialize: ({ alertes, investigations, parametres }) => ({
        alertes,
        investigations,
        parametres,
      }),

      /**
       * Le contenu du navigateur est validé avant d'entrer dans l'état, au même
       * titre qu'une réponse d'API (ADR-002). S'il est illisible — écrit par une
       * version antérieure, ou modifié à la main — on repart du jeu d'origine
       * plutôt que d'injecter une forme inattendue dans le rendu.
       */
      merge: (persiste, courant) => {
        const resultat = etatPersisteSchema.safeParse(persiste)
        if (!resultat.success) {
          console.warn(
            `[${CLE_STOCKAGE}] contenu local ignoré : ${resultat.error.issues[0]?.message ?? "format inattendu"}`
          )
          return { ...courant, ...ETAT_INITIAL }
        }
        return { ...courant, ...resultat.data }
      },

      /**
       * La relecture du `localStorage` est différée au montage côté client.
       *
       * Sans cela, le serveur rendrait l'état vide et le navigateur l'état
       * restauré : React signalerait une divergence d'hydratation. Le composant
       * `<HydratationModifications />` déclenche la relecture après le montage.
       */
      skipHydration: true,
    }
  )
)
