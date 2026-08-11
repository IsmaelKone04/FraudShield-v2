import { parametresService } from "@/lib/services"
import { ParametresClient } from "./parametres-client"

export const metadata = { title: "Paramètres" }

export default async function ParametresPage() {
  const [utilisateurs, modeles, parametresSysteme] = await Promise.all([
    parametresService.getUtilisateurs(),
    parametresService.getModeles(),
    parametresService.getParametresSysteme(),
  ])

  return <ParametresClient data={{ utilisateurs, modeles, parametresSysteme }} />
}
