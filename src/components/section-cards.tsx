import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { dashboardService } from "@/lib/services"

const iconMap: Record<string, string> = {
  demandes: "📋",
  alertes:  "🚨",
  suspects: "⚠️",
  taux:     "📊",
}

const colorMap: Record<string, { text: string; bg: string }> = {
  demandes: { text: "text-blue-400",    bg: "bg-blue-400/10"    },
  alertes:  { text: "text-yellow-400",  bg: "bg-yellow-400/10"  },
  suspects: { text: "text-red-400",     bg: "bg-red-400/10"     },
  taux:     { text: "text-emerald-400", bg: "bg-emerald-400/10" },
}

/**
 * Habillage de repli pour un KPI dont l'identifiant n'est pas connu de la console.
 *
 * C'est exactement ce qui arrivera au branchement de l'API réelle si elle publie
 * un indicateur supplémentaire : mieux vaut une carte neutre qu'un plantage du
 * tableau de bord entier.
 */
const COULEUR_PAR_DEFAUT = { text: "text-foreground", bg: "bg-muted" }
const ICONE_PAR_DEFAUT = "📈"

// Composant Server Component — pas besoin de useEffect
export async function SectionCards() {
  const kpis = await dashboardService.getKPIs()

  return (
    <div className="grid gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {kpis.map((kpi) => {
        const color = colorMap[kpi.id] ?? COULEUR_PAR_DEFAUT
        const isUp  = kpi.trend === "up"
        return (
          <Card key={kpi.id} className="border-border/50 bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${color.bg}`}>
                  {iconMap[kpi.id] ?? ICONE_PAR_DEFAUT}
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                  {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(kpi.change)}%
                </span>
              </div>
              <div className={`text-2xl font-bold mb-1 ${color.text}`}>
                {kpi.valueFormatted}
              </div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="text-xs text-muted-foreground-subtle mt-0.5">{kpi.periode}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}