import {
  construireCSV,
  nomFichierDate,
  telechargerCSV,
  type Colonne,
} from "./csv"
import { formaterDate, formaterHeure } from "./formats"
import { ACTIONS, libelleAction } from "./journal"
import type { EntreeJournal } from "./schemas/journal.schema"
import type {
  AlerteAvecModifications,
  InvestigationAvecModifications,
} from "./store/use-modifications"
import { nomDuCompte } from "./utilisateurs"

/**
 * Ce que la console sait exporter.
 *
 * Les colonnes vivent ici plutôt que dans les écrans : l'export des alertes est
 * déclenché depuis deux endroits (la liste et la carte « Export alertes » des
 * rapports), et deux définitions finiraient par diverger — c'est exactement le
 * défaut corrigé en phase 1 sur les données elles-mêmes.
 */

/** Marque les lignes changées dans ce navigateur et non transmises à un serveur. */
const colonneModification = <T extends { estModifiee: boolean }>(): Colonne<T> => ({
  entete: "Modifié localement",
  valeur: (ligne) => (ligne.estModifiee ? "oui" : "non"),
})

const COLONNES_ALERTES: Colonne<AlerteAvecModifications>[] = [
  { entete: "ID", valeur: (a) => a.id },
  { entete: "Type", valeur: (a) => a.type },
  { entete: "Assuré", valeur: (a) => a.assure },
  { entete: "Établissement", valeur: (a) => a.etablissement },
  // Le montant brut, et non `montantFormate` : « 2 400 000 FCFA » est du texte,
  // dont Excel ne peut faire ni somme ni tri.
  { entete: "Montant (FCFA)", valeur: (a) => a.montant },
  { entete: "Score IA", valeur: (a) => a.scoreIA },
  { entete: "Risque", valeur: (a) => a.risque },
  // JJ/MM/AAAA plutôt que l'ISO : Excel en configuration française le reconnaît
  // comme une date, là où « 2026-05-20 » resterait du texte.
  { entete: "Date", valeur: (a) => a.dateFormate },
  { entete: "Assigné à", valeur: (a) => nomDuCompte(a.assigneA) },
  { entete: "Statut", valeur: (a) => a.statut },
  colonneModification<AlerteAvecModifications>(),
]

const COLONNES_INVESTIGATIONS: Colonne<InvestigationAvecModifications>[] = [
  { entete: "ID", valeur: (i) => i.id },
  { entete: "Titre", valeur: (i) => i.titre },
  { entete: "Priorité", valeur: (i) => i.priorite },
  { entete: "Statut", valeur: (i) => i.statut },
  { entete: "Assigné à", valeur: (i) => nomDuCompte(i.assigne) },
  { entete: "Cas liés", valeur: (i) => i.casLies },
  { entete: "Montant total", valeur: (i) => i.montantTotal },
  { entete: "Ouverture", valeur: (i) => i.dateOuverture },
  { entete: "Dernière mise à jour", valeur: (i) => i.dateMaj },
  { entete: "Alertes liées", valeur: (i) => i.alertesLiees.join(", ") },
  { entete: "Établissements", valeur: (i) => i.etablissements.join(", ") },
  { entete: "Description", valeur: (i) => i.description },
  colonneModification<InvestigationAvecModifications>(),
]

/**
 * Le journal d'audit, tel qu'un contrôle externe le demande.
 *
 * Date et heure en deux colonnes : « 20/05/2026 à 06:12 » est du texte pour un
 * tableur, là où une colonne de dates se trie. L'ordre des colonnes suit la
 * question qu'on pose au journal — quand, qui, quoi, sur quoi, de quel état à
 * quel état, et pourquoi.
 */
const COLONNES_JOURNAL: Colonne<EntreeJournal>[] = [
  { entete: "Date", valeur: (e) => formaterDate(e.horodatage) },
  { entete: "Heure", valeur: (e) => formaterHeure(e.horodatage) },
  { entete: "Acteur", valeur: (e) => e.acteur },
  { entete: "Action", valeur: (e) => libelleAction(e.action) },
  { entete: "Portée", valeur: (e) => ACTIONS[e.action].portee },
  { entete: "Cible", valeur: (e) => e.cible },
  { entete: "Avant", valeur: (e) => e.avant },
  { entete: "Après", valeur: (e) => e.apres },
  { entete: "Motif", valeur: (e) => e.motif },
  // Sans cette colonne, un contrôleur ne pourrait pas distinguer les entrées
  // dont l'effet ne se lit plus nulle part ailleurs.
  {
    entete: "Effacement",
    valeur: (e) => (ACTIONS[e.action].effacement ? "oui" : "non"),
  },
]

/** Télécharge les alertes fournies et renvoie le nom du fichier produit. */
export function exporterAlertes(alertes: AlerteAvecModifications[]): string {
  const nomFichier = nomFichierDate("alertes")
  telechargerCSV(nomFichier, construireCSV(alertes, COLONNES_ALERTES))
  return nomFichier
}

/** Télécharge les dossiers fournis et renvoie le nom du fichier produit. */
export function exporterInvestigations(
  investigations: InvestigationAvecModifications[]
): string {
  const nomFichier = nomFichierDate("investigations")
  telechargerCSV(
    nomFichier,
    construireCSV(investigations, COLONNES_INVESTIGATIONS)
  )
  return nomFichier
}

/** Télécharge le journal d'audit et renvoie le nom du fichier produit. */
export function exporterJournal(entrees: EntreeJournal[]): string {
  const nomFichier = nomFichierDate("journal-audit")
  telechargerCSV(nomFichier, construireCSV(entrees, COLONNES_JOURNAL))
  return nomFichier
}

/** Exposées pour les tests : les écrans passent par les fonctions ci-dessus. */
export const COLONNES = {
  alertes: COLONNES_ALERTES,
  investigations: COLONNES_INVESTIGATIONS,
  journal: COLONNES_JOURNAL,
}
