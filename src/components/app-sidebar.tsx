"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Bell,
  BarChart3,
  Search,
  FileText,
  Settings,
  Shield,
  Activity,
  ChevronRight,
} from "lucide-react"
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

// ─── Navigation ───────────────────────────────────────────────────────────────
const navItems = [
  {
    label: "Principal",
    items: [
      {
        title: "Tableau de bord",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Vue d'ensemble",
      },
      {
        title: "Alertes",
        href: "/alertes",
        icon: Bell,
        description: "Anomalies détectées",
        badge: "12",
        badgeColor: "bg-red-500/15 text-red-400 border-red-500/20",
      },
      {
        title: "Analyses",
        href: "/analyses",
        icon: BarChart3,
        description: "Performance IA",
      },
      {
        title: "Investigations",
        href: "/investigations",
        icon: Search,
        description: "Enquêtes en cours",
        badge: "9",
        badgeColor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
      },
    ],
  },
  {
    label: "Gestion",
    items: [
      {
        title: "Rapports",
        href: "/rapports",
        icon: FileText,
        description: "Génération & export",
        badge: "3",
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      },
      {
        title: "Paramètres",
        href: "/parametres",
        icon: Settings,
        description: "Configuration",
      },
    ],
  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        {navItems.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              {group.label}
            </SidebarGroupLabel>

            <SidebarMenu>
              {group.items.map(item => {
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
                      tooltip={item.title}
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
                        <ChevronRight size={12} className="text-emerald-400/60 shrink-0 group-data-[collapsible=icon]:hidden" />
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
                AD
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  Admin Diallo
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  Administrateur
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
