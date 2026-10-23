# Nexora v2 — J1 « Tout marche » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sur une installation neuve, chaque écran et chaque bloc visibles de WorkStudio fonctionnent sans clé tierce, en français.

**Architecture:** on branche ce que Sim sait déjà faire sur les services souverains de Nexora (Ollama permanent pour les embeddings, cron d'origine, SMTP), on fait passer les appels internes de modèle par Nexora API, on masque ou explique ce qui ne peut pas tourner, et on ajoute une couche de traduction des métadonnées de blocs.

**Tech Stack:** Next.js 16 / React 19 / TypeScript (workstudio/apps/sim), next-intl, Vitest ; Docker Compose ; bash (install.sh, tests shell) ; Python stdlib (smoke.py).

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` (sections 5 et 8bis).

## Global Constraints

- Jamais de code `apps/sim/ee/` d'origine de Sim ; tout nouveau fichier `ee/` commence par `// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.`
- Texte d'interface via next-intl, français par défaut, messages dans `apps/sim/messages/{fr,en}/<zone>.json` ; tout nouveau dossier d'UI ajouté à `scripts/data/i18n-covered-dirs.txt`.
- Conventions du dépôt : `workstudio/CLAUDE.md` et `.claude/rules/*` (contrats d'API, imports absolus, emcn, audits). Après chaque tâche WorkStudio : `bun run check:audits` et `bun run check:test-types` à 0.
- Tests unitaires en `LANG=en_US.UTF-8` (`cd workstudio/apps/sim && npx vitest run <chemin>`).
- Aucun secret dans Git ; `deploy/.env` jamais versionné.
- Souveraineté : aucune donnée ne sort sans action explicite de l'admin (recherche web désactivée par défaut).
- Commandes Docker via `sg docker -c "…"` sur pc6 ; ne jamais arrêter un conteneur ou un processus non lancé par ce travail.
- Après chaque tâche : commit local, puis `git push origin main` (dépôt public `leon36000/Nexora-Studio-`, alias SSH `github-nexora`).
- Décision d'exécution (précise la spec §5.2) : en J1, les bases de connaissances utilisent l'Ollama de Nexora **directement** (`KB_EMBEDDING_MODEL=ollama/bge-m3`, chemin déjà prévu par Sim) ; les routeurs d'embeddings dans Nexora API (spec 8bis.2) arrivent en J2.

## Review Focus

- Installation existante mise à jour (`nexora update`, `.env` sans les nouvelles clés) : les services ajoutés (ollama permanent, cron) démarrent avec des valeurs par défaut, rien ne casse ; test dans `test-install.sh` (mise à jour d'un `.env` v1).
- Base de connaissances créée avant J1 (embeddings `text-embedding-3-small`, 1536) : elle reste lisible et l'interface explique en français qu'elle doit être recréée, sans erreur anglaise ; test dans la tâche 1.
- Ollama encore en train de télécharger `bge-m3` quand l'utilisateur dépose un document : message français « modèle en cours de préparation », pas d'échec silencieux ; test dans la tâche 1.
- Nexora API injoignable pendant « Générer avec l'IA » : message français et pas de 500 brut ; test dans la tâche 4.
- Workflow existant dont un bloc Router porte `claude-sonnet-5-5` : il n'est pas réécrit silencieusement mais signale le modèle indisponible et propose le modèle Nexora ; test dans la tâche 3.

---

### Task 1: Ollama permanent et bases de connaissances sur `bge-m3`

**Files:**
- Modify: `deploy/compose.yml` (service `ollama` sans `profiles`, `workstudio` reçoit `OLLAMA_URL`, `KB_EMBEDDING_MODEL`, `EMBEDDING_OUTPUT_DIMS`)
- Modify: `deploy/.env.example` (`COMPOSE_PROFILES` ne porte plus `ollama` ; nouvelle clé `NEXORA_EMBED_MODEL=bge-m3`)
- Modify: `install.sh` (`start()` : Ollama toujours démarré d'abord ; `bge-m3` téléchargé et limité en threads comme le modèle local ; choix « local » ne pose plus `COMPOSE_PROFILES=ollama`)
- Modify: `scripts/tests/test-install.sh`, `scripts/smoke.py`
- Modify: `workstudio/apps/sim/lib/embeddings/configuration-error.ts` (+ messages) si le message est en anglais
- Test: `workstudio/apps/sim/lib/knowledge/embeddings.test.ts` (ou le fichier de test existant le plus proche)

**Interfaces:**
- Produces: variables d'environnement `OLLAMA_URL=http://ollama:11434`, `KB_EMBEDDING_MODEL=ollama/${NEXORA_EMBED_MODEL:-bge-m3}`, `EMBEDDING_OUTPUT_DIMS=1024` dans le service `workstudio` ; fonction shell `pull_ollama_model <model>` dans `install.sh` (télécharge + limite les threads) réutilisée par le modèle de discussion local.

- [x] **Step 1: Tests shell** — dans `test-install.sh` : pour un choix `mistral`, le journal du faux docker contient `ollama pull bge-m3` et `up -d --wait ollama` ; `COMPOSE_PROFILES` n'est plus `ollama` ; un `.env` v1 contenant `COMPOSE_PROFILES=ollama` reste valide (`nexora update` ne casse pas).
- [x] **Step 2: Lancer** `bash scripts/tests/test-install.sh` → échecs attendus sur ces nouveaux cas.
- [x] **Step 3: Implémenter** compose (`ollama` permanent, healthcheck conservé), `.env.example`, `install.sh` (`pull_ollama_model`, appelé pour `NEXORA_EMBED_MODEL` toujours, et pour le modèle de discussion si choix local).
- [x] **Step 4: Test unitaire** — `resolveConfiguredEmbeddingModel()` avec `KB_EMBEDDING_MODEL=ollama/bge-m3` renvoie `ollama/bge-m3` et `EMBEDDING_OUTPUT_DIMS=1024` donne la cible `{ model: 'ollama/bge-m3', dimensions: 1024 }` ; l'erreur de configuration et l'erreur « modèle en cours de téléchargement » (HTTP 404 `model not found` d'Ollama) produisent un message français via next-intl (`knowledge.errors.embeddingUnavailable`, `knowledge.errors.embeddingModelLoading`).
- [x] **Step 5: Implémenter** la traduction des erreurs d'embedding et la détection du 404 Ollama ; vérifier que la recherche d'une base fonctionne **sans reranker** configuré (reranking ignoré proprement, pas d'erreur ni d'appel à un service tiers) et ajouter le test correspondant.
- [x] **Step 6: smoke.py** — nouveau contrôle « Base de connaissances » : créer une base dans l'espace de fumée, y déposer un texte court (« Nexora livre le samedi de 8 h à 18 h. »), attendre l'indexation (≤ 120 s), rechercher « samedi » et exiger au moins un passage.
- [x] **Step 7: Vérifier** `bash scripts/tests/test-install.sh` (tout passe), vitest du test unitaire, `check:audits`.
- [x] **Step 8: Commit** `feat(j1): Ollama permanent, bases de connaissances sur bge-m3 local`.

### Task 2: Planificateur (cron)

**Files:**
- Modify: `deploy/compose.yml` (service `cron` : build `../workstudio` + `docker/cron.Dockerfile`, image `${NEXORA_IMAGE_PREFIX:-nexora/}cron:${NEXORA_VERSION:-local}`, `SIM_URL=http://workstudio:3000`, `CRON_SECRET`, `TZ=${NEXORA_TIME_ZONE:-Europe/Paris}`, `restart: on-failure`, dépend de `workstudio` sain)
- Modify: `.github/workflows/images.yml` (6ᵉ image `cron`), `install.sh` (`fetch_sources` inchangé ; rien d'autre), `workstudio/.dockerignore` si nécessaire
- Modify: `scripts/smoke.py`

**Interfaces:**
- Consumes: `CRON_SECRET` déjà présent dans `deploy/.env` (généré par `init-env.sh`) et lu par le service `workstudio` — vérifier qu'il l'est ; sinon l'ajouter aux deux services.

- [x] **Step 1: smoke.py** — contrôle « Planification » : créer un workflow minimal (déclencheur planifié chaque minute + bloc Réponse) via l'API de création utilisée par les modèles PME, le déployer, attendre ≤ 150 s une exécution dans les journaux du workflow.
- [x] **Step 2: Lancer** ce contrôle sur la pile pc6 actuelle → échec attendu (aucune exécution).
- [x] **Step 3: Implémenter** le service compose et l'image ; construire `cron` sur pc6 ; `compose up -d`.
- [x] **Step 4: Vérifier** le contrôle « Planification » → OK ; `docker logs nexora-cron-1` montre des appels 200.
- [x] **Step 5: Commit** `feat(j1): service de planification (cron)`.

### Task 3: Modèle Nexora par défaut dans tous les blocs à modèle

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/models.ts`
- Modify: `workstudio/apps/sim/stores/workflows/prepare-block-state.ts:111` (généraliser l'injection du modèle par défaut)
- Modify: `workstudio/apps/sim/lib/guardrails/*` (modèle du contrôle d'hallucination quand aucun n'est fourni)
- Modify: le composant qui affiche un modèle introuvable dans un bloc (combobox `model`) pour proposer le modèle Nexora
- Test: `workstudio/apps/sim/lib/nexora/models.test.ts`, test existant de `prepare-block-state`

**Interfaces:**
- Produces: `NEXORA_DEFAULT_MODEL_ALIAS = 'nexora-default'` ; `resolveNexoraModel(usage: 'chat' | 'embedding'): string` (chat → `vllm/nexora-default` sous `NEXORA_ONLY_MODELS`, sinon le défaut d'origine ; embedding → valeur de `KB_EMBEDDING_MODEL`) ; `MODEL_SUBBLOCK_BLOCK_TYPES: readonly string[]` = types de blocs dont le sous-bloc `model` reçoit le défaut Nexora (`agent`, `router`, `router_v2`, `evaluator`, `guardrails`, et tout bloc dont `model` vaut un modèle masqué par défaut — à lister en lisant `blocks/blocks/*.ts`).

- [ ] **Step 1: Tests** — `resolveNexoraModel('chat')` vaut `vllm/nexora-default` quand `isNexoraOnlyModels` ; un nouveau bloc Router / Evaluator préparé par `prepare-block-state` a `model = vllm/nexora-default` (et plus `claude-sonnet-5-5`) ; un bloc existant dont le modèle est masqué conserve sa valeur et l'interface affiche « Modèle indisponible sur cette instance » avec une action « Utiliser le modèle Nexora ».
- [ ] **Step 2: Lancer** → échecs.
- [ ] **Step 3: Implémenter** `lib/nexora/models.ts`, la généralisation dans `prepare-block-state`, le défaut serveur du contrôle d'hallucination (`resolveNexoraModel('chat')` quand le paramètre est vide), l'affichage du modèle indisponible (messages `editor.model.unavailable`, `editor.model.useNexora`).
- [ ] **Step 4: Lancer** les tests → PASS ; `check:audits`.
- [ ] **Step 5: smoke.py** — le contrôle d'exécution des modèles PME couvre déjà l'Agent ; ajouter « Routeur » : un workflow Démarrage → Router (2 routes) préparé avec les défauts de bloc s'exécute sans erreur.
- [ ] **Step 6: Commit** `feat(j1): modèle Nexora par défaut dans Router, Evaluator, Guardrails`.

### Task 4: « Générer avec l'IA » via Nexora API

**Files:**
- Create: `workstudio/apps/sim/lib/nexora/wand.ts`
- Modify: `workstudio/apps/sim/app/api/wand/route.ts`
- Test: `workstudio/apps/sim/lib/nexora/wand.test.ts`, `workstudio/apps/sim/app/api/wand/route.test.ts` (créer s'il n'existe pas)

**Interfaces:**
- Produces: `isNexoraWandAvailable(): boolean` (vrai si `isNexoraOnlyModels` et `VLLM_BASE_URL` défini) ; `nexoraWandComplete(input: { system: string; messages: ChatMessage[]; signal?: AbortSignal }): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number } }>` ; `nexoraWandStream(input): Promise<ReadableStream<Uint8Array>>` qui émet **exactement le même format de flux** que la branche OpenAI actuelle de la route (le lire dans `route.ts` avant d'écrire le test). Appels : `POST ${VLLM_BASE_URL}/chat/completions` (`model: 'nexora-default'`, `stream` selon le cas), clé `VLLM_API_KEY`.

- [ ] **Step 1: Tests** — avec `fetch` simulé : réponse non-streamée → texte et usage ; flux SSE `data: {choices:[{delta:{content}}]}` → mêmes octets que la branche OpenAI pour le même texte ; Nexora API en 503 → la route renvoie 503 avec `wand.errors.modelUnavailable` (français) ; sans `isNexoraWandAvailable` → comportement d'origine inchangé.
- [ ] **Step 2: Lancer** → échecs.
- [ ] **Step 3: Implémenter** `lib/nexora/wand.ts` et le branchement dans la route (priorité : Nexora quand disponible, sinon Azure/OpenAI d'origine). Puis `grep -rn "OPENAI_API_KEY\|api.openai.com" workstudio/apps/sim/app workstudio/apps/sim/lib --include=*.ts | grep -v test` : tout autre appel interne de modèle visible par l'utilisateur (titres, résumés, génération) passe aussi par `nexoraWandComplete` sous `NEXORA_ONLY_MODELS` ; consigner au ledger ceux qui restent et pourquoi.
- [ ] **Step 4: Lancer** → PASS ; `check:audits`, `check:test-types`.
- [ ] **Step 5: smoke.py** — contrôle « Générer avec l'IA » : `POST /api/wand` (non streamé, prompt « Écris un objet d'e-mail de relance ») → 200 et texte non vide.
- [ ] **Step 6: Commit** `feat(j1): « Générer avec l'IA » passe par Nexora API`.

### Task 5: Bloc Function sans bac à sable distant

**Files:**
- Modify: `workstudio/apps/sim/blocks/blocks/function.ts` (ou le composant qui rend le choix de langage) et les messages `editor`
- Test: test du bloc Function existant (ou nouveau `function.test.ts`)

**Interfaces:**
- Consumes: `isRemoteSandboxEnabled` (`lib/core/config/env-flags.ts`), sa projection publique `NEXT_PUBLIC_SANDBOXES_ENABLED`.

- [ ] **Step 1: Test** — sans bac à sable : les options Python et Shell sont absentes du sélecteur de langage, JavaScript reste et est la valeur par défaut ; un bloc existant en Python affiche `editor.function.sandboxUnavailable` (« Python et Shell demandent un bac à sable d'exécution, non configuré sur cette instance. JavaScript reste disponible. »).
- [ ] **Step 2: Lancer** → échec. **Step 3: Implémenter.** **Step 4: Lancer** → PASS ; audits.
- [ ] **Step 5: Commit** `fix(j1): Function sans bac à sable : Python/Shell masqués et expliqués`.

### Task 6: Recherche web souveraine (SearXNG, désactivée par défaut)

**Files:**
- Modify: `workstudio/apps/sim/blocks/blocks/search.ts` (masqué sans clé Exa) via le mécanisme de visibilité existant (`lib/core/config/block-visibility.ts`) ou `hideFromToolbar` calculé
- Create: `workstudio/apps/sim/tools/searxng/` (outil `searxng_search` : `GET ${SEARXNG_URL}/search?q=…&format=json&language=fr`) et `workstudio/apps/sim/blocks/blocks/searxng.ts` (bloc « Recherche web »), enregistrés comme les autres intégrations (suivre la compétence `add-integration`)
- Modify: `deploy/compose.yml` (service `searxng`, image officielle épinglée, profil `search`, configuration JSON activée par un fichier `deploy/searxng/settings.yml`), `.env.example` (`NEXORA_WEB_SEARCH=0`), `install.sh` (question « Activer la recherche web ? Vos requêtes partiront vers des moteurs publics. [non] », `--yes` : `NEXORA_WEB_SEARCH=1` pour activer ; active le profil `search` et `SEARXNG_URL=http://searxng:8080` côté `workstudio`)
- Test: `tools/searxng/*.test.ts`, `scripts/tests/test-install.sh`

**Interfaces:**
- Produces: `env.SEARXNG_URL` (optionnel, schéma dans `lib/core/config/env.ts`) ; bloc visible seulement si défini.

- [ ] **Step 1: Tests** — l'outil transforme une réponse SearXNG (`results[].title,url,content`) en sortie `{ results: [{ title, url, snippet }] }` ; le bloc est masqué sans `SEARXNG_URL` ; le bloc Search est masqué sans clé Exa ; `test-install.sh` : par défaut pas de profil `search`, avec `NEXORA_WEB_SEARCH=1` le profil est actif.
- [ ] **Step 2: Lancer** → échecs. **Step 3: Implémenter.** **Step 4: Lancer** → PASS ; audits.
- [ ] **Step 5: Vérifier sur pc6** avec le profil `search` activé : un workflow « Recherche web » renvoie des résultats.
- [ ] **Step 6: Commit** `feat(j1): recherche web SearXNG optionnelle, bloc Search masqué sans clé`.

### Task 7: E-mail par SMTP

**Files:**
- Modify: `deploy/compose.yml` (`SMTP_HOST/PORT/USER/PASS/SECURE` ← `NEXORA_SMTP_*`, `FROM_EMAIL_ADDRESS` ← `NEXORA_EMAIL_FROM`), `deploy/.env.example`, `install.sh` (question facultative en mode interactif : serveur SMTP, laissé vide par défaut), `docs/guide/installation.md`
- Test: `scripts/tests/test-install.sh`

- [ ] **Step 1: Test shell** — `NEXORA_SMTP_HOST=smtp.test` en `--yes` se retrouve dans `.env` ; sans valeur, aucune clé SMTP vide n'est passée au conteneur (compose `${VAR:-}`), et WorkStudio démarre.
- [ ] **Step 2: Lancer** → échec. **Step 3: Implémenter.** **Step 4: Lancer** → PASS.
- [ ] **Step 5: Vérifier sur pc6** avec un conteneur Mailpit temporaire (lancé et supprimé par ce travail) : une invitation envoyée depuis Réglages › Membres arrive dans Mailpit.
- [ ] **Step 6: Commit** `feat(j1): envoi d'e-mails par SMTP`.

### Task 8: Surfaces publiques et e-mails en français, liens morts

**Files:**
- Modify: `workstudio/apps/sim/app/(interfaces)/chat/**`, `app/(interfaces)/resume/**`, `app/invite/**`, `components/emails/**`, `app/workspace/[workspaceId]/skills/**` (titres, `SKILLS_LABEL`), `ee/_nexora/disabled.ts`, descriptions d'audit en anglais relevées au ledger, `app/workspace/[workspaceId]/settings/components/self-host/self-host.tsx` (retirer le lien « Clés gérées » et toute section sans objet sur Nexora)
- Modify: `apps/sim/messages/{fr,en}/*.json` (nouvelles zones si besoin : `emails`, `publicChat`), `scripts/data/i18n-covered-dirs.txt` (ajouter ces dossiers)
- Test: tests existants des composants touchés ; `scripts/check-i18n.sh`

- [ ] **Step 1:** ajouter les dossiers à `i18n-covered-dirs.txt` ; lancer `scripts/check-i18n.sh` → liste des chaînes à traduire (échec attendu).
- [ ] **Step 2: Implémenter** les traductions (e-mails : les modèles react-email reçoivent la locale du destinataire ou le français par défaut ; tests de rendu d'un e-mail en `fr`).
- [ ] **Step 3: Vérifier** `check-i18n` 0, `check-brand` 0, tests des composants, `check:audits`.
- [ ] **Step 4: smoke.py** — le chat public d'un workflow déployé (`/chat/<identifiant>`) est servi avec `lang="fr"` et sans « Ask me anything ».
- [ ] **Step 5: Commit** `feat(j1): chat public, invitations, e-mails et compétences en français ; lien mort retiré`.

### Task 9: Traduction des métadonnées de blocs — mécanisme et blocs cœur

**Files:**
- Create: `workstudio/apps/sim/lib/i18n/blocks.ts`, `apps/sim/messages/{fr,en}/blocks.json`
- Modify: les points de rendu des noms, descriptions et libellés de blocs (barre d'outils, panneau de l'éditeur, recherche ⌘K, canevas) — les repérer avec `grep -rn "\.name\b\|subBlock.title\|config.description"` dans `app/workspace/[workspaceId]/w/` et `components/`
- Modify: `apps/sim/messages/index` (enregistrement de la zone `blocks` dans `i18n/messages.ts`)
- Test: `workstudio/apps/sim/lib/i18n/blocks.test.ts`

**Interfaces:**
- Produces: `translateBlockConfig(config: BlockConfig, t: BlockTranslator): BlockConfig` (renvoie une copie avec `name`, `description`, `longDescription`, et pour chaque sous-bloc `title`, `placeholder`, `description` traduits quand une clé existe, sinon la chaîne d'origine) ; clés `blocks.<type>.name|description|longDescription`, `blocks.<type>.subBlocks.<subBlockId>.title|placeholder|description` ; `CORE_BLOCK_TYPES: readonly string[]` (liste de la spec 8bis.3).
- Les chaînes source des fichiers `blocks/blocks/*.ts` restent en anglais (repli) : **aucune** modification de ces fichiers pour la traduction.

- [ ] **Step 1: Tests** — `translateBlockConfig` traduit nom, description et sous-blocs quand la clé existe et garde l'anglais sinon ; **test de couverture** : pour chaque type de `CORE_BLOCK_TYPES`, `messages/fr/blocks.json` contient le nom, la description et le `title` de chaque sous-bloc visible ; pour **tous** les blocs du registre, le nom et la description existent en français.
- [ ] **Step 2: Lancer** → échecs.
- [ ] **Step 3: Implémenter** `translateBlockConfig` et son branchement dans les points de rendu (hook `useTranslatedBlockConfig(type)` côté client).
- [ ] **Step 4: Remplir** `blocks.json` (fr et en) : blocs cœur complets ; nom et description des blocs d'intégration (les noms de marques ne se traduisent pas), par lots de ~50 avec relecture d'un échantillon.
- [ ] **Step 5: Vérifier** tests → PASS ; `check:audits` ; dans le navigateur (`scripts/dev/up.sh` + next dev), la barre d'outils et le panneau d'un bloc Agent et d'un bloc Slack sont en français.
- [ ] **Step 6: Commit** (un par lot si nécessaire) `feat(j1): blocs en français (mécanisme, blocs cœur, noms et descriptions des intégrations)`.

### Task 10: Aide contextuelle en français

**Files:**
- Modify: `workstudio/apps/sim/lib/branding/docs-url.ts` (table de correspondance chemin d'aide d'origine → page du guide)
- Create: `docs/guide/` : une page par écran principal (`espace-de-travail.md`, `workflows.md`, `blocs.md`, `connaissances.md`, `journaux.md`, `reglages.md`, `outils-mcp.md`), courtes et concrètes
- Test: `workstudio/apps/sim/lib/branding/docs-url.test.ts`

**Interfaces:**
- Produces: `docsUrl(path?: string): string` garde sa signature ; une table `GUIDE_PAGES: Record<string, string>` associe les préfixes de chemins d'aide (`/blocks`, `/triggers`, `/knowledgebase`, `/execution`, `/mcp`, `/permissions`…) à une page du guide ; inconnu → index.

- [ ] **Step 1: Test** — `docsUrl('/blocks/agent')` pointe vers `docs/guide/blocs.md` (ancre `#agent`), `docsUrl('/knowledgebase')` vers `connaissances.md`, chemin inconnu vers l'index.
- [ ] **Step 2: Lancer** → échec. **Step 3: Implémenter** la table et écrire les pages du guide. **Step 4: Lancer** → PASS ; `check-brand`.
- [ ] **Step 5: Commit** `docs(j1): aide contextuelle vers les pages du guide`.

### Task 11: Vérification de J1 et livraison

- [ ] **Step 1:** suite complète : `tsc` 0, vitest complet vert, `check:audits`, `check:test-types`, `scripts/check-{no-ee,brand,licenses,i18n}.sh`, tests shell (`scripts/tests/test-*.sh`), `python3 -I deploy/bootstrap/test_bootstrap.py`.
- [ ] **Step 2:** reconstruire les images (`workstudio`, `cron`) sur pc6, `compose up -d`, télécharger `bge-m3`, puis `NEXORA_SMOKE_ADMIN_* scripts/smoke.sh http://localhost:3200` : tous les contrôles, anciens et nouveaux (base de connaissances, planification, routeur, générer avec l'IA, chat public), verts.
- [ ] **Step 3:** installation fraîche isolée (procédure de la tâche 16 v1 : projet `nexora-itest`, ports 3300…) puis fumée, puis `nexora uninstall --purge`.
- [ ] **Step 4:** ledger v2 (`docs/superpowers/plans/2026-10-23-nexora-v2-ledger.md`) : preuves et décisions ; mémoire projet.
- [ ] **Step 5:** `git push origin main`.
