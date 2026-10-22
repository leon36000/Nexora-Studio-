# 00 — Synthèse : Mistral Studio en un seul document

> **État au 21/10/2026.** Synthèse des 20 chapitres de cette base de connaissances. Chaque affirmation renvoie au chapitre qui la détaille (et, dans ce chapitre, à ses sources). Faits uniquement : aucune décision de conception pour Nexora Studio n'est prise ici. Cette conception se fera avec le fondateur.

## Sommaire
1. [Ce qu'est Mistral Studio](#1-ce-quest-mistral-studio)
2. [La gamme Mistral et la place de Studio](#2-la-gamme-mistral-et-la-place-de-studio)
3. [Carte fonctionnelle de Studio](#3-carte-fonctionnelle-de-studio)
4. [La console : écrans, menus, parcours](#4-la-console--écrans-menus-parcours)
5. [Les briques en détail (résumé)](#5-les-briques-en-détail-résumé)
6. [API, SDK et modèle de données](#6-api-sdk-et-modèle-de-données)
7. [Modèles, tarifs et niveaux de service](#7-modèles-tarifs-et-niveaux-de-service)
8. [Administration, sécurité, conformité](#8-administration-sécurité-conformité)
9. [Chiffres et limites clés](#9-chiffres-et-limites-clés)
10. [Maturité : ce qui est GA, en preview, déprécié](#10-maturité--ce-qui-est-ga-en-preview-déprécié)
11. [Architecture et écosystème technique](#11-architecture-et-écosystème-technique)
12. [Chronologie](#12-chronologie)
13. [Constats transverses](#13-constats-transverses)
14. [Ce que la phase 2 a ajouté](#14bis-ce-que-la-phase-2-a-ajouté-vidéos-image-par-image-captures)
15. [Limites de cette recherche](#14-limites-de-cette-recherche)

---

## 1. Ce qu'est Mistral Studio

- **Définition officielle** : « Your AI production platform » / « Votre plateforme de production IA ». C'est une plateforme unique pour **construire, déployer, observer et gouverner** des applications et des agents IA, avec confidentialité et propriété des données. La doc la décrit comme la **console développeur + l'API Mistral** : clés, Playground, Prompts, Skills, agents, workflows, évaluations, suivi d'usage. → [01](01-offre-produit-positionnement-tarifs.md), [11](11-demarrage-playground-agents-connecteurs.md)
- **Origine** : successeur de **La Plateforme**, ouverte en bêta le 11/12/2023 sur `console.mistral.ai` avec 3 endpoints de chat et 1 d'embeddings, sur le modèle de l'API d'OpenAI. Annoncé comme **« Mistral AI Studio »** en bêta privée le **24/10/2025**, avec **trois piliers** : **Observability**, **Agent Runtime** et **AI Registry**. Aucune annonce n'a marqué la fin de cette bêta : chaque brique est passée en preview ou en GA séparément. Aujourd'hui appelé « Mistral Studio » ou « Studio ». Des routes internes contiennent encore `plateforme`. → [01](01-offre-produit-positionnement-tarifs.md), [02](02-historique-annonces-presse.md)
- **La promesse en 5 verbes** (page produit) :

  | Verbe | Contenu annoncé |
  |---|---|
  | *Build* | Workflows, Agents, Connectors |
  | *Iterate* | Experiments, Campaigns, Judges, Datasets |
  | *Deploy* | Hybrid, Dedicated, Self-hosted |
  | *Govern* | Observability, Guardrails, Moderation |
  | *Accelerate* | AI registry, Versioning and lineage, Developer toolkit |

  → [01](01-offre-produit-positionnement-tarifs.md)
- **Philosophie produit répétée par les dirigeants** : Studio est **« code-first »** et apporte aux modèles les primitives de production qui leur manquent (workflows longue durée, sandboxes, observabilité, évaluations, registre d'actifs, gouvernance). Une **couche low-code** est annoncée mais n'a été montrée dans aucune vidéo. → [31](31-autres-videos.md)
- **Pas de preuves marketing** sur la page Studio : ni logos clients, ni témoignages, ni chiffres, ni FAQ, ni prix. → [01](01-offre-produit-positionnement-tarifs.md)

## 2. La gamme Mistral et la place de Studio

| Produit | Pour qui | Rôle | Point d'entrée |
|---|---|---|---|
| **Vibe** (ex-Le Chat) | Utilisateurs finaux | Agent unifié : mode **Work** (web, mobile) et mode **Code** (CLI, VS Code, sessions web) | `chat.mistral.ai` |
| **Studio** | Développeurs | Console + API : construire, tester, déployer, observer | `console.mistral.ai` |
| **Admin** | IT, sécurité, finance | Organisation, membres, rôles, workspaces, facturation, SSO, politiques | `admin.mistral.ai` |
| **Cloud** (Inference + Compute) | Infrastructure | Inférence et GPU européens « souverains » | — |
| **Forge** | Équipes data/ML | Personnalisation et entraînement de modèles | — |
| **Applied AI services** | Grands comptes | Accompagnement, entraînement sur mesure, déploiement | — |

- Les sessions sont **partagées** entre Vibe, Studio et Admin. Les **Workspaces** sont la même entité dans les trois produits. → [03](03-administration-securite-facturation.md), [22](22-vibe-work-le-chat.md)
- **Studio alimente Vibe** : les Workflows codés dans Studio deviennent des assistants dans Vibe Work. Les Skills ont un bouton `Publish to Vibe`. Les Agents se publient via « Disponible dans Vibe » / `deployment_chat`. Vibe est donc le **canal de distribution interne** de ce que les développeurs construisent dans Studio. → [13](13-workflows-2-interaction-production.md), [22](22-vibe-work-le-chat.md), [30](30-video-pentiminax-agents-sans-coder.md)
- **Le Chat devient Vibe** le 28/05/2026 : un seul agent et une seule licence pour le travail et pour le code. Depuis le 22/09/2026, les onglets Chat et Work ont fusionné (toggle fast/think). Les Agents de Chat sont remplacés par les **Skills**, invoqués avec `@`. Les organisations Enterprise ont six mois pour migrer. → [02](02-historique-annonces-presse.md), [22](22-vibe-work-le-chat.md)

### Mistral, l'entreprise (contexte)

→ [02](02-historique-annonces-presse.md)
- **Fondation** : avril 2023, par Arthur Mensch, Guillaume Lample et Timothée Lacroix.
- **Levées de fonds** :
  - série C de 1,7 Md€, valorisation post-money de 11,7 Md€ (09/09/2025, menée par ASML) ;
  - série D de 3 Md€, valorisation de plus de 21 Md€ (08/09/2026, menée par Samsung Electronics).
- **Chiffre d'affaires** : ARR supérieur à 400 M$ en février 2026, contre environ 20 M$ un an plus tôt ; objectif de plus d'1 Md$ fin 2026, selon les déclarations reprises par la presse.
- **Présence** : 20 pays, plus de 125 grandes entreprises clientes.
- **Stratégie « full stack » souveraine** : modèles open-weight, produits (Studio, Vibe, Forge), infrastructure (objectif de 1 GW de calcul en Europe d'ici 2030) et services (Applied AI).
- **Concurrence** : entre octobre 2025 et avril 2026, tous les grands acteurs ont lancé une plateforme d'agents aux briques presque identiques : AWS Bedrock AgentCore, Microsoft Agent 365 et Foundry, OpenAI Frontier, Anthropic Claude Managed Agents, Google Gemini Enterprise Agent Platform.
- **Différenciation de Studio selon la presse** : déploiement hybride ou auto-hébergé, plan de contrôle chez Mistral avec exécution chez le client, poids ouverts, infrastructure européenne.
- **Adoption** : aucun chiffre d'adoption de Studio n'est publié ; seul HTX est cité comme client « AI Studio ».

## 3. Carte fonctionnelle de Studio

| Couche | Brique | Rôle | Statut (21/10/2026) | Chapitre |
|---|---|---|---|---|
| **Inférence** | Chat Completions, FIM | API cœur sans état (texte, vision, outils, JSON, raisonnement) | GA | [10](10-conversations-capacites.md) |
| | Embeddings | `mistral-embed` (1024 d), `codestral-embed` (jusqu'à 3072 d) | GA | [10](10-conversations-capacites.md) |
| | Modération, Guardrails | `mistral-moderation-2603` (11 catégories, gratuit), guardrails déclaratifs | GA | [10](10-conversations-capacites.md) |
| | Document AI | OCR, annotations JSON, Document QnA | GA | [16](16-document-ai-ocr.md) |
| | Audio | Transcription (offline, temps réel), TTS, clonage de voix | Voxtral 3 au lancement | [18](18-audio-1-transcription.md), [19](19-audio-2-tts-agents-vocaux.md) |
| | Batch | Asynchrone à −50 % | GA | [17](17-batch-inference-tarifs.md) |
| **Construire** | Playground | Tester modèles et paramètres sans code ; sert aussi d'éditeur d'agent | GA | [11](11-demarrage-playground-agents-connecteurs.md), [30](30-video-pentiminax-agents-sans-coder.md) |
| | Agents + Conversations | Agent versionné (modèle, instructions, outils, `completion_args`, handoffs) ; conversations à état persistant | API beta | [11](11-demarrage-playground-agents-connecteurs.md) |
| | Outils intégrés | `web_search` (+ premium), `code_interpreter`, `image_generation`, `document_library` | GA/beta | [11](11-demarrage-playground-agents-connecteurs.md) |
| | Prompts (registry) | Prompts versionnés, `{{variables}}`, alias `production`/`staging` | beta (depuis le 09/07/2026) | [10](10-conversations-capacites.md) |
| | Skills | Instructions et fichiers réutilisables, publiables dans Vibe | beta (depuis le 09/07/2026) | [11](11-demarrage-playground-agents-connecteurs.md) |
| | Connectors | Serveurs MCP gérés (OAuth, filtrage, confirmation humaine, Debugger) | Public Preview | [11](11-demarrage-playground-agents-connecteurs.md) |
| | Workflows | Orchestration durable sur **Temporal** ; workers chez le client | Public Preview (depuis le 27-28/04/2026) | [12](12-workflows-1-concepts-construction.md), [13](13-workflows-2-interaction-production.md) |
| | Libraries | RAG géré (upload, indexation de sites, outil `document_library`) | API beta | [15](15-recherche-libraries-search-toolkit.md) |
| | Search Toolkit, Agentic Search | Framework Python de recherche (Vespa, Postgres, Qdrant) ; 7 outils MCP | pré-1.0 | [15](15-recherche-libraries-search-toolkit.md) |
| | Voice agents | Pipeline micro → STT → LLM → TTS sur LiveKit ; navigateur ; SIP | lancement octobre 2026 | [19](19-audio-2-tts-agents-vocaux.md) |
| | Secrets Manager | Coffre de secrets par workspace (pour les managed deployments) | Public Preview | [10](10-conversations-capacites.md) |
| | Files | Fichiers (batch, OCR, fine-tuning historique) | GA | [17](17-batch-inference-tarifs.md) |
| **Observer / Améliorer** | Traces + Explorer | OpenTelemetry, arbre de spans, langage de requête, masquage côté client | Private Preview, Enterprise | [14](14-observabilite-evaluations.md) |
| | Évaluations | Datasets → Task → Evaluators → Results ; Projects › Evaluations › Runs ; optimisation de prompts (GEPA) | Private Preview, Enterprise | [14](14-observabilite-evaluations.md) |
| | Judges, pipelines en ligne | Juges LLM enregistrés ; pipelines `judge-v1`, `detection-v1`… avec échantillonnage | présents dans la spec seulement | [14](14-observabilite-evaluations.md) |
| **Gouverner** | Workspaces, RBAC, clés API, service accounts | Isolation, rôles additifs, identités machine | GA (Admin API : Enterprise, Preview) | [03](03-administration-securite-facturation.md) |
| | Audit logs, ZDR, SSO | Traçabilité, zéro rétention, SAML | Enterprise / plans payants | [03](03-administration-securite-facturation.md) |
| **Déployer** | SaaS UE, endpoints régionaux, Priority Tier, managed deployments, self-hosted | Options d'exécution | voir §7 et §11 | [17](17-batch-inference-tarifs.md), [13](13-workflows-2-interaction-production.md) |

## 4. La console : écrans, menus, parcours

Ce qui suit vient de la vidéo examinée image par image ([30](30-video-pentiminax-agents-sans-coder.md)), complétée par les routes citées dans la doc et dans les vidéos officielles ([31](31-autres-videos.md)).

- **Barre supérieure** : sélecteur de produit « Studio ▾ », organisation courante, **sélecteur de Workspace**, « Retours », recherche « ⌘K », avatar.
- **Menu latéral** (plan gratuit, interface en français) :

  | Groupe | Entrées |
  |---|---|
  | — | Accueil, Clés API |
  | **Créer** | Agents (Liste, Playground), Audio (Reconnaissance vocale, Synthèse vocale), Batches, Document AI, Workflows |
  | **Contexte** | Connecteurs, Connaissances (Fichiers, Bibliothèques `New`), Prompts `New`, Skills `New` |
  | Bas du menu | Carte de consommation (%, « Limites », « Réinitialisé dans N jours »), « Activer Pay-per-use », « Aide et ressources » |

  Aucune entrée Observabilité dans ce plan. La fonction existe sous `/observability/traces` (Enterprise). Une démo de décembre 2025 montrait une console organisée en **Create / Observe / Improve**.
- **Routes** : `/home`, `/build/playground`, `/build/agents`, `/build/agents/new`, `/build/workflows`, `/build/connectors`, `/build/skills`, `/build/prompts`, `/build/files`, `/build/batches`, `/observability/traces`.
- **Accueil** : cartes « Créer » (Playground, Workflows, Créer une clé API) et « Capturer » (OCR, Reconnaissance vocale, Synthèse vocale). Démarrages rapides : créer un agent, tester l'audio, requêtes API, déployer les modèles. Liens vers la documentation.
- **Parcours « créer un agent »** (no-code) :
  1. Le Playground (valeurs par défaut : `temperature` 0.7, `max_tokens` 2048, `top_p` 1, format « Texte », effort de raisonnement « Aucun ») → « Créer un agent ».
  2. Une modale demande nom, description et métadonnées clé/valeur.
  3. Une modale « Agent créé avec succès » affiche l'ID `ag_…` et du code Python, TypeScript ou cURL.
  4. L'éditeur s'ouvre en deux colonnes : configuration à gauche, aperçu et conversation à droite.
  5. « Enregistrer les modifications de l'agent » ouvre un écran de **diff** (Instructions / Configuration) et crée une **nouvelle version** (`v0` à la création, puis `v1`…). On peut « Rétablir cette version ».
- **Détails fins observés** :
  - Le sélecteur de modèles affiche les **prix en €/1M tokens** et les **alias**.
  - Le Playground **n'exécute pas** les fonctions personnalisées : il affiche un résultat « TODO » à remplir à la main.
  - « Disponible dans Vibe » est **grisé tant que l'agent a une fonction personnalisée**.
  - Les outils de recherche « Recherche » et « Recherche premium » s'excluent mutuellement.
- **Admin Panel** (`admin.mistral.ai`) : organisations, workspaces, membres, groupes, rôles, clés API, plafonds, facturation, SSO, audit logs, connecteurs au niveau organisation, préférences (par exemple activer ou non le mode Work). → [03](03-administration-securite-facturation.md), [31](31-autres-videos.md)

## 5. Les briques en détail (résumé)

### Inférence et capacités
→ [10](10-conversations-capacites.md)
- `POST /v1/chat/completions` est **sans état**. Paramètres : `temperature`, `top_p`, `top_k`, `max_tokens`, `min_tokens`, pénalités, `n`, `stop`, `random_seed`, `response_format` (`json_object` / `json_schema`), `tools` / `tool_choice` / `parallel_tool_calls`, `reasoning_effort` (`none` à `xhigh`), `prediction`, `prompt_cache_key`, `guardrails`, `service_tier`, `safe_prompt` (déprécié), `logprobs`.
- **Vision** : 8 images au plus, 10 Mo maximum.
- **Prompt caching** : les tokens en cache coûtent 10 % du prix d'entrée.
- **Raisonnement** : passe désormais par `reasoning_effort`. Les modèles Magistral sont dépréciés.
- **SDK** : Python V1/V2 (plusieurs nouveautés n'existent qu'en V2) et TypeScript.

### Agents, Conversations, outils, Connecteurs
→ [11](11-demarrage-playground-agents-connecteurs.md)
- Un **Agent** est versionné à chaque mise à jour. Les versions peuvent recevoir des alias.
- Une **Conversation** est un historique persistant d'**entries** : messages, appels de fonctions, exécutions d'outils, handoffs. Elle peut être relancée depuis une entry ou désactivée avec `store=False`.
- **Handoffs** : délégation d'un agent à un autre, exécutée côté serveur ou rendue au client.
- **Connecteurs** : serveurs MCP hébergés et exécutés par Mistral.
  - Visibilité `private`, `shared_workspace` ou `shared_org`.
  - Authentification par en-têtes ou OAuth2.
  - Filtrage d'outils `include` / `exclude`.
  - Appel direct d'un outil, sans passer par un modèle.
  - Confirmation humaine (`requires_confirmation`, `tool_confirmations`).
- **Serveur MCP Mistral** (`https://api.mistral.ai/mcp`) : il expose le workspace Studio à n'importe quel client MCP.
- **Restriction de modèles** : selon la FAQ, les Agents ne prennent que `mistral-medium-latest` et `mistral-large-latest`. Les exemples de la doc contredisent cette règle.

### Workflows
→ [12](12-workflows-1-concepts-construction.md), [13](13-workflows-2-interaction-production.md)
- **Exécution** : en code Python 3.12+ (`mistralai-workflows`, outil `uv`), sur **Temporal**. Mistral héberge l'orchestrateur ; les **workers tournent chez le client** et ne font que des connexions sortantes.
- **Primitives** :
  - côté workflow : activities, signals, queries, updates, schedules, sub-workflows, continue-as-new, streaming ;
  - côté agents : agents durables avec handoffs et MCP ;
  - exécution « **on behalf of** » l'utilisateur ;
  - côté données : chiffrement AES-GCM côté client, offloading vers le stockage du client, compression zstd.
- **Workflows conversationnels** : formulaires, confirmations, todo-lists, canvas et 12 composants UI. Ils se **publient dans Vibe Work** via `ChatAssistantWorkflowOutput`.
- **Production** :
  - deployments, et hardened deployments avec « pins » ;
  - **managed deployments** : Mistral construit l'image depuis GitHub et l'exécute dans la région `nl-north-1` ; quotas de 0, 3 ou 10 selon le plan ;
  - 16 codes d'erreur `WF_xxxx` ;
  - export OpenTelemetry par défaut et visualizer du graphe.

### Observabilité et évaluations
→ [14](14-observabilite-evaluations.md)
- **Traces** : envoyées en OTLP/HTTP JSON depuis les SDK, Workflows et Vibe.
  - Conservées 30 jours.
  - **Masquage côté client activé par défaut**.
  - Trace Explorer avec un langage d'expressions (`AND`/`OR`, `LIKE`, `REGEXP`, attributs de span).
- **Évaluations hors ligne** (`mistralai-evaluations`) :
  - évaluateurs et évaluateurs de run ;
  - `num_generations` ;
  - statistiques déclaratives (percentiles, F1…) ;
  - goals ;
  - `rescore` et `retry_failed_records` ;
  - optimisation de prompts `SimpleOptimizer` et `GEPA`.
- **Plugin Workflows** : chaque enregistrement d'évaluation devient un workflow enfant.

### Recherche et RAG
→ [15](15-recherche-libraries-search-toolkit.md)
- **Libraries** : RAG géré, avec documents, accès, URL signées, déduplication et Libraries privées.
- **Agentic Search** :
  - boucle chercher → ouvrir → naviguer → `grep` → rechercher à nouveau ;
  - 7 outils MCP ;
  - gain annoncé sur FinanceBench : de **27 % à 86 %**.
- **Search Toolkit** :
  - chaîne d'ingestion : loaders, extractors, splitters, enrichers, embedders ;
  - recherche : retrievers, rerankers, cache sémantique ;
  - backends : Vespa et Postgres ; template `search-starter-app`.

### Document AI
→ [16](16-document-ai-ocr.md)
- **Endpoint unique** `POST /v1/ocr` pour l'OCR et les annotations par schéma JSON. Document QnA passe par le chat.
- **Sortie** : Markdown par page, plus images, tableaux, liens, en-têtes et pieds de page, blocs.
- **Limites** : 50 Mo et 1 000 pages par fichier ; une trentaine de formats.

### Audio
→ [18](18-audio-1-transcription.md), [19](19-audio-2-tts-agents-vocaux.md)
- **Voxtral 3** : 3 modèles de transcription et 2 de TTS.
- **Transcription** : offline (HTTP, SSE) ou temps réel (WebSocket), diarisation, biais de contexte, détection de tours.
- **Synthèse vocale** : 36 voix dans 21 langues, 34 émotions, phonèmes IPA, clonage zero-shot.
- **Agents vocaux** : sur LiveKit, avec webhooks signés HMAC et téléphonie SIP réservée à l'Enterprise.

### Batch et inférence
→ [17](17-batch-inference-tarifs.md)
- **Batch** :
  - JSONL jusqu'à 1 M de requêtes, ou inline jusqu'à moins de 10 000 ;
  - un seul modèle par job ;
  - expiration à 24 h par défaut, 7 jours maximum.
- **Cycle de vie des modèles** : Labs → Preview → GA → Deprecated → Retired, avec 6 mois de préavis pour un modèle GA.

## 6. API, SDK et modèle de données

- **Spécification OpenAPI 3.1** : **232 chemins, 319 opérations, 53 tags, 951 schémas, 109 énumérations**. Serveur `https://api.mistral.ai`. Authentification `Bearer` (clé API), clé Admin dédiée, et en-tête `x-api-key` pour certaines routes. → [40](40-api-catalogue-endpoints.md)
- **Répartition** : workflows (52 opérations), observability (65), connectors (22), admin (~50), libraries (20), agents/conversations (24), prompts/skills (18), rag (19), audio (11), etc. → [40](40-api-catalogue-endpoints.md)
- **SDK officiels** : Python `mistralai` 3.3.0 et TypeScript `@mistralai/mistralai` 3.1.0, sous licence Apache-2.0. Ils sont **générés par Speakeasy** depuis la spec (288 méthodes chacun). → [32](32-ecosysteme-open-source-sdk.md)
- **Objets principaux** :
  - `Agent` (versions, alias) ;
  - `Conversation` / `Entry` ;
  - `Prompt` (versions, alias) ;
  - `Skill` ;
  - `Library` / `Document` / accès ;
  - `Connector` ;
  - `Workflow` / `Execution` / `Deployment` / `Schedule` / `Run` ;
  - `Trace` / `Span` / `Log` ;
  - `Dataset` / `Record` / `Judge` / `Evaluation` / `Run` / `Optimization` ;
  - `BatchJob` / `File` ;
  - `Workspace` / `ApiKey` / `ServiceAccount` / `UserGroup` ;
  - `Voice` / audio `Session`.

  Les statuts et les énumérations sont listés dans [40](40-api-catalogue-endpoints.md), annexe A.

## 7. Modèles, tarifs et niveaux de service

- **Catalogue** : 75 fiches, dont 27 actives (17 GA, 10 Public Preview), 24 dépréciées et 24 retirées. → [20](20-modeles-ressources-changelogs.md)

  | Modèle | ID API | Caractéristiques | Prix $/M tokens (entrée / sortie) |
  |---|---|---|---|
  | Mistral Large 4 | `mistral-large-4` | Public Preview, MoE de 1,05 T paramètres (52 B actifs), contexte de 1M | 1,36 / 4,18 (cache 0,14) |
  | Mistral Large 3 | `mistral-large-2512` | GA | 0,5 / 1,5 |
  | Mistral Medium 3.5 | `mistral-medium-3-5` | GA, 128 B dense, poids ouverts (MIT modifiée) | 1,5 / 7,5 |
  | Mistral Small 4 | `mistral-small-2603` | GA, MoE | 0,15 / 0,6 |
  | Ministral 3 (14B, 8B, 3B) | `ministral-*-2512` | GA | 0,2 / 0,15 / 0,1 (entrée = sortie) |
  | Codestral | `codestral-2508` | GA | 0,3 / 0,9 |
  | Z.ai GLM 5.3 (tiers) | `zai-glm-5-3` | GA, hébergé « sans modification » | 1,4 / 4,4 |
  | OCR 4.1 | `mistral-ocr-4-1` | — | 4 $ (5 $ annoté) pour 1 000 pages |
  | Voxtral Transcribe 3 (Mini, Realtime, Small) | — | — | 0,0035 / 0,008 / 0,004 $ par minute |
  | Voxtral TTS 3 | `voxtral-mini-tts-3-0` | — | 13 $ par million de caractères |
  | Mistral Moderation 2 | `mistral-moderation-2603` | — | gratuit |

  → [17](17-batch-inference-tarifs.md)
- **Modificateurs** :
  - Batch : **−50 %** ;
  - Priority Tier : **×1,75**, seul niveau avec SLA (99,5 %), activé par `service_tier: "auto"` ;
  - endpoints régionaux UE ou US : **×1,1**, mais seul le function calling y est disponible (pas d'Agents, de Batch ni de Files) ;
  - entrée en cache : jusqu'à **−90 %** ;
  - modèles Labs : gratuits ;
  - affichage en euros = **0,85 × le prix en dollars**. → [17](17-batch-inference-tarifs.md), [01](01-offre-produit-positionnement-tarifs.md)
- **Modes de paiement de Studio** :
  - **Free mode** (gratuit, sans carte bancaire selon une partie de la doc ; les **données peuvent servir à l'entraînement**, avec opt-out possible) ;
  - **pay-as-you-go** par **crédits prépayés** ;
  - **paliers automatiques** de limites (Tier 1 à 4, déclenchés à 20, 100, 500 et 2 000 € facturés) ;
  - **plafonds de dépense** par organisation et par workspace ;
  - HTTP `402` quand le solde est épuisé. → [01](01-offre-produit-positionnement-tarifs.md), [03](03-administration-securite-facturation.md)
- **Plans globaux** (Vibe + Studio + API) : Free, Pro (14,99 $/mois), Team (24,99 $ par utilisateur et par mois, 2 utilisateurs minimum), Education, Enterprise (sur devis). L'**usage mensuel inclus est partagé entre Studio, l'API et Vibe Code**. La page /pricing n'a **plus d'onglet API** : elle renvoie vers la page de prix de la doc. → [01](01-offre-produit-positionnement-tarifs.md), [21](21-vibe-code.md)
- **SLA Enterprise** : 99,5 % (Basic) ou 99,9 % (Standard, Premium). Crédits de 2 à 20 %, plafonnés à 25 %. Première réponse P1 en 2 h à 12 h selon le niveau. → [01](01-offre-produit-positionnement-tarifs.md)
- **Prix des outils** (web search, code interpreter, connecteurs, Libraries) : **introuvables** dans la doc publique. → [17](17-batch-inference-tarifs.md)

## 8. Administration, sécurité, conformité

→ [03](03-administration-securite-facturation.md), [01](01-offre-produit-positionnement-tarifs.md), [14](14-observabilite-evaluations.md)

- **Hiérarchie** : Enterprise Account › Organization › Workspace (500 workspaces actifs au plus par organisation).
- **RBAC** : les rôles sont **additifs**.

  | Portée | Rôles |
  |---|---|
  | Organisation | `member`, `billing_manager`, `organization_admin` |
  | Workspace | `user`, `dev`, `mistral_code_user`, `workspace_contributor`, `workspace_admin`, `observability_viewer` |
  | Cas particuliers | `billing`, `workflow_executor` |

- **Identité** :
  - e-mail ;
  - authentification par domaine (plan Team et plus) ;
  - **SAML 2.0** (Enterprise, pas d'OIDC) ;
  - vérification de domaine par DNS TXT ;
  - **SCIM** en private preview ;
  - **service accounts** avec **workload identity federation** (jetons OIDC ou Kubernetes, sans secret stocké).
- **Clés API** : portée workspace, types Studio / Vibe / Mistral Code, portée d'accès aux connecteurs, politique d'expiration. Les clés Admin sont distinctes.
- **Audit logs** (Enterprise) : 196 événements documentés (252 dans la spec), pas d'export.
- **Données** :
  - hébergement **UE par défaut** ;
  - **ZDR** sur demande, pour les plans payants et 10 endpoints sans état ;
  - opt-out de l'entraînement ;
  - masquage des traces côté client.
- **Certifications** : ISO 27001, ISO 27701, SOC 2 Type II. BAA HIPAA proposé.
- **Sécurité de la chaîne logicielle** : incident « Mini Shai-Hulud » (avis MAI-2026-002, mai 2026), des versions compromises des SDK npm et PyPI ont été publiées puis retirées. → [20](20-modeles-ressources-changelogs.md), [32](32-ecosysteme-open-source-sdk.md)

## 9. Chiffres et limites clés

| Domaine | Limite |
|---|---|
| Workflows | 2 Mo par entrée/sortie ; historique de 51 200 événements ou 50 Mo ; `execution_timeout` de 1 h par défaut ; 2 s de code workflow entre deux activities ; 1 Mo par message de streaming ; 20 search keys |
| Managed deployments | 0 (Free, Pro/Team sans pay-as-you-go), 3 (pay-as-you-go), 10 (Enterprise) ; au-delà, erreur 403 |
| Batch | 1 M de requêtes par fichier ; 1 M en attente par workspace ; inline < 10 000 ; 24 h par défaut, 7 jours maximum |
| OCR | 50 Mo et 1 000 pages par document ; annotation limitée à 8 images |
| Vision | 8 images, 10 Mo |
| Audio temps réel | Configuration verrouillée au premier morceau audio ; diarisation et détection de tours incompatibles |
| Traces | 30 jours de rétention |
| Workspaces | 500 actifs par organisation |
| Limites connues générales | Fichiers de 512 Mo, 128 outils, streaming de 10 min (voir [20](20-modeles-ressources-changelogs.md)) |
| Vibe Code Web | Sessions de 24 h maximum, 3 h d'inactivité ; 2 par jour (Free) ou 100 par jour (payant) |

## 10. Maturité : ce qui est GA, en preview, déprécié

- **GA** : Chat, FIM, embeddings, OCR, Batch, modération, endpoints régionaux, la plupart des modèles phares.
- **Beta (préfixe `beta` dans l'API)** : Agents, Conversations, Libraries, Prompts, Skills, Observability, RAG, service accounts, Admin.
- **Public Preview** : Workflows, Connectors et leur Debugger, Secrets Manager, managed deployments, Priority Tier, Vibe Code Web, tâches planifiées de Vibe.
- **Private Preview** : Observability et évaluations (Enterprise uniquement), SCIM.
- **Déprécié** :
  - fine-tuning et Classifier Factory (« plus activement supportés ») ;
  - `safe_prompt` et `mistral-moderation-2411` ;
  - raisonnement natif Magistral ;
  - Voxtral 2 ;
  - `GET /v1/agents` (remplacé par `/v1/agents/pages`) ;
  - `GET /v1/audio/voices` (remplacé par la v2) ;
  - les Agents du Chat (remplacés par les Skills).
- **Annoncé mais pas encore livré** : couche low-code ; packaging trimestriel on-prem / air-gapped ; TTS temps réel ; instructions de style TTS. → [31](31-autres-videos.md), [19](19-audio-2-tts-agents-vocaux.md)

## 11. Architecture et écosystème technique

→ [12](12-workflows-1-concepts-construction.md), [32](32-ecosysteme-open-source-sdk.md), [15](15-recherche-libraries-search-toolkit.md), [19](19-audio-2-tts-agents-vocaux.md)

- **Briques tierces identifiées** :
  - **Temporal** pour Workflows (`temporalio>=1.29,<1.30`) ;
  - **OpenTelemetry** pour l'observabilité ;
  - **MCP** pour les connecteurs et l'Agentic Search ;
  - **LiveKit** pour les agents vocaux ;
  - **Vespa / Postgres (pgvector) / Qdrant** pour la recherche ;
  - **Speakeasy** pour générer les SDK ;
  - **Black Forest Labs** pour les images de Vibe ; **AFP / AP** pour les actualités de la recherche web.
- **Mode hybride** : l'orchestrateur et le plan de contrôle sont chez Mistral ; l'exécution des workflows a lieu chez le client. Les clients enterprise peuvent faire tourner l'environnement Studio en cloud privé ou on-prem.
- **Open source et propriétaire** :
  - **ouverts** : les deux SDK clients (Apache-2.0), `mistral-common`, le cookbook, la **CLI Vibe** (Apache-2.0, avec ACP et MCP) et les poids de plusieurs modèles ;
  - **fermés** : la console, l'API, l'orchestrateur et le serveur MCP hébergé ;
  - **sans dépôt public** : l'outillage Studio (Workflows, Evaluations, Search Toolkit, otel-observability, Vibe SDK) est publié sur PyPI ; ses sources viennent d'un monorepo privé, mais restent lisibles dans les archives PyPI ;
  - **à surveiller** : quelques paquets propriétaires et plusieurs paquets sans licence déclarée. Le Search Toolkit a été annoncé « open source » le 28/05/2026, mais aucun dépôt GitHub public n'a été trouvé : il est seulement publié sur PyPI ([02](02-historique-annonces-presse.md) contre [32](32-ecosysteme-open-source-sdk.md)).
- **Écosystème « Mistral Apps »** (CLI `mistral` et paquets `capabilities`) : publié en octobre 2026, mais pas encore documenté.

## 12. Chronologie

| Date | Événement | Source |
|---|---|---|
| 11/12/2023 | Bêta ouverte de **La Plateforme** (`console.mistral.ai`) | [01](01-offre-produit-positionnement-tarifs.md), [02](02-historique-annonces-presse.md) |
| 11/01/2024 | Première entrée du changelog API | [20](20-modeles-ressources-changelogs.md) |
| 27/05/2025 | **Agents API** (agents, conversations, outils intégrés, handoffs) | [02](02-historique-annonces-presse.md) |
| 24/10/2025 | **Mistral AI Studio** en bêta privée : Observability, Agent Runtime, AI Registry | [02](02-historique-annonces-presse.md) |
| déc. 2025 | Démo de la console « Create / Observe / Improve », traces, Judges ; Document AI Playground (17/12) | [31](31-autres-videos.md), [02](02-historique-annonces-presse.md) |
| 19/01/2026 | Inline batching | [17](17-batch-inference-tarifs.md) |
| 04/02/2026 | Playground audio | [02](02-historique-annonces-presse.md) |
| 17/03/2026 | **Forge** (entraînement et personnalisation de modèles) | [02](02-historique-annonces-presse.md) |
| 23/03/2026 | Playground TTS et clonage de voix | [02](02-historique-annonces-presse.md) |
| 31/03/2026 | Dépréciation de `mistral-moderation-2411` | [10](10-conversations-capacites.md) |
| 27/04/2026 | **Workflows en Public Preview** (moteur Temporal) | [02](02-historique-annonces-presse.md) |
| mai 2026 | Incident de chaîne logicielle sur les SDK (MAI-2026-002) | [20](20-modeles-ressources-changelogs.md) |
| 22/05/2026 | **Connectors in Studio** en Public Preview (MCP) | [02](02-historique-annonces-presse.md) |
| 28/05/2026 | **Le Chat devient Vibe** (Work + Code) ; Search Toolkit ; connecteurs dans Workflows et Vibe | [02](02-historique-annonces-presse.md), [31](31-autres-videos.md) |
| 24/06/2026 | Contrôles avancés et Debugger des connecteurs | [02](02-historique-annonces-presse.md), [31](31-autres-videos.md) |
| 03/07/2026 | Vidéo Pentiminax (état de l'interface) | [30](30-video-pentiminax-agents-sans-coder.md) |
| 09/07/2026 | **Prompts et Skills versionnés** | [02](02-historique-annonces-presse.md) |
| 11/08/2026 | Endpoints régionaux en GA, Priority Tier en Public Preview | [02](02-historique-annonces-presse.md) |
| 20/08/2026 | Agentic Search dans les Libraries | [02](02-historique-annonces-presse.md) |
| 08/09/2026 | Série D de 3 Md€ (valorisation de plus de 21 Md€) | [02](02-historique-annonces-presse.md) |
| 10/09/2026 | Gestion des utilisateurs dans le panneau d'administration (GA) | [02](02-historique-annonces-presse.md) |
| 22/09/2026 | Fusion des onglets Chat et Work dans Vibe | [22](22-vibe-work-le-chat.md) |
| 06/10/2026 | **Mistral Large 4** (Public Preview) | [01](01-offre-produit-positionnement-tarifs.md) |
| 09/10/2026 | **Managed Deployments** pour Workflows (Public Preview) | [02](02-historique-annonces-presse.md) |
| octobre 2026 | Voxtral 3 (STT et TTS), SDK des agents vocaux, écosystème « Mistral Apps » | [18](18-audio-1-transcription.md), [19](19-audio-2-tts-agents-vocaux.md), [32](32-ecosysteme-open-source-sdk.md) |

La chronologie complète des annonces, la presse, les faits sur l'entreprise et le paysage concurrentiel sont dans [02](02-historique-annonces-presse.md).

## 13. Constats transverses

1. **Studio est un assemblage de briques.** Inférence, construction, observation, gouvernance et déploiement communiquent par une API unique. Les mêmes objets (agents, skills, workflows, connecteurs, libraries) sont réutilisés par Vibe, ce qui fait de Vibe la vitrine de ce qui est construit dans Studio.
2. **Une grande partie de la valeur est encore en preview.** Workflows, Connectors, Observability, Prompts et Skills ont tous moins d'un an, et l'observabilité est réservée aux clients Enterprise. Le produit avance très vite et la doc a du mal à suivre.
3. **La doc est abondante mais incohérente.** Les chapitres relèvent **plus de 400 incohérences ou questions ouvertes** : exemples faux, champs qui diffèrent de la spec, sections vides, commentaires internes visibles, contradictions entre pages. La spec OpenAPI est souvent plus à jour que les guides.
4. **La gouvernance est un argument central** :
   - versions immuables et diffs à l'enregistrement ;
   - portée private / workspace / organisation ;
   - rôles additifs, service accounts, audit logs ;
   - ZDR et hébergement dans l'UE.
5. **Ce qui est gratuit et ce qui est payant est segmenté finement** :
   - **gratuit** : Free mode (avec usage possible des données pour l'entraînement), Labs, modération, résumés IA du visualizer ;
   - **payant à l'usage** : l'API, avec des modificateurs de prix ;
   - **par siège** : Vibe ;
   - **sur contrat** : Enterprise (audit, observabilité, SSO, SIP, Admin API).
6. **L'exécution chez le client est un principe d'architecture.** Les workers de Workflows tournent chez le client, les données sont chiffrées et stockées côté client, le masquage des traces se fait avant export, et le self-hosting est annoncé.
7. **La console est pensée « no-code d'abord » pour les agents.** Playground → agent → versions → publication dans Vibe, sans écrire de code. Mais tout ce qui touche l'exécution réelle (fonctions personnalisées, workflows) demande du code.

## 14bis. Ce que la phase 2 a ajouté (vidéos image par image, captures)

→ [33](33-videos-console-agents-connecteurs-skills.md), [34](34-videos-workflows.md), [35](35-videos-observabilite-admin-audio-keynotes.md), [36](36-captures-doc-annonces.md)

- **La console change très vite**. Au moins 7 versions du menu ont été observées entre décembre 2025 et octobre 2026 : on passe de « Create / Observe / Improve » (avec Explorer, Campaigns, Experiments, Datasets, Judges, Fine-tune) à un rail d'icônes « Build / Context ». L'observabilité disparaît du menu en juillet 2026, même pour une organisation Enterprise, puis revient en octobre sous « Monitor › Traces » avec un cadenas.
- **Agentic Safety** (septembre 2026, absent de la doc et de la spec) :
  - des **règles** versionnées combinent des *hooks* (moment d'exécution), des *scanners* (modération avec `mistral-moderation-ipi-260708`, ou juge LLM ; texte, image, audio, fichiers) et des *cases* (verdicts **Allow / Human validation / Block / Terminate**) ;
  - des **politiques** appliquent ces règles à des surfaces produit, par exemple la CLI Vibe.
- **Observabilité et évaluations, enfin visibles** :
  - **Explorer** : conversations et appels d'outils, filtres composables ;
  - **Datasets** : colonne « Grading guidance », export JSONL, « New experiment » ;
  - **Judges** : types Classification ou Regression, édition avec instructions, outils, définitions de score et bouton « Try it » ;
  - **Évaluations** (*Preview*, juillet 2026) : scores, sparklines et « System parameters » qui citent les **versions de prompts par alias** (`staging (v8)`).
- **Workflows dans la console** :
  - la page d'un workflow affiche les déploiements actifs, le **taux d'erreurs**, la **latence moyenne** et les exécutions récentes ; boutons `Share` et `Graph` ;
  - « Start Workflow » ouvre un éditeur JSON ;
  - la vue d'exécution montre un Gantt, les étapes, un Inspector, « Run again » et « Cancel » ;
  - « Publish to Vibe » rend le workflow disponible à **tous les utilisateurs du workspace**.
- **Connecteurs** :
  - une fiche détaille la visibilité, l'authentification et les outils, marqués « Interactive » ou « Read-only » ;
  - le débogueur OAuth s'ouvre en réalité sous `/build/connectors/playground` (la doc indique `/debugger`) ;
  - l'activation se règle par workspace et par outil.
- **Skills** : étiquettes de version `staging`, `production` et `main` ; « Publish to Vibe » pose `main` sur une version figée.
- **Admin complet** (juillet 2026) :
  - 5 groupes : Administration, Subscriptions, Vibe, API, Mistral Code ;
  - 11 préférences Vibe ;
  - **Limits** : jetons par minute et requêtes par seconde par modèle, OCR à 5 000 pages/min, fichiers jusqu'à 100 Mo, téléchargements désactivables ;
  - journaux d'audit et connecteurs d'organisation.
- **Playgrounds audio** :
  - transcription : diarisation, horodatage par segment ou par mot, biais de contexte, modes offline et temps réel ;
  - synthèse : 4 000 caractères, balises d'émotion, prononciations IPA, contexte de conversation, curseur « Expressiveness » ;
  - clonage de voix : modes **Instant** et **Professional** (30 min recommandées, 1 Go par fichier, 13 langues).
- **Captures de la doc** : seulement 7 vraies captures d'interface, toutes d'octobre 2025, qui ne correspondent plus au texte actuel.

### Ce qu'en disent les utilisateurs

→ [37](37-retours-utilisateurs.md) : environ 370 commentaires Hacker News, 310 posts Reddit, 150 issues GitHub, 440 commentaires YouTube et 70 avis web, de décembre 2023 à octobre 2026.

- **Studio lui-même fait très peu parler.** Le lancement d'AI Studio a fait 7 points et 0 commentaire sur Hacker News. Le signal porte sur l'API, la facturation, les limites, la doc et le support.
- **Irritant n° 1 : limites de débit et quotas opaques.** Erreurs 429 même sur des comptes payants, et limites introuvables dans la console.
- **Irritant n° 2 : facturation incompréhensible.** Abonnements, crédits API, enveloppe Vibe Code, paiement à l'usage et clés différentes selon le produit se mélangent.
- Selon une vingtaine d'utilisateurs, le **free tier de l'API a été suspendu début septembre 2026 sans annonce**. ⚠️ Cela nuance le « Free mode » décrit au §7.
- La **documentation** est jugée lacunaire ou en retard (≈ 100 mentions). Le **support** divise : bot de tri, tickets sans réponse, mais aussi des PME satisfaites.
- **Points forts cités** : la **souveraineté, le RGPD et l'hébergement UE comme raison d'achat** (au moins 40 auteurs), l'OCR et Document AI, la vitesse, les petits modèles rentables, Voxtral, GLM hébergé en Europe.
- **La console est perçue comme « mince »** : Workflows, Observe et Evaluate sont montrés en marketing mais absents pour un compte non-Enterprise ; il n'y a **pas d'interface graphique pour Workflows**.
- **PME et francophones** : beaucoup choisissent Mistral « pour l'Europe », puis butent sur les limites, la facturation et le support. Ils demandent des **tutoriels en français pour non-développeurs**.

**Lecture pour Nexora** : ce sont des opportunités directes. Il faut :
- des quotas visibles dans la console ;
- une facturation simple, avec une seule clé ;
- un mode no-code ;
- une documentation et un accompagnement en français pour non-développeurs ;
- un support humain réactif.

Le tout en gardant l'argument souveraineté.

Le choix des **bases et briques open source** pour construire Nexora est dans [`../open-source/00-decision-bases-et-briques.md`](../open-source/00-decision-bases-et-briques.md).

## 14. Limites de cette recherche

- La console n'a **pas été ouverte** : aucune connexion à un compte. Les écrans viennent de la vidéo Pentiminax (plan gratuit, juillet 2026) et des vidéos officielles. Les écrans Enterprise (Observability, Admin complet) ne sont connus que par la doc et les webinaires.
- **Pas trouvés** : les prix des outils (web search, code interpreter…), les formats et tailles acceptés par Libraries, les écrans du Prompt Registry et des évaluations.
- **Vidéos** : les deux keynotes de l'AI Now Summit, sans sous-titres, ont été transcrites en local avec faster-whisper ([35](35-videos-observabilite-admin-audio-keynotes.md)). Les transcriptions automatiques déforment certains noms propres.
- **Fraîcheur** : la doc est en refonte (Voxtral 3 juste lancé). Tous les faits datent du **21/10/2026**. Pour rafraîchir, voir le [README](README.md).
