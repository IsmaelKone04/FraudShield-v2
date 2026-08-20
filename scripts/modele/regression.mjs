/**
 * Régression logistique pénalisée, par descente de gradient.
 *
 * **Pourquoi celle-là, et pas un gradient boosting.** Le contrat de la console
 * exige qu'une explication *referme* le score : valeur de base plus
 * contributions doit redonner exactement le chiffre affiché, et le service
 * refuse de servir un dossier où ce n'est pas le cas. Une régression logistique
 * satisfait cette exigence par construction — le logit est une somme, il n'y a
 * rien à approcher. Un modèle d'ensemble ne l'aurait satisfaite qu'au travers
 * de valeurs de Shapley, c'est-à-dire d'une approximation coûteuse d'une
 * propriété qu'on obtient ici gratuitement.
 *
 * Ce n'est donc pas un pis-aller faute de bibliothèque : c'est le modèle que
 * l'exigence d'explication désigne.
 */

const sigmoide = (z) => 1 / (1 + Math.exp(-z))

/** Logit d'une ligne encodée : le biais, plus la somme des contributions. */
export function logit(vecteur, poids, biais) {
  let z = biais
  for (let i = 0; i < vecteur.length; i++) z += poids[i] * vecteur[i]
  return z
}

export function probabilite(vecteur, modele) {
  return sigmoide(logit(vecteur, modele.poids, modele.biais))
}

/**
 * Apprentissage par descente de gradient sur la vraisemblance pénalisée.
 *
 * `poidsClassePositive` corrige le déséquilibre : à onze pour cent de fraudes,
 * un modèle qui répond « non » à tout se trompe une fois sur neuf et paraît
 * excellent. Peser chaque fraude à hauteur du déséquilibre revient à lui
 * demander de se tromper aussi peu dans un sens que dans l'autre.
 *
 * La pénalité `l2` ne porte pas sur le biais : celui-ci n'exprime que le taux
 * de base, et le tirer vers zéro reviendrait à affirmer que la fraude est aussi
 * fréquente que la régularité.
 */
export function entrainer(X, y, options = {}) {
  const {
    pas = 0.1,
    iterations = 400,
    l2 = 1,
    poidsClassePositive = null,
    surveiller = null,
  } = options

  const n = X.length
  const d = X[0].length
  const poids = new Array(d).fill(0)
  let biais = 0

  const positifs = y.reduce((s, v) => s + v, 0)
  const poidsPositif =
    poidsClassePositive ?? (positifs === 0 ? 1 : (n - positifs) / positifs)

  for (let iteration = 0; iteration < iterations; iteration++) {
    const gradient = new Array(d).fill(0)
    let gradientBiais = 0
    let poidsTotal = 0

    for (let i = 0; i < n; i++) {
      const p = sigmoide(logit(X[i], poids, biais))
      const w = y[i] === 1 ? poidsPositif : 1
      const erreur = w * (p - y[i])
      poidsTotal += w
      gradientBiais += erreur
      const ligne = X[i]
      for (let j = 0; j < d; j++) gradient[j] += erreur * ligne[j]
    }

    biais -= (pas * gradientBiais) / poidsTotal
    for (let j = 0; j < d; j++) {
      poids[j] -= pas * (gradient[j] / poidsTotal + (l2 * poids[j]) / n)
    }

    if (surveiller && (iteration + 1) % 50 === 0) {
      surveiller(iteration + 1, perte(X, y, { poids, biais }, poidsPositif, l2))
    }
  }

  return { poids, biais, poidsPositif }
}

/** Log-vraisemblance négative pondérée, pénalité comprise. */
export function perte(X, y, modele, poidsPositif, l2) {
  let somme = 0
  let poidsTotal = 0
  for (let i = 0; i < X.length; i++) {
    const p = Math.min(Math.max(probabilite(X[i], modele), 1e-12), 1 - 1e-12)
    const w = y[i] === 1 ? poidsPositif : 1
    somme += -w * (y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p))
    poidsTotal += w
  }
  const penalite =
    (l2 / (2 * X.length)) * modele.poids.reduce((s, b) => s + b * b, 0)
  return somme / poidsTotal + penalite
}

/**
 * Recale les probabilités sur le taux de base réel.
 *
 * La pondération de la classe positive fait raisonner le modèle comme si la
 * fraude était aussi fréquente que la régularité : ses probabilités sont
 * justes en *ordre* mais fausses en *niveau*. Retrancher le logarithme du
 * rapport de pondération au biais les ramène à l'échelle du portefeuille — un
 * dossier annoncé à quatre-vingts pour cent doit l'être parce que quatre
 * dossiers sur cinq qui lui ressemblent sont frauduleux, pas parce que le
 * modèle a été entraîné à surestimer.
 */
export function recalibrer(modele) {
  return {
    poids: modele.poids,
    biais: modele.biais - Math.log(modele.poidsPositif),
    poidsPositif: 1,
  }
}
