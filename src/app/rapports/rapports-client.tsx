"use client"

import { useState, useMemo, useRef } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText, Download, Search, Plus,
  Clock, CheckCircle, Eye,
  BarChart3, Database, AlertTriangle,
  FileSpreadsheet, FilePieChart, RefreshCw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { exporterAlertes, exporterInvestigations } from "@/lib/exports"
import { alertesService, investigationsService } from "@/lib/services"
import {
  fusionnerAlerte,
  fusionnerInvestigation,
  useModificationsStore,
} from "@/lib/store"
import { cn } from "@/lib/utils"


// ─── Config ───────────────────────────────────────────────────────────────────
const formatCfg: Record<string, { className: string; icon: LucideIcon }> = {
  "PDF":   { className: "bg-red-500/15 text-red-400 border-red-500/20",      icon: FileText        },
  "CSV":   { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: Database },
  "Excel": { className: "bg-blue-500/15 text-blue-400 border-blue-500/20",   icon: FileSpreadsheet },
}

const statutCfg: Record<string, { className: string; icon: LucideIcon }> = {
  "Prêt":          { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  "En génération": { className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",   icon: RefreshCw   },
}

const categorieCfg: Record<string, { icon: LucideIcon; color: string }> = {
  mensuel:     { icon: FileText,      color: "text-blue-400"    },
  trimestriel: { icon: FilePieChart,  color: "text-purple-400"  },
  audit:       { icon: Eye,           color: "text-orange-400"  },
  ia:          { icon: BarChart3,     color: "text-emerald-400" },
  export:      { icon: Database,      color: "text-cyan-400"    },
  incident:    { icon: AlertTriangle, color: "text-red-400"     },
}

const statIconMap: Record<string, LucideIcon> = {
  total:       FileText,
  generes:     Plus,
  en_cours:    Clock,
  telecharges: Download,
}

const statColorMap: Record<string, string> = {
  default: "text-foreground",
  info:    "text-blue-400",
  warning: "text-yellow-400",
  success: "text-emerald-400",
}

/**
 * Le catalogue décrit des rapports déjà produits ; aucun fichier n'accompagne ces
 * fiches, et il n'y a pas de service de rendu à qui les demander. Ce que la
 * console sait réellement produire tient dans « Génération rapide » (ADR-007).
 */
const SANS_FICHIER =
  "Cette fiche décrit un rapport déjà produit ; le fichier lui-même n'est pas stocké dans la console. Les exports qu'elle sait produire sont dans « Génération rapide », en haut de l'écran."

// ─── Composants utilitaires ───────────────────────────────────────────────────
function QuickGenerateCard({
  icon: Icon, label, description, color, format, action, indisponible,
}: {
  icon: LucideIcon; label: string; description: string; color: string; format: string
  /** Génération réellement effectuée au clic. Absente, le bouton est désactivé. */
  action?: () => Promise<void>
  /** Pourquoi la génération n'est pas possible, affiché en infobulle. */
  indisponible?: string
}) {
  const [enCours, setEnCours] = useState(false)
  const actif = action !== undefined

  async function declencher() {
    if (!action) return
    setEnCours(true)
    try {
      await action()
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Card className={cn(
      "border-border/50 bg-card transition-colors group",
      actif && "hover:border-emerald-500/20"
    )}>
      <CardContent className="p-5">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
          "bg-white/5 border border-border/40 transition-colors",
          actif && "group-hover:border-emerald-500/20"
        )}>
          <Icon size={18} className={color} />
        </div>
        <div className="text-sm font-semibold text-foreground mb-1">{label}</div>
        <div className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-[10px] ${formatCfg[format]?.className}`}>
            {format}
          </Badge>
          <Button size="sm" variant="ghost"
            onClick={declencher}
            disabled={!actif || enCours}
            title={indisponible}
            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1.5">
            {enCours
              ? <><RefreshCw size={12} className="animate-spin" /> Génération...</>
              : <><Plus size={12} /> Générer</>
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
import type { RapportsData } from "@/lib/schemas/rapports.schema"

export function RapportsClient({ data }: { data: RapportsData }) {
  const [recherche,  setRecherche]  = useState("")
  const [categorie,  setCategorie]  = useState("tous")
  const [filtreStatut, setStatut]   = useState("tous")
  const [filtreFormat, setFormat]   = useState("tous")
  /** Fiche dépliée, une seule à la fois. */
  const [detaille,   setDetaille]   = useState<string | null>(null)

  /**
   * « Nouveau rapport » n'ouvre pas de formulaire de création — il n'y a pas de
   * service à qui soumettre la demande. Il conduit à ce que la console sait
   * réellement produire, et le signale en soulignant brièvement la section.
   */
  const generationRapide = useRef<HTMLDivElement>(null)
  const [surligne, setSurligne] = useState(false)

  function allerALaGeneration() {
    generationRapide.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setSurligne(true)
    setTimeout(() => setSurligne(false), 1600)
  }

  const rapportsFiltres = useMemo(() => {
    return data.rapports.filter(r => {
      const matchRecherche =
        recherche === "" ||
        r.id.toLowerCase().includes(recherche.toLowerCase()) ||
        r.titre.toLowerCase().includes(recherche.toLowerCase()) ||
        r.generePar.toLowerCase().includes(recherche.toLowerCase()) ||
        r.tags.some(t => t.includes(recherche.toLowerCase()))
      const matchCat    = categorie     === "tous" || r.categorie === categorie
      const matchStatut = filtreStatut  === "tous" || r.statut    === filtreStatut
      const matchFormat = filtreFormat  === "tous" || r.format    === filtreFormat
      return matchRecherche && matchCat && matchStatut && matchFormat
    })
  }, [recherche, categorie, filtreStatut, filtreFormat, data.rapports])

  /**
   * Les deux exports lisent les données au clic plutôt que de les recevoir en
   * props : les charger au rendu ferait payer à chaque visite de l'écran deux
   * appels dont on ne sait pas s'ils serviront.
   *
   * Les modifications locales sont lues hors du rendu (`getState`) : elles ne
   * doivent pas provoquer de nouveau rendu de cet écran, seulement figurer dans
   * le fichier produit.
   */
  async function exporterLesAlertes() {
    try {
      const alertes = await alertesService.getAlertes()
      const modifications = useModificationsStore.getState().alertes
      const nomFichier = exporterAlertes(
        alertes.map((a) => fusionnerAlerte(a, modifications[a.id]))
      )
      toast.success(`${alertes.length} alertes exportées`, { description: nomFichier })
    } catch (erreur) {
      toast.error("Export des alertes impossible", {
        description: erreur instanceof Error ? erreur.message : undefined,
      })
    }
  }

  async function exporterLesInvestigations() {
    try {
      const investigations = await investigationsService.getInvestigations()
      const modifications = useModificationsStore.getState().investigations
      const nomFichier = exporterInvestigations(
        investigations.map((i) => fusionnerInvestigation(i, modifications[i.id]))
      )
      toast.success(`${investigations.length} dossiers exportés`, { description: nomFichier })
    } catch (erreur) {
      toast.error("Export des investigations impossible", {
        description: erreur instanceof Error ? erreur.message : undefined,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rapports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Génération, consultation et export des rapports d'analyse
          </p>
        </div>
        <Button size="sm"
          onClick={allerALaGeneration}
          title="Conduit à « Génération rapide » : les rapports que cette console sait réellement produire."
          className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
          <Plus size={14} />
          Nouveau rapport
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="text-xs text-muted-foreground-subtle">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Génération rapide ── */}
      <div
        ref={generationRapide}
        className={cn(
          "scroll-mt-6 rounded-xl transition-all duration-500",
          surligne && "ring-2 ring-emerald-500/40 ring-offset-4 ring-offset-background"
        )}
      >
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Génération rapide
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickGenerateCard
            icon={FileText}
            label="Rapport mensuel"
            description="Synthèse complète du mois en cours avec KPIs et alertes"
            color="text-blue-400"
            format="PDF"
            indisponible="La mise en page d'un PDF suppose un service de rendu côté serveur, hors du périmètre de cette console."
          />
          <QuickGenerateCard
            icon={FilePieChart}
            label="Rapport trimestriel"
            description="Bilan stratégique du trimestre avec tendances et recommandations"
            color="text-purple-400"
            format="PDF"
            indisponible="La mise en page d'un PDF suppose un service de rendu côté serveur, hors du périmètre de cette console."
          />
          <QuickGenerateCard
            icon={Database}
            label="Export alertes"
            description="Toutes les alertes de la console au format CSV, modifications locales comprises"
            color="text-cyan-400"
            format="CSV"
            action={exporterLesAlertes}
          />
          <QuickGenerateCard
            icon={FileSpreadsheet}
            label="Export investigations"
            description="Tous les dossiers d'investigation au format CSV, ouvrable dans Excel"
            color="text-emerald-400"
            format="CSV"
            action={exporterLesInvestigations}
          />
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un rapport..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border/50"
          />
        </div>

        <Select value={categorie} onValueChange={(v) => setCategorie(v ?? "")}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {data.categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtreStatut} onValueChange={(v) => setStatut(v ?? "")}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous statuts</SelectItem>
            <SelectItem value="Prêt">Prêt</SelectItem>
            <SelectItem value="En génération">En génération</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtreFormat} onValueChange={(v) => setFormat(v ?? "")}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous formats</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="CSV">CSV</SelectItem>
            <SelectItem value="Excel">Excel</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {rapportsFiltres.length} rapport{rapportsFiltres.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Liste rapports ── */}
      <div className="flex flex-col gap-3">
        {rapportsFiltres.length === 0 ? (
          <Card className="border-border/50 bg-card">
            <CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun rapport ne correspond aux filtres sélectionnés.
              </p>
            </CardContent>
          </Card>
        ) : (
          rapportsFiltres.map((r) => {
            const catConf    = categorieCfg[r.categorie]
            const CatIcon    = catConf?.icon || FileText
            const fmtConf    = formatCfg[r.format]
            const FmtIcon    = fmtConf?.icon || FileText
            const statConf   = statutCfg[r.statut]
            const StatIcon   = statConf?.icon
            const isPret     = r.statut === "Prêt"
            const estDetaille = detaille === r.id

            return (
              <Card key={r.id}
                className="border-border/50 bg-card hover:border-emerald-500/20 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">

                    {/* Icône catégorie */}
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-border/40
                                    flex items-center justify-center shrink-0 mt-0.5">
                      <CatIcon size={17} className={catConf?.color || "text-muted-foreground"} />
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">

                      {/* Ligne 1 — ID + badges */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-xs text-emerald-400 font-semibold">
                          {r.id}
                        </span>
                        <Badge variant="outline"
                          className={`text-[10px] flex items-center gap-1 ${fmtConf?.className}`}>
                          <FmtIcon size={9} />
                          {r.format}
                        </Badge>
                        <Badge variant="outline"
                          className={`text-[10px] flex items-center gap-1 ${statConf?.className}`}>
                          {StatIcon && (
                            <StatIcon
                              size={9}
                              className={!isPret ? "animate-spin" : ""}
                            />
                          )}
                          {r.statut}
                        </Badge>
                      </div>

                      {/* Titre */}
                      <p className="text-sm font-semibold text-foreground mb-1 truncate">
                        {r.titre}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed
                                    line-clamp-2">
                        {r.description}
                      </p>

                      {/* Méta + actions */}
                      <div className="flex items-center justify-between flex-wrap gap-3">

                        {/* Méta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} />
                            {r.dateFormate}
                          </span>
                          <span>Par {r.generePar}</span>
                          {r.taille !== "—" && (
                            <span className="font-mono">{r.taille}</span>
                          )}
                          {r.pages && (
                            <span>{r.pages} pages</span>
                          )}
                          {isPret && (
                            <span className="flex items-center gap-1">
                              <Download size={11} />
                              {r.telechargements} téléchargement{r.telechargements > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {/* Tags */}
                          <div className="hidden lg:flex gap-1.5">
                            {r.tags.slice(0, 2).map(tag => (
                              <span key={tag}
                                className="text-[10px] bg-white/5 border border-border/30
                                           rounded px-1.5 py-0.5 text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            title={isPret
                              ? SANS_FICHIER
                              : "Ce rapport est annoncé en cours de génération : il n'y a rien à télécharger."}
                            className="h-7 text-xs gap-1.5 border-border/50 opacity-40 cursor-not-allowed"
                          >
                            {isPret
                              ? <><Download size={12} /> Télécharger</>
                              : <><RefreshCw size={12} className="animate-spin" /> En cours...</>
                            }
                          </Button>

                          {/* « Aperçu » laissait attendre le document ; il n'y en a
                              pas. Le bouton déplie ce que la console connaît
                              réellement de la fiche, et s'appelle donc « Détails ». */}
                          <Button size="sm" variant="ghost"
                            onClick={() => setDetaille(v => v === r.id ? null : r.id)}
                            aria-expanded={estDetaille}
                            className="h-7 text-xs gap-1.5 text-muted-foreground
                                       hover:text-foreground">
                            <Eye size={12} />
                            Détails
                          </Button>
                        </div>
                      </div>

                      {/* ── Détails de la fiche ── */}
                      {estDetaille && (
                        <div className="mt-4 pt-4 border-t border-border/30 flex flex-col gap-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {r.description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                            {[
                              { label: "Format",           val: r.format },
                              { label: "Taille",           val: r.taille },
                              { label: "Pages",            val: r.pages ? String(r.pages) : "—" },
                              { label: "Téléchargements",  val: String(r.telechargements) },
                              { label: "Généré par",       val: r.generePar },
                              { label: "Généré le",        val: r.dateFormate },
                              { label: "Catégorie",        val: r.categorie },
                              { label: "Statut",           val: r.statut },
                            ].map(d => (
                              <div key={d.label}
                                className="bg-white/[0.02] border border-border/30 rounded-lg px-3 py-2">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  {d.label}
                                </div>
                                <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                                  {d.val}
                                </div>
                              </div>
                            ))}
                          </div>

                          {r.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {r.tags.map(tag => (
                                <span key={tag}
                                  className="text-[10px] bg-white/5 border border-border/30
                                             rounded px-1.5 py-0.5 text-muted-foreground">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-[11px] text-muted-foreground-subtle leading-relaxed">
                            {SANS_FICHIER}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

    </div>
  )
}