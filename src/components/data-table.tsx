import { Badge } from "@/components/ui/badge"
import { Clock, Eye } from "lucide-react"
import Link from "next/link"
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

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#ff4757" : score >= 50 ? "#ffa502" : "#00e578"
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div style={{ width: `${score}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span style={{ color }} className="text-xs font-mono w-6 text-right">{score}</span>
    </div>
  )
}

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
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/30">
                {COLONNES.map(h => (
                  <th key={h} scope="col" className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/20 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-emerald-400">{a.id}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground">{a.type}</td>
                  <td className="px-4 py-3.5 text-sm text-foreground">{a.assure}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{a.etablissement}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-foreground">{a.montantFormate}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ScoreBar score={a.scoreIA} />
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
