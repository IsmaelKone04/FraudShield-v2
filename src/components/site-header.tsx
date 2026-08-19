"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { entreeDeLaRoute } from "@/lib/navigation"

/**
 * L'en-tête de la console : le repli de la barre latérale, et où l'on se trouve.
 *
 * Il affichait « Documents » — un titre resté du gabarit, faux sur tous les
 * écrans. Il n'était visible que du tableau de bord, ce qui l'avait rendu
 * indolore ; monté partout, il devient la première chose qu'on lit. Le titre est
 * donc pris dans la table de navigation, celle-là même qui remplit la barre
 * latérale : les deux ne peuvent plus se contredire.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const entree = entreeDeLaRoute(pathname)

  // Une page de détail garde le nom de sa section, et affiche en plus la
  // référence ouverte — c'est elle qu'on cherche des yeux en revenant d'un
  // autre onglet. On ne montre que le dernier segment : les identifiants de la
  // console sont déjà lisibles (`RES-2026-003`, `A-2026-0120`).
  const reste =
    entree && pathname.startsWith(entree.href + "/")
      ? decodeURIComponent(pathname.slice(entree.href.length + 1)).split("/")[0]
      : null

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <nav
          aria-label="Fil d'Ariane"
          className="flex min-w-0 items-center gap-1.5 text-base"
        >
          {entree ? (
            reste ? (
              <>
                <Link
                  href={entree.href}
                  className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {entree.title}
                </Link>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-muted-foreground-subtle"
                  aria-hidden
                />
                <span className="truncate font-medium" aria-current="page">
                  {reste}
                </span>
              </>
            ) : (
              <span className="truncate font-medium" aria-current="page">
                {entree.title}
              </span>
            )
          ) : (
            <span className="truncate font-medium">FraudShield</span>
          )}
        </nav>
      </div>
    </header>
  )
}
