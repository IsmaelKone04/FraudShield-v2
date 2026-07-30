"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Shield, Bell, Database, Users, Settings,
  Save, Plus, RefreshCw, Clock, CheckCircle,
  AlertTriangle, Key, Globe, HardDrive,
} from "lucide-react"
import data from "./data.json"

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

const statutModeleCfg: Record<string, { className: string; icon: any }> = {
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

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full border transition-all duration-200
                  ${value
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-white/5 border-border/50"}`}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ParametresPage() {
  const [activeSection, setActiveSection] = useState("general")

  // État paramètres système
  const [seuil,            setSeuil]     = useState(data.parametresSysteme.seuilAlerteIA)
  const [autoAnalyse,      setAuto]      = useState(data.parametresSysteme.analyseAutomatique)
  const [notifEmail,       setEmail]     = useState(data.parametresSysteme.notificationEmail)
  const [notifSMS,         setSMS]       = useState(data.parametresSysteme.notificationSMS)
  const [exportAuto,       setExport]    = useState(data.parametresSysteme.exportAutomatique)
  const [frequence,        setFrequence] = useState(data.parametresSysteme.frequenceAnalyse)
  const [retention,        setRetention] = useState(String(data.parametresSysteme.retentionDonnees))
  const [saved,            setSaved]     = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
        <Button
          size="sm"
          onClick={handleSave}
          className={`gap-2 font-semibold text-xs transition-all
            ${saved
              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-black"}`}
        >
          {saved
            ? <><CheckCircle size={13} /> Enregistré !</>
            : <><Save size={13} /> Enregistrer</>
          }
        </Button>
      </div>

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
                    description={`Score minimum pour déclencher une alerte — actuellement ${seuil}%`}
                  >
                    <div className="flex items-center gap-3 w-64">
                      <input
                        type="range" min={0} max={100} value={seuil}
                        onChange={e => setSeuil(Number(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="text-sm font-bold text-emerald-400 w-10 text-right font-mono">
                        {seuil}%
                      </span>
                    </div>
                  </SettingRow>

                  <SettingRow
                    label="Analyse automatique"
                    description="Analyser les dossiers dès leur importation"
                  >
                    <Toggle value={autoAnalyse} onChange={setAuto} />
                  </SettingRow>

                  <SettingRow
                    label="Fréquence d'analyse"
                    description="Cadence du moteur de détection"
                  >
                    <Select value={frequence} onValueChange={(v) => setFrequence(v ?? "")}>
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
                    <Toggle value={exportAuto} onChange={setExport} />
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
                  <SettingRow label="Fuseau horaire" description="Dakar, Sénégal (UTC+0)">
                    <Select defaultValue="Africa/Dakar">
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
                    <Select value={retention} onValueChange={(v) => setRetention(v ?? "")}>
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
                  <Toggle value={notifEmail} onChange={setEmail} />
                </SettingRow>
                <SettingRow
                  label="Notifications SMS"
                  description="Recevoir les alertes de niveau élevé par SMS"
                >
                  <Toggle value={notifSMS} onChange={setSMS} />
                </SettingRow>
                <SettingRow
                  label="Alertes en temps réel"
                  description="Notifications instantanées dans l'interface"
                >
                  <Toggle value={true} onChange={() => {}} />
                </SettingRow>
                <SettingRow
                  label="Résumé quotidien"
                  description="Recevoir un résumé des activités chaque matin à 8h"
                >
                  <Toggle value={false} onChange={() => {}} />
                </SettingRow>
                <SettingRow
                  label="Rapport hebdomadaire"
                  description="Résumé automatique chaque lundi matin"
                >
                  <Toggle value={true} onChange={() => {}} />
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
                        <th key={h}
                          className="text-left text-[10px] font-semibold uppercase
                                     tracking-wider text-muted-foreground/60 px-4 py-3">
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
                        <th key={h}
                          className="text-left text-[10px] font-semibold uppercase
                                     tracking-wider text-muted-foreground/60 px-4 py-3">
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
                  <SettingRow
                    label="URL de l'API backend"
                    description="Endpoint FastAPI — laisser vide en mode mock"
                  >
                    <Input
                      defaultValue="http://localhost:8000/api/v1"
                      className="w-72 h-8 text-xs font-mono bg-white/5 border-border/50"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Mode mock (données locales)"
                    description="Désactiver pour se connecter au vrai backend"
                  >
                    <Toggle value={true} onChange={() => {}} />
                  </SettingRow>
                  <SettingRow
                    label="Authentification JWT"
                    description="Token d'authentification — généré automatiquement"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value="••••••••••••••••••••••••"
                        readOnly
                        className="w-48 h-8 text-xs font-mono bg-white/5 border-border/50"
                      />
                      <Button size="sm" variant="outline"
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
                    <Toggle value={true} onChange={() => {}} />
                  </SettingRow>
                  <SettingRow
                    label="Niveau de log"
                    description="Niveau de détail des journaux système"
                  >
                    <Select defaultValue="info">
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
                    <Toggle value={false} onChange={() => {}} />
                  </SettingRow>
                </CardContent>
              </Card>
            </>
          )}

          {/* Bouton save bas de page */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              className={`gap-2 font-semibold text-xs transition-all
                ${saved
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-black"}`}
            >
              {saved
                ? <><CheckCircle size={13} /> Enregistré !</>
                : <><Save size={13} /> Enregistrer les modifications</>
              }
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}