import Link from "next/link"
import { UserCog } from "lucide-react"

import { auth } from "@/auth"
import { BandeauDerive } from "@/components/bandeau-derive"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DernieresAlertes } from "@/components/dernieres-alertes"
import { SectionCards } from "@/components/section-cards"
import { Button } from "@/components/ui/button"
import { derivesConstatees, dernierMois } from "@/lib/qualite"
import { dashboardService, qualiteService } from "@/lib/services"
import { libelleDuRole } from "@/lib/utilisateurs"

export default async function Page() {
  const session = await auth()
  const role = session?.user?.role // Contient "ADMINISTRATEUR", "SUPERVISEUR" ou "ANALYSTE"
  const [dernieresAlertes, alertesTrend, qualite] = await Promise.all([
    dashboardService.getDernieresAlertes(),
    dashboardService.getAlertesTrend(),
    qualiteService.getQualite(),
  ])

  /*
    La dérive est signalée ici sur le seul jeu du serveur, sans les décisions
    prises dans cette console : le tableau de bord est rendu côté serveur, et
    les y mêler imposerait de le rendre client pour un bandeau. L'écran de
    qualité, lui, les compte — c'est là qu'on vient vérifier.
  */
  const derives = derivesConstatees(qualite.periodes, qualite.seuils)
  const moisObserve =
    qualite.periodes.find(
      (periode) => periode.mois === dernierMois(qualite.periodes)
    )?.moisLibelle ?? ""

  return (
    /*
      La barre latérale et l'en-tête sont désormais montés par
      `dashboard/layout.tsx`, qui les monte aussi pour les huit autres
      sections : cet écran les installait pour lui seul, et la console n'avait
      donc de sommaire que sur sa première page. L'identité connectée y est lue
      une fois, au même endroit pour tous les écrans.
    */
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        
        {/* Message de bienvenue et affichage du rôle */}
        <div className="px-4 lg:px-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Bienvenue, {session?.user?.name}</h1>
            <p className="text-sm text-muted-foreground">
              Rôle :{" "}
              <span className="text-primary font-bold">
                {libelleDuRole(role)}
              </span>
            </p>
          </div>

          {/*
            Raccourci vers l'écran où la réassignation existe réellement.
            Le bouton était une balise `<button>` écrite à la main, sans
            action et au texte forcé en noir ; il annonçait de surcroît un
            traitement par lot que la console ne sait pas faire — elle
            réassigne dossier par dossier (voir ADR-009).
          */}
          {(role === "ADMINISTRATEUR" || role === "SUPERVISEUR") && (
            <Button
              render={<Link href="/investigations" />}
              title="Ouvre la liste des investigations, où chaque dossier se réassigne à un compte de la console."
            >
              <UserCog />
              Réassigner un dossier
            </Button>
          )}
        </div>

        {derives.length > 0 && (
          <div className="px-4 lg:px-6">
            <BandeauDerive
              derives={derives}
              mois={moisObserve}
              avecLien
            />
          </div>
        )}

        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive alertesTrend={alertesTrend} />
        </div>
        <DernieresAlertes alertes={dernieresAlertes} />
      </div>
    </div>
  )
}
