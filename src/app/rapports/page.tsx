import { rapportsService } from "@/lib/services"
import { RapportsClient } from "./rapports-client"

export const metadata = { title: "Rapports" }

export default async function RapportsPage() {
  const [stats, categories, rapports] = await Promise.all([
    rapportsService.getStats(),
    rapportsService.getCategories(),
    rapportsService.getRapports(),
  ])

  return <RapportsClient data={{ stats, categories, rapports }} />
}
