import { describe, expect, it } from "vitest"

import {
  ecartRelatif,
  formaterDate,
  formaterHeure,
  formaterHorodatage,
  francs,
  pourcentage,
  separerMilliers,
  signe,
  valeurAvecUnite,
} from "@/lib/formats"

/*
  Ces fonctions sont écrites à la main pour une raison précise : `toLocaleString`
  dépend de la version d'ICU embarquée, qui n'est pas la même dans Node et dans
  le navigateur. Le rendu servi et le premier rendu client diffèreraient — un
  avertissement d'hydratation, et un chiffre qui change sous les yeux du
  lecteur. Les tests portent donc sur la sortie exacte, caractère par
  caractère : c'est tout l'intérêt de ne pas déléguer.
*/

describe("separerMilliers", () => {
  it("laisse les nombres de moins de quatre chiffres intacts", () => {
    expect(separerMilliers(0)).toBe("0")
    expect(separerMilliers(7)).toBe("7")
    expect(separerMilliers(999)).toBe("999")
  })

  it("sépare par groupes de trois, en partant de la droite", () => {
    expect(separerMilliers(1000)).toBe("1 000")
    expect(separerMilliers(12345)).toBe("12 345")
    expect(separerMilliers(128400000)).toBe("128 400 000")
  })

  it("sépare avec une espace ordinaire, comme le jeu de données", () => {
    // Une espace insécable (U+00A0) est ce que produirait `toLocaleString`
    // en français. Le jeu de données, lui, contient des espaces ordinaires :
    // un mélange des deux ferait échouer toute recherche textuelle.
    expect(separerMilliers(1000)).toContain(" ")
    expect(separerMilliers(1000)).not.toContain(" ")
  })

  it("arrondit plutôt que d'écrire une décimale", () => {
    expect(separerMilliers(1234.6)).toBe("1 235")
  })
})

describe("francs", () => {
  it("suffixe le montant de son unité", () => {
    expect(francs(963000)).toBe("963 000 FCFA")
  })

  it("écrit zéro plutôt que rien", () => {
    expect(francs(0)).toBe("0 FCFA")
  })
})

describe("les horodatages", () => {
  const iso = "2026-05-20T06:12:37.000Z"

  it("découpe la date sans convertir de fuseau", () => {
    // Les horodatages sont en UTC, qui est aussi l'heure de Dakar. Passer par
    // `Date` ferait dépendre le résultat du fuseau de la machine — la même
    // alerte serait datée du 19 sur un poste en Amérique.
    expect(formaterDate(iso)).toBe("20/05/2026")
  })

  it("découpe l'heure à la minute", () => {
    expect(formaterHeure(iso)).toBe("06:12")
  })

  it("assemble les deux pour l'affichage", () => {
    expect(formaterHorodatage(iso)).toBe("20/05/2026 à 06:12")
  })

  it("donne le même résultat quel que soit le fuseau de la machine", () => {
    const avant = process.env.TZ
    try {
      process.env.TZ = "America/Los_Angeles"
      expect(formaterDate(iso)).toBe("20/05/2026")
      process.env.TZ = "Pacific/Kiritimati"
      expect(formaterDate(iso)).toBe("20/05/2026")
    } finally {
      process.env.TZ = avant
    }
  })
})

describe("valeurAvecUnite", () => {
  it("met en forme les francs comme partout ailleurs", () => {
    expect(valeurAvecUnite(2400000, "FCFA")).toBe("2 400 000 FCFA")
  })

  it("accepte une autre unité sans la traiter comme une monnaie", () => {
    expect(valeurAvecUnite(10, "actes")).toBe("10 actes")
  })
})

describe("signe", () => {
  it("écrit toujours le signe, y compris devant un gain", () => {
    // C'est l'information : « 34 » ne dit pas si le chiffre a monté ou baissé.
    expect(signe(34)).toBe("+34")
  })

  it("compte zéro comme une absence de baisse", () => {
    expect(signe(0)).toBe("+0")
  })

  it("utilise le signe moins typographique, pas le trait d'union", () => {
    expect(signe(-3)).toBe("−3")
    expect(signe(-3)).not.toBe("-3")
  })
})

describe("pourcentage", () => {
  it("arrondit à l'entier par défaut", () => {
    expect(pourcentage(0.25)).toBe("25 %")
    expect(pourcentage(0.324)).toBe("32 %")
  })

  it("écrit la virgule française quand on demande des décimales", () => {
    expect(pourcentage(0.324, 1)).toBe("32,4 %")
  })

  it("distingue « aucun dossier tranché » de « précision nulle »", () => {
    // `0 %` affirmerait que le modèle s'est trompé à chaque fois. Un mois sans
    // dossier tranché n'a pas une précision nulle : il n'en a pas.
    expect(pourcentage(null)).toBe("—")
    expect(pourcentage(0)).toBe("0 %")
  })
})

describe("ecartRelatif", () => {
  it("rapporte l'écart à la référence, arrondi au point", () => {
    expect(ecartRelatif(254000, 100000)).toBe("+154 %")
  })

  it("écrit une baisse avec le signe moins", () => {
    expect(ecartRelatif(80, 100)).toBe("−20 %")
  })

  it("refuse de rapporter un écart à zéro", () => {
    // « +∞ % » n'aiderait personne : l'appelant affiche autre chose.
    expect(ecartRelatif(500, 0)).toBeNull()
  })

  it("donne zéro pour deux valeurs égales", () => {
    expect(ecartRelatif(100, 100)).toBe("+0 %")
  })
})
