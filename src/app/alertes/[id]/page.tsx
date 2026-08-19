import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { alertesService } from "@/lib/services"
import { AlerteClient } from "./alerte-client"

type Parametres = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Parametres) {
  const { id } = await params
  return { title: `Alerte ${decodeURIComponent(id)}` }
}

/**
 * Le dossier d'une alerte.
 *
 * L'identifiant vient de l'URL, donc de l'extérieur : il est passé tel quel au
 * service, qui répond `null` s'il ne correspond à rien. C'est `notFound()` qui
 * tranche — un identifiant inventé doit rendre la page 404 maison, pas une
 * page vide qui laisserait croire à un dossier sans contenu.
 */
export default async function AlertePage({ params }: Parametres) {
  const { id } = await params
  const [session, dossier] = await Promise.all([
    auth(),
    alertesService.getAlerte(decodeURIComponent(id)),
  ])

  if (!dossier) notFound()

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <AlerteClient
        dossier={dossier}
        // Le compte qui décide et qui signe les notes. Lu ici plutôt que côté
        // client, pour la même raison que sur la liste : cela évite de monter un
        // `SessionProvider` pour une seule adresse.
        utilisateur={session?.user?.email ?? null}
      />
    </>
  )
}
