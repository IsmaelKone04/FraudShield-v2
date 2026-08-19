import { Card, CardContent } from "@/components/ui/card"

/**
 * Une mesure isolée : un chiffre, ce qu'il mesure, et ce qui le qualifie.
 *
 * Écrite pour le journal d'audit, reprise telle quelle par les réseaux de
 * fraude. Extraite au moment où la deuxième copie allait être écrite — même
 * raison que `Section` : deux en-têtes écrits séparément, ce sont deux occasions
 * de ne plus aligner le chiffre de la même façon.
 *
 * Sans `"use client"` : elle n'assemble que des balises.
 */
export function CarteSynthese({
  icone: Icone,
  libelle,
  valeur,
  precision,
  accent,
}: {
  icone: React.ComponentType<{ size?: number; className?: string }>
  libelle: string
  valeur: string
  precision: string
  /** Classe de couleur du chiffre, quand sa valeur appelle l'attention. */
  accent?: string
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <Icone size={16} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {libelle}
          </span>
        </div>
        <div className={`mb-1 text-3xl font-bold ${accent ?? "text-foreground"}`}>
          {valeur}
        </div>
        <div className="text-xs text-muted-foreground-subtle">{precision}</div>
      </CardContent>
    </Card>
  )
}
