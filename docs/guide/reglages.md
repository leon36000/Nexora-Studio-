# Réglages et gouvernance

| Réglage | Où | Pour qui |
|---|---|---|
| Membres, rôles, invitations | Réglages › Membres | Administrateurs de l'organisation |
| Groupes d'accès (ce que chaque groupe peut faire) | Réglages › Groupes d'accès | Administrateurs de l'organisation |
| Connexion unique (SSO), inscriptions | Réglages › Sécurité | Administrateurs de l'instance |
| Serveur d'e-mail (SMTP) | Réglages › E-mail | Administrateurs de l'instance |
| Modèles d'IA (par défaut, ajout, test) | Réglages › Modèles ([guide](modeles.md)) | Administrateurs de l'instance |
| Applications OAuth des connecteurs | Réglages › Connecteurs ([guide](connecteurs.md)) | Administrateurs de l'instance |
| Consommation, empreinte, budgets | Réglages › Consommation | Administrateurs de l'instance |
| Journal d'audit | Réglages › Journal d'audit | Administrateurs |
| Secrets et variables d'environnement | Réglages › Secrets | Membres de l'espace |
| Outils MCP (Nexora Connect…) | Réglages › Outils MCP | Membres de l'espace |
| Clés d'API (workflows) | Réglages › Clés API | Membres |

Les **administrateurs de l'instance** sont le propriétaire et les administrateurs de l'organisation créée à l'installation.

## Sécurité : connexion unique et inscriptions

**Connexion unique (SSO).** Renseignez l'**émetteur** OpenID Connect de votre fournisseur, l'**identifiant** et le **secret** du client, et le **nom du bouton** (« Se connecter avec … »). Côté fournisseur, déclarez l'adresse de retour indiquée à l'écran (détails par fournisseur : [Connexion unique](sso.md)).

- **Tester** vérifie que l'émetteur répond et publie sa configuration, sans rien enregistrer.
- **Connexion obligatoire** : les membres ne peuvent plus se connecter par mot de passe ; le propriétaire et les administrateurs gardent leur mot de passe en secours, pour ne jamais se retrouver enfermés dehors si le fournisseur tombe.

**Domaines autorisés.** Listez les domaines (`mon-entreprise.fr`) dont les adresses peuvent créer un compte seules. Une adresse d'un autre domaine (expert-comptable, prestataire) doit avoir reçu une **invitation**. Le filtre porte sur la création de compte, par e-mail comme par SSO : une personne déjà inscrite se connecte toujours.

## E-mail

Renseignez le serveur SMTP (hôte, port, utilisateur, mot de passe, adresse d'expédition), puis **Envoyer un e-mail de test** : le message part vers votre adresse avec les valeurs saisies, avant même de les enregistrer. Sans serveur d'e-mail, les invitations restent possibles : copiez le lien d'invitation et envoyez-le vous-même.

## Enregistrer, puis appliquer

Les mots de passe et secrets sont **chiffrés** en base et ne sont jamais réaffichés (« ••• défini ») ; laissez le champ vide pour garder la valeur enregistrée.

La connexion, l'e-mail et les domaines sont lus **au démarrage** de WorkStudio. Après **Enregistrer**, un bandeau indique que des réglages attendent d'être appliqués : **Appliquer** redémarre WorkStudio (environ 20 secondes) et la page se recharge seule. Une exécution en cours à ce moment peut être interrompue ; les workflows en attente (validation, minuterie) reprennent normalement.

**`deploy/.env` reste prioritaire.** Si une valeur y est définie (`NEXORA_OIDC_ISSUER`, `NEXORA_SMTP_HOST`, `NEXORA_ALLOWED_EMAIL_DOMAINS`…), l'écran l'indique (« Défini dans deploy/.env ») et la section correspondante est en lecture seule : modifiez le fichier puis `nexora restart`.

## Groupes d'accès

Sans groupe, chacun a les droits de son **rôle** dans l'espace (lecture, écriture, administration). Un groupe **restreint** ce que ses membres peuvent faire, et le serveur refuse ce qui est interdit.

1. **Créer un groupe** à partir d'un modèle :
   - **Lecture seule** : consulter et lancer les workflows, sans les modifier, déployer, exposer ni administrer ;
   - **Créateurs** : construire et déployer, sans partage public ni nouvel espace ;
   - **Administrateurs** : toutes les capacités.
2. Choisir la **portée** : tous les espaces (groupe par défaut, pour tous les membres qui ne sont dans aucun autre groupe) ou des espaces choisis.
3. Ajuster **ce que le groupe peut faire** (déploiement, outils, connaissances, tables, fichiers, journaux…) et ajouter ses **membres**. Sans membre ajouté, un groupe limité à des espaces s'applique à tous les membres de ces espaces.

Supprimer un groupe rend à ses membres les droits du groupe par défaut ou de leur rôle.
