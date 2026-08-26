# FraudShield v2 — plan de reprise et feuille de route

> Document de pilotage. Il tient lieu de backlog : on coche, on ne réécrit pas l'histoire.
> Rédigé après l'audit du 11/08/2026. Aucune ligne de code applicatif modifiée à ce stade.

---

## 1. Méthode de gestion retenue

**Kanban à incréments verticaux, WIP = 1, jalons démontrables.**

Pourquoi pas Scrum : il n'y a ni équipe, ni sprint planning, ni vélocité à mesurer. Les
cérémonies de Scrum coûteraient plus qu'elles ne rapportent sur un projet solo. Pourquoi
pas « au fil de l'eau » non plus : l'audit a montré exactement ce que produit l'absence de
cadre — une application qui compile, qui passe `tsc`, et qui ne peut pas être ouverte.

Les trois règles, et elles ne se négocient pas :

1. **Une seule tâche en cours à la fois.** Ce qui est commencé se termine avant qu'autre
   chose ne démarre.
2. **Incrément vertical.** Chaque tâche livre quelque chose de visible à l'écran, pas une
   couche technique invisible. Pas de « je refais le service, on branchera l'UI plus tard ».
3. **Definition of Done unique**, identique pour toute tâche :

   | | |
   |---|---|
   | ✅ | `npx tsc --noEmit` sans erreur |
   | ✅ | `npm run build` passe |
   | ✅ | Le comportement a été **ouvert dans le navigateur** et vérifié à la main |
   | ✅ | Aucun bouton ajouté sans action réelle derrière |
   | ✅ | La documentation touchée par la tâche est à jour **dans le même commit** |

La règle 4 est directement issue de l'audit : onze boutons morts sont onze promesses non
tenues faites à quelqu'un qui regarde la démo.

### Documentation : quand, et quoi

À la fin de **chaque phase**, pas à la fin du projet :

- `README.md` — mis au réel. Il contient aujourd'hui quatre affirmations fausses (§3, P0-5).
- `docs/ROADMAP.md` — ce fichier : phase cochée, écarts constatés.
- `docs/DECISIONS.md` — une entrée par arbitrage structurant, format ADR court
  (contexte / décision / conséquence). À créer en P1.
- `CHANGELOG.md` — une section par phase, à créer en P0.

### Jalons

| Jalon | Contenu | Ce qu'on peut montrer |
|---|---|---|
| **M1** | P0 | L'application s'ouvre, on se connecte, on navigue. |
| **M2** | P1 + P2 | Une console cohérente où les actions produisent un effet. |
| **M3** | P3 | Le détail d'alerte : l'écran qui manque au produit. |
| **M4** | P4 | Les quatre différenciateurs. C'est le jalon « concours / entretien ». |
| **M5** | P5 | Finition : accessibilité, tests, captures, dépôt publiable. |

---

## 2. Vision produit et différenciation

### Ce que fait le marché

Les outils de détection de fraude à l'assurance santé (SAS, Shift Technology, FRISS,
et les briques maison des mutuelles) convergent tous vers le même geste : ingérer les
sinistres, sortir un **score**, empiler une **file d'alertes** triée par score décroissant.
L'analyste reçoit « ce dossier est à 94 » et se débrouille.

### Ce qui manque, partout

Trois manques structurels, constatés dans la littérature métier et dans les retours
d'analystes :

1. **Le score n'est pas explicable.** L'analyste ne sait pas *pourquoi* 94. Il ne peut donc
   ni le contester, ni le justifier devant l'établissement de santé mis en cause, ni le
   défendre en cas de contentieux. C'est aussi ce que l'AI Act européen exige désormais
   pour les systèmes de notation à conséquence individuelle.
2. **La boucle ne se referme jamais.** L'analyste classe un dossier en faux positif ; cette
   information ne remonte nulle part de visible. Le modèle se dégrade sans que personne ne
   le voie, et l'analyste finit par ignorer une file dont il ne croit plus les scores.
3. **Le scoring est individuel, la fraude est collective.** Un praticien seul qui surfacture
   de 8 % passe sous tous les seuils. Trois cliniques qui s'échangent les mêmes assurés,
   aussi. La fraude organisée se voit dans les **liens**, pas dans les lignes.

### Notre parti pris : mettre l'analyste au centre, pas le modèle

Quatre fonctionnalités portent cette différence. Elles sont détaillées en phase 4.

| | Différenciateur | Ce qu'il répond |
|---|---|---|
| **D1** | **Explicabilité du score** — décomposition facteur par facteur, en français, avec le poids de chacun | manque n°1 |
| **D2** | **Boucle de rétroaction** — registre des faux positifs, précision du modèle suivie dans le temps | manque n°2 |
| **D3** | **Graphe de réseaux** — assurés ↔ établissements ↔ praticiens, détection de collusion | manque n°3 |
| **D4** | **Simulateur de seuils** — « si je descends à 70, j'attrape +X alertes et +Y faux positifs » | manque n°2 (volet pilotage) |

Et une cinquième, non différenciante mais non négociable en assurance :

| **D5** | **Piste d'audit** — qui a décidé quoi, quand, sur quel fondement | exigence de conformité |

> ⚠️ **Honnêteté du démonstrateur.** Les données restent fictives et le modèle de scoring
> appartient au coéquipier. Ces quatre fonctionnalités démontrent une **capacité de
> l'interface**, pas une performance de détection. Chacune doit donc être construite
> derrière `dashboard.service.ts`, alimentable par l'API réelle sans retoucher un
> composant — et le README doit le dire sans ambiguïté.

---

## 3. Backlog

Estimations en demi-journées de travail effectif. `[B]` = bloquant.

### Phase 0 — Remettre l'application en marche · **M1** ✅ terminée

L'application était inatteignable : `/dashboard` redirigeait vers `/login`, et `/login`
ne pouvait aboutir puisque toutes les routes `/api/auth/*` répondaient 404.

| # | Tâche | Fichiers | Est. | |
|---|---|---|---|---|
| **P0-1** `[B]` | Créer le gestionnaire NextAuth manquant : `export const { GET, POST } = handlers`. Cause unique du blocage. Les 3 comptes de démo vérifiés à la main ensuite. | `src/app/api/auth/[...nextauth]/route.ts` | 0,25 | ✅ |
| **P0-2** | Remplacer la page d'accueil Create Next App : redirection vers `/dashboard` si session, vers `/login` sinon. | `src/app/page.tsx` | 0,25 | ✅ |
| **P0-3** | Métadonnées : titre, description, `robots: noindex`. Inter **retirée** plutôt qu'appliquée — Geist est déjà la police du design system, charger la seconde était du poids mort. | `src/app/layout.tsx` | 0,25 | ✅ |
| **P0-4** | Supprimer `public/next.svg` et `public/vercel.svg`. Réparer `npm run lint` : ESLint 9 en configuration plate, sans `FlatCompat` (qui échoue sur les presets `next/*` en v16, déjà plats nativement). Ajout de `npm run typecheck`, `@types/react` aligné sur React 19. | `public/`, `package.json`, `eslint.config.mjs` | 0,25 | ✅ |
| **P0-6** | **Hors plan initial — trou de sécurité.** Le `matcher` de `proxy.ts` ne couvrait que `/dashboard` : cinq écrans (`/alertes`, `/investigations`, `/analyses`, `/rapports`, `/parametres`) s'ouvraient sans session. Règle *fail-closed* : tout exige une session sauf `/login`. | `src/proxy.ts` | 0,25 | ✅ |
| **P0-5** | **Documentation M1** : corriger les 4 affirmations fausses du README (service unique, TanStack/dnd-kit, changement de statut, `/dashboard/admin`), créer `CHANGELOG.md`. | `README.md`, `CHANGELOG.md` | 0,5 | ✅ |

**Total ≈ 1,75 j.** Détail des changements dans [`../CHANGELOG.md`](../CHANGELOG.md).

**Dette reportée** : 15 erreurs ESLint (13 `no-explicit-any` → P1-4 ; 2
`set-state-in-effect` → P5), et les vulnérabilités remontées par `npm audit` → P1-11.
*Les deux `set-state-in-effect` sont tombés en P5-6 : tous deux servaient à
réagir à la largeur de l'écran.*

---

### Phase 1 — Assainir les fondations · M2 ✅ terminée

Objectif : que l'argument central du README — « deux variables d'environnement suffisent,
aucun composant à modifier » — devienne vrai. Il était faux : un seul composant sur dix
passait par le service, et quatre méthodes sur cinq n'étaient jamais appelées.

| # | Tâche | Fichiers | Est. | |
|---|---|---|---|---|
| **P1-1** | Étendre le service aux 6 domaines (dashboard, alertes, investigations, analyses, rapports, paramètres) : une méthode par écran, chacune avec sa bascule mock/API. | `src/lib/services/` | 1 | ✅ |
| **P1-2** | Faire passer **toutes** les pages par le service. Plus aucun `import data from "./data.json"` dans un composant. | `src/app/*/page.tsx` | 1 | ✅ |
| **P1-3** | Dédupliquer les 6 alertes présentes à la fois dans `dashboard/data.json` et `alertes/data.json` → source unique. | `src/app/*/data.json` | 0,5 | ✅ |
| **P1-4** | Typer les 5 domaines manquants avec Zod, et **valider la réponse API au runtime**. Zod est déjà installé et inutilisé : c'est le filet qui évite qu'une API réelle mal formée fasse écran blanc. | `src/lib/types/`, `src/lib/schemas/` | 1 | ✅ |
| **P1-5** | Corriger `colorMap[kpi.id]` : valeur de repli au lieu d'un plantage sur identifiant inconnu — précisément le scénario du branchement API. | `src/components/section-cards.tsx` | 0,25 | ✅ |
| **P1-6** | `DataTable` ignore sa prop `data` (`{ data: _unused }`) et réimporte le JSON. Rendre le composant réellement piloté par ses props. | `src/components/data-table.tsx` | 0,25 | ✅ |
| **P1-7** | Ajouter `error.tsx`, `loading.tsx`, `not-found.tsx` (racine + par section). Aujourd'hui la moindre erreur de `fetch` rend une 500 brute. | `src/app/**` | 0,5 | ✅ |
| **P1-8** | Monter `<Toaster />` dans le layout — le composant existe, n'est jamais monté, donc aucun toast ne peut s'afficher. | `src/app/layout.tsx` | 0,25 | ✅ |
| **P1-9** | Ménage : retirer les 6 dépendances inutilisées (`@tanstack/react-table`, 4× `@dnd-kit/*`, `shadcn` en dépendance d'exécution) et les 5 composants `ui/` jamais importés. **Ou** les utiliser — décider, puis noter la décision. | `package.json`, `src/components/ui/` | 0,5 | ✅ |
| **P1-11** | Trier les vulnérabilités remontées par `npm audit` (2 critiques, 8 hautes au 11/08). Distinguer ce qui est exploitable en production de ce qui ne concerne que l'outillage de développement, puis corriger ou documenter. À faire **avant** d'ajouter la moindre dépendance. | `package.json` | 0,5 | ✅ |
| **P1-10** | **Documentation** : `docs/DECISIONS.md` (ADR-001 architecture de service, ADR-002 validation Zod au runtime, ADR-003 contrôle d'accès fail-closed), README section « bascule » réécrite pour dire vrai. | `docs/`, `README.md` | 0,5 | ✅ |

**Total ≈ 6,25 j.** Détail dans [`../CHANGELOG.md`](../CHANGELOG.md), arbitrages dans [`DECISIONS.md`](DECISIONS.md).

---

### Phase 2 — Rendre la console vivante · **M2** ✅ terminée

Les onze boutons morts. Règle : soit on câble, soit on retire. Rien ne reste décoratif.

| # | Tâche | Est. | |
|---|---|---|---|
| **P2-1** | Store client (Zustand ou `useReducer` + contexte) portant l'état mutable des alertes et investigations. Persistance `localStorage` en mode mock, appels API en mode réel. Fin des « écritures non persistées ». | 1 | ✅ |
| **P2-2** | **Changer le statut d'une alerte** (En cours / À vérifier / Résolu) depuis la liste, avec toast de confirmation. Le README l'annonce déjà : autant que ce soit vrai. | 0,5 | ✅ |
| **P2-3** | **Assigner une alerte** à un analyste. Filtre « mes dossiers ». Les rôles existent dans le JWT et ne servent à rien pour l'instant. | 0,5 | ✅ |
| **P2-4** | **Export CSV réel** pour les boutons « Exporter » / « Télécharger » (alertes, rapports) : génération côté client, aucun backend requis. | 0,5 | ✅ |
| **P2-5** | **Paramètres qui persistent.** `handleSave` affiche « Enregistré ! » pendant 2,5 s et n'écrit rien. Persister, recharger à l'ouverture, et que les seuils pilotent réellement l'affichage du risque. | 1 | ✅ |
| **P2-6** | Arbitrer les boutons restants (Aperçu, Nouvelle investigation, Ouvrir le dossier, Ajouter une note, Clôturer, Réassigner) : câbler ou supprimer. Aucun ne survit en l'état. | 1 | ✅ |
| **P2-7** | Remplacer le `<button>` brut de `dashboard/page.tsx` par le composant `Button` du design system. | 0,25 | ✅ |
| **P2-8** | **Documentation M2** : README « ce qui est réellement interactif », CHANGELOG, ROADMAP coché. | 0,5 | ✅ |

**Total ≈ 5,25 j.** Détail dans [`../CHANGELOG.md`](../CHANGELOG.md), arbitrages dans
[`DECISIONS.md`](DECISIONS.md) (ADR-006 à ADR-010).

#### Écarts constatés

Trois choses n'étaient pas au plan et ont dû être traitées :

- **Un troisième annuaire de personnes.** Le plan supposait deux listes de comptes ; il y
  en avait trois, dont une en noms libres dans `investigations/data.json`. C'est ce qui
  rendait un dossier non réassignable. Traité en P2-6, avec un contrôle de cohérence qui
  fait échouer le build (ADR-010).
- **P2-7 n'était pas qu'un problème de style.** Le `<button>` brut n'avait aucune action
  et son libellé annonçait un traitement par lot inexistant : c'était aussi un cas P2-6.
- **Une dépendance ajoutée** (`zustand`), ce qu'ADR-005 impose de justifier. Fait.

#### Dette reportée

| Constat | Vers |
|---|---|
| Les sections des Paramètres ne sont pas adressables : seule « Général » est rendue côté serveur, donc les autres commandes ne sont pas vérifiables sur le HTML servi. | P5 |
| Les dossiers n'exposent que l'axe ouvert / clôturé, pas le sélecteur à trois états des alertes. | P3 |
| Le rôle ne conditionne pas l'assignation : le raccourci du tableau de bord est réservé à l'encadrement, le sélecteur ne l'est pas. Règle métier à trancher. | P4 (avec D5) |
| « Ajouter une note » attend son écran de destination. | P3-5 |

---

### Phase 3 — Le détail d'alerte · **M3** ✅ terminée

L'écran qui manque. Aujourd'hui les lignes portent un `cursor-pointer` qui ne mène nulle
part : l'utilisateur clique sur une alerte à 94 et il ne se passe rien. C'est le socle de
toute la phase 4 — l'explicabilité, la décision et la piste d'audit vivent ici.

| # | Tâche | Est. | |
|---|---|---|---|
| **P3-1** | Route `/alertes/[id]` + navigation depuis la liste (et depuis le dashboard). | 0,5 | ✅ |
| **P3-2** | En-tête : assuré, établissement, montant, type, score, statut, chronologie du dossier. | 0,5 | ✅ |
| **P3-3** | Historique des actes du dossier (le jeu de données fictif doit être enrichi en conséquence — la structure actuelle s'arrête à la ligne d'alerte). | 0,5 | ✅ |
| **P3-4** | Barre de décision : confirmer la fraude / classer sans suite / demander une pièce. C'est le point d'entrée de D2 et D5. | 0,5 | ✅ |
| **P3-5** | Fil de commentaires internes (le bouton « Ajouter une note » de P2-6 aboutit ici). | 0,5 | ✅ |
| **P3-6** | **Documentation M3** : README + capture de l'écran. | 0,25 | ✅ * |

**Total ≈ 2,75 j.** Détail dans [`../CHANGELOG.md`](../CHANGELOG.md), arbitrages dans
[`DECISIONS.md`](DECISIONS.md) (ADR-011 à ADR-013).

\* Sans capture d'écran : le projet n'embarque aucun outil de navigateur et en ajouter un
pour illustrer la documentation ne se justifiait pas (ADR-005). À reprendre en P5-8, où
les captures sont déjà prévues.

#### Écarts constatés

- **Le motif de décision n'était pas au plan**, la tâche P3-4 ne parlant que des trois
  boutons. Une décision sans motif n'étant opposable à personne, il est devenu
  obligatoire — et c'est la décision qui fixe le statut, pas une liste déroulante à côté
  (ADR-012).
- **Le contrôle de cohérence des actes** s'est imposé une fois le jeu de données enrichi :
  dix dossiers écrits à la main, dix occasions qu'un total contredise son en-tête.
- **P3-5 ne s'applique qu'aux alertes.** Le bouton « Ajouter une note » visé par le plan
  est sur les investigations, dont le contrat ne porte pas de journal de notes ; il reste
  donc désactivé, avec son motif.

#### Dette reportée

| Constat | Vers |
|---|---|
| 404 souple sur un identifiant inconnu : bonne page, statut 200. Cause mesurée (ADR-013). | P5, si un robot ou un test de bout en bout l'exige |
| ~~« Classée sans suite » n'est pas qualifiée par cause.~~ Réglé en D2. | ~~P4-6~~ ✅ |
| ~~Le score n'est pas décomposé — les signaux par acte en tiennent lieu.~~ Réglé en D1. | ~~P4-1 à P4-4~~ ✅ |
| Captures d'écran de la documentation. | P5-8 |

---

### Phase 4 — Les différenciateurs · **M4**

Le cœur de la valeur. Rien ici n'est cosmétique.

#### D1 — Explicabilité du score ✅ terminé

> *Ailleurs* : « Score 94 ». *Ici* : pourquoi 94, et qu'est-ce qui ferait bouger ce chiffre.

| # | Tâche | Est. | |
|---|---|---|---|
| **P4-1** | Modèle de données `FacteurDeRisque { libelle, contribution, sens, valeurObservee, valeurAttendue, source }`. Compatible d'emblée avec des valeurs SHAP renvoyées par la vraie API. | 0,5 | ✅ * |
| **P4-2** | Composant « décomposition du score » : barres de contribution signées (ce qui aggrave en rouge, ce qui atténue en vert), triées par poids. | 1 | ✅ |
| **P4-3** | **Phrase d'explication en français** générée depuis les 3 facteurs dominants : « Score élevé principalement parce que le montant dépasse de 340 % la moyenne de l'établissement pour cet acte, et que 4 actes identiques ont été facturés le même jour. » C'est ce qui rend le dossier opposable à l'établissement. | 0,5 | ✅ |
| **P4-4** | Comparatif contextuel : positionnement du dossier face à la moyenne de l'établissement, de l'acte, de la période. | 0,5 | ✅ |
| **P4-5** | **Export de la note d'explication en PDF** — la pièce qu'un gestionnaire joint au dossier de contestation. Aucun concurrent grand public ne la produit prête à l'emploi. | 1 | ✅ |

**Total D1 ≈ 3,5 j.** Arbitrages en [`DECISIONS.md`](DECISIONS.md), ADR-014 à ADR-016.

\* **Sans le champ `sens`.** Le signe de `contribution` le porte déjà ; deux représentations
du même fait finissent par se contredire. Ajoutés en revanche : `code` (identifiant stable
du facteur, d'un dossier à l'autre) et `enonce` (la proposition française dont P4-3 compose
la phrase).

#### Écarts constatés — D1

- **La décomposition est additive et vérifiée.** Le plan ne demandait qu'un modèle de
  données ; il manquait la propriété qui en fait une explication —
  `valeurDeBase + Σ contributions = scoreIA`. Le service refuse désormais un dossier où
  elle est fausse (ADR-014), contrôle prouvé en le provoquant.
- **Le jeu de données a été écrit par script**, pas à la main. La parade prévue au registre
  des risques pour P4-10 s'est imposée dès P4-1 : dix décompositions, une somme fausse
  invisible dans 900 lignes de JSON.
- **P4-5 rend une page imprimable, pas un fichier PDF fabriqué.** Le navigateur produit le
  PDF ; aucune bibliothèque n'est embarquée (ADR-016).
- **Trois fonctions de mise en forme ont été extraites** dans `lib/formats.ts` — l'écran du
  dossier, la décomposition et la note en avaient besoin, et une troisième copie aurait
  fini par séparer les milliers autrement que les deux premières.

#### Dette reportée — D1

| Constat | Vers |
|---|---|
| Les `enonce` sont écrits dans le jeu de données, pas composés depuis les valeurs. | API réelle, ou table de gabarits par `code` de facteur |
| Le score reste celui du jeu de données : rien ne le recalcule à partir des facteurs. | D4, où le rejeu à seuil variable en aura besoin |
| Pas de capture d'écran (toujours aucun outil de navigateur). | P5-8 |

#### D2 — Boucle de rétroaction analyste → modèle ✅ terminé

> *Ailleurs* : le faux positif disparaît dans un statut. *Ici* : il devient une mesure.

| # | Tâche | Est. | |
|---|---|---|---|
| **P4-6** | À la clôture, motif obligatoire et typé : fraude confirmée / faux positif (avec cause : seuil trop bas, contexte médical légitime, doublon administratif…) / non concluant. | 0,5 | ✅ * |
| **P4-7** | **Registre des faux positifs** : écran dédié, motifs agrégés, établissements les plus générateurs de bruit. | 1 | ✅ |
| **P4-8** | **Qualité du modèle dans le temps** : précision, rappel estimé, taux de faux positifs par mois et par type de fraude. Recharts est déjà là. | 1 | ✅ |
| **P4-9** | Alerte de dérive : bandeau quand le taux de faux positifs d'un type de fraude dépasse son seuil sur 30 jours — « le modèle décroche sur *Double facturation* ». | 0,5 | ✅ |

**Total D2 ≈ 3 j.** Arbitrages en [`DECISIONS.md`](DECISIONS.md), ADR-017 à ADR-019.

\* **« Non concluant » n'est pas une décision de la console.** Les trois issues de la barre
de décision restent celles de P3-4 : fraude confirmée, classement sans suite, demande de
pièce. La cause typée qualifie le seul classement sans suite — c'est lui, et lui seul, qui
nourrit le registre. Le jeu observé porte bien des dossiers refermés sans conclusion, mais
la console ne sait pas en produire : ils viennent d'ailleurs, et le dire vaut mieux que
d'ajouter un quatrième bouton qui ne mène nulle part.

#### Écarts constatés — D2

- **Les causes sont séparées selon *où* elles se corrigent.** Le plan ne demandait qu'une
  liste de causes. Sans le champ `imputableAuModele`, le taux de faux positifs mélangerait
  « le seuil est trop bas » et « l'établissement a transmis deux fois la même demande » —
  un chiffre qu'on ne saurait corriger nulle part. Toute la mesure de D2 en dépend, et
  l'alerte de dérive ne compte que la première famille (ADR-017, ADR-019).
- **La boucle se referme à l'écran.** Une décision prise dans la console déplace le
  registre et la courbe du mois. Le plan décrivait deux écrans ; sans ce lien, la
  qualification exigée à la clôture n'irait nulle part.
- **Trois contrôles de cohérence** ajoutés au service, sur le modèle des ADR-010/011/014 :
  les trois issues doivent redonner le nombre de dossiers clos, la répartition par cause
  le nombre de faux positifs, et aucun type de fraude ne peut être mesuré sans seuil de
  dérive. Prouvés en les provoquant tous les trois.
- **Le format de stockage local passe à la version 2**, avec une migration. Exiger une
  cause invalidait les classements sans suite déjà enregistrés dans le navigateur : sans
  reprise, la validation d'entrée aurait écarté *tout* le contenu local pour un champ
  manquant sur un dossier (ADR-017).
- **Le jeu de données a été écrit par script**, comme en D1 : trente-six cases dont trois
  sommes doivent tomber juste.
- **`description` de la barre latérale n'était affichée nulle part.** Elle sert désormais
  d'infobulle en mode replié, plutôt que de rester un champ mort que chaque nouvelle entrée
  recopierait.

#### Dette reportée — D2

| Constat | Vers |
|---|---|
| La dérive est mesurée sur le dernier mois observé, pas sur une fenêtre glissante de 30 jours : le jeu est mensuel. | Dates de clôture réelles ; la fonction prendrait la fenêtre en paramètre |
| Le tableau de bord affiche la dérive du seul jeu serveur : les décisions locales n'y sont pas comptées (il est rendu côté serveur). | P5, si le tableau de bord passe côté client pour d'autres raisons |
| Les décisions de la console sont rattachées à mai 2026, dernier mois du jeu, et non au mois réel. | Jeu de données glissant, ou API réelle |

#### D3 — Graphe de réseaux de fraude ✅ terminé

> *Ailleurs* : une ligne = un sinistre. *Ici* : trois cliniques qui s'échangent les mêmes assurés.

| # | Tâche | Est. | |
|---|---|---|---|
| **P4-10** | Modèle nœuds / arêtes (assuré, établissement, praticien, sinistre) et jeu de données fictif cohérent avec les investigations existantes — `INV-2026-001 « Réseau de surfacturation »` annonce déjà 8 cas liés sans jamais les montrer. | 1 | ✅ |
| **P4-11** | Visualisation force-directed (SVG maison ou une dépendance légère — arbitrer, pas d'ajout lourd sans raison). Zoom, sélection, mise en évidence des chemins. | 2 | ✅ * |
| **P4-12** | Indicateurs de collusion : densité anormale de liens, assurés partagés entre établissements, praticiens présents dans plusieurs dossiers signalés. | 1 | ✅ |
| **P4-13** | Depuis le détail d'alerte : « voir le réseau de ce dossier » — le lien entre le cas isolé et le schéma organisé. | 0,5 | ✅ |

**Total D3 ≈ 4,5 j.** Arbitrages en [`DECISIONS.md`](DECISIONS.md), ADR-024 et ADR-025.

\* **SVG maison, arbitré contre `d3-force`.** Pas pour le poids : parce qu'une
simulation animée ne tourne pas sur le serveur, et que le graphe n'apparaîtrait
alors qu'après l'hydratation. Écrit ici, Fruchterman-Reingold est une fonction
pure et déterministe, dont le résultat part complet dans le HTML servi.

#### Écarts constatés — D3

- **Le jeu de nœuds est commun à tous les dossiers**, un réseau n'en désignant
  qu'un périmètre. Refermer chaque dossier sur son sous-graphe aurait rendu
  invisible le signal recherché : un praticien présent dans trois dossiers y
  serait devenu trois praticiens (ADR-024).
- **« Cas liés » n'était pas « alertes ».** La liste des investigations affichait
  « 8 alertes » là où la fiche annonce huit **cas**, dont trois signalés. Le
  graphe a rendu la confusion visible ; l'étiquette est corrigée.
- **Les totaux de la liste des réseaux ne sont plus une addition.** Un sinistre
  suivi par deux dossiers y était compté deux fois — le total dépassait le nombre
  de sinistres au graphe, à l'endroit même où l'écran met en avant le partage
  d'entités. Le service les calcule sur les entités distinctes.
- **Le service refuse un périmètre qui ne tient pas sa fiche** : nombre de
  sinistres égal aux cas liés annoncés, alertes rattachées présentes,
  établissements nommés existants, et sinistre signalé décrivant la même chose
  que son alerte. Onze refus provoqués un à un sur une copie abîmée du jeu.
- **La console n'avait de navigation que sur son tableau de bord.** La barre
  latérale existait, complète, mais un seul écran la montait. Elle est passée
  dans une coque commune montée par chaque section. Là encore, aucun test ne
  pouvait le voir : il fallait quitter la première page.
- **Le panneau de l'entité choisie lisait les liens à l'envers** une fois sur
  deux, faute d'un libellé inverse. Chaque lien en porte désormais deux.
- **La disposition force-dirigée seule était illisible.** Relu à l'écran, le
  graphe était exact et incompréhensible : quatre natures d'entité mêlées, aucun
  sens de lecture, des libellés qui se chevauchaient. Chaque type est désormais
  rappelé vers sa colonne — les forces ne règlent plus que la hauteur — et chaque
  type porte une forme distincte. Ni les tests ni la vérification du HTML servi
  ne pouvaient relever ce défaut : il fallait regarder l'écran.
- **Le glissement du cadre volait le clic.** `setPointerCapture` sur le `<svg>`
  redirige vers lui tous les événements suivants : aucun nœud n'était
  sélectionnable. Capture retirée, glissement suivi à l'état des boutons.
- **La disposition ignorait la taille de ce qu'elle place.** Un test comparant
  chaque paire de positions aux rayons dessinés a montré que le CHU et son
  radiologue se recouvraient — quatorze unités d'écart pour vingt-quatre de
  rayons. Un desserrage a été ajouté après le recadrage.
- **Le jeu de données a été écrit par script**, comme en D1 et D2 : quarante
  sinistres, cent trente arêtes, et six périmètres dont le compte doit tomber
  juste.
- **`CarteSynthese` est extraite dans `components/`** — la deuxième copie allait
  être écrite.
- **Une page 404 diffusée renvoie 200**, comme la garde de D5 : la vérification
  porte sur ce qui est servi, pas sur le code de statut.

#### Dette reportée — D3

| Constat | Vers |
|---|---|
| Les indicateurs sont calculés sur le jeu chargé en mémoire. | Recoupement côté serveur, quand le volume l'exigera |
| Aucun nœud ne se déplace à la souris. | Contrepartie assumée d'une disposition arrêtée avant le navigateur |
| Les liens sont orientés dans le modèle, dessinés sans flèche. | Le sens se lit dans le panneau latéral |
| Le graphe ne couvre que les sinistres rattachés à un dossier. | Une alerte isolée n'a pas de réseau, et l'écran le dit |
| Pas de capture d'écran. | P5-8 |

#### D4 — Simulateur de seuils ✅ terminé

> *Ailleurs* : on change le seuil et on attend un mois pour savoir ce qu'on a cassé.

| # | Tâche | Est. | |
|---|---|---|---|
| **P4-14** | Rejeu des alertes historiques à seuil variable, calculé côté client. | 1 | ✅ * |
| **P4-15** | Écran de simulation : curseur de seuil, et en regard, en direct — alertes retenues, montant couvert, faux positifs attendus, charge de travail induite en dossiers/jour. | 1 | ✅ |
| **P4-16** | Courbe précision/rappel et point de fonctionnement recommandé, argumenté. | 0,5 | ✅ |
| **P4-17** | « Appliquer ce seuil » relié aux Paramètres de P2-5 — la boucle pilotage → configuration se referme. | 0,25 | ✅ |

**Total D4 ≈ 2,75 j.** Arbitrages en [`DECISIONS.md`](DECISIONS.md), ADR-020 et ADR-021.

* **Le rejeu ne porte pas sur les alertes historiques, mais sur toute la population.**
La tâche demandait de rejouer les alertes ; or « qu'aurait donné un seuil plus bas ? » est
une question sur les demandes qui **n'ont pas** déclenché d'alerte, et qui ne figurent donc
dans aucune liste d'alertes. Un rejeu bâti sur les dix alertes n'aurait pu que retrancher,
jamais ajouter : il aurait montré la moitié haute de la courbe en laissant croire que
c'était toute la courbe.

#### Écarts constatés — D4

- **Une population de rejeu a été introduite** (`simulation/data.json`) : les 5 240 demandes
  de mai 2026, alertées ou non, distribuées par tranches de 5 points. Vingt lignes plutôt
  que cinq mille, et le rejeu n'est qu'une somme cumulée (ADR-020).
- **La frontière entre mesuré et estimé est portée dans les données et affichée partout.**
  Sous le seuil de collecte, rien n'a été instruit : tout ce que le simulateur avance y est
  une estimation, issue du sondage mensuel de D2. La convention retenue est conservatrice —
  une tranche où le sondage n'a rien trouvé n'estime rien — d'où un rappel qui est une borne
  **haute**, dit comme tel.
- **La capacité de la cellule entre dans la recommandation**, et elle est constatée, pas
  supposée : 347 dossiers refermés en mai / 22 jours ouvrés ≈ 16 par jour. Le résultat est
  la conclusion la plus intéressante de l'écran — le seuil optimal absolu (75 %) dépasse la
  capacité, donc le frein est le nombre d'analystes, pas le modèle (ADR-021).
- **Trois grandeurs ont été reprises de D2 plutôt que posées deux fois.** Le nombre de
  fraudes manquées affiché par l'écran de qualité **sort** désormais de cette population ;
  le jeu de D2 a été régénéré en conséquence. Au seuil en vigueur, les deux écrans donnent
  le même couple précision/rappel — 74,8 % et 81,4 % — par deux chemins de calcul distincts,
  et un test le vérifie au chiffre près.
- **Le contrôle de couverture a mordu au premier `build`** : les tranches s'arrêtaient à 99,
  et une demande scorée exactement 100 n'aurait été comptée nulle part.
- **`Section` a été extraite** dans `components/section.tsx` — le dossier d'alerte, la
  qualité et le simulateur la portaient à l'identique. Même discipline qu'en D1 pour
  `lib/formats.ts` : au moment où la troisième copie allait apparaître.

#### Dette reportée — D4

| Constat | Vers |
|---|---|
| La capacité de la cellule est une constante du jeu : ni effectif variable, ni temps d'instruction par type de fraude. | `capaciteJour` est le paramètre par lequel un modèle de charge plus fin entrerait |
| Le pas de simulation est de 5 points, celui de la distribution fournie. | Données au score près, si l'API en rend |
| Le simulateur ne rejoue que mai 2026. | Population glissante, ou choix de la période |

#### D5 — Piste d'audit ✅ terminé

| # | Tâche | Est. | |
|---|---|---|---|
| **P4-18** | Journalisation de toute action métier : acteur, horodatage, avant/après, motif. | 0,5 | ✅ |
| **P4-19** | Écran « journal d'audit » réservé au rôle ADMINISTRATEUR — l'occasion de créer enfin `/dashboard/admin`, documenté et protégé par `proxy.ts` mais inexistant. | 0,5 | ✅ |
| **P4-20** | Export du journal (CSV) pour un contrôle externe. | 0,25 | ✅ |

#### Écarts constatés — D5

- **Le journal est un store à part**, en ajout seul, avec sa propre clé de stockage. Logé
  avec les modifications, il aurait été effacé par « Réinitialiser » — le bouton dont il
  doit précisément garder la trace — et exposé au rejet en bloc de son `merge` (ADR-022).
  Il valide donc son contenu **entrée par entrée** : une entrée corrompue est écartée
  seule.
- **Les actions du store reçoivent l'état antérieur de ce qu'elles modifient.** Le store ne
  connaît que les écarts (ADR-004) : il ignore le statut d'une alerte qu'il n'a jamais
  touchée, et le deviner produirait « de — à Résolu ». Le paramètre est requis, comme
  `statutAnterieur` l'est depuis la phase 3.
- **La trace est exigée par le point de passage des écritures**, en cinquième paramètre :
  un appel qui l'oublie ne compile pas. La garde a été prouvée en la retirant.
- **La page refait le contrôle d'accès du proxy.** Éprouvé en neutralisant le filtre du
  proxy : la page renvoie alors l'analyste d'elle-même, sans servir une ligne du journal.
  Le statut reste 200 — la page est derrière une frontière de chargement — d'où une
  vérification portée sur ce qui est servi plutôt que sur le code de statut (ADR-023).
- **La barre de navigation affichait « Admin Diallo · Administrateur » à tout le monde.**
  Corrigé : elle porte l'identité connectée. Elle reçoit le rôle **mis en forme**, jamais
  son code — une vérification de la phase 2 a repris en défaut la première version du
  câblage, qui laissait « SUPERVISEUR » passer dans le HTML servi.
- **L'identité n'est lue que sur les écrans qui écrivent.** La poser dans le layout racine
  aurait rendu dynamiques les huit écrans pré-rendus, dont quatre n'écrivent rien. Trois
  routes basculent — `/investigations`, `/parametres`, `/simulation` — et cinq restent
  statiques.
- **`lib/formats.ts` gagne `formaterDate()` et `formaterHeure()`**, dont
  `formaterHorodatage()` devient la composition : l'export CSV les veut en deux colonnes.

#### Dette reportée — D5

| Constat | Vers |
|---|---|
| Le journal est celui d'un navigateur : il ne remonte pas les actions faites ailleurs. L'écran l'annonce. | Journal serveur — même mécanisme, écrit au même endroit ; le point de passage unique existe déjà |
| Les écritures refusées par le service ne sont pas tracées. | Un journal serveur les enregistrerait, avec le refus |
| La consultation et l'export du journal ne sont pas eux-mêmes journalisés. | Trace des lectures, si une exigence de conformité la demande |
| Les 500 entrées sont une borne de stockage, pas une durée de rétention. | `retentionDonnees` existe déjà dans les réglages et ne pilote rien |

| **P4-21** | **Documentation M4** : section README « ce que FraudShield fait que les autres ne font pas », 4 captures, ADR par différenciateur, CHANGELOG. | 1 |

**Total phase 4 ≈ 16 j.** C'est la phase longue ; c'est aussi la seule qui distingue ce
projet d'un tableau de bord de plus.

---

### Phase 5 — Finition et publication · **M5**

| # | Tâche | Est. | État |
|---|---|---|---|
| **P5-1** | Accessibilité : `aria-label` sur les boutons à icône seule, `role="alert"` sur l'erreur de connexion, `autoComplete` sur les champs du login, état de chargement/désactivé à la soumission, `scope="col"` sur les `<th>`. | 1 | ✅ |
| **P5-2** | Retirer les `cursor-pointer` restants sur les éléments non cliquables (4 emplacements) et les `animationDelay` sans animation (3 emplacements). | 0,25 | ✅ |
| **P5-3** | Thème clair/sombre : `next-themes` est installé, aucun `ThemeProvider` n'est monté, `dark` est figé sur `<html>`. Monter le fournisseur et l'interrupteur, ou retirer la dépendance. | 0,5 | ✅ dépendance retirée (ADR-030) |
| **P5-4** | Parcours clavier complet, contrastes vérifiés sur les badges de risque (rouge sur sombre : à mesurer). | 0,5 | ✅ |
| **P5-5a** | Tests : Vitest + Testing Library sur le service, la validation Zod, le calcul de score et le simulateur. | 1 | ✅ 180 tests, `npm test` (ADR-032) |
| **P5-5b** | Le reste des suites hors dépôt (piste d'audit, stores Zustand), puis un parcours Playwright login → alerte → décision. | 1 | |
| **P5-6** | Responsive : les tableaux sur mobile, la sidebar sur tablette. | 1 | ✅ seuil à 1024 px, planchers de tableaux (ADR-031) |
| **P5-7** | Durcissement de `src/auth.ts` : `DUMMY_HASH` est actuellement l'empreinte réelle du compte admin. La garde `!user ||` protège aujourd'hui, mais réutiliser une empreinte valide comme leurre est un piège qu'une future refactorisation déclenchera. Générer un leurre dédié. | 0,25 | ✅ |
| **P5-8** | **Documentation finale** : README complet avec captures, `docs/ARCHITECTURE.md`, `docs/API-CONTRACT.md` (le contrat que la vraie API doit respecter — utile au coéquipier), CHANGELOG v2.0. | 1,5 | |

**Écarts constatés — P5**

- **Les tests existaient, mais personne ne pouvait les lancer.** La carte disait
  « écrire des tests » ; il y en avait déjà deux mille sept cents lignes, hors
  dépôt, derrière une compilation temporaire et un crochet sur la résolution des
  modules. Le travail n'était pas d'en écrire, c'était de les rendre exécutables
  par quelqu'un d'autre — d'où la scission en P5-5a et P5-5b.
- **La tablette était traitée comme un écran de bureau.** Le seuil hérité du
  gabarit valait 768 pixels — exactement la largeur d'une tablette en portrait,
  sur laquelle la barre latérale prélevait donc 288 pixels en permanence. La
  carte parlait de « la sidebar sur tablette » sans dire que c'était un seuil
  mal placé, et non une mise en page à revoir.
- **Un conteneur qui défile ne suffit pas à faire défiler un tableau.** Un
  tableau `w-full` se tasse jusqu'à la largeur minimale de son contenu : il lui
  faut aussi une largeur plancher. Six des dix tableaux avaient le conteneur et
  pas le plancher ; deux n'avaient ni l'un ni l'autre.
- **Les deux dernières erreurs de lint étaient du responsive.** Les deux
  `setState` dans un effet portés depuis le début du projet servaient tous deux
  à réagir à la largeur de l'écran. Ils tombent avec la réécriture du crochet.
- **Le thème était la question, les variables CSS étaient le problème.** En
  relisant ce que `next-themes` pilotait, huit variables sont apparues qui ne
  désignaient rien : les noms de jetons de shadcn, que ce projet n'a jamais
  déclarés. Trois rendus en pâtissaient sans que cela se voie — les couleurs
  des notifications, le halo des libellés du graphe, les graduations du
  graphique des alertes. Un contrôle (`verif-styles`) l'interdit désormais.
- **Un thème clair n'était pas une demi-journée.** L'estimation supposait qu'il
  suffisait de monter un fournisseur ; il fallait en réalité une seconde palette
  complète, la reprise de trente-quatre couleurs écrites en dur, et une seconde
  passe de mesure des contrastes. La décision de ne pas le faire est
  documentée plutôt que subie.

- **Le contraste qui posait problème n'était pas celui qu'on surveillait.** Les
  badges de risque passaient déjà largement (6,8 au plus bas) ; c'est le gris
  discret, atténué à 50–70 %, qui tombait à 1,8. Mesurer plutôt qu'apprécier a
  déplacé le défaut.
- **Le graphe de réseaux était entièrement inaccessible au clavier.** L'écran
  dont tout l'intérêt est l'exploration était le seul qu'on ne pouvait explorer
  qu'à la souris.
- **Quatre composants du gabarit subsistaient sans être importés nulle part**,
  et concentraient les dernières commandes sans nom accessible.

**Total ≈ 7 j.**

---

### Phase 6 — Un modèle qui apprend · **M6**

Hors plan initial. Deux jeux de déclarations d'assurance automobile ont été
fournis, dont l'un porte une étiquette de fraude : la console peut cesser
d'afficher un score écrit à la main.

| # | Tâche | Est. | État |
|---|---|---|---|
| **P6-1** | Apprentissage sur les 30 000 déclarations étiquetées : lecture, encodage, découpage stratifié, régression logistique pénalisée, mesure sur un jeu de contrôle. Artefact chargé par la console, application traduite en français. | 2 | ✅ AUC 0,6935 · calibration 0,60 % (ADR-033) |
| **P6-2** | Le portefeuille français (108 653 contrats) comme **référence de normalité** : alimenter les comparatifs de la console (valeur du dossier, valeur de la cohorte, effectif) à partir de comptages réels plutôt que de valeurs écrites à la main. | 1,5 | |
| **P6-3** | Un écran de notation : soumettre une déclaration, voir le score, sa décomposition et la probabilité calibrée. Réutilise `DecompositionScore`, déjà écrit et déjà testé. | 1 | ✅ `/notation`, 20 vérifications |
| **P6-4** | Publier ce que vaut le modèle **dans la console** — aire sous la courbe, calibration, points de fonctionnement — plutôt que dans un fichier de décisions. Un modèle dont on ne peut pas lire les mesures se présente comme meilleur qu'il n'est. | 0,75 | ✅ absorbée par P6-3 |

**Écarts constatés — P6**

- **Un des deux jeux ne permet pas d'apprendre.** `Base_de_donnees.csv` ne porte
  aucune étiquette de fraude : `N_SINISTRE` compte les sinistres, il ne les
  qualifie pas. Le dire tôt évite de bâtir sur un malentendu — et lui trouve son
  vrai usage, qui est de décrire ce qui est normal.
- **Le domaine ne recouvre pas celui de la console.** Ces déclarations sont
  automobiles, la console instruit de l'assurance maladie. Le modèle est un
  second domaine, pas un remplacement du premier.
- **`DecompositionScore` n'a pas eu à bouger d'une ligne.** Le composant écrit
  en D1 pour des dossiers d'assurance maladie affiche la décomposition d'un
  modèle appris bien plus tard, parce que celle-ci passe le même schéma. C'est
  le contrat qui a rendu la réutilisation possible, pas la chance.
- **P6-4 n'était pas une carte séparée.** Publier les mesures du modèle n'avait
  de sens qu'à l'endroit où on l'interroge : les deux ont été livrées ensemble.
- **Le premier modèle avait raison et était illisible.** Deux coefficients qui
  s'annulaient sur deux colonnes corrélées : le signal était leur différence.
  L'écrire explicitement n'a rien changé à la performance et tout à
  l'explication.

---

## 4. Récapitulatif

Unité : la demi-journée de travail effectif.

| Phase | Contenu | Est. | Cumul | État |
|---|---|---|---|---|
| P0 | Remise en marche | 1,75 | 1,75 | ✅ |
| P1 | Fondations | 6,25 | 8 | ✅ |
| P2 | Interactions | 5,25 | 13,25 | ✅ |
| P3 | Détail d'alerte | 2,75 | 16 | ✅ |
| P4 | Différenciateurs | 16 | 32 | D1 ✅ (3,5) · D2 ✅ (3) · D3 ✅ (4,5) · D4 ✅ (2,75) · D5 ✅ (1,5) |
| P5 | Finition | 7 | 39 | |
| P6 | Un modèle qui apprend | 5,25 | 44,25 | P6-1 ✅ (2) · P6-3 ✅ · P6-4 ✅ (1,75) |

**≈ 39 demi-journées**, soit une vingtaine de jours pleins. Les phases 0 à 3 (16 demi-journées)
donnent une application saine et démontrable ; la phase 4 est celle qui donne au projet
son argument propre.

### Chemins de sortie anticipés

Si le temps manque, deux découpes tiennent debout :

- **Minimum publiable** — P0 + P1 + P2 + P5-1/2/7/8 : une console honnête et cohérente,
  sans différenciateur. ≈ 16 demi-journées, dont 1,75 déjà faites.
- **Maximum d'impact à effort contenu** — P0 → P3 + **D1 seul** + P5-8 : l'explicabilité
  est le différenciateur au meilleur rapport valeur/effort, 3,5 demi-journées pour
  l'argument le plus fort du lot. ≈ 21 demi-journées. **→ atteint** : il ne reste que
  P5-8 pour tenir cette découpe.

### Risques identifiés

| Risque | Parade |
|---|---|
| La phase 4 s'appuie sur des données fictives enrichies à la main ; le volume peut devenir la vraie contrainte (graphe, historiques, rejeu). | Écrire un générateur de jeu de données scripté dès P4-10, pas du JSON à la main. **Appliqué dès D1, puis en D2** : dix décompositions et trente-six cases de mesure, toutes écrites par script et recoupées par le service. |
| Sur-promesse : présenter des capacités d'interface comme des performances de détection. | Mention explicite dans le README et sur l'écran de simulation. Non négociable. |
| Le contrat d'API diverge de ce que produira le coéquipier. | `docs/API-CONTRACT.md` en P5-8 — à lui montrer plus tôt si possible. |
