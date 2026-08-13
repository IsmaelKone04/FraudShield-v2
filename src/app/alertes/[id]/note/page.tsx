import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { alertesService } from "@/lib/services"
import { NoteClient } from "./note-client"

type Parametres = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Parametres) {
  const { id } = await params
  return { title: `Note d'explication ${decodeURIComponent(id)}` }
}

/**
 * La note d'explication d'un dossier, mise en page pour être imprimée.
 *
 * C'est la pièce qu'un gestionnaire joint à une contestation : elle doit tenir
 * seule, sans la console autour. D'où une route propre plutôt qu'un bloc caché
 * dans l'écran du dossier — une adresse se transmet, se met en favori et
 * s'imprime, un bloc caché ne fait aucun des trois.
 */
export default async function NotePage({ params }: Parametres) {
  const { id } = await params
  const [session, dossier] = await Promise.all([
    auth(),
    alertesService.getAlerte(decodeURIComponent(id)),
  ])

  if (!dossier) notFound()

  return (
    <NoteClient
      dossier={dossier}
      utilisateur={session?.user?.email ?? null}
      // La date d'édition est fixée ici et transmise en propriété. Calculée
      // dans le navigateur, elle différerait du HTML servi — un avertissement
      // d'hydratation, et une date qui change sous les yeux du lecteur.
      editeeLe={new Date().toISOString()}
    />
  )
}
