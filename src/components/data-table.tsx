import { Badge } from "@/components/ui/badge"
import { ChevronRight, Clock, Eye } from "lucide-react"
import Link from "next/link"
import { ScoreIA } from "@/components/score-ia"
import type { Alerte } from "@/lib/schemas/alertes.schema"

const risqueCfg: Record<string, { label: string; className: string }> = {
  "Élevé":  { label: "Élevé",     className: "bg-red-500/15 text-red-400 border-red-500/20"     },
  "Moyen":  { label: "Moyen",     className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  "Faible": { label: "Faible",    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
}

const statutCfg: Record<string, { className: string }> = {
  "En cours":   { className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"  },
  "À vérifier": { className: "bg-blue-500/15 text-blue-400 border-blue-500/20"        },
  "Résolu":     { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
}

const COLONNES = [
  "ID Alerte", "Type", "Assuré", "Établissement",
  "Montant", "Score IA", "Risque", "Date", "Statut",
]

/**
 * Tableau des dernières alertes du tableau de bord.
 *
 * Il est piloté par ses props : la version précédente déclarait recevoir `data`
 * puis l'ignorait pour réimporter `dashboard/data.json` elle-même, ce qui rendait
 * le composant inutilisable ailleurs et court-circuitait le service.
 */
export function DataTable({ data }: { data: Alerte[] }) {
  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Dernières alertes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.length} cas suspects récents
            </p>
          </div>
          <Link
            href="/alertes"
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            <Eye size={13} />
            Voir tout
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse">
            <thead>
              <tr className="border-b border-border/30">
                {COLONNES.map(h => (
                  <th key={h} scope="col" className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground-subtle px-4 py-3">
                    {h}
                  </th>
                ))}
                <th scope="col" className="w-10 px-4 py-3">
                  <span className="sr-only">Ouvrir le dossier</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/20 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/alertes/${a.id}`}
                      className="rounded font-mono text-xs text-emerald-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {a.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground">{a.type}</td>
                  <td className="px-4 py-3.5 text-sm text-foreground">{a.assure}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{a.etablissement}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-foreground">{a.montantFormate}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ScoreIA score={a.scoreIA} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className={`text-[10px] font-semibold ${risqueCfg[a.risque]?.className}`}>
                      {a.risque}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={11} />
                      {a.dateFormate}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className={`text-[10px] ${statutCfg[a.statut]?.className}`}>
                      {a.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/alertes/${a.id}`}
                      aria-label={`Ouvrir le dossier ${a.id}`}
                      title="Ouvrir le dossier"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground-subtle transition-colors hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
