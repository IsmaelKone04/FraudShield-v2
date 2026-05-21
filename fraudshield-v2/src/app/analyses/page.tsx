"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ShieldAlertIcon, TrendingUpIcon, ActivityIcon, CheckCircle2Icon, ArrowUpRightIcon, ArrowDownRightIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import data from "./data.json"

const chartConfig = {
  quantite: {
    label: "Volume de dossiers",
    color: "oklch(0.809 0.210 152.7)", // Vert Émeraude
  },
} satisfies ChartConfig

export default function AnalysePage() {
  return (
    <div className="space-y-6 w-full">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Laboratoire d'Analyse</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scannage des comportements et évaluation des risques systémiques (Données 2026).
        </p>
      </div>

      {/* Cartes KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Volume Total Analysé</CardTitle>
            <ActivityIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistiquesGlobales.totalAnalyses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Dossiers traités par l'IA</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Fraudes Confirmées</CardTitle>
            <ShieldAlertIcon className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.statistiquesGlobales.casConfirmes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Inscriptions au registre noir</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Montant Sécurisé</CardTitle>
            <CheckCircle2Icon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.statistiquesGlobales.montantRecupereFormate}</div>
            <p className="text-xs text-muted-foreground mt-1">Fonds détournés interceptés</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Précision de Détection</CardTitle>
            <TrendingUpIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistiquesGlobales.scoreConfianceIA}%</div>
            <p className="text-xs text-muted-foreground mt-1">Score moyen d'exactitude</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Graphique de segmentation des risques */}
        <Card className="border-border bg-card flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Segmentation des volumes par niveau de Risque</CardTitle>
            <CardDescription className="text-xs">Nombre de demandes réparties par tranches de sévérité</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[240px] pt-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={data.repartitionRisque} layout="vertical" margin={{ left: -10, right: 10 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="segment" type="category" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
                <Bar dataKey="quantite" fill="var(--color-quantite)" radius={4} barSize={16} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Tableau des Établissements sous surveillance */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Établissements sous Haute Surveillance</CardTitle>
            <CardDescription className="text-xs">Indexé selon la récurrence et la volumétrie des anomalies</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs">Établissement</TableHead>
                  <TableHead className="text-xs text-right">Cas suspects</TableHead>
                  <TableHead className="text-xs text-right">Montant estimé</TableHead>
                  <TableHead className="text-xs text-right">Évol.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topEtablissementsSuspects.map((etab) => (
                  <TableRow key={etab.nom} className="border-border/50 hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">
                      {etab.nom} <span className="text-[10px] text-muted-foreground block">{etab.ville}</span>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{etab.cas}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {etab.montant.toLocaleString()} F
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <span className={`inline-flex items-center gap-0.5 font-medium ${etab.evolution > 0 ? "text-destructive" : "text-primary"}`}>
                        {etab.evolution > 0 ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
                        {Math.abs(etab.evolution)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Tableaux des indicateurs de comportement */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Indicateurs Comportementaux Détectés</CardTitle>
          <CardDescription className="text-xs">Typologies de déclenchement des alertes automatiques de l'IA</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">Indicateur de comportement</TableHead>
                <TableHead className="text-xs text-center">Occurrences</TableHead>
                <TableHead className="text-xs">Sévérité</TableHead>
                <TableHead className="text-xs text-right">Préjudice Financier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.comportementsAnormaux.map((comp) => (
                <TableRow key={comp.id} className="border-border/50 hover:bg-muted/30">
                  <TableCell className="text-xs max-w-sm font-medium">{comp.indicateur}</TableCell>
                  <TableCell className="text-xs text-center font-mono">{comp.occurrences}</TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant="outline"
                      className={
                        comp.gravite === "Critique"
                          ? "border-red-500/30 bg-red-500/10 text-red-400"
                          : comp.gravite === "Élevé"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      }
                    >
                      {comp.gravite}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-foreground">
                    {comp.impactFormate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
