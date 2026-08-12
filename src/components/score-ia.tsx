import { cn } from "@/lib/utils"

/**
 * Le score du moteur de détection, sur 100.
 *
 * Les seuils de couleur étaient écrits à l'identique dans le tableau du
 * tableau de bord et dans celui des alertes ; le dossier en aurait fait une
 * troisième copie. Les voici une fois pour toutes — sans quoi un rouge qui
 * commence à 80 ici et à 75 ailleurs finirait par arriver.
 *
 * Ce sont des seuils d'**affichage**, sans rapport avec le seuil de
 * déclenchement réglé dans les Paramètres : celui-là dit si l'alerte aurait
 * été levée, ceux-ci disent seulement comment la teinter.
 */
export function couleurScore(score: number): string {
  if (score >= 80) return "#ff4757"
  if (score >= 50) return "#ffa502"
  return "#00e578"
}

export function ScoreIA({
  score,
  className,
}: {
  score: number
  className?: string
}) {
  const couleur = couleurScore(score)
  return (
    <div className={cn("flex items-center gap-2 min-w-[90px]", className)}>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          style={{ width: `${score}%`, background: couleur }}
          className="h-full rounded-full transition-all duration-700"
        />
      </div>
      <span
        style={{ color: couleur }}
        className="text-xs font-mono w-6 text-right font-semibold"
      >
        {score}
      </span>
    </div>
  )
}
