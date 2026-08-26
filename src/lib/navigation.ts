import {
  BarChart3,
  Bell,
  FileText,
  Gauge,
  LayoutDashboard,
  Calculator,
  Layers,
  ScrollText,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"

/**
 * La table de navigation de la console — une seule, pour deux lecteurs.
 *
 * Elle vivait dans `app-sidebar.tsx`, où elle n'était visible que de la barre
 * latérale. L'en-tête affichait donc un titre écrit en dur (« Documents », resté
 * du gabarit) sur tous les écrans. Deux endroits qui nomment les mêmes routes
 * finissent toujours par les nommer différemment : ils la lisent désormais ici.
 */
export type EntreeNavigation = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  badge?: string
  badgeColor?: string
  /**
   * L'entrée n'apparaît qu'au compte qui peut ouvrir la page. Ce n'est pas un
   * contrôle d'accès — celui-là est fait par `proxy.ts` et par la page — mais
   * un lien qu'on ne montre pas à qui il mènerait vers une redirection.
   */
  reserveeAuxAdministrateurs?: boolean
}

export type GroupeNavigation = { label: string; items: EntreeNavigation[] }

export const NAVIGATION: GroupeNavigation[] = [
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
        title: "Qualité du modèle",
        href: "/qualite",
        icon: Gauge,
        description: "Faux positifs & dérive",
      },
      {
        title: "Notation",
        href: "/notation",
        icon: Calculator,
        description: "Le modèle, à l'épreuve",
      },
      {
        title: "Portefeuille",
        href: "/portefeuille",
        icon: Layers,
        description: "Ce qui est normal",
      },
      {
        title: "Simulateur de seuils",
        href: "/simulation",
        icon: SlidersHorizontal,
        description: "Rejeu à seuil variable",
      },
      {
        title: "Réseaux de fraude",
        href: "/reseaux",
        icon: Share2,
        description: "Schémas organisés",
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
      {
        title: "Journal d'audit",
        href: "/dashboard/admin",
        icon: ScrollText,
        description: "Qui a décidé quoi",
        reserveeAuxAdministrateurs: true,
      },
    ],
  },
]

const ENTREES: EntreeNavigation[] = NAVIGATION.flatMap((groupe) => groupe.items)

/**
 * L'entrée de navigation dont dépend une adresse.
 *
 * Le préfixe **le plus long** l'emporte : `/dashboard/admin` est le journal
 * d'audit, pas le tableau de bord. Une page de détail (`/alertes/A-2026-0120`,
 * `/reseaux/RES-2026-003`) reste rattachée à sa section — c'est bien de là
 * qu'on vient.
 */
export function entreeDeLaRoute(pathname: string): EntreeNavigation | undefined {
  return ENTREES.filter(
    (e) => pathname === e.href || pathname.startsWith(e.href + "/")
  ).sort((a, b) => b.href.length - a.href.length)[0]
}

/** Le titre à afficher en haut de l'écran, ou le nom de la console à défaut. */
export function titreDeLaRoute(pathname: string): string {
  return entreeDeLaRoute(pathname)?.title ?? "FraudShield"
}
