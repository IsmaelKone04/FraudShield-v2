"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search, Plus, ChevronDown, ChevronRight,
  AlertTriangle, Clock, Eye, CheckCircle,
  User, Calendar, FileText, Building2,
} from "lucide-react"
import data from "./data.json"

// ─── Config badges ────────────────────────────────────────────────────────────
const prioriteCfg: Record<string, string> = {
  "Critique": "bg-red-500/15 text-red-400 border-red-500/20",
  "Élevée":   "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Moyenne":  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "Faible":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
}

const statutCfg: Record<string, { className: string; icon: any }> = {
  "En cours":   { className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",    icon: Clock        },
  "À vérifier": { className: "bg-blue-500/15 text-blue-400 border-blue-500/20",          icon: Eye          },
  "Clôturée":   { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle  },
}

const statIconMap: Record<string, any> = {
  total:    FileText,
  en_cours: Clock,
  verifier: Eye,
  resolues: CheckCircle,
}

const statColorMap: Record<string, string> = {
  default: "text-foreground",
  warning: "text-yellow-400",
  info:    "text-blue-400",
  success: "text-emerald-400",
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InvestigationsPage() {
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [recherche, setRecherche] = useState("")
  const [filtrePriorite, setPriorite] = useState("tous")
  const [filtreStatut,   setStatut]   = useState("tous")

  const toggle = (id: string) =>
    setExpanded(prev => prev === id ? null : id)

  const filtrees = useMemo(() => {
    return data.investigations.filter(inv => {
      const matchRecherche =
        recherche === "" ||
        inv.id.toLowerCase().includes(recherche.toLowerCase()) ||
        inv.titre.toLowerCase().includes(recherche.toLowerCase()) ||
        inv.assigne.toLowerCase().includes(recherche.toLowerCase())
      const matchPriorite = filtrePriorite === "tous" || inv.priorite === filtrePriorite
      const matchStatut   = filtreStatut   === "tous" || inv.statut   === filtreStatut
      return matchRecherche && matchPriorite && matchStatut
    })
  }, [recherche, filtrePriorite, filtreStatut])

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Investigations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des enquêtes de fraude en cours
          </p>
        </div>
        <Button size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
          <Plus size={14} />
          Nouvelle investigation
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map(stat => {
          const Icon  = statIconMap[stat.id]
          const color = statColorMap[stat.color] || statColorMap.default
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

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher ID, titre, agent..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border/50"
          />
        </div>

        <Select value={filtrePriorite} onValueChange={(v) => setPriorite(v ?? "")}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes priorités</SelectItem>
            <SelectItem value="Critique">Critique</SelectItem>
            <SelectItem value="Élevée">Élevée</SelectItem>
            <SelectItem value="Moyenne">Moyenne</SelectItem>
            <SelectItem value="Faible">Faible</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtreStatut} onValueChange={(v) => setStatut(v ?? "")}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous statuts</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="À vérifier">À vérifier</SelectItem>
            <SelectItem value="Clôturée">Clôturée</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtrees.length} investigation{filtrees.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Liste investigations ── */}
      <div className="flex flex-col gap-3">
        {filtrees.length === 0 ? (
          <Card className="border-border/50 bg-card">
            <CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune investigation ne correspond aux filtres sélectionnés.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtrees.map(inv => {
            const isOpen     = expanded === inv.id
            const statutConf = statutCfg[inv.statut]
            const StatutIcon = statutConf?.icon

            return (
              <Card
                key={inv.id}
                className="border-border/50 bg-card overflow-hidden cursor-pointer
                           hover:border-emerald-500/20 transition-colors"
                onClick={() => toggle(inv.id)}
              >
                {/* ── Header de la carte ── */}
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-5">

                    {/* Icône */}
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                                    flex items-center justify-center shrink-0">
                      <Search size={17} className="text-emerald-400" />
                    </div>

                    {/* Titre + badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-xs text-emerald-400 font-semibold">
                          {inv.id}
                        </span>
                        <Badge variant="outline"
                          className={`text-[10px] font-bold ${prioriteCfg[inv.priorite]}`}>
                          {inv.priorite}
                        </Badge>
                        <Badge variant="outline"
                          className={`text-[10px] flex items-center gap-1 ${statutConf?.className}`}>
                          {StatutIcon && <StatutIcon size={10} />}
                          {inv.statut}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {inv.titre}
                      </p>
                    </div>

                    {/* Méta droite */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-foreground font-mono">
                          {inv.montantTotal}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {inv.casLies} cas liés
                        </div>
                      </div>
                      <div className="text-right hidden lg:block">
                        <div className="text-xs text-foreground font-medium">
                          {inv.assigne}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Màj {inv.dateMaj.slice(5).split("-").reverse().join("/")}
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronDown size={16} className="text-muted-foreground" />
                        : <ChevronRight size={16} className="text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* ── Contenu expandé ── */}
                  {isOpen && (
                    <div className="border-t border-border/30 px-5 pb-5 pt-4">

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                        {inv.description}
                      </p>

                      {/* Détails en grille */}
                      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
                        {[
                          { icon: User,      label: "Assigné à",     val: inv.assigne                           },
                          { icon: Calendar,  label: "Ouvert le",      val: inv.dateOuverture.split("-").reverse().join("/") },
                          { icon: AlertTriangle, label: "Cas liés",   val: `${inv.casLies} alertes`             },
                          { icon: FileText,  label: "Montant total",  val: inv.montantTotal                     },
                        ].map(d => (
                          <div key={d.label}
                            className="bg-white/[0.02] border border-border/30 rounded-lg p-3
                                       flex items-center gap-3">
                            <d.icon size={14} className="text-muted-foreground shrink-0" />
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {d.label}
                              </div>
                              <div className="text-xs font-semibold text-foreground mt-0.5">
                                {d.val}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Établissements + Alertes liées */}
                      <div className="grid grid-cols-1 gap-3 mb-5 lg:grid-cols-2">
                        <div className="bg-white/[0.02] border border-border/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 size={13} className="text-muted-foreground" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Établissements impliqués
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {inv.etablissements.map(e => (
                              <span key={e}
                                className="text-xs bg-white/5 border border-border/40
                                           rounded-md px-2 py-0.5 text-foreground">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-border/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={13} className="text-muted-foreground" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Alertes liées
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {inv.alertesLiees.map(a => (
                              <span key={a}
                                className="font-mono text-xs text-emerald-400 bg-emerald-500/10
                                           border border-emerald-500/20 rounded-md px-2 py-0.5">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm"
                          className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs">
                          <FileText size={13} />
                          Ouvrir le dossier
                        </Button>
                        <Button size="sm" variant="outline"
                          className="gap-2 text-xs border-border/50">
                          <Plus size={13} />
                          Ajouter une note
                        </Button>
                        <Button size="sm" variant="outline"
                          className="gap-2 text-xs border-border/50 text-muted-foreground">
                          <CheckCircle size={13} />
                          Clôturer
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

    </div>
  )
}