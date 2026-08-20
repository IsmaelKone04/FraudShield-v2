import fs from "node:fs"

/**
 * Lecture et encodage du jeu de déclarations automobiles.
 *
 * Rien de ce fichier ne connaît la régression : il transforme un CSV en une
 * matrice de nombres et un vecteur d'étiquettes, et il nomme chaque colonne
 * produite. Ce nommage n'est pas cosmétique — c'est lui qui permettra, plus
 * tard, d'écrire « aucune autorité contactée : +14 points » plutôt que
 * « variable 7 ».
 */

/**
 * Découpe une ligne de CSV en tenant compte des guillemets.
 *
 * Écrit à la main plutôt qu'emprunté : la dépendance ne servirait qu'ici, et
 * le format de ces deux fichiers est connu.
 */
export function decouper(ligne) {
  const champs = []
  let courant = ""
  let entreGuillemets = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') {
        courant += '"'
        i++
      } else entreGuillemets = !entreGuillemets
    } else if (c === "," && !entreGuillemets) {
      champs.push(courant)
      courant = ""
    } else courant += c
  }
  champs.push(courant)
  return champs
}

export function lireCSV(chemin) {
  const lignes = fs.readFileSync(chemin, "utf8").trim().split(/\r?\n/)
  const entetes = decouper(lignes[0])
  return lignes.slice(1).map((ligne) => {
    const champs = decouper(ligne)
    return Object.fromEntries(entetes.map((e, i) => [e, champs[i]]))
  })
}

/**
 * Les variables retenues, et pourquoi les autres ne le sont pas.
 *
 * Trois écartées délibérément :
 *
 * - `policy_id` est un identifiant. Un modèle qui l'utilise apprend le jeu par
 *   cœur et ne prédit rien.
 * - `incident_city` compte plus de deux cents valeurs pour trente mille lignes.
 *   Encodée telle quelle, chaque ville deviendrait une variable renseignée par
 *   une poignée de dossiers : le modèle y lirait du bruit et le prendrait pour
 *   une règle.
 * - `incident_date` n'est pas exploitable sans une origine des temps ; ce qui
 *   en serait tiré (jour de la semaine, saison) demande d'abord d'établir que
 *   la date porte un signal, ce que rien n'indique ici.
 */
export const CATEGORIELLES = [
  "policy_state",
  "insured_sex",
  "insured_education_level",
  "insured_occupation",
  "insured_hobbies",
  "incident_type",
  "collision_type",
  "incident_severity",
  "authorities_contacted",
  "incident_state",
  "police_report_available",
]

/**
 * Variables construites, et la raison de chacune.
 *
 * `ecart_montant` n'est pas un raffinement : c'est la lecture d'un résultat.
 * Un premier apprentissage avait donné deux coefficients presque opposés à
 * `claim_amount` et `total_claim_amount`, deux colonnes corrélées à 0,90 — le
 * modèle avait trouvé le signal, mais il l'exprimait sous une forme que
 * personne ne pouvait lire. Ce signal est leur **différence** : le taux de
 * fraude passe de 7,2 % dans le décile où le montant réclamé reste très en
 * dessous de l'expertise à 17,1 % dans celui où il l'atteint ou la dépasse.
 *
 * L'écrire explicitement fait deux choses. Il retire la colinéarité, qui rend
 * les deux coefficients instables et sans interprétation séparée. Et surtout,
 * il rend l'explication énonçable : « le montant réclamé dépasse l'expertise
 * de 1 200 » se conteste, « claim_amount +0,68 et total_claim_amount −0,63 »
 * ne se conteste pas.
 *
 * `claim_amount` disparaît des variables brutes : elle vaut désormais
 * `total_claim_amount + ecart_montant`, et la garder réintroduirait la
 * colinéarité qu'on vient d'ôter.
 */
export const DERIVEES = {
  ecart_montant: (l) => Number(l.claim_amount) - Number(l.total_claim_amount),
}

export const NUMERIQUES = [
  "policy_deductible",
  "policy_annual_premium",
  "insured_age",
  "incident_hour_of_the_day",
  "number_of_vehicles_involved",
  "bodily_injuries",
  "witnesses",
  "total_claim_amount",
  ...Object.keys(DERIVEES),
]

/** La valeur d'une variable, qu'elle soit lue dans le CSV ou construite. */
export function valeur(ligne, colonne) {
  const derivee = DERIVEES[colonne]
  return derivee ? derivee(ligne) : Number(ligne[colonne])
}

/**
 * Construit le plan d'encodage à partir des seules lignes d'apprentissage.
 *
 * C'est une précaution qui a l'air d'un détail et n'en est pas une : établir
 * les modalités ou les moyennes sur le jeu entier ferait entrer dans le modèle
 * une information tirée des lignes de contrôle. Les mesures qui suivraient
 * seraient flatteuses et fausses.
 */
export function planEncodage(lignes) {
  const modalites = {}
  for (const colonne of CATEGORIELLES) {
    const vues = [...new Set(lignes.map((l) => l[colonne]))].sort()
    // La première modalité sert de référence : la garder produirait une colonne
    // redondante avec les autres, et deux jeux de coefficients pour une même
    // information.
    modalites[colonne] = { reference: vues[0], autres: vues.slice(1) }
  }

  const stats = {}
  for (const colonne of NUMERIQUES) {
    const valeurs = lignes.map((l) => valeur(l, colonne))
    const moyenne = valeurs.reduce((s, v) => s + v, 0) / valeurs.length
    const ecartType =
      Math.sqrt(
        valeurs.reduce((s, v) => s + (v - moyenne) ** 2, 0) / valeurs.length
      ) || 1
    stats[colonne] = { moyenne, ecartType }
  }

  const noms = [
    ...NUMERIQUES,
    ...CATEGORIELLES.flatMap((c) =>
      modalites[c].autres.map((m) => `${c}=${m}`)
    ),
  ]

  return { modalites, stats, noms }
}

/** Une ligne du CSV devenue un vecteur de nombres, dans l'ordre de `plan.noms`. */
export function encoder(ligne, plan) {
  const vecteur = []
  for (const colonne of NUMERIQUES) {
    const { moyenne, ecartType } = plan.stats[colonne]
    // Centrer et réduire : sans cela, `claim_amount` (des dizaines de milliers)
    // et `witnesses` (de zéro à cinq) ne pèseraient pas du tout la même chose
    // devant la pénalité, qui frappe les coefficients sans savoir ce qu'ils
    // multiplient.
    vecteur.push((valeur(ligne, colonne) - moyenne) / ecartType)
  }
  for (const colonne of CATEGORIELLES) {
    for (const modalite of plan.modalites[colonne].autres) {
      vecteur.push(ligne[colonne] === modalite ? 1 : 0)
    }
  }
  return vecteur
}

/**
 * Découpe en apprentissage et contrôle, en conservant le taux de fraude.
 *
 * Un tirage au hasard sur onze pour cent de positifs peut donner deux moitiés
 * sensiblement différentes. Les deux classes sont donc mélangées puis coupées
 * séparément, et le mélange est reproductible : deux exécutions du même script
 * doivent donner les mêmes chiffres, sans quoi on ne sait plus si une variation
 * vient d'une modification ou du tirage.
 */
export function decouperStratifie(lignes, etiquette, partControle = 0.25, graine = 20260820) {
  let x = graine
  const hasard = () => {
    // Générateur congruentiel : la reproductibilité prime ici sur la qualité.
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
  const melanger = (tableau) => {
    const copie = [...tableau]
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(hasard() * (i + 1))
      ;[copie[i], copie[j]] = [copie[j], copie[i]]
    }
    return copie
  }

  const positifs = melanger(lignes.filter((l) => etiquette(l) === 1))
  const negatifs = melanger(lignes.filter((l) => etiquette(l) === 0))
  const coupe = (t) => {
    const n = Math.round(t.length * partControle)
    return [t.slice(n), t.slice(0, n)]
  }
  const [apprentissagePositifs, controlePositifs] = coupe(positifs)
  const [apprentissageNegatifs, controleNegatifs] = coupe(negatifs)

  return {
    apprentissage: melanger([...apprentissagePositifs, ...apprentissageNegatifs]),
    controle: melanger([...controlePositifs, ...controleNegatifs]),
  }
}
