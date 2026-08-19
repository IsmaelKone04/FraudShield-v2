import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { alertesService, dashboardService, parametresService } from "@/lib/services"
import { AlertesClient } from "./alertes-client"

export const metadata = { title: "Alertes" }

/**
 * Les données sont chargées ici, côté serveur, puis passées au composant client
 * qui porte les filtres et la mise en forme. Aucun écran n'importe plus son
 * `data.json` : le basculement vers l'API réelle se joue entièrement dans les
 * services.
 */
export default async function AlertesPage() {
  const [session, alertes, stats, alertesTrend, parametres] = await Promise.all([
    auth(),
    alertesService.getAlertes(),
    alertesService.getStats(),
    dashboardService.getAlertesTrend(),
    parametresService.getParametresSysteme(),
  ])

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <AlertesClient
        alertes={alertes}
        stats={stats}
        alertesTrend={alertesTrend}
        // Valeur de référence du seuil : un réglage enregistré dans le navigateur
        // la recouvre côté client.
        seuilParDefaut={parametres.seuilAlerteIA}
        // Sert au filtre « Mes dossiers ». La session est lue ici plutôt que côté
        // client : cela évite de monter un `SessionProvider` pour une seule adresse.
        utilisateur={session?.user?.email ?? null}
      />
    </>
  )
}
