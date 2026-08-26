# Architecture

Ce document explique **comment le dépôt est construit**, pas ce qu'il affiche — pour
ça, voir [`README.md`](../README.md). Il complète
[`docs/API-CONTRACT.md`](API-CONTRACT.md) (le contrat que la vraie API doit respecter)
et [`docs/DECISIONS.md`](DECISIONS.md) (pourquoi chaque choix structurant a été pris).

## Vue d'ensemble

```
                     ┌─────────────────────────┐
                     │   Composant serveur      │   src/app/*/page.tsx
                     │   (RSC — un par écran)    │
                     └────────────┬─────────────┘
                                  │ appelle
                     ┌────────────▼─────────────┐
                     │   Service de domaine      │   src/lib/services/*.service.ts
                     │   (une façade par écran)   │
                     └────────────┬─────────────┘
                                  │ USE_MOCK ?
                     ┌────────────▼─────────────┐
              ┌──────┤   src/lib/api/client.ts   ├──────┐
              │      └───────────────────────────┘      │
   ┌──────────▼──────────┐                  ┌───────────▼───────────┐
   │  data.json (mock)     │                  │  API de détection      │
   │  src/app/*/data.json  │                  │  (hors dépôt, cf ci-  │
   └──────────┬────────────┘                  │  dessous)             │
              │                               └───────────┬───────────┘
              └───────────────┬───────────────────────────┘
                              │  validé par un schéma Zod, quelle
                              │  que soit la source
                     ┌────────▼─────────────┐
                     │   Composant client     │   *-client.tsx
                     │   (rendu, interaction) │
                     └────────────┬───────────┘
                                  │ actions utilisateur
                     ┌────────────▼─────────────┐
                     │   Store Zustand           │   src/lib/store/
                     │   (écarts, persistés       │
                     │   dans localStorage)       │
                     └────────────┬─────────────┘
                                  │ écrit, si USE_MOCK=false
                     ┌────────────▼─────────────┐
                     │   src/lib/api/mutations.ts │
                     └───────────────────────────┘
```

**Un principe traverse tout le schéma : aucun composant n'importe de données, et
aucun composant n'appelle `fetch`.** Les deux passages obligés —
[`client.ts`](../src/lib/api/client.ts) en lecture,
[`mutations.ts`](../src/lib/api/mutations.ts) en écriture — sont les seuls endroits
qui savent si la donnée vient du jeu local ou du réseau. C'est ce qui permet à
`NEXT_PUBLIC_USE_MOCK` de basculer l'application entière sans toucher un composant
(détaillé dans le README, section « Bascule données fictives → API réelle »).

## Les couches, dans l'ordre où une requête les traverse

### 1. Routage — `src/app/*/page.tsx`

App Router de Next.js 16 : un dossier par écran, un `page.tsx` par route. Chaque
`page.tsx` est un **composant serveur** — il appelle un service, attend la donnée, et
la passe en props à un composant client. Il ne contient ni état ni logique
d'affichage : c'est le point où la donnée entre dans l'arbre React, rien de plus.

Les routes dynamiques (`/alertes/[id]`, `/reseaux/[id]`) reçoivent leur identifiant
via les `params` de Next.js et le transmettent tel quel au service — aucune validation
d'identifiant à ce niveau, c'est le service (et en aval, le schéma) qui refuse une
forme incorrecte.

`src/proxy.ts` s'exécute **avant** tout ça : le contrôle d'accès (session requise,
rôle pour `/dashboard/admin`) est tranché au niveau du middleware Next.js, pas dans
les pages. Le détail est dans le README, section « Contrôle d'accès ».

### 2. Services — `src/lib/services/*.service.ts`

Une façade par domaine (`alertes`, `investigations`, `analyses`, `dashboard`,
`qualite`, `rapports`, `reseaux`, `simulation`, `parametres`). Chaque service expose
des fonctions de lecture qui, systématiquement :

1. testent `USE_MOCK` ;
2. si vrai, chargent `data.json` du dossier de route correspondant ;
3. sinon, appellent `fetchFromAPI(endpoint, schema)` ;
4. dans les deux cas, **valident** le résultat contre un schéma Zod avant de le
   rendre au composant serveur.

```ts
// src/lib/services/alertes.service.ts — le patron répété dans chaque service
async getAlertes(): Promise<Alerte[]> {
  if (USE_MOCK) return (await chargerMock(...)).alertes
  return fetchFromAPI("/alertes", z.array(alerteSchema))
}
```

Un service ne connaît jamais son appelant ; un composant serveur n'appelle jamais
`fetch` directement. C'est la frontière qui rend la bascule mock/API invisible au
reste du code.

### 3. Client d'accès — `src/lib/api/client.ts`

Le seul endroit qui lit `NEXT_PUBLIC_USE_MOCK` et `NEXT_PUBLIC_API_URL`. Deux
fonctions : `chargerMock` (charge un import JSON, le valide) et `fetchFromAPI`
(appelle le réseau, revalide toutes les 60 s côté Next, valide la réponse). Les deux
retournent un type déjà validé — jamais un `unknown` qui traînerait jusqu'au rendu.

Une erreur de réseau, un statut HTTP en échec, ou une charge utile qui ne respecte
pas le schéma lèvent tous la même `ApiError`, avec le nom de l'endpoint et jusqu'à
cinq écarts de validation détaillés (chemin du champ + message). C'est le filet qui
transforme un backend qui change de forme en erreur explicite, immédiatement, plutôt
qu'en `undefined` silencieux au milieu d'un composant.

### 4. Schémas — `src/lib/schemas/*.ts`

Un schéma Zod par domaine, **définition unique** du contrat : les types TypeScript
sont déduits (`z.infer<typeof schema>`), jamais écrits en parallèle. `src/lib/types/`
ne fait que réexporter ces types déduits, comme point d'entrée commode pour les
composants.

Le mock est validé au même titre qu'une vraie réponse — voir `chargerMock`
ci-dessus. C'est délibéré : sans ça, le jeu fictif pourrait dériver du contrat sans
que rien ne le signale, et la bascule vers l'API réelle découvrirait l'écart d'un
coup, en production.

### 5. Composants — `src/components/`, `src/app/*/…-client.tsx`

Chaque écran a un fichier `*-client.tsx` : le composant client qui reçoit les props
du composant serveur, tient l'état d'interaction local (filtres, tri, formulaires),
et lit/écrit dans le store pour tout ce qui doit survivre à une navigation.
`src/components/ui/` porte la bibliothèque shadcn/ui (variante Base UI) — composants
génériques, sans connaissance du domaine. `src/components/coque-console.tsx` est le
cadre commun (barre latérale, en-tête, fil d'Ariane) partagé par tous les écrans
authentifiés.

### 6. Store — `src/lib/store/`

Zustand, avec le middleware `persist` (`localStorage`, clé versionnée — voir
`VERSION_STOCKAGE` et la migration ci-dessous). Deux stores :

- **`modifications.store.ts`** — les écarts au jeu de données : statuts changés,
  décisions, notes, assignations, réglages système. `use-modifications.ts` expose des
  hooks qui **fusionnent** le jeu de données et les écarts au moment du rendu
  (`fusionnerAlerte`, `fusionnerInvestigation`, `fusionnerParametres`) — le store ne
  contient jamais de copie complète d'une alerte, seulement ce qui a changé.
- **`journal.store.ts`** — la piste d'audit, alimentée par `journaliser()`, jamais
  directement par les composants.

**Le contrat optimiste**, implémenté par `appliquer()` dans `modifications.store.ts`
et suivi par chaque action exportée du store :

1. la modification est appliquée à l'état **immédiatement** (l'écran réagit sans
   attendre le réseau) ;
2. `envoyer*` de `mutations.ts` est appelé ;
3. en cas d'échec, l'état est **annulé** — restauré à sa valeur avant l'étape 1 ;
4. `journaliser()` n'est appelé **qu'après un envoi réussi** — jamais avant, jamais
   sur un échec. Le journal enregistre ce qui a eu lieu, pas ce qui a été tenté.

**La migration** (`defaireDecisionsNonQualifiees`, dans `modifications.store.ts`,
testée par `src/lib/store/migration.test.ts`) s'exécute quand `VERSION_STOCKAGE`
augmente : plutôt que de jeter tout le contenu de `localStorage` parce qu'un champ a
changé de forme (un classement sans suite exige désormais une cause, voir ADR-018),
elle annule sélectivement les décisions qui ne portent pas la nouvelle exigence, et
conserve tout le reste — statuts, assignations, notes.

### 7. Écriture réseau — `src/lib/api/mutations.ts`

Le pendant de `client.ts` en écriture, avec la même bascule `USE_MOCK`. En mode
démonstration, `envoyer()` ne fait rien : c'est le store, via `persist`, qui
constitue la seule persistance. En mode API, chaque fonction (`envoyerModificationAlerte`,
`envoyerModificationInvestigation`, `envoyerModificationParametres`) émet un `PATCH`
et laisse une réponse non `ok` remonter en `ApiError` — c'est cette erreur que
`appliquer()` intercepte pour déclencher l'annulation.

## Authentification et contrôle d'accès

- **`src/auth.ts`** — configuration NextAuth v5 (Credentials). Les mots de passe des
  trois comptes de démonstration sont comparés à des **empreintes bcrypt**, jamais
  stockés en clair. Le rôle est porté par le JWT et exposé dans la session
  (`session.user.role`).
- **`src/lib/utilisateurs.ts`** — annuaire unique des comptes : sert à
  l'authentification, à l'assignation d'un dossier, et à l'affichage d'un nom dans le
  journal. Une seconde liste finirait par diverger de celle-ci.
- **`src/proxy.ts`** — middleware Next.js (renommé depuis `middleware.ts` en
  Next 16), *fail-closed* : toute route non explicitement publique exige une session.
  `/dashboard/admin` exige en plus le rôle `ADMINISTRATEUR` — vérifié une seconde fois
  côté page, le proxy ne filtrant qu'une expression régulière de chemin.

## Modèle et portefeuille (phase 6) — un sous-système à part

Le modèle de scoring automobile et le portefeuille de référence **ne participent pas**
au flux ci-dessus : ils ne notent aucune alerte de la console (celle-ci relève de
l'assurance santé, eux de l'automobile). Ce sont des artefacts pré-calculés,
consommés directement par deux écrans dédiés :

```
scripts/modele/*.mjs        (hors runtime) → src/lib/modele/modele-fraude-auto.json
                                              → src/lib/modele/scorer.ts → /notation
scripts/portefeuille/agreger.mjs (hors runtime) → src/lib/portefeuille/reference.json
                                                  → src/lib/portefeuille/reference.ts → /portefeuille
```

`npm run modele:entrainer` et `npm run portefeuille:agreger` s'exécutent **hors** du
serveur Next — aucun entraînement ni agrégation n'a lieu au runtime de l'application.
Le détail des choix (régression logistique plutôt qu'un modèle plus sophistiqué, jeu
sans étiquette traité comme référence plutôt que comme détecteur) est dans
[ADR-033](DECISIONS.md) et [ADR-034](DECISIONS.md).

## Tests

| Outil | Ce qu'il couvre | Ce qu'il ne peut pas couvrir |
|---|---|---|
| **Vitest** (`npm test`) | Schémas, services, store (dont le contrat optimiste et la migration), calcul du score, fonctions pures | Que l'application tourne réellement dans un navigateur |
| **Playwright** (`npm run e2e`) | Connexion réelle, décision de bout en bout, persistance après un **rechargement complet** de la page | Le détail interne d'un calcul — trop lent pour ça |

Les deux se complètent plutôt que de se recouvrir : voir [ADR-032](DECISIONS.md) et
[ADR-035](DECISIONS.md) pour ce que chaque choix a permis de prouver, et notamment la
course entre l'écriture asynchrone de `persist` (Zustand) et une navigation complète,
découverte par le second.

## Ce que ce document ne couvre pas

- **Le service de détection lui-même** (API FastAPI) n'est pas dans ce dépôt — voir
  [`docs/API-CONTRACT.md`](API-CONTRACT.md) pour ce qu'il doit respecter côté
  interface, pas pour son implémentation.
- **Les arbitrages et leur raisonnement** vivent dans
  [`docs/DECISIONS.md`](DECISIONS.md), pas ici : ce document décrit la forme
  actuelle, pas pourquoi elle a cette forme.
