import type { Graphe } from "@/lib/reseaux"
import type { TypeNoeud } from "@/lib/schemas/reseaux.schema"

/**
 * Disposition du graphe : force-dirigée en hauteur, ordonnée en colonnes.
 *
 * **Pourquoi pas `d3-force`.** Ce n'est pas une question de poids (30 ko) mais
 * de nature : `d3-force` est une simulation *animée*, qui mute des objets au fil
 * d'un `requestAnimationFrame`. Elle ne peut donc pas tourner sur le serveur, et
 * le graphe n'apparaîtrait qu'après l'hydratation — un écran vide au premier
 * rendu, sur la page qui doit précisément montrer quelque chose tout de suite.
 *
 * Ici la disposition est une **fonction pure et déterministe** : mêmes nœuds,
 * mêmes positions, sur le serveur comme dans le navigateur. Le SVG part donc
 * complet dans le HTML servi, il n'y a rien à réconcilier à l'hydratation, et
 * l'algorithme se teste sans navigateur.
 *
 * **Pourquoi des colonnes.** La première version laissait les forces décider
 * seules, comme le fait un graphe force-dirigé ordinaire. Le résultat était
 * illisible : sur un réseau de vingt-sept entités de quatre natures différentes,
 * plus rien ne se distinguait, et les libellés se chevauchaient faute de place
 * prévisible. Chaque type est donc rappelé vers sa propre colonne, dans l'ordre
 * où la chaîne se lit — l'assuré déclare, le sinistre est pris en charge par un
 * praticien, l'établissement facture. Les forces ne règlent plus que la
 * hauteur : qui se place à côté de qui.
 *
 * On y perd la liberté d'un vrai nuage ; on y gagne un graphe où l'on sait où
 * regarder, et où le sens de lecture dispense de dessiner des flèches.
 */

export const LARGEUR = 1000
export const HAUTEUR = 640

/** Rayon du disque d'un nœud, selon son type. */
export const RAYONS = {
  assure: 9,
  etablissement: 13,
  praticien: 11,
  sinistre: 8,
} as const

/**
 * Position horizontale de chaque colonne, en fraction de la largeur.
 *
 * L'ordre est celui de la phrase : « un assuré déclare un sinistre, pris en
 * charge par un praticien, facturé par un établissement ».
 */
export const COLONNES: Record<TypeNoeud, number> = {
  assure: 0.11,
  sinistre: 0.37,
  praticien: 0.63,
  etablissement: 0.89,
}

/** Ordre d'affichage des colonnes, pour les en-têtes de l'écran. */
export const ORDRE_COLONNES: TypeNoeud[] = [
  "assure",
  "sinistre",
  "praticien",
  "etablissement",
]

/** Bande réservée aux en-têtes de colonnes, en haut du repère. */
export const BANDEAU = 34

const MARGE_HAUT = BANDEAU + 18
const MARGE_BAS = 22

/** Espace libre exigé entre deux disques. */
const ESPACE = 10

const ITERATIONS = 460

/** Part du chemin parcourue vers sa colonne à chaque pas. */
const FIXATION = 0.14

export type Position = { x: number; y: number }

/**
 * Un aléa reproductible tiré de l'identifiant du nœud.
 *
 * Sans lui, deux nœuds d'une même colonne partiraient exactement au même
 * endroit : les forces sont symétriques et ne les sépareraient jamais. Le tirage
 * vient de la chaîne elle-même plutôt que d'un générateur, de sorte qu'ajouter
 * un nœud ne déplace pas tous les autres.
 */
function grain(texte: string): number {
  let h = 2166136261
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/**
 * Place les nœuds et renvoie leurs coordonnées, indexées par identifiant.
 *
 * Les arêtes rapprochent verticalement les nœuds liés, tous les nœuds se
 * repoussent, chacun est rappelé vers la colonne de son type, et la température
 * décroît jusqu'à figer la disposition.
 */
export function disposer(graphe: Graphe): Map<string, Position> {
  const noeuds = graphe.noeuds
  const positions = new Map<string, Position>()
  if (noeuds.length === 0) return positions

  if (noeuds.length === 1) {
    positions.set(noeuds[0].id, {
      x: LARGEUR * COLONNES[noeuds[0].type],
      y: HAUTEUR / 2,
    })
    return positions
  }

  const xs = new Float64Array(noeuds.length)
  const ys = new Float64Array(noeuds.length)
  const cibles = new Float64Array(noeuds.length)
  const rang = new Map<string, number>()

  // Départ : chacun dans sa colonne, réparti en hauteur.
  const effectifs = new Map<TypeNoeud, number>()
  for (const n of noeuds) effectifs.set(n.type, (effectifs.get(n.type) ?? 0) + 1)
  const compteurs = new Map<TypeNoeud, number>()

  noeuds.forEach((n, i) => {
    rang.set(n.id, i)
    const place = compteurs.get(n.type) ?? 0
    compteurs.set(n.type, place + 1)
    const total = effectifs.get(n.type)!
    cibles[i] = LARGEUR * COLONNES[n.type]
    xs[i] = cibles[i] + (grain(n.id) - 0.5) * 20
    ys[i] =
      MARGE_HAUT +
      (HAUTEUR - MARGE_HAUT - MARGE_BAS) * ((place + 0.5) / total) +
      (grain(n.id + "y") - 0.5) * 16
  })

  const liens = graphe.aretes
    .map((a) => [rang.get(a.source), rang.get(a.cible)] as const)
    .filter(
      (p): p is readonly [number, number] =>
        p[0] !== undefined && p[1] !== undefined
    )

  const k = Math.sqrt((LARGEUR * HAUTEUR) / noeuds.length)
  const dx = new Float64Array(noeuds.length)
  const dy = new Float64Array(noeuds.length)
  let temperature = HAUTEUR / 8

  for (let pas = 0; pas < ITERATIONS; pas += 1) {
    dx.fill(0)
    dy.fill(0)

    // Répulsion : tout le monde s'écarte de tout le monde.
    for (let i = 0; i < noeuds.length; i += 1) {
      for (let j = i + 1; j < noeuds.length; j += 1) {
        let ex = xs[i] - xs[j]
        let ey = ys[i] - ys[j]
        let d = Math.hypot(ex, ey)
        if (d < 0.01) {
          ex = ((i % 7) - 3) / 10 || 0.1
          ey = ((j % 5) - 2) / 10 || 0.1
          d = Math.hypot(ex, ey)
        }
        const force = (k * k) / d
        dx[i] += (ex / d) * force
        dy[i] += (ey / d) * force
        dx[j] -= (ex / d) * force
        dy[j] -= (ey / d) * force
      }
    }

    // Attraction : les nœuds liés se rapprochent.
    for (const [i, j] of liens) {
      const ex = xs[i] - xs[j]
      const ey = ys[i] - ys[j]
      const d = Math.max(Math.hypot(ex, ey), 0.01)
      const force = (d * d) / k
      dx[i] -= (ex / d) * force
      dy[i] -= (ey / d) * force
      dx[j] += (ex / d) * force
      dy[j] += (ey / d) * force
    }

    for (let i = 0; i < noeuds.length; i += 1) {
      const d = Math.max(Math.hypot(dx[i], dy[i]), 0.01)
      const pasMax = Math.min(d, temperature)
      xs[i] += (dx[i] / d) * pasMax
      ys[i] += (dy[i] / d) * pasMax

      // Rappel vers la colonne, appliqué après le déplacement : les forces
      // gardent la main sur la hauteur, la colonne garde la main sur l'abscisse.
      xs[i] += (cibles[i] - xs[i]) * FIXATION
      ys[i] = Math.min(Math.max(ys[i], MARGE_HAUT), HAUTEUR - MARGE_BAS)
    }
    temperature *= 0.987
  }

  desserrer(noeuds, xs, ys, cibles)

  noeuds.forEach((n, i) => {
    positions.set(n.id, { x: arrondir(xs[i]), y: arrondir(ys[i]) })
  })
  return positions
}

/**
 * Écarte les disques qui se recouvrent encore.
 *
 * La disposition force-dirigée ignore la taille de ce qu'elle place : elle
 * raisonne sur des points. Deux entités très liées — le CHU et le radiologue qui
 * y signe six imageries — finissaient à quatorze unités l'une de l'autre, pour
 * des rayons qui en totalisent vingt-quatre : un seul disque là où il y a deux
 * acteurs, exactement à l'endroit le plus intéressant du réseau.
 *
 * L'écartement se fait **en hauteur** : pousser horizontalement délogerait le
 * nœud de sa colonne, et c'est la colonne qui rend le graphe lisible. L'abscisse
 * est donc remise à sa cible à chaque tour.
 */
function desserrer(
  noeuds: Graphe["noeuds"],
  xs: Float64Array,
  ys: Float64Array,
  cibles: Float64Array
): void {
  const rayons = noeuds.map((n) => RAYONS[n.type])
  for (let pas = 0; pas < 240; pas += 1) {
    let deplace = false
    for (let i = 0; i < noeuds.length; i += 1) {
      for (let j = i + 1; j < noeuds.length; j += 1) {
        const minimum = rayons[i] + rayons[j] + ESPACE
        const ecartX = Math.abs(xs[j] - xs[i])
        if (ecartX >= minimum) continue
        let ey = ys[j] - ys[i]
        if (Math.abs(ey) < 0.01) ey = i % 2 === 0 ? 0.1 : -0.1
        // Il faut assez de hauteur pour compenser ce qui manque en largeur.
        const requis = Math.sqrt(
          Math.max(minimum * minimum - ecartX * ecartX, 0)
        )
        if (Math.abs(ey) >= requis) continue
        const pousse = (requis - Math.abs(ey)) / 2
        const sens = ey >= 0 ? 1 : -1
        ys[i] -= sens * pousse
        ys[j] += sens * pousse
        deplace = true
      }
    }
    for (let i = 0; i < noeuds.length; i += 1) {
      ys[i] = Math.min(Math.max(ys[i], MARGE_HAUT), HAUTEUR - MARGE_BAS)
      xs[i] = cibles[i]
    }
    if (!deplace) break
  }
}

/**
 * Deux décimales, et pas davantage.
 *
 * Le SVG part dans le HTML servi : `312.4500000000001` y serait écrit tel quel,
 * et un écart de représentation en virgule flottante entre Node et le navigateur
 * suffirait à provoquer un avertissement d'hydratation sur un attribut.
 */
function arrondir(valeur: number): number {
  return Math.round(valeur * 100) / 100
}
