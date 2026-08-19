import type { Graphe } from "@/lib/reseaux"

/**
 * Disposition force-dirigée du graphe — Fruchterman-Reingold, écrit ici.
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
 * l'algorithme se teste sans navigateur — ce qui a été fait.
 *
 * La contrepartie est assumée : pas de nœud qu'on attrape à la souris pour le
 * déplacer. Le zoom et la mise en évidence couvrent le besoin d'exploration ;
 * réarranger le graphe à la main n'apprend rien sur la fraude.
 */


/** Espace libre exigé entre deux disques, en unités du repère. */
const ESPACE = 8

export const LARGEUR = 960
export const HAUTEUR = 620

/** Marge intérieure, en unités du repère, pour que les libellés respirent. */
const MARGE = 56

const ITERATIONS = 420

export type Position = { x: number; y: number }

/**
 * Un aléa reproductible tiré de l'identifiant du nœud.
 *
 * Sans lui, deux nœuds posés au même angle resteraient superposés : les forces
 * sont symétriques et ne les sépareraient jamais. Le tirage vient de la chaîne
 * elle-même plutôt que d'un générateur, de sorte qu'ajouter un nœud ne déplace
 * pas tous les autres.
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
 * Place les nœuds du graphe et renvoie leurs coordonnées, indexées par
 * identifiant.
 *
 * Les arêtes tirent les nœuds liés l'un vers l'autre, tous les nœuds se
 * repoussent, et la température décroît jusqu'à figer la disposition. Le résultat
 * est ensuite recadré sur la zone de dessin : c'est ce recadrage qui rend un
 * réseau de 9 nœuds aussi lisible qu'un réseau de 27.
 */
export function disposer(graphe: Graphe): Map<string, Position> {
  const noeuds = graphe.noeuds
  const positions = new Map<string, Position>()
  if (noeuds.length === 0) return positions

  if (noeuds.length === 1) {
    positions.set(noeuds[0].id, { x: LARGEUR / 2, y: HAUTEUR / 2 })
    return positions
  }

  // Départ sur un cercle, dans l'ordre du jeu de données : les nœuds sont triés
  // par type, donc les entités de même nature partent voisines.
  const rayon = Math.min(LARGEUR, HAUTEUR) / 2.6
  const xs = new Float64Array(noeuds.length)
  const ys = new Float64Array(noeuds.length)
  const rang = new Map<string, number>()
  noeuds.forEach((n, i) => {
    rang.set(n.id, i)
    const angle = (2 * Math.PI * i) / noeuds.length + grain(n.id) * 0.4
    const r = rayon * (0.75 + grain(n.id + "r") * 0.5)
    xs[i] = LARGEUR / 2 + r * Math.cos(angle)
    ys[i] = HAUTEUR / 2 + r * Math.sin(angle)
  })

  const liens = graphe.aretes
    .map((a) => [rang.get(a.source), rang.get(a.cible)] as const)
    .filter((p): p is readonly [number, number] =>
      p[0] !== undefined && p[1] !== undefined
    )

  // Distance de repos : la surface disponible répartie entre les nœuds.
  const k = Math.sqrt((LARGEUR * HAUTEUR) / noeuds.length)
  const dx = new Float64Array(noeuds.length)
  const dy = new Float64Array(noeuds.length)
  let temperature = LARGEUR / 8

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
          // Deux nœuds exactement confondus : les séparer dans une direction
          // tirée de leur rang, donc toujours la même.
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

    // Déplacement, borné par la température qui décroît.
    for (let i = 0; i < noeuds.length; i += 1) {
      const d = Math.max(Math.hypot(dx[i], dy[i]), 0.01)
      const pasMax = Math.min(d, temperature)
      xs[i] += (dx[i] / d) * pasMax
      ys[i] += (dy[i] / d) * pasMax
    }
    temperature *= 0.985
  }

  recadrer(xs, ys)
  desserrer(noeuds, xs, ys)

  noeuds.forEach((n, i) => {
    positions.set(n.id, { x: arrondir(xs[i]), y: arrondir(ys[i]) })
  })
  return positions
}

/**
 * Ramène la disposition dans la zone de dessin, en conservant les proportions.
 *
 * Étirer chaque axe séparément remplirait mieux le cadre, mais déformerait les
 * angles : deux liens de même longueur n'apparaîtraient plus égaux, et la
 * lecture visuelle des distances — tout l'intérêt d'un graphe — deviendrait
 * fausse.
 */
function recadrer(xs: Float64Array, ys: Float64Array): void {
  let xMin = Infinity
  let xMax = -Infinity
  let yMin = Infinity
  let yMax = -Infinity
  for (let i = 0; i < xs.length; i += 1) {
    xMin = Math.min(xMin, xs[i])
    xMax = Math.max(xMax, xs[i])
    yMin = Math.min(yMin, ys[i])
    yMax = Math.max(yMax, ys[i])
  }

  const etendueX = Math.max(xMax - xMin, 1)
  const etendueY = Math.max(yMax - yMin, 1)
  const echelle = Math.min(
    (LARGEUR - 2 * MARGE) / etendueX,
    (HAUTEUR - 2 * MARGE) / etendueY
  )
  const decalageX = (LARGEUR - etendueX * echelle) / 2
  const decalageY = (HAUTEUR - etendueY * echelle) / 2

  for (let i = 0; i < xs.length; i += 1) {
    xs[i] = (xs[i] - xMin) * echelle + decalageX
    ys[i] = (ys[i] - yMin) * echelle + decalageY
  }
}

/**
 * Écarte les disques qui se recouvrent encore.
 *
 * La disposition force-dirigée ignore la taille de ce qu'elle place : elle
 * raisonne sur des points. Deux entités très liées — le CHU et le radiologue qui
 * y signe six imageries — finissent donc à quatorze unités l'une de l'autre,
 * pour des rayons qui en totalisent vingt-quatre. Le graphe donnait alors un
 * seul disque là où il y a deux acteurs, exactement à l'endroit le plus
 * intéressant du réseau.
 *
 * Ce désserrage se fait **après** le recadrage, une fois les distances exprimées
 * dans les unités où les rayons ont un sens.
 */
function desserrer(
  noeuds: Graphe["noeuds"],
  xs: Float64Array,
  ys: Float64Array
): void {
  const rayons = noeuds.map((n) => RAYONS[n.type])
  for (let pas = 0; pas < 120; pas += 1) {
    let deplace = false
    for (let i = 0; i < noeuds.length; i += 1) {
      for (let j = i + 1; j < noeuds.length; j += 1) {
        const minimum = rayons[i] + rayons[j] + ESPACE
        let ex = xs[j] - xs[i]
        let ey = ys[j] - ys[i]
        let d = Math.hypot(ex, ey)
        if (d >= minimum) continue
        if (d < 0.01) {
          ex = ((i % 5) - 2) / 10 || 0.1
          ey = ((j % 3) - 1) / 10 || 0.1
          d = Math.hypot(ex, ey)
        }
        const pousse = (minimum - d) / 2
        xs[i] -= (ex / d) * pousse
        ys[i] -= (ey / d) * pousse
        xs[j] += (ex / d) * pousse
        ys[j] += (ey / d) * pousse
        deplace = true
      }
    }
    if (!deplace) break
  }

  // Le desserrage peut pousser un nœud hors du cadre ; la marge le rattrape.
  const bord = ESPACE
  for (let i = 0; i < noeuds.length; i += 1) {
    xs[i] = Math.min(Math.max(xs[i], bord + rayons[i]), LARGEUR - bord - rayons[i])
    ys[i] = Math.min(Math.max(ys[i], bord + rayons[i]), HAUTEUR - bord - rayons[i])
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

/** Rayon du disque d'un nœud, selon son type. */
export const RAYONS = {
  assure: 9,
  etablissement: 13,
  praticien: 11,
  sinistre: 7,
} as const
