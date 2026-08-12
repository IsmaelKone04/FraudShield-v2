"use client"

import { DataTable } from "@/components/data-table"
import type { Alerte } from "@/lib/schemas/alertes.schema"
import { useAlertesAvecModifications } from "@/lib/store"

/**
 * Les dernières alertes du tableau de bord, à jour des modifications locales.
 *
 * Sans cette couche, une alerte passée en « Résolu » depuis l'écran Alertes
 * continuerait de s'afficher « En cours » ici : les deux écrans se
 * contrediraient à nouveau, exactement comme avant l'ADR-004 — pour une autre
 * raison, avec le même effet à l'écran.
 *
 * `DataTable` reste volontairement un composant de présentation, piloté par ses
 * seules props : c'est ce mince adaptateur qui connaît le store, pas lui.
 */
export function DernieresAlertes({ alertes }: { alertes: Alerte[] }) {
  const alertesAJour = useAlertesAvecModifications(alertes)

  return <DataTable data={alertesAJour} />
}
