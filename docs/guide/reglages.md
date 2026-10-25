# Réglages et gouvernance

| Réglage | Où | Pour qui |
|---|---|---|
| Membres, rôles, invitations | Réglages › Membres | Administrateurs de l'organisation |
| Groupes d'accès (ce que chaque groupe peut faire) | Réglages › Groupes d'accès | Administrateurs de l'organisation |
| Connexion unique (SSO) | Réglages › Sécurité | Propriétaire de l'instance (administrateurs : lecture seule) |
| Inscriptions (domaines autorisés) | Réglages › Sécurité | Administrateurs de l'instance |
| Serveur d'e-mail (SMTP) | Réglages › E-mail | Administrateurs de l'instance |
| Modèles d'IA (par défaut, ajout, test) | Réglages › Modèles ([guide](modeles.md)) | Administrateurs de l'instance |
| Applications OAuth des connecteurs | Réglages › Connecteurs ([guide](connecteurs.md)) | Administrateurs de l'instance |
| Consommation, empreinte, budgets | Réglages › Consommation | Administrateurs de l'instance |
| Journal d'audit | Réglages › Journaux d’audit | Administrateurs |
| Secrets et variables d'environnement | Réglages › Secrets | Membres de l'espace |
| Outils MCP (Nexora Connect…) | Réglages › Outils MCP | Membres de l'espace |
| Clés d'API (workflows) | Réglages › Clés d’API Nexora | Membres |

Les **administrateurs de l'instance** sont le propriétaire et les administrateurs de l'organisation créée à l'installation.

## Sécurité : connexion unique et inscriptions

**Connexion unique (SSO).** Réservée au **propriétaire** de l'instance : un fournisseur d'identité qui certifie une adresse peut ouvrir le compte qui porte cette adresse, c'est donc un réglage aussi sensible que le compte du propriétaire lui-même. Les administrateurs la voient en lecture seule. Renseignez l'**émetteur** OpenID Connect de votre fournisseur, l'**identifiant** et le **secret** du client, et le **nom du bouton** (« Se connecter avec … »). Côté fournisseur, déclarez l'adresse de retour indiquée à l'écran (détails par fournisseur : [Connexion unique](sso.md)). Changer d'émetteur ou d'identifiant client oblige à ressaisir le secret.

- **Tester** vérifie que l'émetteur répond et publie sa configuration, sans rien enregistrer.
- **Connexion obligatoire** : les membres ne peuvent plus ouvrir de session par mot de passe (connexion, ni ouverture automatique après une inscription ou une vérification d'adresse) ; le propriétaire et les administrateurs gardent leur mot de passe en secours, pour ne jamais se retrouver enfermés dehors si le fournisseur tombe. Un mot de passe erroné reçoit la même réponse quel que soit le rôle du compte. Quand elle devient obligatoire, **Appliquer** ferme aussi les sessions ouvertes des membres : ils se reconnectent par le fournisseur. Depuis `deploy/.env` : `NEXORA_OIDC_REQUIRED=true`.
- **Comptes déjà inscrits.** À sa première connexion par le SSO, un compte existant (créé avant le SSO, par mot de passe) n'est rattaché automatiquement au fournisseur que si son adresse appartient à un **domaine autorisé** — ou, sans domaine autorisé, si le fournisseur est défini dans `deploy/.env`. Les comptes du propriétaire et des administrateurs ne sont **jamais** rattachés ainsi : ils gardent leur mot de passe. Avec la connexion obligatoire, renseignez donc les domaines autorisés, sans quoi les membres inscrits avant le SSO ne pourront plus se connecter.

**Domaines autorisés.** Listez les domaines (`mon-entreprise.fr`) dont les adresses peuvent créer un compte seules. Une adresse d'un autre domaine (expert-comptable, prestataire) doit avoir reçu une **invitation**. Le filtre porte sur la création de compte, par e-mail comme par SSO : une personne déjà inscrite se connecte toujours.

> **Le filtrage par domaine n'a de sens qu'avec la vérification des adresses e-mail** (`NEXORA_EMAIL_VERIFICATION=true` dans `deploy/.env`, avec un service d'e-mail configuré). Sans elle, n'importe qui peut s'inscrire avec une adresse d'un domaine autorisé qui ne lui appartient pas.

## E-mail

Renseignez le serveur SMTP (hôte, port, utilisateur, mot de passe, adresse d'expédition), puis **Envoyer un e-mail de test** : le message part vers votre adresse avec les valeurs saisies, avant même de les enregistrer. Le mot de passe enregistré n'est réutilisé que pour le même serveur et le même utilisateur : changer l'un ou l'autre oblige à le ressaisir. Sans serveur d'e-mail, les invitations restent possibles : copiez le lien d'invitation et envoyez-le vous-même.

Si une clé Resend (`RESEND_API_KEY`) est définie dans `deploy/.env`, les e-mails partent par Resend et le serveur SMTP ne sert qu'en secours ; l'écran le signale.

## Enregistrer, puis appliquer

Les mots de passe et secrets sont **chiffrés** en base et ne sont jamais réaffichés (« ••• défini ») ; laissez le champ vide pour garder la valeur enregistrée.

La connexion, l'e-mail et les domaines sont lus **au démarrage** de WorkStudio. Après **Enregistrer**, un bandeau indique que des réglages attendent d'être appliqués : **Appliquer** redémarre WorkStudio (environ 20 secondes) et la page se recharge seule. Une exécution en cours à ce moment peut être interrompue ; les workflows en attente (validation, minuterie) reprennent normalement. WorkStudio laisse 15 secondes aux requêtes en cours (réponses de l'assistant, suivi d'exécution) puis s'arrête de toute façon. Un second **Appliquer** pendant le redémarrage, ou sans réglage en attente, est refusé.

Si la base de données ne répond pas au démarrage, WorkStudio réessaie pendant environ une minute puis s'arrête, et Docker le relance : il ne démarre jamais sans les règles enregistrées (domaines, connexion obligatoire). Un secret devenu illisible (clé `ENCRYPTION_KEY` changée) ne bloque que sa section, signalée dans le journal du conteneur.

**`deploy/.env` reste prioritaire.** Si une valeur y est définie (`NEXORA_OIDC_ISSUER`, `NEXORA_SMTP_HOST`, `NEXORA_ALLOWED_EMAIL_DOMAINS`…), l'écran l'indique (« Défini dans deploy/.env ») et la section correspondante est en lecture seule : modifiez le fichier puis `nexora restart`. Une section vient entièrement de l'un ou de l'autre : quand elle vient de l'écran, aucune valeur de cette section laissée dans `deploy/.env` (utilisateur ou mot de passe SMTP, par exemple) ne s'y mêle.

## Groupes d'accès

Sans groupe, chacun a les droits de son **rôle** dans l'espace (lecture, écriture, administration). Un groupe **restreint** ce que ses membres peuvent faire, et le serveur refuse ce qui est interdit.

1. **Créer un groupe** à partir d'un modèle :
   - **Lecture seule** : consulter et lancer les workflows, sans les modifier, déployer, exposer ni administrer ;
   - **Créateurs** : construire et déployer, sans partage public ni nouvel espace ;
   - **Administrateurs** : toutes les capacités.
2. Choisir la **portée** : tous les espaces (groupe par défaut, pour tous les membres qui ne sont dans aucun autre groupe) ou des espaces choisis.
3. Ajuster **ce que le groupe peut faire** (déploiement, outils, connaissances, tables, fichiers, journaux…) et ajouter ses **membres**. Sans membre ajouté, un groupe limité à des espaces s'applique à tous les membres de ces espaces.

Un groupe choisit aussi **les modèles que ses membres peuvent utiliser**, et chaque espace a sa [politique de données personnelles](gouvernance.md) ; le journal d'audit s'exporte pour un tableur français. Tout est détaillé dans [Gouvernance avancée et garde-fous](gouvernance.md).

Supprimer un groupe rend à ses membres les droits du groupe par défaut ou de leur rôle.
