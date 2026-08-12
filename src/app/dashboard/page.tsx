import Link from "next/link"
import { UserCog } from "lucide-react"

import { auth } from "@/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DernieresAlertes } from "@/components/dernieres-alertes"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { dashboardService } from "@/lib/services"
import { libelleDuRole } from "@/lib/utilisateurs"

export default async function Page() {
  const session = await auth()
  const role = session?.user?.role // Contient "ADMINISTRATEUR", "SUPERVISEUR" ou "ANALYSTE"
  const [dernieresAlertes, alertesTrend] = await Promise.all([
    dashboardService.getDernieresAlertes(),
    dashboardService.getAlertesTrend(),
  ])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
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

              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive alertesTrend={alertesTrend} />
              </div>
              <DernieresAlertes alertes={dernieresAlertes} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
