# Contrat d'API

**Pour l'équipe qui construit le service de détection.** Ce document décrit ce que
l'application attend d'une API à `NEXT_PUBLIC_API_URL` — endpoints, formes, codes de
statut — indépendamment de la façon dont ce service est implémenté. Il ne décrit pas
le service (il n'est pas dans ce dépôt, voir README), seulement l'interface qu'il doit
présenter pour que la console fonctionne sans qu'un composant ne change.

## Comment ce contrat est appliqué, pas seulement documenté

Chaque endpoint listé ci-dessous a un **schéma Zod** correspondant dans
[`src/lib/schemas/`](../src/lib/schemas/), et une réponse qui ne le respecte pas est
**rejetée** avant d'atteindre un composant — voir `valider()` dans
[`src/lib/api/client.ts`](../src/lib/api/client.ts). Ce document est donc une lecture
humaine d'un contrat déjà exécutable ; en cas de doute sur un détail (un champ
optionnel, une contrainte numérique), le schéma fait foi.

Les mêmes schémas valident aussi le jeu de données local (`src/app/*/data.json`) : le
mock respecte déjà ce contrat, terme à terme. C'est ce qui permet de le lire comme un
exemple de charge utile pour chaque endpoint ci-dessous.

## Bascule

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=https://mon-api/api/v1
```

`API_URL` est préfixé à chaque chemin de ce document. Les lectures sont mises en
cache 60 secondes côté Next (`next: { revalidate: 60 }`) ; les écritures ne le sont
jamais.

## Authentification

**Non encore arrêtée côté API.** Aujourd'hui, `src/auth.ts` authentifie contre un
répertoire local de trois comptes de démonstration (empreintes bcrypt, jamais en
clair). En cible, ce fournisseur NextAuth est remplacé par un appel à l'API — le
principe de bascule reste le même que pour les données, mais le contrat exact (forme
de la requête, du jeton, sa durée de vie) reste à fixer avec l'équipe API. À traiter
avant le premier branchement en écriture : toutes les mutations ci-dessous supposeront
une requête authentifiée.

## Lectures — `GET`

Un objet ou un tableau, jamais enveloppé dans `{ data: ... }` : chaque schéma décrit
directement la forme retournée.

### Alertes

| Endpoint | Retourne | Schéma |
|---|---|---|
| `GET /alertes` | Toutes les alertes | `z.array(alerteSchema)` |
| `GET /alertes?limit=6&sort=date_desc` | Les plus récentes, pour le tableau de bord | `z.array(alerteSchema)` |
| `GET /alertes/stats` | Cartes de KPI de l'écran `/alertes` | `z.array(statSchema)` |
| `GET /alertes/{id}` | Un dossier complet, `null` si absent | `alerteDetailSchema.nullable()` |

**`alerteSchema`** — l'objet central du produit :

```ts
{
  id: string
  type: string
  assure: string
  etablissement: string
  montant: number              // francs CFA, non négatif
  montantFormate: string        // « 2 400 000 FCFA »
  scoreIA: number               // 0 à 100
  risque: "Élevé" | "Moyen" | "Faible"
  date: string                  // ISO 8601 (AAAA-MM-JJ)
  dateFormate: string           // JJ/MM/AAAA
  statut: "En cours" | "À vérifier" | "Résolu"
  assigneA: string | null       // email, obligatoire même si null — voir ci-dessous
}
```

`assigneA` doit être présent et explicitement `null` quand personne n'est assigné :
un champ omis empêcherait la console de distinguer « personne » de « information
absente ».

**`alerteDetailSchema`** étend `alerteSchema` (jamais redéfini en parallèle) avec :

```ts
{
  ...alerteSchema,
  assureRef: string
  contratRef: string
  etablissementRef: string
  praticien: string
  actes: Acte[]                 // min. 1
  chronologie: Evenement[]      // min. 1
  explication: Decomposition
  comparatifs: Comparatif[]     // min. 1
}
```

**`Decomposition` — le point le plus contraint du contrat.** Le format est calqué sur
une valeur SHAP : une contribution signée en points, rapportée à une valeur de base.

```ts
{
  valeurDeBase: number           // score moyen de l'ensemble des demandes, pas du dossier
  facteurs: FacteurRisque[]      // min. 1
  modele: string                 // version du moteur, pour l'audit
  calculeLe: string              // ISO 8601 datetime
}

// FacteurRisque
{
  code: string                   // identifiant stable, d'un dossier à l'autre
  libelle: string
  contribution: number           // entier, signé — positif aggrave, négatif atténue
  valeurObservee: string         // déjà mis en forme
  valeurAttendue: string
  source: string                 // d'où vient la mesure
  enonce: string                 // proposition insérable dans une phrase, sans majuscule ni point
}
```

**Contrainte non exprimable par Zod seul, et donc vérifiée côté client** : la somme
des `contribution` de `facteurs`, ajoutée à `valeurDeBase`, doit égaler `scoreIA` de
l'alerte. `src/lib/modele/scorer.ts` illustre comment un vrai modèle satisfait cette
contrainte y compris à un score saturé à 0 ou 100 (voir ADR-014 et ADR-033) : un
écrêtage doit apparaître comme son propre facteur nommé plutôt que d'être absorbé
silencieusement.

**`Comparatif`** :

```ts
{
  cohorte: string        // « L'établissement », « L'acte », « La période »…
  libelle: string
  valeurDossier: number
  valeurCohorte: number
  effectif: string        // sur quoi la moyenne est calculée
  unite: "FCFA" | "actes" | "jours" | "€" | "sinistres"
}
```

### Investigations

| Endpoint | Retourne | Schéma |
|---|---|---|
| `GET /investigations` | Tous les dossiers | `z.array(investigationSchema)` |
| `GET /investigations/stats` | Cartes de KPI | `z.array(statSchema)` |
| `GET /investigations/{id}` | Un dossier, `null` si absent | `investigationSchema.nullable()` |

### Tableau de bord

| Endpoint | Retourne | Schéma |
|---|---|---|
| `GET /dashboard/kpis` | Cartes de synthèse | `z.array(kpiSchema)` |
| `GET /dashboard/alertes-trend` | Série pour le graphique d'alertes | `z.array(alerteTrendSchema)` |
| `GET /dashboard/fraude-types` | Répartition par type de fraude | `z.array(fraudeParTypeSchema)` |
| `GET /dashboard/score-risque` | Distribution des scores | `scoreRisqueSchema` |

### Analyses

| Endpoint | Retourne | Schéma |
|---|---|---|
| `GET /analyses/statistiques` | Chiffres globaux de l'écran | `statistiquesGlobalesSchema` |
| `GET /analyses/etablissements-suspects` | Classement | `z.array(etablissementSuspectSchema)` |
| `GET /analyses/repartition-risque` | Segments de risque | `z.array(segmentRisqueSchema)` |
| `GET /analyses/comportements-anormaux` | Signalements | `z.array(comportementAnormalSchema)` |

### Rapports, réseaux, simulation, qualité, paramètres

| Endpoint | Retourne | Schéma |
|---|---|---|
| `GET /rapports` | Liste des rapports | `z.array(rapportSchema)` |
| `GET /rapports/stats` | Cartes de KPI | `z.array(statSchema)` |
| `GET /rapports/categories` | Répartition par catégorie | `z.array(categorieRapportSchema)` |
| `GET /reseaux` | Nœuds, arêtes et réseaux de fraude | `reseauxDataSchema` |
| `GET /simulation/population` | Population pour le rejeu à seuil variable | `simulationDataSchema` |
| `GET /qualite` | Précision, rappel, dérive, registre des causes | `qualiteDataSchema` |
| `GET /parametres/utilisateurs` | Annuaire (administration) | `z.array(utilisateurSchema)` |
| `GET /parametres/modeles` | Modèles déployés (administration) | `z.array(modeleSchema)` |
| `GET /parametres/systeme` | Réglages actuels | `parametresSystemeSchema` |

`parametresSystemeSchema` :

```ts
{
  seuilAlerteIA: number          // 0 à 100
  analyseAutomatique: boolean
  notificationEmail: boolean
  notificationSMS: boolean
  exportAutomatique: boolean
  frequenceAnalyse: string
  langueInterface: string
  fuseauHoraire: string
  retentionDonnees: number       // jours, entier positif
  niveauLog: string
}
```

## Écritures — `PATCH`

Implémentées côté client dans [`src/lib/api/mutations.ts`](../src/lib/api/mutations.ts).
**Aucune n'est jamais appelée en mode démonstration** (`USE_MOCK=true`) : la
modification reste alors dans le store Zustand, persistée en `localStorage`. En mode
API, chacune envoie un corps JSON **partiel** — uniquement les champs qui changent,
jamais l'objet entier — et attend `2xx` en retour, sans exigence sur le corps de la
réponse (il n'est pas lu).

| Endpoint | Corps (`PatchAlerte` / `PatchInvestigation` / `PatchParametres`) |
|---|---|
| `PATCH /alertes/{id}` | Sous-ensemble de `ModificationAlerte`, `modifieLe` exclu (posé par le store) |
| `PATCH /investigations/{id}` | Sous-ensemble de `ModificationInvestigation`, `modifieLe` exclu |
| `PATCH /parametres/systeme` | Sous-ensemble de `ParametresSysteme` |

**`ModificationAlerte`** — ce qu'un `PATCH /alertes/{id}` peut porter :

```ts
{
  statut?: StatutAlerte
  assigneA?: string | null       // null remet l'alerte en attente
  decision?: Decision
  notes?: Note[]
}
```

**`Decision`** — le point le plus contraint des écritures, imposé par `superRefine` :

```ts
{
  type: "fraude_confirmee" | "classee_sans_suite" | "piece_demandee"
  motif: string                  // 1 à 1000 caractères, non vide après trim
  cause?: CauseFauxPositif        // présent SI ET SEULEMENT SI type === "classee_sans_suite"
  acteur: string                  // email du compte qui décide
  horodatage: string               // ISO 8601 datetime
  statutAnterieur: StatutAlerte    // pour permettre l'annulation
}
```

Les cinq valeurs de `CauseFauxPositif` : `seuil_trop_bas`, `contexte_medical`,
`doublon_administratif`, `donnee_reference_erronee`, `regularisation_anterieure`. Les
deux premières se corrigent en réglant le modèle ; les trois autres relèvent d'une
anomalie réelle que le modèle a eu raison de relever. L'API n'a pas à connaître cette
distinction — elle est portée côté client par `lib/decisions.ts` — mais elle doit
**stocker et restituer `cause` fidèlement** : c'est elle qui alimente le registre des
faux positifs sur `/qualite`.

**Comportement attendu en cas de refus.** Le client interprète tout statut non-`2xx`
comme un refus et **annule** la modification déjà appliquée à l'écran — l'utilisateur
la voit disparaître plutôt que de rester affichée sans avoir été enregistrée. Un motif
d'erreur dans le corps de la réponse n'est aujourd'hui pas lu ni affiché ; le message
montré à l'utilisateur est générique (« Le service de détection a refusé la
modification »). Une réponse structurée (`{ "erreur": "..." }`) est un axe
d'amélioration côté client, pas une exigence côté API pour l'instant.

**Ce qui n'est pas encore un endpoint.** Créer un dossier, télécharger le PDF d'un
rapport, administrer les comptes : la console désactive ces boutons plutôt que
d'appeler une API qui n'existe pas (ADR-009). Ils ne figurent pas dans ce contrat tant
qu'ils ne sont pas spécifiés.

## Erreurs

Toute réponse qui ne respecte pas son schéma est rejetée côté client, avec jusqu'à
cinq écarts détaillés (chemin du champ + message). **Un champ renommé ou retiré côté
API se manifeste donc immédiatement**, avec son chemin exact, plutôt que par un
`undefined` silencieux plus loin dans le rendu. C'est le comportement voulu : en cas
de divergence entre ce document et l'API réelle, corriger l'un des deux plutôt que de
contourner la validation côté client.

| Situation | Comportement client |
|---|---|
| Réseau injoignable | `ApiError`, message générique par endpoint |
| Statut HTTP hors `2xx` (lecture) | `ApiError`, statut inclus dans le message |
| Statut HTTP hors `2xx` (écriture) | Modification annulée, rien n'est journalisé |
| Corps non conforme au schéma | `ApiError`, jusqu'à 5 écarts détaillés (lecture uniquement — l'écriture ne lit pas le corps de la réponse) |

## Ce que ce contrat ne couvre pas encore

- **L'authentification** (voir plus haut) — à fixer avant tout branchement réel.
- **La pagination.** Chaque `GET` de liste renvoie aujourd'hui l'intégralité de la
  collection ; le jeu de démonstration reste assez petit pour que ça n'ait pas encore
  été un problème.
- **Le journal d'audit n'a pas d'endpoint.** Il est aujourd'hui local au navigateur
  (`localStorage`, borné à 500 entrées) — voir README, section limites. Le faire
  persister côté serveur est un endpoint à concevoir, pas encore spécifié ici.
- **Le modèle de notation automobile** (`/notation`, `/portefeuille`, phase 6) ne
  fait pas partie de ce contrat : il consomme un artefact pré-calculé
  (`src/lib/modele/modele-fraude-auto.json`), pas une API. Voir
  [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).
