import { analysesService } from "@/lib/services"
import { AnalysesClient } from "./analyses-client"

export const metadata = { title: "Analyses" }

export default async function AnalysesPage() {
  const [
    statistiquesGlobales,
    topEtablissementsSuspects,
    repartitionRisque,
    comportementsAnormaux,
  ] = await Promise.all([
    analysesService.getStatistiquesGlobales(),
    analysesService.getTopEtablissementsSuspects(),
    analysesService.getRepartitionRisque(),
    analysesService.getComportementsAnormaux(),
  ])

  return (
    <AnalysesClient
      data={{
        statistiquesGlobales,
        topEtablissementsSuspects,
        repartitionRisque,
        comportementsAnormaux,
      }}
    />
  )
}
