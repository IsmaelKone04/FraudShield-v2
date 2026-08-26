import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaireDecisionsNonQualifiees } from "@/lib/store/modifications.store"

/*
  La migration du contenu local, v1 → v2.

  C'est le seul endroit du projet qui puisse détruire le travail d'un
  utilisateur. Une décision mal reprise, et ce sont tous les statuts, toutes les
  assignations et toutes les notes enregistrées dans ce navigateur qui partent
  avec — sans message, sans recours, sans copie ailleurs.

  Le classement sans suite a fini par exiger une cause (ADR-018). Les décisions
  enregistrées avant, dépourvues de cause, ne satisfont plus le contrat. Plutôt
  que de laisser la validation jeter l'intégralité du contenu, la migration
  défait **ces décisions-là** et conserve tout le reste. Ces tests éprouvent les
  deux moitiés de cette phrase, et surtout la seconde.
*/

/** Une alerte modifiée, telle qu'une version 1 pouvait l'écrire. */
const alerte = (extra: Record<string, unknown> = {}) => ({
  statut: "Résolu",
  assigneA: "analyste@fraudshield.com",
  modifieLe: "2026-08-19T09:12:00.000Z",
  ...extra,
})

const classementSansCause = {
  type: "classee_sans_suite",
  motif: "Le dossier est régulier.",
  acteur: "analyste@fraudshield.com",
  horodatage: "2026-08-19T09:12:00.000Z",
  statutAnterieur: "En cours",
}

beforeEach(() => {
  // La migration prévient sur la console quand elle défait une décision. Le
  // silence de la sortie ne doit pas être confondu avec l'absence d'avertissement.
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ce que la migration défait", () => {
  it("annule un classement sans suite dépourvu de cause", () => {
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: classementSansCause }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].decision).toBeUndefined()
  })

  it("rend au dossier le statut qu'il portait avant la décision", () => {
    // Et non un statut deviné : c'est exactement pour cela que
    // `statutAnterieur` est conservé au moment de décider.
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: classementSansCause }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].statut).toBe("En cours")
  })

  it("prévient sur la console, en nommant le dossier", () => {
    // Une décision défaite en silence est une décision perdue : l'analyste doit
    // pouvoir savoir laquelle reprendre.
    defaireDecisionsNonQualifiees({
      alertes: { "A-2026-0125": alerte({ decision: classementSansCause }) },
    })
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain("A-2026-0125")
  })

  it("n'invente pas de statut quand l'antérieur manque", () => {
    // Un contenu modifié à la main peut ne pas en porter. La migration défait
    // alors la décision sans toucher au statut enregistré : celui-ci reste
    // celui que le stockage contenait. C'est le choix prudent — deviner
    // « En cours » rouvrirait un dossier que l'analyste croyait clos, et
    // rouvrir sans le dire est pire que laisser une incohérence visible.
    const sansAnterieur = { ...classementSansCause }
    Reflect.deleteProperty(sansAnterieur, "statutAnterieur")
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: sansAnterieur, statut: "Résolu" }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].decision).toBeUndefined()
    expect(apres.alertes["A-1"].statut).toBe("Résolu")
  })
})

describe("ce que la migration conserve — la moitié qui compte", () => {
  it("garde un classement sans suite déjà qualifié", () => {
    const qualifie = { ...classementSansCause, cause: "seuil_trop_bas" }
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: qualifie }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].decision).toEqual(qualifie)
  })

  it("garde une fraude confirmée, qui n'a jamais eu à porter de cause", () => {
    const confirmee = { ...classementSansCause, type: "fraude_confirmee" }
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: confirmee }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].decision).toEqual(confirmee)
  })

  it("garde une demande de pièce", () => {
    const piece = { ...classementSansCause, type: "piece_demandee" }
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: piece }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].decision).toEqual(piece)
  })

  it("garde les statuts et assignations des dossiers non décidés", () => {
    // C'est le travail que la migration ne doit surtout pas emporter.
    const apres = defaireDecisionsNonQualifiees({
      alertes: {
        "A-1": alerte({ decision: classementSansCause }),
        "A-2": alerte({ statut: "À vérifier", assigneA: "chef@fraudshield.com" }),
        "A-3": alerte({ statut: "En cours", assigneA: null }),
      },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-2"]).toEqual(
      alerte({ statut: "À vérifier", assigneA: "chef@fraudshield.com" })
    )
    expect(apres.alertes["A-3"]).toEqual(alerte({ statut: "En cours", assigneA: null }))
  })

  it("garde les champs voisins du dossier dont la décision est défaite", () => {
    // Seule la décision part. La note, l'assignation et l'horodatage restent.
    const apres = defaireDecisionsNonQualifiees({
      alertes: {
        "A-1": alerte({
          decision: classementSansCause,
          note: "Relance de l'établissement le 12 août.",
        }),
      },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].note).toBe("Relance de l'établissement le 12 août.")
    expect(apres.alertes["A-1"].assigneA).toBe("analyste@fraudshield.com")
    expect(apres.alertes["A-1"].modifieLe).toBe("2026-08-19T09:12:00.000Z")
  })

  it("ne touche ni aux investigations ni aux paramètres", () => {
    const contenu = {
      alertes: { "A-1": alerte({ decision: classementSansCause }) },
      investigations: { "INV-1": { statut: "En cours", modifieLe: "2026-08-19T09:12:00.000Z" } },
      parametres: { valeurs: { seuilAlerte: 75 }, modifieLe: "2026-08-19T09:12:00.000Z" },
    }
    const apres = defaireDecisionsNonQualifiees(contenu) as typeof contenu

    expect(apres.investigations).toEqual(contenu.investigations)
    expect(apres.parametres).toEqual(contenu.parametres)
  })

  it("ne prévient pas quand elle n'a rien défait", () => {
    defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ statut: "En cours" }) },
    })
    expect(console.warn).not.toHaveBeenCalled()
  })
})

describe("devant un contenu abîmé", () => {
  it("rend tel quel ce qui n'est pas un objet", () => {
    // La migration s'exécute **avant** la validation : elle est le premier code
    // à toucher un contenu dont rien ne garantit la forme.
    expect(defaireDecisionsNonQualifiees(null)).toBeNull()
    expect(defaireDecisionsNonQualifiees("du texte")).toBe("du texte")
    expect(defaireDecisionsNonQualifiees(42)).toBe(42)
    expect(defaireDecisionsNonQualifiees(undefined)).toBeUndefined()
  })

  it("rend tel quel un contenu dont les alertes ne sont pas un objet", () => {
    const contenu = { alertes: "cassé" }
    expect(defaireDecisionsNonQualifiees(contenu)).toBe(contenu)
    expect(defaireDecisionsNonQualifiees({ alertes: null })).toEqual({ alertes: null })
  })

  it("traverse une entrée d'alerte qui n'est pas un objet", () => {
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": null, "A-2": "cassé", "A-3": alerte() },
    }) as { alertes: Record<string, unknown> }

    expect(apres.alertes["A-1"]).toBeNull()
    expect(apres.alertes["A-2"]).toBe("cassé")
    expect(apres.alertes["A-3"]).toEqual(alerte())
  })

  it("traverse une décision qui n'est pas un objet", () => {
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: "cassée" }) },
    }) as { alertes: Record<string, Record<string, unknown>> }

    expect(apres.alertes["A-1"].decision).toBe("cassée")
  })

  it("tient un contenu vide", () => {
    expect(defaireDecisionsNonQualifiees({ alertes: {} })).toEqual({ alertes: {} })
    expect(defaireDecisionsNonQualifiees({})).toEqual({})
  })
})

describe("la migration ne recopie pas ce qu'elle ne change pas", () => {
  it("laisse les objets d'alerte intacts, à l'identité près", () => {
    // Un test de forme, mais qui dit quelque chose : la migration reconstruit
    // uniquement ce qu'elle défait. Si elle recopiait tout, une évolution du
    // format ferait silencieusement disparaître les champs qu'elle ignore.
    const intacte = alerte({ statut: "En cours" })
    const apres = defaireDecisionsNonQualifiees({
      alertes: { "A-1": alerte({ decision: classementSansCause }), "A-2": intacte },
    }) as { alertes: Record<string, unknown> }

    expect(apres.alertes["A-2"]).toBe(intacte)
  })
})
