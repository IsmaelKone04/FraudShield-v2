/**
 * Mises en forme partagées entre le serveur et le navigateur.
 *
 * Toutes sont écrites à la main, et c'est délibéré : `toLocaleString` et
 * `toLocaleDateString` dépendent de la version d'ICU embarquée, qui n'est pas
 * la même dans Node et dans le navigateur. Le rendu diffèrerait alors entre le
 * HTML servi et le premier rendu client — c'est-à-dire un avertissement
 * d'hydratation, et un chiffre qui change sous les yeux de l'utilisateur.
 *
 * Elles vivaient dans l'écran du dossier ; la note d'explication et la
 * décomposition du score en avaient besoin à leur tour. Une troisième copie
 * aurait fini par séparer les milliers autrement que les deux premières.
 */

/** « 963 000 FCFA ». Espace ordinaire, comme dans le jeu de données. */
export function francs(montant: number): string {
  return `${separerMilliers(montant)} FCFA`
}

/** « 4 812 ». Le même séparateur, sans unité. */
export function separerMilliers(valeur: number): string {
  return valeur.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

/**
 * « 20/05/2026 à 06:12 », sans conversion de fuseau.
 *
 * Les horodatages sont en UTC, qui est aussi l'heure de Dakar : les découper
 * suffit, et le résultat est identique des deux côtés.
 */
export function formaterHorodatage(iso: string): string {
  const [date, heure] = iso.split("T")
  const [annee, mois, jour] = date.split("-")
  return `${jour}/${mois}/${annee} à ${heure.slice(0, 5)}`
}

/**
 * Une valeur suivie de son unité : « 2 400 000 FCFA », « 10 actes ».
 *
 * Les comparatifs sont tous en francs aujourd'hui, mais le contrat en admet
 * d'autres. Mettre en forme au cas par cas dans chaque écran garantirait
 * qu'une durée finisse un jour affichée en francs.
 */
export function valeurAvecUnite(valeur: number, unite: string): string {
  return unite === "FCFA" ? francs(valeur) : `${separerMilliers(valeur)} ${unite}`
}

/** « +34 » / « −3 ». Le signe est toujours écrit : c'est l'information. */
export function signe(valeur: number): string {
  return valeur >= 0 ? `+${valeur}` : `−${Math.abs(valeur)}`
}

/**
 * Une proportion écrite en pourcentage : « 32,4 % », « 25 % ».
 *
 * `null` donne « — » plutôt que « 0 % » : un mois sans dossier tranché n'a pas
 * une précision nulle, il n'en a pas. La virgule est française et l'arrondi
 * fait à la main, pour la raison qui vaut pour tout ce fichier.
 */
export function pourcentage(part: number | null, decimales = 0): string {
  if (part === null) return "—"
  const valeur = (part * 100).toFixed(decimales)
  return `${decimales > 0 ? valeur.replace(".", ",") : valeur} %`
}

/**
 * L'écart relatif entre deux valeurs, arrondi au point : « +154 % ».
 *
 * `null` quand la référence est nulle — un écart rapporté à zéro n'a pas de
 * sens, et afficher « +∞ % » n'aiderait personne.
 */
export function ecartRelatif(valeur: number, reference: number): string | null {
  if (reference === 0) return null
  return `${signe(Math.round(((valeur - reference) / reference) * 100))} %`
}
