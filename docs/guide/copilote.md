# Le Copilote

Décrivez une automatisation en français : le **Copilote** prépare un workflow prêt à exécuter, avec le modèle Nexora de votre instance. Vous le relisez, vous l'ajustez, puis vous le créez ; il reste ensuite modifiable dans l'éditeur comme n'importe quel workflow.

Ouvrez-le depuis la carte **Décrire une automatisation** de l'Accueil, ou le bouton **Nouveau workflow avec l'IA** de la barre latérale (membres avec droit d'écriture).

## Décrire

Écrivez ce que doit faire l'automatisation, quand elle se déclenche et ce qu'elle renvoie, ou cliquez sur un exemple :

- « Chaque lundi à 9 h, relancer par e-mail les factures impayées. »
- « Trier les e-mails reçus par webhook : urgent ou non urgent. »
- « Répondre à une question avec la base de connaissances FAQ. »
- « Rédiger le compte rendu d'une réunion, puis le faire valider avant envoi. »
- « Appeler une API puis résumer la réponse. »

**Générer** demande un plan au modèle (de quelques secondes à une minute sur un serveur sans carte graphique ; **Arrêter** annule).

## Relire le plan

Le plan s'affiche en étapes lisibles : le déclencheur (manuel, planification, webhook, chat), puis chaque étape (agent, condition, appel d'API, attente, validation humaine, réponse) et ce qu'elle fait. Les services Nexora Connect ou les bases de connaissances que le Copilote ne trouve pas dans l'espace apparaissent sous **À vérifier** : le workflow est créé sans eux, ajoutez-les ensuite.

- **Modifier** : écrivez ce qu'il faut changer (« ajoute une validation avant l'envoi ») ; le plan est ajusté sans repartir de zéro.
- **Créer le workflow** : choisissez le dossier ; l'éditeur s'ouvre sur le nouveau workflow.

Rien n'est exécuté avant que vous lanciez le workflow vous-même.

## Ce qu'il faut savoir

- Un plan compte au plus 12 étapes : découpez les automatisations plus longues.
- Le Copilote n'utilise que le modèle de votre instance (`nexora-default`) : vos descriptions ne partent chez aucun tiers.
- Le texte que vous écrivez décrit l'automatisation ; il ne peut pas donner d'autres ordres au Copilote.
- Messages possibles : *le modèle n'a pas produit de plan valide* (reformulez plus simplement), *le modèle a refusé la demande* (raison affichée), *Nexora API indisponible* (réessayez), *trop de demandes* (patientez une minute).
