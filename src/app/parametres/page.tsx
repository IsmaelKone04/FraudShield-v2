import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { parametresService } from "@/lib/services"
import { ParametresClient } from "./parametres-client"

export const metadata = { title: "Paramètres" }

export default async function ParametresPage() {
  const [session, utilisateurs, modeles, parametresSysteme] = await Promise.all([
    // Le seuil de déclenchement se règle ici : c'est la modification qu'un
    // contrôleur cherche en premier dans le journal.
    auth(),
    parametresService.getUtilisateurs(),
    parametresService.getModeles(),
    parametresService.getParametresSysteme(),
  ])

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <ParametresClient data={{ utilisateurs, modeles, parametresSysteme }} />
    </>
  )
}
