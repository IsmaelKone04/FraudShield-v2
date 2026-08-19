import { z } from "zod"
import { dateISOSchema } from "./commun"

/**
 * Le réseau de fraude : qui facture quoi, pour qui, et avec qui.
 *
 * Une alerte isolée se conteste ; un schéma organisé se démontre. Le dossier
 * `INV-2026-001` annonce « 8 cas liés » depuis la phase 1 sans jamais montrer
 * lesquels — c'est ce chiffre-là que ce modèle rend vérifiable.
 *
 * **Un seul jeu de nœuds, partagé par tous les dossiers.** Un praticien présent
 * dans trois dossiers signalés y est **un** nœud, pas trois copies. C'est la
 * condition pour que le recoupement entre dossiers existe : dupliquer les
 * entités par dossier rendrait invisible exactement le signal qu'on cherche.
 */

export const TYPES_NOEUD = [
  "assure",
  "etablissement",
  "praticien",
  "sinistre",
] as const
export const typeNoeudSchema = z.enum(TYPES_NOEUD)
export type TypeNoeud = z.infer<typeof typeNoeudSchema>

/**
 * Les champs communs à toute entité du graphe.
 *
 * L'identifiant **est** la référence métier (`SN-ASS-44718`, `ETB-DK-014`) :
 * porter les deux côté à côte reviendrait à entretenir deux copies d'une même
 * information, avec ce que cela finit toujours par produire.
 */
const baseNoeud = {
  id: z.string().min(1),
  libelle: z.string().min(1),
}

export const noeudAssureSchema = z.object({
  ...baseNoeud,
  type: z.literal("assure"),
})

export const noeudEtablissementSchema = z.object({
  ...baseNoeud,
  type: z.literal("etablissement"),
})

export const noeudPraticienSchema = z.object({
  ...baseNoeud,
  type: z.literal("praticien"),
  /** Spécialité déclarée — ce qui rend anormal un radiologue qui opère. */
  specialite: z.string().min(1),
})

/**
 * Une demande de remboursement. Toutes n'ont pas déclenché d'alerte.
 *
 * C'est la réponse à l'écart entre « 8 cas liés » et trois alertes rattachées :
 * un dossier d'instruction couvre des sinistres dont une partie seulement a été
 * signalée par le moteur. Les autres sont venus par le recoupement — et c'est
 * précisément ce qu'un graphe sert à montrer.
 */
export const noeudSinistreSchema = z.object({
  ...baseNoeud,
  type: z.literal("sinistre"),
  montant: z.number().nonnegative(),
  montantFormate: z.string(),
  date: dateISOSchema,
  dateFormate: z.string(),
  /** Identifiant de l'alerte déclenchée, `null` quand le sinistre n'a rien déclenché. */
  alerteId: z.string().nullable(),
})

export const noeudSchema = z.discriminatedUnion("type", [
  noeudAssureSchema,
  noeudEtablissementSchema,
  noeudPraticienSchema,
  noeudSinistreSchema,
])
export type Noeud = z.infer<typeof noeudSchema>
export type NoeudSinistre = z.infer<typeof noeudSinistreSchema>
export type NoeudPraticien = z.infer<typeof noeudPraticienSchema>

/**
 * Les quatre liens possibles, et eux seuls.
 *
 * Chacun n'admet qu'un couple de types (`a_declare` va d'un assuré vers un
 * sinistre, jamais l'inverse) : le service le vérifie. Un graphe où un
 * établissement « déclare » un sinistre serait syntaxiquement valide et
 * dépourvu de sens.
 */
export const TYPES_LIEN = [
  "a_declare",
  "facture_par",
  "soigne_par",
  "exerce_dans",
] as const
export const typeLienSchema = z.enum(TYPES_LIEN)
export type TypeLien = z.infer<typeof typeLienSchema>

export const areteSchema = z.object({
  source: z.string().min(1),
  cible: z.string().min(1),
  type: typeLienSchema,
})
export type Arete = z.infer<typeof areteSchema>

/**
 * Le périmètre d'un dossier d'instruction sur le graphe commun.
 *
 * Il ne porte que des identifiants : le nœud lui-même vit dans le jeu partagé.
 * Les arêtes du réseau s'en déduisent — une arête en fait partie quand ses deux
 * extrémités y sont — plutôt que d'être listées une seconde fois.
 */
export const reseauSchema = z.object({
  id: z.string().min(1),
  /** Dossier d'instruction correspondant, dans `investigations/data.json`. */
  investigationId: z.string().min(1),
  titre: z.string().min(1),
  noeuds: z.array(z.string().min(1)).min(1),
})
export type Reseau = z.infer<typeof reseauSchema>

export const reseauxDataSchema = z.object({
  noeuds: z.array(noeudSchema).min(1),
  aretes: z.array(areteSchema).min(1),
  reseaux: z.array(reseauSchema).min(1),
})
export type ReseauxData = z.infer<typeof reseauxDataSchema>
