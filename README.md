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
| **Qualifier un faux positif** | `/alertes/[id]` | Un classement sans suite exige sa cause : elle part au registre et déplace les mesures de `/qualite` |
| **Écrire une note interne** | `/alertes/[id]` | Fil horodaté et signé, versé à la chronologie |
| **Imprimer la note d'explication** | `/alertes/[id]/note` | Document autonome, à enregistrer en PDF depuis le navigateur |
| Assigner une alerte, réassigner un dossier | `/alertes`, `/investigations` | Aux comptes ci-dessus, avec filtre « Mes dossiers » |
| Clôturer ou rouvrir un dossier | `/investigations` | |
| Exporter en CSV | `/alertes`, `/investigations`, `/rapports`, `/dashboard/admin` | Fichier produit par le navigateur |
| **Relire la piste d'audit** | `/dashboard/admin` | Toute action métier, avec son acteur, son avant/après et son motif — réservé au rôle administrateur |
| **Simuler puis appliquer un seuil** | `/simulation` | Curseur, effets en direct sur les alertes et la charge, puis écriture du réglage |
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

## 🔍 Pourquoi ce score — et pas seulement « 94 »

C'est le premier des cinq différenciateurs du projet, et le reproche n° 1 fait aux outils
du marché : ils affichent un score et s'arrêtent là. Un analyste ne peut alors ni le
défendre devant un établissement, ni le contester devant son responsable.

Sur `/alertes/[id]`, le score est **décomposé facteur par facteur** :

- chaque facteur porte une **contribution signée en points**, ce qui aggrave comme ce qui
  atténue, avec la valeur observée, la valeur attendue et **la source de la mesure** ;
- les contributions **referment le score** — valeur de base plus contributions égale le
  score affiché, et le service refuse de servir un dossier où ce n'est pas vrai
  ([ADR-014](docs/DECISIONS.md)) ;
- une **phrase en français** est composée depuis les facteurs dominants, à l'identique d'un
  affichage à l'autre : *« Score très élevé (94/100), principalement parce que le montant
  facturé représente 2,5 fois le tarif de la nomenclature pour les mêmes actes… »* — aucun
  modèle de langue n'intervient, et c'est délibéré ([ADR-015](docs/DECISIONS.md)) ;
- le dossier est **replacé face à trois références** : l'établissement, l'acte, la période,
  chacune avec son effectif ;
- **ce qui joue en faveur du dossier est dit.** L'alerte `A-2026-0119` ne reste à 22 que
  parce que le cabinet a déclaré son erreur de codage avant tout contrôle.

Le tout se réunit dans une **note d'explication imprimable** (`/alertes/[id]/note`) : la
pièce qu'un gestionnaire joint à une contestation. Le navigateur en produit le PDF ;
aucune bibliothèque de génération n'est embarquée ([ADR-016](docs/DECISIONS.md)).

Le format des facteurs est celui d'une **valeur SHAP** — contribution signée rapportée à
une valeur de base. Le jour où le service de détection renvoie de vraies valeurs, il
remplit ce contrat sans qu'il bouge.

## 🔁 Ce que devient un faux positif

Deuxième différenciateur. Ailleurs, une alerte écartée disparaît dans un statut « clos » —
et le modèle qui l'a produite continue d'en produire de semblables. Ici, elle devient une
mesure.

- **Une clôture sans suite est qualifiée.** Cinq causes typées, et l'écran refuse
  d'enregistrer tant que l'une n'est pas retenue : un motif rédigé ne s'agrège pas
  ([ADR-017](docs/DECISIONS.md)).
- **Les causes sont séparées selon où elles se corrigent.** « Seuil trop bas » et
  « contexte médical » se règlent dans le modèle ; « doublon administratif », « donnée de
  référence erronée » et « régularisation déjà intervenue » se règlent ailleurs. Un taux de
  faux positifs qui mélange les deux ne se corrige nulle part.
- **`/qualite` juge le détecteur, pas la fraude** : précision, rappel estimé et taux de
  faux positifs sur six mois, par mois et par type de fraude, le registre des causes, et
  les établissements dont les alertes finissent le plus souvent écartées.
- **Le rappel est présenté comme une estimation**, avec la base du sondage à côté du
  chiffre — on ne mesure pas les fraudes qu'on n'a pas signalées.
- **Un bandeau prévient quand le modèle décroche** : *« Le modèle décroche sur Double
  facturation — 32,4 % de faux positifs imputables au modèle sur mai 2026, pour un seuil
  de 25 % »*. Chaque type de fraude a son propre seuil, justifié ; rien n'est signalé sous
  dix dossiers tranchés ([ADR-019](docs/DECISIONS.md)).
- **La boucle se referme à l'écran** : classer un dossier sans suite dans la console
  déplace le registre et la courbe du mois ([ADR-018](docs/DECISIONS.md)).

Tout y est **calculé depuis des comptages** de dossiers, jamais lu comme un taux déjà
fait : chaque pourcentage affiché se retrouve à la main depuis le tableau juste en dessous.

## 🎚️ Ce qu'un autre seuil aurait donné

Troisième différenciateur. Le seuil de déclenchement est le réglage le plus lourd de
conséquences de toute la chaîne, et c'est presque partout un curseur qu'on déplace à
l'aveugle : on change, et on attend un mois pour savoir ce qu'on a cassé.

Sur `/simulation`, le curseur affiche en regard, pour chaque seuil : les alertes levées,
les fraudes interceptées, le montant couvert, la charge de travail induite en dossiers par
jour — chacun avec son **écart au seuil en vigueur**.

- **Le rejeu porte sur toute la population**, pas sur la liste des alertes : 5 240 demandes
  de mai 2026, alertées ou non. « Qu'aurait donné un seuil plus bas ? » est une question sur
  les demandes qui n'ont **pas** déclenché d'alerte ([ADR-020](docs/DECISIONS.md)).
- **Ce qui est mesuré et ce qui est estimé ne sont jamais mélangés.** Sous le seuil de
  collecte, aucun de ces dossiers n'a été instruit : les compteurs distinguent « établies »
  et « estimées », et un trait sur la courbe marque la limite.
- **Le rappel est une borne haute, et le dit.** Une tranche de score où le sondage n'a
  trouvé aucune fraude n'en fait estimer aucune — ce qui n'est pas la même chose que
  d'affirmer qu'il n'y en a pas.
- **Le point recommandé vient avec sa règle**, écrite à l'écran : le meilleur équilibre
  précision/rappel *parmi les seuils que la cellule peut absorber*
  ([ADR-021](docs/DECISIONS.md)).
- **« Appliquer ce seuil »** écrit le réglage là où il se lit, et les Paramètres renvoient
  au simulateur. La boucle pilotage → configuration se referme.

Ce que l'écran finit par dire est plus intéressant que le seuil qu'il désigne : le meilleur
équilibre absolu est à **75 %**, le seuil en vigueur — mais il demande 21,3 dossiers par
jour pour une capacité constatée de 16. La recommandation retient donc **80 %**, en disant
pourquoi : *le frein est le nombre d'analystes, pas le modèle.*

> **Point de contrôle.** Au seuil en vigueur, le simulateur retrouve **74,8 % de précision
> et 81,4 % de rappel** — exactement les chiffres de `/qualite` pour mai 2026, calculés
> depuis un autre jeu de données par un autre chemin. Deux écrans, un seul résultat ; un
> test le vérifie au chiffre près.

## 🧾 Ce qui reste d'une décision annulée

Quatrième différenciateur, et une exigence de conformité. Une console qui décide doit
pouvoir dire qui a décidé — surtout quand la décision a été défaite.

Quand un analyste revient sur une décision, le dossier retrouve son statut d'avant, le
motif s'efface, et plus rien n'indique qu'elle a existé. C'est le comportement attendu du
dossier. Ce n'est pas le comportement acceptable d'un système auditable.

Sur `/dashboard/admin`, réservé au rôle administrateur, chaque action métier est inscrite
avec son acteur, son horodatage, son état d'avant, son état d'après, et son motif quand
l'action en exige un.

- **Le journal est un store à part, en ajout seul.** Logé avec les modifications, il aurait
  été effacé par « Réinitialiser » — le bouton dont il doit garder la trace. La remise à
  zéro y est donc journalisée, et le journal lui survit ([ADR-022](docs/DECISIONS.md)).
- **Aucune écriture ne peut y échapper.** Toute modification d'alerte ou de dossier
  traverse une seule fonction, qui réclame la description de l'action en paramètre : un
  appel qui l'oublie ne compile pas.
- **L'état d'avant vient de l'écran, pas du store.** Le store ne connaît que les écarts :
  il ignore le statut d'une alerte qu'il n'a jamais touchée, et le deviner produirait
  « de — à Résolu ».
- **Le journal dit ce qui a eu lieu, pas ce qui a été tenté.** L'entrée est écrite après
  l'envoi : une modification refusée par le service est défaite à l'écran, et n'y laisse
  rien.
- **Une entrée corrompue est écartée seule.** Un statut perdu se repose ; un fait perdu ne
  se retrouve pas — le journal ne repart donc jamais de zéro.
- **La page refait le contrôle d'accès du proxy.** Une page réservée doit dire elle-même à
  qui elle s'adresse : le proxy filtre une expression régulière de chemin, qu'un
  déplacement de route suffirait à contourner ([ADR-023](docs/DECISIONS.md)).
- **Export CSV** du journal, filtres compris, pour un contrôle externe.

> **Ce que le journal seul conserve.** Une décision annulée y figure deux fois — la
> décision et son retrait, chacune avec son motif et son auteur. Une note supprimée y
> conserve son texte. C'est la seule page de la console dont le contenu ne se déduit
> d'aucune autre.

**Limite, affichée sur l'écran :** ce journal est celui d'un navigateur. Il enregistre les
actions faites depuis cette console, quel que soit le compte connecté, et ne remonte pas
celles faites ailleurs — faute d'API à qui les transmettre. Une piste d'audit opposable se
tiendrait côté serveur ; le mécanisme serait le même, écrit au même endroit.

## 🧱 Structure

Chaque écran suit le même découpage : `page.tsx` (serveur) charge via le service et
passe les données à `*-client.tsx` (client), qui porte les filtres et l'interaction.

```
src/
├── app/
│   ├── api/auth/[...nextauth]/   # Montage des routes NextAuth
│   ├── error.tsx  loading.tsx  not-found.tsx
│   ├── dashboard/        # Vue d'ensemble : KPIs, tendances, dernières alertes
│   │   └── admin/        # Journal d'audit, réservé au rôle ADMINISTRATEUR
│   ├── alertes/          # Liste des alertes, filtres, statuts
│   │   └── [id]/         # Le dossier : score expliqué, actes, chronologie, décision, notes
│   │       └── note/     # La note d'explication, mise en page pour l'impression
│   ├── investigations/   # Dossiers en cours d'instruction
│   ├── analyses/         # Analyses par type de fraude
│   ├── qualite/          # Qualité du modèle : faux positifs, dérive, registre
│   ├── simulation/       # Simulateur de seuils : rejeu de la population
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
│   ├── explication.ts    # Des facteurs à la phrase en français (déterministe)
│   ├── journal.ts        # Piste d'audit : libellés, tri, filtres, relecture du stocké
│   ├── qualite.ts        # Précision, rappel, dérive — calculés depuis des comptages
│   ├── simulation.ts     # Rejeu à seuil variable, courbe, point recommandé
│   ├── decisions.ts      # Ce qu'une décision entraîne, et les causes de faux positif
│   ├── formats.ts        # Montants, horodatages, taux — sans `toLocaleString`
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

Le rôle est porté par le jeton JWT et exposé dans la session. Le préfixe
`/dashboard/admin` est réservé au rôle `ADMINISTRATEUR`, et **la page vérifie la même
chose de son côté** : le proxy filtre une expression régulière de chemin, qu'un
déplacement de route suffirait à contourner. Une page réservée doit dire elle-même à qui
elle s'adresse ([ADR-023](docs/DECISIONS.md)).

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
- **Le rôle ouvre un écran, il ne restreint aucune action.** Il est porté par le JWT,
  exposé dans la session, et réserve `/dashboard/admin` à l'administrateur — mais un
  analyste peut toujours réassigner un dossier comme un superviseur. Décider qui a le
  droit de quoi reste une règle métier à trancher ; ce que la console sait faire pour
  l'instant, c'est **dire qui a fait quoi**, ce qui n'est pas la même chose.
- **Le score n'est pas recalculé depuis ses facteurs** : la décomposition explique le score
  du jeu de données, elle ne le produit pas. Modifier une contribution ne changera donc pas
  le score — le contrôle de cohérence refusera simplement le dossier. Le rejeu à seuil
  variable (D4) est ce qui rendra le calcul vivant.
- **Les énoncés des facteurs sont écrits dans le jeu de données**, pas composés depuis les
  valeurs mesurées. Fabriquer une proposition française correcte (accords, élisions) à
  partir de nombres bruts est un problème à part entière ; en cible, c'est l'API qui les
  fournit.
- **La dérive est mesurée sur le dernier mois observé**, pas sur une fenêtre glissante de
  trente jours : le jeu de données est mensuel. Les décisions prises dans la console y sont
  rattachées (mai 2026) plutôt qu'au mois réel — ouvrir un mois vide entre les deux ferait
  plonger toutes les courbes sans que le modèle y soit pour rien. L'écran l'écrit dès
  qu'une décision locale est comptée.
- **Le bandeau de dérive du tableau de bord ne compte pas les décisions locales**, celui de
  `/qualite` si. Le tableau de bord est rendu côté serveur, et les y mêler imposerait de le
  passer côté client pour un seul bandeau.
- **Le simulateur ne rejoue que mai 2026**, par tranches de 5 points de score — la
  finesse à laquelle la distribution est fournie. La capacité de la cellule y est une
  constante : ni effectif variable, ni temps d'instruction par type de fraude.
- **Le journal d'audit est celui d'un navigateur**, pas d'un serveur : il enregistre les
  actions faites depuis cette console, quel que soit le compte connecté, et ne remonte pas
  celles faites ailleurs. Les écritures refusées par le service n'y figurent pas — le
  journal dit ce qui a eu lieu, pas ce qui a été tenté — et la consultation du journal
  n'est pas elle-même journalisée. Il est borné à 500 entrées, ce qui est une contrainte
  de stockage et non une durée de rétention ; l'écran l'annonce dès que la borne est
  atteinte.
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
| **P4** | Explicabilité du score ✅ · boucle de rétroaction ✅ · simulateur de seuils ✅ · piste d'audit ✅ · graphe de réseaux | en cours |
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
