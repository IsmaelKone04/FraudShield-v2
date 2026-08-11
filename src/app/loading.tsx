import { Skeleton } from "@/components/ui/skeleton"

/**
 * Écran d'attente pendant le chargement des données côté serveur.
 *
 * La silhouette reprend la structure commune aux écrans de la console — un titre,
 * une rangée de cartes, un grand bloc — pour que la mise en page ne saute pas au
 * moment où le contenu arrive.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement des données…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
