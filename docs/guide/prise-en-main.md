# Prise en main de Nexora WorkStudio

## L'Accueil

En vous connectant, vous arrivez sur l'**Accueil** de votre espace (entrée « Accueil » de la barre latérale) :

- **Créer** : un *Workflow* vide (ouvert dans l'éditeur), ou un *Agent* (ouvert dans son formulaire : voir [Les agents](agents.md)).
- **Démarrages rapides** : les modèles PME de l'espace, *Inviter l'équipe*, *Connecter un outil*.
- **État de la plateforme** : le modèle par défaut, la consommation des 30 derniers jours (administrateurs) et les cinq dernières exécutions.

### Le premier lancement (administrateurs)

Tant qu'il n'est pas terminé, l'Accueil des administrateurs affiche cinq étapes, chacune passable :

1. **Votre organisation** : son nom.
2. **Votre modèle** : le modèle par défaut, à **tester** sur place ou changer dans [Réglages › Modèles](modeles.md).
3. **Votre équipe** : inviter par e-mail si un service d'e-mail est configuré, sinon copier le lien d'invitation (Réglages › Collaborateurs).
4. **Vos outils** : brancher vos services dans Nexora Connect.
5. **Premier résultat** : générer un devis d'exemple avec le modèle PME « Devis client ».

« Plus tard » masque le panneau ; « Reprendre le premier lancement » le rouvre.

## Les modèles PME

Chaque nouvel espace de travail contient le dossier **« Modèles PME »**, soit **20 modèles** qui s'ouvrent dans la [vue Étapes](etapes.md). Ouvrez un modèle, vérifiez les **Données d'exemple** du déclencheur (déjà remplies, sauf les adresses e-mail), puis **Tester le workflow** ou **Exécuter** :

| Modèle | Ce qu'il fait |
|---|---|
| Devis client | Rédige un devis : tableau HT, TVA 20 %, TTC, validité, conditions |
| Relance de facture impayée | Écrit la relance adaptée au niveau 1 (courtois), 2 (ferme) ou 3 (mise en demeure) |
| Relance de devis sans réponse | Relance commerciale aimable, avec un échange de 15 minutes proposé |
| Réponse support (FAQ) | Répond à partir de votre FAQ, sinon propose un rappel par un conseiller |
| Tri des e-mails entrants | Classe l'e-mail (catégorie, urgence, résumé), puis prépare un brouillon de réponse |
| Réponse client validée avant envoi | Brouillon, validation par une personne, puis envoi par e-mail seulement si elle approuve |
| Réponse à une réclamation | Réponse empathique avec un geste commercial adapté |
| Réponse à un avis client | Réponse publique posée à un avis, positif ou critique |
| Contrôle d'une facture fournisseur | Extrait les données, vérifie les calculs et conclut « À payer » ou « À vérifier » |
| Résumé d'un contrat | Résumé, délais, montants et clauses à faire relire (ne remplace pas un juriste) |
| Compte rendu de réunion | Enregistrement, transcription par intervenant, compte rendu, validation, e-mail |
| Compte rendu d'entretien | Met en forme les notes d'un entretien : engagements, prochaines étapes |
| Ordre du jour de réunion | Ordre du jour chronométré à partir des sujets |
| Rapport d'activité hebdomadaire | Réalisations, chiffres clés, difficultés, priorités |
| Offre d'emploi | Annonce claire, sans critère discriminant |
| Accueil d'un nouveau salarié | E-mail d'accueil et liste de préparation |
| Fiche produit | Titre, description, points forts et méta-description pour le site |
| Publication réseaux sociaux | Trois publications (LinkedIn, Facebook, Instagram) |
| Newsletter mensuelle | Objets au choix, introduction, rubriques, appel à l'action |
| Traduction professionnelle | Traduit en gardant le ton, puis signale les points délicats |

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

## Navigateurs

Nexora WorkStudio est vérifié, à chaque version, dans les versions récentes de **Chrome et Edge** (Chromium), **Firefox** et **Safari** (WebKit), sur ordinateur et sur téléphone (écran de 390 px) : connexion, écrans de l'application, éditeur (glisser-déposer, annuler et rétablir, raccourcis `Cmd` sur Mac et `Ctrl` ailleurs), chat public et bulle à intégrer sur un site. Les raccourcis s'adaptent à la machine : `Cmd+K` sur Mac, `Ctrl+K` sous Windows et Linux ouvrent la recherche. Si un écran se comporte mal dans l'un d'eux, signalez le navigateur et sa version à votre administrateur.
