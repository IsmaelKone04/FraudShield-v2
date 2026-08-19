import { create } from "zustand"
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware"

import { ACTEUR_INCONNU, ajouterAuJournal, relireJournal } from "@/lib/journal"
import { VERSION_JOURNAL, type EntreeJournal } from "@/lib/schemas/journal.schema"

/**
 * Le journal d'audit : qui a fait quoi, quand, à partir de quel état.
 *
 * Store distinct de celui des modifications, et c'est le point important. Les
 * deux n'ont pas le même cycle de vie :
 *
 * - les écarts se modifient, se défont et se remettent à zéro ;
 * - les entrées du journal s'ajoutent, et rien ne les retire.
 *
 * Les loger ensemble aurait fait porter au journal les remises à zéro de
 * l'autre — « Réinitialiser » aurait effacé la trace de ce qu'il efface — et
 * l'aurait exposé au même rejet en bloc : un écart illisible fait repartir le
 * store des modifications de zéro (voir son `merge`), ce qui est acceptable
 * pour un statut, jamais pour une piste d'audit.
 *
 * Deux clés de stockage, donc, et deux numéros de format.
 */

const CLE_STOCKAGE = "fraudshield.journal"

/** Voir `modifications.store.ts` : il n'y a pas de navigateur au rendu serveur. */
const STOCKAGE_NEUTRE: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

/** L'entrée telle que l'appelant la décrit : le reste est posé ici. */
export type Trace = Omit<EntreeJournal, "id" | "horodatage" | "acteur">

type EtatJournal = {
  entrees: EntreeJournal[]
}

type ActionsJournal = {
  /**
   * Adresse du compte connecté, posée après le montage par `<ActeurJournal />`.
   *
   * Volontairement hors du contenu persisté : c'est une propriété de la session
   * en cours, pas du journal. La relire depuis le navigateur attribuerait les
   * actions d'aujourd'hui au compte d'hier.
   */
  acteur: string | null
  definirActeur: (acteur: string | null) => void
  /**
   * Ajoute une entrée. Seule écriture du journal — il n'existe ni suppression
   * ni modification, et c'est ce qui en fait une piste d'audit plutôt qu'une
   * liste.
   */
  journaliser: (trace: Trace) => void
}

export type StoreJournal = EtatJournal & ActionsJournal

export const useJournalStore = create<StoreJournal>()(
  persist(
    (set, get) => ({
      entrees: [],
      acteur: null,

      definirActeur: (acteur) => set({ acteur }),

      journaliser: (trace) =>
        set((etat) => ({
          entrees: ajouterAuJournal(etat.entrees, {
            ...trace,
            id: crypto.randomUUID(),
            horodatage: new Date().toISOString(),
            /*
              Sans session nommée, on écrit la mention plutôt que de renoncer à
              l'entrée : un journal qui perd des faits quand il ne sait pas les
              attribuer est moins fiable qu'un journal qui dit ne pas savoir.
              Le cas ne devrait pas se produire — `proxy.ts` exige une session
              avant tout rendu — d'où l'avertissement s'il survient.
            */
            acteur: get().acteur ?? ACTEUR_INCONNU,
          }),
        })),
    }),
    {
      name: CLE_STOCKAGE,
      version: VERSION_JOURNAL,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? STOCKAGE_NEUTRE : window.localStorage
      ),

      /** L'acteur relève de la session : il ne se persiste pas. */
      partialize: ({ entrees }) => ({ entrees }),

      /**
       * Le contenu du navigateur est validé entrée par entrée, et non en bloc.
       *
       * Le store des modifications repart de zéro quand son contenu est
       * illisible : perdre un statut est réparable en le reposant. Un journal,
       * non — les faits perdus ne se retrouvent pas. Une entrée corrompue est
       * donc écartée seule, les autres passent, et l'écart est signalé.
       */
      merge: (persiste, courant) => {
        const { retenues, ecartees } = relireJournal(persiste)

        if (ecartees > 0) {
          console.warn(
            `[${CLE_STOCKAGE}] ${ecartees} entrée(s) illisible(s) écartée(s) ; ` +
              `${retenues.length} conservée(s).`
          )
        }

        return { ...courant, entrees: retenues }
      },

      /** Même raison qu'ailleurs : le serveur et le client doivent rendre le même HTML. */
      skipHydration: true,
    }
  )
)

/**
 * Journalise depuis un contexte qui n'est pas un composant React.
 *
 * Le store des modifications s'en sert : c'est lui qui applique les actions, et
 * c'est donc là — et nulle part ailleurs — qu'elles doivent être enregistrées.
 */
export const journaliser = (trace: Trace): void =>
  useJournalStore.getState().journaliser(trace)
