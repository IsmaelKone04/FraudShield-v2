# Journal des modifications

Une section par phase de [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Phase 1 — Fondations

L'argument central du projet — « deux variables d'environnement suffisent, aucun
composant à modifier » — était faux : un seul composant sur dix passait par le service.
Cette phase le rend vrai, et met un contrat vérifié entre les données et l'affichage.

### Sécurité

- **Trois dépendances directes vulnérables mises à jour**, dont deux visaient
  exactement ce que la phase 0 venait de construire :
  - `next` 16.2.6 → **16.3.0** — *Middleware / Proxy bypass in App Router*
    ([GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24)), alors
    que `proxy.ts` est notre unique barrière d'accès ;
  - `next-auth` beta.31 → **beta.32** (`@auth/core` 0.41.3) — *auth checks fail open*
    ([GHSA-8fpg-xm3f-6cx3](https://github.com/advisories/GHSA-8fpg-xm3f-6cx3)), alors
    que tout le contrôle repose sur `!!req.auth?.user` ;
  - `postcss` 8.5.15 → **8.5.26**.

### Ajouté

- **`src/lib/schemas/`** — les six domaines décrits en Zod. Les types TypeScript en
  sont déduits (`z.infer`) au lieu d'être écrits en parallèle.
- **`src/lib/api/client.ts`** — bascule `USE_MOCK`, appel HTTP, et `ApiError` portant
  le chemin du champ fautif. Les données locales sont validées comme les distantes :
  c'est ce qui garantit que le jeu fictif respecte le contrat attendu de l'API.
- **Un service par domaine** : `alertes`, `investigations`, `analyses`, `rapports`,
  `parametres`, en plus de `dashboard`.
- **`error.tsx`, `loading.tsx`, `not-found.tsx`** — une erreur de chargement affichait
  jusqu'ici une page d'erreur brute du serveur.
- **`<Toaster />` monté** dans le layout : le composant existait mais n'était nulle
  part, donc aucun `toast()` ne pouvait s'afficher.
- **`docs/DECISIONS.md`** — cinq ADR courts.

### Corrigé

- **Les alertes avaient deux sources qui avaient déjà divergé** : `A-2026-0125`
  s'affichait au 18/05 sur le tableau de bord et au 20/05 sur la page Alertes.
  `alertes/data.json` devient la source unique, le tableau de bord en demande un
  extrait. Un champ `montant` numérique a été ajouté aux dix alertes.
- Le type de fraude s'écrivait « Services non fournis » dans le graphique et
  « Service non fourni » dans les alertes — normalisé.
- **Les six écrans passent par leur service** ; plus aucun composant n'importe de
  `data.json`.
- `section-cards.tsx` plantait sur un identifiant de KPI inconnu (`colorMap[kpi.id].bg`
  sur `undefined`) — exactement le scénario du branchement d'une API qui publierait un
  indicateur de plus. Habillage de repli.
- `DataTable` déclarait recevoir `data` puis l'ignorait pour réimporter le JSON :
  le composant est désormais réellement piloté par ses props.
- **13 `any` supprimés** : ils portaient sur les icônes lucide (`LucideIcon`) et sur
  l'infobulle Recharts, pas sur les données.
- **Cinq `useMemo` aux dépendances incomplètes**, introduits par le découpage
  serveur/client : les données étant devenues des props, les mémos ne se
  recalculaient pas.
- `<th>` sans `scope` et `cursor-pointer` sur des lignes non cliquables, dans le
  tableau du tableau de bord.

### Supprimé

- Sept dépendances jamais importées : `@tanstack/react-table`, les quatre `@dnd-kit/*`,
  `vaul`, et `shadcn` — un outil en ligne de commande, qui n'avait rien à faire dans
  les dépendances d'exécution.
- Quatre composants `ui/` jamais consommés : `breadcrumb`, `checkbox`, `drawer`, `tabs`.

### Vérifications

`npm run typecheck` ✅ · `npm run build` ✅ · `npm run lint` **2 erreurs, 0 avertissement**
(contre 15 et 7 en début de phase ; les deux restantes sont les `set-state-in-effect`
planifiées en phase 5).

Parcours vérifié sur le serveur de développement : les six écrans répondent 200 avec une
session et rendent le bon volume de données via les services — 10 alertes, 6 dossiers
d'investigation, 18 rapports, 6 utilisateurs. Une URL inconnue rend bien le 404 maison.
Le tableau de bord et la page Alertes affichent désormais les mêmes dates.

> La validation a fait ses preuves dès sa mise en place : le build a refusé
> `rapports[17].pages = null`. Vérification faite, le `null` était **légitime** — un
> export CSV ou Excel n'est pas paginé, et un PDF en cours de génération n'a pas encore
> de compte. C'est le schéma qui était trop strict.

---

## Phase 0 — Remise en marche · jalon M1

L'application ne pouvait pas être ouverte : toutes les routes `/api/auth/*` répondaient
404, donc la connexion ne pouvait aboutir, donc aucun écran n'était atteignable. Cette
phase rend la console utilisable de bout en bout.

### Corrigé

- **Connexion rétablie.** Les `handlers` NextAuth exportés par `src/auth.ts` n'étaient
  montés nulle part : ajout de `src/app/api/auth/[...nextauth]/route.ts`. C'était la
  cause unique du blocage — et le fichier n'avait jamais existé dans l'historique.
- **Contrôle d'accès complété.** `src/proxy.ts` n'écoutait que `/dashboard` : `/alertes`,
  `/investigations`, `/analyses`, `/rapports` et `/parametres` s'ouvraient **sans
  authentification**. La règle est désormais *fail-closed* — tout exige une session
  sauf `/login` — de sorte qu'une page ajoutée plus tard soit protégée par défaut.
- **Page de connexion inutile une fois connecté** : `/login` redirige vers `/dashboard`
  quand une session existe.
- **Page d'accueil.** `/` affichait le gabarit Create Next App ; elle aiguille désormais
  vers `/dashboard` ou `/login` selon la session.
- **Métadonnées.** Le titre de l'onglet était « Create Next App ». Titre, description,
  nom d'application renseignés ; indexation désactivée (démonstrateur sur données
  fictives).
- **`npm run lint` réparé.** Next 16 a supprimé `next lint`. Passage à ESLint 9 en
  configuration plate — `eslint-config-next` 16 exporte des configurations plates
  natives, le pont `FlatCompat` échoue sur ces presets. Ajout de `npm run typecheck`.
- **Types React alignés** : `@types/react` et `@types/react-dom` étaient en v18 face à
  React 19.

### Supprimé

- `public/next.svg` et `public/vercel.svg`, résidus du gabarit, référencés nulle part.
- La police `Inter`, chargée à chaque rendu et jamais appliquée — le design system
  utilise Geist.
- Quatre imports morts (`ResponsiveContainer`, `YAxis`, `Shield`, `err`).

### Documentation

- `README.md` : quatre affirmations ne correspondaient plus au code — la généralisation
  du service, l'usage de TanStack Table et dnd-kit, le changement de statut d'une
  alerte, et la page `/dashboard/admin`. Corrigées, avec l'état réel du chantier.
- `docs/ROADMAP.md` et ce journal créés.

### Vérifications

`npm run typecheck` ✅ · `npm run build` ✅ (11 routes) · `npm run lint` ✅ exécutable.
Parcours vérifié sur le serveur de développement : les trois comptes de démonstration se
connectent et portent le bon rôle, un mot de passe erroné ne crée pas de session, les six
écrans de la console redirigent vers `/login` sans session et répondent 200 avec.

### Dette laissée sciemment

- 15 erreurs ESLint subsistent : 13 `no-explicit-any` sur les données non typées, que la
  phase 1 corrigera avec Zod plutôt que par un typage jetable ; 2 `set-state-in-effect`
  dans `use-mobile.ts` et `chart-area-interactive.tsx`, traités en phase 5.
- `npm audit` signale des vulnérabilités dans l'arbre de dépendances (dont deux
  critiques). À trier en phase 1, avant d'ajouter quoi que ce soit.
