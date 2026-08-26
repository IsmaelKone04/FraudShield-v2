# Journal des modifications

Une section par phase de [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Phase 6 — Un modèle qui apprend · P6-2

Le second jeu fourni ne porte aucune étiquette de fraude : on n'y apprend pas un
détecteur. Il décrit en revanche ce qui est **habituel**, et c'est la question
que la console pose déjà sous chaque dossier — *par rapport à quoi ?*

### Ajouté — le portefeuille de référence

- **`npm run portefeuille:agreger`** ([ADR-034](docs/DECISIONS.md)). Seize
  mégaoctets de contrats deviennent onze kilo-octets de table consultable, un
  rapport de mille pour un. Sept découpages : région, énergie, Crit'Air,
  conducteurs désignés, âge du conducteur, âge du véhicule, ancienneté.
- **Trois grandeurs par cohorte.** La fréquence pour mille contrats — 0,114 ne
  se lit pas, 114 se lit. Le coût moyen d'un sinistre, rapporté aux sinistres et
  non aux contrats : le diviser par l'ensemble donnerait un chiffre qui ne
  correspond à aucun sinistre réel. Et la prime pure, produit des deux, seule à
  se comparer d'une cohorte à l'autre sans arbitrage.
- **`/portefeuille`** rend le tout consultable : on choisit un découpage, une
  cohorte, et on la voit face à l'ensemble.

### Ce que le portefeuille dit

| | |
|---|---|
| Ensemble | **114** sinistres pour mille contrats · coût moyen **947 €** · attendu **108 €** par contrat |
| Découpage le plus net | conducteurs désignés — **201 ‰** à quatre contre **108 ‰** à deux (1,86) |
| Les six autres | entre 1,13 et 1,23 d'amplitude |

Aucun découpage ne sépare au-delà du double, et le plus net s'explique sans
mystère : quatre conducteurs roulent plus que deux. C'est une donnée de
sinistralité ordinaire, pas un discriminant — un test le vérifie, parce qu'une
amplitude supérieure au triple signalerait une erreur d'agrégation avant d'être
une découverte.

### La distinction que l'écran écrit noir sur blanc

Une cohorte qui déclare plus souvent est plus **exposée**, pas plus
**suspecte**. Confondre les deux serait le raccourci que ce projet reproche aux
outils du marché — et il serait ici d'autant plus grave que les cohortes sont des
régions, des âges et des catégories socioprofessionnelles.

### Un plancher d'effectif, assumé et publié

Cinq cents contrats minimum. Une fréquence calculée sur trente varie du simple au
double selon qu'un seul d'entre eux a déclaré. Onze cohortes sont écartées à ce
titre ; leur nombre est **affiché** plutôt que tu, parce qu'il dit à quel point un
découpage est déséquilibré.

### Le contrat a permis la réutilisation, une fois de plus

Les comparaisons produites sont des `Comparatif`, la forme définie en D1 pour les
dossiers d'assurance maladie : `ComparatifContextuel` les affiche sans une ligne
de changement. Seule l'énumération des unités s'est étendue — « € » et
« sinistres » à côté de « FCFA », « actes » et « jours ». Elle reste une
énumération : laisser le champ libre reviendrait à accepter qu'une durée finisse
un jour affichée en francs.

### Ajouté — vérification

- **20 tests** sur la table : que les trois grandeurs se recoupent, que la prime
  pure est bien le produit des deux autres, qu'aucune cohorte publiée ne repose
  sur trop peu de contrats, et que rien n'est inventé sur une cohorte inconnue.
- **19 vérifications** sur le HTML servi (`verif-portefeuille`), dont celles qui
  portent sur ce que la page doit **dire** : l'absence d'étiquette de fraude, la
  différence entre exposition et suspicion.

---

## Phase 6 — Un modèle qui apprend · P6-3 et P6-4

Le modèle existait depuis P6-1, sans que rien ne permette de l'interroger. Un
score qu'on ne peut pas interroger ne se conteste pas.

### Ajouté — l'écran `/notation`

- **On compose une déclaration, le score bouge, et la décomposition dit de
  combien.** C'est la seule façon de vérifier qu'un modèle fait ce qu'il prétend
  faire. Huit variables sont manipulables — celles qui pèsent —, les autres
  restent à leur valeur moyenne, et l'écran le dit plutôt que de le taire.
- **Le dossier moyen du portefeuille sert de repère.** Sans lui, on ne sait pas
  si 62 est beaucoup : l'écart au dossier moyen est affiché à côté du score.
- **La probabilité calibrée est publiée à côté du score**, jamais confondue avec
  lui : le score est une transformation affine du logit, la probabilité une
  sigmoïde de celui-ci. Les deux ordonnent pareil, ils ne se lisent pas pareil.
- Le calcul se fait dans le navigateur. Le modèle tient en treize kilo-octets de
  coefficients ; un aller-retour au serveur pour une addition n'apporterait
  qu'une latence.
- **`DecompositionScore` est réutilisé tel quel.** Le composant écrit en D1 pour
  les dossiers d'assurance maladie affiche la décomposition d'un modèle appris
  neuf mois plus tard, sans une ligne de changement : la décomposition produite
  passe le même schéma Zod.

### Ajouté — ce que vaut le modèle, dans la console (P6-4)

Aire sous la courbe ROC, écart de calibration, précision et rappel au seuil 60,
et le chiffre qui parle à une cellule : **4,1 dossiers à instruire par fraude
trouvée, contre 8,7 au hasard**. Un modèle dont on ne peut pas lire les mesures
se présente comme meilleur qu'il n'est.

L'exactitude n'est pas affichée, et l'écran écrit pourquoi : à 11,5 % de
fraudes, répondre « non » à tout en obtiendrait 88,5 % sans avoir rien appris.

### Ce que l'écran dit, et qu'aucun test unitaire ne pouvait dire

Un bandeau rappelle que **ces déclarations sont automobiles** et que les alertes
de la console relèvent de l'assurance maladie — deux domaines, aucun chiffre ne
passe de l'un à l'autre. Ce n'est pas une précaution de façade : laisser croire
que ce modèle note les alertes serait la seule sur-promesse du projet, et le
risque était identifié dans la feuille de route dès la phase 0.

### Ajouté — vérification

- `verif-notation` : **20 vérifications** sur le HTML réellement servi — que
  l'écran est protégé comme les autres, que le score et sa décomposition sont
  rendus, que les mesures du modèle y figurent, et que l'avertissement de
  domaine y est écrit.

### Corrigé au passage

Une assertion de ce contrôle visait l'infobulle du sommaire, que le serveur ne
rend pas : elle éprouvait quelque chose qui n'existe pas dans la page. Remplacée
par le lien lui-même, qui, lui, mène quelque part.

---

## Phase 5 — Finition · Le reste de D5, et un navigateur pour de vrai

P5-5b. Deux suites restaient hors du dépôt depuis P5-5a — la migration et le
câblage du store — et rien ne prouvait qu'une décision survit à un
rechargement complet de la page.

### Ajouté — la migration et le store rentrent (36 tests)

- **`lib/store/migration.test.ts`** (17 tests). `defaireDecisionsNonQualifiees`
  est le seul code du projet qui puisse détruire le travail d'un utilisateur.
  La moitié des tests porte délibérément sur ce qu'elle **garde** — statuts,
  assignations, notes, décisions déjà qualifiées — et non sur ce qu'elle
  défait : un test qui ne prouve que la destruction laisserait passer une
  régression sur l'autre moitié de la promesse.
- **`lib/store/modifications.store.test.ts`** (19 tests). `@/lib/api/mutations`
  est simulé pour provoquer un refus du service sans réseau. Ce que ces tests
  établissent : une modification refusée n'écrit **rien** au journal, une
  décision annulée journalise sa propre entrée plutôt que de faire disparaître
  la précédente sans trace, et « Réinitialiser » n'efface pas la trace de ce
  qu'il efface.

### Ajouté — un navigateur pour de vrai (ADR-035)

- **`npm run e2e`**, Playwright sur Chromium. Deux parcours : connexion →
  décision → **rechargement complet** → persistance vérifiée → annulation ; et
  connexion administrateur → décision motivée → le motif retrouvé dans la
  piste d'audit.
- **Ce qu'un test unitaire ne peut pas prouver.** Que `deciderAlerte` produit
  le bon écart, oui. Qu'une session s'ouvre réellement dans un navigateur, et
  que `localStorage` ressort intact après un rechargement complet — non. C'est
  une propriété qui engage le navigateur, pas seulement le code.

### Une course, trouvée par le test lui-même

Le second parcours échouait de façon reproductible : la décision s'affichait,
le journal consulté juste après ne la contenait pas. L'écriture dans
`localStorage` par le middleware `persist` de Zustand n'est pas garantie
synchrone ; un `page.goto` immédiatement après décharge le document avant que
l'écriture n'ait forcément fini. Le correctif n'est pas un délai arbitraire :
le test navigue désormais par le **lien du sommaire** — une transition côté
client, qui garde le même store en mémoire sans repasser par `localStorage`.
C'est aussi le geste qu'un analyste ferait vraiment.

### Ce qui reste hors du dépôt, et pourquoi

`preuve-garde-d5` — qui réécrit `proxy.ts` sur le disque pour vérifier qu'une
page protégée se défend malgré tout, ou casse une entrée de journal pour
vérifier que les autres survivent — mute des fichiers source et interroge un
serveur vivant. Ce n'est pas ce que Vitest exprime ; c'est ce que les scripts
`verif-*` font déjà. Réexécutée à cette tranche : **8 succès, 0 échec**.

### Ajouté — vérification

- `npm test` : **256 tests**, 12 fichiers.
- `npm run e2e` : **2 parcours**, stables sur deux exécutions consécutives.

---

## Phase 6 — Un modèle qui apprend · P6-1

Jusqu'ici, `scoreIA` était un nombre écrit dans un fichier de démonstration et
`modele: "gradient boosting, version 4.2"` une chaîne de caractères. Rien, dans
ce dépôt, n'apprenait quoi que ce soit. Deux jeux de déclarations automobiles
ont été fournis ; l'un d'eux permet d'y remédier.

### Ajouté — l'apprentissage

- **`npm run modele:entrainer`** ([ADR-033](docs/DECISIONS.md)). Lit le CSV,
  apprend, mesure sur des lignes tenues à l'écart, écrit un artefact de 13 ko
  que la console charge. Écrit en JavaScript, sans dépendance : aucune
  bibliothèque d'apprentissage n'est ajoutée au projet.
- **Régression logistique pénalisée**, et ce n'est pas faute de mieux. Le
  contrat exige qu'une explication *referme* le score ; le logit **est** une
  somme. Un modèle d'ensemble n'y serait parvenu qu'au travers de valeurs de
  Shapley — une approximation coûteuse d'une propriété obtenue ici gratuitement.
- **`src/lib/modele/scorer.ts`** applique le modèle et surtout **traduit**. Un
  coefficient de +1,076 sur `authorities_contacted=None` ne se conteste pas ;
  « aucune autorité n'a été contactée au moment du sinistre » se conteste.

### Ce que le modèle vaut

Mesuré sur 7 500 déclarations que l'apprentissage n'a jamais vues :

| | |
|---|---|
| Aire sous la courbe ROC | **0,6935** (0,5 = tirage au sort) |
| Écart de calibration | **0,60 %** |
| Au seuil 60 | précision 24,3 % · rappel 48,0 % |
| Dossiers instruits par fraude trouvée | **4,1**, contre 8,7 au hasard |

L'exactitude n'est pas rapportée : à 11,47 % de fraudes, répondre « non » à tout
donne 88,5 % d'exactitude sans avoir rien appris. Ce que la mesure dit vraiment
est plus modeste et plus utile — **la cellule instruit deux fois moins de
dossiers pour trouver la même fraude**.

### Ce que la mise à l'épreuve a mis au jour

- **Le modèle avait trouvé un signal qu'il exprimait de façon illisible.** Deux
  coefficients presque opposés sur `claim_amount` (+0,68) et
  `total_claim_amount` (−0,63), deux colonnes corrélées à 0,90 : le signal était
  leur **différence**. Le taux de fraude passe de 7,2 % dans le décile où le
  montant réclamé reste loin sous l'expertise à 17,1 % dans celui où il
  l'atteint. Écrite explicitement, la variable ne change rien à la performance et
  tout à l'explication.
- **L'écrêtage de l'échelle cassait l'égalité.** Un dossier dont tout concorde
  sort à cent huit points bruts ; les huit points en trop doivent aller quelque
  part, sans quoi ce sont les dossiers les plus graves que le service refuse.
  Ils forment désormais une ligne à eux, qui dit ce qui s'est passé.

### Ce que les jeux permettent, et ce qu'ils ne permettent pas

- `car_insurance_fraud_dataset.csv` porte une **étiquette de fraude** : on y
  apprend. Versionné, malgré ses 4,6 Mo — sans lui, les chiffres publiés ne
  seraient plus vérifiables.
- `Base_de_donnees.csv` (108 653 contrats français) n'en porte **aucune** :
  `N_SINISTRE` compte les sinistres, il ne les qualifie pas. On ne peut pas
  apprendre un détecteur sur un fichier qui ne dit jamais ce qu'il faudrait
  prédire. Il décrit en revanche un **portefeuille** — ce qui est normal pour un
  profil donné —, soit la matière des comparatifs de la console. Cet usage reste
  à écrire (P6-2).
- Ces déclarations sont **automobiles**. La console instruit des dossiers
  d'**assurance maladie**. Le modèle ne sait donc pas noter les alertes du jeu de
  démonstration, et rien dans le code ne le prétend : c'est un second domaine,
  pas un remplacement du premier.

### Ajouté — vérification

- **20 tests** sur le modèle, dont l'égalité qui referme le score vérifiée sur
  **2 000 déclarations réelles** — le cas isolé prouve peu, les arrondis ne se
  trahissent qu'en nombre. Et sur les extrêmes, là où l'échelle sature.
- La décomposition produite passe le même schéma Zod que les dossiers du jeu de
  démonstration : elle pourra être servie aux écrans existants sans les toucher.

---

## Phase 5 — Finition · Les tests rentrent dans le dépôt

P5-5, première moitié. Le projet comptait déjà près de deux mille sept cents
lignes de tests. Aucune ne vivait dans le dépôt, et rien ne les lançait.

### Ajouté — un lanceur

- **`npm test`** ([ADR-032](docs/DECISIONS.md)). Vitest, Testing Library, jsdom.
  Les suites d'avant exigeaient une compilation TypeScript vers un dossier
  temporaire, puis un crochet sur `Module._resolveFilename` pour que `@/`
  désigne cette compilation-là : personne d'autre que leur auteur ne pouvait
  les exécuter. Une suite qu'on ne peut pas lancer n'est pas un filet, c'est
  une archive.
- L'environnement est déclaré **par fichier**. Les fonctions pures n'ont que
  faire d'un DOM ; seuls les fichiers qui montent un composant ouvrent par
  `// @vitest-environment jsdom`.

### Ajouté — 180 tests, sur ce qui fait la valeur de la console

| Suite | Tests | Ce qu'elle éprouve |
|---|---|---|
| `lib/qualite` | 44 | Un dossier refermé sans conclusion n'est ni une réussite ni un échec du modèle. |
| `lib/simulation` | 29 | Le rejeu à seuil variable ne mélange jamais le mesuré et l'estimé. |
| `lib/schemas/contrat` | 27 | Ce que le contrat refuse — et ce qu'il laisse ouvert. |
| `lib/formats` | 22 | Les mises en forme écrites à la main, caractère par caractère. |
| `lib/explication` | 18 | La phrase opposable, identique d'une exécution à l'autre. |
| `lib/services/alertes` | 16 | Le jeu servi, et les deux contrôles croisés du service. |
| `lib/api/client` | 13 | Le point de passage obligé des données. |
| `components/decomposition-score` | 11 | Ce qui rend un score contestable. |

### Ce que la mise à l'épreuve a demandé de nommer

- **Un contrôle qu'on n'a jamais vu échouer n'est pas un contrôle.** Les deux
  contrôles croisés du service des alertes — le total des actes, la
  décomposition qui referme le score — sont prouvés en les provoquant : le jeu
  est abîmé en mémoire (un acte majoré d'un franc, un facteur alourdi d'un
  point) et le refus vérifié, message compris. Rien n'est touché sur le disque.
- **Un schéma qui n'a jamais rien rejeté est un type écrit deux fois.** La
  suite du contrat porte d'abord sur les refus : score hors bornes, statut
  inventé, date à la française, cause de faux positif sur une fraude confirmée.
  Et sur ce qui reste délibérément ouvert — un type de fraude inconnu passe.
- `vi.resetModules()` reconstruit `ApiError` avec le reste : la classe levée par
  un service rechargé n'est plus celle importée en tête du test, et
  `toThrow(ApiError)` échoue sur une erreur pourtant correcte. Les refus se
  vérifient donc sur le message.

### Ce qui reste

La piste d'audit et les stores Zustand ont encore leurs suites hors dépôt. Le
parcours complet — se connecter, ouvrir une alerte, trancher — demande un
navigateur : un test de composant prouve qu'un bouton appelle la bonne
fonction, pas qu'une session s'ouvre et qu'une décision survit au rechargement.

---

## Phase 5 — Finition · L'écran étroit

P5-6. La console était dessinée pour un écran large. Sur une tablette en
portrait, la barre latérale prélevait 288 des 768 pixels disponibles ; sur un
téléphone, deux tableaux poussaient la page entière hors du cadre.

### Corrigé — le cadre

- **La barre latérale s'efface en dessous de 1024 pixels** au lieu de 768
  ([ADR-031](docs/DECISIONS.md)). Une tablette en portrait fait exactement
  768 pixels : elle était traitée comme un écran de bureau. Le drapeau du
  contexte ne s'appelle plus `isMobile` mais `enTiroir` — ce n'est plus une
  question de téléphone. Les classes de rendu serveur suivent le même seuil,
  sinon la barre apparaissait le temps de l'hydratation avant de disparaître.
- **Les onze écrans respirent sur un téléphone** : la marge de page passe de
  24 à 16 pixels en dessous de 768. L'écran Analyses, lui, n'en avait aucune —
  son contenu touchait les bords à toutes les tailles.

### Corrigé — les tableaux

- **Deux tableaux n'avaient aucun conteneur qui défile** (les comptes et les
  modèles, sur l'écran Paramètres) : leurs six et sept colonnes poussaient la
  page hors de l'écran au lieu de glisser dans leur carte.
- **Un tableau `w-full` dans un conteneur qui défile ne défile pas** : il se
  tasse jusqu'à la largeur minimale de son contenu, un mot par colonne. Les dix
  tableaux de la console ont désormais une largeur plancher calée sur leur
  nombre de colonnes.
- **L'identifiant reste accroché à gauche** sur le tableau des alertes : ses
  onze colonnes ne tiennent sur aucun téléphone, et sans cette colonne fixe on
  perd de vue la ligne qu'on lit dès la troisième. Son fond opaque la prive du
  survol de la ligne — compromis assumé.
- Le sommaire de l'écran Paramètres tenait dans une colonne figée de 220 pixels,
  qui ne laissait qu'une centaine de pixels au panneau. Il passe au-dessus, en
  une rangée qui défile.

### Corrigé — les chiffres

- **Les cartes d'indicateurs s'empilent en dessous de 640 pixels.** Sur deux
  colonnes à 360 pixels, il reste environ 120 pixels pour un chiffre en corps
  30 : `128 400 000 FCFA` en demande plus du double, et débordait.
- Sur une carte de réseau, les trois mesures passent sur deux rangs, le montant
  seul en pleine largeur : tronqué à quatre-vingt-dix pixels, il ne disait plus
  rien.

### Corrigé — deux effets de trop

- **`npm run lint` ne signale plus rien.** Les deux dernières erreurs, portées
  depuis le début du projet, étaient deux `setState` dans un effet. Le crochet
  de largeur est réécrit avec `useSyncExternalStore` ; le graphique du tableau
  de bord déduit sa période au rendu au lieu de la forcer après coup — et
  distingue désormais « personne n'a choisi » de « on a choisi la période
  courte ».

### Ajouté — vérification

- `verif-responsive` refuse un tableau sans conteneur ou sans largeur plancher,
  une grille de trois colonnes ou plus qui ignore le téléphone, une largeur
  écrite en dur au-delà de 360 pixels. Sur l'état d'avant cette tranche, il
  relevait **douze défauts**.

### Ce qui demande encore un œil

Le contrôle lit le code, pas l'écran. La colonne d'identifiant accrochée, la
barre latérale en tiroir sur une tablette et les cartes empilées se constatent
un téléphone à la main — pas dans une feuille de style.

---

## Phase 5 — Finition · Le thème, et les variables qui ne désignaient rien

P5-3. La question posée était « monter le sélecteur clair/sombre ou retirer la
dépendance ». La réponse est la seconde, et elle a fait apparaître un défaut
plus large : des composants stylés avec des variables CSS inexistantes.

### Décidé

- **La console assume une palette unique, sombre** ([ADR-030](docs/DECISIONS.md)).
  `next-themes` figurait dans les dépendances sans que rien ne le monte : pas de
  `ThemeProvider`, `dark` posé en dur sur `<html>`. Un thème clair n'est pas une
  demi-journée de travail — la feuille de style n'a qu'une palette, trente-quatre
  couleurs sont écrites en dur dans les composants, et l'audit de contraste
  mesure ses vingt-quatre teintes sur les deux fonds sombres du projet. La
  dépendance est retirée plutôt que laissée à faire semblant.

### Corrigé — des styles qui ne s'appliquaient pas

- **Huit variables CSS ne désignaient rien.** `--popover`, `--border`,
  `--radius`, `--card`, `--muted-foreground`, `--sidebar-border`,
  `--sidebar-accent` : les noms de jetons de shadcn, que ce projet n'a jamais
  déclarés — il définit les siens dans `@theme`, préfixés `--color-`.
- Conséquences visibles, jusqu'ici passées inaperçues : les **notifications**
  s'affichaient aux couleurs par défaut de sonner et non à celles de la console ;
  le **halo qui détache les libellés du graphe** de leurs liens ne se peignait
  pas ; les **graduations du graphique des alertes** gardaient le gris par défaut
  de Recharts — un contraste que l'audit des couleurs ne pouvait pas voir,
  puisqu'il ne passe par aucune classe Tailwind.
- Une classe `cn-toast` était appliquée aux notifications sans être définie
  nulle part. Retirée.
- Les notifications suivaient le thème du **système** (`system` par défaut, faute
  de provider) : elles pouvaient s'afficher en clair sur une interface sombre.

### Ajouté — vérification

- **`verif-styles`** : recense toute `var(--…)` lue dans `src/` et exige que
  chacune soit déclarée dans `globals.css`, fournie par Tailwind, ou posée à
  l'exécution par un composant nommément désigné. Une `var()` vide ne casse
  rien — elle ne peint pas — ce qui est précisément ce qui rendait ces huit
  défauts invisibles en relecture.

### Ce qui demande encore un œil

- Le rendu des notifications aux couleurs de la console, et le halo des libellés
  du graphe : ils se constatent à l'écran, pas dans une feuille de style.

---

## Phase 5 — Finition · Accessibilité, contrastes, et le leurre d'authentification

P5-1, P5-2, P5-4 et P5-7. Ce qu'on ne voit pas en regardant l'écran : ce qui ne
s'atteint pas au clavier, ce qui ne s'annonce pas à voix haute, et ce qui ne se
lit qu'avec de bons yeux.

### Corrigé — sécurité

- **L'empreinte-leurre était celle du compte administrateur.** `src/auth.ts`
  comparait le mot de passe saisi à une empreinte factice quand l'e-mail est
  inconnu — pour que la réponse prenne le même temps, et qu'on ne puisse pas
  énumérer les comptes au chronomètre. Cette empreinte factice était, à
  l'identique, celle de l'administrateur. Sans conséquence aujourd'hui grâce à
  la garde `!user ||`, mais c'est un piège armé pour la prochaine
  refactorisation. Le leurre est désormais l'empreinte d'un secret aléatoire de
  32 octets jamais conservé, et **une garde au démarrage refuse de lancer
  l'application** si un jour il redevenait celui d'un compte réel.

### Corrigé — accessibilité

- **Deux commandes n'existaient que pour la souris** : le dépli d'un dossier
  d'instruction, et **chaque entité du graphe de réseaux**. Elles deviennent des
  commandes à part entière, atteignables à la tabulation, qui annoncent ce
  qu'elles désignent et leur état ([ADR-029](docs/DECISIONS.md)).
- **Le clavier traverse le graphe dans l'ordre où il se lit** — colonne par
  colonne — et non dans celui où le service renvoie ses nœuds.
- **L'échec de connexion n'était jamais lu à voix haute.** Il est maintenant
  dans une région `role="alert"` présente en permanence ; les champs déclarent
  ce qu'ils attendent (`autoComplete`), et le bouton se désactive pendant
  l'authentification au lieu d'accepter une seconde soumission.
- **Quatre libellés lus par les lecteurs d'écran étaient en anglais**, restés du
  gabarit : « Toggle Sidebar », « Displays the mobile sidebar », « Close ».
- Les en-têtes des deux derniers tableaux déclarent leur portée (`scope`).

### Corrigé — contrastes

- **Le gris de second plan était sous le seuil**, et ses variantes atténuées
  très en dessous : de 3,68 pour `text-muted-foreground` à **1,79** pour
  `text-muted-foreground/50`, là où 4,5 est requis. Deux jetons mesurés les
  remplacent, et les 55 occurrences en pourcentage disparaissent. Le rouge de
  `text-destructive` (3,95) est éclairci lui aussi
  ([ADR-028](docs/DECISIONS.md)).
- Les teintes vives, elles, passaient déjà toutes largement — la plus basse à
  6,84. L'inquiétude notée dans la feuille de route (« le rouge sur sombre »)
  n'était pas la bonne.

### Retiré

- Les quatre composants de navigation du gabarit (`nav-main`, `nav-user`,
  `nav-documents`, `nav-secondary`) que plus rien n'importait — et qui
  portaient les dernières commandes sans nom accessible.
- Un décalage d'animation posé sur des cartes qui n'en jouent aucune.

### Vérification

`typecheck` et `build` sans erreur ; `lint` inchangé à 2 erreurs
préexistantes. **15 vérifications d'accessibilité** sur le HTML servi, et
**24 couleurs de texte mesurées** contre le seuil de 4,5 — le contrôle lit les
jetons dans `globals.css` et échouera sur toute teinte ajoutée sans être
mesurée. Deux audits de code (commandes sans nom accessible, éléments cliquables
inatteignables au clavier) passent à zéro. L'ensemble des suites antérieures
rejouées sans régression.

### Ce qui demande encore un œil

Le parcours réel à la tabulation et le rendu de l'anneau de focus dans le
graphe : ils se vérifient à l'écran, pas dans du HTML.

---

## Phase 4 — Les différenciateurs · Correction · Navigation et sens des liens

Deux défauts relevés à l'écran, l'un dans le graphe, l'autre dans toute la
console. Aucun des deux n'était visible depuis les tests : le premier demandait
de cliquer sur un nœud, le second de quitter le tableau de bord.

### Corrigé

- **La console n'avait de sommaire que sur sa première page.** La barre latérale
  n'était montée que par `/dashboard` ; les huit autres sections n'offraient
  qu'un lien de retour vers leur parent supposé. Elle est désormais installée par
  une **coque commune**, montée par un `layout.tsx` dans chaque section
  ([ADR-026](docs/DECISIONS.md)).
- **L'en-tête affichait « Documents »**, un titre resté du gabarit. Il prend
  maintenant le nom de la section dans la table de navigation — la même que celle
  qui remplit la barre latérale — et forme un fil d'Ariane à deux niveaux sur les
  pages de détail : « Réseaux de fraude › RES-2026-003 ».
- **Le panneau de l'entité choisie disait le contraire de la relation** une fois
  sur deux : un praticien s'y voyait annoncer « pris en charge par
  CLM-2026-0417 ». Chaque lien porte désormais **deux libellés**, et le panneau
  lit celui qui correspond au bout par lequel on regarde
  ([ADR-027](docs/DECISIONS.md)).

### Modifié

- La table de navigation quitte `app-sidebar.tsx` pour `lib/navigation.ts` :
  deux composants la lisent, un seul la définit.
- `/reseaux` **n'est plus pré-rendue.** La coque lit la session pour afficher
  le compte connecté ; l'arbitrage de D5 — la session n'est lue que là où
  quelque chose s'écrit — cède ici devant la navigation.

### Laissé en l'état

- Les liens de retour « ← » des pages font désormais doublon avec le fil
  d'Ariane et la barre latérale. Ils restent le temps de la revue d'ergonomie de
  la phase 5 : les retirer serait un second changement, non demandé, dans le même
  mouvement.

### Vérification

`typecheck` et `build` sans erreur (17 routes) ; `lint` inchangé à 2 erreurs
préexistantes. **62 tests** unitaires sur D3, dont 5 nouveaux sur le sens des
liens ; **43 vérifications** sur le HTML réellement servi — la barre latérale et
les huit liens de section présents sur chacune des neuf sections, le titre du
gabarit disparu partout, le fil d'Ariane sur les pages de détail, et l'entrée du
journal d'audit visible du seul administrateur. L'ensemble des suites
antérieures rejouées sans régression.

---

## Phase 4 — Les différenciateurs · D3 — Graphe de réseaux de fraude

Une alerte isolée se conteste. Un schéma organisé se démontre.

### Ajouté

- **`/reseaux`** : les six réseaux de fraude, avec ce que chacun met en jeu —
  sinistres, entités, montant, densité de liens. Et **`/reseaux/[id]`** : le
  graphe lui-même, ses indicateurs de collusion, et les alertes de son
  périmètre.
- **Un modèle de graphe à quatre types d'entité** — assuré, établissement,
  praticien, sinistre — et quatre liens orientés, chacun n'admettant qu'un
  couple de types. Le jeu de nœuds est **commun à tous les dossiers** : un
  praticien présent dans trois dossiers y est un seul nœud, sans quoi le
  recoupement entre dossiers serait invisible ([ADR-024](docs/DECISIONS.md)).
- **Les cas liés que personne ne montrait.** `INV-2026-001` annonçait « 8 cas
  liés » depuis la phase 1 en ne rattachant que trois alertes. Les huit sont là,
  et le service **refuse de servir** un réseau dont le nombre de sinistres ne
  correspond pas à celui de la fiche.
- **Une disposition force-dirigée écrite ici**, pure et déterministe, calculée
  sur le serveur : le SVG part complet dans le HTML servi, sans dépendance
  ajoutée et sans cadre vide au premier rendu ([ADR-025](docs/DECISIONS.md)).
- **Zoom, déplacement du cadre, mise en évidence du voisinage** à un ou deux
  liens. Choisir un nœud estompe le reste au lieu de le retirer : un analyste
  doit voir ce qu'il écarte.
- **Trois indicateurs de collusion**, calculés depuis les liens et non écrits
  dans le jeu de données : assurés présents dans plusieurs établissements,
  praticiens présents dans plusieurs dossiers, entités portant plusieurs
  sinistres. Chacun renvoie au nœud concerné d'un clic.
- **Une densité de liens qui se lit.** Elle vaut exactement `1,00` quand rien
  n'est partagé — chaque sinistre apporte alors quatre nœuds et quatre liens.
  Toute valeur supérieure mesure donc de la mutualisation, et rien d'autre.
- **Depuis le dossier d'alerte : « voir le réseau ».** Le lien désigne le
  sinistre, pas seulement le réseau, de sorte que le graphe s'ouvre sur le cas
  qu'on quittait. Il ne s'affiche pas pour une alerte qui n'appartient à aucun
  réseau — un lien qui mène à un écran vide punit celui qui le suit.

### Modifié

- **« Cas liés : 8 alertes » se lit désormais « 8 cas, dont 3 signalés ».**
  L'étiquette de la liste des investigations confondait deux nombres que le
  graphe vient de séparer.
- **Les totaux de la liste ne sont plus une addition.** Un sinistre suivi par
  deux dossiers y était compté deux fois : le total dépassait ce que le graphe
  contient, à l'endroit précis où l'écran prétend montrer le partage d'entités.
  Le service les calcule sur les entités distinctes.
- **`CarteSynthese` quitte le journal d'audit** pour `components/` : la
  deuxième copie allait être écrite. Même raison que `Section` en D1.

### Arbitrages

| Décision | Pourquoi |
|---|---|
| Un jeu de nœuds commun, des réseaux qui n'en désignent qu'un périmètre | Un sous-graphe par dossier ferait de trois apparitions d'un praticien trois praticiens ([ADR-024](docs/DECISIONS.md)) |
| Les arêtes d'un réseau sont déduites, pas listées | Deux descriptions du même lien finissent par diverger |
| L'identifiant du nœud **est** sa référence métier | Un second champ pour la même information, c'est une divergence en attente |
| Un sinistre n'est pas une alerte | Un dossier couvre des demandes dont une partie seulement a été signalée — c'est tout l'écart que le graphe explique |
| Le service refuse un périmètre qui ne tient pas sa fiche | Un graphe faux se voit moins qu'un tableau faux : il ressemble à quelque chose quoi qu'on y mette |
| Disposition écrite à la main plutôt que `d3-force` | Une simulation animée ne tourne pas sur le serveur : le graphe n'apparaîtrait qu'après l'hydratation ([ADR-025](docs/DECISIONS.md)) |
| Coordonnées arrondies au centième | Le SVG part en texte dans le HTML ; un écart en virgule flottante suffirait à faire diverger serveur et navigateur |
| Recadrage à proportions conservées | Étirer chaque axe déformerait les angles, et la lecture des distances deviendrait fausse |
| La sélection estompe, elle ne filtre pas | On doit voir ce qu'on écarte |
| Indicateurs calculés, jamais stockés | Un indicateur écrit dans le jeu de données est une affirmation ; calculé, il se vérifie ligne à ligne |
| Densité rapportée à 1,00 | Un chiffre sans point de comparaison ne se lit pas |

### Ce que l'écran finit par dire

Le dossier « Réseau de surfacturation » affiche huit sinistres pour trois
alertes : cinq cas n'ont jamais été signalés par le moteur et n'apparaissaient
nulle part. Le graphe montre pourquoi ils tiennent ensemble — un assuré qui
déclare dans trois cliniques, un chirurgien qui exerce dans deux d'entre elles.
Ailleurs, un cabinet privé concentre sept consultations du même assuré, et le
praticien qui les signe intervient aussi dans un second dossier.

### Corrigé après relecture à l'écran

Le graphe était exact et illisible — trois défauts relevés en le regardant, que
ni les tests ni la vérification du HTML servi ne pouvaient voir.

- **Aucun nœud ne répondait au clic.** Le glissement du cadre capturait le
  pointeur sur le `<svg>`, ce qui redirige vers lui tous les événements
  suivants : le clic n'atteignait jamais le nœud. La capture est retirée, et un
  déplacement de plus de quatre pixels annule le clic qui le termine.
- **Rien n'indiquait comment lire le graphe.** Chaque type est désormais rappelé
  vers sa colonne, dans l'ordre de la phrase — un assuré déclare un sinistre,
  pris en charge par un praticien, facturé par un établissement. Les colonnes
  sont nommées avec leur effectif, la phrase est écrite au-dessus du dessin, et
  le sens de lecture dispense de flèches.
- **Les libellés se chevauchaient.** Ils sont placés selon la colonne — vers
  l'extérieur pour les assurés et les établissements, sous le nœud pour les
  sinistres — coupés à vingt-deux caractères, et posés sur un halo. Les
  sinistres, trop nombreux, n'en portent qu'à la sélection ou au survol. Un test
  vérifie que deux entités libellées d'une même colonne sont séparées d'au moins
  une hauteur de ligne.
- **Chaque type a sa forme** — disque, losange, triangle, carré — la couleur
  seule disparaissant pour un daltonien, à l'impression et sur une capture.

### Dette laissée sciemment

- Les indicateurs sont calculés sur le jeu chargé : à volume réel, le
  recoupement entre dossiers se ferait côté serveur.
- Aucun nœud ne se déplace à la souris — contrepartie d'une disposition arrêtée
  avant d'arriver au navigateur.
- Le graphe ne couvre que les sinistres rattachés à un dossier d'instruction :
  une alerte isolée n'a pas de réseau, et l'écran le dit plutôt que d'ouvrir un
  cadre vide.
- Les liens sont orientés dans le modèle mais dessinés sans flèche : le sens se
  lit dans le panneau latéral, pas sur le trait.

### Vérifié

`typecheck` et `build` sans erreur (17 routes, `/reseaux` pré-rendue) ; `lint`
inchangé à 2 erreurs préexistantes. **57 tests** unitaires sur le contrat, les
périmètres, les indicateurs, les colonnes et l'espacement des libellés ;
**12 gardes prouvées** en abîmant une copie du jeu de données pour vérifier que
le service refuse et désigne le fautif ; **42 vérifications** sur le HTML
réellement servi, dont la présence des formes et des liens du SVG avant toute
hydratation, et celle des repères de lecture. Non-régression
des phases 2, 3, de D1, D2, D4 et D5 rejouée : 17/17, 8/8, 24/24, 45/45, 51/51,
34/34, 36/36, 8/8, 72/72, 62/62, 16/16, 62/62, 68/68 et 38/38.

---

## Phase 4 — Les différenciateurs · D5 — Piste d'audit

Une console qui décide doit pouvoir dire qui a décidé. Surtout quand la décision
a été défaite.

### Ajouté

- **`/dashboard/admin`** : le journal d'audit, réservé au rôle administrateur.
  Chaque action métier y est inscrite — acteur, horodatage, état d'avant, état
  d'après, motif quand l'action en exige un. Recherche libre, filtre par compte,
  filtre par type d'action, et une synthèse : actions enregistrées, dont
  effacements, comptes intervenus, dernière action.
  La route existait dans `proxy.ts` depuis la phase 2 et ne menait à rien : un
  contrôle d'accès sur une page absente.
- **Un store de journal distinct**, en ajout seul. Onze types d'action, une liste
  fermée : ce que la console sait faire est ce qu'elle sait journaliser, et le
  compilateur le rappelle.
- **La trace est exigée par le point de passage des écritures.** Toute
  modification d'alerte ou de dossier traverse une seule fonction, qui réclame la
  description de l'action en paramètre — un appel qui l'oublie ne compile pas.
- **Export CSV du journal** pour un contrôle externe, filtres compris. Date et
  heure en deux colonnes, une colonne « Effacement », et la protection contre
  l'injection de formules déjà en place sur les autres exports.
- **Un contrôle d'accès dans la page elle-même**, en plus de celui du proxy. Il a
  été éprouvé en neutralisant le proxy : la page renvoie alors l'analyste
  d'elle-même, sans servir une ligne du journal.

### Modifié

- **La barre de navigation affiche enfin l'identité connectée.** Son pied de page
  annonçait « Admin Diallo · Administrateur » quel que soit le compte : un
  analyste s'y voyait administrateur. C'est pourtant là qu'on lit sous quel nom
  ses actions vont être inscrites.
- **Elle reçoit un rôle mis en forme, jamais son code.** « SUPERVISEUR » est un
  code de comparaison qui n'a rien à faire dans le HTML servi. Une vérification
  de la phase 2 l'a rappelé en reprenant en défaut la première version du
  câblage.
- **Les actions du store reçoivent l'état antérieur de ce qu'elles modifient.**
  Le store ne connaît que les écarts : il ignore le statut d'une alerte qu'il n'a
  jamais touchée. Le deviner produirait « de — à Résolu ».
- `lib/formats.ts` gagne `formaterDate()` et `formaterHeure()`, dont
  `formaterHorodatage()` est désormais la composition. L'export les veut en deux
  colonnes : « 20/05/2026 à 06:12 » est du texte pour un tableur.

### Arbitrages

| Décision | Pourquoi |
|---|---|
| Le journal est un store séparé | Logé avec les modifications, il aurait été effacé par le bouton dont il doit garder la trace ([ADR-022](docs/DECISIONS.md)) |
| Validé entrée par entrée, pas en bloc | Un statut perdu se repose ; un fait perdu ne se retrouve pas. Une entrée corrompue est écartée seule |
| L'état d'avant vient de l'écran, pas du store | Le store ne connaît que les écarts. Seul l'écran affiche la valeur courante |
| Écrit après l'envoi, jamais avant | Le journal dit ce qui a eu lieu, pas ce qui a été tenté. Contrepartie : les refus ne sont pas tracés |
| Des états lisibles, pas des valeurs typées | Un contrôleur relit le journal sans la console sous les yeux. Contrepartie : il se lit, il ne se recalcule pas |
| Une entrée par réglage déplacé | « Qui a baissé le seuil, et de combien » ; une ligne « paramètres modifiés » n'y répond pas |
| Le motif reste nul quand l'action n'en exige pas | Un motif inventé vaut moins que pas de motif |
| Borné à 500 entrées, et l'écran le dit | Sans borne, l'écriture finirait par échouer — et ferait perdre la modification, pas seulement sa trace ([ADR-022](docs/DECISIONS.md)) |
| La page refait le contrôle du proxy | Le proxy filtre une expression régulière de chemin. Une page réservée doit dire elle-même à qui elle s'adresse ([ADR-023](docs/DECISIONS.md)) |
| L'identité n'est lue que sur les écrans qui écrivent | La poser dans le layout racine aurait rendu dynamiques huit écrans, dont quatre n'écrivent rien |

### Ce que l'écran finit par dire

Une décision annulée disparaît du dossier : le statut revient en arrière, le
motif s'efface, et rien n'indique qu'elle a existé. Le journal, lui, conserve les
deux entrées — la décision et son retrait, chacune avec son motif et son auteur.
Même chose pour une note supprimée, dont le texte ne subsiste plus que là. C'est
la seule page de la console dont le contenu ne se déduit d'aucune autre.

### Dette laissée sciemment

- Le journal est celui d'un navigateur, pas d'un serveur : il ne remonte pas les
  actions faites ailleurs. L'écran l'annonce.
- Les écritures refusées par le service ne sont pas tracées.
- La consultation et l'export du journal ne sont pas eux-mêmes journalisés.
- Les 500 entrées sont une borne de stockage, pas une durée de rétention.

### Vérifié

`typecheck` et `build` sans erreur (16 routes, `/dashboard/admin` comprise) ;
`lint` inchangé à 2 erreurs préexistantes. **36 vérifications** sur le HTML servi
avec trois comptes réellement connectés, **68 tests** unitaires sur les fonctions
pures et le contrat d'une entrée, **38 tests** sur les vrais stores — dont les
trois qui portent la tranche : une décision annulée laisse son motif au journal,
« Réinitialiser » n'efface pas le journal et s'y inscrit, et une écriture refusée
n'y laisse rien. **4 gardes prouvées** en les provoquant. Non-régression des
phases 2, 3, de D1, D2 et D4 rejouée : 17/17, 8/8, 24/24, 45/45, 51/51, 34/34,
72/72, 62/62, 16/16 et 62/62.

---

## Phase 4 — Les différenciateurs · D4 — Simulateur de seuils

Ailleurs, on change le seuil de déclenchement et on attend un mois pour savoir ce
qu'on a cassé. Ici, on le voit avant.

### Ajouté

- **`/simulation`** : un curseur de seuil, et en regard — alertes levées, fraudes
  interceptées, montant couvert, charge de travail induite, chacun avec son écart au
  seuil en vigueur. La courbe précision/rappel porte les vingt points de
  fonctionnement, le seuil simulé et la limite du mesurable.
- **La population de rejeu** (`simulation/data.json`) : les 5 240 demandes de mai 2026,
  **alertées ou non**, distribuées par tranches de 5 points. C'est le point de départ de
  tout l'écran — « qu'aurait donné un seuil plus bas ? » est une question sur les
  demandes qui n'ont pas déclenché d'alerte, et qui ne figurent dans aucune liste
  d'alertes.
- **La frontière entre ce qui est mesuré et ce qui est estimé**, portée dans les données
  et affichée partout : sous le seuil de collecte, rien n'a été instruit. Les compteurs
  distinguent « établies » et « estimées », le montant couvert dit la part qui repose sur
  une estimation, et un trait sur le graphique marque la limite.
- **Le point de fonctionnement recommandé, avec sa règle écrite** : le meilleur équilibre
  précision/rappel parmi les seuils que la cellule peut absorber. La capacité n'est pas
  supposée — elle est constatée sur les 347 dossiers refermés en mai.
- **« Appliquer ce seuil »**, qui écrit le réglage là où il se lit déjà, et le lien
  inverse depuis les Paramètres : « Simuler avant d'appliquer ». Le curseur des réglages
  se déplaçait jusqu'ici à l'aveugle.
- **Quatre contrôles de service**, dont celui de couverture : les tranches doivent
  s'enchaîner de 0 à 100 sans trou ni recouvrement. Il a mordu au premier `build` — les
  tranches s'arrêtaient à 99, et une demande scorée exactement 100 n'aurait été comptée
  nulle part.

### Modifié

- **Le jeu de qualité de D2 a été régénéré.** Le nombre de fraudes manquées qu'il affiche
  **sort** désormais de la population de rejeu, au lieu d'être posé séparément : les deux
  écrans parlent de la même quantité, et il ne peut y en avoir qu'un chiffre.
- **Aucune fraude n'est estimée au-dessus du seuil de collecte.** Les demandes sans
  verdict y sont des dossiers instruits mais pas encore tranchés ; anticiper leur verdict
  reviendrait à compter comme interceptée une fraude que personne n'a établie. Cette
  correction est ce qui fait coïncider exactement les deux écrans.
- `Section` quitte les écrans pour `components/section.tsx` : le dossier d'alerte, la
  qualité et le simulateur la portaient à l'identique. Extraite au moment où la troisième
  copie allait apparaître, comme `lib/formats.ts` en D1.
- `lib/formats.ts` gagne `pourcentage()` — déjà introduit en D2, désormais partagé par
  les deux écrans de mesure.

### Arbitrages

| Décision | Pourquoi |
|---|---|
| Le rejeu porte sur toute la population, pas sur les alertes | Un rejeu bâti sur les alertes ne peut que retrancher : il montrerait la moitié haute de la courbe en laissant croire que c'est toute la courbe ([ADR-020](docs/DECISIONS.md)) |
| Distribution par tranches de 5 points, pas au score près | Vingt lignes au lieu de cinq mille, et c'est la forme sous laquelle un entrepôt rend une distribution. Le pas de simulation est dit à l'écran |
| Une tranche sans fraude trouvée n'en estime aucune | Zéro trouvé sur huit sondées ne prouve pas zéro fraude, mais extrapoler à partir de rien serait pire. Le rappel affiché est donc une borne haute, et le dit |
| La capacité de la cellule entre dans la recommandation | Un seuil qui produit trois fois plus de dossiers que la cellule n'en instruit ne recommande rien : il déplace le problème vers une file d'attente ([ADR-021](docs/DECISIONS.md)) |
| La capacité est constatée, pas supposée | 347 dossiers refermés en mai / 22 jours ouvrés ≈ 16. Une capacité supposée plus basse ferait déclarer intenable un seuil tenu depuis un mois |
| Le contrôle de couverture refuse trou et recouvrement | Sans lui, des demandes disparaîtraient de tous les totaux sans que rien ne le signale, et le simulateur répondrait avec aplomb en ayant tort |

### Ce que l'écran finit par dire

Le meilleur équilibre absolu se trouve à **75 %** — le seuil en vigueur — mais il demande
21,3 dossiers par jour pour une capacité de 16. La recommandation retient donc **80 %**,
en ajoutant la nuance qui compte : un seuil plus bas ferait mieux, mais **le frein est le
nombre d'analystes, pas le modèle**. C'est le genre de conclusion qu'un tableau de bord ne
produit jamais, faute de connaître la charge.

### Dette laissée sciemment

- La capacité de la cellule est une constante : ni effectif variable, ni temps
  d'instruction par type de fraude.
- Le pas de simulation est de 5 points, celui de la distribution fournie.
- Le simulateur ne rejoue que mai 2026.

### Vérifié

`typecheck` et `build` sans erreur (15 routes, `/simulation` comprise) ; `lint` inchangé à
2 erreurs préexistantes. **34 vérifications** sur le HTML servi et **62 tests** unitaires,
dont les neuf contrôles du service prouvés en les provoquant un à un. Le plus important
tient en deux assertions : au seuil en vigueur, le simulateur retrouve **74,8 % de
précision et 81,4 % de rappel** — exactement les chiffres de l'écran de qualité, calculés
depuis un autre jeu de données par un autre chemin. Non-régression des phases 2, 3, de D1
et de D2 rejouée : 17/17, 8/8, 24/24, 45/45, 51/51, 72/72, 62/62 et 16/16.

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
ouverte, **62 tests** sur les fonctions pures, le contrat de décision et les contrôles
du service, et **16 tests** sur la migration du contenu local — le seul endroit du projet
qui puisse détruire le travail d'un utilisateur. Non-régression des phases 2, 3 et de D1 rejouée : 17/17, 8/8, 24/24, 45/45 et
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
