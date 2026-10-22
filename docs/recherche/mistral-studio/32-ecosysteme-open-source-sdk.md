# 32 — Écosystème open source, SDK et paquets de Mistral liés à Studio

> **Périmètre** : tout le code et les paquets publics de Mistral AI qui gravitent autour de Studio (état au 21/10/2026) : les 31 dépôts publics de l'organisation GitHub `mistralai`, les projets PyPI (organisation « Mistral AI » et paquets apparentés), les paquets npm (`@mistralai/*`, `@mistralai-capabilities/*`), leurs architectures, dépendances clés (dont Temporal pour Workflows), licences et maturité ; distinction open source / propriétaire. Le fonctionnel détaillé de chaque produit (Workflows, Observability, Search Toolkit, Vibe, Audio…) est traité dans les chapitres 12–22 ; ici on décrit l'emballage logiciel, le code et les registres. · **Sources** : API GitHub (`/orgs/mistralai`, `/orgs/mistralai/repos`), 20 dépôts clonés en `--depth 1` (lecture seule, aucun code exécuté), ≈ 65 noms testés sur l'API JSON PyPI (29 projets existants, dont les 26 de la page d'organisation PyPI), ≈ 25 noms testés sur le registre npm + listes d'organisation npm (15 paquets), API JSR, et 19 pages de docs.mistral.ai (copie du 21/10/2026) pour recoupement · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Inventaire des 31 dépôts GitHub `mistralai`
   - 3.2 Cartographie : quel code public pour quelle brique de Studio
   - 3.3 SDK Python `mistralai` (`client-python`)
   - 3.4 SDK TypeScript `@mistralai/mistralai` (`client-ts`), paquets Azure/GCP, ancien `client-js`
   - 3.5 `mistral-common` (tokenizers, validation, serveur expérimental)
   - 3.6 SDK Workflows (`mistralai-workflows`), plugins, CLI de scaffolding, moteur Temporal
   - 3.7 Évaluation et observabilité : `mistralai-evaluations`, plugin Workflows, `mistralai-otel-observability`, télémétrie du SDK
   - 3.8 Search Toolkit et plugins, `search-starter-app`
   - 3.9 Mistral Vibe (`mistral-vibe`) et paquets satellites (Vibe SDK, Task protocol, Harness)
   - 3.10 CLI `mistral`, « Mistral Apps » et paquets `mistralai-capabilities`
   - 3.11 MCP : serveur hébergé, clients MCP dans les SDK, serveurs d'exemple
   - 3.12 Cookbook
   - 3.13 Inférence, fine-tuning, évaluations académiques (dépôts historiques)
   - 3.14 Autres dépôts : Timestral, Leanstral/FLT, Mistral Compute, SageMaker, documentation
   - 3.15 Forks
4. Interface utilisateur (lignes de commande, points d'entrée console)
5. API et SDK : registres, versions, dépendances
6. Limites, licences, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées
Annexe — Couverture

---

## 1. En bref

- **Organisation GitHub `mistralai`** (vérifiée, créée le 02/05/2023, 9 247 abonnés) : **31 dépôts publics**, dont **11 forks** et **6 archivés**. Les plus suivis : `mistral-inference` (10 820 ★, archivé), `mistral-vibe` (5 177 ★), `mistral-finetune` (3 090 ★, archivé), `cookbook` (2 349 ★), `mistral-common` (953 ★), `client-python` (775 ★).
- **Deux SDK clients officiels** seulement, tous deux **Apache-2.0** et **générés par Speakeasy** depuis la spec OpenAPI : Python **`mistralai` 3.3.0** (PyPI, 20/10/2026) et TypeScript **`@mistralai/mistralai` 3.1.0** (npm, 20/10/2026). Chacun expose **288 méthodes**, dont toutes les surfaces de Studio (`beta.observability`, `beta.rag`, `workflows`, `beta.connectors`, `beta.skills`, `beta.prompts`, `audio.agents`…). Les autres langages sont couverts par des SDK communautaires listés dans la doc.
- **Une grande partie de l'outillage Studio est publiée sur PyPI sans dépôt GitHub public** : `mistralai-workflows` (3.16.0), ses plugins, `mistralai-workflows-cli`, `mistralai-evaluations`, `mistralai-otel-observability`, `mistralai-search-toolkit` (+ plugins), `mistralai-vibe-sdk`, `mistralai-vibe-protocol`, `mistralai-vibe-harness`, `mistralai-capabilities-*`. Plusieurs README et dépôts indiquent que la source vit dans un monorepo interne **`mistralai/dashboard`** (privé). Les sources restent consultables via les *sdists* PyPI pour la plupart.
- **Workflows repose sur Temporal** : `mistralai-workflows` dépend de **`temporalio>=1.29.0,<1.30.0`** (SDK Python Temporal, MIT) ; la doc l'écrit (« Durable execution is powered by Temporal ») et les plugins sont décrits comme des « Temporal activities ». Mode hybride : orchestrateur hébergé par Mistral, workers chez le client.
- **Licences** : très majoritairement Apache-2.0 ; MIT pour `cookbook` et `search-starter-app` ; **propriétaires** : `mistralai-workflows-plugins-search` et `mistralai-vibe-harness` (classifier `License :: Other/Proprietary License`) ; **sans licence déclarée** : `mistral-evals` (pas de fichier LICENSE), `mistralai-vibe-sdk`, `mistralai-vibe-protocol`, `mistralai-vibe-local-harness`, `mistralai-workflows-cli`. Les services (API, console, orchestrateur Workflows, serveur MCP hébergé) sont fermés.
- **Mistral Vibe** (CLI de codage, Apache-2.0, v3.0.1 du 20/10/2026) est le principal produit open source actif : TUI en Rust, *app-server* Python, « Unified Harness » en Rust (avec `deno_core`), support ACP (éditeurs) et MCP, skills, hooks, mode programmatique, protocole de sandbox expérimental.
- **Nouveautés visibles dans les registres mais absentes de la doc** : écosystème **« Mistral Apps »** (CLI `mistral` v0.10.0, 12 paquets npm `@mistralai-capabilities/*`, 4 paquets PyPI `mistralai-capabilities-*`, tous publiés en octobre 2026) ; SDK OTLP `mistralai-otel-observability` ; Vibe SDK / Task protocol.
- **Sécurité de la chaîne d'approvisionnement** : incident « Mini Shai-Hulud » (avis MAI-2026-002, mai 2026) — versions compromises `@mistralai/mistralai` 2.2.2–2.2.4, `-azure`/`-gcp` 1.7.1–1.7.3 et `mistralai` (PyPI) 2.4.6, toutes retirées des registres. Au 21/10/2026, les dépôts `client-python` et `mistral-vibe` imposent un âge minimal aux dépendances (`exclude-newer = "2 days"` côté uv).
- **Maturité** : SDK clients et `mistral-common` = production (cadence de release hebdomadaire) ; Workflows = « Public Preview » (classifier PyPI `4 - Beta`) ; Search Toolkit en `0.0.x` (beta) ; Evaluations `0.8.x` (beta) ; Vibe classé `5 - Production/Stable` ; `mistral-inference`, `mistral-finetune` et `client-js` archivés.

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| Speakeasy | Générateur de SDK à partir d'OpenAPI. Les deux SDK clients sont « mostly generated code » (en-tête `Code generated by Speakeasy … DO NOT EDIT`) ; seuls les fichiers listés dans `.genignore` sont écrits à la main. Version de générateur : `speakeasyVersion 1.796.4`. |
| `mistralai.extra` / `src/extra` | Code écrit à la main, injecté dans le SDK généré via des « custom code regions » Speakeasy (structured outputs, MCP, `RunContext`, télémétrie, voice agents, encodage Workflows…). |
| Namespace package (PEP 420) | Le répertoire `mistralai/` n'a pas d'`__init__.py` : plusieurs distributions PyPI y cohabitent (`mistralai.client`, `mistralai.workflows`, `mistralai.evaluations`, `mistralai.search.toolkit`, `mistralai.vibe.sdk`, `mistralai.observability.otel`, `mistralai.azure`, `mistralai.gcp`…). |
| Temporal / `temporalio` | Moteur open source d'exécution durable (event history, replay, retries). Base de Mistral Workflows ; le SDK Mistral encapsule le SDK Python Temporal. |
| Worker | Processus client qui enregistre workflows/activities et interroge l'orchestrateur (« scheduler ») hébergé ; un helper SDK lit `scheduler_url` et `namespace` via `GET /v1/workflows/workers/whoami`. |
| Activity / Workflow | Primitives Temporal reprises : décorateurs `@workflows.activity()`, `@workflows.workflow.define(...)`, `@workflows.workflow.entrypoint`. |
| Plugin Workflows | Paquet Python publiant workflows/activities sous `mistralai.workflows.plugins.*` (namespace réservé à Mistral) ; découvert automatiquement par le worker. |
| Payload encoding | Couche d'encodage des payloads Temporal : *offloading* vers S3/GCS/Azure, chiffrement AES-GCM (`full`/`partial`), compression zstd ; implémentée dans `mistralai.extra.workflows.encoding`. |
| Copier | Outil de templates de projets (MIT). Utilisé par `mistralai-workflows-cli` (dépendance `copier>=9.0`) et par `search-starter-app`. |
| Search Toolkit | Framework Python de recherche d'information (ingestion → index → retrieval), agnostique du backend via plugins. |
| Vespa / pgvector / `pg_textsearch` / Qdrant | Backends de recherche supportés par plugins : Vespa (moteur open source), PostgreSQL + pgvector (+ BM25 via `pg_textsearch`), Qdrant (plugin tiers). |
| RRF (Reciprocal Rank Fusion) | Fusion de classements vecteur + lexical ; plugin Postgres : `rrf_k=4` par défaut, poids égaux. |
| OTLP / GenAI semantic conventions | Protocole OpenTelemetry et conventions `gen_ai.*` ; utilisés par la télémétrie du SDK, `mistralai-otel-observability` et Vibe. Endpoint Mistral : `https://api.mistral.ai/telemetry/v1/{traces,metrics,logs}`. |
| Redaction policy | Politique de caviardage avant export : `RegexRedactionPolicy` (défaut), `AttributeRedactionPolicy`, `CallbackRedactionPolicy`. |
| ACP (Agent Client Protocol) | Protocole éditeur ↔ agent (initié par Zed). Vibe fournit `vibe-acp` ; Mistral maintient un fork du dépôt ACP. |
| MCP (Model Context Protocol) | Protocole d'outils pour agents ; Mistral héberge un serveur MCP (`https://api.mistral.ai/mcp`) et ses SDK embarquent des clients MCP. |
| Unified Harness | Moteur d'exécution de sessions d'agent de Vibe (crate Rust `mistralai-unified-harness`, bindings Python/Node), distribué aussi en wheels natives `mistralai-vibe-local-harness` / `mistralai-vibe-harness`. |
| Task protocol | Abstraction « Task » (outil, agent, workflow = même interface, historique en JSON Patch) du paquet `mistralai-vibe-protocol`. |
| Agent Skills | Format de skills (`SKILL.md` + frontmatter YAML, spec agentskills.io) suivi par Vibe et par les skills Studio. |
| Mistral Apps / capabilities | Écosystème d'applications déployées via la CLI `mistral apps` ; « capabilities » = modules installables (backend FastAPI, workflows, Postgres, front TanStack Start, observabilité, passerelle de déploiement). Non documenté dans la doc publique au 21/10/2026. |
| Trusted publishing (OIDC) | Publication PyPI sans jeton longue durée depuis GitHub Actions ; mentionnée dans les README de `mistralai-evaluations` et `mistralai-otel-observability`. |
| Gemfury / Cloudsmith | Registres privés de Mistral : Gemfury (`pypi.fury.io/mistralai`, distribution interne), Cloudsmith (`mistral-ai/sdk-distribution`, préversions clients). |
| Tekken / `TokenizerVersion` | Tokenizer Mistral basé sur tiktoken ; versions de tokenizer `v1`→`v15` gérées par `mistral-common`. |

## 3. Fonctionnalités en détail

### 3.1 Inventaire des 31 dépôts GitHub `mistralai`

Source : `GET https://api.github.com/orgs/mistralai/repos?per_page=100&page=1` (31 résultats, une seule page ; `public_repos: 31` sur `/orgs/mistralai`). « Dernier push » = `pushed_at` (UTC) ; « Màj » = `updated_at` (inclut l'activité d'étoiles/métadonnées). Tri par étoiles.

| Dépôt | Rôle (description résumée) | Langage | Licence | Statut | ★ | Forks | Créé | Dernier push | Màj |
|---|---|---|---|---|---|---|---|---|---|
| `mistral-inference` | Bibliothèque d'inférence officielle des modèles Mistral (ex-`mistral-src`, qui redirige) | Jupyter Notebook | Apache-2.0 | archivé | 10 820 | 1 062 | 2023-09-27 | 2026-06-16 | 2026-10-21 |
| `mistral-vibe` | « Minimal CLI coding agent by Mistral » | Python | Apache-2.0 | actif | 5 177 | 742 | 2025-12-08 | 2026-10-21 | 2026-10-21 |
| `mistral-finetune` | Fine-tuning LoRA léger des modèles Mistral | Python | Apache-2.0 | archivé | 3 090 | 317 | 2024-05-24 | 2026-06-16 | 2026-10-19 |
| `cookbook` | Notebooks et guides (Mistral, communauté, partenaires) | Jupyter Notebook | MIT | actif | 2 349 | 547 | 2024-01-05 | 2026-10-14 | 2026-10-21 |
| `mistral-common` | Pré-traitement officiel : tokenizers, validation, normalisation | Python | Apache-2.0 | actif | 953 | 188 | 2024-04-15 | 2026-10-21 | 2026-10-21 |
| `megablocks-public` | Fork de MegaBlocks (MoE) | — | Apache-2.0 | archivé, fork | 865 | 61 | 2023-12-08 | 2023-12-08 | 2026-10-19 |
| `client-python` | SDK Python de la plateforme | Python | Apache-2.0 | actif | 775 | 210 | 2023-12-07 | 2026-10-20 | 2026-10-21 |
| `timestral` | Modèle de fondation séries temporelles « Timestral » (inférence) | Python | Apache-2.0 | actif | 722 | 53 | 2026-10-15 | 2026-10-15 | 2026-10-22 |
| `client-js` | Ancien client JS | JavaScript | Apache-2.0 | archivé | 200 | 46 | 2023-12-07 | 2024-10-10 | 2026-10-05 |
| `client-ts` | SDK TypeScript de la plateforme | TypeScript | Apache-2.0 | actif | 157 | 45 | 2024-08-07 | 2026-10-20 | 2026-10-20 |
| `mistral-evals` | Évals multimodales académiques + MM-MT-Bench | Python | **aucune** | dormant | 93 | 16 | 2024-09-13 | 2025-11-21 | 2026-10-21 |
| `platform-docs-public` | Source du site docs.mistral.ai (Next.js/MDX) | MDX | Apache-2.0 | actif | 75 | 135 | 2023-12-22 | 2026-10-21 | 2026-10-21 |
| `vllm-release` | Fork de vLLM (release 2023) | Python | Apache-2.0 | archivé, fork | 53 | 13 | 2023-09-27 | 2023-12-11 | 2026-09-02 |
| `FastChat-release` | Fork de FastChat | — | Apache-2.0 | archivé, fork | 50 | 9 | 2023-09-27 | 2023-10-02 | 2026-10-06 |
| `LeanstralSafeVerify` | Fork de SafeVerify (vérification de preuves Lean) utilisé pour entraîner/évaluer Leanstral | Lean | Apache-2.0 | actif | 40 | 1 | 2026-07-01 | 2026-07-03 | 2026-09-03 |
| `transformers-release` | Fork de 🤗 Transformers | — | Apache-2.0 | fork | 30 | 12 | 2023-09-27 | 2025-11-17 | 2026-06-30 |
| `TensorRT-LLM` | Fork de TensorRT-LLM (NVIDIA) | — | Apache-2.0 | fork | 17 | 7 | 2024-02-09 | 2024-02-12 | 2026-06-30 |
| `FLTEval` | Harnais d'évaluation Docker pour tâches Lean « FLT » | Python | Apache-2.0 | actif | 8 | 1 | 2026-07-02 | 2026-07-02 | 2026-09-23 |
| `llm-d-router-public` | Fork du scheduler d'inférence llm-d (branche `mistral-main`) | Go | Apache-2.0 | fork | 3 | 1 | 2025-10-09 | 2026-10-20 | 2026-10-15 |
| `agent-client-protocol` | Fork du protocole ACP (Zed) | Rust | Apache-2.0 | fork | 3 | 2 | 2025-11-13 | 2026-02-17 | 2026-06-30 |
| `zed-extensions` | Fork du registre d'extensions Zed | JavaScript | non détectée | fork | 2 | 1 | 2025-12-12 | 2026-05-20 | 2026-06-30 |
| `cli` | Binaires de la CLI `mistral` (source dans le monorepo interne) | Shell | Apache-2.0 | actif | 2 | 0 | 2026-08-17 | 2026-10-21 | 2026-10-14 |
| `sagemaker-docs` | Notebooks Mistral sur AWS SageMaker | Jupyter Notebook | **aucune** | dormant | 1 | 4 | 2024-06-26 | 2025-04-18 | 2026-08-04 |
| `prom_client_python` | Fork du client Prometheus Python | — | Apache-2.0 | fork | 1 | 1 | 2025-11-20 | 2026-03-19 | 2026-06-30 |
| `vllm` | Fork récent de vLLM | Python | Apache-2.0 | fork | 1 | 2 | 2026-07-24 | 2026-09-28 | 2026-09-25 |
| `nvsentinel-provider-mistral` | Provider NVSentinel (reboot de nœuds) pour Mistral Compute | Go | Apache-2.0 | actif | 1 | 0 | 2026-10-08 | 2026-10-14 | 2026-10-13 |
| `gateway-api-inference-extension-public` | Fork de la Gateway API Inference Extension (Kubernetes) | — | Apache-2.0 | fork | 0 | 0 | 2025-10-09 | 2025-10-09 | 2026-06-30 |
| `llm-d-kv-cache-manager-public` | Fork du coordinateur de KV-cache distribué llm-d | — | Apache-2.0 | fork | 0 | 0 | 2025-10-09 | 2025-10-07 | 2026-06-30 |
| `search-starter-app` | Template Copier pour projets Search Toolkit | Jinja | MIT | actif | 0 | 1 | 2026-09-18 | 2026-09-21 | 2026-09-21 |
| `mistral-compute-openapi` | Dépôt vide (README d'une ligne) | — | Apache-2.0 | vide | 0 | 0 | 2026-09-22 | 2026-09-22 | 2026-09-22 |
| `public-test` | Dépôt vide de test | — | aucune | vide | 0 | 0 | 2026-10-13 | 2026-10-13 | 2026-10-13 |

Compléments (API GitHub) : tickets ouverts — `mistral-vibe` 413, `platform-docs-public` 76, `cookbook` 74, `mistral-common` 46, `client-python` 40, `llm-d-router-public` 25, `client-ts` 18, `mistral-evals` 9, `timestral` 5. Aucun dépôt n'a de `topics` sauf `mistral-inference` (`llm`, `llm-inference`, `mistralai`).

Dernières *releases* GitHub (redirection `/releases/latest`) : `client-python` **v3.2.0**, `client-ts` **v3.0.0**, `mistral-vibe` **v3.0.1**, `mistral-common` **v1.12.0**, `mistral-inference` v1.6.0, `nvsentinel-provider-mistral` v0.1.2, `cli` **`cli/v0.10.0`** ; aucune release pour `cookbook`, `timestral`, `search-starter-app`.

Noms testés **inexistants** dans l'organisation (`git ls-remote` → « Repository not found ») : `connector-sdk-demo` (pourtant cité dans la doc), `mistralai-workflows`, `workflows`, `search-toolkit`, `mistral-search-toolkit`, `voice-agents`, `mcp`, `mistral-mcp`, `evaluations`. `mistral-src` existe encore comme redirection vers `mistral-inference`.

### 3.2 Cartographie : quel code public pour quelle brique de Studio

| Brique Studio / produit | Paquet(s) publié(s) | Dépôt GitHub public ? | Licence du paquet |
|---|---|---|---|
| API (toutes surfaces) – client Python | `mistralai` (PyPI) | oui, `client-python` | Apache-2.0 (dépôt ; métadonnées PyPI vides) |
| API – client TS/JS | `@mistralai/mistralai`, `@mistralai/mistralai-azure`, `@mistralai/mistralai-gcp` (npm) | oui, `client-ts` | Apache-2.0 |
| Tokenisation / validation (modèles open-weights) | `mistral_common` (PyPI) | oui, `mistral-common` | Apache-2.0 |
| Workflows (SDK worker) | `mistralai-workflows` | **non** | Apache-2.0 |
| Workflows – plugin Mistral (agents durables, MCP, connecteurs, UI Le Chat) | `mistralai-workflows-plugins-mistralai` | non | Apache-2.0 |
| Workflows – scaffolding / cookbooks | `mistralai-workflows-cli` | non | non déclarée |
| Workflows – encodage payload, `execute_workflow_and_wait`, connecteurs | inclus dans `mistralai` (`mistralai.extra.workflows`) | oui | Apache-2.0 |
| Observability – évaluations hors ligne | `mistralai-evaluations`, `mistralai-workflows-plugins-evaluations` | non | Apache-2.0 |
| Observability – traces OTLP | `mistralai[telemetry]` (`mistralai.extra.observability`), `mistralai-otel-observability` | partiellement (SDK client) | Apache-2.0 |
| Search / RAG – framework | `mistralai-search-toolkit` + `-plugins-vespa`, `-plugins-postgres`, `-storage-s3/-gcs/-azure` | non | Apache-2.0 |
| Search – plugin Qdrant (tiers) | `mistralai-search-toolkit-plugins-qdrant` | oui, `qdrant-labs/mistral-qdrant-plugin` (hors org) | Apache-2.0 |
| Search – ingestion durable dans Workflows | `mistralai-workflows-plugins-search` | non | **Proprietary** |
| Search – template de projet | — (Copier depuis Git) | oui, `search-starter-app` | MIT |
| Audio / voice agents | inclus dans `mistralai[voice-agents]` et `@mistralai/mistralai` (`extra/voice-agents`) | oui | Apache-2.0 |
| Vibe Code (CLI) | `mistral-vibe` | oui, `mistral-vibe` | Apache-2.0 |
| Vibe – SDK d'agents / protocole | `mistralai-vibe-sdk`, `mistralai-vibe-protocol` | non | non déclarée |
| Vibe – moteur natif | `mistralai-vibe-local-harness` (non déclarée), `mistralai-vibe-harness` (**Proprietary**) | code du harness local présent dans `mistral-vibe/harness/` | — |
| Mistral Apps | `@mistralai-capabilities/*` (npm), `mistralai-capabilities-*` (PyPI), binaires `mistral` | binaires seulement (`cli`) | Apache-2.0 (paquets) |
| MCP hébergé | service `https://api.mistral.ai/mcp` | non | service fermé |
| Documentation | site docs.mistral.ai | oui, `platform-docs-public` | Apache-2.0 |
| Exemples | — | oui, `cookbook` | MIT |

### 3.3 SDK Python `mistralai` (`client-python`)

**Identité** : PyPI `mistralai` 3.3.0 (20/10/2026 17:03 UTC), 113 versions publiées depuis 0.0.7 (09/12/2023). Dépôt `client-python` (Apache-2.0, HEAD du 20/10/2026 « chore: sync generated SDK from upstream (#642) »). Python **≥ 3.10**. Politique : quand une version de Python atteint sa fin de vie, 3 mois de grâce puis relèvement du minimum.

**Lignée des versions majeures (PyPI)** :

| Majeure | Première | Dernière | Nb | Rupture principale |
|---|---|---|---|---|
| 0.x | 0.0.7 (09/12/2023) | 0.4.2 (04/07/2024) | 16 | Client historique écrit à la main, « inspiré de cohere-python » (`OLD-README.md`), géré avec Poetry |
| 1.x | 1.0.0rc1 (01/08/2024) | 1.12.4 (20/02/2026) | 44 | Passage à Speakeasy (1re génération le 07/08/2024 avec Speakeasy CLI 1.356.0, d'après `RELEASES.md`, 91 entrées) ; `from mistralai import Mistral` ; paquets séparés `mistralai_azure`, `mistralai_gcp` |
| 2.x | 2.0.0b1 (26/02/2026) | 2.10.1 (15/09/2026) | 49 | Imports déplacés vers `mistralai.client` ; Azure/GCP deviennent `mistralai.azure` / `mistralai.gcp` dans le même wheel ; 42 types renommés (`{Verb}{Entity}Request`…) ; `MistralGoogleCloud` → `MistralGCP` |
| 3.x | 3.0.0 (28/09/2026) | 3.3.0 (20/10/2026) | 4 | Transport `httpx` → **`httpx2`** (fork maintenu par Pydantic) ; extra `agents` passe à `mcp>=2.2,<3` ; auth par **service account** ; outils `web_search`, `web_search_premium`, `code_interpreter` retirés de `chat.*`/`agents.*` (restent dans `beta.conversations` / `beta.agents`) ; suppression de credentials de connecteurs unifiée (`delete_credentials(..., consumer_scope=...)`) ; backend de déploiement Workflows `koyeb` → `mistral_cloud` |

**Architecture du dépôt** :
- `src/mistralai/client/` : code généré (59 fichiers Python à la racine, `models/`, `errors/`, `utils/`, `_hooks/`). Classe racine `Mistral` à chargement paresseux des sous-SDK (`_sub_sdk_map`) : `beta`, `audio`, `models`, `realtime`, `files`, `batch`, `chat`, `fim`, `agents`, `embeddings`, `classifiers`, `ocr`, `workflows`, `events`.
- `src/mistralai/extra/` (à la main) : `struct_chat` (réponses parsées Pydantic), `utils/response_format` (`response_format_from_pydantic_model`), `mcp/` (clients MCP `stdio`, `sse`, `streamable_http`, OAuth avec *dynamic client registration*), `run/` (`RunContext` : exécution locale de fonctions et clients MCP pendant `beta.conversations.run_async` / `run_stream_async`, `requires_confirmation`), `batch/` (`BatchClient`, `BatchInput`, `BatchResult`), `realtime/` (`RealtimeTranscription`, `RealtimeConnection` en WebSocket), `observability/` (télémétrie OTel + caviardage), `voice_agents/` (sessions vocales LiveKit), `workflows/` (encodage des payloads, slots de connecteurs, helpers), `connectors_gateway.py` (`beta.connectors.mcp_client()` / `http_client()` via `/v1/connectors-gateway`, en-tête `x-credentials-name`, timeout par défaut 300 000 ms).
- `packages/azure`, `packages/gcp` : SDK générés pour Azure AI et Vertex AI, embarqués dans le même wheel.
- `.speakeasy/` : `gen.yaml` (`sdkClassName: Mistral`, OAuth2 client-credentials activé, `versioningStrategy: automatic`), `workflow.yaml` (sources OpenAPI tirées du registre Speakeasy `registry.speakeasyapi.dev/mistral-dev/mistral-dev/mistral-openapi:v2`, `-azure:v2`, `-google-cloud:v2`).
- `examples/mistral/{agents,audio,chat,classifier,embeddings,fim,jobs,libraries,mcp_servers,models,observability,ocr,prompts,skills,workflows}`, `examples/audio/voice_agents`, `examples/azure`, `examples/gcp`.
- `AGENTS.md`/`CLAUDE.md` : consignes aux agents IA (ne pas éditer le code généré).

**Dépendances** (cœur) : `httpx2>=2.13.0`, `pydantic>=2.11.2`, `opentelemetry-api>=1.33.1,<2`, `opentelemetry-semantic-conventions>=0.61b0`, `jsonpath-python>=1.0.6`, `python-dateutil`, `eval-type-backport`, `typing-inspection`.

**Extras** :

| Extra | Dépendances | Usage |
|---|---|---|
| `agents` | `mcp>=2.2,<3`, `griffe>=1.7.3,<2`, `authlib>=1.8,<2` | `RunContext`, outils locaux, MCP |
| `mcp` | `mcp>=2.2,<3` | clients MCP seuls |
| `realtime` | `websockets>=13` | transcription temps réel |
| `voice-agents` | `livekit>=1.1,<2`, `numpy`, `pyaudio>=0.2.14` | `client.audio.sessions.init()` |
| `telemetry` | `opentelemetry-sdk`, `opentelemetry-exporter-otlp-proto-http` | `configure_telemetry` |
| `gcp` | `google-auth>=2.27`, `requests` | `MistralGCP` |
| `workflow-payload-offloading` (+ `-s3`, `-gcs`, `-azure`) | `aioboto3`, `gcloud-aio-storage`, `azure-storage-blob[aio]`, `azure-identity` | offloading des payloads Workflows |
| `workflow-payload-encryption` | `cryptography>=50,<51` | chiffrement AES-GCM |
| `workflow-payload-compression` | `msgpack`, `zstandard>=0.25,<0.26` | compression zstd |

**Authentification** : schéma global `api_key` (HTTP Bearer, variable `MISTRAL_API_KEY`). Ordre de résolution v3 : (1) en-tête `Authorization` passé via `http_headers`, (2) `Mistral(api_key=...)` (accepte un callable), (3) jeton de *service account* lu à chaque requête dans le fichier `MISTRAL_SA_TOKEN_PATH`, (4) `MISTRAL_API_KEY`. Fichier illisible/vide → `ServiceAccountTokenError` sans repli. Sécurité par opération pour `beta.users.*` (`UsersAPIGetIdentitySecurity`, champ `dashboard_user_context_auth`).

**Serveurs nommés** (`server=`) : `global` → `https://api.mistral.ai`, `eu` → `https://api.eu.mistral.ai`, `us` → `https://api.us.mistral.ai` ; ou `server_url=` libre.

**Erreurs** : base `MistralError` (`message`, `status_code`, `headers`, `body`, `raw_response`, `data`) ; `HTTPValidationError` (422, « applicable à 178 des 288 méthodes ») ; `ObservabilityError` (400, 65/288) ; `ResponseValidationError` (réponse non conforme au modèle Pydantic) ; erreurs réseau `httpx.RequestError`/`ConnectError`/`TimeoutException`.

**Comportements transverses** : SSE exposé en générateurs (`for event in res`) ; JSONL/ndjson streaming ; pagination par `res.next()` ; retries configurables (`RetryConfig("backoff", BackoffStrategy(1, 50, 1.1, 100), False)` par appel ou `retry_config=` global) ; client HTTP injectable (`client=`/`async_client=`, protocoles `HttpClient`/`AsyncHttpClient`) ; context manager sync/async ; logs de debug via `debug_logger` ou `MISTRAL_DEBUG=true`.

**Télémétrie** (`mistralai.extra.observability`, extra `telemetry`) : opt-in ; `configure_telemetry(client, provider=...)` avec `"dedicated"` (défaut : exportateur OTLP possédé par le SDK vers l'endpoint Mistral, caviardage automatique), `"global"` (provider OTel de l'application, pas de caviardage), ou un `TracerProvider`. Caviardage : `RegexRedactionPolicy` (défaut), `AttributeRedactionPolicy`, callback ; `RedactingSpanExporter` réutilisable hors SDK ; constantes `DEFAULT_PII_SECRET_PATTERNS`, `DEFAULT_SENSITIVE_ATTRIBUTE_KEYS`. Variables : `MISTRAL_SDK_TELEMETRY` (`dedicated|global|false`), `MISTRAL_OTLP_TRACES_ENDPOINT` (défaut `https://api.mistral.ai/telemetry/v1/traces`), `MISTRAL_SDK_DEBUG_TRACING`.

**Voice agents** (extra `voice-agents`) : `await client.audio.sessions.init(stt={"model": "voxtral-mini-transcribe-realtime-3"}, tts={"model": "voxtral-mini-tts-3"}, instructions=..., welcome_message=..., tools=[WebSearchTool(), get_weather], audio_interface=DefaultAudioInterface())` ; `init()` crée la session distante sans rejoindre la room ; connexion par `await session.connect()` ou `async with session` dans la fenêtre de jonction ; événements `transcript`, `connected`, `error` ; audio manuel = PCM 16 bits signé mono 48 kHz (`session.send_audio()`) ; décorateur `@function_tool(filler={"text": ...}, timeout_ms=15000)` ; `tools` (déclarations distantes) vs `function_handlers` (gestionnaires locaux seulement) ; `VoiceAgentConnectionError`. L'ancien paquet autonome `mistralai-voice-agents` (`MistralVoiceAgent`, `mistralai.voice.agents`) est remplacé.

**Workflows côté client** : `client.workflows.execute_workflow_and_wait(workflow_identifier=..., input=..., use_api_sync=True, timeout_seconds=60.0)` (attente côté serveur) ou `use_api_sync=False, polling_interval=5, max_attempts=12` (polling) ; variante `_async` ; `mistralai.extra.workflows.helpers.get_scheduler_namespace(client)` ; `ConnectorSlot(connector_name="gmail", credentials_name=...)`, `ConnectorBindings`, `WorkflowExtensions`, `execute_with_connector_auth_async`. Encodage : `WorkflowEncodingConfig(payload_offloading=PayloadOffloadingConfig(storage_config=BlobStorageConfig(storage_provider="s3"|"gcs"|"azure", ...), min_size_bytes=1 MiB), payload_encryption=PayloadEncryptionConfig(mode="full"|"partial", main_key, secondary_key), payload_compression=PayloadCompressionConfig(min_size_bytes=1 MiB, algorithm_config=ZstdCompressionConfig(level=3 /* 1–22 */)))`, `configure_workflow_encoding`, `EncryptedStrField` (chiffrement partiel champ par champ). Clé = hex pour `AESGCM` ; clé secondaire acceptée en déchiffrement pour la rotation.

**Fournisseurs cloud** : `MistralAzure(api_key=..., server_url=AZURE_ENDPOINT, api_version="2024-05-01-preview")` (injection automatique de `api-version`) ; `MistralGCP(project_id=..., region="europe-west4" par défaut)` avec `google.auth.default()` et rafraîchissement auto des jetons. Ces clients ne lisent pas `MISTRAL_SA_TOKEN_PATH`.

### 3.4 SDK TypeScript `@mistralai/mistralai` (`client-ts`), paquets Azure/GCP, ancien `client-js`

- **npm** `@mistralai/mistralai` **3.1.0** (20/10/2026 17:23 UTC) ; 67 versions ; dist-tags `latest: 3.1.0`, `alpha: 2.0.0-alpha.1`, `rc: 1.0.0-rc.3`. Majeures : 0.x (0.0.5 du 07/12/2023 → 0.5.0 du 05/06/2024, ancien `client-js`), 1.x (une version `1.0.0` horodatée 07/12/2023 — tout premier publish du paquet, avant 0.0.5 —, puis la lignée 1.0.0-rc.1 du 30/07/2024, 1.0.1 du 07/08/2024 → 1.15.1 du 10/03/2026), 2.x (2.0.0-alpha.1 du 16/03/2026 → 2.7.0 du 09/09/2026), 3.x (3.0.0 et 3.1.0 le 20/10/2026). Mainteneur npm : `mistralai-bot`. ≈ 14,4 Mo décompressés, 8 150 fichiers.
- **ESM uniquement** depuis la v2 (`await import(...)` en CommonJS). Exports `.`, `./models/components`, `./models/errors`, `./models/operations`, `./types`, `./*` ; build `tsgo` (`@typescript/native-preview`), lint `oxlint`.
- **Dépendances** : `zod` (`^3.25 || ^4`), `zod-to-json-schema`, `ws`, **`@modelcontextprotocol/sdk ^1.29.0`** (dépendance directe depuis la v3 ; `beta.connectors.mcpClient()` renvoie son `Client`), `@opentelemetry/semantic-conventions`. **Peer dependencies optionnelles** : `@opentelemetry/api`, `-sdk-trace-base`, `-resources`, `-exporter-trace-otlp-http` (télémétrie) ; `livekit-client` (navigateur) et `@livekit/rtc-node` (Node) pour les voice agents ; `@aws-sdk/client-s3`, `@azure/storage-blob`, `@azure/identity`, `@google-cloud/storage`, `@msgpack/msgpack`, `@hpcc-js/wasm-zstd` pour l'encodage des payloads Workflows.
- **Runtimes** (RUNTIMES.md) : ES2020+, Fetch API, Web Streams, async iterables ; navigateurs evergreen, Node LTS (texte : « v18 et v20 »), Bun ≥ 1, Deno 1.39 (pas d'upload de fichiers en streaming). L'exemple voice agents exige Node 24 (`await using`) et SoX.
- **Fonctions autonomes** (FUNCTIONS.md) : chaque méthode existe aussi en fonction tree-shakable (`MistralCore` + `funcs/filesUpload.js`…, 286 fichiers `src/funcs`) pour réduire la taille des bundles navigateur/serverless.
- **`src/extra`** : `observability` (`configureTelemetry`, `RedactingSpanExporter`, mêmes modes `dedicated|global`), `realtime`, `voice-agents` (`init`, `functionTool`, `DefaultAudioInterface` sous `extra/voice-agents/audio/node`, `initSession()` sous `extra/voice-agents/browser`), `workflows` (encodage, `getSchedulerNamespace`, `workflowExtensions`, `executeWithConnectorAuth`), `connectors`, `structChat`.
- **Service account** côté Node : même ordre de résolution qu'en Python ; erreur `UnexpectedClientError` (avec `cause`) si le fichier est illisible.
- **Migration v2 → v3** (MIGRATION.md) : mêmes ruptures fonctionnelles que Python + `OutboundAuthenticationType`/`InboundAuthenticationType` → `AuthenticationType` (`oauth2`, `bearer`, `none`, `github_app`, `slack_app`) ; `callTool()` déprécié au profit de `mcpClient()`/`httpClient()` ; `continuedRunId`, `firstExecutionRunId`, `scheduleId` deviennent `string | null | undefined` ; classes renommées (`WorkflowsRuns`, `DatasetsRecords`) ; `audio.voices.list()` déprécié pour `search()`.
- **JSR** : le dépôt contient un `jsr.json` (`@mistralai/mistralai` 3.1.0) ; sur JSR, le paquet existe (créé le 21/12/2024) mais **0 version publiée**.
- **`@mistralai/mistralai-azure`** et **`@mistralai/mistralai-gcp`** : 2.0.0 (25/05/2026), 17 versions chacun, source `client-ts/packages/mistralai-azure|gcp`, dépendances `zod ^4.3.6` (+ `google-auth-library ^10.6.2` pour GCP). Le README racine les présente comme « dedicated SDKs for the following providers ».
- **`client-js`** (archivé) : README « This repository is now archived » ; remplacé par `client-ts` à partir de `@mistralai/mistralai` 1.0.0 ; dernière version JS : 0.5.0. Inspiré de `cohere-typescript`.

### 3.5 `mistral-common` (tokenizers, validation, serveur expérimental)

- **PyPI** `mistral_common` **1.12.0** (22/09/2026) ; 50 versions depuis le 17/04/2024 ; Python `>=3.10.0,<3.15` ; licence Apache-2.0 (`license_expression`) ; auteur `oss@mistral.ai`. Dépôt `mistral-common` actif (push du 21/10/2026), documentation MkDocs sur `mistralai.github.io/mistral-common`.
- **Rôle** : code open source de **tokenisation** (texte, images, audio, appels d'outils) et de **validation/normalisation** des requêtes (Pydantic), versionné pour garantir la rétrocompatibilité des modèles publiés. Cible : intégrer les modèles open-weights dans ses propres applications ou entraîner ses modèles avec le même pré-traitement.
- **Trois couches** : tokenizers bruts (`Tekkenizer` basé sur tiktoken, `SentencePieceTokenizer` désormais optionnel), `InstructTokenizer` versionné (chat, FIM), `MistralTokenizer` (validation + encodage, `MistralTokenizer.from_hf_hub(...)`, `encode_chat_completion(...)`).
- **`TokenizerVersion`** : `v1`, `v2` (`[INST]`), `v3` (function calling amélioré), `v7` (system prompt), `v11`, `v13` (suppression de la tokenisation des call ids, meilleur prompt caching ; *think chunks*), `v15` (réglages de modèle, ex. effort de raisonnement). Fichiers embarqués dans `src/mistral_common/data/` (`tekken_240718.json`, `tekken_240911.json`, modèles SentencePiece v1–v7m1).
- **Modules** : `protocol/` (`instruct`, `fim`, `transcription`, `speech`), `tokens/tokenizers/` (`audio`, `image`, `multimodal`, `tekken`, `instruct`, `model_settings_builder`), `guidance/` (grammaires `llguidance` + Jinja pour le décodage contraint des outils), `integrations/chat_templates` (génération de chat templates), `experimental/app` (serveur FastAPI).
- **Extras** : `image` (opencv), `audio` (soundfile, soxr), `hf-hub`, `sentencepiece`, `guidance` (`llguidance>=1.3,<1.4`, `jinja2`), `server` (FastAPI, pydantic-settings, click), `all`.
- **Serveur expérimental** : commande `mistral_common serve <tokenizer_path> [validation_mode] --host 127.0.0.1 --port 0 --engine-url http://127.0.0.1:8080 --engine-backend llama_cpp --timeout 60` ; modes de validation `test` (défaut), `finetuning`, `serving`, `agnostic` ; routes de tokenisation, détokenisation (vers `AssistantMessage` ou chaîne) et chat completion via un moteur (llama.cpp) ; accepte des requêtes au format OpenAI ; Swagger sur `/` ou `/docs`.
- Mention d'usage ajoutée au README : interdiction d'utiliser la bibliothèque ou les modèles en violation de droits de tiers.

### 3.6 SDK Workflows (`mistralai-workflows`), plugins, CLI de scaffolding, moteur Temporal

**Paquets** (tous Python, aucun dépôt GitHub public) :

| Paquet | Version (date) | 1re version | Nb | Python | Licence | Rôle |
|---|---|---|---|---|---|---|
| `mistralai-workflows` | 3.16.0 (15/10/2026) | 2.0.0rc1 (15/01/2026) | 47 | `>=3.12,<3.15` | Apache-2.0 | SDK worker : décorateurs, client, `run_worker`, encodage, observabilité |
| `mistralai-workflows-plugins-mistralai` | 3.16.0 (15/10/2026) | 27/01/2026 | 42 | `>=3.12,<3.15` | Apache-2.0 | Activities Mistral (chat, embeddings…), agents durables, sessions, MCP, outils, composants UI Le Chat |
| `mistralai-workflows-plugins-evaluations` | 0.6.3 (29/09/2026) | 19/08/2026 | 7 | `>=3.12,<3.15` | Apache-2.0 | Évaluations en activities Temporal parallèles |
| `mistralai-workflows-plugins-search` | 0.3.0 (12/10/2026) | 25/08/2026 | 3 | `>=3.12,<3.15` | **Proprietary** | Pipelines d'ingestion durables Search Toolkit (`IngestDocumentsWorkflow`, `IngestBatchWorkflow`, `pipeline_registry`, `DocumentRef`) ; URL de doc interne `docs-internal-frameworks.mistral.ai` |
| `mistralai-workflows-cli` | 1.3.0 (06/10/2026) | 20/03/2026 | 12 | `>=3.10` | non déclarée | `uvx mistralai-workflows-cli@latest setup` : scaffolding Copier (projet minimal ou cookbooks) |

**Dépendances de `mistralai-workflows` 3.16.0** : **`temporalio>=1.29.0,<1.30.0`** (la dernière version de `temporalio` sur PyPI est 1.34.0, licence MIT), `mistralai>=2.9.3,<3.0.0`, `pydantic>=2.12`, `pydantic-settings`, `opentelemetry-api/-sdk/-exporter-otlp-proto-http` + `opentelemetry-instrumentation-httpx`, `structlog<26`, `orjson`, `httpx<1`, `jsonpatch`, `libcst`, `pyjwt`, `tenacity`, `asynciolimiter`, `starlette>=1.3.1`, `requests`, `urllib3`.

**Extras** : `mistralai` (plugin Mistral + `mcp<2.0.0,>=1.27.2` + `aiocache`), `evaluations`, `webhook` (→ `mistralai-workflows-plugins-webhook`, introuvable sur PyPI), `s3`/`gcs`/`azure`/`storage` (→ extras d'offloading de `mistralai`), `compression`, `encryption`, `all`, `all-plugins`.

**Plugin Mistral** (`mistralai-workflows-plugins-mistralai` 3.16.0) : dépend de `mistralai[agents]>=2.0.0,<3.0.0`, `mistralai-workflows>=3.0.0a1,<4`, `mcp>=1.27.2`, `authlib>=1.7.2`, `aiocache`, `starlette`, `structlog`. Fonctions citées : `mistralai_chat_stream`, `mistralai_chat_complete`, `ChatCompletionRequest`, `UserMessage`, `Agent`, `Runner`. Exemples référencés (module `mistralai_workflow_tests.examples.assist.*`) : `workflow_multi_turn_chat`, `workflow_insurance_claims`, `workflow_local_session_streaming`, `workflow_travel_agent_streaming`, `workflow_with_agent`, `workflow_extract_markdown`, `workflow_embeddings`.

**Lien avec Temporal (faits)** :
- Doc : « Durable execution is powered by Temporal » ; mode **hybride** : Mistral héberge l'orchestrateur, le code des workflows/activities tourne chez le client (workers).
- Variables d'environnement du SDK préfixées `TEMPORAL_` : `TEMPORAL_PAYLOAD_ENCRYPTION__MODE`, `__MAIN_KEY`, `__SECONDARY_KEY` ; `TEMPORAL_PAYLOAD_COMPRESSION__MIN_SIZE_BYTES`, `__ALGORITHM_CONFIG__ALGORITHM`, `__LEVEL` ; `TEMPORAL_PAYLOAD_OFFLOADING__STORAGE_CONFIG__*`.
- Rate limiting : chaque clé de limite distincte crée un **worker Temporal interne** supplémentaire ; un processus = 1 worker principal + 1 worker « sticky-activity » + 1 par clé, chacun avec 5 pollers workflow + 5 pollers activity (0 clé → 20 pollers ; 5 clés → 70 ; 12 clés → 140), soumis au quota de pollers concurrents du *namespace*.
- Le plugin d'évaluations fait de chaque record un *child workflow* et des tâches/scorers des activities.
- Le helper `get_scheduler_namespace` appelle `GET /v1/workflows/workers/whoami`, dont la réponse (`WorkerInfo`) contient `scheduler_url` et `namespace`, et renvoie le `namespace` (inférence : URL du frontend Temporal hébergé et namespace dédié au workspace).
- Déploiements gérés : backend `mistral_cloud` (anciennement `koyeb`) ; `DeploymentResourceConfig` ne garde que `replicas` (SDK v3).

**README PyPI de `mistralai-workflows`** (exemple fourni, ≤ 15 lignes, montre l'API « style Temporal ») :

```python
from mistralai.workflows import workflow, activity

@activity
async def get_weather(city: str) -> str:
    return f"Weather in {city}: Sunny"

@workflow.define
class WeatherWorkflow:
    @workflow.run
    async def run(self, city: str) -> str:
        return await workflow.execute_activity(
            get_weather, city, start_to_close_timeout=timedelta(seconds=10))
```

La doc actuelle utilise une autre forme (`@workflows.activity()`, `@workflows.workflow.define(name=..., workflow_display_name=..., workflow_description=...)`, `@workflows.workflow.entrypoint`, appel direct de l'activity, `discover_workflows()` + `run_worker(...)`) — voir § 8.

**CLI `mistralai-workflows-cli`** (dépendances `click>=8`, `copier>=9`, `rich>=13` ; wheel de 0,84 Mo contenant les templates) : `uvx mistralai-workflows-cli@latest setup` génère `my-workflow` par défaut (`src/workflows/hello.py`, `src/entrypoints/worker.py`, Makefile `make start-examples`, `make execute-cargo-release`…), demande une clé API. Cookbooks proposés : `cargo-release-compliance` (validation humaine, sous-workflows, sorties structurées), `insurance-claims-triage` (activities parallèles, retries, routage déterministe), `code-modernization` (sous-workflows parallèles, validation syntaxique, approbation), `linear-summarization` (connecteurs, retry policies, human-in-the-loop).

### 3.7 Évaluation et observabilité : `mistralai-evaluations`, plugin Workflows, `mistralai-otel-observability`, télémétrie du SDK

**`mistralai-evaluations`** 0.8.4 (29/09/2026, 1re version 19/08/2026, 7 versions, Python ≥ 3.12, Apache-2.0, `4 - Beta`) — « Mistral AI Studio evaluation tools ». Dépendances : `mistralai>=2.7.1,<3.0.0`, `pydantic>=2`, `structlog>=24`, `colorama`. Namespace `mistralai.evaluations`.
- API : `await client.evaluation.run(project=Project(name=...), evaluation=Evaluation(name=...), dataset=[...] | Dataset(slug=...) | Dataset(id=...), task=..., evaluators=[Evaluator(name=..., scorer=...)], run_evaluators=[RunEvaluator(name=..., scorer=lambda ctx: ...)])` ; `run.show(level="scores")`, `run.run_scores`.
- Datasets Studio gérés : résolution de tous les records (jusqu'à **10 000**) avant le run ; exactement un de `id`/`slug` ; le slug ne crée jamais de dataset.
- `RunEvaluatorContext` : `records`, `statistics`, `metrics`, `metadata`. Helper `get_score(record, evaluator_name, aggregate=None)` → `Score(value, rationale, metadata)` (erreur si plusieurs générations sans `aggregate`).
- `client.evaluation.retry_failed_records(run_id=..., dataset=..., task=..., evaluators=...)` → `retried_count`, `patched_count` ; recalcul des run evaluators.
- Publication (README) : version dérivée du tag `evaluations-sdk/vX.Y.Z` via `uv-dynamic-versioning` ; workflow GitHub « Release Evaluations SDK » publiant sur PyPI (trusted publisher OIDC), **Gemfury** (interne) et **Cloudsmith** `mistral-ai/sdk-distribution` (préversions clients) ; branches `mais-*` pour les lignes de patch on-prem ; miroir TypeScript `ts/packages/local-observability-sdk/` non publié.

**`mistralai-workflows-plugins-evaluations`** 0.6.3 : « run evaluations as parallel Temporal activities » ; dépend de `mistralai-evaluations>=0.8.4` et `mistralai-workflows>=3.8.0,<4`. Doc : même API `evaluation.run()`, chaque record en child workflow, retries automatiques par tâche et par scorer, décorateurs `@evaluation.scorer` / `@evaluation.run_scorer` (chacun devient une activity avec timeout, retries et concurrence propres) ; découverte automatique par le worker ; nécessite `MISTRAL_API_KEY` côté worker. Les évaluations hors ligne sont réservées aux organisations **Enterprise**.

**`mistralai-otel-observability`** 0.4.1 (21/10/2026, 6 versions depuis le 25/09/2026, Apache-2.0, `4 - Beta`) — « OTLP-first Mistral AI observability SDK », **non mentionné dans la doc publique**. Namespace `mistralai.observability.otel`. Dépendances : `opentelemetry-api/-sdk/-exporter-otlp-proto-http` ; extras `grpc`, `mistral` (`mistralai>=2.5.2,<3`).
- Providers OTel **privés** (n'appelle jamais `set_tracer_provider`, `set_meter_provider`, ni `logging.basicConfig`).
- `observability.configure(ObservabilityConfig(service_name, endpoint, protocol="http/protobuf"|"grpc", headers, sampler))` ou `observability.configure_mistral(service_name, service_version, api_key=MISTRAL_API_KEY)` → `https://api.mistral.ai/telemetry/v1/traces|metrics|logs` ; `observability.flush()`, `observability.shutdown()`.
- `observability.operation(genai.OPERATION_NAME_CHAT, model=..., provider=genai.PROVIDER_NAME_MISTRAL_AI, include_content=False par défaut, features=Features(sensitive_data=..., moderation=..., judges=[...]))` ; méthodes `completion(...)`, `mistral_completion(response, messages=...)`, `inference_details(...)`, `evaluation_result(...)`, `log(...)`, `event(...)`, `span(...)`, `set_attribute(s)` ; spans spécialisés `observability.agent(...)` (`invoke_agent`, `remote=True` → span CLIENT), `create_agent(...)`, `tool(...)` (`execute_tool`), `plan(...)` ; pas encore de span `invoke_workflow`.
- Signaux émis : spans GenAI ; logs `gen_ai.client.inference.operation.details`, `gen_ai.evaluation.result` ; métriques `gen_ai.client.operation.duration`, `gen_ai.client.token.usage`, `gen_ai.client.operation.time_to_first_chunk`, `gen_ai.client.operation.time_per_output_chunk`, `gen_ai.invoke_agent.duration`, `gen_ai.execute_tool.duration`. Non modélisés : embeddings, retrieval, memory, workflow spans, métriques serveur.
- Émission différée/rejouable : spans reconstruits avec `trace_id`/`parent_span_id`/`span_id` 16-hex stables pour déduplication côté backend.
- Caviardage par défaut `RegexRedactionPolicy` (emails, numéros type carte, IPv4, jetons secrets) ; `operation_data_transformers=[]` pour désactiver.
- Module `mistralconv` : conversion messages Mistral ↔ `gen_ai.input/output.messages` (champs `mistral.*` pour l'extension).
- Ligne de release distincte (`otel-observability-sdk/vX.Y.Z`) de l'ancienne « AI Studio observability SDK » (`observability-sdk/vX.Y.Z`) ; validation d'un environnement GitHub `observability-publish` avant publication.

### 3.8 Search Toolkit et plugins, `search-starter-app`

**Paquets** (versions alignées « lockstep » 0.0.14 du 18/09/2026 sauf Qdrant) :

| Paquet | Version | 1re version | Python | Rôle / dépendances clés |
|---|---|---|---|---|
| `mistralai-search-toolkit` | 0.0.14 | 21/05/2026 | `>=3.12,<3.15` | Cœur : ingestion, retrieval, reranking, embedders, stockage abstrait. Dépend de `mistralai>=2.9.1,<3`, `mistral-common[sentencepiece]>=1.10,<2`, `pypdf`, `striprtf`, `dynaconf`, `aiofiles`, `opentelemetry-api` |
| `mistralai-search-toolkit-plugins-vespa` | 0.0.14 | 22/05/2026 | `>=3.12` | Backend Vespa ; `pyvespa<=1.2.1`, `docker`, `kubernetes`, `typer` ; CLI `mistral-vespa` |
| `mistralai-search-toolkit-plugins-postgres` | 0.0.14 | 31/08/2026 | `>=3.12,<3.15` | PostgreSQL + pgvector ; `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `pgvector` ; CLI `mistral-postgres ddl` |
| `mistralai-search-toolkit-storage-s3` / `-gcs` / `-azure` | 0.0.14 | 21/05/2026 | `>=3.12,<3.15` | `ObjectStorage` (`S3BlobStorage`…) ; `aioboto3`/`boto3`, `gcloud-aio-storage`, `azure-storage-blob` |
| `mistralai-search-toolkit-plugins-qdrant` | 0.1.5 (09/09/2026) | 09/09/2026 | `>=3.12` | **Publié par Qdrant** (`info@qdrant.tech`, dépôt `qdrant-labs/mistral-qdrant-plugin`) ; `qdrant-client>=1.19` |

**Extras du cœur** : `extractor-pymupdf` (→ **`pymupdfpro`**, licence commerciale Artifex), `extractor-email` (`eml-parser`, `extract-msg`, `markdownify`), `extractor-spreadsheet` (`pandas~=3.0`, `python-calamine`, `numbers-parser`), `html-converter-markdownify`, `text-splitter-langchain` (`langchain-core~=1.4`), `language-detection-fasttext` (→ paquet absent de PyPI), `vespa`, `postgres`, `storage-s3/-gcs/-azure`, `all`.

**Architecture** (README + doc) : `Pipeline(loader, extractor, text_splitter, embedder, stores)` pour l'ingestion ; `QueryEngine(retriever=[VectorRetriever(client=store, embedder=...)])` pour la recherche ; `MistralEmbedder(client, model_name=MODEL_1024_EMBEDDING)` ; `RoutedPipeline` ; extracteurs `MistralOCRExtractor`, `SmartPDFExtractor`, `PlainTextExtractor`, `PyMuPDFExtractor`, `HTMLExtractor`, `SpreadsheetExtractor`, `EmailExtractor`, `EmailWithAttachmentsExtractor`, `NumbersExtractor`, `LegacyOfficeExtractor`, `MistralAudioTranscriptionExtractor` ; splitters `CharacterTextSplitter`, `TokenTextSplitter`, `MarkdownTextSplitter`, `ParagraphTokenTextSplitter`, `MarkdownTokenTextSplitter`, `SeparatorTextSplitter` ; rerankers `LLMReRanker`, `CrossEncoderReRanker`, `RRFRanker` ; `LLMQueryRewriter`, `LLMQueryExtension` ; `SemanticCache` + `InMemoryCacheBackend`. Namespace `mistralai.search.toolkit.*`.

**Plugin Vespa** : `mistral-vespa generate-migration --app-dir ./vespa_app initial_schema` → classe `VespaMigration` (`set_app_name`, `create_default_schema(name, mode=SearchMode.INDEX, embedding_dimensions=1024, schema_version=1)`) ; `mistral-vespa local up --query-port 18080 --config-port 19171 --name vespa-dev` (Docker) ; `mistral-vespa migrate ...` génère un module `vespa_app` importable ; `VespaClientConfig(endpoint=...)` ou `query_endpoint`/`feed_endpoint` séparés. Le mode *streaming* de Vespa exige un `group_id` dans le contexte (isolation par tenant) et lie `query_params` au `yql_filter`.

**Plugin Postgres** (README très détaillé) :
- `PostgresStoreIndex` implémente `VectorStoreIndex` (dense + hybride), `NavigableIndex` (`navigate`/`read`/`grep`/`get_chunk`), `PatchableIndex` ; **aucun backend n'implémente `KeywordStoreIndex`**.
- Hybride : BM25 sur `content` via l'extension **`pg_textsearch`** (Timescale ; doit être dans `shared_preload_libraries`) + vecteur HNSW (`halfvec_cosine_ops`, `m=16`, `ef_construction=64`), fusion **RRF pondérée** `score = w_vector/(k + rank_vector) + w_text/(k + rank_text)`, défaut **`rrf_k=4`**, poids égaux ; `PostgresSearchQuery(vector_weight, text_weight, rrf_k)`. Benchmarks internes cités (78 341 chunks, 150 questions) : BM25 médiane 14,6 ms vs `tsvector`+`ts_rank` 194 ms à rappel équivalent.
- `max_candidates` → `hnsw.ef_search` (1..1000, relevé à `top_k`) ; pgvector ≥ 0.8 recommandé (`hnsw.iterative_scan`).
- Dégradation silencieuse en dense seul si l'index BM25 est absent/INVALID, avec log ERROR à chaque requête ; `lexical_ranking_resolved`.
- **Pas d'isolation multi-tenant dérivée du contexte** (contrairement à Vespa) : « isolate tenants with a collection (and therefore a table) per tenant ».
- Le plugin n'exécute jamais `CREATE EXTENSION` (rôle applicatif à moindre privilège) ; erreurs `MissingVectorExtensionError`, `MissingBM25AccessMethodError` ; contraintes `CHECK (length(col) <= n)` ; `PostgresApp.create_schema`, `render_ddl`.

**Plugin Qdrant** (tiers) : `QdrantApp`, `QdrantCollectionSchema(collection_name, document_type, embedding_model=CustomEmbeddingModel(name, dimensions))`, `QdrantConnectionConfig(url, api_key)`, `QdrantSearchQuery(embedding, query, top_k)` (hybride RRF), `patch_chunk`/`patch_document`, `QdrantField`.

**`search-starter-app`** (GitHub, MIT, template **Copier**, `copier copy gh:mistralai/search-starter-app my-search-project`) :
- Questions : `backend` (`vespa` = hybride BM25 + vecteur, défaut ; `postgres` = pgvector), `mistral_api_key` (secret, écrit dans `.env`), `collection_name` (défaut `exampledocs`, regex `^[a-z][a-z0-9_]*$`, ≤ 34 caractères en Postgres), `deployment_name` (nom du déploiement Workflows, `DEPLOYMENT_NAME`). Ports par défaut `18080`/`19072`.
- Projet généré : `entrypoints/ingest.py`, `search.py`, **`mcp_server.py`** (FastMCP ; outils `search`, `ingest`, `delete`, `open`, `navigate`, `read`, `grep`), `search_app/` (VespaApp/PostgresApp), migrations Vespa ou Alembic (Postgres), `examples/workflows/worker.py` (enregistre `IngestDocumentsWorkflow`, `IngestBatchWorkflow` du plugin propriétaire `mistralai-workflows-plugins-search`, pipelines `plain-text` et `ocr` + routeur `default`) et `start.py` (workflow `search-ingest-documents`), skill d'agent `.agents/skills/search/`, `.mcp.json` et `.vibe/config.toml` (serveur MCP stdio `uv run python -m entrypoints.mcp_server`), cibles `make setup-vespa`, `make ingest`, `make search`, `make bruno`, `make migrate`, `make test`.
- Dépendances générées : `mistralai-search-toolkit[text-splitter-langchain,vespa|postgres]==0.0.14` (épinglé), `mistralai-workflows-plugins-search>=0.2.0,<1`, `mistralai-workflows[mistralai]>=3.0.0,<4`, `fastmcp>=3.3.1` ; `[tool.uv] exclude-newer = "7 days"` et `index-strategy = "unsafe-best-match"` (commentaire : un index Gemfury via `UV_EXTRA_INDEX_URL` peut lister des versions plus anciennes).

### 3.9 Mistral Vibe (`mistral-vibe`) et paquets satellites (Vibe SDK, Task protocol, Harness)

**Dépôt `mistral-vibe`** (Apache-2.0, « Copyright 2025 Mistral AI », 5 177 ★, 413 tickets ouverts) — « Mistral's open-source CLI coding assistant ». HEAD cloné : v3.0.1 (20/10/2026). PyPI `mistral-vibe` **3.0.1** (20/10/2026 14:16 UTC), **94 versions** depuis 0.0.0 (17/11/2025) ; classifier `5 - Production/Stable` ; Python **≥ 3.12** (build avec GIL obligatoire ; la v3.0.1 a abaissé l'exigence de 3.14 à 3.12).

**Distribution** : wheels **natives** `cp312-abi3` pour macOS arm64/x86_64, manylinux x86_64/aarch64 et Windows amd64 (36 à 69 Mo) + sdist (3,2 Mo) ; build `maturin` (backend local `build_backend/`), module natif `mistralai_vibe_local_harness._native`, binaire Rust de la TUI dans `vibe/_bin/`. Points d'entrée : `vibe` (`vibe.cli.launcher:main`), `vibe-acp` (`vibe.acp.entrypoint:main`), `vibe-app-server` (`vibe.app_server.stdio:main`). Installation : `curl -LsSf https://mistral.ai/vibe/install.sh | bash` (Linux/macOS), `uv tool install mistral-vibe`, `pip install mistral-vibe`, Homebrew (mentionné pour les mises à jour), extra `voice-aarch64` (wheel `miniaudio` construit en interne). Dépendances **épinglées exactement** (100 entrées hors extras), dont `mistralai==2.6.0`, `mcp==1.28.1`, `agent-client-protocol==0.11.0`, `textual==8.2.8`, `opentelemetry-*==1.39.1`, `sentry-sdk==2.64.0`, `tree-sitter-bash`, `keyring`, `gitpython`, `croniter`, `google-auth` (backend Vertex).

**Architecture** (AGENTS.md, 18 ADR dans `docs/adr/`) :
- `vibe/cli-rust` : TUI native en Rust (**Ratatui**), client léger de `vibe-app-server`.
- `vibe/app_server` : héberge les sessions, expose les fonctionnalités produit et les RPC (protocole documenté dans `docs/reference/app-server-protocol.md`).
- **Unified Harness Core et Runtime** (`harness/core`, crate `mistralai-unified-harness`, édition Rust 2024, dépendances `deno_core`/`deno_ast` — exécution TypeScript pour l'outil `run_typescript` —, bindings `pyo3` et `napi`) : contexte déterministe, transitions légales et planification (Core) ; contenu, exécution, ordonnancement, annulation, approbations, persistance et reprise d'une session (Runtime).
- `vibe/core` : config, outils, permissions, LLM (`backend/`: `mistral`, `anthropic`, `openai_responses`, `vertex`, `generic`), compaction, skills, hooks, télémétrie, `teleport` ; `vibe/acp` : pont ACP ; `vibe/setup` : authentification + assistant d'onboarding Textual (`vibe-acp --setup`).
- ADR notables : 0004 outils typés et permissionnés, 0005 configuration en couches, 0006 sessions locales, 0007 mécanismes d'extension (skills, agents, sous-agents, hooks, MCP, connecteurs), 0008 instrumentation, 0009 frontière app-server, 0014 compatibilité de contrat backend (auto-hébergement), 0015 politique TLS, 0016 TUI Rust, 0018 capacités modulaires de l'app-server.

**Fonctionnalités relevées dans le README** (détail produit : chapitre 21) :
- Agents intégrés : `ask`, `accept-edits` (défaut), `auto-approve` ; `lean` si listé dans `installed_agents` ; sous-agent `explore` (lecture seule) ; agents personnalisés TOML dans `~/.vibe/agents/` ou `.vibe/agents/`.
- Outils : lecture/écriture/édition de fichiers (`read_file`, `write_file`, `edit`/`search_replace`), shells gérés (`bash`, `bash_output`, `bash_stdin`, `bash_sessions`, `bash_log_file` ; variantes `git_bash_*` et `powershell_*` sous Windows, déploiement piloté par l'expérience GrowthBook `vibe_cli_managed_shell_tools`), `grep` (ripgrep), `todo`, `ask_user_question`, `task` (sous-agents), `web_fetch`, `web_search`, `skill`, `cron` (`/loop`), `run_typescript`.
- Mode programmatique `vibe -p` : `--max-turns`, `--max-price`, `--max-tokens`, `--agent`, `--auto-approve`/`--yolo`, `--enabled-tools`/`--disabled-tools` (glob ou `re:`), `--output text|json|streaming`, `--prompt-file`, `--time-limit`, `--output-dir` (écrit `export.json` + journal). Codes de sortie : `0` `finished` ; `1` `usage_error`/`config_error` ; `2` `infrastructure_failure` ; `3` `turn_limit`/`token_limit`/`price_limit`/`deadline`/`terminated`/`length`/`refusal` ; `4` `aborted`.
- **Agent socket** (expérimental, caché) : `vibe -p --agent-socket PATH` ; JSON-RPC 2.0 sur socket Unix (une ligne par requête, camelCase) ; méthodes `agent/initialize` (`protocolVersion: 2`, `workspace`, `python`, `tools`, `toolTimeoutSeconds` défaut 600, `instructions`), `sandbox/execute`, `sandbox/readFile`, `tools/call` ; codes `-32001` (timeout de commande), `-32002` (abandon par le serveur) ; `modelAccess` d'outil `direct|programmatic|both`.
- **`vibe run-server`** (expérimental) : nombreuses exécutions sur des app-servers partagés (`--runs-per-app-server` défaut 16, `--max-runs`), JSON-RPC sur stdin/stdout (`initialize`, `run/start`, `run/stop`, `ping`, notification `run/ended`), `credentials` en mémoire et caviardés.
- Configuration : `./.vibe/config.toml` puis `~/.vibe/config.toml` ; `VIBE_HOME` ; clé dans `~/.vibe/.env` ; domaines personnalisés (`browser_auth_base_url`, déploiements compatibles Mistral) ; `enable_system_trust_store` ; OpenTelemetry (`enable_otel`, `otel_endpoint`, `otel_redaction = "default"|"strict"|"none"`) ; `enable_telemetry = false` désactive télémétrie d'usage et rapports de crash ; `enable_update_checks`, `enable_notifications` ; prompts système/compaction/titre personnalisés (`system_prompt_id`, `compaction_prompt_id`, `title_prompt_id`).
- MCP : `vibe mcp add <name> --url ... --transport streamable-http|http|stdio [--api-key-env ...]`, OAuth par défaut pour les serveurs distants, `/mcp`, `/connectors` (connecteurs du workspace) ; outils MCP nommés `{server}_{tool}`.
- Hooks (`.vibe/hooks.toml`, `~/.vibe/hooks.toml`) : `pre_tool`, `post_tool`, `post_agent` ; JSON sur stdin, décision `allow|deny`, réécriture d'arguments.
- Skills (spec agentskills.io) : `.agents/skills/`, `.vibe/skills/`, `~/.vibe/skills/`, `~/.agents/skills/`, `skill_paths` ; `user-invocable`, `disable-model-invocation`.
- Sessions : `--continue`, `--resume [ID]`, `--workdir`, `--add-dir`, `--worktree [NAME]` (worktrees sous `$VIBE_HOME/worktrees/`, branches `vibe/<name>` « matching the worktrees Le Chat Desktop creates »), `--teleport`.
- Éditeurs : `vibe-acp` pour Zed (extension « Mistral Vibe Zed ACP agent » ; `distribution/zed/extension.toml` pointe vers des archives `vibe-acp-<plateforme>-3.0.1` des releases GitHub), JetBrains (AI Assistant ≥ 2025.3), autres clients ACP.
- **GitHub Action** (`action.yml` à la racine) : action composite « Mistral Vibe » ; entrées `prompt` (obligatoire), `MISTRAL_API_KEY` (« API Key for AI Studio »), `install_python`, `python_version` ; exécute `vibe -p "$PROMPT_INPUT"` via `uv`.
- Skills internes du dépôt (`.agents/skills`, `.vibe/skills`) : `vibe-async`, `vibe-ci-supply-chain`, `vibe-cross-platform`, `vibe-python-style`, `vibe-rust-tui`, `create-vibe-feature`, `instrument-feature-analytics`, `write-vibe-adr`, `write-vibe-design-doc`, `write-vibe-tests`.
- Collecte de données : soumise à la politique de confidentialité Mistral ; dépendance `sentry-sdk` (rapports de crash).
- Changements 3.0.1 notables : réglage administrateur `enable_auto_approve = false` (interdit le mode YOLO) ; méthodes app-server expérimentales `session/subagents/wait|interrupt|read` ; coût des sous-agents au tarif de leur modèle ; sorties d'outil > ~16 000 caractères sauvegardées en fichier ; timeout bash par défaut 120 s (max 300).

**Paquets satellites sur PyPI (sans dépôt public)** :

| Paquet | Version (date) | Nb / depuis | Licence | Contenu |
|---|---|---|---|---|
| `mistralai-vibe-sdk` | 0.14.4 (13/10/2026) | 19 / 09/04/2026 | non déclarée | « High-level Python interface for running Vibe agents » : `Agent`, `AgentConfig(completion=MistralCompletionConfig(model=...), system_prompt, skills, mcps)`, `agent.session()`, `run_to_completion()`, `run()` (événements `TaskStateUpdateEvent` en JSON Patch, `TaskResultEvent`), `@tool(name, description, input_schema)`, `ToolResult(value, annotations)`, `SkillDefinition`, MCP `StdioMcpConfig(env_key_names, timeout_ms)`, `HttpMcpConfig(url, scoped_headers` avec gabarits `{{ENV_VAR}}`, `timeout_ms=30000`, `sse_read_timeout_ms=300000)`, `ConnectorMcpConfig(connector_id_or_name, credentials_name, transport=ConnectorMcpSdkTransport \| ConnectorMcpDirectTransport(base_url, origin_service, scoped_headers, mcp_path_template="/connectors-gateway/{{connector_id}}/mcp"))`. Extras `telemetry`, `workflow` (`mistralai-workflows>=3.1.0`). |
| `mistralai-vibe-protocol` | 0.3.2 (05/05/2026) | 7 / 08/04/2026 | non déclarée | « Task protocol » : `AgentTask`, `ToolTask`, `TaskState`, `PendingOutput`, `MessageEntry` ; port `CompletionModel` + `MistralAdapter` ; `ExecutionLoop`, `produce()`/`diff()` façon Immer, JSON Patch RFC 6902 + `AppendOp` ; spécification `documentation/protocol_2026_04_07.md`. Extra `workflow`. |
| `mistralai-vibe-local-harness` | 0.5.1 (18/09/2026) | 10 / 07/09/2026 | non déclarée | « Local Unified Harness runtime and native bindings for Vibe » ; wheels natives seulement (≈ 24 Mo, 5 plateformes), pas de sdist ; `mistralai>=2.6.0,<3`, `mcp<2`. |
| `mistralai-vibe-harness` | 0.1.10 (21/10/2026) | 11 / 10/09/2026 | **Proprietary** | « Mistral Vibe Harness runtime & bindings » ; wheels natives seulement ; extras `observability` (`mistralai-otel-observability>=0.4.1`), `workflows` (`mistralai-workflows>=3.10.0`). |

### 3.10 CLI `mistral`, « Mistral Apps » et paquets `mistralai-capabilities`

- **Dépôt `cli`** (Apache-2.0) : héberge **uniquement les binaires** ; README : la source vit dans le monorepo `mistralai/dashboard` sous `ts/cli/mistral` et chaque release y est construite. Dernière release : **`cli/v0.10.0`**. Commit le plus récent : « sync mistral CLI public repo files from dashboard @ e2fe169… » (14/10/2026).
- Installation : `curl -fsSL https://mistral.ai/cli/install.sh | bash` (redirige vers `raw.githubusercontent.com/mistralai/cli/main/install.sh`) → `~/.mistral/bin/mistral` ; vérification SHA-256 via `checksums.txt` ; variables `MISTRAL_INSTALL_DIR`, `MISTRAL_VERSION` (format `X.Y.Z`), `MISTRAL_INSTALL_BUN=0|1`. Plateformes : `mistral-darwin-arm64`, `mistral-darwin-x64`, `mistral-linux-x64`, `mistral-linux-arm64` (pas de binaire Windows). Complétions `mistral --completions bash|zsh|fish`. Mise à jour = réinstallation ; releases immuables.
- **`mistral apps`** nécessite **Bun** (l'installeur propose d'installer la version de Bun avec laquelle la CLI est construite).
- **npm `@mistralai-capabilities/*`** (12 paquets, tous **0.1.40** du 21/10/2026, Apache-2.0, mainteneur `mistralai-bot`, README quasi vides) : `base-core`, `registry`, `backend-fastapi`, `backend-workflows`, `database-postgres`, `deployment-apps`, `deployment-apps-fastapi`, `feature-fastapi-postgres`, `feature-fastapi-tanstack-start`, `feature-fastapi-workflows`, `feature-observability`, `frontend-tanstack-start`. `registry` : « descripteur de registre » (`registry.json`) que `mistral apps` installe depuis npm pour découvrir les capabilities publiques et leurs sources. Plusieurs portent la description « Temporary package placeholder for staged publishing ».
- **PyPI `mistralai-capabilities-*`** (4 paquets, 0.1.40 du 21/10/2026, Apache-2.0, Python `>=3.12,<3.15`) : `-backend-fastapi` (chargeur de routes par fichiers, runtime de hooks, encodage SSE, commande `gen-openapi` ; extra `fastapi>=0.143.0`), `-backend-workflows` (« SDK execution boundary » ; dépend de `mistralai[workflow-payload-encryption]>=2.9.4` et `mistralai-workflows>=3.15.0`), `-deployment-apps` (jeton d'appelant injecté par la passerelle Mistral Apps, middleware, câblage hôte : les appels API Mistral de l'app consomment le crédit de l'appelant), `-feature-observability` (`mistralai[telemetry]>=2.9.4,<3`).
- Le serveur MCP hébergé expose une capacité **« Apps »** : lister les apps, lire modules, environnements, versions en cours, *deploy runs*, logs de module/passerelle, redéployer ou revenir à une version déjà exécutée, publier/dépublier dans le catalogue (valeurs des variables d'environnement jamais renvoyées) ; disponible seulement pour les workspaces où la fonction est activée.
- (inférence) Pile d'une « Mistral App » : backend FastAPI + front TanStack Start + Postgres + Workflows + observabilité, déployée derrière une passerelle Mistral.

### 3.11 MCP : serveur hébergé, clients MCP dans les SDK, serveurs d'exemple

- **Serveur MCP Mistral (service fermé)** : endpoint `https://api.mistral.ai/mcp`, transport Streamable HTTP, `Authorization: Bearer <MISTRAL_API_KEY>` (clé à portée workspace). Capacités : Apps, Connectors, Documentation (recherche et lecture de docs.mistral.ai en Markdown), Evaluations, Libraries, Observability (traces/spans/logs), Organization, Skills, Workflows (lister, déployer des workflows gérés, démarrer/signaler des exécutions, événements, logs, schedules). Configurations documentées pour Vibe (`vibe mcp add mistralai --url https://api.mistral.ai/mcp --transport streamable-http --api-key-env MISTRAL_API_KEY`), Claude Code, Codex, clients JSON (Cursor), curl (`tools/list`).
- **Clients MCP open source** : Python `mistralai.extra.mcp` (`MCPClientSTDIO`, `MCPClientSSE`, client streamable HTTP, OAuth avec découverte `.well-known` et *dynamic client registration*), `RunContext.register_mcp_clients(...)` ; passerelle connecteurs `beta.connectors.mcp_client()` ; TS : dépendance `@modelcontextprotocol/sdk` et `beta.connectors.mcpClient()`. Exemples `examples/mistral/mcp_servers/{stdio_server,sse_server}.py`, `async_conversation_run_mcp*.py`.
- **Serveurs MCP d'exemple** : `search-starter-app` (FastMCP, outils de recherche/navigation/ingestion) ; cookbook `mistral/lechat_custom_mcp_server` (serveur MCP personnalisé pour Le Chat, exemple tic-tac-toe).
- Aucun dépôt public de serveur MCP « officiel » (noms `mcp`, `mistral-mcp` inexistants).

### 3.12 Cookbook

- Dépôt `cookbook` (**MIT**, 2 349 ★, 607 fichiers, **118 notebooks**), site Quarto (`_quarto.yml`, `index.qmd`, `cookbooks.qmd`), sous-module `static/cookbooks` du dépôt de documentation (publié dans la section « cookbooks » de docs.mistral.ai).
- Dossiers : `mistral/` (`agents` : `agents_api`, `glm_code_modernizer`, `glm_game_generator`, `non_framework` ; `audio` : `realtime-fact-checker`, `sts_demo.py` ; `connectors` : 01 *database advisor agent* (connecteur DeepWiki), 02 *quickstart generator* (+ version TypeScript), 02–07 guides `connectors-in-conversations-and-agents`, `connectors-tool-calling`, `human-in-the-loop-confirmation`, `connectors-in-completions`, `multiple-authentication`, `connectors-in-workflow` ; `data_generation`, `embeddings`, `evaluation`, `function_calling`, `image_understanding`, `lechat_custom_mcp_server`, `moderation` (dont `shieldstral_policy_moderation.ipynb` : modération par politique avec Shieldstral, classifieur de sécurité open-weights), `observability` (`llm_judge_campaign_workflow.ipynb`, `manage_datasets.ipynb`), `ocr`, `prompting`, `rag`, `deprecated_cookbooks` (agents, classifier_factory, data_generation, fine_tune, function_calling, ocr)) ; `concept-deep-dive/` (prompting, quantization, sampling, tokenization) ; `third_party/` (**35** intégrations : Argilla, Azure AI Search, CAMEL-AI, Chainlit, ChromaDB, E2B, Gradio, Haystack, Indexify, LangChain, Langfuse, Langtrace, LlamaIndex, Maxim, Mesop, MetaGPT, Microsoft, Milvus, MLflow, MongoDB, AutoGen+pgsql, Neo4j, Neon, Ollama, OpenLIT, Panel, Phoenix, phospho, Pinecone, Pixeltable, PydanticAI, Solara, Streamlit, W&B, x-cmd) ; `skills/` (skills d'agent `check-stale-cookbooks`, `cookbook-review`).
- Cookbook « Connectors in Workflows » (statut **beta**) : blocs `connector(name)`, `@uses_connectors(slot, ...)`, `ToolCallClient` injecté via `Depends` ; OAuth déclenché automatiquement à l'exécution ; même workspace obligatoire pour la définition et l'exécution.

### 3.13 Inférence, fine-tuning, évaluations académiques (dépôts historiques)

- **`mistral-inference`** (archivé ; README : « Archived — no longer maintained », 16/06/2026) : code minimal pour exécuter les modèles (liens de téléchargement `models.mistralcdn.com` avec md5, tutoriels, `deploy/`). PyPI `mistral-inference` 1.6.0 (20/03/2025 ; dépend de `mistral_common>=1.5.4`, `xformers` — GPU requis à l'installation —, `safetensors`, `fire`, `simple-parsing`).
- **`mistral-finetune`** (archivé le 16/06/2026) : fine-tuning LoRA « memory-efficient », recommandé A100/H100, optimisé multi-GPU mono-nœud, opinions fortes sur le format de données. Sur PyPI, `mistral-finetune` n'existe qu'en **0.0.0** (14/05/2024, réservation de nom).
- **`mistral-evals`** (pas de licence) : évals `mm_mt_bench` (MM-MT-Bench, juge GPT-4o, nécessite `OPENAI_API_KEY`), `vqav2`, `docvqa`, `mathvista`, `mmmu`, `chartqa` ; exécution `python -m eval.run eval_vllm --model_name ... --url ... --output_dir ... --eval_name ...` contre un serveur vLLM, ou classe `Model` personnalisée.

### 3.14 Autres dépôts : Timestral, Leanstral/FLT, Mistral Compute, SageMaker, documentation

- **`timestral`** (créé le 15/10/2026, 722 ★ en 6 jours) : inférence autonome des modèles de séries temporelles Timestral (multivariés, covariables passées/futures/catégorielles, **21 quantiles**, contexte jusqu'à **32 768** pas, CPU possible ; tailles 5M, 28M, 123M, 209M). Code Apache-2.0 ; **poids sous « Modified MIT »** sur Hugging Face. Non publié sur PyPI : `pip install git+https://github.com/mistralai/timestral.git` (Python ≥ 3.10, torch ≥ 2.4).
- **`LeanstralSafeVerify`** (Apache-2.0) : fork de SafeVerify vérifiant qu'un fichier Lean soumis implémente une spécification (rejeu `Environment.replay`, axiomes autorisés `propext`, `Quot.sound`, `Classical.choice`, rejet `partial`/`unsafe`) ; utilisé pour l'entraînement d'agents de code et l'évaluation de Leanstral ; rapport technique `LeanstralReport.pdf`.
- **`FLTEval`** (Apache-2.0) : harnais d'évaluation Docker-only façon SWE-bench pour tâches Lean « FLT » (diffs soumis, vérifications Lean/SafeVerify, rapports par instance et agrégés) ; ne lance pas d'agents.
- **`nvsentinel-provider-mistral`** (Go, Apache-2.0, v0.1.2) : plugin « Janitor » de NVSentinel v1.26.0 pour redémarrer des nœuds **Mistral Compute** ; endpoint `https://console.mistralcompute.ai/api` ; rôle projet `nodes: {level: update, scope: all}` (`POST /v1/projects/<project>/roles`) ; identité de charge OIDC (audience `mistral-compute`, sujet `system:serviceaccount:nvsentinel:nvsentinel-provider-mistral`) ; chart Helm, cert-manager.
- **`mistral-compute-openapi`** et **`public-test`** : dépôts vides (README d'une ligne).
- **`sagemaker-docs`** (sans licence) : 3 notebooks (déploiement, OCR, fine-tuning de modèles Mistral sur AWS SageMaker), projet `mistral-sagemaker-docs` géré par `uv`.
- **`platform-docs-public`** (Apache-2.0, 135 forks) : source de docs.mistral.ai — Next.js 15 (App Router), MDX, Tailwind v4, pnpm ; référence API générée depuis OpenAPI par `@speakeasy-api/docs-md` ; contenu **anglais** (697 fichiers) et **français** (762 fichiers) sous `src/content/{en,fr}` ; `openapi-public-doc.yaml` (1,33 Mo, 232 chemins) **identique octet pour octet** à la spec locale utilisée par cette base ; archives de SDK dans `sdks/` (`client-python-1.9.11`, `client-python-3.2.0`, `client-ts-3.0.0`) ; `version.txt` = `v1.22.2` ; journal des changements `changelog/en/` (dernier fichier `2026-10-06.mdx`) ; `wrangler.toml` présent ; `CLAUDE.md` pour agents.

### 3.15 Forks

| Fork | Amont | Remarque |
|---|---|---|
| `vllm` (2026) / `vllm-release` (2023, archivé) | vLLM | serveur d'inférence ; fork récent poussé le 28/09/2026 |
| `transformers-release` | Hugging Face Transformers | dernier push 17/11/2025 |
| `TensorRT-LLM` | NVIDIA | figé depuis 02/2024 |
| `megablocks-public` (archivé) | MegaBlocks (MoE) | 865 ★ |
| `FastChat-release` (archivé) | FastChat (LMSYS) | 2023 |
| `llm-d-router-public` | llm-d inference scheduler | branche par défaut `mistral-main`, actif (20/10/2026) |
| `llm-d-kv-cache-manager-public`, `gateway-api-inference-extension-public` | llm-d / Kubernetes SIG | infrastructure d'inférence Kubernetes |
| `prom_client_python` | client Prometheus Python | — |
| `agent-client-protocol` | ACP (Zed) | Vibe dépend du paquet Python `agent-client-protocol==0.11.0` |
| `zed-extensions` | registre d'extensions Zed | référence `mistral-vibe` 2.10.0 (fork non resynchronisé) |

## 4. Interface utilisateur (lignes de commande, points d'entrée console)

| Commande / point d'entrée | Fourni par | Effet |
|---|---|---|
| `vibe`, `vibe "<prompt>"`, `vibe -p ...`, `vibe --setup`, `vibe --check-upgrade` | `mistral-vibe` | TUI interactive, mode programmatique, assistant de configuration |
| `vibe mcp add` / `vibe mcp remove`, `/mcp`, `/connectors`, `/loop`, `/voice`, `/model`, `/config`, `/resume`, `/compact`, `/retry`, `/theme`, `/log-level` | `mistral-vibe` | gestion MCP et commandes slash |
| `vibe-acp`, `vibe-app-server`, `vibe run-server` | `mistral-vibe` | intégration éditeurs (ACP), serveur d'app, exécutions massives |
| `mistral`, `mistral apps`, `mistral --completions <shell>` | binaires `mistralai/cli` | CLI plateforme, gestion des Mistral Apps |
| `uvx mistralai-workflows-cli@latest setup` | `mistralai-workflows-cli` | scaffolding d'un projet Workflows / cookbooks |
| `make start-examples`, `make execute-cargo-release`… | projet généré | lancer worker et exécutions d'exemple |
| `copier copy gh:mistralai/search-starter-app <dir>` | `search-starter-app` | projet Search Toolkit + MCP + Workflows |
| `mistral-vespa generate-migration` / `local up` / `migrate` | `…-plugins-vespa` | cycle de vie Vespa |
| `mistral-postgres ddl module:attribute` | `…-plugins-postgres` | DDL de la table de collection |
| `mistral_common serve <tokenizer> [mode]` | `mistral_common[server]` | serveur de (dé)tokenisation |
| GitHub Action `uses: mistralai/mistral-vibe@<ref>` (entrées `prompt`, `MISTRAL_API_KEY`) | `mistral-vibe/action.yml` | Vibe en CI |

URLs console citées par ces outils/docs : `https://console.mistral.ai/home?profile_dialog=api-keys` (clés), `https://console.mistral.ai/build/workflows` et `/build/workflows/executions` (Studio › Workflows), `https://console.mistral.ai` (connecteurs, datasets).

## 5. API et SDK : registres, versions, dépendances

### 5.1 PyPI — projets existants (état au 21/10/2026)

Page d'organisation PyPI « Profile of Mistral AI » (`pypi.org/org/mistralai/`) : **26 projets**. S'y ajoutent `mistral-inference`, `mistral-finetune` (publiés par des comptes individuels) et le plugin Qdrant (publié par Qdrant). Dates = première mise en ligne de la dernière version (UTC).

| Paquet PyPI (nom exact) | Dernière version | Date | Nb versions | Python | Licence (métadonnées) | Statut (classifier) | Source publique |
|---|---|---|---|---|---|---|---|
| `mistralai` | 3.3.0 | 2026-10-20 | 113 | ≥3.10 | *(vide)* — dépôt Apache-2.0 | — | `client-python` |
| `mistral_common` (= `mistral-common`) | 1.12.0 | 2026-09-22 | 50 | ≥3.10,<3.15 | Apache-2.0 | — | `mistral-common` |
| `mistral-vibe` | 3.0.1 | 2026-10-20 | 94 | ≥3.12 | Apache-2.0 | 5 - Production/Stable | `mistral-vibe` |
| `mistralai-workflows` | 3.16.0 | 2026-10-15 | 47 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist seulement |
| `mistralai-workflows-plugins-mistralai` | 3.16.0 | 2026-10-15 | 42 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-workflows-plugins-evaluations` | 0.6.3 | 2026-09-29 | 7 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-workflows-plugins-search` | 0.3.0 | 2026-10-12 | 3 | ≥3.12,<3.15 | **Proprietary** | 4 - Beta | sdist |
| `mistralai-workflows-cli` | 1.3.0 | 2026-10-06 | 12 | ≥3.10 | *(aucune)* | — | sdist |
| `mistralai-evaluations` | 0.8.4 | 2026-09-29 | 7 | ≥3.12 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-otel-observability` | 0.4.1 | 2026-10-21 | 6 | ≥3.12 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit` | 0.0.14 | 2026-09-18 | 8 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit-plugins-vespa` | 0.0.14 | 2026-09-18 | 8 | ≥3.12 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit-plugins-postgres` | 0.0.14 | 2026-09-18 | 2 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit-storage-s3` | 0.0.14 | 2026-09-18 | 8 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit-storage-gcs` | 0.0.14 | 2026-09-18 | 8 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit-storage-azure` | 0.0.14 | 2026-09-18 | 8 | ≥3.12,<3.15 | Apache-2.0 | 4 - Beta | sdist |
| `mistralai-search-toolkit-plugins-qdrant` | 0.1.5 | 2026-09-09 | 6 | ≥3.12 | Apache-2.0 | 4 - Beta | `qdrant-labs/mistral-qdrant-plugin` |
| `mistralai-vibe-sdk` | 0.14.4 | 2026-10-13 | 19 | ≥3.12 | *(aucune)* | — | sdist |
| `mistralai-vibe-protocol` | 0.3.2 | 2026-05-05 | 7 | ≥3.12 | *(aucune)* | — | sdist |
| `mistralai-vibe-local-harness` | 0.5.1 | 2026-09-18 | 10 | ≥3.12 | *(aucune)* | — | wheels natives seulement |
| `mistralai-vibe-harness` | 0.1.10 | 2026-10-21 | 11 | ≥3.12,<3.15 | **Proprietary** | — | wheels natives seulement |
| `mistralai-capabilities-backend-fastapi` | 0.1.40 | 2026-10-21 | 2 | ≥3.12,<3.15 | Apache-2.0 | — | sdist |
| `mistralai-capabilities-backend-workflows` | 0.1.40 | 2026-10-21 | 6 | ≥3.12,<3.15 | Apache-2.0 | — | sdist |
| `mistralai-capabilities-deployment-apps` | 0.1.40 | 2026-10-21 | 5 | ≥3.12,<3.15 | Apache-2.0 | — | sdist |
| `mistralai-capabilities-feature-observability` | 0.1.40 | 2026-10-21 | 4 | ≥3.12,<3.15 | Apache-2.0 | — | sdist |
| `kazekit` | 0.0.1 | 2026-05-20 | 1 | ≥3.10 | MIT | « Reserved by Mistral AI » | — |
| `leste` | 0.0.1 | 2026-05-20 | 1 | ≥3.10 | MIT | « Reserved by Mistral AI » | — |
| `mistral-inference` | 1.6.0 | 2025-03-20 | 9 | ≥3.9.10,<4 | *(vide)* — dépôt Apache-2.0 | — | `mistral-inference` (archivé) |
| `mistral-finetune` | 0.0.0 | 2024-05-14 | 1 | — | *(vide)* | — | réservation de nom |

**Noms testés introuvables sur PyPI (HTTP 404)** : `mistralai-azure`, `mistralai-gcp` (paquets v1 pourtant cités dans la doc de migration), `mistralai-voice-agents` (cité dans la doc Audio), `mistralai-workflows-plugins-webhook` et `mistralai-search-toolkit-language-detection-fasttext` (pourtant référencés comme extras), `timestral`, `mistral-evals`, `mistral-vibe-cli`, `mistral-vibe-acp`, `mistralai-connectors`, `mistralai-connector-sdk`, `mistralai-realtime`, `mistralai-workflows-sdk`, `mistralai-workflows-plugins-{temporal,langfuse,otel,slack,http,connectors,search-toolkit}`, `mistralai-search-toolkit-plugins-{elasticsearch,elastic,opensearch,weaviate,pinecone,milvus,chroma,mistralai}`, `mistralai-evaluations-plugins`, `leanstral`, `mistralai-compute`.

### 5.2 npm — paquets existants

Liste d'organisation `GET https://registry.npmjs.org/-/org/mistralai/package` → exactement **3 paquets** ; organisation `mistralai-capabilities` → **12 paquets**. Tous maintenus par `mistralai-bot`, licence Apache-2.0.

| Paquet npm | Dernière version | Date | Nb versions | Dist-tags | Dépendances / remarques |
|---|---|---|---|---|---|
| `@mistralai/mistralai` | 3.1.0 | 2026-10-20 | 67 | `latest`, `alpha: 2.0.0-alpha.1`, `rc: 1.0.0-rc.3` | `ws`, `zod`, `zod-to-json-schema`, `@modelcontextprotocol/sdk ^1.29.0`, `@opentelemetry/semantic-conventions` ; 12 peer deps optionnelles |
| `@mistralai/mistralai-azure` | 2.0.0 | 2026-05-25 | 17 | `latest` | `zod ^4.3.6` ; source `client-ts/packages/mistralai-azure` |
| `@mistralai/mistralai-gcp` | 2.0.0 | 2026-05-25 | 17 | `latest` | `zod ^4.3.6`, `google-auth-library ^10.6.2` |
| `@mistralai-capabilities/base-core` | 0.1.40 | 2026-10-21 | 7 | `latest`, `bootstrap: 0.0.0` | créé 22/09/2026 |
| `@mistralai-capabilities/registry` | 0.1.40 | 2026-10-21 | 7 | `latest`, `bootstrap` | descripteur `registry.json` pour `mistral apps` |
| `@mistralai-capabilities/backend-workflows` | 0.1.40 | 2026-10-21 | 7 | `latest`, `bootstrap` | créé 08/10/2026 |
| `@mistralai-capabilities/deployment-apps` | 0.1.40 | 2026-10-21 | 6 | `latest`, `bootstrap` | créé 08/10/2026 |
| `@mistralai-capabilities/feature-observability` | 0.1.40 | 2026-10-21 | 4 | `latest` | créé 15/10/2026 |
| `@mistralai-capabilities/backend-fastapi`, `database-postgres`, `deployment-apps-fastapi`, `feature-fastapi-postgres`, `feature-fastapi-tanstack-start`, `feature-fastapi-workflows`, `frontend-tanstack-start` | 0.1.40 | 2026-10-21 | 3 chacun | `latest` | créés le 20/10/2026 |

**Noms testés introuvables sur npm** : `@mistralai/voice-agents` (cité dans la doc Audio), `@mistralai/vibe-sdk`, `@mistralai/vibe`, `@mistralai/mistral-vibe`, `@mistralai/workflows`, `@mistralai/local-observability-sdk`, `@mistralai/observability`, `@mistralai/otel-observability`, `@mistralai/evaluations`, `@mistralai/search-toolkit`, `@mistralai/mcp`, `@mistralai/sdk`, `@mistralai/realtime`, `@mistralai/mistral-common`, `@mistralai/client`, `@mistralai/connectors`, `@mistralai/ui`, `@mistralai/apps`, `@mistralai/le-chat`, et `mistralai` (non scopé). Paquets tiers notables (hors Mistral) : `@ai-sdk/mistral` (Vercel AI SDK), `@tanstack/ai-mistral`, `@openclaw/mistral-provider`.

**JSR** : `@mistralai/mistralai` réservé (21/12/2024), `versionCount: 0`.

### 5.3 Graphe de dépendances entre paquets Mistral

| Paquet | Contrainte sur `mistralai` | Autres dépendances Mistral |
|---|---|---|
| `mistralai-workflows` 3.16.0 | `>=2.9.3,<3.0.0` | extras → plugins, `mistralai[workflow-payload-*]` |
| `mistralai-workflows-plugins-mistralai` 3.16.0 | `mistralai[agents]>=2.0.0,<3.0.0` | `mistralai-workflows>=3.0.0a1,<4` |
| `mistralai-workflows-plugins-evaluations` 0.6.3 | (transitif) | `mistralai-evaluations>=0.8.4`, `mistralai-workflows>=3.8.0,<4` |
| `mistralai-workflows-plugins-search` 0.3.0 | (transitif) | `mistral-common`, `mistralai-search-toolkit>=0.0.14,<1`, `mistralai-workflows>=3.0.0a1,<4` |
| `mistralai-evaluations` 0.8.4 | `>=2.7.1,<3.0.0` | — |
| `mistralai-search-toolkit` 0.0.14 | `>=2.9.1,<3` | `mistral-common[sentencepiece]>=1.10,<2` |
| `mistralai-search-toolkit-plugins-vespa` 0.0.14 | `>=2.10.0,<3` | `mistralai-search-toolkit` (sans borne) |
| `mistralai-otel-observability` 0.4.1 | extra `mistral` : `>=2.5.2,<3.0.0` | — |
| `mistral-vibe` 3.0.1 | **`==2.6.0`** | — |
| `mistralai-vibe-sdk` 0.14.4 | `>=2.6.0` | extra `workflow` : `mistralai-workflows>=3.1.0` |
| `mistralai-vibe-protocol` 0.3.2 | `>=2.3.0` | extra `workflow` |
| `mistralai-vibe-local-harness` 0.5.1 | `>=2.6.0,<3` | — |
| `mistralai-vibe-harness` 0.1.10 | `>=2.6.0` | extras `mistralai-otel-observability>=0.4.1`, `mistralai-workflows>=3.10.0` |
| `mistralai-capabilities-backend-workflows` 0.1.40 | `mistralai[workflow-payload-encryption]>=2.9.4` | `mistralai-workflows>=3.15.0` |
| `mistralai-capabilities-feature-observability` 0.1.40 | `mistralai[telemetry]>=2.9.4,<3` | — |
| `mistral-inference` 1.6.0 | — | `mistral_common>=1.5.4` |

### 5.4 Dépendances tierces structurantes

| Dépendance | Utilisée par | Version / licence relevée |
|---|---|---|
| `temporalio` (SDK Python Temporal) | `mistralai-workflows` | `>=1.29.0,<1.30.0` ; dernière publiée 1.34.0 ; MIT |
| `httpx2` (fork Pydantic de httpx) | `mistralai` ≥ 3.0 | `>=2.13.0` ; dernière 2.16.0 ; BSD-3-Clause |
| `mcp` (SDK MCP Python) | `mistralai[agents]` / `[mcp]` (`>=2.2,<3`), Workflows/Vibe (`<2`, `==1.28.1`) | dernière 2.3.0 ; MIT |
| `@modelcontextprotocol/sdk` | `@mistralai/mistralai` 3.x | `^1.29.0` |
| `pydantic` v2 / `zod` | SDK Python / TS | — |
| OpenTelemetry (API, SDK, exporteurs OTLP HTTP/gRPC) | SDK, Workflows, otel-observability, Vibe | API `<2.0.0` |
| `livekit` / `livekit-client` / `@livekit/rtc-node` | voice agents | `livekit>=1.1,<2` (Apache-2.0) |
| `copier` | `mistralai-workflows-cli`, `search-starter-app` | `>=9.0` ; MIT |
| `pyvespa`, `pgvector`, `asyncpg`, `sqlalchemy`, `alembic`, `qdrant-client` | plugins Search Toolkit | `pyvespa<=1.2.1` (Apache) |
| `pymupdfpro` | extra `extractor-pymupdf` | 1.28.2 ; « Commercial license » (Artifex) |
| `langchain-core`, `langchain-text-splitters` | extra `text-splitter-langchain` | `~=1.4`, `~=1.1` |
| `fastmcp` | projet `search-starter-app` | `>=3.3.1` ; Apache-2.0 |
| `textual`, `agent-client-protocol`, `sentry-sdk`, `tree-sitter-bash`, `deno_core` (Rust) | Vibe | épinglés |
| Speakeasy (outil de génération, pas une dépendance d'exécution) | SDK clients | `1.796.4` |

## 6. Limites, licences, disponibilité

### 6.1 Ce qui est open source et réutilisable vs propriétaire (faits)

| Catégorie | Éléments |
|---|---|
| **Apache-2.0 (code source public sur GitHub)** | `client-python` (`mistralai`, y compris `mistralai.azure`/`gcp`, `mistralai.extra.*` : MCP, RunContext, télémétrie, voice agents, encodage Workflows), `client-ts` (+ `-azure`, `-gcp`), `mistral-common`, `mistral-vibe` (y compris le code du Unified Harness local dans `harness/`), `platform-docs-public`, `timestral` (code), `LeanstralSafeVerify`, `FLTEval`, `nvsentinel-provider-mistral`, archivés `mistral-inference`, `mistral-finetune`, `client-js`, et les forks |
| **Apache-2.0 (source disponible seulement via sdist PyPI, pas de dépôt public)** | `mistralai-workflows`, `mistralai-workflows-plugins-mistralai`, `mistralai-workflows-plugins-evaluations`, `mistralai-evaluations`, `mistralai-otel-observability`, `mistralai-search-toolkit` + plugins Vespa/Postgres/stockage, `mistralai-capabilities-*` ; npm `@mistralai-capabilities/*` (paquets publiés) |
| **MIT** | `cookbook`, `search-starter-app` ; réservations `kazekit`, `leste` |
| **Propriétaire (déclaré)** | `mistralai-workflows-plugins-search` (sdist publié mais `License :: Other/Proprietary License`), `mistralai-vibe-harness` (wheels binaires seulement) |
| **Sans licence déclarée (réutilisation juridiquement non couverte)** | `mistral-evals`, `sagemaker-docs`, `public-test` (GitHub) ; `mistralai-vibe-sdk`, `mistralai-vibe-protocol`, `mistralai-vibe-local-harness`, `mistralai-workflows-cli` (PyPI) ; `zed-extensions` (licence non détectée par GitHub) |
| **Binaires sans source publique** | CLI `mistral` (Apache-2.0 pour les fichiers du dépôt `cli`, source dans le monorepo interne) |
| **Services fermés** | API `api.mistral.ai` (+ `api.eu`, `api.us`), console/Studio, orchestrateur Workflows (Temporal hébergé), déploiements gérés « Mistral Cloud » (build via la GitHub App `github.com/apps/mistralai`), serveur MCP `api.mistral.ai/mcp`, passerelle connecteurs `/v1/connectors-gateway`, endpoint de télémétrie `api.mistral.ai/telemetry`, Mistral AI Studio auto-hébergé (versions `2026.1.x`, `2026.2.0` citées dans l'avis MAI-2026-001), Le Chat |
| **Poids de modèles** | licences propres (ex. Timestral : « Modified MIT ») — hors périmètre de ce chapitre |

### 6.2 Contraintes de plateforme

- Python : `mistralai` ≥ 3.10 ; quasi tout l'outillage Studio (Workflows, Evaluations, Search Toolkit, Vibe, capabilities) ≥ **3.12**, souvent < 3.15.
- TypeScript : ESM uniquement ; ES2020+ ; navigateurs, Node LTS, Bun ≥ 1, Deno 1.39.
- Serveurs régionaux du SDK : `global`, `eu`, `us`.
- Vibe : cible officielle UNIX (Windows fonctionne) ; agent socket et `run-server` non supportés sous Windows ; terminaux recommandés WezTerm, Alacritty, Ghostty, Kitty.
- CLI `mistral` : macOS et Linux (x64/arm64) seulement ; `mistral apps` requiert Bun.
- Workflows : « Public Preview » ; déploiements gérés réservés au pay-as-you-go activé ou à l'Enterprise (pas Free, pas Pro/Team seuls).
- Évaluations hors ligne (SDK et plugin) : organisations **Enterprise** uniquement.
- Serveur MCP hébergé : outils Observability, Evaluations et Apps visibles seulement si la fonction est activée sur le workspace.

## 7. Détails fins, pièges, cas particuliers, dépréciations

1. **Trois « workflows » distincts dans le namespace `mistralai`** : `client.workflows` (méthodes REST générées dans `mistralai`), `mistralai.workflows` (paquet `mistralai-workflows` pour écrire des workers), `mistralai.extra.workflows` (encodage des payloads, connecteurs, helpers, dans `mistralai`).
2. **Plafond `mistralai<3`** : tous les paquets « framework » (Workflows, Evaluations, Search Toolkit, otel-observability `[mistral]`, local-harness, capability observability) excluent `mistralai` 3.x, alors que la dernière version est 3.3.0 ; `mistral-vibe` épingle `mistralai==2.6.0`. (inférence) Un environnement combinant ces paquets restera en `mistralai` 2.x.
3. **Fracture de version MCP** : `mistralai` 3.x `[agents]`/`[mcp]` exige `mcp>=2.2,<3` ; `mistralai-workflows[mistralai]`/`[all]`, les harness et Vibe exigent `mcp<2` (ou `==1.28.1`). (inférence) Ces combinaisons sont incompatibles dans un même environnement.
4. **Temporal figé sur une mineure** : `temporalio>=1.29.0,<1.30.0` (5 mineures de retard sur 1.34.0).
5. **Extras pointant vers des paquets non publiés** : `mistralai-workflows[webhook]`/`[all]`/`[all-plugins]` → `mistralai-workflows-plugins-webhook` ; `mistralai-search-toolkit[all]`/`[language-detection-fasttext]` → `mistralai-search-toolkit-language-detection-fasttext`. (inférence) Résolution impossible depuis PyPI seul (ces paquets doivent venir de l'index interne Gemfury).
6. **Versions en « lockstep »** : Search Toolkit et son plugin Vespa sortent sous le même numéro ; le plugin dépend du cœur sans borne inférieure — le template épingle donc `==0.0.14` (commentaire explicite).
7. **Chaîne d'approvisionnement** : avis **MAI-2026-002** (publié 12/05/2026, sévérité High) — attaque « Mini Shai-Hulud » via TanStack depuis un poste de développeur ; npm `@mistralai/mistralai` 2.2.2, 2.2.3, 2.2.4 et `@mistralai/mistralai-azure`/`-gcp` 1.7.1–1.7.3 (en ligne du 11/05 22:45 au 12/05 01:53 UTC ; non fonctionnels) ; PyPI `mistralai` 2.4.6 (12/05 00:05–03:05 UTC ; exécutait à l'import, sous Linux, un téléchargement `transformers.pyz` voleur d'identifiants). Advisories GitHub `GHSA-wx9m-wx4f-4cmg` (PyPI) et `GHSA-jgg6-4rpr-wfh7` (npm). Les registres ne contiennent plus ces versions (les horodatages npm subsistent). Mesures de durcissement visibles au 21/10/2026 : `exclude-newer = "2 days"` dans `client-python` et `mistral-vibe`, PR client-ts « lock-deps-min-release-age », `exclude-newer = "7 days"` dans le template Search, skill interne `vibe-ci-supply-chain`.
8. **Vulnérabilités Vibe** : avis **MAI-2026-003** (14/09/2026) — CVE-2026-87983 à 87988 (contournement des contrôles de permission shell : chemins absolus entre guillemets, redirections, quoting ANSI-C, parsing incomplet, assignations d'environnement, allowlist) ; corrigées en **2.25.4** (12/09/2026).
9. **Télémétrie** : opt-in dans les SDK (`MISTRAL_SDK_TELEMETRY` non défini = désactivé) ; dans Vibe, la télémétrie d'usage et les rapports de crash sont actifs tant que `enable_telemetry` n'est pas mis à `false`, et l'export OTel exige `enable_otel = true` **et** `enable_telemetry` actif. Caviardage par défaut côté client dans les trois cas.
10. **Plugin Postgres** : exige `pg_textsearch` préchargé au démarrage du serveur (souvent impossible en Postgres managé) ; sinon dégradation silencieuse en dense seul ; aucune isolation par tenant.
11. **Extraction PDF « pro »** : l'extra `extractor-pymupdf` tire `pymupdfpro`, sous licence commerciale.
12. **Code généré** : ne pas modifier les fichiers marqués Speakeasy ; seuls `pyproject.toml`, `examples/*`, `utils/*`, `src/mistralai/extra/*`, `pylintrc`, `scripts/prepare_readme.py` sont maintenus à la main (`.genignore`).
13. **Métadonnées** : le paquet PyPI `mistralai` ne déclare ni licence ni classifiers (la licence Apache-2.0 n'apparaît que dans le dépôt) ; idem `mistral-inference`.
14. **Distribution native** : wheels Vibe de 36 à 69 Mo par plateforme ; `mistralai-vibe-harness` et `-local-harness` n'ont pas de sdist (pas de build depuis les sources PyPI).
15. **Dépréciations** : `client-js` (→ `client-ts`), `mistral-inference`, `mistral-finetune`, paquets autonomes voice agents (→ `mistralai[voice-agents]` / `@mistralai/mistralai/extra/voice-agents`), paquets v1 `mistralai_azure`/`mistralai_gcp` (→ sous-paquets), `beta.connectors.call_tool` (→ `mcp_client`), `audio.voices.list` (→ `search`), `beta.agents.list` (→ `list_pages`), `workflows.execute_workflow_registration`, `beta.libraries.libraries_update_v1`, `beta.libraries.documents.libraries_documents_update_v1` ; le namespace `fine_tuning.jobs` n'existe plus dans le SDK 3.x (seules restent `models.update/archive/unarchive` des modèles fine-tunés).
16. **Versionnage on-prem** : branches `mais-*` pour les lignes de patch on-prem (README Evaluations) ; Mistral AI Studio auto-hébergé numéroté `YYYY.M.PATCH` (ex. `2026.1.3`) d'après MAI-2026-001.
17. **Registres privés** : l'index Gemfury `https://pypi.fury.io/mistralai/` et Cloudsmith `mistral-ai/sdk-distribution` sont mentionnés dans des README publics ; le template Search prévoit `UV_EXTRA_INDEX_URL` et `index-strategy = "unsafe-best-match"`.

## 8. Questions ouvertes / incohérences relevées

1. **Paquets documentés mais absents des registres** : la page Audio (`studio/audio/overview`) montre `pip install "mistralai-voice-agents[default-audio]"` et `npm install @mistralai/voice-agents` (`MistralVoiceAgent`) → 404 sur PyPI et npm, alors que le README du SDK dit « No separate `mistralai-voice-agents` package is needed ».
2. **Migration v1** : la doc (`getting-started/clients`, `resources/migration-guides`) cite `pip install mistralai-azure>=1.0.0` → 404 sur PyPI au 21/10/2026.
3. **Dépôt inexistant cité** : `studio/workflows/building-workflows/connectors` renvoie vers `github.com/mistralai/connector-sdk-demo/.../06-multiple-authentication.md` ; ce dépôt n'existe pas publiquement (un fichier `06-multiple-authentication.md` existe dans `cookbook/mistral/connectors/`).
4. **Contradiction de versions** : SDK `mistralai` 3.3.0 vs tous les paquets Studio plafonnés `<3` et Vibe épinglé en 2.6.0 — pas de déclaration publique sur la compatibilité 3.x.
5. **README PyPI de `mistralai-workflows` obsolète** : API `@activity` / `@workflow.run` / `workflow.execute_activity(..., start_to_close_timeout=...)` et chemin d'exemples `mistralai_workflow_tests.examples...`, différents de la doc (`@workflows.activity()`, `@workflows.workflow.entrypoint`, appel direct).
6. **README PyPI de `mistralai-evaluations`** : affirme que le paquet sera importable « once SDK v2 is released » (v2 et v3 sont sortis) et expose des procédures internes (Gemfury, identifiants Bitwarden, Cloudsmith).
7. **README du plugin Postgres** : liens vers une page Notion interne et des PR d'un dépôt privé `mistralai/dashboard`.
8. **`mistralai-workflows-plugins-search`** est propriétaire et documenté sur `docs-internal-frameworks.mistral.ai`, mais requis par le template public MIT `search-starter-app`.
9. **Tags GitHub en retard** : dernière release GitHub `client-python` v3.2.0 vs PyPI 3.3.0 ; `client-ts` v3.0.0 vs npm 3.1.0.
10. **Exemples obsolètes** : `client-python/examples/mistral/jobs/fine_tuning.py` appelle `client.fine_tuning.jobs.*`, absent du SDK 3.x ; la page `resources/sdks` renvoie encore aux exemples de `client-js` (archivé).
11. **RUNTIMES.md** du SDK TS parle de Node « v18 et v20 » comme LTS actuelles, alors que l'exemple voice agents requiert Node 24.
12. **JSR** : `jsr.json` maintenu dans `client-ts` mais aucune version publiée sur JSR.
13. **Endpoint non documenté** : `GET /v1/workflows/workers/whoami` (helper `get_scheduler_namespace`) absent de la spec OpenAPI publique (`openapi-public-doc.yaml`, identique à la copie locale).
14. **Écosystème « Mistral Apps » non documenté** : CLI `mistral apps`, 16 paquets `capabilities` et outils MCP « Apps » existent, sans page dédiée dans la doc publique du 21/10/2026 ; plusieurs paquets npm portent la description « Temporary package placeholder for staged publishing ».
15. **Doc Search Toolkit** : le stockage listé est « Vespa, Postgres (pgvector), or custom » ; le plugin Qdrant (tiers, sur PyPI) et les plugins de stockage objet n'apparaissent pas dans ce tableau.
16. **Licences manquantes** sur des paquets publics (`mistralai-vibe-sdk`, `-protocol`, `-local-harness`, `mistralai-workflows-cli`) et sur `mistral-evals` : statut de réutilisation non précisé.
17. **Fork `zed-extensions`** désynchronisé (référence Vibe 2.10.0) alors que `distribution/zed/extension.toml` est en 3.0.1.
18. **Numérotation on-prem** : l'avis MAI-2026-001 annonce le format `YYYY-MM-PATCHNUM` mais cite des versions `2026.1.3`, `2026.2.0`.
19. Question ouverte : relation exacte entre `mistralai-vibe-local-harness` (sans licence, construit depuis `harness/` du dépôt Apache-2.0) et `mistralai-vibe-harness` (propriétaire) — non documentée.

## Annexe — Couverture

**Dépôts GitHub** (liste : API `orgs/mistralai/repos` page 1 = 31 dépôts, ✅ ; profil `orgs/mistralai` ✅). Clonés en `--depth 1` et lus (lecture seule, aucun script exécuté) :

| Dépôt | Lu | Remarque |
|---|---|---|
| `client-python` | ⚠️ README (sections installation, ressources/opérations, retries, erreurs, serveurs, HTTP, auth, télémétrie, voice agents ; exemples de chat/upload/agents/embeddings survolés), `MIGRATION.md` (v2→v3 entier, v1→v2 début), `AGENTS.md`, `pyproject.toml`, `.genignore`, `.speakeasy/*`, `extra/` (README, voice agents README début, `workflows/encoding/config.py`, `connector_slot.py`, `helpers.py`, signatures), arborescences `docs/sdks`, `examples` | fichiers générés non lus (≈ 1 400 modèles) |
| `client-ts` | ⚠️ `package.json`, `jsr.json`, `RUNTIMES.md`, `FUNCTIONS.md` (début), `MIGRATION.md` (v2→v3 entier, v1→v2 début), README (titres, installation, serveurs, télémétrie, voice agents), `src/extra` (README, index) | code généré non lu |
| `client-js` | ✅ README (avis d'archivage) + `package.json` | archivé |
| `mistral-common` | ✅ README ; ⚠️ docs `experimental.md` (moitié), `tokenizers.md` (début), `TokenizerVersion` | — |
| `mistral-vibe` | ✅ README (1 428 lignes), `AGENTS.md` (début), `pyproject.toml`, `action.yml`, ADR 0002, `CHANGELOG` (3.0.1), `docs/acp-setup.md` (début), `distribution/zed/extension.toml` ; arborescences `vibe/`, `harness/` | — |
| `search-starter-app` | ✅ README, `copier.yml`, `template/pyproject.toml.jinja`, `worker.py`, `start.py` (début), `.mcp.json.jinja`, `.vibe/config.toml.jinja`, signatures de `mcp_server.py` | — |
| `cookbook` | ⚠️ README (6 000 premiers caractères), arborescence complète, `07-connectors-in-workflow.md` (début) | 118 notebooks non ouverts |
| `cli` | ✅ README, LICENSE | binaires non téléchargés |
| `mistral-evals` | ✅ README + arborescence | — |
| `mistral-inference`, `mistral-finetune` | ⚠️ README (60 premières lignes) | archivés |
| `timestral`, `nvsentinel-provider-mistral`, `sagemaker-docs`, `LeanstralSafeVerify`, `FLTEval` | ⚠️ README (≈ 45 premières lignes) + `pyproject` | — |
| `mistral-compute-openapi`, `public-test` | ✅ (README d'une ligne) | vides |
| `zed-extensions` | ⚠️ README (début), entrée `mistral-vibe` d'`extensions.toml` | fork |
| `platform-docs-public` | ⚠️ README (début), `CLAUDE.md` (début), arborescence, comparaison `openapi-public-doc.yaml` ↔ spec locale | — |
| Forks non clonés : `megablocks-public`, `vllm-release`, `FastChat-release`, `transformers-release`, `TensorRT-LLM`, `llm-d-router-public`, `agent-client-protocol`, `prom_client_python`, `vllm`, `gateway-api-inference-extension-public`, `llm-d-kv-cache-manager-public` | ⚠️ métadonnées API seulement | forks d'amont |

**Registres** :
- PyPI : ✅ JSON de 29 projets (versions, dates, licences, classifiers, dépendances, fichiers) ; ✅ page d'organisation `pypi.org/org/mistralai/` (26 projets) ; ⚠️ page utilisateur `pypi.org/user/mistralai/` bloquée par un « Client Challenge ». Descriptions longues lues : ✅ `mistralai-workflows`, `-plugins-mistralai`, `mistralai-search-toolkit`, `-plugins-vespa`, `-plugins-postgres`, `-plugins-qdrant`, `mistralai-evaluations`, `mistralai-otel-observability`, `mistralai-vibe-protocol`, `mistralai-vibe-sdk` ; ⚠️ `-storage-s3` (60 premières lignes) ; non lues : `mistral-vibe` et `mistralai` (= README des dépôts), `mistral_common`, `mistral-inference`, `-storage-gcs`/`-azure`. Sdists et wheels **non téléchargés**.
- npm : ✅ packuments de `@mistralai/mistralai`, `-azure`, `-gcp` et des 12 `@mistralai-capabilities/*` ; ✅ listes d'organisation `-/org/mistralai/package` et `-/org/mistralai-capabilities/package` ; ⚠️ recherche `scope:mistralai` (renvoie 0, non fiable).
- JSR : ✅ `api.jsr.io/scopes/mistralai/packages`.
- Versions récentes de dépendances tierces (PyPI JSON) : ✅ `temporalio`, `mcp`, `httpx2`, `pymupdfpro`, `pyvespa`, `livekit`, `fastmcp`, `copier`, `agent-client-protocol`.

**Pages docs.mistral.ai (copie du 21/10/2026) consultées pour recoupement** :

| Page | Statut |
|---|---|
| https://docs.mistral.ai/resources/mcp.md | ✅ lu en entier |
| https://docs.mistral.ai/resources/security-advisories/MAI-2026-002.md | ✅ lu en entier |
| https://docs.mistral.ai/resources/security-advisories/MAI-2026-003.md | ⚠️ 60 premières lignes |
| https://docs.mistral.ai/resources/security-advisories/MAI-2026-001.md | ⚠️ 40 premières lignes |
| https://docs.mistral.ai/resources/sdks.md | ⚠️ onglets Python et tiers (sortie JSON résumée) |
| https://docs.mistral.ai/getting-started/clients.md | ⚠️ grep ciblé (lignes d'installation Azure/GCP) |
| https://docs.mistral.ai/resources/migration-guides.md | ⚠️ grep ciblé |
| https://docs.mistral.ai/studio/workflows/getting-started/installation.md | ✅ lu en entier |
| https://docs.mistral.ai/studio/workflows/getting-started/overview.md | ⚠️ 60 premières lignes |
| https://docs.mistral.ai/studio/workflows/getting-started/your_first_workflow.md | ⚠️ 80 premières lignes |
| https://docs.mistral.ai/studio/workflows/getting-started/cookbook_examples.md | ⚠️ 60 premières lignes |
| https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/rate_limiting.md | ⚠️ lignes 55–75 |
| https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments/getting-started.md | ⚠️ lignes 1–30 et 55–80 |
| https://docs.mistral.ai/studio/workflows/building-workflows/plugins.md | ⚠️ grep ciblé |
| https://docs.mistral.ai/studio/workflows/building-workflows/connectors.md | ⚠️ ligne 96 |
| https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin.md | ⚠️ 60 premières lignes |
| https://docs.mistral.ai/studio/search/search-toolkit.md | ⚠️ 60 premières lignes |
| https://docs.mistral.ai/studio/audio/overview.md | ⚠️ grep ciblé (lignes 314–373) |
| https://docs.mistral.ai/studio/observability.md | ⚠️ lignes 50–70 |

Spec OpenAPI locale : grep ciblé (`workers/whoami`, `telemetry`, `connectors-gateway`) — aucune occurrence.
