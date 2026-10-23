# J4 « Playground et Agents » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** essayer et comparer les modèles dans un Playground, et créer, tester, publier et versionner un agent par formulaire, sans perdre la puissance de l'éditeur.

**Architecture:** le Playground relaie `/v1/chat/completions` de Nexora API en flux (route `/api/nexora/playground`). Un agent est un workflow de forme fixe (Chat → Agent → Réponse) du dossier « Agents » ; deux fonctions pures (`lib/nexora/agents.ts`) traduisent formulaire ↔ état de workflow ; sauvegarde, test, déploiement, chat public et versions réutilisent les routes existantes (`/api/workflows/[id]/state|execute|deploy|deployments/[version]/revert|chat`).

**Tech Stack:** Next.js 16, React 19, React Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8 (J4), §8quinquies (prime).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee`, `check-brand`, `check-licenses`, `check-i18n` passent.
- Tout texte visible via next-intl, français par défaut, parité en/fr.
- Conventions WorkStudio (contrats, `withRouteHandler`, `parseRequest`, `requestJson`, pas de `@sim/db` dans `app/api/**`, mocks centraux) ; `bun run check:audits`, `check:test-types` passent.
- Un workflow modifié dans l'éditeur hors de la forme d'agent n'est **jamais** réécrit par le formulaire.
- Aucun secret dans Git ; disque de pc6 surveillé ; ne jamais arrêter un processus non lancé par ce travail.

## Review Focus

- Membre d'un autre espace appelant `/api/nexora/playground` avec un `workspaceId` qui n'est pas le sien : refusé.
- Agent modifié dans l'éditeur (bloc ajouté, arête changée) : `readAgentWorkflow` renvoie `null`, le formulaire passe en lecture seule.
- Outil Nexora Connect dont le serveur a disparu : l'agent s'ouvre quand même, l'outil apparaît « introuvable ».
- Diff entre une version de forme agent et une version hors forme : « non comparable », pas d'erreur.
- Flux du Playground interrompu (onglet fermé) : la requête amont est annulée.

---

### Task 1: Formulaire ↔ workflow (fonctions pures)

**Files:** Create `workstudio/apps/sim/lib/nexora/agents.ts`, `agents.test.ts`

**Interfaces:**
- `AGENTS_FOLDER = 'Agents'`
- `interface AgentConfig { name: string; description: string; instructions: string; model: string; tools: StoredTool[]; knowledgeBaseIds: string[]; memory: boolean; welcomeMessage: string }`
- `buildAgentWorkflow(config: AgentConfig): AgentWorkflowState` — blocs `chat_trigger` (« Chat »), `agent` (« Agent » : `messages` système = consignes, utilisateur = `<chat.input>` ; `model` ; `tools` = outils + entrée de recherche dans les connaissances quand `knowledgeBaseIds` non vide, à la forme exacte que produit `tool-input.tsx` pour un bloc `knowledge` ; `memoryType` `conversation` + `conversationId` `<chat.conversationId>` si mémoire), `response` ; deux arêtes.
- `readAgentWorkflow(state: unknown): AgentConfig | null` — `null` dès que les blocs/arêtes ne sont pas exactement cette forme.
- `diffAgentConfigs(a: AgentConfig, b: AgentConfig): { field: keyof AgentConfig; before: string; after: string }[]`.

- [x] **Step 1: Failing tests** : aller-retour `readAgentWorkflow(buildAgentWorkflow(c))` égal à `c` (avec et sans mémoire, outils, connaissances) ; bloc ajouté ou arête retirée ⇒ `null` ; état illisible ⇒ `null` ; diff ne liste que les champs changés ; l'état produit passe `parseWorkflowJson` (comme les modèles PME).
- [x] **Step 2: Run** `LANG=en_US.UTF-8 bun run --cwd apps/sim test lib/nexora/agents.test.ts` — Expected: FAIL puis PASS après implémentation.
- [x] **Step 3: Commit** `feat(j4): agent = workflow de forme fixe, aller-retour formulaire`.

### Task 2: Route Playground

**Files:** Create `workstudio/apps/sim/lib/api/contracts/nexora-playground.ts`, `workstudio/apps/sim/app/api/nexora/playground/route.ts` (+ test)

**Interfaces:** POST body `{ workspaceId, model, messages: {role:'system'|'user'|'assistant', content}[] (1–50, contenu ≤ 32 000), temperature (0–2), maxTokens (1–8 192) }` ; réponse : flux `data: {"chunk"}` puis `data: {"done":true,"usage":{...},"latencyMs"}`. Session + appartenance à l'espace (garde d'espace existante). Annulation transmise en amont.

- [x] **Step 1: Failing tests** : 401 sans session ; 403 hors de l'espace ; corps invalide 400 sans appel amont ; relais du flux et de l'usage ; Nexora API indisponible ⇒ événement d'erreur en français côté interface (code `unavailable`).
- [x] **Step 2:** Implémenter ; `check:api-validation:strict`.
- [x] **Step 3: Commit** `feat(j4): route Playground (flux Nexora API)`.

### Task 3: Interfaces Playground et Agents

**Files:** pages `workstudio/apps/sim/app/workspace/[workspaceId]/playground/` et `…/agents/` (liste, formulaire `[workflowId]`), hooks `hooks/queries/nexora-agents.ts`, messages `messages/{fr,en}/agents.json` (zone enregistrée), entrées de barre latérale, carte « Agent » de l'Accueil vers le formulaire.

- [x] **Step 1:** Playground (1–3 colonnes de modèles, consignes, paramètres, réponses en flux, temps et jetons, « Enregistrer comme agent ») ; liste des agents ; formulaire (champs de `AgentConfig`, sélecteurs d'outils Nexora Connect / workflows / bases), « Tester » (volet de discussion sur le brouillon), « Publier » (déploiement + chat public, lien), « Versions » (liste, activer, diff), « Ouvrir dans l'éditeur » ; lecture seule si `readAgentWorkflow` renvoie `null`.
- [x] **Step 2:** `type-check`, `check:audits`, `check-i18n`, `check-brand` — Expected: PASS.
- [x] **Step 3: Commit** `feat(j4): Playground et constructeur d'agents`.

### Task 4: Guide, fumée, pc6, revue

- [ ] **Step 1:** `docs/guide/agents.md` et `docs/guide/playground.md` ; fumée « Playground » (flux reçu, usage) et « Agent » (création par l'état produit, exécution, déploiement, chat public répond, 2ᵉ version, revert).
- [ ] **Step 2:** pc6 : reconstruction, fumée complète, rapport `docs/verification/smoke-j4-*.json` ; navigateur : parcours « Terminé quand » de §8quinquies.
- [ ] **Step 3:** Suite complète, audits, revue finale, corrections TDD, push.
