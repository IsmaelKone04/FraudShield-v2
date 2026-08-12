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

---

## ADR-006 — Le store client mémorise les écarts, pas les données

**Contexte.** La phase 2 rend la console modifiable : changer un statut, assigner un
dossier, enregistrer des seuils. Or depuis l'ADR-001, les données arrivent du serveur
en props. Il faut donc un état côté client — sans défaire le rendu serveur.

**Décision.** Le store ne recopie pas les alertes : il n'en mémorise que les
**modifications**, indexées par identifiant.

```ts
{ "A-2026-0125": { statut: "Résolu", modifieLe: "2026-08-11T…" } }
```

Le serveur reste la source ; les crochets de `src/lib/store/use-modifications.ts`
fusionnent les deux au rendu. L'écriture passe par `src/lib/api/mutations.ts`, pendant
exact du client de lecture : en mode démonstration elle ne fait rien et la modification
demeure dans le navigateur ; en mode réel elle part en `PATCH`. Dans les deux cas le
changement s'affiche immédiatement et **revient en arrière si l'envoi échoue** —
l'interface est optimiste, jamais menteuse.

**Conséquence.** Aucune seconde copie du jeu de données ne peut diverger de la
première : c'est précisément le défaut corrigé par l'ADR-004, qu'un store classique
aurait réintroduit. Le jour où l'API accepte les écritures, un envoi réussi vide
l'entrée correspondante et il ne reste rien à resynchroniser.

**Le contenu du navigateur est validé comme une réponse d'API.** Le `localStorage` est
une donnée hors de notre contrôle : écrite par une version antérieure du site,
modifiable à la main dans les outils de développement. Elle passe donc par un schéma
Zod (ADR-002) ; ce qui ne s'y conforme pas est écarté, avec un avertissement, plutôt
que propagé dans le rendu. Douze cas ont été exercés, dont le plus instructif :
appliquer à une alerte le statut « Clôturée », qui n'appartient qu'aux investigations,
est bien refusé.

**Zustand, et non `useReducer` + contexte.** Le point délicat n'est pas l'état, c'est
la réhydratation : le serveur ignore le `localStorage`, si bien qu'un état restauré
trop tôt fait diverger le premier rendu. Le middleware `persist` traite le cas
(`skipHydration`, puis relecture au montage par `<HydratationModifications />`).
L'écrire à la main coûtait une centaine de lignes de plus à l'endroit exact où se
logent les bugs. Coût réel de la dépendance : 1,2 kB.

**Écarté.** Recopier les données du serveur dans le store au montage — la solution la
plus répandue, et celle qui recrée deux sources de vérité.

---

## ADR-007 — L'export CSV est produit par le navigateur

**Contexte.** Trois boutons promettaient un fichier — « Exporter » sur les alertes,
deux cartes de génération rapide sur les rapports — et n'en produisaient aucun. Un
export se fait d'ordinaire côté serveur ; il n'y a ici pas de serveur applicatif à
qui le demander.

**Décision.** Le fichier est construit et téléchargé dans le navigateur, à partir des
données déjà affichées, via un `Blob` et une balise `<a download>`. Aucune dépendance
ajoutée : `src/lib/csv.ts` fait une centaine de lignes, commentaires compris, là où
une bibliothèque d'export en aurait apporté plusieurs dizaines de kilo-octets pour le
même résultat.

**Ce que le format décide, et qui ne se voit pas depuis le code appelant :**

- **Point-virgule**, et non virgule : Excel en configuration française attend le
  séparateur de liste régional. Avec une virgule, tout le fichier atterrit dans la
  première colonne.
- **Marque d'ordre des octets** en tête : sans elle, Excel lit l'UTF-8 comme du
  Windows-1252 et « Établissement » devient « Ã‰tablissement ».
- **Montants exportés bruts** (`2400000`), et non mis en forme (« 2 400 000 FCFA ») :
  une colonne de texte ne se somme pas.
- **Cellules commençant par `=`, `+`, `-` ou `@` neutralisées** par une apostrophe.
  Un tableur les interprète comme des formules ; sur des données qui viendront un jour
  d'établissements extérieurs, c'est une voie d'injection connue.

**L'export suit les filtres.** L'analyste qui a isolé les dossiers à risque élevé
attend ces dossiers-là. Le fichier porte en dernière colonne « Modifié localement » :
une ligne changée dans ce navigateur et transmise à aucun serveur (ADR-006) doit être
reconnaissable dans le fichier qui en sort.

**Écarté.** Générer les PDF annoncés par les deux autres cartes : leur mise en page
suppose un service de rendu côté serveur. Les boutons sont désactivés et l'infobulle
le dit, plutôt que de laisser croire à une génération.

---

## ADR-008 — Un réglage qui ne change rien n'est pas un réglage

**Contexte.** L'écran des paramètres affichait « Enregistré ! » pendant deux secondes
et demie sans rien écrire : au rechargement, tout était revenu. Le seuil d'alerte IA
se déplaçait sans que la liste des alertes en tienne compte. Deux défauts distincts —
les réglages ne survivaient pas, et n'agissaient sur rien.

**Décision.** Les réglages empruntent le chemin des alertes (ADR-006) : le store ne
mémorise que ce qui **s'écarte** du serveur, et le seuil enregistré pilote réellement
l'écran des alertes. Une alerte dont le score passe sous le seuil est atténuée,
marquée « < seuil », et peut être masquée d'un bouton — avec le jeu de démonstration
et le seuil d'origine de 75 %, six alertes sur dix sont concernées.

**Ce que l'écart évite.** Enregistrer le formulaire entier reviendrait à recopier les
dix réglages dans le navigateur ; le jour où le serveur en changerait un, la copie
locale continuerait de l'écraser sans que personne l'ait demandé. Corollaire utile :
remettre un réglage à sa valeur d'origine et enregistrer efface l'entrée au lieu d'y
inscrire une valeur identique.

**Le numéro de format ne bouge pas.** Le champ ajouté au contenu stocké est
facultatif, avec une valeur par défaut : ce qui a été écrit avant continue d'être lu.
Incrémenter `VERSION_STOCKAGE` aurait fait jeter au passage les modifications
d'alertes déjà enregistrées — un dommage réel pour un gain nul.

**Les réglages sans effet sont désactivés, pas masqués.** Cinq interrupteurs de la
maquette ne correspondent à aucun champ du contrat de données, et le mode mock est
fixé au démarrage par une variable d'environnement. Ils restent visibles — ils
décrivent ce que la console ferait — mais inertes, avec l'explication en infobulle.
Sans quoi le bouton « Enregistrer » promettrait de retenir des choix qu'il ignore.

**Remise à zéro séparée.** « Repartir du jeu d'origine », sur l'écran des alertes, ne
touche pas aux réglages : ils ont leur propre bouton, là où on les modifie. Un bouton
ne doit pas défaire en silence une configuration faite ailleurs.

---

## ADR-009 — Un bouton fait quelque chose, ou dit pourquoi il ne fait rien

**Contexte.** Onze commandes de la console ne produisaient aucun effet : « Nouveau
rapport », « Télécharger » et « Aperçu » sur les dix-huit fiches de rapport,
« Nouvelle investigation », « Ouvrir le dossier », « Ajouter une note »,
« Clôturer », et sur l'écran des paramètres « Inviter », « Éditer », « Regénérer »
ainsi qu'un champ d'URL d'API librement modifiable. Un bouton muet est pire qu'un
bouton absent : il promet, et la promesse ne se démentira qu'après le clic.

**Décision.** Chaque commande est arbitrée dans l'une des trois catégories
suivantes — aucune n'est laissée muette.

**Ce qui devient réel.** « Clôturer » clôture, et « Rouvrir le dossier » rouvre :
le store portait `changerStatutInvestigation` et `assignerInvestigation` depuis
l'ADR-006, écrits et testés, mais aucun écran ne les appelait. L'écran des
dossiers rejoint donc celui des alertes — statut modifiable, dossier réassignable,
cartes de statistiques qui suivent, marqueur « Modifié localement », et le même
retour au jeu d'origine. « Nouveau rapport » conduit à « Génération rapide », la
seule chose que la console sache réellement produire (ADR-007).

**Ce qui est retiré.** « Ouvrir le dossier » faisait doublon avec le clic sur la
carte, qui déplie exactement le même contenu, et il n'existe aucun écran de détail
à ouvrir par ailleurs. Un bouton qui duplique le geste voisin n'ajoute pas une
fonction, il ajoute une hésitation.

**Ce qui est désactivé, avec son motif en infobulle.** « Ajouter une note » — le
contrat d'un dossier ne comporte pas de journal de notes. « Nouvelle
investigation », « Inviter », « Éditer » — ce sont des écritures qu'aucune API
n'expose. « Télécharger » sur les dix-huit fiches — le catalogue décrit des
rapports déjà produits, dont le fichier n'est pas stocké ici. Dire *pourquoi*
coûte une phrase et évite au lecteur de conclure que la console est cassée.

**Ce qui est renommé.** « Aperçu » laissait attendre le document. Il n'y en a pas.
Le bouton s'appelle « Détails » et déplie ce que la console connaît réellement de
la fiche — format, taille, pages, auteur, date, téléchargements, catégorie,
étiquettes — en terminant par la raison pour laquelle le fichier, lui, est absent.
Renommer un bouton pour qu'il décrive son effet réel est moins coûteux que de lui
inventer l'effet qu'il annonçait.

**Ce qui cesse d'afficher des valeurs inventées.** Le champ « URL de l'API
backend » était modifiable et affichait une adresse en dur : il montre désormais
`API_URL` en lecture seule, avec sa provenance. L'interrupteur « Mode mock » était
figé à « oui » : il reflète `USE_MOCK`. La ligne « Authentification JWT »
présentait vingt-quatre points pour un jeton qui n'existe pas — la session tient
dans un cookie `httpOnly`, précisément illisible depuis le navigateur ; la ligne
le dit au lieu de mimer un secret.

---

## ADR-010 — Un seul annuaire, et un contrôle qui le garde

**Contexte.** La console tenait trois répertoires de personnes qui ne se
recoupaient pas : trois comptes en `@fraudshield.com` dans `src/lib/utilisateurs.ts`
(ceux qui permettent de se connecter), six agents en `@fraudshield.sn` dans
`parametres/data.json`, et six noms libres — « Agent Sall », « Agent Diop » — dans
`investigations/data.json`. Conséquences visibles : l'écran d'administration
listait six personnes dont aucune ne pouvait ouvrir une session, et un dossier
n'était assignable à personne puisque son titulaire n'existait nulle part
ailleurs. C'est le défaut de l'ADR-004, reparu sur les identités.

**Décision.** `src/lib/utilisateurs.ts` est l'annuaire unique. Le jeu de données
des paramètres décrit exactement ces trois comptes ; le champ `assigne` d'un
dossier porte une adresse, comme `assigneA` sur les alertes, et le schéma l'exige
désormais (`z.email()`). Les dossiers sont donc réassignables avec le sélecteur
déjà écrit pour les alertes, à une différence près, dictée par le contrat : une
alerte peut n'être assignée à personne, un dossier non — l'option « Non assignée »
ne lui est pas proposée.

**Le contrôle, parce que le schéma ne pouvait rien voir.** Les deux annuaires
étaient l'un et l'autre valides ; seulement contradictoires. Zod ne détecte pas
une contradiction entre deux fichiers. `parametresService.getUtilisateurs()`
compare donc, en mode démonstration, identifiant, nom, adresse et rôle de chaque
compte, et lève une `ApiError` nommant l'écart. Comme `/parametres` est prérendu,
**le contrôle s'exécute à la construction** : une divergence réintroduite casse le
build au lieu de s'installer. Vérifié en la provoquant.

En cible, ce contrôle ne s'applique pas : l'API devient l'autorité sur les comptes
et `COMPTES` n'est plus que le répertoire de démonstration.

**Coût assumé.** Le jeu de données perd trois agents et l'écran d'administration
paraît plus vide. Six lignes dont quatre étaient fausses valaient moins que trois
lignes vraies.
---

## ADR-011 — Le dossier étend le résumé, et ses actes doivent en totaliser le montant

**Contexte.** L'écran de détail avait besoin de ce que la liste ne porte pas :
les actes facturés, les tarifs de référence, la chronologie, les références
d'assuré et d'établissement. Deux façons de s'en tirer. Charger tout dans
`GET /alertes` — donc transporter les actes de mille alertes pour en afficher
dix lignes. Ou décrire le dossier comme un objet séparé, au risque qu'il
redéfinisse l'alerte et finisse par la contredire.

**Décision.** `alerteDetailSchema` **étend** `alerteSchema` au lieu de le
redéfinir : un champ ajouté à l'alerte se retrouve dans le dossier sans que
personne ait à y penser. Le jeu local, lui, ne recopie rien — il tient un
`details` indexé par identifiant qui ne contient *que* les compléments, et le
service assemble les deux. Il n'existe donc jamais deux montants, deux dates ou
deux statuts pour la même alerte. C'est l'ADR-004 appliquée avant que le
problème n'existe, plutôt qu'après.

**Le contrôle, encore une fois parce que le schéma ne peut rien voir.** Chaque
ligne d'acte est valide isolément, et pourtant leur somme peut ne pas faire le
montant annoncé en en-tête — l'écran afficherait alors un total qui contredit
le titre, sans que rien ne proteste. `alertesService.getAlerte()` compare donc
la somme des actes au montant de l'alerte et lève une `ApiError` nommant les
deux valeurs. Vérifié en le provoquant : ramener un acte de 520 000 à
519 000 FCFA fait échouer le chargement du dossier avec les deux chiffres en
regard, au lieu d'afficher un total faux.

**Conséquence.** Enrichir le jeu de données coûte un peu plus cher : ajouter un
acte oblige à ajuster le montant de l'alerte, ou l'inverse. C'est précisément ce
qu'on veut — un jeu de démonstration incohérent est un jeu de démonstration qui
se voit à l'écran le jour de la démonstration.

---

## ADR-012 — Une décision se motive, et c'est elle qui fixe le statut

**Contexte.** Le statut d'une alerte se changeait déjà d'une liste déroulante,
sans rien dire de plus. Or « Résolu » ne distingue pas une fraude établie d'un
faux positif — deux issues opposées, réduites au même mot. La phase 4 attend
justement de savoir laquelle des deux, pour mesurer la dérive du modèle (D2) et
pour tenir une piste d'audit (D5).

**Décision.** Trois issues, et elles ne se recouvrent pas : **fraude confirmée**,
**classée sans suite**, **pièce demandée**. Chacune porte un **motif
obligatoire** — une décision sans motif n'est opposable à aucun établissement et
ne vaut rien dans un contentieux — ainsi que son auteur et son horodatage.

Le statut n'est pas choisi à part : il **découle** de la décision, par une table
unique (`src/lib/decisions.ts`). Laisser l'analyste décider *et* choisir le
statut permettrait d'enregistrer « fraude confirmée » sur un dossier resté « en
cours ». La liste déroulante de statut reste là pour le tri courant ; la
décision, elle, engage.

**Revenir en arrière rend l'état antérieur, il ne le devine pas.** La décision
mémorise le statut qu'avait le dossier au moment où elle a été prise. Sans lui,
annuler obligerait à supposer un statut de retour — et la phase 4 attend de
toute façon un avant/après pour son journal d'audit.

**Ce qui est laissé à la phase 4.** « Classée sans suite » n'est pas encore
qualifiée par cause (seuil trop bas, contexte médical légitime, doublon
administratif) : c'est P4-6, et c'est de cette qualification que vivra le
registre des faux positifs. Le motif libre en tient lieu d'ici là.

**Notes et motif ne sont pas la même chose.** Le fil de notes internes sert
l'instruction — un constat, un échange, une pièce reçue. Le motif de décision
sort du service. Les confondre reviendrait à envoyer une note de couloir à
l'établissement mis en cause.

---

## ADR-013 — Un identifiant inconnu rend la page « introuvable », pas le statut 404

**Contexte.** `/alertes/A-2026-9999` doit se comporter comme une adresse
inexistante. `notFound()` est appelé dès que le service répond `null`, et la
page « introuvable » maison s'affiche bien — mais la réponse porte le statut
**200**, pas 404.

**Cause, mesurée et non supposée.** `src/app/loading.tsx` place une frontière de
streaming à la racine de l'application. L'en-tête de la réponse part donc avant
que le composant serveur n'ait fini, c'est-à-dire avant `notFound()` : le statut
est déjà écrit quand la décision se prend. Vérifié en retirant temporairement le
fichier — la même requête répond alors 404, et le remettre restaure le 200.

**Décision : garder l'état de chargement, assumer le 404 souple.** Supprimer
`loading.tsx` corrigerait le statut au prix de l'indicateur de chargement sur
les six écrans. Le déplacer segment par segment ne suffirait pas : une frontière
posée sur `alertes/` couvre aussi `alertes/[id]`. Il faudrait un groupe de
routes pour isoler la liste du dossier — de la tuyauterie pour un code de statut,
sur une application déclarée `noindex`, sans consommateur externe et sans
référencement à préserver.

**Ce que ça coûte, et quand il faudra le payer.** Un client automatisé — un
robot, un test de bout en bout, une supervision — verrait 200 là où il attend
404. Le jour où l'un de ces trois apparaît, le groupe de routes devient
justifié. D'ici là, l'utilisateur voit la bonne page, ce qui est ce qui compte.
