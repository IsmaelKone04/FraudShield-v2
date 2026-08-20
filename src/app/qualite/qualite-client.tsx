"use client"

import Link from "next/link"
import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Gauge,
  LineChart as LineChartIcon,
} from "lucide-react"

import { BandeauDerive } from "@/components/bandeau-derive"
import { Section } from "@/components/section"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CAUSES } from "@/lib/decisions"
import { pourcentage, separerMilliers } from "@/lib/formats"
import {
  derivesConstatees,
  dernierMois,
  integrerDecisions,
  parMois,
  parTypeDeFraude,
  precision,
  rappelEstime,
  registreDesCauses,
  tauxFauxPositifs,
  tauxFauxPositifsModele,
  totaliser,
  tranches,
  type DecisionMesurable,
} from "@/lib/qualite"
import type { QualiteData } from "@/lib/schemas/qualite.schema"
import { useModificationsStore } from "@/lib/store"

const configGraphique = {
  precision: { label: "Précision", color: "oklch(0.809 0.210 152.7)" },
  rappel: { label: "Rappel estimé", color: "oklch(0.70 0.14 240)" },
  modele: { label: "Faux positifs imputables au modèle", color: "oklch(0.78 0.16 75)" },
} satisfies ChartConfig

export function QualiteClient({
  donnees,
  typesParAlerte,
}: {
  donnees: QualiteData
  /** Identifiant d'alerte → type de fraude, pour situer les décisions locales. */
  typesParAlerte: Record<string, string>
}) {
  const modifications = useModificationsStore((etat) => etat.alertes)

  /**
   * Les décisions prises dans cette console, réduites à ce que la mesure exige.
   *
   * C'est ici que la boucle se referme : classer un dossier sans suite déplace
   * les chiffres de cet écran. Sans cela, la qualification faite à la clôture
   * n'irait nulle part, et le registre ne serait qu'un tableau de plus.
   */
  const decisionsLocales = useMemo<DecisionMesurable[]>(
    () =>
      Object.entries(modifications).flatMap(([id, modification]) => {
        const decision = modification.decision
        const typeFraude = typesParAlerte[id]
        if (!decision || !typeFraude) return []
        return [{ typeFraude, type: decision.type, cause: decision.cause }]
      }),
    [modifications, typesParAlerte]
  )

  const periodes = useMemo(
    () => integrerDecisions(donnees.periodes, decisionsLocales),
    [donnees.periodes, decisionsLocales]
  )

  const mois = dernierMois(periodes)
  const libelleDernierMois =
    periodes.find((periode) => periode.mois === mois)?.moisLibelle ?? "—"

  const serieMois = useMemo(() => parMois(periodes), [periodes])
  const parType = useMemo(() => parTypeDeFraude(periodes), [periodes])
  const parTypeDernierMois = useMemo(
    () =>
      new Map(
        parTypeDeFraude(
          periodes.filter((periode) => periode.mois === mois)
        ).map((serie) => [serie.typeFraude, serie])
      ),
    [periodes, mois]
  )
  const registre = useMemo(() => registreDesCauses(periodes), [periodes])
  const derives = useMemo(
    () => derivesConstatees(periodes, donnees.seuils),
    [periodes, donnees.seuils]
  )

  const totaux = useMemo(() => totaliser(periodes), [periodes])
  const seuilParType = new Map(
    donnees.seuils.map((seuil) => [seuil.typeFraude, seuil.seuil])
  )

  const donneesGraphique = serieMois.map((serie) => ({
    mois: serie.moisLibelle.replace(/ \d{4}$/, ""),
    precision: partEnPoints(precision(serie.totaux)),
    rappel: partEnPoints(rappelEstime(serie.totaux)),
    modele: partEnPoints(tauxFauxPositifsModele(serie.totaux)),
  }))

  const imputables = registre.filter((ligne) => ligne.imputableAuModele)
  const ailleurs = registre.filter((ligne) => !ligne.imputableAuModele)
  const totalImputables = imputables.reduce((n, ligne) => n + ligne.quantite, 0)
  const totalAilleurs = ailleurs.reduce((n, ligne) => n + ligne.quantite, 0)

  const baseEstimation =
    periodes.find((periode) => periode.mois === mois)?.baseEstimation ?? ""

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Tableau de bord
      </Link>

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Qualité du modèle</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Ce que valaient les alertes, une fois les dossiers refermés.{" "}
          {donnees.periodeObservee}.
        </p>
        {decisionsLocales.length > 0 && (
          <p className="mt-2 text-xs text-blue-300">
            {decisionsLocales.length} décision
            {decisionsLocales.length > 1 ? "s" : ""} prise
            {decisionsLocales.length > 1 ? "s" : ""} dans cette console
            {" "}{decisionsLocales.length > 1 ? "sont comptées" : "est comptée"} ci-dessous,
            rattachée{decisionsLocales.length > 1 ? "s" : ""} à {libelleDernierMois} —
            le jeu de démonstration s&apos;y arrête, et ouvrir un mois vide ferait
            plonger les courbes sans que le modèle y soit pour rien.
          </p>
        )}
      </div>

      {/* ── Dérive ── */}
      <BandeauDerive derives={derives} mois={libelleDernierMois} />

      {/* ── Les quatre chiffres ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Chiffre
          libelle="Précision"
          valeur={pourcentage(precision(totaux), 1)}
          precision={`${separerMilliers(totaux.confirmes)} fraudes établies sur ${separerMilliers(tranches(totaux))} dossiers tranchés`}
        />
        <Chiffre
          libelle="Rappel estimé"
          valeur={pourcentage(rappelEstime(totaux), 1)}
          precision={`Estimation : ${separerMilliers(totaux.manquesEstimes)} fraudes non signalées sur la période`}
          reserve={baseEstimation}
        />
        <Chiffre
          libelle="Faux positifs"
          valeur={pourcentage(tauxFauxPositifs(totaux), 1)}
          precision={`${separerMilliers(totaux.fauxPositifs)} alertes écartées après instruction`}
        />
        <Chiffre
          libelle="Dont imputables au modèle"
          valeur={pourcentage(tauxFauxPositifsModele(totaux), 1)}
          precision={`${separerMilliers(totaux.fauxPositifsModele)} se corrigent en reprenant le modèle ; ${separerMilliers(totaux.fauxPositifs - totaux.fauxPositifsModele)} non`}
        />
      </div>

      {/* ── Qualité dans le temps ── */}
      <Section
        titre="Qualité dans le temps"
        icone={LineChartIcon}
        compte={`${serieMois.length} mois`}
      >
        <ChartContainer config={configGraphique} className="h-[260px] w-full">
          <LineChart data={donneesGraphique} margin={{ left: -18, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="mois"
              tickLine={false}
              axisLine={false}
              fontSize={11}
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
                  // La virgule décimale et le « % » sont posés ici plutôt que
                  // dans les données : le graphique a besoin de nombres.
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
            {(["precision", "rappel", "modele"] as const).map((cle) => (
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
        <div className="mt-3 flex flex-wrap gap-4">
          {(["precision", "rappel", "modele"] as const).map((cle) => (
            <span key={cle} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ background: `var(--color-${cle})` }}
              />
              {configGraphique[cle].label}
            </span>
          ))}
        </div>
        <p className="mt-3 max-w-prose text-[11px] text-muted-foreground-subtle">
          Le taux de faux positifs n&apos;est pas tracé : il est le complément
          exact de la précision, et deux courbes symétriques n&apos;apprennent
          rien de plus. Seule la part imputable au modèle est portée, parce
          qu&apos;elle seule se corrige en le reprenant.
        </p>
      </Section>

      {/* ── Par type de fraude ── */}
      <Section
        titre="Par type de fraude"
        icone={Gauge}
        compte={`dérive mesurée sur ${libelleDernierMois}`}
      >
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-xs">Type de fraude</TableHead>
              <TableHead className="text-right text-xs">Tranchés</TableHead>
              <TableHead className="text-right text-xs">Faux positifs</TableHead>
              <TableHead className="text-right text-xs">Taux</TableHead>
              <TableHead className="text-right text-xs">
                Modèle · {libelleDernierMois}
              </TableHead>
              <TableHead className="text-right text-xs">Seuil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parType.map((serie) => {
              const dernier = parTypeDernierMois.get(serie.typeFraude)
              const tauxModele = dernier
                ? tauxFauxPositifsModele(dernier.totaux)
                : null
              const seuil = seuilParType.get(serie.typeFraude) ?? null
              const decroche =
                tauxModele !== null && seuil !== null && tauxModele > seuil

              return (
                <TableRow key={serie.typeFraude} className="border-border/50">
                  <TableCell className="text-xs font-medium">
                    {serie.typeFraude}
                    {decroche && (
                      <Badge
                        variant="outline"
                        className="ms-2 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-400"
                      >
                        décroche
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {separerMilliers(tranches(serie.totaux))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {separerMilliers(serie.totaux.fauxPositifs)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {pourcentage(tauxFauxPositifs(serie.totaux), 1)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-xs ${decroche ? "font-semibold text-amber-400" : ""}`}
                  >
                    {pourcentage(tauxModele, 1)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {seuil === null ? "—" : pourcentage(seuil)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Section>

      {/* ── Registre des faux positifs ── */}
      <Section
        titre="Registre des faux positifs"
        icone={ClipboardList}
        compte={`${separerMilliers(totaux.fauxPositifs)} alertes écartées`}
      >
        <p className="mb-4 max-w-prose text-xs text-muted-foreground">
          Chaque ligne vient d&apos;une clôture qualifiée par un analyste. Les
          deux blocs ne se corrigent pas au même endroit :{" "}
          {separerMilliers(totalImputables)} dossiers appellent une reprise du
          modèle, {separerMilliers(totalAilleurs)} une correction en amont ou au
          référentiel.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <BlocCauses
            titre="À corriger dans le modèle"
            lignes={imputables}
            total={totaux.fauxPositifs}
            couleur="bg-amber-400/70"
          />
          <BlocCauses
            titre="À corriger ailleurs"
            lignes={ailleurs}
            total={totaux.fauxPositifs}
            couleur="bg-blue-400/60"
          />
        </div>
      </Section>

      {/* ── Établissements générateurs de bruit ── */}
      <Section
        titre="Établissements générateurs de bruit"
        icone={Building2}
        compte={`${donnees.etablissementsBruyants.length} établissements`}
      >
        <p className="mb-4 max-w-prose text-xs text-muted-foreground">
          Ceux dont les alertes finissent le plus souvent écartées. Un
          établissement qui produit quarante alertes dont trente-quatre sont des
          doublons de transmission n&apos;appelle pas un réentraînement : il
          appelle un appel téléphonique.
        </p>
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-xs">Établissement</TableHead>
              <TableHead className="text-right text-xs">Alertes</TableHead>
              <TableHead className="text-right text-xs">Écartées</TableHead>
              <TableHead className="text-right text-xs">Part</TableHead>
              <TableHead className="text-xs">Cause principale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donnees.etablissementsBruyants.map((etablissement) => (
              <TableRow key={etablissement.nom} className="border-border/50">
                <TableCell className="text-xs font-medium">
                  {etablissement.nom}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {etablissement.alertes}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {etablissement.fauxPositifs}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {pourcentage(
                    etablissement.fauxPositifs / etablissement.alertes
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  <span className="text-muted-foreground">
                    {CAUSES[etablissement.causePrincipale].libelle}
                  </span>
                  <span className="block text-[10px] text-muted-foreground-subtle">
                    {CAUSES[etablissement.causePrincipale].imputableAuModele
                      ? "se corrige dans le modèle"
                      : "se corrige en amont"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  )
}

// ─── Blocs ────────────────────────────────────────────────────────────────────

/** Une proportion en points, arrondie au dixième, `null` compris. */
function partEnPoints(part: number | null): number | null {
  return part === null ? null : Math.round(part * 1000) / 10
}

function Chiffre({
  libelle,
  valeur,
  precision,
  reserve,
}: {
  libelle: string
  valeur: string
  precision: string
  /** Ce qu'il faut savoir pour ne pas prendre le chiffre pour une mesure. */
  reserve?: string
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {libelle}
        </p>
        <p className="mt-1 font-mono text-2xl font-bold text-foreground">
          {valeur}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{precision}</p>
        {reserve && (
          <p className="mt-1 text-[11px] italic text-muted-foreground-subtle">
            {reserve}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function BlocCauses({
  titre,
  lignes,
  total,
  couleur,
}: {
  titre: string
  lignes: ReturnType<typeof registreDesCauses>
  total: number
  couleur: string
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-foreground">{titre}</p>
      {lignes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucun faux positif de cette nature sur la période.
        </p>
      ) : (
        <ul className="space-y-3">
          {lignes.map((ligne) => (
            <li key={ligne.cause}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-foreground">
                  {CAUSES[ligne.cause].libelle}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {separerMilliers(ligne.quantite)} · {pourcentage(ligne.part)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${couleur}`}
                  style={{
                    width: `${total === 0 ? 0 : (ligne.quantite / total) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground-subtle">
                {CAUSES[ligne.cause].aide}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
