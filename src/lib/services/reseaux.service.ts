import { ApiError, chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import { LIENS, extraireReseau, indicateurs, type Graphe } from "@/lib/reseaux"
import { francs } from "@/lib/formats"
import {
  reseauxDataSchema,
  type Noeud,
  type ReseauxData,
} from "@/lib/schemas/reseaux.schema"
import type { Investigation } from "@/lib/schemas/investigations.schema"
import type { Alerte } from "@/lib/schemas/alertes.schema"
import { alertesService } from "./alertes.service"
import { investigationsService } from "./investigations.service"

const ORIGINE = "reseaux/data.json"

const chargerJeuLocal = (): Promise<ReseauxData> =>
  chargerMock(() => import("@/app/reseaux/data.json"), reseauxDataSchema, ORIGINE)

/** Ce qu'une carte de la liste des réseaux a besoin de savoir. */
export type ResumeReseau = {
  id: string
  investigationId: string
  titre: string
  priorite: Investigation["priorite"]
  statut: Investigation["statut"]
  entites: number
  sinistres: number
  /** Sinistres ayant déclenché une alerte — le reste vient du recoupement. */
  signales: number
  montant: number
  montantFormate: string
  densite: number
  densiteAnormale: boolean
}

/**
 * Les totaux du graphe entier.
 *
 * Ils ne s'obtiennent **pas** en additionnant les résumés : un sinistre suivi
 * par deux dossiers y serait compté deux fois, et le total dépasserait le nombre
 * de sinistres réellement au graphe. Or le partage d'entités entre dossiers est
 * exactement le phénomène que cet écran met en avant — le compter deux fois
 * serait se tromper à l'endroit où l'on prétend voir juste.
 */
export type SyntheseReseaux = {
  reseaux: number
  sinistres: number
  signales: number
  entites: number
  montant: number
  denses: number
}

export type DetailReseau = {
  graphe: Graphe
  investigation: Investigation
  indicateurs: ReturnType<typeof indicateurs>
  /** Les alertes du périmètre, pour renvoyer vers leurs dossiers. */
  alertes: Alerte[]
}

/**
 * Le graphe de fraude, et les contrôles qui le rendent opposable.
 *
 * Un graphe faux se voit encore moins qu'un tableau faux : il *ressemble* à
 * quelque chose quoi qu'on y mette. Les contrôles ci-dessous portent donc sur ce
 * qu'aucun schéma ne peut dire — qu'une arête relie des types compatibles, et
 * surtout que le périmètre d'un dossier tient la promesse affichée sur sa fiche.
 */
export const reseauxService = {
  async getResumes(): Promise<ResumeReseau[]> {
    const { data, investigations } = await charger()
    return data.reseaux
      .map((r) => {
        const graphe = extraireReseau(data, r.id)!
        const investigation = investigations.find(
          (i) => i.id === r.investigationId
        )!
        const sinistres = graphe.noeuds.filter((n) => n.type === "sinistre")
        const montant = sinistres.reduce(
          (somme, n) => somme + (n.type === "sinistre" ? n.montant : 0),
          0
        )
        const densite = graphe.aretes.length / graphe.noeuds.length
        return {
          id: r.id,
          investigationId: r.investigationId,
          titre: r.titre,
          priorite: investigation.priorite,
          statut: investigation.statut,
          entites: graphe.noeuds.length - sinistres.length,
          sinistres: sinistres.length,
          signales: sinistres.filter(
            (n) => n.type === "sinistre" && n.alerteId !== null
          ).length,
          montant,
          montantFormate: francs(montant),
          densite,
          densiteAnormale: densite >= 1.3,
        }
      })
      .sort((a, b) => b.sinistres - a.sinistres || a.id.localeCompare(b.id))
  },

  async getSynthese(): Promise<SyntheseReseaux> {
    const { data } = await charger()
    const resumes = await this.getResumes()

    // Seuls comptent les nœuds effectivement rattachés à un réseau.
    const rattaches = new Set(data.reseaux.flatMap((r) => r.noeuds))
    const noeuds = data.noeuds.filter((n) => rattaches.has(n.id))
    const sinistres = noeuds.filter((n) => n.type === "sinistre")

    return {
      reseaux: data.reseaux.length,
      sinistres: sinistres.length,
      signales: sinistres.filter(
        (n) => n.type === "sinistre" && n.alerteId !== null
      ).length,
      entites: noeuds.length - sinistres.length,
      montant: sinistres.reduce(
        (somme, n) => somme + (n.type === "sinistre" ? n.montant : 0),
        0
      ),
      denses: resumes.filter((r) => r.densiteAnormale).length,
    }
  },

  async getReseau(id: string): Promise<DetailReseau | null> {
    const { data, investigations, alertes } = await charger()
    const graphe = extraireReseau(data, id)
    if (!graphe) return null

    const investigation = investigations.find(
      (i) => i.id === graphe.reseau.investigationId
    )!
    const identifiants = new Set(
      graphe.noeuds
        .filter((n) => n.type === "sinistre" && n.alerteId !== null)
        .map((n) => (n.type === "sinistre" ? n.alerteId! : ""))
    )

    return {
      graphe,
      investigation,
      indicateurs: indicateurs(data, graphe),
      alertes: alertes.filter((a) => identifiants.has(a.id)),
    }
  },

  /**
   * Le réseau où figure une alerte, `null` quand elle n'appartient à aucun.
   *
   * Toutes les alertes n'ont pas de réseau : une alerte isolée, résolue et à
   * score faible n'a pas de schéma organisé derrière elle. Le lien « voir le
   * réseau » ne s'affiche donc pas partout, plutôt que de mener à un écran vide.
   */
  async getReseauDeLAlerte(
    alerteId: string
  ): Promise<{ reseauId: string; sinistreId: string; titre: string } | null> {
    const { data } = await charger()
    const sinistre = data.noeuds.find(
      (n) => n.type === "sinistre" && n.alerteId === alerteId
    )
    if (!sinistre) return null
    const reseau = data.reseaux.find((r) => r.noeuds.includes(sinistre.id))
    if (!reseau) return null
    return { reseauId: reseau.id, sinistreId: sinistre.id, titre: reseau.titre }
  },
}

/**
 * Charge le graphe et ce à quoi il se rapporte, puis le vérifie.
 *
 * Les trois jeux sont demandés ensemble parce que les contrôles les plus utiles
 * sont ceux qui les confrontent : un graphe cohérent avec lui-même mais en
 * désaccord avec la fiche du dossier est le pire des deux cas — il inspire
 * confiance en se trompant.
 */
async function charger(): Promise<{
  data: ReseauxData
  investigations: Investigation[]
  alertes: Alerte[]
}> {
  const [data, investigations, alertes] = await Promise.all([
    USE_MOCK
      ? chargerJeuLocal()
      : fetchFromAPI("/reseaux", reseauxDataSchema),
    investigationsService.getInvestigations(),
    alertesService.getAlertes(),
  ])

  verifierGraphe(data)
  verifierPerimetres(data, investigations, alertes)
  return { data, investigations, alertes }
}

const echouer = (message: string): never => {
  throw new ApiError(`${message} — ${ORIGINE}`, ORIGINE)
}

/**
 * Ce que le schéma ne peut pas dire sur la forme du graphe.
 *
 * Zod valide chaque nœud et chaque arête isolément ; il ne sait pas qu'une arête
 * pointe vers un nœud absent, ni qu'elle relie deux types que le lien n'admet
 * pas. Sans ce contrôle, l'écran afficherait un lien partant de nulle part.
 */
function verifierGraphe(data: ReseauxData): void {
  const index = new Map<string, Noeud>()
  for (const n of data.noeuds) {
    if (index.has(n.id))
      echouer(`Le nœud ${n.id} est défini deux fois`)
    index.set(n.id, n)
  }

  const vues = new Set<string>()
  for (const a of data.aretes) {
    const source = index.get(a.source)
    const cible = index.get(a.cible)
    if (!source) echouer(`L'arête « ${a.type} » part de ${a.source}, qui n'existe pas`)
    if (!cible) echouer(`L'arête « ${a.type} » mène à ${a.cible}, qui n'existe pas`)

    const attendu = LIENS[a.type]
    if (source!.type !== attendu.de || cible!.type !== attendu.vers)
      echouer(
        `L'arête « ${a.type} » relie un ${source!.type} à un ${cible!.type} ` +
          `alors qu'elle va d'un ${attendu.de} vers un ${attendu.vers} ` +
          `(${a.source} → ${a.cible})`
      )

    const empreinte = `${a.source}|${a.cible}|${a.type}`
    if (vues.has(empreinte)) echouer(`L'arête ${empreinte} est présente deux fois`)
    vues.add(empreinte)
  }

  for (const r of data.reseaux)
    for (const id of r.noeuds)
      if (!index.has(id))
        echouer(`Le réseau ${r.id} référence le nœud ${id}, qui n'existe pas`)
}

/**
 * Ce que le périmètre d'un dossier promet, et qu'il doit tenir.
 *
 * `casLies` s'affiche sur la fiche d'instruction depuis la phase 1 — huit cas
 * pour `INV-2026-001` — sans que rien ne les montre ni ne les compte. Le contrôle
 * en fait une propriété vérifiée : le réseau du dossier porte exactement autant
 * de sinistres que la fiche en annonce, sinon le service refuse de servir.
 *
 * Il ne tourne qu'en mode démonstration, parce qu'il n'a de sens que là où les
 * trois jeux viennent du même dépôt. Face à une API, la cohérence entre
 * ressources relève du service de détection, pas de la console.
 */
function verifierPerimetres(
  data: ReseauxData,
  investigations: Investigation[],
  alertes: Alerte[]
): void {
  if (!USE_MOCK) return

  const index = new Map(data.noeuds.map((n) => [n.id, n]))
  const parAlerte = new Map(alertes.map((a) => [a.id, a]))

  for (const r of data.reseaux) {
    const investigation = investigations.find((i) => i.id === r.investigationId)
    if (!investigation)
      echouer(
        `Le réseau ${r.id} se rapporte au dossier ${r.investigationId}, inconnu ` +
          `des investigations`
      )

    const noeuds = r.noeuds.map((id) => index.get(id)!)
    const sinistres = noeuds.filter((n) => n.type === "sinistre")

    if (sinistres.length !== investigation!.casLies)
      echouer(
        `Le réseau ${r.id} porte ${sinistres.length} sinistres alors que ` +
          `${investigation!.id} en annonce ${investigation!.casLies} (« casLies »)`
      )

    // Toute alerte rattachée au dossier doit être portée par un sinistre du
    // périmètre : sinon la fiche et le graphe désignent des cas différents.
    const alertesDuReseau = new Set(
      sinistres.map((n) => (n.type === "sinistre" ? n.alerteId : null))
    )
    for (const alerteId of investigation!.alertesLiees)
      if (!alertesDuReseau.has(alerteId))
        echouer(
          `Le dossier ${investigation!.id} rattache l'alerte ${alerteId}, ` +
            `absente du réseau ${r.id}`
        )

    // Un établissement nommé sur la fiche doit exister dans le périmètre. Le
    // graphe peut en montrer davantage — c'est même son intérêt — mais pas moins.
    const etablissements = new Set(
      noeuds.filter((n) => n.type === "etablissement").map((n) => n.libelle)
    )
    for (const nom of investigation!.etablissements)
      if (!etablissements.has(nom))
        echouer(
          `Le dossier ${investigation!.id} nomme l'établissement « ${nom} », ` +
            `absent du réseau ${r.id}`
        )
  }

  verifierSinistresSignales(data, parAlerte)
}

/**
 * Un sinistre qui porte un identifiant d'alerte doit décrire la même chose
 * qu'elle.
 *
 * C'est le contrôle qui interdit au graphe de devenir un univers parallèle :
 * même montant, même établissement, même praticien que le dossier d'alerte. Sans
 * lui, un analyste lirait « 2 400 000 FCFA » sur l'alerte et « 990 000 FCFA » sur
 * le nœud, sans qu'aucun écran ne signale la contradiction.
 */
function verifierSinistresSignales(
  data: ReseauxData,
  parAlerte: Map<string, Alerte>
): void {
  const index = new Map(data.noeuds.map((n) => [n.id, n]))
  const etablissementDuSinistre = new Map<string, string>()
  for (const a of data.aretes)
    if (a.type === "facture_par")
      etablissementDuSinistre.set(a.source, index.get(a.cible)!.libelle)

  for (const n of data.noeuds) {
    if (n.type !== "sinistre" || n.alerteId === null) continue
    const alerte = parAlerte.get(n.alerteId)
    if (!alerte)
      echouer(
        `Le sinistre ${n.id} se rattache à l'alerte ${n.alerteId}, inconnue du ` +
          `jeu d'alertes`
      )
    if (alerte!.montant !== n.montant)
      echouer(
        `Le sinistre ${n.id} porte ${n.montant} alors que l'alerte ` +
          `${n.alerteId} porte ${alerte!.montant}`
      )
    const etablissement = etablissementDuSinistre.get(n.id)
    if (etablissement !== alerte!.etablissement)
      echouer(
        `Le sinistre ${n.id} est facturé par « ${etablissement} » alors que ` +
          `l'alerte ${n.alerteId} vise « ${alerte!.etablissement} »`
      )
  }
}
