# J5 « Connecteurs en un clic » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque espace connecte ses outils (clé API ou OAuth) depuis un catalogue dans WorkStudio, et ses agents ne voient que les connexions de leur espace.

**Architecture:** Nexora Connect garde les identifiants ; une connexion d'espace s'appelle `ws-<workspaceId>` ; chaque espace a un jeton d'exécution limité à ses connexions, porté par son serveur MCP « Nexora Connect » ; notre fork de Connect ajoute la connexion implicite. WorkStudio administre Connect côté serveur (`NEXORA_CONNECT_ADMIN_TOKEN`).

**Tech Stack:** Nexora Connect (TypeScript, Vitest), WorkStudio (Next.js 16, React Query, next-intl, Vitest), Docker compose.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8sexies (prime, avec ses précisions).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee`, `check-brand`, `check-licenses`, `check-i18n` passent ; licences d'OpenConnector respectées (`NOTICE.md`).
- Le jeton d'administration de Connect et les jetons d'espace ne quittent jamais le serveur (ni réponse, ni journal, ni navigateur).
- Tout texte visible via next-intl, français par défaut.
- Conventions WorkStudio (contrats, routes, `requestJson`, pas de `@sim/db` dans `app/api/**`) ; `check:audits`, `check:test-types` passent ; tests de Connect (`npx vitest run`) passent.
- Ne jamais arrêter un processus non lancé par ce travail ; disque de pc6 surveillé.

## Review Focus

- Un membre de l'espace B appelle une route avec l'identifiant de l'espace A : refusé (403), aucune connexion de A visible.
- Jeton d'espace absent ou révoqué dans Connect : recréé, en-tête MCP mis à jour, sans casser les autres espaces.
- Deux espaces lancent l'OAuth du même service en même temps : le premier reçoit un message clair (« demande remplacée »), rien n'est mal rattaché.
- Clé API refusée par le fournisseur (validation de Connect) : message en français, aucune connexion créée.
- Connexion supprimée hors WorkStudio (console Connect) : la page l'affiche comme non connectée, le jeton est réconcilié.

---

### Task 1: Connexion implicite (Nexora Connect)

**Files:** `services/nexora-connect/src/server/actions/action-runner.ts`, `src/mcp.ts` (+ tests à côté des existants)

- [x] **Step 1: Failing tests** : jeton limité à `ws-1` (brevo) : `execute_action` sans `connectionName` utilise `ws-1` ; avec deux connexions brevo autorisées et sans nom ⇒ `connection_not_allowed` (inchangé) ; jeton sans limite ⇒ comportement d'origine (connexion `default`) ; `get_action_guide` suit la même règle.
- [x] **Step 2:** Implémenter la règle (résolution avant la vérification de politique). Run `npx vitest run` — Expected: PASS.
- [x] **Step 3: Commit** `feat(j5): Nexora Connect — connexion implicite pour un jeton limité`.

### Task 2: Client d'administration de Connect (WorkStudio)

**Files:** `workstudio/apps/sim/lib/nexora/connect-admin.ts` (+ test contre un faux Connect en mémoire), `lib/core/config/env.ts` (`NEXORA_CONNECT_ADMIN_URL`, `NEXORA_CONNECT_ADMIN_TOKEN`), `deploy/compose.yml` (+ `scripts/tests/test-compose-env.sh`)

**Interfaces:** `workspaceConnectionName(workspaceId)`, `listCatalog(query)` (cache LRU + ETag), `getServiceSetup(service)`, `listWorkspaceConnections(workspaceId)`, `connectWithCredentials(workspaceId, service, authType, values)`, `startOAuth(workspaceId, service) → { requestId, authorizationUrl }`, `getOAuthStatus(requestId)`, `disconnect(workspaceId, service)`, `syncWorkspaceToken(workspaceId) → { token?: string }` (crée ou met à jour `ws-<id>`, renvoie le secret seulement à la création), erreurs `ConnectUnavailableError`, `ConnectRefusedError(code)`.

- [x] **Step 1: Failing tests** : nom `ws-<id>` valide (≤ 64, motif de Connect) ; création de clé ⇒ `PUT /api/connections/:service` avec `connectionName` et `values` ; jeton créé une fois puis mis à jour (liste complète des connexions de l'espace) ; suppression ⇒ jeton mis à jour ; clé refusée ⇒ `ConnectRefusedError` ; Connect injoignable ⇒ `ConnectUnavailableError` ; aucun secret dans les messages d'erreur.
- [x] **Step 2:** Implémenter ; Run tests — PASS.
- [x] **Step 3: Commit** `feat(j5): client d'administration de Nexora Connect`.

### Task 3: Jeton d'espace dans le serveur MCP de l'espace

**Files:** `workstudio/apps/sim/lib/nexora/connect.ts` (enregistrement existant du serveur « Nexora Connect »), nouvelle fonction `applyWorkspaceConnectToken(workspaceId, token)` qui met à jour l'en-tête `Authorization` du serveur MCP de l'espace via l'orchestration MCP existante (+ test).

- [ ] **Step 1: Failing test** : après `applyWorkspaceConnectToken`, le serveur MCP de l'espace porte `Bearer <token>` ; les autres espaces gardent le leur ; un espace sans serveur « Nexora Connect » en reçoit un.
- [ ] **Step 2:** Implémenter ; PASS.
- [ ] **Step 3: Commit** `feat(j5): chaque espace utilise son propre jeton Nexora Connect`.

### Task 4: Routes `/api/nexora/connectors/*`

**Files:** contrat `lib/api/contracts/nexora-connectors.ts` ; routes `app/api/nexora/connectors/route.ts` (GET catalogue + état de l'espace), `[service]/route.ts` (GET fiche + setup ; POST clé API/identifiants ; DELETE), `[service]/oauth/route.ts` (POST démarrer), `oauth/[requestId]/route.ts` (GET état) ; `app/api/nexora/connectors/oauth-apps/[service]/route.ts` (PUT/DELETE, admins d'instance) (+ `route.test.ts`).

- [ ] **Step 1: Failing tests** : lecture = membre de l'espace ; écriture = droit d'écriture ; applications OAuth = admin d'instance ; espace étranger ⇒ 403 sans appel à Connect ; erreurs ⇒ codes (`unavailable`, `refused`, `superseded`) ; aucun secret dans les réponses.
- [ ] **Step 2:** Implémenter ; `check:api-validation:strict`.
- [ ] **Step 3: Commit** `feat(j5): routes des connecteurs`.

### Task 5: Interface « Connecteurs »

**Files:** page `app/workspace/[workspaceId]/connecteurs/` (catalogue, recherche, catégories, fiche, formulaire de clé, fenêtre OAuth + suivi), entrée de barre latérale, Réglages › Connecteurs (applications OAuth de l'opérateur, adresse de retour affichée), messages `messages/{fr,en}/connectors.json`, liens « Connecter un outil » de l'Accueil vers la page.

- [ ] **Step 1:** Construire ; `type-check`, `check:audits`, `check-i18n`, `check-brand` — PASS.
- [ ] **Step 2: Commit** `feat(j5): catalogue de connecteurs en un clic`.

### Task 6: Guide, fumée, pc6, revue

- [ ] **Step 1:** `docs/guide/connecteurs.md` ; fumée « Connecteurs » (catalogue, connexion d'un service à clé API de test dans l'espace A, outil visible dans A et absent dans B via la découverte MCP, déconnexion).
- [ ] **Step 2:** pc6 : reconstruction (WorkStudio + Connect), fumée complète ; navigateur : parcours « Terminé quand ».
- [ ] **Step 3:** Suites complètes, audits, revue finale, corrections TDD, push.
