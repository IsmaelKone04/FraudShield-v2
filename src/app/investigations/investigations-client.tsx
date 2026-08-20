"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
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
  Search, Plus, ChevronDown, ChevronRight,
  AlertTriangle, Clock, Eye, CheckCircle,
  User, Calendar, FileText, Building2, RotateCcw, Undo2, Share2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SelecteurAssignation } from "@/components/selecteur-assignation"
import { USE_MOCK } from "@/lib/api/client"
import type { StatutInvestigation } from "@/lib/schemas/investigations.schema"
import {
  useInvestigationsAvecModifications,
  useModificationsStore,
  useNombreModifications,
} from "@/lib/store"
import { appliquerEcartStatuts, CARTES_INVESTIGATIONS } from "@/lib/stats-statuts"
import { nomDuCompte } from "@/lib/utilisateurs"


// ─── Config badges ────────────────────────────────────────────────────────────
const prioriteCfg: Record<string, string> = {
  "Critique": "bg-red-500/15 text-red-400 border-red-500/20",
  "Élevée":   "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Moyenne":  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "Faible":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
}

const statutCfg: Record<string, { className: string; icon: LucideIcon }> = {
  "En cours":   { className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",    icon: Clock        },
  "À vérifier": { className: "bg-blue-500/15 text-blue-400 border-blue-500/20",          icon: Eye          },
  "Clôturée":   { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle  },
}

const statIconMap: Record<string, LucideIcon> = {
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

/**
 * Le contrat d'un dossier ne porte ni notes ni création : ces deux boutons ne
 * peuvent rien faire tant que l'API de détection n'expose pas de quoi les servir.
 * Ils restent visibles — ils décrivent le dossier tel qu'il sera instruit — mais
 * inertes, et le disent (voir ADR-009).
 */
const SANS_NOTES =
  "Le contrat de données d'un dossier ne comporte pas de journal de notes : il n'y a nulle part où l'écrire."
const SANS_CREATION =
  "Ouvrir un dossier suppose une écriture côté service de détection. La console n'en crée pas : elle instruit ceux qu'elle reçoit."

// ─── Page ─────────────────────────────────────────────────────────────────────
import type { InvestigationsData } from "@/lib/schemas/investigations.schema"

export function InvestigationsClient({
  data,
  reseauParDossier,
}: {
  data: InvestigationsData
  /** Réseau de fraude de chaque dossier, quand il en a un. */
  reseauParDossier: Record<string, string>
}) {
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [recherche, setRecherche] = useState("")
  const [filtrePriorite, setPriorite] = useState("tous")
  const [filtreStatut,   setStatut]   = useState("tous")

  const toggle = (id: string) =>
    setExpanded(prev => prev === id ? null : id)

  // Les dossiers du serveur, augmentés des changements de l'utilisateur.
  const investigations = useInvestigationsAvecModifications(data.investigations)
  const changerStatut  = useModificationsStore(etat => etat.changerStatutInvestigation)
  const nombreModifs   = useNombreModifications()
  const reinitialiser  = useModificationsStore(etat => etat.reinitialiser)

  // Les cartes décrivent 24 dossiers ouverts depuis janvier, la liste n'en montre
  // que six : on reporte l'écart plutôt que de recompter (`lib/stats-statuts.ts`).
  const statsAJour = useMemo(
    () => appliquerEcartStatuts(
      data.stats, data.investigations, investigations, CARTES_INVESTIGATIONS
    ),
    [data.stats, data.investigations, investigations]
  )

  const filtrees = useMemo(() => {
    return investigations.filter(inv => {
      const q = recherche.toLowerCase()
      const matchRecherche =
        recherche === "" ||
        inv.id.toLowerCase().includes(q) ||
        inv.titre.toLowerCase().includes(q) ||
        // Le champ porte une adresse ; la recherche doit trouver le nom affiché.
        nomDuCompte(inv.assigne).toLowerCase().includes(q) ||
        inv.assigne.toLowerCase().includes(q)
      const matchPriorite = filtrePriorite === "tous" || inv.priorite === filtrePriorite
      const matchStatut   = filtreStatut   === "tous" || inv.statut   === filtreStatut
      return matchRecherche && matchPriorite && matchStatut
    })
  }, [recherche, filtrePriorite, filtreStatut, investigations])

  /**
   * Clôture un dossier, ou le rouvre. Même contrat optimiste que les alertes : le
   * changement s'affiche aussitôt et revient en arrière si l'envoi échoue.
   */
  async function basculerCloture(id: string, statut: StatutInvestigation) {
    const cible: StatutInvestigation =
      statut === "Clôturée" ? "En cours" : "Clôturée"
    try {
      await changerStatut(id, cible, statut)
      toast.success(`${id} — dossier ${cible === "Clôturée" ? "clôturé" : "rouvert"}`, {
        description: USE_MOCK
          ? "Enregistré dans ce navigateur uniquement (mode démonstration)."
          : undefined,
      })
    } catch (erreur) {
      toast.error(`${id} — changement de statut refusé`, {
        description:
          erreur instanceof Error
            ? erreur.message
            : "Le statut précédent a été rétabli.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Investigations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des enquêtes de fraude en cours
          </p>
        </div>
        <Button
          size="sm"
          disabled
          title={SANS_CREATION}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
        >
          <Plus size={14} />
          Nouvelle investigation
        </Button>
      </div>

      {/* ── Modifications non transmises ── */}
      {nombreModifs > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2.5">
          <span className="text-xs text-blue-300">
            {nombreModifs} modification{nombreModifs > 1 ? "s" : ""} enregistrée
            {nombreModifs > 1 ? "s" : ""} dans ce navigateur. En l'absence d'API de
            détection, elles ne sont transmises à aucun serveur.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={reinitialiser}
            className="ml-auto h-7 gap-1.5 text-xs text-blue-300 hover:text-blue-200"
          >
            <RotateCcw size={12} />
            Repartir du jeu d&apos;origine
          </Button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsAJour.map(stat => {
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
                className="border-border/50 bg-card overflow-hidden
                           hover:border-emerald-500/20 transition-colors"
              >
                {/* ── Header de la carte : la commande de dépli ── */}
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => toggle(inv.id)}
                    aria-expanded={isOpen}
                    aria-controls={`detail-${inv.id}`}
                    className="flex w-full cursor-pointer items-center gap-4 p-5 text-left
                               transition-colors hover:bg-white/[0.02]"
                  >

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
                        {inv.estModifiee && (
                          <Badge variant="outline"
                            title="Modifié dans ce navigateur, transmis à aucun serveur."
                            className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/20">
                            Modifié localement
                          </Badge>
                        )}
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
                          {nomDuCompte(inv.assigne)}
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
                  </button>

                  {/* ── Contenu expandé ── */}
                  {isOpen && (
                    <div
                      id={`detail-${inv.id}`}
                      className="border-t border-border/30 px-5 pb-5 pt-4"
                    >

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                        {inv.description}
                      </p>

                      {/* Détails en grille */}
                      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
                        {/* Le seul champ modifiable de cette grille : il porte son
                            propre contrôle plutôt qu'un texte figé. */}
                        <div
                          className="bg-white/[0.02] border border-border/30 rounded-lg p-3
                                     flex items-center gap-3"
                          onClick={e => e.stopPropagation()}
                        >
                          <User size={14} className="text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              Assigné à
                            </div>
                            <SelecteurAssignation
                              id={inv.id}
                              assigneA={inv.assigne}
                              cible="investigation"
                              className="-ml-2 h-6 text-xs font-semibold"
                            />
                          </div>
                        </div>

                        {[
                          { icon: Calendar,  label: "Ouvert le",      val: inv.dateOuverture.split("-").reverse().join("/") },
                          { icon: AlertTriangle, label: "Cas liés",   val: `${inv.casLies} cas, dont ${inv.alertesLiees.length} signalés` },
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

                      {/* Actions — hors du repli/dépli de la carte */}
                      <div
                        className="flex gap-2 flex-wrap"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* « Ouvrir le dossier » a été retiré : c'est exactement ce
                            que fait le clic sur la carte, et il n'existe pas d'écran
                            de détail à ouvrir par ailleurs. */}
                        {reseauParDossier[inv.id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-xs"
                            render={
                              <Link href={`/reseaux/${reseauParDossier[inv.id]}`} />
                            }
                          >
                            <Share2 size={13} />
                            Voir le réseau
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => basculerCloture(inv.id, inv.statut)}
                          className={inv.statut === "Clôturée"
                            ? "gap-2 text-xs bg-white/5 hover:bg-white/10 text-foreground border border-border/50"
                            : "gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs"}
                        >
                          {inv.statut === "Clôturée"
                            ? <><Undo2 size={13} /> Rouvrir le dossier</>
                            : <><CheckCircle size={13} /> Clôturer</>
                          }
                        </Button>
                        <Button size="sm" variant="outline"
                          disabled
                          title={SANS_NOTES}
                          className="gap-2 text-xs border-border/50">
                          <Plus size={13} />
                          Ajouter une note
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