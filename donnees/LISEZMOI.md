# Jeux de données

Deux fichiers, qui ne disent pas la même chose. La distinction commande tout ce
qu'on peut en faire.

## `car_insurance_fraud_dataset.csv` — versionné

30 000 déclarations de sinistre automobile, **avec une étiquette de fraude**
(`fraud_reported`, `Y`/`N`), 3 440 positives soit 11,47 %.

C'est le seul des deux qui permette d'apprendre un détecteur : il porte la
réponse. Il est versionné malgré ses 4,6 Mo, parce que sans lui
`npm run modele:entrainer` ne produirait plus rien et que les chiffres publiés
par le modèle ne seraient plus vérifiables par un tiers.

| | |
|---|---|
| Colonnes | 24 |
| Retenues par le modèle | 20 (voir `scripts/modele/jeu.mjs`) |
| Écartées | `policy_id` (identifiant), `incident_city` (plus de 200 modalités), `incident_date` |
| Construite | `ecart_montant` = `claim_amount` − `total_claim_amount` |

## `Base_de_donnees.csv` — non versionné

108 653 contrats d'assurance automobile français : région, département, commune,
Crit'Air, énergie, âge du véhicule, marque, âge du permis, sexe, catégorie
socioprofessionnelle, ancienneté, nombre de sinistres, et cinq colonnes de coûts
par garantie (les deux dernières entièrement nulles).

**Il ne porte aucune étiquette de fraude.** Aucune colonne ne dit si un sinistre
était frauduleux : `N_SINISTRE` compte les sinistres, il ne les qualifie pas. On
ne peut donc pas y apprendre un détecteur de fraude — il n'y a rien à prédire.

Ce n'est pas pour autant un fichier inutile. C'est un **portefeuille**, c'est-à-
dire une description de ce qui est normal : combien de sinistres déclare en
moyenne un conducteur de tel âge, dans telle région, avec tel véhicule. C'est
exactement la matière des comparatifs que la console affiche déjà à côté d'un
dossier (`Comparatif` : valeur du dossier, valeur de la cohorte, effectif) — et
un montant n'est un argument que comparé à ce qui se pratique ailleurs.

Il est exclu du dépôt (17 Mo, `.gitignore`) tant que cet usage n'est pas
implémenté ; le placer ici suffit à le retrouver.

## Ce que ces jeux ne sont pas

Ils portent sur l'**assurance automobile**. La console, elle, instruit des
dossiers d'**assurance maladie** : actes médicaux, praticiens, établissements,
nomenclature, francs CFA. Le modèle appris ici ne sait donc pas noter les
alertes du jeu de démonstration, et rien dans le code ne prétend le contraire —
c'est un second domaine, pas un remplacement du premier.
