import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { parametresService, simulationService } from "@/lib/services"
import { SimulationClient } from "./simulation-client"

export const metadata = { title: "Simulateur de seuils" }

/**
 * Le simulateur a besoin de deux choses : la population de rejeu, et le réglage
 * en vigueur — c'est lui qui sert de point de comparaison, et c'est lui que le
 * bouton « appliquer » modifie. La session s'y ajoute depuis D5 : « Appliquer ce
 * seuil » écrit un réglage, donc une ligne au journal.
 */
export default async function SimulationPage() {
  const [session, population, parametres] = await Promise.all([
    auth(),
    simulationService.getPopulation(),
    parametresService.getParametresSysteme(),
  ])

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <SimulationClient
        population={population}
        parametresReference={parametres}
      />
    </>
  )
}
