import type {
  Arete,
  Noeud,
  Reseau,
  ReseauxData,
  TypeLien,
  TypeNoeud,
} from "@/lib/schemas/reseaux.schema"

/**
 * Lecture du graphe : extraction d'un périmètre, et ce qu'on en déduit.
 *
 * Tout est calculé, rien n'est stocké — même discipline que `lib/qualite.ts`.
 * Un indicateur de collusion écrit dans le jeu de données serait une affirmation
 * du jeu de données ; calculé depuis les liens, il est vérifiable ligne à ligne.
 */

// ─── Vocabulaire ─────────────────────────────────────────────────────────────

export const NOEUDS: Record<
  TypeNoeud,
  { libelle: string; pluriel: string; couleur: string; teinte: string }
> = {
  assure: {
    libelle: "Assuré",
    pluriel: "Assurés",
    couleur: "#60a5fa",
    teinte: "text-blue-400",
  },
  etablissement: {
    libelle: "Établissement",
    pluriel: "Établissements",
    couleur: "#f59e0b",
    teinte: "text-amber-400",
  },
  praticien: {
    libelle: "Praticien",
    pluriel: "Praticiens",
    couleur: "#a78bfa",
    teinte: "text-violet-400",
  },
  sinistre: {
    libelle: "Sinistre",
    pluriel: "Sinistres",
    couleur: "#34d399",
    teinte: "text-emerald-400",
  },
}

/**
 * Les quatre liens, avec les types qu'ils relient.
 *
 * `de` et `vers` ne sont pas de la documentation : le service s'en sert pour
 * refuser un graphe où un établissement déclarerait un sinistre. Un lien orienté
 * dont personne ne vérifie le sens finit par être posé à l'envers.
 */
export const LIENS: Record<
  TypeLien,
  { libelle: string; de: TypeNoeud; vers: TypeNoeud }
> = {
  a_declare: { libelle: "a déclaré", de: "assure", vers: "sinistre" },
  facture_par: { libelle: "facturé par", de: "sinistre", vers: "etablissement" },
  soigne_par: { libelle: "pris en charge par", de: "sinistre", vers: "praticien" },
  exerce_dans: { libelle: "exerce dans", de: "praticien", vers: "etablissement" },
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/** Un périmètre de dossier, refermé sur lui-même : nœuds et arêtes internes. */
export type Graphe = {
  reseau: Reseau
  noeuds: Noeud[]
  aretes: Arete[]
}

/**
 * Le sous-graphe d'un dossier, `null` si l'identifiant est inconnu.
 *
 * Les arêtes ne sont pas listées par le jeu de données : une arête appartient au
 * périmètre quand ses deux extrémités y sont. Les énumérer une seconde fois par
 * réseau reviendrait à entretenir deux descriptions du même lien.
 */
export function extraireReseau(
  data: ReseauxData,
  reseauId: string
): Graphe | null {
  const reseau = data.reseaux.find((r) => r.id === reseauId)
  if (!reseau) return null

  const dedans = new Set(reseau.noeuds)
  return {
    reseau,
    noeuds: data.noeuds.filter((n) => dedans.has(n.id)),
    aretes: data.aretes.filter((a) => dedans.has(a.source) && dedans.has(a.cible)),
  }
}

/** Les voisins de chaque nœud, sans tenir compte du sens des arêtes. */
export function voisinages(graphe: Graphe): Map<string, Set<string>> {
  const table = new Map<string, Set<string>>()
  const ajouter = (a: string, b: string) => {
    if (!table.has(a)) table.set(a, new Set())
    table.get(a)!.add(b)
  }
  for (const n of graphe.noeuds) table.set(n.id, new Set())
  for (const a of graphe.aretes) {
    ajouter(a.source, a.cible)
    ajouter(a.cible, a.source)
  }
  return table
}

/**
 * Les nœuds atteignables depuis un nœud en `profondeur` liens au plus.
 *
 * C'est ce qui répond à « qu'est-ce que ce praticien touche » sans faire
 * disparaître le reste du graphe : la sélection met en évidence, elle ne filtre
 * pas. Un analyste doit voir ce qu'il écarte.
 */
export function autourDe(
  graphe: Graphe,
  depart: string,
  profondeur = 1
): Set<string> {
  const table = voisinages(graphe)
  const atteints = new Set([depart])
  let frontiere = [depart]
  for (let pas = 0; pas < profondeur; pas += 1) {
    const suivante: string[] = []
    for (const id of frontiere) {
      for (const voisin of table.get(id) ?? []) {
        if (atteints.has(voisin)) continue
        atteints.add(voisin)
        suivante.push(voisin)
      }
    }
    frontiere = suivante
  }
  return atteints
}

/** Les arêtes dont les deux extrémités sont dans l'ensemble mis en évidence. */
export function aretesInternes(aretes: Arete[], ids: Set<string>): Arete[] {
  return aretes.filter((a) => ids.has(a.source) && ids.has(a.cible))
}

// ─── Indicateurs de collusion (P4-12) ────────────────────────────────────────

/**
 * Densité au-delà de laquelle le partage d'entités cesse d'être ordinaire.
 *
 * La densité vaut exactement **1,0** quand rien n'est partagé : chaque sinistre
 * apporte alors quatre nœuds — lui-même, son assuré, son praticien, son
 * établissement — et quatre liens. Toute valeur supérieure mesure donc de la
 * mutualisation, et rien d'autre. À 1,3, un lien sur quatre environ retombe sur
 * une entité déjà vue.
 */
export const DENSITE_ANORMALE = 1.3

export type EntitePartagee = {
  noeud: Noeud
  /** Ce que l'entité relie : établissements, dossiers, sinistres… */
  rattachements: string[]
}

export type Indicateurs = {
  /** Liens rapportés aux entités. 1,0 = aucun partage. */
  densite: number
  densiteAnormale: boolean
  /** Assurés ayant déclaré dans plusieurs établissements. */
  assuresPartages: EntitePartagee[]
  /** Praticiens présents dans plusieurs dossiers d'instruction. */
  praticiensMultiDossiers: EntitePartagee[]
  /** Entités portant le plus de sinistres, l'assuré ou le praticien en tête. */
  concentration: { noeud: Noeud; sinistres: number }[]
}

const parId = (noeuds: Noeud[]) => new Map(noeuds.map((n) => [n.id, n]))

/**
 * Ce que les liens disent du dossier.
 *
 * Les praticiens multi-dossiers exigent le graphe entier : un praticien commun à
 * deux dossiers est invisible depuis chacun d'eux pris isolément. C'est la raison
 * d'être du jeu de nœuds partagé.
 */
export function indicateurs(data: ReseauxData, graphe: Graphe): Indicateurs {
  const index = parId(graphe.noeuds)
  const densite =
    graphe.noeuds.length === 0 ? 0 : graphe.aretes.length / graphe.noeuds.length

  // Assuré → établissements, en passant par ses sinistres.
  const etablissementsDuSinistre = new Map<string, string>()
  for (const a of graphe.aretes)
    if (a.type === "facture_par") etablissementsDuSinistre.set(a.source, a.cible)

  const etablissementsParAssure = new Map<string, Set<string>>()
  const sinistresParEntite = new Map<string, number>()
  for (const a of graphe.aretes) {
    if (a.type === "a_declare") {
      const etb = etablissementsDuSinistre.get(a.cible)
      if (etb) {
        if (!etablissementsParAssure.has(a.source))
          etablissementsParAssure.set(a.source, new Set())
        etablissementsParAssure.get(a.source)!.add(etb)
      }
    }
    if (a.type === "a_declare")
      sinistresParEntite.set(a.source, (sinistresParEntite.get(a.source) ?? 0) + 1)
    if (a.type === "soigne_par")
      sinistresParEntite.set(a.cible, (sinistresParEntite.get(a.cible) ?? 0) + 1)
    if (a.type === "facture_par")
      sinistresParEntite.set(a.cible, (sinistresParEntite.get(a.cible) ?? 0) + 1)
  }

  const libelle = (id: string) => index.get(id)?.libelle ?? id
  const assuresPartages: EntitePartagee[] = []
  for (const [assureId, etablissements] of etablissementsParAssure) {
    if (etablissements.size < 2) continue
    const noeud = index.get(assureId)
    if (!noeud) continue
    assuresPartages.push({
      noeud,
      rattachements: [...etablissements].map(libelle).sort(),
    })
  }
  assuresPartages.sort(
    (a, b) =>
      b.rattachements.length - a.rattachements.length ||
      a.noeud.libelle.localeCompare(b.noeud.libelle)
  )

  // Praticiens : le comptage se fait sur le graphe entier, pas sur le périmètre.
  const praticiensMultiDossiers: EntitePartagee[] = []
  for (const noeud of graphe.noeuds) {
    if (noeud.type !== "praticien") continue
    const dossiers = data.reseaux
      .filter((r) => r.noeuds.includes(noeud.id))
      .map((r) => r.titre)
    if (dossiers.length < 2) continue
    praticiensMultiDossiers.push({ noeud, rattachements: dossiers.sort() })
  }
  praticiensMultiDossiers.sort(
    (a, b) =>
      b.rattachements.length - a.rattachements.length ||
      a.noeud.libelle.localeCompare(b.noeud.libelle)
  )

  const concentration = [...sinistresParEntite]
    .map(([id, sinistres]) => ({ noeud: index.get(id)!, sinistres }))
    .filter((e) => e.noeud && e.sinistres > 1)
    .sort(
      (a, b) =>
        b.sinistres - a.sinistres ||
        a.noeud.libelle.localeCompare(b.noeud.libelle)
    )

  return {
    densite,
    densiteAnormale: densite >= DENSITE_ANORMALE,
    assuresPartages,
    praticiensMultiDossiers,
    concentration,
  }
}

// ─── Rattachements utiles aux écrans ─────────────────────────────────────────

/** Le réseau contenant le sinistre né d'une alerte, `null` s'il n'y en a pas. */
export function reseauDeLAlerte(
  data: ReseauxData,
  alerteId: string
): Reseau | null {
  const sinistre = data.noeuds.find(
    (n) => n.type === "sinistre" && n.alerteId === alerteId
  )
  if (!sinistre) return null
  return data.reseaux.find((r) => r.noeuds.includes(sinistre.id)) ?? null
}

/** Le sinistre né d'une alerte, pour la mettre en évidence à l'ouverture. */
export function sinistreDeLAlerte(
  data: ReseauxData,
  alerteId: string
): string | null {
  const sinistre = data.noeuds.find(
    (n) => n.type === "sinistre" && n.alerteId === alerteId
  )
  return sinistre?.id ?? null
}

/** Compte des nœuds par type, pour la légende et l'en-tête du réseau. */
export function repartition(graphe: Graphe): Record<TypeNoeud, number> {
  const compte: Record<TypeNoeud, number> = {
    assure: 0,
    etablissement: 0,
    praticien: 0,
    sinistre: 0,
  }
  for (const n of graphe.noeuds) compte[n.type] += 1
  return compte
}

/** Montant total des sinistres du périmètre. */
export function montantDuReseau(graphe: Graphe): number {
  return graphe.noeuds.reduce(
    (somme, n) => (n.type === "sinistre" ? somme + n.montant : somme),
    0
  )
}

/** Les sinistres du périmètre ayant déclenché une alerte. */
export function sinistresSignales(graphe: Graphe): string[] {
  return graphe.noeuds
    .filter((n) => n.type === "sinistre" && n.alerteId !== null)
    .map((n) => (n.type === "sinistre" ? n.alerteId! : ""))
    .sort()
}
