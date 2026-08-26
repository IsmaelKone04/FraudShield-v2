import { NotationClient } from "./notation-client"

export const metadata = { title: "Notation d'une déclaration" }

/**
 * L'écran de notation.
 *
 * Rien à charger côté serveur : le modèle est un fichier de coefficients que le
 * composant client importe, et la notation est une addition. La page n'existe
 * que pour porter le titre et le cadre.
 */
export default function NotationPage() {
  return <NotationClient />
}
