# 03 — Administration : organisation, workspaces, identité, sécurité et facturation

> **Périmètre** : Admin Panel (`admin.mistral.ai`), hiérarchie Enterprise Account › Organization › Workspace, workspaces dans Studio et Vibe, RBAC, membres, groupes, service accounts, workload identity federation, clés API, administration des connecteurs, vérification de domaine, authentification par domaine e-mail, SAML SSO, audit logs, zero data retention, abonnements, facturation, factures, usage et limites, Admin API · **Sources** : 33 pages de docs.mistral.ai (copie du 21/10/2026), recoupées ponctuellement avec la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Modèle d'administration et hiérarchie
   - 3.2 Organization
   - 3.3 Enterprise Accounts
   - 3.4 Workspaces : création, accès, archivage
   - 3.5 Workspaces dans Studio
   - 3.6 Workspaces dans Vibe
   - 3.7 RBAC : rôles et permissions
   - 3.8 Gestion des membres
   - 3.9 Groupes d'utilisateurs
   - 3.10 Service accounts
   - 3.11 Workload identity federation
   - 3.12 Clés API (et Admin API keys)
   - 3.13 Administration des connecteurs
   - 3.14 Vérification de domaine
   - 3.15 Authentification par domaine e-mail
   - 3.16 SAML SSO
   - 3.17 SCIM (private preview)
   - 3.18 Audit logs (référence complète)
   - 3.19 Zero data retention (ZDR)
   - 3.20 Abonnements (plans, sièges, usage inclus, pay-as-you-go)
   - 3.21 Facturation (paiement, crédits, plafonds)
   - 3.22 Factures
   - 3.23 Usage et limites (dashboard, plafonds, rate limits)
4. Interface utilisateur
5. API et SDK (Admin API, API service accounts)
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Admin Panel** (`https://admin.mistral.ai`) = la surface de contrôle de l'Organization : accès, structure en Workspaces, suivi d'usage, politiques, facturation, conformité. Accessible directement ou via le menu principal de Vibe/Studio › `Admin`. **Sessions partagées** entre Vibe, Studio et Admin Panel (pas de reconnexion).
- Accès réservé aux rôles **Organization admin** ou **Workspace admin** ; les pages/actions visibles dépendent du rôle (la page Billing admet aussi le rôle Organization **Billing**).
- **Hiérarchie à 3 niveaux** : **Enterprise Account** (lie plusieurs Organizations, Enterprise uniquement, créé par Mistral) › **Organization** (compte de l'entreprise : membres, Workspaces, facturation, accès, politiques) › **Workspace** (environnement partagé : membres, clés API, ressources, usage, plafonds ; ≤ 500 actifs par Organization).
- **RBAC** à deux portées indépendantes, rôles prédéfinis, **cumulables et additifs** : 3 rôles d'Organization (`member`, `billing_manager`, `organization_admin`) et 6 rôles de Workspace documentés (`user`, `dev`, `mistral_code_user`, `workspace_contributor`, `workspace_admin`, `observability_viewer`) + `billing` (page API seulement) et `workflow_executor` (service accounts).
- **Identité humaine** : e-mail/mot de passe ; **authentification par domaine e-mail** (Team et plus) ; **SAML 2.0 SSO** (Enterprise ; OIDC non supporté) ; **vérification de domaine** par enregistrement DNS TXT ; **SCIM** en private preview (non documenté publiquement, endpoints présents dans la spec).
- **Identité machine** : **service accounts** (portée Workspace) authentifiés par **workload identity federation** (jetons OIDC/Kubernetes signés, sans secret stocké — méthode recommandée) ou par **API key** longue durée.
- **Clés API** : portée Workspace (quota, rate limits, ressources du Workspace), types `Studio` / `Vibe` / `Mistral Code` (legacy), **Connector access scope**, expiration optionnelle encadrée par une **API key expiration policy** (Org › Workspace). Les **Admin API keys** sont distinctes : portée une Organization, créées dans la section enterprise.
- **Gouvernance** : **audit logs** (Enterprise, activés par défaut, pas d'export ; 3 types d'acteurs, 45 types de cibles, 196 événements documentés — la spec en contient davantage) ; **ZDR** (plans payants, sur demande motivée, 10 endpoints stateless, hors modèles Labs) ; **training opt-out** distinct.
- **Facturation** : plans globaux (Vibe + Studio + API) Free mode, Pro, Education, Team, Enterprise ; **usage mensuel inclus** partagé Studio/API/Vibe Code ; **pay-as-you-go prépayé par crédits** (auto recharge, gift codes) ; **plafonds de dépense mensuels** Organization et Workspace ; HTTP `402` quand le solde est épuisé.
- **Admin API** : **Enterprise uniquement, non self-serve, en Preview** ; base `https://api.mistral.ai/v1/admin`, en-tête `x-api-key` ; utilisateurs, invitations, Workspaces, groupes, rôles, clés API, plafonds, usage, analytics, audit logs. Exemples documentés uniquement en `curl` (aucune méthode SDK).

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| **Admin Panel** / **Admin** | Console d'administration (`admin.mistral.ai`). Certaines pages l'appellent **Admin Console** (service accounts, trusted issuers). |
| **Enterprise Account** | Couche administrative au-dessus des Organizations, qui en lie une ou plusieurs. Réservée aux clients Enterprise, créée initialement par Mistral. ≠ plan Enterprise. |
| **Enterprise plan** | Palier de facturation d'**une** Organization débloquant Admin API, audit logs, SSO, groupes… |
| **Organization** | Compte de plus haut niveau de l'entreprise : membres, Workspaces, facturation, paramètres d'accès, politiques. Créée automatiquement à l'inscription. |
| **Workspace** | Environnement partagé dans une Organization pour une équipe/un cas d'usage : membres et rôles, clés API, ressources, usage et plafonds, réglages produit. |
| **Default Workspace** | Workspace créé avec chaque Organization ; non archivable ; on ne peut pas en retirer un membre. |
| **Members** | Personnes appartenant à l'Organization ; accèdent aux Workspaces via rôles, groupes et provisioning. |
| **Organization role** / **Workspace role** | Rôles prédéfinis RBAC à portée Organization ou Workspace ; indépendants, cumulables, additifs. |
| **Seat** | Siège produit payant attribué à un membre (Vibe/Team, Mistral Code…). `subscription_types` côté API : `CHAT`, `MISTRAL_CODE`. |
| **User group** | Collection nommée d'utilisateurs, assignée à des Workspaces avec des rôles (Enterprise). |
| **Externally managed** | Profil/groupe dont l'IdP (SSO/SCIM) est la source de vérité ; champs non éditables dans Mistral. |
| **Service account** | Identité non humaine à portée Workspace (nom, rôles, credentials propres) pour l'authentification machine-à-machine. |
| **Principal** | Entité authentifiée (personne ou service account) ; colonne `Principal` de la liste des clés API. |
| **Workload identity federation** | Authentification d'un workload comme service account via un jeton court signé par un émetteur de confiance ; aucun secret stocké. |
| **Trusted issuer** | Émetteur OIDC pré-approuvé (typiquement un cluster Kubernetes) dont les jetons signés sont acceptés. Géré par l'Organization admin. |
| **Subject** | Identifiant du workload chez l'émetteur, ex. `system:serviceaccount:<namespace>:<name>`. |
| **Credential** (workload identity) | Lien autorisant un subject donné à s'authentifier comme un service account. Géré par le Workspace admin. |
| **Proof of ownership** / **Proof token** | Jeton fraîchement signé portant l'audience à usage unique, prouvant le contrôle du subject. |
| **Audience** | Claim `aud` : `mistral-auth:<nonce>` (enregistrement, usage unique) puis `api-gateway` (exécution). |
| **Hardened deployment** | Déploiement de workflows restreignant les principals autorisés à enregistrer des workflows (Studio Workflows). |
| **API key** | Clé d'authentification à l'API, à portée Workspace ; types `Studio`, `Vibe`, `Mistral Code` (legacy). |
| **Admin API key** | Clé dédiée à l'Admin API, portée une Organization, créée dans la section enterprise de l'Admin Panel. |
| **Connector access scope** | Portée connecteurs d'une clé : `Shared connectors only` (défaut) ou `Private and shared connectors`. |
| **API key expiration policy** | Durée maximale de validité des nouvelles clés (Org, durcissable par Workspace). Désactivée par défaut. |
| **App Connections** | Applications (GitHub, Slack) connectées une fois au niveau Organization, utilisables par les membres sans connexion individuelle. |
| **Connector permissions** | `Allowed` / `Restricted` / `Blocked` : outils de connecteur disponibles pour le modèle dans un Workspace. |
| **Domain Ownership** | Section de `Administration › Access` listant les domaines ajoutés/vérifiés. |
| **Discoverable** | Interrupteur par domaine vérifié activant l'**email domain authentication** (adhésion libre via `Join Organization`). |
| **SAML SSO** | Authentification via l'IdP d'entreprise (SAML 2.0), avec provisioning au premier login. |
| **ACS URL** / **Entity ID** | Paramètres SAML fournis par Mistral à recopier dans l'IdP. |
| **Automatic seat assignment** | Attribution automatique d'un siège au premier login SSO si sièges disponibles. |
| **SCIM** | System for Cross-domain Identity Management : provisioning/déprovisioning automatisé (private preview). |
| **Audit log** | Journal chronologique des actions (acteur, événement, cible, métadonnées). |
| **Actor / Event / Target** | Qui a agi (`actor_type`) / quelle action (`event_type`) / quelle ressource (`target_type`). |
| **ZDR** (Zero data retention) | Non-conservation des entrées/sorties des appels API stateless supportés au-delà du temps de génération. |
| **Stateless API call** | Appel n'ayant pas besoin de stocker entrée/sortie après la réponse pour fonctionner. |
| **Training opt-out** | Refus d'usage des données pour améliorer les modèles ; contrôle distinct du ZDR. |
| **Free mode** | État par défaut des nouveaux comptes : clés API et usage inclus dans les limites de la page Limits. |
| **Included monthly usage** | Allocation d'usage mensuelle du plan, partagée Studio / API / Vibe Code, consommée en premier. |
| **Pay-as-you-go** (PAYG) | Extension prépayée au-delà de l'usage inclus, puisée dans les crédits ; pas un plan séparé. |
| **Credits** / **Auto Recharge** / **gift code** | Montant prépayé en devise de facturation ; recharge auto sous un seuil ; code cadeau échangeable. |
| **Monthly spending limit** | Plafond mensuel de consommation API + Vibe (Organization ou Workspace), hors taxes. |
| **Rate limits** | Débits autorisés (RPS, tokens/minute, tokens/mois, secondes audio, pages OCR…). |
| **Labs models** | Modèles exclus du ZDR. |
| **Mistral Code** | Ancien assistant de code ; sièges « Mistral Code Enterprise » legacy. **Vibe Code** = CLI, extensions d'éditeur, workflows de code. |
| **le Chat** | Nom encore présent dans l'API (analytics, audit logs, rôles) ; correspond à l'assistant aujourd'hui appelé Vibe (inférence). |
| **Danger zone** | Section des paramètres d'Organization contenant la suppression. |

## 3. Fonctionnalités en détail

### 3.1 Modèle d'administration et hiérarchie

**Répartition des rôles produits** : Vibe = travail avec les modèles et outils de code ; Studio = construction d'applications avec les API et services Mistral ; Admin = gestion des ressources sous-jacentes (qui accède, organisation des équipes et Workspaces, suivi d'usage, politiques).

**Trois couches** (page Enterprise Accounts) :

| Niveau | Contient / gère | Qui l'administre | Disponibilité |
|---|---|---|---|
| **Enterprise Account** | Une ou plusieurs Organizations liées ; ses membres ; les Admin API keys de chaque Organization | Enterprise Account admins (qui doivent être Organization admins d'une Organization liée) | Plan Enterprise ; première création par Mistral |
| **Organization** | Membres, Workspaces, facturation, paramètres d'accès (domaines, SSO), politiques, audit logs, conformité | `organization_admin` (+ `billing_manager` pour la facturation) | Tous plans (créée à l'inscription) |
| **Workspace** | Membres et rôles, clés API, ressources Vibe/Studio, connecteurs, usage et plafonds, réglages produit | `workspace_admin` ; les Organization admins ont un accès complet à tous les Workspaces | Tous plans (inférence : un Workspace par défaut existe toujours) |

Le schéma d'ensemble (image `admin_overview.svg`) : Admin contrôle une Organization, ses membres et ses Workspaces ; les membres accèdent aux Workspaces via **rôles, groupes et provisioning SCIM** ; les Workspaces organisent l'accès à Vibe et Studio ; l'**Admin API** offre le contrôle programmatique de l'ensemble.

**Paramètres de niveau Organization** (s'appliquent à toute l'Organization) : vérification de domaine (préalable aux méthodes de connexion), SAML SSO, abonnements et facturation, audit logs, training opt-out.

**Quand créer plusieurs Organizations** (plutôt que des Workspaces) : besoin de paramètres d'Organization distincts, de membres et modèle d'accès distincts, de Workspaces propres, d'Admin API keys propres, de frontières d'usage, de facturation ou opérationnelles distinctes. L'Enterprise Account est présenté comme apportant une **isolation plus forte que les Workspaces** entre groupes d'utilisateurs.

### 3.2 Organization

**Création**
- Une Organization est **créée automatiquement à l'inscription**.
- Pour en créer une autre (ex. séparer compte perso et compte entreprise) : cliquer le **nom de l'Organization en haut à gauche de Studio** › **Add** (section Organizations) › saisir un nom › **accepter les conditions d'utilisation** › **Create Organization**.
- La nouvelle Organization démarre avec le créateur comme **unique Admin** et un **Workspace par défaut**.
- Les Enterprise Account admins peuvent aussi créer une Organization depuis la page **Organizations** de la section enterprise.

**Page « Your Organization »** — `Admin Panel › Administration › Organization` (`https://admin.mistral.ai/Organization`) :
- **Active members** : nombre de membres actifs ;
- **Organization ID** : à conserver (nécessaire pour l'Admin API et pour le support) ;
- **Organization name** : consultable et modifiable.

**Suppression** — section **Danger zone** › **Delete Organization** › confirmer.
- Suppression **définitive** de l'Organization et de ses ressources, données, Workspaces, clés API, paramètres, historique d'usage et autres contenus à portée Organization.
- Les **comptes utilisateurs** des membres **ne sont pas supprimés**.

**Étapes suivantes recommandées par la doc** : configurer la facturation (moyen de paiement pour activer l'accès API au-delà du Free mode), vérifier le domaine, inviter des membres.

### 3.3 Enterprise Accounts

- **Rôle** : couche au-dessus des Organizations permettant aux Organization admins existants de créer et gérer des Organizations liées et de générer des **Admin API keys**.
- **Disponibilité** : plans Enterprise uniquement ; accès initial via l'account team Mistral ou l'équipe commerciale ; **un membre de l'équipe Mistral doit créer le premier Enterprise Account**.
- On peut être sur un plan Enterprise **sans** Enterprise Account ; on n'a pas besoin de plusieurs Organizations pour avoir un Enterprise Account ; l'accès Enterprise Account **ne remplace pas** les rôles d'Organization.
- **Accès** : `Admin Panel` › section enterprise ; nécessite l'accès **Enterprise Account admin**. Les admins existants peuvent ajouter d'autres **Organization admins existants** ; ajouter quelqu'un qui n'est pas admin d'une Organization liée **fait échouer l'invitation**.

Navigation gauche de la section enterprise :

| Page | Contenu | Actions |
|---|---|---|
| **Enterprise Account Members** | nom et e-mail, account ID, Organizations associées, dernière connexion, actions | ajouter un membre ; invitations en attente affichées avec statut **Invite pending** |
| **Organizations** | nom, Organization ID, nombre de membres, actions | créer une Organization ; **Promote to admin** (promeut l'Enterprise Account admin courant en Organization admin de l'Organization choisie — sinon il voit les Organizations sans pouvoir les administrer) |
| **API Keys** | nom, Organization, valeur masquée, date de création, dernière utilisation, expiration, actions | **Create Key** : **Name**, **Organization** (une seule ; la clé n'administre que celle-ci), **Expiration** optionnelle (ou aucune) ; copier immédiatement — valeur complète affichée **une seule fois** |

### 3.4 Workspaces : création, accès, archivage

**Ce qu'un Workspace délimite** : membres et rôles ; clés API (usage API limité au Workspace) ; ressources Vibe et Studio (prompts, Libraries, skills…) ; connexions et permissions de connecteurs ; usage et plafonds de dépense ; réglages produit (activer/désactiver des capacités Vibe). Changer de Workspace change le **contexte produit** de l'utilisateur.

**Limites** : **500 Workspaces actifs** maximum par Organization ; **noms uniques** dans l'Organization.

**Créer** — `Admin Panel › Administration › Workspaces` (`https://admin.mistral.ai/organization/workspaces`) › **New Workspace** :

| Champ | Obligatoire | Effet |
|---|---|---|
| **icon** | oui (étape du parcours) | icône représentant le Workspace |
| **name** | oui | libellé lisible affiché dans les interfaces et les exports ; unique |
| **description** | non | description libre |
| **members** + **roles** | non | ajout de membres et attribution de rôles Workspace |

Puis **Create**. Le **créateur reçoit automatiquement le rôle Workspace Admin**. Seuls les **Organization admins** créent des Workspaces supplémentaires (la doc ne mentionne pas d'autre rôle).

**Accès** : les membres appartiennent d'abord à l'Organization puis obtiennent l'accès à un ou plusieurs Workspaces, directement ou via des **Groups**. Rôle Workspace et rôle Organization sont indépendants (un Organization Member peut être Workspace Admin). **Les Organization admins ont toujours un accès complet à tous les Workspaces**, même sans y être ajoutés.

**Archiver** — même page › icône **Archive** › confirmer. Rend le Workspace indisponible pour tous ses membres ; **irréversible** ; le **Workspace par défaut ne peut pas être archivé**. L'Admin API expose en plus un `DELETE` de Workspace (voir §5).

### 3.5 Workspaces dans Studio

« Everything in Studio is Workspace-scoped » : le Workspace actif détermine ce que le développeur voit, crée et surveille.

| Élément Studio | Effet du Workspace actif |
|---|---|
| **API keys** | l'utilisateur ne voit et ne crée que les clés du Workspace actif |
| **Playground** | les requêtes de test s'exécutent dans le contexte du Workspace |
| **Agents** | définitions rattachées au Workspace de création |
| **Batches** | jobs batch et résultats scoppés |
| **Document AI** | ressources de traitement de documents scoppées |
| **Workflows** | ressources workflow du Workspace actif |
| **Audio** | ressources de transcription et de synthèse scoppées |
| **Observability** | Campaigns, Judges, datasets, traces, consommation de tokens, métriques d'erreur |
| **Prompts and Skills** | rattachés au Workspace de création |
| **Files and Libraries** | fichiers et Libraries scoppés |
| **Connectors** | accès et outils gérables par Workspace |
| **Vibe Code CLI settings and keys** | réglages et clés scoppés |

**Changer de Workspace** : sélecteur Organization/Workspace dans l'**en-tête de Studio** ; Studio met à jour clés API, état du playground, ressources, usage et vues d'observabilité.

**Réglages admin côté Studio** (`Administration › Workspaces` › ouvrir un Workspace) : membres, usage, plafond de dépense, réglage de création de clés, accès connecteurs.
- **API Key Creation** : autorise ou interdit la création de clés API par les utilisateurs du Workspace. Les clés créées consomment quota, limites et ressources du Workspace.
- **Usage and limits** : usage visible dans la vue détail ; plafond mensuel API + Vibe ≤ plafond de l'Organization. Plafond atteint ⇒ **accès API du Workspace suspendu** jusqu'au mois suivant ou relèvement ; un paiement récent échoué peut aussi affecter l'accès.
- **Connectors** : connecteurs et outils disponibles par Workspace (voir §3.13).

### 3.6 Workspaces dans Vibe

« Everything in Vibe is Workspace-scoped ».

| Élément Vibe | Effet du Workspace actif |
|---|---|
| **Conversation history** | chats et artifacts appartiennent au Workspace de création |
| **Projects** | définitions de projets et conversations associées scoppées |
| **Skills and agents** | ceux disponibles dans le Workspace actif |
| **Scheduled tasks** | exécutées dans le Workspace de création |
| **Connector availability** | connecteurs et outils activés dans le Workspace |
| **Custom instructions** | peuvent varier par Workspace |

:::info (capturé) — La **disponibilité** des connecteurs est par Workspace, mais les **comptes liés** par un utilisateur (ex. Gmail personnel) **ne sont pas isolés par Workspace** : un compte lié est accessible dans tout Workspace où le connecteur est activé. Pour une isolation complète, il faut des **comptes Mistral séparés**.

**Changer de Workspace** : clic sur le nom de l'Organization **en bas à gauche** de Vibe ; le sélecteur montre le Workspace courant, les autres Workspaces de l'Organization et les autres Organizations de l'utilisateur. Le changement **réinitialise le contexte actif dans tous les onglets ouverts**.

**Réglages admin côté Vibe** (`Administration › Workspaces`) :

| Réglage | Valeurs / effet |
|---|---|
| **Feature toggles** | activer/désactiver par Workspace : `Work mode`, `Agents`, `Canvas`, `Code Interpreter`, `Deep Research`, `Image Generation`, `Memories`, `Thinking Mode`, `Web Search`. Désactiver retire la fonction de Vibe pour **tous** les membres du Workspace. |
| **Chat Retention Policy** | suppression automatique des chats du Workspace **et de leurs artifacts** après `30`, `90`, `180`, `365` jours ou **never** ; seules les valeurs **plus strictes** que `Admin Panel › Vibe › Privacy` (`https://admin.mistral.ai/vibe/privacy`) sont sélectionnables. |
| **Conversation tracing** | collecte des traces, consommation de tokens et métriques d'erreur des conversations du Workspace ; données visibles dans **Observability** (Studio). |
| **Connectors** | connecteurs et outils disponibles dans Vibe et Studio pour le Workspace. |
| **Member access** | quels membres accèdent et avec quels rôles Workspace. |

### 3.7 RBAC : rôles et permissions

**Principes**
- **Deux portées indépendantes** : Organization (administration globale) et Workspace (accès dans un Workspace).
- **Rôles prédéfinis** (aucun rôle personnalisé mentionné).
- **Multi-rôles** : un utilisateur peut détenir plusieurs rôles dans la même Organization ou le même Workspace ; **permissions additives** (union).
- **Rôle Workspace par défaut** : tout nouveau membre d'un Workspace reçoit **`workspace_contributor`**, quel que soit son rôle d'Organization (même un Organization admin ou un billing manager « démarre » contributor).
- **Attribution** : Admin Panel (sélecteur multi-choix par membre, effet immédiat) ou Admin API (`role_names` par nom, `roles` par UUID ; Enterprise). `GET /v1/admin/roles` fait autorité (liste et UUID). Les champs singuliers `role` / `role_name` sont **dépréciés**.
- Les rôles s'appliquent aussi aux **principals non humains** (service accounts).

**Rôles d'Organization**

| Libellé UI | `role_names` | Code legacy (`role`) | Permissions (page Roles and permissions) | Formulations alternatives dans d'autres pages |
|---|---|---|---|---|
| **Member** | `member` | `M` | Usage des produits ; gestion de son propre profil et de ses préférences. | « Product access and personal profile settings » |
| **Billing** | `billing_manager` | `B` (enum `UserRole` de la spec ; non documenté en prose) | Abonnements, factures, moyens de paiement, rapports d'usage. **Ne peut pas** modifier les paramètres de l'Organization **ni inviter** de membres. | « Billing, subscriptions, invoices, payment methods, and usage information » ; « Subscriptions, invoices, and payment methods; cannot change Organization settings » |
| **Admin** | `organization_admin` | `A` | Contrôle total : paramètres, membres, sécurité, facturation, audit logs. | « Full Organization administration » ; « Full control of the Organization » |

**Rôles de Workspace**

| Libellé UI | `role_names` | Permissions (page Roles and permissions) | Variante page « Manage groups and roles » (API) |
|---|---|---|---|
| **User** | `user` | Accès à **Vibe** et à ses fonctionnalités. **Pas d'accès Studio.** | « le Chat and its features; no Studio » |
| **Developer** | `dev` | Accès à **Studio** et à toutes ses primitives (agents, fine-tuning, etc.). **Pas d'accès Vibe.** | « … no le Chat » |
| **Mistral Vibe Code User** | `mistral_code_user` | Accès à **Mistral Code** (**siège requis**). | « Mistral Code (requires a seat) » |
| **Workspace Contributor** | `workspace_contributor` | Toutes les fonctionnalités produit (`user` + `dev` + `mistral_code_user`). **Aucune** gestion, administration ni observabilité. Rôle par défaut. | identique (« no management or observability ») |
| **Admin** | `workspace_admin` | Tout ce qu'a un Contributor **+ administration du Workspace**. | « Workspace contributor plus Workspace administration; **no observability** » |
| **Observability Viewer** | `observability_viewer` | Accès à la suite **Observability**. | « Observability product » |
| *(absent de l'UI documentée)* | `billing` | — | « Usage and cost reports only » (seule mention) |
| *(rôle technique)* | `workflow_executor` | Rôle Workspace détenu par un **service account** pour que son worker enregistre et exécute des workflows ; le service account peut **en plus** recevoir **Developer** depuis l'Admin Console. | — |

Codes legacy de rôle Workspace dans la spec (`WorkspaceRole`) : `A`, `M` (utilisés par `workspace_role` de l'endpoint déprécié `provision-workspace`).

**Matrice des capacités d'administration relevées dans les pages** (qui peut faire quoi) :

| Action | Rôle requis (selon la doc) |
|---|---|
| Ouvrir l'Admin Panel | Organization admin ou Workspace admin (pages filtrées par rôle) |
| Inviter / retirer des membres, changer leurs rôles et sièges | Organization admin |
| Créer des Workspaces ; configurer leurs réglages (API Key Creation, plafond, feature toggles, rétention, tracing, connecteurs) | Organization admin (« Organization admins configure… ») |
| Gérer moyens de paiement, crédits, plafond Organization, factures | Admin ou Billing (rôle d'Organization) |
| Recevoir l'e-mail d'alerte à 80 % des crédits | Admin et Billing |
| Créer/gérer des clés API dans tous les Workspaces | Organization admin |
| Créer/gérer **ses propres** clés API | Admins et développeurs (Studio › profil) |
| Fixer le maximum d'expiration des clés pour l'Organization | Organization admin |
| Fixer un maximum plus strict pour un Workspace | Workspace admin |
| Créer un service account ; lui attribuer des rôles ; ajouter des credentials | Workspace admin (`workspace_admin` exigé par `POST /v1/service-accounts` dans la spec) |
| Enregistrer un trusted issuer | Organization admin |
| Administrer les connecteurs (App Connections, permissions) | Organization admin |
| Accéder aux Workspaces sans y être membre | Organization admin (accès complet implicite) |
| Section enterprise (membres, Organizations, Admin API keys) | Enterprise Account admin (doit être Organization admin d'une Organization liée) |

### 3.8 Gestion des membres

**Prérequis** : plan **Team** ou **Enterprise**, **ou** pay-as-you-go activé, pour inviter ; rôle **Organization admin** pour gérer les membres.

**Page Members** — `Admin Panel › Administration › Members` (`https://admin.mistral.ai/organization/members`) :
- **Active Users** (membres) et **Invited Users** (invitations en attente **et expirées**) ;
- recherche par **nom de famille** ou **e-mail** ; filtre des Active Users par rôle d'Organization : **Admin**, **Member**, **Billing**.

**Inviter** (seulement si l'Organization **n'utilise pas SSO** — sinon les utilisateurs arrivent via l'IdP) : **Invite members** › une ou plusieurs adresses › rôle d'Organization › sièges produit si besoin › envoyer. L'invité reçoit un e-mail. Par invitation : **resend** (si expirée) ou **revoke**.

**Actions rapides (liste Active Users)** : changer le rôle d'Organization ; activer/désactiver le siège **Vibe** ; activer/désactiver le siège **Mistral Code**.

**Panneau User Details** (clic sur un membre) :

| Onglet | Contenu / actions |
|---|---|
| **Profile** | e-mail, prénom, nom, user ID, indicateur **externally managed** (SSO/SCIM) ; si géré en externe, nom et e-mail synchronisés depuis l'IdP et **non éditables** |
| **Subscriptions** | sièges produit : Vibe, Mistral Code, autres accès propres au plan |
| **Workspaces** | Workspaces du membre et rôle dans chacun ; ajouter à un Workspace **existant**, changer le rôle, retirer (impossible pour le **Workspace par défaut**) |
| **Groups** | groupes du membre ; ajout à des groupes |
| **API Keys** | clés du membre, type, Workspace, dernière utilisation, expiration |

Exemple cité : un membre **Billing** d'Organization peut être **Workspace Contributor** dans un Workspace.

**Retirer un membre** : ligne ou User Details › **Remove user** › confirmer. Supprime l'accès à l'Organization et les appartenances aux Workspaces ; **les ressources qu'il a créées peuvent rester disponibles** aux autres membres. **Impossible de retirer le dernier Organization admin.**

### 3.9 Groupes d'utilisateurs

- **Plan** : **Enterprise**. Gestion dans `Admin Panel › Administration › Groups` (`https://admin.mistral.ai/organization/groups`) ou via Admin API.
- Un groupe = **nom** + **description** ; membres ajoutés/retirés **par user ID**.
- Un groupe est assigné à un Workspace avec **un ou plusieurs rôles** ; ses membres obtiennent ces rôles tant qu'ils sont dans le groupe. Un groupe peut être assigné à **plusieurs Workspaces** ; un utilisateur peut être dans **plusieurs groupes** ; si plusieurs de ses groupes visent le même Workspace, il cumule tous les rôles.
- **Accès vs rôles** : un utilisateur a **accès** à un Workspace s'il y détient au moins un rôle. Sources de rôles : **directe** (ajout individuel) et **via groupe(s)** ; l'ensemble est cumulé. Retirer quelqu'un d'un groupe ne retire **que** les rôles venant de ce groupe ; il garde l'accès s'il a une autre source.
- Nouveaux membres d'un groupe : reçoivent automatiquement les rôles des assignations existantes.
- **Groupes gérés en externe** (SSO/SCIM) : l'IdP est la source de vérité (identité, appartenance, cycle de vie) ; champs non éditables dans Mistral, mis à jour à la synchronisation suivante.
- **Parcours type** : créer le groupe › ajouter des membres › assigner le groupe à un Workspace avec un rôle.
- **Rôle d'Organization d'un groupe** : `PATCH /v1/admin/user-groups/{group_uuid}/organization-role` (API).
- **Groupes imbriqués** : présents uniquement dans la spec (`GET`/`PATCH /v1/admin/user-groups/{group_uuid}/nested`, liste de remplacement `child_group_uuids`) — non documentés dans les pages.

### 3.10 Service accounts

**Définition** : identité **non humaine à portée Workspace** qu'un workload (ex. worker de workflows) utilise pour s'authentifier. Principal à part entière (nom, rôles, credentials propres), non lié à une personne.

**Intérêt vs clé personnelle** : le workload continue de fonctionner quand la clé d'une personne est tournée ou quand elle part ; les audit logs et hardened deployments nomment le **workload**, pas une personne. Clé personnelle = usage interactif, scripts, développement ; service account = **machine-to-machine**.

**Credentials** (au moins un requis pour s'authentifier) — ajoutés via **Add new authentication** :

| Credential | Fonctionnement | Cas d'usage |
|---|---|---|
| **Workload identity federation** | Jeton court signé par un émetteur de confiance, vérifié avec la clé publique de l'émetteur ; aucun secret stocké | Workload dans Kubernetes ou derrière un autre émetteur OIDC |
| **API key** | Clé longue durée détenue par le service account | Worker hors Kubernetes |

**Créer** (Workspace admin) — `Admin Console › Workspace › Service accounts` › **Create service account** › **Create** :

| Champ | Obligatoire | Contraintes |
|---|---|---|
| **Name** | oui | slug unique dans le Workspace : une minuscule puis minuscules/chiffres/tirets, **2–63 caractères** (ex. `prod-worker`) ; saisie en casse mixte convertie en minuscules ; **non modifiable** après création |
| **Description** | non | texte libre, **≤ 4096 caractères** |

**Rôles** : **aucun rôle par défaut** ; tant qu'il n'en a pas, le service account **ne peut rien faire**. Attribution dans la section **Roles** du service account (effet immédiat) ou via l'API : `role_ids` (UUID) qui **remplace entièrement** les rôles (rôle absent = révoqué ; tableau vide = tout retirer) ; liste des rôles assignables via l'endpoint dédié. Rôle de base cité : `workflow_executor` ; **Developer** possible en plus.

**Ajouter une API key** : **Add new authentication** › **API key** › **Name** (optionnel) › **Expiration** (optionnelle — vide = n'expire jamais ; l'Organization peut imposer une durée max) › **Create API key**. Clé affichée **une seule fois**. La clé **hérite des rôles** du service account, est limitée à son **Workspace** et aux **connecteurs partagés uniquement** ; non déplaçable vers un autre Workspace. Avertissement : secret permanent — préférer la workload identity federation quand c'est possible.

**Où voir les credentials** : credentials workload identity dans la liste **Credentials** du service account (subject, trusted issuer, expiration) ; API keys dans la section **API keys** du Workspace, avec la colonne **Principal** et un badge **Service account**.

**Supprimer** un service account supprime l'identité et ses credentials ; tout workload les utilisant cesse de s'authentifier.

**Hardened deployments** : on peut associer un service account à un hardened deployment ; la rotation de ses credentials workload identity ne nécessite alors aucun changement du déploiement. Une **API key est associée séparément** : si le worker s'authentifie avec la clé du service account, il faut aussi ajouter cette clé au hardened deployment.

### 3.11 Workload identity federation

**Principe** : le workload s'authentifie comme service account avec un jeton que **sa propre infrastructure signe et fait tourner** ; la plateforme fait confiance à l'émetteur, vérifie le jeton et le résout vers le service account. Rien de long terme dans l'environnement du workload. **Méthode recommandée** pour un worker de workflows dans un cluster Kubernetes du client.

**Ordre de mise en place**

| # | Qui | Étape |
|---|---|---|
| 1 | Organization admin | Enregistrer le cluster comme **trusted issuer** (une fois par fournisseur OIDC / cluster) |
| 2 | Workspace admin | Créer le **service account** Mistral |
| 3 | Client (dans le cluster) | Créer le **ServiceAccount Kubernetes** correspondant (identité du workload) |
| 4 | Workspace admin | Ajouter un **credential workload identity** (preuve de possession) |
| 5 | Client | Déployer le worker avec un **projected token** |

Un trusted issuer peut valider des jetons pour **plusieurs credentials** ; un service account peut être autorisé par **plusieurs credentials**.

**Enregistrer un trusted issuer** — `Admin Console › Organization › Trusted issuers` › **Register new trusted issuer** › **Register** :

| Champ | Obligatoire | Notes |
|---|---|---|
| **Name** | oui | libellé, ex. `gcp-production` |
| **Issuer URL** | oui | URL de l'émetteur OIDC du cluster = claim `iss` attendu |
| **JWKS URI** | non | où récupérer les clés de signature ; vide = découverte OIDC automatique (cas le plus courant) |

Une Issuer URL ne peut être enregistrée **qu'une fois par Organization** (doublon ⇒ erreur).

**ServiceAccount Kubernetes** (doit exister avant le credential) — subject résultant `system:serviceaccount:workflows:example-worker` :

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: example-worker
  namespace: workflows
```

**Ajouter le credential** : service account › **Add new authentication** › **Workload identity federation** › choisir le **Trusted issuer** › **Create registration** ⇒ la plateforme génère une **Audience** à usage unique `mistral-auth:<nonce>` › générer un jeton portant cette audience (section **Using Kubernetes?** fournit la commande) › coller dans **Proof token** › **Expiration** optionnelle (vide = jamais) › **Create credential**.

```bash
kubectl create token example-worker -n workflows \
  --audience="mistral-auth:<nonce>" --duration=10m
```

- Le subject **n'est pas saisi** : il est lu dans le jeton vérifié (signature de l'émetteur + audience comparée à l'enregistrement).
- Audience aléatoire, non devinable, utilisée **une seule fois** ; à l'exécution le worker utilise l'audience **`api-gateway`**.
- Le jeton minté est court : le soumettre dans sa fenêtre de validité, sinon rejet.

**Déployer le worker** : exécuter sous le ServiceAccount Kubernetes, avec un **projected service account token** (JWT signé par le cluster, renouvelé sur disque par le kubelet). Variables d'environnement : `MISTRAL_SA_TOKEN_PATH` (chemin du jeton, ex. `/var/run/secrets/mistral-sa/token`) et `MISTRAL_CLIENT_SERVER_URL=https://api.mistral.ai`. **Ne pas définir d'API key** : sa présence **prime** sur le jeton de service account. Volume projeté : `serviceAccountToken` avec `path: token`, `expirationSeconds: 600`, `audience: api-gateway`, monté en lecture seule.

**Gérer et faire tourner** : liste **Credentials** (subject, trusted issuer, expiration). **Rotation** = ajouter un nouveau credential puis supprimer l'ancien (chevauchement possible, pas d'interruption). **Suppression** = le workload ne peut plus s'authentifier. La rotation ne modifie pas le service account ⇒ aucun changement des hardened deployments qui lui font confiance.

### 3.12 Clés API (et Admin API keys)

**Rôle** : authentifier les requêtes vers l'API Mistral et d'autres outils Mistral. Les utilisateurs **Vibe-only** n'en ont généralement pas besoin, sauf s'ils utilisent aussi Studio, l'API, Vibe Code ou un autre outil développeur.

**Types**

| Type | Usage |
|---|---|
| **Studio** | Clés standard pour l'API Mistral |
| **Vibe** | Clés utilisées par Vibe Code |
| **Mistral Code** | Clés **legacy** de l'ancien Mistral Code |

**Créer une clé en tant qu'admin** — `Admin Panel › API › API Keys` (`https://admin.mistral.ai/organization/api-keys`) › `Create new key` :

| Champ | Obligatoire | Valeurs / effet |
|---|---|---|
| `Key name` | non | libellé |
| `Workspace` | oui | Workspace de rattachement (quota, rate limits, ressources) |
| `Expiration` | selon politique | date ; si une **API key expiration policy** s'applique au Workspace, le sélecteur ne propose que des dates dans la plage autorisée et l'option « sans expiration » disparaît ; sinon n'importe quelle date future ou aucune expiration |
| `Connector access scope` | oui (défaut `Shared connectors only`) | voir tableau ci-dessous |

Puis `Create new key` et **copier immédiatement** (affichage unique). **Après création, impossible de modifier** le Workspace, le Connector access scope ou l'expiration : il faut créer une nouvelle clé et supprimer l'ancienne. Les clés sont **confidentielles et non partagées** au sein de l'Organization.

**Connector access scope**

| Scope | Accès |
|---|---|
| **Shared connectors only** (défaut, recommandé pour l'automatisation) | uniquement les connecteurs partagés avec le Workspace, pas les connecteurs privés |
| **Private and shared connectors** | connecteurs privés **appartenant au créateur de la clé** + connecteurs partagés du Workspace |

**Gérer les clés** (même page) : liste des clés **actives et expirées**, type, Workspace, dernière utilisation, expiration. Actions : **rotation** (= créer une nouvelle clé puis supprimer l'ancienne — pas de rotation en place documentée côté UI, même si l'audit log contient `api_key.rotate`), **suppression**, repérage des clés inutilisées ou expirées. Les clés d'un membre sont aussi visibles dans l'onglet **API Keys** de son User Details.

**Gérer ses propres clés** (admins et développeurs) : `Studio › API keys` (`https://console.mistral.ai/home?profile_dialog=api-keys`) ou menu profil › `API Keys` (modal User Profile).

**API key expiration policy**
- Fixe la **durée maximale de validité des nouvelles clés** ; **désactivée par défaut**.
- Les clés existantes (y compris sans expiration) continuent de fonctionner jusqu'à révocation ou expiration d'origine.
- **Organization Admins** : maximum à l'échelle de l'Organization. **Workspace Admins** : maximum plus strict pour leur Workspace, sans dépasser celui de l'Organization.
- Contrôles **côté serveur** sur les chemins de création API et UI.
- Détail renvoyé vers une page `/admin/identity-access/api-key-policy` **absente du corpus**.

**Portée** : chaque clé est liée au **Workspace de création** ; ses requêtes consomment le quota, les rate limits et les ressources de ce Workspace. Pour séparer dev/staging/prod : un Workspace par environnement et une clé dédiée dans chacun.

**Pas de portée par plan** : impossible de créer une clé « Free mode » ou « pay-as-you-go » ; chaque clé utilise automatiquement le plan et les réglages PAYG de l'Organization.

**Contrôle de création par Workspace** : réglage **API Key Creation** (autoriser/interdire la création par les utilisateurs du Workspace).

**Clés API standard vs Admin API keys**

| | API key (standard) | Admin API key |
|---|---|---|
| Usage | API d'inférence et produits | Endpoints `/v1/admin/*` uniquement |
| Portée | un **Workspace** | une **Organization** |
| Création | Studio (profil) ou `Admin Panel › API › API Keys` | section **enterprise** de l'Admin Panel (`API Keys` › `Create Key`) |
| Qui | développeurs / admins (selon réglage du Workspace) | Enterprise Account admins |
| Plan | tous (dont Free mode) | Enterprise uniquement |
| Expiration | optionnelle, encadrée par la politique | optionnelle |
| Accès admin | **jamais**, quel que soit le rôle du propriétaire | oui |
| Audit | `api_key.create` / `api_key.rotate` / `api_key.delete` | `admin_api_key.created` / `admin_api_key.delete` |

### 3.13 Administration des connecteurs

- **Qui** : Organization admins. **Niveaux** : Organization et Workspace. Admin sert à **gouverner l'accès** ; la doc développeur (API, Connector Debugger) est dans Studio Connectors.
- **Page** : `Admin Panel › Administration › Connectors` (`https://admin.mistral.ai/organization/connectors`), sections **App Connections** et **All Connectors**.

**App Connections** (connexion unique au niveau Organization ; les membres utilisent l'app sans se connecter individuellement — accès « bot partagé ») :

| App | Capacités | Bouton |
|---|---|---|
| **GitHub** | rechercher des dépôts, consulter des issues, gérer des pull requests | **Connect to GitHub** |
| **Slack** | rechercher des messages, lire des canaux, envoyer des messages, gérer des canvases | **Connect to Slack** |

**All Connectors** : liste des connecteurs et outils utilisables dans Vibe et Studio. Chaque page de connecteur a trois onglets :

| Onglet | Contenu |
|---|---|
| **Overview** | métadonnées : **Visibility** (ex. `Organization`), **Authentication** (ex. `OAuth2`), **Origin** (ex. `Featured`), **Capabilities** (ex. `Read-only`), **Connector name** (ex. `atlassian`), **Connector ID** (UUID). Section **Includes** : « You're not connected » + **Connect** tant qu'on n'est pas authentifié (nécessaire pour voir les outils) |
| **Credentials** | credentials disponibles ; **Connect** s'il n'y en a pas. Conseil : App Connections pour l'accès bot partagé, credentials de connecteur quand des utilisateurs/Workspaces ont besoin d'un compte précis |
| **Permissions** | outils utilisables par le modèle |

**Permissions de connecteur (par Workspace)**

| Valeur | Effet |
|---|---|
| **Allowed** | tous les outils disponibles pour les utilisateurs du Workspace |
| **Restricted** | seuls les outils sélectionnés sont disponibles (pour exclure des outils sensibles de certains workflows/chats) |
| **Blocked** | connecteur désactivé pour le Workspace |

Lien avec les clés API : le **Connector access scope** de chaque clé (§3.12) ; les clés de service account sont limitées aux connecteurs partagés.

### 3.14 Vérification de domaine

- **But** : prouver le contrôle d'un ou plusieurs domaines e-mail. **Prérequis** de l'email domain authentication, du SAML SSO et d'« autres fonctionnalités d'accès entreprise ». Plan non précisé.
- **Parcours** — `Admin Panel › Administration › Access` (`https://admin.mistral.ai/organization/access`), section **Domain Ownership** :
  1. **Add Domain** › saisir le domaine (ex. `yourcompany.com`) › **Add domain** ;
  2. **Verify domain** › copier l'enregistrement TXT ;
  3. chez le DNS/registrar : **Type** `TXT`, **Host/Name** `@` ou le domaine (selon fournisseur), **Value** `mistral-domain-verification=xxxxxx` ;
  4. attendre la propagation : **10 minutes à 24 heures** ; le statut passe à `Verified`.
- Plusieurs domaines possibles depuis la même section. Vérification manuelle : `nslookup -type=TXT yourcompany.com`.
- :::caution — **Garder chaque enregistrement TXT actif** : le supprimer peut casser l'email domain authentication, le SSO ou d'autres fonctionnalités pour ce domaine.
- Événements d'audit : `organization.domain_verification.enable` / `.disable`.

### 3.15 Authentification par domaine e-mail

- **Plan** : **Team et supérieurs**. Aussi appelée **discoverable domain authentication**.
- **Effet** : tout utilisateur dont l'e-mail correspond à un **domaine vérifié** peut **rejoindre l'Organization** depuis `Join Organization` (`https://admin.mistral.ai/join`).
- Contrôle l'**appartenance**, pas l'authentification : les utilisateurs **créent et gèrent leurs propres identifiants** (e-mail + mot de passe). Pour du SSO sans identifiants séparés : SAML SSO (Enterprise).
- **Activer** : `Administration › Access` › **Domain Ownership** › activer **Discoverable** sur le domaine vérifié ⇒ message « Email domain authentication enabled for `domain.com` ».
- **Désactiver** : désactiver **Discoverable**. Les utilisateurs du domaine ne peuvent plus rejoindre automatiquement ; les **membres existants ne sont pas affectés** ; il faut inviter manuellement sauf si le SSO est configuré.
- :::caution — **Réactiver plus tard impose de refaire le processus de configuration.**
- Audit : `organization.email_domain_authentication.enable` / `.disable` ; adhésion : `organization.join_by_email_domain`.

### 3.16 SAML SSO

- **Plan** : **Enterprise**. **Protocole** : **SAML 2.0 uniquement** ; **OpenID Connect (OIDC) non supporté** pour le SSO d'Organization.
- **Flux** : (1) l'utilisateur saisit un e-mail d'un domaine vérifié ; (2) redirection vers l'IdP ; (3) authentification avec les identifiants et politiques d'entreprise ; (4) retour connecté ; (5) **au premier login, Mistral provisionne le compte** dans l'Organization (JIT).
- **Prérequis** : plan Enterprise ; ≥ 1 domaine vérifié ; droit de créer une application SAML 2.0 dans l'IdP ; **metadata XML** de l'IdP ; mappings d'attributs :

| Attribut | Valeur |
|---|---|
| Prénom | `firstName` |
| Nom | `lastName` |
| Name ID format | `EmailAddress` |

**Configuration**
1. `Administration › Access` › **Organization Access** › **Single Sign-On (SAML SSO)** › **Activate SSO** ; garder la modale ouverte.
2. Dans l'IdP : créer une application **SAML 2.0** ; copier l'**ACS URL** et l'**Entity ID** depuis la modale Mistral ; mapper les attributs ; exporter la **metadata XML**.
3. Coller la metadata XML **complète** dans la modale › **Enable SSO**.

**Expérience utilisateur** : page de login Mistral › e-mail pro › **le champ mot de passe disparaît** et apparaît **Continue with [Organization name]** › login IdP › retour connecté.

**IdP supportés** : tout IdP SAML conforme ; les plus courants : **Microsoft Entra ID** (ex-Azure AD), **Google Workspace** / Google Identity Platform, **Okta**.

**Automatic seat assignment** : au premier login SSO, attribution automatique d'un siège si l'utilisateur a accès à l'Organization et que des sièges sont disponibles ; s'applique aux **Team seats** et **Mistral Code Enterprise seats** ; configuré dans `Administration › Access`. Audit : `organization.sso_seat_auto_assign.enable`/`.disable` (et `organization.seat_auto_assign.*`).

**Désactiver** (à tout moment, `Administration › Access`) : :::warning — les utilisateurs ne peuvent plus se connecter via l'IdP ; ils doivent **définir un mot de passe via le flux de réinitialisation** ou être **réinvités** ; le **provisioning automatique s'arrête**. Conseil : activer l'email domain authentication avant de désactiver le SSO.

**Dépannage** : ACS URL et Entity ID identiques des deux côtés ; mappings **sensibles à la casse** (`firstName`, `lastName`) ; Name ID Format = `EmailAddress` ; metadata XML complète et correctement collée ; sinon support.

Audit : `organization.saml_authentication.enable` / `.disable` / `.sso_user_provisioning.update`.

### 3.17 SCIM (private preview)

- Le **SCIM** est mentionné comme futur moyen d'automatiser onboarding/offboarding « **when it becomes generally available** » (Admin overview) ; le schéma de la page d'accueil Admin montre déjà l'accès aux Workspaces via « SCIM provisioning ».
- Des **commentaires internes** dans la source des pages SAML SSO et Verify domain indiquent que le SCIM est en **private preview** depuis la même page **Access**, avec URL d'endpoint SCIM, synchronisation à la demande, historique de synchronisation et réconciliation avec l'IdP — volontairement **exclus de la doc publique** pour l'instant. Un `TODO: update when SCIM is available` figure dans User management.
- Les profils/groupes « externally managed » (SSO ou SCIM) sont déjà décrits (§3.8, §3.9).
- La **spec OpenAPI** contient `POST /v1/admin/scim/sync` et `GET /v1/admin/scim/sync/{run_id}` (voir §5) ; l'audit log de la spec contient `organization.scim.secret.rotate` et `organization.scim_sync.trigger`.

### 3.18 Audit logs (référence complète)

**Vue d'ensemble**
- Journal **chronologique** des actions dans l'Organization, **à travers Studio et Vibe** : activité utilisateurs, usage des clés API, événements de sécurité.
- **Plan** : **Enterprise** uniquement. **Activés par défaut pour tous les Workspaces**, **aucune configuration**.
- **Accès** : `Admin Panel › Administration › Audit Logs` (`https://admin.mistral.ai/audit-logs`) ; API : `GET /v1/admin/audit-logs`.
- **Contenu d'une entrée** (vue UI) : **Timestamp** (`CreatedAt`), **Actor** (humain, clé API ou système), **Event** (ex. `batch_job.create`, `le_chat.conversation.deleted`), **Target** (ex. batch job, conversation, clé API), **Metadata** (contexte acteur/événement/cible).
- **Activités journalisées** : authentification (connexions, flux SSO) ; usage API et gestion des clés ; changements d'Organization et de Workspace ; gestion des utilisateurs (invitations, changements de rôle, retraits) ; modifications de paramètres ; interactions Vibe (création/suppression de conversations).
- **Recherche et filtres (UI)** : filtres **Actor** (human, API key), **Event**, **Target**, combinables (ex. toutes les suppressions de conversation d'un utilisateur) ; bouton **Columns** pour afficher/masquer des colonnes ; mise à jour automatique du tableau.
- **Cas d'usage** : surveillance de sécurité, investigation d'incident, conformité.
- **Limites** : **pas d'export** ; Enterprise uniquement.
- Les entrées sont générées depuis le schéma Admin API et les constantes d'audit du dashboard ; les métadonnées varient selon l'événement et le type de ressource ; des **événements dépréciés** peuvent apparaître dans d'anciens logs.

**Champs de réponse**

| Champ | Type | Requis | Signification |
|---|---|---|---|
| `created_at` | date-time | oui | horodatage de création de l'entrée |
| `actor_type` | `ActorType` | oui | type d'acteur |
| `actor_metadata` | `object<string,string>` | oui | détails sur l'acteur |
| `event_type` | `EventType` | oui | action enregistrée |
| `event_metadata` | `object<string,string>` | oui | détails sur l'action |
| `target_type` | `TargetType` | oui | type de ressource affectée |
| `target_metadata` | `object<string,string>` | oui | détails sur la ressource |
| `log_id` | integer | oui | ID de l'entrée |
| `organization_uuid` | UUID ou `null` | non | Organization concernée |
| `workspace_uuid` | UUID ou `null` | non | Workspace concerné |

**Clés de métadonnées** (le schéma brut n'accepte que des chaînes ; le dashboard **enrichit** les ID connus en objets pour l'affichage) :

| Clé | Où | Signification / enrichissement |
|---|---|---|
| `user_uuid` | actor | ID de l'acteur humain → enrichi `uuid`, `email`, `name` |
| `enterprise_account_uuid` | actor | ID d'Enterprise Account pour un acteur clé API → `uuid`, `name` |
| `organization_uuid` | actor / event / target | → `uuid`, `name` |
| `workspace_uuid` | actor / event / target | → `uuid`, `name`, `description`, `icon`, `is_default` |
| `uuid`, `email`, `name`, `description`, `icon`, `is_default` | métadonnées enrichies | champs ajoutés par l'enrichissement |

**Filtres (query parameters de l'API)**

| Filtre | Type | Défaut | Effet |
|---|---|---|---|
| `actor_type` | `ActorType[]` ou null | `None` | types d'acteurs à inclure |
| `event_type` | `EventType[]` ou null | `None` | types d'événements à inclure |
| `target_type` | `TargetType[]` ou null | `None` | types de cibles à inclure |
| `actor_user_uuid` | string ou null | `None` | UUID de l'utilisateur acteur |
| `sort` | `ascending` / `descending` | `descending` | ordre |
| `after` | date-time ou null | `None` | entrées postérieures |
| `before` | date-time ou null | `None` | entrées antérieures |
| `limit` | integer | `20` | nombre maximal de résultats |

**Types d'acteurs (documentés)**

| `actor_type` | Signification |
|---|---|
| `HUMAN` | une personne, via le dashboard, Studio, le Chat ou une surface produit authentifiée |
| `API_KEY` | une clé API |
| `OTHER` | processus système, système externe ou **opération du staff Mistral** |

La spec OpenAPI ajoute `ADMIN_API_KEY` et `SERVICE_ACCOUNT` (non documentés en prose).

**Types de cibles (45 documentés)**

| Domaine | `target_type` |
|---|---|
| Identité / structure | `USER` (compte utilisateur), `USER_GROUP` (groupe d'accès), `ORGANIZATION`, `WORKSPACE`, `API_KEY`, `ADMIN_API_KEY`, `SERVICE_ACCOUNT` |
| Ressources Studio | `AGENT`, `SKILL`, `PROMPT`, `KNOWLEDGE_BASE`, `CUSTOM_VOICE` (voix personnalisée), `DATASET` (fichiers, batch, fine-tuning), `FINE_TUNING_JOB`, `BATCH_JOB`, `DATA_CAPTURE_EXTRACT_JOB` |
| le Chat / Vibe | `LE_CHAT_CONVERSATION`, `LE_CHAT_MEMORIES` (réglages mémoire), `LE_CHAT_FLASH_ANSWERS` (réglages flash answers), `LE_CHAT_LOCALISATION` (partage de localisation), `LE_CHAT_DATA` (réglage d'entraînement sur les données) |
| Facturation | `INVOICE`, `WALLET` (portefeuille / solde de crédits), `MONTHLY_LIMIT` (plafond mensuel Organization), `WORKSPACE_MONTHLY_LIMIT`, `SHARED_BUDGET` (budget partagé), `AUTO_RECHARGE`, `PAYMENT_METHOD`, `SUBSCRIPTION`, `BILLING_INFO` |
| Connaissances / intégrations | `LIBRARY`, `LIBRARY_DOCUMENT`, `INTEGRATION` (intégration ou configuration de connecteur), `CONNECTORS_GATEWAY` (appel d'outil via la passerelle de connecteurs), `FEATURE_PERMISSION` (surcharge de permission de fonctionnalité), `SECRET_STORE_ENTRY`, `CRAWLER_CONFIG`, `SHARED_RESOURCE`, `RATE_LIMIT_RULE` |
| Cloud runtime | `APP`, `DEPLOYMENT`, `DOMAIN`, `PERSISTENT_VOLUME`, `SECRET`, `SERVICE` |

Présents dans la spec mais pas dans la page : `API_KEY_POLICY`, `CONNECTORS_DEBUGGER`, `PLUGIN`, `SCHEDULE`, `TRUSTED_ISSUER`, `WEB_FILTERS`, `WEB_SEARCH_FILTER`, `WORKFLOW`.

**Types d'événements (196 documentés, par catégorie de la doc)**

*User management (42)*
- Utilisateur : `user.create`, `user.delete`, `user.log_in` (connexion), `user.info.update`, `user.password.update`, `user.phone_number.verify`.
- Utilisateur ↔ Organization : `user.organization.leave` (départ volontaire), `user.organization.role.update`, `user.organization.delete` (retrait de l'Organization), `user.organization.join`.
- Organization : `organization.create`, `organization.update`, `organization.invite.send`, `organization.invite.accepted`, `organization.invite.revoked`, `organization.join_by_email_domain`, `organization.domain_verification.disable`, `organization.domain_verification.enable`, `organization.email_domain_authentication.enable`, `organization.email_domain_authentication.disable`, `organization.saml_authentication.enable`, `organization.saml_authentication.disable`, `organization.saml_authentication.sso_user_provisioning.update`, `organization.seat_auto_assign.enable`, `organization.seat_auto_assign.disable`, `organization.kind.update` (changement de « kind » d'Organization), `organization.sso_seat_auto_assign.enable`, `organization.sso_seat_auto_assign.disable`.
- Workspace : `workspace.create`, `workspace.update`, `workspace.delete`, `workspace.member.add`, `workspace.member.remove`, `workspace.member.role.update`.
- Groupes : `user_group.create`, `user_group.update`, `user_group.delete`, `user_group.member.add`, `user_group.member.remove`, `user_group.workspace.provision`, `user_group.workspace.deprovision`, `user_group.workspace.update`.

*Billing (19)*
- `billing.information.updated`, `billing.payment_method.added`, `billing.payment_method.removed`, `billing.payment_method.default_changed`, `billing.invoice.retried`.
- Abonnement : `billing.subscription.subscribe`, `billing.subscription.unsubscribe` (fin programmée), `billing.subscription.cancel_unsubscribe` (annulation de la résiliation programmée), `billing.subscription.add_seats`, `billing.subscription.remove_seats`, `billing.subscription.termination_date.updated`.
- Crédits et plafonds : `billing.credits.added`, `billing.gift_code.used`, `billing.monthly_limit.updated`, `billing.workspace_monthly_limit.updated`, `billing.shared_budget_override.updated`, `billing.auto_recharge.updated`.
- Sièges : `billing.seat.grant`, `billing.seat.revoke`.

*le Chat (14)*
- `le_chat.conversation.created`, `le_chat.conversation.deleted`, `le_chat.conversation_batch.deleted`, `le_chat.conversation.public_sharing.enabled`, `le_chat.conversation.public_sharing.disabled`.
- Réglages : `le_chat.flash_answers.enabled`, `le_chat.flash_answers.disabled`, `le_chat.localisation_sharing.enabled`, `le_chat.localisation_sharing.disabled`, `le_chat.memories.enabled`, `le_chat.memories.disabled`, `le_chat.data.training_enabled`, `le_chat.data.training_disabled`.
- `le_chat.actions.external_link` (ouverture d'un lien externe depuis les actions).

*Studio (32)*
- Clés : `admin_api_key.created`, `admin_api_key.delete`, `api_key.create`, `api_key.rotate`, `api_key.delete`.
- Secret store : `secret_store.entry.create`, `secret_store.entry.update`, `secret_store.entry.delete`.
- Agents : `agent.create`, `agent.delete`, `agent.update`.
- Skills : `skill.create`, `skill.delete`, `skill.enable`, `skill.disable`, `skill.update`, `skill.share`, `skill.unshare`, `skill.load`, `skill.force_load`, `skill.version.create`.
- Prompts : `prompt.create`, `prompt.delete`, `prompt.update`, `prompt.version.create`.
- Voix : `custom_voice.create`, `custom_voice.update`, `custom_voice.delete`.
- Permissions et entraînement : `feature_permission.override.created`, `feature_permission.override.deleted`, `la_plateforme.training.enabled`, `la_plateforme.training.disabled`.

*Jobs and files (9)*
- `fine_tuning_job.create`, `fine_tuning_job.cancel`, `batch_job.create`, `batch_job.cancel`, `batch_job.delete`, `data_capture.extract_job.create`, `data_capture.extract_job.cancel`, `dataset.create`, `dataset.delete`.

*Library and integration (38)*
- Libraries : `library.create`, `library.delete`, `library.update`, `library.share`, `library.unshare`, `library.document.create`, `library.document.delete`, `library.document.bulk_delete`, `library.document.update`, `library.document.reprocess`.
- Intégrations : `integration.connected`, `integration.disconnected`, `integration.activated_for_org`, `integration.deactivated_for_org`, `integration.activated_for_workspace`, `integration.deactivated_for_workspace`, `integration.activated_for_user`, `integration.deactivated_for_user`, `integration.created`, `integration.updated`, `integration.deleted`, `integration.tool_called`, `integration.credentials.created_or_updated`, `integration.credentials.deleted`, `integration.preferences.created_or_updated`, `integration.preferences.deleted`, `integration.authentication_method.created_or_updated`, `integration.connection.created`, `connectors_gateway.tool_called`.
- Legacy indexation : `indexing.workflow.completed` (workflow d'indexation legacy terminé), `indexing.deleted` (index legacy supprimé), `connection.admin.setup_index`, `connection.admin.deleted`.
- Crawler : `crawler.config.create`, `crawler.config.update`, `crawler.config.delete`, `crawler.run.create`, `crawler.run.cancel`.

*Other (42)*
- Service accounts : `service_account.create`, `service_account.update`, `service_account.delete`, `service_account.client_secret.create`, `service_account.client_secret.delete`, `service_account.roles.set`.
- Knowledge bases : `knowledge_base.create`, `knowledge_base.delete`, `knowledge_base.update`, `knowledge_base.version.create`.
- Partage : `resource.share`, `resource.unshare`.
- Cloud runtime — apps : `cloud_runtime.app.created`, `cloud_runtime.app.updated`, `cloud_runtime.app.deleted`, `cloud_runtime.app.paused`, `cloud_runtime.app.resumed`.
- Cloud runtime — deployments : `cloud_runtime.deployment.created`, `cloud_runtime.deployment.succeeded`, `cloud_runtime.deployment.canceled`, `cloud_runtime.deployment.stopped`, `cloud_runtime.deployment.failed`, `cloud_runtime.deployment.autoscaled`.
- Cloud runtime — domains : `cloud_runtime.domain.created`, `cloud_runtime.domain.updated`, `cloud_runtime.domain.deleted`.
- Cloud runtime — secrets : `cloud_runtime.secret.created`, `cloud_runtime.secret.updated`, `cloud_runtime.secret.deleted`.
- Cloud runtime — services : `cloud_runtime.service.created`, `cloud_runtime.service.paused`, `cloud_runtime.service.resumed`, `cloud_runtime.service.deleted`, `cloud_runtime.service.manually_scaled`, `cloud_runtime.service.manual_scaling_deleted`.
- Cloud runtime — volumes : `cloud_runtime.persistent_volume.created`, `cloud_runtime.persistent_volume.deleted`, `cloud_runtime.persistent_volume.attached`, `cloud_runtime.persistent_volume.detached`.
- Rate limits : `rate_limit.rule.create`, `rate_limit.rule.update`, `rate_limit.rule.delete`.

**Événements présents dans l'enum `AuditLogEventType` de la spec (252 valeurs) mais absents de la page (56)** :
- Politique de clés : `api_key_policy.update`.
- Facturation : `billing.credit_coupon.used`, `billing.subscription_coupon.used`, `billing.priority_service_tier.updated`, `billing.priority_service_tier.removed`.
- Connecteurs / intégrations : `connectors_debugger.tool_called`, `integration.credentials.revoked`, `integration.credentials.revocation_failed`, `integration.shared`, `integration.unshared`, `integration.tool_activated`, `integration.tool_deactivated`.
- le Chat : `le_chat.temporary_conversation.created`, `le_chat.temporary_conversation.converted`.
- Organization / SCIM : `organization.delete`, `organization.invite.resend`, `organization.scim.secret.rotate`, `organization.scim_sync.trigger`.
- Plugins : `plugin.create`, `plugin.update`, `plugin.delete`.
- Secrets manager : `secrets_manager.secret.created`, `secrets_manager.secret.updated`, `secrets_manager.secret.deleted`, `secrets_manager.secret.metadata_updated`, `secrets_manager.secret.revealed`, `secrets_manager.secret.version.deleted`, `secrets_manager.secret.version.restored`.
- Workload identity : `trusted_issuer.create`, `trusted_issuer.update`, `trusted_issuer.delete`, `workload_identity.credential_registration.create`, `workload_identity.credential.create`.
- Filtres web : `web_filters.config.update`, `web_filters.domain.add`, `web_filters.domain.remove`, `web_search.filter_config.update`, `web_search.filter_domain.add`, `web_search.filter_domain.remove`.
- Workflows : `workflow.archived`, `workflow.unarchived`, `workflow.worker.registered`, `workflow.deployment.authorized_credential.granted`, `workflow.deployment.authorized_credential.revoked`, `workflow.execution.started`, `workflow.execution.canceled`, `workflow.execution.terminated`, `workflow.execution.query`, `workflow.execution.signal`, `workflow.execution.update`, `workflow.schedule.created`, `workflow.schedule.updated`, `workflow.schedule.deleted`, `workflow.schedule.paused`, `workflow.schedule.resumed`, `workflow.schedule.triggered`.

### 3.19 Zero data retention (ZDR)

- **Définition** : quand le ZDR est actif, Mistral **ne stocke ni ne journalise** les entrées et sorties des requêtes API supportées **au-delà du temps nécessaire** pour générer la sortie.
- **Plan** : **plans payants**, pour les **appels API stateless** supportés ; activation **sur demande**, examinée au cas par cas (**approbation ou refus**).
- **Exclusion de modèles** : s'applique à tous les modèles **sauf les modèles Labs**.

**Endpoints éligibles (10)**

| Endpoint | Couverture |
|---|---|
| `/v1/chat/completions` | chat completions |
| `/v1/fim/completions` | fill-in-the-middle |
| `/v1/embeddings` | embeddings |
| `/v1/moderations` | modération de texte |
| `/v1/chat/moderations` | modération de chat |
| `/v1/classifications` | classification de texte |
| `/v1/chat/classifications` | classification de chat |
| `/v1/ocr` | OCR |
| `/v1/audio/speech` | génération vocale |
| `/v1/audio/transcriptions` | transcription |

**Hors périmètre** (API/produits **stateful**, qui doivent stocker pour fonctionner — historique, état applicatif, traitement de fichiers, récupération ultérieure) : **Agents**, **fichiers de batch processing**, **Conversations**, **Libraries**, **`/v1/files`** (stocke les fichiers téléversés), **Vibe Work**, **Chat** (stockent les conversations pour l'historique).

**Vibe CLI** : s'exécute sur la machine de l'utilisateur et appelle des API stateless ; avec ZDR actif (plan payant), ses appels suivent les règles ZDR **de l'endpoint sous-jacent**.

**ZDR vs training opt-out** (contrôles **séparés**) :

| Contrôle | Portée |
|---|---|
| ZDR | conservation ou non des entrées/sorties des API supportées après traitement |
| Training opt-out | usage ou non des données éligibles pour améliorer les modèles |

**Le ZDR n'est pas nécessaire pour refuser l'entraînement** (article d'aide dédié).

**Procédure de demande** : contacter le support via l'article Help Center ZDR (`https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr`) ou la page de contact support, en **justifiant un motif légitime** suffisamment détaillé.

**Vérifier l'activation** : une fois approuvé, le **ZDR apparaît dans les paramètres de confidentialité** `Admin Panel › Vibe › Privacy` (`https://admin.mistral.ai/vibe/privacy`). Absent ⇒ demande pas encore traitée ; refus ⇒ notification par **e-mail**.

Ressources liées : Trust Center (`https://trust.mistral.ai/`), Legal Center (`https://legal.mistral.ai/`).

### 3.20 Abonnements (plans, sièges, usage inclus, pay-as-you-go)

- **Page** : `Admin Panel › Subscription` (`https://admin.mistral.ai/subscription`) : plan et sièges, usage mensuel inclus, **usage estimé courant**, réglages pay-as-you-go, sièges Mistral Code le cas échéant. Gestion du plan, des sièges, de l'usage inclus et du PAYG depuis cette page.
- **Plans globaux** : le même plan s'applique à **Vibe, Studio et l'API**. Plans : **Free mode**, **Pro**, **Education**, **Team**, **Enterprise**. **Free mode** = état par défaut des nouveaux comptes. Les plans payants ajoutent **sièges, fonctionnalités et usage mensuel inclus**. Détails, budgets et prix : renvoi vers `https://mistral.ai/pricing/` (aucun montant dans le corpus). Réductions étudiants/enseignants : article d'aide dédié.
- **Usage mensuel inclus** : partagé entre **Studio, l'API et Vibe Code** ; consommé **en premier**. Une fois épuisé : si PAYG activé ⇒ consommation des crédits prépayés ; sinon l'usage **peut s'arrêter** jusqu'à la période suivante ou jusqu'à modification des réglages par un admin.
- **Pay-as-you-go** : extension au-delà de l'usage inclus ; **pas un plan API/Vibe séparé** ; **prépayé** ⇒ il faut des crédits **avant** de l'activer (achat ou gift code). Activation dans `Admin Panel › Subscription`.
- **Mistral Code / Vibe Code** : certaines Organizations affichent encore des **sièges Mistral Code** = sièges Enterprise **legacy** de l'assistant de code ; **Vibe Code** couvre la CLI, les extensions d'éditeur et les workflows de code. Modifier le nombre de sièges Mistral Code Enterprise : **contacter Mistral**.
- **Sièges côté API** : `subscription_types` ∈ {`CHAT`, `MISTRAL_CODE`} (création/mise à jour d'utilisateurs, invitations). Côté UI : sièges **Vibe** et **Mistral Code** activables par membre ; **automatic seat assignment** via SSO (Team seats, Mistral Code Enterprise seats).

### 3.21 Facturation (paiement, crédits, plafonds)

- **Rôle requis** : **Admin** ou **Billing** (Organization).
- **Page** : `Admin Panel › Subscriptions › Billing` (`https://admin.mistral.ai/organization/billing`).

| Section | Contenu |
|---|---|
| **Payment methods** | ajouter/modifier le moyen de paiement ; message si aucun n'est configuré. Un moyen de paiement est nécessaire pour activer l'accès API au-delà du Free mode (page Create Organization). |
| **Billing information** | profil de facturation (y compris **numéro de TVA** et **adresse**), repris sur les **factures futures** |
| **Credits** | solde courant ; **usage PAYG en attente** ; historique (attributions, achats, solde restant, expiration, statut) ; **Add credits** (achat avec le moyen de paiement) ; échange de **gift code** |
| **Auto Recharge** | recharge auto : sous le **seuil** défini, débit du moyen de paiement et ajout du **montant choisi** (recommandé pour éviter les interruptions) |
| **Monthly spending limit (API and Vibe)** | plafond mensuel de niveau Organization |
| **Usage** | usage API du mois en cours : usage courant, plafond mensuel, usage API |
| **Invoices** | ID, date, montant, statut de paiement, type, téléchargement |

**Crédits et consommation**
- Ordre : **usage mensuel inclus d'abord** ; au-delà, il faut **PAYG activé + solde de crédits positif** pour l'API et Vibe Code.
- Les crédits s'appliquent aussi aux **factures d'abonnement**.
- **Alerte** : e-mail aux rôles **Admin** et **Billing** quand **80 %** des crédits du **dernier rechargement** sont consommés.
- **Solde à zéro** : les requêtes API et Vibe Code au-delà de l'usage inclus échouent en **HTTP `402`** ; ajouter des crédits via le lien du message d'erreur suffit à rétablir l'accès.
- Le solde peut passer **légèrement sous zéro** (délai de traitement de l'usage) ; ce dépassement figure sur la facture suivante.
- **Crédits débités TTC**, **plafonds de dépense appliqués HT** ⇒ les crédits peuvent s'épuiser avant d'atteindre le plafond.
- Les **plafonds de dépense restent appliqués** même avec des crédits.

**Plafond mensuel de l'Organization** : plafonne la consommation API + Vibe ; en **devise de facturation** ; plafond atteint ⇒ accès API **peut être suspendu** jusqu'au mois suivant ou relèvement par un admin ; des **paiements de factures échoués** peuvent aussi affecter l'accès. Les plafonds de Workspace ne peuvent pas le dépasser.

### 3.22 Factures

- **Rôle** : Admin ou Billing. **Accès** : `Subscriptions › Billing` › section **Invoices** › clic = téléchargement **PDF**.
- **Contenu possible** :

| Ligne | Description |
|---|---|
| **Subscription charges** | frais fixes des plans Pro, Education, Team, Enterprise |
| **Credit purchases** | crédits prépayés, appliqués à l'usage PAYG et aux factures d'abonnement |
| **Pay-as-you-go charges** | usage au-delà de l'inclus, crédits prépayés déduits |
| **Seat allocations** | frais par siège des membres Team ou Enterprise |

- **Calendrier** :

| Type | Facturation |
|---|---|
| Abonnements (Pro, Team, Enterprise) | **début** de chaque période (**mensuelle ou annuelle**) |
| Achats de crédits | à l'ajout manuel ou par auto recharge |
| Pay-as-you-go | facture **en fin de mois**, crédits appliqués ; montant dû **normalement nul**, sauf petit dépassement sous zéro |
| Upgrade de plan | paiement **immédiat** du nouveau plan |

- **TVA et coordonnées** : saisies dans `Subscriptions › Billing`, appliquées à **toutes les factures futures** ; modifier une facture passée ⇒ **support**.

### 3.23 Usage et limites (dashboard, plafonds, rate limits)

**Pages**

| Tâche | Page |
|---|---|
| Usage et ventilation des coûts | `Admin Panel › API › Usage` (`https://admin.mistral.ai/organization/usage`) |
| Rate limits API | `Admin Panel › API › Limits` (`https://admin.mistral.ai/plateforme/limits`) |
| Plafond de l'Organization | `Admin Panel › Subscriptions › Billing` |
| Plafond d'un Workspace | `Admin Panel › Administration › Workspaces` › Workspace › onglet **Settings** |
| Usage d'un Workspace | `Administration › Workspaces` › Workspace › onglet **Usage** (Studio affiche aussi l'usage du Workspace actif) |

**Dashboard d'usage (Organization, par période de facturation)** — métriques : coût total ; coût par jour ; usage completion ; **usage Vibe au-delà du quota** ; usage OCR ; usage Agents et Connectors ; usage Libraries API ; usage Audio ; stockage Document Library. **Ventilations** : par modèle ; tokens d'entrée et de sortie ; API ou capacité ; Workspace ; stockage et Libraries. Programmatique : Admin API (Enterprise) — sinon dashboard seulement.

**Usage d'un Workspace (onglet Usage)** : dépense du mois en cours ; consommation de tokens ; usage par modèle ; usage par capacité (ex. OCR).

**Plafond mensuel de Workspace**
- Plafonne la consommation **API + Vibe** d'un Workspace ; **aucun plafond par défaut**.
- Réglage : onglet **Settings** › **Monthly spending limit** › enregistrer ; **vider le champ** et enregistrer = retour à **Never** (pas de plafond).
- Devise de facturation de l'Organization ; **≤ plafond de l'Organization**.
- Plafond atteint ⇒ **accès API du Workspace suspendu** jusqu'au mois suivant ou relèvement ; paiements échoués ⇒ accès potentiellement affecté. **Seul ce Workspace est affecté**, les autres continuent normalement.
- Audit : `billing.workspace_monthly_limit.updated` (Organization : `billing.monthly_limit.updated`).

**Rate limits**

| Famille | Unités | Granularité |
|---|---|---|
| Workspace (page Workspace usage) | **Requests per second (RPS)** (« maximum concurrent API requests »), **Tokens per minute**, **Tokens per month** (plafond global de consommation) | **par Workspace**, partagés entre **toutes les clés** du Workspace (trafic cumulé) |
| **Completion rate limits** | **Tokens per minute**, **Requests per second** | **par modèle** |
| **Audio rate limits** | secondes audio par minute ; secondes audio par mois | API audio |
| **Document OCR rate limits** | pages par minute | API OCR |
| **Document limits** | taille maximale de fichier téléversé ; possibilité ou non de **télécharger des documents depuis les Libraries** | documents |

- **Free mode** : clés API et usage inclus dans les limites affichées sur la page Limits. **PAYG** : extension au-delà de l'usage inclus, sur crédits.
- **Relever les limites** : contacter le support avec les modèles/API visés, le **RPS cible**, les **tokens/minute** et **tokens/mois** attendus, et une courte description du cas d'usage.
- Via Admin API : `GET /v1/admin/rate-limit` (RPS et limites de tokens par modèle) ; `GET`/`POST /v1/admin/spend-limit`.

**Schémas de maîtrise des coûts proposés par la doc** : isolation d'environnements (Workspaces dev/staging/prod avec chacun son plafond) ; budgets d'équipe (un Workspace par équipe) ; facturation par projet (un Workspace par projet client pour attribuer et plafonner les coûts).

## 4. Interface utilisateur

### 4.1 Points d'entrée et navigation

- **Admin Panel** : `https://admin.mistral.ai` ; ou menu principal de Vibe/Studio › `Admin`. Sessions partagées.
- **Arborescence observée** (chemins `AppLink`) :

| Section de navigation | Page | URL |
|---|---|---|
| **Administration** | Organization (« Your Organization », Danger zone) | `https://admin.mistral.ai/Organization` (aussi `/organization`) |
| | Access (Domain Ownership, Organization Access › Single Sign-On (SAML SSO), automatic seat assignment ; SCIM en private preview) | `https://admin.mistral.ai/organization/access` |
| | Members (Active Users, Invited Users, User Details) | `https://admin.mistral.ai/organization/members` |
| | Groups | `https://admin.mistral.ai/organization/groups` |
| | Workspaces (liste, New Workspace, Archive ; détail : membres, Usage, Settings) | `https://admin.mistral.ai/organization/workspaces` |
| | Connectors (App Connections, All Connectors) | `https://admin.mistral.ai/organization/connectors` |
| | Audit Logs | `https://admin.mistral.ai/audit-logs` |
| **API** | API Keys | `https://admin.mistral.ai/organization/api-keys` |
| | Usage | `https://admin.mistral.ai/organization/usage` |
| | Limits | `https://admin.mistral.ai/plateforme/limits` |
| **Subscriptions** | Billing (paiement, crédits, plafond, usage, factures) | `https://admin.mistral.ai/organization/billing` |
| *(racine)* | Subscription (plan, sièges, usage inclus, PAYG) | `https://admin.mistral.ai/subscription` |
| **Vibe** | Privacy (rétention de référence, ZDR une fois approuvé) | `https://admin.mistral.ai/vibe/privacy` |
| *(public)* | Join Organization | `https://admin.mistral.ai/join` |
| **Enterprise section** | Enterprise Account Members ; Organizations ; API Keys (Admin API keys) | `https://admin.mistral.ai/` (route exacte non donnée) |
| **Admin Console › Workspace** | Service accounts | `https://admin.mistral.ai` (route exacte non donnée) |
| **Admin Console › Organization** | Trusted issuers | `https://admin.mistral.ai` (route exacte non donnée) |

- Le segment `plateforme` de l'URL Limits rappelle l'ancien nom « La Plateforme » (aussi présent dans l'événement `la_plateforme.training.enabled`) (inférence).
- **Studio** : sélecteur d'Organization **en haut à gauche** (bouton **Add** pour créer une Organization) ; sélecteur Organization/Workspace dans l'**en-tête** ; clés personnelles via `Studio › API keys` = `https://console.mistral.ai/home?profile_dialog=api-keys` (modal User Profile).
- **Vibe** : sélecteur en **bas à gauche** (nom de l'Organization) listant Workspace courant, autres Workspaces, autres Organizations.

### 4.2 Parcours et contrôles (libellés exacts)

| Écran | Boutons / champs / états |
|---|---|
| Create Organization (Studio) | **Add** › nom › conditions › **Create Organization** |
| Your Organization | **Active members**, **Organization ID**, **Organization name** ; **Danger zone** › **Delete Organization** |
| Enterprise › Members | **Invite pending** ; ajout de membre |
| Enterprise › Organizations | création ; **Promote to admin** |
| Enterprise › API Keys | **Create Key** : **Name**, **Organization**, **Expiration** |
| Access › Domain Ownership | **Add Domain** › **Add domain** › **Verify domain** ; statut `Verified` ; interrupteur **Discoverable** ; message « Email domain authentication enabled for `domain.com` » |
| Access › Organization Access | **Single Sign-On (SAML SSO)** › **Activate SSO** (modale : ACS URL, Entity ID, zone metadata XML) › **Enable SSO** ; automatic seat assignment |
| Page de login (SSO) | champ mot de passe masqué ; **Continue with [Organization name]** |
| Members | **Invite members** ; listes **Active Users** / **Invited Users** ; filtres **Admin** / **Member** / **Billing** ; resend / revoke ; **Remove user** |
| User Details | onglets **Profile**, **Subscriptions**, **Workspaces**, **Groups**, **API Keys** |
| Workspaces | **New Workspace** (icon, name, description, members, roles) › **Create** ; icône **Archive** ; détail : **Usage**, **Settings** (**Monthly spending limit**, **API Key Creation**, feature toggles, **Chat Retention Policy**, **Conversation tracing**, connecteurs, membres) |
| API Keys (admin) | `Create new key` : `Key name`, `Workspace`, `Expiration`, `Connector access scope` › `Create new key` |
| Service accounts | **Create service account** (Name, Description) › **Create** ; section **Roles** ; **Add new authentication** › dialogue **Add credential** (**API key** : Name, Expiration › **Create API key** ; **Workload identity federation** : Trusted issuer › **Create registration** › Audience › **Using Kubernetes?** › **Proof token** › Expiration › **Create credential**) ; liste **Credentials** |
| Trusted issuers | **Register new trusted issuer** (Name, Issuer URL, JWKS URI) › **Register** |
| Connectors | **Connect to GitHub**, **Connect to Slack** ; page connecteur : **Overview** / **Credentials** / **Permissions** ; **Connect** ; « You're not connected » |
| Audit Logs | filtres Actor / Event / Target ; **Columns** |
| Billing | **Payment methods**, **Billing information**, **Credits** (**Add credits**, gift code), **Auto Recharge**, **Monthly spending limit (API and Vibe)**, **Usage**, **Invoices** |

## 5. API et SDK

### 5.1 Admin API — généralités

- **Disponibilité** : **Enterprise uniquement**, **non self-serve** (contact account team / sales) ; hors Enterprise, impossible de créer une Admin API key et une clé standard **ne fonctionne pas** sur les endpoints admin.
- **Statut** : **Preview** (endpoints et champs susceptibles de changer) ; la référence est rangée sous « Beta Admin … » (`/api/endpoint/beta/admin/...`) et les tags de la spec sont `beta.admin.*`.
- **Public** : Organization admins et solutions engineers.
- **Base URL** : `https://api.mistral.ai/v1/admin`.
- **Authentification** : Admin API key dans l'en-tête **`x-api-key: <ADMIN_API_KEY>`** ; `Content-Type: application/json` pour les corps JSON. (La spec déclare le schéma de sécurité `AdminApiKey` en **HTTP bearer** et précise que les clés standard Workspace/inférence sont rejetées — voir §8.)
- **Portée** : la clé agit sur **l'Organization à laquelle elle est liée**.
- **Rôles** : champs `roles` (UUID) / `role_names` (noms) ; affectation de Workspace : `workspace_role` (UUID) ou `workspace_role_name` (nom) ; singuliers `role` / `role_name` **dépréciés**. `GET /v1/admin/roles` (RBAC doit être activé) renvoie `organization_roles` et `workspace_roles` avec UUID.
- **SDK** : aucune méthode SDK Python/TypeScript documentée pour l'Admin API ; tous les exemples sont en `curl`.
- **Domaines de la référence** : Users and invitations, Workspaces, API Keys, Analytics, Billing (usage et limites), Audit Logs, User Groups (+ SCIM dans la spec).

```bash
curl "https://api.mistral.ai/v1/admin/users?page=1&page_size=50" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### 5.2 Endpoints Admin API

Légende source : **D** = documenté dans les pages ; **S** = présent uniquement dans la spec OpenAPI locale.

| Méthode | Chemin | Rôle / paramètres clés | Src |
|---|---|---|---|
| GET | `/users` | liste ; `page` (défaut 1), `page_size` (défaut 25 selon spec), `email` | D |
| POST | `/users` | création **en lot** : tableau d'objets `email`, `first_name`, `last_name` (requis), `role_names`/`roles`, `subscription_types` (`CHAT`, `MISTRAL_CODE`) ; réponse = map e-mail → user ID ; connexion via e-mail + **flux de récupération de compte** | D |
| GET | `/users/{user_id}` | un utilisateur | D |
| PATCH | `/users/{user_id}` | rôles et/ou `subscription_types` | D |
| DELETE | `/users/{user_id}` | suppression | D |
| POST | `/users/{user_id}/deactivate` | désactive un utilisateur dont l'e-mail est sur un **domaine vérifié** : retrait de **toutes** ses Organizations (révoque ses clés API) et fin de ses sessions ; réponse `{"message": ...}` | S |
| POST | `/users-invite` | invitation ; `email` requis (une adresse, ou plusieurs séparées par virgules ou retours ligne) ; optionnels `role_names`, `subscription_types`, `workspace_uuids`, `email_language` | D |
| GET | `/users-invite` | liste des invitations | D |
| DELETE | `/users-invite/{invite_uuid}` | supprime une invitation | D |
| GET | `/roles` | rôles d'Organization et de Workspace + UUID | D |
| GET | `/workspaces` | liste ; `is_archived` (défaut false), `page`, `page_size`, `search` | D |
| POST | `/workspaces` | `name`, `admin_user_id` requis ; `description`, `icon` (défaut `""`), `add_all_org_members` (défaut false) ; réponse avec `uuid` | D |
| PATCH | `/workspaces/{workspace_uuid}` | renommer, modifier la description | D |
| DELETE | `/workspaces/{workspace_uuid}` | suppression | D |
| POST | `/workspaces/{workspace_uuid}/add-users` | `members: [{user_uuid, role_names}]` | D |
| PATCH | `/workspaces/{workspace_uuid}/users` | ajout **ou** mise à jour, **idempotent** | D |
| DELETE | `/workspaces/{workspace_uuid}/remove-users` | **corps JSON** `members: [{user_uuid}]` ; supprime leurs permissions dans le Workspace | D |
| GET / POST | `/user-groups` | liste (`page`, `page_size`, `search`) / création (`name` requis, `description`) ; réponse avec `uuid` | D |
| GET / PATCH / DELETE | `/user-groups/{group_uuid}` | lire / modifier / supprimer | D |
| GET / POST / DELETE | `/user-groups/{group_uuid}/members` | lister / ajouter / retirer via `user_uuids` | D |
| GET / POST | `/user-groups/{group_uuid}/workspaces` | assignations / assigner (`workspace_uuid`, `role_names`) | D |
| PATCH / DELETE | `/user-groups/{group_uuid}/workspaces/{workspace_uuid}` | changer les rôles de l'assignation / retirer le groupe du Workspace | D |
| PATCH | `/user-groups/{group_uuid}/organization-role` | `{"organization_role": "member"}` | D |
| POST | `/user-groups/provision-workspace` | `user_group_uuid`, `workspace_uuid`, `workspace_role` (ex. `"M"`) — utilisé dans le guide User provisioning, **`deprecated: true`** dans la spec | D (+S) |
| GET / PATCH | `/user-groups/{group_uuid}/nested` | groupes imbriqués ; PATCH = remplacement complet `child_group_uuids`, réponse `204` | S |
| GET | `/api-keys` | clés de l'Organization ; `limit` (défaut 100), `offset` (défaut 0), `name` (sous-chaîne du nom ou 4 derniers caractères, insensible casse/accents) | S (domaine cité en D) |
| POST | `/api-keys` | crée une clé **de Workspace** : `workspace_uuid` et `user_id` requis ; `name` (≤ 255), `expiration` (date) | S |
| DELETE | `/api-keys/{key_id}` | supprime une clé | S |
| GET | `/usage` | « Monthly Usage and Pricing » : `month`, `year` (entiers, `5` ou `05`), `workspace_id` ; spec : `api_zone` (`global`, `us`, `eu`) ; réponse par catégorie `chat`, `completion`, `ocr`, `audio`, `connectors`, `libraries_api`, `fine_tuning`, `vibe_usage` + `start_date`, `end_date`, `currency` (spec : inclut le catalogue de prix) | D |
| POST | `/usage/query` | « Detailed Usage Query » : intervalle requis `start` (inclus) / `end` (exclu) ; filtres `usage_type`, `billing_metric`, `billing_display_name`, `billing_group`, `workspace_ids` (`null` = usage sans Workspace), `organization_id`, `user_id`, `service_account_id`, `api_key_id`, `api_zone`, `service_tier`, `filters` ; `group_by` ; `time_bucket` (`second`, `hour`, `day`, `week`, `month`) ; `untracked` ; `limit` ; **quantités seulement, sans prix** | S |
| GET | `/spend-limit` | plafonds (spec : « usage, rate, and job limits ») | D |
| POST | `/spend-limit` | `amount` (entier, en devise de facturation : `500` = 500, pas des centimes ; requis), `no_monthly_limit` (`true` = supprime le plafond ; défaut false) | D |
| GET | `/rate-limit` | RPS et limites de tokens par modèle | D |
| GET | `/audit-logs` | filtres §3.18 | D |
| POST | `/scim/sync` | synchro SCIM à la demande ; nécessite SAML activé et mode « SCIM user provisioning » ; `dry_run` (défaut `true`) ; `sync_config` (requis si `dry_run=false`) : `sync_users`, `sync_groups`, `sync_memberships`, `deprovision_users`, `delete_missing_groups` ; `202` ; `409` renvoie le run déjà actif (un seul run à la fois) | S |
| GET | `/scim/sync/{run_id}` | statut du run + aperçu ou résumé | S |
| GET | `/analytics/lechat/usage/by_user_stats` | par utilisateur : messages, fichiers, images, tableurs, conversations uniques, agents uniques, messages aux agents, dernier message ; `start_time`, `end_time` (timestamps Unix en secondes) | D (spec : `/analytics/vibe/work/usage/by_user_stats`) |
| GET | `/analytics/lechat/usage/by_agent_stats` | mêmes compteurs par agent + utilisateurs uniques par agent | D (spec : `/analytics/vibe/work/usage/by_agent_stats`) |
| GET | `/analytics/lechat/usage/by_time_stats` | par tranche ; `granularity` = `hour`, `day`, `week`, `month` ; inclut utilisateurs et agents uniques | D (spec : `/analytics/vibe/work/usage/by_time_stats`) |
| GET | `/analytics/vibe/usage/by_workspace` | Vibe Code ; `workspace_id` optionnel ; séries quotidiennes : sessions (CLI, ACP, programmatic), utilisateurs actifs, tokens (input, output, cached, par modèle), appels d'outils, durées de session | D (spec : `/analytics/vibe/code/usage/by_workspace`) |
| GET | `/analytics/vibe/usage/by_organization` | séries quotidiennes : next-edit suggestions (par résultat), utilisateurs actifs next-edit, lignes de code modifiées | D (spec : `/analytics/vibe/code/usage/by_organization`) |

Valeurs de `group_by` (spec) : `api_zone`, `service_tier`, `customer_id`, `usage_type`, `billing_metric`, `billing_group`, `billing_display_name`, `workspace_id`, `organization_id`, `user_id`, `service_account_id`, `api_key_id`, `untracked`, `call_source`, `call_type`, `customer_tier`. Valeurs de `usage_type` (enum `UsageType`) : `usage`, `codestral`, `document_library`, `document_library_api`, `libraries_pages`, `libraries_tokens`, `libraries_audio`, `chat`, `rlhf`, `ocr`, `audio_seconds`, `audio_characters`, `audio_agents`, `connectors`, `workflow_executions`, `vibe`, `vibe_connectors`, `vibe_ocr`, `vibe_audio_seconds`, `vibe_audio_characters`.

**Exemples de formes**

```bash
# Workspace + rôle d'un membre (idempotent)
curl -X PATCH https://api.mistral.ai/v1/admin/workspaces/<WORKSPACE_UUID>/users \
  -H "Content-Type: application/json" -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"members": [{"user_uuid": "<USER_UUID>", "role_names": ["workspace_admin"]}]}'

# Assigner un groupe à un Workspace
curl -X POST https://api.mistral.ai/v1/admin/user-groups/<GROUP_UUID>/workspaces \
  -H "Content-Type: application/json" -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"workspace_uuid": "<WORKSPACE_UUID>", "role_names": ["user"]}'

# Plafond mensuel de l'Organization
curl -X POST https://api.mistral.ai/v1/admin/spend-limit \
  -H "Content-Type: application/json" -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"amount": 500, "no_monthly_limit": false}'
```

**Parcours « User provisioning »** documenté : (1) créer des utilisateurs en lot (`POST /users`) ou inviter (`POST /users-invite`) ; (2) créer un groupe et y ajouter les user IDs ; (3) créer un Workspace (`admin_user_id` optionnel dans le texte, requis dans l'exemple/spec) ; (4) provisionner le groupe dans le Workspace ; (5) cycle de vie : `PATCH /users/{id}` (rôle, sièges), `DELETE /workspaces/{id}/remove-users`.

### 5.3 API des service accounts (hors Admin API)

Documentée dans la référence « beta service_accounts » ; chemins relevés dans la spec :

| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/v1/service-accounts` | créer un service account dans un Workspace (requiert `workspace_admin`) |
| GET | `/v1/service-accounts` | lister ceux d'un Workspace ou de toute l'Organization |
| GET | `/v1/service-accounts/assignable-roles` | rôles Workspace assignables (UUID) |
| GET / PATCH / DELETE | `/v1/service-accounts/{service_account_id}` | lire / modifier / supprimer |
| PUT | `/v1/service-accounts/{service_account_id}/roles` | `role_ids` : **remplacement complet** (absent = révoqué ; `[]` = aucun rôle) |
| GET | `/v1/service-accounts/{service_account_id}/roles` | lire les rôles (présent dans la spec) |

Aucun endpoint public pour les trusted issuers ou les credentials workload identity n'est documenté dans le corpus (gestion via l'Admin Console).

Côté worker : variables `MISTRAL_SA_TOKEN_PATH` et `MISTRAL_CLIENT_SERVER_URL` ; une API key présente dans l'environnement est prioritaire sur le jeton de service account.

### 5.4 Codes d'erreur et réponses notables

| Code / situation | Contexte |
|---|---|
| HTTP `402` | solde de crédits à zéro, requêtes API/Vibe Code au-delà de l'usage inclus ; le message contient un lien pour ajouter des crédits |
| Suspension d'accès API | plafond mensuel (Organization ou Workspace) atteint, ou paiement de facture échoué (code non précisé) |
| HTTP `409` | `POST /v1/admin/scim/sync` alors qu'un run est actif (renvoie le run actif) |
| HTTP `202` | déclenchement de synchro SCIM accepté |
| HTTP `204` | `PATCH .../nested` |
| HTTP `422` | erreur de validation (ex. `/usage/query`) |
| Erreur (non codée) | réenregistrement d'une Issuer URL déjà enregistrée ; proof token expiré ; invitation à l'Enterprise Account d'un non-admin d'Organization liée |

## 6. Limites, quotas, tarifs, disponibilité

### 6.1 Plan requis par fonctionnalité

| Fonctionnalité | Plan requis (selon la doc) |
|---|---|
| Organization, Workspace par défaut, Admin Panel | tous (Free mode inclus) |
| Workspaces supplémentaires, plafonds de Workspace | non précisé (inférence : tous plans) |
| Clés API standard | tous, y compris **Free mode** (dans les limites de la page Limits) |
| Inviter des membres | **Team** ou **Enterprise**, **ou** pay-as-you-go activé |
| Vérification de domaine | non précisé (préalable à des fonctions Team+ / Enterprise) |
| Authentification par domaine e-mail | **Team et supérieurs** |
| SAML SSO, automatic seat assignment | **Enterprise** |
| Groupes d'utilisateurs | **Enterprise** |
| RBAC (rôles prédéfinis, multi-rôles) | non précisé ; `GET /roles` exige « RBAC enabled » |
| Service accounts, workload identity federation | non précisé |
| API key expiration policy | non précisé |
| Administration des connecteurs | non précisé |
| Audit logs | **Enterprise** (activés par défaut) |
| ZDR | **plans payants**, sur demande approuvée |
| Training opt-out | non lié au ZDR (article d'aide) |
| Admin API, Admin API keys | **Enterprise**, accès non self-serve |
| Enterprise Account | **Enterprise**, premier compte créé par Mistral |
| Usage programmatique (Admin API) | **Enterprise** ; sinon dashboard |
| Pay-as-you-go | crédits prépayés requis |
| Sièges Mistral Code Enterprise | legacy ; modification via Mistral |
| SCIM | private preview |

### 6.2 Quotas et valeurs chiffrées

| Élément | Valeur |
|---|---|
| Workspaces actifs par Organization | **500** |
| Nom de service account | slug, **2–63** caractères, minuscule initiale |
| Description de service account | **≤ 4096** caractères |
| Nom de clé API (spec) | ≤ 255 caractères |
| Propagation DNS (vérification de domaine) | 10 min à 24 h |
| Chat Retention Policy | 30 / 90 / 180 / 365 jours / never |
| Alerte crédits | **80 %** du dernier rechargement |
| Audit logs — `limit` par défaut | 20 |
| `page_size` par défaut (users, workspaces — spec) | 25 |
| `GET /api-keys` — `limit` par défaut (spec) | 100 |
| Proof token (exemple) | `--duration=10m` |
| Projected token (exemple) | `expirationSeconds: 600` |
| Plafond de dépense par défaut (Workspace) | aucun (**Never**) |
| Expiration policy par défaut | désactivée |

### 6.3 Tarifs, régions, rétention

- **Tarifs** : aucun prix dans le corpus ; renvoi systématique vers `https://mistral.ai/pricing/`. Devise = devise de facturation de l'Organization ; plafonds HT, crédits TTC.
- **Régions** : seule mention, le paramètre `api_zone` (`global`, `us`, `eu`) de la spec pour filtrer l'usage par **zone d'inférence régionale**.
- **Rétention** : ZDR (API stateless) ; Chat Retention Policy par Workspace ≤ réglage `Vibe › Privacy` de l'Organization ; suppression d'Organization = suppression de l'historique d'usage.

## 7. Détails fins, pièges, cas particuliers, dépréciations

- **Organization admin et Workspaces** : accès complet à tous les Workspaces même sans y être membre, mais s'il est **ajouté** comme membre il reçoit par défaut `workspace_contributor` comme tout le monde.
- **Default Workspace** : non archivable ; impossible d'en retirer un membre (inférence : tout membre de l'Organization y appartient).
- **Archivage irréversible** côté UI ; l'API expose `DELETE /workspaces/{uuid}` et l'audit log `workspace.delete` — la relation archivage/suppression n'est pas expliquée.
- **Dernier Organization admin** : ne peut pas être retiré.
- **Retrait d'un membre** : ses ressources peuvent rester accessibles aux autres membres.
- **Suppression d'Organization** : ne supprime pas les comptes utilisateurs.
- **Clés API immuables** : Workspace, Connector access scope et expiration figés à la création ; rotation = nouvelle clé + suppression.
- **Affichage unique** des secrets : clés API, Admin API keys, clés de service account.
- **Une clé standard n'a jamais de droits admin**, quel que soit le rôle de son propriétaire.
- **Admin API key ≠ Enterprise Account** : clés gérées dans la section enterprise par commodité, mais portée strictement une Organization.
- **Enterprise Account admin** ne peut pas administrer les Organizations liées par défaut : **Promote to admin** requis.
- **Workload identity** : une API key définie dans l'environnement du worker **prime** sur le jeton ; deux audiences différentes (`mistral-auth:<nonce>` à l'enregistrement, `api-gateway` à l'exécution) ; une Issuer URL par Organization ; subject lu depuis le jeton, jamais saisi.
- **Service account sans rôle** = inutilisable ; `role_ids` remplace intégralement les rôles.
- **Hardened deployment** : la clé API d'un service account doit être ajoutée séparément ; la rotation WIF ne nécessite aucune mise à jour.
- **Comptes liés aux connecteurs** non isolés entre Workspaces (isolation complète = comptes Mistral séparés).
- **Changement de Workspace dans Vibe** : réinitialise le contexte de **tous les onglets ouverts**.
- **Email domain authentication** : n'authentifie pas (identifiants propres) ; réactivation = reconfiguration complète ; désactivation sans effet sur les membres existants.
- **SSO** : SAML 2.0 seulement ; mappings sensibles à la casse ; désactivation ⇒ réinitialisation des mots de passe ou réinvitation, arrêt du provisioning ; invitations manuelles réservées aux Organizations sans SSO.
- **DNS TXT** à conserver indéfiniment.
- **Crédits vs plafonds** : TTC vs HT ⇒ épuisement possible avant le plafond ; plafonds appliqués même avec crédits ; solde légèrement négatif possible.
- **HTTP 402** uniquement pour l'usage **au-delà** de l'usage inclus.
- **Plafond de Workspace** : n'affecte que ce Workspace ; plafonné par celui de l'Organization ; vider le champ = **Never**.
- **Rate limits** partagés entre toutes les clés d'un Workspace.
- **ZDR** : exclut modèles Labs, Agents, Conversations, Libraries, `/v1/files`, fichiers batch, Vibe Work, Chat ; ne remplace pas le training opt-out.
- **Audit logs** : pas d'export ; événements dépréciés possibles dans d'anciens logs.
- **Dépréciations** : champs `role` / `role_name` (au profit de `roles` / `role_names`) ; codes `A`/`M` (et `B` dans la spec) ; endpoint `POST /user-groups/provision-workspace` (spec) ; clés et sièges **Mistral Code** (legacy, remplacés par Vibe Code) ; événements d'indexation legacy (`indexing.*`).
- **Commentaires internes visibles dans la source** (non affichés sur le site) : rôles multiples additifs « stated per Greg; confirm at review » ; `ensure_roles.py` fait autorité et `workspace_admin` inclut **temporairement** l'observabilité (`ViewObservabilityTraffic`) « until multi-role ships », périmètre final à l'équipe Observability ; SCIM en private preview à garder hors doc publique ; référence Admin API générée depuis une PR du dashboard (#33094), URLs à confirmer ; hôte des endpoints `/analytics/*` à confirmer (service `datalake-api`) ; référence audit générée depuis le schéma OpenAPI Admin du dashboard (commit `55e27978…`) ; lien vers la config admin des connecteurs « à ajouter ».

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Rôle `billing` de Workspace** : listé uniquement dans « Manage groups and roles » (« Usage and cost reports only ») ; absent de la page RBAC de référence.
2. **Observabilité de `workspace_admin`** : « no observability » (page API) vs silence de la page RBAC, et commentaire interne indiquant qu'il l'inclut temporairement.
3. **`user` / `dev`** : « Vibe » (page RBAC) vs « le Chat » (page API) — même produit renommé (inférence).
4. **`workflow_executor`** : cité pour les service accounts mais absent des tableaux de rôles.
5. **Billing (Organization)** : « usage reports » / « usage information » selon la page ; la page API omet l'usage. Par ailleurs l'Admin overview exige Organization admin ou Workspace admin pour accéder à Admin, alors que Billing gère la facturation dans l'Admin Panel.
6. **Organization admin dans les Workspaces** : « full access to every Workspace » vs « even an Organization admin… starts as a Workspace contributor until you change it ».
7. **Authentification Admin API** : en-tête `x-api-key` (toutes les pages) vs schéma `AdminApiKey` « http bearer » dans la spec.
8. **Chemins analytics** : doc `/analytics/lechat/usage/*` et `/analytics/vibe/usage/*` vs spec `/analytics/vibe/work/usage/*` et `/analytics/vibe/code/usage/*` ; hôte non confirmé.
9. **Guide User provisioning** : utilise des formes dépréciées (`role: "A"`/`"M"`, `workspace_role: "M"`, endpoint `provision-workspace` déprécié dans la spec) alors que les autres pages recommandent `role_names` et `/user-groups/{uuid}/workspaces`. Il présente `admin_user_id` comme optionnel, alors qu'il est requis ailleurs.
10. **Endpoints non documentés** mais présents dans la spec : `/usage/query`, `/users/{id}/deactivate`, `/user-groups/{id}/nested`, `/api-keys` (CRUD), `/scim/sync`. La page API reference cite pourtant un domaine « API keys ».
11. **Audit logs** : 3 types d'acteurs documentés vs 5 dans la spec (`ADMIN_API_KEY`, `SERVICE_ACCOUNT`) ; 45 vs 53 types de cibles ; 196 vs 252 événements (aucun événement workflow, trusted issuer, workload identity, secrets manager, plugin documenté, alors que les pages service accounts/WIF renvoient à la référence d'audit). Le champ UI est noté `CreatedAt` et le champ API `created_at`. Les événements `service_account.client_secret.*` parlent de « client secret », notion absente des pages service accounts (inférence : correspond à l'API key du service account).
12. **Audit logs « Enabled by default for all Workspaces »** alors qu'il s'agit d'une fonctionnalité d'Organization (Enterprise).
13. **Rate limits** : « appliqués au niveau Workspace » (page Workspace) vs « traffic your Organization can send » (page Usage and limits) ; RPS défini comme « maximum concurrent API requests » (requêtes/seconde ≠ concurrence) ; « tokens per month » présenté comme rate limit.
14. **Plafond de dépense** : couvre API + Vibe, mais l'effet décrit en cas de dépassement est la suspension de l'**accès API** ; l'impact sur Vibe n'est pas précisé.
15. **Paramètres `month`/`year`** : décrits comme entiers, typés `string` dans la spec.
16. **API key expiration policy** : page `/admin/identity-access/api-key-policy` référencée mais absente du corpus.
17. **Nommage de la console** : « Admin Panel » vs « Admin Console » (service accounts, trusted issuers) ; routes exactes non données pour ces pages et pour la section enterprise.
18. **Chemins de facturation** : `Admin Panel › Subscription` (`/subscription`) vs `Admin Panel › Subscriptions › Billing` (`/organization/billing`) ; la page Invoices omet « Admin Panel » dans le chemin.
19. **Lien cassé probable** : `/admin/set-up-Organization/verify-domain` (majuscule) dans Create your Organization ; URL `https://admin.mistral.ai/Organization` vs `/organization`.
20. **Email domain authentication** : Verify domain dit qu'elle ajoute « automatiquement » les utilisateurs, alors que la page dédiée décrit une adhésion volontaire via `Join Organization`.
21. **Calendrier de facturation** : la liste « Subscriptions (Pro, Team, Enterprise) » omet Education, pourtant cité dans les charges d'abonnement.
22. **Workspaces : qui crée ?** Seuls les Organization admins sont cités ; le droit d'un `workspace_admin` à créer un Workspace n'est pas traité (inférence : non).
23. **Groupes imbriqués** : présents dans la spec (`/user-groups/{uuid}/nested`) mais jamais évoqués dans les pages ; la règle de cumul des rôles via un groupe parent n'est pas décrite.

## Annexe — Couverture

| # | Fichier | Statut | Source |
|---|---|---|---|
| 1 | `admin.md` | ✅ lu en entier | https://docs.mistral.ai/admin.md |
| 2 | `admin/admin-api/api-reference.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/api-reference.md |
| 3 | `admin/admin-api/authentication.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/authentication.md |
| 4 | `admin/admin-api/manage-groups-roles.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/manage-groups-roles.md |
| 5 | `admin/admin-api/manage-users.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/manage-users.md |
| 6 | `admin/admin-api/manage-workspaces.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/manage-workspaces.md |
| 7 | `admin/admin-api/overview.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/overview.md |
| 8 | `admin/admin-api/usage-metrics.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/usage-metrics.md |
| 9 | `admin/admin-api/user-provisioning.md` | ✅ lu en entier | https://docs.mistral.ai/admin/admin-api/user-provisioning.md |
| 10 | `admin/billing-usage/billing.md` | ✅ lu en entier | https://docs.mistral.ai/admin/billing-usage/billing.md |
| 11 | `admin/billing-usage/invoices.md` | ✅ lu en entier | https://docs.mistral.ai/admin/billing-usage/invoices.md |
| 12 | `admin/billing-usage/subscriptions.md` | ✅ lu en entier | https://docs.mistral.ai/admin/billing-usage/subscriptions.md |
| 13 | `admin/billing-usage/usage-limits.md` | ✅ lu en entier | https://docs.mistral.ai/admin/billing-usage/usage-limits.md |
| 14 | `admin/identity-access/api-keys.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/api-keys.md |
| 15 | `admin/identity-access/connectors.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/connectors.md |
| 16 | `admin/identity-access/groups.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/groups.md |
| 17 | `admin/identity-access/roles-permissions.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/roles-permissions.md |
| 18 | `admin/identity-access/service-accounts.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/service-accounts.md |
| 19 | `admin/identity-access/user-management.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/user-management.md |
| 20 | `admin/identity-access/workload-identity.md` | ✅ lu en entier | https://docs.mistral.ai/admin/identity-access/workload-identity.md |
| 21 | `admin/monitor-comply/audit-logs/overview.md` | ✅ lu en entier | https://docs.mistral.ai/admin/monitor-comply/audit-logs/overview.md |
| 22 | `admin/monitor-comply/audit-logs/reference.md` | ✅ lu en entier (complétude des listes vérifiée par script) | https://docs.mistral.ai/admin/monitor-comply/audit-logs/reference.md |
| 23 | `admin/monitor-comply/zero-data-retention.md` | ✅ lu en entier | https://docs.mistral.ai/admin/monitor-comply/zero-data-retention.md |
| 24 | `admin/overview.md` | ✅ lu en entier | https://docs.mistral.ai/admin/overview.md |
| 25 | `admin/set-up-organization/create-organization.md` | ✅ lu en entier | https://docs.mistral.ai/admin/set-up-organization/create-organization.md |
| 26 | `admin/set-up-organization/enterprise-accounts.md` | ✅ lu en entier | https://docs.mistral.ai/admin/set-up-organization/enterprise-accounts.md |
| 27 | `admin/set-up-organization/sign-in-method/email-domain-authentication.md` | ✅ lu en entier | https://docs.mistral.ai/admin/set-up-organization/sign-in-method/email-domain-authentication.md |
| 28 | `admin/set-up-organization/sign-in-method/saml-sso.md` | ✅ lu en entier | https://docs.mistral.ai/admin/set-up-organization/sign-in-method/saml-sso.md |
| 29 | `admin/set-up-organization/verify-domain.md` | ✅ lu en entier | https://docs.mistral.ai/admin/set-up-organization/verify-domain.md |
| 30 | `admin/workspaces/usage-limits.md` | ✅ lu en entier | https://docs.mistral.ai/admin/workspaces/usage-limits.md |
| 31 | `admin/workspaces/workspaces-in-studio.md` | ✅ lu en entier | https://docs.mistral.ai/admin/workspaces/workspaces-in-studio.md |
| 32 | `admin/workspaces/workspaces-in-vibe.md` | ✅ lu en entier | https://docs.mistral.ai/admin/workspaces/workspaces-in-vibe.md |
| 33 | `admin/workspaces/your-first-workspace.md` | ✅ lu en entier | https://docs.mistral.ai/admin/workspaces/your-first-workspace.md |

Complément : recherches ciblées dans la spec OpenAPI locale (`/v1/admin/*`, `/v1/service-accounts*`, schémas `AdminCreateAPIKeyIN`, `UsageQueryIN`, `UsageType`, `ApiZone`, `AdminScimSyncTriggerIN`, `SetNestedGroupsIn`, `DeactivateUserOUT`, `NewUsageLimitIN`, `AdminWorkspaceIn`, `OrganizationMemberCreate`, `UserRole`, `WorkspaceRole`, enums `ActorType`, `TargetType`, `AuditLogEventType`, schéma de sécurité `AdminApiKey`).
