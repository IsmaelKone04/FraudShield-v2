/**
 * Construction et téléchargement de fichiers CSV, entièrement côté navigateur.
 *
 * Trois détails décident si le fichier s'ouvre correctement chez l'analyste, et
 * aucun n'est visible depuis le code appelant : le séparateur, l'encodage et
 * l'échappement. Ils sont regroupés ici pour être décidés une fois.
 */

/** Valeur exportable d'une cellule. `null` et `undefined` donnent une cellule vide. */
export type ValeurCellule = string | number | null | undefined

/** Une colonne : son en-tête, et comment la lire sur une ligne. */
export type Colonne<T> = {
  entete: string
  valeur: (ligne: T) => ValeurCellule
}

/**
 * Point-virgule et non virgule : Excel en configuration française attend le
 * séparateur de liste régional. Avec une virgule, tout le fichier atterrit dans
 * la première colonne.
 */
const SEPARATEUR = ";"

/** Fin de ligne prescrite par la RFC 4180. */
const FIN_DE_LIGNE = "\r\n"

/**
 * Sans cette marque d'ordre des octets, Excel lit l'UTF-8 comme du Windows-1252 :
 * « Établissement » devient « Ã‰tablissement » et « À vérifier » « Ã€ vÃ©rifier ».
 * Écrite par son point de code : le caractère lui-même est invisible dans un
 * éditeur, donc impossible à relire.
 */
const BOM = "\uFEFF"

/** Caractères qui obligent à entourer la cellule de guillemets. */
const CARACTERES_A_PROTEGER = /[";\r\n]/

/**
 * Un tableur interprète comme une **formule** toute cellule commençant par l'un
 * de ces caractères. Sur des données qui viendront un jour du service de
 * détection — donc d'établissements de santé extérieurs — c'est une voie
 * d'injection : `=cmd|'...'` s'exécute à l'ouverture du fichier.
 */
const DEBUT_DE_FORMULE = /^[=+\-@\t\r]/

/** Met une valeur en forme de cellule CSV. Fonction pure, testée. */
export function echapperCellule(valeur: ValeurCellule): string {
  if (valeur === null || valeur === undefined) return ""

  // Les nombres sont écrits bruts : les traiter comme du texte empêcherait Excel
  // de les additionner, ce qui est précisément ce qu'on attend d'une colonne
  // « Montant ».
  if (typeof valeur === "number") {
    return Number.isFinite(valeur) ? String(valeur) : ""
  }

  const texte = DEBUT_DE_FORMULE.test(valeur) ? `'${valeur}` : valeur
  if (!CARACTERES_A_PROTEGER.test(texte)) return texte
  return `"${texte.replace(/"/g, '""')}"`
}

/** Assemble l'en-tête et les lignes en un document CSV complet. Fonction pure, testée. */
export function construireCSV<T>(lignes: T[], colonnes: Colonne<T>[]): string {
  const entete = colonnes.map((c) => echapperCellule(c.entete)).join(SEPARATEUR)
  const corps = lignes.map((ligne) =>
    colonnes.map((c) => echapperCellule(c.valeur(ligne))).join(SEPARATEUR)
  )
  return [entete, ...corps].join(FIN_DE_LIGNE) + FIN_DE_LIGNE
}

/**
 * Nom de fichier daté, du type `alertes-2026-08-12.csv`.
 *
 * La date est lue en heure locale : `toISOString()` bascule sur la veille en
 * soirée pour tout fuseau à l'est de Greenwich, et l'analyste retrouverait un
 * fichier daté d'hier.
 */
export function nomFichierDate(base: string, date: Date = new Date()): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, "0")
  const jour = [
    date.getFullYear(),
    deuxChiffres(date.getMonth() + 1),
    deuxChiffres(date.getDate()),
  ].join("-")
  return `${base}-${jour}.csv`
}

/**
 * Déclenche le téléchargement du fichier depuis le navigateur.
 *
 * Seule fonction de ce module à toucher au DOM, et la seule qui ne soit pas
 * testable ici : elle est gardée aussi mince que possible.
 */
export function telechargerCSV(nomFichier: string, contenu: string): void {
  const blob = new Blob([BOM + contenu], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const lien = document.createElement("a")
  lien.href = url
  lien.download = nomFichier
  lien.style.display = "none"
  document.body.appendChild(lien)
  lien.click()
  lien.remove()

  // Révocation différée : certains navigateurs n'ont pas fini de lire le Blob au
  // retour de `click()`. Sans révocation du tout, il resterait en mémoire
  // jusqu'au rechargement de la page.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
