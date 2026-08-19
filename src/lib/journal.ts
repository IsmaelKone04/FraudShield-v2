import {
  entreeJournalSchema,
  type ActionJournal,
  type EntreeJournal,
} from "@/lib/schemas/journal.schema"

/**
 * Lecture du journal d'audit : libellés, tri, filtres, synthèse.
 *
 * Fonctions pures, hors du store et hors de l'écran, pour la raison qui vaut
 * depuis `lib/qualite.ts` : ce sont elles qu'un contrôleur conteste, et on ne
 * conteste bien que ce qui se vérifie sans navigateur.
 */

/** Ce qu'on écrit dans le journal quand la session ne nomme personne. */
export const ACTEUR_INCONNU = "compte non identifié"

/**
 * Au-delà, les entrées les plus anciennes sortent du journal.
 *
 * Le journal vit dans le `localStorage`, dont la capacité est de quelques
 * mégaoctets partagés avec les modifications. Un journal sans borne finirait par
 * faire échouer l'écriture — c'est-à-dire par faire perdre la modification
 * elle-même, pas seulement sa trace. La borne est donc assumée, et l'écran le
 * dit dès qu'elle est atteinte : un journal qui déborde en silence est pire
 * qu'un journal qui annonce son débordement.
 */
export const MAX_ENTREES = 500

type ConfigAction = {
  libelle: string
  /** Ce sur quoi l'action porte, pour regrouper les entrées à l'écran. */
  portee: "Alerte" | "Investigation" | "Paramètres" | "Console"
  /**
   * L'action fait disparaître quelque chose de la console.
   *
   * Ces entrées-là sont la raison d'être du journal : elles sont les seules
   * dont l'effet ne se lit plus nulle part ailleurs. Une décision annulée ne
   * laisse aucune trace dans le dossier, une note supprimée non plus.
   */
  effacement: boolean
}

export const ACTIONS: Record<ActionJournal, ConfigAction> = {
  statut_alerte: {
    libelle: "Changement de statut",
    portee: "Alerte",
    effacement: false,
  },
  assignation_alerte: {
    libelle: "Assignation",
    portee: "Alerte",
    effacement: false,
  },
  decision: {
    libelle: "Décision",
    portee: "Alerte",
    effacement: false,
  },
  annulation_decision: {
    libelle: "Retour sur décision",
    portee: "Alerte",
    effacement: true,
  },
  note_ajoutee: {
    libelle: "Note ajoutée",
    portee: "Alerte",
    effacement: false,
  },
  note_supprimee: {
    libelle: "Note supprimée",
    portee: "Alerte",
    effacement: true,
  },
  statut_investigation: {
    libelle: "Changement de statut",
    portee: "Investigation",
    effacement: false,
  },
  assignation_investigation: {
    libelle: "Assignation",
    portee: "Investigation",
    effacement: false,
  },
  parametre_modifie: {
    libelle: "Réglage modifié",
    portee: "Paramètres",
    effacement: false,
  },
  parametres_reinitialises: {
    libelle: "Réglages remis aux valeurs d'origine",
    portee: "Paramètres",
    effacement: true,
  },
  modifications_reinitialisees: {
    libelle: "Modifications de la console effacées",
    portee: "Console",
    effacement: true,
  },
}

/** Ordre d'apparition dans le filtre : par portée, puis tel que déclaré. */
export const ORDRE_ACTIONS = Object.keys(ACTIONS) as ActionJournal[]

export function libelleAction(action: ActionJournal): string {
  return ACTIONS[action].libelle
}

/**
 * Ajoute une entrée et rend le journal borné.
 *
 * Pure et exportée : c'est la seule opération d'écriture du journal, et la
 * seule qui puisse en faire sortir quelque chose. Elle est donc testée comme
 * telle, au même titre que la migration du store (ADR-019).
 */
export function ajouterAuJournal(
  entrees: readonly EntreeJournal[],
  entree: EntreeJournal,
  max: number = MAX_ENTREES
): EntreeJournal[] {
  const complet = [...entrees, entree]
  // `slice` par la fin : ce sont les plus anciennes qui sortent.
  return complet.length > max ? complet.slice(complet.length - max) : complet
}

/** Le journal du plus récent au plus ancien — l'ordre dans lequel on le lit. */
export function journalOrdonne(
  entrees: readonly EntreeJournal[]
): EntreeJournal[] {
  return [...entrees].sort((a, b) => b.horodatage.localeCompare(a.horodatage))
}

export type FiltresJournal = {
  acteur?: string | null
  action?: ActionJournal | null
  /** Recherche libre sur la cible, l'acteur, l'avant, l'après et le motif. */
  texte?: string
}

export function filtrerJournal(
  entrees: readonly EntreeJournal[],
  { acteur = null, action = null, texte = "" }: FiltresJournal
): EntreeJournal[] {
  const recherche = texte.trim().toLowerCase()

  return entrees.filter((entree) => {
    if (acteur !== null && entree.acteur !== acteur) return false
    if (action !== null && entree.action !== action) return false
    if (recherche === "") return true

    return [
      entree.cible,
      entree.acteur,
      entree.avant,
      entree.apres,
      entree.motif,
      libelleAction(entree.action),
    ].some((champ) => champ !== null && champ.toLowerCase().includes(recherche))
  })
}

/** Les comptes qui apparaissent dans le journal, par ordre alphabétique. */
export function acteursDuJournal(
  entrees: readonly EntreeJournal[]
): string[] {
  return [...new Set(entrees.map((entree) => entree.acteur))].sort((a, b) =>
    a.localeCompare(b)
  )
}

export type SyntheseJournal = {
  total: number
  /** Nombre d'actions ayant fait disparaître quelque chose. */
  effacements: number
  acteurs: number
  /** Horodatage de la plus ancienne entrée conservée, `null` si le journal est vide. */
  premiere: string | null
  derniere: string | null
  /** Le journal a atteint sa borne : des entrées anciennes en sont sorties. */
  sature: boolean
}

export function resumerJournal(
  entrees: readonly EntreeJournal[],
  max: number = MAX_ENTREES
): SyntheseJournal {
  const horodatages = entrees.map((entree) => entree.horodatage).sort()

  return {
    total: entrees.length,
    effacements: entrees.filter((entree) => ACTIONS[entree.action].effacement)
      .length,
    acteurs: acteursDuJournal(entrees).length,
    premiere: horodatages[0] ?? null,
    derniere: horodatages[horodatages.length - 1] ?? null,
    sature: entrees.length >= max,
  }
}

/**
 * Ce qu'on retient du contenu relu dans le navigateur, entrée par entrée.
 *
 * Le store des modifications repart de zéro quand son contenu est illisible :
 * perdre un statut est réparable, il suffit de le reposer. Un journal, non —
 * les faits perdus ne se retrouvent pas. Une entrée corrompue est donc écartée
 * seule, et les autres passent.
 *
 * Pure et exportée pour la même raison que la migration de D2 (ADR-019) : c'est
 * le seul endroit du projet qui puisse faire disparaître une entrée d'audit, et
 * ce qui peut détruire se teste.
 */
export function relireJournal(contenu: unknown): {
  retenues: EntreeJournal[]
  ecartees: number
} {
  const brut = (contenu as { entrees?: unknown } | null)?.entrees
  if (!Array.isArray(brut)) return { retenues: [], ecartees: 0 }

  const retenues: EntreeJournal[] = []
  let ecartees = 0
  for (const candidate of brut) {
    const resultat = entreeJournalSchema.safeParse(candidate)
    if (resultat.success) retenues.push(resultat.data)
    else ecartees += 1
  }

  // La borne s'applique aussi à la relecture : un contenu gonflé à la main ne
  // doit pas faire rentrer par la fenêtre ce que l'écriture refuse.
  return { retenues: retenues.slice(-MAX_ENTREES), ecartees }
}
