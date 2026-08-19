import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { investigationsService } from "@/lib/services"
import { InvestigationsClient } from "./investigations-client"

export const metadata = { title: "Investigations" }

export default async function InvestigationsPage() {
  const [session, stats, investigations] = await Promise.all([
    // Cet écran clôture des dossiers et les réassigne : la piste d'audit doit
    // pouvoir nommer qui l'a fait.
    auth(),
    investigationsService.getStats(),
    investigationsService.getInvestigations(),
  ])

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <InvestigationsClient data={{ stats, investigations }} />
    </>
  )
}
