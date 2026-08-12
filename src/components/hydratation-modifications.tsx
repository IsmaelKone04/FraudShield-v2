"use client"

import { useEffect } from "react"

import { useModificationsStore } from "@/lib/store/modifications.store"

/**
 * Relit les modifications enregistrées dans le navigateur, après le montage.
 *
 * Le store est volontairement vide au premier rendu (`skipHydration`), pour que
 * le serveur et le client produisent le même HTML. Cette relecture différée est
 * ce qui restitue ensuite les changements de la session précédente.
 *
 * Ne rend rien : monté une fois dans le layout.
 */
export function HydratationModifications() {
  useEffect(() => {
    void useModificationsStore.persist.rehydrate()
  }, [])

  return null
}
