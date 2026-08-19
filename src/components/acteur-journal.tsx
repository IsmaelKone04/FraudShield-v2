"use client"

import { useEffect } from "react"

import { useJournalStore } from "@/lib/store/journal.store"

/**
 * Nomme le compte à qui seront attribuées les actions de cet écran, et relit le
 * journal enregistré dans le navigateur.
 *
 * Monté par les écrans qui écrivent, et par eux seuls. La solution évidente
 * aurait été de le poser dans le layout racine, comme
 * `<HydratationModifications />` : elle aurait rendu **dynamiques** les huit
 * pages aujourd'hui pré-rendues, puisque lire la session revient à lire les
 * cookies de la requête. Quatre d'entre elles n'écrivent rien et n'ont aucune
 * raison de connaître l'utilisateur ; l'identité n'est donc chargée que là où
 * elle est engagée.
 *
 * Ne rend rien.
 */
export function ActeurJournal({ email }: { email: string | null }) {
  const definirActeur = useJournalStore((etat) => etat.definirActeur)

  useEffect(() => {
    definirActeur(email)
  }, [email, definirActeur])

  useEffect(() => {
    void useJournalStore.persist.rehydrate()
  }, [])

  return null
}
