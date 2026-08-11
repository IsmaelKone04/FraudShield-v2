import { auth } from "@/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { dashboardService } from "@/lib/services"

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
                    Rôle : <span className="text-primary font-bold">{role}</span>
                  </p>
                </div>

                {/* Bouton d'action conditionnel selon le rôle */}
                {(role === "ADMINISTRATEUR" || role === "SUPERVISEUR") && (
                  <button className="bg-primary p-2 rounded text-black font-bold shadow hover:opacity-90 transition-opacity">
                    Réassigner les dossiers suspects
                  </button>
                )}
              </div>

              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive alertesTrend={alertesTrend} />
              </div>
              <DataTable data={dernieresAlertes} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
