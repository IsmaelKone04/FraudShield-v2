import type { z } from "zod"

/**
 * Accès aux données : jeu local ou API de détection.
 *
 * Un seul endroit décide d'où viennent les données, et un seul endroit vérifie
 * qu'elles ont la forme attendue. Les services de `src/lib/services/` s'appuient
 * dessus ; aucun composant n'appelle `fetch` directement.
 */

/** Vrai tant que `NEXT_PUBLIC_USE_MOCK` ne vaut pas explicitement `"false"`. */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false"

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

/** Durée de mise en cache des réponses de l'API, en secondes. */
const REVALIDATE_SECONDS = 60

/**
 * Erreur d'intégration à l'API : réseau, statut HTTP, ou charge utile non conforme.
 * Elle porte de quoi diagnostiquer sans avoir à relire les journaux du serveur.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Valide une donnée contre son schéma, ou lève une `ApiError` explicite.
 *
 * C'est le filet du basculement vers l'API réelle : sans lui, un champ manquant
 * ou renommé côté backend ne se manifeste que plus tard, sous la forme d'un
 * `undefined` au milieu du rendu — bien plus difficile à relier à sa cause.
 */
export function valider<T>(
  schema: z.ZodType<T>,
  donnees: unknown,
  origine: string
): T {
  const resultat = schema.safeParse(donnees)
  if (resultat.success) return resultat.data

  const details = resultat.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
    .join(" · ")

  throw new ApiError(
    `Données non conformes au contrat attendu (${origine}) — ${details}`,
    origine,
    resultat.error
  )
}

/**
 * Charge un jeu de données local et le valide au même titre qu'une réponse d'API.
 *
 * Valider le mock n'est pas superflu : c'est ce qui garantit que le jeu fictif
 * respecte le contrat que l'API devra respecter. Sans cela, la bascule révélerait
 * d'un coup des écarts qu'on aurait pu voir dès le développement.
 */
export async function chargerMock<T>(
  charger: () => Promise<{ default: unknown }>,
  schema: z.ZodType<T>,
  origine: string
): Promise<T> {
  const contenu = await charger()
  return valider(schema, contenu.default, origine)
}

/**
 * Appelle l'API de détection et valide la réponse.
 *
 * L'authentification auprès de l'API n'est pas encore arrêtée : elle sera portée
 * par la session NextAuth côté serveur, une fois le contrat fixé avec le service
 * de détection (voir `docs/API-CONTRACT.md`). Le jeton n'est volontairement pas
 * lu depuis `localStorage` — inaccessible depuis un composant serveur, et mauvaise
 * pratique de stockage par ailleurs.
 */
export async function fetchFromAPI<T>(
  endpoint: string,
  schema: z.ZodType<T>
): Promise<T> {
  let reponse: Response
  try {
    reponse = await fetch(`${API_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
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
      `Le service de détection a répondu ${reponse.status} (${endpoint})`,
      endpoint
    )
  }

  return valider(schema, await reponse.json(), endpoint)
}
