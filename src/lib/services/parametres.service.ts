import { z } from "zod"
import { chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
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

export const parametresService = {
  async getUtilisateurs(): Promise<Utilisateur[]> {
    if (USE_MOCK) return (await chargerJeuLocal()).utilisateurs
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
