import type { Stat } from "@/lib/schemas/commun"

/**
 * Report des changements de statut sur les cartes de statistiques.
 *
 * Ces cartes décrivent une population bien plus large que la liste affichée —
 * 1 245 alertes sur cinquante jours, dont dix à l'écran ; 24 dossiers ouverts
 * depuis janvier, dont six. Les recompter à partir des lignes visibles ferait
 * donc tomber le total de 1 245 à 10. On applique un **écart** : une alerte
 * passée de « En cours » à « Résolu » retire une unité à la première carte et en
 * ajoute une à la seconde. Le total, lui, ne bouge pas.
 */

/** Ce qu'il faut savoir d'une collection pour reporter ses changements. */
export type ConfigCartes<S extends string> = {
  /** Carte de statistique ↔ statut qu'elle dénombre. */
  statutParCarte: Record<string, S>
  /**
   * Carte portant un taux exprimé en pourcentage du total. Le laisser figé
   * pendant que son numérateur bouge produirait un chiffre faux à l'écran.
   */
  carteTaux?: { id: string; libelle: string }
}

/** Alertes : trois statuts, et un taux de résolution sur la dernière carte. */
export const CARTES_ALERTES: ConfigCartes<
  "En cours" | "À vérifier" | "Résolu"
> = {
  statutParCarte: {
    en_cours: "En cours",
    verifier: "À vérifier",
    resolues: "Résolu",
  },
  carteTaux: { id: "resolues", libelle: "Taux résolution" },
}

/** Dossiers : mêmes cartes, mais on clôture là où l'on résout. */
export const CARTES_INVESTIGATIONS: ConfigCartes<
  "En cours" | "À vérifier" | "Clôturée"
> = {
  statutParCarte: {
    en_cours: "En cours",
    verifier: "À vérifier",
    resolues: "Clôturée",
  },
  carteTaux: { id: "resolues", libelle: "Taux clôture" },
}

export function appliquerEcartStatuts<S extends string>(
  stats: Stat[],
  origine: readonly { id: string; statut: S }[],
  aJour: readonly { id: string; statut: S }[],
  { statutParCarte, carteTaux }: ConfigCartes<S>
): Stat[] {
  const statutOrigine = new Map(origine.map((l) => [l.id, l.statut]))
  const ecart = new Map<S, number>()

  for (const ligne of aJour) {
    const avant = statutOrigine.get(ligne.id)
    if (avant === undefined || avant === ligne.statut) continue
    ecart.set(avant, (ecart.get(avant) ?? 0) - 1)
    ecart.set(ligne.statut, (ecart.get(ligne.statut) ?? 0) + 1)
  }

  // Aucun changement : on rend les cartes telles quelles, à l'octet près. C'est
  // ce qui garantit que le premier rendu client est identique à celui du serveur.
  if (ecart.size === 0) return stats

  const total = stats.find((s) => s.id === "total")?.value

  return stats.map((stat) => {
    const statut = statutParCarte[stat.id]
    const delta = statut ? (ecart.get(statut) ?? 0) : 0
    if (delta === 0) return stat

    const value = stat.value + delta
    return {
      ...stat,
      value,
      valueFormate: value.toLocaleString("fr-FR"),
      description:
        carteTaux && stat.id === carteTaux.id && total
          ? `${carteTaux.libelle} : ${Math.round((value / total) * 100)}%`
          : stat.description,
    }
  })
}
