# 05 — Enrichir Nexora WorkStudio : briques open source pour couvrir Mistral Studio et aller au-delà

> **État au 22/10/2026.** Veille ciblée sur ce qui manque à **Sim** (base de Nexora WorkStudio, cf. [00](00-decision-bases-et-briques.md) §1bis, §4.2) pour couvrir la carte de Mistral Studio ([../mistral-studio/00-synthese.md](../mistral-studio/00-synthese.md) §3, §14bis) et répondre aux besoins des PME françaises et européennes. **Aucun prix.**
> **Méthode courte** : ≈ 200 dépôts examinés ; métadonnées via ecosyste.ms (étoiles, dernière activité = `pushed_at`, archivage, langage), **fichier LICENSE brut** lu pour chacun, recherche de dossiers `ee/` / `enterprise/`, paquets npm via packages.ecosyste.ms, lecture directe de fichiers du dépôt Sim (`package.json`, `packages/audit`, blocs `guardrails`, `stt`, `tts`). Détails en annexe.
> **Légende** : 🆕 = absent des catalogues 00–04 ; (cat. 02) = déjà recensé au catalogue 02 ou 01, ici réévalué pour WorkStudio ; ⚠️ = contredit ou nuance un document existant ; « (inférence) » = déduction non vérifiée. Priorité : **P1** indispensable, **P2** utile, **P3** plus tard. Effort (inférence) : **S** quelques jours, **M** 1 à 3 semaines, **L** 1 à 2 mois.

## Sommaire
1. [En bref : les 15 ajouts recommandés](#1-en-bref--les-15-ajouts-recommandés)
2. [Ce que Sim apporte déjà (à ne pas racheter)](#2-ce-que-sim-apporte-déjà-à-ne-pas-racheter)
3. [Axe A — Manques de Sim face à Mistral Studio](#3-axe-a--manques-de-sim-face-à-mistral-studio)
4. [Axe B — Remplacer les modules `ee/` de Sim](#4-axe-b--remplacer-les-modules-ee-de-sim)
5. [Axe C — Spécifique PME France / Europe](#5-axe-c--spécifique-pme-france--europe)
6. [Axe D — Expérience utilisateur et adoption](#6-axe-d--expérience-utilisateur-et-adoption)
7. [Feuille de route d'intégration suggérée](#7-feuille-de-route-dintégration-suggérée)
8. [Écartés, et pourquoi](#8-écartés-et-pourquoi)
9. [Annexe — méthode et sources](#9-annexe--méthode-et-sources)

---

## 1. En bref : les 15 ajouts recommandés

Classement par rapport valeur pour une PME / effort / risque de licence.

| # | Ajout | Licence vérifiée | Ce que ça couvre (Mistral Studio ou au-delà) | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|
| 1 | **Exploiter tout Langfuse** (déjà retenu) : prompts versionnés à labels, datasets, juges LLM, expériences, playground, traces | MIT hors `ee/` | Prompts (registry), Datasets, Judges, Evaluations, Explorer, Playground — 6 manques de l'axe A d'un coup | Service séparé + `@langfuse/client` + OTel de Sim | M | P1 |
| 2 | **Plugins Better Auth** `@better-auth/sso` (déjà dans Sim), `@better-auth/scim` 🆕, organisation, clés API | MIT | Remplace `ee/sso` et `ee/scim` ; SCIM n'est qu'en *private preview* chez Mistral | Bibliothèque dans Sim | M | P1 |
| 3 | **OpenFGA** (retenu) + **CASL** 🆕 côté interface | Apache-2.0 / MIT | Remplace `ee/access-control` ; rôles additifs façon Mistral | Service + bibliothèques | L | P1 |
| 4 | **Chaîne i18n** : `next-intl` + extraction outillée (`codemod`, `i18next-cli instrument`, Lingo.dev) 🆕 | MIT / Apache-2.0 | Sim n'a aucun système de traduction ; condition n° 4 de [00](00-decision-bases-et-briques.md) §4.2 | Outils de dev + bibliothèque | M | P1 |
| 5 | **Copilot Nexora** : `@openai/agents` (agents-js) 🆕 contre Nexora API + **assistant-ui** pour le panneau | MIT | Reconstruit le copilot fermé de Sim (« build / plan / assistant ») ; Mistral n'a pas de copilot de construction | Service séparé + bibliothèque UI | L | P1 |
| 6 | **Docling Serve** (retenu) + **LangExtract** 🆕 | MIT / Apache-2.0 | Document AI : OCR → Markdown, puis annotations JSON **ancrées dans le texte source** (équivalent des annotations Mistral) | Service séparé | M | P1 |
| 7 | **Génération de documents** : pdfme 🆕, docxtemplater 🆕 (cœur), Gotenberg (cat. 01) | MIT ; docxtemplater MIT ou GPLv3 au choix | Devis, factures, contrats, courriers depuis un workflow — absent de Mistral Studio | Bibliothèques dans Sim + service Gotenberg | M | P1 |
| 8 | **Facture électronique** : factur-x d'Akretion 🆕, Mustang (validation) 🆕, e-invoice-eu 🆕 | BSD / Apache-2.0 / WTFPL | Réforme 2026-2027 : réception obligatoire depuis le 01/09/2026, émission PME au 01/09/2027 | Microservice (Python ou Java) | M | P1 |
| 9 | **data.gouv MCP** (DINUM) 🆕 + **API Recherche d'entreprises** (DINUM) 🆕 | MIT | Enrichissement SIREN/SIRET, open data en un bloc ; atout « souverain » | MCP via Nexora Connect | S | P1 |
| 10 | **Garde-fous « Agentic Safety »** : `@openai/guardrails` 🆕, **Cedar** + cedar-for-agents 🆕, NeMo Guardrails (retenu) | MIT / Apache-2.0 | Règles versionnées, verdicts Allow / Validation humaine / Block, politiques par surface (copie du modèle Mistral de 09/2026) | Bibliothèques dans Sim (wasm) + service Python | L | P2 |
| 11 | **Audio et voix** : Speaches (cat. 01), Kokoro-FastAPI (cat. 01), **LiveKit agents-js** 🆕 + starter React 🆕 | MIT / Apache-2.0 | Playgrounds STT/TTS, agents vocaux en TypeScript (même pile que Sim) | Services + bibliothèque | M | P2 |
| 12 | **Visites guidées** : driver.js 🆕 | MIT | Onboarding guidé, absent de Mistral Studio | Bibliothèque dans Sim | S | P2 |
| 13 | **Connecteurs PME** : Odoo (`mcp-server-odoo`) 🆕, Qonto (MCP officiel hébergé), Chatwoot / Twenty par API | MPL-2.0 ; APIs | Comptabilité, banque, CRM, support : les outils réels des PME | MCP / connecteurs Nexora Connect | M | P2 |
| 14 | **Signature électronique** : `@signpdf/signpdf` 🆕, pyHanko 🆕 ; DocuSeal en service non modifié | MIT ; DocuSeal AGPL-3.0 | Signature PAdES de devis et contrats générés | Bibliothèque + service | M | P2 |
| 15 | **Fine-tuning « Forge PME »** : LlamaFactory (cat. 01), Unsloth (cat. 01), Argilla (cat. 01) | Apache-2.0 | Équivalent Forge ; Mistral a déprécié le fine-tuning API | Service GPU séparé | L | P3 |

**Cinq constats qui changent le plan de [00](00-decision-bases-et-briques.md)** :
1. ⚠️ **Le journal d'audit n'est pas à écrire** : le cœur Apache de Sim contient `packages/audit` (`@sim/audit`, licence Apache-2.0) avec `recordAudit` / `recordAuditBatch` et **≈ 249 actions** typées (`auth.login_failed`, `api_key.created`, `chat.deployed`…), écrites dans la table `auditLog` via Drizzle ([types.ts](https://raw.githubusercontent.com/simstudioai/sim/HEAD/packages/audit/src/types.ts), [log.ts](https://raw.githubusercontent.com/simstudioai/sim/HEAD/packages/audit/src/log.ts)). [00](00-decision-bases-et-briques.md) §4.2 le plaçait en « phase 2, écrit par Nexora ». Reste à construire la consultation et l'export (inférence : ces écrans relèvent probablement de `ee/`, non ouvert).
2. ⚠️ **SCIM existe désormais en MIT dans Better Auth** (`@better-auth/scim` 1.7.12 du 20/10/2026, ≈ 812 000 téléchargements par mois ; [doc](https://better-auth.com/docs/plugins/scim)). Le catalogue 02 notait « SCIM non vérifié » et [00](00-decision-bases-et-briques.md) prévoyait un SCIM maison. Condition : passer Sim de Better Auth 1.6.27 à 1.7.x (inférence).
3. **Langfuse couvre à lui seul la moitié de l'axe A** : depuis son passage en MIT, « tracing, evaluations, prompt management, experiments, annotation, the playground » sont libres ; seuls SCIM, audit et rétention restent `ee/` ([handbook Langfuse](https://langfuse.com/handbook/chapters/open-source)). Inutile d'ajouter Agenta, Latitude ou Opik.
4. **Sim n'a aucune intégration PME française** : ni Pennylane, Qonto, Sellsy, Axonaut, PayFit, Odoo, Dolibarr, Chatwoot ni Twenty dans `apps/sim/blocks/blocks/` (fichiers absents, 404, vérifié le 22/10/2026). C'est un terrain de différenciation direct.
5. **Sim n'a plus de galerie de modèles publique** (`https://www.sim.ai/templates` renvoie 404). Les modèles métiers prêts à l'emploi ([00](00-decision-bases-et-briques.md) §7.2) sont à produire par Nexora ; aucun corpus libre réutilisable n'a été trouvé (n8n : Sustainable Use License).

---

## 2. Ce que Sim apporte déjà (à ne pas racheter)

Lu dans [`apps/sim/package.json`](https://raw.githubusercontent.com/simstudioai/sim/HEAD/apps/sim/package.json) et le `package.json` racine (Apache-2.0), le 22/10/2026.

| Besoin | Déjà dans Sim | Conséquence |
|---|---|---|
| Pile | Next.js 16.4, React 19.2, Drizzle 0.45, Better Auth 1.6.27, Trigger.dev 4.5, `@xyflow/react` 12, Zod 4, Tailwind 4, Radix, bun, Biome | Toute brique ajoutée doit être compatible React 19 / Next 16 / ESM |
| SSO | `@better-auth/sso` et `@better-auth/oauth-provider` 1.6.27 | Le remplacement de `ee/sso` est surtout de l'écran et de la configuration |
| Audit | `@sim/audit` (≈ 249 actions) | Voir constat 1 |
| Éditeur riche | Tiptap 3.31 (+ collaboration Yjs), Monaco | **Pas** d'autre éditeur (Plate, Lexical, BlockNote écartés comme doublons) |
| Graphiques | ECharts 6.1 (Apache-2.0) | Tableaux de bord d'usage et de quotas sans nouvelle dépendance (Tremor inactif) |
| Consentement cookies | `c15t` / `@c15t/nextjs` (Apache-2.0, [c15t/c15t](https://github.com/c15t/c15t), 1 990 ★, actif 20/10/2026) | tarteaucitron ou cookieconsent inutiles |
| Documents | `docx`, `pdf-lib`, `react-pdf`, `pdfjs-dist`, `mammoth`, `officeparser`, `pptxgenjs`, `xlsx` | La génération Office existe en briques ; manque le **templating** métier (§5.2) |
| Garde-fous | Bloc `guardrails` : JSON valide, regex, contrôle d'hallucination sur base de connaissances, détection de PII (« Block Request » / « Mask PII », langue choisie) ([guardrails.ts](https://raw.githubusercontent.com/simstudioai/sim/HEAD/apps/sim/blocks/blocks/guardrails.ts)) ; bloc `evaluator` | Base de l'« Agentic Safety », mais sans règles versionnées ni politiques (§3.3) |
| Audio | Blocs `stt` (Whisper, Deepgram, ElevenLabs, AssemblyAI, Gemini) et `tts` (OpenAI, Deepgram, ElevenLabs, Cartesia, Google, Azure, PlayHT) | Brancher le fournisseur « OpenAI » sur Nexora API → Speaches/Kokoro souverains (inférence : URL de base à rendre configurable) |
| OCR | Blocs `mistral_parse`, `textract` | À doubler par un bloc Docling souverain (§3.2) |
| Bacs à sable, MCP, A2A | `@e2b/code-interpreter`, `@daytona/sdk`, `@modelcontextprotocol/sdk`, `@a2a-js/sdk` | — |
| Télémétrie | PostHog, OpenTelemetry (traces, métriques, logs OTLP) | OTel à rediriger vers Langfuse ; PostHog à couper ([00](00-decision-bases-et-briques.md) §2) |

---

## 3. Axe A — Manques de Sim face à Mistral Studio

### 3.1 Prompts, évaluations, traces, playground, batch, registre

| Projet | URL | Licence (fichier brut) | ★ / dernière activité | Langage | Apport précis à WorkStudio | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **Langfuse** (retenu) | https://github.com/langfuse/langfuse | MIT sauf `ee/`, `web/src/ee/`, `worker/src/ee/` | 36 076 / 20/10/2026 | TypeScript | Registre de prompts versionnés à **labels** (`production`, `staging`, équivalent des alias Mistral), datasets, LLM-as-judge, expériences, annotation, playground, explorateur de traces. Couvre « Iterate » et « Observe » de Studio | Service séparé (Postgres + ClickHouse) ; écrans intégrés dans la navigation WorkStudio | M | P1 |
| **langfuse-js** 🆕 | https://github.com/langfuse/langfuse-js | MIT | 175 / 21/10/2026 ; `@langfuse/client` 6.0.1 (19/10/2026), ≈ 6,4 M dl/mois | TypeScript | Lire les prompts par label depuis les blocs Agent de Sim ; pousser scores et datasets | Bibliothèque dans Sim | S | P1 |
| **promptfoo** (retenu) | https://github.com/promptfoo/promptfoo | MIT | 26 224 / 21/10/2026 | TypeScript | Tests de prompts et red teaming en CI ; vue côte à côte multi-modèles | Outil CLI / CI | S | P2 |
| **GEPA** 🆕 | https://github.com/gepa-ai/gepa | MIT | 7 040 / 13/10/2026 | Python | Optimisation de prompts, l'algorithme cité par Mistral (`GEPA` dans `mistralai-evaluations`) | Tâche Python à côté des évaluations | M | P3 |
| **Ax** 🆕 | https://github.com/ax-llm/ax | Apache-2.0 | 2 967 / 17/10/2026 | TypeScript | Signatures et optimiseurs « façon DSPy » en TypeScript, appelables depuis un bloc | Bibliothèque | M | P3 |
| **OpenAI Agents JS** 🆕 | https://github.com/openai/openai-agents-js | MIT | 3 921 / 15/10/2026 | TypeScript | Moteur du **copilot Nexora** (outils, handoffs, garde-fous) pointé sur Nexora API compatible OpenAI | Service copilot séparé | L | P1 |
| **Kestra AI Copilot** (inspiration) 🆕 | https://github.com/kestra-io/kestra | Apache-2.0 | 29 604 / 15/10/2026 | Java | Référence d'UX : génération et retouche d'un flux depuis un prompt, « Fix with AI » sur une exécution en échec ; copilot présent dans « All Editions » ([doc](https://kestra.io/docs/ai-tools/ai-copilot), [Kestra 1.0](https://kestra.io/blogs/release-1-0)) | Inspiration | — | P1 |
| **Workflow Builder** (Synergy Codes) 🆕 | https://github.com/synergycodes/workflowbuilder | Apache-2.0 | 403 / 19/10/2026 | TypeScript | Éditeur React Flow → exécution **Temporal** avec pauses humaines. Pont visuel ↔ Temporal pour la phase 2 « workflows en code » ([00](00-decision-bases-et-briques.md) §4.5) | Inspiration / code ponctuel | M | P3 |
| **LiteLLM** (batch) | https://github.com/BerriAI/litellm | MIT hors `enterprise/` | 61 571 / 19/10/2026 | Python | Batch API compatible OpenAI devant vLLM (`/v1/files`, `/v1/batches`) : le proxy stocke l'entrée et sert les sorties ([doc](https://docs.litellm.ai/docs/providers/vllm_batches)) | Côté Nexora API (bibliothèque ou modèle à reproduire dans OpenGateLLM) ; WorkStudio n'ajoute que l'écran Batches | M | P2 |
| **MLflow** (inspiration) | https://github.com/mlflow/mlflow | Apache-2.0 | 28 439 / 19/10/2026 | Python | Registre de modèles, versions et lignage (« AI Registry », « Versioning and lineage » de Studio) pour les modèles affinés | Service séparé si Forge (§3.4) | M | P3 |
| **OpenLineage** 🆕 | https://github.com/OpenLineage/OpenLineage | Apache-2.0 | 2 715 / 19/10/2026 | Java | Format standard d'événements de lignage (dataset → job → run) pour tracer quel document, prompt et modèle a produit quel résultat | Spécification ; émission depuis Sim (inférence) | M | P3 |

- **Playground multi-modèles** : le playground de Langfuse (MIT) et le bloc Agent de Sim suffisent pour la V1 ; une vue « côte à côte » dédiée se construit avec assistant-ui (§6.2). Aucun projet autonome actif n'a été retenu.
- **Registre d'actifs** : versions de prompts et datasets (Langfuse), versions de déploiement des workflows (Sim, inférence), modèles (MLflow en P3). Le registre unifié « AI Registry » reste à construire par Nexora (inférence).

### 3.2 Document AI, OCR

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **Docling** + **Docling Serve** (retenu) | https://github.com/docling-project/docling-serve | MIT | 69 023 et 1 864 / 16/10/2026 | Python | API HTTP stable `v1` avec interface optionnelle (`--enable-ui`) : PDF, Office, images → Markdown/JSON. Base du **Playground Document AI** et d'un bloc Sim souverain | Service séparé | S | P1 |
| **LangExtract** 🆕 | https://github.com/google/langextract | Apache-2.0 | 38 963 / 17/10/2026 | Python | Extraction structurée par LLM **avec ancrage dans le texte source**, fournisseurs OpenAI-compatibles et Ollama : l'équivalent des « annotations » JSON de `POST /v1/ocr` ; idéal pour factures, bons de commande, contrats | Service Python derrière Nexora API | M | P1 |
| **PaddleOCR** (cat. 01) | https://github.com/PaddlePaddle/PaddleOCR | Apache-2.0 | 91 427 / 16/09/2026 | Python | Moteur OCR multilingue de secours (scans, tickets) | Service | M | P3 |
| **ExtractThinker** 🆕 | https://github.com/enoch3712/ExtractThinker | Apache-2.0 | 1 601 / 16/09/2026 | Python | Classification et extraction de documents « façon ORM » | Alternative à LangExtract | M | P3 |

### 3.3 « Agentic Safety » (règles et politiques de garde-fous)

Modèle Mistral à reproduire ([synthèse](../mistral-studio/00-synthese.md) §14bis) : **règles** versionnées = *hooks* + *scanners* + *cases* (Allow / Human validation / Block / Terminate), appliquées par des **politiques** à des surfaces.

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **OpenAI Guardrails JS** 🆕 | https://github.com/openai/openai-guardrails-js | MIT | 107 / 15/10/2026 ; `@openai/guardrails` 0.3.0 (« Preview ») | TypeScript | Contrôles d'entrée et de sortie configurables en JSON qui enveloppent un client OpenAI-compatible ; exception « tripwire » = verdict *Block* ; assistant de configuration graphique ([README](https://github.com/openai/openai-guardrails-js)) | Bibliothèque dans l'exécuteur de Sim | M | P2 |
| **Cedar** + `@cedar-policy/cedar-wasm` 🆕 | https://github.com/cedar-policy/cedar | Apache-2.0 | 1 787 / 15/10/2026 ; wasm 4.14.0, ≈ 1,15 M dl/mois | Rust (wasm) | Langage de politiques **analysable** : « qui / quel agent peut appeler quel outil, avec quel verdict ». Moteur des *politiques* | Bibliothèque wasm dans Sim | M | P2 |
| **cedar-for-agents** 🆕 | https://github.com/cedar-policy/cedar-for-agents | Apache-2.0 | 54 / 07/10/2026 | Rust, JS | Génère un schéma Cedar à partir des descriptions d'outils d'un serveur MCP (liaisons wasm) : politiques par outil MCP | Bibliothèque | M | P2 |
| **NeMo Guardrails** (retenu) | https://github.com/NVIDIA-NeMo/Guardrails | Apache-2.0 (SPDX dans LICENSE.md) | 7 341 / 22/10/2026 | Python | Rails de dialogue et de sujets ; dépôt déplacé de `NVIDIA/NeMo-Guardrails` | Service Python | M | P2 |
| **Granite Guardian** 🆕 | https://github.com/ibm-granite/granite-guardian | Apache-2.0 | 186 / 16/10/2026 | (modèles) | *Scanner* « juge » ouvert : risques, jailbreak, pertinence RAG | Modèle servi par vLLM | S | P2 |
| **garak** (retenu) | https://github.com/NVIDIA/garak | Apache-2.0 | 9 594 / 16/10/2026 | Python | Tests d'attaque des agents avant publication | CI | S | P3 |

Proposition d'assemblage (inférence) : *hook* = point de l'exécuteur Sim (avant appel modèle, avant outil, après sortie) ; *scanner* = bloc `guardrails` existant + Presidio + Granite Guardian + `@openai/guardrails` ; *case* = verdict ; validation humaine = `human-in-the-loop` déjà présent dans l'exécuteur ; *politique* = Cedar, versionnée en base.

### 3.4 Audio, voix, fine-tuning, secrets, usage

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **Speaches** (cat. 01) | https://github.com/speaches-ai/speaches | MIT | 3 723 / 17/10/2026 | Python | Serveur STT/TTS **compatible OpenAI** : les blocs `stt`/`tts` de Sim s'y branchent sans code (inférence) | Service derrière Nexora API | S | P2 |
| **Kokoro-FastAPI** (cat. 01) | https://github.com/remsky/Kokoro-FastAPI | Apache-2.0 | 5 550 / 14/10/2026 | Python | TTS léger compatible OpenAI pour le playground TTS | Service | S | P2 |
| **WhisperX** (cat. 01) | https://github.com/m-bain/whisperX | BSD-2-Clause | 24 724 / 18/10/2026 | Python | Horodatage par mot et diarisation (options du playground STT Mistral) | Service | M | P2 |
| **LiveKit Agents JS** 🆕 | https://github.com/livekit/agents-js | Apache-2.0 | 946 / 19/10/2026 ; `@livekit/agents` 1.9.3 | TypeScript | Agents vocaux dans la **même pile que Sim** (LiveKit retenu en Python au [00](00-decision-bases-et-briques.md) §6) | Worker Node séparé | M | P2 |
| **agent-starter-react** 🆕 | https://github.com/livekit-examples/agent-starter-react | MIT | 946 / 29/09/2026 | TypeScript | Interface navigateur prête (micro, transcription, visualiseur) pour le « Playground agents vocaux » | Code à reprendre | S | P2 |
| **LlamaFactory** (cat. 01) | https://github.com/hiyouga/LlamaFactory | Apache-2.0 | 75 635 / 21/10/2026 | Python | Fine-tuning de 100+ modèles avec interface web : base d'un « Forge PME » (dépôt renommé depuis `LLaMA-Factory`) | Service GPU | L | P3 |
| **Unsloth** (cat. 01) | https://github.com/unslothai/unsloth | Apache-2.0 | 78 255 / 19/10/2026 | Python | LoRA/QLoRA rapides et sobres en mémoire | Bibliothèque côté entraînement | M | P3 |
| **Argilla** + **distilabel** (cat. 01) | https://github.com/argilla-io/argilla | Apache-2.0 | 5 152 et 3 422 / 12/10/2026 | Python | Annotation de datasets et génération de données synthétiques | Service | M | P3 |
| **OpenBao** (retenu) | https://github.com/openbao/openbao | MPL-2.0 | 8 622 / 20/10/2026 | Go | « Secrets Manager » par workspace (KV + chiffrement Transit) | Service | M | P2 |
| **rate-limiter-flexible** 🆕 | https://github.com/animir/node-rate-limiter-flexible | ISC | 3 594 / 13/10/2026 | JavaScript | Quotas et limites **visibles** (irritant n° 1 des utilisateurs Mistral) sur Valkey, avec compteurs consultables | Bibliothèque dans Sim | S | P1 |
| **OpenMeter** (retenu) | https://github.com/openmeterio/openmeter | Apache-2.0 | 2 382 / 15/10/2026 | Go | Événements d'usage par organisation et workspace ; affichage via ECharts (déjà dans Sim) | Service | M | P1 |

---

## 4. Axe B — Remplacer les modules `ee/` de Sim

Rappel : salle blanche, jamais ouvrir `apps/sim/ee/` ([00](00-decision-bases-et-briques.md) §8). Les briques ci-dessous se branchent derrière les interfaces appelées par le cœur Apache.

| Module `ee/` à remplacer | Projet | URL | Licence | ★ / activité | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| `sso` | **`@better-auth/sso`** (déjà dans Sim) | https://better-auth.com/docs/plugins/sso | MIT (dépôt [better-auth](https://github.com/better-auth/better-auth), 30 300 ★, 15/10/2026) | — | SAML 2.0 et OIDC, fournisseurs par organisation, validation `InResponseTo`, horodatage, **Single Logout** (1.5) | Bibliothèque + écrans | S | P1 |
| `scim` | **`@better-auth/scim`** 🆕 | https://better-auth.com/docs/plugins/scim | MIT | 1.7.12 du 20/10/2026, ≈ 812 000 dl/mois | Service SCIM 2.0 entrant, connexions et jetons gérés, liaison SCIM ↔ SSO (`acquireActiveSCIMUserLink`) | Bibliothèque (montée de version Better Auth) | M | P1 |
| `scim` (outils) | **scim-patch**, **scim2-parse-filter** 🆕 | https://github.com/thomaspoignant/scim-patch | Unlicense (domaine public) | 31 et 23 ★ / 16/10 et 22/09/2026 | Opérations PATCH et filtres SCIM si le plugin ne suffit pas | Bibliothèques | S | P3 |
| `access-control` | **OpenFGA** (retenu) + `@openfga/sdk` 🆕 | https://github.com/openfga/openfga | Apache-2.0 | 5 999 / 18/10/2026 ; SDK 0.9.7 (18/08/2026) | Relations organisation › workspace › ressource, partage `private`/`shared_workspace`/`shared_org` comme Mistral | Service + SDK | L | P1 |
| `access-control` (interface) | **CASL** 🆕 | https://github.com/stalniy/casl | MIT | 7 100 / 13/10/2026 ; `@casl/ability` 7.0.2, ≈ 7,8 M dl/mois | Masquer ou griser boutons et menus selon les droits, côté client et serveur | Bibliothèque | S | P1 |
| Clés API, comptes de service | **Plugin `apiKey`** de Better Auth 🆕 | https://better-auth.com/blog/1-5 | MIT | — | Clés **détenues par une organisation** (`references: "organization"`) | Bibliothèque | S | P1 |
| Audit (consultation, export) | `@sim/audit` (cœur Apache) + **pgaudit** 🆕 | https://github.com/pgaudit/pgaudit | PostgreSQL | 1 716 / 26/09/2026 | Écrans de recherche et d'export à écrire ; pgaudit pour la trace au niveau base | Écran Nexora + extension Postgres | M | P1 |
| `whitelabeling` | **tweakcn** 🆕 | https://github.com/jnsahaj/tweakcn | Apache-2.0 | 10 450 / 03/09/2026 | Éditeur visuel de thèmes shadcn/Tailwind 4 : chaque PME ou revendeur règle couleurs, rayons, polices | Code à reprendre dans l'écran « Marque » | M | P2 |
| `whitelabeling` (domaines) | **Vercel Platforms** (inspiration) 🆕 | https://github.com/vercel/platforms | **aucun fichier LICENSE** | 6 720 / 08/07/2026 | Modèle de sous-domaines et domaines personnalisés par client dans Next.js | Inspiration seulement | — | P3 |
| `data-retention` | **pg_partman** + **pg_cron** 🆕 | https://github.com/pgpartman/pg_partman | PostgreSQL | 2 834 / 21/08/2026 ; pg_cron 3 906 / 08/09/2026 | Partitions par mois des journaux et exécutions, purge par politique ; ou tâche planifiée Trigger.dev (déjà dans Sim) | Extensions Postgres (CloudNativePG) | S | P2 |
| Alternative SAML | **Ory Polis** (cat. 02) | https://github.com/ory/polis | Apache-2.0 + `ee/` | 2 268 / 27/07/2026 | Pont SAML → OIDC ; inutile si le plugin SSO suffit | — | — | — |

---

## 5. Axe C — Spécifique PME France / Europe

### 5.1 Facturation électronique (réforme 2026-2027)

Calendrier confirmé : **réception obligatoire pour toutes les entreprises depuis le 01/09/2026**, émission et e-reporting pour grandes entreprises et ETI au 01/09/2026, **pour PME, TPE et micro-entreprises au 01/09/2027**. Les factures transitent par une **Plateforme Agréée** (ex-PDP) ; le PPF s'appuie sur Chorus Pro ([compta-online](https://www.compta-online.com/facturation-electronique-ao5562), [Sellsy](https://go.sellsy.com/blog/calendrier-de-la-facturation-electronique), [liste des PA](https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees)). Lecture pour Nexora (inférence) : WorkStudio ne doit pas devenir Plateforme Agréée. Il doit **produire, contrôler, lire et router** des factures Factur-X/UBL/CII vers la PA de la PME, et automatiser la réception (OCR, rapprochement, validation).

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **factur-x** (Akretion) 🆕 | https://github.com/akretion/factur-x | BSD (LICENSE.txt) | 311 / 16/10/2026 | Python | Bibliothèque de référence française : générer un PDF Factur-X, extraire et vérifier le XML (XSD) | Microservice Python | S | P1 |
| **Mustang** 🆕 | https://github.com/ZUGFeRD/mustangproject | Apache-2.0 | 483 / 16/10/2026 | Java | Validation complète Factur-X / ZUGFeRD / XRechnung (règles EN 16931) et génération | Conteneur de validation | S | P1 |
| **e-invoice-eu** 🆕 | https://github.com/gflohr/e-invoice-eu | **WTFPL** (permissive, hors liste de la règle §3 de [00](00-decision-bases-et-briques.md) : avis juridique) | 360 / 15/10/2026 ; `@e-invoice-eu/core` 3.4.1 | TypeScript | Génère Factur-X, UBL, CII et XRechnung depuis **JSON ou tableur** ; CLI et serveur REST | Bibliothèque dans Sim (TypeScript natif) | S | P2 |
| **phase4** 🆕 | https://github.com/phax/phase4 | Apache-2.0 | 244 / 09/10/2026 | Java | Transport Peppol AS4, pour l'Europe hors France (inférence : utile en Belgique et en Allemagne, à confirmer pays par pays) | Service | L | P3 |
| Clients Chorus Pro | `antoine2116/go-choruspro`, `cnfilms/chorus-api` | MIT, BSD-3 | 1 ★ / 2023 ; 3 ★ / 11/2025 | Go, Python | Trop petits ou inactifs → **écartés** ; client PISTE à écrire à partir de la doc officielle (B2G) | — | M | P3 |

### 5.2 Documents (devis, factures, contrats) et signature

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **pdfme** 🆕 | https://github.com/pdfme/pdfme | MIT | 4 900 / 16/10/2026 ; `@pdfme/generator` 6.2.7 | TypeScript | **Concepteur de modèles PDF en WYSIWYG** + génération depuis JSON : la PME dessine son devis, le workflow le remplit | Bibliothèque + écran « Modèles de documents » | M | P1 |
| **docxtemplater** 🆕 | https://github.com/open-xml-templating/docxtemplater | Cœur : **MIT ou GPLv3 au choix** (LICENSE.md) | 3 638 / 15/10/2026 ; ≈ 5 M dl/mois | JavaScript | Remplit un **modèle Word fourni par la PME** (`{nom}`, boucles, conditions) ; les PME ont déjà leurs modèles .docx. Modules avancés vendus à part (inférence, à vérifier) | Bibliothèque dans Sim | S | P1 |
| **easy-template-x** 🆕 | https://github.com/alonrbar/easy-template-x | MIT | 533 / 24/09/2026 | TypeScript | Alternative MIT pure à docxtemplater | Bibliothèque | S | P3 |
| **Gotenberg** (cat. 01) | https://github.com/gotenberg/gotenberg | MIT | 13 343 / 16/10/2026 | Go | Conversion Office/HTML → PDF et PDF/A (base d'un Factur-X propre) | Service Docker | S | P1 |
| **Typst** 🆕 | https://github.com/typst/typst | Apache-2.0 | 56 676 / 16/10/2026 | Rust | Mise en page programmatique de documents soignés (rapports, factures) | CLI ou wasm | M | P3 |
| **@signpdf/signpdf** 🆕 | https://github.com/vbuch/node-signpdf | MIT | 941 / 13/10/2026 ; 3.4.0, ≈ 990 000 dl/mois | JavaScript | Signature PDF (PKCS#7) dans Node : cachet serveur des documents générés | Bibliothèque | M | P2 |
| **pyHanko** 🆕 | https://github.com/MatthiasValvekens/pyHanko | MIT | 788 / 17/10/2026 | Python | Signatures **PAdES** (horodatage, LTV), validation | Service Python | M | P2 |
| **DSS** (Commission européenne) 🆕 | https://github.com/esig/dss | LGPL-2.1 | 1 041 / 28/08/2026 | Java | Référence eIDAS de création et validation AdES ; service non modifié | Service | L | P3 |
| **DocuSeal** 🆕 | https://github.com/docusealco/docuseal | **AGPL-3.0** | 18 739 / 12/10/2026 | Ruby | Parcours de signature complet (formulaires, multi-signataires) : seulement en **service séparé non modifié** (règle §3) | Service + connecteur API | M | P2 |

### 5.3 Données publiques, connecteurs PME, CRM / ERP

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **data.gouv MCP** (DINUM) 🆕 | https://github.com/datagouv/datagouv-mcp | MIT | 1 602 / 08/09/2026 | Python | Serveur MCP **officiel** : recherche et analyse des jeux et API référencés sur data.gouv.fr ; instance hébergée `https://mcp.data.gouv.fr/mcp`, « encore expérimental » ([guide](https://guides.data.gouv.fr/intelligence-artificielle/le-serveur-mcp-de-data.gouv.fr)) | Connecteur MCP dans Nexora Connect | S | P1 |
| **API Recherche d'entreprises** (DINUM) 🆕 | https://github.com/annuaire-entreprises-data-gouv-fr/search-api | MIT | 31 / 20/10/2026 | Python | API publique sans clé : SIREN/SIRET, dirigeants, NAF, état administratif ([fiche](https://www.data.gouv.fr/dataservices/api-recherche-dentreprises)). Bloc Sim « Vérifier une entreprise » | Bloc Sim (appel HTTP) | S | P1 |
| **datagouv-skill** 🆕 | https://github.com/datagouv/datagouv-skill | MIT | 63 / 22/07/2026 | — | Skill prêt à l'emploi sur les API françaises (format SKILL.md) | Skill dans le registre Nexora | S | P2 |
| **addok** (BAN) 🆕 | https://github.com/addok/addok | MIT | 386 / 23/12/2025 (inactif) | Python | Géocodage d'adresses : préférer l'API Adresse publique (inférence) | — | — | P3 |
| **Qonto MCP** 🆕 | https://github.com/qonto/qonto-mcp-server | MIT | 34 / 19/06/2026 (inactif > 3 mois) | Python | Dépôt local remplacé par le **serveur MCP officiel hébergé** par Qonto (OAuth, lecture et écriture, [docs](https://docs.qonto.com/mcp/overview)) | Connecteur MCP distant (non libre, mais officiel) | S | P2 |
| **Pennylane** | MCP officiel hébergé, lecture seule ([doc](https://pennylane-mcp.readme.io/docs/getting-started)) ; MCP communautaires `wanadev/pennylane-mcp`, `FGRibreau/mcp-pennylane` | MIT (communautaires) | 3 et 7 ★ / 04-05/2026 (inactifs) | JS, Rust | Comptabilité. Idée reprise de wanadev : **165 outils générés depuis l'OpenAPI** de Pennylane | Connecteur Nexora généré depuis l'OpenAPI (inférence) | M | P2 |
| **mcp-server-odoo** 🆕 | https://github.com/ivnvxd/mcp-server-odoo | MPL-2.0 | 406 / 11/10/2026 | Python | Odoo (ERP libre très répandu en PME) via MCP | Service MCP | S | P2 |
| **Odoo** / **Dolibarr** | https://github.com/odoo/odoo · https://github.com/Dolibarr/dolibarr | LGPL-3.0 · GPL-3.0 | 55 147 · 7 753 / 10/2026 | Python · PHP | ERP/CRM de PME ; **connexion par API uniquement**, aucun code repris | Connecteurs | M | P2 |
| **Chatwoot** | https://github.com/chatwoot/chatwoot | MIT hors `enterprise/` | 37 939 / 18/10/2026 | Ruby | Support client omnicanal ; agents WorkStudio branchés en « agent bot » via API et webhooks (inférence) | Connecteur | M | P2 |
| **Twenty** | https://github.com/twentyhq/twenty | **AGPL-3.0** + fichiers `@license Enterprise` | 58 420 / 16/10/2026 | TypeScript | CRM moderne ; API seulement | Connecteur | M | P3 |

**Non trouvé** : aucun client ou MCP open source actif et licencié pour **Sellsy** (`healdigital/sellsy-mcp` : aucun fichier LICENSE), **Axonaut**, **PayFit** (seulement des MCP commerciaux hébergés : Knit, Apideck) ni **Swile**. L'**API Entreprise** est réservée aux administrations (à vérifier sur entreprise.api.gouv.fr) : pas un connecteur PME. → Connecteurs à écrire dans Nexora Connect à partir des API publiques des éditeurs (inférence).

### 5.4 RGPD et accessibilité

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **Presidio** (retenu) | https://github.com/microsoft/presidio | MIT | (absent d'ecosyste.ms) | Python | Détection et anonymisation de PII ; reconnaisseurs français à ajouter (NIR, SIRET, IBAN FR) (inférence) | Service | M | P1 |
| **GLiNER** 🆕 | https://github.com/urchade/GLiNER | Apache-2.0 (code ; licence des poids à vérifier modèle par modèle) | 4 125 / 05/10/2026 | Python | NER « zéro exemple » multilingue : PII françaises sans entraînement, en complément de Presidio | Modèle dans le service Presidio | M | P2 |
| **EDS-NLP** (AP-HP) 🆕 | https://github.com/aphp/edsnlp | BSD-3-Clause | 165 / 22/09/2026 | Python | Pipelines NLP français (pseudonymisation de textes médicaux) : PME de santé | Service | M | P3 |
| **PIA** (CNIL) 🆕 | https://github.com/LINCnil/pia | **GPL-3.0** | 297 / 30/09/2026 | TypeScript | Outil officiel d'analyse d'impact (AIPD) ; à proposer à côté, sans modification, ou comme modèle pour un « registre des traitements » Nexora | Service séparé ou inspiration | S | P3 |
| **axe-core** + `@axe-core/playwright` 🆕 | https://github.com/dequelabs/axe-core | MPL-2.0 | 7 658 / 15/10/2026 | JavaScript | Tests d'accessibilité automatiques dans la CI Playwright **déjà présente** dans Sim (RGAA, marchés publics) | Outil de test | S | P1 |
| **React Aria** 🆕 | https://github.com/adobe/react-spectrum | Apache-2.0 | 15 963 / 19/10/2026 | TypeScript | Composants accessibles (dates, grilles, glisser-déposer) là où Radix ne suffit pas | Bibliothèque | M | P3 |

**Registre des traitements** : aucun outil libre actif trouvé ; Fides (Ethyca) est **archivé**. À construire dans l'administration Nexora (inférence).

---

## 6. Axe D — Expérience utilisateur et adoption

### 6.1 Traduction d'une application Next.js existante (Sim)

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **next-intl** (retenu) | https://github.com/amannn/next-intl | MIT | 4 382 / 02/10/2026 ; 4.14.9, ≈ 27 M dl/mois | TypeScript | Bibliothèque cible (App Router, composants serveur). Extraction de messages `useExtracted` discutée dans [#2036](https://github.com/amannn/next-intl/discussions/2036) | Bibliothèque | M | P1 |
| **codemod** 🆕 | https://github.com/codemod/codemod | Apache-2.0 | 1 114 / 14/10/2026 | Rust | Moteur de transformations de code ; campagne « hard-coded strings → next-intl » décrite par l'éditeur ([blog](https://codemod.com/blog/next-intl-codemod)) | Outil de dev ponctuel | M | P1 |
| **i18next-cli** 🆕 | https://github.com/i18next/i18next-cli | MIT | 244 / 12/10/2026 ; 1.78.0 | TypeScript | Commande `instrument` qui enveloppe automatiquement les chaînes en dur dans `t()` ([locize](https://www.locize.com/blog/i18next-cli-instrument)) ; cible react-i18next | Outil (si l'on choisit i18next plutôt que next-intl) | M | P2 |
| **Lingo.dev** 🆕 | https://github.com/lingodotdev/lingo.dev | Apache-2.0 | 5 399 / 12/10/2026 | TypeScript | Traduction des catalogues JSON par LLM en CI (branchable sur Nexora API, inférence) | Outil CI | S | P2 |
| **Intlayer** 🆕 | https://github.com/aymericzip/intlayer | Apache-2.0 | 849 / 12/10/2026 | TypeScript | Extraction des chaînes en dur et traduction IA, compatible next-intl ([blog](https://intlayer.org/blog/intlayer-with-next-intl)) | Outil alternatif | M | P3 |
| **Lingui** 🆕 | https://github.com/lingui/js-lingui | MIT | 5 914 / 14/10/2026 | TypeScript | Macros + `lingui extract` : alternative si next-intl déçoit | Bibliothèque | M | P3 |
| **Tolgee** / **Weblate** 🆕 | https://github.com/tolgee/tolgee-platform · https://github.com/WeblateOrg/weblate | Apache-2.0 + `ee/` · GPL-3.0 | 4 135 · 6 113 / 10/2026 | TS · Python | Plateforme de traduction collaborative (relecture humaine du français, langues UE) ; Weblate en service non modifié | Service | S | P2 |

### 6.2 Composants d'agents, copilot, onboarding, modèles

| Projet | URL | Licence | ★ / activité | Langage | Apport | Intégration | Effort | Prio |
|---|---|---|---|---|---|---|---|---|
| **assistant-ui** (cat. 02) | https://github.com/assistant-ui/assistant-ui | MIT | 12 643 / 20/10/2026 ; `@assistant-ui/react` ≈ 8,5 M dl/mois | TypeScript | Panneau du copilot, Playground multi-modèles, aperçu d'agent (fils, pièces jointes, appels d'outils, approbations) | Bibliothèque | M | P1 |
| **AI Elements** 🆕 | https://github.com/vercel/ai-elements | Apache-2.0 | 2 494 / 14/10/2026 | TypeScript | Composants shadcn (raisonnement, sources, artefacts) cohérents avec `streamdown`, déjà dans Sim | Composants copiés | S | P2 |
| **CopilotKit** + **AG-UI** (cat. 02) | https://github.com/CopilotKit/CopilotKit · https://github.com/ag-ui-protocol/ag-ui | MIT | 38 044 · 16 737 / 10/2026 | TypeScript | Protocole agent ↔ interface : un agent WorkStudio pilote l'interface d'une app tierce | Bibliothèque (plus tard) | M | P3 |
| **driver.js** 🆕 | https://github.com/nilbuild/driver.js (déplacé de `kamranahmedse/driver.js`) | MIT | 26 923 / 15/10/2026 ; ≈ 9,3 M dl/mois | TypeScript | **Visites guidées** sans dépendance : « créer votre premier agent », « connecter Gmail » | Bibliothèque | S | P2 |
| **NextStep** 🆕 | https://github.com/enszrlu/NextStep | MIT | 1 042 / 20/07/2026 (limite des 3 mois) | TypeScript | Visites guidées conçues pour Next.js | Alternative | S | P3 |
| **Activepieces pieces** (inspiration) | https://github.com/activepieces/activepieces | MIT hors `packages/ee/` et `.../app/ee` | 25 100 / 19/10/2026 | TypeScript | Pièces MIT `@activepieces/piece-odoo`, `-twenty`, `-chatwoot` (npm) : schémas d'actions à reprendre pour des blocs Sim | Code MIT ponctuel | S | P3 |

**Modèles de workflows et d'agents** : aucune galerie libre réutilisable (n8n : licence non libre ; Sim : page `templates` en 404). Proposition (inférence) : une galerie Nexora versionnée en base (workflows Sim exportés en JSON), avec 20 premiers modèles PME. Ils combinent les briques ci-dessus : facture fournisseur reçue → OCR Docling → LangExtract → contrôle Factur-X → saisie Pennylane/Odoo ; devis docxtemplater → PDF Gotenberg → signature ; vérification SIREN ; tri du support Chatwoot.

---

## 7. Feuille de route d'intégration suggérée

(inférence : ordre proposé, à valider au brainstorming de conception)

**P1 — avec le fork (premiers mois)**
1. Socle `ee/` : `@better-auth/sso` (déjà présent), montée Better Auth 1.7 + `@better-auth/scim` + plugin `apiKey` ; OpenFGA + CASL ; écrans d'audit au-dessus de `@sim/audit`.
2. i18n : next-intl + campagne d'extraction (codemod / scripts ts-morph + LLM) ; Lingo.dev en CI ; français complet.
3. Langfuse branché (OTel de Sim → Langfuse ; `@langfuse/client` dans le bloc Agent) : prompts à labels, datasets, juges, playground, traces dans la navigation WorkStudio.
4. Copilot Nexora (`@openai/agents` + assistant-ui), sur le contrat client Apache du copilot de Sim.
5. Quotas visibles : rate-limiter-flexible + OpenMeter + graphiques ECharts.
6. PME France « socle » : Docling Serve + LangExtract (bloc OCR souverain), pdfme + docxtemplater + Gotenberg (documents), factur-x + Mustang (facture électronique), Recherche d'entreprises + data.gouv MCP.
7. axe-core dans la CI Playwright.

**P2 — consolidation (après la V1)**
- Agentic Safety : `@openai/guardrails` + Cedar (+ cedar-for-agents) + NeMo Guardrails + Granite Guardian, règles versionnées et politiques par surface.
- Audio : Speaches, Kokoro, WhisperX ; agents vocaux LiveKit agents-js + starter React.
- Connecteurs : Qonto (MCP hébergé), Pennylane (généré depuis l'OpenAPI), Odoo MCP, Chatwoot ; e-invoice-eu après avis juridique.
- Signature (`@signpdf`, pyHanko ; DocuSeal en service) ; marque blanche (tweakcn) ; rétention (pg_partman + pg_cron) ; OpenBao par workspace ; GLiNER ; driver.js ; Tolgee ou Weblate ; écran Batches (batch côté Nexora API).

**P3 — au-delà de Mistral**
- Forge PME (LlamaFactory, Unsloth, Argilla, distilabel) avec registre MLflow ; lignage OpenLineage ; optimisation de prompts (GEPA, Ax).
- Pont visuel → Temporal (Workflow Builder) ; Peppol (phase4), Chorus Pro (client PISTE) ; DSS eIDAS ; EDS-NLP ; PIA CNIL ; Typst ; CopilotKit / AG-UI.

---

## 8. Écartés, et pourquoi

| Projet | Motif | Source |
|---|---|---|
| Agenta, Latitude, Opik, Laminar, Helicone, Pezzo | **Doublons de Langfuse** (déjà retenu, toutes fonctions MIT) ; Agenta a en plus un `ee/` | ecosyste.ms, LICENSE |
| Mastra | Le constructeur d'agents (`@mastra/core/agent-builder/ee`) est sous licence `ee/` | [LICENSE.md](https://raw.githubusercontent.com/mastra-ai/mastra/HEAD/LICENSE.md) |
| flowgram.ai (ByteDance, MIT) | Doublon du canevas React Flow de Sim | ecosyste.ms |
| zerox (dernier push 20/05/2025), olmOCR (25/03/2026), DeepSeek-OCR (27/01/2026) | Inactifs depuis plus de 3 mois | ecosyste.ms |
| MinerU | Apache-2.0 **avec seuils commerciaux** additionnels | LICENSE.md |
| evalite (28/04/2026), Ragas (24/02/2026) ⚠️ | Inactifs ; Ragas figurait comme actif au catalogue 02 | ecosyste.ms |
| OpenVoice (19/04/2025), delayed-streams-modeling (26/01/2026) | Dépôts inactifs (les poids Kyutai restent retenus via [00](00-decision-bases-et-briques.md) §6) | ecosyste.ms |
| Chatterbox (21/07/2026) | À la limite des 3 mois : à surveiller, pas d'intégration | ecosyste.ms |
| PurpleLlama / LlamaFirewall | Licence racine = Llama 3.2 Community License | LICENSE |
| Invariant (12/01/2026), Qwen3Guard (dépôt du 21/10/2025, sans LICENSE à la racine) | Inactifs ; licence non vérifiable | ecosyste.ms, raw |
| Transformer Lab | AGPL-3.0 | LICENSE |
| BemiHQ (audit) | **SSPL** | LICENSE |
| supa_audit, Fides | **Archivés** | ecosyste.ms |
| Retraced | Peu actif (451 ★) et inutile depuis `@sim/audit` | ecosyste.ms |
| scimmy | Dernière version du 05/03/2025 ; remplacé par `@better-auth/scim` | packages.ecosyste.ms |
| Tremor | Inactif (10/10/2025) ; ECharts déjà dans Sim | ecosyste.ms |
| Novel (18/01/2025), i18n-ally (13/12/2024), Onborda (dernière version du 22/12/2024, pas de LICENSE dans le dépôt) | Inactifs | ecosyste.ms |
| react-joyride (09/07/2026) | Juste au-delà des 3 mois ; driver.js préféré | ecosyste.ms |
| Shepherd.js | Double licence **AGPL-3.0 / commerciale** pour un usage commercial | LICENSE.md |
| Plate, Lexical, BlockNote | Doublons de Tiptap 3 (déjà dans Sim) ; BlockNote : paquets `xl-*` en GPL-3.0 | LICENSE |
| tarteaucitron.js, cookieconsent | Doublons de `c15t` (déjà dans Sim) | package.json de Sim |
| Carbone | Carbone Community License : interdit l'offre en service hébergé de génération de documents | LICENSE.md |
| Documenso, OpenSign, LibreSign | AGPL-3.0 (+ `packages/ee/` pour Documenso) ; DocuSeal préféré en service non modifié | LICENSE |
| StackForge-EU/factur-x | EUPL-1.2 (copyleft) et 18 ★ | LICENSE |
| node-zugferd | Dernière version bêta du 07/08/2025 ; activité sous le seuil | packages.ecosyste.ms |
| go-choruspro, chorus-api | 1 et 3 ★ ; inactifs | ecosyste.ms |
| qontoctl | AGPL-3.0 | LICENSE |
| sellsy-mcp (healdigital), sirene-mcp (Nathandona) | Pas de LICENSE / 0 ★ et inactif (30/05/2026) ; l'API publique suffit | raw, ecosyste.ms |
| DSFR (Système de design de l'État) | Code Etalab 2.0, mais **usage réservé à l'administration** (« ne doit pas être utilisé par des entités extérieures ») | [LICENSE.md](https://raw.githubusercontent.com/GouvernementFR/dsfr/HEAD/LICENSE.md) |
| eslint-plugin-jsx-a11y (06/01/2026) | Inactif ; Sim utilise Biome (règles a11y intégrées, inférence) + axe-core | ecosyste.ms |
| openllmetry-js (18/06/2026) | Inactif ; Sim a déjà son instrumentation OpenTelemetry | ecosyste.ms |
| lakeFS | BSL 1.1 (catalogue 02) | 02 |
| Krayin, Frappe CRM, Zammad | Pas prioritaires ; Frappe CRM et Zammad en AGPL-3.0 (API seulement si un client les utilise) | LICENSE |

---

## 9. Annexe — méthode et sources

**Collecte (21-22/10/2026)**
- **Dépôts** : ≈ 200 dépôts passés par `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/<owner>%2F<repo>` (étoiles, `pushed_at`, `archived`, licence déclarée, langage). Aucun appel à `api.github.com`.
- **Licences** : pour chaque dépôt, lecture du fichier brut `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/LICENSE` (ou `LICENSE.md`, `LICENSE.txt`, `COPYING`). Sondage de `ee/LICENSE`, `enterprise/LICENSE`, `packages/ee/LICENSE` : trouvés chez Langfuse, Agenta, Mastra, Polis, Documenso, Chatwoot, Tolgee, Activepieces. `ee/` de Sim non ouvert (règle de salle blanche).
- **Paquets npm** (version, date, licence, téléchargements mensuels) : `https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/<nom>`.
- **Sim** (lecture seule, fichiers bruts) : `apps/sim/package.json`, `package.json` racine, `packages/{audit,runtime-secrets,platform-authz,security,auth}/package.json` (tous Apache-2.0), `packages/audit/src/{index,types,log}.ts`, `apps/sim/blocks/blocks/{guardrails,stt,tts}.ts`, sondage de 31 noms de blocs (présents : hubspot, docusign, pipedrive, quickbooks, stripe, mistral_parse, textract, stt, tts, elevenlabs, translate, memory, evaluator, router, workflow ; absents : pennylane, qonto, sellsy, axonaut, payfit, swile, odoo, dolibarr, twenty, chatwoot, documenso, docuseal, ocr). Note : `@sim/runtime-secrets` charge des secrets AWS au démarrage du conteneur ; ce n'est pas un gestionnaire de secrets pour les utilisateurs.
- **Recherche web** (Firecrawl) : Factur-X TypeScript, Chorus Pro, data.gouv MCP, Sirene MCP, Pennylane, Qonto, Sellsy/Axonaut/PayFit/Swile, plugins Better Auth, extraction i18n, copilots de workflow, Kestra, Workflow Builder, batch compatible OpenAI, calendrier de la réforme.

**Sources principales citées**
- Better Auth : https://better-auth.com/docs/plugins/sso · https://better-auth.com/docs/plugins/scim · https://better-auth.com/docs/plugins · https://better-auth.com/blog/1-5
- Langfuse (périmètre MIT / `ee`) : https://langfuse.com/handbook/chapters/open-source
- data.gouv : https://github.com/datagouv/datagouv-mcp · https://guides.data.gouv.fr/intelligence-artificielle/le-serveur-mcp-de-data.gouv.fr · https://www.data.gouv.fr/dataservices/api-recherche-dentreprises
- Qonto : https://docs.qonto.com/mcp/overview · Pennylane : https://pennylane-mcp.readme.io/docs/getting-started · https://github.com/wanadev/pennylane-mcp
- Réforme facture électronique : https://www.compta-online.com/facturation-electronique-ao5562 · https://go.sellsy.com/blog/calendrier-de-la-facturation-electronique · https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees
- i18n : https://codemod.com/blog/next-intl-codemod · https://www.locize.com/blog/i18next-cli-instrument · https://intlayer.org/blog/intlayer-with-next-intl · https://github.com/amannn/next-intl/discussions/2036
- Copilot : https://kestra.io/docs/ai-tools/ai-copilot · https://kestra.io/blogs/release-1-0 · https://github.com/synergycodes/workflowbuilder
- Batch : https://docs.litellm.ai/docs/providers/vllm_batches
- Sim : https://raw.githubusercontent.com/simstudioai/sim/HEAD/apps/sim/package.json · https://raw.githubusercontent.com/simstudioai/sim/HEAD/packages/audit/src/types.ts · https://www.sim.ai/templates (404 le 22/10/2026)

**Limites**
- Ni installation ni exécution de code : la qualité réelle, la compatibilité React 19 / Next 16 de chaque bibliothèque et les performances restent à tester (spike, [00](00-decision-bases-et-briques.md) §11).
- La licence des **poids** de modèles (GLiNER, Granite Guardian, Qwen3Guard, Chatterbox) n'a pas été lue fiche par fiche sur Hugging Face.
- Presidio, dots.ocr et quelques dépôts sont absents d'ecosyste.ms : leur LICENSE a été lu, mais pas leurs étoiles ni leur activité.
- Les modules payants de docxtemplater et le statut exact de l'API Entreprise sont à confirmer.
- Avis juridique nécessaire pour WTFPL (e-invoice-eu), MPL-2.0 (mcp-server-odoo, axe-core) et l'usage d'AGPL en service séparé.
- Les efforts et les priorités sont des estimations de l'auteur (inférence).
