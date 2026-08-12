import { z } from "zod"
import { ApiError, chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import { COMPTES } from "@/lib/utilisateurs"
import {
  modeleSchema,
  parametresDataSchema,
  parametresSystemeSchema,
  utilisateurSchema,
  type Modele,
  type ParametresData,
  type ParametresSysteme,
  type Utilisateur,
} from "@/lib/schemas/parametres.schema"

const ORIGINE = "parametres/data.json"

const chargerJeuLocal = (): Promise<ParametresData> =>
  chargerMock(
    () => import("@/app/parametres/data.json"),
    parametresDataSchema,
    ORIGINE
  )

/**
 * Vérifie que l'annuaire du jeu local décrit exactement les comptes de la console.
 *
 * L'écran des paramètres listait six agents en `@fraudshield.sn` quand
 * `src/lib/utilisateurs.ts` en déclarait trois en `@fraudshield.com` : deux
 * annuaires disjoints, donc un sélecteur d'assignation qui proposait des personnes
 * incapables de se connecter. Le schéma Zod ne pouvait rien y voir — les deux
 * listes étaient valides, seulement contradictoires.
 *
 * Ce contrôle ne s'applique qu'au jeu local : en cible, l'API est l'autorité sur
 * les comptes et `COMPTES` n'est plus que le répertoire de démonstration.
 */
function verifierCoherenceAnnuaire(utilisateurs: Utilisateur[]): Utilisateur[] {
  const attendu = COMPTES.map((c) =>
    [c.id, c.nom, c.email, c.roleLibelle].join(" · ")
  ).sort()
  const trouve = utilisateurs
    .map((u) => [u.id, u.nom, u.email, u.role].join(" · "))
    .sort()

  if (attendu.join(" | ") !== trouve.join(" | ")) {
    throw new ApiError(
      "L'annuaire du jeu local diverge des comptes de la console " +
        `(src/lib/utilisateurs.ts) — attendu : ${attendu.join(" | ")} ; ` +
        `trouvé : ${trouve.join(" | ")}`,
      ORIGINE
    )
  }
  return utilisateurs
}

export const parametresService = {
  async getUtilisateurs(): Promise<Utilisateur[]> {
    if (USE_MOCK) {
      return verifierCoherenceAnnuaire((await chargerJeuLocal()).utilisateurs)
    }
    return fetchFromAPI("/parametres/utilisateurs", z.array(utilisateurSchema))
  },

  async getModeles(): Promise<Modele[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).modeles
    return fetchFromAPI("/parametres/modeles", z.array(modeleSchema))
  },

  async getParametresSysteme(): Promise<ParametresSysteme> {
    if (USE_MOCK) return (await chargerJeuLocal()).parametresSysteme
    return fetchFromAPI("/parametres/systeme", parametresSystemeSchema)
  },
}
