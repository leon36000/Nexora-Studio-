# J7 « Copilote » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** décrire une automatisation en français et obtenir un workflow valide, généré par le modèle Nexora, qui s'exécute.

**Architecture:** le modèle produit un **plan** JSON court (langage d'étapes, zod) ; un compilateur déterministe le transforme en état de workflow (validé par `parseWorkflowJson`) ; deux routes (planifier, créer) ; une fenêtre dans l'Accueil et la barre latérale.

**Tech Stack:** zod, Next.js 16, React Query, next-intl, Vitest ; Nexora API (`nexora-default`).

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8octies (prime).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee`, `check-brand`, `check-licenses`, `check-i18n` passent.
- Aucun appel à un service tiers : le modèle est `nexora-default` via Nexora API.
- Tout texte visible via next-intl, français par défaut ; consignes au modèle en français.
- Conventions WorkStudio ; `check:audits`, `check:test-types` passent.

## Review Focus

- Le modèle renvoie du texte autour du JSON, ou un JSON tronqué : extraction robuste, une relance, puis erreur claire.
- Référence à une étape inexistante (`{{etape_inconnue.content}}`) : refusée à la validation, pas un workflow cassé.
- Service Nexora Connect ou base de connaissances inconnus : ignorés avec un avertissement dans le résumé, pas d'échec.
- Description hostile (injection : « ignore tes consignes ») : le plan reste borné au langage d'étapes ; rien n'est exécuté avant « Créer ».
- Plan de 50 étapes : refusé (12 au plus).

---

### Task 1: Langage d'étapes et compilateur

**Files:** `workstudio/apps/sim/lib/nexora/copilot/plan.ts` (schéma zod `copilotPlanSchema`, types), `compile.ts` (`compilePlan(plan, context) → { state, warnings }`), tests.

- [x] **Step 1: Failing tests** : chaque déclencheur et chaque type d'étape compile en blocs attendus ; références `{{x.y}}` traduites en `<x.y>` (noms normalisés comme ceux de l'éditeur) ; référence inconnue ⇒ erreur de validation ; condition à deux branches reliée correctement ; services/bases inconnus ⇒ avertissement ; l'état produit passe `parseWorkflowJson` ; plus de 12 étapes ⇒ refus.
- [x] **Step 2:** Implémenter ; PASS.
- [x] **Step 3: Commit** `feat(j7): langage d'étapes et compilateur du Copilote`.

### Task 2: Génération du plan et création

**Files:** `lib/nexora/copilot/generate.ts` (consignes, catalogue, appel `nexora-default`, extraction JSON, une relance), contrat `lib/api/contracts/nexora-copilot.ts`, routes `app/api/nexora/copilot/{plan,create}/route.ts` (+ tests).

- [x] **Step 1: Failing tests** : réponse avec texte autour du JSON ⇒ extraite ; JSON invalide puis valide ⇒ une relance ; deux échecs ⇒ code `plan-invalid` ; droit d'écriture requis ; création ⇒ workflow importé dans le dossier demandé.
- [x] **Step 2:** Implémenter ; `check:api-validation:strict`.
- [x] **Step 3: Commit** `feat(j7): génération et création de workflows par le Copilote`.

### Task 3: Interface

**Files:** fenêtre `app/workspace/[workspaceId]/components/copilot-dialog/` (description, exemples, aperçu des étapes, Modifier, Créer), carte « Décrire une automatisation » de l'Accueil, bouton « Avec l'IA » de la barre latérale, messages `messages/{fr,en}/copilot.json`.

- [x] **Step 1:** Construire ; `type-check`, `check:audits`, `check-i18n` — PASS.
- [x] **Step 2: Commit** `feat(j7): Copilote dans l'Accueil et la barre latérale`.

### Task 4: Guide, fumée, pc6, revue

- [x] **Step 1:** `docs/guide/copilote.md` ; fumée « Copilote » (une description ⇒ plan valide ⇒ workflow créé ⇒ exécution réussie).
- [x] **Step 2:** pc6 : les cinq descriptions types de §8octies, chacune créée et exécutée ; rapport dans le ledger.
- [x] **Step 3:** Suites, audits, revue finale, corrections TDD, push.
