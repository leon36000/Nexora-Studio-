# Les prompts versionnés

Un **prompt** est un texte de consignes réutilisable, rangé dans l'espace de travail : le ton du support, la façon de relancer une facture, le format d'un compte rendu. Il a des **versions** (on ne réécrit jamais une version : on en enregistre une nouvelle) et deux **étiquettes**, `production` et `test`, qui désignent chacune une version. Les agents qui utilisent un prompt lisent la version de leur étiquette **à chaque message** : déplacer l'étiquette `production` change leurs réponses **sans les republier**, et la remettre sur l'ancienne version revient en arrière tout aussi vite.

Les prompts se trouvent dans la barre latérale, **Prompts**. Tous les membres de l'espace les voient ; créer, enregistrer une version, déplacer une étiquette ou supprimer demande le droit **Modifier** sur l'espace.

## Créer un prompt

**Nouveau prompt** : un nom (unique dans l'espace, sans tenir compte des majuscules), une description, le texte et une note de version. La **version 1** reçoit les deux étiquettes, `production` et `test`.

Depuis le **Playground**, **Enregistrer comme prompt** reprend les consignes en cours dans un nouveau prompt.

### Les variables

Écrivez `{{nom}}` dans le texte pour une valeur que l'agent fournit : `Réponds à {{client}} en {{phrases}} phrases au plus.` Chaque variable a un **type** :

| Type | Valeur attendue | Écrite dans le prompt |
|---|---|---|
| texte | n'importe quel texte | telle quelle |
| nombre | `12`, `1,5` ou `1.5` | telle que saisie |
| oui / non | `oui`, `non`, `true`, `false`, `1`, `0` | `oui` ou `non` |

Une **valeur par défaut** sert quand l'agent n'en donne pas. Sans valeur ni défaut, ou avec une valeur du mauvais type, l'exécution de l'agent s'arrête avec un message qui nomme le prompt, sa version et la variable. Le texte d'un prompt n'est jamais lu comme une variable d'environnement : un prompt ne peut pas faire entrer un secret de l'espace dans une requête au modèle.

## Versions, étiquettes et comparaison

La page d'un prompt montre :

- **Versions** : numéro, note, auteur, date et étiquettes. Cliquez sur un numéro pour afficher son texte et ses variables. **Mettre en production** et **Mettre en test** déplacent l'étiquette sur cette version (une confirmation rappelle l'effet sur les agents).
- **Nouvelle version** : part du texte de la version affichée ; les variables se mettent à jour d'après le texte, réglez leur type et leur valeur par défaut, ajoutez une note, **Enregistrer la version**. Une nouvelle version ne reçoit **aucune** étiquette : les agents gardent la leur jusqu'à ce que vous la promouviez. Le flux habituel : enregistrer, la mettre en `test`, l'essayer avec un agent réglé sur `test`, puis la **mettre en production**.
- **Comparer deux versions** : les lignes retirées et ajoutées entre deux versions.

Chaque création, nouvelle version, déplacement d'étiquette et suppression est consigné dans le **journal d'audit** (Réglages › Journal d'audit).

## Utiliser un prompt dans un agent

Dans le formulaire d'un agent (**Agents**), le champ **Consignes** propose **Texte** (les consignes écrites dans l'agent) ou **Prompt** : choisissez le prompt, la version à suivre (`@production`, `@test` ou *Dernière version*) et, s'il en a, la valeur de chaque variable. Le formulaire résume : « Consignes : prompt « Support client » @production (version 2) ». Enregistrez puis publiez l'agent une fois : les déplacements d'étiquette suivants s'appliquent sans republier. La comparaison des versions de l'agent indique quand son prompt ou son étiquette a changé.

Dans l'éditeur de workflows, le bloc **Agent** a les mêmes réglages : **Prompt de consignes**, **Version du prompt**, **Variables du prompt** (une ligne par variable ; une valeur peut venir d'un bloc précédent, par exemple `<start.input>`). Le prompt remplace le premier message système du bloc. Une valeur de variable ne peut pas provenir d'un secret : l'exécution est refusée.

La version utilisée est enregistrée dans la sortie du bloc, champ `prompt` (`id`, `name`, `version`, `label`) : elle apparaît dans **Journaux**, dans le détail de l'exécution, et les blocs suivants peuvent la lire (`<agent.prompt.version>`).

Un changement d'étiquette s'applique au message suivant de l'agent. Si plusieurs serveurs WorkStudio servent la même instance, les autres le voient au plus tard 30 secondes après.

Un prompt supprimé fait échouer les agents qui l'utilisent, avec un message clair, jusqu'à ce que leurs consignes soient changées. Un workflow copié dans un autre espace garde la référence au prompt de l'espace d'origine : choisissez-en un dans le nouvel espace.

## Mesurer un prompt avant de le mettre en production

Une version enregistrée se **mesure** avant d’être promue : dans [Évaluations](evaluations.md), une campagne fait passer un jeu de questions à la version actuelle (`@production`) et à la nouvelle (`@test` ou son numéro), un juge décide si chaque réponse est bonne, et la comparaison ligne à ligne montre ce qui s’améliore et ce qui régresse. Une campagne planifiée relit l’étiquette `@production` à chaque lancement et alerte quand le taux de réussite passe sous le seuil.

## API

Avec une clé de **workflows** (Réglages › Clés API, section du bas : clé personnelle ou clé d'espace), l'API v2 de WorkStudio lit et versionne les prompts. `{promptId}` accepte l'identifiant **ou le nom** du prompt.

| Point d'accès | Rôle |
|---|---|
| `GET /api/v2/prompts?workspaceId=…` | liste paginée (`search`, `sortBy` `name`/`createdAt`/`updatedAt`, `sortOrder`, `limit`, `cursor`) |
| `GET /api/v2/prompts/{promptId}?workspaceId=…&label=production` | le prompt et le texte de la version étiquetée (`production` par défaut ; `label=test`, ou `version=3`) |
| `POST /api/v2/prompts` | crée un prompt (version 1, étiquetée `production` et `test`) |
| `POST /api/v2/prompts/{promptId}/versions` | enregistre une nouvelle version (les étiquettes ne bougent pas) |

```bash
curl "https://ia.pme.fr/api/v2/prompts/Support%20client?workspaceId=$ESPACE&label=production" \
  -H "x-api-key: $CLE_WORKSTUDIO"
```

La réponse contient `data.version.content` (le texte, avec ses `{{variables}}`), `data.version.variables` et `data.labels`. Le déplacement d'une étiquette se fait dans l'interface. Un prompt d'un autre espace répond 404.
