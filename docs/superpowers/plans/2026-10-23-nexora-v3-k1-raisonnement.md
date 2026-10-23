# K1 « Modèles à raisonnement et fiches de modèles » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** les modèles à raisonnement (GLM 5.3 par défaut sur pc6, Ollama qwen3/deepseek-r1) fonctionnent partout dans Nexora — réflexion lue sous ses trois formes, affichée à part et repliable, jamais mêlée à la réponse — et chaque modèle de Réglages › Modèles porte une fiche (raisonnement, outils, vision, contexte, localisation des données).

**Architecture:** un module unique d'extraction (`lib/nexora/reasoning.ts`) sert les trois chemins qui lisent une réponse : le client direct de Nexora API (`wand.ts` : Playground, « Générer avec l'IA », Copilote), le test d'un modèle (`model-admin.ts`) et le fournisseur `vllm` du moteur (agents, chat publié, Assistant), qui réutilise l'événement `thinking_delta` déjà prévu par Sim et les trames `thinking` du protocole `agent-events-v1`. Les fiches sont rangées dans les métadonnées de l'organisation d'instance (`nexoraModelCards`, comme `nexoraBudgets`) : aucune migration, aucune modification de Nexora API.

**Tech Stack:** Next.js 16, React Query, next-intl, zod, Vitest ; Nexora API (compatible OpenAI) ; passerelle LiteLLM (GLM 5.3) ; Ollama.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` — jalon K1 ; contenu et « Terminé quand » : `docs/recherche/ecart-mistral-studio-v2.md` §3.2 (K1), lignes de matrice §1.1 (modèles à raisonnement) et §1.12 (fiches).

## Global Constraints

- Toutes les règles de la v2 : pas de code `ee/` d'origine, français via next-intl et `check-i18n`, marque Nexora, conventions du dépôt, audits verts, aucun secret dans Git, TDD, revue finale par jalon, preuves dans le ledger, push sur `main`.
- Rien ne sort de l'instance sans action explicite d'un administrateur ; un modèle hors instance est affiché comme tel.
- Chaque jalon ajoute ses contrôles à `scripts/smoke.py`.
- Double vérification : chaque « Terminé quand » est vérifié sur pc6 avec le modèle par défaut GLM 5.3 (`cloud-glm-5-3`) et, pour ce qui dépend de la vitesse, avec un modèle local CPU (`qwen2.5:7b`).
- Ne jamais arrêter un processus ou conteneur non lancé par ce travail ; surveiller le disque de pc6.
- Jamais de réflexion dans la sortie `content` d'un bloc, dans un JSON du Copilote ni dans le texte de « Générer avec l'IA ».
- `reasoning_effort` n'est transmis que si un effort est choisi, et retiré quand le modèle le refuse.

## Review Focus

- Balise `<think>` coupée entre deux morceaux du flux (`<thi` + `nk>`) : aucun fragment de balise dans la réponse ni dans la réflexion (Task 1).
- Réflexion ouverte jamais fermée (sortie tronquée par `max_tokens`) : tout ce qui suit `<think>` est réflexion, la réponse reste vide et le test le dit (« réponse tronquée ») au lieu d'afficher la réflexion comme réponse (Tasks 1 et 3).
- Modèle qui refuse `reasoning_effort` (LiteLLM → OpenRouter, HTTP 400) : la requête est rejouée sans le réglage et aboutit ; le Playground le signale (Tasks 2 et 6).
- Texte qui contient « think » sans balise (« I think… ») ou une balise `<think>` au milieu d'une réponse normale : seule une balise ouvrante en tête de réponse (après espaces) ouvre la réflexion (Task 1).
- Fiche d'un modèle supprimé puis rajouté sous le même nom : l'ancienne fiche est effacée au retrait (Task 4).

---

### Task 1: Extraction de la réflexion

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/reasoning.ts`
- Test: `workstudio/apps/sim/lib/nexora/reasoning.test.ts`

**Interfaces:**
- Produces:
  - `splitInlineThinking(text: string): { content: string; reasoning: string }` — `<think>…</think>` en tête (espaces tolérés) ; balise non fermée ⇒ tout est réflexion.
  - `readMessageReasoning(message: unknown): { content: string; reasoning: string }` — message non-flux : `reasoning_content`, sinon `reasoning` (chaîne ou `{ text }`), puis balises en ligne du `content`.
  - `readDeltaReasoning(delta: unknown): string` — même lecture sur un `delta` de flux (sans les balises).
  - `createThinkTagSplitter(): { push(text: string): ReasoningPiece[]; flush(): ReasoningPiece[] }` avec `ReasoningPiece = { kind: 'reasoning' | 'content'; text: string }`.
  - `isReasoningEffortRejection(status: number, message: string): boolean` — 400 dont le message cite `reasoning_effort`.
  - `REASONING_EFFORTS = ['low', 'medium', 'high'] as const`, `type ReasoningEffort`.

- [x] **Step 1: Write the failing tests** — `reasoning_content`, `reasoning` (chaîne et objet), `<think>` en ligne ; balise coupée sur 2 et 3 morceaux ; balise non fermée ; « I think » et `<think>` en milieu de texte non traités ; réponse vide avec réflexion ; refus de `reasoning_effort` (400 + mention) vs autre 400.
- [x] **Step 2: Run** `cd workstudio/apps/sim && LANG=en_US.UTF-8 bunx vitest run lib/nexora/reasoning.test.ts` — Expected: FAIL (module absent).
- [x] **Step 3: Implement** le module (machine à états : avant-balise / réflexion / réponse, avec tampon de préfixe de balise).
- [x] **Step 4: Run** — Expected: PASS ; revert d'un garde (tampon de préfixe) ⇒ rouge, puis rétabli.

### Task 2: Client direct de Nexora API (Playground, « Générer avec l'IA », Copilote)

**Files:**
- Modify: `workstudio/apps/sim/lib/nexora/wand.ts`
- Test: `workstudio/apps/sim/lib/nexora/wand.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `nexoraWandComplete` renvoie la réponse sans réflexion (Copilote, JSON).
  - `nexoraWandStream({ …, includeThinking?: boolean, reasoningEffort?: ReasoningEffort })` émet `data: {"thinking": "…"}` quand `includeThinking`, sinon un commentaire SSE `: reflexion` (garde la connexion ouverte sans rien montrer) ; `{"chunk"}` ne porte jamais de réflexion ; `{"done": true, "effortIgnored": true}` quand l'effort a été retiré.
  - `reasoning_effort` envoyé seulement si fourni ; HTTP 400 qui le cite ⇒ requête rejouée sans lui.

- [x] **Step 1: Failing tests** — complete : `reasoning_content` + `content` JSON ⇒ texte = JSON seul ; `<think>` en ligne retiré ; stream : deltas `reasoning_content` ⇒ événements `thinking` (avec `includeThinking`) et rien dans `chunk` ; `<think>` coupé ⇒ chunk propre ; sans `includeThinking` ⇒ aucun `thinking` émis ; effort refusé ⇒ deuxième appel sans `reasoning_effort` et `effortIgnored`.
- [x] **Step 2: Run** `bunx vitest run lib/nexora/wand.test.ts` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS ; revert du filtrage ⇒ rouge.

### Task 3: « Tester » un modèle

**Files:**
- Modify: `workstudio/apps/sim/lib/nexora/model-admin.ts` (`testRequest`, `testNexoraModel`), `workstudio/apps/sim/lib/api/contracts/nexora-models.ts` (`testNexoraModelContract`), `workstudio/apps/sim/app/api/nexora/models/[id]/test/route.ts`
- Test: `workstudio/apps/sim/lib/nexora/model-admin.test.ts`

**Interfaces:**
- Consumes: Task 1 ; Task 4 `updateModelCard` (la route enregistre ce que le test détecte).
- Produces: `testNexoraModel(name, options, usage) → { latencyMs: number; reply: string; truncated: boolean; capabilities: { reasoning: boolean | null; tools: boolean | null } }`. Discussion : `max_tokens: 1024`, délai 300 s ; `truncated` = réponse vide et réflexion présente ; sonde « outils » (un outil factice, `max_tokens: 16`) : 200 ⇒ `true`, 400 ⇒ `false`, autre ⇒ `null`. Vision et transcription : capacités `null`.

- [x] **Step 1: Failing tests** — `content: null` + `reasoning_content` ⇒ `truncated: true`, `reasoning: true`, reply vide ; `<think>…</think>Bonjour` ⇒ reply « Bonjour », `reasoning: true` ; `max_tokens` envoyé = 1024 ; sonde outils 400 ⇒ `tools: false`, 200 ⇒ `true` ; vision : aucune sonde.
- [x] **Step 2: Run** `bunx vitest run lib/nexora/model-admin.test.ts` — FAIL.
- [x] **Step 3: Implement** ; contrat de réponse étendu ; la route enregistre `{ reasoning, tools, testedAt }` dans la fiche (Task 4).
- [x] **Step 4: Run** — PASS ; revert de `max_tokens`/lecture de la réflexion ⇒ rouge.

### Task 4: Fiches de modèles (Réglages › Modèles)

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/model-cards.ts`, `workstudio/apps/sim/lib/nexora/model-cards.test.ts`, `workstudio/apps/sim/app/api/nexora/models/[id]/card/route.ts`, `workstudio/apps/sim/app/workspace/[workspaceId]/settings/components/nexora-models/model-card-modal.tsx`
- Modify: `lib/api/contracts/nexora-models.ts` (schéma `card`, `updateNexoraModelCardContract`), `app/api/nexora/models/route.ts` (liste enrichie), `app/api/nexora/models/[id]/route.ts` (retrait ⇒ fiche effacée), `hooks/queries/nexora-models.ts` (`useUpdateNexoraModelCard`), `settings/components/nexora-models/nexora-models.tsx` (badges, action « Modifier la fiche »), `messages/{fr,en}/settings.json` (`settings.models.card.*`)

**Interfaces:**
- Produces:
  - `type ModelLocation = 'local' | 'eu' | 'external'`
  - `interface NexoraModelCard { reasoning: boolean | null; tools: boolean | null; vision: boolean; contextTokens: number | null; location: ModelLocation; locationEditable: boolean; testedAt: string | null }`
  - `parseModelCards(metadata: unknown): Record<string, StoredModelCard>` ; `mergeModelCard(metadata, name, change: ModelCardChange | null)` (`null` efface) ; `resolveModelCard(model: { name; usage; source }, stored?: StoredModelCard): NexoraModelCard` ; `readModelCards(orgId)`, `updateModelCard(orgId, name, change | null)` (verrou de ligne).
  - Localisation : `ollama` ⇒ `local`, `mistral` ⇒ `eu` (non modifiables) ; `openai-compatible` ⇒ valeur déclarée, `external` par défaut.
  - `PATCH /api/nexora/models/[id]/card` body `{ location?: ModelLocation; contextTokens?: number | null }` (administrateurs ; `location` refusée hors service compatible OpenAI).

- [x] **Step 1: Failing tests** — métadonnées illisibles tolérées ; fusion qui garde les autres clés `nexora*` ; `null` efface ; localisation par source et défaut `external` ; `location` ignorée pour `ollama`/`mistral` ; contexte borné (1 000 à 10 000 000).
- [x] **Step 2: Run** `bunx vitest run lib/nexora/model-cards.test.ts` — FAIL.
- [x] **Step 3: Implement** module, contrat, routes, hook, interface (badges « Raisonnement », « Outils », « Vision », « Contexte : 128 k », « Sur ce serveur » / « Hébergé UE » / « Hors instance » ; fenêtre « Fiche du modèle » avec localisation et contexte ; message « modèle à raisonnement : réponse tronquée »), messages fr/en.
- [x] **Step 4: Run** tests + `bun run type-check` — PASS.

### Task 5: Playground — réflexion en flux et effort

**Files:**
- Create: `workstudio/apps/sim/app/workspace/[workspaceId]/components/thinking-panel/thinking-panel.tsx`
- Modify: `lib/api/contracts/nexora-playground.ts` (`reasoningEffort` facultatif), `app/api/nexora/playground/route.ts` (`includeThinking: true`, effort), `playground/stream-answer.ts` (`onThinking`, `effortIgnored`), `playground/components/playground-column.tsx` (volet « Réflexion »), `playground/playground.tsx` (sélecteur « Effort de raisonnement »), `messages/{fr,en}/agents.json` (`agents.playground.*`, `agents.thinking.*`)
- Test: `playground/stream-answer.test.ts`, `app/api/nexora/playground/route.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces: `ThinkingPanel({ text, streaming, answerStarted })` — volet repliable, ouvert tant que la réflexion arrive sans réponse, replié ensuite (le clic de la personne l'emporte). `streamPlaygroundAnswer({ …, onThinking? })` ⇒ outcome `done` porte `effortIgnored: boolean`.

- [x] **Step 1: Failing tests** — `thinking` relayé à `onThinking` et jamais à `onChunk` ; `effortIgnored` lu dans l'événement final ; la route transmet `reasoningEffort` et `includeThinking`.
- [x] **Step 2: Run** `bunx vitest run 'app/workspace/[workspaceId]/playground' app/api/nexora/playground` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS.

### Task 6: Moteur — fournisseur Nexora (`vllm`) et bloc Agent

**Files:**
- Modify: `workstudio/apps/sim/providers/openai-compat/stream-events.ts` (option `splitInlineThinking`), `workstudio/apps/sim/providers/vllm/index.ts`, `workstudio/apps/sim/blocks/blocks/agent.ts` (« Reasoning Effort » visible pour les modèles `vllm/…`)
- Test: `providers/openai-compat/stream-events.test.ts`, `providers/vllm/index.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: flux `vllm` : `<think>` ⇒ `thinking_delta`, `text_delta` et `content` final sans balise ; historique de conversation sans balise ; non-flux et boucle d'outils : `content` sans réflexion ; `request.reasoningEffort` (hors `auto`) ⇒ `reasoning_effort`, retiré et rejoué sur refus.

- [x] **Step 1: Failing tests** — flux avec `<think>` coupé ⇒ événements séparés, `onComplete.content` propre ; non-flux avec `<think>` ⇒ `content` propre ; `reasoningEffort: 'high'` ⇒ `reasoning_effort` envoyé ; 400 qui le cite ⇒ second appel sans lui.
- [x] **Step 2: Run** `bunx vitest run providers/openai-compat/stream-events.test.ts providers/vllm/index.test.ts` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS ; revert ⇒ rouge.

### Task 7: Formulaire d'agent — « Effort de raisonnement »

**Files:**
- Modify: `workstudio/apps/sim/lib/nexora/agents.ts` (`AgentConfig.reasoningEffort`), `app/workspace/[workspaceId]/agents/[workflowId]/components/agent-form.tsx`, `messages/{fr,en}/agents.json` (`agents.form.*`)
- Test: `workstudio/apps/sim/lib/nexora/agents.test.ts`

**Interfaces:**
- Produces: `AgentConfig.reasoningEffort: 'auto' | ReasoningEffort` (défaut `auto`), écrit dans le sous-bloc `reasoningEffort` du bloc Agent, relu par `readAgentWorkflow`, compté par `hasUnsavedAgentChanges`.

- [x] **Step 1: Failing tests** — aller-retour build/read ; ancien workflow sans sous-bloc ⇒ `auto` ; changement d'effort ⇒ modification non enregistrée détectée.
- [x] **Step 2: Run** `bunx vitest run lib/nexora/agents.test.ts` — FAIL.
- [x] **Step 3: Implement** (réglage dans le formulaire, sous le modèle).
- [x] **Step 4: Run** — PASS.

### Task 8: Assistant et agent publié — réflexion repliée

**Files:**
- Modify: `app/workspace/[workspaceId]/assistant/stream-reply.ts` (en-tête `X-Sim-Stream-Protocol: agent-events-v1`, trames `thinking`), `assistant/hooks/use-assistant-turn.ts`, `assistant/components/message-item.tsx` (`ThinkingPanel`), `lib/nexora/assistant/general-agent.ts` et `agents/[workflowId]/components/publish-section.tsx` (`includeThinking: true` à la publication), `messages/{fr,en}/assistant.json` si besoin
- Test: `assistant/stream-reply.test.ts`

**Interfaces:**
- Consumes: Task 5 (`ThinkingPanel`), Task 6 (événements `thinking_delta` du moteur).
- Produces: `streamAgentReply({ …, onThinking? })` ; la réflexion n'entre jamais dans `text`.

- [x] **Step 1: Failing tests** — trame `thinking` ⇒ `onThinking`, `text` inchangé ; en-tête de protocole envoyé.
- [x] **Step 2: Run** `bunx vitest run 'app/workspace/[workspaceId]/assistant'` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS.

### Task 9: Fumée, guide, vérification

**Files:**
- Modify: `scripts/smoke.py`, `docs/guide/modeles.md`, `docs/guide/playground.md`

- [x] **Step 1:** Fumée : « Modèles : test du modèle par défaut et sa fiche » (réponse non vide, capacité de raisonnement rapportée et enregistrée, localisation) ; « Playground : réflexion séparée de la réponse » (aucune balise `<think>` dans la réponse, réflexion dans des événements à part) ; `maxTokens` du contrôle Playground existant porté à 1024. Les 27 contrôles existants restent.
- [x] **Step 2:** Guide : brancher un modèle via LiteLLM, ce que change un modèle à raisonnement, fiches et localisation ; Playground : volet Réflexion, effort.
- [x] **Step 3:** Vérifications : biome sur les fichiers touchés, `bun run type-check`, `check:audits`, `check:test-types`, `check:api-validation:strict`, vitest ciblé, `check-i18n`, `check-brand`, `check-no-ee`.
- [x] **Step 4:** Preuves sur un `next dev` à part (:3210) : « Tester » GLM non vide + badge « Raisonnement » ; Playground GLM vs `qwen2.5:7b` (réflexion puis réponse) ; chat d'agent avec réflexion repliée.
