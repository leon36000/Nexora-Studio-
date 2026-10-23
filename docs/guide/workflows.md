# Les workflows

Un **workflow** automatise une tâche : il part d'un déclencheur, enchaîne des blocs (modèle de langage, intégrations, conditions…) et produit un résultat.

## Créer

- Dans la barre latérale, **Nouveau workflow**, ou dupliquez un **modèle PME** (dossier « Modèles PME »).
- Glissez les blocs depuis la barre d'outils, reliez-les, réglez-les dans l'éditeur (voir [Les blocs](blocs.md)).
- Le bouton **« Générer avec l'IA »** (baguette) dans un champ rédige pour vous des consignes, du code ou du JSON avec le modèle Nexora.

## Tester

**Exécuter** lance le workflow tout de suite ; chaque bloc affiche son résultat. Le détail de l'exécution est dans les [journaux](journaux.md).

<a id="deployer"></a>
## Déployer

**Déployer** fige une version et la rend utilisable :
- par **API** (adresse et clé d'API) ;
- en **chat** (page de chat publique ou protégée) ;
- comme **outil MCP** pour d'autres assistants ;
- par les **déclencheurs** (planification, webhook, intégrations), qui ne tournent que sur la version déployée.

Chaque déploiement crée une version ; vous pouvez revenir à une version précédente.
