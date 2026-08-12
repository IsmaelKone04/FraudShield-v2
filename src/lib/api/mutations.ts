import { API_URL, ApiError, USE_MOCK } from "./client"
import type {
  ModificationAlerte,
  ModificationInvestigation,
} from "@/lib/schemas/modifications.schema"
import type { ParametresSysteme } from "@/lib/schemas/parametres.schema"

/**
 * Écritures vers le service de détection.
 *
 * Pendant du client de lecture : un seul endroit décide si l'écriture part sur le
 * réseau ou reste locale. En mode démonstration (`USE_MOCK`), la fonction ne fait
 * rien et le store conserve la modification dans le navigateur — c'est
 * volontairement le seul mécanisme de persistance tant qu'aucune API n'existe.
 */

/** Champs modifiables, à l'exclusion de l'horodatage posé par le store. */
export type PatchAlerte = Partial<Omit<ModificationAlerte, "modifieLe">>
export type PatchInvestigation = Partial<
  Omit<ModificationInvestigation, "modifieLe">
>
/** Réglages modifiés, à l'exclusion de ceux laissés à la valeur du serveur. */
export type PatchParametres = Partial<ParametresSysteme>

async function envoyer(endpoint: string, corps: unknown): Promise<void> {
  if (USE_MOCK) return

  let reponse: Response
  try {
    reponse = await fetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    })
  } catch (erreur) {
    throw new ApiError(
      `Service de détection injoignable (${endpoint})`,
      endpoint,
      erreur
    )
  }

  if (!reponse.ok) {
    throw new ApiError(
      `Le service de détection a refusé la modification — ${reponse.status} (${endpoint})`,
      endpoint
    )
  }
}

export const envoyerModificationAlerte = (
  id: string,
  patch: PatchAlerte
): Promise<void> => envoyer(`/alertes/${encodeURIComponent(id)}`, patch)

export const envoyerModificationInvestigation = (
  id: string,
  patch: PatchInvestigation
): Promise<void> => envoyer(`/investigations/${encodeURIComponent(id)}`, patch)

/** Les réglages sont uniques pour la console : pas d'identifiant dans le chemin. */
export const envoyerModificationParametres = (
  patch: PatchParametres
): Promise<void> => envoyer("/parametres/systeme", patch)
