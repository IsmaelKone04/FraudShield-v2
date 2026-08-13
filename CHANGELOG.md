# Journal des modifications

Une section par phase de [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Phase 4 — Les différenciateurs · D2 — Boucle de rétroaction analyste → modèle

Ailleurs, une alerte écartée disparaît dans un statut « clos », et le modèle qui l'a
produite continue d'en produire de semblables. Ici, elle devient une mesure.

### Ajouté

- **La qualification obligatoire à la clôture.** Classer un dossier sans suite exige
  désormais une cause parmi cinq ; le motif rédigé reste, mais il ne s'agrège pas — c'est
  la cause qui remonte au registre. La règle est portée par le contrat, pas par l'écran :
  une décision qualifiée là où elle ne doit pas l'être est refusée tout autant qu'une
  décision qui ne l'est pas.
- **La distinction qui donne sa valeur au registre** : chaque cause dit *où* elle se
  corrige. « Seuil trop bas » et « contexte médical légitime » se règlent dans le modèle ;
  « doublon administratif », « donnée de référence erronée » et « régularisation déjà
  intervenue » se règlent ailleurs. Un taux de faux positifs qui mélange les deux
  réclamerait un réentraînement pour un problème de saisie.
- **`/qualite`**, l'écran qui juge le détecteur et non la fraude : précision, rappel
  estimé et taux de faux positifs sur six mois, la courbe par mois, le tableau par type de
  fraude avec son seuil, le registre des causes en deux blocs, et les établissements dont
  les alertes finissent le plus souvent écartées.
- **Le bandeau de dérive** : *« Le modèle décroche sur Double facturation — 32,4 % de faux
  positifs imputables au modèle sur Mai 2026, pour un seuil de 25 % (71 dossiers
  tranchés) »*, suivi de la justification du seuil. Affiché sur le tableau de bord, là où
  l'analyste arrive, et sur l'écran de qualité, où il est suivi de quoi agir.
- **La boucle, refermée à l'écran** : une décision prise dans la console entre dans la
  mesure. Classer un dossier sans suite déplace le registre et la courbe du mois ; une
  demande de pièce ne compte rien, puisqu'elle ne referme rien.
- **Trois contrôles de cohérence** dans le service : les trois issues doivent redonner le
  nombre de dossiers clos, la répartition par cause le nombre de faux positifs, et aucun
  type de fraude ne peut être mesuré sans seuil de dérive. Prouvés en les provoquant tous
  les trois — dont *« Décembre 2025, Acte incohérent : 10 faux positifs répartis par cause
  pour 9 constatés »*.
- **Le jeu de mesure** : trente-six cases (six mois × six types de fraude), écrites par
  script comme en D1.

### Modifié

- Le format du contenu enregistré dans le navigateur passe à la **version 2**, avec une
  migration. Un classement sans suite écrit avant ce changement ne porte pas de cause :
  sans reprise, la validation d'entrée aurait écarté *tout* le contenu local — statuts,
  assignations et notes compris — pour un champ manquant sur un seul dossier. La migration
  défait ces décisions-là et rien d'autre, exactement comme « Revenir sur la décision ».
- La chronologie du dossier consigne la cause avec la décision : « Décision : classée sans
  suite (doublon administratif) ».
- `lib/formats.ts` gagne `pourcentage()`, qui écrit « — » plutôt que « 0 % » quand il n'y
  a rien à mesurer.
- La barre latérale porte une entrée « Qualité du modèle ». Au passage, le champ
  `description` que chaque entrée portait sans que rien ne l'affiche sert enfin
  d'infobulle en mode replié.

### Arbitrages

| Décision | Pourquoi |
|---|---|
| Cause obligatoire, et seulement sur le classement sans suite | Un faux positif non qualifié ne compte pour rien ; une fraude confirmée « causée » serait un état impossible ([ADR-017](docs/DECISIONS.md)) |
| Le contrat ne porte que des comptages, jamais des taux | Un taux servi tout fait ne se recoupe avec rien — c'est ainsi qu'un en-tête finit par contredire le tableau qu'il surmonte ([ADR-018](docs/DECISIONS.md)) |
| Les dossiers non concluants sont hors du dénominateur | Ni réussite ni échec du modèle : les compter ferait baisser la précision à chaque dossier abandonné faute de pièces |
| Un taux absent s'écrit « — », pas « 0 % » | Un mois sans dossier tranché n'a pas une précision nulle : il n'en a pas |
| Le rappel est affiché avec sa base de sondage | On ne mesure pas les fraudes qu'on n'a pas signalées ; un rappel sans sa base ne se conteste pas |
| La dérive ne compte que les causes imputables au modèle | Réclamer un réentraînement parce qu'un établissement a transmis deux fois la même demande n'aurait aucun sens ([ADR-019](docs/DECISIONS.md)) |
| Un seuil par type de fraude, et rien sous dix dossiers tranchés | Un seuil unique ferait crier « Acte incohérent » et dormir « Usurpation identité » ; deux dossiers sur trois font 67 % et ne disent rien |
| Pas de bandeau « tout va bien » | Un bandeau permanent finit par ne plus être lu, et le jour où il vire au rouge personne ne le voit |

### Dette laissée sciemment

- La dérive est mesurée sur le dernier mois observé, pas sur une fenêtre glissante de
  trente jours : le jeu est mensuel.
- Les décisions de la console sont rattachées à mai 2026, dernier mois du jeu, plutôt qu'au
  mois réel — ouvrir un mois vide ferait plonger les courbes sans raison. L'écran le dit.
- Le bandeau du tableau de bord ne compte pas les décisions locales : il est rendu côté
  serveur.
- « Non concluant » n'existe pas comme décision : les trois issues de la console restent
  celles de la phase 3. Le jeu observé en porte, la console n'en produit pas.

### Vérifié

`typecheck` et `build` sans erreur (14 routes, `/qualite` comprise) ; `lint` inchangé à
2 erreurs préexistantes. **51 vérifications** sur le HTML réellement servi, session
ouverte, et **62 tests** sur les fonctions pures, le contrat de décision et les contrôles
du service. Non-régression des phases 2, 3 et de D1 rejouée : 17/17, 8/8, 24/24, 45/45 et
72/72.

---

## Phase 4 — Les différenciateurs · D1 — Explicabilité du score

Le premier des cinq différenciateurs, et celui au meilleur rapport valeur/effort. Le
reproche n° 1 fait aux outils du marché tient en un mot : ils affichent « 94 » et
s'arrêtent là. Un analyste ne peut alors ni défendre ce chiffre devant un établissement,
ni le contester devant son responsable.

### Ajouté

- **La décomposition du score**, sur `/alertes/[id]`. Chaque facteur porte une
  contribution **signée en points**, la valeur observée, la valeur attendue et **la source
  de la mesure** — c'est cette dernière colonne que réclame tout établissement mis en
  cause. Les barres sont à axe centré : à droite ce qui aggrave, à gauche ce qui atténue,
  à la même échelle des deux côtés.
- **La propriété qui fait toute la valeur d'une explication** : `valeurDeBase +
  Σ contributions = scoreIA`. La valeur de base est le score moyen de l'ensemble des
  demandes analysées — un point de départ commun, pas une propriété du dossier. Le format
  est celui d'une valeur SHAP, de sorte qu'un vrai modèle remplisse ce contrat sans qu'il
  bouge.
- **Un contrôle qui refuse un dossier dont les facteurs ne referment pas le score.** Une
  explication qui ne totalise pas est pire que pas d'explication : elle se présente comme
  opposable en ne l'étant pas. Prouvé en le provoquant — ramener une contribution de 34 à
  33 fait échouer le chargement sur *« Les facteurs de A-2026-0125 totalisent 93 points
  (base 18) alors que le score est de 94 »*.
- **La phrase d'explication en français**, composée depuis les trois facteurs dominants et
  au plus deux atténuants : *« Score très élevé (94/100), principalement parce que le
  montant facturé représente 2,5 fois le tarif de la nomenclature pour les mêmes actes,
  que deux IRM cardiaques ont été facturées le même jour pour le même assuré et que
  l'établissement concentre 6 dossiers signalés en douze mois, contre 0,8 pour un
  établissement comparable. En sens inverse, le contrat est actif depuis sept ans sans
  aucun litige. »* Assemblage déterministe, aucun modèle de langue.
- **Le comparatif contextuel** : le dossier face à l'établissement, à l'acte et à la
  période, chaque référence donnée avec son effectif — une moyenne sans effectif ne se
  conteste pas.
- **La note d'explication imprimable** (`/alertes/[id]/note`) : objet, décomposition
  chiffrée, actes et tarifs de référence, comparaisons, décision. Rendue en noir sur blanc
  à l'écran comme sur le papier, et portant en tête, en mode démonstration, un bandeau
  « données fictives, sans valeur probante ».
- **Le jeu de données** porte les facteurs et les comparatifs des dix alertes, écrits par
  script — une somme fausse ne se voit pas dans neuf cents lignes de JSON.

### Modifié

- L'encart du score ne renvoie plus la décomposition à « la phase 4 » : il annonce le
  nombre de facteurs et les donne juste dessous.
- `francs()` et `formaterHorodatage()` quittent l'écran du dossier pour `lib/formats.ts`,
  rejointes par `separerMilliers()`, `signe()`, `ecartRelatif()` et `valeurAvecUnite()`.
  Trois écrans en avaient besoin ; une troisième copie aurait fini par séparer les
  milliers autrement que les deux premières.
- `globals.css` porte une règle `@media print` et un `@page`. C'est tout ce qu'il a fallu
  côté impression.

### Arbitrages

| Décision | Pourquoi |
|---|---|
| Pas de champ `sens` à côté de `contribution`, contrairement au plan | Le signe le porte déjà ; un « aggravant » à contribution négative serait un état impossible que rien n'empêcherait d'écrire ([ADR-014](docs/DECISIONS.md)) |
| Aucun modèle de langue pour la phrase | Une phrase reformulée à chaque affichage rendrait deux impressions du même dossier différentes — il n'y aurait plus rien à opposer ([ADR-015](docs/DECISIONS.md)) |
| Aucune bibliothèque de PDF | Le navigateur pagine mieux, embarque les polices et rend le texte sélectionnable ; 500 ko pour faire moins bien ([ADR-016](docs/DECISIONS.md)) |
| Aucune bibliothèque de graphiques pour les barres | Cinq barres divergentes, deux `div` et une largeur en pourcentage. Recharts, déjà présent, n'a pas de barre divergente à axe centré |
| Les atténuants sont affichés et dits dans la phrase | Les taire produirait un réquisitoire, pas une explication |

### Dette laissée sciemment

- Les `enonce` sont écrits dans le jeu de données plutôt que composés depuis les valeurs.
- Le score n'est pas recalculé depuis ses facteurs : la décomposition l'explique, elle ne
  le produit pas. Ce sera l'affaire de D4.
- Toujours aucune capture d'écran — le projet n'embarque pas d'outil de navigateur
  ([ADR-005](docs/DECISIONS.md)), et les captures sont prévues en P5-8.

### Vérifié

`typecheck` et `build` sans erreur (13 routes, `/alertes/[id]/note` comprise) ; `lint`
inchangé à 2 erreurs préexistantes. **45 assertions** sur le HTML réellement servi, session
ouverte, et **72 tests** sur les fonctions pures et le contrat du service — dont les dix
dossiers passés au contrôle de cohérence. Non-régression des phases 2 et 3 rejouée :
17/17, 8/8 et 24/24.

---

## Phase 3 — Le détail d'alerte · jalon M3

L'écran qui manquait au produit. L'analyste cliquait sur une alerte à 94 et il ne se
passait rien : la console savait dire *qu'il y a un problème*, jamais *lequel*. C'est
aussi le socle de la phase 4 — l'explicabilité, la décision et la piste d'audit vivent
sur cet écran.

### Ajouté

- **La route `/alertes/[id]`**, atteignable depuis la liste comme depuis le tableau de
  bord. L'identifiant ouvre le dossier, et un chevron en fin de ligne offre une cible
  plus large ; la ligne entière n'est **pas** cliquable, elle porte deux listes
  déroulantes et un clic sur « Résolu » ne doit pas changer d'écran.
- **Les actes facturés.** Le jeu de données s'arrêtait à la ligne d'alerte ; il porte
  désormais, pour chacune des dix alertes, le détail des actes avec code de nomenclature,
  quantité, montant facturé, **tarif de référence** et le signal relevé par le moteur sur
  cette ligne précise. Sans le tarif de référence, « 180 000 FCFA » ne veut rien dire.
  Les lignes sans reproche sont marquées comme telles : toutes les lignes d'un dossier
  signalé ne sont pas fautives.
- **La chronologie du dossier**, qui mêle les événements du serveur et ce qui vient
  d'être fait dans la console — ces derniers portant un badge « non transmis », parce
  qu'un journal d'événements est le pire endroit où laisser croire le contraire.
- **La barre de décision** : fraude confirmée, classée sans suite, pièce demandée. Motif
  **obligatoire**, auteur et horodatage enregistrés, et c'est la décision qui fixe le
  statut — pas l'inverse (ADR-012). « Revenir sur la décision » rend au dossier le
  statut qu'il avait avant, mémorisé au moment de décider plutôt que deviné après coup.
- **Le fil de notes internes**, horodaté et signé. Une note ne se supprime que par son
  auteur.
- **`src/components/score-ia.tsx`** — les seuils de couleur du score étaient écrits à
  l'identique dans deux tableaux ; le dossier en aurait fait une troisième copie.
- **`src/components/ui/textarea.tsx`** — Base UI n'expose pas de primitive équivalente.
- **ADR-011 à ADR-013.**

### Corrigé

- **`getAlerte()` n'était appelée par personne** depuis la phase 1. Elle rend désormais
  le dossier complet et sert la nouvelle route.
- **`toLocaleString` retiré des montants calculés** : il sépare les milliers par une
  espace insécable étroite dont la présence dépend de la version d'ICU, donc du serveur
  et du navigateur — le rendu aurait différé entre les deux, et les montants déjà mis en
  forme dans le jeu de données emploient une espace ordinaire. Même raison pour les
  horodatages, découpés depuis l'ISO plutôt que convertis.

### Vérifications

`npm run typecheck` ✅ · `npm run build` ✅ (12 routes) · `npm run lint` **2 erreurs, 0
avertissement** (inchangé).

**24 assertions sur le HTML servi** avec connexion réelle (le dossier, la navigation
depuis les deux écrans, l'identifiant inconnu, l'accès sans session) et **19 tests** sur
ce qui n'existe que côté client : décision, annulation, notes, contrat du stockage,
assemblage et cohérence du dossier.

> Le contrôle de cohérence a été **prouvé en le cassant** : ramener un acte de 520 000 à
> 519 000 FCFA fait échouer le chargement du dossier avec les deux totaux en regard, au
> lieu d'afficher une somme qui contredit l'en-tête.

### Dette laissée sciemment

- **404 souple** sur un identifiant inconnu : la bonne page s'affiche, le statut reste
  200. Cause mesurée et arbitrage assumé en [ADR-013](docs/DECISIONS.md).
- **« Classée sans suite » n'est pas encore qualifiée par cause** — c'est P4-6, et c'est
  de cette qualification que vivra le registre des faux positifs.
- **Le bouton « Ajouter une note » des investigations reste désactivé** : le contrat d'un
  dossier d'investigation ne porte toujours pas de journal de notes. Les notes ajoutées
  en phase 3 sont celles des alertes.
- **Aucune capture d'écran** : le projet n'embarque aucun outil de navigateur, et en
  ajouter un pour illustrer la documentation ne se justifiait pas (ADR-005).

---

## Phase 2 — Rendre la console vivante · jalon M2

L'audit avait compté **onze boutons sans action**. La phase 0 avait dû retirer du README
la promesse « changer le statut d'une alerte » ; cette phase la rétablit pour de bon, et
tranche chaque commande restante : elle agit, elle disparaît, ou elle dit pourquoi elle
n'agit pas.

### Ajouté

- **`src/lib/store/`** — store Zustand des modifications. Il ne mémorise que les **écarts**
  par identifiant, jamais une copie des données du serveur ; la fusion se fait au rendu
  (ADR-006). En mode démonstration il persiste dans `localStorage`, relu au montage côté
  client pour ne pas casser l'hydratation ; en mode API il appelle
  `src/lib/api/mutations.ts` et **annule l'écart si l'appel échoue**.
- **Changement de statut des alertes** (En cours / À vérifier / Résolu) depuis la liste,
  avec toast de confirmation et cartes de KPI qui suivent le changement.
- **Assignation** des alertes **et** des dossiers d'investigation aux comptes de la
  console, plus un filtre **« Mes dossiers »** alimenté par l'adresse de la session.
- **Clôture et réouverture d'un dossier** d'investigation.
- **Export CSV réel** (`src/lib/csv.ts`, `src/lib/exports.ts`) pour les alertes et les
  dossiers, produit par le navigateur sans backend (ADR-007). Les colonnes sont définies
  une seule fois : montants en numérique et dates en JJ/MM/AAAA pour qu'un tableur les
  reconnaisse, et une colonne « Modifié localement » qui distingue les lignes changées
  dans ce navigateur de celles reçues du serveur.
- **Le seuil de déclenchement agit enfin.** Réglé dans les Paramètres, il atténue dans la
  liste les alertes passées sous son niveau, les marque « < seuil » et permet de les
  masquer — six sur dix avec le jeu de démonstration et le seuil d'origine de 75 %.
- **`src/lib/utilisateurs.ts`** — annuaire unique des comptes, partagé par
  l'authentification, l'assignation et l'affichage.
- **`src/lib/stats-statuts.ts`** — recalcul des cartes de KPI **par écart** : les cartes
  décrivent une population bien plus large que la liste visible (1 245 alertes pour 10
  lignes), un changement de statut y applique donc ±1 au lieu de recompter faussement.
- **ADR-006 à ADR-010** dans [`docs/DECISIONS.md`](docs/DECISIONS.md).
- **Une dépendance** : `zustand` 5.0.14. Ajout arbitré au regard d'ADR-005 — le besoin
  (état partagé entre écrans, persistance versionnée, hydratation différée) dépassait ce
  qu'un contexte React aurait porté proprement.

### Corrigé

- **Trois annuaires de personnes coexistaient** : les comptes réels de `src/auth.ts`, six
  agents fictifs en `@fraudshield.sn` dans `parametres/data.json`, et des noms libres
  (« Agent Sall », « Agent Diop ») dans `investigations/data.json`. Un dossier ne pouvait
  donc être réassigné à personne — son titulaire n'existait nulle part ailleurs. Il n'en
  reste qu'un ; le champ `assigne` est contraint à une adresse ; et un contrôle de
  cohérence **fait échouer le build** si le jeu local s'en écarte à nouveau (ADR-010).
  Zod ne pouvait rien y voir : les listes étaient valides, seulement contradictoires.
- **`handleSave` affichait « Enregistré ! » pendant 2,5 s sans rien écrire** — au
  rechargement, tout était revenu (ADR-008).
- **Trois lignes de l'onglet Sécurité affichaient des valeurs inventées** : une URL d'API
  modifiable alors qu'elle est lue au démarrage dans l'environnement, un interrupteur de
  mode mock toujours à « oui », et un jeton de vingt-quatre points pour une session qui
  tient dans un cookie `httpOnly` — précisément illisible depuis le navigateur. Les trois
  décrivent désormais l'état réel.
- **Le rôle s'affichait en code** sur le tableau de bord : « ADMINISTRATEUR » au lieu
  d'« Administrateur ». Le code reste celui que compare `proxy.ts`.
- **Le dernier `<button>` brut** (`dashboard/page.tsx`) passe sur le composant `Button` :
  il n'avait aucune action, forçait son texte en noir quel que soit le thème, et son
  libellé — « Réassigner les dossiers suspects » — annonçait un traitement par lot que la
  console ne sait pas faire. C'est un lien vers `/investigations`, où la réassignation a
  lieu dossier par dossier.

### Arbitrage des onze commandes (ADR-009)

| Devenues réelles | Retirées | Désactivées, avec motif en infobulle |
|---|---|---|
| Changer le statut · Assigner · Exporter · Clôturer / Rouvrir · Enregistrer les paramètres · Nouveau rapport · Réassigner un dossier | Ouvrir le dossier — doublon du clic sur la carte, sans écran de destination | Télécharger (18 fiches) · Ajouter une note · Nouvelle investigation · Inviter · Éditer · Regénérer · cinq interrupteurs hors contrat |

« Aperçu » est **renommé « Détails »** : il n'ouvrait aucun document et n'en existe aucun ;
il déplie ce que la console sait réellement de la fiche.

### Supprimé

- Les six utilisateurs fictifs de `parametres/data.json`, dont quatre n'existaient pas.
- Le bouton « Ouvrir le dossier ».

### Vérifications

`npm run typecheck` ✅ · `npm run build` ✅ (11 routes) · `npm run lint` **2 erreurs, 0
avertissement** (inchangé — les deux `set-state-in-effect` planifiées en phase 5).

Vérifié sur le serveur de développement, connexion réelle à l'appui : **25 assertions sur
le HTML servi** (`/investigations`, `/rapports`, `/parametres`, `/dashboard` vu par un
superviseur puis par un analyste) et **13 tests** sur le recalcul des cartes de KPI.

> Le contrôle de cohérence de l'annuaire a été **prouvé en le cassant** : une adresse
> remise en `@fraudshield.sn` fait échouer `npm run build` avec les deux listes en regard,
> au lieu de laisser la divergence s'installer en silence.

### Dette laissée sciemment

- **Les sections des Paramètres ne sont pas adressables** : `activeSection` est un état
  client, donc seule « Général » est rendue côté serveur. Les autres commandes de l'écran
  sont couvertes par le typecheck et la relecture, pas par le rendu vérifié. Rendre les
  sections adressables corrigerait les deux à la fois → phase 5.
- **Les dossiers n'exposent que l'axe ouvert / clôturé**, pas le sélecteur à trois états
  des alertes → phase 3.
- **Le rôle ne conditionne toujours pas l'assignation** : le raccourci du tableau de bord
  est réservé aux rôles d'encadrement, mais le sélecteur, lui, n'est gardé par rien.
  Décider qui a le droit de réassigner est une règle métier → phase 4.

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
