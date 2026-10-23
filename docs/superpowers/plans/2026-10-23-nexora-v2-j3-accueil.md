# J3 « Accueil et premier lancement » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** chaque membre arrive sur un Accueil Nexora (créer, démarrer vite, état de la plateforme) ; l'administrateur y suit un premier lancement en 5 étapes jusqu'à un premier devis généré.

**Architecture:** `/workspace/[id]/home` rend l'Accueil Nexora quand le chat d'origine est désactivé (édition Nexora) ; une route d'état légère (`/api/nexora/home`) donne le modèle par défaut, le rôle et la progression ; la progression vit dans `organization.metadata.nexoraOnboarding` (lib/nexora/onboarding.ts) ; l'interface réutilise les routes existantes (workflows, exécution, journaux, organisation, invitations).

**Tech Stack:** Next.js 16, React 19, React Query, next-intl, Drizzle, Vitest ; `scripts/smoke.py`.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §7 et §8quater (prime), 8bis.5.

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee`, `check-brand`, `check-licenses`, `check-i18n` passent.
- Tout texte visible via next-intl, français par défaut, parité des clés en/fr.
- Conventions WorkStudio : contrats `defineRouteContract`, `withRouteHandler`, `parseRequest`, pas de `@sim/db` importé dans `app/api/**`, `requestJson` côté client, pas d'export inutilisé, mocks centraux ; `bun run check:audits` et `check:test-types` passent.
- Le chat d'origine (si `NEXT_PUBLIC_CHAT_ENABLED`) garde son comportement amont.
- Aucun secret dans Git ; ne jamais arrêter un processus non lancé par ce travail ; disque de pc6 surveillé.
- Tests unitaires avec `LANG=en_US.UTF-8`, via `bun run --cwd apps/sim test`.

## Review Focus

- Membre simple : ni le panneau de premier lancement, ni la consommation, ni la route de progression (403) — vérifier côté serveur, pas seulement masqué.
- `organization.metadata` contient déjà d'autres clés : la progression les fusionne, jamais ne les écrase.
- Nexora API arrêtée : l'Accueil s'affiche quand même (modèle « indisponible »), sans erreur de page.
- Espace sans dossier « Modèles PME » (`NEXORA_TEMPLATES_DISABLED`) : cartes de démarrage rapide et étape 5 dégradées proprement.
- Instance sans service d'e-mail : l'étape « équipe » propose le lien d'invitation à copier.

---

### Task 1: Arrivée sur l'Accueil

**Files:**
- Modify: `workstudio/apps/sim/app/workspace/[workspaceId]/page.tsx`, `…/home/page.tsx`, `…/home/layout.tsx`
- Modify: `workstudio/apps/sim/app/workspace/[workspaceId]/w/components/sidebar/sidebar.tsx` (entrée « Accueil » vers `/home` quand le chat est désactivé, en plus de « Nouveau workflow »)
- Create: `workstudio/apps/sim/app/workspace/[workspaceId]/home/nexora-home/nexora-home.tsx` (coquille, remplie en Task 4)

- [x] **Step 1:** `/workspace/[id]` redirige toujours vers `/home` ; `/home` rend `NexoraHome` si `!isChatEnabled`, sinon la page d'origine ; le layout de `/home` ne redirige plus vers `/w` dans ce cas. Ajuster `layout.test.tsx`/tests existants touchés.
- [x] **Step 2: Run** `LANG=en_US.UTF-8 bun run --cwd apps/sim test app/workspace` puis `bun run type-check` — Expected: PASS.
- [x] **Step 3: Commit** `feat(j3): l'Accueil devient la page d'arrivée`.

### Task 2: Route d'état et progression du premier lancement

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/onboarding.ts` (+ test), `workstudio/apps/sim/lib/nexora/default-model.ts` (+ test)
- Create: `workstudio/apps/sim/lib/api/contracts/nexora-home.ts`
- Create: `workstudio/apps/sim/app/api/nexora/home/route.ts` (GET), `workstudio/apps/sim/app/api/nexora/onboarding/route.ts` (PATCH) (+ `route.test.ts`)

**Interfaces:**
- `ONBOARDING_STEPS = ['organization', 'model', 'team', 'tools', 'first-run'] as const`
- `readOnboarding(organizationId): Promise<{ completed: OnboardingStep[]; dismissed: boolean }>` ; `updateOnboarding(organizationId, change: { complete?: OnboardingStep; dismissed?: boolean }): Promise<…>` — fusion dans `organization.metadata`, autres clés intactes ; `first-run` terminé ⇒ `dismissed: true`.
- `fetchDefaultModelName(): Promise<string | null>` — `/v1/models` avec `VLLM_API_KEY`, nom du routeur portant l'alias `nexora-default` ; `null` si Nexora API ne répond pas.
- GET `/api/nexora/home` (session) → `{ defaultModel: string | null, isInstanceAdmin: boolean, onboarding: {completed, dismissed} | null }` (`onboarding` seulement pour un admin) ; PATCH `/api/nexora/onboarding` (admin d'instance) body `{ complete?: step, dismissed?: boolean }`.

- [x] **Step 1: Failing tests** : fusion qui garde une clé `metadata.other` ; étape inconnue refusée (400) ; `first-run` ⇒ terminé ; membre → 403 sur PATCH et `onboarding: null` sur GET ; Nexora API injoignable ⇒ `defaultModel: null` (GET 200).
- [x] **Step 2: Run** — Expected: FAIL (modules absents).
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** `LANG=en_US.UTF-8 bun run --cwd apps/sim test lib/nexora app/api/nexora` et `bun run check:api-validation:strict` — Expected: PASS.
- [x] **Step 5: Commit** `feat(j3): état de l'Accueil et progression du premier lancement`.

### Task 3: Valeurs d'exemple des modèles PME

**Files:** Modify: `workstudio/apps/sim/lib/nexora/templates.ts` (+ test existant)

- [x] **Step 1:** Chaque entrée de modèle PME gagne `example` (valeurs de `TEMPLATE_INPUTS` de `scripts/smoke.py`) ; test : chaque modèle a un exemple non vide pour chaque entrée. Rouge puis vert.
- [x] **Step 2: Commit** `feat(j3): valeurs d'exemple des modèles PME`.

### Task 4: Interface de l'Accueil et du premier lancement

**Files:**
- Create: `workstudio/apps/sim/app/workspace/[workspaceId]/home/nexora-home/{nexora-home.tsx,create-cards.tsx,quick-starts.tsx,platform-status.tsx,onboarding-panel.tsx}`
- Create: `workstudio/apps/sim/hooks/queries/nexora-home.ts`
- Create: `workstudio/apps/sim/messages/{fr,en}/home.json` (zone enregistrée dans `i18n/messages.ts`)

- [x] **Step 1:** Cartes **Créer** (Workflow ; Agent = workflow pré-rempli Chat → Agent `vllm/nexora-default` → Réponse), **Démarrages rapides** (modèles PME du dossier, Inviter l'équipe, Connecter un outil), **État** (modèle par défaut, consommation du mois pour admin, 5 dernières exécutions), panneau **Premier lancement** (5 étapes, « Plus tard », rouvrable ; étape 5 exécute « Devis client » avec ses exemples et affiche le résultat).
- [x] **Step 2: Run** `bun run type-check`, `bun run check:audits`, `check-i18n.sh`, `check-brand.sh` — Expected: PASS.
- [x] **Step 3: Commit** `feat(j3): Accueil Nexora et premier lancement`.

### Task 5: Guide, fumée, pc6, revue

- [x] **Step 1:** `docs/guide/prise-en-main.md` décrit l'Accueil et le premier lancement ; `scripts/smoke.py` gagne « Accueil » (`/workspace/<id>/home` répond 200 en français avec les cartes ; `/api/nexora/home` → `defaultModel` non nul ; PATCH progression : membre 403, admin 200).
- [x] **Step 2:** pc6 : reconstruire WorkStudio, fumée complète verte, rapport `docs/verification/smoke-j3-2026-10-23.json`.
- [x] **Step 3:** Navigateur : compte neuf → Accueil ; admin : 5 étapes jusqu'au devis ; membre : pas de panneau. Preuves au ledger.
- [x] **Step 4:** Suite complète, audits, scripts du dépôt ; revue finale (modèle le plus capable), corrections en TDD, commit, push.
