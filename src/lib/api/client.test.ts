import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { ApiError, chargerMock, fetchFromAPI, valider } from "@/lib/api/client"

/*
  Le point de passage obligé des données, jeu local ou API réelle. C'est le
  filet du basculement : sans lui, un champ renommé côté détection ne se
  manifeste que plus tard, sous la forme d'un `undefined` au milieu d'un rendu,
  bien plus difficile à relier à sa cause.

  Les tests portent donc autant sur le refus que sur le message : une erreur
  d'intégration qui ne dit pas quel champ pèche ne fait que déplacer l'enquête.
*/

const schema = z.object({
  id: z.string(),
  score: z.number().int().min(0).max(100),
})

describe("valider", () => {
  it("laisse passer une donnée conforme", () => {
    expect(valider(schema, { id: "A-1", score: 80 }, "test")).toEqual({
      id: "A-1",
      score: 80,
    })
  })

  it("lève une ApiError plutôt qu'une erreur de Zod", () => {
    // L'appelant n'a pas à connaître Zod : c'est un défaut d'intégration.
    expect(() => valider(schema, { id: "A-1" }, "test")).toThrow(ApiError)
  })

  it("nomme le champ fautif dans le message", () => {
    try {
      valider(schema, { id: "A-1", score: 140 }, "alertes/data.json")
      expect.unreachable("la validation aurait dû échouer")
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(ApiError)
      expect((erreur as ApiError).message).toContain("score")
    }
  })

  it("nomme l'origine de la donnée", () => {
    // Sans elle, on sait qu'une charge utile est mauvaise sans savoir laquelle.
    try {
      valider(schema, {}, "alertes/data.json")
      expect.unreachable("la validation aurait dû échouer")
    } catch (erreur) {
      expect((erreur as ApiError).message).toContain("alertes/data.json")
      expect((erreur as ApiError).endpoint).toBe("alertes/data.json")
    }
  })

  it("conserve l'erreur d'origine pour le diagnostic", () => {
    try {
      valider(schema, {}, "test")
      expect.unreachable("la validation aurait dû échouer")
    } catch (erreur) {
      expect((erreur as ApiError).cause).toBeInstanceOf(z.ZodError)
    }
  })

  it("s'arrête à cinq griefs plutôt que de dérouler la charge entière", () => {
    const large = z.object(
      Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [`champ${i}`, z.string()])
      )
    )
    try {
      valider(large, {}, "test")
      expect.unreachable("la validation aurait dû échouer")
    } catch (erreur) {
      const message = (erreur as ApiError).message
      expect(message.split(" · ")).toHaveLength(5)
    }
  })

  it("désigne la racine quand le grief ne porte sur aucun champ", () => {
    try {
      valider(z.array(schema), { pas: "un tableau" }, "test")
      expect.unreachable("la validation aurait dû échouer")
    } catch (erreur) {
      expect((erreur as ApiError).message).toContain("(racine)")
    }
  })
})

describe("chargerMock", () => {
  it("valide le jeu local au même titre qu'une réponse d'API", async () => {
    // Ce n'est pas superflu : c'est ce qui garantit que le jeu fictif respecte
    // le contrat que l'API devra respecter. Sans cela, la bascule révélerait
    // d'un coup des écarts qu'on aurait pu voir dès le développement.
    const charger = async () => ({ default: { id: "A-1", score: 200 } })
    await expect(chargerMock(charger, schema, "jeu-local")).rejects.toThrow(ApiError)
  })

  it("rend la donnée validée quand le jeu est conforme", async () => {
    const charger = async () => ({ default: { id: "A-1", score: 70 } })
    await expect(chargerMock(charger, schema, "jeu-local")).resolves.toEqual({
      id: "A-1",
      score: 70,
    })
  })
})

describe("fetchFromAPI", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const reponse = (corps: unknown, init: ResponseInit = {}) =>
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(corps), {
        status: 200,
        headers: { "Content-Type": "application/json" },
        ...init,
      })
    )

  it("valide la réponse comme le reste", async () => {
    vi.stubGlobal("fetch", reponse({ id: "A-1", score: 55 }))
    await expect(fetchFromAPI("/alertes/A-1", schema)).resolves.toEqual({
      id: "A-1",
      score: 55,
    })
  })

  it("refuse une réponse hors contrat", async () => {
    vi.stubGlobal("fetch", reponse({ id: "A-1" }))
    await expect(fetchFromAPI("/alertes/A-1", schema)).rejects.toThrow(ApiError)
  })

  it("distingue un service injoignable d'une réponse mauvaise", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    )
    try {
      await fetchFromAPI("/alertes", schema)
      expect.unreachable("l'appel aurait dû échouer")
    } catch (erreur) {
      expect((erreur as ApiError).message).toContain("injoignable")
      expect((erreur as ApiError).cause).toBeInstanceOf(Error)
    }
  })

  it("rapporte le code HTTP quand le service répond en erreur", async () => {
    vi.stubGlobal("fetch", reponse({}, { status: 503 }))
    try {
      await fetchFromAPI("/alertes", schema)
      expect.unreachable("l'appel aurait dû échouer")
    } catch (erreur) {
      expect((erreur as ApiError).message).toContain("503")
      expect((erreur as ApiError).endpoint).toBe("/alertes")
    }
  })
})
