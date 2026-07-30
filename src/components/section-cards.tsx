import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { dashboardService } from "@/lib/services/dashboard.service"

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

// Composant Server Component — pas besoin de useEffect
export async function SectionCards() {
  const kpis = await dashboardService.getKPIs()

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:grid-cols-4 lg:px-6">
      {kpis.map((kpi) => {
        const color = colorMap[kpi.id]
        const isUp  = kpi.trend === "up"
        return (
          <Card key={kpi.id} className="border-border/50 bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${color.bg}`}>
                  {iconMap[kpi.id]}
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
              <div className="text-xs text-muted-foreground/50 mt-0.5">{kpi.periode}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}