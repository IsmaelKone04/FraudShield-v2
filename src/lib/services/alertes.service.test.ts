import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import jeu from "@/app/alertes/data.json"
import { alertesService } from "@/lib/services/alertes.service"

/*
  Le service des alertes, éprouvé sur le jeu réellement servi.

  Deux choses se jouent ici. D'abord que le jeu local respecte le contrat que
  l'API devra respecter — c'est tout l'intérêt de le valider au lieu de le lire
  tel quel. Ensuite que les deux contrôles croisés du service refusent bien de
  servir : ils portent sur des incohérences entre champs, chacun valide de son
  côté, qu'aucun schéma ne peut voir.

  Ces contrôles-là sont prouvés en les provoquant. Un contrôle qu'on n'a jamais
  vu échouer n'est pas un contrôle, c'est un bloc de code qu'on croit exécuté :
  le jeu est donc abîmé délibérément en mémoire, et le refus vérifié.
*/

/**
 * Recharge le service avec un jeu de données trafiqué.
 *
 * Le service importe le JSON dynamiquement ; il suffit de remplacer le module
 * avant l'import pour lui servir autre chose. Rien n'est touché sur le disque.
 *
 * `resetModules` reconstruit toute la chaîne d'imports, `ApiError` compris : la
 * classe levée par ce service-là n'est plus celle importée en tête de fichier,
 * et `toThrow(ApiError)` échouerait sur une erreur pourtant correcte. Les
 * refus provoqués se vérifient donc sur le message — ce qui est de toute façon
 * ce qu'on veut éprouver : une erreur d'intégration qui ne nomme pas le fautif
 * ne fait que déplacer l'enquête.
 */
async function serviceAvec(modifier: (jeu: typeof import("@/app/alertes/data.json")) => void) {
  const copie = structuredClone(jeu)
  modifier(copie)
  vi.resetModules()
  vi.doMock("@/app/alertes/data.json", () => ({ default: copie }))
  return (await import("@/lib/services/alertes.service")).alertesService
}

afterEach(() => {
  vi.doUnmock("@/app/alertes/data.json")
  vi.resetModules()
})

describe("le jeu local", () => {
  it("respecte le contrat, sans quoi rien de ce qui suit ne vaut", async () => {
    await expect(alertesService.getAlertes()).resolves.toBeInstanceOf(Array)
  })

  it("donne un dossier complet à chaque alerte de la liste", async () => {
    // Une alerte sans complément afficherait un dossier vide plutôt qu'une
    // erreur : le service refuse plutôt que d'inventer.
    const alertes = await alertesService.getAlertes()
    for (const alerte of alertes) {
      await expect(alertesService.getAlerte(alerte.id)).resolves.not.toBeNull()
    }
  })

  it("porte quatre indicateurs de tête", async () => {
    await expect(alertesService.getStats()).resolves.toHaveLength(4)
  })
})

describe("getAlerte", () => {
  it("assemble le résumé et son complément", async () => {
    // Le jeu local ne recopie pas l'un dans l'autre, de sorte qu'ils ne
    // puissent pas diverger : le dossier est assemblé à la lecture.
    const dossier = await alertesService.getAlerte("A-2026-0125")
    expect(dossier?.assure).toBe("Moussa Diallo")
    expect(dossier?.actes.length).toBeGreaterThan(0)
  })

  it("rend null sur un identifiant inconnu, sans lever", async () => {
    // Un identifiant inconnu est une adresse fautive, pas un défaut
    // d'intégration : l'écran répond « introuvable », il ne plante pas.
    await expect(alertesService.getAlerte("A-0000-0000")).resolves.toBeNull()
  })

  it("refuse de servir une alerte dont le complément manque", async () => {
    // Sans ce contrôle, l'écran afficherait un dossier vide : le service
    // refuse plutôt que de servir la moitié d'un dossier.
    const service = await serviceAvec((copie) => {
      delete (copie.details as Record<string, unknown>)["A-2026-0125"]
    })
    await expect(service.getAlerte("A-2026-0125")).rejects.toThrow(
      /A-2026-0125.*complément|complément.*A-2026-0125/
    )
  })
})

describe("le total des actes", () => {
  it("redonne le montant de l'alerte sur tous les dossiers", async () => {
    const alertes = await alertesService.getAlertes()
    for (const alerte of alertes) {
      const dossier = await alertesService.getAlerte(alerte.id)
      const total = dossier!.actes.reduce((somme, acte) => somme + acte.montant, 0)
      expect(total).toBe(dossier!.montant)
    }
  })

  it("est refusé quand il ne correspond plus", async () => {
    // Chaque ligne reste valide isolément ; l'écran afficherait pourtant un
    // total différent du montant annoncé juste au-dessus.
    const service = await serviceAvec((copie) => {
      copie.details["A-2026-0125"].actes[0].montant += 1
    })
    await expect(service.getAlerte("A-2026-0125")).rejects.toThrow(
      /total des actes/
    )
  })
})

describe("la décomposition du score", () => {
  it("referme le score sur tous les dossiers", async () => {
    // La propriété qui fait toute la valeur d'une explication : la valeur de
    // base plus les contributions doit redonner le score, sinon l'explication
    // explique un autre chiffre que celui affiché.
    const alertes = await alertesService.getAlertes()
    for (const alerte of alertes) {
      const dossier = await alertesService.getAlerte(alerte.id)
      const { valeurDeBase, facteurs } = dossier!.explication
      const total = facteurs.reduce((s, f) => s + f.contribution, valeurDeBase)
      expect(total).toBe(dossier!.scoreIA)
    }
  })

  it("est refusée quand elle ne referme plus le score", async () => {
    const service = await serviceAvec((copie) => {
      copie.details["A-2026-0125"].explication.facteurs[0].contribution += 1
    })
    await expect(service.getAlerte("A-2026-0125")).rejects.toThrow(/facteurs/)
  })

  it("est refusée quand c'est la valeur de base qui a bougé", async () => {
    const service = await serviceAvec((copie) => {
      copie.details["A-2026-0125"].explication.valeurDeBase += 5
    })
    await expect(service.getAlerte("A-2026-0125")).rejects.toThrow(
      /alors que le score est de 94/
    )
  })
})

describe("getDernieres", () => {
  it("rend les plus récentes en premier", async () => {
    const dernieres = await alertesService.getDernieres()
    const dates = dernieres.map((a) => a.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it("s'arrête à la limite demandée", async () => {
    await expect(alertesService.getDernieres(3)).resolves.toHaveLength(3)
  })

  it("ne modifie pas la liste servie par ailleurs", async () => {
    // `sort` trie en place : sans copie, l'ordre du tableau des alertes
    // changerait dès que le tableau de bord s'affiche.
    await alertesService.getDernieres()
    const alertes = await alertesService.getAlertes()
    expect(alertes.map((a) => a.id)).toEqual(jeu.alertes.map((a) => a.id))
  })
})

describe("le mode démonstration", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("est actif tant que rien ne dit le contraire", async () => {
    // `USE_MOCK` ne bascule que sur un « false » explicite : une variable
    // absente ne doit pas envoyer la console interroger une API inexistante.
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "")
    const { USE_MOCK } = await import("@/lib/api/client")
    expect(USE_MOCK).toBe(true)
    vi.unstubAllEnvs()
  })

  it("se désactive sur « false », et sur lui seul", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false")
    const { USE_MOCK } = await import("@/lib/api/client")
    expect(USE_MOCK).toBe(false)
    vi.unstubAllEnvs()
  })
})
