"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, ChevronRight, Shield } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { NAVIGATION } from "@/lib/navigation"
import { initialesDuCompte, nomDuCompte } from "@/lib/utilisateurs"

// ─── Sidebar ──────────────────────────────────────────────────────────────────

/**
 * La barre de navigation, et l'identité qu'elle affiche.
 *
 * Le pied de page annonçait « Admin Diallo · Administrateur » quel que soit le
 * compte connecté : un analyste s'y voyait administrateur. Sur une console qui
 * tient désormais une piste d'audit, afficher une identité qui n'est pas la
 * sienne n'est plus seulement inexact — c'est là que l'utilisateur lit sous
 * quel nom ses actions vont être inscrites.
 */
export function AppSidebar({
  email,
  roleLibelle,
  estAdministrateur,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** Adresse du compte connecté ; `null` si la session a expiré. */
  email: string | null
  /**
   * Le rôle **déjà mis en forme**, et non son code.
   *
   * La session transporte « SUPERVISEUR » : un code de comparaison, qui n'a
   * rien à faire dans le navigateur. Le convertir ici obligerait à l'y envoyer,
   * et le code brut se retrouverait dans le HTML servi.
   */
  roleLibelle: string
  /**
   * Décidé côté serveur, transmis comme un fait acquis. Un composant client qui
   * comparerait lui-même un code de rôle ressemblerait à un contrôle d'accès
   * sans en être un — les vrais sont dans `proxy.ts` et dans la page.
   */
  estAdministrateur: boolean
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>

      {/* ── Logo ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                <Shield className="size-4 text-emerald-400" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span className="font-bold text-sm text-foreground truncate">
                  FraudShield
                </span>
                <span className="text-[10px] text-muted-foreground tracking-widest uppercase truncate">
                  Santé
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Indicateur système actif */}
        <div className="mx-2 mb-1 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 group-data-[collapsible=icon]:hidden">
          <Activity size={12} className="text-emerald-400 shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-400 tracking-wide truncate">
            SYSTÈME ACTIF
          </span>
          <div className="ml-auto size-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </div>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent>
        {NAVIGATION.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground-subtle">
              {group.label}
            </SidebarGroupLabel>

            <SidebarMenu>
              {group.items
                .filter(item => !item.reserveeAuxAdministrateurs || estAdministrateur)
                .map(item => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href} className="flex items-center w-full gap-2" />
                      }
                      isActive={isActive}
                      // Chaque entrée portait une `description` que rien
                      // n'affichait. Elle sert ici d'infobulle en mode replié,
                      // où le libellé seul disparaît — plutôt que de rester un
                      // champ mort que la prochaine entrée recopierait.
                      tooltip={`${item.title} — ${item.description}`}
                      className={`group/item transition-all duration-150 ${
                        isActive
                          ? "bg-emerald-500/10! text-emerald-400! border border-emerald-500/25!"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* Icône */}
                      <Icon
                        size={16}
                        className={`shrink-0 ${
                          isActive
                            ? "text-emerald-400"
                            : "text-muted-foreground group-hover/item:text-foreground"
                        }`}
                      />

                      {/* Label */}
                      <span className={`truncate text-sm flex-1 ${
                        isActive ? "font-semibold" : "font-medium"
                      }`}>
                        {item.title}
                      </span>

                      {/* Badge */}
                      {item.badge && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0 h-4 shrink-0 group-data-[collapsible=icon]:hidden ${item.badgeColor}`}
                        >
                          {item.badge}
                        </Badge>
                      )}

                      {/* Chevron si actif */}
                      {isActive && (
                        <ChevronRight size={12} className="text-emerald-400/80 shrink-0 group-data-[collapsible=icon]:hidden" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer utilisateur ── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/parametres" />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-black font-bold text-xs shrink-0">
                {initialesDuCompte(email)}
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  {nomDuCompte(email)}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {roleLibelle}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
