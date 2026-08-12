"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle, ArrowLeft, Building2, Calendar, CheckCircle,
  FileText, History, MessageSquare, Receipt, Send, ShieldAlert,
  Trash2, Undo2, User,
} from "lucide-react"

import { ScoreIA, couleurScore } from "@/components/score-ia"
import { SelecteurAssignation } from "@/components/selecteur-assignation"
import { SelecteurStatut } from "@/components/selecteur-statut"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { USE_MOCK } from "@/lib/api/client"
import { DECISIONS, ORDRE_DECISIONS } from "@/lib/decisions"
import type { AlerteDetail } from "@/lib/schemas/alertes.schema"
import type { TypeDecision } from "@/lib/schemas/modifications.schema"
import { useAlerteDetail, useModificationsStore } from "@/lib/store"
import { nomDuCompte } from "@/lib/utilisateurs"

const risqueCfg: Record<string, string> = {
  "Élevé":  "bg-red-500/15 text-red-400 border-red-500/20",
  "Moyen":  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "Faible": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
}

const SANS_SESSION =
  "Une décision engage son auteur : elle ne peut être enregistrée sans compte connecté."

/**
 * Horodatage lisible, sans conversion de fuseau.
 *
 * `toLocaleString` donnerait un rendu différent sur le serveur et dans le
 * navigateur, donc un avertissement d'hydratation. Les horodatages sont en
 * UTC, qui est aussi l'heure de Dakar : les découper suffit, et le résultat
 * est identique des deux côtés.
 */
function formaterHorodatage(iso: string): string {
  const [date, heure] = iso.split("T")
  const [annee, mois, jour] = date.split("-")
  return `${jour}/${mois}/${annee} à ${heure.slice(0, 5)}`
}

/**
 * « 963 000 FCFA ».
 *
 * Écrit à la main plutôt qu'avec `toLocaleString` : celui-ci sépare les
 * milliers par une espace insécable étroite dont la présence dépend de la
 * version d'ICU, donc du serveur et du navigateur. Le rendu différerait entre
 * les deux, et les montants déjà mis en forme dans le jeu de données emploient
 * une espace ordinaire.
 */
const francs = (montant: number) =>
  `${montant.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`

// ─── Chronologie ──────────────────────────────────────────────────────────────

type EvenementAffiche = {
  horodatage: string
  libelle: string
  acteur: string | null
  /** Vrai pour ce qui a été fait dans cette console et n'a pas été transmis. */
  local: boolean
}

/**
 * La chronologie du serveur, augmentée de ce qui vient d'être fait.
 *
 * Les deux origines sont distinguées à l'écran : en mode démonstration, les
 * secondes ne quittent pas le navigateur, et laisser croire le contraire dans
 * un journal d'événements serait le pire endroit pour le faire.
 */
function construireChronologie(
  dossier: ReturnType<typeof useAlerteDetail>
): EvenementAffiche[] {
  const evenements: EvenementAffiche[] = dossier.chronologie.map((e) => ({
    ...e,
    local: false,
  }))

  for (const note of dossier.notes) {
    evenements.push({
      horodatage: note.horodatage,
      libelle: "Note interne ajoutée au dossier",
      acteur: note.auteur,
      local: true,
    })
  }

  if (dossier.decision) {
    const { type, acteur, horodatage } = dossier.decision
    evenements.push({
      horodatage,
      libelle: `Décision : ${DECISIONS[type].resume.toLowerCase()}`,
      acteur,
      local: true,
    })
  }

  return evenements.sort((a, b) => a.horodatage.localeCompare(b.horodatage))
}

// ─── Blocs ────────────────────────────────────────────────────────────────────

function Champ({
  icone: Icone,
  libelle,
  valeur,
  precision,
}: {
  icone: typeof User
  libelle: string
  valeur: string
  precision?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icone size={14} className="mt-0.5 shrink-0 text-muted-foreground/60" />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {libelle}
        </div>
        <div className="text-sm text-foreground">{valeur}</div>
        {precision && (
          <div className="font-mono text-[11px] text-muted-foreground">
            {precision}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  titre,
  icone: Icone,
  compte,
  children,
}: {
  titre: string
  icone: typeof User
  compte?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="mb-4 flex items-baseline gap-2">
          <Icone size={15} className="translate-y-0.5 text-muted-foreground/70" />
          <h2 className="text-sm font-semibold text-foreground">{titre}</h2>
          {compte && (
            <span className="text-xs text-muted-foreground">{compte}</span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export function AlerteClient({
  dossier: dossierServeur,
  utilisateur,
}: {
  dossier: AlerteDetail
  /** Adresse du compte connecté ; `null` si la session a expiré. */
  utilisateur: string | null
}) {
  const dossier = useAlerteDetail(dossierServeur)

  const decider = useModificationsStore((etat) => etat.deciderAlerte)
  const annulerDecision = useModificationsStore(
    (etat) => etat.annulerDecisionAlerte
  )
  const ajouterNote = useModificationsStore((etat) => etat.ajouterNote)
  const supprimerNote = useModificationsStore((etat) => etat.supprimerNote)

  const [typeChoisi, setTypeChoisi] = useState<TypeDecision | null>(null)
  const [motif, setMotif] = useState("")
  const [texteNote, setTexteNote] = useState("")
  const [envoi, setEnvoi] = useState(false)

  const chronologie = useMemo(() => construireChronologie(dossier), [dossier])

  const totalActes = useMemo(
    () => dossier.actes.reduce((somme, acte) => somme + acte.montant, 0),
    [dossier.actes]
  )
  const totalReference = useMemo(
    () => dossier.actes.reduce((somme, acte) => somme + acte.tarifReference, 0),
    [dossier.actes]
  )

  const enDemonstration = USE_MOCK
    ? "Enregistré dans ce navigateur uniquement (mode démonstration)."
    : undefined

  async function enregistrerDecision() {
    if (!typeChoisi || !utilisateur || motif.trim() === "") return
    setEnvoi(true)
    try {
      await decider(dossier.id, {
        type: typeChoisi,
        motif: motif.trim(),
        acteur: utilisateur,
        statutAnterieur: dossier.statut,
      })
      toast.success(`${dossier.id} — ${DECISIONS[typeChoisi].resume}`, {
        description: enDemonstration,
      })
      setTypeChoisi(null)
      setMotif("")
    } catch (erreur) {
      toast.error(`${dossier.id} — décision refusée`, {
        description:
          erreur instanceof Error ? erreur.message : "La décision n'a pas été enregistrée.",
      })
    } finally {
      setEnvoi(false)
    }
  }

  async function revenirSurLaDecision() {
    try {
      await annulerDecision(dossier.id)
      toast.success(`${dossier.id} — décision annulée`, {
        description: "Le dossier retrouve le statut qu'il avait avant.",
      })
    } catch (erreur) {
      toast.error(`${dossier.id} — annulation refusée`, {
        description:
          erreur instanceof Error ? erreur.message : "La décision est restée en place.",
      })
    }
  }

  async function enregistrerNote() {
    if (!utilisateur || texteNote.trim() === "") return
    setEnvoi(true)
    try {
      await ajouterNote(dossier.id, { texte: texteNote.trim(), auteur: utilisateur })
      setTexteNote("")
      toast.success(`${dossier.id} — note ajoutée`, { description: enDemonstration })
    } catch (erreur) {
      toast.error(`${dossier.id} — note non enregistrée`, {
        description: erreur instanceof Error ? erreur.message : undefined,
      })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Retour ── */}
      <Link
        href="/alertes"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Toutes les alertes
      </Link>

      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-bold text-emerald-400">
              {dossier.id}
            </h1>
            <Badge variant="outline" className={`text-[10px] font-semibold ${risqueCfg[dossier.risque]}`}>
              Risque {dossier.risque.toLowerCase()}
            </Badge>
            {dossier.estModifiee && (
              <Badge
                variant="outline"
                className="border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-300"
                title="Ce dossier porte des changements faits dans cette console."
              >
                Modifié localement
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {dossier.type} · {dossier.assure} · {dossier.etablissement}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SelecteurAssignation id={dossier.id} assigneA={dossier.assigneA} />
          <SelecteurStatut id={dossier.id} statut={dossier.statut} />
        </div>
      </div>

      {/* ── Résumé ── */}
      <Card className="border-border/50 bg-card">
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Champ
            icone={User}
            libelle="Assuré"
            valeur={dossier.assure}
            precision={`${dossier.assureRef} · contrat ${dossier.contratRef}`}
          />
          <Champ
            icone={Building2}
            libelle="Établissement"
            valeur={dossier.etablissement}
            precision={`${dossier.etablissementRef} · ${dossier.praticien}`}
          />
          <Champ
            icone={Receipt}
            libelle="Montant réclamé"
            valeur={dossier.montantFormate}
            precision={`${dossier.actes.length} acte${dossier.actes.length > 1 ? "s" : ""} facturé${dossier.actes.length > 1 ? "s" : ""}`}
          />
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-muted-foreground/60" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Score du moteur
              </div>
              <div
                className="text-sm font-semibold"
                style={{ color: couleurScore(dossier.scoreIA) }}
              >
                {dossier.scoreIA} / 100
              </div>
              <ScoreIA score={dossier.scoreIA} className="mt-1.5 max-w-[140px]" />
              {/*
                La décomposition du score est le différenciateur D1, en phase 4.
                Le dire ici vaut mieux que de laisser croire que « 94 » se
                suffit à lui-même : c'est précisément ce reproche qui est fait
                aux outils du marché.
              */}
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/70">
                Le détail facteur par facteur arrive en phase 4. Les signaux
                relevés sur chaque acte sont ci-dessous.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Décision ── */}
      <Section titre="Décision" icone={ShieldAlert}>
        {dossier.decision ? (
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border/50 bg-white/[0.02] p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-sm font-semibold text-foreground">
                  {DECISIONS[dossier.decision.type].resume}
                </span>
              </div>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                {dossier.decision.motif}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                {nomDuCompte(dossier.decision.acteur)} ·{" "}
                {formaterHorodatage(dossier.decision.horodatage)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={revenirSurLaDecision}
              title={`Rend au dossier son statut antérieur : ${dossier.decision.statutAnterieur}.`}
              className="gap-1.5"
            >
              <Undo2 size={13} />
              Revenir sur la décision
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {ORDRE_DECISIONS.map((type) => {
                const config = DECISIONS[type]
                const actif = typeChoisi === type
                return (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    disabled={!utilisateur}
                    aria-pressed={actif}
                    title={utilisateur ? config.aide : SANS_SESSION}
                    onClick={() => {
                      setTypeChoisi(actif ? null : type)
                      setMotif("")
                    }}
                    className={`${config.classes} ${actif ? "ring-2 ring-ring/40" : ""}`}
                  >
                    {config.libelle}
                  </Button>
                )
              })}
            </div>

            {typeChoisi ? (
              <div className="mt-4">
                <label
                  htmlFor="motif"
                  className="text-xs font-medium text-foreground"
                >
                  Motif — obligatoire
                </label>
                <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">
                  {DECISIONS[typeChoisi].invite}
                </p>
                <Textarea
                  id="motif"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Éléments sur lesquels repose la décision…"
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={enregistrerDecision}
                    disabled={envoi || motif.trim() === ""}
                    title={
                      motif.trim() === ""
                        ? "Une décision sans motif n'est opposable à personne."
                        : undefined
                    }
                    className="gap-1.5"
                  >
                    <CheckCircle size={13} />
                    Enregistrer la décision
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setTypeChoisi(null); setMotif("") }}
                  >
                    Annuler
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Le dossier passera en « {DECISIONS[typeChoisi].statut} ».
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {utilisateur
                  ? "Aucune décision n'a encore été prise sur ce dossier."
                  : SANS_SESSION}
              </p>
            )}
          </>
        )}
      </Section>

      {/* ── Actes facturés ── */}
      <Section
        titre="Actes facturés"
        icone={FileText}
        compte={`${dossier.actes.length} ligne${dossier.actes.length > 1 ? "s" : ""}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/30">
                {["Code", "Acte", "Date", "Qté", "Facturé", "Référence", "Écart"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dossier.actes.map((acte, rang) => {
                const ecart = acte.montant - acte.tarifReference
                return (
                  <tr
                    key={`${acte.code}-${acte.date}-${rang}`}
                    className="border-b border-border/20 align-top"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground">
                      {acte.code}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-foreground">{acte.libelle}</div>
                      {acte.signal && (
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-amber-400/90">
                          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                          {acte.signal}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {acte.dateFormate}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {acte.quantite}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-foreground">
                      {acte.montantFormate}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground">
                      {francs(acte.tarifReference)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                      {ecart === 0 ? (
                        <span className="text-muted-foreground/50">—</span>
                      ) : (
                        <span className="text-red-400">
                          +{francs(ecart)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/40">
                <td colSpan={4} className="px-3 py-3 text-xs font-semibold text-muted-foreground">
                  Total
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-foreground">
                  {francs(totalActes)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground">
                  {francs(totalReference)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold">
                  {totalActes - totalReference === 0 ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : (
                    <span className="text-red-400">
                      +{francs(totalActes - totalReference)}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/*
          Le service refuse de servir un dossier dont les actes ne totalisent pas
          le montant de l'alerte : ce total est donc toujours celui affiché en
          en-tête, et pas seulement « en principe ».
        */}
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Le total des actes correspond au montant réclamé. Les tarifs de
          référence sont ceux de la nomenclature en vigueur.
        </p>
      </Section>

      {/* ── Chronologie ── */}
      <Section titre="Chronologie du dossier" icone={History}>
        <ol className="flex flex-col gap-4">
          {chronologie.map((e, rang) => (
            <li key={`${e.horodatage}-${rang}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    e.local ? "bg-blue-400" : "bg-muted-foreground/40"
                  }`}
                />
                {rang < chronologie.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-border/50" />
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="text-sm text-foreground">{e.libelle}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/70">
                  <span>{formaterHorodatage(e.horodatage)}</span>
                  <span>·</span>
                  <span>{e.acteur ? nomDuCompte(e.acteur) : "Moteur de détection"}</span>
                  {e.local && (
                    <Badge
                      variant="outline"
                      className="border-blue-500/20 bg-blue-500/10 text-[9px] text-blue-300"
                      title="Fait dans cette console. En mode démonstration, cet événement n'a été transmis à aucun serveur."
                    >
                      non transmis
                    </Badge>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Notes internes ── */}
      <Section
        titre="Notes internes"
        icone={MessageSquare}
        compte={
          dossier.notes.length === 0
            ? "aucune"
            : `${dossier.notes.length} note${dossier.notes.length > 1 ? "s" : ""}`
        }
      >
        {dossier.notes.length > 0 && (
          <ul className="mb-4 flex flex-col gap-3">
            {dossier.notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-white/[0.02] p-3"
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {note.texte}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                    {nomDuCompte(note.auteur)} · {formaterHorodatage(note.horodatage)}
                  </p>
                </div>
                {/*
                  Une note ne se supprime que par son auteur : sur un fil
                  d'instruction, effacer le commentaire d'un collègue ne se
                  fait pas d'un clic sans laisser de trace.
                */}
                {note.auteur === utilisateur && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Supprimer cette note"
                    title="Supprimer cette note"
                    onClick={() => supprimerNote(dossier.id, note.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <label htmlFor="note" className="text-xs font-medium text-foreground">
          Ajouter une note
        </label>
        <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">
          Visible par les analystes du dossier. Ce n'est pas le motif de la
          décision : celui-là est opposable à l'établissement.
        </p>
        <Textarea
          id="note"
          value={texteNote}
          onChange={(e) => setTexteNote(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={!utilisateur}
          placeholder={
            utilisateur
              ? "Constat, échange avec l'établissement, pièce reçue…"
              : "Session expirée — reconnectez-vous pour écrire au dossier."
          }
        />
        <Button
          size="sm"
          onClick={enregistrerNote}
          disabled={envoi || !utilisateur || texteNote.trim() === ""}
          className="mt-3 gap-1.5"
        >
          <Send size={13} />
          Ajouter la note
        </Button>
      </Section>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
        <Calendar size={11} />
        Alerte levée le {dossier.dateFormate}.
        {USE_MOCK &&
          " Décisions et notes sont enregistrées dans ce navigateur uniquement."}
      </p>
    </div>
  )
}
