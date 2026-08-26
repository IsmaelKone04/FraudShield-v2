import { PortefeuilleClient } from "./portefeuille-client"

export const metadata = { title: "Portefeuille de référence" }

/**
 * Rien à charger côté serveur : la table de référence est un fichier de onze
 * kilo-octets, agrégé hors ligne. La page ne porte que le titre et le cadre.
 */
export default function PortefeuillePage() {
  return <PortefeuilleClient />
}
