import { alertesService, dashboardService } from "@/lib/services"
import { AlertesClient } from "./alertes-client"

export const metadata = { title: "Alertes" }

/**
 * Les données sont chargées ici, côté serveur, puis passées au composant client
 * qui porte les filtres et la mise en forme. Aucun écran n'importe plus son
 * `data.json` : le basculement vers l'API réelle se joue entièrement dans les
 * services.
 */
export default async function AlertesPage() {
  const [alertes, stats, alertesTrend] = await Promise.all([
    alertesService.getAlertes(),
    alertesService.getStats(),
    dashboardService.getAlertesTrend(),
  ])

  return <AlertesClient alertes={alertes} stats={stats} alertesTrend={alertesTrend} />
}
