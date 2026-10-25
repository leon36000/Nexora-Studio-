# La vue Étapes

La vue **Étapes** montre un workflow comme une liste de cartes, de haut en bas, sans le canevas : le déclencheur, puis chaque étape dans l'ordre où elle s'exécute. Elle s'adresse à celles et ceux qui n'ont jamais utilisé un éditeur de blocs : chaque étape se règle par un formulaire en français, et un test pas à pas montre ce que chacune a fait.

La vue Étapes ne remplace pas le canevas, elle en est une autre lecture : les deux montrent **le même workflow**, et ce que vous faites dans l'une apparaît tout de suite dans l'autre. Aucune fonction n'est perdue.

## Quand elle s'ouvre

- **Un workflow créé par le Copilote**, ou **l'un des 20 modèles PME** (dossier « Modèles PME »), s'ouvre en vue Étapes.
- **Tous les autres workflows** s'ouvrent dans le canevas.
- Les deux boutons en haut à gauche, **Étapes** et **Mode avancé**, changent de vue en un clic. Votre choix est retenu, pour chaque workflow, dans ce navigateur.

## Lire et régler une étape

- Chaque carte indique son numéro, son type (« Demander à l'IA », « Envoyer un e-mail »…), le nom de l'étape et une phrase qui résume ce qu'elle fait. Une condition se lit comme une règle : « Si classer.categorie est égal à « urgent » ».
- **Cliquez sur une carte** : le formulaire de l'étape s'ouvre dans le panneau de droite (onglet Éditeur). C'est le formulaire du bloc, le même que dans le canevas.
- Une condition montre ses deux chemins, **Si oui** et **Sinon**, chacun avec ses propres étapes.

## Ajouter, déplacer, supprimer

- Le bouton **+** entre deux cartes (ou **Ajouter une étape** en bas de la liste) ouvre le choix d'une étape parmi environ 25, classées par thème : Essentiel, Messages, Données et fichiers, Intelligence artificielle, Nexora Connect, Contrôle. Survolez une ligne pour lire ce que fait l'étape. **Plus de blocs dans le canevas** mène à tous les autres blocs.
- Le menu **…** d'une carte permet de la régler, de la tester jusqu'ici, de la **monter**, de la **descendre** ou de la **supprimer**. Supprimer une condition supprime aussi les étapes de ses chemins (une confirmation le rappelle).
- Une condition se place sur la ligne principale, pas à l'intérieur d'un chemin.

## Tester pas à pas

1. Sur la carte du déclencheur, **Données d'exemple** montre les champs que le workflow reçoit. Les modèles PME arrivent déjà remplis (sauf les adresses e-mail, par prudence : un test pourrait envoyer un vrai message). Ces valeurs sont gardées avec le workflow.
2. **Tester le workflow** lance une exécution. Chaque carte affiche son état (en cours, réussie, en erreur) et, une fois réussie, un bouton **Voir le résultat** avec la durée.
3. Le menu **…** d'une carte propose **Tester jusqu'ici** : le workflow s'arrête après cette étape, pratique pour vérifier une rédaction avant d'envoyer l'e-mail.

Quand une étape échoue, la carte explique en clair ce qui s'est passé (« il manque l'adresse du destinataire », « le budget mensuel est atteint », « cette adresse est bloquée par la sécurité de l'instance »…) et ce qu'il faut corriger. Le message d'origine reste disponible dans **Message d'origine**.

## Lecture seule

La vue Étapes ne réécrit un workflow que s'il a **la forme que le Copilote et les modèles produisent** : un déclencheur, une suite d'étapes du catalogue, des conditions à deux chemins qui se rejoignent. Dès qu'un workflow en sort (boucle, exécution en parallèle, bloc absent du catalogue, bloc désactivé ou verrouillé, liens qui ne forment pas une suite), la vue Étapes reste utile pour **lire**, elle affiche la raison et le bouton **Ouvrir dans le canevas**, et elle ne modifie rien.

Un workflow créé par le Copilote qui devient plus complexe dans le canevas s'ouvre donc de nouveau en canevas.

## La barre d'outils du canevas

Dans le canevas, l'onglet **Barre d'outils** est trié : **Essentiels** d'abord (l'agent, la condition, l'appel d'API, l'e-mail, la validation, la réponse…), puis **Autres blocs**, puis **Nexora Connect** (un seul bloc pour agir dans plus de 1 600 services connectés), puis les **intégrations directes**, repliées par défaut.

## Ce qu'il faut savoir

- Une étape garde son nom d'origine : c'est lui qu'utilisent les autres étapes pour lire ses résultats (`<nom.champ>`).
- Les ajouts et déplacements se font comme dans le canevas : une autre personne qui ouvre le workflow les voit, et **Annuler** du canevas les défait.
- Un workflow se déplace d'une vue à l'autre sans perte : seules les positions des cartes dans le canevas sont reprises (l'ordre de gauche à droite suit celui de la liste).
