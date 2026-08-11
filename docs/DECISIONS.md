# Décisions d'architecture

Une entrée par arbitrage structurant, au format ADR court : contexte, décision,
conséquence. On y consigne aussi ce qu'on a **choisi de ne pas faire**, ce qui est
souvent l'information la plus utile six mois plus tard.

---

## ADR-001 — Un service par domaine, derrière un client unique

**Contexte.** Le dépôt annonçait « tout passe par un service unique, aucun composant
n'a besoin d'être modifié » pour basculer sur l'API de détection. Dans les faits, un
seul composant sur dix appelait le service, quatre de ses cinq méthodes n'étaient
jamais invoquées, et les cinq autres écrans importaient leur `data.json` directement.
L'argument central du projet était donc faux.

**Décision.** Un client bas niveau (`src/lib/api/client.ts`) porte la bascule
`USE_MOCK`, la lecture du jeu local, l'appel HTTP et la validation. Au-dessus, un
service par domaine (`dashboard`, `alertes`, `investigations`, `analyses`,
`rapports`, `parametres`) expose des méthodes métier. Chaque page devient un
composant serveur qui charge ses données et les passe en props au composant client
qui porte les filtres.

**Conséquence.** Plus aucun composant n'importe de JSON. Basculer sur l'API réelle
ne demande que deux variables d'environnement, comme annoncé. En contrepartie, chaque
écran est désormais scindé en deux fichiers (`page.tsx` serveur + `*-client.tsx`).

**Écarté.** Charger les données côté client avec un `useEffect` : cela aurait exposé
l'URL de l'API au navigateur, empêché le rendu serveur, et forcé à gérer les états de
chargement à la main dans chaque écran.

---

## ADR-002 — Les schémas Zod sont la source des types

**Contexte.** Les types du domaine étaient écrits à la main dans
`src/lib/types/dashboard.types.ts`, sans lien avec les données réellement chargées.
Rien ne garantissait que le JSON leur corresponde — et rien ne garantirait que la
future API leur corresponde davantage.

**Décision.** Les schémas de `src/lib/schemas/` sont l'unique définition. Les types
TypeScript en sont **déduits** (`z.infer`), jamais écrits en parallèle. La validation
s'applique aussi bien à la réponse de l'API **qu'au jeu de données local** : valider
le mock, c'est vérifier en continu que les données fictives respectent le contrat que
l'API devra respecter.

**Conséquence.** Un écart se signale immédiatement, avec le chemin du champ fautif,
au lieu de produire un `undefined` au milieu du rendu. La règle a payé dès sa mise en
place : le build a refusé `rapports[17].pages = null`, ce qui a mis en évidence que le
champ est légitimement nul pour un CSV, un Excel, ou un PDF encore en génération — le
schéma était trop strict, pas la donnée.

**Coût.** Une validation à chaque chargement. Négligeable sur des jeux de cette
taille, et le prix d'une erreur d'intégration détectée trois semaines plus tard est
sans commune mesure.

---

## ADR-003 — Contrôle d'accès *fail-closed*

**Contexte.** `proxy.ts` n'écoutait que `/dashboard`. Cinq écrans — `/alertes`,
`/investigations`, `/analyses`, `/rapports`, `/parametres` — s'ouvraient sans
authentification. Le défaut passait inaperçu parce que la connexion était cassée par
ailleurs : personne n'atteignait quoi que ce soit.

**Décision.** Le `matcher` couvre tout sauf les ressources statiques et
`/api/auth/*` ; la logique n'ouvre explicitement que `/login`. Tout le reste exige
une session.

**Conséquence.** Une page ajoutée demain est protégée sans qu'on ait à y penser. Une
page qu'on voudrait rendre publique demande, elle, une modification explicite — ce qui
est le bon sens de la contrainte.

---

## ADR-004 — Une seule source pour les alertes

**Contexte.** Les six alertes du tableau de bord étaient dupliquées entre
`dashboard/data.json` et `alertes/data.json`. Les deux copies avaient **déjà
divergé** : l'alerte `A-2026-0125` s'affichait au 18/05 sur un écran et au 20/05 sur
l'autre.

**Décision.** `alertes/data.json` est la source ; `dernieresAlertes` a été retiré du
tableau de bord. `dashboardService.getDernieresAlertes()` délègue à
`alertesService.getDernieres()`, qui trie par date et coupe.

**Conséquence.** Les deux écrans ne peuvent plus se contredire. Le champ `montant`
numérique a été ajouté aux dix alertes, ce qui permettra de trier et de calculer sans
réanalyser une chaîne de caractères.

---

## ADR-005 — Supprimer les dépendances non utilisées plutôt que les garder « au cas où »

**Contexte.** Six dépendances et cinq composants `ui/` n'étaient importés nulle part.
Le README annonçait même des tableaux « TanStack Table + dnd-kit » alors que les
tableaux sont écrits à la main.

**Décision.** Retirés : `@tanstack/react-table`, les quatre paquets `@dnd-kit/*`,
`vaul`, et `shadcn` — ce dernier étant un outil en ligne de commande, qui n'a rien à
faire dans les dépendances d'exécution. Retirés également : `breadcrumb`, `checkbox`,
`drawer`, `tabs`.

**Conséquence.** Ce que le dépôt déclare correspond à ce qu'il utilise. Réintroduire
l'un de ces composants coûte une commande (`npx shadcn add checkbox`) — argument
décisif : le coût de suppression est nul, celui du code mort est permanent.

**Conservés.** `next-themes`, requis par `ui/sonner.tsx`, et qui servira au sélecteur
clair/sombre de la phase 5.
