import { notFound } from "next/navigation"

import { reseauxService } from "@/lib/services"
import { disposer } from "@/lib/reseaux-disposition"
import { ReseauClient } from "./reseau-client"

export const metadata = { title: "Réseau de fraude" }

/**
 * Le graphe d'un dossier.
 *
 * La disposition est calculée **ici**, sur le serveur : elle est déterministe,
 * donc le SVG part complet dans le HTML servi et le navigateur n'a rien à
 * recalculer. Le graphe est visible avant même que le JavaScript soit chargé.
 *
 * `sinistre` en paramètre d'URL vient du dossier d'alerte : il sélectionne
 * d'emblée le nœud correspondant, pour que le lien « voir le réseau » n'ouvre
 * pas un graphe où l'analyste doit retrouver son cas à l'œil.
 */
export default async function ReseauPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sinistre?: string }>
}) {
  const [{ id }, { sinistre }] = await Promise.all([params, searchParams])
  const detail = await reseauxService.getReseau(id)
  if (!detail) notFound()

  const positions = [...disposer(detail.graphe)].map(([noeud, p]) => ({
    id: noeud,
    ...p,
  }))

  // Un identifiant venu de l'URL n'est pas une donnée de confiance : il n'est
  // retenu que s'il désigne un nœud du périmètre.
  const selection =
    sinistre && detail.graphe.noeuds.some((n) => n.id === sinistre)
      ? sinistre
      : null

  return (
    <ReseauClient
      graphe={detail.graphe}
      positions={positions}
      indicateurs={detail.indicateurs}
      investigation={detail.investigation}
      alertes={detail.alertes}
      selectionInitiale={selection}
    />
  )
}
