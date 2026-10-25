# K13 — Traitements par lot — Plan d'implémentation

> **Pour les agents :** sous-compétence requise : `superpowers:executing-plans` (exécution native, TDD : test rouge d'abord, garde retirée ⇒ rouge). Les cases se cochent au fur et à mesure.

**Objectif :** une API de lots au format OpenAI (`/v1/files`, `/v1/batches`) servie par la passerelle développeur K3, et un écran « Traitements par lot » qui classe les lignes d'une table avec un modèle, un prompt (K9) ou un agent, le résultat allant dans une nouvelle colonne.

**Architecture :** le moteur vit dans WorkStudio (là où sont les clés, plafonds, budgets, traces, tables, prompts et agents) et **réutilise les mécanismes du moteur de campagnes K10** : limiteur de concurrence **commun** à l'instance (extrait de `evaluations/live.ts` dans `lib/nexora/background-load.ts`), attente bornée derrière une exécution interactive, bail + reprise par le cron `run-nexora-evaluations` (aucune nouvelle ligne de crontab), vérification du budget avant chaque élément, cibles `runTarget` de K10 (modèle, version de prompt, agent) pour les lots de table. Un lot = une ligne `nexora_batch` + des éléments `nexora_batch_item` (migration **0449**) ; deux exécuteurs (clé d'API : réservation sur la clé + relais Nexora API + trace K8 ; table : `runTarget` + écriture de la cellule). Les fichiers sont stockés en base (`nexora_batch_file`) ; les fichiers de sortie et d'erreurs sont **virtuels** (relus des éléments au téléchargement).

**Stack :** Next.js 16 (routes `/api/nexora/v1/*`), Drizzle/PostgreSQL, vitest, `lib/nexora/batches/`, client `openai` (venv `.nexora-work/oa-venv`), `scripts/smoke.py`.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` ; `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K13 et matrice §1.12 ; `docs/recherche/mistral-studio/17-batch-inference-tarifs.md` ; ledger `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` (K3, K8, K10).

## Contraintes globales

- Jamais de code `ee/` d'origine de Sim ; tout texte visible passe par next-intl (`messages/{fr,en}/batches.json`) ; marque « Nexora » ; ajouts dans `lib/nexora/` et pages Nexora ; `check-i18n/brand/no-ee/licenses` verts.
- Migration **0449**, `when` supérieur à celui de la dernière entrée du journal de `main` (1792900664423) ; tables neuves seulement ; `check:migrations` sans bloquant.
- Format OpenAI : erreurs `{error:{message,type,code,param}}` en français (`GatewayError`), objets `file` et `batch` conformes au client `openai` officiel.
- Un lot = un modèle ; **priorité basse** : concurrence bornée (2 par lot par défaut, 4 appels de lots et de campagnes à la fois pour toute l'instance), attente de 30 s au plus derrière une exécution interactive ; reprise après redémarrage (bail 90 s, cron chaque minute) ; expiration réglable (`completion_window` de `1h` à `168h` ou `1d` à `7d`, **24 h par défaut**) ; lignes plafonnées (**10 000** par lot, **50 000** en attente par espace ou par instance) ; fichier de 25 Mo au plus.
- Appels tracés (K8) et comptés (consommation de la clé, plafond mensuel, budgets 402).
- Jamais de `cd` ; biome seulement sur la liste de fichiers ; fichiers temporaires dans `.nexora-work/`.

## Points à surveiller (Review Focus)

1. Un redémarrage au milieu d'un lot ne doit ni perdre ni refaire un élément terminé (un résultat par `custom_id`).
2. Deux lignes de même `custom_id`, un `model` qui change d'une ligne à l'autre, `stream: true`, une ligne qui n'est pas du JSON : rejetés **avec le numéro de ligne**, en français, sans créer d'éléments.
3. Un fichier ou un lot d'un autre espace (ou d'une clé d'instance) répond 404, jamais son contenu.
4. Clé révoquée, plafond mensuel ou budget atteint **en cours de lot** : les lignes restantes sortent en erreur lisible, aucun appel de modèle n'est fait.
5. Annulation pendant l'exécution : appels interrompus, lignes restantes en erreur `batch_cancelled`, fichier de sortie des lignes déjà faites.
6. Table dont une ligne est supprimée pendant le lot, colonne de résultat déjà existante, gabarit qui ne donne rien pour une ligne.

---

## Carte des fichiers

Créés (tous sous `workstudio/apps/sim/` sauf mention) :
- `lib/nexora/background-load.ts` — limiteur d'instance, `interactiveBusy`, marqueur d'activité interactive.
- `lib/nexora/batches/types.ts` — constantes, types.
- `lib/nexora/batches/jsonl.ts` — lecture/validation du JSONL, lignes de sortie, fenêtre d'expiration.
- `lib/nexora/batches/repository.ts` — fichiers, lots, éléments (Drizzle).
- `lib/nexora/batches/engine.ts` — `runBatch`.
- `lib/nexora/batches/api-executor.ts` — exécuteur des lots d'API.
- `lib/nexora/batches/table-executor.ts` — gabarit, création des éléments d'une table, exécuteur de table.
- `lib/nexora/batches/live.ts` — câblage réel, `startBatch`, `abortBatch`, `tickBatches`.
- `lib/nexora/batches/openai.ts` — cas d'usage OpenAI (fichiers, lots) et présentateurs.
- `lib/nexora/batches/csv.ts` — export CSV des résultats.
- `lib/nexora/batches/application/{operations,use-cases}.ts` — opérations d'espace (écran).
- `lib/api/contracts/nexora-batches.ts` (écran) et `nexora-openai-batches.ts` (lots OpenAI) — contrats.
- `lib/nexora/batches/present.ts` — présentateurs de l'écran.
- `app/api/nexora/v1/{files,batches}/…/route.ts` — surface OpenAI.
- `app/api/nexora/batches/…/route.ts` — surface de l'écran.
- `hooks/queries/nexora-batches.ts`, `app/workspace/[workspaceId]/batches/…`, `messages/{fr,en}/batches.json`.
- `packages/db/migrations/0449_nexora_batches.sql` (+ journal), `schema.ts`.
- `docs/guide/lots.md`, `docs/verification/k13-lots/`, contrôle « Lots » dans `scripts/smoke.py`.

Modifiés : `evaluations/live.ts` (importe le limiteur commun), `evaluations/targets.ts` (plafond de jetons facultatif), `developer-api/repository.ts` (`findNexoraApiKeyById`), `developer-api/errors.ts` (404 listant les nouveaux points), `developer-api/openapi.ts`, `app/api/cron/run-nexora-evaluations/route.ts` (+ contrat), barre latérale, `docs/guide/{README,api-developpeurs}.md`.

---

### Tâche 1 : Préparation

- [x] `bun install` dans `workstudio/` ; vérifier que le test existant `lib/nexora/evaluations/runner.test.ts` passe (base verte).
- [x] Créer le venv `.nexora-work/oa-venv` avec `openai` (comme K3) et un Postgres jetable `k13-pg-test` (image de la pile, port libre) ; vérifier 30 Go libres.
- [x] Lire `.claude/rules/sim-api-contracts.md`, `sim-queries.md`, `sim-components.md`, `sim-ui-copy.md`, `sim-testing.md` et les skills `migrate-application-operation`, `db-migrate`.

### Tâche 2 : Charge d'arrière-plan commune (extraction K10)

**Files :** Create `lib/nexora/background-load.ts` (+ `.test.ts`) ; Modify `lib/nexora/evaluations/live.ts`.

**Interfaces — Produces :** `instanceLimiter: Limiter` (4 appels), `interactiveBusy(): Promise<boolean>` (exécution `chat`/`manual` en cours depuis moins de 10 min **ou** activité interactive notée il y a moins de 15 s), `noteInteractiveActivity(now?: number): void`.

- [x] Test rouge : `noteInteractiveActivity` ⇒ `interactiveBusy()` vrai pendant 15 s puis faux (horloge injectée) ; le limiteur est partagé (le même objet pour les deux importeurs).
- [x] Déplacer `limiter`, `INSTANCE_CALL_LIMIT`, `interactiveBusy` de `evaluations/live.ts` vers le nouveau module ; `live.ts` les importe ; `runner.test.ts` reste vert.
- [x] Appeler `noteInteractiveActivity()` au début de `relayChatCompletion` (appel par clé) et des routes Playground/Copilote qui appellent `nexoraWandStream` (hors campagnes et lots).

### Tâche 3 : Schéma et migration 0449

**Files :** Modify `packages/db/schema.ts` ; Create `packages/db/migrations/0449_nexora_batches.sql`, entrée de journal ; Test `lib/nexora/batches/repository.integration.ts` (T5).

Tables (toutes neuves, `onDelete: cascade` depuis `workspace`) :
- `nexora_batch_file` : `id` (`file-…`), `workspace_id` nullable (clé d'instance), `api_key_id` set null, `purpose` (`batch` | `batch_output`), `filename`, `bytes`, `line_count`, `content` text nullable (entrée) , `batch_id` nullable, `output_kind` (`output` | `error`), `created_at`, `deleted_at`.
- `nexora_batch` : `id` (`batch_…`), `workspace_id` nullable, `api_key_id`, `created_by`, `source` (`api` | `table`), `endpoint`, `model`, `status` (`in_progress`, `cancelling`, `completed`, `failed`, `expired`, `cancelled`), `input_file_id`, `output_file_id`, `error_file_id`, `metadata` jsonb, `config` jsonb (lots de table : cible, gabarit, colonne), `table_id`, `name`, `concurrency`, `total`/`completed`/`failed` entiers, `prompt_tokens`, `completion_tokens`, `errors` jsonb, `lease_owner`, `lease_until`, `expires_at`, `created_at`, `started_at`, `finished_at`, `cancel_requested_at`.
- `nexora_batch_item` : `id`, `batch_id` cascade, `position`, `custom_id`, `request` jsonb, `row_ref` text nullable, `status` (`pending`, `running`, `done`, `error`), `attempt`, `response` jsonb, `answer` text, `error` jsonb, `prompt_tokens`, `completion_tokens`, `latency_ms`, `started_at`, `finished_at` ; index unique `(batch_id, custom_id)`, index file d'attente `(batch_id, status, position)`.

- [x] Écrire `schema.ts` puis générer la migration avec `drizzle-kit generate` (renommer en `0449_nexora_batches`) ; vérifier le `when` > 1792900664423 et `idx` 449 ; `check:migrations main` sans bloquant ; appliquer sur le Postgres jetable.

### Tâche 4 : JSONL, validation, formats (pur)

**Files :** Create `lib/nexora/batches/types.ts`, `jsonl.ts`, `jsonl.test.ts`.

**Interfaces — Produces :**
- `parseBatchInput(text: string, endpoint: BatchEndpoint): ParsedBatch` avec `ParsedBatch = { ok: true; lines: BatchLine[]; model: string } | { ok: false; errors: BatchLineError[] }`, `BatchLine = { customId: string; body: Record<string, unknown>; position: number }`, `BatchLineError = { code: string; message: string; line: number | null }`.
- `parseCompletionWindow(value: unknown): { ok: true; hours: number } | { ok: false; message: string }`.
- `outputLine(item): string`, `errorLine(item): string` (formes OpenAI).

- [x] Tests rouges : fichier vide ⇒ `empty_file` ; ligne 3 non JSON ⇒ `invalid_json_line` ligne 3 ; `custom_id` en double ⇒ `duplicate_custom_id` avec les deux numéros ; `method` ≠ POST ou `url` ≠ endpoint ⇒ `invalid_url` ; modèles différents ⇒ `model_mismatch` ; `stream: true` ⇒ `invalid_request` ; plus de 10 000 lignes ⇒ `too_many_tasks` ; modèle absent ⇒ `model_required` ; erreurs plafonnées à 20 ; fenêtre `24h`, `1h`, `168h`, `7d` valides, `0h`, `200h`, `8d`, `abc` refusées.
- [x] Implémenter ; sans aucune dépendance de base.

### Tâche 5 : Dépôt (Drizzle)

**Files :** Create `lib/nexora/batches/repository.ts`, `repository.integration.ts`.

**Interfaces — Produces** (toutes les lectures filtrent par `scope: { workspaceId: string | null }`) : `insertFile`, `getFile`, `listFiles`, `softDeleteFile`, `insertBatchWithItems`, `getBatch`, `listBatches`, `acquireBatch(id, owner, now, leaseUntil)` (remet les éléments `running` en `pending`), `heartbeat`, `claimNextItem(batchId, now)` (`FOR UPDATE SKIP LOCKED`, abandonne après 3 tentatives), `completeItem`, `failItem`, `releaseItem`, `finishBatch(id, owner, status, now)` (transition atomique, marque les éléments ouverts en erreur `batch_cancelled`/`batch_expired`), `requestCancel`, `countOpenItems`, `listAdoptableBatchIds(now)` (bail expiré, ou `cancelling`, ou échéance dépassée), `pendingLinesInScope`, `streamItems(batchId, kind, afterPosition, limit)`, `purgeFinishedBefore(date)`.

- [x] Tests d'intégration rouges (Postgres jetable) : réclamation concurrente (20 réclamations ⇒ pas de doublon) ; reprise ⇒ `running` redevient `pending` ; `finishBatch` par un propriétaire périmé ⇒ refus ; isolement par espace (un autre espace ⇒ `null`) ; clé d'instance (`workspace_id` null) isolée des espaces ; `pendingLinesInScope` ; page de sortie ordonnée ; purge à 90 jours.
- [x] Implémenter.

### Tâche 6 : Moteur

**Files :** Create `lib/nexora/batches/engine.ts`, `engine.test.ts`.

**Interfaces — Produces :** `runBatch(batchId: string, deps: EngineDeps): Promise<'completed' | 'cancelled' | 'expired' | 'interrupted' | 'failed' | 'skipped'>` ; `EngineDeps = { store, owner, leaseMs, now, sleep, every, limiter, interactiveBusy, executeItem(batch, item, signal): Promise<ItemOutcome>, externalSignal? }` ; `ItemOutcome = { kind: 'done'; ... } | { kind: 'error'; retryable: boolean; ... } | { kind: 'aborted' }`.
- Consomme `createLimiter`, `INTERACTIVE_WAIT_MAX_MS` de `evaluations/runner.ts`.

- [x] Tests rouges (magasin en mémoire, horloge simulée) : plafond de concurrence du lot ; plafond du limiteur commun ; chaque lot attend au plus 30 s derrière une activité interactive, et **pas du tout après** le dernier élément ; reprise : 3 interruptions successives ⇒ résultat unique par `custom_id` ; annulation ⇒ appels interrompus (`signal`), éléments restants `batch_cancelled` ; échéance ⇒ `expired` ; erreur réessayable ⇒ 3 tentatives puis erreur ; erreur définitive ⇒ pas de nouvelle tentative ; bail perdu ⇒ `interrupted` sans toucher à l'état.
- [x] Implémenter en réutilisant `createLimiter`/`INTERACTIVE_WAIT_MAX_MS` ; retirer chaque garde ⇒ le test correspondant rougit.

### Tâche 7 : Exécuteur des lots d'API

**Files :** Create `lib/nexora/batches/api-executor.ts`, `.test.ts` ; Modify `developer-api/repository.ts` (`findNexoraApiKeyById`).

**Interfaces — Produces :** `executeApiItem(batch, item, signal, deps): Promise<ItemOutcome>` — recharge la clé (révoquée/expirée ⇒ erreur définitive `revoked_api_key`/`expired_api_key`), `admitModel`, `reserveSpending` (plafond ⇒ `monthly_cap_reached`, budget ⇒ `monthly_budget_reached`, erreurs définitives), appel `callUpstream` sur le chemin du point d'accès, règlement de la réservation (jetons réels), trace K8 `source: 'api_key'` nommée `Lot · <clé>`, usage cumulé.

- [x] Tests rouges : succès ⇒ `done` avec corps et jetons réglés ; 503/réseau ⇒ réessayable ; 400 ⇒ définitif avec le corps d'erreur du modèle ; clé révoquée ⇒ aucun appel amont ; plafond atteint ⇒ aucun appel amont ; réservation libérée si l'appel n'aboutit pas ; abandon (`signal`) ⇒ `aborted` et réservation libérée.
- [x] Implémenter.

### Tâche 8 : Lots de table (gabarit, colonne, exécuteur)

**Files :** Create `lib/nexora/batches/table-executor.ts`, `.test.ts` ; Modify `evaluations/targets.ts` (champ facultatif `maxTokens` dans `TargetContext` et `complete`).

**Interfaces — Produces :** `renderTemplate(template: string, row: Record<string, unknown>): string` (`{{Nom de colonne}}`, insensible à la casse, valeurs absentes ⇒ vide) ; `createTableBatch(input, deps): Promise<BatchRecord>` (table de l'espace, colonne de résultat créée par `addTableColumn` type `string`, nom assaini, existante ⇒ erreur 400 français, éléments de toutes les lignes dont le gabarit rend un texte non vide, plafond 10 000, lignes ignorées comptées) ; `executeTableItem(batch, item, signal, deps)` (budget vérifié avant, `runTarget` K10, écriture de la cellule par `updateRow`, ligne supprimée ⇒ élément terminé avec la mention « ligne supprimée »).

- [x] Tests rouges : gabarit ; table d'un autre espace ⇒ introuvable ; colonne existante ⇒ refus ; 12 000 lignes ⇒ refus ; ligne vide ignorée ; exécution écrit la cellule par identifiant de colonne ; budget atteint ⇒ élément libéré et lot interrompu (comme K10) ; ligne supprimée en cours de route.
- [x] Implémenter.

### Tâche 9 : Câblage réel et reprise

**Files :** Create `lib/nexora/batches/live.ts` ; Modify `app/api/cron/run-nexora-evaluations/route.ts`, `lib/api/contracts/nexora-evaluations.ts` (champ `batches` de la réponse du cron), son test.

**Interfaces — Produces :** `startBatch(batchId): void` (une fois par processus), `abortBatch(batchId): void`, `tickBatches(now: Date): Promise<{ resumed: string[]; purged: number }>`.

- [x] Test rouge du cron : la réponse contient `batches.resumed` ; adoption d'un lot dont le bail est expiré.
- [x] Implémenter ; `tickEvaluations` ne change pas, la route appelle les deux.

### Tâche 10 : Surface OpenAI (`/v1/files`, `/v1/batches`)

**Files :** Create `lib/nexora/batches/openai.ts`, `.test.ts`, routes `app/api/nexora/v1/files/route.ts`, `files/[fileId]/route.ts`, `files/[fileId]/content/route.ts`, `batches/route.ts`, `batches/[batchId]/route.ts`, `batches/[batchId]/cancel/route.ts` ; Modify `lib/api/contracts/nexora-batches.ts`, `developer-api/errors.ts`, `openapi.ts` (+ test).

**Interfaces — Produces :** `createFile(call, {filename, bytes, text, purpose})`, `createBatchFromFile(call, body)` (404 fichier inconnu ; 400 endpoint ≠ `/v1/chat/completions`/`/v1/embeddings`, fenêtre, métadonnées ; entrée invalide ⇒ lot `failed` avec `errors.data[]` et numéros de ligne ; 403 modèle via `admitModel` ; 429 au-delà de 50 000 lignes en attente), `cancelBatch`, `readBatchContent(file)` (flux de lignes), présentateurs `fileObject`, `batchObject`.

- [x] Tests rouges : un fichier d'un autre espace ⇒ 404 ; purpose ≠ `batch` ⇒ 400 ; fichier > 25 Mo ⇒ 413 ; modèle non autorisé ⇒ 403 ; liste paginée (`limit`, `after`, `has_more`) ; `batch.request_counts` ; contenu d'un fichier de sortie = une ligne JSON par élément terminé ; annulation d'un lot terminé ⇒ 409.
- [x] Routes : `authenticateGatewayCall`, `answerGateway`, limites de corps (`/v1/files` multipart borné à 25 Mo, lecture par flux), `dynamic = 'force-dynamic'`, contrats `defineRouteContract` pour les corps JSON ; `check:api-validation:strict` vert.

### Tâche 11 : Opérations et routes de l'écran

**Files :** Create `lib/nexora/batches/application/{operations,use-cases}.ts`, `csv.ts`, `.test.ts`, routes `app/api/nexora/batches/route.ts`, `[batchId]/route.ts`, `[batchId]/cancel/route.ts`, `[batchId]/export/route.ts`, `sources/route.ts`.

Opérations d'espace (session seulement, comme K10) : `list` et `read` (lecture), `sources` (écriture : tables et cibles), `create`, `cancel`, `delete` (écriture), `export` (lecture). Audit (`AuditResourceType`) à la création, l'annulation et la suppression.

- [x] Tests rouges : lecteur ne crée pas de lot (403) ; un lot d'un autre espace ⇒ introuvable ; export CSV en `;` avec BOM, guillemets doublés, protection contre l'injection de formule (`=`, `+`, `-`, `@` en tête).
- [x] Implémenter.

### Tâche 12 : Écran « Traitements par lot »

**Files :** Create `hooks/queries/nexora-batches.ts`, `app/workspace/[workspaceId]/batches/{page,loading,batches,search-params}.tsx|ts`, `components/{batch-modal,batch-list,batch-detail}.tsx`, `messages/{fr,en}/batches.json` ; Modify la barre latérale (entrée « Traitements par lot » après « Évaluations »).

- [x] Liste (statut, progression, durée, modèle, source API/table), fenêtre de création (table de l'espace ou **import d'un CSV** par le hook d'import existant, choix modèle / prompt K9 / agent, gabarit `{{colonne}}`, nom de la colonne de résultat, plafond de jetons, concurrence 1–4, durée d'expiration), détail avec progression rafraîchie, annulation, export CSV, lien vers la table, lots d'API visibles en lecture/annulation.
- [x] Respecter `sim-components.md`, `sim-queries.md` (clés, `staleTime` nommés, `signal`), `sim-ui-copy.md`, `sim-url-state.md` ; textes en français ; `check-i18n` vert.
- [x] Parcours au navigateur intégré (captures dans `docs/verification/k13-lots/`).

### Tâche 13 : Guide, index, fumée

**Files :** Create `docs/guide/lots.md` ; Modify `docs/guide/README.md`, `docs/guide/api-developpeurs.md`, `scripts/smoke.py`.

- [x] Guide (API : Python `client.files.create` + `client.batches.create`, cURL, formats, statuts, erreurs, limites, expiration, reprise ; écran ; consommation) ; tableau d'index et liens croisés.
- [x] Contrôle « Lots : fichier JSONL, lot par le client openai, sortie, annulation, lot de table » dans `smoke.py` (venv `.nexora-work/oa-venv`) ; relancer la fumée existante pour vérifier qu'elle reste verte.

### Tâche 14 : Preuves sur pc6

**Files :** `docs/verification/k13-lots/` (jeu de 500 lignes, scripts de mesure, rapports).

- [x] Jeu de 500 avis fictifs en 4 classes (`generer.py`, graine fixe, attendu connu).
- [x] 500 lignes classées par `qwen2.5:7b` (`max_tokens` bas) : durée, exactitude, par l'écran (lot de table) **et** par `client.batches.create`.
- [x] Latence p95 d'une requête interactive GLM 5.3 (30 requêtes séquentielles) sans lot puis pendant le lot : écart ≤ 30 % ; mesure consignée.
- [x] Redémarrage (`kill -9` du serveur de développement) au milieu du lot ⇒ reprise, 500 résultats, aucun doublon.
- [x] Nettoyage : serveur de dev arrêté, `.next/dev` supprimé, Postgres jetable supprimé.

### Tâche 15 : Fin de jalon

- [x] `git merge main` ; vérifications (biome sur les fichiers ; `type-check` ; `check:audits`, `check:test-types`, `check:api-validation:strict`, `check:migrations` ; suite complète ; `check-i18n/brand/no-ee/licenses`).
- [x] Ledger : section K13 (décisions « Ruling : … — pourquoi — coût si faux », preuves, à faire après déploiement) ; plan coché ; commit en français.
