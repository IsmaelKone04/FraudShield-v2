"use client"

import { useState, useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AlertTriangle, Clock, CheckCircle,
  Eye, Search, Download, Filter,
} from "lucide-react"
import alertesData from "./data.json"
import dashboardData from "@/app/dashboard/data.json"

// ─── Config badges ────────────────────────────────────────────────────────────
const risqueCfg: Record<string, string> = {
  "Élevé":  "bg-red-500/15 text-red-400 border-red-500/20",
  "Moyen":  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "Faible": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
}

const statutCfg: Record<string, { className: string; icon: any }> = {
  "En cours":   { className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",  icon: Clock         },
  "À vérifier": { className: "bg-blue-500/15 text-blue-400 border-blue-500/20",        icon: Eye           },
  "Résolu":     { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
}

const statIconMap: Record<string, any> = {
  total:    AlertTriangle,
  en_cours: Clock,
  verifier: Eye,
  resolues: CheckCircle,
}

const statColorMap: Record<string, string> = {
  total:    "text-foreground",
  warning:  "text-yellow-400",
  info:     "text-blue-400",
  success:  "text-emerald-400",
}

// ─── Sous-composants ──────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#ff4757" : score >= 50 ? "#ffa502" : "#00e578"
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          style={{ width: `${score}%`, background: color }}
          className="h-full rounded-full transition-all duration-700"
        />
      </div>
      <span style={{ color }} className="text-xs font-mono w-6 text-right font-semibold">
        {score}
      </span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="mb-1">
          {p.name === "alertes" ? "Alertes" : "Résolues"} : <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AlertesPage() {
  const [recherche, setRecherche]   = useState("")
  const [filtreStatut, setStatut]   = useState("tous")
  const [filtreRisque, setRisque]   = useState("tous")
  const [periodeGraph, setPeriode]  = useState("30")

  // Données graphique filtrées par période
  const trendData = useMemo(() => {
    const n = parseInt(periodeGraph)
    return dashboardData.alertesTrend
      .slice(-n)
      .map(d => ({ ...d, label: d.date.slice(5) })) // "05-20" comme label
  }, [periodeGraph])

  // Alertes filtrées
  const alertesFiltrees = useMemo(() => {
    return alertesData.alertes.filter(a => {
      const matchRecherche = recherche === "" ||
        a.id.toLowerCase().includes(recherche.toLowerCase()) ||
        a.assure.toLowerCase().includes(recherche.toLowerCase()) ||
        a.etablissement.toLowerCase().includes(recherche.toLowerCase()) ||
        a.type.toLowerCase().includes(recherche.toLowerCase())
      const matchStatut = filtreStatut === "tous" || a.statut === filtreStatut
      const matchRisque = filtreRisque === "tous" || a.risque === filtreRisque
      return matchRecherche && matchStatut && matchRisque
    })
  }, [recherche, filtreStatut, filtreRisque])

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alertes de fraude</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi en temps réel des anomalies détectées par le moteur IA
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download size={14} />
          Exporter
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {alertesData.stats.map(stat => {
          const Icon  = statIconMap[stat.id]
          const color = statColorMap[stat.color] || statColorMap.total
          return (
            <Card key={stat.id} className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </span>
                </div>
                <div className={`text-3xl font-bold mb-1 ${color}`}>
                  {stat.valueFormate}
                </div>
                <div className="text-xs text-muted-foreground/60">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Graphique tendance ── */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Tendance des alertes
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Alertes détectées vs résolues
              </CardDescription>
            </div>

            {/* Sélecteur période */}
            <Select value={periodeGraph} onValueChange={(val) => val && setPeriode(val)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="14">14 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="50">50 derniers jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gAlertes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ffa502" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ffa502" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gResolues" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e578" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00e578" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                interval={Math.floor(trendData.length / 6)}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="alertes"  stroke="#ffa502" strokeWidth={2} fill="url(#gAlertes)"  />
              <Area type="monotone" dataKey="resolues" stroke="#00e578" strokeWidth={2} fill="url(#gResolues)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher ID, assuré, établissement..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border/50"
          />
        </div>

        <Select value={filtreStatut} onValueChange={(val) => val && setStatut(val)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <Filter size={13} className="mr-1 text-muted-foreground" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="À vérifier">À vérifier</SelectItem>
            <SelectItem value="Résolu">Résolu</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtreRisque} onValueChange={(val) => val && setRisque(val)}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Risque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les risques</SelectItem>
            <SelectItem value="Élevé">Élevé</SelectItem>
            <SelectItem value="Moyen">Moyen</SelectItem>
            <SelectItem value="Faible">Faible</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {alertesFiltrees.length} résultat{alertesFiltrees.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Tableau ── */}
      <Card className="border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/30">
                {["ID","Type","Assuré","Établissement","Montant","Score IA","Risque","Date","Statut"].map(h => (
                  <th key={h}
                    className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alertesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                    Aucune alerte ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                alertesFiltrees.map((a, i) => {
                  const statutConf = statutCfg[a.statut]
                  const StatutIcon = statutConf?.icon
                  return (
                    <tr key={a.id}
                      className="border-b border-border/20 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-emerald-400 font-semibold">
                          {a.id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground whitespace-nowrap">
                        {a.type}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground whitespace-nowrap">
                        {a.assure}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {a.etablissement}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-foreground whitespace-nowrap">
                          {a.montantFormate}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ScoreBar score={a.scoreIA} />
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline"
                          className={`text-[10px] font-semibold whitespace-nowrap ${risqueCfg[a.risque]}`}>
                          {a.risque}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock size={11} />
                          {a.dateFormate}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline"
                          className={`text-[10px] whitespace-nowrap flex items-center gap-1 w-fit ${statutConf?.className}`}>
                          {StatutIcon && <StatutIcon size={10} />}
                          {a.statut}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}