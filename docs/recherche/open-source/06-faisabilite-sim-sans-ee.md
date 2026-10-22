# 06 — Faisabilité : faire tourner le cœur de Sim sans `apps/sim/ee/`

**Date** : 22/10/2026 · **Dépôt étudié** : `simstudioai/sim`, branche `main`, commit `ec64b0027865a3791e3606eb4c643c2a6e426e25` (21/10/2026) · **Statut** : étude de faisabilité. Les modules de remplacement restent dans un dossier de travail temporaire (scratchpad) ; rien n'a été copié dans le projet Nexora, rien n'a été poussé, l'application n'a pas été lancée.

## En bref

- **C'est faisable.** Le cœur Apache-2.0 de Sim **compile sans aucune erreur de type** quand `apps/sim/ee/` est remplacé par nos propres modules, écrits sans jamais lire le code d'origine.
- **Taille de la dépendance** : 262 fichiers du cœur importent `@/ee/…` (199 fichiers de production, 63 de test) ; 454 références vers **105 chemins distincts** ; **207 symboles** importés, répartis sur **13 modules**.
- **Remplacement écrit** : 106 fichiers (environ 1 730 lignes), chacun avec l'en-tête `// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.`
- **Vérification statique** : 105 chemins sur 105 résolus, 437 noms importés sur 437 exportés. **Zéro manquant.**
- **Vérification des types** (`tsc --noEmit -p apps/sim`, TypeScript 7.0.2) : 34 erreurs au premier passage, **toutes dues à nos stubs** (typage trop vague). Après correction : **0 erreur**, donc **0 erreur préexistante** dans le cœur.
- **Mémoire** : le contrôle de types consomme **8,6 Go** de mémoire (pic). Avec seulement 14 Go libres, le seuil de 5 Go aurait presque été atteint. Pendant l'exécution, la machine avait en fait 93 à 104 Go disponibles ; le minimum observé était de 94,9 Go. vLLM n'a pas été touché.
- **Constat structurant** : la logique serveur de plusieurs fonctions « entreprise » est déjà dans le cœur Apache : groupes de permissions, routes API d'audit, de data drains, de SSO, de credential groups et d'usage. Le dossier `ee/` contient surtout des **écrans**, de la **colle d'application** et trois domaines lourds : **SCIM**, **forks de workspace** et **demandes d'accès**.

## 1. Méthode « salle blanche »

1. **Clone sans le dossier propriétaire.** Le dépôt a été cloné en `--depth 1 --no-checkout`, puis extrait avec un *sparse checkout* qui excluait `/apps/sim/ee/`. Les fichiers propriétaires n'ont donc **jamais été écrits sur le disque**. `rm -rf apps/sim/ee` a été lancé quand même, et l'absence du dossier a été vérifiée (`ls` : « aucun fichier ou dossier »).
2. **Aucune lecture du dossier `ee/`.** Toutes les recherches (`grep`, scripts Python) partaient des fichiers du cœur et excluaient explicitement `apps/sim/ee/`. Le script d'inventaire contient une assertion qui refuse tout fichier de ce dossier.
3. **Sources autorisées**, toutes sous Apache-2.0 hors `ee/` :
   - les **sites d'appel** (arguments passés, valeur de retour utilisée, `instanceof`, JSX) ;
   - les **types et utilitaires du cœur** utilisés autour de ces appels (`@/lib/branding`, `@/lib/permission-groups`, `@/lib/core/application`, `@/lib/api/server/routes/scim-route`, schéma de la base `@sim/db`) ;
   - les **mocks de test du cœur** (`packages/testing/src/mocks/*.mock.ts`), qui listent les noms exportés de 5 modules ;
   - les **RFC publiques** 7643 et 7644 (SCIM) pour les URN, le type de média et les valeurs `scimType`.
4. **Écriture des remplacements** par génération à partir de nos propres scripts. Chaque fichier porte l'en-tête imposé.
5. **Contrôles** : script statique (résolution des chemins et des noms exportés), puis contrôle de types complet sous surveillance mémoire.
6. **Cœur intact** : `git status` hors `apps/sim/ee` donne 0 modification. Les entrées `ee/` d'origine ont été retirées de l'index de la copie de travail (`git rm --cached`, sans les lire) : nos fichiers apparaissent comme non suivis.

Une seule information sur `ee/` a été vue sans lire de code : les noms de fichiers `apps/sim/ee/…` cités dans un fichier de configuration du cœur (`vitest.integration-durations.json`) et dans des articles de contenu (`content/library/*.mdx`). Ces fichiers relèvent du cœur.

## 2. Inventaire module par module

« Fichiers cœur » = fichiers de production qui importent le module. « Tests » = fichiers `*.test.ts(x)`, `*.integration.ts` et `packages/testing`.

| Module `ee/` | Chemins | Symboles | Fichiers cœur | Tests | Nature des symboles |
|---|---:|---:|---:|---:|---|
| access-requests | 17 | 38 | 52 | 6 | 9 use cases, 8 constantes, 7 fonctions (navigation, réglage), 5 composants, 4 schémas zod, 3 registres (opérations, handlers d'outbox), 1 hook, 1 type |
| whitelabeling | 4 | 11 | 47 | 1 | `getBrandConfig` (37 appelants), métadonnées et CSS de thème, fusion avec la marque d'organisation, `BrandingProvider`, 2 hooks, 2 types |
| workspace-forking | 35 | 53 | 41 | 14 | 18 use cases, 19 fonctions (verrous, copie, remappage, travaux de fond), 4 registres/politiques d'erreur, 3 clés de requête, 3 constantes, 4 types, 1 composant, 1 hook |
| access-control | 3 | 20 | 38 | 36 | 9 classes d'erreur, 9 fonctions de validation, 1 hook, 1 composant |
| scim | 28 | 67 | 25 | 8 | 21 use cases, 26 fonctions (protocole, normalisation, garde-fous d'appartenance), 12 constantes, 4 types, 1 classe d'erreur, 1 composant, 1 clé |
| sso | 8 | 9 | 6 | 1 | 4 composants (dont 2 exports `default`), constante `SSO_TRUSTED_PROVIDERS`, hook `useSSOProviders`, 2 clés de requête |
| organization-usage | 2 | 2 | 4 | 0 | 2 composants |
| credential-groups | 2 | 2 | 3 | 1 | 2 composants |
| audit-logs | 1 | 1 | 2 | 0 | 1 composant |
| data-retention | 1 | 1 | 2 | 0 | 1 composant |
| data-drains | 1 | 1 | 2 | 0 | 1 composant |
| session-policy | 2 | 2 | 1 | 1 | 1 composant, 1 clé de requête |
| custom-blocks | 1 | 0 | 1 | 0 | chemin seul (préchargement par `import()`) |
| **Total** | **105** | **207** | **199** | **63** | 66 fonctions, 48 use cases, 25 constantes, 22 composants, 11 types, 10 erreurs, 8 registres, 7 clés, 6 hooks, 4 schémas |

**Modes d'import** : 350 imports statiques, 24 imports dynamiques (pages de réglages chargées avec `next/dynamic`, handlers d'outbox chargés à la demande, préchargements), 67 `vi.mock` dans les tests.

### Contextes d'appel déterminants (déduits du seul cœur)

- **Use cases** (access-requests, scim, workspace-forking) : objets `{ operation, execute({ principal, input }) }` passés aux constructeurs de routes du cœur (`defineInternalJsonRoute`, `defineV2JsonRoute`, `createScimRouteBuilder`). Le constructeur vérifie seulement que `operation.id` est identique entre la route et le use case. Nous avons retrouvé l'association route ↔ opération pour chaque route concernée.
- **Contrôle d'accès** : appels `await validateX(userId, workspaceId, …)` dans l'exécuteur de workflows, les agents, les déploiements de chat, le partage de fichiers et les invitations, plus des `instanceof XNotAllowedError` pour traduire les refus en 403.
- **Composants « enveloppe »** : `PermissionAccessBoundary` entoure les pages Accueil, Fichiers et Changelog, et `BrandingProvider` entoure tout l'espace de travail. **Ils doivent afficher leurs enfants** : renvoyer `null` viderait l'application.
- **Marque** : `getBrandConfig()` est appelé dans les e-mails, le manifeste, les layouts et le chargement (champs `name`, `logoUrl`, `supportEmail`, `theme.primaryColor`, `isWhitelabeled`, `faviconUrl`, `customCssUrl`, `wordmarkUrl`, `documentationUrl`). Le type `BrandConfig` est déjà défini dans le cœur (`@/lib/branding/types`).
- **SCIM** : le cœur possède le constructeur de routes SCIM (`lib/api/server/routes/scim-route.ts`). Ce constructeur vérifie `isScimDeploymentEnabled()` **avant** toute authentification : s'il renvoie `false`, toutes les routes SCIM répondent 404.

Le détail des 105 chemins figure en annexe.

## 3. Stratégie de remplacement

| Module | Remplacement écrit maintenant | Comportement actuel | À réimplémenter plus tard | Priorité |
|---|---|---|---|---|
| **whitelabeling** | Vrai module de marque minimal | Marque « Nexora WorkStudio », couleurs neutres (gris `#4b5563` / `#374151`, accent `#6b7280`), surchargeables par les variables `NEXT_PUBLIC_BRAND_*` déjà déclarées dans le cœur. `isWhitelabeled: true`, ce qui masque les mentions « Sim » des e-mails. Fusion avec la marque d'organisation et contexte React. | Lecture de `organization.whitelabel_settings` (colonne qui existe déjà en base), écran de réglages, adresse de support réelle | **P1** |
| **access-control** | Réimplémenté sur le moteur du cœur | Les 9 validations réutilisent `getUserPermissionConfig` et les utilitaires de `@/lib/permission-groups` (cœur). La liste blanche `ALLOWED_INTEGRATIONS` reste donc **appliquée côté serveur**. Les erreurs héritent de `ForbiddenOperationError` (403). Le hook lit la route du cœur `/api/permission-groups/user`. | Écran d'administration des groupes (`AccessControl`) | **P1** (sécurité) |
| **sso** | Stub désactivé | Aucun fournisseur de confiance, composants vides. La page `/sso` reste bloquée par le drapeau du cœur `isSsoEnabled`. | Formulaire SSO, réglages, domaines vérifiés (le cœur a déjà `lib/auth/sso` et des routes API) | P2 |
| **access-requests** | Désactivé | `isAccessRequestEnabled` renvoie `false`. Les use cases répondent 404. Les handlers d'outbox ne font rien. La frontière de permission est transparente. | Tout le domaine, si le besoin est confirmé | P3 |
| **scim** | Désactivé | `isScimDeploymentEnabled` renvoie `false`, donc 404 sur toutes les routes. Les garde-fous d'appartenance ne refusent jamais. Le prédicat SQL vaut `false`. | Provisionnement RFC 7644 (users, groups, PATCH, réconciliation) | P3 (P2 si clients grands comptes) |
| **workspace-forking** | Désactivé, sauf une fonction | Disponibilité `{ available: false }`. Les autres use cases répondent 404. Pas de verrou ni de mapping. **`rewriteForkContentRefs` est implémenté** (remplacement littéral des identifiants de fichiers) car il sert aussi au chemin de copie de chat du cœur. | Forks, synchronisation et promotion des workspaces | P3 |
| audit-logs, data-retention, data-drains, organization-usage, session-policy, credential-groups, custom-blocks | Composants vides | Sections de réglages vides | Écrans uniquement : les routes API et la logique sont déjà dans le cœur | P2 (journal d'audit, usage), P3 (le reste) |

Briques communes ajoutées dans `ee/_nexora/disabled.ts` :

- `FeatureDisabledError`, une erreur d'orchestration `not_found` que les politiques d'erreur du cœur rendent en 404 ;
- des fabriques d'opérations et de use cases désactivés ;
- un use case « constant » pour les sondes de disponibilité.

## 4. Résultats des vérifications

### 4.1 Vérification statique

Le script `verify_ee_stubs.py` vérifie que chaque référence `@/ee/…` du cœur pointe vers un fichier existant et que chaque nom importé y est exporté (y compris dans les imports dynamiques).

```
core references checked : 454 (distinct specs: 105)
named imports checked   : 437
stub files present      : 106
missing files           : 0
missing exported names  : 0
files without header    : 0
```

### 4.2 Contrôle de types

**Conditions** :

- `bun` 1.4.2 installé dans le scratchpad (préfixe utilisateur) ;
- `bun install --ignore-scripts` : 11 s, 0,47 Go de pic, aucun script de cycle de vie exécuté ;
- commande `tsc --noEmit -p apps/sim --incremental false --pretty false`.

Le dépôt utilise **TypeScript 7.0.2, le compilateur natif écrit en Go** : `NODE_OPTIONS=--max-old-space-size=6144` n'a donc aucun effet. La mémoire a été bornée par `GOMEMLIMIT=6GiB` et `--checkers 1`, et un script de surveillance tuait le processus si la mémoire disponible passait sous 5 Go.

| Passage | Réglage | Durée | Pic mémoire | Mémoire dispo minimale | Erreurs | Liées aux stubs | Préexistantes |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | `--checkers 2` | 57 s | 10,8 Go | 97,9 Go | 34 | 34 | 0 |
| 2 | `--checkers 1`, typage corrigé | 83 s | 8,7 Go | 94,9 Go | 4 | 4 | 0 |
| 3 | `--checkers 1`, version finale | 77 s | 8,6 Go | 100,8 Go | **0** | **0** | **0** |

**Nature des 34 erreurs du premier passage** :

- types de retour trop stricts ou trop vagues dans nos stubs : forme de `triggerUrlChanges`, `URLSearchParams` attendu au lieu d'une chaîne, résultats de use cases typés `any` qui donnaient des paramètres implicitement `any` dans les tests d'intégration ;
- un genre de cible manquant (`'feature'`) ;
- un argument `signal` non prévu.

Aucune erreur ne concernait le code du cœur. Le passage final à 0 erreur prouve aussi qu'il n'existe **aucune erreur préexistante** dans le périmètre compilé.

**Hors périmètre** : les fichiers `*.test.ts(x)` sont exclus par le `tsconfig` de `apps/sim` ; les fichiers `*.integration.ts` sont inclus et passent. Pas de build Next.js, pas d'exécution des tests, pas de lancement de l'application.

### 4.3 Mémoire

Le contrôle de types complet demande **8,6 à 10,8 Go**. Avec 14 Go libres au départ, la marge resterait juste au-dessus du seuil de 5 Go (environ 5,4 Go) avec `--checkers 1`, et passerait en dessous avec `--checkers 2`.

Recommandation pour la CI de Nexora : un runner d'au moins 16 Go, ou `--checkers 1 --singleThreaded`.

## 5. Estimation d'effort

| Lot | Contenu | Effort |
|---|---|---:|
| Fait (cette étude) | Inventaire, 106 fichiers de remplacement, vérifications | ~1 j |
| Durcissement immédiat | Masquer dans la navigation les sections vides (SSO, audit, rétention, drains, usage, forks), retirer ou garder en 404 les routes `ee` du cœur, ajouter des tests de non-régression des stubs, relecture juridique | 3–5 j |
| P1 | Marque par organisation et écran de marque ; écran d'administration des groupes de permissions (le moteur existe déjà) | 6–10 j |
| P2 | SSO (écrans et parcours, sur `lib/auth/sso` du cœur) ; écrans d'audit et d'usage d'organisation (API dans le cœur) | 12–20 j |
| P3 | SCIM complet ; demandes d'accès ; data drains, rétention, session-policy, credential-groups, custom-blocks (écrans) | 30–45 j |
| P3 | Forks de workspace (copie, mapping, verrous, sync et promotion, tâche de fond) | 25–40 j |
| **Parité fonctionnelle complète** | | **~80–120 j-dev** |

Ces chiffres sont des ordres de grandeur : la logique d'origine n'a pas été lue.

## 6. Risques

1. **Juridique (le plus important).**
   - **Dérivation** : nos fichiers reprennent les **noms et chemins** des exports `ee/`, que nous connaissons par le cœur Apache. C'est l'interface, pas l'implémentation, mais le point doit être validé par un juriste.
   - **Historique Git** : dans un dépôt Nexora, il ne faut **jamais** conserver l'historique Git de `ee/`. Il faut partir d'un export propre ou utiliser `git filter-repo`.
   - **Sources** : pour chaque fichier, garder la trace des sources utilisées (sites d'appel, RFC).
   - **Licence des fichiers serveur** : vérifier que les fichiers serveur « entreprise » situés hors `ee/` (routes SSO, audit, permission-groups, etc.) sont bien couverts par l'Apache-2.0 du cœur.
2. **Dérive en amont.** Chaque mise à jour de Sim peut ajouter des imports `@/ee/…`.
   - Mesure : relancer `extract_ee_imports.py` et `verify_ee_stubs.py` en CI à chaque synchronisation.
   - Volume : 105 chemins aujourd'hui.
3. **Sécurité.**
   - **Mitigé** : un stub « tout permis » sur le contrôle d'accès aurait désactivé la liste blanche `ALLOWED_INTEGRATIONS` côté serveur. C'est évité en branchant les validations sur le moteur du cœur.
   - **À vérifier par des tests** : refus effectif pour un modèle, une intégration ou un outil interdit.
   - SCIM et le SSO sont **fermés** (404 ou parcours bloqué), pas ouverts.
4. **Expérience utilisateur.** Les écrans désactivés s'affichent vides (`null`) si la navigation les propose encore. Une conversation de chat protégée par SSO afficherait une page vide. Le durcissement prévu en section 5 corrige ces points.
5. **Exécution non prouvée.** Seuls la compilation et la résolution sont prouvées.
   - **Non testés** : les vérifications au chargement des routes (par exemple le contrôle d'identité des opérations) et le comportement réel en exécution.
   - **Prochaine étape** : lancer les tests Vitest unitaires du cœur, puis un démarrage local contrôlé.
6. **Tests du cœur.** Les 63 fichiers de test qui ciblent `@/ee/…` ont été écrits pour le vrai module. Beaucoup de leurs assertions supposent la logique d'origine et échoueront ou devront être retirées ou réécrites.
7. **Ressources.** Le contrôle de types demande environ 9 à 11 Go, à prévoir sur la machine partagée avec vLLM.

## 7. Fichiers produits (scratchpad, non copiés dans le projet)

Racine : `/tmp/claude-1000/-home-pc6--claude-spares-spare-uLDMGF/e8c957db-5c05-499a-8980-d742c3991fc0/scratchpad/sim-noee/`

| Fichier | Rôle |
|---|---|
| `sim/` | Copie de travail du cœur ; `sim/apps/sim/ee/` contient uniquement nos 106 fichiers |
| `tools/extract_ee_imports.py` | Inventaire des imports `@/ee/…` (exclut `apps/sim/ee/` par construction) |
| `tools/usage_dump.py` | Contextes d'appel par symbole |
| `tools/stubs_part1.py` … `stubs_part4.py` | Sources des remplacements ; `python3 stubs_part4.py <cible>` régénère l'arbre |
| `tools/verify_ee_stubs.py` | Vérification statique (code de sortie 0 = zéro manquant) |
| `tools/typecheck_guarded.sh` | Contrôle de types avec garde mémoire de 5 Go |
| `inv.json`, `tc1/` à `tc3/` | Inventaire brut et journaux des 3 passages `tsc` |

## Annexe — Inventaire des 105 chemins importés

Colonne « Fichiers cœur / tests » : nombre de fichiers qui référencent le chemin.

| Chemin importé (`@/ee/…`) | Symboles (T = type) | Fichiers cœur / tests | Mode |
|---|---|---:|---|
| `access-control/components/access-control` | `AccessControl` | 2 / 0 | dynamique |
| `access-control/hooks/permission-groups` | `useUserPermissionConfig` | 2 / 1 | statique, vi.mock |
| `access-control/utils/permission-check` | `CustomToolsNotAllowedError`, `IntegrationNotAllowedError`, `InvitationsNotAllowedError`, `McpToolsNotAllowedError`, `ModelNotAllowedError`, `ProviderNotAllowedError`, `PublicApiNotAllowedError`, `SkillsNotAllowedError`, `ToolNotAllowedError`, `assertPermissionsAllowed`, `getUserPermissionConfig`, `resolveVerifiedUserAccessControlContext`, `validateBlockType`, `validateChatDeployAuth`, `validateInvitationsAllowed`, `validateModelProvider`, `validatePublicApiAllowed`, `validatePublicFileSharing` | 34 / 35 | statique, vi.mock |
| `access-requests/components/access-requests-loading` | `AccessRequestsLoading` | 3 / 0 | statique |
| `access-requests/components/access-requests-settings` | `AccessRequestsSettings` | 3 / 1 | statique, dynamique, vi.mock |
| `access-requests/components/member-limit-request-action` | `MemberLimitRequestAction` | 1 / 0 | statique |
| `access-requests/components/permission-access-boundary` | `PermissionAccessBoundary`, `useWorkspaceAccessRequestFeatures` | 17 / 2 | statique, vi.mock |
| `access-requests/components/request-access-action` | `RequestAccessModal` | 2 / 1 | statique, vi.mock |
| `access-requests/components/search-params` | `accessRequestEntrySearchParams` | 1 / 0 | statique |
| `access-requests/lib/application/authorized-use-case` | `defineAuthorizedAccessRequestUseCase` | 0 / 1 | statique |
| `access-requests/lib/application/operations` | `accessRequestOperations` | 18 / 1 | statique |
| `access-requests/lib/application/requests` | `cancelAccessRequest`, `createAccessRequest`, `discoverAccessRequests`, `getAccessRequestSettings`, `listMyAccessRequests`, `listOrganizationAccessRequests`, `updateAccessRequestSettings`, `workspaceAccessRequestUseCases` | 14 / 2 | statique, dynamique, vi.mock |
| `access-requests/lib/application/review` | `previewAccessRequest`, `resolveAccessRequest` | 4 / 0 | statique |
| `access-requests/lib/constants` | `ACCESS_REQUEST_LIST_PAGE_SIZE`, `ACCESS_REQUEST_MAX_ID_LENGTH`, `ACCESS_REQUEST_MAX_OFFSET`, `ACCESS_REQUEST_MAX_SEARCH_LENGTH` | 2 / 0 | statique |
| `access-requests/lib/navigation` | `getAccessRequestsSettingsHref`, `getLegacyAccessRequestsQuery`, `getLegacyAccessRequestsSettingsQuery`, `getMyAccessRequestHref` | 6 / 0 | statique |
| `access-requests/lib/notification-events` | `PERMISSION_ACCESS_REQUEST_CREATED_EVENT`, `PERMISSION_ACCESS_REQUEST_DECIDED_EVENT`, `PERMISSION_ACCESS_REQUEST_NOTIFY_ADMIN_EVENT` | 1 / 0 | statique |
| `access-requests/lib/notifications` | `permissionAccessRequestOutboxHandlers` | 1 / 0 | dynamique |
| `access-requests/lib/schemas` | `storedAccessRequestDecisionSchema`, `storedAccessRequestPolicyChangeSchema`, `storedAccessRequestPolicyValueSchema`, `storedAccessRequestTargetSchema` | 1 / 0 | statique |
| `access-requests/lib/settings` | `isAccessRequestEnabled` | 1 / 1 | statique, vi.mock |
| `access-requests/lib/targets` | `ACCESS_REQUEST_TARGET_KINDS`, `AccessRequestScope` (T) | 2 / 1 | statique |
| `audit-logs/components/audit-logs` | `AuditLogs` | 2 / 0 | dynamique |
| `credential-groups/components/organization-connected-accounts` | `OrganizationConnectedAccounts` | 2 / 0 | dynamique |
| `credential-groups/components/slack-managed-users-modal` | `SlackManagedUsersModal` | 1 / 1 | statique, vi.mock |
| `custom-blocks/components/custom-blocks` | — (chemin seul : `import()` de préchargement ou `vi.mock`) | 1 / 0 | dynamique |
| `data-drains/components/data-drains-settings` | `DataDrainsSettings` | 2 / 0 | dynamique |
| `data-retention/components/data-retention-settings` | `DataRetentionSettings` | 2 / 0 | dynamique |
| `organization-usage/components/usage-events-view` | `UsageEventsView` | 2 / 0 | statique |
| `organization-usage/components/usage-monitoring` | `UsageMonitoring` | 2 / 0 | dynamique |
| `scim/components/scim-section` | `ScimSection` | 0 / 1 | statique |
| `scim/hooks/scim` | `scimKeys` | 0 / 1 | statique |
| `scim/lib/application/admin/connection` | `configureScimConnection`, `getScimConnection`, `listScimActivity`, `reconcileScimConnection` | 3 / 0 | statique |
| `scim/lib/application/admin/credentials` | `issueScimCredential`, `revokeScimCredential` | 2 / 0 | statique |
| `scim/lib/application/admin/mappings` | `deleteScimGroupMapping`, `listScimGroupMappings`, `upsertScimGroupMapping` | 2 / 0 | statique |
| `scim/lib/application/groups/manage-groups` | `createScimGroup`, `deleteScimGroup`, `getScimGroup`, `listScimGroups`, `patchScimGroup`, `replaceScimGroup` | 2 / 1 | statique |
| `scim/lib/application/operations` | `scimOperations` | 0 / 1 | statique |
| `scim/lib/application/users/deprovision-user` | `deprovisionScimUser` | 1 / 0 | statique |
| `scim/lib/application/users/provision-user` | `provisionScimUser` | 1 / 0 | statique |
| `scim/lib/application/users/read-users` | `getScimUser`, `listScimUsers` | 2 / 0 | statique |
| `scim/lib/application/users/update-user` | `patchScimUser`, `replaceScimUser` | 1 / 0 | statique |
| `scim/lib/authenticate` | `ScimConnectionAuthenticator` (T) | 1 / 0 | statique |
| `scim/lib/base-url` | `scimBaseUrl` | 1 / 1 | statique, vi.mock |
| `scim/lib/entitlement` | `isScimDeploymentEnabled`, `isScimEntitledForOrganization` | 4 / 1 | statique, vi.mock |
| `scim/lib/identity/end-directory-membership` | `endDirectoryMembershipTx` | 1 / 0 | statique |
| `scim/lib/managed-membership` | `assertInviteeNotScimManaged`, `assertMembershipNotScimManaged`, `scimManagedUserPredicate` | 4 / 4 | statique, vi.mock |
| `scim/lib/projection/reconcile-user` | `PROJECTION_BATCH_SIZE`, `reconcileUsersProjectionInBatches` | 0 / 1 | statique |
| `scim/lib/protocol/canonical` | `toCanonicalGroup`, `toCanonicalUser` | 4 / 0 | statique |
| `scim/lib/protocol/constants` | `SCIM_ACCEPTED_MEDIA_TYPES`, `SCIM_ENTERPRISE_USER_SCHEMA`, `SCIM_GROUP_SCHEMA`, `SCIM_LIST_RESPONSE_SCHEMA`, `SCIM_MAX_BODY_BYTES`, `SCIM_MAX_GROUP_MEMBERS`, `SCIM_MAX_PATCH_OPERATIONS`, `SCIM_MEDIA_TYPE`, `SCIM_PATCH_OP_SCHEMA`, `SCIM_RATE_LIMIT`, `SCIM_USER_SCHEMA` | 2 / 1 | statique |
| `scim/lib/protocol/discovery` | `resourceTypes`, `schemaDefinitions`, `serviceProviderConfig` | 5 / 0 | statique |
| `scim/lib/protocol/errors` | `ScimError`, `ScimErrorBody` (T), `ScimType` (T), `notFound`, `scimErrorBody`, `toScimError` | 3 / 1 | statique |
| `scim/lib/protocol/normalize` | `canonicalizeAttributeNames`, `normalizeScimBoolean`, `stripProviderSchemaMarkers`, `unwrapSingleElement` | 1 / 0 | statique |
| `scim/lib/protocol/resources` | `parseAttributeProjection`, `toListResponse` | 6 / 0 | statique |
| `scim/lib/reconcile/job` | `runScimReconcileSweep` | 1 / 0 | statique |
| `scim/lib/repository/groups` | `insertScimGroup` | 0 / 1 | statique |
| `scim/lib/repository/users` | `insertScimUser` | 0 / 1 | statique |
| `scim/lib/request-log` | `ScimRequestLogEntry` (T) | 1 / 0 | statique |
| `scim/lib/route` | `defineScimRoute` | 4 / 0 | statique |
| `session-policy/components/session-policy-settings` | `SessionPolicySettings` | 1 / 1 | statique |
| `session-policy/hooks/session-policy` | `sessionPolicyKeys` | 0 / 1 | statique |
| `sso/components/sso-auth` | `default` | 1 / 0 | statique |
| `sso/components/sso-form` | `default` | 1 / 0 | statique |
| `sso/components/sso-provider-settings` | `SsoProviderSettings` | 0 / 1 | statique |
| `sso/components/sso-settings` | `SSO` | 2 / 1 | statique, dynamique |
| `sso/components/verified-domains-section` | `VerifiedDomainsSection` | 0 / 1 | statique |
| `sso/constants` | `SSO_TRUSTED_PROVIDERS` | 1 / 0 | statique |
| `sso/hooks/domains` | `domainKeys` | 0 / 1 | statique |
| `sso/hooks/sso` | `ssoKeys`, `useSSOProviders` | 1 / 1 | statique |
| `whitelabeling` | `BrandConfig` (T), `OrganizationWhitelabelSettings` (T), `generateBrandedMetadata`, `generateThemeCSS`, `getBrandConfig`, `mergeOrgBrandConfig`, `useBrandConfig` | 42 / 0 | statique |
| `whitelabeling/components/branding-provider` | `BrandingProvider`, `useOrgBrandConfig` | 4 / 1 | statique, vi.mock |
| `whitelabeling/components/whitelabeling-settings` | `WhitelabelingSettings` | 2 / 0 | dynamique |
| `whitelabeling/org-branding` | `getOrgWhitelabelSettings` | 1 / 1 | statique, vi.mock |
| `workspace-forking/api/route-policies` | `internalForkErrorPolicy`, `v2ForkErrorPolicy` | 25 / 0 | statique |
| `workspace-forking/application/authorized-fork-use-case` | `defineForkUseCase` | 0 / 1 | statique |
| `workspace-forking/application/content-outbox` | `forkContentOutboxHandlers` | 1 / 0 | dynamique |
| `workspace-forking/application/content-outbox-event` | `FORK_CONTENT_COPY_EVENT` | 1 / 0 | statique |
| `workspace-forking/application/create-and-sync` | `forkWorkspace`, `previewWorkspaceFork`, `previewWorkspaceSync`, `syncWorkspace` | 8 / 1 | statique |
| `workspace-forking/application/discovery` | `getWorkspaceForkAvailability`, `getWorkspaceForkLineage`, `getWorkspaceForkMappings`, `listWorkspaceForkChildren`, `listWorkspaceForkResources` | 7 / 1 | statique, dynamique |
| `workspace-forking/application/lineage-details` | `getWorkspaceForkLineageDetails` | 1 / 0 | statique |
| `workspace-forking/application/mapping-details` | `getWorkspaceForkMappingDetails` | 1 / 0 | statique |
| `workspace-forking/application/operations` | `forkOperations` | 26 / 1 | statique |
| `workspace-forking/application/recovery-and-mappings` | `rollbackWorkspaceFork`, `unlinkWorkspaceFork`, `updateWorkspaceForkExclusions`, `updateWorkspaceForkMappings` | 8 / 1 | statique |
| `workspace-forking/application/resource-details` | `getWorkspaceForkResourceDetails` | 1 / 0 | statique |
| `workspace-forking/application/revision` | `assertForkSourceVersions` | 0 / 1 | statique |
| `workspace-forking/application/sync-default` | `setForkSyncDefault` | 1 / 1 | statique |
| `workspace-forking/application/sync-details` | `getWorkspaceSyncDetails` | 1 / 1 | statique |
| `workspace-forking/components/forks` | `Forks` | 1 / 1 | statique, dynamique |
| `workspace-forking/hooks/use-forking-available` | `FORK_AVAILABILITY_STALE_TIME`, `forkAvailabilityKeys`, `useForkingAvailable` | 2 / 1 | statique |
| `workspace-forking/hooks/workspace-fork` | `forkKeys`, `forkLineageQueryOptions` | 1 / 1 | statique |
| `workspace-forking/lib/background-work/store` | `listSurfacedBackgroundWork`, `reapStaleBackgroundWork` | 2 / 1 | statique, vi.mock |
| `workspace-forking/lib/copy/content-copy-runner` | `ForkContentCopyPayload` (T), `runForkContentCopy` | 1 / 0 | statique |
| `workspace-forking/lib/copy/copy-files` | `executeForkFileBlobCopies` | 0 / 1 | statique |
| `workspace-forking/lib/copy/copy-resources` | `copyForkResourceContainers`, `copyForkResourceContent`, `planForkMappedKbDocumentCopies` | 0 / 1 | statique |
| `workspace-forking/lib/copy/deploy-bridge` | `loadSourceDeployedStates` | 0 / 1 | statique |
| `workspace-forking/lib/copy/progress` | `ForkCopyProgress` (T) | 0 / 1 | statique |
| `workspace-forking/lib/create-fork` | `CreateForkResult` (T), `createFork` | 1 / 2 | statique, vi.mock |
| `workspace-forking/lib/lineage/authz` | `assertWorkspaceAdminAccess`, `isForkingAvailableForWorkspace` | 3 / 6 | statique, vi.mock |
| `workspace-forking/lib/lineage/lineage` | — (chemin seul : `import()` de préchargement ou `vi.mock`) | 1 / 3 | vi.mock |
| `workspace-forking/lib/lineage/lineage-root` | — (chemin seul : `import()` de préchargement ou `vi.mock`) | 1 / 0 | vi.mock |
| `workspace-forking/lib/lineage/unlink` | `unlinkForkEdge` | 0 / 1 | statique |
| `workspace-forking/lib/mapping/mapping-store` | — (chemin seul : `import()` de préchargement ou `vi.mock`) | 1 / 0 | vi.mock |
| `workspace-forking/lib/promote/promote` | `PromoteForkResult` (T) | 1 / 1 | statique, vi.mock |
| `workspace-forking/lib/promote/promote-run-store` | — (chemin seul : `import()` de préchargement ou `vi.mock`) | 0 / 1 | vi.mock |
| `workspace-forking/lib/promote/sync-provenance` | `activateForkSyncProvenance` | 1 / 0 | statique |
| `workspace-forking/lib/remap/block-identity` | `EMPTY_FORK_BLOCK_MAP`, `buildForkBlockIdResolver`, `deriveForkBlockId` | 0 / 1 | statique |
| `workspace-forking/lib/remap/fork-bootstrap` | `createForkBootstrapTransform` | 0 / 1 | statique |
| `workspace-forking/lib/remap/remap-content-refs` | `rewriteForkContentRefs` | 1 / 0 | statique |
