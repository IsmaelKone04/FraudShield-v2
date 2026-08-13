import { parametresService, simulationService } from "@/lib/services"
import { SimulationClient } from "./simulation-client"

export const metadata = { title: "Simulateur de seuils" }

/**
 * Le simulateur a besoin de deux choses : la population de rejeu, et le réglage
 * en vigueur — c'est lui qui sert de point de comparaison, et c'est lui que le
 * bouton « appliquer » modifie.
 */
export default async function SimulationPage() {
  const [population, parametres] = await Promise.all([
    simulationService.getPopulation(),
    parametresService.getParametresSysteme(),
  ])

  return (
    <SimulationClient population={population} parametresReference={parametres} />
  )
}
