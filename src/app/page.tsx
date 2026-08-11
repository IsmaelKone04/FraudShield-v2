import { redirect } from "next/navigation"
import { auth } from "@/auth"

/**
 * La racine n'a pas de contenu propre : la console commence au tableau de bord.
 * On aiguille selon la session plutôt que d'afficher une page d'accueil vide.
 */
export default async function Home() {
  const session = await auth()
  redirect(session?.user ? "/dashboard" : "/login")
}
