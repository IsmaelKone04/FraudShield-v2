import { investigationsService } from "@/lib/services"
import { InvestigationsClient } from "./investigations-client"

export const metadata = { title: "Investigations" }

export default async function InvestigationsPage() {
  const [stats, investigations] = await Promise.all([
    investigationsService.getStats(),
    investigationsService.getInvestigations(),
  ])

  return <InvestigationsClient data={{ stats, investigations }} />
}
