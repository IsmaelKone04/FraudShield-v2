import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

/**
 * Un bloc titré, tel que le portent le dossier d'alerte, la qualité du modèle
 * et le simulateur de seuils.
 *
 * Extrait au moment où une troisième copie allait apparaître — la même
 * discipline qu'en D1 pour `lib/formats.ts`. Trois en-têtes écrits séparément,
 * ce sont trois occasions de ne plus aligner le titre de la même façon.
 *
 * Sans `"use client"` : il ne fait qu'assembler des balises, et se rend donc
 * aussi bien depuis un composant serveur que depuis un composant client.
 */
export function Section({
  titre,
  icone: Icone,
  compte,
  action,
  children,
}: {
  titre: string
  icone: LucideIcon
  /** Précision affichée à côté du titre : un nombre d'éléments, une période… */
  compte?: string
  /** Commande propre à la section, alignée à droite de son titre. */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <Icone size={15} className="translate-y-0.5 text-muted-foreground-subtle" />
          <h2 className="text-sm font-semibold text-foreground">{titre}</h2>
          {compte && <span className="text-xs text-muted-foreground">{compte}</span>}
          {action && <div className="ms-auto self-center">{action}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
