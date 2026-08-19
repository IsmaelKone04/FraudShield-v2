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

---

## ADR-014 — Le score s'explique par une décomposition additive, et elle doit refermer le score

**Contexte.** L'écran du dossier affichait « 94 / 100 » et s'arrêtait là. C'est
le reproche n° 1 fait aux outils du marché : un analyste ne peut ni défendre ce
chiffre devant un établissement, ni le contester devant son responsable. Il
fallait dire *pourquoi* 94.

**Décision : la forme d'une valeur SHAP, dès maintenant.** Chaque facteur porte
une **contribution signée en points de score**, rapportée à une `valeurDeBase`
commune à tous les dossiers — le score moyen de l'ensemble des demandes
analysées, et non une propriété de celui-ci. C'est exactement ce que produit un
modèle expliqué par valeurs de Shapley. Le jour où l'API renvoie de vraies
valeurs, elle remplit ce contrat sans qu'il bouge ; d'ici là un moteur de règles
pondérées l'alimente, et rien à l'écran ne dépend duquel des deux il s'agit.

**Il n'y a pas de champ `sens`.** La feuille de route en prévoyait un
(aggravant / atténuant) à côté de la contribution. Deux représentations du même
fait finissent par se contredire — un « aggravant » à contribution négative
serait un état impossible que rien n'empêcherait d'écrire. Le signe suffit, et
l'écran en déduit la couleur, la flèche et le côté de l'axe.

**Le contrôle, parce que le schéma ne peut rien en dire.** Chaque facteur est
valide isolément et pourtant leur somme peut ne pas faire le score affiché.
L'explication expliquerait alors *un autre* chiffre que celui montré — c'est
pire que pas d'explication du tout, puisqu'elle se présente comme opposable en
ne l'étant pas. `alertesService.getAlerte()` vérifie donc que
`valeurDeBase + Σ contributions === scoreIA` et refuse le dossier sinon.
Vérifié en le provoquant : ramener une contribution de 34 à 33 fait échouer le
chargement sur *« Les facteurs de A-2026-0125 totalisent 93 points (base 18)
alors que le score est de 94 »*, au lieu d'afficher une décomposition qui ne
tombe pas juste. Même raisonnement que l'ADR-010 et l'ADR-011.

**Conséquence assumée.** Enrichir le jeu de données coûte plus cher : ajouter un
facteur oblige à en retirer les points ailleurs, ou à bouger le score. C'est
voulu. Les dix décompositions ont d'ailleurs été écrites par script plutôt qu'à
la main, précisément parce qu'une somme fausse ne se voit pas dans neuf cents
lignes de JSON.

**Pas de bibliothèque de visualisation.** Cinq barres divergentes à axe centré
se font avec deux `div` et une largeur en pourcentage. Recharts, déjà présent,
n'a pas de barre divergente ; en importer une autre coûterait des kilo-octets
pour faire moins bien.

---

## ADR-015 — La phrase d'explication est composée, pas générée

**Contexte.** Les barres disent le poids de chaque facteur, mais ce n'est pas ce
qu'on recopie dans un courrier. Il fallait une phrase en français : « Score très
élevé (94/100), principalement parce que le montant facturé représente 2,5 fois
le tarif de la nomenclature… ».

**Décision : un assemblage déterministe, aucun modèle de langue.** Chaque
facteur porte un `enonce` — une proposition insérable dans une phrase — et
`phraseExplicative()` enchaîne les trois aggravants dominants après « parce
que », puis au plus deux atténuants après « En sens inverse ». La même
décomposition donne toujours la même phrase, mot pour mot.

C'est la condition pour qu'elle figure dans une pièce de dossier. Une phrase
reformulée à chaque affichage rendrait deux impressions du même dossier
différentes, et il n'y aurait plus rien à opposer à qui que ce soit. Un appel à
un modèle ajouterait par-dessus une latence, un coût, une dépendance réseau et
un risque d'invention — sur le document dont la fonction est précisément de
n'avancer que ce qui est mesuré.

**Ce qui joue en faveur du dossier est dit.** Les atténuants apparaissent dans
la phrase, dans les barres et dans la note. Les taire produirait un
réquisitoire, pas une explication — et le cas est réel : l'alerte A-2026-0119 ne
reste à 22 que parce que le cabinet a déclaré son erreur de codage avant tout
contrôle. Le cas limite où un dossier n'a *aucun* aggravant est traité
explicitement : la phrase le dit, plutôt que de lui inventer une charge.

**Limite.** Les énoncés sont écrits à la main dans le jeu de données. En cible,
c'est l'API qui les fournira, ou une table de gabarits par code de facteur — les
`code` sont là pour ça. Composer une proposition française correcte à partir de
valeurs brutes (accords, élisions, nombres en lettres) n'est pas un problème
d'affichage, et le résoudre à moitié se verrait immédiatement.

---

## ADR-016 — La note d'explication est imprimée par le navigateur, pas fabriquée par une bibliothèque

**Contexte.** P4-5 demande la pièce qu'un gestionnaire joint à un dossier de
contestation : objet, décomposition du score, actes et tarifs de référence,
comparaisons, décision. En PDF.

**Décision : une route à part, rendue en clair, imprimée par le navigateur.**
`/alertes/{id}/note` est une page autonome — une adresse se transmet, se met en
favori et s'imprime, un bloc caché dans l'écran du dossier ne fait aucun des
trois. Elle se rend en noir sur blanc **à l'écran comme sur le papier** : la
page affichée est exactement la page imprimée. Une note sombre qu'une feuille de
style redresserait au moment d'imprimer se découvrirait cassée après coup, sur
du papier.

**Aucune dépendance de génération de PDF.** `jsPDF`, `pdfmake` ou un rendu
serveur par navigateur sans interface pèsent de quelques centaines de kilo-octets
à plusieurs dizaines de mégaoctets, et refont moins bien ce que « Enregistrer au
format PDF » fait déjà : pagination correcte, polices embarquées, texte
sélectionnable, accessible et recherchable. Le seul travail restant était le
`@media print` de `globals.css` et quelques `break-inside-avoid` — une section
coupée en deux par un saut de page se relit mal, et une note de contestation se
lit une fois.

**Le document dit d'où il vient.** En mode démonstration, un bandeau
« données fictives, sans valeur probante » est imprimé en tête, et
`print-color-adjust: exact` empêche le navigateur de le supprimer avec les
aplats. Produire un document d'apparence officielle à partir de données
inventées sans le dire serait le seul vrai défaut possible de cet écran.

**Ce que ça coûte.** L'en-tête et le pied de page du navigateur (URL, date,
numéro de page) s'ajoutent au document et ne se désactivent que dans la boîte de
dialogue d'impression — cela ne se pilote pas depuis la page. Et le fichier
n'est pas produit sans intervention : il n'y a pas d'« envoyer la note par
courriel » automatisé. Le jour où un envoi automatique est demandé, c'est un
rendu côté serveur qu'il faudra, et l'arbitrage sera à refaire.

---

## ADR-017 — Un classement sans suite non qualifié ne compte pour rien

**Contexte.** La barre de décision de la phase 3 refermait un dossier avec un
motif libre. Un motif libre ne s'agrège pas : cinquante clôtures produisent
cinquante phrases, et le modèle qui a produit ces cinquante fausses alertes
continue de produire les mêmes. C'est exactement ainsi qu'un faux positif
disparaît dans un statut.

**Décision : la cause est typée, et obligatoire — mais seulement là où elle a
un sens.** Un classement sans suite porte une cause parmi cinq ; une fraude
confirmée ou une demande de pièce n'en porte aucune. La règle est écrite dans le
contrat (`decisionSchema`), pas dans l'écran : elle vaut donc aussi pour ce que
le navigateur a enregistré hier et pour ce que l'API renverra demain. C'est une
règle **entre deux champs**, qu'aucun des deux ne peut porter seul — un
`superRefine` la tient, là où les contrôles croisés des ADR-010, ADR-011 et
ADR-014 devaient vivre dans le service parce qu'ils portaient sur deux
collections différentes.

**Les causes ne se valent pas, et le champ qui le dit est le plus important.**
`imputableAuModele` sépare ce qui se corrige en reprenant le modèle (seuil trop
bas, contexte médical absent des variables) de ce qui se corrige ailleurs
(doublon transmis deux fois par l'établissement, tarif de référence erroné,
régularisation déjà intervenue). Un taux de faux positifs qui mélange les deux
ne se corrige nulle part : il réclamerait un réentraînement pour un problème de
saisie. Toute la mesure de D2 repose sur cette distinction.

**Le contenu déjà enregistré est repris, pas jeté.** Un classement sans suite
écrit avant ce changement ne porte pas de cause et ne satisfait plus le contrat.
La validation d'entrée du store (ADR-002) aurait alors écarté **tout** le
contenu local — statuts, assignations et notes compris — pour un champ manquant
sur un seul dossier. `VERSION_STOCKAGE` passe donc à 2 et une migration défait
ces décisions-là et rien d'autre, exactement comme le ferait « Revenir sur la
décision » : le dossier retrouve son statut antérieur. Ce qui ne peut plus être
représenté est annulé, jamais complété d'une cause qu'aucun analyste n'a
choisie.

**Ce que ça coûte.** Une clôture demande un clic de plus, et l'écran refuse
d'enregistrer tant qu'il n'a pas été fait. C'est le prix de la seule chose qui
rende le registre exploitable — et l'infobulle du bouton dit lequel des deux
champs manque, plutôt que de laisser un bouton grisé sans explication.

---

## ADR-018 — La qualité se calcule à partir de comptages, et la boucle se referme à l'écran

**Contexte.** Mesurer un détecteur, ce n'est pas mesurer la fraude. L'écran des
analyses compte les cas suspects ; celui-ci juge ce que valaient les alertes une
fois les dossiers refermés. Il fallait décider ce que le serveur envoie.

**Décision : des comptages, jamais des taux.** Le contrat ne porte que des
nombres de dossiers — clos, confirmés, écartés, non concluants, répartis par
cause. Précision, rappel et taux de faux positifs se calculent dans
`lib/qualite.ts`, à partir d'eux. Un taux servi tout fait ne se recoupe avec
rien : c'est ainsi qu'un tableau de bord finit par afficher une précision qui ne
correspond à aucune ligne du tableau juste en dessous. Ici, tout chiffre affiché
se retrouve à la main depuis le tableau.

**Le dénominateur est les dossiers *tranchés*, pas les dossiers clos.** Un
dossier refermé sans conclusion n'est ni une réussite ni un échec du modèle. Le
compter ferait baisser la précision à chaque dossier abandonné faute de pièces,
ce qui n'apprend rien sur le détecteur.

**Un taux absent s'écrit « — », jamais « 0 % ».** Un mois sans dossier tranché
n'a pas une précision nulle : il n'en a pas. Les fonctions renvoient `null`, et
la courbe laisse un trou plutôt que de plonger sans qu'il ne se soit rien passé.

**Le rappel est estimé, et l'écran le dit à côté du chiffre.** On ne connaît pas
les fraudes qu'on n'a pas signalées ; elles ne se mesurent que par sondage. Le
jeu porte donc `manquesEstimes` **et** `baseEstimation` — « Sondage manuel sur
500 demandes de mai 2026, tirées parmi celles qui n'ont pas déclenché
d'alerte » — et le second est affiché sous le premier. Un rappel sans sa base
d'estimation est un chiffre qu'on ne peut ni contester ni reproduire.

> **Complété en D4.** `manquesEstimes` n'est plus posé ici : il **sort** de la
> population de rejeu (`simulation/data.json`), où le sondage de mai est
> détaillé tranche de score par tranche de score. Les deux écrans parlent de la
> même quantité, et il ne peut y en avoir qu'un chiffre (ADR-020).

**Deux contrôles, parce que le schéma ne peut rien en dire.** Chaque case est
valide isolément et pourtant les trois issues peuvent ne pas redonner le nombre
de dossiers clos, et la répartition par cause ne pas redonner le nombre de faux
positifs. Le service refuse alors le jeu. Vérifié en le provoquant, sur les
trois règles — dont *« Décembre 2025, Acte incohérent : 10 faux positifs
répartis par cause pour 9 constatés »*. Une mesure fausse est pire qu'une mesure
absente : on décide dessus. Un troisième contrôle refuse qu'un type de fraude
soit mesuré sans seuil de dérive — là, c'est le silence qui serait dangereux.

**La boucle se referme à l'écran.** Les décisions prises dans cette console
entrent dans la mesure : classer un dossier sans suite déplace le registre et la
courbe du mois. Sans cela, la qualification exigée à la clôture n'irait nulle
part et cet écran ne serait qu'un tableau de plus. `piece_demandee` n'entre dans
aucun compte — le dossier reste ouvert, il n'a rien tranché.

**Conséquence assumée.** Ces décisions sont rattachées au dernier mois observé
(mai 2026) et non au mois réel : le jeu de démonstration s'y arrête, et ouvrir
un mois vide entre les deux ferait plonger toutes les courbes pour une raison
qui n'a rien à voir avec le modèle. L'écran l'écrit, en toutes lettres, dès
qu'une décision locale est comptée. Le tableau de bord, lui, ne les compte pas :
il est rendu côté serveur, et les y mêler imposerait de le passer côté client
pour un bandeau.

---

## ADR-019 — La dérive ne se signale que sur ce qui se corrige, et seulement quand elle porte

**Contexte.** P4-9 demande un bandeau quand le taux de faux positifs d'un type
de fraude dépasse son seuil. Trois façons de rater cet objet : crier pour du
bruit qui ne regarde pas le modèle, crier sur trois dossiers, ou rester affiché
en permanence jusqu'à ce que plus personne ne le lise.

**Seuls les faux positifs imputables au modèle comptent.** Réclamer un
réentraînement parce qu'un établissement a transmis deux fois la même demande
n'aurait aucun sens : cette alerte-là était juste. Le taux qui déclenche le
bandeau ne retient donc que les causes marquées `imputableAuModele` (ADR-017).
L'écran affiche les deux — le taux brut et sa part corrigeable — parce que le
premier intéresse le gestionnaire et le second l'équipe qui reprend le modèle.

**Le seuil est propre à chaque type de fraude.** Un seuil unique ferait crier
« Acte incohérent », dont la cohérence demande un avis médical que le moteur n'a
pas, et dormir « Usurpation identité », dont le rapprochement est déterministe.
Chaque seuil porte sa justification dans le jeu de données, et le bandeau
l'affiche : sans elle, l'analyste n'a aucun moyen de juger s'il faut reprendre
le modèle ou relever le seuil.

**En deçà de dix dossiers tranchés, rien n'est signalé.** Deux dossiers écartés
sur trois font 67 %, et ne disent rien. Le bandeau indique d'ailleurs toujours
le nombre de dossiers sur lequel il se fonde.

**Le bandeau ne s'affiche que lorsqu'il a quelque chose à dire.** Pas de version
verte « tout va bien » : un bandeau permanent finit par ne plus être lu, et le
jour où il vire au rouge personne ne le voit. Il est rendu côté serveur, sur le
tableau de bord — là où l'analyste arrive — et sur l'écran de qualité, où il est
suivi du registre qui permet d'agir.

**Limite.** La dérive est mesurée sur le dernier mois observé, pas sur une
fenêtre glissante de trente jours : le jeu est mensuel. Avec des dates de
clôture réelles, la même fonction prendrait une fenêtre en paramètre — c'est le
seuil et l'imputabilité qui font la décision, pas le découpage du calendrier.

---

## ADR-020 — Le rejeu porte sur toute la population, et ce qu'on n'a pas instruit est estimé, jamais mesuré

**Contexte.** « Qu'aurait donné un seuil plus bas ? » est une question sur les
demandes qui **n'ont pas** déclenché d'alerte. Elles ne figurent donc nulle part
dans la liste des alertes, et un simulateur bâti dessus ne pourrait que
retrancher — jamais ajouter. Il montrerait la moitié haute de la courbe et
laisserait croire que c'est toute la courbe.

**Décision : une population de rejeu, distribuée par tranches de 5 points.**
`simulation/data.json` porte les 5 240 demandes de mai 2026, alertées ou non,
regroupées par tranche de score. Vingt lignes plutôt que cinq mille : c'est la
forme sous laquelle un entrepôt de données rend une distribution, et le rejeu
n'est qu'une somme cumulée. Le pas de simulation est donc de 5 points, et
l'écran le dit — découper une tranche au jugé donnerait un chiffre que rien ne
soutient. Le service refuse d'ailleurs un seuil en vigueur qui ne tomberait pas
sur une borne.

**La frontière du mesurable est portée dans les données.** Au-dessus du seuil
qui était en vigueur pendant la collecte, les issues sont **mesurées** : ces
dossiers ont été instruits. En dessous, personne n'a rien regardé, sauf le
sondage mensuel de 500 demandes — le même que celui dont l'écran de qualité
affiche déjà la base. Tout ce que le simulateur avance sous cette barre est donc
une **estimation**, distinguée partout : dans les compteurs (« 232 établies ·
17 estimées »), dans le montant couvert, et par un trait sur le graphique.

**Rien n'est estimé au-dessus du seuil.** Les demandes sans verdict y sont des
dossiers instruits mais pas encore tranchés : leur verdict viendra. L'anticiper
reviendrait à compter comme interceptée une fraude que personne n'a établie.

**La convention d'estimation est délibérément conservatrice.** Une tranche où le
sondage n'a trouvé aucune fraude n'en fait estimer aucune. Zéro trouvé sur huit
sondées ne prouve pas zéro fraude, mais extrapoler à partir de rien serait pire.
Conséquence assumée et écrite à l'écran : le nombre de fraudes manquées est une
borne **basse**, et le rappel affiché une borne **haute**.

**Le contrôle de couverture est le plus important du lot.** Un trou entre deux
tranches ferait disparaître des demandes de tous les totaux *sans que rien ne le
signale*, et un recouvrement les compterait deux fois ; dans les deux cas le
simulateur répondrait avec aplomb, et il aurait tort. Le service vérifie donc que
les tranches s'enchaînent sans trou ni recouvrement, de 0 à 100. Il a mordu dès
le premier `build` : les tranches s'arrêtaient à 99, et une demande scorée
exactement 100 n'était comptée nulle part.

**Les deux écrans se recoupent, et c'est vérifié.** La population de rejeu et le
jeu de qualité de D2 décrivent le même mois par deux chemins entièrement
distincts. Ils doivent donc dire la même chose, et ils le disent : au seuil en
vigueur, le simulateur retrouve **74,8 % de précision et 81,4 % de rappel**,
exactement les chiffres de mai 2026 sur l'écran de qualité. Trois grandeurs sont
d'ailleurs reprises de l'un à l'autre plutôt que posées deux fois — les fraudes
établies, les alertes écartées, et les fraudes manquées, dont le nombre affiché
par D2 **sort** désormais de cette population. Un test le vérifie au chiffre
près : si l'un des deux dérive, on l'apprend là, pas en réunion.

---

## ADR-021 — « Recommandé » exige une règle énoncée, et la capacité de la cellule en fait partie

**Contexte.** P4-16 demande un point de fonctionnement recommandé, « argumenté ».
Un seuil désigné sans règle n'est qu'une opinion présentée comme un résultat :
l'utilisateur ne peut ni la contester, ni savoir ce qu'elle a optimisé.

**Décision : le meilleur équilibre précision/rappel parmi les seuils que la
cellule peut absorber.** La règle est calculée, affichée en toutes lettres sous
la recommandation, et les deux moitiés comptent. Un seuil qui maximise le F1 en
produisant trois fois plus de dossiers que la cellule n'en instruit ne
recommande rien : il déplace le problème vers une file d'attente, et une alerte
instruite trois semaines trop tard ne vaut guère mieux qu'une alerte jamais
levée.

**La capacité n'est pas posée, elle est constatée.** Le jeu de qualité compte
347 dossiers refermés en mai 2026, soit 16 par jour ouvré. C'est ce chiffre-là
qui sert de capacité. Une capacité supposée plus basse ferait déclarer intenable
un seuil que la cellule tient depuis un mois ; supposée plus haute, elle
autoriserait une recommandation que personne ne pourrait suivre.

**Ce que la règle donne ici est plus intéressant que le seuil qu'elle désigne.**
Le meilleur équilibre absolu se trouve à 75 % — le seuil en vigueur — mais il
demande 21,3 dossiers par jour pour une capacité de 16. La recommandation
retient donc 80 %, et l'écran ajoute la nuance qui compte : un seuil plus bas
ferait mieux, mais le frein est le nombre d'analystes, pas le modèle. C'est le
genre de conclusion qu'un tableau de bord ne produit jamais, parce qu'il ne
connaît pas la charge.

**Si aucun seuil n'est tenable, la fonction le dit.** Elle retient le plus haut
— le moins coûteux — et l'annonce comme tel plutôt que de présenter un pis-aller
comme un optimum.

**Limite.** La capacité est une constante du jeu de données. Une cellule dont
l'effectif varie, ou dont le temps d'instruction dépend du type de fraude,
demanderait un modèle de charge plus fin ; `capaciteJour` est le paramètre par
lequel il entrerait.

---

## ADR-022 — Le journal est un store à part, en ajout seul, et le « avant » vient de l'appelant

**Contexte.** P4-18 demande la journalisation de toute action métier : acteur,
horodatage, avant/après, motif. Le store des modifications semblait l'endroit
évident — il applique déjà toutes les écritures. Il ne l'est pas.

**Décision : deux stores, deux clés de stockage, deux cycles de vie.** Le store
des modifications ne conserve que l'**état courant** des écarts ; c'est son
contrat, et c'est ce qui l'empêche de diverger du serveur (ADR-004). Un journal
a besoin du contraire : il retient les faits dans l'ordre où ils se sont
produits, et rien ne les efface. Trois conséquences décidaient à elles seules :

- **« Revenir sur la décision » supprime la décision du store.** Le dossier
  retrouve son statut antérieur et plus rien n'atteste qu'une décision a été
  prise, ni qu'elle a été défaite. C'est exactement ce qu'un contrôleur vient
  chercher. Idem pour une note supprimée : son texte n'existe plus nulle part
  ailleurs que dans l'entrée de journal qui le relève **avant** la suppression.
- **« Réinitialiser » vide les écarts.** Un journal logé dans le même store
  aurait été effacé par le bouton dont il doit garder la trace. La remise à zéro
  est donc journalisée — et le journal lui survit.
- **Le `merge` du store des modifications repart de zéro** quand le contenu
  local est illisible. Acceptable pour un statut, qu'il suffit de reposer ;
  inacceptable pour une piste d'audit, dont les faits perdus ne se retrouvent
  pas. Le journal valide donc **entrée par entrée** : une entrée corrompue est
  écartée seule, les autres passent, et l'écart est signalé.

**Le « avant » est fourni par l'appelant, et le paramètre est requis.** Le store
ne connaît que les écarts : sur une alerte encore intacte, il ignore quel statut
elle porte. Le deviner produirait « de — à Résolu », c'est-à-dire la moitié de
l'information demandée. L'écran, lui, affiche la valeur courante ; c'est donc
lui qui la transmet — comme la barre de décision le fait déjà depuis la phase 3
avec `statutAnterieur`. Requis, pour qu'un point d'appel ajouté demain ne puisse
pas l'omettre.

**Toute écriture d'alerte ou de dossier passe par une fonction unique, qui exige
sa trace.** `appliquer()` prend la description de l'action en cinquième
paramètre : un appel qui l'oublierait ne compile pas. C'est ce qui rend la
promesse « toute action métier laisse une trace » vérifiable plutôt que
déclarative — un test la reprend d'ailleurs à l'envers, en vérifiant que chacun
des onze types déclarés est réellement émis quelque part.

**L'entrée est écrite après l'envoi, jamais avant.** Le journal consigne ce qui
a eu lieu, pas ce qui a été tenté : une modification refusée par le service est
défaite à l'écran, et la journaliser laisserait croire à un changement dont il
ne reste rien. *Limite assumée* : les tentatives refusées ne sont donc pas
tracées. Un journal serveur les enregistrerait, avec le refus.

**Les états sont écrits tels qu'ils s'affichaient.** « Sow Analyst » plutôt
qu'une adresse, « activé » plutôt que `true`, « Classée sans suite — Donnée de
référence erronée » plutôt qu'un couple de codes. Un contrôleur relit le journal
des mois après, sans la console sous les yeux. Contrepartie : le journal se lit,
il ne se recalcule pas — reconstituer un état à partir de la piste demanderait
des valeurs typées, ce qu'on ne lui demande pas.

**Le motif n'est porté que par les actions qui en exigent un.** Une décision en
a un par contrat ; un changement de statut depuis la liste n'en demande pas. Le
champ reste `null` plutôt que de recevoir une phrase que personne n'a écrite.

**Une entrée par réglage déplacé, et non une par enregistrement.** « Qui a
baissé le seuil de déclenchement, et de combien » est la question posée ; une
ligne « paramètres modifiés » n'y répondrait pas. L'écart enregistré ne suffit
pas à la produire : un réglage ramené à la valeur du serveur en *sort*, si bien
que la modification la plus intéressante — celle qui défait — n'y figurerait
pas. Les valeurs effectives d'avant et d'après accompagnent donc l'écart.

**Le journal est borné à 500 entrées.** Il vit dans le `localStorage`, dont la
capacité est partagée avec les modifications ; sans borne, il finirait par faire
échouer l'écriture, c'est-à-dire par faire perdre la modification elle-même et
pas seulement sa trace. La borne est assumée et **annoncée à l'écran dès qu'elle
est atteinte** : un journal qui déborde en silence est pire qu'un journal qui
dit qu'il déborde.

**Sans session nommée, l'entrée est écrite quand même**, sous une mention
explicite. Un journal qui perd des faits quand il ne sait pas les attribuer est
moins fiable qu'un journal qui dit ne pas savoir. Le cas ne devrait pas se
produire — `proxy.ts` exige une session avant tout rendu — d'où l'avertissement
s'il survient.

**Limite principale, affichée sur l'écran.** Ce journal est celui d'un
navigateur : il enregistre les actions faites depuis cette console, quel que
soit le compte connecté, et ne remonte pas celles faites ailleurs. Une piste
d'audit opposable se tiendrait côté serveur. Le mécanisme serait le même, écrit
au même endroit — le point de passage unique existe déjà.

---

## ADR-023 — Une page réservée se protège elle-même, et n'envoie pas de code de rôle au navigateur

**Contexte.** `proxy.ts` réservait `/dashboard/admin` au rôle ADMINISTRATEUR
depuis la phase 2. La page n'a jamais existé : un contrôle d'accès sur une
absence, c'est-à-dire une redirection vers une 404.

**Décision : le contrôle est refait dans la page, et ce n'est pas une
redondance.** Le proxy filtre sur un chemin, à partir d'une expression
régulière de `matcher` : un préfixe changé, une route déplacée, et la page
s'ouvrirait à tous sans que rien ne le signale. Une page réservée doit dire
elle-même à qui elle s'adresse. La garde a été éprouvée en neutralisant le
filtre du proxy : la page renvoie alors l'analyste d'elle-même, et **pas une
ligne du journal n'est servie au passage**.

Le code de statut reste 200 dans ce cas, et ce n'est pas un défaut : la page est
derrière une frontière de chargement, si bien que Next.js envoie le squelette
avant de rendre la page, puis délivre le renvoi dans le flux. Ce qui compte
n'est donc pas le statut mais ce qui est servi — le test le vérifie ainsi.

**Le navigateur reçoit un rôle mis en forme, jamais son code.** La session
transporte « SUPERVISEUR » : un code de comparaison, qui n'a rien à faire dans
le HTML. La barre de navigation reçoit donc le libellé déjà calculé et un
booléen `estAdministrateur` décidé côté serveur. Un composant client qui
comparerait lui-même un code de rôle ressemblerait à un contrôle d'accès sans en
être un ; ici, il ne décide que ce qui s'affiche. C'est une vérification de la
phase 2 qui l'a rappelé : elle refuse depuis toujours que le code brut
apparaisse dans le HTML servi, et elle a repris en défaut la première version de
ce câblage.

**L'entrée « Journal d'audit » n'apparaît qu'à qui peut l'ouvrir.** La proposer
aux deux autres comptes les mènerait à une redirection — un lien qui punit celui
qui le suit.

**Au passage : la barre affiche enfin l'identité connectée.** Son pied de page
annonçait « Admin Diallo · Administrateur » à tout le monde ; un analyste s'y
voyait administrateur. Sur une console qui tient désormais une piste d'audit,
afficher une identité qui n'est pas la sienne n'est plus seulement inexact —
c'est là que l'utilisateur lit sous quel nom ses actions vont être inscrites.

**L'identité n'est chargée que là où elle est engagée.** Lire la session revient
à lire les cookies de la requête, ce qui rend la page dynamique. La poser dans
le layout racine aurait été plus simple et aurait fait basculer les huit écrans
pré-rendus, dont quatre n'écrivent rien. Un composant discret la porte donc sur
les seuls écrans qui écrivent : trois routes changent de régime — celles qui
enregistrent désormais qui les a modifiées — et cinq restent statiques.

---

## ADR-024 — Un seul jeu de nœuds partagé, et un périmètre de dossier qui tient sa promesse

**Contexte.** La fiche d'un dossier d'instruction annonce un nombre de cas liés
depuis la phase 1 — huit pour `INV-2026-001` — alors qu'elle ne rattache que
trois alertes. L'écart n'était ni expliqué ni vérifié : un chiffre affiché que
rien ne soutenait.

**Décision : le graphe est commun à tous les dossiers ; un réseau n'en désigne
qu'un périmètre.** Le jeu de données porte une liste de nœuds et une liste
d'arêtes ; chaque réseau ne porte que des identifiants. Les arêtes d'un réseau
s'en déduisent — une arête en fait partie quand ses deux extrémités y sont — au
lieu d'être listées une seconde fois.

L'alternative était de refermer chaque dossier sur son propre sous-graphe. Elle
aurait été plus simple à lire et aurait rendu **invisible le signal recherché** :
un praticien présent dans trois dossiers signalés y serait devenu trois
praticiens différents. Dupliquer les entités par dossier, c'est effacer les
recoupements entre dossiers, c'est-à-dire précisément ce qu'un graphe de fraude
sert à montrer.

**Un sinistre n'est pas une alerte.** Un dossier couvre des demandes de
remboursement dont une partie seulement a été signalée par le moteur ; les autres
sont venues du recoupement. C'est ce que « 8 cas liés, 3 alertes » voulait dire
sans le dire, et ce que le graphe montre enfin. La liste des investigations
affichait d'ailleurs ce nombre sous l'étiquette « 8 alertes » — corrigé.

**Le service refuse de servir un périmètre qui ment.** Le contrôle central : un
réseau porte exactement autant de sinistres que sa fiche annonce de cas liés,
sinon rien n'est servi. S'y ajoutent, dans le même esprit, que toute alerte
rattachée au dossier figure dans son réseau, que tout établissement nommé sur la
fiche y existe, et qu'un sinistre portant un identifiant d'alerte décrive la même
chose qu'elle — même montant, même établissement. Sans ce dernier point, le
graphe deviendrait un univers parallèle : « 2 400 000 FCFA » sur l'alerte,
« 990 000 FCFA » sur le nœud, et aucun écran pour signaler la contradiction.

Ces contrôles ne tournent qu'en mode démonstration, là où les trois jeux viennent
du même dépôt. Face à une API, la cohérence entre ressources relève du service de
détection. Restent toujours actifs, en revanche, les contrôles de forme du graphe
lui-même : une arête ne peut pas pointer vers un nœud absent, ni relier deux
types que son lien n'admet pas. Un graphe faux se voit encore moins qu'un tableau
faux — il *ressemble* à quelque chose quoi qu'on y mette.

**Conséquence.** Onze refus ont été provoqués un à un sur une copie abîmée du jeu
de données, pour vérifier qu'ils tombent et qu'ils désignent le fautif.

**Ce qui reste à la charge de la suite.** Les indicateurs sont calculés sur le
jeu chargé, non sur une base : à volume réel, le recoupement entre dossiers se
ferait côté serveur.

---

## ADR-025 — La disposition du graphe est calculée sur le serveur, et écrite à la main

**Contexte.** Afficher un graphe force-dirigé appelle naturellement `d3-force`,
qui fait ce travail depuis quinze ans.

**Décision : l'algorithme est écrit ici, en une fonction pure.** Ce n'est pas une
question de poids — trente kilo-octets ne décideraient de rien — mais de nature.
`d3-force` est une simulation *animée* : elle mute des objets au fil d'un
`requestAnimationFrame`, ne peut donc pas tourner sur le serveur, et le graphe
n'apparaîtrait qu'après l'hydratation. Un cadre vide au premier rendu, sur
l'écran dont toute la valeur est de montrer quelque chose immédiatement.

Écrit ici, Fruchterman-Reingold tient en une soixantaine de lignes et rend une
**fonction déterministe** : mêmes nœuds, mêmes coordonnées, sur le serveur comme
dans le navigateur. Le SVG part complet dans le HTML servi — trente-cinq disques
et cinquante liens vérifiés dans la réponse — il n'y a rien à réconcilier à
l'hydratation, et l'algorithme se teste sans navigateur.

**Correction après relecture à l'écran : les forces seules ne suffisaient
pas.** La première version laissait l'algorithme décider de tout, comme le fait
un graphe force-dirigé ordinaire. Le résultat, vérifié dans le HTML servi, était
juste et pourtant illisible : sur un réseau de vingt-sept entités de quatre
natures, plus rien ne se distinguait, et les libellés se chevauchaient faute de
place prévisible. Un graphe exact que personne ne peut lire ne vaut pas mieux
qu'un graphe faux.

**Décision : chaque type est rappelé vers sa colonne, les forces ne règlent plus
que la hauteur.** Les colonnes suivent l'ordre de la phrase — un assuré déclare
un sinistre, pris en charge par un praticien, facturé par un établissement. On y
perd la liberté d'un vrai nuage ; on y gagne un graphe où l'on sait où regarder,
où la place de chaque libellé est connue d'avance, et où le sens de lecture
dispense de dessiner des flèches sur les liens.

L'abscisse étant fixée par la colonne, l'écartement des disques se fait
**uniquement en hauteur** : pousser horizontalement délogerait le nœud de sa
colonne, et c'est la colonne qui rend le graphe lisible.

**Deux précautions que l'algorithme classique ne prend pas.**

Les coordonnées sont arrondies au centième. Le SVG traverse le réseau sous forme
de texte : `312.4500000000001` y serait écrit tel quel, et un écart de
représentation en virgule flottante entre Node et le navigateur suffirait à
provoquer un avertissement d'hydratation sur un attribut.

Les disques sont desserrés après coup. La disposition raisonne sur des points et
ignore la taille de ce qu'elle place : le CHU et le radiologue qui y signe six
imageries finissaient à quatorze unités l'un de l'autre, pour des rayons qui en
totalisent vingt-quatre — un seul disque à l'endroit le plus intéressant du
réseau. C'est un test qui l'a relevé, en comparant chaque paire de positions aux
rayons réellement dessinés. Un second test étend la règle aux **libellés** :
deux entités d'une même colonne qui en portent un en permanence doivent être
séparées d'au moins une hauteur de ligne.

**La couleur ne porte jamais seule une information.** Chaque type a sa
silhouette — disque, losange, triangle, carré — parce qu'une teinte disparaît
pour un daltonien, à l'impression et sur une capture d'écran. La nuance de
remplissage du losange (plein pour un sinistre signalé, creux pour un sinistre
venu du recoupement) est doublée d'une ligne de légende qui l'énonce.

**Contrepartie assumée.** On ne peut pas attraper un nœud à la souris pour le
déplacer : la disposition est arrêtée avant d'arriver au navigateur. Le zoom, le
déplacement du cadre et la mise en évidence du voisinage couvrent le besoin
d'exploration ; réarranger le graphe à la main n'apprend rien sur la fraude.

**Le glissement du cadre ne doit pas voler le clic.** La première version
capturait le pointeur sur le `<svg>` dès l'appui, ce qui redirige vers lui tous
les événements suivants : le clic n'atteignait donc jamais le nœud, et aucune
sélection n'était possible. La capture a été retirée ; le glissement se suit à
l'état des boutons, et un déplacement de plus de quatre pixels annule le clic
qui le termine.

**La mise en évidence estompe, elle ne filtre pas.** Choisir un nœud atténue le
reste du graphe au lieu de le retirer : un analyste doit voir ce qu'il écarte.

---

## ADR-026 — La console a une coque : la navigation appartient au cadre, pas à la page

**Statut** : accepté · **Portée** : les neuf sections de la console

**Constat.** Un seul écran montait la barre latérale : le tableau de bord. Les
huit autres — alertes, analyses, qualité, simulateur, réseaux, investigations,
rapports, paramètres — n'offraient qu'un lien de retour vers leur parent
supposé. Passé la première page, on ne naviguait plus qu'à reculons, et le
chemin dépendait de la page où l'on se trouvait plutôt que de la structure de
l'application. La barre latérale existait pourtant, complète, avec ses neuf
entrées et son filtre de rôle : elle n'était simplement montée nulle part
ailleurs.

L'en-tête portait la même marque : un titre écrit en dur, « Documents », resté
du gabarit d'origine. Invisible sur le seul écran qui l'affichait, il serait
devenu faux sur les neuf.

**Décision.** La barre latérale et l'en-tête deviennent une **coque**
(`components/coque-console.tsx`), montée par un `layout.tsx` dans chaque
section. Le tableau de bord cesse de l'installer pour lui-même. Un seul endroit
lit la session, construit l'identité affichée et décide de montrer ou non le
journal d'audit.

**La table de navigation devient partagée.** Elle vivait dans
`app-sidebar.tsx`, où elle n'était visible que de la barre latérale ; elle est
désormais dans `lib/navigation.ts`, et l'en-tête y prend le titre de la section
courante. Deux endroits qui nomment les mêmes routes finissent toujours par les
nommer différemment.

Le rattachement d'une adresse à sa section se fait par **le préfixe le plus
long** : `/dashboard/admin` est le journal d'audit et non le tableau de bord,
et une page de détail (`/reseaux/RES-2026-003`) reste rattachée à sa section —
c'est bien de là qu'on vient. L'en-tête en tire un fil d'Ariane à deux niveaux,
dont le premier est cliquable.

**Ce que cela coûte, et pourquoi c'est accepté.** La coque lit la session ;
toutes les pages qu'elle enveloppe deviennent donc dynamiques. `/reseaux`
était jusqu'ici pré-rendue — c'était l'arbitrage de D5, la session n'est lue que
là où quelque chose s'écrit. Il tombe ici : une page servie une milliseconde
plus tôt ne vaut pas une console où l'on se perd. Les huit autres sections
lisaient déjà la session.

**Ce que ce n'est pas.** Un contrôle d'accès. `proxy.ts` et chaque page
décident qui entre ; la coque ne décide que de ce qui s'affiche. L'entrée du
journal d'audit reste cachée à qui ne peut pas l'ouvrir — un lien qui punit
celui qui le suit vaut moins qu'un lien absent — mais la cacher n'a jamais
protégé la page.

**Les liens de retour sont conservés.** Ils font désormais doublon avec le fil
d'Ariane pour les pages de détail, et avec la barre latérale pour les sections.
Les retirer aurait été un second changement, non demandé, dans le même
mouvement ; ils restent le temps de la revue d'ergonomie de la phase 5.

---

## ADR-027 — Un lien orienté se lit dans les deux sens, et porte donc deux libellés

**Statut** : accepté · **Portée** : `lib/reseaux.ts`, panneau de l'entité choisie

**Constat.** Le panneau qui liste les rattachements d'une entité lisait le
libellé du lien dans le sens de la table, quel que soit le bout par lequel on
regardait. Un praticien sélectionné s'y voyait annoncer « **pris en charge par**
CLM-2026-0417 » — l'exact contraire de ce qu'il fait. Un établissement
s'entendait dire « exerce dans » à propos d'un praticien. Une fois sur deux, la
phrase décrivait la relation à l'envers.

Ce n'est pas un défaut de forme. Le graphe existe pour qu'un analyste puisse
dire à voix haute ce qu'il voit ; une console qui lui met dans la bouche le
contraire de la relation vaut moins que pas de phrase du tout.

**Décision.** Chaque lien porte deux libellés : `libelle`, lu de `de` vers
`vers`, et `inverse`, lu dans l'autre sens. Une fonction `libelleDepuis`
regarde d'abord de quel côté on se tient.

| Lien | Depuis la source | Depuis la cible |
| --- | --- | --- |
| `a_declare` | a déclaré | déclaré par |
| `facture_par` | facturé par | a facturé |
| `soigne_par` | pris en charge par | a pris en charge |
| `exerce_dans` | exerce dans | accueille |

**Ce que les tests verrouillent.** Que les deux libellés d'un lien ne sont
jamais identiques, et surtout que, sur les six réseaux, **aucune arête ne
produit la même phrase depuis ses deux extrémités**. C'est cette dernière
propriété qui garantit qu'un clic sur un praticien et un clic sur son sinistre
racontent bien deux choses différentes.

**La phrase de lecture, elle, ne change pas.** Écrite au-dessus du dessin, elle
décrit la chaîne dans son sens naturel — un assuré déclare un sinistre, pris en
charge par un praticien, facturé par un établissement — et n'a jamais été lue
depuis un bout.
