# K2 — parcours « aucun mot anglais » : les 15 écrans principaux

Critère K2 (analyse d'écart §3.2) : sur pc6, un parcours au navigateur de ces 15 écrans ne montre **aucun mot anglais, fenêtres de confirmation comprises**. Langue de l'interface : français (par défaut ; vérifier qu'aucun cookie `NEXORA_LOCALE=en` ne traîne). `{ws}` = identifiant de l'espace, `{wf}` = un workflow existant.

Pour chaque écran : ouvrir, survoler les boutons à icône (infobulles, `aria-label` via l'arbre d'accessibilité), ouvrir au moins une liste déroulante et une fenêtre de confirmation, puis noter tout mot anglais (capture + emplacement).

| # | Écran | Route | À regarder |
|---|---|---|---|
| 1 | Connexion | `/login` (puis `/signup`, mot de passe faux) | Libellés, erreurs, lien « mot de passe oublié », bouton SSO éventuel. |
| 2 | Accueil | `/workspace/{ws}/home` | Cartes Créer, Démarrages rapides, État, panneau Premier lancement ; fenêtre « Créer avec le Copilote ». |
| 3 | Éditeur — canevas | `/workspace/{ws}/w/{wf}` | Phrases des cartes (Agent : « Interroger ⟨un modèle⟩ avec … »), titres « Démarrage » / « Agent 2 » (noms générés), boucle « Boucle 1 » et pastille « Début », poignée « En cas d'erreur », note (« Ajouter une note… », Replier/Déplier), bouton « Supprimer la liaison » sur un lien sélectionné, badges « désactivé » / « Webhook ». |
| 4 | Éditeur — panneau de bloc | même route, clic sur un bloc Agent puis Gmail ou Slack | Titres et aides des champs, options des listes (opération), recherche des listes (« Rechercher… », « Aucune option correspondante », « Chargement des options… »), sélecteur de date/heure (mois, jours « Lu Ma … », « Aujourd'hui »), barre d'outils des blocs (noms et descriptions). |
| 5 | Supprimer un workflow | barre latérale › menu du workflow › Supprimer | Fenêtre de confirmation : titre, texte, « Annuler », bouton « Fermer » (croix, infobulle/lecteur d'écran), notification après suppression (« Fermer la notification »). |
| 6 | Journaux | `/workspace/{ws}/logs` | Filtres, période personnalisée (calendrier, « Effacer », « Annuler », « Appliquer »), détail d'une exécution, export. |
| 7 | Agents | `/workspace/{ws}/agents` puis un agent | Liste, formulaire (consignes, modèle, outils), Tester, Publier, Versions. |
| 8 | Playground | `/workspace/{ws}/playground` | Colonnes, sélecteur de modèle, « Enregistrer comme agent ». |
| 9 | Assistant | `/workspace/{ws}/assistant` | Liste des conversations, envoi, pièce jointe, renommer/supprimer (confirmation). |
| 10 | Connecteurs | `/workspace/{ws}/connecteurs` puis `/workspace/{ws}/connecteurs/postmark` | Une seule puce par catégorie (plus de « E-commerce international » ×3) ; formulaire de clé : libellé « Clé d'API », aide du fournisseur repliée sous « Aide du fournisseur (en anglais) » ; « Déconnecter » (confirmation). |
| 11 | Connaissances | `/workspace/{ws}/knowledge` puis « Nouvelle base » | Liste, création (zone de dépôt « Déposez des fichiers ici ou cliquez pour parcourir »), document en cours de traitement. |
| 12 | Tables et fichiers | `/workspace/{ws}/tables`, `/workspace/{ws}/files` | Import CSV (progression « Annuler » / « Fermer »), menus de ligne, vide. |
| 13 | Réglages › Modèles et Consommation | `/workspace/{ws}/settings/models`, `/workspace/{ws}/settings/usage` | Fiches, Tester, Définir par défaut, Retirer (confirmation) ; graphiques (« Aucune donnée », légende). |
| 14 | Réglages › Membres et Secrets | `/workspace/{ws}/settings/teammates`, `/workspace/{ws}/settings/secrets` | Invitation (champ d'adresses « Saisissez des adresses e-mail », « Adresse e-mail invalide »), rôles et verrous (infobulles), éditeur de secrets (actions de ligne, enregistrement, erreurs de nom). |
| 15 | Réglages › Journal d'audit et Groupes d'accès | `/workspace/{ws}/settings/audit-logs`, `/workspace/{ws}/settings/access-control` | Colonne Détail sans phrase anglaise (nom de la ressource, sinon noms/adresses cités, sinon « — ») ; groupe « Lecture seule » : un membre de ce groupe qui tente de créer un workflow (barre latérale ou Copilote) voit « Non autorisé par le groupe d'accès de votre organisation : modification des workflows. » |

## Hors critère (contenu, pas interface)

- Données de l'utilisateur et réponses des modèles.
- Catalogue de Nexora Connect : descriptions de services et noms/descriptions d'actions (marqués `lang="en"`), aide propre à chaque fournisseur (repliée).
- Identifiants de référence des blocs (`<start.input>`, `<agent1.content>`) et noms de marques (Gmail, Slack…).
- Export CSV du journal d'audit (garde la description enregistrée).

## Contre-épreuve

Réglages › Général : passer la langue en anglais, recharger l'écran 5 — la fenêtre doit afficher l'anglais d'origine (« Cancel »), sans mélange ; revenir au français.
