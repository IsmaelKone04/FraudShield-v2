"use client"

import { useMemo, useState } from "react"
import {
  BadgeCheck,
  Calculator,
  RotateCcw,
  ShieldQuestion,
  TriangleAlert,
} from "lucide-react"

import { DecompositionScore } from "@/components/decomposition-score"
import { ScoreIA, couleurScore } from "@/components/score-ia"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MESURES,
  SOURCE_MODELE,
  declarationMediane,
  modalites,
  noter,
  type Declaration,
} from "@/lib/modele/scorer"
import { pourcentage, separerMilliers } from "@/lib/formats"

/**
 * Soumettre une déclaration, et voir pourquoi elle est notée ainsi.
 *
 * L'écran n'existe pas pour faire la démonstration d'un modèle : il existe
 * parce qu'un score qu'on ne peut pas interroger ne se conteste pas. On change
 * une valeur, le score bouge, et la décomposition dit de combien — c'est la
 * seule façon de vérifier qu'un modèle fait ce qu'il prétend faire.
 *
 * Le calcul se fait dans le navigateur : le modèle tient en treize kilo-octets
 * de coefficients, et un aller-retour au serveur pour une addition
 * n'apporterait qu'une latence.
 */

/** Les variables que l'écran laisse manipuler, et pourquoi celles-là. */
const CHAMPS_QUALITATIFS = [
  {
    colonne: "authorities_contacted",
    libelle: "Autorités contactées",
    aide: "La variable la plus lourde du modèle : 21,1 % de fraudes quand aucune ne l'a été, contre 7,8 % avec la police.",
  },
  {
    colonne: "incident_severity",
    libelle: "Gravité constatée",
    aide: "14,8 % de fraudes sur les pertes totales, contre 9,6 % sur les dommages mineurs.",
  },
  {
    colonne: "incident_type",
    libelle: "Type de sinistre",
    aide: null,
  },
  {
    colonne: "insured_occupation",
    libelle: "Profession de l'assuré",
    aide: null,
  },
] as const

const CHAMPS_QUANTITATIFS = [
  {
    colonne: "claim_amount",
    libelle: "Montant réclamé",
    unite: "$",
    pas: 500,
  },
  {
    colonne: "total_claim_amount",
    libelle: "Montant retenu par l'expertise",
    unite: "$",
    pas: 500,
  },
  { colonne: "witnesses", libelle: "Témoins déclarés", unite: "", pas: 1 },
  { colonne: "insured_age", libelle: "Âge de l'assuré", unite: "ans", pas: 1 },
] as const

export function NotationClient() {
  const mediane = useMemo(() => declarationMediane(), [])
  const [declaration, setDeclaration] = useState<Declaration>(mediane)

  const notation = useMemo(
    () => noter(declaration, "2026-08-26T00:00:00.000Z"),
    [declaration]
  )
  // Le dossier moyen sert de repère : sans lui, on ne sait pas si 62 est
  // beaucoup.
  const repere = useMemo(
    () => noter(mediane, "2026-08-26T00:00:00.000Z"),
    [mediane]
  )

  const modifier = (colonne: string, valeur: string | number) =>
    setDeclaration((d) => ({ ...d, [colonne]: valeur }))

  const modifiee = Object.keys(mediane).some(
    (c) => String(declaration[c]) !== String(mediane[c])
  )

  const ecart = notation.score - repere.score

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Notation d&apos;une déclaration
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Le modèle appris sur{" "}
          {separerMilliers(SOURCE_MODELE.lignes)} déclarations d&apos;assurance
          automobile, appliqué à un dossier que vous composez. Changez une
          valeur : le score bouge, et la décomposition dit de combien.
        </p>
      </div>

      {/*
        Le rappel n'est pas une précaution de façade. Ce modèle est appris sur
        de l'automobile ; le reste de la console instruit de l'assurance
        maladie. Laisser croire qu'il note les alertes serait la seule
        sur-promesse du projet.
      */}
      <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/90">
        <ShieldQuestion size={14} className="mt-0.5 shrink-0" />
        <span>
          Ces déclarations sont <strong>automobiles</strong>. Les alertes de la
          console relèvent de l&apos;assurance maladie et ne sont pas notées par ce
          modèle : ce sont deux domaines, et aucun chiffre ne passe de l&apos;un à
          l&apos;autre.
        </span>
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
        {/* ── Le dossier ── */}
        <Section
          titre="La déclaration"
          icone={Calculator}
          compte="dossier moyen du portefeuille au départ"
          action={
            modifiee ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeclaration(mediane)}
                className="h-7 gap-1.5 text-xs"
              >
                <RotateCcw size={12} />
                Repartir du dossier moyen
              </Button>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            {CHAMPS_QUALITATIFS.map(({ colonne, libelle, aide }) => (
              <div key={colonne} className="flex flex-col gap-1.5">
                <Label htmlFor={colonne} className="text-xs">
                  {libelle}
                </Label>
                <Select
                  value={String(declaration[colonne])}
                  onValueChange={(v) => v && modifier(colonne, v)}
                >
                  <SelectTrigger id={colonne} className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modalites(colonne).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aide && (
                  <p className="text-[11px] leading-snug text-muted-foreground-subtle">
                    {aide}
                  </p>
                )}
              </div>
            ))}

            {CHAMPS_QUANTITATIFS.map(({ colonne, libelle, unite, pas }) => (
              <div key={colonne} className="flex flex-col gap-1.5">
                <Label htmlFor={colonne} className="text-xs">
                  {libelle}
                  {unite && (
                    <span className="text-muted-foreground-subtle"> ({unite})</span>
                  )}
                </Label>
                <Input
                  id={colonne}
                  type="number"
                  step={pas}
                  min={0}
                  value={String(declaration[colonne])}
                  onChange={(e) => modifier(colonne, Number(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-snug text-muted-foreground-subtle">
            Les {SOURCE_MODELE.lignes > 0 ? "autres" : ""} variables du modèle —
            État du contrat, franchise, prime, heure du sinistre, nombre de
            véhicules, blessés, constat — restent à leur valeur moyenne. Elles
            comptent dans le score, sous « ensemble des autres variables ».
          </p>
        </Section>

        {/* ── Ce que le modèle en dit ── */}
        <div className="flex flex-col gap-6">
          <Section titre="Le score" icone={BadgeCheck}>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <div
                  className="font-mono text-5xl font-bold leading-none"
                  style={{ color: couleurScore(notation.score) }}
                >
                  {notation.score}
                  <span className="text-2xl text-muted-foreground-subtle">
                    {" "}
                    / 100
                  </span>
                </div>
                <ScoreIA score={notation.score} className="mt-3 w-40" />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground-subtle">
                  Probabilité de fraude
                </div>
                <div className="mt-1 font-mono text-3xl font-bold text-foreground">
                  {pourcentage(notation.probabilite, 1)}
                </div>
                <p className="mt-1 max-w-[26ch] text-[11px] leading-snug text-muted-foreground-subtle">
                  Calibrée sur le taux de base du portefeuille (
                  {pourcentage(SOURCE_MODELE.tauxDeBase, 1)}).
                </p>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground-subtle">
                  Écart au dossier moyen
                </div>
                <div
                  className={`mt-1 font-mono text-3xl font-bold ${
                    ecart > 0
                      ? "text-red-400"
                      : ecart < 0
                        ? "text-emerald-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {ecart > 0 ? "+" : ecart < 0 ? "−" : ""}
                  {Math.abs(ecart)}
                </div>
                <p className="mt-1 max-w-[26ch] text-[11px] leading-snug text-muted-foreground-subtle">
                  Le dossier moyen du portefeuille est noté {repere.score}.
                </p>
              </div>
            </div>
          </Section>

          <Section
            titre="Pourquoi ce score"
            icone={Calculator}
            compte={`${notation.decomposition.facteurs.length} facteurs`}
          >
            <DecompositionScore
              score={notation.score}
              explication={notation.decomposition}
            />
          </Section>

          <Section
            titre="Ce que vaut ce modèle"
            icone={TriangleAlert}
            compte={`mesuré sur ${separerMilliers(SOURCE_MODELE.controle)} déclarations tenues à l'écart`}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Mesure
                valeur={MESURES.aireSousROC.toFixed(3).replace(".", ",")}
                libelle="aire sous la courbe ROC"
                precision="0,5 = tirage au sort"
              />
              <Mesure
                valeur={pourcentage(MESURES.ecartDeCalibration, 2)}
                libelle="écart de calibration"
                precision="entre promesse et constat"
              />
              <Mesure
                valeur={pourcentage(seuil60(MESURES).precision, 1)}
                libelle="précision au seuil 60"
                precision={`rappel ${pourcentage(seuil60(MESURES).rappel, 1)}`}
              />
              <Mesure
                valeur={seuil60(MESURES)
                  .dossiersParFraude.toFixed(1)
                  .replace(".", ",")}
                libelle="dossiers par fraude trouvée"
                precision={`contre ${(1 / SOURCE_MODELE.tauxDeBase)
                  .toFixed(1)
                  .replace(".", ",")} au hasard`}
              />
            </div>

            <p className="mt-4 max-w-prose text-[11px] leading-relaxed text-muted-foreground-subtle">
              L&apos;exactitude n&apos;est pas affichée, et c&apos;est délibéré :
              à {pourcentage(SOURCE_MODELE.tauxDeBase, 1)} de fraudes, un modèle
              qui répond « non » à tout en obtiendrait{" "}
              {pourcentage(1 - SOURCE_MODELE.tauxDeBase, 1)} sans avoir rien
              appris. Ce que ces chiffres disent est plus modeste et plus utile :
              la cellule instruit deux fois moins de dossiers pour trouver la
              même fraude.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

/** Le point de fonctionnement de référence, celui que la console affiche. */
function seuil60(mesures: typeof MESURES) {
  const point = mesures.pointsDeFonctionnement.find((p) => p.seuil === 60)
  if (!point) throw new Error("Le seuil 60 manque aux mesures du modèle")
  return point
}

function Mesure({
  valeur,
  libelle,
  precision,
}: {
  valeur: string
  libelle: string
  precision: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/40 bg-white/[0.02] p-3">
      <div className="truncate font-mono text-xl font-semibold text-foreground">
        {valeur}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{libelle}</div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground-subtle">
        {precision}
      </div>
    </div>
  )
}
