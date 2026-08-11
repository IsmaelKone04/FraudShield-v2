# Journal des modifications

Une section par phase de [`docs/ROADMAP.md`](docs/ROADMAP.md).

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
