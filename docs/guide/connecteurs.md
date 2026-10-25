# Les connecteurs

Les **connecteurs** branchent vos services (messagerie, CRM, agenda, stockage, facturation…) sur Nexora. Plus de 1 600 services sont proposés par **Nexora Connect**, le moteur de connecteurs intégré à votre instance. Une fois un service connecté, vos agents et vos workflows peuvent agir dedans.

Ouvrez **Connecteurs** dans la barre latérale (ou la carte *Connecter un outil* de l'Accueil).

## Trouver un service

- **Rechercher** par nom (« Brevo », « Pipedrive »…) ou filtrer par **catégorie**.
- Les services déjà connectés à l'espace portent la mention **Connecté**.
- La **fiche** d'un service montre ce qu'il permet de faire (ses actions) et comment le connecter.

## Connecter un service

Il faut le droit d'écriture sur l'espace.

**Avec une clé API ou des identifiants.** La fiche affiche le formulaire demandé par le service : collez la clé (créée dans le compte du service), puis **Connecter**. La clé est transmise à Nexora Connect et n'est plus jamais réaffichée ; pour la changer, connectez de nouveau le service.

**Avec un compte (OAuth : Google, Microsoft, Slack…).** **Connecter** ouvre la page du service : autorisez l'accès, la fenêtre se ferme et la fiche passe à *Connecté*. Il faut qu'un administrateur ait enregistré une fois l'application du fournisseur (voir plus bas) ; sinon la fiche l'explique.

Une seule demande OAuth peut être en cours à la fois pour un même service sur l'instance : si un collègue en lance une en même temps, la vôtre est remplacée et un message vous invite à recommencer.

**Déconnecter** retire la connexion de l'espace. Les workflows qui l'utilisaient échouent proprement jusqu'à une nouvelle connexion.

## Utiliser un service connecté

Chaque espace possède le serveur d'outils **Nexora Connect** ([Outils MCP](outils-mcp.md)). Ajoutez-le aux **Outils** d'un agent ou d'un bloc Agent : le modèle trouve l'action utile (`search_actions`), lit son mode d'emploi (`get_action_guide`) et l'exécute (`execute_action`) avec la connexion de l'espace, sans que vous ayez à la nommer. Le bloc **MCP** permet aussi d'appeler une action précise dans un workflow.

## Connexions personnelles

Une connexion peut aussi appartenir à **une personne** plutôt qu'à l'espace. Dans **Connecteurs**, le bouton **Mes connexions** (ou le lien du même nom dans l'[Assistant](assistant.md)) bascule le catalogue en mode personnel : **tous les membres** de l'espace, lecteurs compris, peuvent y connecter **leur** compte (clé API, identifiants ou OAuth, comme ci-dessus) et le déconnecter.

- Une connexion personnelle n'est utilisée que dans **les conversations de son propriétaire** dans l'Assistant et dans **ses tâches planifiées**. Ni un autre membre, ni un administrateur, ni un workflow lancé par quelqu'un d'autre ne peut s'en servir.
- Pour un service que la personne a connecté elle-même, la connexion personnelle **l'emporte** sur celle de l'espace dans ses conversations ; pour les autres services, celle de l'espace reste utilisée.
- Chaque personne a, dans Nexora Connect, son propre jeton d'accès, limité à ses connexions et à celles de l'espace. Ce jeton est conservé chiffré par WorkStudio et n'est jamais renvoyé à une page, une réponse d'API, un journal ou une trace. Si Nexora Connect est injoignable, l'outil échoue : il ne retombe jamais sur la connexion de l'espace à la place d'un compte personnel.
- Une connexion personnelle appartient à la personne pour toute l'instance : elle la retrouve dans chacun de ses espaces.

## Cloisonnement entre espaces

Une connexion appartient à **un seul espace**. Les outils Nexora Connect d'un espace utilisent un jeton qui n'ouvre que les connexions de cet espace : un autre espace de la même instance ne voit ni ne peut utiliser vos comptes. Les services sans authentification (données publiques) restent disponibles partout.

## Pour les administrateurs : applications OAuth

**Réglages › Connecteurs** (administrateurs de l'instance) :

1. Créez une application chez le fournisseur (Google Cloud, Microsoft Entra, Slack…).
2. Déclarez-y l'**adresse de retour** affichée par Nexora (bouton *Copier*). Elle doit être joignable depuis le navigateur des utilisateurs : sans adresse publique (voir [Installation](installation.md), HTTPS), OAuth est indiqué comme indisponible.
3. Collez l'**identifiant** et le **secret** de l'application, puis **Enregistrer**. Ils sont conservés par Nexora Connect, jamais par WorkStudio.

## En cas de problème

| Message | Que faire |
|---|---|
| *Le fournisseur a refusé ces informations* | Vérifiez la clé dans le compte du service (droits, expiration) |
| *Nexora Connect est injoignable* | `nexora status`, puis `nexora logs nexora-connect` |
| *Une autre demande de connexion … a remplacé la vôtre* | Une autre connexion OAuth du même service était en cours : recommencez |
| *Un administrateur doit d'abord enregistrer l'application OAuth* | Un administrateur doit la renseigner dans Réglages › Connecteurs |
