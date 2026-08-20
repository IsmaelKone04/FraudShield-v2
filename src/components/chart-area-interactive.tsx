"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

// Importation de vos données réelles de fraude
import type { AlerteTrend } from "@/lib/schemas/dashboard.schema"

export const description = "Évolution des alertes de fraude"

// Configuration du thème graphique unifié avec vos couleurs
const chartConfig = {
  alertes: {
    label: "Alertes détectées",
    color: "oklch(0.765 0.182 52.2)", // Orange Alerte harmonisé
  },
  resolues: {
    label: "Cas résolus",
    color: "oklch(0.809 0.210 152.7)", // Votre Vert Émeraude
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ alertesTrend }: { alertesTrend: AlerteTrend[] }) {
  const isMobile = useIsMobile()

  /*
    Sur un téléphone, dix mois d'historique se tassent en une bouillie : la
    période courte y est le bon défaut. Ce défaut se déduit désormais de la
    largeur au moment du rendu ; il était posé après coup par un effet, qui
    provoquait un second rendu et remplaçait la valeur déjà affichée.

    `null` distingue « personne n'a encore choisi » de « on a choisi la
    période courte » : dès que le lecteur tranche, la largeur n'a plus voix.
  */
  const [choixPeriode, setChoixPeriode] = React.useState<string | null>(null)
  const timeRange = choixPeriode ?? (isMobile ? "7d" : "90d")
  const setTimeRange = setChoixPeriode

  // Filtrage intelligent basé sur vos données (10 mois disponibles)
  const filteredData = React.useMemo(() => {
    const allData = alertesTrend
    if (timeRange === "7d") {
      return allData.slice(-3) // Simule les périodes courtes
    }
    if (timeRange === "30d") {
      return allData.slice(-6) // Période intermédiaire
    }
    return allData // "90d" renvoie l'historique complet
  }, [timeRange, alertesTrend])

  return (
    <Card className="@container/card border-border bg-card">
      <CardHeader>
        <CardTitle>Suivi des Alertes</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Progression des alertes détectées et résolues par l'équipe
          </span>
          <span className="@[540px]/card:hidden">Alertes vs Résolues</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              if (value[0]) setTimeRange(value[0])
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Historique Global</ToggleGroupItem>
            <ToggleGroupItem value="30d">Derniers mois</ToggleGroupItem>
            <ToggleGroupItem value="7d">Actuels</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value) setTimeRange(value)
            }}
          >
            <SelectTrigger
              className="flex w-40 @[767px]/card:hidden"
              size="sm"
            >
              <SelectValue placeholder="Choisir une période" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Historique Global</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Derniers mois</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Actuels</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillAlertes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-alertes)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-alertes)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillResolues" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-resolues)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-resolues)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date" // On cible la nouvelle clé "date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              // Formate la date système (ex: "2026-04-12") en texte court et lisible (ex: "12 Avr")
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Période : ${value}`}
                  indicator="dot"
                />
              }
            />
            {/* Ligne 1 : Alertes Détectées (Orange Alerte) */}
            <Area
              dataKey="alertes"
              type="natural"
              fill="url(#fillAlertes)"
              stroke="var(--color-alertes)"
              strokeWidth={2}
              stackId="a"
            />
            {/* Ligne 2 : Résolues (Vert Émeraude) */}
            <Area
              dataKey="resolues"
              type="natural"
              fill="url(#fillResolues)"
              stroke="var(--color-resolues)"
              strokeWidth={2}
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
