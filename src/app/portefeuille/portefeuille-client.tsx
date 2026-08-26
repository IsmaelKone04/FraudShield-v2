"use client"

import { useState } from "react"
import { Layers, Ruler, ShieldQuestion, TrendingUp } from "lucide-react"

import { ComparatifContextuel } from "@/components/decomposition-score"
import { Section } from "@/components/section"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { separerMilliers } from "@/lib/formats"
import {
  DIMENSIONS,
  ENSEMBLE,
  SOURCE_PORTEFEUILLE,
  amplitude,
  comparatifs,
  parSinistralite,
} from "@/lib/portefeuille/reference"

/**
 * Le portefeuille comme référence de normalité.
 *
 * L'écran répond à la question que la console pose déjà sous chaque dossier :
 * *par rapport à quoi ?* On choisit un découpage, une cohorte, et l'on voit ce
 * qu'elle déclare comparée à l'ensemble.
 *
 * Il ne détecte rien, et c'est écrit : ce jeu ne porte aucune étiquette de
 * fraude. Une cohorte qui déclare plus souvent n'est pas une cohorte suspecte,
 * c'est une cohorte plus exposée — quatre conducteurs désignés sur un contrat
 * conduisent plus de kilomètres que deux.
 */
export function PortefeuilleClient() {
  const [cleDimension, setCleDimension] = useState(DIMENSIONS[0].cle)
  const dimensionChoisie =
    DIMENSIONS.find((d) => d.cle === cleDimension) ?? DIMENSIONS[0]
  const classement = parSinistralite(cleDimension)
  const [cleCohorte, setCleCohorte] = useState<string>(classement[0]?.cle ?? "")

  const cohorteChoisie =
    classement.find((c) => c.cle === cleCohorte) ?? classement[0]
  const lignes = comparatifs(cleDimension, cohorteChoisie?.cle)
  const rapport = amplitude(cleDimension)

  const changerDimension = (cle: string) => {
    setCleDimension(cle)
    setCleCohorte(parSinistralite(cle)[0]?.cle ?? "")
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Portefeuille de référence
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Ce qui est habituel dans un portefeuille de{" "}
          {separerMilliers(SOURCE_PORTEFEUILLE.contrats)} contrats automobiles.
          Un montant n&apos;est un argument que comparé à ce qui se pratique
          ailleurs.
        </p>
      </div>

      {/*
        La mise en garde n'est pas ornementale : ce jeu ne dit jamais si un
        sinistre était frauduleux. Présenter une cohorte sinistrée comme
        suspecte serait exactement le raccourci que la console reproche aux
        outils du marché.
      */}
      <p className="flex items-start gap-2 rounded-lg border border-blue-500/25 bg-blue-500/5 p-3 text-xs leading-relaxed text-blue-200/90">
        <ShieldQuestion size={14} className="mt-0.5 shrink-0" />
        <span>
          Ce jeu ne porte <strong>aucune étiquette de fraude</strong> : il compte
          les sinistres, il ne les qualifie pas. Une cohorte qui déclare plus
          souvent est plus <em>exposée</em>, pas plus suspecte — quatre
          conducteurs désignés sur un contrat roulent plus que deux.
        </span>
      </p>

      <Section
        titre="L'ensemble du portefeuille"
        icone={Layers}
        compte={`${separerMilliers(SOURCE_PORTEFEUILLE.contrats)} contrats`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Repere
            valeur={String(ENSEMBLE.frequencePourMille)}
            libelle="sinistres pour mille contrats"
            precision={`${separerMilliers(ENSEMBLE.sinistres)} sinistres observés`}
          />
          <Repere
            valeur={`${separerMilliers(ENSEMBLE.coutMoyenSinistre)} €`}
            libelle="coût moyen d'un sinistre"
            precision="rapporté aux sinistres, pas aux contrats"
          />
          <Repere
            valeur={`${separerMilliers(ENSEMBLE.primePure)} €`}
            libelle="coût annuel attendu par contrat"
            precision="fréquence × coût moyen"
          />
          <Repere
            valeur={String(SOURCE_PORTEFEUILLE.effectifMinimal)}
            libelle="effectif minimal d'une cohorte"
            precision="en deçà, elle n'est pas publiée"
          />
        </div>
      </Section>

      <Section
        titre="Choisir un découpage"
        icone={Ruler}
        compte={
          rapport
            ? `du simple au ${rapport.toFixed(2).replace(".", ",")}`
            : undefined
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dimension" className="text-xs text-muted-foreground">
              Découpage
            </label>
            <Select value={cleDimension} onValueChange={(v) => v && changerDimension(v)}>
              <SelectTrigger id="dimension" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map((d) => (
                  <SelectItem key={d.cle} value={d.cle}>
                    {d.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cohorte" className="text-xs text-muted-foreground">
              Cohorte
            </label>
            <Select value={cohorteChoisie?.cle ?? ""} onValueChange={(v) => v && setCleCohorte(v)}>
              <SelectTrigger id="cohorte" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classement.map((c) => (
                  <SelectItem key={c.cle} value={c.cle}>
                    {c.cle} — {c.frequencePourMille} ‰
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-snug text-muted-foreground-subtle">
          {dimensionChoisie.modalites.length} cohorte
          {dimensionChoisie.modalites.length > 1 ? "s" : ""} publiée
          {dimensionChoisie.modalites.length > 1 ? "s" : ""} pour ce découpage
          {dimensionChoisie.ecartees > 0 && (
            <>
              {" "}
              · {dimensionChoisie.ecartees} écartée
              {dimensionChoisie.ecartees > 1 ? "s" : ""} faute d&apos;effectif —
              une fréquence calculée sur trente contrats varie du simple au double
              selon qu&apos;un seul d&apos;entre eux a déclaré.
            </>
          )}
        </p>
      </Section>

      {lignes.length > 0 && (
        <Section
          titre="Cette cohorte, face à l'ensemble"
          icone={TrendingUp}
          compte={cohorteChoisie?.cle}
        >
          <ComparatifContextuel comparatifs={lignes} />
        </Section>
      )}

      <Section
        titre="Le classement du découpage"
        icone={Layers}
        compte={`${classement.length} cohortes, de la plus sinistrée à la moins sinistrée`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border/30">
                {[
                  dimensionChoisie.libelle,
                  "Contrats",
                  "Sinistres",
                  "Pour mille",
                  "Coût moyen",
                  "Attendu / contrat",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground-subtle whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classement.map((c) => {
                const choisie = c.cle === cohorteChoisie?.cle
                const auDessus = c.frequencePourMille > ENSEMBLE.frequencePourMille
                return (
                  <tr
                    key={c.cle}
                    className={`border-b border-border/20 transition-colors ${
                      choisie ? "bg-emerald-500/[0.06]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                      {c.cle}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {separerMilliers(c.contrats)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {separerMilliers(c.sinistres)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap ${
                        auDessus ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {c.frequencePourMille}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                      {separerMilliers(c.coutMoyenSinistre)} €
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                      {separerMilliers(c.primePure)} €
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-snug text-muted-foreground-subtle">
          La couleur compare à la moyenne du portefeuille (
          {ENSEMBLE.frequencePourMille} ‰). Elle ne dit rien d&apos;une fraude :
          elle dit une exposition.
        </p>
      </Section>
    </div>
  )
}

function Repere({
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
