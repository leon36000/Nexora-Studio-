# Les agents

Un **agent** est un assistant spécialisé de votre entreprise : il suit vos consignes, utilise vos outils et vos documents, et répond dans un chat que vous pouvez partager.

Ouvrez **Agents** dans la barre latérale, puis **Nouvel agent** (ou la carte *Agent* de l'Accueil).

## Le formulaire

| Champ | À quoi il sert |
|---|---|
| Nom, description | Ce que fait l'agent, pour vos collègues |
| Consignes | Comment il doit répondre : rôle, ton, ce qu'il doit faire ou refuser. Écrites ici (**Texte**) ou lues dans un **prompt** versionné de l'espace (`@production`, `@test`) : voir [Les prompts](prompts.md) |
| Modèle | `nexora-default` suit le modèle par défaut ([Réglages › Modèles](modeles.md)) ; un autre modèle reste fixé |
| Outils | Actions dans vos services (Nexora Connect, outils MCP) et autres workflows de l'espace ; pour chaque action, l'interrupteur **Demander avant d'agir** |
| Interpréteur de code, Recherche web | Deux interrupteurs sous la liste des outils (voir ci-dessous) |
| Connaissances | Bases de documents dans lesquelles l'agent cherche avant de répondre ; ses réponses citent leurs sources |
| Mémoire | L'agent se souvient de la conversation en cours |
| Message d'accueil | La première phrase du chat publié |

**Enregistrer** garde le brouillon. Si l'agent a été modifié entre-temps ailleurs (dans l'éditeur ou un autre onglet), rien n'est enregistré : un message vous demande de recharger la page, pour ne pas écraser ce changement.

## Interpréteur de code et recherche web

- **Interpréteur de code** : l'agent écrit et exécute du **Python** (pandas, openpyxl, matplotlib) pour calculer sans se tromper, analyser un fichier joint (Excel, CSV) et tracer des graphiques ; les fichiers qu'il produit (graphique, CSV, classeur) s'affichent sous sa réponse. Le code s'exécute dans un conteneur jetable **sans réseau** : voir [L'interpréteur de code](interpreteur.md). L'interrupteur n'est disponible que si un administrateur a installé l'interpréteur et l'a autorisé dans Réglages › Exécution de code ; il est désactivé par défaut.
- **Recherche web** : l'agent cherche sur le web avec le moteur configuré par l'administrateur (SearXNG, [Intégrations](integrations.md)). Ses requêtes **quittent l'instance** : n'activez cet interrupteur que pour les agents qui n'ont pas à manipuler de données confidentielles. L'interrupteur n'est disponible que si la recherche web est activée sur l'instance.

Un administrateur peut couper l'interpréteur à tout moment : les agents déjà publiés ne le proposent plus à leur modèle au message suivant.

## Citer ses sources

Quand un agent cherche dans vos bases de connaissances ou sur le web, chaque résultat reçoit un numéro et l'agent le cite dans sa réponse (« … à partir de 80 euros [1]. »). Sous la réponse, **Sources** liste les sources citées : un clic ouvre le document de la base (ou la page d'origine d'un connecteur, ou la page web) ; passer la souris affiche l'extrait utilisé. Si l'agent n'a cité aucun numéro, les sources consultées sont listées sous le titre **Sources consultées**.

## Demander avant d'agir

Un agent qui peut écrire (envoyer un e-mail, créer une facture, modifier des données) ne doit pas le faire à votre insu. Chaque outil d'action de la liste a un interrupteur **Demander avant d'agir**, **activé quand vous ajoutez l'outil**. Avec Nexora Connect, seules les actions qui **écrivent ou suppriment** demandent : lire (chercher, lister) passe sans question, et une action que Connect ne sait pas décrire demande aussi.

- **Dans l'Assistant et dans le chat publié**, une carte **Autoriser cette action ?** apparaît dans la conversation avec l'action et ce qu'elle ferait (destinataire, objet…). **Autoriser** la lance, **Refuser** ne lance **rien** et l'agent vous le dit. Sans réponse pendant 15 minutes, l'action n'a pas lieu.
- **Dans un workflow** lancé sans que personne ne regarde (planification, API, webhook, bouton Exécuter de l'éditeur), le bloc Agent s'arrête sur la **validation humaine** habituelle (page de reprise) : elle montre l'action demandée et un interrupteur **Autoriser ces actions**. À la reprise, l'action part **une seule fois** si vous avez autorisé ; sinon rien n'est exécuté. Le résultat figure dans la sortie `actions` du bloc.
- Un agent enregistré avant cette fonction n'est pas modifié : rouvrez-le pour activer l'interrupteur de ses outils.

## Tester, publier

- **Tester** ouvre une discussion avec le brouillon, sans rien publier.
- **Publier** met l'agent en service et crée son **chat** : un lien à partager (copiez-le). Le message d'accueil est enregistré à ce moment-là.
- Par défaut, le chat est **réservé aux membres de l'espace** connectés à Nexora. L'interrupteur **Accessible sans compte (lien public)** l'ouvre à toute personne qui a le lien (vos clients, par exemple) : ne donnez alors pas à l'agent l'accès à des documents confidentiels. Publiez à nouveau pour appliquer un changement.
- Si l'accès au chat a été réglé dans l'éditeur (mot de passe, liste d'e-mails ou SSO), le formulaire l'affiche sans le modifier et chaque publication le conserve.
- **Versions** liste les publications : **Comparer** montre ce qui a changé dans les consignes, le modèle, les outils, l'interpréteur, la recherche web, les connaissances et la mémoire ; **Activer** remet une version précédente en service **et remplace le brouillon** par cette version (les changements non publiés sont perdus).

## Aller plus loin

**Ouvrir dans l'éditeur** donne accès au workflow complet de l'agent (blocs, conditions, boucles…). Les réglages faits dans l'éditeur que le formulaire n'affiche pas (température, format de réponse, options d'une recherche dans les connaissances, position des blocs…) sont conservés quand vous enregistrez le formulaire.

Si vous modifiez l'agent au-delà de ce que le formulaire sait afficher (un bloc ou une liaison en plus, un bloc désactivé, des champs d'entrée sur le bloc de départ, une mémoire « fenêtre glissante »…), le formulaire passe en lecture seule pour ne rien écraser : continuez dans l'éditeur.
