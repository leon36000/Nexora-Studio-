# Les blocs

Un workflow est une suite de **blocs** reliés entre eux. Chaque bloc reçoit des données, fait une chose, et transmet son résultat aux blocs suivants. Pour réutiliser une sortie, tapez `<` dans un champ : la liste des sorties disponibles s'affiche (par exemple `<agent.content>`).

Ajoutez un bloc en le glissant depuis la barre d'outils de droite, ou en cliquant dessus. Cliquez sur un bloc pour le régler dans le panneau de l'éditeur.

<a id="declencheurs"></a>
## Déclencheurs

Le déclencheur dit **quand** le workflow démarre.

| Déclencheur | Démarre le workflow… |
|---|---|
| Démarrage (manuel) | quand vous cliquez sur « Exécuter », ou quand un autre workflow l'appelle |
| Chat | à chaque message reçu dans le chat déployé |
| API | à chaque appel de son adresse d'API (avec une clé) |
| Planification | à intervalle régulier : toutes les X minutes, chaque jour, chaque semaine… |
| Webhook | quand un service externe envoie une requête à son adresse |
| Intégrations (Gmail, Slack…) | quand un événement arrive dans l'outil connecté |

Les planifications et les déclencheurs d'intégration tournent tout seuls une fois le workflow **déployé**.

<a id="agent"></a>
## Agent

Le bloc principal : il envoie vos consignes au **modèle de langage** (le modèle Nexora par défaut) et renvoie sa réponse. Vous pouvez lui donner :
- des **consignes** (message système) et le message de l'utilisateur ;
- des **outils** : intégrations, Nexora Connect, autres workflows, recherche dans vos connaissances ;
- une **mémoire** de conversation ;
- un **format de réponse** (JSON structuré) pour réutiliser facilement les champs.

<a id="router"></a>
## Routeur

Choisit, avec le modèle, **quelle branche** suivre selon le contenu (par exemple « facture », « réclamation », « autre »). Décrivez chaque route en une phrase.

<a id="condition"></a>
## Condition

Choisit une branche selon une **règle** que vous écrivez (comparaison, valeur vide…), sans appel au modèle.

<a id="evaluator"></a>
## Évaluateur

Note une réponse selon des **critères** que vous définissez (exactitude, ton, complétude…) et renvoie un score par critère.

<a id="guardrails"></a>
## Garde-fous (Guardrails)

Vérifie un contenu avant de continuer : JSON valide, expression régulière, données personnelles, ou réponse fidèle à vos connaissances (contrôle d'hallucination avec le modèle Nexora).

<a id="function"></a>
## Fonction

Exécute du **code JavaScript** pour transformer des données. Python et Shell demandent un bac à sable d'exécution distant, qui n'est pas installé par défaut avec Nexora.

<a id="api"></a>
## API

Appelle n'importe quelle adresse HTTP (GET, POST…) avec en-têtes et corps.

<a id="response"></a>
## Réponse

Définit ce que le workflow **renvoie** (au chat, à l'appel d'API ou au workflow parent).

<a id="variables"></a>
## Variables

Lit ou modifie les variables du workflow, partagées entre les blocs.

<a id="wait"></a>
## Attente

Met le workflow en pause pendant une durée donnée, puis reprend tout seul.

<a id="human-in-the-loop"></a>
## Validation humaine

Met le workflow en pause jusqu'à ce qu'une personne **valide ou complète** une étape (par exemple relire un devis avant envoi). La personne reçoit un lien.

<a id="loop"></a>
## Boucle

Répète un groupe de blocs pour chaque élément d'une liste, ou un nombre de fois donné.

<a id="parallel"></a>
## Parallèle

Exécute un groupe de blocs **en même temps** pour plusieurs éléments.

<a id="workflow"></a>
## Workflow

Appelle un **autre workflow** comme une étape, avec ses entrées et sa sortie.

<a id="webhook"></a>
## Webhook (sortant)

Envoie une requête à un service externe pour le prévenir d'un événement.

<a id="credential"></a>
## Identifiants

Choisit un compte connecté (OAuth) ou un ensemble d'identifiants partagés, utilisé ensuite par les blocs d'intégration.

<a id="credential-group"></a>
## Groupes d'identifiants

Regroupe plusieurs comptes pour les utiliser à tour de rôle ou les partager dans l'organisation.
