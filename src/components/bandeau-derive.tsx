import Link from "next/link"
import { TrendingUp } from "lucide-react"

import { pourcentage } from "@/lib/formats"
import type { Derive } from "@/lib/qualite"

/**
 * « Le modèle décroche sur *Double facturation*. »
 *
 * Le bandeau ne s'affiche que lorsqu'il a quelque chose à dire : un bandeau
 * permanent qui vire au vert quand tout va bien finit par ne plus être lu, et
 * le jour où il vire au rouge personne ne le voit.
 *
 * Il dit trois choses, et il faut les trois : ce qui décroche, de combien, et
 * pourquoi ce seuil-là. Sans la troisième, l'analyste n'a aucun moyen de juger
 * si l'alerte mérite qu'on reprenne le modèle ou qu'on relève le seuil.
 *
 * Rendu côté serveur — il ne dépend que de ce qu'on lui passe.
 */
export function BandeauDerive({
  derives,
  /** Mois sur lequel la mesure porte, écrit pour l'affichage. */
  mois,
  /** Faux quand le bandeau est ailleurs que sur l'écran de qualité. */
  avecLien = false,
}: {
  derives: Derive[]
  mois: string
  avecLien?: boolean
}) {
  if (derives.length === 0) return null

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <TrendingUp size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-300">
            {derives.length === 1
              ? `Le modèle décroche sur « ${derives[0].typeFraude} »`
              : `Le modèle décroche sur ${derives.length} types de fraude`}
          </p>

          <ul className="mt-2 space-y-2">
            {derives.map((derive) => (
              <li key={derive.typeFraude} className="text-xs">
                <span className="font-medium text-foreground">
                  {derive.typeFraude}
                </span>{" "}
                <span className="text-muted-foreground">
                  — {pourcentage(derive.taux, 1)} de faux positifs imputables au
                  modèle sur {mois}, pour un seuil de{" "}
                  {pourcentage(derive.seuil)} ({derive.tranches} dossiers
                  tranchés).
                </span>
                <span className="mt-0.5 block text-muted-foreground-subtle">
                  {derive.justification}
                </span>
              </li>
            ))}
          </ul>

          {avecLien && (
            <Link
              href="/qualite"
              className="mt-3 inline-block text-xs font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              Voir le registre des faux positifs
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
