# Prise en main de Nexora WorkStudio

## Les modèles PME

Chaque nouvel espace de travail contient le dossier **« Modèles PME »**. Ouvrez un modèle, cliquez sur **Exécuter**, remplissez les champs d'entrée :

| Modèle | Ce qu'il fait | Champs |
|---|---|---|
| Devis client | Rédige un devis : tableau HT, TVA 20 %, TTC, validité, conditions | client, prestations |
| Relance de facture impayée | Écrit la relance adaptée au niveau 1 (courtois), 2 (ferme) ou 3 (mise en demeure) | client, facture, montant, échéance, niveau |
| Réponse support (FAQ) | Répond à partir de votre FAQ, sinon propose un rappel par un conseiller | question, faq |
| Tri des e-mails entrants | Classe l'e-mail (catégorie, urgence, résumé), puis prépare un brouillon de réponse | email |
| Compte rendu de réunion | Décisions, actions, responsables, échéances | transcription |

Dupliquez un modèle pour l'adapter : modifiez les consignes des blocs **Agent**, ajoutez des blocs (envoi d'e-mail, table, outil Nexora Connect…).

## Votre premier workflow

1. **Nouveau workflow** dans la barre latérale.
2. Ajoutez un bloc **Agent** après le bloc **Start**. Le modèle **Nexora** est choisi par défaut.
3. Dans le message, faites référence aux champs d'entrée avec `<start.nom_du_champ>`, et à la réponse d'un bloc précédent avec `<nom_du_bloc.content>`.
4. **Exécuter** affiche le résultat et le détail de chaque étape dans les journaux.
5. **Déployer** rend le workflow accessible par API, par chat ou par planification.

## Vos outils : Nexora Connect

Nexora Connect est déjà branché (Réglages › Outils MCP). Dans un bloc Agent, ajoutez les outils **Nexora Connect** : l'agent peut alors chercher et exécuter des actions dans vos services (Brevo, Google, Microsoft, Slack…) une fois vos comptes connectés dans l'administration de Nexora Connect.

## Suivre la consommation

**Réglages › Consommation** affiche les requêtes et les jetons consommés par jour, tels que mesurés par Nexora API. Aucun coût caché : tout appel de modèle passe par Nexora API.

## Changer de langue

**Réglages › Général › Langue** : Français ou English.
