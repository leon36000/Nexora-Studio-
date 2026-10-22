# 34 — Vidéos Workflows examinées image par image

> **État au 21/10/2026.** Six vidéos qui montrent **Mistral Workflows** ont été analysées image par image : une image toutes les 2 s, dédoublonnage, examen de toutes les images distinctes, puis passes à 1–4 images/s sur les écrans denses. Pour les longues vidéos, seuls les segments où l'écran ou le code est montré ont été traités. Objectif : inventorier les écrans, panneaux, champs, statuts, graphiques et commandes absents de la base, et relever le code et la CLI mot pour mot quand c'est lisible.
> Faits uniquement ; toute déduction est marquée « (inférence) » ; chaque information porte l'horodatage `[mm:ss]` de la vidéo et, le cas échéant, un lien vers l'image copiée dans `sources/videos-images/workflows/`. Marqueurs : **🆕** = absent de la base ([12](12-workflows-1-concepts-construction.md), [13](13-workflows-2-interaction-production.md), [31](31-autres-videos.md), [33](33-videos-console-agents-connecteurs-skills.md), [35](35-videos-observabilite-admin-audio-keynotes.md), [36](36-captures-doc-annonces.md)) ; **⚠️** = contredit ou nuance la base ; sans marqueur = confirme la base. Aucun prix n'est relevé.

## Sommaire
1. [En bref](#1-en-bref)
2. [Méthode](#2-méthode)
3. [Fiches par vidéo et chronologies](#3-fiches-par-vidéo-et-chronologies)
4. [Inventaire consolidé de l'interface Workflows](#4-inventaire-consolidé-de-linterface-workflows)
5. [Code et CLI relevés](#5-code-et-cli-relevés)
6. [Récapitulatif des nouveautés et contradictions](#6-récapitulatif-des-nouveautés-et-contradictions)
7. [Questions ouvertes](#7-questions-ouvertes)
- [Annexe A — Couverture](#annexe-a--couverture)
- [Annexe B — Images copiées](#annexe-b--images-copiées)

---

## 1. En bref

1. **On connaît maintenant l'interface réelle de Workflows à quatre dates** : 21/04/2026 (compte Mistral, Jen Person), 30/04/2026 (compte externe, Kokori Kodo), 31/05/2026 (compte gratuit, xavki) et 08/07/2026 (compte Mistral, démo Vultr). Elle comprend une **liste**, une **page de workflow**, une **modale « Start Workflow »**, une **liste des exécutions** et une **vue d'exécution en surimpression** (Gantt, Steps, Inspector/Metadata). 🆕
2. **La page d'un workflow porte des indicateurs** jusqu'ici absents de la base 🆕 :
   - `Deployments` (pastille du déploiement, avec carte au survol : `Local`, `Active`, `Created`, `Last seen`, `Uptime`) ;
   - `Workflow ID` copiable ;
   - **`Errors rate`** (« 1 out of 74 1.35% ») ;
   - **`Average latency`** ;
   - en juillet, `Connectors` et un mini-histogramme **`Recent runs`**.

   Actions : `Publish to Le Chat` (avril), renommé `Publish to Vibe` (mai), `Archive Workflow` (toujours grisé), `Start Workflow`, puis en juillet `Share` et **`Graph`** (badge). 🆕
3. **La publication dans Vibe est entièrement visible** 🆕 :
   - si le workflow est incompatible, une infobulle s'affiche : « Publishing unavailable — This workflow definition isn't compatible with Vibe — Read docs » ;
   - sinon, une modale « Publish to Vibe? » prévient que le workflow « will be available to **all workspace users** in Vibe conversations » ;
   - le bouton devient ensuite `Published ▾` et un toast confirme « Publication status updated » ;
   - côté Vibe : menu `+ › Workflows ›`, puce dans la saisie, « Workflow started: … », **formulaire d'entrée prérempli** (`Submit ⌘↵`), panneau `Ongoing / Completed` alimenté par la `TodoList`, canvas final et « Workflow completed: … ».
4. **La vue d'exécution diffère selon le compte** 🆕/⚠️ :
   - comptes Mistral : onglets `Trace | Task` (avril), puis `Trace | Logs` (juillet) ;
   - comptes externes (avril-mai) : simple titre `Steps` ;
   - partout : `Run again`, `✕ Cancel` (pendant l'exécution), badge `● Live`, navigation ↑ ↓, sélecteur de run `…xxxx (latest) ▾`, mini-carte de zoom, `Inspector [I]` / `Metadata [M]`.

   Le bouton **`Reset from here`** de la page produit ([36](36-captures-doc-annonces.md)) **n'apparaît dans aucun écran réel** observé. ⚠️

   Les **entrées d'une activité** s'affichent sous forme de **tableau positionnel** (`["https://…", "invoice_fr_total_5.pdf", "medical_bill"]`). 🆕

   Une étape de connecteur (`Auth: Linear`, nœud `linear`) renvoie `{task_id, connector_name, connector_id, auth_url}`. 🆕
5. **Le code montré précise le SDK v3** 🆕 :
   - **scaffold CLI complet** : `.agents/skills/workflows/` avec `SKILL.md`, 11 guides `.mdx` dont `migration-v2-to-v3.mdx`, `pipeline_pattern.md`, `scripts/test_workflow.py` ; `src/discover.py`, `src/dev_worker.py`, `src/workflows/{hello,start}.py`, `src/examples/` ; `Makefile` ; `pyproject.toml` (`mistralai-workflows[mistralai]>=3.0.0,<4`) ;
   - helpers du plugin : `wm.ChatCompletionRequest`, `wm.SystemMessage`, `wm.UserMessage`, `wm.chat_parse_to_model`, `wm.mistralai_chat_complete` ;
   - `async with item:` sur un `TodoListItem` ;
   - `wait_condition(..., timeout_summary=...)` ;
   - client : `execute_workflow_async(..., deployment_name=..., wait_for_result=False)` ;
   - lecture de l'historique brut Temporal (`EVENT_TYPE_ACTIVITY_TASK_SCHEDULED/STARTED/COMPLETED/FAILED`, `scheduledEventId`).
6. **Les journaux du worker exposent sa configuration effective** 🆕 :
   - défauts `retry_policy_max_attempts 3` et `retry_policy_backoff_coefficient 2.0` (répond en partie à la question ouverte n° 17 de [12](12-workflows-1-concepts-construction.md)) ;
   - `max_workflow_task_pollers 5`, `max_activity_task_pollers 5` ;
   - scheduler `wf-scheduler.mistral.ai:443` (TLS) ;
   - `namespace=<uuid>:<uuid>` ;
   - **`task_queue` = nom du déploiement** ;
   - bloc `graph` (`upload_graph`, `graph_summarise_enabled`, **`graph_summarise_model 'mistral-small-latest'`**) ;
   - **liste des ~40 activités internes** enregistrées par le plugin (`mistralai_chat_complete`, `mistralai_ocr`, `execute_mcp_tool`, `__internal__connector_*`, `__emit_waiting_for_input_*`…).
7. **Contradictions** ⚠️ :
   - la modale « Start Workflow » est un **éditeur JSON prérempli** (`{ "name": "World" }`), pas un formulaire généré ;
   - la page d'un workflow est adressée par son **UUID** (`/build/workflows/019d…`), pas par son nom ;
   - avec le scaffold d'avril, le déploiement prend par défaut le **nom d'hôte** (`MacBook-Pro-JenPerson`, `francois-mbp.home`), alors que la doc dit `DEPLOYMENT_NAME` **obligatoire** ;
   - l'export OTel apparaît `otel_enabled: False` dans les journaux d'avril-mai, puis `True` en juillet ;
   - les maquettes officielles (`9tXQBnpvVsU`) affichent des valeurs fictives (`SDK python 1.4.0`, `REGION eu-west-1`) sans rapport avec la console réelle.

## 2. Méthode

- **Téléchargement** : `yt-dlp`, vidéo seule ≤ 1080p en H.264. Les trois longues vidéos ont été téléchargées en entier, parce que `--download-sections` échouait (ffmpeg ne résolvait pas le nom d'hôte googlevideo) ; seuls les segments utiles ont ensuite été extraits.
- **Extraction et tri** :
  - extraction `fps=1/2` ;
  - dédoublonnage par différence moyenne d'images en niveaux de gris (seuil 2,0 pour la vidéo de marque, 1,0 ailleurs, 0,15 à 0,5 pour les passes fines) ;
  - planches contact (3×3 à 5×5) pour examiner toutes les images distinctes ;
  - zooms recadrés sur chaque écran informatif.
- **Relevé du code** : ligne à ligne sur les zooms. Les parties masquées ou hors champ sont signalées par `…` ou `[…]`.
- **Limites** :
  - **Vultr (`c5XrvauOjMc`)** : captation caméra d'un écran filmé de biais, surexposé. Seuls les titres, les blocs JSON sombres et le terminal sont lisibles.
  - **Vidéos `9tXQBnpvVsU` et `YQB6bsob6zE`** : elles montrent des **maquettes animées**, pas la console.
  - **Données personnelles** : les images contenant des données (e-mails, tableau de clés de l'admin) n'ont pas été copiées.

---

## 3. Fiches par vidéo et chronologies

### 3.1 — « Introducing Workflows » (`9tXQBnpvVsU`, Mistral, 28/04/2026, 4:02)

| Champ | Valeur |
|---|---|
| Nature de l'écran | Vidéo de marque : interviews (Samir Brizini, Product Manager ; Jen Person, DevRel) et **motion design**. **Aucune capture de la console réelle** (inférence : style graphique, données fictives, champs absents du produit). |
| Apport | Maquette d'une page de run « AI STUDIO », états d'activité, carte d'approbation « LE CHAT », 4 piliers « Built for production » |

Chronologie :
- [00:08] incrustation « Workflows » ; [00:12] « Samir Brizini — Product Manager » ; [00:36] « How do we run this in production? ».
- [01:14–01:44] animation « A MARITIME SHIPPING CO. » → « PORT OF CALL · DOCUMENT INTAKE » → « WORKFLOW EXECUTION » : graphe de nœuds, dont un nœud rouge « ANOMALY FLAGGED ». [01:52] « Jen Person — Developer Relations ».
- [02:08–02:14] [graphe](sources/videos-images/workflows/9tXQBnpvVsU_t02m14s.jpg) :
  - sources « EMAIL THREAD », « CHAT THREAD », « DOC ATTACHMENT » → nœud **« AGENT »** ;
  - chaîne « CARGO DOCUMENT » → « CUSTOMS VALIDATION » → « ANOMALY DETECTION » → « SHIPMENT CROSS-REF ».
- [02:25–02:53] **maquette « AI STUDIO »** 🆕 (stylisée) :
  - **fil d'Ariane** : `Workflows / cargo-release-automation / Runs / run_a3f7b2c1`, badge d'état en haut à droite ;
  - **carte « RUN INFO »** : RUN ID, STATUS, STARTED `2026-04-28 14:23:07 UTC`, ELAPSED `00:01.91`, TRIGGER `API`, ACTIVITIES `1/5` ;
  - **carte « WORKFLOW »** : NAME, VERSION `v1.0.4`, ENV `production`, REGION `eu-west-1`, SDK `python 1.4.0` ⚠️ (valeurs fictives : SDK réel en 3.x, région managée réelle `nl-north-1` selon [13](13-workflows-2-interaction-production.md)) ;
  - **« EXECUTION TIMELINE » verticale** : `#01 document_intake COMPLETE 0.3s` « Parse and validate incoming cargo document » ; `#02 customs_validation` « Cross-reference against EU customs regulations » ; `#03 anomaly_detection` « Scan for anomalies against historical shipment data » ; `#04 human_approval` « Request compliance officer sign-off on flagged cargo » ; `#05 cargo_release` « Issue release authorization and update logistics system ».
  - [02:36] [`anomaly_detection` **RETRYING**](sources/videos-images/workflows/9tXQBnpvVsU_t02m36s.jpg) avec badge **« RETRY 1/3 »** et « reconnecting to anomaly service... ».
  - Puis `human_approval` **« WAITING FOR INPUT »** et ligne « ‖ Awaiting compliance officer · notification sent via Le Chat ».
  - [02:49] [carte superposée « LE CHAT / APPROVAL REQUIRED »](sources/videos-images/workflows/9tXQBnpvVsU_t02m49s.jpg) :
    - titre « cargo-release-automation · Step 4 of 5 » ;
    - CARGO REFERENCE `HAV-2026-04-28-0847` ; ROUTE « Port-Vendres → Barcelona (ES) » ; FLAG « Anomaly resolved after retry (1/3) » ;
    - boutons **`APPROVE`** / **`REQUEST INFO`**.
  - [02:53] [« ✓APPROVED »](sources/videos-images/workflows/9tXQBnpvVsU_t02m53s.jpg), STATUS `COMPLETE`, ACTIVITIES `5/5`.
  - États montrés : `COMPLETE`, `RUNNING`, `PENDING`, `RETRYING`, `WAITING FOR INPUT` (inférence : vocabulaire de maquette, différent des statuts réels `RUNNING`/`COMPLETED`/`RETRYING_AFTER_ERROR`… de [12](12-workflows-1-concepts-construction.md)).
- [03:30] [« Built for production »](sources/videos-images/workflows/9tXQBnpvVsU_t03m30s.jpg) 🆕 (texte exact) :
  1. « Real-time streaming — Token-level output · Low latency delivery » ;
  2. « I/O encryption — Secure transit · Large document handling » ;
  3. « Multi-tenant isolation — Namespace-level separation · Zero bleed » ;
  4. « Python SDK — Retries · Distributed tracing · Timeouts ».
- [03:50] « → mistral.ai/news → docs.mistral.ai/workflows ».

### 3.2 — « Build your first Mistral Workflow » (`7TnJJ0D__kk`, Mistral, 28/04/2026, 5:42)

| Champ | Valeur |
|---|---|
| Nature de l'écran | Présentatrice (Jen Person) + **terminal macOS, VS Code et console réelle** (organisation `my-first-workflow`, exécution datée du 21/04/2026) |
| Apport | Sortie exacte de `mistralai-workflows-cli setup`, `hello.py` et `discover.py` complets, configuration du worker, menu d'avril 2026, liste, page de workflow, modale Start Workflow, vue d'exécution |

Chronologie :
- [00:18–00:24] [diapo](sources/videos-images/workflows/7TnJJ0D__kk_t00m22s.jpg) 🆕 :
  - problèmes ✗ : « GenAI engineering complexity », « Execution failures », « Deployment drift at scale », « Observability blind spots » ;
  - réponses ✓ :
    - « Built for agentic applications: Multi-step agents, tool-calling loops, and long-running interactions » ;
    - « Effortless scaling: Standardized & flexible deployment pattern, autoscaling » ;
    - « Reliable execution: State persistence for fault tolerance & automatic retry » ;
    - « Observable by design: Integration in AI Studio, full monitoring stack ».
- [01:02] diapo « You will need : 01 A Mistral AI account / 02 Python 3.12 / 03 uvx ».
- [01:17–01:28] terminal `uvx mistralai-workflows-cli setup` (sortie §5.1).
  - [01:24] surimpression console 🆕 : **dialogue du workspace** `console.mistral.ai/home?workspace_dialog=apiKeys` (onglets **Settings / API Keys / Usage / Members**).
  - Texte : « As an admin of this organization, you can view and manage all API keys in this organization. » ; bandeau « Looking for organization API keys? Go to the admin console ↗ ».
  - Onglets `Active / Expired`, `Columns 6`, colonnes `Name / Type / Key / Created / Expires / Access scope`, état vide « There are no active API keys », bouton `Create new key`, `Done`.
- [01:29–01:31] [fichiers créés et invite finale](sources/videos-images/workflows/7TnJJ0D__kk_t01m29s.jpg) : « Project created at my-workflow », « Get started: cd my-workflow / vibe » 🆕 (la CLI propose d'ouvrir **Vibe** dans le projet).
- [01:42–02:01] explorateur VS Code `MY-WORKFLOW` : `.agents/skills/workflows/{references, scripts, SKILL.md}`, `.vscode`, `src/{workflows/{__init__.py, hello.py, start.py}, dev_worker.py, discover.py}`, `.env`, `.gitignore`, `Makefile`, `pyproject.toml`, `README.md`.
- [02:24–02:57] [`hello.py`](sources/videos-images/workflows/7TnJJ0D__kk_t02m24s.jpg), avec zoom successif sur `activity`, `define`, `entrypoint` (§5.4).
- [03:13–03:19] [`src/discover.py`](sources/videos-images/workflows/7TnJJ0D__kk_t03m16s.jpg), complet (§5.4).
- [04:05–04:09] [`make start-worker`](sources/videos-images/workflows/7TnJJ0D__kk_t04m09s.jpg) :
  - commande lancée : `uv run python src/dev_worker.py` ;
  - sortie : « Using CPython 3.12.12 », « Installed 60 packages », **« [dev] Worker started (pid 3937). Watching /Users/jennifer.person/my-workflow/src for changes... »**, « Discovered 1 workflow(s): hello-world » ;
  - journaux du worker (§5.9).
- [04:20–04:42] incrustation « Run Workflows » : Mistral AI Studio / Workflows Python SDK / Mistral API / Makefile command.
- [04:52–04:55] `make execute workflow=hello-world input='{"name": "From Mistral"}'` :
  - commande lancée : `uv run python src/workflows/start.py --workflow hello-world --input '{"name": "From Mistral"}'` ;
  - résultat : « Result: {'result': 'Hello, From Mistral! Welcome to Mistral Workflows.'} ».
- [04:58] [accueil console d'avril 2026](sources/videos-images/workflows/7TnJJ0D__kk_t04m58s.jpg) 🆕 :
  - en-tête : `AI Studio ▾`, organisation `my-first-workflow`, `Default Workspace ⇕`, `Search ⌘K` ;
  - titre « Mistral AI Studio — Build, observe, and improve your AI Apps » ;
  - cartes **Create** (Playground, Agents) et **Audio** (Speech to text, Text to speech, Voice Agents) ;
  - bandeau « Welcome Jen! ».
- [05:03] [liste](sources/videos-images/workflows/7TnJJ0D__kk_t05m03s.jpg) avec **menu latéral** : Workflows › **List / Executions / Deployments** (§4.1).
- [05:06] [page de workflow « Hello World »](sources/videos-images/workflows/7TnJJ0D__kk_t05m06s.jpg) (§4.3) ;
- [05:07] [modale « Start Workflow »](sources/videos-images/workflows/7TnJJ0D__kk_t05m07s.jpg) (§4.4) ;
- [05:10–05:19] vue d'exécution [en cours](sources/videos-images/workflows/7TnJJ0D__kk_t05m10s.jpg) puis [terminée](sources/videos-images/workflows/7TnJJ0D__kk_t05m11s.jpg), avec le toast « ✓ Workflow started successfully » (§4.6).

### 3.3 — « Workflows: Build. Run. Observe. » (`YQB6bsob6zE`, Mistral, 28/04/2026, 1:23)

| Champ | Valeur |
|---|---|
| Nature de l'écran | Clip manifeste : images d'archive et **trois maquettes stylisées** d'interface (inférence : motion design) |
| Apport | Représentation officielle d'une **attente humaine dans la timeline** et d'une confirmation dans le chat |

- [00:44–00:46] [maquette du Gantt](sources/videos-images/workflows/YQB6bsob6zE_t00m46s.jpg), dans le style de la vraie vue d'exécution :
  - barres « ⚑ OCR Extraction 200 ms », « ⚑ Document Classification 200 ms », **« ✱ Waiting for input »** (icône distincte), « ⚑ Cargo Release 200 ms » ;
  - mini-carte START → 3.5s ; onglets `Inspector I / Metadata M`.
  - 🆕 (inférence : une attente `wait_for_input` est représentée comme une barre à part dans la timeline).
- [00:48] « That wait [⚑ Waiting for input] when they need to. »
- [00:52] maquette de chat :
  - formulaire (Last Name, Email Address, Phone Number) ;
  - bloc « Thinking — Analyzing user information » ;
  - carte « Do you want to proceed with retrieving the data? » avec deux boutons **Decline** / **Continue** suivis de raccourcis clavier (inférence : rendu d'`AcceptDeclineConfirmation`, cf. `Yes, proceed ⌘↵ / Cancel ⌘D` dans [36](36-captures-doc-annonces.md)).
- [01:10–01:16] logo animé « Workflows » et « Build → Run → Observe ».

### 3.4 — « Mistral Workflows : Qu'est-ce que c'est ? Démo » (`sKEKJGqTz0U`, xavki, 31/05/2026, 28:07 ; segment 02:20–26:20)

| Champ | Valeur |
|---|---|
| Nature de l'écran | Firefox + VS Code + terminal ; webcam en incrustation ; **compte gratuit** (« Le Chat Free »), organisation « Xavki », `Default Workspace` |
| Apport | Code complet d'un worker et d'un worker « Vibe » ; client Streamlit qui lit l'historique ; **page de workflow avec métriques** ; carte de déploiement ; page Executions ; **parcours complet de publication dans Vibe** |

Chronologie :
- [02:20–06:40] schéma Excalidraw « LOCAL ENV » / « MISTRAL » : Inference (vLLM), Worker Workflows, Code, Data, Chat ; API Security ; Workflows ; Vibe (Le Chat).
- [06:46–08:12] `uv init`, `uv venv`, VS Code.
  - [10:28] `pyproject.toml` (§5.3).
  - [08:22] `.env` : `MISTRAL_API_KEY`, `DEPLOYMENT_NAME="xavki"`.
  - [08:42–09:10] doc « Deployments | Mistral Docs » (schéma d'isolation alice/bob).
- [09:46] accueil « Mistral Studio » (mai 2026) : cartes Build (Playground, Workflows, Create an API key) / Capture (OCR, Speech to text, Text to speech) ; Quickstart ; Documentation (= [33](33-videos-console-agents-connecteurs-skills.md), juin).
- [09:58–10:06] modale de profil **« My API Keys »** (`?profile_dialog=api-keys`), formulaire « Create API Key » : Key name, Expiration « No expiration date », **Connector access scope « Shared connectors only »**, Workspace grisé (confirme [33](33-videos-console-agents-connecteurs-skills.md)). Image non copiée (données personnelles).
- [11:08–11:40] [`worker.py`](sources/videos-images/workflows/sKEKJGqTz0U_t11m40s.jpg) (§5.5).
  - Renommé en `travel-agent-x` / « Travel Agent X » à [11:55].
- [14:18–14:26] [`uv run worker.py` : journaux du worker](sources/videos-images/workflows/sKEKJGqTz0U_t14m26s.jpg) (§5.9).
- [14:32] liste vide « No results ».
  - [14:36] [liste avec « Travel Agent X »](sources/videos-images/workflows/sKEKJGqTz0U_t14m36s.jpg) (§4.2).
  - [14:38] [page du workflow](sources/videos-images/workflows/sKEKJGqTz0U_t14m38s.jpg) (§4.3).
  - [14:41–14:47] [carte du déploiement au survol](sources/videos-images/workflows/sKEKJGqTz0U_t14m44s.jpg) (§4.8).
- [15:08] [page « Executions »](sources/videos-images/workflows/sKEKJGqTz0U_t15m08s.jpg) (§4.5).
- [15:40–18:18] [`chat.py` (Streamlit)](sources/videos-images/workflows/sKEKJGqTz0U_t15m46s.jpg) (§5.7).
  - [18:22–18:48] `streamlit run chat.py` : page « ✈️ Travel Agent », « Type a destination. Watch the workflow run live on Mistral. ».
- [19:04] Streamlit : « 🪪 execution_id: `611df81be66...` », « Workflow steps » (⬜/⏳/✅ par activité), « elapsed ».
- [19:24] page du workflow : `Errors rate 0 out of 1 0.00%`, `Executions 1`, ligne « ⟳ Running ».
- [19:28–20:10] [vue d'exécution](sources/videos-images/workflows/sKEKJGqTz0U_t20m04s.jpg), exécution de 60 s (§4.6).
  - Le **fan-out** `asyncio.gather` apparaît : 3 barres `search_topic` démarrent au même instant (9 s, 13 s, 12 s), avant `build_itinerary` (42 s).
- [20:40–20:43] [bouton « Publish to Vibe » sur un workflow non conversationnel](sources/videos-images/workflows/sKEKJGqTz0U_t20m42s.jpg) → infobulle « Publishing unavailable » (§4.12).
- [21:14–23:38] [`worker-vibe.py`](sources/videos-images/workflows/sKEKJGqTz0U_t21m50s.jpg) ([suite](sources/videos-images/workflows/sKEKJGqTz0U_t21m56s.jpg)) (§5.6).
  - [22:28–22:52] doc « Conversational Workflows » et « Publish in Vibe ».
- [23:40] arrêt du worker (`KeyboardInterrupt`) puis `uv run worker-vibe.py`.
  - [23:54] liste : « Travel Agent X » **`● Inactive`**, « Travel Agent (Le Chat) X » `● Active`.
- [24:00–24:08] [modale « Publish to Vibe? »](sources/videos-images/workflows/sKEKJGqTz0U_t24m04s.jpg), puis `Published ▾` et le toast.
- [24:18–26:04] **Vibe** :
  - [menu `+` › Workflows](sources/videos-images/workflows/sKEKJGqTz0U_t24m21s.jpg) ;
  - [« Workflow started » et formulaire](sources/videos-images/workflows/sKEKJGqTz0U_t24m42s.jpg) ;
  - [panneau de progression](sources/videos-images/workflows/sKEKJGqTz0U_t25m20s.jpg) ;
  - [liste Executions avec deux workflows](sources/videos-images/workflows/sKEKJGqTz0U_t25m42s.jpg) ;
  - [canvas final](sources/videos-images/workflows/sKEKJGqTz0U_t26m04s.jpg) (§4.12).

### 3.5 — « Workflow Mistral : Démo de traitement de documents » (`bWVfAn46FcM`, Kokori Kodo, 11/05/2026, 18:14 ; segment 00:30–18:14)

| Champ | Valeur |
|---|---|
| Nature de l'écran | Chrome + VS Code ; tutoriel `learn.mistral.ai` « Build a document processing workflow in 30 minutes (or less!) » (Jen Person, 28/04/2026) rejoué le **30/04/2026** ; organisation « Francois's workspace » |
| Apport | **Liste complète du scaffold** (skills, guides, exemples), `Makefile` du scaffold, code du workflow médical (query, signal, `wait_condition`, `TodoList`, `structuredContent`), page de workflow à **74 exécutions** avec échecs, vue d'exécution d'un document, **erreurs 429** |

Chronologie :
- [00:30–00:44] page du tutoriel :
  - étapes « 1. Set up the environment / 2. Define fields to extract / 3. Build the workflow / 4. Create the app frontend / 5. Add load testing / 6. Update Makefile / 7. Run the app and workflow / 8. Success! » ;
  - prérequis « Python 3.12 / uv / A Mistral AI account ».
- [01:18–01:20] `console.mistral.ai/api-keys` **redirige** vers `admin.mistral.ai/organization/workspaces/<uuid>/api-keys` 🆕.
  - Menu de l'admin : ADMINISTRATION (Organization, Access, Members), SUBSCRIPTIONS (Subscriptions, Billing), MANAGE (Le Chat, API Keys, Usage, Limits, Workspaces, Privacy).
  - Panneau du workspace : `+ New workspace`, onglets Settings / API Keys / Usage / Members, colonnes `Name / Type / Key / Created / Last used / Expires / Access scope`, Type « Studio », Access scope « Shared only ». Image non copiée.
- [01:22–01:32] modale « Create API Key » → « ✓ API key successfully created », « Save this key somewhere safe. You won't see it again. ».
- [01:34–01:42] [CLI setup et liste des fichiers créés](sources/videos-images/workflows/bWVfAn46FcM_t01m40s.jpg) (§5.1).
- [02:14] `Makefile` du scaffold (§5.2) ; [04:04] `pyproject.toml` (§5.3).
- [02:36–02:48] `make start-worker` → « [dev] Worker started … Watching …/workflow-ocr/src for changes... ».
- [04:18–11:40] tutoriel et IDE :
  - `src/shared/extraction_fields.py` (`COMMON_FIELDS`, `SPECIFIC_FIELDS`, `DOCUMENT_CATEGORIES`, `CATEGORY_LABELS`) ;
  - `medical_doc_workflow.py`, `app.py`, `load_test.py` ;
  - cibles `streamlit` et `load-test` (§5.8).
- [12:20–12:42] « Discovered 2 workflow(s): hello-world, pdf_ocr_workflow » ; « Starting Temporal worker … location_type=local … task_queue=francois-mbp.home ».
  - `make streamlit` → `PYTHONPATH=src uv run streamlit run src/entrypoints/app.py`.
- [12:46–14:00] application « PDF OCR & Classification » :
  - curseur « Confidence Threshold 0.90 » ;
  - « Upload a PDF → OCR → Classification → Patient Extraction », bouton `Start Workflow` ;
  - colonnes Document / Document Preparation / Classification (« Biological Analysis », Confidence 95 %) / Patient Extraction ;
  - « ✅ Completed! ».
- [14:50–15:14] `make load-test` : « Workflow 1 → load-test-1a738055e964 » … « All 10 workflows launched! » ; côté worker, **erreurs 429** (§5.10).
- [15:26–15:30] liste (§4.2) ; [16:08–16:30] [page `pdf_ocr_workflow`](sources/videos-images/workflows/bWVfAn46FcM_t16m10s.jpg) (§4.3).
- [16:32–17:38] [vue d'exécution d'un document](sources/videos-images/workflows/bWVfAn46FcM_t16m32s.jpg) (§4.6).
  - L'URL signée de l'entrée, ouverte dans un onglet, affiche la facture PDF « Facture n° FA-2026-04-005 » (cabinet dentaire).
- [17:50–17:52] [page après saturation](sources/videos-images/workflows/bWVfAn46FcM_t17m52s.jpg) : `Errors rate 46 out of 74 62.16%`, `Average latency 35 s`, nombreuses lignes `Failed`.
- [17:54] journaux : 429 « Rate limit exceeded » ; « [dev] Shutting down... ».

### 3.6 — « Match the Tool to the Stakes » (`c5XrvauOjMc`, Vultr, 27/07/2026, 15:36 ; segment 07:20–14:10)

| Champ | Valeur |
|---|---|
| Nature de l'écran | Captation caméra d'une conférence ; écran géant filmé de biais (Jen Person) ; démo du 08/07/2026 (horodatage des journaux) |
| Apport | Diapo des 6 propriétés de Workflows ; **page de workflow de juillet 2026** (`Share`, `Graph`, `Connectors`, `Recent runs`) ; vue d'exécution avec onglets `Trace | Logs` et étape **`Auth: Linear`** |

Chronologie :
- [07:30–10:04] diapo « CONSISTENCY + AUDITABILITY / Workflows » 🆕 :
  - « Production-grade AI programs written with the Python SDK, with durable execution (powered by Temporal). They survive crashes, restarts and failures of any single step — and you deploy them in the environment you choose, including Vultr. » ;
  - cartes :
    - « Durable & resumable — A crash resumes from the last completed step — no lost work. » ;
    - « Idempotent + retries — Per-activity backoff; safe to re-run without doubling effects. » ;
    - « Human-in-the-loop — Pause for hours or days, resume when input arrives. » ;
    - « Observable & auditable — Queryable event history and traces — a record you can defend. » ;
    - « Scheduled / recurring — Cron-style or one-shot; runs unattended on your workers. » ;
    - « Conversational mode — Publish as an assistant; run it right inside Vibe. » ;
  - « Strength: reproducible · auditable · idempotent · runs unattended ».
- [10:10–12:00] Vibe Work (écran blanc filmé, illisible ; hors périmètre Workflows).
- [12:02–12:40] terminal du projet « raise » :
  - commande : `make execute-linear-summary input='{"team":"DevRel","project":"*"}'` → `uv run python -m entrypoints.start --workflow linear-weekly-summary --input '{"team":"DevRel","project":"*"}'` ;
  - configuration (§5.9) ; « Result: {'result': '**Weekly Linear Issues Summary**…'} » ;
  - résultat d'une exécution précédente : « No issues were updated in the past week. ».
- [12:44] et [13:50] [page « Linear Weekly Summary »](sources/videos-images/workflows/c5XrvauOjMc_t12m44s.jpg) (§4.3).
- [12:48–13:42] [vue d'exécution](sources/videos-images/workflows/c5XrvauOjMc_t13m22s.jpg) (§4.6).
- [13:54–14:08] diapo « How to choose » (Reusable Prompt / Skill / Workflow), déjà dans [31](31-autres-videos.md).

---

## 4. Inventaire consolidé de l'interface Workflows

### 4.1 Navigation et en-tête (états datés)

| Date (source) | Produit · en-tête | Entrées « Workflows » du menu latéral | Reste du menu |
|---|---|---|---|
| 21/04/2026 (7TnJ [05:03]) | `AI Studio ▾`, organisation, `Default Workspace ⇕`, `Search ⌘K`, avatar | **Workflows › List / Executions / Deployments** 🆕 | Home, API Keys ; *Create* : Playground, Agents, Batches, **Prompts [WIP]**, Document AI, Workflows, Audio ; *Improve* : Fine-tune ; *Context* : Files, Connectors [New] ; *Code* : Vibe CLI [New], Codestral ; Help & Resources |
| 30/04/2026 (bWVf [15:30]) | `AI Studio ▾`, « Francois's workspace », `Default Workspace` | Workflows › **List / Executions** | *Create* : Playground, Agents, Batches, Document AI, Workflows, Audio › ; *Improve* : Fine-tune › ; *Context* : Files, Connectors [New] ; *Code* : Vibe CLI [New], Codestral |
| 31/05/2026 (sKEK [14:36]) | **`Studio ▾`** (onglet du navigateur : « AI Studio - Mistral AI »), « Xavki », `Default Workspace ⇕`, `Feedback` | Workflows › **List / Executions** | *Create* : Playground, Agents, Batches, Document AI, Workflows, Audio › ; *Context* : Files, Libraries [New], Connectors [New] ; *Code* : Vibe CLI [New], Codestral ; **`Upgrade`** ; Help & Resources |
| 08/07/2026 (c5Xr [12:44]) | **rail d'icônes** (menu replié), `Feedback`, `Search ⌘K`, avatar « JP » | non lisible | — |

- ⚠️ Les sous-entrées varient selon le compte. Comptes Mistral : `Deployments` (avril) ; `Workers [WIP]` (mai, [33](33-videos-console-agents-connecteurs-skills.md)) ; `Deployments [WIP]` et `Schedules` (keynote, [35](35-videos-observabilite-admin-audio-keynotes.md)). Les comptes externes d'avril-mai n'ont que `List` / `Executions` (inférence : drapeaux de fonctionnalités par organisation).
- Toutes les pages Workflows portent le badge **`Public preview`** à côté du titre (confirme le statut de [12](12-workflows-1-concepts-construction.md)).

### 4.2 Liste des workflows (`/build/workflows`)

| Élément | Avril (7TnJ [05:03]) | Fin avril, mai (bWVf [15:30], sKEK [14:36]) |
|---|---|---|
| Titre | `List` + `Public preview` | idem |
| Actions d'en-tête | `…` | `…` ; xavki : **`Explore Cookbooks`**, **`Get Started`** 🆕 |
| Outils de tableau | `Columns 3`, `Search` | **`Columns 4`**, `Search` |
| Colonnes | `Name` (icône + nom + badge `● Active` accolé) / `Last execution` / `Executions` | `Name` / **`Status`** / `Last execution` / `Executions` 🆕 |
| Valeurs | « Hello World ● Active — ✓ Completed — 1 » | « pdf_ocr_workflow ● Active ✓ Completed 24 » ; « Travel Agent X ● Inactive ✓ Completed 1 » |
| Vide | — | « No results » |

- 🆕 Chaque workflow a une **icône pixel générée** (couleur et motif différents) et une **étoile ☆** (favori), aussi présente sur la page du workflow.
- 🆕 Le nom affiché est le `workflow_display_name` (« Travel Agent X »). La page Executions affiche à la place le **nom technique** (`travel-agent-x`).
- `● Active` (vert) / `● Inactive` (gris) reflète l'état du déploiement : « Travel Agent X » passe `Inactive` après l'arrêt de son worker [23:54] (confirme la vivacité des déploiements de [13](13-workflows-2-interaction-production.md)).

### 4.3 Page d'un workflow (`/build/workflows/<workflow UUID>`)

| Zone | Contenu observé | Source |
|---|---|---|
| URL | `console.mistral.ai/build/workflows/019daf6b-37aa-7055-bae4-e4a428ac8d28` : **UUIDv7 du workflow**, pas son nom ⚠️ ([13 §4.2](13-workflows-2-interaction-production.md) cite `/workflows/hello-world`, [12 §4](12-workflows-1-concepts-construction.md) `/build/workflows/linear-weekly-summary`) | 7TnJ [05:06], sKEK [14:38], bWVf [16:10] |
| Fil d'Ariane | `List / <Display name>` | idem |
| Actions (avril) | **`⇪ Publish to Le Chat`** 🆕 · `Archive Workflow` (grisé) 🆕 · **`Start Workflow`** (noir) | 7TnJ [05:06], bWVf [16:10] |
| Actions (mai) | **`⇪ Publish to Vibe`** · `Archive Workflow` (grisé) · `Start Workflow` ; après publication : **`○ Published ▾`** (menu) 🆕 | sKEK [14:38], [24:08] |
| Actions (juillet) | **`< Share`** 🆕 · `Publish to Vibe` · **`Graph`** + badge rouge (illisible ; « WIP » probable, inférence) 🆕 · bouton grisé (Archive, inférence) · `Start Workflow` | c5Xr [12:44] |
| En-tête | icône pixel, `display_name`, `● Active`, ☆ ; description sur deux lignes ; si la description est absente : **« Add a description... »** (champ éditable, inférence) 🆕 | bWVf [16:10] |
| Rangée de métadonnées 🆕 | `⬡ Deployments [<nom>]` · `Workflow ID ⧉ 019d...8d28` · `⊛ Errors rate <n> out of <N> <x.xx%>` · `⏱ Average latency <durée>` ; en juillet, en plus : **`Connectors [<pastille>]`** et **`Recent runs ▮▮▮`** (mini-histogramme) | 7TnJ [05:06] (« 0 out of 1 0.00% », « 1818 ms ») ; bWVf (« 1 out of 74 1.35% », « 14 s » → « 46 out of 74 62.16% », « 35 s ») ; c5Xr (« 0 out of 2 0.00% », « 1 min ») |
| Table des exécutions | `Executions <N>` ; filtre **`+ Status`** (avril-mai), puis champ **`Search or filter`** (juillet) ; `Columns 5` ; cases à cocher ; colonnes **`ID` / `Status` / `Start Time` / `End Time` / `Duration`** ; état vide « No executions found » | 7TnJ, sKEK, bWVf, c5Xr |
| Ligne d'exécution | `⧉ ...de3457a8` + pastille **`1`** (inférence : nombre de runs) · statut · « Apr 21, 11:43:08 » · « Apr 21, 11:43:10 » · « 1818 ms » ; mise à jour en direct des statuts | 7TnJ [05:06], bWVf [16:28] |

### 4.4 Formulaire d'exécution (« Start Workflow »)

- URL : `…/build/workflows/<uuid>?startWorkflowModal=true` 🆕 (7TnJ [05:07]).
- Modale **« Start Workflow »** : libellé **« Workflow Input »**, **éditeur de code sombre, numéroté, prérempli** `{ "name": "World" }` (valeur par défaut du modèle `HelloInput`, inférence), boutons `Cancel` / `Start Workflow`, ✕.
  - ⚠️ [12](12-workflows-1-concepts-construction.md) parle d'un « formulaire d'entrée généré depuis la signature » : en avril 2026, c'est un **éditeur JSON prérempli**, pas un formulaire à champs.
- Après lancement : la vue d'exécution s'ouvre et le toast **« ✓ Workflow started successfully »** s'affiche 🆕.
- Aucune modale de choix de credential ni de déploiement n'a été vue (pas de connecteur dans ces démos).

### 4.5 Liste des exécutions (`/build/workflows/executions`)

- Titre `Executions` + `Public preview` ; `+ Status` ; `Columns 6` ; `Search` (sKEK [15:08]).
- Colonnes 🆕 : **`Execution`** (`⧉ ...2be7f764` + `1`) / **`Workflow`** (icône pixel + **nom technique**, ex. `travel-agent-lechat-x`) / `Status` / **`Start Time ⌄`** (tri) / `End Time` / `Duration`.
- Exemple [25:42] : `travel-agent-lechat-x` `⟳ Running` « May 31, 17:17:23 » ; `travel-agent-x` `✓ Completed` « May 31, 17:11:39 » → « 17:12:39 » « 59 s ».
- Squelettes de chargement pendant la requête.

### 4.6 Vue d'exécution (surimpression sur la page du workflow)

| Élément | Observé | Sources |
|---|---|---|
| URL 🆕 | `…/build/workflows/<workflow UUID>?executionId=<id>&run=<run UUIDv7>`. `executionId` vaut **64 caractères hexadécimaux** quand l'exécution est lancée depuis Studio (`3a9a08e0…7ebd`), ou l'identifiant fourni par l'appelant (`load-test-fe1465a20a0f`) | 7TnJ [05:10], bWVf [16:32] |
| En-tête | `<display name>` · sélecteur de run **`…a41bfe2d (latest) ▾`** · pastille d'état (✓ vert / ⟳ bleu) · **durée totale** (`1823 ms`, `17 s`, `60 s`) | toutes |
| Actions à droite | `↑` `↓` (exécution précédente/suivante) · **`✕ Cancel`** (rouge, pendant l'exécution) · **`Run again`** · en juillet une icône **partage `<`** 🆕 · `✕` | 7TnJ [05:10], c5Xr [13:22] |
| Timeline | axe `START · 200 ms · 400 ms…` (ou `5 s… 55 s`) ; une **barre par activité** (icône drapeau ⚑ violette, nom, durée, ✓ vert) placée à son instant de début ; fan-out visible ; survol = contour violet ; badge **`● Live`** pendant l'exécution 🆕 (déjà vu dans [33](33-videos-console-agents-connecteurs-skills.md)) | sKEK [20:04], bWVf [16:32] |
| Mini-carte | deuxième axe sous la timeline, avec **poignées bleues de zoom/brosse** ; poignée `⋯` pour redimensionner le panneau | toutes |
| Étape de connecteur 🆕 | barre **`Auth: Linear`** (icône différente) ; nœud **`linear`** dans la liste ; Output `{"task_id": "9c97e5d8-…", "connector_name": "linear", "connector_id": "0198f11e-af91-7275-942e-0123c74e8b6c", "auth_url": null}` | c5Xr [13:22] |
| Panneau gauche | Avril (Jen) : onglets **`Trace` / `Task`** ; externes avril-mai : titre **`Steps`** ; juillet (Jen) : **`Trace` / `Logs`** 🆕 ⚠️ | 7TnJ [05:11], bWVf [16:32], sKEK [20:04], c5Xr [13:22] |
| Liste des étapes | `→ Workflow Output` puis une ligne par activité (⚑), dans l'ordre ; menu `⋮` au survol d'une ligne | toutes |
| Panneau droit | onglets **`Inspector [I]`** / **`Metadata [M]`** (raccourcis clavier) ; sections repliables sombres **`Output`** et **`Input`** avec icône copier, plus une 2e icône en juillet (inférence : téléchargement) | toutes |
| Contenu `Workflow Output` | retour du workflow, encapsulé : `{"result": "Hello, Jen! …"}` (retour `str`) ; `{"content": [{"type": "text", "text": "Processing complete for invoice_fr_total_5.pdf."}], "structuredContent": {…}}` (`ChatAssistantWorkflowOutput`) | 7TnJ, bWVf |
| Contenu d'une activité 🆕 | **Input = tableau des arguments positionnels**, ex. `["https://mistralaifilesapiprodswe.blob.core.windows.net/fine-tune/<uuid>/…pdf?se=…&sig=…", "invoice_fr_total_5.pdf", "medical_bill"]` ; `["0f2f3a00-…", null]`. Output = valeur de retour (`{"category": "medical_bill", "confidence": 0.95, "explanation": "…"}`). L'URL signée révèle un stockage **Azure Blob « prodswe »** (inférence : Suède ou Europe de l'Ouest) sous un préfixe `fine-tune/` | bWVf [16:50–17:16], c5Xr [12:52] |

- Rien n'a été vu des onglets `Metadata`, `Task` ni `Logs` à l'état ouvert.
- ⚠️ Aucun écran réel ne montre `Reset from here`, `View Sub-workflow` ni la sortie `JSON ▾` de la page produit ([36](36-captures-doc-annonces.md)). Ces actions n'ont pas été observées (elles peuvent se trouver dans le menu `⋮`, inférence).

### 4.7 Statuts, badges et indicateurs

| Objet | Libellés observés |
|---|---|
| Workflow (liste, page) | `● Active` (vert), `● Inactive` (gris) |
| Exécution (tables, en-tête) | `⟳ Running` (bleu), `✓ Completed` (vert), **`⊗ Failed`** (rouge) |
| Activité (timeline) | ✓ vert (terminée) ; icône d'horloge sur la barre en cours (xavki [19:56]) |
| Déploiement (carte) | `🖥 Local`, `● Active` |
| Page | `Public preview` ; dans le menu : `New`, `WIP` |
| Toasts | « Workflow started successfully », « Publication status updated » |

### 4.8 Déploiements

- **Carte au survol** de la pastille `Deployments [Xavki]` 🆕 (sKEK [14:44]) : icône cube + nom, badges **`Local`** et **`● Active`**, trois cases **`Created`** « May 31, 16:41:50 » · **`Last seen`** « just now » · **`Uptime`** « 25 min ». Ces champs correspondent à `location`, `is_active`, `created_at`, `last_heartbeat` de la spec ([13](13-workflows-2-interaction-production.md)) (inférence).
- Noms de déploiement observés :
  - `Xavki` : `DEPLOYMENT_NAME` défini dans `.env` ;
  - `MacBook-Pro-JenPerson` et `francois-mbp.home` : **nom d'hôte** (scaffold d'avril) ⚠️ ;
  - `MacBook-Pro-JenPerson-raise-lucky-otter` (juillet) 🆕 : nom d'hôte + projet + deux mots aléatoires (inférence : suffixe généré par le scaffold).
- La page « Deployments » du menu (avril) **n'a pas été ouverte** dans ces vidéos.

### 4.9 Visualizer / graphe

- En juillet, la page du workflow porte un bouton **`Graph`** avec un badge 🆕 (c5Xr [12:44]), jamais cliqué dans la vidéo. ⚠️ [13 §3.20](13-workflows-2-interaction-production.md) décrit l'accès par « ouvrir `Visualizer` depuis le menu ».
- Configuration du worker (juillet) 🆕 : `graph: {upload_graph: False, graph_summarise_enabled: True, graph_summarise_model: 'mistral-small-latest'}`.
  - Le **modèle des résumés IA** est donc `mistral-small-latest` (absent de la doc).
  - `upload_graph: False` apparaît dans la configuration imprimée par `make execute` (processus de déclenchement, pas forcément le worker, inférence). ⚠️ La doc donne `UPLOAD_GRAPH=true` par défaut.
- Aucun graphe n'est montré dans les six vidéos.

### 4.10 Schedules

- Non montrés (ni page, ni création). Vultr annonce « triggered on a schedule … via webhook » [12:00]. La diapo de [07:30] dit « Cron-style or one-shot; runs unattended on your workers ».

### 4.11 Logs et traces

- Juillet : onglet **`Logs`** dans la vue d'exécution (non ouvert) 🆕. Avril : `Task`.
- Configuration du worker : avril-mai `otel_enabled: False`, juillet `otel_enabled: True` avec `mistral_workflows_otel_traces_export / _metrics_export / _logs_export: True` (§5.9). ⚠️ Les workers des premières versions 3.x n'exportaient apparemment pas l'OTel par défaut (inférence).

### 4.12 Publication dans Vibe et rendu dans Vibe Work

| Étape | Libellés exacts | Source |
|---|---|---|
| Workflow incompatible | clic sur `Publish to Vibe` → infobulle : ⓘ **« Publishing unavailable »** / « This workflow definition isn't compatible with Vibe » / bouton **`📖 Read docs`** 🆕 | [sKEK t20m42s](sources/videos-images/workflows/sKEKJGqTz0U_t20m42s.jpg) |
| Workflow compatible | modale **« Publish to Vibe? »** : « This workflow will be available to **all workspace users** in Vibe conversations. Only workflows with a compatible output format will be visible. » ; `Cancel` / `Publish` 🆕 | [sKEK t24m04s](sources/videos-images/workflows/sKEKJGqTz0U_t24m04s.jpg) |
| Après publication | bouton **`○ Published ▾`** ; toast **« Publication status updated »** 🆕 ; retrait par le menu ▾ (inférence) | sKEK [24:08] |
| Menu `+` de Vibe (31/05) | `Upload Files` · `Connectors ›` · **`Tools ›`** · **`Projects ›`** · `Libraries ›` · `Workflows ›` · `Agents ›` · `Reset input` ; placeholder « Type / for quick access » ⚠️ ([33](33-videos-console-agents-connecteurs-skills.md), juillet : `Skills ›`, sans `Tools` ni `Projects`) | [sKEK t24m21s](sources/videos-images/workflows/sKEKJGqTz0U_t24m21s.jpg) |
| Sous-menu Workflows | panneau `Search` ; ligne avec **icône orange**, nom « Travel Agent (Le Chat) X » et description tronquée 🆕 | idem |
| Saisie | puce du workflow dans la zone de saisie ; message envoyé = puce « ⚙ Travel Agent (Le Chat) X » + texte « London » | sKEK [24:39] |
| Conversation | titre « Workflow execution », renommé ensuite automatiquement « Travel Planning for London » 🆕 ; URL `chat.mistral.ai/chat/<uuid>` | sKEK [24:39–25:20] |
| Démarrage | « Workflow started: **Travel Agent (Le Chat) X** » (lien vers l'exécution dans Studio) | [sKEK t24m42s](sources/videos-images/workflows/sKEKJGqTz0U_t24m42s.jpg) |
| Entrée 🆕 | **carte formulaire générée depuis l'entrée du workflow** : champ `destination`, **prérempli « London »** à partir du message (inférence), bouton **`Submit ⌘↵`** ; après soumission, carte en lecture seule | sKEK [24:42–24:52] |
| Messages | « Planning a **3-day mid-budget** trip to **London**. » puis « Found 3 candidate flights. » (deux `send_assistant_message` affichés à la suite) | sKEK [25:20] |
| Barre d'exécution | `ⓘ Travel Agent (Le Chat) X` + `■` ; puis `⟳ Travel Agent (Le Chat) X ⌄ ■`, dépliable | sKEK [24:42], [25:20] |
| Progression (`TodoList`) 🆕 | panneau **`Ongoing`** « ○ Build itinerary » / **`Completed`** « ☑ Parse destination ☑ Search flights ☑ Research the city » (cases cochées orange) | [sKEK t25m20s](sources/videos-images/workflows/sKEKJGqTz0U_t25m20s.jpg) |
| Résultat | **canvas « Itinerary — London (3 days) »** avec `Edit` / `Copy` et `Expand` ; **« Workflow completed: Travel Agent (Le Chat) X »** 🆕 (la base [22](22-vibe-work-le-chat.md) ne cite que `started` et `failed`) ; actions 👍 👎 ↻ ⧉ ; « Vibe can make mistakes. Check answers. Learn more » | [sKEK t26m04s](sources/videos-images/workflows/sKEKJGqTz0U_t26m04s.jpg) |
| Interface Vibe (mai) | onglets `Chat` / `Work` ; `New Chat`, `Agents`, `Context` ; `Projects +` ; `Chats` ; compte « Le Chat Free » ; `Upgrade to Pro` | sKEK [25:20] |
| Studio | l'exécution déclenchée depuis Vibe apparaît dans `Executions` comme les autres (`travel-agent-lechat-x Running`) | sKEK [25:42] |
| Output Studio | `{"content": [{"type": "text", "text": "Here is your 3-day mid-budget itinerary for **London**."}, {"type": "resource", "resource": {…}}]}` | sKEK [25:48] |

- 🆕 Un **compte gratuit** peut publier un workflow dans Vibe et l'exécuter (31/05/2026). ⚠️ La base [22](22-vibe-work-le-chat.md) documente un échec « Your account tier (free) does not have access to this feature ». Le comportement dépend sans doute de la date ou de la fonctionnalité (inférence).
- `Publish to Le Chat` (avril) → `Publish to Vibe` (mai) : renommage concomitant de Le Chat → Vibe (28/05/2026).

### 4.13 Clés API vues dans le parcours de démarrage

- La CLI d'avril affiche **« Create an API key at: https://console.mistral.ai/api-keys »** 🆕 ⚠️ ([12 §3.3](12-workflows-1-concepts-construction.md) : `…/home?profile_dialog=api-keys`).
  - Le 21/04, cette adresse ouvre le **dialogue du workspace** `?workspace_dialog=apiKeys` (7TnJ [01:24]).
  - Le 30/04, elle **redirige vers l'Admin** (`admin.mistral.ai/organization/workspaces/<uuid>/api-keys`) (bWVf [01:20]).
- La modale de profil « My API Keys » sert à créer la clé (bWVf, sKEK).
- Le CLI stocke la clé dans le `.env` généré : « The provided API key will be stored in the generated `.env` » (7TnJ [01:20]) 🆕.

### 4.14 Maquettes officielles (à ne pas confondre avec la console)

| Vidéo | Maquette | Éléments propres à la maquette |
|---|---|---|
| 9tXQ | Page « AI STUDIO » de run | fil `Workflows / <name> / Runs / run_<hex>` ; cartes `RUN INFO` (TRIGGER, ACTIVITIES n/5) et `WORKFLOW` (VERSION, ENV, REGION, SDK) ; timeline verticale numérotée ; états `RETRYING` + `RETRY 1/3`, `WAITING FOR INPUT` ; carte d'approbation `APPROVE` / `REQUEST INFO` dans « LE CHAT » |
| YQB6 | Gantt + chat | barre `✱ Waiting for input` dans la timeline ; carte Decline / Continue avec raccourcis |

- Ces maquettes donnent des **intentions de produit**, pas l'existant. La vraie console d'avril-juillet 2026 n'a ni carte `RUN INFO`, ni environnement, ni version de workflow affichée.

---

## 5. Code et CLI relevés

### 5.1 `uvx mistralai-workflows-cli setup` (avril 2026)

Sortie terminal (7TnJ [01:17–01:31], bWVf [01:34–01:42]) :
```
~ % uvx mistralai-workflows-cli setup
Installed 26 packages in 35ms
Mistral Workflows — Project Setup
Project name (my-workflow):            ← Kokori : workflow-ocr
Create an API key at: https://console.mistral.ai/api-keys
Paste your Mistral API key:
The provided API key will be stored in the generated `.env`
Scaffolding project into my-workflow ...
  create .agents/skills/workflows/references/workflow_testing.md
  …
Project created at my-workflow

Get started:

  cd my-workflow
  vibe
```
⚠️ La commande montrée est `uvx mistralai-workflows-cli setup`, **sans `@latest`** (la doc, [12](12-workflows-1-concepts-construction.md), écrit `@latest`).

**Arborescence générée** 🆕. Les listes viennent de 7TnJ [01:29] (version minimale) et de bWVf [01:40] (version avec exemples, haut de liste tronqué).
```
.agents/skills/workflows/
  SKILL.md
  references/
    guides/            testing.md, error-codes.mdx, limitations.mdx, scheduling.mdx,
                       assist-workflows.mdx, payload-encoding.mdx, activities.mdx,
                       dependency-injection.mdx, signals-queries-updates.mdx,
                       workflows-exception.mdx, migration-v2-to-v3.mdx   (+ lignes non visibles)
    pipeline_pattern.md
    workflow_testing.md
  scripts/test_workflow.py
.gitignore  pyproject.toml  .env  Makefile  README.md
src/
  dev_worker.py   discover.py
  workflows/  __init__.py  hello.py  start.py
  examples/   __init__.py  worker.py
    cargo_release/       __init__.py activities.py models.py workflow.py README.md
                         sample_data/shipping_doc_normal.png, shipping_doc_anomaly.png
    insurance_claims/    __init__.py activities.py models.py workflow.py README.md
                         sample_data/claim_{low,medium,high}_severity.json
                         sample_data/photos/claim_low_scratch_door.jpg, claim_medium_dent_rear.jpg,
                                            claim_high_totaled_front.jpg, claim_high_totaled_side.jpg, CREDITS.md
    code_modernization/  __init__.py activities.py models.py sub_workflow.py workflow.py README.md
                         sample_data/legacy_repo/__init__.py, processor.py, utils.py, api_client.py
```
- Le scaffold du 30/04 n'a **pas** de cookbook `linear_summarization` : seulement 3 exemples, contre 4 cookbooks dans [12 §3.4](12-workflows-1-concepts-construction.md) (inférence : ajouté plus tard). Le guide `migration-v2-to-v3.mdx` atteste d'une **rupture v2 → v3** du SDK 🆕.
- En juillet, le projet de démo utilise `src/entrypoints/start.py` (`uv run python -m entrypoints.start`), là où le scaffold d'avril avait `src/workflows/start.py` (inférence : réorganisation du template).

### 5.2 `Makefile` du scaffold (bWVf [02:14], lignes tronquées à droite)
```make
.PHONY: start-worker execute installdeps start-examples execute-insurance-claim[s …]

## Install dependencies
installdeps:
	uv sync

## Auto-discover all workflows and start the worker (with file-watch auto-reloa[d])
start-worker:
	uv run python src/dev_worker.py

## Trigger a workflow execution
## Usage: make execute workflow=hello-world input='{"name": "World"}'
execute:
	uv run python src/workflows/start.py $(if $(workflow),--workflow $(workflow), […]

## Start a worker that loads only the example workflows
start-examples:
	cd src && uv run python -m examples.worker

## Execute the insurance-claims-triage example workflow
## Usage: make execute-insurance-claims input='{"claim_id": "CLM-001", "claiman[t_name" …]
execute-insurance-claims:
	uv run python src/workflows/start.py --workflow insurance-claims-triage $(if […]

## Execute the cargo-release-compliance example workflow
## Usage: make execute-cargo-release input='{"document_uri": "...", "shipment_i[d" …]
```
Cibles ajoutées par le tutoriel « document processing » (bWVf [11:28]) :
```make
## Start the Streamlit app
streamlit:
	PYTHONPATH=src uv run streamlit run src/entrypoints/app.py
## Run load test
load-test:
	uv run python src/entrypoints/load_test.py $(if $(n),$(n),)
```

### 5.3 `pyproject.toml`

Scaffold (bWVf [04:04]) 🆕 :
```toml
[project]
name = "workflow-ocr"
version = "0.1.0"
description = "A Mistral Workflows project"
requires-python = ">=3.12"
dependencies = [
    "mistralai-workflows[mistralai]>=3.0.0,<4",
    "pydantic",
    "python-dotenv",
]

[dependency-groups]
dev = ["ruff>=0.11", "mypy>=1.15", "pytest>=8.0", "watchdog>=4.0"]
```
- Le scaffold inclut **déjà l'extra `[mistralai]`** et `watchdog`, utilisé par `dev_worker.py` (inférence).
- Le tutoriel ajoute `"streamlit==1.55.0"` et `"pymupdf>=1.23.0"`.
- Le projet de xavki (sKEK [10:28]) : `name = "travel_demo"`, mêmes dépendances plus `streamlit`, et en plus `[tool.uv] exclude-newer = "7 days"`, un build `hatchling` et `packages = ["src/examples"]` (inférence : copié du template).

### 5.4 `hello.py` et `discover.py` (7TnJ [02:24], [03:13–03:19]), mot pour mot

```python
"""Minimal example workflow — edit this file or create new ones."""

from pydantic import BaseModel

import mistralai.workflows as workflows


class HelloInput(BaseModel):
    name: str = "World"


@workflows.activity()
async def greet(name: str) -> str:
    """A simple activity that returns a greeting."""
    return f"Hello, {name}! Welcome to Mistral Workflows."


@workflows.workflow.define(
    name="hello-world",
    workflow_display_name="Hello World",
    workflow_description="A minimal hello-world workflow.",
)
class HelloWorkflow:
    @workflows.workflow.entrypoint
    async def run(self, input: HelloInput) -> str:
        return await greet(input.name)
```
```python
"""Auto-discover all workflow classes in src/workflows/ and start a worker."""
# ruff: noqa: E402

import asyncio
import importlib
from dotenv import load_dotenv
import inspect
import pkgutil
import sys

load_dotenv(override=True)

import mistralai.workflows as workflows
from mistralai.workflows.core.definition.workflow_definition import (
    get_workflow_definition,
)


def discover_workflows() -> list[type]:
    """Scan the workflows package and return all workflow classes."""
    discovered = []
    package = importlib.import_module("workflows")
    for _, modname, ispkg in pkgutil.iter_modules(package.__path__, prefix="workflows."):
        if ispkg:
            continue
        module = importlib.import_module(modname)
        for _, obj in inspect.getmembers(module, inspect.isclass):
            if hasattr(obj, "__workflows_workflow_def"):
                discovered.append(obj)
    return discovered


async def main() -> None:
    discovered = discover_workflows()
    if not discovered:
        print("No workflows discovered in src/workflows/")
        sys.exit(1)
    names = [get_workflow_definition(wf).name for wf in discovered]
    print(f"Discovered {len(discovered)} workflow(s): {', '.join(names)}")
    await workflows.run_worker(discovered)


if __name__ == "__main__":
    asyncio.run(main())
```
- 🆕 Le décorateur pose l'attribut **`__workflows_workflow_def`** sur la classe. Le module interne `mistralai.workflows.core.definition.workflow_definition` expose `get_workflow_definition`.
- ⚠️ La doc ([12 §3.3](12-workflows-1-concepts-construction.md)) place la découverte dans `src/entrypoints/worker.py` et appelle `mistralai_workflows.run_worker` ; le scaffold d'avril a `src/discover.py` et `workflows.run_worker`.

### 5.5 Worker « Travel Agent » (xavki, sKEK [11:08–11:40])

```python
#   python src/worker.py
# """
# ruff: noqa: E402

import asyncio
import os
from datetime import timedelta
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv(override=True)

import mistralai.workflows as workflows
import mistralai.workflows.plugins.mistralai as wm

MODEL = os.environ.get("MODEL", "mistral-medium-latest")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TripInput(BaseModel):
    destination: str = "Lisbon"


class TripBrief(BaseModel):
    destination: str = Field(description="City or place name, cleaned up")
    days: int = Field(default=3, ge=1, le=14, description="Trip length in days")
    budget: Literal["low", "mid", "high"] = Field(default="mid")


class FlightSuggestions(BaseModel):
    flights: list[str] = Field(
        description="3 flight suggestions, each 'AIRLINE FLIGHTNUM CITY-CITY ~PRICE€'",
        min_length=3,
        max_length=3,
    )

# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

@workflows.activity(
    name="parse_trip",
    retry_policy_max_attempts=2,
    start_to_close_timeout=timedelta(seconds=60),
)
async def parse_trip(destination: str) -> TripBrief:
    request = wm.ChatCompletionRequest(
        model=MODEL,
        messages=[
            wm.SystemMessage(
                content=(
                    "You are a travel-planning parser. Given a free-form destination "
                    # […] lignes 52-82 non montrées
async def search_flights(brief: TripBrief) -> FlightSuggestions:
    # […]
                    f"{brief.days}-day {brief.budget}-budget trip."
                )
            ),
        ],
    )
    return await wm.chat_parse_to_model(FlightSuggestions, request)


@workflows.activity(
    name="search_topic",
    retry_policy_max_attempts=2,
    start_to_close_timeout=timedelta(seconds=60),
)
async def search_topic(topic: str) -> str:
    request = wm.ChatCompletionRequest(
        model=MODEL,
        messages=[
            wm.SystemMessage(
                content=(
                    "You are a local travel expert. Give concrete, specific "
                    "recommendations naming actual places — not generic advice."
                )
            ),
            wm.UserMessage(
                content=(
                    f"Give 5 specific recommendations for: {topic}. "
                    "Return a markdown bullet list."
                )
            ),
        ],
    )
    response = await wm.mistralai_chat_complete(request)
    if not response.choices or not response.choices[0].message:
        raise ValueError(f"Empty LLM response for topic: {topic}")
    return f"**{topic}**\n{response.choices[0].message.content or ''}"


@workflows.activity(
    name="build_itinerary",
    retry_policy_max_attempts=2,
    start_to_close_timeout=timedelta(seconds=90),
)
async def build_itinerary(
    # […]
        raise ValueError("Empty LLM response for itinerary")
    return response.choices[0].message.content or ""

# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------

@workflows.workflow.define(
    name="travel-agent",
    workflow_display_name="Travel Agent",
    workflow_description=(
        "Parse -> search flights -> fan-out research x3 -> itinerary. "
        "Built on the mistralai workflows plugin with structured output."
    ),
)
class TravelWorkflow:
    @workflows.workflow.entrypoint
    async def run(self, input: TripInput) -> str:
        brief = await parse_trip(input.destination)
        flights = await search_flights(brief)

        # fan-out: 3 research activities run in parallel
        findings = await asyncio.gather(
            search_topic(f"{brief.destination} hotels"),
            search_topic(f"{brief.destination} restaurants"),
            search_topic(f"{brief.destination} attractions"),
        )

        return await build_itinerary(brief, flights, findings)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    await workflows.run_worker([TravelWorkflow])
```
- 🆕 Helpers du plugin `mistralai.workflows.plugins.mistralai` : `ChatCompletionRequest`, `SystemMessage`, `UserMessage` ; **`chat_parse_to_model(Model, request)`** (sortie structurée Pydantic) ; **`mistralai_chat_complete(request)`** appelée directement comme activité intégrée.
- Le décorateur `@workflows.activity(name=…, retry_policy_max_attempts=…, start_to_close_timeout=…)` fixe les noms d'activités affichés dans la timeline (`parse_trip`…). `asyncio.gather` produit le fan-out visible en §4.6.

### 5.6 Worker conversationnel « Travel Agent (Le Chat) » (sKEK [21:28–23:24])

```python
"""Travel agent worker — Le Chat (Vibe Work) edition.

Same activities as worker.py, but the workflow:
- extends `InteractiveWorkflow` so it can pause / message the user;
- wraps each step in a `TodoList` for live progress in the Le Chat UI;
- sends interim assistant messages between steps;
- returns `ChatAssistantWorkflowOutput` (required to publish in Le Chat).

Registered as a distinct workflow name (`travel-agent-lechat`) so it can run
side-by-side with the plain `travel-agent` from worker.py.

Run:
    python src/worker_lechat.py
"""
# ruff: noqa: E402

import asyncio

from dotenv import load_dotenv

load_dotenv(override=True)

import mistralai.workflows as workflows
import mistralai.workflows.plugins.mistralai as wm

from worker import (
    TripInput,
    build_itinerary,
    parse_trip,
    search_flights,
    search_topic,
)


@workflows.workflow.define(
    name="travel-agent-lechat-x",
    workflow_display_name="Travel Agent (Le Chat) X",
    workflow_description=(
        "Plan a trip: parse the destination, find flights, research hotels / "
        "restaurants / attractions in parallel, then build a day-by-day itinerary. "
        "Publishable in Le Chat (Vibe Work) with live progress."
    ),
)
class TravelLeChatWorkflow(workflows.InteractiveWorkflow):
    @workflows.workflow.entrypoint
    async def run(self, input: TripInput) -> wm.ChatAssistantWorkflowOutput:
        # Live checklist rendered in the Le Chat UI.
        parse_item = wm.TodoListItem(
            title="Parse destination",
            description="Extract destination, days, and budget from the query",
        )
        flights_item = wm.TodoListItem(
            title="Search flights",
            description="Suggest 3 plausible flight options",
        )
        research_item = wm.TodoListItem(
            title="Research the city",
            description="Hotels, restaurants, and attractions (in parallel)",
        )
        itinerary_item = wm.TodoListItem(
            title="Build itinerary",
            description="Compose a day-by-day markdown itinerary",
        )

        async with wm.TodoList(
            items=[parse_item, flights_item, research_item, itinerary_item]
        ):
            async with parse_item:
                brief = await parse_trip(input.destination)
            await wm.send_assistant_message(
                f"Planning a **{brief.days}-day {brief.budget}-budget** trip to "
                f"**{brief.destination}**."
            )

            async with flights_item:
                flights = await search_flights(brief)
            await wm.send_assistant_message(
                f"Found {len(flights.flights)} candidate flights."
            )

            async with research_item:
                findings = await asyncio.gather(
                    search_topic(f"{brief.destination} hotels"),
                    search_topic(f"{brief.destination} restaurants"),
                    search_topic(f"{brief.destination} attractions"),
                )

            async with itinerary_item:
                itiner[ary = await build_itinerary(…)]   # ligne masquée par une infobulle
        # […]

        # send_assistant_message — the return value alone does NOT render as a
        # chat message (it only marks the workflow as completed, which produces
        # "Workflow terminé" with no body). See SDK examples workflow_rfc_builder
        # and workflow_curve_analysis for the same pattern.
        canvas = wm.CanvasResource(
            canvas=wm.CanvasPayload(
                type="text/markdown",
                title=f"Itinerary — {brief.destination} ({brief.days} days)",
                content=itinerary,
            ),
        )
        final_chunks = [
            wm.TextOutput(
                text=(
                    f"Here is your {brief.days}-day {brief.budget}-budget itinerary "
                    f"for **{brief.destination}**."
                )
            ),
            wm.ResourceOutput(resource=canvas),
        ]
        await wm.send_assistant_message(final_chunks)

        return wm.ChatAssistantWorkflowOutput(content=final_chunks)


async def main() -> None:
    await workflows.run_worker([TravelLeChatWorkflow])


if __name__ == "__main__":
    asyncio.run(main())
```
Infobulle de l'IDE (sKEK [23:24]) 🆕 :
```python
class CanvasPayload(
    *,
    type: Literal['text/markdown', 'text/html', 'image/svg+xml', 'slides', 'react', 'code', 'mermaid'],
    title: str,
    content: str,
    language: str | None = None
)
```
- 🆕 **Chaque `TodoListItem` est un gestionnaire de contexte asynchrone** (`async with parse_item:`), qui fait passer l'élément de `Ongoing` à `Completed` (§4.12).
- 🆕 Les **7 types de canvas** confirment les « 7 types de contenu » de [13](13-workflows-2-interaction-production.md), avec leurs valeurs littérales, et révèlent le paramètre `language` (pour `code`, inférence).
- 🆕 Le commentaire (de l'auteur ou de son agent de code, inférence) mentionne le rendu **« Workflow terminé »** sans corps si l'on ne fait que retourner la sortie, ainsi que deux exemples du SDK, `workflow_rfc_builder` et `workflow_curve_analysis`. Cela confirme que « la valeur de sortie n'est pas rendue seule » ([13 §3.7](13-workflows-2-interaction-production.md)).

### 5.7 Client Streamlit qui suit une exécution (sKEK [15:46–18:00])

```python
import asyncio
import os
import time

import streamlit as st
from dotenv import load_dotenv
from mistralai.workflows.client import get_mistral_client

load_dotenv(override=True)

st.set_page_config(page_title="Mistral Travel Agent", page_icon="✈️")
st.title("✈️ Travel Agent")
st.caption("Type a destination. Watch the workflow run live on Mistral.")

if "history" not in st.session_state:
    st.session_state.history = []


def _client():
    return get_mistral_client(
        api_key=os.environ["MISTRAL_API_KEY"],
        server_url=os.environ.get("SERVER_URL", "https://api.mistral.ai"),
    )


async def trigger(destination: str) -> str:
    res = await _client().workflows.execute_workflow_async(
        workflow_identifier="travel-agent",
        input={"destination": destination},
        deployment_name=os.environ.get("DEPLOYMENT_NAME", "default"),
        wait_for_result=False,
    )
    return res.execution_id


async def fetch_steps(execution_id: str) -> tuple[list[dict], str, str | None]:
    """Return (steps, status, final_result)."""
    c = _client()
    h = await c.workflows.executions.get_workflow_execution_history_async(
        execution_id=execution_id
    )
    events = (h.model_dump() if hasattr(h, "model_dump") else h).get("events", [])

    steps_by_sched: dict[str, dict] = {}
    order: list[str] = []
    for e in events:
        et = e.get("eventType", "")
        attrs = next((v for k, v in e.items() if k.endswith("EventAttributes")), None) or {}
        if et == "EVENT_TYPE_ACTIVITY_TASK_SCHEDULED":
            sid = str(e["eventId"])
            steps_by_sched[sid] = {
                "name": attrs.get("activityType", {}).get("name", "?"),
                "status": "pending",
            }
            order.append(sid)
        elif et == "EVENT_TYPE_ACTIVITY_TASK_STARTED":
            sid = str(attrs.get("scheduledEventId"))
            if sid in steps_by_sched:
                steps_by_sched[sid]["status"] = "running"
        elif et == "EVENT_TYPE_ACTIVITY_TASK_COMPLETED":
            sid = str(attrs.get("scheduledEventId"))
            if sid in steps_by_sched:
                steps_by_sched[sid]["status"] = "done"
        elif et == "EVENT_TYPE_ACTIVITY_TASK_FAILED":
            sid = str(attrs.get("scheduledEventId"))
            if sid in steps_by_sched:
                steps_by_sched[sid]["status"] = "failed"

    steps = [steps_by_sched[sid] for sid in order]

    state = await c.workflows.executions.get_workflow_execution_async(
        execution_id=execution_id
    )
    sd = state.model_dump() if hasattr(state, "model_dump") else {}
    status = sd.get("status", "RUNNING")
    final = None
    if status == "COMPLETED":
        r = sd.get("result")
        final = r.get("result") if isinstance(r, dict) else r
    return steps, status, final


ICONS = {"pending": "⬜", "running": "⏳", "done": "✅", "failed": "❌"}


def render_steps(steps: list[dict]) -> str:
    if not steps:
        return "_waiting for worker to pick up the run..._"
    return "\n".join(f"{ICONS[s['status']]} `{s['name']}`" for s in steps)
# […] boucle st.chat_input("Type a destination (e.g. Lisbon)") → trigger → while True:
#      fetch_steps toutes les 1 s ; sortie si status in ("COMPLETED", "FAILED", "TERMINATED", "CANCELED")
#      ou elapsed > 120 s (« Timed out after 120s ») ; « Poll error: … — retrying... »
```
- 🆕 **`mistralai.workflows.client.get_mistral_client(api_key=, server_url=)`** sert de client côté application.
- 🆕 **`GET …/executions/{id}/history` renvoie l'historique au format Temporal brut** : `eventType` préfixé `EVENT_TYPE_`, attributs `*EventAttributes`, `scheduledEventId`, `activityType.name`. On y trouve aussi **`ACTIVITY_TASK_SCHEDULED`**. ⚠️ La liste d'événements de [12 §3.9](12-workflows-1-concepts-construction.md) commence à `ACTIVITY_TASK_STARTED` et ne porte pas le préfixe `EVENT_TYPE_`.
- `wait_for_result=False` et `deployment_name=` sur `execute_workflow_async` confirment la spec ([13](13-workflows-2-interaction-production.md)).

### 5.8 Workflow « traitement de documents médicaux » (tutoriel learn.mistral.ai, bWVf [06:06–11:14])

Extraits lisibles (la partie centrale défile vite, lecture partielle) :
```python
import mistralai.workflows as workflows
import mistralai.workflows.plugins.mistralai as workflows_mistralai

@workflows.activity(start_to_close_timeout=timedelta(minutes=5), retry_policy_max_attempts=…)
async def get_document_signed_url(file_id: str) -> str:
    client = workflows_mistralai.get_mistral_client()
    signed_url = await client.files.get_signed_url_async(file_id=file_id)
    return signed_url.url

@workflows.activity(start_to_close_timeout=timedelta(minutes=2), retry_policy_max_attempts=2)
async def classify_document(document_url: str, filename: str) -> dict:
    # client.chat.parse_async(response_format=DocumentClassification, model=…, temperature=0.0,
    #   messages=[…{"type": "document_url", "document_url": document_url, "document_name": filename}…])
    # modèle : os.environ.get("MISTRAL_CLASSIFIER_MODEL", "mistral-medium-latest")

@workflows.activity(start_to_close_timeout=timedelta(minutes=2), retry_policy_max_attempts=2)
async def extract_patient_info(document_url: str, filename: str, category: str) -> dict:
    # schéma Pydantic dynamique (create_model, ConfigDict(extra="forbid")) ; MISTRAL_EXTRACTOR_MODEL

@workflows.workflow.define(name="pdf_ocr_workflow")
class PdfOcrWorkflow(workflows.InteractiveWorkflow):
    def __init__(self):
        # UI-facing step state exposed through the `get_steps` query.
        self.steps = {"ocr": {"status": "pending", "result": None}, "classify": {…}, "extract": {…}}
        # Set by the `manual_category` signal when a user overrides classification.
        self._manual_category = None

    @workflows.workflow.query(name="get_steps")
    def get_steps(self) -> dict:
        # Queries are synchronous/read-only: frontend polls this for progress.
        return self.steps

    @workflows.workflow.signal(name="manual_category")
    async def manual_category_signal(self, payload: ManualCategorySignal) -> None:
        # Signals are async/write: this mutates workflow state while run() is active.
        self._manual_category = payload.category

    @workflows.workflow.entrypoint
    async def run(
        self,
        file_id: str,
        filename: str,
        confidence_threshold: float = 0.9,
        manual_review_timeout_seconds: Optional[float] = None,
    ) -> workflows_mistralai.ChatAssistantWorkflowOutput:
        # TodoList items let clients display coarse workflow progress in addition to step d[etails]
        …
        async with workflows_mistralai.TodoList(items=[ocr_item, classify_item, extract_item]):
            …
                if classification.get("confidence", 0.0) < confidence_threshold:
                    # Low confidence enters a human-in-the-loop branch.
                    self.steps["classify"] = {"status": "waiting_human", "result": classifi[cation]}
                    try:
                        # wait_condition pauses deterministically until signal or timeout.
                        await workflows.workflow.wait_condition(
                            lambda: self._manual_category is not None,
                            timeout=manual_review_timeout_seconds,
                            timeout_summary="manual_category_review",
                        )
                    except asyncio.TimeoutError:
                        # Non-interactive callers can set a timeout to avoid waiting foreve[r]
                        …
        return workflows_mistralai.ChatAssistantWorkflowOutput(
            # Return both human-readable text and structured payload for the UI.
            content=[workflows_mistralai.TextOutput(text=f"Processing complete for {filenam[e]}…")],
            structuredContent={"filename": filename, "ocr_text": "…", "classification": classification,
                               "patient_info": patient_info},
        )
```
Application et test de charge (extraits) :
```python
# app.py
async def upload_pdf(pdf_bytes: bytes, filename: str) -> str:
    async with Mistral(api_key=API_KEY) as client:
        resp = await client.files.upload_async(
            file={"file_name": filename, "content": pdf_bytes, "content_type": "application[/pdf]"},
            purpose="ocr",
        )
    return resp.id
# get_workflows_client(): """Create a fresh Mistral Workflows client for this operation. Do not cache across
#   run_async() calls: each call creates/closes its own event loop, and reusing an async client across loops
#   triggers "Event loop is closed" errors."""  return get_mistral_client(server_url=BASE_URL, api_key=API_KEY)
# déclenchement : client.workflows.execute_workflow_async(workflow_identifier="pdf_ocr_workflow", input=…, execution_id=…)
# signal : client.workflows.executions.signal_workflow_execution_async(execution_id=…, name="manual_category", …)
# load_test.py : « Launch 10 workflows in parallel to demonstrate load balancing. Each workflow will be
#   distributed across available workers. » ; NUM_WORKFLOWS = int(sys.argv[1]) if len(sys.argv) > 1 else 10
#   PdfOcrInput(file_id, filename, confidence_threshold=0.9, manual_review_timeout_seconds: float | None = 5.0)
```
- 🆕 **`timeout_summary=`** sur `wait_condition` : libellé de l'attente, probablement affiché dans la timeline (inférence).
- L'entrée du workflow est une **signature à plusieurs paramètres**. Studio montre alors l'Input d'une activité sous forme de tableau (§4.6).
- **Upload de fichiers** avec `purpose="ocr"`, puis URL signée passée en `document_url` au chat : le tutoriel n'appelle pas `/v1/ocr` (« Document QnA »).

### 5.9 Journaux du worker : configuration effective et activités enregistrées 🆕

Clés de configuration imprimées (« Configuration loaded [mistralai.workflows.core.config.config] » ; 7TnJ [04:09–04:52], sKEK [14:24], c5Xr [12:10]) :

| Bloc | Clés et valeurs observées |
|---|---|
| `common` | `app_name 'mistral-workflows'`, `app_version '0.0.0'`, `log_format CONSOLE`, `log_level INFO`, `otel_enabled` (**False** en avril-mai, **True** en juillet ⚠️), `mistral_workflows_otel_traces_export / _metrics_export / _logs_export True` (juillet), `otel_endpoint` / `otel_traces_endpoint` / `otel_metrics_endpoint` / `otel_logs_endpoint None` (avril : `otel_endpoint 'http://localhost:4318'`), `otel_sample_rate 1.0`, `otel_export_interval_ms 30000`, `otel_tail_sampling False`, `otel_local False`, `otel_inject_logs True`, `ca_bundle None`, `mistral_api_key SecretStr` |
| `worker` | **`retry_policy_max_attempts 3`**, **`retry_policy_backoff_coefficient 2.0`**, `dangerously_force_fail_workflow_on_error False`, `server_url https://api.mistral.ai`, `api_version v1`, `events_api_version v1`, `allow_multiple_workers True`, `enable_config_discovery True`, `mistral_api_headers None`, `temporal_payload_offloading` (avril : `{enabled False, storage_config None, min_size_bytes 1048576}`), `temporal_payload_compression None` (juillet), `temporal_payload_encryption` (avril : `{mode PayloadEncryptionMode.NONE, main_key None, secondary_key None}`), `activity_attributes_offloading`, `blob_storage_configs {}` |
| `worker.agent` | `llm_rate_limit None`, `mistral_client_server None`, `mistral_client_server_url https://api.mistral.ai`, `mistral_client_url_params None`, `mistral_client_timeout_ms None`, `mistral_client_api_key SecretStr` |
| `worker.versioning` | `enabled False`, `deployment_name <nom>`, **`build_id None`**, **`auto_register_as_current False`** |
| `worker.deployment_location` | **`location_type LOCAL`**, `k8s_cluster None`, `k8s_namespace None` |
| `worker.graph` (juillet) | `upload_graph False`, `graph_summarise_enabled True`, **`graph_summarise_model 'mistral-small-latest'`** |
| `worker` (suite) | `workflow_name_prefix ''`, `default_enforce_determinism True`, `deployment_name`, `worker_name` (nom d'hôte), **`max_workflow_task_pollers 5`**, **`max_activity_task_pollers 5`**, **`health_server_host 'localhost'`**, `health_server_port None` |
| `temporal` | `server_url 'localhost:7233'`, `namespace 'mistral-workflows'`, `api_key SecretStr`, `task_queue 'default'`, `tls False`, `http_proxy_target_host` / `_basic_auth_user` / `_basic_auth_pass None` |

Messages au démarrage du worker :
- « Applied worker runtime config [mistralai.workflows.core.config.config_discovery] namespace=bfef89d9-…:9ea04b1a-… **scheduler_url=wf-scheduler.mistral.ai:443 tls=True** ».
  - Les valeurs `temporal.*` locales sont **remplacées par la découverte** de configuration (inférence).
  - ⚠️ L'exemple `whoami` de [12](12-workflows-1-concepts-construction.md) donne `namespace "mistral-workflows"` et `tls false`.
- « Deployment location … location_type=local » ; « creating temporal service client … url=wf-scheduler.mistral.ai:443 » ; « connected to temporal frontend … **payload_codec=MistralWorkflowsPayloadCodec payload_converter=MistralWorkflowsPayloadConverter** ».
- Plugins :
  - « Discovered 0 package(s) at mistral_workflows.plugins plugins=[] » (avril, sans extra) ;
  - « Discovered 1 package(s) at mistralai.workflows.plugins … name='mistralai' » puis « Plugin contributed worker interceptors count=1 plugin=mistralai » (mai).
- « Workflow registered WITHOUT versioning behavior … workflow_name=hello-world ». Un workflow interne **`__parallel_execution__`** est aussi enregistré 🆕.
- « Starting Temporal worker location_type=local namespace=… **task_queue=Xavki** » : la file Temporal porte le **nom du déploiement** 🆕 (cohérent avec `task_queue` déprécié au profit de `deployment_name`, [13](13-workflows-2-interaction-production.md)).

**Activités enregistrées** (« Registered activities activities=[…] ») 🆕 :
- **Toujours** : `__internal_execute_activity_in_batch`, `__internal__emit_workflow_started`, `__internal__emit_workflow_completed`, `__internal__emit_workflow_canceled`, `__internal__emit_workflow_failed`, `__emit_waiting_for_input_started`, `__emit_waiting_for_input_completed`, `__emit_waiting_for_input_failed`, `__internal__persist_task_span_context`, `__internal__emit_task_started`, `__internal__emit_task_in_progress`, `__internal__emit_task_completed`, `__internal__emit_task_failed`.
- **Avec le plugin `mistralai`** (sKEK [14:26], lecture partielle) : `mistralai_create_agent`, `mistralai_start_conversation`, `mistralai_append_conversation`, `mistralai_update_agent`, `mistralai_chat_complete`, `mistralai_chat_stream`, `mistralai_start_conversation_stream`, `mistralai_append_conversation_stream`, `mistralai_chat_parse`, `mistralai_embeddings`, `mistralai_ocr`, `collect_mcp_tools`, `execute_mcp_tool`, plusieurs `__internal__connector_*` (`…_resolve`, `get_auth_url`, `tool_call`, `get_auth_methods`, `list_user_credentials`, `…wait_for_credentials`), `__emit_connector_auth_started`, `__emit_connector_auth_completed`, `__emit_connector_auth_failed`.
- **Puis les activités utilisateur** (`greet` ; `parse_trip`, `search_flights`, `search_topic`, `build_itinerary`).

### 5.10 Erreurs vues

| Contexte | Message exact | Source |
|---|---|---|
| 10 workflows en parallèle sur un compte externe, modèle `mistral-medium-latest` | `mistralai.client.errors.sdkerror.SDKError: API error occurred: Status 429. Body: {"object":"error","message":"Service tier capacity exceeded for this model.","type":"service_tier_capacity_exceeded","param":null,"code":"3505","raw_status_code":429}` 🆕 | bWVf [15:12] |
| Idem, relance | 429 `"message":"Rate limit exceeded","type":"rate_limited","code":"1300"` 🆕 | bWVf [17:54] |
| Conséquence en console | `Errors rate 46 out of 74 62.16%` ; exécutions `Failed` de 43 à 49 s | bWVf [17:52] |
| Streamlit | « Value mismatch between .env file and environment variable… » (outil, hors Mistral) | sKEK [20:58] |

---

## 6. Récapitulatif des nouveautés et contradictions

| # | Constat | Type | Source |
|---|---|---|---|
| 1 | Page d'un workflow : `Deployments`, `Workflow ID`, **`Errors rate`** (n out of N, %), **`Average latency`** ; en juillet **`Connectors`**, **`Recent runs`** | 🆕 | 7TnJ [05:06], bWVf [16:10], c5Xr [12:44] |
| 2 | Actions : `Publish to Le Chat` → `Publish to Vibe` → `Published ▾` ; `Archive Workflow` (grisé) ; `Share` ; `Graph` (badge) | 🆕 | idem, sKEK [24:08] |
| 3 | Carte de déploiement : `Local`, `Active`, `Created`, `Last seen`, `Uptime` | 🆕 | sKEK [14:44] |
| 4 | Liste : colonnes `Name/Status/Last execution/Executions`, `Columns n`, icône pixel, ☆, `Explore Cookbooks` / `Get Started` | 🆕 | sKEK [14:36] |
| 5 | Executions : colonnes `Execution/Workflow/Status/Start Time/End Time/Duration`, nom technique du workflow | 🆕 | sKEK [15:08], [25:42] |
| 6 | Vue d'exécution : URL `?executionId=&run=`, sélecteur de run `(latest)`, `Cancel`, `Live`, `Run again`, mini-carte, `Trace/Task`, `Steps` ou `Trace/Logs`, `Inspector [I]/Metadata [M]` | 🆕 (en partie dans [33](33-videos-console-agents-connecteurs-skills.md)) | 7TnJ, bWVf, sKEK, c5Xr |
| 7 | Input d'une activité affiché en **tableau positionnel** ; étape de connecteur `Auth: Linear` avec `auth_url` | 🆕 | bWVf [16:50], c5Xr [13:22] |
| 8 | `Reset from here` / `View Sub-workflow` absents des écrans réels | ⚠️ [36](36-captures-doc-annonces.md) | — |
| 9 | « Start Workflow » = éditeur JSON prérempli, et non formulaire généré | ⚠️ [12](12-workflows-1-concepts-construction.md) | 7TnJ [05:07] |
| 10 | Page d'un workflow adressée par **UUID**, pas par nom | ⚠️ [12](12-workflows-1-concepts-construction.md), [13](13-workflows-2-interaction-production.md) | 7TnJ, sKEK, bWVf |
| 11 | Sous-entrées du menu Workflows variables : `List/Executions/Deployments` (avril, compte Mistral) contre `List/Executions` (comptes externes) | 🆕 / nuance [33](33-videos-console-agents-connecteurs-skills.md) | 7TnJ [05:03], bWVf, sKEK |
| 12 | Publication : texte de la modale (« all workspace users »), infobulle « Publishing unavailable », toast | 🆕 | sKEK [20:42], [24:04] |
| 13 | Vibe : formulaire d'entrée prérempli `Submit ⌘↵`, panneau `Ongoing/Completed`, « Workflow completed: … », titre auto de conversation | 🆕 | sKEK [24:42–26:04] |
| 14 | Menu `+` de Vibe au 31/05 : `Tools ›`, `Projects ›` présents | ⚠️ / nuance [33](33-videos-console-agents-connecteurs-skills.md), [22](22-vibe-work-le-chat.md) | sKEK [24:21] |
| 15 | Compte gratuit : publication et exécution dans Vibe réussies | ⚠️ / nuance [22](22-vibe-work-le-chat.md) | sKEK |
| 16 | Scaffold : `.agents/skills/workflows` (SKILL.md, 11 guides `.mdx`, `pipeline_pattern.md`, `test_workflow.py`), `src/examples` (3 cookbooks), `discover.py`, `dev_worker.py`, invite finale `vibe` | 🆕 | bWVf [01:40], 7TnJ [01:29] |
| 17 | `pyproject` du scaffold : `mistralai-workflows[mistralai]>=3.0.0,<4` + groupe dev (`watchdog`…) ; guide `migration-v2-to-v3` | 🆕 | bWVf [04:04] |
| 18 | `Makefile` : `installdeps`, `start-worker` (→ `dev_worker.py`), `execute`, `start-examples`, `execute-insurance-claims`, `execute-cargo-release` | 🆕 (en partie dans [12](12-workflows-1-concepts-construction.md)) | bWVf [02:14] |
| 19 | URL de clé imprimée par la CLI : `console.mistral.ai/api-keys` (→ dialogue du workspace, puis Admin) ; commande sans `@latest` | ⚠️ [12](12-workflows-1-concepts-construction.md) | 7TnJ [01:24], bWVf [01:20] |
| 20 | Helpers du plugin : `ChatCompletionRequest`, `SystemMessage`, `UserMessage`, `chat_parse_to_model`, `mistralai_chat_complete` | 🆕 | sKEK [11:34–11:40] |
| 21 | `async with <TodoListItem>:` ; `CanvasPayload.type` (7 littéraux) + `language` | 🆕 | sKEK [21:50], [23:24] |
| 22 | `wait_condition(…, timeout_summary=…)` ; workflow à paramètres multiples + `query` + `signal` | 🆕 | bWVf [08:20] |
| 23 | Historique d'exécution au format Temporal brut (`EVENT_TYPE_ACTIVITY_TASK_SCHEDULED`…) | 🆕 / ⚠️ [12 §3.9](12-workflows-1-concepts-construction.md) | sKEK [16:40] |
| 24 | Config du worker : retries par défaut 3 / ×2.0, pollers 5/5, health server, `allow_multiple_workers`, `workflow_name_prefix`, versioning (`build_id`, `auto_register_as_current`), `deployment_location` (`local`/k8s) | 🆕 | 7TnJ [04:52], sKEK [14:24] |
| 25 | `graph_summarise_model 'mistral-small-latest'` ; `upload_graph False` dans la config de déclenchement | 🆕 / ⚠️ [13 §3.20](13-workflows-2-interaction-production.md) | c5Xr [12:10] |
| 26 | `otel_enabled False` (avril-mai), puis `True` (juillet) | ⚠️ [13 §3.19](13-workflows-2-interaction-production.md) | 7TnJ, sKEK, c5Xr |
| 27 | Scheduler `wf-scheduler.mistral.ai:443` TLS ; `namespace <uuid>:<uuid>` ; `task_queue` = nom du déploiement ; codec `MistralWorkflowsPayloadCodec` | 🆕 / ⚠️ [12](12-workflows-1-concepts-construction.md) (`whoami`) | 7TnJ [04:09], sKEK [14:26] |
| 28 | Nom de déploiement par défaut = nom d'hôte (scaffold d'avril) | ⚠️ [13 §3.11](13-workflows-2-interaction-production.md) (« obligatoire ») | 7TnJ [04:09], bWVf [12:40] |
| 29 | ~40 activités internes enregistrées (`__internal__*`, `mistralai_*`, MCP, connecteurs) et workflow interne `__parallel_execution__` | 🆕 | 7TnJ [04:09], sKEK [14:26] |
| 30 | Erreurs 429 `service_tier_capacity_exceeded` (code `3505`) et `rate_limited` (code `1300`) | 🆕 | bWVf [15:12], [17:54] |
| 31 | Diapos officielles : 4 piliers « Built for production » ; 6 propriétés (Durable, Idempotent, HITL, Observable, Scheduled, Conversational) | 🆕 | 9tXQ [03:30], c5Xr [07:30] |
| 32 | Maquettes de marque (RUN INFO, REGION `eu-west-1`, SDK `1.4.0`, RETRY 1/3, APPROVE/REQUEST INFO) : intentions, pas l'existant | ⚠️ à ne pas prendre pour la console | 9tXQ [02:25–02:53] |

## 7. Questions ouvertes

1. Contenu des onglets `Metadata`, `Task` (avril) et `Logs` (juillet) de la vue d'exécution : aucun n'a été ouvert dans les vidéos.
2. Que montre le bouton `Graph` (juillet) ? S'agit-il du Visualizer de [13 §3.20](13-workflows-2-interaction-production.md) ? Que signifie son badge ?
3. Le menu `⋮` d'une étape contient-il `Reset from here` et `View Sub-workflow`, comme sur la page produit ?
4. La pastille `1` à côté de l'ID d'exécution compte-t-elle les runs (resets) ?
5. Depuis quand la modale « Start Workflow » est-elle un formulaire plutôt qu'un éditeur JSON, si elle l'est devenue ?
6. Le défaut « nom d'hôte » de `DEPLOYMENT_NAME` vient-il du scaffold ou du SDK ? La doc dit que le worker échoue sans cette variable.
7. Pages `Deployments`, `Workers [WIP]` et `Schedules` : jamais ouvertes dans ces six vidéos.
8. `upload_graph False` dans la configuration imprimée en juillet : simple état du processus de déclenchement, ou désactivation réelle du Visualizer chez ce worker ?

---

## Annexe A — Couverture

| Vidéo | Durée | Segment traité | Images brutes (1/2 s) | Distinctes après dédoublonnage | Passes fines (images extraites → distinctes) | Toutes examinées | Copiées |
|---|---|---|---|---|---|---|---|
| `9tXQBnpvVsU` Introducing Workflows | 4:02 | intégral | 121 | 70 (seuil 2,0) | 02:22–02:56 à 1 i/s : 34 | ✅ (planches + zooms) | 5 |
| `7TnJJ0D__kk` Build your first Mistral Workflow | 5:42 | intégral | 171 | 106 (seuil 1,0) | 01:10–01:32 (44→11), 01:32–02:42 (70→17), 02:40–03:56 (76→39), 03:56–05:26 à 2 i/s (180→56) | ✅ | 11 |
| `YQB6bsob6zE` Workflows: Build. Run. Observe. | 1:23 | intégral | 42 | 38 | 00:44–00:54 à 2 i/s : 20 | ✅ | 1 |
| `sKEKJGqTz0U` xavki | 28:07 | 02:20–26:20 (code, Studio, Vibe) | 720 | 303 | 14:38–15:08 (60→25), 20:36–21:26 (50→35), 24:18–25:08 (50→32) | ✅ | 18 |
| `bWVfAn46FcM` Kokori Kodo | 18:14 | 00:30–18:14 (écran en continu) | 532 | 316 | 08:16–08:24 à 4 i/s (32→15) | ✅ | 4 |
| `c5XrvauOjMc` Vultr | 15:36 | 07:20–14:10 (diapo Workflows, démo Vibe et Studio) | 205 | 205 (caméra mobile : peu de doublons) | 12:43–12:47 et 13:48–13:52 à 2 i/s (16) | ✅ (Vibe Work 10:10–12:00 survolé : illisible) | 2 |

- **Non couvert** :
  - xavki 00:00–02:20 et 26:20–28:07 : présentation face caméra et conclusion ;
  - Vultr 00:00–07:20 et 14:10–15:36 : diapos prompts/skills, conclusion ;
  - Kokori 00:00–00:30 : introduction face caméra.
- **Fichiers de travail** : `$SP/videos-workflows/<id>/` (`raw/`, `frames/`, `sheets/`, zooms `z/` et `ui/`), notes par vidéo dans `$SP/videos-workflows/notes/`, code relevé dans `$SP/videos-workflows/code/`.

## Annexe B — Images copiées

Dossier : `sources/videos-images/workflows/` (40 images).

| Image | Contenu |
|---|---|
| [7TnJJ0D__kk_t00m22s](sources/videos-images/workflows/7TnJJ0D__kk_t00m22s.jpg) | Diapo problèmes / réponses de Workflows |
| [7TnJJ0D__kk_t01m29s](sources/videos-images/workflows/7TnJJ0D__kk_t01m29s.jpg) | Fin du `setup` CLI (fichiers créés, « cd my-workflow / vibe ») |
| [7TnJJ0D__kk_t02m24s](sources/videos-images/workflows/7TnJJ0D__kk_t02m24s.jpg) | `hello.py` |
| [7TnJJ0D__kk_t03m16s](sources/videos-images/workflows/7TnJJ0D__kk_t03m16s.jpg) | `discover.py` |
| [7TnJJ0D__kk_t04m09s](sources/videos-images/workflows/7TnJJ0D__kk_t04m09s.jpg) | `make start-worker` : journaux, activités enregistrées |
| [7TnJJ0D__kk_t04m58s](sources/videos-images/workflows/7TnJJ0D__kk_t04m58s.jpg) | Accueil « Mistral AI Studio » et menu d'avril 2026 |
| [7TnJJ0D__kk_t05m03s](sources/videos-images/workflows/7TnJJ0D__kk_t05m03s.jpg) | Liste des workflows, sous-menu List / Executions / Deployments |
| [7TnJJ0D__kk_t05m06s](sources/videos-images/workflows/7TnJJ0D__kk_t05m06s.jpg) | Page « Hello World » (Publish to Le Chat, Errors rate, Average latency) |
| [7TnJJ0D__kk_t05m07s](sources/videos-images/workflows/7TnJJ0D__kk_t05m07s.jpg) | Modale « Start Workflow » (éditeur JSON) |
| [7TnJJ0D__kk_t05m10s](sources/videos-images/workflows/7TnJJ0D__kk_t05m10s.jpg) | Vue d'exécution en cours (Cancel, Live) |
| [7TnJJ0D__kk_t05m11s](sources/videos-images/workflows/7TnJJ0D__kk_t05m11s.jpg) | Vue d'exécution terminée (Trace / Task, Inspector, Output) |
| [9tXQBnpvVsU_t02m14s](sources/videos-images/workflows/9tXQBnpvVsU_t02m14s.jpg) | Graphe animé « cargo release » (maquette) |
| [9tXQBnpvVsU_t02m36s](sources/videos-images/workflows/9tXQBnpvVsU_t02m36s.jpg) | Maquette « AI STUDIO » : RETRYING, RETRY 1/3 |
| [9tXQBnpvVsU_t02m49s](sources/videos-images/workflows/9tXQBnpvVsU_t02m49s.jpg) | Maquette : carte « LE CHAT / APPROVAL REQUIRED » |
| [9tXQBnpvVsU_t02m53s](sources/videos-images/workflows/9tXQBnpvVsU_t02m53s.jpg) | Maquette : run COMPLETE, 5/5 |
| [9tXQBnpvVsU_t03m30s](sources/videos-images/workflows/9tXQBnpvVsU_t03m30s.jpg) | « Built for production » (4 piliers) |
| [YQB6bsob6zE_t00m46s](sources/videos-images/workflows/YQB6bsob6zE_t00m46s.jpg) | Maquette Gantt avec « Waiting for input » |
| [sKEKJGqTz0U_t11m40s](sources/videos-images/workflows/sKEKJGqTz0U_t11m40s.jpg) | `worker.py` : define / entrypoint / gather |
| [sKEKJGqTz0U_t14m26s](sources/videos-images/workflows/sKEKJGqTz0U_t14m26s.jpg) | Journaux du worker (plugin mistralai, activités internes) |
| [sKEKJGqTz0U_t14m36s](sources/videos-images/workflows/sKEKJGqTz0U_t14m36s.jpg) | Liste (colonne Status, Explore Cookbooks, Get Started) et menu de mai |
| [sKEKJGqTz0U_t14m38s](sources/videos-images/workflows/sKEKJGqTz0U_t14m38s.jpg) | Page « Travel Agent X » (Publish to Vibe) |
| [sKEKJGqTz0U_t14m44s](sources/videos-images/workflows/sKEKJGqTz0U_t14m44s.jpg) | Carte du déploiement (Local, Active, Created, Last seen, Uptime) |
| [sKEKJGqTz0U_t15m08s](sources/videos-images/workflows/sKEKJGqTz0U_t15m08s.jpg) | Page « Executions » |
| [sKEKJGqTz0U_t15m46s](sources/videos-images/workflows/sKEKJGqTz0U_t15m46s.jpg) | `chat.py` : `execute_workflow_async`, historique |
| [sKEKJGqTz0U_t20m04s](sources/videos-images/workflows/sKEKJGqTz0U_t20m04s.jpg) | Vue d'exécution avec fan-out (Steps, Inspector) |
| [sKEKJGqTz0U_t20m42s](sources/videos-images/workflows/sKEKJGqTz0U_t20m42s.jpg) | Infobulle « Publishing unavailable » |
| [sKEKJGqTz0U_t21m50s](sources/videos-images/workflows/sKEKJGqTz0U_t21m50s.jpg) | `worker-vibe.py` : InteractiveWorkflow, TodoListItem |
| [sKEKJGqTz0U_t21m56s](sources/videos-images/workflows/sKEKJGqTz0U_t21m56s.jpg) | `worker-vibe.py` : canvas, ChatAssistantWorkflowOutput |
| [sKEKJGqTz0U_t24m04s](sources/videos-images/workflows/sKEKJGqTz0U_t24m04s.jpg) | Modale « Publish to Vibe? » |
| [sKEKJGqTz0U_t24m21s](sources/videos-images/workflows/sKEKJGqTz0U_t24m21s.jpg) | Vibe : menu `+` › Workflows |
| [sKEKJGqTz0U_t24m42s](sources/videos-images/workflows/sKEKJGqTz0U_t24m42s.jpg) | Vibe : « Workflow started » et formulaire d'entrée |
| [sKEKJGqTz0U_t25m20s](sources/videos-images/workflows/sKEKJGqTz0U_t25m20s.jpg) | Vibe : panneau Ongoing / Completed |
| [sKEKJGqTz0U_t25m42s](sources/videos-images/workflows/sKEKJGqTz0U_t25m42s.jpg) | Executions : deux workflows, Running et Completed |
| [sKEKJGqTz0U_t26m04s](sources/videos-images/workflows/sKEKJGqTz0U_t26m04s.jpg) | Vibe : canvas final et « Workflow completed » |
| [bWVfAn46FcM_t01m40s](sources/videos-images/workflows/bWVfAn46FcM_t01m40s.jpg) | Liste des fichiers du scaffold (skills, guides, exemples) |
| [bWVfAn46FcM_t16m10s](sources/videos-images/workflows/bWVfAn46FcM_t16m10s.jpg) | Page `pdf_ocr_workflow` (74 exécutions, Running/Completed/Failed) |
| [bWVfAn46FcM_t16m32s](sources/videos-images/workflows/bWVfAn46FcM_t16m32s.jpg) | Vue d'exécution d'un document (3 activités, structuredContent) |
| [bWVfAn46FcM_t17m52s](sources/videos-images/workflows/bWVfAn46FcM_t17m52s.jpg) | Page après saturation (Errors rate 62.16 %) |
| [c5XrvauOjMc_t12m44s](sources/videos-images/workflows/c5XrvauOjMc_t12m44s.jpg) | Page de juillet 2026 : Share, Graph, Connectors, Recent runs (agrandie) |
| [c5XrvauOjMc_t13m22s](sources/videos-images/workflows/c5XrvauOjMc_t13m22s.jpg) | Vue d'exécution de juillet : Trace / Logs, étape `linear` (agrandie) |
