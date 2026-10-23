# J6 « Assistant Nexora » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un chat interne pour les salariés, dans WorkStudio, qui converse avec les agents publiés de l'espace (et un « Assistant général »), garde l'historique de chaque personne et accepte des fichiers.

**Architecture:** deux tables (conversations, messages) ; une opération applicative par action (créer, lister, renommer, supprimer, envoyer) sous `lib/nexora/assistant/` ; l'envoi exécute la version **déployée** du workflow de l'agent en flux (moteur d'exécution existant), avec `conversationId` pour la mémoire de l'agent et les fichiers transmis par le bloc Start ; interface `/workspace/[id]/assistant`.

**Tech Stack:** Drizzle (migration via la compétence `db-migrate`), Next.js 16, React Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8septies (prime).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee`, `check-brand`, `check-licenses`, `check-i18n` passent.
- Migration créée selon `db-migrate` ; `bun run check:migrations` (contre la base de référence) et `drizzle-kit generate` sans nouvelle migration.
- Une conversation n'est lue, écrite ou supprimée que par son auteur, dans un espace auquel il a accès.
- Tout texte visible via next-intl, français par défaut.
- Conventions WorkStudio (opérations applicatives, contrats, routes, `requestJson`, pas de `@sim/db` dans `app/api/**`) ; `check:audits`, `check:test-types` passent.
- Disque de pc6 surveillé ; ne jamais arrêter un processus non lancé par ce travail.

## Review Focus

- Un membre devine l'identifiant d'une conversation d'un collègue : 404 (pas 403, pour ne rien révéler).
- Agent dépublié entre deux messages : message clair, conversation conservée.
- Fichier trop gros ou d'un type refusé : refus en français avant exécution.
- Flux coupé (onglet fermé) : la question est enregistrée, la réponse partielle aussi, marquée interrompue.
- Espace supprimé : ses conversations disparaissent (clé étrangère en cascade).

---

### Task 1: Tables et migration

**Files:** `workstudio/packages/db/schema.ts` (`nexoraAssistantConversation`, `nexoraAssistantMessage`), migration générée, schéma simulé régénéré (`bun run scripts/generate-schema-mock.ts`).

- [ ] **Step 1:** Suivre `db-migrate` (colonnes, index `(workspace_id, user_id, updated_at)`, cascades vers `workspace`, `user`, `workflow`).
- [ ] **Step 2:** `check:migrations`, `drizzle-kit generate` (aucune nouvelle migration), `check:audits` — PASS.
- [ ] **Step 3: Commit** `feat(j6): tables des conversations de l'Assistant`.

### Task 2: Opérations applicatives et routes

**Files:** `workstudio/apps/sim/lib/nexora/assistant/{operations.ts,conversations.ts,run.ts}` (+ tests), contrat `lib/api/contracts/nexora-assistant.ts`, routes `app/api/nexora/assistant/conversations/route.ts` (GET, POST), `[id]/route.ts` (PATCH, DELETE), `[id]/messages/route.ts` (GET, POST flux).

- [ ] **Step 1: Failing tests** : auteur seulement (autre membre ⇒ 404) ; espace sans accès ⇒ 403 ; envoi ⇒ question enregistrée, exécution de la version déployée avec `{ input, conversationId, files }`, réponse enregistrée avec l'usage ; agent non déployé ⇒ code `agent-unpublished` ; titre dérivé du premier message (≤ 60 caractères) ; flux interrompu ⇒ réponse partielle marquée.
- [ ] **Step 2:** Implémenter (compétence `migrate-application-operation` pour la forme des opérations) ; `check:api-validation:strict`.
- [ ] **Step 3: Commit** `feat(j6): conversations et envoi de messages de l'Assistant`.

### Task 3: Assistant général

**Files:** `workstudio/apps/sim/lib/nexora/assistant/general-agent.ts` (+ test) : crée au premier usage, dans le dossier « Agents », l'agent « Assistant général » (`buildAgentWorkflow` : consignes françaises, `vllm/nexora-default`, recherche dans toutes les bases de l'espace, mémoire), et le déploie.

- [ ] **Step 1: Failing test** : idempotent (un seul agent par espace), bases de l'espace incluses, déployé.
- [ ] **Step 2:** Implémenter ; PASS.
- [ ] **Step 3: Commit** `feat(j6): Assistant général fourni`.

### Task 4: Interface

**Files:** `app/workspace/[workspaceId]/assistant/` (liste des conversations, choix de l'agent, fil en flux avec Markdown, pièces jointes, copier, régénérer), hooks `hooks/queries/nexora-assistant.ts`, messages `messages/{fr,en}/assistant.json` (zone enregistrée), entrée de barre latérale, carte « Assistant » de l'Accueil activée.

- [ ] **Step 1:** Construire ; `type-check`, `check:audits`, `check-i18n`, `check-brand` — PASS.
- [ ] **Step 2: Commit** `feat(j6): Assistant Nexora`.

### Task 5: Guide, fumée, pc6, revue

- [ ] **Step 1:** `docs/guide/assistant.md` ; fumée « Assistant » (conversation créée, réponse reçue en flux, historique relu, autre membre ⇒ 404).
- [ ] **Step 2:** pc6 : migration appliquée, fumée complète ; navigateur : parcours « Terminé quand » (dont un PDF joint).
- [ ] **Step 3:** Suites complètes, audits, revue finale, corrections TDD, push.
