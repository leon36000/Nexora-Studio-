# Les agents

Un **agent** est un assistant spécialisé de votre entreprise : il suit vos consignes, utilise vos outils et vos documents, et répond dans un chat que vous pouvez partager.

Ouvrez **Agents** dans la barre latérale, puis **Nouvel agent** (ou la carte *Agent* de l'Accueil).

## Le formulaire

| Champ | À quoi il sert |
|---|---|
| Nom, description | Ce que fait l'agent, pour vos collègues |
| Consignes | Comment il doit répondre : rôle, ton, ce qu'il doit faire ou refuser |
| Modèle | `nexora-default` suit le modèle par défaut ([Réglages › Modèles](modeles.md)) ; un autre modèle reste fixé |
| Outils | Actions dans vos services (Nexora Connect, outils MCP) et autres workflows de l'espace |
| Connaissances | Bases de documents dans lesquelles l'agent cherche avant de répondre |
| Mémoire | L'agent se souvient de la conversation en cours |
| Message d'accueil | La première phrase du chat publié |

**Enregistrer** garde le brouillon. Si l'agent a été modifié entre-temps ailleurs (dans l'éditeur ou un autre onglet), rien n'est enregistré : un message vous demande de recharger la page, pour ne pas écraser ce changement.

## Tester, publier

- **Tester** ouvre une discussion avec le brouillon, sans rien publier.
- **Publier** met l'agent en service et crée son **chat** : un lien à partager (copiez-le). Le message d'accueil est enregistré à ce moment-là.
- Par défaut, le chat est **réservé aux membres de l'espace** connectés à Nexora. L'interrupteur **Accessible sans compte (lien public)** l'ouvre à toute personne qui a le lien (vos clients, par exemple) : ne donnez alors pas à l'agent l'accès à des documents confidentiels. Publiez à nouveau pour appliquer un changement.
- Si l'accès au chat a été réglé dans l'éditeur (mot de passe, liste d'e-mails ou SSO), le formulaire l'affiche sans le modifier et chaque publication le conserve.
- **Versions** liste les publications : **Comparer** montre ce qui a changé dans les consignes, le modèle, les outils, les connaissances et la mémoire ; **Activer** remet une version précédente en service **et remplace le brouillon** par cette version (les changements non publiés sont perdus).

## Aller plus loin

**Ouvrir dans l'éditeur** donne accès au workflow complet de l'agent (blocs, conditions, boucles…). Les réglages faits dans l'éditeur que le formulaire n'affiche pas (température, format de réponse, options d'une recherche dans les connaissances, position des blocs…) sont conservés quand vous enregistrez le formulaire.

Si vous modifiez l'agent au-delà de ce que le formulaire sait afficher (un bloc ou une liaison en plus, un bloc désactivé, des champs d'entrée sur le bloc de départ, une mémoire « fenêtre glissante »…), le formulaire passe en lecture seule pour ne rien écraser : continuez dans l'éditeur.
