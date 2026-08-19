"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowLeft,
  Check,
  Gauge,
  SlidersHorizontal,
  Target,
  TriangleAlert,
} from "lucide-react"

import { Section } from "@/components/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { USE_MOCK } from "@/lib/api/client"
import { francs, pourcentage, separerMilliers, signe } from "@/lib/formats"
import type { ParametresSysteme } from "@/lib/schemas/parametres.schema"
import type { SimulationData } from "@/lib/schemas/simulation.schema"
import {
  comparer,
  courbe,
  pointRecommande,
  seuilsPossibles,
  simuler,
} from "@/lib/simulation"
import {
  ecartParametres,
  useModificationsStore,
  useParametresSysteme,
} from "@/lib/store"

const configGraphique = {
  precision: { label: "Précision", color: "oklch(0.809 0.210 152.7)" },
  rappel: { label: "Rappel estimé", color: "oklch(0.70 0.14 240)" },
} satisfies ChartConfig

export function SimulationClient({
  population,
  parametresReference,
}: {
  population: SimulationData
  /** Réglages du serveur, avant tout changement local. */
  parametresReference: ParametresSysteme
}) {
  const parametres = useParametresSysteme(parametresReference)
  const enregistrer = useModificationsStore((etat) => etat.enregistrerParametres)

  /** Seuil réglé dans la console — le point de comparaison, et l'état de départ. */
  const seuilEnVigueur = parametres.seuilAlerteIA

  const seuils = useMemo(
    () => seuilsPossibles(population.tranches),
    [population.tranches]
  )
  const pas = seuils.length > 1 ? seuils[1] - seuils[0] : 5

  /** Le curseur part du seuil en vigueur, ramené sur la borne de tranche la plus proche. */
  const [seuil, setSeuil] = useState(() => arrondirSurBorne(seuilEnVigueur, seuils))
  const [envoi, setEnvoi] = useState(false)

  const points = useMemo(() => courbe(population), [population])
  const simulation = useMemo(() => simuler(population, seuil), [population, seuil])
  const depart = useMemo(
    () => simuler(population, arrondirSurBorne(seuilEnVigueur, seuils)),
    [population, seuilEnVigueur, seuils]
  )
  const recommandation = useMemo(() => pointRecommande(population), [population])
  /** Le seuil sous lequel les issues ont cessé d'être mesurées — le point de contrôle. */
  const pointCollecte = useMemo(
    () => simuler(population, population.seuilActuel),
    [population]
  )
  const ecart = comparer(depart, simulation)

  const identique = simulation.seuil === depart.seuil
  /** Vrai quand le curseur descend sous le seuil qui a servi à collecter les issues. */
  const enTerrainEstime = seuil < population.seuilActuel

  const donneesGraphique = points.map((point) => ({
    seuil: point.seuil,
    precision: enPoints(point.precision),
    rappel: enPoints(point.rappel),
  }))

  async function appliquer() {
    setEnvoi(true)
    try {
      // Seuls les réglages qui s'écartent du serveur sont conservés (ADR-006) :
      // le seuil est posé sur les valeurs courantes, et l'écart en est déduit.
      const apres = { ...parametres, seuilAlerteIA: seuil }
      await enregistrer(
        ecartParametres(parametresReference, apres),
        parametres,
        apres
      )
      toast.success(`Seuil de déclenchement porté à ${seuil} %`, {
        description: USE_MOCK
          ? "Enregistré dans ce navigateur uniquement (mode démonstration). La liste des alertes s'y conforme immédiatement."
          : undefined,
      })
    } catch (erreur) {
      toast.error("Le seuil n'a pas été appliqué", {
        description:
          erreur instanceof Error
            ? erreur.message
            : "Le réglage précédent a été rétabli.",
      })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href="/qualite"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Qualité du modèle
      </Link>

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Simulateur de seuils</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Ce qu&apos;un autre seuil aurait donné sur {population.periode} —{" "}
          {separerMilliers(
            population.tranches.reduce((somme, t) => somme + t.demandes, 0)
          )}{" "}
          demandes rejouées, alertées ou non. Sans cet écran, changer le seuil
          revient à attendre un mois pour savoir ce qu&apos;on a cassé.
        </p>
      </div>

      {/* ── Le curseur ── */}
      <Section
        titre="Seuil de déclenchement"
        icone={SlidersHorizontal}
        compte={`en vigueur : ${seuilEnVigueur} %`}
        action={
          <Button
            size="sm"
            onClick={appliquer}
            disabled={envoi || identique}
            title={
              identique
                ? "C'est déjà le seuil en vigueur."
                : `Porte le seuil de déclenchement à ${seuil} % dans les paramètres.`
            }
            className="gap-1.5"
          >
            <Check size={13} />
            Appliquer ce seuil
          </Button>
        }
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={seuils[0]}
            max={seuils[seuils.length - 1]}
            step={pas}
            value={seuil}
            aria-label="Seuil de déclenchement simulé, en pourcentage"
            onChange={(e) => setSeuil(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="w-16 text-right font-mono text-2xl font-bold text-emerald-400">
            {seuil} %
          </span>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Le rejeu procède par tranches de {pas} points : c&apos;est la finesse à
          laquelle la distribution des scores est fournie, et découper une tranche
          au jugé donnerait un chiffre que rien ne soutient.
        </p>

        {enTerrainEstime && (
          <p className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200/90">
            <TriangleAlert size={13} className="mr-1.5 inline align-[-2px]" />
            En dessous de {population.seuilActuel} %, aucune de ces demandes
            n&apos;a été instruite : ce qu&apos;elles auraient donné est{" "}
            <strong>estimé</strong>, pas mesuré. {population.baseAudit}
          </p>
        )}
      </Section>

      {/* ── Les quatre chiffres ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Chiffre
          libelle="Alertes levées"
          valeur={separerMilliers(simulation.alertes)}
          ecart={identique ? null : `${signe(ecart.alertes)} alertes`}
          precision={`sur ${population.periode}`}
        />
        <Chiffre
          libelle="Fraudes interceptées"
          valeur={separerMilliers(
            simulation.fraudesAverees + simulation.fraudesEstimees
          )}
          ecart={identique ? null : `${signe(ecart.fraudes)} fraudes`}
          precision={
            simulation.fraudesEstimees > 0
              ? `${separerMilliers(simulation.fraudesAverees)} établies · ${separerMilliers(simulation.fraudesEstimees)} estimées`
              : `${separerMilliers(simulation.fraudesAverees)} établies, aucune estimation`
          }
        />
        <Chiffre
          libelle="Montant couvert"
          valeur={francs(Math.round(simulation.montantCouvert))}
          ecart={
            identique ? null : `${signe(Math.round(ecart.montantCouvert / 1000))} k`
          }
          precision={
            simulation.montantEstime > 0
              ? `dont ${francs(Math.round(simulation.montantEstime))} reposant sur une estimation`
              : "entièrement établi sur des dossiers instruits"
          }
        />
        <Chiffre
          libelle="Charge induite"
          valeur={`${simulation.chargeJour.toFixed(1).replace(".", ",")} / jour`}
          ecart={
            identique
              ? null
              : `${signe(Math.round(ecart.chargeJour * 10) / 10)} dossiers`
          }
          precision={`capacité de la cellule : ${population.capaciteJour} dossiers par jour`}
          alerte={!simulation.tenable}
        />
      </div>

      {!simulation.tenable && (
        <div
          role="status"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm"
        >
          <p className="font-semibold text-red-300">
            Ce seuil produit plus de dossiers que la cellule n&apos;en instruit
          </p>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">
            {simulation.chargeJour.toFixed(1).replace(".", ",")} dossiers par jour
            ouvré pour une capacité de {population.capaciteJour}. Les alertes
            excédentaires ne disparaissent pas : elles s&apos;accumulent en file,
            et une alerte instruite trois semaines trop tard ne vaut pas grand
            chose de plus qu&apos;une alerte jamais levée.
          </p>
        </div>
      )}

      {/* ── Précision et rappel ── */}
      <Section
        titre="Précision et rappel, seuil par seuil"
        icone={Target}
        compte={`${points.length} points de fonctionnement`}
      >
        <ChartContainer config={configGraphique} className="h-[280px] w-full">
          <LineChart
            data={donneesGraphique}
            margin={{ left: -18, right: 8, top: 8 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="seuil"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(valeur) => `${valeur}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(valeur) => `${valeur} %`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(valeur) => `Seuil ${valeur} %`}
                  formatter={(valeur, nom) => (
                    <span className="flex w-full items-baseline justify-between gap-4">
                      <span className="text-muted-foreground">
                        {configGraphique[nom as keyof typeof configGraphique]
                          ?.label ?? nom}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {String(valeur).replace(".", ",")} %
                      </span>
                    </span>
                  )}
                />
              }
            />
            {/* Le seuil collecté : à sa gauche, tout devient estimation. */}
            <ReferenceLine
              x={population.seuilActuel}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              x={seuil}
              stroke="oklch(0.809 0.210 152.7)"
              strokeWidth={1.5}
            />
            {(["precision", "rappel"] as const).map((cle) => (
              <Line
                key={cle}
                dataKey={cle}
                type="monotone"
                stroke={`var(--color-${cle})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {(["precision", "rappel"] as const).map((cle) => (
            <span
              key={cle}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: `var(--color-${cle})` }}
              />
              {configGraphique[cle].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-px w-4 border-t border-dashed border-white/40" />
            Seuil sous lequel les issues ne sont plus mesurées
          </span>
        </div>

        <p className="mt-3 max-w-prose text-[11px] text-muted-foreground-subtle">
          Le rappel est une <strong>borne haute</strong> : une tranche où le
          sondage n&apos;a trouvé aucune fraude n&apos;en fait estimer aucune, ce
          qui n&apos;est pas la même chose que d&apos;affirmer qu&apos;il n&apos;y
          en a pas. Les fraudes réellement manquées sont donc au moins celles-là.
        </p>
        <p className="mt-1.5 max-w-prose text-[11px] text-muted-foreground-subtle">
          Point de contrôle : au seuil de {population.seuilActuel} %, ce
          graphique donne {pourcentage(pointCollecte.precision, 1)} de précision
          et {pourcentage(pointCollecte.rappel, 1)} de rappel — exactement les
          chiffres de {population.periode} sur{" "}
          <Link
            href="/qualite"
            className="underline underline-offset-2 hover:text-foreground"
          >
            l&apos;écran de qualité
          </Link>
          , qui les calcule à partir d&apos;un tout autre jeu de données. Deux
          chemins, un seul résultat.
        </p>
      </Section>

      {/* ── Recommandation ── */}
      {recommandation && (
        <Section
          titre="Point de fonctionnement recommandé"
          icone={Gauge}
          compte={`${recommandation.point.seuil} %`}
          action={
            recommandation.point.seuil === seuil ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
              >
                curseur positionné dessus
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSeuil(recommandation.point.seuil)}
                className="gap-1.5"
              >
                <Target size={13} />
                Placer le curseur ici
              </Button>
            )
          }
        >
          <p className="max-w-prose text-sm text-muted-foreground">
            <strong className="text-foreground">
              {recommandation.point.seuil} %
            </strong>{" "}
            — {pourcentage(recommandation.point.precision, 1)} de précision pour{" "}
            {pourcentage(recommandation.point.rappel, 1)} de rappel, soit{" "}
            {separerMilliers(recommandation.point.alertes)} alertes et{" "}
            {recommandation.point.chargeJour.toFixed(1).replace(".", ",")}{" "}
            dossiers par jour.
          </p>
          <p className="mt-2 max-w-prose text-xs text-muted-foreground">
            <strong className="text-foreground">Règle appliquée :</strong>{" "}
            {recommandation.regle}
          </p>
          {recommandation.contrainteParLaCharge && (
            <p className="mt-2 max-w-prose text-xs text-amber-200/80">
              Un seuil plus bas donnerait un meilleur équilibre, mais dépasserait
              la capacité de la cellule. Le point retenu est le meilleur{" "}
              <em>atteignable</em>, et cette nuance est le contraire d&apos;un
              détail : elle dit que le frein est le nombre d&apos;analystes, pas
              le modèle.
            </p>
          )}
        </Section>
      )}
    </div>
  )
}

// ─── Blocs ────────────────────────────────────────────────────────────────────

/** Ramène un seuil quelconque sur la borne de tranche immédiatement inférieure. */
function arrondirSurBorne(valeur: number, seuils: number[]): number {
  const candidats = seuils.filter((seuil) => seuil <= valeur)
  return candidats.length > 0 ? Math.max(...candidats) : seuils[0]
}

/** Une proportion en points, arrondie au dixième, `null` compris. */
function enPoints(part: number | null): number | null {
  return part === null ? null : Math.round(part * 1000) / 10
}

function Chiffre({
  libelle,
  valeur,
  precision,
  ecart,
  alerte = false,
}: {
  libelle: string
  valeur: string
  precision: string
  /** Écart au seuil en vigueur, `null` quand le curseur ne l'a pas quitté. */
  ecart?: string | null
  alerte?: boolean
}) {
  return (
    <Card
      className={`bg-card ${alerte ? "border-red-500/30" : "border-border/50"}`}
    >
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {libelle}
        </p>
        <p
          className={`mt-1 font-mono text-2xl font-bold ${alerte ? "text-red-400" : "text-foreground"}`}
        >
          {valeur}
        </p>
        {ecart && (
          <p className="mt-0.5 font-mono text-xs text-blue-300">
            {ecart} <span className="text-muted-foreground-subtle">vs seuil actuel</span>
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">{precision}</p>
      </CardContent>
    </Card>
  )
}
