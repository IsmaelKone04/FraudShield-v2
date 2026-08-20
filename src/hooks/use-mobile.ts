import * as React from "react"

/** En dessous, on tient un téléphone : une colonne, et les tableaux défilent. */
export const SEUIL_MOBILE = 768

/**
 * En dessous, la barre latérale ne peut plus se permettre ses 288 pixels.
 *
 * Une tablette en portrait fait 768 pixels de large : au seuil précédent, elle
 * était traitée comme un écran de bureau et la barre latérale y prélevait
 * 288 pixels en permanence. Il restait 480 pixels pour un tableau de onze
 * colonnes. Le sommaire passe donc en tiroir jusqu'à 1024 pixels, où l'écran
 * peut réellement porter les deux.
 */
export const SEUIL_BARRE_LATERALE = 1024

/**
 * Vrai tant que la fenêtre est plus étroite que `seuil`.
 *
 * `useSyncExternalStore` plutôt qu'un `useState` synchronisé dans un effet :
 * React lit la largeur au moment où il en a besoin, sans le rendu en cascade
 * que provoquait l'ancienne écriture — et que l'analyse statique signalait.
 * Le rendu serveur ne connaît aucune fenêtre : il répond « non », et la
 * première mesure côté navigateur corrige au besoin.
 */
function useEstPlusEtroitQue(seuil: number) {
  const souscrire = React.useCallback(
    (prevenir: () => void) => {
      const mql = window.matchMedia(`(max-width: ${seuil - 1}px)`)
      mql.addEventListener("change", prevenir)
      return () => mql.removeEventListener("change", prevenir)
    },
    [seuil]
  )

  return React.useSyncExternalStore(
    souscrire,
    () => window.innerWidth < seuil,
    () => false
  )
}

/** Écran de téléphone. */
export function useIsMobile() {
  return useEstPlusEtroitQue(SEUIL_MOBILE)
}

/** Écran trop étroit pour porter la barre latérale à côté du contenu. */
export function useBarreLateraleEnTiroir() {
  return useEstPlusEtroitQue(SEUIL_BARRE_LATERALE)
}
