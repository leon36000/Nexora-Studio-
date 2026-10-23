# Prise en main de Nexora WorkStudio

## L'Accueil

En vous connectant, vous arrivez sur l'**Accueil** de votre espace (entrée « Accueil » de la barre latérale) :

- **Créer** : un *Workflow* vide, ou un *Agent* prêt à discuter (déclencheur Chat → bloc Agent sur le modèle par défaut → Réponse), ouvert dans l'éditeur.
- **Démarrages rapides** : les modèles PME de l'espace, *Inviter l'équipe*, *Connecter un outil*.
- **État de la plateforme** : le modèle par défaut, la consommation du mois (administrateurs) et les cinq dernières exécutions.

### Le premier lancement (administrateurs)

Tant qu'il n'est pas terminé, l'Accueil des administrateurs affiche cinq étapes, chacune passable :

1. **Votre organisation** : son nom (et son logo).
2. **Votre modèle** : le modèle par défaut, à tester ou changer dans [Réglages › Modèles](modeles.md).
3. **Votre équipe** : inviter par e-mail, ou copier le lien d'invitation si aucun service d'e-mail n'est configuré.
4. **Vos outils** : brancher vos services dans Nexora Connect.
5. **Premier résultat** : générer un devis d'exemple avec le modèle PME « Devis client ».

« Plus tard » masque le panneau ; « Reprendre le premier lancement » le rouvre.

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

1. **Nouveau workflow** dans la barre latérale (ou la carte *Workflow* de l'Accueil).
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
