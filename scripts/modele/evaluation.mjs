/**
 * Ce que vaut le modèle, mesuré sur des lignes qu'il n'a jamais vues.
 *
 * L'exactitude n'est pas rapportée, et c'est délibéré : à onze pour cent de
 * fraudes, un modèle qui répond « non » à tout affiche quatre-vingt-huit pour
 * cent d'exactitude sans avoir rien appris. Le chiffre serait juste et
 * l'affirmation qu'il porte, mensongère.
 *
 * Ce qui est rapporté : l'aire sous la courbe ROC — la probabilité qu'une
 * fraude tirée au hasard soit mieux notée qu'un dossier régulier —, puis la
 * précision et le rappel à plusieurs seuils, parce que le seuil est un
 * arbitrage de la cellule et non une propriété du modèle. C'est exactement la
 * distinction que porte déjà le simulateur de la console.
 */

/**
 * Aire sous la courbe ROC, calculée par les rangs.
 *
 * Les ex æquo reçoivent le rang moyen : sans cela, deux dossiers de même score
 * dont l'un est frauduleux feraient varier la mesure selon l'ordre de lecture
 * du fichier.
 */
export function aireSousROC(scores, y) {
  const indices = scores.map((s, i) => [s, y[i]]).sort((a, b) => a[0] - b[0])
  const rangs = new Array(indices.length)
  let i = 0
  while (i < indices.length) {
    let j = i
    while (j + 1 < indices.length && indices[j + 1][0] === indices[i][0]) j++
    const rangMoyen = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) rangs[k] = rangMoyen
    i = j + 1
  }
  let sommeRangsPositifs = 0
  let positifs = 0
  for (let k = 0; k < indices.length; k++) {
    if (indices[k][1] === 1) {
      sommeRangsPositifs += rangs[k]
      positifs++
    }
  }
  const negatifs = indices.length - positifs
  if (positifs === 0 || negatifs === 0) return null
  return (sommeRangsPositifs - (positifs * (positifs + 1)) / 2) / (positifs * negatifs)
}

/** Ce que donnerait ce seuil-là — le même vocabulaire que le simulateur. */
export function pointDeFonctionnement(scores, y, seuil) {
  let vraisPositifs = 0
  let fauxPositifs = 0
  let fauxNegatifs = 0
  let vraisNegatifs = 0
  for (let i = 0; i < scores.length; i++) {
    const alerte = scores[i] >= seuil
    if (alerte && y[i] === 1) vraisPositifs++
    else if (alerte) fauxPositifs++
    else if (y[i] === 1) fauxNegatifs++
    else vraisNegatifs++
  }
  const alertes = vraisPositifs + fauxPositifs
  const reelles = vraisPositifs + fauxNegatifs
  const precision = alertes === 0 ? null : vraisPositifs / alertes
  const rappel = reelles === 0 ? null : vraisPositifs / reelles
  return {
    seuil,
    alertes,
    vraisPositifs,
    fauxPositifs,
    fauxNegatifs,
    vraisNegatifs,
    precision,
    rappel,
    f1:
      precision === null || rappel === null || precision + rappel === 0
        ? null
        : (2 * precision * rappel) / (precision + rappel),
    /** Combien de dossiers instruire pour trouver une fraude. */
    dossiersParFraude: vraisPositifs === 0 ? null : alertes / vraisPositifs,
  }
}

/**
 * Le modèle tient-il ses promesses de niveau, et pas seulement d'ordre ?
 *
 * Les dossiers sont rangés par tranche de probabilité annoncée, et l'on compare
 * ce que le modèle a promis à ce qui s'est produit. Une aire sous la courbe
 * excellente accompagnée d'une calibration fausse donne un classement juste et
 * des chiffres inutilisables — et c'est le chiffre, pas le rang, qui s'affiche
 * à côté d'un dossier.
 */
export function calibration(probabilites, y, tranches = 10) {
  const cases = Array.from({ length: tranches }, () => ({ n: 0, promis: 0, constate: 0 }))
  for (let i = 0; i < probabilites.length; i++) {
    const t = Math.min(Math.floor(probabilites[i] * tranches), tranches - 1)
    cases[t].n++
    cases[t].promis += probabilites[i]
    cases[t].constate += y[i]
  }
  return cases
    .map((c, t) => ({
      borneBasse: t / tranches,
      borneHaute: (t + 1) / tranches,
      effectif: c.n,
      promis: c.n === 0 ? null : c.promis / c.n,
      constate: c.n === 0 ? null : c.constate / c.n,
    }))
    .filter((c) => c.effectif > 0)
}

/** Écart moyen entre promesse et constat, pondéré par les effectifs. */
export function ecartDeCalibration(cases) {
  const total = cases.reduce((s, c) => s + c.effectif, 0)
  return cases.reduce(
    (s, c) => s + (c.effectif / total) * Math.abs(c.promis - c.constate),
    0
  )
}
