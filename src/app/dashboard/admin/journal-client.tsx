"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Eraser,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { CarteSynthese } from "@/components/carte-synthese"
import { Section } from "@/components/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formaterDate, formaterHeure, separerMilliers } from "@/lib/formats"
import { exporterJournal } from "@/lib/exports"
import {
  ACTIONS,
  acteursDuJournal,
  filtrerJournal,
  journalOrdonne,
  libelleAction,
  MAX_ENTREES,
  ORDRE_ACTIONS,
  resumerJournal,
} from "@/lib/journal"
import type { ActionJournal } from "@/lib/schemas/journal.schema"
import { useJournalStore } from "@/lib/store"
import { nomDuCompte } from "@/lib/utilisateurs"

/**
 * Le journal d'audit : ce qui a été fait dans la console, par qui, et à partir
 * de quel état.
 *
 * L'écran ne calcule rien lui-même : tout ce qu'il affiche sort des fonctions
 * pures de `lib/journal.ts`, qui se vérifient sans navigateur. C'est la règle
 * du projet depuis l'écran de qualité, et elle vaut doublement ici — un
 * contrôleur conteste un chiffre, pas une mise en page.
 */

/** Valeur du choix « tous » — un `Select` ne peut pas porter `null`. */
const TOUS = "__tous__"

export function JournalClient() {
  const entrees = useJournalStore((etat) => etat.entrees)

  const [recherche, setRecherche] = useState("")
  const [acteur, setActeur] = useState<string>(TOUS)
  const [action, setAction] = useState<string>(TOUS)

  const synthese = useMemo(() => resumerJournal(entrees), [entrees])
  const acteurs = useMemo(() => acteursDuJournal(entrees), [entrees])

  const affichees = useMemo(
    () =>
      journalOrdonne(
        filtrerJournal(entrees, {
          acteur: acteur === TOUS ? null : acteur,
          action: action === TOUS ? null : (action as ActionJournal),
          texte: recherche,
        })
      ),
    [entrees, acteur, action, recherche]
  )

  const pluriel = affichees.length > 1 ? "s" : ""

  /** N'exporte que ce qui est à l'écran, filtres compris — comme la liste des alertes. */
  function exporter() {
    try {
      const nomFichier = exporterJournal(affichees)
      toast.success(
        `${affichees.length} entrée${pluriel} exportée${pluriel}`,
        { description: `${nomFichier} — filtres en cours appliqués.` }
      )
    } catch (erreur) {
      toast.error("Export impossible", {
        description:
          erreur instanceof Error
            ? erreur.message
            : "Le fichier n'a pas pu être généré.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Retour ── */}
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Tableau de bord
      </Link>

      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              Journal d&apos;audit
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
            >
              Administrateur
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Chaque action métier de la console y est inscrite : qui l&apos;a
            faite, quand, à partir de quel état, et pour quel motif lorsque
            l&apos;action en exige un. Rien ne s&apos;en retire — c&apos;est le
            seul endroit où une décision annulée ou une note supprimée subsiste
            encore.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exporter}
          disabled={affichees.length === 0}
          title="Exporter au format CSV les entrées correspondant aux filtres"
          className="gap-2"
        >
          <Download size={14} />
          Exporter
        </Button>
      </div>

      {/* ── Portée du journal ── */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2.5">
        <span className="text-xs text-blue-300">
          Ce journal est celui de <strong>ce navigateur</strong>. Il enregistre
          les actions faites depuis cette console, quel que soit le compte
          connecté ; il ne remonte pas celles faites ailleurs, faute d&apos;API à
          qui les transmettre. Une piste d&apos;audit opposable se tiendrait côté
          serveur — même mécanisme, écrit au même endroit.
        </span>
      </div>

      {/* ── Journal saturé ── */}
      {synthese.sature && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5">
          <span className="text-xs text-amber-300">
            Le journal a atteint sa capacité de {separerMilliers(MAX_ENTREES)}{" "}
            entrées : les plus anciennes en sortent au fur et à mesure.
            Exportez-le avant qu&apos;elles ne disparaissent.
          </span>
        </div>
      )}

      {/* ── Synthèse ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteSynthese
          icone={ScrollText}
          libelle="Actions enregistrées"
          valeur={separerMilliers(synthese.total)}
          precision={
            synthese.premiere === null
              ? "Aucune action depuis ce navigateur"
              : `Depuis le ${formaterDate(synthese.premiere)}`
          }
        />
        <CarteSynthese
          icone={Eraser}
          libelle="Dont effacements"
          valeur={separerMilliers(synthese.effacements)}
          precision="Décisions annulées, notes supprimées, remises à zéro"
          accent={synthese.effacements > 0 ? "text-amber-400" : undefined}
        />
        <CarteSynthese
          icone={Users}
          libelle="Comptes intervenus"
          valeur={separerMilliers(synthese.acteurs)}
          precision="Distincts, sur la période couverte"
        />
        <CarteSynthese
          icone={ShieldCheck}
          libelle="Dernière action"
          valeur={
            synthese.derniere === null ? "—" : formaterHeure(synthese.derniere)
          }
          precision={
            synthese.derniere === null
              ? "Le journal est vide"
              : formaterDate(synthese.derniere)
          }
        />
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Rechercher une cible, un motif, un état..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            aria-label="Rechercher dans le journal d'audit"
            className="h-9 border-border/50 bg-card pl-9 text-sm"
          />
        </div>

        <Select value={acteur} onValueChange={(v) => setActeur(v ?? TOUS)}>
          <SelectTrigger
            size="sm"
            aria-label="Filtrer par compte"
            className="h-9 min-w-[190px] border-border/50 bg-card text-xs"
          >
            <SelectValue>
              {(valeur: string) =>
                valeur === TOUS ? "Tous les comptes" : nomDuCompte(valeur)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS} className="text-xs">
              Tous les comptes
            </SelectItem>
            {acteurs.map((email) => (
              <SelectItem key={email} value={email} className="text-xs">
                {nomDuCompte(email)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={(v) => setAction(v ?? TOUS)}>
          <SelectTrigger
            size="sm"
            aria-label="Filtrer par type d'action"
            className="h-9 min-w-[240px] border-border/50 bg-card text-xs"
          >
            <SelectValue>
              {(valeur: string) =>
                valeur === TOUS
                  ? "Toutes les actions"
                  : `${ACTIONS[valeur as ActionJournal].portee} · ${libelleAction(valeur as ActionJournal)}`
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS} className="text-xs">
              Toutes les actions
            </SelectItem>
            {ORDRE_ACTIONS.map((valeur) => (
              <SelectItem key={valeur} value={valeur} className="text-xs">
                {ACTIONS[valeur].portee} · {libelleAction(valeur)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">
          {separerMilliers(affichees.length)} entrée{pluriel} sur{" "}
          {separerMilliers(synthese.total)}
        </span>
      </div>

      {/* ── Le journal ── */}
      <Section
        titre="Actions enregistrées"
        icone={ScrollText}
        compte="de la plus récente à la plus ancienne"
      >
        {affichees.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {synthese.total === 0
              ? "Aucune action n'a encore été faite depuis ce navigateur. Changez un statut, décidez d'un dossier ou réglez un paramètre : l'entrée apparaîtra ici."
              : "Aucune entrée ne correspond à ces filtres."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs">Horodatage</TableHead>
                  <TableHead className="text-xs">Acteur</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Cible</TableHead>
                  <TableHead className="text-xs">Avant</TableHead>
                  <TableHead className="text-xs">Après</TableHead>
                  <TableHead className="text-xs">Motif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affichees.map((entree) => {
                  const config = ACTIONS[entree.action]
                  return (
                    <TableRow
                      key={entree.id}
                      className="border-border/50 align-top"
                    >
                      <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {formaterDate(entree.horodatage)}
                        <span className="ms-1.5">
                          {formaterHeure(entree.horodatage)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {nomDuCompte(entree.acteur)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={
                              config.effacement
                                ? "font-medium text-amber-400"
                                : ""
                            }
                          >
                            {config.libelle}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-border/60 text-[10px] text-muted-foreground"
                          >
                            {config.portee}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-[11px]">
                        {entree.cible ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {entree.avant ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs">
                        {entree.apres ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                        {entree.motif ?? "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  )
}
