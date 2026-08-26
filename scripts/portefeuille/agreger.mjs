import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { decouper } from "../modele/jeu.mjs"

/**
 * Ce qui est normal dans ce portefeuille, réduit à une table consultable.
 *
 * `npm run portefeuille:agreger`. Le fichier source pèse dix-sept mégaoctets et
 * n'est pas versionné ; le résultat de cette agrégation l'est, parce que c'est
 * lui que la console lit. Le rapport est de mille pour un.
 *
 * **Ce que ce jeu permet, et ce qu'il ne permet pas.** Il ne porte aucune
 * étiquette de fraude : `N_SINISTRE` compte les sinistres, il ne les qualifie
 * pas. On n'y apprend donc pas un détecteur. Il décrit en revanche ce qui est
 * habituel pour un profil donné — et un montant n'est un argument que comparé à
 * ce qui se pratique ailleurs.
 *
 * Les colonnes « 1 » à « 5 » sont les coûts du premier, deuxième… sinistre du
 * contrat : 11 675 contrats en ont un, 637 en ont deux, 34 en ont trois, trois
 * en ont quatre, et aucun cinq.
 */

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const SOURCE = path.join(RACINE, "donnees/Base_de_donnees.csv")
const ARTEFACT = path.join(RACINE, "src/lib/portefeuille/reference.json")

/**
 * L'effectif en dessous duquel une cohorte n'est pas publiée.
 *
 * Une fréquence calculée sur trente contrats varie du simple au double selon
 * qu'un seul d'entre eux a déclaré un sinistre. La publier reviendrait à
 * présenter du bruit comme une référence — et c'est précisément à ce genre de
 * chiffre qu'un établissement mis en cause s'accrocherait.
 */
const EFFECTIF_MINIMAL = 500

/** Les découpages publiés, et la façon de ranger un contrat dedans. */
const DIMENSIONS = [
  {
    cle: "region",
    libelle: "Région",
    colonne: "REGION",
    ranger: (v) => v,
  },
  {
    cle: "energie",
    libelle: "Énergie du véhicule",
    colonne: "ENERGIE",
    ranger: (v) => v,
  },
  {
    cle: "critair",
    libelle: "Vignette Crit'Air",
    colonne: "CRITAIR",
    ranger: (v) => v,
  },
  {
    cle: "conducteurs",
    libelle: "Conducteurs désignés",
    colonne: "N_COND",
    ranger: (v) => v,
  },
  {
    cle: "ageConducteur",
    libelle: "Âge du conducteur",
    colonne: "AGEREV",
    // Par tranches de dix ans : à l'année près, chaque cohorte tomberait sous
    // l'effectif minimal aux âges extrêmes.
    ranger: (v) => {
      const a = Number(v)
      if (!Number.isFinite(a)) return null
      const bas = Math.floor(a / 10) * 10
      return `${bas} à ${bas + 9} ans`
    },
  },
  {
    cle: "ageVehicule",
    libelle: "Âge du véhicule",
    colonne: "AGE_VOIT",
    ranger: (v) => {
      const a = Number(v)
      if (!Number.isFinite(a)) return null
      const bas = Math.floor(a / 5) * 5
      return `${bas} à ${bas + 4} ans`
    },
  },
  {
    cle: "anciennete",
    libelle: "Ancienneté du contrat",
    colonne: "ANCIENNETE",
    ranger: (v) => {
      const a = Number(v)
      if (!Number.isFinite(a)) return null
      const bas = Math.floor(a / 5) * 5
      return `${bas} à ${bas + 4} ans`
    },
  },
]

const COLONNES_COUT = ["1", "2", "3", "4", "5"]

console.log("── Lecture")
const lignes = fs.readFileSync(SOURCE, "utf8").trim().split(/\r?\n/)
const entetes = decouper(lignes[0])
const index = Object.fromEntries(entetes.map((e, i) => [e, i]))
const contrats = lignes.slice(1).map(decouper)
console.log(`   ${contrats.length.toLocaleString("fr-FR")} contrats`)

const iSinistres = index.N_SINISTRE
const iCouts = COLONNES_COUT.map((c) => index[c]).filter((i) => i !== undefined)

/** Un accumulateur de cohorte : contrats, sinistres, coût cumulé. */
const vide = () => ({ contrats: 0, sinistres: 0, cout: 0 })

function ajouter(acc, contrat) {
  acc.contrats++
  acc.sinistres += Number(contrat[iSinistres])
  for (const i of iCouts) acc.cout += Number(contrat[i]) || 0
}

const ensemble = vide()
const parDimension = Object.fromEntries(DIMENSIONS.map((d) => [d.cle, new Map()]))

for (const contrat of contrats) {
  ajouter(ensemble, contrat)
  for (const d of DIMENSIONS) {
    const cle = d.ranger(contrat[index[d.colonne]])
    if (cle === null || cle === undefined || cle === "") continue
    const table = parDimension[d.cle]
    if (!table.has(cle)) table.set(cle, vide())
    ajouter(table.get(cle), contrat)
  }
}

/**
 * Les trois grandeurs publiées.
 *
 * La fréquence est exprimée **pour mille contrats** : 0,114 sinistre par contrat
 * ne se lit pas, 114 sinistres pour mille contrats se lit. Le coût moyen porte
 * sur les sinistres, pas sur les contrats — le diviser par l'ensemble du
 * portefeuille donnerait un chiffre qui ne correspond à aucun sinistre réel.
 *
 * La prime pure est le produit des deux : le coût annuel attendu d'un contrat de
 * cette cohorte. C'est la grandeur qui résume les deux autres, et la seule qui
 * se compare d'une cohorte à l'autre sans arbitrage.
 */
function mesurer(acc) {
  return {
    contrats: acc.contrats,
    sinistres: acc.sinistres,
    frequencePourMille: Math.round((acc.sinistres / acc.contrats) * 1000),
    coutMoyenSinistre:
      acc.sinistres === 0 ? 0 : Math.round(acc.cout / acc.sinistres),
    primePure: Math.round(acc.cout / acc.contrats),
  }
}

const reference = {
  version: 1,
  agregeLe: new Date().toISOString(),
  source: {
    fichier: path.basename(SOURCE),
    contrats: contrats.length,
    effectifMinimal: EFFECTIF_MINIMAL,
  },
  ensemble: mesurer(ensemble),
  dimensions: DIMENSIONS.map((d) => {
    const publiees = [...parDimension[d.cle].entries()]
      .filter(([, acc]) => acc.contrats >= EFFECTIF_MINIMAL)
      .map(([cle, acc]) => ({ cle, ...mesurer(acc) }))
      .sort((a, b) => a.cle.localeCompare(b.cle, "fr", { numeric: true }))
    const ecartees = parDimension[d.cle].size - publiees.length
    return {
      cle: d.cle,
      libelle: d.libelle,
      colonne: d.colonne,
      modalites: publiees,
      /** Cohortes trop peu fournies pour être publiées — voir EFFECTIF_MINIMAL. */
      ecartees,
    }
  }),
}

console.log("\n── Ensemble du portefeuille")
console.log(
  `   ${reference.ensemble.frequencePourMille} sinistres pour mille contrats · ` +
    `coût moyen ${reference.ensemble.coutMoyenSinistre} € · ` +
    `prime pure ${reference.ensemble.primePure} €`
)

console.log("\n── Cohortes publiées")
for (const d of reference.dimensions) {
  const f = d.modalites.map((m) => m.frequencePourMille)
  const rapport = f.length > 1 ? Math.max(...f) / Math.min(...f) : 1
  console.log(
    `   ${d.libelle.padEnd(24)} ${String(d.modalites.length).padStart(2)} cohortes` +
      `${d.ecartees > 0 ? `, ${d.ecartees} écartée(s)` : ""}` +
      `   fréquences de ${Math.min(...f)} à ${Math.max(...f)} ` +
      `(rapport ${rapport.toFixed(2).replace(".", ",")})`
  )
}

fs.mkdirSync(path.dirname(ARTEFACT), { recursive: true })
fs.writeFileSync(ARTEFACT, JSON.stringify(reference, null, 2) + "\n")
console.log(
  `\n── Écrit : ${path.relative(RACINE, ARTEFACT).split(path.sep).join("/")} ` +
    `(${(fs.statSync(ARTEFACT).size / 1024).toFixed(1)} ko, ` +
    `contre ${(fs.statSync(SOURCE).size / 1024 / 1024).toFixed(1)} Mo à la source)`
)
