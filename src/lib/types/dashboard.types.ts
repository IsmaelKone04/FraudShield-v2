/**
 * Types du domaine.
 *
 * Ils ne sont plus écrits à la main : ils sont **déduits** des schémas Zod de
 * `src/lib/schemas/`, qui servent aussi à valider les données au runtime. Un
 * type et un schéma maintenus séparément finissent par se contredire ; ici, il
 * n'y a qu'une définition.
 *
 * Ce fichier ne subsiste que comme point d'entrée commode.
 */

export type {
  Stat,
  NiveauRisque,
  StatutAlerte,
} from "@/lib/schemas/commun"

export type {
  KPI,
  AlerteTrend,
  FraudeParType,
  ScoreRisqueDetail,
  ScoreRisque,
  DashboardData,
} from "@/lib/schemas/dashboard.schema"

export type { Alerte, AlertesData } from "@/lib/schemas/alertes.schema"

export type {
  Priorite,
  StatutInvestigation,
  Investigation,
  InvestigationsData,
} from "@/lib/schemas/investigations.schema"

export type {
  StatistiquesGlobales,
  EtablissementSuspect,
  SegmentRisque,
  ComportementAnormal,
  AnalysesData,
} from "@/lib/schemas/analyses.schema"

export type {
  CategorieRapport,
  Rapport,
  RapportsData,
} from "@/lib/schemas/rapports.schema"

export type {
  Utilisateur,
  Modele,
  ParametresSysteme,
  ParametresData,
} from "@/lib/schemas/parametres.schema"
