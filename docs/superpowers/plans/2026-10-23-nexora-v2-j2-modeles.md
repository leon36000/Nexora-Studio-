# J2 « Modèles » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** choisir, ajouter, tester et changer ses modèles depuis Réglages › Modèles, sans toucher `deploy/.env`, avec Nexora API comme source de vérité.

**Architecture:** l'amorçage (Python) migre le routeur `nexora-default` vers « routeur nommé d'après son modèle + alias `nexora-default` », n'applique `.env` qu'à changement d'empreinte et remet à WorkStudio une clé d'administration dédiée. WorkStudio gagne un client d'administration serveur (`lib/nexora/model-admin.ts`), un client Ollama (`lib/nexora/ollama.ts`), des routes `/api/nexora/models/*` réservées aux admins de l'organisation d'instance, et une section de réglages « Modèles ».

**Tech Stack:** Python 3 (amorçage, unittest), Next.js 16 / React 19 / React Query / next-intl / Vitest (WorkStudio), Docker compose, Nexora API (OpenGateLLM) `/v1/admin/*`, Ollama `/api/*`.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §6 et §8ter (prime), 8bis.4.

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `scripts/check-no-ee.sh`, `check-brand.sh`, `check-i18n.sh`, `check-licenses.sh` passent.
- Tout texte visible passe par next-intl, français par défaut (`messages/fr/*.json`), anglais identique de forme (`messages/en/*.json`, parité de clés).
- Conventions du dépôt WorkStudio : contrats `defineRouteContract` dans `lib/api/contracts/**`, `withRouteHandler`, `fetch` brut annoté `// boundary-raw-fetch:`, imports absolus, `getErrorMessage`, pas d'export inutilisé, mocks centraux ; `bun run check:audits` (60/60) et `check:test-types` passent.
- Aucun secret dans Git ; la clé d'administration ne quitte jamais le serveur (jamais dans une réponse, un log, ni le navigateur).
- Le mot de passe administrateur de Nexora API n'entre jamais dans le conteneur WorkStudio.
- Ne jamais arrêter un processus ou conteneur non lancé par ce travail ; surveiller le disque de pc6 (≥ 15 Go libres avant un téléchargement de modèle ou une construction), ne supprimer que ses propres caches et images.
- Tests unitaires lancés avec `LANG=en_US.UTF-8`.

## Review Focus

- Deux admins cliquent « Définir par défaut » en même temps, ou le second PATCH échoue : `nexora-default` ne doit jamais rester sans porteur (rendre l'alias à l'ancien routeur).
- Clé d'administration absente/révoquée ou Nexora API arrêtée : l'écran affiche un message français « indisponible », jamais une page d'erreur ni un 500 brut.
- Nom de modèle saisi librement avec caractères hostiles (`../`, espaces, `;`) : refusé par le contrat avant d'atteindre Ollama ou Nexora API.
- Retirer un modèle local encore utilisé par un autre routeur, ou `bge-m3` : le fichier Ollama n'est pas supprimé.
- Téléchargement interrompu (onglet fermé, réseau coupé) : le flux s'arrête proprement, la liste n'affiche pas un modèle à moitié créé dans Nexora API.

---

### Task 1: Amorçage — alias, empreinte seule, clé d'administration

**Files:**
- Modify: `deploy/bootstrap/bootstrap.py`
- Modify: `deploy/bootstrap/test_bootstrap.py` (le faux serveur gagne `PATCH /v1/admin/routers/{id}`, les champs `name`/`aliases` et `model_name` des fournisseurs)
- Modify: `deploy/compose.yml` (workstudio : `. /bootstrap/nexora-admin.env` en plus de `nexora-api.env`, fichier facultatif `[ -f … ] && .`)
- Modify: `scripts/tests/test-compose-env.sh`

**Interfaces:**
- Produces: fichier `/bootstrap/nexora-admin.env` contenant `export NEXORA_API_ADMIN_KEY=<clé>` (0600) ; routeur par défaut = celui dont `aliases` contient `nexora-default`.
- Produces (Python): `DEFAULT_ALIAS = "nexora-default"`, `_migrate_default_router(base_url, token) -> dict` (renvoie le routeur porteur), `ensure_admin_key(base_url, token, out: Path) -> str`.

- [x] **Step 1: Write the failing tests** dans `test_bootstrap.py` :
  - `test_router_named_default_gets_model_name_and_alias` : routeur `{name:"nexora-default", aliases:[]}` avec fournisseur `model_name="qwen2.5:7b"` → après `ensure_workstudio_key`, nom `qwen2.5:7b`, aliases `["nexora-default"]`.
  - `test_renamed_router_avoids_taken_name` : un routeur `qwen2.5:7b` existe déjà → nom `qwen2.5:7b (2)`.
  - `test_same_fingerprint_keeps_ui_choice` : empreinte enregistrée = celle du `.env`, mais le porteur de l'alias a un autre fournisseur → aucun fournisseur créé ni supprimé.
  - `test_changed_fingerprint_updates_alias_router` : `.env` change → le fournisseur du routeur porteur est remplacé par l'amont du `.env`.
  - `test_admin_key_written_then_reused` : premier passage écrit `nexora-admin.env` (0600, `export NEXORA_API_ADMIN_KEY=`), le second réutilise la même clé.
  - `test_revoked_admin_key_is_replaced` : clé du fichier inconnue de l'API → nouvelle clé écrite.
- [x] **Step 2: Run** `python3 -I deploy/bootstrap/test_bootstrap.py` — Expected: les 6 nouveaux tests FAIL, les 11 anciens passent.
- [x] **Step 3: Implement** dans `bootstrap.py` : `_migrate_default_router` (GET routers, si l'un est nommé `nexora-default` : nom = `model_name` de son premier fournisseur, suffixe ` (n)` si pris, PATCH avec tous les champs du routeur + alias) appelé avant `_sync_upstream_provider` ; `_sync_upstream_provider` cible le porteur de l'alias, et ne fait rien si `previous == fingerprint` (enregistre l'empreinte si `previous is None` et fournisseur conforme, comme aujourd'hui) ; `ensure_admin_key` (lit `nexora-admin.env`, garde la clé si `GET /v1/me` répond 200 avec permission `admin`, sinon `POST /v1/admin/keys {"name":"nexora-workstudio-admin","user":<id admin de /v1/me>}`), appelé depuis `_ensure_signed_in` avec `out.parent / "nexora-admin.env"`.
- [x] **Step 4: Run** `python3 -I deploy/bootstrap/test_bootstrap.py` — Expected: 17 tests OK.
- [x] **Step 5: compose** : la commande du service `workstudio` source aussi `/bootstrap/nexora-admin.env` s'il existe ; `test-compose-env.sh` vérifie la présence de `nexora-admin.env` dans la commande rendue et l'absence de `NEXORA_API_ADMIN_PASSWORD` dans l'environnement de `workstudio`. Run `bash scripts/tests/test-compose-env.sh` — Expected: PASS.
- [x] **Step 6: Commit** `feat(j2): amorçage — alias nexora-default, empreinte seule, clé d'administration`.

### Task 2: Les alias apparaissent dans la liste des modèles des blocs

**Files:**
- Modify: `workstudio/apps/sim/app/api/providers/vllm/models/route.ts`, `workstudio/apps/sim/providers/vllm/index.ts`
- Create: `workstudio/apps/sim/lib/nexora/model-ids.ts` (+ `model-ids.test.ts`)

**Interfaces:**
- Produces: `listedModelIds(data: Array<{ id: string; aliases?: string[] }>): string[]` — `vllm/<id>` puis `vllm/<alias>` pour chaque alias, sans doublon, ordre : alias `nexora-default` en premier.

- [x] **Step 1: Test** `model-ids.test.ts` : `[{id:'qwen2.5:7b',aliases:['nexora-default']},{id:'mistral-small-latest'}]` → `['vllm/nexora-default','vllm/qwen2.5:7b','vllm/mistral-small-latest']` ; un alias égal à un nom n'apparaît qu'une fois ; `aliases` absent accepté.
- [x] **Step 2: Run** `cd workstudio/apps/sim && LANG=en_US.UTF-8 bunx vitest run lib/nexora/model-ids.test.ts` — Expected: FAIL (module absent).
- [x] **Step 3: Implement** `listedModelIds` et l'utiliser aux deux endroits (`data.data.map(...)` remplacé).
- [x] **Step 4: Run** le test — Expected: PASS ; puis `bunx vitest run app/api/providers providers/vllm` — Expected: PASS.
- [x] **Step 5: Commit** `feat(j2): les alias Nexora API (nexora-default) restent proposés dans les blocs`.

### Task 3: Client d'administration des modèles (serveur)

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/model-admin.ts`, `workstudio/apps/sim/lib/nexora/model-admin.test.ts`
- Modify: `workstudio/apps/sim/lib/core/config/env.ts` (`NEXORA_API_ADMIN_KEY` serveur, facultatif)

**Interfaces:**
- Produces:
  - `type NexoraModelSource = 'ollama' | 'mistral' | 'openai-compatible'`
  - `interface NexoraModel { id: number; name: string; isDefault: boolean; source: NexoraModelSource; providerModel: string; providerUrl: string | null }`
  - `interface AddNexoraModelInput { source: NexoraModelSource; model: string; url?: string; key?: string; totalParams?: number }`
  - `listNexoraModels(): Promise<NexoraModel[]>` (routeurs `text-generation` seulement)
  - `addNexoraModel(input): Promise<NexoraModel>`, `setDefaultNexoraModel(id: number): Promise<void>`, `removeNexoraModel(id: number): Promise<{ removedLocalModel: string | null }>`, `testNexoraModel(name: string): Promise<{ latencyMs: number; reply: string }>`
  - `class NexoraModelAdminUnavailableError extends Error` ; `class NexoraModelError extends Error { code: 'unreachable' | 'duplicate' | 'is-default' | 'not-found' | 'invalid' }`
  - Constantes : `DEFAULT_MODEL_ALIAS = 'nexora-default'`, `OLLAMA_PROVIDER_URL = 'http://ollama:11434'`, `MISTRAL_PROVIDER_URL = 'https://api.mistral.ai'`.
- Consumes: `env.VLLM_BASE_URL` (base admin = sans `/v1`), `env.NEXORA_API_ADMIN_KEY`, `env.VLLM_API_KEY` (pour le test).

- [x] **Step 1: Write failing tests** contre un **faux Nexora API en mémoire** (stub de `fetch` qui tient routeurs/fournisseurs/rôles et applique les mêmes règles : alias uniques, PATCH complet, 400 `ProviderNotReachable` configurable) :
  - `adds a model as its own router, provider and unlimited workstudio limits` (état du faux : routeur nommé d'après le modèle, fournisseur `openai` à l'URL de la source, rôle `workstudio` avec 4 limites `null` pour ce routeur)
  - `maps an unreachable provider to NexoraModelError('unreachable') and leaves no empty router`
  - `refuses a duplicate name with NexoraModelError('duplicate')`
  - `moves the default alias to the chosen router`
  - `gives the alias back when adding it to the new router fails`
  - `refuses to remove the default model ('is-default')`
  - `reports removedLocalModel only for the last ollama router of that model, never bge-m3`
  - `throws NexoraModelAdminUnavailableError without an admin key or when the API answers 401/5xx`
  - `testNexoraModel returns the reply and a latency`
- [x] **Step 2: Run** `LANG=en_US.UTF-8 bunx vitest run lib/nexora/model-admin.test.ts` — Expected: FAIL (module absent).
- [x] **Step 3: Implement** `model-admin.ts` (fetch brut annoté `// boundary-raw-fetch: Nexora API is a separate service`, origine statique depuis l'env ; source déduite de l'URL du fournisseur ; création : POST router → POST provider (si échec : DELETE router, puis erreur) → PATCH rôle `workstudio` en ajoutant les limites `rpm/rpd/tpm/tpd: null` du nouveau routeur ; défaut : PATCH ancien sans alias, PATCH nouveau avec alias, rétablissement sur échec).
- [x] **Step 4: Run** le test — Expected: 9 PASS.
- [x] **Step 5: Commit** `feat(j2): client d'administration des modèles Nexora API`.

### Task 4: Ollama fourni — catalogue, présents, téléchargement

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/ollama.ts`, `workstudio/apps/sim/lib/nexora/ollama.test.ts`

**Interfaces:**
- Produces:
  - `OLLAMA_CATALOG: ReadonlyArray<{ name: string; label: string; diskGb: number; memoryGb: number; paramsB: number }>` avec exactement `qwen2.5:3b`, `qwen2.5:7b`, `qwen2.5:14b`, `mistral:7b`, `mistral-nemo:12b`, `llama3.1:8b`, `gemma2:9b`.
  - `OLLAMA_MODEL_NAME = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9._-]+)?(:[a-z0-9._-]+)?$/i`
  - `listLocalModels(): Promise<string[]>`
  - `pullLocalModel(name: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>` — événements `data: {"status","completed","total"}` puis, après le pull, `POST /api/create {model:name, from:name, parameters:{num_thread}}` (moitié des cœurs, `os.availableParallelism()`), puis `data: {"done":true}` ; erreur : `data: {"error": "...", "done": true}`.
  - `deleteLocalModel(name: string): Promise<void>` — refuse `bge-m3` et le modèle d'embeddings configuré.
  - `class OllamaUnavailableError extends Error`
- Consumes: `env.OLLAMA_URL`.

- [x] **Step 1: Failing tests** : nom hostile refusé avant tout appel ; flux relaie la progression puis `done` ; ligne d'erreur d'Ollama → événement `error` ; Ollama injoignable → `OllamaUnavailableError` ; `deleteLocalModel('bge-m3')` refusé ; threads = moitié des cœurs (≥ 1).
- [x] **Step 2: Run** `LANG=en_US.UTF-8 bunx vitest run lib/nexora/ollama.test.ts` — Expected: FAIL.
- [x] **Step 3: Implement** `ollama.ts`.
- [x] **Step 4: Run** — Expected: PASS.
- [x] **Step 5: Commit** `feat(j2): Ollama fourni — catalogue PME, téléchargement suivi, threads limités`.

### Task 5: Contrats et routes `/api/nexora/models/*`

**Files:**
- Create: `workstudio/apps/sim/lib/api/contracts/nexora-models.ts`
- Create: `workstudio/apps/sim/lib/nexora/admin-access.ts` (garde partagée, extraite de `app/api/nexora/usage/route.ts`)
- Create: `workstudio/apps/sim/app/api/nexora/models/route.ts` (GET liste + catalogue + modèles locaux, POST ajout), `…/models/[id]/route.ts` (DELETE), `…/models/[id]/default/route.ts` (POST), `…/models/[id]/test/route.ts` (POST), `…/models/ollama/pull/route.ts` (POST, flux)
- Modify: `workstudio/apps/sim/app/api/nexora/usage/route.ts` (utilise la garde)
- Test: `workstudio/apps/sim/app/api/nexora/models/route.test.ts`

**Interfaces:**
- Produces: `requireInstanceOrgAdmin(): Promise<{ userId: string } | NextResponse>` ; contrats `listNexoraModelsContract`, `addNexoraModelContract`, `removeNexoraModelContract`, `setDefaultNexoraModelContract`, `testNexoraModelContract`, `pullOllamaModelContract`. Corps d'ajout validé par zod : `source` enum, `model` = `OLLAMA_MODEL_NAME` pour `ollama` sinon 1–128 caractères sans espace, `url` `https?://` sans `/v1` final, `key` ≤ 512.
- Erreurs : `NexoraModelAdminUnavailableError`/`OllamaUnavailableError` → 503 `{ error: 'unavailable' }` ; `NexoraModelError` → 400 (`invalid`, `unreachable`), 404 (`not-found`), 409 (`duplicate`, `is-default`) avec `{ error: code }` (le texte français est choisi par l'interface).
- Consumes: Task 3 et Task 4.

- [x] **Step 1: Failing tests** : 401 sans session ; 403 pour un membre non admin ou d'une autre organisation ; un corps hostile (`model: '../x'`) → 400 sans appel au client ; chaque erreur du client → son statut ; la clé ne figure dans aucune réponse.
- [x] **Step 2: Run** `LANG=en_US.UTF-8 bunx vitest run app/api/nexora` — Expected: FAIL.
- [x] **Step 3: Implement** contrats, garde, routes (`withRouteHandler` brut, commentaire « raw route » comme `usage`).
- [x] **Step 4: Run** `LANG=en_US.UTF-8 bunx vitest run app/api/nexora lib/nexora` puis `bun run check:api-validation:strict` — Expected: PASS.
- [x] **Step 5: Commit** `feat(j2): routes d'administration des modèles (admins de l'organisation)`.

### Task 6: Réglages › Modèles

**Files:**
- Modify: `workstudio/apps/sim/components/settings/navigation.ts` (section `models`, groupe `organization`, après `usage`, icône existante de `@sim/emcn/icons`, `requiresHosted: true`, `requiresEnterprise: true`, `selfHostedOverride: 'always'`, `docsLink: docsUrl('/models')`)
- Modify: `workstudio/apps/sim/app/workspace/[workspaceId]/settings/[section]/settings.tsx`, `…/settings/section-warmers.ts`
- Create: `workstudio/apps/sim/app/workspace/[workspaceId]/settings/components/nexora-models/{nexora-models.tsx,add-model-modal.tsx,index.ts}`
- Create: `workstudio/apps/sim/hooks/queries/nexora-models.ts`
- Modify: `workstudio/apps/sim/messages/{fr,en}/settings.json` (`nav.unified.models`, `models.*`)
- Modify: `workstudio/apps/sim/lib/branding/docs-url.ts` (`['/models', 'modeles.md']`)

**Interfaces:**
- Consumes: contrats de Task 5 via `requestJson` ; flux de téléchargement lu en `fetch` brut annoté.
- Produces: hooks `useNexoraModels()`, `useAddNexoraModel()`, `useSetDefaultNexoraModel()`, `useRemoveNexoraModel()`, `useTestNexoraModel()` (clés `nexoraModelKeys`, invalidation de la liste et des modèles du fournisseur `vllm` après chaque mutation).

- [ ] **Step 1:** Écrire la page selon `add-settings-page` (`SettingsPanel`, action « Ajouter un modèle »), lignes `SettingsResourceRow` (nom, badge « Par défaut », source, menu Tester / Définir par défaut / Retirer), états vide/indisponible ; assistant `ChipModal` en 3 étapes (Source → Modèle : catalogue avec taille/mémoire ou saisie libre ; Mistral : modèle + clé ; compatible OpenAI : adresse + modèle + clé → Confirmation avec barre de progression du téléchargement pour Ollama).
- [ ] **Step 2: Run** `bash scripts/check-i18n.sh && bash scripts/check-brand.sh` (racine) et `cd workstudio && bun run type-check && bun run check:audits` — Expected: tout passe.
- [ ] **Step 3: Commit** `feat(j2): Réglages › Modèles (ajout, test, défaut, retrait)`.

### Task 7: Guide, fumée, mise à jour pc6 et critères « Terminé quand »

**Files:**
- Create: `docs/guide/modeles.md` ; Modify: `docs/guide/README.md`, `docs/guide/reglages.md`
- Modify: `scripts/smoke.py` (contrôle `models`)
- Modify: `docs/superpowers/plans/2026-10-23-nexora-v2-ledger.md`

- [ ] **Step 1:** Contrôle de fumée `models` (admin) : GET liste (un défaut exactement) ; POST ajout `openai-compatible` vers `NEXORA_SMOKE_OPENAI_URL` / `NEXORA_SMOKE_OPENAI_MODEL` (ignoré proprement si absents) ; test (réponse non vide) ; défaut aller-retour (alias revenu à l'ancien) ; DELETE. Run `python3 -m py_compile scripts/smoke.py` — Expected: OK.
- [ ] **Step 2:** Sur pc6 : vérifier le disque, reconstruire WorkStudio et l'amorçage, `nexora restart` ; constater la migration (routeur renommé + alias) ; lancer la fumée complète — Expected: tous les contrôles OK, rapport `docs/verification/smoke-j2-2026-10-23.json`.
- [ ] **Step 3:** Navigateur (pc6) : ajouter `qwen2.5:3b` depuis le catalogue (progression visible), Tester, l'utiliser dans un bloc Agent (exécution réussie), le définir par défaut puis revenir ; `nexora restart` ; constater que le choix tient. Preuves dans le ledger.
- [ ] **Step 4:** Suite complète WorkStudio, audits, scripts du dépôt (`check-no-ee`, `check-brand`, `check-licenses`, `check-i18n`, `scripts/tests/test-*.sh`, `test_bootstrap.py`) — Expected: tout passe.
- [ ] **Step 5:** Revue finale (sous-agent, modèle le plus capable), corrections Critical/Important en TDD, ledger, commit, `git push origin main`.
