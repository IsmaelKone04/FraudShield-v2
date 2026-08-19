"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Bell, Database, Users, Settings,
  Save, Plus, RefreshCw, Clock, CheckCircle,
  AlertTriangle, Key, Globe, HardDrive, RotateCcw, SlidersHorizontal,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { API_URL, USE_MOCK } from "@/lib/api/client"
import type { ParametresData, ParametresSysteme } from "@/lib/schemas/parametres.schema"
import {
  ecartParametres,
  useModificationsStore,
  useParametresSysteme,
} from "@/lib/store"


// ─── Config ───────────────────────────────────────────────────────────────────
const roleCfg: Record<string, string> = {
  "Administrateur": "bg-red-500/15 text-red-400 border-red-500/20",
  "Superviseur":    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Agent d'analyse":"bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
}

const statutUserCfg: Record<string, string> = {
  "Actif":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Inactif": "bg-slate-500/15 text-slate-400 border-slate-500/20",
}

const statutModeleCfg: Record<string, { className: string; icon: LucideIcon }> = {
  "Actif":        { className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  "Entraînement": { className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",   icon: RefreshCw   },
  "Inactif":      { className: "bg-slate-500/15 text-slate-400 border-slate-500/20",      icon: AlertTriangle},
}

const sections = [
  { id: "general",       label: "Général",         icon: Settings  },
  { id: "notifications", label: "Notifications",   icon: Bell      },
  { id: "utilisateurs",  label: "Utilisateurs",    icon: Users     },
  { id: "modeles",       label: "Modèles IA",      icon: Database  },
  { id: "securite",      label: "Sécurité & API",  icon: Key       },
]

/**
 * Réglages dessinés dans la maquette mais absents du contrat de données : ils ne
 * sont rattachés à rien et ne peuvent donc pas être enregistrés. Plutôt que de
 * laisser croire le contraire, l'interrupteur est inerte et le dit.
 */
const NON_ENREGISTRE =
  "Réglage de la maquette : aucun champ correspondant dans le contrat de données, il n'est pas enregistré."

/**
 * Le répertoire des comptes est celui de `src/lib/utilisateurs.ts` : il sert à
 * l'authentification comme à l'assignation. Le modifier depuis cet écran
 * supposerait une API d'administration que la console n'a pas (voir ADR-009).
 */
const SANS_ADMINISTRATION =
  "L'annuaire est celui des comptes de la console (src/lib/utilisateurs.ts). Le modifier suppose une API d'administration, absente du périmètre."

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled, title }: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full border transition-all duration-200
                  ${value
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-white/5 border-border/50"}
                  ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow
                        transition-all duration-200
                        ${value ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  )
}

// ─── Section Row ──────────────────────────────────────────────────────────────
function SettingRow({
  label, description, children,
}: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0 pr-8">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Bouton d'enregistrement ──────────────────────────────────────────────────
/** Présent en haut et en bas de page : une seule définition pour les deux. */
function BoutonEnregistrer({ onSave, saved, enCours, libelle, size }: {
  onSave: () => void
  saved: boolean
  enCours: boolean
  libelle: string
  size?: "sm" | "default"
}) {
  return (
    <Button
      size={size}
      onClick={onSave}
      disabled={enCours}
      className={`gap-2 font-semibold text-xs transition-all
        ${saved
          ? "bg-emerald-600 hover:bg-emerald-600 text-white"
          : "bg-emerald-500 hover:bg-emerald-600 text-black"}`}
    >
      {saved
        ? <><CheckCircle size={13} /> Enregistré !</>
        : <><Save size={13} /> {libelle}</>
      }
    </Button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function ParametresClient({ data }: { data: ParametresData }) {
  const [activeSection, setActiveSection] = useState("general")

  // Les réglages du serveur, recouverts par ceux déjà enregistrés ici.
  const enregistres         = useParametresSysteme(data.parametresSysteme)
  const enregistrer         = useModificationsStore(etat => etat.enregistrerParametres)
  const remettreAZero       = useModificationsStore(etat => etat.reinitialiserParametres)
  const modifieLocalement   = useModificationsStore(etat => etat.parametres !== null)

  // Le formulaire travaille sur un brouillon : tant que « Enregistrer » n'a pas
  // été cliqué, rien n'est retenu.
  const [brouillon, setBrouillon] = useState<ParametresSysteme>(enregistres)
  const [saved,     setSaved]     = useState(false)
  const [enCours,   setEnCours]   = useState(false)

  /**
   * Le store est vide au premier rendu (`skipHydration`) puis se remplit après le
   * montage : le brouillon doit alors repartir des valeurs relues, sans quoi
   * l'écran afficherait les réglages d'origine et les réenregistrerait par-dessus.
   *
   * C'est le schéma « ajuster un état pendant le rendu » documenté par React,
   * préféré à un effet : React reprend le rendu avant de rien afficher, là où un
   * effet laisserait passer une image intermédiaire.
   */
  const [reference, setReference] = useState(enregistres)
  if (reference !== enregistres) {
    setReference(enregistres)
    setBrouillon(enregistres)
  }

  function modifier<C extends keyof ParametresSysteme>(
    cle: C,
    valeur: ParametresSysteme[C]
  ) {
    setBrouillon(etat => ({ ...etat, [cle]: valeur }))
  }

  /** Raccourcis de lecture, pour ne pas alourdir le formulaire. */
  const { seuilAlerteIA: seuil, analyseAutomatique: autoAnalyse,
          notificationEmail: notifEmail, notificationSMS: notifSMS,
          exportAutomatique: exportAuto, frequenceAnalyse: frequence } = brouillon

  async function handleSave() {
    setEnCours(true)
    try {
      // Seuls les réglages qui s'écartent du serveur sont conservés (ADR-006).
      // Les valeurs effectives d'avant et d'après accompagnent l'écart : c'est
      // d'elles que le journal tire « de 75 à 60 », l'écart seul ne le dirait pas.
      await enregistrer(
        ecartParametres(data.parametresSysteme, brouillon),
        enregistres,
        brouillon
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      toast.success("Paramètres enregistrés", {
        description:
          "Conservés dans ce navigateur : aucune API de configuration à qui les transmettre.",
      })
    } catch (erreur) {
      toast.error("Enregistrement impossible", {
        description:
          erreur instanceof Error
            ? erreur.message
            : "Les réglages n'ont pas pu être enregistrés.",
      })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration et administration de la plateforme
          </p>
        </div>
        <BoutonEnregistrer
          size="sm"
          onSave={handleSave}
          saved={saved}
          enCours={enCours}
          libelle="Enregistrer"
        />
      </div>

      {/* ── Réglages propres à ce navigateur ── */}
      {modifieLocalement && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2.5">
          <span className="text-xs text-blue-300">
            Ces réglages sont enregistrés dans ce navigateur et s'appliquent à la
            console. En l'absence d'API de configuration, ils ne sont transmis à
            aucun serveur et ne suivent pas votre compte.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={remettreAZero}
            className="ml-auto h-7 gap-1.5 text-xs text-blue-300 hover:text-blue-200"
          >
            <RotateCcw size={12} />
            Rétablir les valeurs d&apos;origine
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[220px_1fr] gap-6">

        {/* ── Nav latérale ── */}
        <div className="flex flex-col gap-1">
          {sections.map(s => {
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                            font-medium transition-all text-left
                            ${isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                            }`}
              >
                <s.icon size={15} />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* ── Contenu ── */}
        <div className="flex flex-col gap-4">

          {/* ════ GÉNÉRAL ════ */}
          {activeSection === "general" && (
            <>
              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Settings size={15} className="text-emerald-400" />
                    Paramètres généraux
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configuration du comportement du moteur de détection
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <SettingRow
                    label="Seuil d'alerte IA"
                    description={`Score minimum pour déclencher une alerte — les alertes en dessous sont signalées comme telles dans la liste`}
                  >
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-3 w-64">
                        <input
                          type="range" min={0} max={100} value={seuil}
                          aria-label="Seuil d'alerte IA, en pourcentage"
                          onChange={e => modifier("seuilAlerteIA", Number(e.target.value))}
                          className="flex-1 accent-emerald-500"
                        />
                        <span className="text-sm font-bold text-emerald-400 w-10 text-right font-mono">
                          {seuil}%
                        </span>
                      </div>
                      {/*
                        Ce curseur se règle autrement à l'aveugle : rien n'y dit
                        combien d'alertes le déplacement ajoute ou retire, ni ce
                        qu'il coûte en dossiers à instruire. Le simulateur le dit.
                      */}
                      <Link
                        href="/simulation"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        <SlidersHorizontal size={11} />
                        Simuler avant d&apos;appliquer
                      </Link>
                    </div>
                  </SettingRow>

                  <SettingRow
                    label="Analyse automatique"
                    description="Analyser les dossiers dès leur importation"
                  >
                    <Toggle value={autoAnalyse} onChange={v => modifier("analyseAutomatique", v)} />
                  </SettingRow>

                  <SettingRow
                    label="Fréquence d'analyse"
                    description="Cadence du moteur de détection"
                  >
                    <Select
                      value={frequence}
                      onValueChange={v => v && modifier("frequenceAnalyse", v)}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temps-reel">Temps réel</SelectItem>
                        <SelectItem value="toutes-heures">Toutes les heures</SelectItem>
                        <SelectItem value="quotidien">Quotidien</SelectItem>
                        <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow
                    label="Export automatique"
                    description="Générer les exports CSV chaque nuit à minuit"
                  >
                    <Toggle value={exportAuto} onChange={v => modifier("exportAutomatique", v)} />
                  </SettingRow>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Globe size={15} className="text-emerald-400" />
                    Localisation & Données
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <SettingRow label="Fuseau horaire" description="Fuseau de référence de la console">
                    <Select
                      value={brouillon.fuseauHoraire}
                      onValueChange={v => v && modifier("fuseauHoraire", v)}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Dakar">Africa/Dakar</SelectItem>
                        <SelectItem value="Africa/Abidjan">Africa/Abidjan</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow
                    label="Rétention des données"
                    description="Durée de conservation des dossiers archivés"
                  >
                    <Select
                      value={String(brouillon.retentionDonnees)}
                      onValueChange={v => v && modifier("retentionDonnees", Number(v))}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90 jours</SelectItem>
                        <SelectItem value="180">6 mois</SelectItem>
                        <SelectItem value="365">1 an</SelectItem>
                        <SelectItem value="730">2 ans</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </CardContent>
              </Card>
            </>
          )}

          {/* ════ NOTIFICATIONS ════ */}
          {activeSection === "notifications" && (
            <Card className="border-border/50 bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell size={15} className="text-emerald-400" />
                  Préférences de notifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Configurez comment et quand vous souhaitez être alerté
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <SettingRow
                  label="Notifications par email"
                  description="Recevoir les alertes critiques par email"
                >
                  <Toggle value={notifEmail} onChange={v => modifier("notificationEmail", v)} />
                </SettingRow>
                <SettingRow
                  label="Notifications SMS"
                  description="Recevoir les alertes de niveau élevé par SMS"
                >
                  <Toggle value={notifSMS} onChange={v => modifier("notificationSMS", v)} />
                </SettingRow>
                <SettingRow
                  label="Alertes en temps réel"
                  description="Notifications instantanées dans l'interface"
                >
                  <Toggle value={true} onChange={() => {}} disabled title={NON_ENREGISTRE} />
                </SettingRow>
                <SettingRow
                  label="Résumé quotidien"
                  description="Recevoir un résumé des activités chaque matin à 8h"
                >
                  <Toggle value={false} onChange={() => {}} disabled title={NON_ENREGISTRE} />
                </SettingRow>
                <SettingRow
                  label="Rapport hebdomadaire"
                  description="Résumé automatique chaque lundi matin"
                >
                  <Toggle value={true} onChange={() => {}} disabled title={NON_ENREGISTRE} />
                </SettingRow>
              </CardContent>
            </Card>
          )}

          {/* ════ UTILISATEURS ════ */}
          {activeSection === "utilisateurs" && (
            <Card className="border-border/50 bg-card overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Users size={15} className="text-emerald-400" />
                      Gestion des utilisateurs
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {data.utilisateurs.filter(u => u.statut === "Actif").length} actifs
                      sur {data.utilisateurs.length} utilisateurs
                    </CardDescription>
                  </div>
                  <Button size="sm"
                    disabled
                    title={SANS_ADMINISTRATION}
                    className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black
                               font-semibold text-xs">
                    <Plus size={13} />
                    Inviter
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/30">
                      {["Utilisateur","Email","Rôle","Dernière connexion","Statut","Action"].map(h => (
                        <th key={h} scope="col"
                          className="text-left text-[10px] font-semibold uppercase
                                     tracking-wider text-muted-foreground-subtle px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.utilisateurs.map(u => (
                      <tr key={u.id}
                        className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`size-8 rounded-full ${u.color} flex items-center
                                            justify-center text-xs font-bold text-white shrink-0`}>
                              {u.initiales}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {u.nom}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {u.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline"
                            className={`text-[10px] font-semibold ${roleCfg[u.role]}`}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock size={11} />
                            {u.derniereCo}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline"
                            className={`text-[10px] ${statutUserCfg[u.statut]}`}>
                            {u.statut}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Button size="sm" variant="ghost"
                            disabled
                            title={SANS_ADMINISTRATION}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground">
                            Éditer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* ════ MODÈLES IA ════ */}
          {activeSection === "modeles" && (
            <Card className="border-border/50 bg-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database size={15} className="text-emerald-400" />
                  Modèles de détection IA
                </CardTitle>
                <CardDescription className="text-xs">
                  {data.modeles.filter(m => m.statut === "Actif").length} modèles actifs
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/30">
                      {["Modèle","Type","Version","Précision","Dossiers traités","Dernier entraînement","Statut"].map(h => (
                        <th key={h} scope="col"
                          className="text-left text-[10px] font-semibold uppercase
                                     tracking-wider text-muted-foreground-subtle px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.modeles.map(m => {
                      const statConf = statutModeleCfg[m.statut]
                      const StatIcon = statConf?.icon
                      return (
                        <tr key={m.id}
                          className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-semibold text-foreground">{m.nom}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{m.id}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline"
                              className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {m.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs text-muted-foreground">
                              {m.version}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${m.precision}%` }}
                                  className="h-full bg-emerald-500 rounded-full"
                                />
                              </div>
                              <span className="text-xs font-bold text-emerald-400 font-mono">
                                {m.precision}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs text-foreground">
                              {m.dossiersTraites.toLocaleString("fr-FR")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock size={11} />
                              {m.dernierEntrainement}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline"
                              className={`text-[10px] flex items-center gap-1 w-fit ${statConf?.className}`}>
                              {StatIcon && (
                                <StatIcon
                                  size={9}
                                  className={m.statut === "Entraînement" ? "animate-spin" : ""}
                                />
                              )}
                              {m.statut}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* ════ SÉCURITÉ & API ════ */}
          {activeSection === "securite" && (
            <>
              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Key size={15} className="text-emerald-400" />
                    Clés API & Intégration Backend
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configuration de la connexion avec le backend FastAPI
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Ces trois lignes décrivent l'état réel de la configuration.
                      Elles étaient éditables et affichaient des valeurs inventées :
                      une adresse en dur, un interrupteur toujours à « oui », un
                      jeton de vingt-quatre points qui n'existait pas. */}
                  <SettingRow
                    label="URL de l'API backend"
                    description="Lue au démarrage dans NEXT_PUBLIC_API_URL — un champ de saisie ne peut pas la changer en cours de session"
                  >
                    <Input
                      value={API_URL}
                      readOnly
                      aria-label="URL de l'API backend, en lecture seule"
                      className="w-72 h-8 text-xs font-mono bg-white/5 border-border/50 text-muted-foreground"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Mode mock (données locales)"
                    description={USE_MOCK
                      ? "Actif : les écrans lisent les jeux de données locaux"
                      : "Inactif : les écrans interrogent l'API de détection"}
                  >
                    <Toggle
                      value={USE_MOCK}
                      onChange={() => {}}
                      disabled
                      title="Fixé au démarrage par la variable d'environnement NEXT_PUBLIC_USE_MOCK : un interrupteur ne peut pas le changer en cours de session."
                    />
                  </SettingRow>
                  <SettingRow
                    label="Authentification"
                    description="Session NextAuth, portée par un cookie httpOnly — jamais lisible depuis le navigateur, donc pas affichable ici"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline"
                        className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                        Cookie de session
                      </Badge>
                      <Button size="sm" variant="outline"
                        disabled
                        title="La session se renouvelle à la connexion. La régénérer depuis cet écran supposerait un jeton géré par la console, ce qui n'est pas le cas."
                        className="h-8 text-xs border-border/50">
                        Regénérer
                      </Button>
                    </div>
                  </SettingRow>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <HardDrive size={15} className="text-emerald-400" />
                    Sécurité & Conformité
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <SettingRow
                    label="Chiffrement des données"
                    description="Chiffrement AES-256 des données sensibles"
                  >
                    <Badge variant="outline"
                      className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                      Actif
                    </Badge>
                  </SettingRow>
                  <SettingRow
                    label="Journal des activités"
                    description="Traçabilité complète des actions utilisateurs"
                  >
                    <Toggle value={true} onChange={() => {}} disabled title={NON_ENREGISTRE} />
                  </SettingRow>
                  <SettingRow
                    label="Niveau de log"
                    description="Niveau de détail des journaux système"
                  >
                    <Select
                      value={brouillon.niveauLog}
                      onValueChange={v => v && modifier("niveauLog", v)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debug">Debug</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    label="Double authentification"
                    description="2FA obligatoire pour les administrateurs"
                  >
                    <Toggle value={false} onChange={() => {}} disabled title={NON_ENREGISTRE} />
                  </SettingRow>
                </CardContent>
              </Card>
            </>
          )}

          {/* Bouton save bas de page */}
          <div className="flex justify-end pt-2">
            <BoutonEnregistrer
              onSave={handleSave}
              saved={saved}
              enCours={enCours}
              libelle="Enregistrer les modifications"
            />
          </div>

        </div>
      </div>
    </div>
  )
}