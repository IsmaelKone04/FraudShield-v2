import { alertesService, qualiteService } from "@/lib/services"
import { QualiteClient } from "./qualite-client"

export const metadata = { title: "Qualité du modèle" }

/**
 * L'écran qui juge le détecteur, et non la fraude.
 *
 * Les deux jeux sont chargés ensemble : celui de la qualité pour l'historique,
 * celui des alertes pour rattacher les décisions prises dans cette console à un
 * type de fraude. Le store ne connaît que des identifiants — sans cette table,
 * un dossier classé sans suite n'entrerait dans aucun compte.
 */
export default async function QualitePage() {
  const [qualite, alertes] = await Promise.all([
    qualiteService.getQualite(),
    alertesService.getAlertes(),
  ])

  const typesParAlerte = Object.fromEntries(
    alertes.map((alerte) => [alerte.id, alerte.type])
  )

  return <QualiteClient donnees={qualite} typesParAlerte={typesParAlerte} />
}
