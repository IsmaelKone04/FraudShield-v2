import type { StatutAlerte } from "@/lib/schemas/commun"
import type { TypeDecision } from "@/lib/schemas/modifications.schema"

/**
 * Ce qu'une décision d'analyste veut dire, et ce qu'elle entraîne.
 *
 * Une seule table pour les trois usages : le libellé du bouton, la phrase
 * affichée une fois la décision prise, et le statut qui en découle. Les
 * séparer reviendrait à écrire trois fois la même règle métier — et à la voir
 * diverger le jour où une quatrième issue apparaîtra.
 *
 * Le statut n'est pas un choix libre après décision : confirmer une fraude ou
 * classer sans suite referment le dossier, demander une pièce le met en
 * attente. Laisser l'analyste décider *et* choisir le statut permettrait
 * d'enregistrer « fraude confirmée » sur un dossier resté « en cours ».
 */
export type ConfigDecision = {
  /** Libellé du bouton, à l'infinitif — c'est une action. */
  libelle: string
  /** Ce que la décision affirme, une fois prise. */
  resume: string
  /** Ce à quoi l'analyste s'engage, affiché sous le bouton. */
  aide: string
  /** Statut du dossier après la décision. */
  statut: StatutAlerte
  /** Invite du champ de motif — un motif générique ne sert personne. */
  invite: string
  classes: string
}

export const DECISIONS: Record<TypeDecision, ConfigDecision> = {
  fraude_confirmee: {
    libelle: "Confirmer la fraude",
    resume: "Fraude confirmée",
    aide: "Referme le dossier et le rend opposable à l'établissement.",
    statut: "Résolu",
    invite:
      "Sur quels éléments la fraude est-elle établie ? Ce motif est ce que lira l'établissement mis en cause.",
    classes: "border-red-500/30 text-red-400 hover:bg-red-500/10",
  },
  classee_sans_suite: {
    libelle: "Classer sans suite",
    resume: "Classée sans suite",
    aide: "Referme le dossier. C'est ce que la phase 4 comptera en faux positif.",
    statut: "Résolu",
    invite:
      "Pourquoi l'alerte ne tient-elle pas ? C'est ce motif qui permettra de mesurer la dérive du modèle.",
    classes: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
  },
  piece_demandee: {
    libelle: "Demander une pièce",
    resume: "Pièce demandée",
    aide: "Met le dossier en attente sans le refermer.",
    statut: "À vérifier",
    invite:
      "Quelle pièce est demandée, et à qui ? Le dossier reste ouvert jusqu'à sa réception.",
    classes: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10",
  },
}

/** Ordre d'affichage des trois boutons de la barre de décision. */
export const ORDRE_DECISIONS: TypeDecision[] = [
  "fraude_confirmee",
  "piece_demandee",
  "classee_sans_suite",
]
