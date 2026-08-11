# FraudShield v2 — console de détection de fraude à l'assurance santé

Interface d'un outil destiné aux organismes d'assurance santé : suivi des alertes de
fraude, investigation des dossiers suspects, analyses et rapports. Développé en mai 2026
pour un concours, en binôme — je me suis chargé de l'application web, mon coéquipier de
l'API de détection.

> Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · NextAuth v5

---

## ⚠️ Périmètre de ce dépôt — à lire en premier

**Ce dépôt ne contient que l'application web.** Le service de détection (API FastAPI,
modèle de scoring) a été développé par mon coéquipier et n'est pas inclus ici : il ne
m'appartient pas.

Concrètement, l'application **fonctionne de façon autonome sur des jeux de données
fictifs** (`src/app/*/data.json`). Tous les chiffres affichés — alertes, scores de
risque, montants — sont inventés et ne proviennent d'aucun organisme réel.

Le code a toutefois été écrit pour que le branchement à la vraie API soit immédiat.

## 🔌 Bascule données fictives → API réelle

**Aucun composant n'importe de données.** Chaque écran est un composant serveur qui
interroge le service de son domaine ; le composant client ne reçoit que des props.

```ts
// src/lib/services/alertes.service.ts
async getAlertes(): Promise<Alerte[]> {
  if (USE_MOCK) return (await chargerJeuLocal()).alertes
  return fetchFromAPI("/alertes", z.array(alerteSchema))
}
```

Deux variables d'environnement suffisent à basculer :

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=https://mon-api/api/v1
```

C'est le choix de conception dont je suis le plus satisfait sur ce projet : l'interface
a pu être construite et démontrée sans jamais attendre que le backend soit prêt.

### Le contrat est vérifié, des deux côtés

Chaque réponse — de l'API **comme du jeu local** — est validée par un schéma Zod avant
d'atteindre un composant. Les types TypeScript sont déduits de ces schémas, jamais
écrits en parallèle :

```
src/lib/schemas/     ← définition unique (schéma + type déduit)
src/lib/api/client.ts ← bascule mock/API, appel HTTP, validation
src/lib/services/    ← une façade métier par domaine
```

Valider le jeu fictif n'est pas superflu : c'est ce qui garantit qu'il respecte le
contrat que l'API devra respecter. Un champ manquant ou renommé se signale
immédiatement, avec son chemin exact, au lieu de produire un `undefined` au milieu du
rendu.

## 🚀 Démarrage

Prérequis : **Node 18+**.

```bash
git clone https://github.com/IsmaelKone04/FraudShield-v2.git
cd FraudShield-v2
npm install

cp .env.example .env.local
npx auth secret          # génère AUTH_SECRET

npm run dev              # http://localhost:3000
```

`npx auth secret` n'est pas facultatif : sans `AUTH_SECRET`, la connexion échoue.

| Commande | |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint 9 (Next 16 a supprimé `next lint`) |

### Comptes de démonstration

Mot de passe des trois comptes : **`Demo1234!`**

| Adresse | Rôle |
|---------|------|
| `admin@fraudshield.com` | Administrateur |
| `superviseur@fraudshield.com` | Superviseur |
| `analyste@fraudshield.com` | Analyste |

Ces comptes ne donnent accès qu'aux données fictives décrites plus haut. Leurs mots de
passe sont stockés sous forme d'**empreintes bcrypt** dans [`src/auth.ts`](src/auth.ts),
jamais en clair — l'authentification définitive est destinée à être déléguée à l'API.

## 🧱 Structure

Chaque écran suit le même découpage : `page.tsx` (serveur) charge via le service et
passe les données à `*-client.tsx` (client), qui porte les filtres et l'interaction.

```
src/
├── app/
│   ├── api/auth/[...nextauth]/   # Montage des routes NextAuth
│   ├── error.tsx  loading.tsx  not-found.tsx
│   ├── dashboard/        # Vue d'ensemble : KPIs, tendances, dernières alertes
│   ├── alertes/          # Liste des alertes, filtres, statuts
│   ├── investigations/   # Dossiers en cours d'instruction
│   ├── analyses/         # Analyses par type de fraude
│   ├── rapports/         # Génération et export de rapports
│   ├── parametres/       # Configuration (seuils, notifications, connexion API)
│   └── login/            # Authentification
├── components/
│   ├── ui/               # Bibliothèque shadcn/ui (variante Base UI)
│   └── ...               # Sidebar, tableaux, graphiques, cartes de KPI
├── lib/
│   ├── api/client.ts     # Bascule mock ↔ API, appel HTTP, validation
│   ├── schemas/          # Schémas Zod — définition unique du domaine
│   ├── services/         # Une façade métier par domaine
│   └── types/            # Types déduits des schémas (point d'entrée commode)
├── auth.ts               # Configuration NextAuth (fournisseur, rôles, session)
└── proxy.ts              # Contrôle d'accès aux routes (ex-`middleware`, Next.js 16)
```

Les arbitrages structurants sont consignés dans [`docs/DECISIONS.md`](docs/DECISIONS.md).

### Contrôle d'accès

[`src/proxy.ts`](src/proxy.ts) protège les routes avant même le rendu, selon un principe
*fail-closed* : **tout ce qui n'est pas explicitement public exige une session**. Seule
`/login` est ouverte (avec les routes `/api/auth/*`, nécessaires à la connexion elle-même).
Une page ajoutée demain est donc protégée sans qu'on ait à y penser.

Le rôle est porté par le jeton JWT et exposé dans la session. La restriction du préfixe
`/dashboard/admin` au rôle `ADMINISTRATEUR` est en place, mais **la page correspondante
n'existe pas encore** : elle est prévue en phase 4 pour accueillir le journal d'audit.

> À noter : Next.js 16 a renommé le fichier `middleware.ts` en `proxy.ts`. Ce n'est pas
> un fichier exotique, c'est bien le mécanisme de middleware standard.

## 🛠️ Stack

| Domaine | Choix |
|---------|-------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui sur Base UI |
| Tableaux | `<table>` + composants `ui/table` (pas de tri ni de réordonnancement à ce jour) |
| Validation | Zod 4, au runtime, sur les données locales comme distantes |
| Graphiques | Recharts |
| Authentification | NextAuth v5 (Credentials), bcrypt, JWT |
| Validation | Zod |
| Langage | TypeScript |

## ⚠️ Limites connues

- **Pas de backend dans ce dépôt** : le service de détection n'est pas inclus (voir plus haut).
- **Données fictives** : aucun jeu de données réel, pour d'évidentes raisons de confidentialité.
- **Répertoire d'utilisateurs local** : les trois comptes de démonstration sont codés dans
  `src/auth.ts`. En production, l'authentification doit passer par l'API.
- **Aucune écriture** : la console est en lecture seule. Changer le statut d'une alerte,
  l'assigner ou enregistrer les paramètres n'est pas encore possible — plusieurs boutons
  sont en place mais sans action derrière. C'est l'objet de la phase 2 de la feuille de
  route.
- **Accès en lecture seulement pour tous les rôles** : le rôle est bien porté par le JWT
  et exposé dans la session, mais il ne conditionne encore aucune fonctionnalité.

## 🗺️ Feuille de route

Le projet est repris depuis août 2026 selon un plan en six phases, détaillé dans
[`docs/ROADMAP.md`](docs/ROADMAP.md) — avec la liste des tâches, les estimations et
les arbitrages. Résumé :

| Phase | | État |
|---|---|---|
| **P0** | Remise en marche : connexion, accueil, contrôle d'accès | ✅ terminée |
| **P1** | Fondations : service généralisé, validation Zod, gestion d'erreurs | ✅ terminée |
| **P2** | Interactions : statuts, assignation, export, paramètres persistés | à venir |
| **P3** | Détail d'alerte (`/alertes/[id]`) | à venir |
| **P4** | Explicabilité du score · boucle de rétroaction · graphe de réseaux · simulateur de seuils · piste d'audit | à venir |
| **P5** | Accessibilité, thème, tests, responsive, documentation finale | à venir |

La phase 4 porte le parti pris du projet : **mettre l'analyste au centre plutôt que le
modèle**. Les outils du marché produisent un score et une file d'alertes ; ils
n'expliquent pas le score, ne referment jamais la boucle sur les faux positifs, et
raisonnent dossier par dossier alors que la fraude organisée se lit dans les liens.

## 📄 Licence

[MIT](LICENSE)

## 👤 Auteur

**Cheick Ismaël Koné** — [@IsmaelKone04](https://github.com/IsmaelKone04)
Application web. Le service de détection a été développé par mon coéquipier.
