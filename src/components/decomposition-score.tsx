import { Info, TrendingDown, TrendingUp } from "lucide-react"

import { couleurScore } from "@/components/score-ia"
import {
  attenuants,
  facteursTries,
  phraseExplicative,
  rapportCohorte,
  totalAggravant,
  totalAttenuant,
} from "@/lib/explication"
import { ecartRelatif, signe, valeurAvecUnite } from "@/lib/formats"
import type { Comparatif, Decomposition } from "@/lib/schemas/alertes.schema"

/**
 * Pourquoi ce score, et ce qui le ferait bouger.
 *
 * Le reproche fait aux outils du marché tient en un mot : ils affichent « 94 »
 * et s'arrêtent là. Un analyste ne peut ni le défendre devant un établissement,
 * ni le contester devant son responsable. Ici, les facteurs sont écrits, pesés
 * et sourcés.
 *
 * Les contributions sont **additives** : la valeur de base plus les
 * contributions redonnent exactement le score affiché. Le service refuse de
 * servir un dossier où ce n'est pas le cas — l'explication explique donc bien
 * ce chiffre-là, et pas un autre.
 *
 * Ni graphique ni dépendance : quelques `div` dont la largeur est proportionnée
 * au poids. Une bibliothèque de visualisation pour cinq barres serait payée en
 * kilo-octets pour rien, et Recharts n'a pas de barre divergente à axe centré.
 */
export function DecompositionScore({
  score,
  explication,
}: {
  score: number
  explication: Decomposition
}) {
  const facteurs = facteursTries(explication)
  // L'échelle est commune aux deux sens : sans quoi un atténuant de −3 aurait
  // la même barre qu'un aggravant de +38, et l'œil lirait l'inverse du fait.
  const poidsMax = Math.max(...facteurs.map((f) => Math.abs(f.contribution)))
  const charges = totalAggravant(explication)
  const decharges = totalAttenuant(explication)

  return (
    <div className="flex flex-col gap-5">
      {/* La phrase, avant les barres : c'est elle qui se recopie dans un courrier. */}
      <p className="max-w-prose text-sm leading-relaxed text-foreground">
        {phraseExplicative(score, explication)}
      </p>

      {/* L'égalité, écrite. C'est la garantie que rien n'est laissé de côté. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
        <span title="Score moyen de l'ensemble des demandes analysées par le moteur : le point de départ commun à tous les dossiers.">
          base {explication.valeurDeBase}
        </span>
        <span className="text-red-400">{signe(charges)} aggravants</span>
        {decharges !== 0 && (
          <span className="text-emerald-400">{signe(decharges)} atténuants</span>
        )}
        <span>=</span>
        <span
          className="font-semibold"
          style={{ color: couleurScore(score) }}
        >
          {score} / 100
        </span>
      </div>

      <ul className="flex flex-col">
        {facteurs.map((facteur) => {
          const aggravant = facteur.contribution > 0
          const largeur = (Math.abs(facteur.contribution) / poidsMax) * 50
          return (
            <li
              key={facteur.code}
              className="grid gap-2 border-b border-border/20 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_150px_44px] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  {aggravant ? (
                    <TrendingUp size={12} className="shrink-0 text-red-400" />
                  ) : (
                    <TrendingDown size={12} className="shrink-0 text-emerald-400" />
                  )}
                  {facteur.libelle}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Observé : {facteur.valeurObservee} · Attendu :{" "}
                  {facteur.valeurAttendue}
                </div>
                <div className="mt-0.5 flex items-start gap-1 text-[10px] leading-snug text-muted-foreground/60">
                  <Info size={9} className="mt-[3px] shrink-0" />
                  {facteur.source}
                </div>
              </div>

              {/* Axe centré : à droite ce qui aggrave, à gauche ce qui atténue. */}
              <div
                aria-hidden
                className="relative hidden h-2 rounded-full bg-white/[0.03] sm:block"
              >
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-border/60" />
                <span
                  className={`absolute top-0 h-2 rounded-full ${
                    aggravant ? "bg-red-500/70" : "bg-emerald-500/70"
                  }`}
                  style={
                    aggravant
                      ? { left: "50%", width: `${largeur}%` }
                      : { right: "50%", width: `${largeur}%` }
                  }
                />
              </div>

              <div
                className={`text-right font-mono text-xs font-semibold ${
                  aggravant ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {signe(facteur.contribution)}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-[11px] leading-snug text-muted-foreground/70">
        {explication.modele}. Les contributions sont exprimées en points de
        score et s'ajoutent à la valeur de base
        {attenuants(explication).length > 0
          ? " ; un facteur peut jouer en faveur du dossier."
          : "."}
      </p>
    </div>
  )
}

/**
 * Le dossier replacé face à ce qui se facture ailleurs.
 *
 * « 2 400 000 FCFA » ne veut rien dire seul. Comparé à ce que facture
 * habituellement l'établissement, à ce que coûte l'acte ailleurs et à ce que la
 * période laissait attendre, il devient un argument — et l'effectif de chaque
 * référence est donné, parce qu'une moyenne sans effectif ne se conteste pas.
 */
export function ComparatifContextuel({
  comparatifs,
}: {
  comparatifs: Comparatif[]
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {comparatifs.map((c) => {
        const ecart = ecartRelatif(c.valeurDossier, c.valeurCohorte)
        const auDessus = c.valeurDossier > c.valeurCohorte
        // Le rapport de longueur des deux barres est celui des deux valeurs :
        // la plus grande occupe toute la largeur, l'autre s'y rapporte.
        const maximum = Math.max(c.valeurDossier, c.valeurCohorte) || 1
        return (
          <li
            key={`${c.cohorte}-${c.libelle}`}
            className="rounded-lg border border-border/50 bg-white/[0.02] p-3"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {c.cohorte}
            </div>
            <div className="mt-1 text-xs leading-snug text-foreground">
              {c.libelle}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Barre
                titre="Ce dossier"
                valeur={valeurAvecUnite(c.valeurDossier, c.unite)}
                part={(c.valeurDossier / maximum) * 100}
                classe={auDessus ? "bg-red-500/70" : "bg-emerald-500/70"}
                accent
              />
              <Barre
                titre="Référence"
                valeur={valeurAvecUnite(c.valeurCohorte, c.unite)}
                part={(c.valeurCohorte / maximum) * 100}
                classe="bg-muted-foreground/40"
              />
            </div>

            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 text-[11px]">
              {ecart && (
                <span
                  className={`font-mono font-semibold ${
                    auDessus ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {ecart}
                </span>
              )}
              <span className="text-muted-foreground/70">
                {rapportCohorte(c) ?? "référence indisponible"}
              </span>
            </div>
            <div className="mt-1 text-[10px] leading-snug text-muted-foreground/60">
              {c.effectif}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Barre({
  titre,
  valeur,
  part,
  classe,
  accent,
}: {
  titre: string
  valeur: string
  part: number
  classe: string
  accent?: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground/70">{titre}</span>
        <span
          className={`font-mono ${accent ? "font-semibold text-foreground" : "text-muted-foreground"}`}
        >
          {valeur}
        </span>
      </div>
      <div
        aria-hidden
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.03]"
      >
        <div className={`h-full rounded-full ${classe}`} style={{ width: `${part}%` }} />
      </div>
    </div>
  )
}
