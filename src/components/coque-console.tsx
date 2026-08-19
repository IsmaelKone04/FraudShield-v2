import type { ReactNode } from "react"

import { auth } from "@/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { libelleDuRole } from "@/lib/utilisateurs"

/**
 * Le cadre commun à tous les écrans de la console : barre latérale et en-tête.
 *
 * Il n'existait pas. Le tableau de bord montait lui-même la barre latérale, et
 * lui seul : passé la première page, on naviguait de lien de retour en lien de
 * retour, sans jamais revoir le sommaire. Un écran de travail sans sortie
 * visible se referme sur son visiteur.
 *
 * **Ce que cela coûte.** La barre latérale affiche le compte connecté et décide
 * de montrer ou non le journal d'audit : la coque lit donc la session, et les
 * pages qu'elle enveloppe deviennent dynamiques — /reseaux était jusqu'ici
 * pré-rendue. L'arbitrage est assumé : une page servie une milliseconde plus
 * tôt ne vaut pas une console où l'on se perd.
 *
 * Ce n'est pas un contrôle d'accès. `proxy.ts` et chaque page décident qui
 * entre ; la coque ne décide que de ce qui s'affiche.
 */
export async function CoqueConsole({ children }: { children: ReactNode }) {
  const session = await auth()
  const role = session?.user?.role

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        email={session?.user?.email ?? null}
        roleLibelle={libelleDuRole(role)}
        estAdministrateur={role === "ADMINISTRATEUR"}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
