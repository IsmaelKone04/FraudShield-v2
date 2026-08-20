import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  CATEGORIELLES,
  NUMERIQUES,
  decouperStratifie,
  encoder,
  lireCSV,
  planEncodage,
} from "./jeu.mjs"
import { entrainer, logit, probabilite, recalibrer } from "./regression.mjs"
import {
  aireSousROC,
  calibration,
  ecartDeCalibration,
  pointDeFonctionnement,
} from "./evaluation.mjs"

/**
 * Apprentissage du modèle de détection sur les déclarations automobiles.
 *
 * `npm run modele:entrainer`. Le script lit le CSV, apprend, mesure sur des
 * lignes tenues à l'écart, et écrit un artefact que la console charge.
 *
 * Tout ce qui est affiché ici est mesuré sur le jeu de contrôle. Rien n'est
 * rapporté sur les lignes d'apprentissage : un modèle sait toujours répondre
 * sur ce qu'il a déjà vu, et le dire ne renseigne personne.
 */

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const SOURCE = path.join(RACINE, "donnees/car_insurance_fraud_dataset.csv")
const ARTEFACT = path.join(RACINE, "src/lib/modele/modele-fraude-auto.json")

const pct = (v, d = 1) =>
  v === null ? "—" : `${(v * 100).toFixed(d).replace(".", ",")} %`

console.log("── Lecture")
const lignes = lireCSV(SOURCE)
const etiquette = (l) => (l.fraud_reported === "Y" ? 1 : 0)
const positifs = lignes.filter((l) => etiquette(l) === 1).length
console.log(
  `   ${lignes.length.toLocaleString("fr-FR")} déclarations, ` +
    `${positifs.toLocaleString("fr-FR")} fraudes signalées (${pct(positifs / lignes.length, 2)})`
)

console.log("\n── Découpage")
const { apprentissage, controle } = decouperStratifie(lignes, etiquette)
console.log(
  `   apprentissage ${apprentissage.length.toLocaleString("fr-FR")} · ` +
    `contrôle ${controle.length.toLocaleString("fr-FR")} ` +
    `(taux de fraude ${pct(
      controle.filter((l) => etiquette(l) === 1).length / controle.length,
      2
    )})`
)

// Le plan est établi sur les seules lignes d'apprentissage : voir `planEncodage`.
const plan = planEncodage(apprentissage)
console.log(`   ${plan.noms.length} variables après encodage`)

const Xa = apprentissage.map((l) => encoder(l, plan))
const ya = apprentissage.map(etiquette)
const Xc = controle.map((l) => encoder(l, plan))
const yc = controle.map(etiquette)

console.log("\n── Apprentissage")
const brut = entrainer(Xa, ya, {
  pas: 0.5,
  iterations: 600,
  l2: 1,
  surveiller: (i, p) => console.log(`   itération ${String(i).padStart(3)} · perte ${p.toFixed(5)}`),
})
const modele = recalibrer(brut)

console.log("\n── Mesure, sur le jeu de contrôle")
const logits = Xc.map((x) => logit(x, modele.poids, modele.biais))
const probabilites = Xc.map((x) => probabilite(x, modele))
const auc = aireSousROC(logits, yc)
console.log(`   aire sous la courbe ROC : ${auc.toFixed(4).replace(".", ",")}`)
console.log(
  `   (probabilité qu'une fraude soit mieux notée qu'un dossier régulier ; ` +
    `0,5 = tirage au sort)`
)

const cases = calibration(probabilites, yc)
console.log(`   écart de calibration : ${pct(ecartDeCalibration(cases), 2)}`)
console.log("\n   tranche annoncée   effectif   promis   constaté")
for (const c of cases) {
  console.log(
    `   ${pct(c.borneBasse, 0).padStart(6)} – ${pct(c.borneHaute, 0).padEnd(7)}` +
      `${String(c.effectif).padStart(8)}   ${pct(c.promis).padStart(6)}   ${pct(c.constate).padStart(8)}`
  )
}

/**
 * L'échelle du score affiché.
 *
 * Le score de la console est sur cent, et son explication doit le refermer
 * exactement. C'est le **logit** qui est mis à l'échelle, et non la
 * probabilité : le logit est une somme, la probabilité ne l'est pas. Une
 * décomposition exprimée en points de probabilité ne totaliserait jamais, quel
 * que soit le soin apporté aux arrondis.
 *
 * Le score reste donc une transformation monotone de la probabilité — l'ordre
 * des dossiers est le même, et la probabilité calibrée est publiée à côté.
 * Les bornes sont prises sur les centiles extrêmes du jeu d'apprentissage, de
 * sorte que l'échelle soit occupée sans être saturée par quelques dossiers.
 */
const logitsApprentissage = Xa.map((x) => logit(x, modele.poids, modele.biais)).sort(
  (a, b) => a - b
)
const centile = (p) =>
  logitsApprentissage[
    Math.min(
      logitsApprentissage.length - 1,
      Math.max(0, Math.round(p * (logitsApprentissage.length - 1)))
    )
  ]
const bas = centile(0.01)
const haut = centile(0.99)
const pente = 90 / (haut - bas)
const origine = 5 - pente * bas

const enScore = (z) => Math.min(100, Math.max(0, pente * z + origine))
console.log("\n── Échelle du score")
console.log(
  `   logit ${bas.toFixed(2)} → ${enScore(bas).toFixed(0)} ; ` +
    `logit ${haut.toFixed(2)} → ${enScore(haut).toFixed(0)}`
)

const scores = logits.map(enScore)
console.log("\n── Points de fonctionnement, sur le jeu de contrôle")
console.log("   seuil   alertes   précision   rappel   F1    dossiers/fraude")
for (const seuil of [30, 40, 50, 60, 70, 80]) {
  const p = pointDeFonctionnement(scores, yc, seuil)
  console.log(
    `   ${String(seuil).padStart(5)}   ${String(p.alertes).padStart(7)}   ` +
      `${pct(p.precision).padStart(9)}   ${pct(p.rappel).padStart(6)}   ` +
      `${pct(p.f1).padStart(5)}   ${
        p.dossiersParFraude === null ? "—" : p.dossiersParFraude.toFixed(1).replace(".", ",")
      }`
  )
}

console.log("\n── Ce que le modèle a retenu")
const importants = plan.noms
  .map((nom, i) => ({ nom, coefficient: modele.poids[i] }))
  .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
for (const { nom, coefficient } of importants.slice(0, 12)) {
  const signe = coefficient >= 0 ? "+" : "−"
  console.log(
    `   ${signe} ${Math.abs(coefficient).toFixed(3).padStart(6)}  ${nom}` +
      `${NUMERIQUES.includes(nom) ? "  (par écart-type)" : ""}`
  )
}

const artefact = {
  version: 1,
  entraineLe: new Date().toISOString(),
  source: {
    fichier: path.basename(SOURCE),
    lignes: lignes.length,
    apprentissage: apprentissage.length,
    controle: controle.length,
    tauxDeBase: positifs / lignes.length,
  },
  algorithme: "régression logistique pénalisée (L2), descente de gradient",
  echelle: { pente, origine },
  biais: modele.biais,
  variables: plan.noms.map((nom, i) => ({ nom, coefficient: modele.poids[i] })),
  encodage: {
    numeriques: NUMERIQUES,
    categorielles: CATEGORIELLES,
    modalites: plan.modalites,
    stats: plan.stats,
  },
  mesures: {
    aireSousROC: auc,
    ecartDeCalibration: ecartDeCalibration(cases),
    calibration: cases,
    pointsDeFonctionnement: [30, 40, 50, 60, 70, 80].map((s) =>
      pointDeFonctionnement(scores, yc, s)
    ),
  },
}

fs.mkdirSync(path.dirname(ARTEFACT), { recursive: true })
fs.writeFileSync(ARTEFACT, JSON.stringify(artefact, null, 2) + "\n")
console.log(
  `\n── Écrit : ${path.relative(RACINE, ARTEFACT).split(path.sep).join("/")} ` +
    `(${(fs.statSync(ARTEFACT).size / 1024).toFixed(1)} ko)`
)
