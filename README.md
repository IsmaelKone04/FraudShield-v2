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

Tout passe par un service unique, [`src/lib/services/dashboard.service.ts`](src/lib/services/dashboard.service.ts).
Chaque méthode sait lire aussi bien le jeu de données local que l'endpoint distant :

```ts
async getKPIs(): Promise<KPI[]> {
  if (USE_MOCK) {
    const data = await getMockData()
    return data.kpis
  }
  return fetchFromAPI<KPI[]>("/dashboard/kpis")
}
```

Pour passer sur l'API réelle, deux variables d'environnement suffisent —
**aucun composant n'a besoin d'être modifié** :

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=https://mon-api/api/v1
```

C'est le choix de conception dont je suis le plus satisfait sur ce projet : l'interface
a pu être construite et démontrée sans jamais attendre que le backend soit prêt.

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

```
src/
├── app/
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
│   ├── services/         # Accès aux données (bascule mock ↔ API)
│   └── types/            # Types du domaine
├── auth.ts               # Configuration NextAuth (fournisseur, rôles, session)
└── proxy.ts              # Contrôle d'accès aux routes (ex-`middleware`, Next.js 16)
```

### Contrôle d'accès

[`src/proxy.ts`](src/proxy.ts) protège les routes avant même le rendu : toute visite de
`/dashboard` sans session est redirigée vers `/login`, et `/dashboard/admin` exige le
rôle `ADMINISTRATEUR`. Le rôle est porté par le jeton JWT et exposé dans la session.

> À noter : Next.js 16 a renommé le fichier `middleware.ts` en `proxy.ts`. Ce n'est pas
> un fichier exotique, c'est bien le mécanisme de middleware standard.

## 🛠️ Stack

| Domaine | Choix |
|---------|-------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui sur Base UI |
| Tableaux | TanStack Table + dnd-kit (réordonnancement) |
| Graphiques | Recharts |
| Authentification | NextAuth v5 (Credentials), bcrypt, JWT |
| Validation | Zod |
| Langage | TypeScript |

## ⚠️ Limites connues

- **Pas de backend dans ce dépôt** : le service de détection n'est pas inclus (voir plus haut).
- **Données fictives** : aucun jeu de données réel, pour d'évidentes raisons de confidentialité.
- **Répertoire d'utilisateurs local** : les trois comptes de démonstration sont codés dans
  `src/auth.ts`. En production, l'authentification doit passer par l'API.
- **Écritures non persistées** : changer le statut d'une alerte met à jour l'affichage,
  mais rien n'est enregistré tant que l'API n'est pas branchée.

## 📄 Licence

[MIT](LICENSE)

## 👤 Auteur

**Cheick Ismaël Koné** — [@IsmaelKone04](https://github.com/IsmaelKone04)
Application web. Le service de détection a été développé par mon coéquipier.
