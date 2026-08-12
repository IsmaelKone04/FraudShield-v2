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
| `analyste@fraudshield.com` | Agent d'analyse |

Ces comptes ne donnent accès qu'aux données fictives décrites plus haut. Les identités
sont décrites une seule fois, dans [`src/lib/utilisateurs.ts`](src/lib/utilisateurs.ts) —
c'est le même annuaire qui sert à l'authentification, à l'assignation d'un dossier et à
l'affichage d'un nom. Les mots de passe, eux, sont stockés sous forme d'**empreintes
bcrypt** dans [`src/auth.ts`](src/auth.ts), jamais en clair, et volontairement à part :
ce module-là n'est pas envoyé au navigateur. L'authentification définitive est destinée
à être déléguée à l'API.

## ✍️ Ce qui est réellement interactif

La console **modifie** des données. Elle ne se contente plus d'afficher.

| Geste | Où | Effet |
|---|---|---|
| Changer le statut d'une alerte | `/alertes` | Liste et cartes de KPI mises à jour |
| **Décider d'un dossier** | `/alertes/[id]` | Fraude confirmée, classée sans suite, ou pièce demandée — motif obligatoire, et c'est la décision qui fixe le statut |
| **Écrire une note interne** | `/alertes/[id]` | Fil horodaté et signé, versé à la chronologie |
| Assigner une alerte, réassigner un dossier | `/alertes`, `/investigations` | Aux comptes ci-dessus, avec filtre « Mes dossiers » |
| Clôturer ou rouvrir un dossier | `/investigations` | |
| Exporter en CSV | `/alertes`, `/investigations`, `/rapports` | Fichier produit par le navigateur |
| Régler le seuil de déclenchement | `/parametres` | Agit sur `/alertes` : les scores sous le seuil sont atténués, marqués, et masquables |

**Où cela s'écrit.** En mode démonstration (`NEXT_PUBLIC_USE_MOCK=true`, celui du dépôt),
les modifications vivent dans le `localStorage` **de ce navigateur** : elles survivent au
rechargement, ne partent sur aucun serveur, et un bouton « Repartir du jeu d'origine » les
efface. Les toasts le disent explicitement, et les exports CSV portent une colonne
« Modifié localement ». En mode API, les mêmes gestes appellent le service de détection ;
si l'appel échoue, la modification est **annulée** plutôt que laissée à l'écran.

Le store ne mémorise que l'**écart** au jeu de données, jamais une copie de celui-ci — de
sorte qu'une donnée changée côté serveur ne soit pas indéfiniment écrasée par une valeur
locale. Le détail est dans [ADR-006](docs/DECISIONS.md).

### Les boutons qui ne font rien le disent

Cette console est un démonstrateur : certaines actions supposent une écriture qu'aucune
API n'expose ici — créer un dossier, écrire une note, télécharger le PDF d'un rapport,
administrer les comptes. **Ces commandes sont désactivées et portent leur motif en
infobulle**, plutôt que d'afficher une confirmation pour une opération qui n'a pas lieu.
Aucun bouton visible n'est décoratif ; le principe est consigné dans
[ADR-009](docs/DECISIONS.md).

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
│   │   └── [id]/         # Le dossier : actes facturés, chronologie, décision, notes
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
│   ├── api/mutations.ts  # Le pendant en écriture, même bascule
│   ├── schemas/          # Schémas Zod — définition unique du domaine
│   ├── services/         # Une façade métier par domaine
│   ├── store/            # Écarts au jeu de données (Zustand), persistés localement
│   ├── csv.ts            # Génération CSV, exports.ts  # Colonnes des deux exports
│   ├── utilisateurs.ts   # Annuaire unique des comptes
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
| État client | Zustand 5, persistance `localStorage` versionnée |
| Graphiques | Recharts |
| Authentification | NextAuth v5 (Credentials), bcrypt, JWT |
| Langage | TypeScript |

## ⚠️ Limites connues

- **Pas de backend dans ce dépôt** : le service de détection n'est pas inclus (voir plus haut).
- **Données fictives** : aucun jeu de données réel, pour d'évidentes raisons de confidentialité.
- **Répertoire d'utilisateurs local** : les trois comptes de démonstration sont décrits
  dans `src/lib/utilisateurs.ts`. En production, l'authentification doit passer par l'API.
- **Les modifications ne quittent pas le navigateur** en mode démonstration : elles sont
  écrites dans le `localStorage`, jamais transmises. Rien n'est partagé entre deux
  utilisateurs ni entre deux machines — c'est attendu tant que le service de détection
  n'est pas branché (voir « Ce qui est réellement interactif »).
- **Le rôle ne conditionne presque rien** : il est porté par le JWT, exposé dans la
  session, et protège les routes via `proxy.ts` — mais il ne restreint aucune action.
  Un analyste peut réassigner un dossier comme un superviseur. Décider qui a le droit de
  quoi est une règle métier, traitée en phase 4 avec la piste d'audit.
- **Le score n'est pas encore expliqué** : le dossier affiche les signaux relevés sur
  chaque acte, mais pas la décomposition du score facteur par facteur. C'est le
  différenciateur D1, en phase 4.
- **404 souple sur un identifiant d'alerte inconnu** : la page « introuvable » s'affiche
  bien, mais la réponse porte le statut 200. La frontière de streaming posée par
  `src/app/loading.tsx` envoie l'en-tête avant que `notFound()` ne soit atteint — cause
  mesurée, arbitrage assumé, détail en [ADR-013](docs/DECISIONS.md).

## 🗺️ Feuille de route

Le projet est repris depuis août 2026 selon un plan en six phases, détaillé dans
[`docs/ROADMAP.md`](docs/ROADMAP.md) — avec la liste des tâches, les estimations et
les arbitrages. Résumé :

| Phase | | État |
|---|---|---|
| **P0** | Remise en marche : connexion, accueil, contrôle d'accès | ✅ terminée |
| **P1** | Fondations : service généralisé, validation Zod, gestion d'erreurs | ✅ terminée |
| **P2** | Interactions : statuts, assignation, export, paramètres persistés | ✅ terminée |
| **P3** | Détail d'alerte (`/alertes/[id]`) | ✅ terminée |
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
