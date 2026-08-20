import { describe, expect, it } from "vitest"

import {
  dateISOSchema,
  niveauRisqueSchema,
  scoreSchema,
  statSchema,
  statutAlerteSchema,
} from "@/lib/schemas/commun"
import { alerteSchema } from "@/lib/schemas/alertes.schema"
import {
  decisionSchema,
  type Decision,
} from "@/lib/schemas/modifications.schema"

/*
  Le contrat, éprouvé par ce qu'il refuse.

  Un schéma qui n'a jamais rien rejeté n'est pas un contrat : c'est un type
  écrit deux fois. Ces tests portent donc surtout sur les refus — et sur la
  frontière délibérée entre ce que le contrat borne (un score, un statut) et ce
  qu'il laisse ouvert (un type de fraude), parce qu'un service de détection qui
  en introduit un nouveau ne doit pas faire échouer la validation du jeu entier.
*/

/** Le même objet, privé d'un champ : c'est ainsi qu'on éprouve une exigence. */
function sans<T extends object, K extends keyof T>(objet: T, cle: K): Omit<T, K> {
  const copie = { ...objet }
  Reflect.deleteProperty(copie, cle)
  return copie
}

describe("scoreSchema", () => {
  it("accepte les bornes", () => {
    expect(scoreSchema.safeParse(0).success).toBe(true)
    expect(scoreSchema.safeParse(100).success).toBe(true)
  })

  it("refuse hors de zéro à cent", () => {
    // Un score hors bornes venant de l'API est un défaut d'intégration, pas
    // une donnée à afficher.
    expect(scoreSchema.safeParse(-1).success).toBe(false)
    expect(scoreSchema.safeParse(101).success).toBe(false)
  })

  it("refuse ce qui n'est pas un nombre", () => {
    expect(scoreSchema.safeParse("94").success).toBe(false)
    expect(scoreSchema.safeParse(null).success).toBe(false)
  })
})

describe("dateISOSchema", () => {
  it("accepte une date ISO courte", () => {
    expect(dateISOSchema.safeParse("2026-05-20").success).toBe(true)
  })

  it("refuse un horodatage complet", () => {
    // Les dates sont stockées en jour ; mélanger les deux formats ferait
    // trébucher tous les tris textuels de la console.
    expect(dateISOSchema.safeParse("2026-05-20T06:12:00Z").success).toBe(false)
  })

  it("refuse une date écrite à la française", () => {
    expect(dateISOSchema.safeParse("20/05/2026").success).toBe(false)
  })

  it("dit le format attendu quand elle refuse", () => {
    const echec = dateISOSchema.safeParse("hier")
    expect(echec.success).toBe(false)
    expect(echec.error?.issues[0].message).toContain("AAAA-MM-JJ")
  })
})

describe("les énumérations d'affichage", () => {
  it("bornent le risque et le statut", () => {
    expect(niveauRisqueSchema.safeParse("Élevé").success).toBe(true)
    expect(niveauRisqueSchema.safeParse("Critique").success).toBe(false)
    expect(statutAlerteSchema.safeParse("À vérifier").success).toBe(true)
    expect(statutAlerteSchema.safeParse("Clos").success).toBe(false)
  })

  it("sont sensibles aux accents, comme les données", () => {
    // « Eleve » sans accent viendrait d'un jeu mal encodé : mieux vaut le voir
    // au chargement qu'à l'affichage, où il tomberait dans la couleur par défaut.
    expect(niveauRisqueSchema.safeParse("Eleve").success).toBe(false)
  })
})

describe("statSchema", () => {
  const stat = {
    id: "total",
    label: "Alertes",
    value: 247,
    valueFormate: "247",
    description: "sur le mois",
    color: "default" as const,
  }

  it("accepte une carte complète", () => {
    expect(statSchema.safeParse(stat).success).toBe(true)
  })

  it("borne la couleur aux quatre habillages connus", () => {
    // Une cinquième couleur tomberait dans le repli neutre sans qu'on le sache.
    expect(statSchema.safeParse({ ...stat, color: "danger" }).success).toBe(false)
  })

  it("exige la valeur mise en forme à côté de la valeur brute", () => {
    // Les deux voyagent ensemble : la mise en forme est faite à la source pour
    // que le serveur et le navigateur écrivent le même chiffre.
    expect(statSchema.safeParse(sans(stat, "valueFormate")).success).toBe(false)
  })
})

describe("alerteSchema", () => {
  const alerte = {
    id: "A-2026-0125",
    type: "Surfacturation",
    assure: "Moussa Diallo",
    etablissement: "Clinique Pasteur",
    montant: 2400000,
    montantFormate: "2 400 000 FCFA",
    scoreIA: 94,
    risque: "Élevé",
    date: "2026-05-20",
    dateFormate: "20/05/2026",
    statut: "En cours",
    assigneA: "analyste@fraudshield.com",
  }

  it("accepte une alerte du jeu réel", () => {
    expect(alerteSchema.safeParse(alerte).success).toBe(true)
  })

  it("laisse passer un type de fraude inconnu", () => {
    // Délibérément pas une énumération : le service de détection peut en
    // introduire de nouveaux, et un type inconnu doit s'afficher tel quel
    // plutôt que faire échouer la validation de tout le jeu.
    expect(
      alerteSchema.safeParse({ ...alerte, type: "Fraude au kilométrage" }).success
    ).toBe(true)
  })

  it("refuse un score hors bornes", () => {
    expect(alerteSchema.safeParse({ ...alerte, scoreIA: 120 }).success).toBe(false)
  })

  it("refuse un statut inventé", () => {
    expect(alerteSchema.safeParse({ ...alerte, statut: "Archivé" }).success).toBe(
      false
    )
  })
})

describe("decisionSchema", () => {
  const decision: Decision = {
    type: "fraude_confirmee",
    motif: "Trois actes facturés le même jour pour le même assuré.",
    acteur: "analyste@fraudshield.com",
    horodatage: "2026-08-19T09:12:00.000Z",
    statutAnterieur: "En cours",
  }

  it("accepte une décision complète", () => {
    expect(decisionSchema.safeParse(decision).success).toBe(true)
  })

  it("refuse une décision sans motif", () => {
    // Une décision sans motif n'est pas opposable à l'établissement mis en
    // cause, et ne vaut rien dans un contentieux.
    expect(decisionSchema.safeParse({ ...decision, motif: "" }).success).toBe(false)
  })

  it("refuse un motif fait d'espaces", () => {
    expect(decisionSchema.safeParse({ ...decision, motif: "   " }).success).toBe(
      false
    )
  })

  it("borne la longueur du motif", () => {
    const trop = { ...decision, motif: "a".repeat(1001) }
    expect(decisionSchema.safeParse(trop).success).toBe(false)
  })

  it("exige une adresse pour l'acteur", () => {
    // C'est le « qui » de la piste d'audit : un identifiant libre y serait
    // inexploitable.
    expect(decisionSchema.safeParse({ ...decision, acteur: "moi" }).success).toBe(
      false
    )
  })

  it("exige le statut antérieur", () => {
    // Revenir sur une décision doit rendre au dossier son état antérieur
    // plutôt qu'un état deviné.
    expect(
      decisionSchema.safeParse(sans(decision, "statutAnterieur")).success
    ).toBe(false)
  })

  describe("la règle croisée de la cause", () => {
    it("exige une cause sur un classement sans suite", () => {
      // Sans cause, le classement disparaît dans un statut et le modèle qui
      // l'a produit continue de produire le même.
      const echec = decisionSchema.safeParse({
        ...decision,
        type: "classee_sans_suite",
      })
      expect(echec.success).toBe(false)
      expect(echec.error?.issues[0].path).toEqual(["cause"])
      expect(echec.error?.issues[0].message).toContain("registre des faux positifs")
    })

    it("accepte un classement sans suite qualifié", () => {
      expect(
        decisionSchema.safeParse({
          ...decision,
          type: "classee_sans_suite",
          cause: "seuil_trop_bas",
        }).success
      ).toBe(true)
    })

    it("refuse une cause sur une fraude confirmée", () => {
      // Une cause de faux positif sur une fraude établie est une contradiction
      // dans les termes ; le registre s'en trouverait faussé.
      const echec = decisionSchema.safeParse({
        ...decision,
        cause: "seuil_trop_bas",
      })
      expect(echec.success).toBe(false)
      expect(echec.error?.issues[0].path).toEqual(["cause"])
    })

    it("refuse une cause sur une demande de pièce", () => {
      expect(
        decisionSchema.safeParse({
          ...decision,
          type: "piece_demandee",
          cause: "contexte_medical",
        }).success
      ).toBe(false)
    })

    it("refuse une cause inventée", () => {
      expect(
        decisionSchema.safeParse({
          ...decision,
          type: "classee_sans_suite",
          cause: "pas_envie",
        }).success
      ).toBe(false)
    })
  })
})
