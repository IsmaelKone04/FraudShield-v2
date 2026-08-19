import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { investigationsService, reseauxService } from "@/lib/services"
import { InvestigationsClient } from "./investigations-client"

export const metadata = { title: "Investigations" }

export default async function InvestigationsPage() {
  const [session, stats, investigations, reseaux] = await Promise.all([
    // Cet écran clôture des dossiers et les réassigne : la piste d'audit doit
    // pouvoir nommer qui l'a fait.
    auth(),
    investigationsService.getStats(),
    investigationsService.getInvestigations(),
    reseauxService.getResumes(),
  ])

  // Le rapprochement dossier → réseau se fait ici, à partir de ce que le service
  // déclare. Le déduire côté écran (« INV- » devenu « RES- ») marcherait
  // aujourd'hui et casserait silencieusement le jour où un dossier n'aurait pas
  // de réseau.
  const reseauParDossier = Object.fromEntries(
    reseaux.map((r) => [r.investigationId, r.id])
  )

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <InvestigationsClient
        data={{ stats, investigations }}
        reseauParDossier={reseauParDossier}
      />
    </>
  )
}
