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
import { DECISIONS } from "@/lib/decisions"
import {
  etatPersisteSchema,
  VERSION_STOCKAGE,
  type Decision,
  type EtatPersiste,
  type Note,
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

/**
 * Migration v1 → v2 : le classement sans suite exige désormais une cause.
 *
 * Une décision enregistrée avant n'en porte pas et ne satisfait plus le
 * contrat. Sans reprise, la validation d'entrée écarterait **tout** le contenu
 * local — statuts, assignations et notes compris — pour un champ manquant sur
 * un seul dossier. La migration défait ces décisions-là et rien d'autre,
 * exactement comme le ferait « Revenir sur la décision » : le dossier retrouve
 * le statut qu'il avait avant. Ce qui ne peut plus être représenté est annulé,
 * pas complété d'une cause qu'aucun analyste n'a choisie.
 *
 * Exportée parce qu'elle est le seul endroit du projet qui puisse détruire le
 * travail d'un utilisateur : une fonction pure, et testée comme telle.
 */
export function defaireDecisionsNonQualifiees(contenu: unknown): unknown {
  if (typeof contenu !== "object" || contenu === null) return contenu

  const etat = contenu as Record<string, unknown>
  const alertes = etat.alertes
  if (typeof alertes !== "object" || alertes === null) return contenu

  const reprises = Object.entries(alertes as Record<string, unknown>).map(
    ([id, valeur]) => {
      if (typeof valeur !== "object" || valeur === null) return [id, valeur]

      const { decision, ...reste } = valeur as Record<string, unknown>
      const conclusion = decision as Record<string, unknown> | undefined
      if (
        conclusion?.type !== "classee_sans_suite" ||
        conclusion.cause !== undefined
      ) {
        return [id, valeur]
      }

      console.warn(
        `[${CLE_STOCKAGE}] ${id} : classement sans suite enregistré sans ` +
          `cause, décision annulée (le dossier redevient « ${conclusion.statutAnterieur} »).`
      )
      return [
        id,
        typeof conclusion.statutAnterieur === "string"
          ? { ...reste, statut: conclusion.statutAnterieur }
          : reste,
      ]
    }
  )

  return { ...etat, alertes: Object.fromEntries(reprises) }
}

type Actions = {
  changerStatutAlerte: (id: string, statut: StatutAlerte) => Promise<void>
  assignerAlerte: (id: string, analyste: string | null) => Promise<void>
  /**
   * Enregistre la conclusion de l'analyste et le statut qui en découle.
   *
   * Les deux partent ensemble : une décision qui laisserait le dossier dans son
   * statut antérieur serait une décision sans effet.
   */
  deciderAlerte: (
    id: string,
    decision: Omit<Decision, "horodatage">
  ) => Promise<void>
  /** Rend au dossier le statut qu'il avait avant la décision, et l'efface. */
  annulerDecisionAlerte: (id: string) => Promise<void>
  ajouterNote: (
    id: string,
    note: Omit<Note, "id" | "horodatage">
  ) => Promise<void>
  supprimerNote: (id: string, noteId: string) => Promise<void>
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

        deciderAlerte: (id, decision) => {
          const complete: Decision = { ...decision, horodatage: maintenant() }
          const statut = DECISIONS[decision.type].statut
          return appliquer("alertes", id, { decision: complete, statut }, () =>
            envoyerModificationAlerte(id, { decision: complete, statut })
          )
        },

        annulerDecisionAlerte: (id) => {
          const decision = get().alertes[id]?.decision
          if (!decision) return Promise.resolve()

          // `undefined` retire le champ à la sérialisation : le dossier
          // retrouve exactement l'état où la décision l'avait trouvé.
          const patch = {
            decision: undefined,
            statut: decision.statutAnterieur,
          }
          return appliquer("alertes", id, patch, () =>
            envoyerModificationAlerte(id, patch)
          )
        },

        ajouterNote: (id, note) => {
          const notes: Note[] = [
            ...(get().alertes[id]?.notes ?? []),
            { ...note, id: crypto.randomUUID(), horodatage: maintenant() },
          ]
          return appliquer("alertes", id, { notes }, () =>
            envoyerModificationAlerte(id, { notes })
          )
        },

        supprimerNote: (id, noteId) => {
          const notes = (get().alertes[id]?.notes ?? []).filter(
            (note) => note.id !== noteId
          )
          return appliquer("alertes", id, { notes }, () =>
            envoyerModificationAlerte(id, { notes })
          )
        },

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

      /**
       * Le contenu écrit par une version antérieure est repris, pas jeté.
       *
       * `migrate` s'exécute avant la validation : c'est le seul endroit où une
       * forme périmée peut encore être rattrapée.
       */
      migrate: (contenu, version) =>
        version >= 2 ? contenu : defaireDecisionsNonQualifiees(contenu),
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
