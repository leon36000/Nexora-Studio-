# 35 — Vidéos examinées image par image : observabilité, Admin, playgrounds audio, keynotes

> **État au 21/10/2026.** Analyse visuelle (une image toutes les 2 s, dédoublonnage, examen de toutes les images distinctes) de 10 vidéos, plus transcription locale de la keynote AI Now Summit (sans sous-titres YouTube). Objectif : inventorier les **écrans, menus, champs, graphiques et valeurs** que la base ne contenait pas encore. Faits uniquement ; toute déduction est marquée « (inférence) » ; chaque information porte son horodatage et, quand elle existe, un lien vers l'image copiée dans `sources/videos-images/observabilite-admin/`. Marqueurs : **🆕** = absent de la base ; **⚠️** = contredit ou nuance la base ; sans marqueur = confirme la base. Aucun prix n'est relevé (consigne du fondateur).
>
> Base consultée avant l'analyse : [00-synthese](00-synthese.md), [14](14-observabilite-evaluations.md) §1 et §4, [03](03-administration-securite-facturation.md) §1 et §4, [16](16-document-ai-ocr.md) §4, [18](18-audio-1-transcription.md) §4, [19](19-audio-2-tts-agents-vocaux.md) §4, [31](31-autres-videos.md) (fiches 3.2, 3.9, 3.10, 3.14, C9–C12).

## Sommaire

1. [En bref](#1-en-bref)
2. [Méthode (résumé)](#2-méthode-résumé)
3. [Fiches par vidéo et chronologies](#3-fiches-par-vidéo-et-chronologies)
4. [Inventaire consolidé par écran](#4-inventaire-consolidé-par-écran)
5. [Keynote AI Now Summit 2026 : transcription résumée](#5-keynote-ai-now-summit-2026--transcription-résumée)
6. [Nouveautés 🆕 et contradictions ⚠️ (récapitulatif)](#6-nouveautés--et-contradictions-️-récapitulatif)
7. [Questions ouvertes](#7-questions-ouvertes)
- [Annexe A — Couverture](#annexe-a--couverture)
- [Annexe B — Images copiées](#annexe-b--images-copiées)

---

## 1. En bref

1. **🆕 « Agentic Safety » : règles et politiques dans Studio** (AI Engineer Paris, 23/09/2026, [61:42–62:34]). Écrans jamais documentés : une **Rule** versionnée (« v6 • Latest ») combine des **Hooks** (quand elle s'exécute : `Post tool call`), des **Scanners** (quoi détecter : type `Moderation` avec le modèle `mistral-moderation-ipi-260708`, ou `LLM judge` ; modalités Text / Image / Audio / Files ; « Retry configuration ») et des **Cases** (condition `pi_classification.malicious > 0.8` → verdict **Allow / Human validation / Block / Terminate**, comportement « On scanner failure », « Side effects »). Une **Policy** (« Named sets of rules attached to a scope, products and metadata ») choisit les **surfaces agentiques** protégées (ex. `Vibe CLI`), s'active par interrupteur, se teste « in playground », affiche « Policy usage over time » et s'enregistre en **nouvelle version avec message**. Aucun endpoint correspondant dans la spec OpenAPI locale.
2. **🆕 Les écrans d'observabilité de décembre 2025 sont enfin visibles** (AI Dev 25, [10:15–15:39]) : **Explorer** (« View and analyze chat completions and tool calls », filtres composables, événements épinglés, panneau « Chat details » Feed/Properties), **Dataset details** (colonnes Prompt, **Grading guidance**, Attributes ; « Add data », « Export to JSONL », « New experiment »), **Record details** (onglets Feed / Grading Guidance / Properties, messages éditables), liste des **Judges** (Classification vs Regression, sorties en étiquettes ou en bornes Min/Max) et formulaire **Edit judge** (Instructions, Tools, Type, Score definitions, « Try it » sur un dataset, « Output explanation »). Le menu d'alors : **Improve › Observe (Explorer, Campaigns) › Evaluate (Experiments, Exp. Playground, Datasets, Judges) › Fine-tune**.
3. **🆕 L'Admin Panel complet de juillet 2026** (webinaire du 09/07/2026, [23:15–26:13]) : menu en 5 groupes (**Administration / Subscriptions / Vibe / API / Mistral Code**), page **Preferences** de Vibe avec 11 réglages (onglet Work daté, Work mode, Agents, Canvas, Code Interpreter, Deep Research, Image Generation, Memories, Thinking Mode, Web Search, Code tab), page **Limits** (« Tokens per Minute » et « Requests per Second » par modèle, **5 000 pages/min** d'OCR, **taille maximale de fichier 100 Mo** réglable, **« Disable file downloads »**), **Audit Logs** à colonnes « Actor Metadata » / « Event Metadata », connecteurs d'organisation (Type « Featured », Permissions « Allowed », étiquette « Indexed »), **Subscriptions** en 3 onglets (Vibe / API Plan / Mistral Code).
4. **🆕 Les playgrounds audio, version par version** (févr. → oct. 2026) : STT (modèle, langue, diarisation, horodatage Off/Segment/Word, context bias ; puis onglets Offline/Realtime, enregistrement micro de 2 min, fichiers vidéo acceptés), TTS (4 000 caractères, synchronisation mot à mot, autocomplétion des balises `[emotion=…]` / `[pace=…]`, panneaux **Pronunciations** (IPA) et **Conversation context**, curseur **Expressiveness « Robust ↔ Creative »**) et **Voice cloning** (onglets **Instant / Professional** ; professionnel : 30 min recommandées, 1 Go par fichier, 13 langues, statut « Ready », menu Use/Edit/Delete).
5. **Navigation de la console : 5 états successifs observés** (déc. 2025 « Create / Improve / Context / Code / Docs » → mars 2026 → mai 2026 rail d'icônes → juil. 2026 « Build / Context » → oct. 2026 « Create / Context / **Monitor › Traces** 🔒 »). ⚠️ Nuance la base (§4 de [00](00-synthese.md)) : l'entrée Observabilité **existait** en mars 2026 (Improve › Observe/Evaluate) et réapparaît en octobre 2026 sous « Monitor › Traces » avec un cadenas ; elle était absente en juillet 2026, y compris pour une organisation Enterprise.
6. **Keynote AI Now Summit (28/05/2026), transcrite localement** : Timothée Lacroix y présente la transition « Le Chat → Vibe », Vibe for Work/Code, puis **Studio comme lieu qui détient « tous les artefacts et toutes les connexions » et gouverne quelles connexions chaque équipe peut utiliser**, déployable on-prem, inférence séparable des données, et **Forge** pour distiller des traces en petits modèles (§5).

## 2. Méthode (résumé)

- Outils : `yt-dlp` (vidéo seule ≤ 1080p H.264), `ffmpeg` (1 image / 2 s), script de dédoublonnage (différence moyenne de luminance sur 160×90 ; seuil 0,4 à 3 pour les écrans, 10–12 pour les captations de scène), planches contact 3×3 / 4×4 / 5×4 puis lecture plein écran et recadrages agrandis des zones de texte. Les téléchargements par segments (`--download-sections`) échouaient (ffmpeg statique sans résolution DNS) : vidéos complètes téléchargées, puis segments extraits localement.
- Transcription locale : venv séparé `venv-asr`, `faster-whisper` 1.2.1, modèle `medium`, CPU `int8`, VAD ; décodage audio via `wave`/`numpy` (le paramètre `metadata_errors` de PyAV 19 faisait échouer le décodage natif).
- Détail complet (segments, nombres d'images, seuils) : [Annexe A](#annexe-a--couverture).

---

## 3. Fiches par vidéo et chronologies

### 3.1 — AI Dev 25 x NYC, Param Singh (`Axlesb8yTro`), segment 08:17–15:41

| Champ | Valeur |
|---|---|
| Date · durée | 05/12/2025 · 29:45 (segment de 7:24 analysé) |
| Orateur | Param Singh, Partner Solution Architect, Mistral AI |
| Console | `console.mistral.ai`, organisation « Mistral AI - Solutions Org », « Default Workspace » |
| Images | 222 brutes → 70 distinctes, toutes examinées |
| Fiche existante | [31 §3.2](31-autres-videos.md) (transcription seule) |

**Chronologie**

| Temps | Montré à l'écran | Dit (résumé) | Image |
|---|---|---|---|
| 08:17 | Diapo « What's needed to realize production AI systems » : *Reliable visibility into AI performance* / *Durable execution for complex workflows* / *Governed management of AI assets (unified control of models, prompts, and data with built-in lineage and policy)* 🆕 | Thèse de Studio | — |
| 09:25 | Diapo « Introducing a state of the art builder toolkit in AI Studio » : **AI Observability** (Explorer, Traces, Dashboards ; Judges, Campaigns, Datasets ; Experiments et Iterations) / **Agent Runtime** (exécution durable ; télémétrie, évaluation et **static graphs** ; modes hybride et self-hosted) / **AI Registry** (catalogue unifié agents, modèles, datasets avec lignage et versions ; API et SDK pour CI/CD et MLOps) 🆕 | Observabilité = même outillage que les équipes internes ; une partie sur liste blanche | — |
| 10:15 | Diapo « AI Observability — Make AI performance visible and measurable » + **capture de l'Explorer** 🆕 (détail §4.3.1) | « Explorer pour inspecter le trafic de production » | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t10m15s.jpg) |
| 10:17 | Diapo « Agent Runtime » (*Durable Agents ; Telemetry ; Static graphs : visualize logic paths and dependencies for auditability ; Deployment Modes*) + **capture d'un prototype d'UI Workflows** (octobre 2025) 🆕 : menu Workflows › Executions, Visualization ; Integrations ; « Namespace : Mistral AI » ; workflows `RetrievalWorkflow`, `RAGWorkflow`, `IngestionWorkflow`, `IngestionAllDbWorkflow`… ; « Execution History - RAGWorkflow », recherche, filtre « All Status », bouton « Execute Workflow », lignes Started / Ended / Duration (21 s, 6 s, 5 min 7 s…) / `COMPLETED` | Vue linéaire de chaque invocation | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t10m17s.jpg) |
| 11:03 | Diapo « AI Registry » (*Unified Catalog : models, prompts, datasets, judges, and tools* ; *Versioning & Lineage* ; *Integration Layer* ; *APIs & SDKs*) + **capture de la liste des Judges** 🆕 (§4.3.4) | Catalogue unifié | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t11m03s.jpg) |
| 11:23 | **Console** : bandeau bleu « Announcing Mistral's AI Studio — Read More → » 🆕 ; accueil « Mistral AI Studio » avec 3 cartes **Create / Observe / Improve** ; menu latéral §4.1 | Trois « grands seaux » : créer, observer, améliorer | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t11m33s.jpg) |
| 12:19 | **Playground** : modèle « Mistral Medium », `temperature: 0.2`, Tools, Functions, Instructions, « <> Code », « + Create Agent » ; sélecteur de modèles avec section **« Fine-tuned »** (`ft:mistral-medium-latest:…:20251109:…`, `ft:ministral-3b-latest:…`) | Chaque appel du Playground crée une trace | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t12m47s.jpg) |
| 13:29 | **Dataset details** « Financial Regulations dataset » (URL `/observability/datasets/<uuid>`) et menu Improve déplié 🆕 | « Un dataset préparé » | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m29s.jpg) |
| 13:37–14:47 | **Record details** (`?recordId=…`) : messages System / User / Assistant (outil `web_search`), résultats Tool numérotés 🆕 | ⚠️ L'orateur parle de « trace » : l'écran est un **enregistrement de dataset** | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m51s.jpg) |
| 14:59–15:39 | **Edit judge** (`/observability/judges/create?judge_to_edit=…&dataset_id=…`) : juge de régression « conseil de consulter un avocat », essai sur le dataset, score 1 et popover « Output explanation » 🆕 | Juges en lot ou à la volée ; chaque score a une explication | [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t15m01s.jpg), [img](sources/videos-images/observabilite-admin/Axlesb8yTro_t15m29s.jpg) |

Onglets visibles du navigateur à [11:23] : « AI Studio - Mistral AI », « Dataset details - AI Studio », « Edit judge - AI Studio » (titres de pages 🆕).

### 3.2 — Webinaire « The Future of Agentic AI with Mistral AI » (`tAt386mbgps`), segment 19:31–32:36

| Champ | Valeur |
|---|---|
| Date · durée | 09/07/2026 · 39:04 (segment de 13:05 analysé) |
| Orateur | Aaron Delp, Global Head of AI Technical Marketing |
| Organisation montrée | « Mistral AI TME Team » (plan **Enterprise**) |
| Images | 393 brutes → 104 distinctes, toutes examinées |
| Fiche existante | [31 §3.9](31-autres-videos.md) (transcription seule) |

**Chronologie**

| Temps | Montré à l'écran | Dit (résumé) | Image |
|---|---|---|---|
| 19:31 | Diapo 24 « Studio is for operationalizing AI » : boucle **Workflows → AI Registry → Context Engine → Model customization → Observability and Evals** ; « On-prem / Private Cloud / Serverless / Mistral Compute » ; colonne « Build for production / Ensure governance and compliance / Accelerate effortlessly » 🆕 (texte des diapos) | Workflows, registre, context engine, personnalisation, observabilité, évaluations | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t19m31s.jpg) |
| 21:05 | Diapo 25 : *Faster iteration* (**Experiments**, **Iterations**, **Judges**) / *Measurable quality* (**Datasets**, **Judge scores**, **APM metrics**) / *Deep observability* (**Traces**, **Dashboards**, **Context graph**) + vignettes sombres (« Agents by Confidence », courbes) 🆕 | « Itération plus rapide, qualité mesurable, observabilité profonde » | — |
| 21:43 | Diapo 26 Workflows (« Pre-built primitives and a Python-first interface… (typescript SDK available) ») | — | — |
| 22:07 | Diapo 27 « Lower risk deployments : Moderation, Guardrails, **Versioning and rollback** » / Portability / Privacy and control (*Auditability across datasets, models, and experiments*) 🆕 | — | — |
| 22:27 | Diapo 28 « The first AI use case can be expensive… » : *Unified registry*, *Version control* + maquette sombre de console (Create / Improve : Observe, Evaluate, Fine-tune / Context / Code : Mistral Code) | Réutilisation, catalogue unifié | — |
| 23:15 | **Admin › Workspaces** et menu Admin complet 🆕 (§4.4.1) | Créer une organisation, des membres, un workspace | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t23m15s.jpg) |
| 23:55 | **Vibe** (thème sombre) : onglets Chat / Work / Code ; menu compte ; sélecteur « Your Organizations » (TME Team *Enterprise*, Aaron Delp *Free*, Mistral AI - Main Org *Enterprise*) et « Organization Workspaces » 🆕 | Un utilisateur dans plusieurs organisations et workspaces | — |
| 24:07 | **Accueil Studio** de juillet 2026 (§4.2) | — | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m07s.jpg) |
| 24:17 | **Audit Logs** 🆕 (§4.4.3) | « Tout est journalisé : humain, skill… » | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m19s.jpg) |
| 24:31 | **Connectors** d'organisation, puis fiche **Gmail** 🆕 (§4.4.4) | « Connect » pour toute l'organisation | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m31s.jpg), [img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m41s.jpg) |
| 24:53 | **Subscriptions** (onglets Vibe / API Plan / Mistral Code) 🆕 (§4.4.5) | Gérer les abonnements, activer/désactiver | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m59s.jpg) |
| 25:05–25:49 | **Vibe › Preferences** : désactivation de « Work mode » → l'onglet Work disparaît côté Vibe, puis revient ; toast « Settings updated successfully » 🆕 (§4.4.6) | Effet immédiat | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t25m05s.jpg) |
| 25:53–26:13 | **API › Limits** 🆕 (§4.4.7) | ⚠️ « tokens par seconde, tokens par minute » : l'écran affiche **Tokens per Minute** et **Requests per Second** | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t25m59s.jpg), [img](sources/videos-images/observabilite-admin/tAt386mbgps_t26m09s.jpg) |
| 26:39–27:07 | **Studio › Audio › Speech to Text** (onglets Offline / Realtime) 🆕 ; survol de Document AI → `console.mistral.ai/build/document-ai/ocr-playground` | STT, TTS, Document AI utilisables en UI, batch et API | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t27m07s.jpg) |
| 27:25–29:43 | **Workflows** : List, Executions, Deployments [WIP], Schedules ; modale « Build your first workflow » ; page d'un workflow ; lancement et timeline (§4.8) | Cookbooks prêts en 10–15 min, exécutions, planifications | — |
| 30:05–31:15 | **Skills** « hello-world » (v1 • Latest, Published) puis exécution dans Vibe Work (§4.8) | Skill publié dans Vibe | — |
| 31:27–32:03 | **Docs & API** (`docs.mistral.ai`) et sélecteur de produit ouvert 🆕 (§4.9) | Cookbooks, modèles, quickstarts | [img](sources/videos-images/observabilite-admin/tAt386mbgps_t31m33s.jpg) |

### 3.3 — Fin x Mistral AI : Evaluating Your AI Agent (`bUDwFxbf_M8`)

| Champ | Valeur |
|---|---|
| Date · durée | 16/07/2026 (meetup du 02/07/2026) · 1:05:59 |
| Segments à écran | Repérage complet en 144p (198 images, 1 / 20 s) ; **partie Mistral 21:00–34:50 analysée en 1080p** (415 → 223 images distinctes) |
| Orateur Mistral | Henry Lagarde, Software Engineer |
| Nature | Diapos uniquement (« Confidential ©2025 Mistral AI »), **aucune capture de console Mistral** |
| Fiche existante | [31 §3.10](31-autres-videos.md) |

**Chronologie (partie Mistral)**

| Temps | Diapo | Contenu 🆕 (texte des diapos, absent de la base) | Image |
|---|---|---|---|
| 21:10 | « Trust your agent » (2 July 2026) | Titre | — |
| 21:42 | « Agenda » | *The Legacy Framework* ; *The Judge Model Framework* | — |
| 23:06 | 43 « Deep Visibility via Tracing » | **The goal — Full Execution Context** (capturer chaque appel système et goulot de latence dans une vue unifiée) ; **Analysis — Flame Graph Diagnostics** (relations parent-enfant entre spans) ; capture de flame graph (156,36 ms au total, spans de 35 µs à 74 ms) | — |
| 23:52 | 44 « Traces at the Agentic era — Exploit existing OpenTelemetry to improve the accuracy » | **OTEL — Reusing existing infrastructure** ; **LLM Insights — Agentic Enrichment** (injecter tokens, latence, raisonnement dans les spans) ; capture d'un **arbre de 54 spans** sur ~60 s : `job_entrypoint` 597 ms › `agent_session` › `start_agent_activity` / `on_enter` ; `user_turn` 3 354 ms › `user_speaking` 2 588 ms ; `agent_turn` 10 s › `llm_node` 3 206 ms › `llm_request` › `llm_request_run` › `invoke_agent` 2 673 ms › `POST` 760 ms ; `tts_node` 4 234 ms › `tts_stream_adapter` › `tts_request_run` › `tts_request` 799 ms › `speech_v1_audio_…` 652 ms › `POST` 211 ms. (inférence : trace d'un agent vocal LiveKit, cf. [19](19-audio-2-tts-agents-vocaux.md)) | [img](sources/videos-images/observabilite-admin/bUDwFxbf_M8_t23m52s.jpg) |
| 24:48 | 45 | Quatre niveaux : *Understand how your system behave → Understand how your agent behave → Protect yourself from your agent → Improve how your agent behavior* | — |
| 25:20 | 47 « High level architecture » | **Judge Model Framework** = *Review* (évaluer chaque étape sur scénarios prédéfinis) / *Monitor* (observer, détecter l'usage anormal) / *Protect* (alerter l'équipe, proposer des changements) | — |
| 26:26 | 48 « Review, Monitor, and Protect » | Review « During Development & Regularly » ; Monitor et Protect « With every Agent's action » ; flèches *Feeds insights*, *Inform need for review and enrich testing scenarios*, *Triggers*, boucles *Continuous Learning* | [img](sources/videos-images/observabilite-admin/bUDwFxbf_M8_t26m26s.jpg) |
| 27:38 | 49 « Review » | Entrées : **Agent ID Card, Use Case Card, AI Workers, Real world examples, Risk Matrix** → Agent type → Associated risks → Test scenarios + Metrics to compute → Test scenarios run (« using LLM adapters ») → % Failures (« LLM as a Judge ») ; Impact drivers → Impact by Risk → sorties **Impact** (score par risque) et **Risk probabilities** | — |
| 30:06 | 50 « Monitor: Agent as a Judge » | Entrées : Agent ID Card, Use Case Card, AI Workers, **AI Logs**, Risk Matrix → **Rubric Generation** (critères et poids selon le type de tâche) → **Judge agent** → **Aggregator** → **Scoring** → sorties **Evaluation Report** (« scored assessment with rationale ») et **Confidence Level** (« reliability measure per criterion ») | — |
| 31:06 | 51 « Protect » | Entrées : Test Results, Risk Matrix → **Anomaly Detection** → **Alert Generation** (routage par sévérité) + **Recommendation Engine** (changements structurels et de prompt) → **Trigger Alerts** (temps réel vers sécurité et ops) et **Change Plan** (« actionable roadmap for agent hardening ») | — |
| 33:10 | 52 « An inter-connected framework » | MONITORING (Trace → AI Agents → Evaluation ; Data Sources : Test Scenarios, Evaluation History, Agent Details ; Tools : Add test scenarios to the Review, Launch Reviews…) → REVIEW (Review Agent : Agent Type → Associated Risks → Test Scenarios → Scenario Execution → Risk Probabilities → Risk Assessment ; Impact Factors → Impact Translation → Impact Assessment) → PROTECT (Trigger Alerts, Change Recommendation) | — |

Partie Fin (0–21 min, 144p seulement) : diapos génériques (« Isn't AI just API calls nowadays? », « Offline evaluation with deterministic metrics », « Offline evaluation with LLM judges », « Online evaluation: AB testing », « Production monitoring and observability » avec les *Four Golden Signals of SRE*, « Takeaways »). Q&R (34–66 min) sans écran.

### 3.4 — AI Engineer Paris 2026, keynote Mistral (`CGq9KRSb9Kc`), segment 46:30–71:30

| Champ | Valeur |
|---|---|
| Date · durée | 24/09/2026 (live du 23/09/2026, Station F) · 1:13:35 |
| Orateur | Lélio Renard Lavaud, VP Engineering |
| Images | 750 brutes → 311 distinctes (seuil 12, captation de scène) + démo 61:16–62:42 à **1 image/s** (86 → 66 distinctes), toutes examinées |
| Fiche existante | [31 §3.14](31-autres-videos.md) |

**Chronologie**

| Temps | Montré | Dit (résumé) | Image |
|---|---|---|---|
| 46:34 | « Building Frontier AI — The Path Forward for Real-World Solutions » | Ouverture | — |
| 47:16 | « We are Mistral » : *Time-to-sustained value over superficial POCs / ROI over benchmarks / Customer control… over race to AGI* 🆕 (texte) | 1 300 employés | — |
| 47:48–49:48 | Diapos Koyeb (citation de Yann Léger, « 10 locations worldwide »), Emmi AI (Johannes Brandstetter), « Series D — €3 billion raised ; valuation of more than €21 billion » | Acquisitions, série D | — |
| 52:08 | « The Mistral Suite is built around these three steps » : REALIZE (Solutions) / ACTIVATE (Vibe for work, Vibe for code) / BUILD (**Studio** « Frontier models and builder tools » contenant **Forge** « Advanced AI R&D Suite ») ; bandeaux *Continuous improvement with enterprise context*, *Serverless / On-prem / Edge / Mistral Compute*, *End-to-end traceability, identity, and policy management* | Studio = primitives pour la production | [img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t52m08s.jpg) |
| 54:00 | « Developers build business automations end to end » (Slack alert → Agent investigates → Findings in Slack → Continue in thread) ; **briques réutilisables : Triggers / Agents API / Connectors / One-click deployment** 🆕 | Agents asynchrones sur sandboxes | — |
| 54:58 | Capture Slack : alerte Sentry « Critical: High error rate in project: quota » (4 674 événements/h) et réponse d'un « Investigation Agent » | — | — |
| 55:10 | « Business users describe the workflow. Vibe builds the automation. » (« Vibe creates a workflow to review and deploy ») 🆕 | Persona Steven | — |
| 56:52–58:04 | « The future of Work » : *From using software to directing agents* ; *One unified harness* ; *Platforms get more valuable with each person who uses it* | — | — |
| 59:00–60:58 | « A new vector of attack » (Privileged Access / Non-Deterministic / Attacker controlled inputs) ; « How can we protect ourselves against prompt injection? » (Model Hardening ; Least Privileges dont **IBAC : Intent-based access control** ; Runtime guardrails : Input Protection, Output Validation, Live Enforcement) ; « The Security Dilemma » ; « Dynamic Collaboration » (*Contextual Access*, *Surgical Operations*) 🆕 (texte) | Sécurité agentique | — |
| 61:16–61:40 | Démo : issue GitHub piégée (instruction cachée demandant de poster `APP_TOKEN`) ; intertitre **« We're introducing Agentic Safety rules in Studio »** 🆕 | Exfiltration par Vibe CLI | — |
| 61:42–62:12 | **Rule « Prompt Injection Rule »**, modales **Configure scanner** et **Configure case** 🆕 (§4.5) | Classifieurs, source, seuils, modération, action | [img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m01s.jpg), [img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t61m58s.jpg), [img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m10s.jpg) |
| 62:14–62:34 | Intertitre « Rules are deployed using **Agentic Safety policies** » ; **Policies** (vide → création → configuration → activation → « Save new version ») 🆕 (§4.5) | Règle attachée à une politique par surface produit | [img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m31s.jpg) |
| 62:38–62:46 | Retour au terminal (blocage, texte illisible) | « Arrêté au niveau réseau » | — |
| 63:14 | « What it means to be Sovereign » : Data / Intelligence / Compute / **Operational sovereignty** (*identity, security, observability, policy, routing, deployment, and lifecycle management*) | — | — |
| 64:04 | « Les Ulis: sovereign inference, live in France » : B300s, 10 MW, Inference, Q3 2026 | — | — |
| 65:14 | « Mistral Model Families » : Generalist (Large, Medium, Small, Ministral) ; Specialist (OCR, Voxtral, Codestral, Codestral Embed) ; **Open Experiments (Leanstral, Shieldstral)** ; légende LABS / OPEN / PREMIER | — | — |
| 66:20–68:08 | « Voxtral — Family of audio models » (STT : Voxtral Mini Transcribe 2, Mini Transcribe Realtime, Small ; TTS : Voxtral TTS) ; « Voxtral Speech to Text (STT) » : *High accuracy, Speaker diarization, Context biasing, Word-Level timestamps, Multilingual support, Noise robustness, Long audio support* ; vidéo KYC sous-titrée EN/FR en direct ; « What's next : building a full audio stack » | — | — |
| 68:34 | « OCR 4.1 » : *bounding boxes, block classification, and inline confidence scores* ; *170 languages across 10 language groups* ; *Runs in a single container for fully self-hosted deployments* ; *ingestion component for enterprise search, RAG…* ; page de magazine annotée (blocs TEXT / TITLE / IMAGE) | — | — |
| 69:56 | « **Voxtral Playgrounds** » et « **OCR Playground** » (2 QR codes) | « Testez voix et OCR, avec les bounding boxes ajoutées il y a un mois » | — |
| 70:14 | « What's next. » (récapitulatif) ; « Thank you » | — | — |

### 3.5 — Audio playground in Mistral Studio (`93ZAhW3bk8g`)

04/02/2026 · 0:56 · 28 → 25 images. Console « AI Studio », organisation « Mistral AI - Preview Org ». Route `console.mistral.ai/build/audio/speech-to-text` (confirme [19 §4](19-audio-2-tts-agents-vocaux.md)). Fiche existante : [31 C10](31-autres-videos.md) (description seulement).

| Temps | Montré | Image |
|---|---|---|
| 00:00 | Page « Speech to text », bouton « Audio Speech to text API docs » ; zone « Drop your audio here — Supports up to 10 audio files. Accepted types: .mp3, .wav, .m4a, .flac, .ogg. **Max 1024MB each** » ; « Upload files » ; pied « Need more? Try the API. » 🆕 | — |
| 00:04–00:12 | **Panneau de réglages** 🆕 : *Model* (Voxtral Mini `voxtral-mini-latest` ; section « More » : Voxtral Mini 2602 `voxtral-mini-2602`) ; *Language* (Auto-detect, liste filtrable, ex. « English (en) ») ; *Diarize* (interrupteur) ; *Timestamps* (Off / **Segment** / Word) ; *Context bias* (placeholder « e.g. Mistral, La Plateforme, Voxtral ») — chaque champ a une infobulle (?) | [img](sources/videos-images/observabilite-admin/93ZAhW3bk8g_t00m04s.jpg) |
| 00:20 | États « Uploading » puis « Transcribing » ; en-tête « <> Code », « Transcribe », « Download », « + », réinitialiser, réglages | — |
| 00:26–00:54 | **Résultat** 🆕 : segments horodatés (« 0:00 – 0:07 ») avec avatar de locuteur, segment actif surligné ; **forme d'onde** avec règle (graduations de 5 s), curseur de lecture et zoom ; badges **5.94s** (inférence : temps de traitement), **179.00s** (durée audio), **895** (inférence : nombre de mots ou de tokens) | [img](sources/videos-images/observabilite-admin/93ZAhW3bk8g_t00m30s.jpg) |

### 3.6 — Voice Customization 101 with Voxtral (`DffzOI3g8Yk`)

26/03/2026 · 2:36 · 78 → 75 images. Organisation « Mistral AI - Main Org - **You will get rate limited** » (libellé d'organisation ; inférence : compte sans paiement). Fiche existante : [31 C9](31-autres-videos.md).

| Temps | Montré | Image |
|---|---|---|
| 00:02 | **Accueil de mars 2026** 🆕 : « Mistral AI Studio — Build, observe, and improve your AI Apps », cartes **Create** (Playground, Agents), **Observe** (« Master your AI conversations and tool performance » → **Observe [Beta]**, **Explorer [Beta]**), **Improve** (Fine-tune) ; menu latéral §4.1 | [img](sources/videos-images/observabilite-admin/DffzOI3g8Yk_t00m02s.jpg) |
| 00:12 | **Text to speech [Beta]** 🆕 : zone « Type or paste the text… », « Generate text » ; à droite Model « Voxtral », voix « Oliver - Excited », *Customization* : **Word synchronization** ; « Try an example » : Storytelling, Announcement, Conversation, Technical, Call Center, Podcast | — |
| 00:16 | Panneau « Select a voice » : onglets **Actors / My voices**, recherche, filtres Gender et Language ; « + Add a new voice » | — |
| 00:18 | Modale **« Clone your voice »** 🆕 : nom, « Audio to clone » (**fichier jusqu'à 10 MB**) ou « Record your voice », case de consentement (« I confirm I have consent to clone this voice and won't use anything generated for illegal or harmful purposes »), Close / Submit | [img](sources/videos-images/observabilite-admin/DffzOI3g8Yk_t00m18s.jpg) |
| 00:24–00:46 | Modale « Record your voice » : vu-mètre, compteur **0:01 / 0:30**, script de référence, « Restart », « Finish recording » | — |
| 00:48–00:52 | Fichier `recording-….m4a` (308,45 KB) ; toast « Voice created successfully » ; voix ajoutée en tête de « My voices » | — |
| 00:56–00:58 | Compteur **« 163 / 4,000 characters »** 🆕 ; lecteur (durée, lecture, téléchargement, vitesse « 1.00x ») ; **mots surlignés pendant la lecture** | — |
| 01:14–01:20 | Onglet Actors groupé par acteur : « Paul — English (US) • Male » (Sad, Neutral, Happy, Frustrated, Excited, Confident, Cheerful, Angry), « Oliver — English (UK) • Male » ; filtres Gender (Female/Male/Neutral) et Language (English UK, English US, French) — confirme les variantes `en_paul_*` de [19](19-audio-2-tts-agents-vocaux.md) | — |
| 01:28–02:34 | Diapos « Pro tips » : 3–30 s (3 s min., 30 s max.), parler naturellement, éviter les hésitations, effet d'accent cross-lingue, épeler nombres et abréviations, < 300 mots, pas d'emojis (confirme [31 C9](31-autres-videos.md)) | — |

### 3.7 — Voxtral TTS 3 — Feature Overview (`y7Dtkjz3MZM`)

21/10/2026 · 2:03 · 61 → 56 images. **Nouvelle console d'octobre 2026** (sélecteur « Studio », logo bleu). Fiche existante : [31 C11](31-autres-videos.md).

| Temps | Montré | Image |
|---|---|---|
| 00:14–00:18 | **Menu latéral d'octobre 2026** 🆕 (§4.1) et page **Speech to Text** : « Convert any audio or video file to text with our transcription template » ; cartes « **Upload files** — 10 files maximum. 1GB each. mp3, wav, m4a, flac, ogg, mp4, mov, mkv, webm » et « **Record audio** — Record up to **2 minutes** of your voice » ; sélecteurs « Transcribe ▾ » et « **In real time ▾** » 🆕 | [img](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m16s.jpg) |
| 00:20–00:22 | **Text to Speech** 🆕 : placeholder « Type your text with tags like `[emotion="angry"]` or `[pace="slow"]`… Type `[` to explore tags » ; « Generate text », « **+ Import a file** » ; « Or start with an idea » (short story, announcement, conversation, « Show more ») ; à droite : Model **« Voxtral Mini TTS 3.0 »**, Word synchronization, Voice « Charlotte · English », **Pronunciations [New]**, **Conversation context [New]**, **Expressiveness** (valeur 2, curseur « **Robust ↔ Creative** ») | [img](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m22s.jpg) |
| 00:28–00:32 | Voix « Charlotte, James, Hugo, Alexa, Howard, Tom… » (avatars pixel) ; « 59 / 4,000 characters » ; lecteur flottant avec « **Add to conversation context** », « 1x », téléchargement ; bouton « Reset » | — |
| 00:40–00:46 | **Autocomplétion des balises** 🆕 : popover « Emotion » (`amused`, `angry`, `anxious`, `apologetic`, `appreciative`, `assertive`, `bored`, `calm`, `confident`, `confused`, `critical`, `curious`, `determined`, `disappointed`, `disgusted`, `excited`, `frustrated`, `grateful`, `happy`, `hopeful`, `playful`, `proud`…) filtré à la frappe ; popover « Pace » (`very-slow`, `slow`, `moderate`, `fast`, `very-fast`) ; balises colorées dans le texte | [img](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m40s.jpg) |
| 01:04–01:08 | Panneau **Pronunciations** 🆕 : « Words — Use IPA symbols separated by spaces. Words are case-sensitive. » ; ligne mot + IPA, valider/annuler, « + Add New » ; compteur « Pronunciations 1 » | — |
| 01:20–01:28 | Expressiveness réglée à 3.2 puis 4.5 ; état « Generating audio » | — |
| 01:38 | Panneau **Conversation context** 🆕 : « Previous turns, oldest first. Your text is spoken as the assistant's reply to the last user turn. » ; « Record or upload what the user says. To start with the assistant, generate a greeting and add it to the conversation. » ; boutons Record / Upload | [img](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t01m38s.jpg) |

### 3.8 — Voxtral TTS 3 — Voice Cloning Overview (`1czHOKcAtfY`)

21/10/2026 · 1:42 · 51 → 44 images. Fiche existante : [31 C12](31-autres-videos.md).

| Temps | Montré | Image |
|---|---|---|
| 00:18 | Page **« Voice Cloning — Create and manage your cloned voices »** 🆕, bouton « Voice Cloning API docs », onglets **Instant / Professional** ; Instant : carte « Record audio », conseils (« a clean, **5–30-second** audio… minimal pausing or disfluencies ») ; liste « Your voices » | — |
| 00:20–00:26 | Professional : « **Add recordings** — MP3, WAV, M4A, FLAC or OGG — 30 minutes or more recommended, **up to 1 GB per file** » ; conseils (30 min à 3 h, une seule voix, même micro, varier les émotions, pas de réduction de bruit) ; « Professional voices you create will appear here. » | — |
| 00:34–00:46 | Page **« Voice Cloning / Professional Voice »** 🆕 : jauge « Recordings — **42:44 of 30:00 recommended** », fichiers (nom, taille · durée, écoute, suppression) ; formulaire *Voice name*, *Language* (**13 langues** : arabe, allemand, anglais, espagnol, français, hindi, italien, japonais, coréen, néerlandais, portugais, russe, chinois), *Gender* (Neutral / Female / Male), *Description (optional)*, *Avatar* (« Default avatar — Neutral expression »), consentement ; bouton « Create voice » | [img](sources/videos-images/observabilite-admin/1czHOKcAtfY_t00m36s.jpg) |
| 00:56–01:00 | Envoi par fichier (« ✓ Uploaded », « 64% ») ; liste « Your professional voices » : *Jen — A friendly expert at Mistral · Female · English · ● Ready* ; menu **Use / Edit / Delete** 🆕 | [img](sources/videos-images/observabilite-admin/1czHOKcAtfY_t01m00s.jpg) |
| 01:02–01:16 | TTS avec la voix « Jen » et `[emotion="happy"]` | — |

### 3.9 — Opening keynote, AI Now Summit 2026 (`IC0VNOzPZU8`), chapitre « Vibe and Studio platform » 21:43–31:25

| Champ | Valeur |
|---|---|
| Date · durée | publiée le 30/06/2026 (événement du 28/05/2026, Paris) · 42:44 |
| Orateur | Timothée Lacroix, co-fondateur et CTO (incrustation [21:51]) |
| Images | 291 → 106 (seuil 12) + vidéo de lancement 22:54–25:08 au seuil 2 (67 → 66), toutes examinées |
| Audio | **transcrit localement** → [`sources/videos/IC0VNOzPZU8.txt`](sources/videos/IC0VNOzPZU8.txt) ; résumé au §5 |
| Base | [31](31-autres-videos.md) la signalait « non lue » faute de sous-titres 🆕 |

**Chronologie (images)**

| Temps | Montré | Image |
|---|---|---|
| 21:59 | Diapo : mascotte chat pixel | — |
| 22:51 | « Meet Vibe » : écran d'accueil « Welcome back, Charlie. », suggestions (« Summarize my unread emails », « Write tests for the auth module »), champ « Ask Vibe anything » | — |
| 22:54–24:50 | **Vidéo de lancement de Vibe** (typographie animée) : *Your work can run beside you* ; prompt d'analyse → étapes « Working · Thought for 3s · Looked at Market_Sizing_Data.xlsx · Looked at Clinical_Trial_Summary_2026.pdf · Searching web (deloitte.com, pwc.com) » → brief « RQ3 2026 Pharma & Life Sciences Strategic Brief » (« Edit in Canvas ») ; *Summarizing while you were in back-to-backs* (Google Calendar, Gmail, Google Drive, Slack « Schedule Message ») ; sélecteur Vibe **Work / Code**, « New Task », « Search » ; *Shipping before the standup* (2FA, « App repo », diff, PR) ; *Automated by agents that learn your routine* : menu « + » (**Add photos & files, Research, Libraries, Agents, Connectors, Projects, Workflows**) et panneau **« Search workflow » / « + New Workflow » / My Workflows (Site monitoring, Total Refinery Review) / Shared by Mistral AI (Mailchimp Email Campaign)** 🆕 → « Workflow started : Site monitoring » → « Loaded skill pipeline-analysis.md · Telemetry · Data lake · Jira Ticket JIRA-4821 opened » → « Health Summary: Control Module D3 » (Health Score 94 %, graphiques) ; *Fluent in your tools* ; *Grounded in your knowledge* ; *Running on frontier intelligence* ; « Vibe by Mistral » | [img](sources/videos-images/observabilite-admin/IC0VNOzPZU8_t24m12s.jpg) |
| 25:15–25:53 | « Vibe for work — AI agent for long-horizon tasks, fluent in your knowledge and tools » ; captures « Worked for 2s — Meetings Report - Week of May 11-17 » (Edit, Copy), « Reading Calendar Events » | — |
| 26:21–27:51 | « Vibe for code — Ship faster with an agentic stack that meets you where you code » ; sélecteur de projet (Search, « + Create new project », Vibe, Parker, Vibe-code-cli, **Agent Council**, « Load 5 more ») ; « **Vibe Code will analyze your request and propose an agent team for your approval** » 🆕 | — |
| 27:55–29:05 | « **Studio — Build, test, and run AI agents and apps.** » + capture de console 🆕 : en-tête « Organization [Enterprise] · Workspace #1 », **rail d'icônes** (≈ 20 icônes en groupes), « Mistral Studio — Your workspace for building, testing, and managing AI-po[wered apps] », carte **Build** (Playground, Workflow, Create an API key) et carte **Capture** (« Voice ge[neration]… », Speech…, Text-to…, **« Voice A… »** — inférence : Voice Agents) | [img](sources/videos-images/observabilite-admin/IC0VNOzPZU8_t27m55s.jpg) |
| 29:17–31:21 | « **Forge — Train, align, and evaluate custom AI models.** » (« CUSTOM ENTERPRISE MODEL ») | — |

### 3.10 — AI NOW Summit 2026, direct (`-qHRgnKGfvg`), segment 23:15–33:30

| Champ | Valeur |
|---|---|
| Date · durée | 28/05/2026 · 44:39 (direct) |
| Images | repérage 240p (60 images, 1 / 15 s, 20:00–35:00) puis 1080p 23:15–33:30 (308 → 117 distinctes), toutes examinées |
| Audio | segment 23:30–33:30 transcrit localement → [`sources/videos/-qHRgnKGfvg.txt`](sources/videos/-qHRgnKGfvg.txt) |

**Constat** : le direct contient **le même segment** que la version montée, décalé d'environ **+1:53** (Timothée Lacroix entre à 23:36 au lieu de 21:43 ; Forge se termine à 33:15 au lieu de 31:25 ; Arthur Mensch prend la parole à 33:29). Mêmes diapos, même vidéo de lancement, mêmes captures. Seule différence visible : l'incrustation complète « Timothée Lacroix — Co-founder and Chief Technology Officer - Mistral » ([23:45]). Avant 23:30, Guillaume Lample présente la diapo « One model for everything » (Pixtral, Magistral, Devstral, Agentic search) — hors périmètre.

---

## 4. Inventaire consolidé par écran

### 4.1 Navigation de la console Studio : cinq états observés

| Date (source) | Barre supérieure | Menu latéral (groupes › entrées) |
|---|---|---|
| **déc. 2025** ([Axlesb8yTro 11:23, 13:29](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m29s.jpg)) | « AI Studio ▾ », organisation, « Default Workspace », Search ⌘K, avatar ; bandeau « Announcing Mistral's AI Studio » | Home, Workspace, API Keys · **Create** › Playground, Agents, Batches · **Improve** › **Observe** (Explorer, **Campaigns**), **Evaluate** (**Experiments**, **Exp. Playground**, Datasets, Judges), Fine-tune · **Context** › Files · **Code** › Codestral · **Docs** › Documentation, API, Cookbooks · Get support 🆕 |
| **févr. 2026** ([93ZAhW3bk8g 00:00](sources/videos-images/observabilite-admin/93ZAhW3bk8g_t00m04s.jpg)) | idem, organisation « Mistral AI - Preview Org » | Home, Workspace, API Keys · Create › Playground, Agents, Batches, Workflows [Beta], Document AI, Audio [Beta] › Speech to text · Improve › Fine-tune · Context › Files · Code › Vibe CLI [New], Codestral · Docs › Documentation, Models, API, Cookbooks · Get support 🆕 |
| **mars 2026** ([DffzOI3g8Yk 00:02](sources/videos-images/observabilite-admin/DffzOI3g8Yk_t00m02s.jpg)) | idem | Home, API Keys · Create › Playground, Agents, Batches, Document AI, Workflows, Audio (Speech to text, Text to speech) · **Improve › Observe, Evaluate, Fine-tune** · Context › Files · Code › Vibe CLI [New], Mistral Code IDE · Help & Resources 🆕 |
| **mai 2026** ([IC0VNOzPZU8 27:55](sources/videos-images/observabilite-admin/IC0VNOzPZU8_t27m55s.jpg)) | logo Studio bleu, « Organization [Enterprise] », « Workspace #1 » | **rail d'icônes** seul (≈ 20 icônes en 4–5 groupes, libellés non visibles) 🆕 |
| **juil. 2026** ([tAt386mbgps 24:07](sources/videos-images/observabilite-admin/tAt386mbgps_t24m07s.jpg)) | « Studio ▾ », organisation + workspace « Mistral AI TME Team » | Home, API Keys · **Build** › Agents ›, Audio (Speech to Text, Text to Speech, Voice Cloning [New]), Batches, Document AI, Workflows › · **Context** › Connectors, Knowledge ›, Prompts [New], Skills [New] · Help & Resources (pas d'Observabilité, organisation Enterprise) 🆕 |
| **oct. 2026** ([y7Dtkjz3MZM 00:16](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m16s.jpg)) | « Studio ▾ » (recherche et repli à côté du logo) | **Start**, API keys · **Create** › Agents ›, Audio (Speech to Text, Text to Speech, Voice cloning), **« Lots »** (sic, icône de camion : Batches), Document AI, Workflows ›, **Secrets Manager** · **Context** › Connectors, Knowledge ›, Prompts, Skills · **Monitor › Traces** (icône **cadenas**) 🆕 ; menu repliable en rail d'icônes |

- ⚠️ La base ([00 §4](00-synthese.md)) décrit le menu de juillet 2026 (plan gratuit, français) et dit qu'il n'a « aucune entrée Observabilité ». Les images montrent que l'entrée **existait en déc. 2025 et mars 2026** (« Improve › Observe / Evaluate », avec cartes « Observe [Beta] » et « Explorer [Beta] » à l'accueil), **disparaît en juillet 2026 même pour une organisation Enterprise**, puis **revient en octobre 2026 sous « Monitor › Traces »** avec un cadenas (inférence : fonction verrouillée selon le plan).
- 🆕 « Lots » apparaît en anglais au milieu d'un menu anglais (inférence : traduction française résiduelle de « Batches »). L'accueil s'appelle « Start » en octobre (« Home » / « Accueil » avant).
- 🆕 **Sélecteur de produit** (juillet 2026, [img](sources/videos-images/observabilite-admin/tAt386mbgps_t31m33s.jpg)) : menu « Studio ▾ » → **Vibe, Studio, Docs & API**, séparateur, **Admin**. Confirme les « onglets » cités dans [31 §3.9](31-autres-videos.md).

### 4.2 Accueil de Studio (quatre versions)

| Version | Titre et sous-titre | Cartes et liens |
|---|---|---|
| déc. 2025 | « Mistral AI Studio » | Create / Observe / Improve (Improve → Evaluate, Fine-tune) ; bandeau « Welcome <prénom>! » |
| mars 2026 🆕 | « Mistral AI Studio — Build, observe, and improve your AI Apps » ; chip « Explore Playground » | **Create** « Use frontier AI in your app, open and customizable to your needs » → Playground, Agents ; **Observe** « Master your AI conversations and tool performance » → Observe [Beta], Explorer [Beta] ; **Improve** « Maximize AI performance and minimize costs with fine-tuning… » → Fine-tune |
| mai 2026 🆕 | « Mistral Studio — Your workspace for building, testing, and managing AI-po[wered apps] » | **Build** « Leverage cutting-edge AI models to create custom app experiences » → Playground, Workflow, Create an API key ; **Capture** « Voice ge[neration]… » → Speech…, Text-to…, Voice A[gents] (inférence) |
| juil. 2026 🆕 | « Mistral Studio — Your workspace for building, testing, and managing AI-powered apps. » | **Build** → Playground, Workflows, Create an API key ; **Capture** « Document analysis, voice generation and replication that captures personality » → OCR, Speech-to-text, Text-to-speech ; **Quickstart** (Create an Agent ; Test audio models) ; **Documentation** (Document AI ; Text & Chat completion) |

La version de juillet correspond aux cartes « Créer / Capturer » de la base ([00 §4](00-synthese.md)), qui provenaient de la vidéo Pentiminax en français.

### 4.3 Observability (écrans de décembre 2025)

#### 4.3.1 Explorer 🆕 ([img](sources/videos-images/observabilite-admin/Axlesb8yTro_t10m15s.jpg), capture de diapo, oct. 2025)

| Zone | Contenu observé |
|---|---|
| Titre | « **Explorer** — View and analyze chat completions and tool calls » |
| Filtres | Constructeur de filtres composables : `And ( Model = mistral-medium-latest ✕ And Tools: Invol[ved]… )` |
| Tableau | Colonnes **Timestamp**, **Model**, **Input To[kens]**… ; dates d'octobre ; valeurs de 93 à 78 192 tokens |
| Épinglage | « › **Show pinned events** (2 items) » |
| Panneau latéral | « **Chat details** ↗ », horodatage à la milliseconde (« October 9th 18:26:06.366 »), navigation ˄ ˅ entre événements, fermeture ; onglets **Feed / Properties** ; fil User / Assistant / Tool ; appels d'outil « Web Search » repliables avec JSON (`function.arguments` {`query`, `start_date`, `end_date`}, `name: web_search`, `id`, `index`, `metadata.integration_id`, `type: function`) ; résultats Tool numérotés 0–9 avec liens ; bouton `</>` (vue brute) par message ; rail de mini-icônes pour sauter dans le fil |

- ⚠️ Nuance [14 §4.1](14-observabilite-evaluations.md) : la base décrit un **Trace Explorer** (arbre de spans, langage d'expressions). L'écran de 2025 est un explorateur d'**événements de chat completion** à filtres visuels, sans arbre de spans (inférence : version antérieure au passage à OpenTelemetry).
- Diapo associée : *Explorer : inspect production traffic, filter by prompt, user, or outcome* ; *Traces & Dashboards : correlate latency, quality, and cost in one view* 🆕.

#### 4.3.2 Datasets 🆕 ([img](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m29s.jpg))

| Élément | Valeur |
|---|---|
| Route | `console.mistral.ai/observability/datasets/<uuid>` ; fil « ← Datasets / Financial Regulations dataset » |
| En-tête | Description, propriétaire (chip « Param Singh ») |
| Actions | **+ Add data**, **⤓ Export to JSONL**, **New experiment** |
| Colonnes | **Prompt**, **Grading guidance**, Created, Last updated, **Attribute: messages**, **Attribute: model**, **Attribute: id**, **Attribute: presence_…**, … |
| Défaut visible | cellule « [object Object], […] » dans la colonne Prompt (bug d'affichage) |

- Confirme le champ `grading_guidance` de [14 §3.6](14-observabilite-evaluations.md) et le **format d'export JSONL** ; comble le manque signalé en [14 §4.3](14-observabilite-evaluations.md) (« ne décrivent pas l'écran »).

#### 4.3.3 Record details 🆕 ([img](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m51s.jpg))

- Panneau « **Record details** — Overview and edit your dataset record » (`?recordId=<uuid>`).
- Onglets **Feed / Grading Guidance / Properties**.
- Messages System / User / Assistant / Tool, rôle modifiable par menu (⌄), icônes éditer ✎, vue brute `</>`, menu ⋮ ; message Assistant avec champs **Content** et **Tool calls** (JSON) ; « **+ Add message** ».

#### 4.3.4 Judges : liste et édition 🆕 ([liste](sources/videos-images/observabilite-admin/Axlesb8yTro_t11m03s.jpg), [édition](sources/videos-images/observabilite-admin/Axlesb8yTro_t15m01s.jpg), [explication](sources/videos-images/observabilite-admin/Axlesb8yTro_t15m29s.jpg))

| Écran | Champs et valeurs |
|---|---|
| Liste « **Judges** — Manage your LLM judges and evaluate your models » | Bouton **Create Judge** ; « Filter judges » ; « Columns 5 » ; colonnes **Name, Description, Type, Instructions, Output** ; Type **Classification** (vert) ou **Regression** (orange) ; Output = étiquettes (1/0, FR/EN, Good/Bad, Yes/No, MISSING/OK « +1 more »…) ou bornes (« Min: 0 Max: 10 », « Min: 0 Max: 1 ») ; 16 juges listés (ex. « Language Mismatch Judge », « Ambiguity Classifier », « Named Entity Extraction », « Response Quality & Helpfulness Judge ») ; menu ⋮ par ligne |
| « **Edit judge** — Evaluate and classify LLM outputs » | Route `/observability/judges/create?judge_to_edit=<uuid>&judge_form_id=…&dataset_id=<uuid>` ; boutons **Cancel**, **▷ Try it**, **Save judge** ; **Instructions*** (prompt du juge) ; **Tools** (icônes web et code) ; **Type** (`REGRESSION`) ; **Score definitions*** : *Low score definition* / *High score definition* |
| Zone d'essai | « **Source: Dataset › Financial Regulations dataset** », « **10 events max.** », « Columns 4 » ; colonnes **Expected output**, **Judge output** (bouton rejouer, résultat « ✓ 1 »), Prompt ; « End of the list (total: 5, maximum limit: 10) » ; survol du score → popover **« Output explanation »** |

- Confirme les types `CLASSIFICATION` / `REGRESSION` de la spec ([14 §1](14-observabilite-evaluations.md)), que la base ne connaissait « que par la spec ». 🆕 : les **outils** (web, code) attachables à un juge, les **définitions de score bas/haut**, l'essai limité à **10 événements**.

#### 4.3.5 Campaigns, Experiments, Exp. Playground, Dashboards, AI Registry

- 🆕 **Menus seulement** (déc. 2025) : *Campaigns* (sous Observe), *Experiments* et *Exp. Playground* (sous Evaluate). Aucun écran ouvert dans les vidéos. Diapos : *Judges & Campaigns : automate scoring and feedback collection at scale* ; *Datasets & Experiments : turn real interactions into structured evaluations* (inférence : les « Campaigns » correspondent aux **pipelines** d'évaluation en ligne de la spec, [14 §1](14-observabilite-evaluations.md)).
- 🆕 **AI Registry** (diapos déc. 2025 et juil. 2026) : catalogue unifié « models, prompts, datasets, **judges, and tools** », versions et lignage, couche d'intégration Observability/Runtime, API et SDK pour CI/CD ; en juillet 2026 : « Repository of custom models, prompts, and datasets with lineage and access controls ». Aucun écran montré.
- 🆕 Diapo de juillet 2026 : *APM metrics*, *Dashboards*, *Context graph*, *Iterations* (« reproducible, versioned runs ») annoncés ; vignettes de maquette sombres (« Agents by Confidence ») — non montrés en console.
- 🆕 **Visualisations de traces** (diapos Mistral, juillet 2026) : flame graph à spans imbriqués avec durées (µs à ms) et arbre de spans à barres temporelles « 54 Spans » ([img](sources/videos-images/observabilite-admin/bUDwFxbf_M8_t23m52s.jpg)) — rendu proche d'un explorateur de traces (inférence : celui de Studio).

### 4.4 Admin Panel (juillet 2026, organisation Enterprise)

#### 4.4.1 Menu et Workspaces 🆕 ([img](sources/videos-images/observabilite-admin/tAt386mbgps_t23m15s.jpg))

| Groupe | Entrées observées | Écart avec [03 §4.1](03-administration-securite-facturation.md) |
|---|---|---|
| ADMINISTRATION | Organization, Access, Members, Workspaces, Audit Logs, Connectors | ⚠️ pas d'entrée **Groups** (présente dans la base) |
| SUBSCRIPTIONS | Subscriptions, Billing | confirme |
| VIBE | **Preferences**, Privacy | 🆕 Preferences dans le menu |
| API | API Keys, Usage, Limits, **Privacy** | 🆕 API › Privacy |
| MISTRAL CODE | **Usage** | 🆕 groupe absent de la base |

- En-tête : « ⚙ Admin ▾ » (sélecteur de produit) et organisation « Mistral AI TME Team ⇕ ».
- Page **Workspaces** : onglets **Active / Archived**, recherche, bouton « + », colonnes **Name / Description / Members** ; workspace par défaut étiqueté **[Default]** avec la description « This is the default workspace. **It cannot be archived.** » 🆕.

#### 4.4.2 Sélecteurs côté Vibe 🆕

Menu compte : Profile, Security & Access, Preferences, Privacy, Terms & Conditions, Help Center, Log out, thème clair/sombre/système. Panneau « **Your Organizations +** » avec plan par organisation (Enterprise, Free) et engrenage d'accès à l'admin ; « **Organization Workspaces** ». Barre latérale Vibe (juillet) : onglets Chat / Work / Code ; New Chat, Context, **Meeting Notes [Preview]**, **Scheduled [Preview]**, Projects, Chats.

#### 4.4.3 Audit Logs 🆕 ([img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m19s.jpg))

| Élément | Observé |
|---|---|
| Titre | « Audit Logs — View and manage your audit logs » |
| Filtres | **Actor**, **User**, **Event**, **Target** (⚠️ la base cite Actor / Event / Target ; le filtre **User** est en plus) |
| Colonnes | **Created At** (tri), **Actor**, **Actor Metadata**, **Event**, **Event Metadata**, Ta[rget]… |
| Actor | `HUMAN` |
| Actor Metadata | `actor_id` / `org_id`, `user_id`, `workspace_id`, **`is_mistral_system: False`**, `uuid`, `email`, `name` |
| Événements visibles | `skill.load` (Event Metadata : `source: model`, `workspace_id`, `skill_version: 1`, `skill_tool_call_id`), `le_chat.conversation.created`, `skill.update` (`updated_fields: notes,aliases`), `library.document.delete` |

- Les 4 événements figurent dans la liste de la spec ([03 §3.18](03-administration-securite-facturation.md)). 🆕 : le champ `is_mistral_system` et le contenu des métadonnées (`source: model` pour un skill chargé par le modèle).

#### 4.4.4 Connecteurs d'organisation 🆕 ([liste](sources/videos-images/observabilite-admin/tAt386mbgps_t24m31s.jpg), [Gmail](sources/videos-images/observabilite-admin/tAt386mbgps_t24m41s.jpg))

- **App Connections** : « Connect GitHub and Slack as organization-level bots. Once connected, all members can use them through Mistral AI without signing in individually. » — GitHub (« Search repositories, review issues, and manage pull requests »), Slack (« Search messages, read channels, send messages, and manage canvases »), bouton « Connect ».
- **All Connectors** : « Manage the connectors and their tools used in Vibe and AI Studio » ; colonnes triables **Name / Type / Permissions** ; lignes Atlassian, BigQuery, Box, GitHub, Gmail, Google Calendar, Google Drive (étiquette **Indexed**) ; Type **Featured** ; Permissions **Allowed**.
- Fiche **Gmail** : « Read and send emails with Gmail » ; onglets Overview / Credentials / Permissions (confirme la base) ; bloc **Information** : *Visibility* Organization ⓘ, *Authentication* OAuth2, *Origin* Featured, *Capabilities* —, *Connector name* `gmail`, *Connector ID* (UUID) ; bloc *Includes* : « You're not connected — You need to connect to see the tools. » ; bouton **Connect**.

#### 4.4.5 Subscriptions 🆕 ([img](sources/videos-images/observabilite-admin/tAt386mbgps_t24m59s.jpg))

- Onglets **Vibe / API Plan / Mistral Code**.
- Mistral Code : *Seats* (« Number of Mistral Code Enterprise seats available for your organization. To change the seat count contact us. »), *Current plan* **Enterprise** (« Full access to Mistral Code and its features », « Centralized billing and administration », « Dedicated usage page for Mistral Code »).
- Vibe : bandeau **Team** ; *Monthly usage* (barre, « Resets in 23 days ») ; interrupteur **« Pay-as-you-go for Vibe CLI — Allow Vibe CLI usage beyond your included monthly quota with pay-as-you-go billing »** ; *Seats* « How many of your Team seats are used ».
- ⚠️ L'organisation est étiquetée « Enterprise » dans le sélecteur de Vibe mais l'onglet Vibe des abonnements affiche le bandeau « Team » (inférence : plans distincts par produit dans une même organisation).

#### 4.4.6 Vibe › Preferences 🆕 ([img](sources/videos-images/observabilite-admin/tAt386mbgps_t25m05s.jpg))

« Preferences — Configure your preferences related to Vibe ». Section **Tools** :

| Réglage | Libellé d'aide |
|---|---|
| **Work tab** (menu déroulant, valeur tronquée « Wait u… ») | « Choose when your organization gets access to the Work tab. Learn more. » |
| Work mode | « Allow users to use Work mode for multi-step tasks » |
| Agents | « Allow creation and usage of AI agents » |
| Canvas | « Enable collaborative documents for writing, coding and planning » |
| Code Interpreter | « Run code to analyze data, generate files, and perform cal[culations] » |
| Deep Research | « Enable multi-step research with source synthesis and citations » |
| Image Generation | « Allow models to generate and edit images from prompts » |
| Memories | « Let Vibe remember context across conversations » |
| Thinking Mode | « Allow models to reason step by step before generating… » |
| Web Search | « Let models browse the web to retrieve up-to-date information » |
| Code tab | « Allow users to access the Code tab for vibe coding sessions » |

- Effet observé : Work mode désactivé → l'onglet **Work disparaît** de Vibe (Chat / Code seulement) ; réactivé → il revient ; toast « Settings updated successfully ».
- La base ([22](22-vibe-work-le-chat.md)) ne connaissait sur cette page que l'interrupteur **Knowledge** (doc d'octobre), absent de la capture de juillet (inférence : ajouté après).

#### 4.4.7 API › Limits 🆕 ([modèles](sources/videos-images/observabilite-admin/tAt386mbgps_t25m59s.jpg), [documents](sources/videos-images/observabilite-admin/tAt386mbgps_t26m09s.jpg))

Route `admin.mistral.ai/plateforme/limits` (confirme la base).

| Bloc | Contenu |
|---|---|
| « **Organization limits** » | « To ensure the highest level of service quality, our API enforces limitations. » |
| « **Completion rate limits per model** » | « In case you need to raise your usage limits, please feel free to contact us by utilizing the support button… » ; « Filter models… » ; tri **Sort by Name / Sort by Tokens per Minute / Reset Sort** ; une carte par modèle avec **Tokens per Minute** et **Requests per Second** (ex. `codestral-2508` 2 500 000 TPM / 41,67 RPS ; `codestral-embed` 20 000 000 / 24,00 ; `devstral-2512` 5 000 000 / 10,00) ; la liste de cette organisation interne contient aussi des identifiants non publics (`deepseek-v4-pro-sglang`, `darija-stt-solutions-0702`, `251224_123b_rm_v1_6_mm_minus1`…) |
| « **Document OCR rate limits** » | « These limits apply to your OCR API consumption. » ; **Pages per minute : 5,000** |
| « **Documents** » | « Configure the maximum file size for document uploads. » ; curseur **Maximum file size** (min. 1 MB) ; « **Current effective limit: 100 MB** » |
| « **Document Downloads** » | « Control whether users can download documents from the library. » ; interrupteur **Disable file downloads** |

- ⚠️ L'orateur parle de « tokens per second » ; l'écran affiche des **requêtes** par seconde.
- ⚠️ La limite de 100 Mo par document téléversé (réglable) diffère des 50 Mo de l'OCR API ([16](16-document-ai-ocr.md)) ; elle concerne les uploads de documents de bibliothèque (inférence d'après le libellé voisin).

### 4.5 Agentic Safety : Rules et Policies (septembre 2026) 🆕

Source : [CGq9KRSb9Kc 61:42–62:34] (vidéo de démo projetée, captures recadrées). Intertitres : « We're introducing **Agentic Safety rules in Studio** » puis « Rules are deployed using **Agentic Safety policies** ».

**Rule** ([img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m01s.jpg))

| Zone | Contenu |
|---|---|
| Fil d'Ariane | « Rules / Prompt Injection Rule » ; badge **« v6 • Latest »** |
| Description | « Detects prompt-injection attempts in tool content that try to override the agent's instructions. » |
| Encadré | « **What is a rule?** A rule combines hooks that control when it runs, scanners that define what it looks for, and cases that decide its outcome, layering multiple detection strategies for better accuracy. » |
| 1. **Hooks** (1) | « When in the agent lifecycle this rule runs. » → **Post tool call** (« Runs after a tool or connector returns. ») ; dupliquer / supprimer ; « + Add hook » |
| 2. **Scanners** (2) | « What this rule inspects for. » → `pi_classification` (**Moderation**), `pi_judge` (**LLM judge**) ; « + Add scanner » |
| 3. **Cases** (3) | « What to do when the conditions match. » → `pi_audit` (« Let the content through »), `pi_detected` (« Block this content before it reaches the conversation »), `pi_validated` (« Stop the agent run entirely ») ; « + Add case » |
| Colonne droite | **Policies** « Policies that import this rule » : 1 policy, **« Vibe Work guardrails »** (« Content moderation and PII protection ») ; **Usage** (repliable) |

**Modale « Configure scanner »** ([img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t61m58s.jpg)) : « Choose what this scanner detects and how it behaves » ; « Remove scanner » ; 1. *Scanner* (« Name it, choose its modalities and type, then configure it ») : **Name** `pi_classification`, **Modalities** **Text / Image / Audio / Files**, **Scanner type** `Moderation`, **Model** **`mistral-moderation-ipi-260708`** ; 2. **Retry configuration** ; Cancel / Apply.

**Modale « Configure case »** ([img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m10s.jpg)) : « Decide the verdict and any side effects when this case matches » ; « Remove case » ; 1. *Case* : **Name** `pi_detected`, **Type** `Condition`, **Condition** « Where `pi_classification.malicious` > `0.8` » + « Add condition » ; 2. *Outcome* (« The verdict, alert, and failure behavior when it matches ») : **Verdict** ∈ { **Allow** « Let the content through » ; **Human validation** « Pause for a human to review » ; **Block** « Block this content before it reaches the conversation » ; **Terminate** « Stop the agent run entirely » }, **On scanner failure** (ex. Human validation), un troisième sélecteur (inférence : alerte) ; 3. **Side effects**.

**Policies** ([img](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m31s.jpg))

| Écran | Contenu |
|---|---|
| Liste vide | « **Policies** — Named sets of rules attached to a scope, products and metadata. » ; « No policies yet — Create a policy to group rules and attach them to a scope, products and metadata. » ; **Documentation**, **+ Create policy** |
| Modale « Create policy » | « Give your policy a name and an optional description. You can configure its rules and targeting next. » ; Name « Prompt Injection Policy » ; Description « Rolls out the prompt-injection detection rule to every Vibe CLI. » |
| Page de politique | « Policies / Prompt Injection Policy **v1 • Latest** » ; bouton **Test in playground** ; encadré « **Policy disabled** — This policy is disabled. You can still test it in the playground. » + interrupteur Disabled/Enabled ; 1. « **Choose the agentic surfaces to protect** — The list of products this policy applies to. » (sélecteur de produits → `Vibe CLI`) ; 2. « **Add or remove rules** » (« The rules enforced by this policy… ») avec tableau Name / Cases et « + Add rules » ; colonne « **Policy usage over time** » (« No usage data yet. ») ; boutons **Reset changes** / **Save** |
| Modale « Add rules » | « Select the rules to add to this policy » ; « + Create rule » ; recherche ; colonnes Name / Cases / **Usage** (mini-graphique) ; « Edited 38 minutes ago by … » |
| Modale « Save new version » | « Add an optional message describing what changed in this version. » ; **Version message** (ex. « Tightened PII rules ») ; Cancel / **Save version** |

- Lien avec la base : les **Custom Guardrails** déclaratifs ([10](10-conversations-capacites.md) : `moderation_llm_v2`, entrée seulement, 403) et les rôles/politiques d'admin. Rules et Policies ajoutent des **hooks de cycle de vie d'agent** (après appel d'outil), des **scanners multimodaux**, un **verdict « Human validation »** et un **ciblage par surface produit** — rien de cela n'est dans la doc ni dans la spec locales.
- Le modèle `mistral-moderation-ipi-260708` est inconnu de la base (inférence : « ipi » = *indirect prompt injection*, version du 08/07/2026).
- Le libellé « Vibe Work guardrails — Content moderation and PII protection » montre une politique préexistante pour Vibe Work.

### 4.6 Playgrounds audio

#### 4.6.1 Speech to Text (trois versions) 🆕

| Élément | févr. 2026 | juil. 2026 | oct. 2026 |
|---|---|---|---|
| Titre / aide | « Speech to text » ; « Audio Speech to text API docs » | « Transcribe your audio & video files » ; « Audio Transcription API docs » | « Speech to Text — Convert any audio or video file to text with our transcription template » ; « Documentation » |
| Modes | — | onglets **Offline / Realtime** | sélecteurs « Transcribe ▾ » et « **In real time ▾** » |
| Entrées | 10 fichiers ; .mp3 .wav .m4a .flac .ogg ; **1024 MB** chacun | « 10 Files Max • 1024MB Each » ; **+ MP4, MOV, MKV, WEBM** ; **Record** ; **Paste files ⌘V** ; glisser-déposer | « Upload files — 10 files maximum. 1GB each » (mêmes 9 formats) ; « **Record audio — Record up to 2 minutes of your voice** » |
| Réglages | Model (`voxtral-mini-latest`, `voxtral-mini-2602`), Language (Auto-detect), Diarize, Timestamps Off/Segment/Word, Context bias | icône réglages (non ouverte) | non ouverts |
| Résultat | segments + locuteur, forme d'onde, statistiques ; boutons Code, Transcribe, Download | — | — |
| Pied | « Need more? Try the API. » | « Do more with the API — process video files and integrate with our completions endpoints. » | — |

- Confirme « jusqu'à 10 fichiers » et la diarisation ([31 C10, §3.3](31-autres-videos.md)). 🆕 : formats vidéo acceptés dans l'interface, enregistrement micro (2 min), collage, mode temps réel.
- ⚠️ Le pied de page de juillet invite à passer par l'API pour « process video files », alors que la liste des formats acceptés par l'UI contient déjà MP4/MOV/MKV/WEBM.

#### 4.6.2 Text to Speech (deux versions) 🆕

| Élément | mars 2026 (Voxtral) | oct. 2026 (Voxtral TTS 3) |
|---|---|---|
| Statut | « Text to speech [Beta] » | sans badge |
| Saisie | « Type or paste the text… » ; « Generate text » ; « Try an example » (6 cartes) | balises `[emotion=…]` / `[pace=…]` avec **autocomplétion à `[`** ; « Generate text » ; **« Import a file »** ; « Or start with an idea » |
| Limite | **4 000 caractères** (compteur) | 4 000 caractères |
| Modèle | « Voxtral » | « **Voxtral Mini TTS 3.0** » |
| Voix | Actors (par acteur × émotion : Paul, Oliver…) / My voices | Actors (Charlotte, James, Hugo, Alexa, Howard, Tom…) / My voices ; filtres Gender, Language |
| Réglages | Word synchronization | Word synchronization, **Pronunciations [New]** (mot + IPA, sensible à la casse), **Conversation context [New]** (tours utilisateur enregistrés ou téléversés), **Expressiveness** (2 par défaut dans la démo, curseur Robust ↔ Creative, valeurs 3.2 et 4.5 testées) |
| Lecteur | durée, ▶, téléchargement, vitesse 1.00x, **surlignage mot à mot** | idem + **« Add to conversation context »** |
| Actions | « <> Code », « Start over » | « <> Code », « Reset » |

- Confirme les paramètres API de [19](19-audio-2-tts-agents-vocaux.md) (`expressiveness`, `conversation_history`, phonèmes IPA, 34 émotions, 5 rythmes).
- ⚠️ [19 §3.3](19-audio-2-tts-agents-vocaux.md) note qu'`expressiveness` renvoyait une 422 le 9 octobre et qu'il est désactivé dans les agents vocaux ; le playground du 21 octobre l'expose (curseur actif).
- ⚠️ La narration de [y7Dtkjz3MZM 00:21] dit « 25 languages and 50 dialects » (transcription automatique) ; la description de la vidéo dit « 35+ languages and 50+ dialects ».

#### 4.6.3 Clonage de voix (deux versions) 🆕

| Élément | mars 2026 (modale « Clone your voice ») | oct. 2026 (page « Voice Cloning ») |
|---|---|---|
| Accès | TTS › Select a voice › My voices › « + Add a new voice » | menu Audio › **Voice cloning** ; onglets **Instant / Professional** |
| Entrée | fichier ≤ **10 MB** ou enregistrement ≤ **0:30** (script de référence fourni) | Instant : « Record audio » (+ téléversement), conseil **5–30 s** ; Professional : « Add recordings », MP3/WAV/M4A/FLAC/OGG, **≥ 30 min recommandées**, **≤ 1 GB par fichier**, jauge « 42:44 of 30:00 recommended » |
| Champs | nom ; consentement | Voice name, **Language** (13), **Gender** (Neutral/Female/Male), **Description (optional)**, **Avatar** (« Default avatar — Neutral expression ») ; consentement |
| Fin | toast « Voice created successfully » | statut **● Ready** ; menu **Use / Edit / Delete** |

- ⚠️ Durée conseillée de l'échantillon instantané : **3–30 s** en mars (diapo « 3s minimum, 30s maximum »), **5–30 s** en octobre.
- Confirme le clonage professionnel (`pvc`, 30 min à 3 h) de [19](19-audio-2-tts-agents-vocaux.md).

### 4.7 Document AI

- Aucun écran du playground OCR n'est ouvert dans les vidéos analysées. Éléments relevés : survol du menu Document AI → `console.mistral.ai/build/document-ai/ocr-playground` (juillet 2026, confirme [01](01-offre-produit-positionnement-tarifs.md)) ; diapo « **OCR Playground** » avec QR code (sept. 2026) ; annonce orale des **bounding boxes ajoutées « il y a un mois »** dans le playground ([CGq9KRSb9Kc 69:55]) ; diapo « OCR 4.1 » (170 langues en 10 groupes, conteneur unique self-hosted) ; carte « OCR » dans « Capture » de l'accueil.
- Côté Admin : **5 000 pages/min** de limite OCR pour l'organisation montrée et la limite de taille des documents (§4.4.7).
- Docs (juillet 2026) : fiche modèle « **OCR 4** [PREMIER] v4.0 — Our latest OCR service with paragraph-level bounding boxes and structural block labels » 🆕.

### 4.8 Workflows et Skills (vus dans le webinaire du 09/07/2026)

Hors cœur de mission (chapitres [12](12-workflows-1-concepts-construction.md)–[13](13-workflows-2-interaction-production.md)) ; seuls les éléments d'écran absents de la base sont listés.

- 🆕 Sous-menu Workflows : **List [Preview]**, **Executions [Preview]**, **Deployments [WIP]**, **Schedules**.
- 🆕 Liste : colonnes Name / Status / **Health score** (0 %, 88 %, 100 %) / Re[cent runs]… ; boutons « Explore Cookbooks », « Get Started ».
- 🆕 Modale « **Build your first workflow** » : arguments (*Recover automatically from failures ; Mix AI steps with deterministic logic ; Run workflows in Vibe Work*) et 3 étapes (API key « Generate » ; `uvx mistralai-workflows-cli@latest setup` ; « Use workflow skill » `vibe`).
- 🆕 Page d'un workflow : Active ☆, **Share**, **Publish to Vibe**, **Graph [WIP]**, **Start Workflow** ; métriques **Errors rate** (« 2 out of 6 — 33.33% ») et **Average latency** ; table des exécutions (Running / Canceled / Failed) ; modale Start Workflow (Deployment ▾, « Workflow Input — Execute the workflow with custom parameters. », éditeur JSON) ; vue d'exécution avec **timeline** (onglets Timeline / Logs), *Workflow Output*, *Inspector / Metadata*.
- 🆕 Deployments : colonnes Deployment / Commit / Status / **Hosting (Local)** / Created by (« MacBook-Air-…-cool-falcon »).
- Skills : page « Skills / hello-world **v1 • Latest • main** », « **Published ▾** », « Share », arborescence **FILES** (`SKILL.md`) ; exécution dans Vibe Work (« Worked for 14s »).
- Prototype d'octobre 2025 (§3.1) : « Execution History », « Execute Workflow », « Visualization », « Namespace ».

### 4.9 Onglet « Docs & API » (juillet 2026) 🆕 ([img](sources/videos-images/observabilite-admin/tAt386mbgps_t31m33s.jpg))

- Barre : « Docs & API ▾ » ; onglets **Getting Started, Models, Products, Developers, Admin, API** ; « Search docs ⌘K ».
- Accueil : « Mistral AI Documentation — All our documentation in your hands » ; « **Three products, one platform.** » : Vibe / Studio (« The developer console and the Mistral API. Keys, the Playground, evaluations, agents, and SDKs to ship applications. ») / Admin (« The control plane for organization setup, billing, SSO, Workspaces, and access policies. ») ; « Compare our products ».
- « Latest models » : Mistral Medium 3.5 [OPEN] v26.04, Mistral Small 4 [OPEN], Voxtral Mini Transcribe Realtime [OPEN] v26.02, Voxtral TTS [OPEN], OCR 4 [PREMIER] v4.0.
- « Quickstarts — Self-contained walkthroughs grouped by product and role. Most take 15 minutes or less. » ; filtres **All / Vibe Work / Vibe Code / Studio / API / Admin** ; cartes avec durées (Run your first Vibe Work task — 5 min ; Analyze a dataset — 10 min ; Create your first Skill — 10 min ; Activate Studio and generate an API key — « Activate Studio in Free mode… »).
- Arborescence : Getting Started › Quickstarts › Vibe Work / Vibe Code / Studio / **Developer** (Send your first API request, Build an agent with tools, RAG with document search, Build a workflow) / **Admin** (Create your organization, Configure SSO, Manage workspaces) ; Glossary.

---

## 5. Keynote AI Now Summit 2026 : transcription résumée

Source : transcription locale de [`IC0VNOzPZU8`](sources/videos/IC0VNOzPZU8.txt) [21:43–31:25], recoupée avec celle du direct [`-qHRgnKGfvg`](sources/videos/-qHRgnKGfvg.txt) [23:36–33:15] (même discours). Orateur : Timothée Lacroix. La transcription automatique déforme « Le Chat » (« the shop », « Lusha ») et « Vibe Code » (« Viper code »).

| Temps (version montée) | Propos (résumé) | Nouveau ? |
|---|---|---|
| 21:46–22:55 | La mascotte (chat pixel) a été le visage de **Le Chat** puis de **Vibe CLI**. Avec **Medium 3.5**, Mistral a mieux compris la puissance des modèles agentiques (manipuler le système de fichiers, beaucoup d'informations, chercher « ce qui n'est pas là »). En utilisant Vibe CLI davantage, connecté à plus d'outils et pour des tâches plus longues, l'équipe a constaté que l'agent n'avait pas à rester lié au CLI ni au code : **Le Chat rejoint la famille Vibe**. | confirme [02](02-historique-annonces-presse.md) (28/05/2026) |
| 22:55–25:06 | Vidéo de lancement (musique, sans parole ; contenu visuel au §3.9). | — |
| 25:06 | « Fixer une échéance à fin mai en France, c'est cruel » (remerciement aux équipes). | — |
| 25:19–25:59 | **Vibe for Work = nouveau mode de l'application web**, avec un **guide** qui configure les connexions et présente les capacités ; **tâches planifiées** (aperçu de la semaine, de la journée, de l'heure suivante ; résumé des e-mails matin et soir). | confirme [22](22-vibe-work-le-chat.md) |
| 25:59–27:00 | Vibe for Work **se connecte à tout ce qui a été construit dans Studio** : les **workflows** (logique métier complexe) et les **connexions gérées**. C'est **le même agent** que pour le code : via le web ou le CLI, mêmes connexions, mêmes outils, même compréhension de l'utilisateur. | 🆕 formulation « même agent / même harness » dès mai 2026 |
| 27:01–27:55 | **Vibe Code** s'étend : **version web** pour suivre « 1, 5, 10 sessions en parallèle » depuis l'ordinateur, le train ou le téléphone ; **nouvelle extension VS Code** parlant au même harness, avec les mêmes connexions et outils. « **Tout cela est construit sur Studio.** » | confirme [21](21-vibe-code.md) |
| 27:59–28:40 | Travailler avec de grandes entreprises (centaines de milliers d'employés) et des gouvernements : la collaboration y signifie **contrôle et gouvernance**. « **Studio est l'endroit qui détient tous les artefacts, toutes les connexions, tout ce qui est propre à votre entreprise** », auquel Vibe for Work et Vibe for Code accèdent. | 🆕 |
| 28:41–29:15 | Studio permet de **gouverner quelles connexions sont disponibles**, **lesquelles certaines équipes peuvent utiliser et lesquelles non**. Studio **peut être déployé on-prem ou là où vivent les données** ; on peut **séparer la partie inférence de la partie données** ; avec **Mistral Compute**, l'inférence peut tourner sur le matériel de Mistral. | 🆕 (séparation inférence/données dite explicitement) |
| 29:16–30:04 | Une fois connexions et workflows en place, les modèles « comprennent de plus en plus votre entreprise », mais un modèle généraliste peut ne pas comprendre un **langage ésotérique** ou des **images infrarouges de pièces mécaniques**. La transcription du direct [31:30–31:44] restitue en plus : un **DSL propre à l'entreprise** « qui n'a jamais vu la lumière du jour » et une **base de code de 20 ans** jamais publiée sur le web. | — |
| 30:06–31:15 | **Forge** : déployé chez le client, là où vivent les données, pour le « dernier kilomètre » d'adaptation (nouvelles modalités, meilleure compréhension des données). Cas d'optimisation : une tâche automatisée via Vibe tourne de plus en plus, les coûts montent ou l'infrastructure manque → « **prendre toutes ces traces, lancer un entraînement sur Forge, obtenir un modèle beaucoup plus petit** », moins cher et plus rapide. Objectif : contrôle et personnalisation complets, « c'est ainsi qu'on obtient un vrai ROI ». Passage de parole à Arthur Mensch. | 🆕 boucle **traces → Forge → petit modèle** |

**Diapos du segment** (titres exacts) : « Meet Vibe » ; « Vibe for work — AI agent for long-horizon tasks, fluent in your knowledge and tools » ; « Vibe for code — Ship faster with an agentic stack that meets you where you code » ; « Studio — Build, test, and run AI agents and apps. » ; « Forge — Train, align, and evaluate custom AI models. ».

---

## 6. Nouveautés 🆕 et contradictions ⚠️ (récapitulatif)

### 6.1 Nouveautés majeures (absentes de la base)

| # | Nouveauté | Où |
|---|---|---|
| 1 | **Agentic Safety Rules** (hooks, scanners multimodaux, cases, verdicts Allow / Human validation / Block / Terminate, « On scanner failure », side effects, versions) et **Policies** (surfaces agentiques, activation, test en playground, usage dans le temps, versions avec message) ; modèle `mistral-moderation-ipi-260708` | §4.5 |
| 2 | Écrans **Explorer** (2025), **Dataset details**, **Record details**, **Judges** (liste à 5 colonnes, édition, essai sur 10 événements, « Output explanation ») | §4.3 |
| 3 | Menus **Campaigns**, **Experiments**, **Exp. Playground** (déc. 2025) ; **Monitor › Traces** avec cadenas (oct. 2026) | §4.1, §4.3.5 |
| 4 | **Admin** : menu en 5 groupes (dont **API › Privacy**, **Mistral Code › Usage**), workspace par défaut non archivable, **Preferences** de Vibe (11 réglages), **Limits** (TPM et RPS par modèle, 5 000 pages/min OCR, taille max. 100 Mo réglable, « Disable file downloads »), **Audit Logs** (filtre User, colonnes Actor/Event Metadata, `is_mistral_system`), connecteurs d'organisation (Type, Permissions, « Indexed », fiche Information), **Subscriptions** (Vibe / API Plan / Mistral Code, « Pay-as-you-go for Vibe CLI ») | §4.4 |
| 5 | **Playground STT** : réglages (modèle, langue, diarisation, Off/Segment/Word, context bias), résultat avec forme d'onde et statistiques, formats vidéo, enregistrement 2 min, collage, mode temps réel | §4.6.1 |
| 6 | **Playground TTS** : 4 000 caractères, Word synchronization, autocomplétion des balises, Import a file, Pronunciations (IPA), Conversation context, Expressiveness « Robust ↔ Creative », « Add to conversation context » | §4.6.2 |
| 7 | **Voice cloning** : Instant (10 Mo / 30 s en mars ; 5–30 s en oct.) et Professional (≥ 30 min, 1 Go/fichier, 13 langues, genre, description, avatar, statut Ready, Use/Edit/Delete) | §4.6.3 |
| 8 | Cinq états de navigation de la console (déc. 2025 → oct. 2026), quatre versions de l'accueil, rail d'icônes (mai 2026), « Start » et « Lots » (oct. 2026) | §4.1–4.2 |
| 9 | Judge Model Framework détaillé (diapos 43–52) : Agent ID Card, Use Case Card, Risk Matrix, Rubric Generation, Judge agent, Aggregator, Confidence Level, Anomaly Detection, Recommendation Engine, Change Plan ; arbre de 54 spans d'un agent vocal | §3.3 |
| 10 | Briques de la keynote de septembre : **Triggers / Agents API / Connectors / One-click deployment** ; « Vibe creates a workflow to review and deploy » ; IBAC (intent-based access control) | §3.4 |
| 11 | Keynote AI Now : Studio = dépôt de tous les artefacts et connexions, gouvernance des connexions par équipe, séparation inférence/données, boucle traces → Forge → petit modèle ; « Vibe Code will analyze your request and propose an agent team for your approval » ; menu « + » de Vibe Work avec recherche de workflows (« My Workflows » / « Shared by Mistral AI ») | §3.9, §5 |
| 12 | Page d'accueil « Docs & API » (juillet 2026) : 6 onglets, quickstarts filtrables avec durées, fiche OCR 4 « paragraph-level bounding boxes and structural block labels » | §4.9 |

### 6.2 Contradictions et nuances

| # | Base | Observé | Source |
|---|---|---|---|
| 1 | [00 §4](00-synthese.md) : « Aucune entrée Observabilité » dans le menu | Entrée présente en déc. 2025 et mars 2026 (Improve › Observe / Evaluate), absente en juillet 2026 même en Enterprise, revenue en oct. 2026 (Monitor › Traces 🔒) | §4.1 |
| 2 | [14 §4.1](14-observabilite-evaluations.md) : Trace Explorer = arbre de spans + langage d'expressions | En 2025, l'« Explorer » listait des **chat completions** avec filtres visuels et panneau « Chat details » (pas de spans) | §4.3.1 |
| 3 | [03 §4.1](03-administration-securite-facturation.md) : Administration contient **Groups** | Absent du menu en juillet 2026 | §4.4.1 |
| 4 | [03 §4.2](03-administration-securite-facturation.md) : filtres d'audit Actor / Event / Target | Quatrième filtre **User** | §4.4.3 |
| 5 | Orateur (webinaire) : « tokens par seconde » | Écran : **Tokens per Minute** et **Requests per Second** | §4.4.7 |
| 6 | [16](16-document-ai-ocr.md) : 50 Mo par document (OCR API) | Admin : « Current effective limit: **100 MB** » pour les documents téléversés (réglable) | §4.4.7 |
| 7 | [19 §3.3](19-audio-2-tts-agents-vocaux.md) : `expressiveness` rejeté en 422 (9 oct.), désactivé côté agents | Curseur Expressiveness actif dans le playground TTS (21 oct.) | §4.6.2 |
| 8 | Clonage instantané : 3–30 s ([31 C9](31-autres-videos.md)) | 5–30 s dans la page d'octobre | §4.6.3 |
| 9 | Description de la vidéo TTS 3 : 35+ langues, 50+ dialectes | Narration : « 25 languages and 50 dialects » (transcription automatique, possible erreur) | §3.7 |
| 10 | Pied du STT de juillet : « process video files » via l'API | Les formats vidéo sont déjà acceptés dans l'UI | §4.6.1 |
| 11 | [31 §3.2](31-autres-videos.md) : « vue de trace » montrée à 13:21 | L'écran est un **enregistrement de dataset** (« Record details »), pas une trace | §3.1 |
| 12 | Organisation « Enterprise » dans le sélecteur de Vibe | Onglet Vibe des abonnements : bandeau « Team » | §4.4.5 |

### 6.3 Recoupements avec les chapitres rédigés en parallèle

- [36](36-captures-doc-annonces.md) montre la page **Judges** d'octobre 2025 tirée de l'annonce « AI Studio » (4 colonnes, 13 juges) et un menu « Evalute [sic] › Datasets / Judges / Experiments » ; la démo de décembre 2025 (§4.3.4) montre une colonne de plus (**Output**), 16 juges, et ajoute **Campaigns** et **Exp. Playground** au menu.
- [33](33-videos-console-agents-connecteurs-skills.md) décrit la **fiche connecteur** côté Studio (Visibility, Authentication, Origin, Capabilities, Connector name/ID) ; la fiche Gmail côté Admin (§4.4.4) a la même structure.

---

## 7. Questions ouvertes

1. **Agentic Safety** : disponibilité (Enterprise ? Preview ?), emplacement dans le menu (Studio ou Admin), API (aucun endpoint dans la spec locale), signification de « ipi » et statut du modèle `mistral-moderation-ipi-260708` (absent du catalogue de [20](20-modeles-ressources-changelogs.md)). Liste complète des hooks (seul « Post tool call » est montré), des types de scanners (Moderation, LLM judge… autres ?) et des « side effects ».
2. Que sont devenus **Campaigns**, **Experiments**, **Exp. Playground** et **Dashboards** ? Le menu d'octobre 2026 ne montre que « Monitor › Traces ».
3. Le **cadenas** de « Monitor › Traces » (oct. 2026) signale-t-il un accès réservé à l'Enterprise, une Private Preview, ou un rôle manquant ?
4. **Groups** : absent du menu Admin de juillet 2026 alors que la doc d'octobre le décrit (inférence : ajouté avec la gestion des utilisateurs GA du 10/09/2026).
5. La limite « Maximum file size » de 100 Mo s'applique-t-elle aux Libraries, aux fichiers de Vibe ou à tous les uploads ? Quelle est la borne haute du curseur ?
6. Valeurs du menu « **Work tab** » (« Wait u… ») : sans doute une date de bascule ou une option « attendre » (inférence liée à la migration Chat → Work).
7. Valeur par défaut d'**Expressiveness** : la démo charge 2, la doc dit « fixé par le service ».
8. Les badges du résultat STT (5.94s, 179.00s, 895) : temps de traitement, durée audio et nombre de mots ou de tokens (inférence non vérifiée).

---

## Annexe A — Couverture

| Vidéo | Segment analysé | Résolution | Images brutes (1 / 2 s) | Distinctes (seuil) | Examinées | Transcription |
|---|---|---|---|---|---|---|
| `Axlesb8yTro` | 08:17–15:41 (chapitres « AI Studio platform features » → « Advanced evaluation features ») | 1080p | 222 | 70 (1,0) | toutes + 21 brutes de 14:59–15:39 | existante ([`sources/videos/Axlesb8yTro.txt`](sources/videos/Axlesb8yTro.txt)) |
| `tAt386mbgps` | 19:31–32:36 (« Deep dive into Mistral Studio » + « Product demo ») | 1080p | 393 | 104 (1,0) | toutes | existante |
| `bUDwFxbf_M8` | repérage 0:00–66:00 en 144p (1 / 20 s, 198 img) ; 21:00–34:50 (diapos Mistral) | 144p puis 1080p | 415 | 223 (10) | toutes | existante |
| `CGq9KRSb9Kc` | 46:30–71:30 (partie Mistral) + 61:16–62:42 à 1 img/s | 1080p | 750 + 86 | 311 (12) + 66 (1,5, zone d'écran) | toutes | existante |
| `93ZAhW3bk8g` | intégrale (0:56) + 4–10 s à 2 img/s | 1080p | 28 + 12 | 25 (0,4) | toutes | existante (échantillon audio) |
| `DffzOI3g8Yk` | intégrale (2:36) | 1080p | 78 | 75 (0,4) | toutes | existante |
| `y7Dtkjz3MZM` | intégrale (2:03) | 1080p | 61 | 56 (0,4) | toutes | existante |
| `1czHOKcAtfY` | intégrale (1:42) | 1080p | 51 | 44 (0,4) | toutes | existante |
| `IC0VNOzPZU8` | 21:43–31:25 (« Vibe and Studio platform ») ; 22:54–25:08 au seuil fin | 1080p | 291 + 67 | 106 (12) + 66 (2) | toutes | **🆕 locale** ([`sources/videos/IC0VNOzPZU8.txt`](sources/videos/IC0VNOzPZU8.txt)) |
| `-qHRgnKGfvg` | repérage 20:00–35:00 en 240p (1 / 15 s) ; 23:15–33:30 | 240p puis 1080p | 60 + 308 | 117 (12) | toutes | **🆕 locale** ([`sources/videos/-qHRgnKGfvg.txt`](sources/videos/-qHRgnKGfvg.txt)), 23:30–33:30 |

- Total : ≈ 2 800 images extraites, ≈ 1 340 images distinctes examinées (planches contact puis plein écran ou recadrages agrandis pour tout écran d'interface).
- Non couvert : la partie Fin de `bUDwFxbf_M8` en haute définition (diapos génériques sans interface Mistral) ; les chapitres hors Studio des keynotes (modèles, industrie, partenariats).
- Incidents : les téléchargements par segments échouaient (ffmpeg statique incapable de résoudre le DNS de googlevideo) → vidéos téléchargées en entier ; PyAV 19 rejetait l'option `metadata_errors` de faster-whisper → audio converti en WAV 16 kHz et passé en tableau NumPy. Un avertissement yt-dlp (« n challenge solving failed ») n'a pas empêché les téléchargements.

## Annexe B — Images copiées

40 images dans [`sources/videos-images/observabilite-admin/`](sources/videos-images/observabilite-admin/) (nom `<id>_tMMmSSs.jpg` ; les images `CGq9KRSb9Kc_t61m58s`, `t62m01s`, `t62m10s`, `t62m31s` sont des recadrages agrandis de l'écran projeté).

| Image | Contenu |
|---|---|
| [Axlesb8yTro_t10m15s](sources/videos-images/observabilite-admin/Axlesb8yTro_t10m15s.jpg) | Diapo AI Observability + capture de l'Explorer |
| [Axlesb8yTro_t10m17s](sources/videos-images/observabilite-admin/Axlesb8yTro_t10m17s.jpg) | Diapo Agent Runtime + prototype d'UI Workflows (oct. 2025) |
| [Axlesb8yTro_t11m03s](sources/videos-images/observabilite-admin/Axlesb8yTro_t11m03s.jpg) | Diapo AI Registry + liste des Judges |
| [Axlesb8yTro_t11m33s](sources/videos-images/observabilite-admin/Axlesb8yTro_t11m33s.jpg) | Accueil AI Studio déc. 2025 (Create / Observe / Improve) |
| [Axlesb8yTro_t12m47s](sources/videos-images/observabilite-admin/Axlesb8yTro_t12m47s.jpg) | Playground : sélecteur de modèles avec modèles fine-tunés |
| [Axlesb8yTro_t13m29s](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m29s.jpg) | Dataset details + menu Improve déplié |
| [Axlesb8yTro_t13m51s](sources/videos-images/observabilite-admin/Axlesb8yTro_t13m51s.jpg) | Record details |
| [Axlesb8yTro_t15m01s](sources/videos-images/observabilite-admin/Axlesb8yTro_t15m01s.jpg) | Edit judge (régression) et essai sur dataset |
| [Axlesb8yTro_t15m29s](sources/videos-images/observabilite-admin/Axlesb8yTro_t15m29s.jpg) | Popover « Output explanation » |
| [tAt386mbgps_t19m31s](sources/videos-images/observabilite-admin/tAt386mbgps_t19m31s.jpg) | Diapo « Studio is for operationalizing AI » |
| [tAt386mbgps_t23m15s](sources/videos-images/observabilite-admin/tAt386mbgps_t23m15s.jpg) | Admin : menu complet + Workspaces |
| [tAt386mbgps_t24m07s](sources/videos-images/observabilite-admin/tAt386mbgps_t24m07s.jpg) | Accueil Studio juil. 2026 + menu Build / Context |
| [tAt386mbgps_t24m19s](sources/videos-images/observabilite-admin/tAt386mbgps_t24m19s.jpg) | Audit Logs |
| [tAt386mbgps_t24m31s](sources/videos-images/observabilite-admin/tAt386mbgps_t24m31s.jpg) | Connecteurs d'organisation |
| [tAt386mbgps_t24m41s](sources/videos-images/observabilite-admin/tAt386mbgps_t24m41s.jpg) | Fiche connecteur Gmail |
| [tAt386mbgps_t24m59s](sources/videos-images/observabilite-admin/tAt386mbgps_t24m59s.jpg) | Subscriptions |
| [tAt386mbgps_t25m05s](sources/videos-images/observabilite-admin/tAt386mbgps_t25m05s.jpg) | Vibe › Preferences |
| [tAt386mbgps_t25m59s](sources/videos-images/observabilite-admin/tAt386mbgps_t25m59s.jpg) | Limits : par modèle |
| [tAt386mbgps_t26m09s](sources/videos-images/observabilite-admin/tAt386mbgps_t26m09s.jpg) | Limits : OCR, taille de fichier, téléchargements |
| [tAt386mbgps_t27m07s](sources/videos-images/observabilite-admin/tAt386mbgps_t27m07s.jpg) | Speech to Text (Offline / Realtime) |
| [tAt386mbgps_t31m33s](sources/videos-images/observabilite-admin/tAt386mbgps_t31m33s.jpg) | Docs & API + sélecteur de produit |
| [93ZAhW3bk8g_t00m04s](sources/videos-images/observabilite-admin/93ZAhW3bk8g_t00m04s.jpg) | STT févr. 2026 : panneau de réglages |
| [93ZAhW3bk8g_t00m30s](sources/videos-images/observabilite-admin/93ZAhW3bk8g_t00m30s.jpg) | STT : résultat, forme d'onde, statistiques |
| [DffzOI3g8Yk_t00m02s](sources/videos-images/observabilite-admin/DffzOI3g8Yk_t00m02s.jpg) | Accueil mars 2026 (Observe [Beta], Explorer [Beta]) + menu |
| [DffzOI3g8Yk_t00m18s](sources/videos-images/observabilite-admin/DffzOI3g8Yk_t00m18s.jpg) | Modale « Clone your voice » |
| [y7Dtkjz3MZM_t00m16s](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m16s.jpg) | Menu oct. 2026 + Speech to Text |
| [y7Dtkjz3MZM_t00m22s](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m22s.jpg) | Text to Speech (Voxtral Mini TTS 3.0) |
| [y7Dtkjz3MZM_t00m40s](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t00m40s.jpg) | Autocomplétion des balises d'émotion |
| [y7Dtkjz3MZM_t01m38s](sources/videos-images/observabilite-admin/y7Dtkjz3MZM_t01m38s.jpg) | Panneau Conversation context |
| [1czHOKcAtfY_t00m36s](sources/videos-images/observabilite-admin/1czHOKcAtfY_t00m36s.jpg) | Professional Voice : formulaire |
| [1czHOKcAtfY_t01m00s](sources/videos-images/observabilite-admin/1czHOKcAtfY_t01m00s.jpg) | Voix « Ready » et menu Use / Edit / Delete |
| [CGq9KRSb9Kc_t52m08s](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t52m08s.jpg) | « The Mistral Suite » (Studio ⊃ Forge) |
| [CGq9KRSb9Kc_t61m58s](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t61m58s.jpg) | Configure scanner |
| [CGq9KRSb9Kc_t62m01s](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m01s.jpg) | Prompt Injection Rule |
| [CGq9KRSb9Kc_t62m10s](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m10s.jpg) | Configure case (verdicts) |
| [CGq9KRSb9Kc_t62m31s](sources/videos-images/observabilite-admin/CGq9KRSb9Kc_t62m31s.jpg) | Prompt Injection Policy |
| [IC0VNOzPZU8_t24m12s](sources/videos-images/observabilite-admin/IC0VNOzPZU8_t24m12s.jpg) | Vibe : menu « + » et recherche de workflows |
| [IC0VNOzPZU8_t27m55s](sources/videos-images/observabilite-admin/IC0VNOzPZU8_t27m55s.jpg) | Console Studio mai 2026 (rail d'icônes) |
| [bUDwFxbf_M8_t23m52s](sources/videos-images/observabilite-admin/bUDwFxbf_M8_t23m52s.jpg) | Arbre de 54 spans (agent vocal) |
| [bUDwFxbf_M8_t26m26s](sources/videos-images/observabilite-admin/bUDwFxbf_M8_t26m26s.jpg) | Review, Monitor, and Protect |
