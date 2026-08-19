import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Share2,
  TriangleAlert,
  Users,
} from "lucide-react"

import { CarteSynthese } from "@/components/carte-synthese"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { francs, separerMilliers } from "@/lib/formats"
import { reseauxService } from "@/lib/services"

export const metadata = { title: "Réseaux de fraude" }

/**
 * La liste des réseaux.
 *
 * Écran de lecture seule : aucune identité n'y est engagée, rien n'y est écrit,
 * il reste donc pré-rendu. C'est l'arbitrage posé en D5 — la session n'est lue
 * que là où quelque chose s'écrit.
 */
export default async function ReseauxPage() {
  const [resumes, synthese] = await Promise.all([
    reseauxService.getResumes(),
    // Les totaux sont demandés au service plutôt qu'additionnés ici : un
    // sinistre suivi par deux dossiers ne doit compter qu'une fois.
    reseauxService.getSynthese(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href="/investigations"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Investigations
      </Link>

      <div className="min-w-0">
        <h1 className="text-xl font-bold text-foreground">Réseaux de fraude</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Une alerte isolée se conteste ; un schéma organisé se démontre. Chaque
          dossier d&apos;instruction annonçait un nombre de cas liés sans jamais
          les montrer — les voici, avec ce qui les relie : les assurés, les
          établissements et les praticiens qu&apos;ils ont en commun.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteSynthese
          icone={Share2}
          libelle="Sinistres au graphe"
          valeur={separerMilliers(synthese.sinistres)}
          precision={`Suivis par ${synthese.reseaux} dossiers d'instruction`}
        />
        <CarteSynthese
          icone={TriangleAlert}
          libelle="Venus du recoupement"
          valeur={separerMilliers(synthese.sinistres - synthese.signales)}
          precision={`${separerMilliers(synthese.signales)} avaient déclenché une alerte`}
          accent="text-amber-400"
        />
        <CarteSynthese
          icone={Building2}
          libelle="Montant en jeu"
          valeur={francs(synthese.montant)}
          precision="Somme des sinistres rattachés à un réseau"
        />
        <CarteSynthese
          icone={Users}
          libelle="Densité anormale"
          valeur={`${synthese.denses} / ${synthese.reseaux}`}
          precision="Réseaux où les entités se partagent"
          accent={synthese.denses > 0 ? "text-red-400" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {resumes.map((r) => (
          <Link key={r.id} href={`/reseaux/${r.id}`} className="group">
            <Card className="h-full border-border/50 bg-card transition-colors group-hover:border-border">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">
                      {r.titre}
                    </h2>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                      {r.investigationId}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {r.statut}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Priorité {r.priorite.toLowerCase()}
                  </Badge>
                  {r.densiteAnormale && (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-[10px] text-red-400"
                    >
                      Densité {r.densite.toFixed(2).replace(".", ",")}
                    </Badge>
                  )}
                </div>

                <div className="mt-auto grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
                  <Mesure
                    valeur={separerMilliers(r.sinistres)}
                    libelle="sinistres"
                    precision={`dont ${r.signales} signalés`}
                  />
                  <Mesure
                    valeur={separerMilliers(r.entites)}
                    libelle="entités"
                    precision="assurés, praticiens, établissements"
                  />
                  <Mesure
                    valeur={r.montantFormate}
                    libelle="en jeu"
                    precision="montant des sinistres"
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
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
    <div className="min-w-0">
      <div className="truncate text-base font-semibold text-foreground">
        {valeur}
      </div>
      <div className="text-[11px] text-muted-foreground">{libelle}</div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
        {precision}
      </div>
    </div>
  )
}
