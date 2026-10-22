# 36 — Captures d'écran et schémas publics : documentation, annonces, page produit, centre d'aide, GitHub

> **État au 21/10/2026.** Inventaire de **toutes les images publiques** qui montrent l'interface ou l'architecture de Mistral Studio, de Vibe et de l'Admin, trouvées dans : la documentation (`docs.mistral.ai`), les annonces `mistral.ai/news` liées à la plateforme, la page produit Studio (EN et FR), le centre d'aide (`help.mistral.ai`) et les README GitHub (`mistral-vibe`, `cookbook`). Chaque image a été téléchargée puis regardée (zooms Pillow pour les détails, rendu des SVG). Faits uniquement ; « (inférence) » signale une déduction ; 🆕 = absent de la base existante ; ⚠️ = contredit la base ou le texte de la page qui contient l'image. Aucun prix n'est traité.
> Point de comparaison principal : [00-synthese §4](00-synthese.md#4-la-console--écrans-menus-parcours) et [30 §4](30-video-pentiminax-agents-sans-coder.md) (console du plan gratuit, juillet 2026).

## Sommaire
1. [En bref](#1-en-bref)
2. [Méthode et sources](#2-méthode-et-sources)
3. [Tableau des images examinées](#3-tableau-des-images-examinées)
4. [Inventaire consolidé par écran et par brique](#4-inventaire-consolidé-par-écran-et-par-brique)
5. [Nouveautés 🆕 et contradictions ⚠️](#5-nouveautés--et-contradictions-️)
6. [Questions ouvertes](#6-questions-ouvertes)
- [Annexe A — Les 40 images copiées](#annexe-a--les-40-images-copiées)
- [Annexe B — Couverture](#annexe-b--couverture)

---

## 1. En bref

1. **Peu de vraies captures de la console dans la doc.** Sur 104 images téléchargées depuis `docs.mistral.ai`, seules **2** montrent la console Studio (clés API) et **5** la CLI Vibe ; toutes datent d'**octobre 2025** (date « October 31st, 2025 » dans le sélecteur, `Mistral Vibe v0.1.0`) et **contredisent le texte actuel** qui les entoure (champ `Connector access scope` absent, 3 choix d'approbation au lieu de 4, URL de clé obsolète). Le reste : 15 schémas SVG récents (Admin, Workflows, audio, Vibe Code Web), 20 captures des **composants de workflows conversationnels** (Vibe Work), 28 illustrations « pixel » (agents, outils, OCR) et leurs 14 variantes sombres, 20 graphiques pédagogiques.
2. **Les annonces révèlent trois générations de la console** : (a) la console « La Plateforme » d'oct. 2025 (menu *Create / Improve / Context / Code / Docs*) ; (b) **« AI Studio » d'oct. 2025** avec **`Agent Workflows`**, **`Observe`**, **`Evalute`** [sic] › `Datasets`/`Judges`/`Experiments`, `Fine-tune`, `Context › Manage` 🆕 ; (c) la console de **juillet 2026** en rail d'icônes avec un écran **`Evaluations` `Preview`** complet 🆕.
3. **Évaluations (juillet 2026) — premier écran public** 🆕 : projet `Rapid Due Diligence`, sections d'évaluation, colonnes de scores avec sparklines (`avg. σ`), popover **`System Parameters`** où figurent les **versions de prompts par alias** (`prompt_financial staging (v8)`) : la capture relie Prompts registry, Évaluations et managed deployments (`studio-demo-managed-worker`).
4. **Observabilité d'oct. 2025 — écran `Chat details`** 🆕 : panneau latéral `Feed` / `Properties`, blocs `User` / `Assistant` / `Tool`, appels `web_search` en JSON avec `metadata.integration_id`, mini-chronologie d'icônes pour naviguer dans la conversation.
5. **Page `Judges` (oct. 2025)** 🆕 : « Manage your LLM judges and evaluate your models. », colonnes `Name / Description / Type / Instructions`, types **`Classification`** et **`Regression`** (cohérent avec l'enum `CLASSIFICATION`/`REGRESSION` de la spec, [14](14-observabilite-evaluations.md)).
6. **Workflows en console** 🆕 : liste de workflows avec bouton ▷ et **`Execution History`** (oct. 2025) ; **vue d'exécution en chronologie** (page produit) avec `Run Again`, **`Reset from here`**, `View Sub-workflow`, onglets `Inspector` (I) / `Metadata` (M), liste `Steps`, sortie JSON. Schémas doc : mode hybride (workers chez le client, orchestrateur chez Mistral), modèle mental Execution/Event ↔ Worker/Activity, séquence OAuth des connecteurs.
7. **Workflows conversationnels : 20 captures** qui donnent le rendu exact dans Vibe Work (thème sombre) : carte de saisie avec micro, barre de statut (nom du workflow + étape + ⏸ + ■), formulaires avec bouton **`Submit ⌘↵`**, erreurs de validation (`must be < 100`), confirmations **`Yes, proceed ⌘↵` / `Cancel ⌘D`**, états d'outils (`Edited 3 files +2 −1`, `Tool Grep`, commande `Failed`) 🆕 (détails visuels).
8. **Connecteurs** : schéma « Custom MCP vs Built-in connector » (outils `open_email`, `draft_email`, `search_inbox`), boucle humain-dans-la-boucle en 5 étapes, et **contrôle par workspace et par outil** (Linear `Search`/`Read`/`Create` activés ou non, Salesforce désactivé dans un workspace) ; 64 logos de connecteurs dans l'annonce du 24/06/2026.
9. **Page produit** : maquette d'accueil avec une carte **`Govern`** (`Observe` / `Explore` / `Evaluate`) 🆕, absente de l'accueil du plan gratuit ; menu **`Build`** (`Models, Agents, Datasets, Workflows, Libraries, Connectors, Prompts, Skills`) pour l'« AI registry » ⚠️ (ne correspond pas aux groupes *Créer/Contexte* observés) ; `Version history` ; arbre de traces `QA-Chatbot`.
10. **Architecture** : la « marketecture » d'AI Studio (oct. 2025) en 3 couches (**AI Builder Toolkit** : AI Registry / Agent runtime & orchestration / AI Observability ; **AI Foundation** ; **Infrastructure & execution**) sur 4 cibles de déploiement (*On-prem and Edge, Private Cloud, Serverless, Mistral Compute*) 🆕 ; dès juin 2025, Mistral Compute présentait **« AI Studio » et « Private AI Studio »** comme couches de son offre 🆕.

---

## 2. Méthode et sources

| Source | Méthode | Résultat |
|---|---|---|
| Copie locale `docs.mistral.ai_llms-full.txt` (422 pages) | Extraction de toutes les références `![alt](…)`, `<img src>` et chemins `/img/…`, `/assets/…` par page | 115 références distinctes |
| HTML en ligne des pages `admin/`, `getting-started/`, `studio/`, `vibe/` (312 pages) | Téléchargement, extraction des `<img>/<video>/<source>` hors décor (sprites `grass_tile`, chat, soleil) | Aucune image absente du .md, sauf 3 logos produits et 1 icône de modèle |
| HTML des 145 pages du sitemap absentes du `llms-full` (dont 135 pages `resources/cookbooks/…`, `developers/…`, `le-chat/…`) | Même extraction | 61 images de cookbooks (surtout outils tiers), 18 images en `data:` (sorties de notebooks) |
| 33 annonces `mistral.ai/news` (HTML local du 21/10/2026) liées à Studio, Workflows, Connectors, Prompts & Skills, Observabilité, Search/Libraries, Vibe, Forge, Compute, Agents, Code, Document AI, audio | Extraction de la plus grande variante `srcset` (1 920 px), SVG via le CDN `mistral.ai/cms-media` (le CDN `cms.globalaegis.net` renvoie 403) | 262 références ; 125 images téléchargées |
| Page produit `/products/studio` (EN et FR) + `/products/vibe`, `/products/vibe/code`, `/products/forge` | Même extraction ; SVG des « heros » rendus, images raster intégrées extraites | 74 images ; EN et FR utilisent **les mêmes images** |
| Centre d'aide `help.mistral.ai` (7 collections, 43 articles EN) | Extraction des pièces jointes Intercom | 14 captures (Vibe/Le Chat et compte), **aucune capture Studio ou Admin** |
| README GitHub `mistralai/mistral-vibe` et `mistralai/cookbook` (raw) | Recherche d'images | Aucune capture (4 badges dans le README Vibe ; 0 image dans le README cookbook) |
| Vidéos YouTube intégrées aux annonces (49 ID distincts) | Non traitées ici (couvertes par [31](31-autres-videos.md) et les agents vidéo) | Liste en annexe B |

Rendu : SVG convertis en PNG (ImageMagick, après réintégration du CSS) ; agrandissements par recadrage Pillow. Base des URL : `https://docs.mistral.ai` pour la doc, `https://mistral.ai` pour annonces et page produit (paramètre `?dpl=…` omis).

---

## 3. Tableau des images examinées

### 3.1 Documentation `docs.mistral.ai`

**a) Captures d'interface (console Studio, CLI Vibe)**

| Image (URL) | Page source | Ce qu'elle montre | Copie |
|---|---|---|---|
| `/assets/quickstarts/studio/new-key-button.png` | getting-started/quickstarts/studio/activate-and-generate-api-key | Modale de workspace **`💼 My Workspace ⇕`**, onglets **`General` / `API Keys` / `Usage` / `Members 1`**, boutons **`See more ⤢`** et **`Done`** ; état vide « You have no API key yet » / « Generate one to start using the API. » + bouton **`Create new key`**. En fond, ancien menu : `Home`, `W(orkspace)`, `A(PI keys)` ; *Create* `Pl…`, `A…`, `B…` ; *Improve* `Fi(ne-tune)` ; *Conte(xt)* `Fi(les)` ; *Code* `C…` ; *Docs* `Documentation`, `API`, `Cookbooks` | [36-01](sources/images/36-01-doc-studio-workspace-api-keys.png) |
| `/assets/quickstarts/studio/new-key-modal.png` | idem | Modale **`Create new key`** : « Generate an API key for authenticating with our API. Please note that your API keys are confidential and not shared within your organization. » ; champ **`Key name`** (`My API Key`, *Optional*) ; **`Expiration`** « You have the option to schedule an automatic expiration for your key at a future date. » (sélecteur `October 31st, 2025`, *Optional*) ; `Cancel` / `Create new key` | [36-02](sources/images/36-02-doc-studio-create-new-key.png) |
| `/assets/quickstarts/vibe/home.png` | getting-started/quickstarts/vibe-code/install-cli | Terminal `vibe` : « Welcome to **Mistral Vibe** - Let's get you started! » / « Press Enter ↵ » | — |
| `/assets/quickstarts/vibe/api-key.png` | idem | « One last thing… » « Grab your Mistral API key from the Mistral AI Studio: → `https://console.mistral.ai/codestral/vibe` » ; champ masqué (bordure verte) ; « Press Enter to submit ↵ » ; lien `github.com/mistralai/mistral-vibe…#configuration` | [36-03](sources/images/36-03-doc-vibe-cli-api-key.png) |
| `/assets/quickstarts/vibe/query.png` | idem | Bandeau : logo pixel, **`Mistral Vibe v0.1.0`**, `devstral-2`, **`3 models · 0 MCP servers`**, chemin du projet, « Type `/help` for more information » ; à droite **`▶ auto-approve off (shift+tab to toggle)`** ; invite `>` ; pied : chemin + **`0% of 100k tokens`** | [36-04](sources/images/36-04-doc-vibe-cli-accueil.png) |
| `/assets/quickstarts/vibe/demo.png` | getting-started/quickstarts/vibe-code/scaffold-a-project | Outil `grep: 'python'` « Found 0 matches (ctrl+o to expand.) » ; « Writing file… (7s esc to interrupt) » ; encadré **`⚠ write_file command`** / `File: hello.py` / aperçu du code ; choix **`1. Yes` · `2. Yes and always allow write_file this session` · `3. No and tell the agent what to do instead`** ; « ↑↓ navigate · Enter select · ESC reject » ; `4% of 100k tokens` | [36-05](sources/images/36-05-doc-vibe-cli-approbation.png) |
| `/assets/quickstarts/vibe/results.png` | idem | Résumé de l'agent, puis `bash(command='python3 hello.py', timeout=None)` « Success (ctrl+o to expand.) » ; invite `> Ask anything...` ; `5% of 100k tokens` | — |

**b) Schémas d'architecture SVG (récents, style sobre orange/gris)**

| Image | Page source | Ce qu'elle montre | Copie |
|---|---|---|---|
| `/img/admin_overview.svg` | admin/overview | **Admin Console** (« control surface ») —Manages→ **Organizations** (« Company account · policies · billing · security ») —Manage→ **Members** (« Role-Based Access Control · Seats ») ; Organizations —Scope resources→ **Workspaces** (« Teams · products · budgets ») ; Members —Use→ Workspaces ; Workspaces → **Vibe** et **Studio** ; **Admin API** (« Programmatic control ») relié en pointillés à Console, Organizations, Members, Workspaces | [36-06](sources/images/36-06-doc-admin-overview.png) |
| `/img/admin_enterprise_hierarchy.svg` | admin/set-up-organization/enterprise-accounts | **Enterprise Account** (« links Organizations ») → Organization #1 / #2 (« settings, members, billing ») → Workspace #1 / #2 | [36-07](sources/images/36-07-doc-admin-enterprise-hierarchy.png) |
| `/img/workflows_hybrid_mode.svg` | studio/workflows/getting-started/overview | **YOUR ENVIRONMENT** : « Your code » (workflow code + activity code, in your repo) et « Local development » (your laptop, running workers) — « workers run here » ; frontière « — API + UI (border) — » ; **STUDIO ENVIRONMENT** : « Mistral Workflows API » (REST + streaming + Studio UI) au-dessus de l'« Orchestrator » (state · history · task dispatch · scheduling) | [36-08](sources/images/36-08-doc-workflows-hybrid-mode.png) |
| `/img/workflows_mental_model.svg` | studio/workflows/getting-started/core_concepts | **Workflows API › EXECUTION** (Event, Event, …) ; « workers connect outbound » ; **Worker › WORKFLOW** (Activity, Activity, …) | [36-09](sources/images/36-09-doc-workflows-mental-model.png) |
| `/img/workflows_connector_oauth_flow.svg` | studio/workflows/building-workflows/connectors | Séquence Client / Worker / Mistral API : start workflow → « interceptor resolves slots » → get auth URL → OAuth URL → **`auth_url` event** vers le client → « user completes OAuth in browser » → poll credentials → credentials found → « workflow entrypoint runs » → workflow result | [36-10](sources/images/36-10-doc-workflows-connector-oauth-flow.png) |
| `/img/vibe_code_web_agent_loop.svg` | vibe/code/vibe-code-web/sessions | Boucle **Read** (files in scope) → **Plan** (next action) → **Act** (edit or run a command) → **Report** (activity stream) → **Ask** (wait for reply) ; « continue until natural stop, question, or limit reached » | [36-11](sources/images/36-11-doc-vibe-code-web-agent-loop.png) |
| `/img/voice_agent_pipeline.svg` | studio/audio/voice-agents/overview | **Your application** (Python, Node.js, or a browser page) : Microphone, Client tools (your functions), Speaker ; **Mistral** (« Models and voice from the agent's configuration ») : Transcription (and end of turn) → Model (writes the answer) → Speech (in the agent's voice) ; **Server tools** (built-in, connectors) | [36-12](sources/images/36-12-doc-voice-agent-pipeline.png) |
| `/img/audio_latency_by_mode.svg` | studio/audio/concepts/latency | 4 chaînes : Offline request (Send input → Process all of it → Complete result) ; Realtime transcription (Word spoken → Streaming delay → Network → Text arrives) ; Speech generation (Send text → First chunk → Player buffer → First sound) ; Voice agent turn (User stops → **End of turn** → Model and tools → Speech → First sound) | — |
| `/img/voice_agent_turn_latency.svg` | idem | User stops speaking → End of turn → Transcript → Model → Tools (when called) → Speech ; « **Filler plays** » pendant les outils ; mesures « First sound, when a filler plays » et « Useful answer » | — |
| `/img/audio_offline_or_realtime.svg` | studio/audio/concepts/offline-and-realtime | Arbre : « Is the input complete before you send it? » Oui → **Offline** (« One request, one complete result » ; « Need it sooner? Stream the response. ») ; Non → « Does your app answer back by voice? » Oui → **Voice agents** ; Non → **Realtime** | — |
| `/img/audio_turn_timeline.svg` | studio/audio/concepts/turns | Chronologie User speaks / Pause / Speaks again / Silence ; événements Start, Eager end (« Reply started, then dropped »), Resume, Eager end (« Reply ready sooner »), End (turn confirmed) | — |
| `/img/audio_turn_state_machine.svg` | studio/audio/speech-to-text/turn-detection | États Waiting → User speaking → Probably finished ; transitions `turn.start` (score > `start_threshold`), `turn.eager_end` (< `eager_end_threshold`), `turn.resume`, `turn.end` (< `end_threshold` après `min_silence_ms`, ou pause atteignant `end_timeout_ms`) | — |
| `/img/audio_realtime_session_lifecycle.svg` | studio/audio/speech-to-text/transcribe-in-realtime | Open (connect with the model and your API key → `session.created`) ; Configure (`session.update` → `session.updated`) ; Stream (répété : `input_audio.append` → `transcription.text.delta`) ; Finish (`input_audio.end` → `transcription.done`) | — |
| `/img/audio_realtime_client_auth_flow.svg` | studio/audio/deprecated/speech_to_text/realtime_transcription/client_auth | Browser → Your server : request realtime token ; serveur ↔ Mistral : `POST /v1/client/sessions` → jeton `rt_*` ; retour `client_secret.value` au navigateur ; WebSocket `WSS /v1/audio/transcriptions/realtime` avec `Sec-WebSocket-Protocol` | — |
| `/img/audio_speech_to_speech_pipeline.svg` | studio/audio/deprecated/overview | Speech in → Voxtral Realtime (transcribe) → LLM (reason over transcript) → Voxtral TTS (speak the reply) → Speech out | — |
| `/img/audio_telephony_inbound_flow.svg` | studio/audio/voice-agents/telephony | Caller (dials your number) → Your SIP system (carrier, PBX, or contact center) → **Mistral SIP endpoint** (finds the agent for the number) → **Your saved agent** (answers the caller) | — |

**c) Workflows conversationnels (captures du rendu dans Vibe Work, `/img/conversational_workflows/…`)**

| Image (`conversational-workflow_…`) | Page source | Ce qu'elle montre | Copie |
|---|---|---|---|
| `getting-started_greeting-workflow.png` | …/conversational_workflows | Message assistant « Hello! I'm here to help you get started. What's your name? » ; carte de saisie : libellé « What's your name? », placeholder **`Type your response`**, bouton micro orange ; barre basse **`⏸ Greeting`** (nom du workflow) + `›` + bouton **■** (arrêt) | [36-13](sources/images/36-13-doc-cw-greeting-chatinput.png) |
| `chat-input.png` | idem | `ChatInput` avec suggestions numérotées : « Do you approve or reject this expense? Please explain. » `1 Yes, approve this expense` · `2 Reject` · `3 Type your own response` (+ micro) ; barre `⏸ Documentation demo` · `Validate expense` | [36-14](sources/images/36-14-doc-cw-chatinput-suggestions.png) |
| `structured-form-input_expense-form.png` | …/forms_and_confirmations | Formulaire : `Expense description`, `Amount in USD`, `Expense category` (liste), `Date of expense` (jj/mm/aaaa), `Reimbursement due date` (jj/mm/aaaa, --:--), `Receipt ID` avec aide regex `^RCP-\d{6}$` ; bouton **`Submit ⌘↵`** ; flèche de défilement ; même barre de statut | [36-15](sources/images/36-15-doc-cw-formulaire-expense.png) |
| `text-field.png` | idem | `Your name` pré-rempli `John Doe` ; `Email address` avec aide `^[\w.-]+@[\w.-]+\.\w+$` | — |
| `number-field.png` | idem | `Amount` 100 ; `Price` 9999 avec erreur rouge **`must be < 100`** | — |
| `datetime-field.png` / `date-field.png` | idem | `Schedule date and time` 15/01/2025, 10:00 ; `Schedule date` 15/01/2025 (icône calendrier) | — |
| `single-choice-field_priority.png` / `…_status.png` | idem | Listes déroulantes : `Select priority` (Low / Medium ✓ / High Priority) ; `Status` (pending / approved / rejected) | — |
| `multi-choice-field_tags.png` / `…_colors.png` | idem | Multi-sélection : `Select applicable tags` (Frontend ✓, Backend ✓, Infrastructure) ; `Pick colors` (red, green ✓, blue ✓) | — |
| `file-field_document.png` / `file-field_attachements.png` | idem | `Upload a document` (`some-file.txt` ✕) ; `Upload files` (2 fichiers + **`+ Add more files`**) | — |
| `confirmation.png` | idem | `ConfirmationInput` : « What is your favorite type? » boutons `Fire` `Water` `Grass` `Electric` | — |
| `accept-decline-confirmation.png` | idem | « Do you want to proceed with this action? » **`Yes, proceed ⌘↵`** / **`Cancel ⌘D`** | — |
| `rich-ui-component_report.png` | …/tool_ui | « Here is your report: » carte `Summary`, `Score: 0.82`, badge `Pass` | — |
| `rich-ui-component_nesting-with-charts.png` | idem | Deux cartes côte à côte : `Revenue` (courbe Jan–Mar) et `Distribution` (barres A/B/C) | [36-16](sources/images/36-16-doc-cw-composants-charts.png) |
| `file-tool-ui-state.png` | idem | **`Edited 3 files +2 −1`** : `new.py +1` (diff), `main.py +1 −1` (old/new content), `old.py deleted` | [36-17](sources/images/36-17-doc-cw-file-tool-state.png) |
| `generic-tool-ui-state.png` | idem | Carte **`Tool Grep`** : `Arguments` (`pattern "TODO"`), `Response` (`matches [...]`), coche verte ; carte `Tool Bash` en échec (croix rouge) | [36-18](sources/images/36-18-doc-cw-generic-tool-state.png) |
| `command-tool-ui-state.png` | idem | `> pytest` « All tests passed » ; `> invalid-command` « Command not found » + **`⊗ Failed`** ; boutons copier | [36-19](sources/images/36-19-doc-cw-command-tool-state.png) |

**d) Illustrations « pixel » (agents, outils, conversations, Document AI)**

| Image | Page source | Ce qu'elle montre | Copie |
|---|---|---|---|
| `/img/agent_overview.png` | studio/agents/introduction | Illustration « Agents » (logos M avec outils, terminal, globe) | — |
| `/img/tools_graph.png` | studio/agents/agent-tools | Question → « Agent with Tools » → losange **Choice** → Call Tool → Tools (globe, base de données, bras robot) → Response from Tool → … → Provide an Answer → Answer | — |
| `/img/built_in_graph.png` | idem | Même boucle dans un cadre **« API Built-in »** : « Agent with Built-In Tools » (Websearch, Image Generation, Code Interpreter, …) | [36-20](sources/images/36-20-doc-agents-built-in-tools.png) |
| `/img/code_interpreter_connector.png`, `image_generation_connector.png`, `websearch_connector.png` (agents/agent-tools/…), `document_library_connector.png` (search/libraries) | 4 pages d'outils | Même gabarit : Question → agent ⇄ outil → sortie « Answer + Code & Result » / « + Images » / « + References » / « + References » | — |
| `/img/agent_generated.png` | agents/agent-tools/image_generation | Exemple de sortie : photo de chat généré | — |
| `/img/handoffs.png` | studio/agents/handoffs | Task → agent → « Answer or Handoff task » → agent suivant (web, code…) → Answer | — |
| `/img/multiple_agents_handoffs.png`, `responsibilities_handoffs.png`, `examplea_handoffs.png`, `exampleb_handoffs.png` | idem | Équipe d'agents finance (calculatrice, banque, pièces, globe, graphique) ; arbre de délégation ; deux parcours colorés (« Did my job, handing over ») vers « Answer » | — |
| `/img/chat_completions.png` | studio/conversations/chat-completion | Dialogue alterné assistant / utilisateur | — |
| `/img/_reasoning_graph.png` | studio/conversations/reasoning | Question → [Thinking → Answering] (« Reasoning ») → Answer & Reasoning | — |
| `/img/fc_steps.png` + `fc_step1…5.png` | studio/conversations/function-calling | 5 étapes : system prompt + définitions d'outils (`retrieve_payment_status`, `retrieve_payment_date`) → requête « What's the status of my transaction T1001? » → `tool_calls` JSON → résultat `{"status":"Paid"}` → réponse finale | — |
| `/img/document_ai_overview.png` | studio/document-processing/overview | « Document AI » : Data Extraction, OCR, Data Annotation, … | — |
| `/img/basic_ocr_graph.png` | …/basic_ocr | Document → OCR → Markdown Output, Image BBox Extraction (`IMG-0`, `IMG-1`), `TBL-0` (HTML), « Headers, Footers, Tables… and more » | — |
| `/img/ocr_annotations_explanation.png` | …/annotations | Document → **OCR Annotations** → Markdown Output, Extracted Images BBox, **Document Annotation** (JSON), **BBox Annotation** (JSON par image) | — |
| `/img/ocr_annotations_workflow.png` | idem | « Annotations Workflow » : Documents → OCR (OCR Output) ; « Extracted Text » + « ≤8 First BBoxes » + formats (Document Annotation Format, BBox Annotation Format) → **LLM w/ Vision** → Document Annotation / BBox Annotation ; légende OCR / BBox / Document Annotation Workflow | [36-22](sources/images/36-22-doc-ocr-annotations-workflow.png) |
| `/img/document_qna.png` | …/document_qna | « Document QnA with {model} » : document + question ; OCR → Markdown → {model} ; images extraites transmises **seulement si {model} a la vision**, sinon « the extracted images are discarded » | [36-21](sources/images/36-21-doc-document-qna.png) |
| `/img/embedding_graph.png` | studio/knowledge-rag/embeddings | « Embeddings » : Embed, Search, Cluster | — |
| `/img/img-1.jpeg` | …/annotations | Exemple d'image extraite (graphique Pixtral 12B vs concurrents) | — |
| 14 variantes `*_dark.png` / `_reasoning_graph-dark.png` | mêmes pages | Versions thème sombre des 14 illustrations ci-dessus : contenu identique (vérifié en planche) | — |

**e) Graphiques pédagogiques (hors interface)**

| Image | Page source | Contenu |
|---|---|---|
| `/img/barplot.png`, `top_barplot.png`, `top_barplot_black.png`, `top_barplot_final.png` | inference/sampling | Probabilités de tokens (Dragon, Un, Drag…) selon la température, effet de `top_p` |
| `/img/guides/embeddings1-3.png`, `tsne_codestral-embed.png`, `tsne_dataset-codestral-embed.png` | knowledge-rag/embeddings/text_embeddings, code_embeddings | Tableaux d'embeddings, nuages t-SNE (maladies ; algorithmes Two Sum, BFS…) |
| `/img/audio.png` | studio/audio/deprecated/speech_to_text | Audio + texte → logo → transcription |
| `/img/stories/*.png` (9 : `tak_architecture_diagram`, `performance_metrics`, `rag`, `test`, `latency`, `results_bsard`, `bsard_curves`, `legal_quality`, `eurlex_curves`) | resources/deprecated/customization | Études de cas fine-tuning (phospho, BSARD, EURLEX) : courbes de perte, latences, architecture d'agent « Tak » (TaskManager, IsNews, Web/News Researcher, Writer) |

### 3.2 Annonces `mistral.ai/news`

| Image (`https://mistral.ai` + chemin) | Annonce (date) | Ce qu'elle montre | Copie |
|---|---|---|---|
| `/_astro/59272ab1-…_Llvpu.webp` (alt « Marketecture AI Studio ») | ai-studio (24/10/2025) | « AI Studio » : **AI Builder Toolkit** = **AI Registry** (Models · Agents · Connectors · Guardrails · Datasets · Prompts · Arbitrary executables) / **Agent runtime & orchestration** (Agent SDK · State & memory · Execution pipelines) / **AI Observability** (Judges · Campaigns · Evals · Annotation · Synthetic data) ; **AI Foundation** = Training stack (Frontier foundation models · Adaptive pre-training · Post-training) / Inference stack (Runtime · APIs · QoS · I/O & Modality-handling) ; **Infrastructure & execution** (Scheduling · Runtime · Resource management · Security & Compliance) ; socle **On-prem and Edge · Private Cloud · Serverless · Mistral Compute** | [36-23](sources/images/36-23-news-ai-studio-marketecture.png) |
| `/_astro/4a877207-…_Z1vjJ8y.webp` (« Observability ») | idem | Barre noire (`…space ⇕`, `Search ⌘K`, avatar) ; à gauche un tableau (colonne `Prompt`, modèles `…m-2508-lightspeed` / `…m-2508`, prompts en 8 langues) ; panneau **`Chat details ⧉`** horodaté (`October 9th 18:26:06.365`), flèches ⌃⌄, ✕, onglets **`Feed` / `Properties`** ; blocs `User`, `Assistant` (bouton `</>`), deux blocs repliables **`Web Search`** avec JSON `{"function": {"arguments": "{query, start_date, end_date}", "name": "web_search"}, "id", "index", "metadata": {"integration_id": "int_…"}, "type": "function"}` ; bloc `Tool` listant 10 résultats avec liens externes ; rail d'icônes (utilisateur/assistant/outil) pour naviguer | [36-24](sources/images/36-24-news-ai-studio-observability-chat-details.jpg) |
| `/_astro/9493d519-…_2tMK6z.webp` (« Agent Workflow ») | idem | Barre : **`AI Studio ▾`**, repli du menu, `M Mistral AI`, `Default Workspace ⇕`. Menu : `Home`, `Workspace`, `API Keys` ; *Create* `Playground`, `Agents`, **`Agent Workflows`** (actif), `Batches` ; *Improve* `Observe`, **`Evalute`**, `Fine-tune` ; *Context* `Manage` ; *Docs* `Documentation`, `API`, `Cookbooks`. Page **`Workflows`** : colonne `▷ Workflows` avec cartes `RetrievalWorkflow`, `RAGWorkflow` (sélectionné), `IngestionWorkflow`, `IngestionAllDbWorkflow`, `DeleteAllDocumentsWo…` (sous-titre `Workflow`, bouton ▷) ; panneau **`Execution History - RAGWorkflow`**, `Search executions...`, exécutions (pastille verte, ID `8df58c56675f58f8 …`, `Started:` / `Ended:` au format `10/21/2025, 2:59:09 PM`) | [36-25](sources/images/36-25-news-ai-studio-agent-workflows.jpg) |
| `/_astro/546449b9-…_ZkdWSE.webp` (« Agents ») | idem | Même menu, *Evalute* déplié : **`Datasets`**, **`Judges`** (actif), **`Experiments`**. Page **`Judges`** « Manage your LLM judges and evaluate your models. », `Filter judges...`, colonnes `Name` / `Description` / `Type` / `Instructions` ; 13 juges (`listbench_test`, `Fact extractor judge`, `Cooking Prompt Judge`, `Response Quality & Helpfulness Judge`, `Named Entity Extraction`, `Ambiguity Classifier`…) de type **`Classification`** (vert) ou **`Regression`** (orange), instructions « Rate from 0 to 10 »… | [36-26](sources/images/36-26-news-ai-studio-judges.jpg) |
| `/_astro/connector-1_H3b2Y.webp` | connectors (22/05/2026) | Agent → **Custom MCP** (Tool 1, Tool 2, …) → Internal system ; Agent → **Built-in connector** (`open_email`, `draft_email`, `search_inbox`, …) → Outlook, GitHub, SharePoint | [36-27](sources/images/36-27-news-connectors-custom-vs-builtin.png) |
| `/_astro/connector-2_1Ia1va.webp` | idem | Boucles humain-dans-la-boucle : [1] Request (User → Agent/LLM) ; [2] Call tool (input generated by LLM) ; [3] Delegate tool result to user (Loop 2) ; [4] Provide tool result (confirmation / data) ; [5] Give a response based on tool input & result | [36-28](sources/images/36-28-news-connectors-human-in-the-loop.png) |
| `/_astro/media-connectors_Z1KXkTd.webp` | more-control-over-connectors (24/06/2026) | **Workspace 01** : Linear ● (`Search` ✓, `Read` ✓, `Create` ⊘ grisé), Salesforce ● vert ; **Workspace 02** : Linear (Search, Read, Create ✓), Salesforce ● **rouge** (grisé) | [36-29](sources/images/36-29-news-connectors-controle-par-workspace.jpg) |
| `/_astro/cover-connector-1_Zx93lD.webp` + 128 logos `connector-<nom>-black/white` | idem | Bandeau de logos ; 64 connecteurs illustrés (amplitude, apify, asana, atlassian, bigquery, biorender, box, brevo, bria, bright, clockwise, close, cloudflare-developer-platform, cloudinary, databricks, datagouv, deepwiki, fireflies, github, gmail, google-calendar, google-drive, hex, hubspot, hugging-face, intercom, jina, kensho, linear, mdn, mermaid, microsoft-learn, monday, morningstar, n8n, needle, netlify, notion, outlook, outlook-calendar, paypal, pigment, pinecone, plaid, prisma-postgres, pubmed, salesforce, scholar-gateway, sentry, servicenow, sharepoint, slack, snowflake, square, stripe, stytch, supabase, synapse, tavily, trivago, vantage, website-publisher, workato, zapier) | — |
| `/_astro/pasted-image_1jTeHE.webp` | manage-prompts-and-skills-in-studio (09/07/2026) | Console 2026 en **rail d'icônes** ; barre : logo, `S Sam Personal`, `D Default Workspace ⇕`, `Feedback`, `Search ⌘K`, avatar. Page **`Evaluations`** badge **`Preview`**, sélecteur de projet **`Rapid Due Diligence ⇕`**, boutons **`Share`** et **`Manage ✎`**, `Search evaluations...` ; section **`Expert Scoring Analyses`** (`Last update: 27 Jun, 00:23`) : colonnes `Name 26 Runs`, `Properties System, Metadata, Tags`, `Created Date`, 6 métriques (`financial_cov…`, `regulatory_c…`, `strategic_co…` avec sparklines ; `financial_sco…`…), `Owner 1 Author` ; lignes `attempt-26…22`, étiquette `studio-demo-managed-worker`, `4 Metadat…`, valeurs `0.83 avg. σ 0.12` ; popover **`System Parameters`** (copiable) : `n_scoring 1`, `kb_context true`, `judge_model mistral-small-latest`, `dataset_name Studio Demo M&A Eval Dataset`, `n_generations 1`, `judge_financial/strategic/regulatory inline`, **`prompt_financial staging (v8)`**, **`prompt_strategic staging (v7)`**, `workflow_variant prompted`, **`prompt_regulatory staging (v7)`** (encadré rouge) ; `→ See all runs (26)` ; seconde section `First-pass analyst quality` (12 runs `workflow-2026060…`) | [36-30](sources/images/36-30-news-prompts-skills-evaluations.png) |
| `/_astro/Thumbnail-Skillsandprompts-1_10laEh.webp` | idem | Vignette décorative (fioles, bulles) | — |
| `/_astro/search-api-1_ZWCkTP.webp` | search-toolkit (28/05/2026) | ENTERPRISE DATA (PDF FILES, HTML) → **SEARCH TOOLKIT – INGESTION** (INFORMATION EXTRACTION → PDF PROCESSOR → EMBEDDER avec MISTRAL OCR / MISTRAL EMBED ; ENTITY EXTRACTION WITH DOC AI → HTML PROCESSOR → EMBEDDER) → **SEARCH INDEX** (store vectors, perform search) → **SEARCH TOOLKIT – RETRIEVAL** (HYBRID RETRIEVAL, BM25 RETRIEVAL) → AGENT USE | [36-31](sources/images/36-31-news-search-toolkit-architecture.png) |
| `/_astro/search-icon-2_LFJpr.webp` | idem | AGENTIC SEARCH → PLAN → **SEARCH (Search Toolkit)** → INSPECT → REFLECT → ANSWER, avec boucles de retour vers SEARCH | [36-32](sources/images/36-32-news-search-toolkit-boucle-agentique.png) |
| `/_astro/api_Z2w3lRG.webp`, `Illustration13_Z2ouXHF.webp` | idem | Couverture et illustration (loupe M) | — |
| `/_astro/pasted-image-4_INqkQ.webp`, `pasted-image-5_Z1Id2ck.webp` | agentic-search (20/08/2026) | « One-shot RAG » : un chunk pertinent mais la table de réponse est ailleurs → « Wrong Answer » ; « Agentic Search » : l'agent cherche, lit et navigue (1→2→3) → « Good Answer » | — |
| 4 SVG `financebench_…`, `officeqa-pro_…` | idem | Barres One-shot RAG / Agentic loop / Agentic loop + Navigation : FinanceBench 22,7 / 70 / 78,7 et 26,7 / 79,3 / 86 (alt « -glm ») ; OfficeQA Pro 6,3 / 43,6 / 51,9 et 1,5 / 21,1 / 28,6 | — |
| `/_astro/schema_2swAm0.webp` | vibe-remote-agents-mistral-medium-3-5 (28–29/04/2026) | Entrées (Version Control, **Vibe CLI**, Issue Tracking Linear/Jira, Monitoring & Observability, ChatOps Teams/Slack) → **« Vibe agentic runtime »** ← **Human in-the-loop** → sorties (Pull Request / Artifacts, Documentation, Reporting) | [36-33](sources/images/36-33-news-vibe-remote-agents-schema.png) |
| 4 graphiques + couverture + vignette (`9d0ff7f3…`, `088938d7…`, `9af69a7b…`, `c7212927…`) | idem | Benchmarks Mistral Medium 3.5 (agentiques, maths, SWE-Bench) ; vignette « Studio / Vibe for code / **Vibe** / Forge / Compute » | — |
| `/_astro/138e36ef-…_2rQkhR.webp` (« Marketecture Forge ») | forge (17/03/2026) | Enterprise data (Structured, unstructured, taxonomies) → Data preparation (Ingest, curation, conditioning) → Model training (Pre-training) → Model alignment (Fine-tuning, preference optimization, reinforcement learning) → Evaluation (KPI evaluation, drift detection) → **Custom enterprise model** (Domain-aligned, policy-aware, KPI measured behavior) | [36-34](sources/images/36-34-news-forge-marketecture.png) |
| `/_astro/7641c304-…` (« Forge Users ») | idem | Logos clients (ASML, DSO, Ericsson, ESA, Reply) | — |
| `/_astro/8303b765-…_Z1W7G1t.webp` | mistral-compute (11/06/2025) | Couches : **Bare Metal** (pure capacity access) / **Managed Infra** (virtualization and orchestration in a private environment) / **Private AI Studio** (developer environment with model APIs and SDKs within private clusters ; privately deployable AI-powered products ; IT toolchain) / **AI Studio** (APIs, products and services to experiment or get started quickly ; familiar PaaS / SaaS toolchain) | [36-35](sources/images/36-35-news-mistral-compute-ai-studio-prive.png) |
| 2 SVG (`5a0eb67b…` « Mcp Mistral », `55ca02be…` « Agents ») | agents-api (27/05/2025) | « SDK Built-in » (MCP Server) + « API Built-in » (Agent with MCP Servers as tools : MCP third-party API, MCP Database, MCP Actuators) → Choice → Answer ; orchestration : Task → agent → « Answer or Handoff task » → web → code → … → Answer | — |
| `/_astro/f2a4b295-…` (Cover) | idem | « Agents API » sur fond de circuits | — |
| `/_astro/f745e94a-…` | la-plateforme (11/12/2023) | Tableau de benchmarks GPT-3.5 / Mistral Small / Mistral Medium | — |
| `/_astro/da3fc2a0-…` (« Marketecture Code Alt »), `973b0f2f-…`, `f5361c96-…`, `a11e458a-…`, `397701a8-…`, `9dd41059-…` + 2 couvertures | codestral-25-08 (30/07/2025) | Pile « Generative IDE plugin » (Completion, Generation, Codebase search, Agentic development, Git operations, File editing, Terminal commands, Assistive chat…) / AI Foundation / Operations / Cloud · Self-hosted · Serverless ; capture IDE Mistral Code ; graphiques FIM | — |
| `0c2975a6-…` (« Architecture »), `46ca04b7-…`, `6b71f3c5-…` | mistral-code (04/06/2025) | « Mistral Code (generative IDE plugin) » : Intelligence = Codestral (completion), Devstral (agents, chat, edits), Codestral Embed (indexing, search) ; Deployment = Operations (access and user management, security and compliance, deployment routing and caching) + modalités Cloud / Self-hosted / Serverless ; captures VS Code (« Give context to Le Chat », « Ask Le Chat to do something », `Ask anything`, sélecteur `Mistral Large`) | — |
| `6e528d1e-…` (« Projects »), `a552d04b-…` | le-chat-dives-deep (17/07/2025) | Projet Le Chat `Q3 leads` (`Share`, `Settings`, `…`), cartes de conversations, saisie « Start a new chat in this project » avec `Research`, `Think`, `Tools`, micro ; démo d'édition d'image | — |
| `92e9c189-…`, `a0e581b9-…` + 5 SVG de logos | le-chat-mcp-connectors-memories (02/09/2025) | Grille de connecteurs ; statistiques de la mémoire (94–100 % save rate, 99 %, 90 %, 100 %, 86 %) ; logos | — |
| `ai-now-summit_…`, `AInowsummit_…`, `manufacture_…`, `image (6)_…`, `infra_…` | ai-now-summit-2026 (28/05/2026) | Photos de scène ; maquette Vibe « What would you like to do today? » (suggestions `Summarize my unread emails`, `Structure a SaaS model with usage-based pricing`, `Build a CLI tool to parse JSON logs`) ; illustrations | — |
| `Hero - Vibe_…`, `Thumbnail-Solution-Vibe_…` | vibe-agent (28/05/2026) | Fonds décoratifs | — |
| `logo-workflows_…`, `logo-workflows-white_…` | workflows (27/04/2026) | Logo Workflows (la démo est en vidéo YouTube) | — |
| `72a46eef-…`, `e46ccb7f-…`, `228d61ba-…` | agentic-workflows-from-meetings-to-dev-tickets (04/03/2025) | Meeting Transcript → Product Requirements Doc → Engineering Tickets ; PRDAgent / TicketCreationAgent ; capture Linear | — |
| `d0f68ba1-…`, `42c8c934-…` | llm-as-rag-judge (09/04/2025) | LLM-as-a-judge ; « RAG triad » (Answer relevance, Context relevance, Groundedness) | — |
| `Cover-SovereignAI_…`, `Mistral and thrird party models_…`, `Thumbnail-Blog-GLM-OptB_…` | regional-inference-open-models-new-compute (11/08/2026) | Illustrations « Regional control », « Third-party open models » | — |
| Benchmarks et couvertures (ocr-4 ×11, mistral-ocr-3 ×5, voxtral-transcribe-2 ×4, voxtral-tts ×4, voxtral-3 ×1 schéma, devstral-2-vibe-cli ×5, mistral-moderation ×2, september-24-release ×2, build-tweak-repeat ×1, all-new-le-chat ×1, legacy-code-modernization ×4, rails-testing ×3) | annonces modèles et cas d'usage | Graphiques de performance, schémas de modèles (Voxtral TTS : backbone autorégressif, flow-matching), schéma d'agent vocal Voxtral 3 (identique au SVG doc `voice_agent_pipeline`), schémas d'agents de test/migration ; **aucune capture de console** | — |

### 3.3 Page produit `mistral.ai/products/studio` (EN = FR) et pages voisines

| Image | Ce qu'elle montre | Copie |
|---|---|---|
| `/images/heros/hero-studio-1.svg` (rendu) | Maquette d'**accueil** : « **Mistral Studio** » / « Your workspace for building, testing, and managing AI-powered apps. » ; 2 boutons sombres (icônes Discord et ?) ; 3 cartes : 1re vide (animée, inférence), **`Capture`** (« Voice generation and replication that captures personality. » → `OCR`, `Speech-to-text`, `Text-to-speech`), **`Govern`** (« Visualise every request, response, and decision across multi-step pipelines. » → **`Observe`**, **`Explore`**, **`Evaluate`**) ; **`Quickstart`** « Create an Agent — Build and deploy an AI agent in minutes. » ; **`Documentation`** + **`See all docs`** « Document AI — Process and analyze documents with AI. » ; rail d'icônes à gauche | [36-36](sources/images/36-36-produit-studio-home-govern.png) |
| `/_astro/workflows_ZjMFEG.webp` | Exécution **`Multi-turn chat workflow`** (`34pm…1a33`, ✓, `1198 ms`, ⌃⌄, **`▶ Run Again`**, ✕) : chronologie (`Activity 200 ms`, `Signal`, `Activity` en échec ⊗ rouge, `Sub-workflow 200 ms`…) ; règle START…3.5s avec curseur ; panneau `Steps` (`Final Output`, `Agent`, `Agent`, `Activity`) ; onglets **`Inspector` (I)** / **`Metadata` (M)** ; **`View Sub-workflow`**, **`Reset from here`** ; `Output` en `JSON ▾` (copier) | [36-37](sources/images/36-37-produit-studio-workflow-execution.jpg) |
| `/_astro/observability_ZTSRVE.webp` | **`Traces / QA-Chatbot ●`** ; axe 0.00s–18.00s ; arbre de spans `handle-chatbot-message` › `handle-chatbot-message` › `get-mistral-prompt` › **`create-mcp-client`** (rouge, ⊗) › `ai.streamText` › `ai.streamText.doStream` › … (durées `200 ms`) | [36-38](sources/images/36-38-produit-studio-traces.jpg) |
| `/_astro/Airegistry_2cUTfG.webp` | Menu **`Build`** : `Models`, `Agents`, `Datasets`, `Workflows`, `Libraries`, `Connectors`, `Prompts`, `Skills` (icônes) | [36-39](sources/images/36-39-produit-studio-ai-registry-build.jpg) |
| `/_astro/versioning_XpCM4.webp` | Modale **`Version history`** ✕ : `v5 • Latest` (« January 28, 5:07 PM »), `v4` (« January 25, 4:05 PM »), `v3`… | [36-40](sources/images/36-40-produit-studio-version-history.jpg) |
| `/_astro/agents_Za0mSs.webp` | Bouton **`+ New Agent`** ; tableau `Agent name ⇅` / `Model ⇅` / `So(urce)` : `Onboarding-copilot` (pastille `Magistral`), `Code-reviewer` (`Devstral`), source `AP(I)` | — |
| `/_astro/connectors_1w5lzk.webp` | Liste `Notion — Connect to Notion`, `Gmail — Connect to Gmail`, `Sharepoint — Connect to Sharepoint`, `Outlook…` | — |
| `/_astro/experiments_1AXfw7.webp` | Boucle **Observe → Evaluate → Improve** | — |
| `/_astro/moderation_21hM0u.webp` | Catégories ✕ : Sexual, Hate and discrimination, Violence and threats, Dangerous and criminal content, Self-harm, Health… | — |
| `/_astro/guardrails_Z19crIb.webp`, `developer-toolkit_ZNttPN.webp` | Cadenas ; `pip install mistralai` | — |
| `hero-studio-2.svg`, `-agent.svg`, `-frame-1…4.svg`, `-ocr.svg` | Cadres des onglets *Workflows / Connectors / Audio / Agents / OCR / Models* (inférence) : 9 avatars d'agents pixel, logos de connecteurs (Stripe, Notion, Atlassian, Gmail/Drive…), 9 icônes audio/image/OCR, reçu, texture grise | — |
| `/products/vibe` : 22 graphiques `graphic-vibe-*` + `hero-vibe.jpg` | Maquettes Vibe : `Meetings Report` (canvas), terminal Vibe, « Workflow started : Machinery tracker » avec étapes `Telemetry`, `Thought for 4s`, `Data lake`, `Jira`, `Contract Status`, `Searching web`, pièces jointes PDF/CSV/PPTX, « Pulling from your docs, Linear, and recent Slack threads » (`Working · Loading skills`), 3 workflows (`WORKFLOW 1 Site monitoring`…), **« Vibe will edit 58 invoices » `1 Allow once` · `2 Always allow` · `3 Reject`**, **`Task created` « Weekly AI Updates — 9:00AM every Monday »**, « Run my overnight queue » (`Done · 1h 23m`, `Github 3 PRs opened`, `Linear Updating 12 issues`) | — |
| `/products/vibe/code` : graphiques `graphic-*` + 3 `hero-vibe-code-*` | Maquettes : « Use your Deploy skill to push to staging » (`Found @skills/deploy.md`, `/status`, `Tokens: 12.4k · Duration: 48s`) ; **`Background Tasks`** (`stripe-skd-upgrade done`, `add-audit-logging 87%`, `migrate-user-svc 61%`, « Running 6h 43m ») ; COBOL→Java ; `HUMAN-IN-THE-LOOP` ; IDE multi-fichiers ; logos JetBrains/VS Code/Zed ; accueil Vibe Code Web « **What are we building** » / « Ask Vibe anything » / `Suggested for you` | — |
| `/products/forge` : 11 graphiques + 2 heros | Cycle Datasets → Training runs → Evaluation → Versioning and rollback → Deployment → Monitoring ; Rules / Knowledge / Judgment / Behavior ; Agents ⇄ Environment (State, Reward, Action) ; Retest all / Regression test selection / Prioritization ; pipeline « 1. Data preparation … 5. Lifecycle management (Versioning, traceability, auditability, rollbacks) » | — |

### 3.4 Centre d'aide `help.mistral.ai`

| Image (pièce jointe Intercom) | Article | Ce qu'elle montre |
|---|---|---|
| `memories-toggle-on.png`, `memories-toggle-off.png`, `memory-edit.png`, `memory-edit-popup.png`, `memory-delete.png`, `memory-delete-popup.png`, `memory-clear-all.png`, `memory-delete-all-popup.png` | 396497 « How do you handle my data when using the Memories feature? » | Page **`Memories`** (`● Disabled` / `● Enabled`), `Search`, `Import`, `…` → toggle **`Memories in Le Chat`**, **`Clear all memories`** ; cartes `Insights` (« Tell me something about me I might not even know myself! »…), puces `Get to know me` ; « Type to add a new memory » ; modales `Edit memory` (`Cancel`/`Save`), `Delete memory` (« …forgotten? This action cannot be undone. » `Forget`), `Delete all` (`Delete all memories`) |
| `delete-chat-option.png`, `confirm-delete-chat-button.png` | 347613 « Can I delete a chat conversation? » | Menu de conversation `Edit` / `Archive` / `Delete` ; « Delete the chat? This action will result in the removal of "My chat to delete" » |
| `delete-account-button.png`, `delete-account-confirmation-button.png` | 347619 « How can I delete my account? » | Réglages de compte : menu `Security & Access`, `Le Chat`, `Preferences` ; `User ID` + `Update profile` ; `Communication settings` (`Go to email preferences portal`) ; `Export your personal data` (`Le Chat` / `Support` → `Export`) ; **`Danger zone`** : `Leave organization`, `Delete account` ; modale : « This account will be fully deleted but not invoicing data. Organizations that do not have any other member will be deleted as well. Please type your email address to confirm. » |
| `export-button.png` | 347623 « How do I export my data from Vibe? » | Bloc `Export your personal data` |
| `subscribe-notifications.png` | 455208 sous-traitants | Trust Center Mistral (`Request access`, onglets Overview / Resources / Controls / Subprocessors / Updates ; ISO 27001:2022, ISO 27701, GDPR, SOC 2 ; « View all 27 controls ») |

### 3.5 GitHub et cookbooks

| Source | Résultat |
|---|---|
| `raw.githubusercontent.com/mistralai/mistral-vibe/HEAD/README.md` | 4 badges (PyPI, Python 3.12+, CI, licence) et un logo en caractères ASCII : **aucune capture** |
| `raw.githubusercontent.com/mistralai/cookbook/HEAD/README.md` | **Aucune image** |
| Pages cookbooks de la doc (images du dépôt `cookbook`) — examinées : `gif/Github_PR.gif`, `financial_analyst.gif`, `Linear_tickets.gif`, `Nutrition_demo.gif` (3 images extraites par GIF), `…/github_agent/public/sse_mcp.png`, `…/hubspot_dynamic_multi_agent/assets/solution_architecture.png` | Applications de démonstration construites sur l'Agents API (interfaces de chat propres aux cookbooks : « Selected Server: … & Running Tool: … », « Forwarding to goal-setting-agent ») ; modale `MCP Servers` (`Connect an MCP` / `My MCPs`, `Name*`, `Type* sse`, `Server URL*`) **propre au cookbook**, pas à la console ; architecture HubSpot multi-agents (Lead Agent `magistral` → sous-agents `mistral-small` → Synthesis Agent) |

---

## 4. Inventaire consolidé par écran et par brique

### 4.1 Cadre global de la console : trois états successifs

| Élément | Oct. 2025, « La Plateforme » (doc, [36-01](sources/images/36-01-doc-studio-workspace-api-keys.png)) | Oct. 2025, **AI Studio** (annonce, [36-25](sources/images/36-25-news-ai-studio-agent-workflows.jpg)) | Juil. 2026 (annonce, [36-30](sources/images/36-30-news-prompts-skills-evaluations.png)) | Base (Pentiminax, juil. 2026) |
|---|---|---|---|---|
| Sélecteur de produit | — | **`AI Studio ▾`**, logo violet | logo bleu seul | `Studio ▾` |
| Organisation / workspace | modale `💼 My Workspace ⇕` | `M Mistral AI` · `Default Workspace ⇕` | `S Sam Personal` · `D Default Workspace ⇕` | `P Personnel` · `D Default Workspace` |
| Droite de la barre | — | `Search ⌘K`, avatar (capture Observability) | **`Feedback`**, `Search ⌘K`, avatar | `Retours`, `Rechercher ⌘K`, avatar |
| Menu | `Home`, `Workspace`, `API Keys` ; *Create* (Playground, Agents, Batches) ; *Improve* (Fine-tune) ; *Context* (Files) ; *Code* (C…) ; *Docs* | `Home`, `Workspace`, `API Keys` ; *Create* `Playground`, `Agents`, **`Agent Workflows`**, `Batches` ; *Improve* `Observe`, **`Evalute`** (› `Datasets`, `Judges`, `Experiments`), `Fine-tune` ; *Context* `Manage` ; *Docs* `Documentation`, `API`, `Cookbooks` | rail d'icônes replié en 5 groupes (inférence d'après les pictogrammes) : accueil, clé ; agents, audio, batches, Document AI, workflows ; connecteurs, bibliothèques, prompts, skills ; **évaluations (actif)**, datasets, juges ; 4 icônes (liste, recherche, document, jauge) ; aide `?` | Créer / Contexte, sans observabilité |

Constats : l'entrée *Workspace* (réglages) et la section *Docs* ont disparu du menu en 2026 ; `Agent Workflows` est devenu `Workflows` ; l'**évaluation** forme un groupe distinct (Evaluations, Datasets, Judges) visible dans une organisation de démonstration (inférence : comptes Enterprise ou Preview).

### 4.2 Accueil

- Maquette produit ([36-36](sources/images/36-36-produit-studio-home-govern.png)) : titre `Mistral Studio`, sous-titre identique à la version FR (« Votre espace de travail pour créer, tester et gérer… »), cartes **`Capture`** (OCR, Speech-to-text, Text-to-speech) et **`Govern`** (Observe, Explore, Evaluate) 🆕, `Quickstart` (Create an Agent), `Documentation` + `See all docs`.
- Comparaison : la base n'a vu que *Créer* et *Capturer* ; la carte `Govern` correspond aux comptes avec observabilité (inférence).

### 4.3 Workspace et clés API

- **Modale de workspace** (oct. 2025) : onglets `General`, `API Keys`, `Usage`, `Members N` ; `See more ⤢` (inférence : ouverture en pleine page) ; `Done`.
- **`Create new key`** : `Key name` (optionnel), `Expiration` (optionnelle, sélecteur de date) ; mention « confidential and not shared within your organization ».
- Texte actuel de la même page : 3 champs (`Name`, `Expiration`, `Connector access scope`) → la capture est antérieure aux connecteurs (⚠️, §5).

### 4.4 Agents

- Page produit : tableau `Agent name` / `Model` / `Source` avec pastilles de famille de modèle (`Magistral`, `Devstral`) et bouton `+ New Agent` (la base, en FR : `+ Créer un agent`, colonnes Nom / Source / Modèle / Créé le / ID API / Métadonnées).
- `Version history` (page produit) : liste `vN • Latest` + horodatage ; cohérent avec « Historique des versions » de la base.
- Schémas doc : boucle « Choice » (répondre ou appeler un outil), cadre « API Built-in » (Websearch, Image Generation, Code Interpreter), sorties annexes par outil (Code & Result, Images, References) ; handoffs (« Answer or Handoff task »).
- Annonce Agents API (mai 2025) : distinction **« SDK Built-in »** (serveur MCP local) / **« API Built-in »** (agent avec serveurs MCP comme outils : *MCP third-party API*, *MCP Database*, *MCP Actuators*).

### 4.5 Workflows

**Console (captures)**
- Oct. 2025 : page `Workflows`, colonne `▷ Workflows` (cartes nom + type `Workflow` + ▷ lancer), panneau `Execution History - <Workflow>` avec `Search executions...`, ID d'exécution tronqué (16 hex), `Started` / `Ended`, pastille de statut verte.
- Page produit : **vue d'exécution** — en-tête (nom, ID tronqué, statut ✓, durée totale `1198 ms`, navigation ⌃⌄ entre exécutions, `▶ Run Again`, ✕) ; **diagramme de Gantt** des événements (Activity, Signal, Sub-workflow ; échecs en rouge ⊗) ; barre de défilement temporelle ; panneau `Steps` (Final Output, Agent, Activity) ; inspecteur à onglets `Inspector`/`Metadata` (raccourcis I/M) ; actions `View Sub-workflow` et **`Reset from here`** (correspond à `reset_workflow` de l'API, [13](13-workflows-2-interaction-production.md)) ; sortie `Output` en JSON copiable.

**Architecture (schémas doc)**
- Mode hybride : le code et les workers restent dans l'environnement du client ; **API + UI forment la frontière** ; l'orchestrateur (état, historique, distribution des tâches, planification) est côté Studio.
- Modèle mental : Execution = suite d'Events côté API ; Worker = Workflow + Activities ; **connexion sortante uniquement**.
- OAuth des connecteurs : un **intercepteur** du worker résout les « slots » de connecteurs ; l'URL OAuth remonte au client comme événement `auth_url` ; le worker **interroge** (poll) l'API jusqu'à trouver les identifiants, puis lance le point d'entrée.

**Workflows conversationnels (rendu Vibe Work)**

| Élément | Rendu observé |
|---|---|
| Barre d'exécution | `⏸` + nom du workflow (`Greeting`, `Documentation demo`) + libellé d'étape grisé (`Validate expense`) + `›` + bouton **■** |
| `ChatInput` | Carte : question en gris, placeholder `Type your response`, **micro** orange ; suggestions numérotées 1, 2, 3 (la dernière = `Type your own response`) |
| `FormInput` | Libellés au-dessus des champs, aide regex en gris sous le champ, erreurs en rouge (`must be < 100`), sélecteurs natifs date / date-heure (format jj/mm/aaaa), listes avec ✓, multi-sélection résumée (`Frontend, Backend`), fichiers en liste avec ✕ et `+ Add more files`, bouton orange **`Submit ⌘↵`** |
| `ConfirmationInput` | Rangée de boutons gris alignés à droite |
| `AcceptDeclineConfirmation` | `Yes, proceed ⌘↵` (orange) / `Cancel ⌘D` |
| Composants UI | Carte `Summary` + badge `Pass` ; `Row` de 2 `Card` avec `Chart` ligne et barres (orange) |
| États d'outils | Fichiers : `Edited N files +x −y`, diff par fichier repliable, `deleted` ; générique : `Tool <Nom>`, `Arguments`, `Response`, statut ✓/✕ ; commande : `> cmd`, sortie, `⊗ Failed`, bouton copier |

### 4.6 Connecteurs

- Deux natures : **Custom MCP** (outils du client vers un système interne) et **Built-in connector** (outils prêts : `open_email`, `draft_email`, `search_inbox`) vers Outlook, GitHub, SharePoint.
- Humain dans la boucle : boucle 1 (l'agent appelle l'outil puis répond) ; boucle 2 (le résultat d'outil est **délégué à l'utilisateur**, qui fournit confirmation ou données).
- Contrôle par **workspace** et par **outil** : même connecteur Linear, `Create` désactivé dans le workspace 01 et activé dans le 02 ; Salesforce actif / inactif selon le workspace.
- Catalogue illustré : 64 connecteurs (liste §3.2), conforme aux « plus de 60 intégrations » de [02](02-historique-annonces-presse.md).
- Page produit : liste « Connect to Notion / Gmail / Sharepoint / Outlook ».

### 4.7 Prompts, Skills et Évaluations

- Aucune capture publique des écrans Prompts ou Skills (l'annonce du 09/07/2026 montre l'écran **Évaluations**, les vidéos montrent le reste, [31](31-autres-videos.md)).
- **Écran Evaluations (Preview)** 🆕 : sélecteur de **projet** ; boutons `Share`, `Manage` ; recherche ; une section par **évaluation** (titre, « Last update ») ; tableau des runs : `Name` (nombre de runs), `Properties` (System, Metadata, Tags — ici l'étiquette du worker `studio-demo-managed-worker` et un compteur de métadonnées), `Created`, une colonne par métrique avec **sparkline** d'en-tête et cellules `valeur avg. σ écart-type`, `Owner` ; lien `See all runs (N)` ; popover **`System Parameters`** = configuration du run (`judge_model`, `dataset_name`, `n_generations`, juges `inline`, **prompts référencés par alias et version**).
- Lien établi par l'image (inférence) : une évaluation pilotée par un workflow déployé en managed deployment compare des variantes de prompts du registre (`staging (v7)`, `staging (v8)`).

### 4.8 Observabilité et juges

- **Chat details** (oct. 2025) : vue tabulaire des conversations (modèle, prompt) + panneau de détail `Feed`/`Properties`, rendu des appels d'outils en JSON brut avec `integration_id`, liste des résultats d'outil avec liens, navigation par rail d'icônes et flèches ⌃⌄.
- **Traces** (page produit) : fil d'Ariane `Traces / <application>` avec pastille d'état, axe temporel, arbre de spans indenté, durées en `ms`, span en erreur en rouge. Noms `ai.streamText` / `ai.streamText.doStream` = conventions de l'AI SDK de Vercel (inférence) : l'application démo est instrumentée en TypeScript.
- **Judges** (oct. 2025) : liste filtrable, colonnes Name / Description / Type / Instructions, types `Classification` / `Regression`.
- Page produit « Experiments » : boucle Observe → Evaluate → Improve.

### 4.9 AI Registry, modération, garde-fous (page produit)

- Menu **`Build`** : Models, Agents, Datasets, Workflows, Libraries, Connectors, Prompts, Skills (= contenu de l'« AI registry » annoncé : « models, agents, prompts, skills, datasets, and workflows »).
- Modération : 9 catégories affichées en cartes (Sexual, Hate and discrimination, Violence and threats, Dangerous and criminal content, Self-harm, Health…), cohérent avec `mistral-moderation` ([10](10-conversations-capacites.md)).

### 4.10 Recherche : Search Toolkit et Agentic Search

- Ingestion : par type de source, extracteur (**Mistral OCR** pour les PDF, **entity extraction avec Doc AI** pour le HTML) → processeur → **embedder (Mistral Embed)** → index unique (vecteurs) ; retrieval **hybride** et **BM25**.
- Boucle agentique : Plan → Search → Inspect → Reflect → Answer (boucles de retour vers Search).
- Comparaison illustrée « one-shot RAG » (chunk juste mais table ailleurs) vs « agentic search » (recherche, lecture, navigation dans le document) ; gains chiffrés en barres pour deux modèles.

### 4.11 Document AI

- OCR : Markdown + images extraites avec bbox (`IMG-0`…) + tables (`TBL-0`, HTML) + en-têtes/pieds de page.
- Annotations : trois flux — OCR, **BBox Annotation** (LLM avec vision sur les images extraites), **Document Annotation** (LLM avec vision sur le texte extrait et **les 8 premières bbox**) ; formats fournis en entrée.
- Document QnA : OCR puis modèle ; les images extraites sont **jetées si le modèle n'a pas la vision** 🆕.

### 4.12 Audio et agents vocaux

- Choix du mode (offline / realtime / voice agent) par arbre de décision ; latences par mode ; état de tour (`turn.start`, `turn.eager_end`, `turn.resume`, `turn.end` et seuils) ; cycle de session WebSocket ; jeton client `rt_*` via `POST /v1/client/sessions` ; téléphonie entrante SIP vers un **agent enregistré** ; pipeline agent vocal avec outils client et serveur ; **filler** joué pendant les appels d'outils.

### 4.13 Admin

- Schéma d'ensemble : **Admin Console** (surface de contrôle) et **Admin API** (contrôle programmatique) agissent sur **Organizations** (compte, politiques, facturation, sécurité), **Members** (RBAC, **Seats**) et **Workspaces** (équipes, produits, **budgets**), eux-mêmes utilisés par Vibe et Studio. Le texte alternatif mentionne aussi groupes et SCIM, absents du dessin.
- Hiérarchie Enterprise Account › Organizations › Workspaces : conforme à [03](03-administration-securite-facturation.md).
- Aucune capture publique de l'Admin Panel (doc, annonces, aide).
- Centre d'aide : page de compte (`Security & Access`, `Le Chat`, `Preferences`, export, **`Danger zone`** avec `Leave organization` et `Delete account`, saisie de l'e-mail pour confirmer).

### 4.14 Vibe (CLI, Code Web, Work, remote agents)

- **CLI v0.1.0** (oct.–déc. 2025) : écran d'accueil, saisie de clé, bandeau (modèle, nombre de modèles et de serveurs MCP, dossier), indicateur **`auto-approve off (shift+tab to toggle)`**, jauge **`% of 100k tokens`**, appels d'outils repliés (`ctrl+o to expand`), interruption `esc`, invite d'approbation à 3 choix.
- **Vibe Code Web** : boucle Read → Plan → Act → Report → Ask.
- **Remote agents** (avril 2026) : « Vibe agentic runtime » alimenté par dépôts, CLI, tickets, monitoring et ChatOps ; produit PR/artefacts, documentation, rapports ; humain dans la boucle.
- **Page produit Vibe** : invite d'approbation Work **`1 Allow once` · `2 Always allow` · `3 Reject`** (« Vibe will edit 58 invoices ») ; tâche planifiée (`Task created`, « 9:00AM every Monday ») ; suivi de tâches longues (`Done · 1h 23m`, `Thought for 1m`, connecteurs utilisés) ; `Workflow started : <nom>` dans le fil ; `Background Tasks` avec pourcentages (Vibe Code).
- Centre d'aide : écran **Memories** encore libellé « Memories in **Le Chat** ».

### 4.15 Forge et Compute

- Forge : chaîne données d'entreprise → préparation → entraînement → alignement → évaluation (KPI, dérive) → modèle d'entreprise ; cycle Datasets / Training runs / Evaluation / Versioning and rollback / Deployment / Monitoring (page produit).
- Compute (juin 2025) : 4 niveaux d'offre dont **Private AI Studio** (environnement développeur avec API et SDK de modèles **dans des clusters privés**) et **AI Studio** (PaaS / SaaS) 🆕.

---

## 5. Nouveautés 🆕 et contradictions ⚠️

### 5.1 Nouveautés

| # | Fait | Source (image) |
|---|---|---|
| 1 | 🆕 Menu « AI Studio » d'oct. 2025 complet : `Agent Workflows`, `Observe`, `Evalute` [sic] › `Datasets` / `Judges` / `Experiments`, `Fine-tune`, `Context › Manage`, `Docs › Documentation / API / Cookbooks` ; sélecteur `AI Studio ▾` | [36-25](sources/images/36-25-news-ai-studio-agent-workflows.jpg), [36-26](sources/images/36-26-news-ai-studio-judges.jpg) |
| 2 | 🆕 Écran `Workflows` 2025 : cartes de workflows avec ▷ et `Execution History - <nom>` + `Search executions...` | 36-25 |
| 3 | 🆕 Écran `Judges` : colonnes et types `Classification` / `Regression` visibles dans l'UI | 36-26 |
| 4 | 🆕 Écran `Chat details` (Feed / Properties, JSON des appels `web_search` avec `metadata.integration_id`) | [36-24](sources/images/36-24-news-ai-studio-observability-chat-details.jpg) |
| 5 | 🆕 Écran `Evaluations` (Preview) de juillet 2026 : projet, `Share`, `Manage`, colonnes métriques + sparklines, `avg. σ`, popover `System Parameters`, prompts par alias et version | [36-30](sources/images/36-30-news-prompts-skills-evaluations.png) |
| 6 | 🆕 Vue d'exécution de workflow : Gantt, `Run Again`, `Reset from here`, `View Sub-workflow`, `Inspector`/`Metadata` (I/M), `Steps`, `Output JSON` | [36-37](sources/images/36-37-produit-studio-workflow-execution.jpg) |
| 7 | 🆕 Carte d'accueil `Govern` (Observe / Explore / Evaluate) | [36-36](sources/images/36-36-produit-studio-home-govern.png) |
| 8 | 🆕 Menu `Build` à 8 entrées (Models, Agents, Datasets, Workflows, Libraries, Connectors, Prompts, Skills) | [36-39](sources/images/36-39-produit-studio-ai-registry-build.jpg) |
| 9 | 🆕 Marketecture AI Studio 2025 (AI Builder Toolkit / AI Foundation / Infrastructure & execution ; 4 cibles de déploiement) | [36-23](sources/images/36-23-news-ai-studio-marketecture.png) |
| 10 | 🆕 « Private AI Studio » et « AI Studio » comme niveaux de l'offre Mistral Compute dès juin 2025 | [36-35](sources/images/36-35-news-mistral-compute-ai-studio-prive.png) |
| 11 | 🆕 Modale de workspace 2025 : onglets `General / API Keys / Usage / Members`, `See more`, `Done` | [36-01](sources/images/36-01-doc-studio-workspace-api-keys.png) |
| 12 | 🆕 Rendu exact des workflows conversationnels : barre ⏸/■, micro, suggestions numérotées, raccourcis **`⌘↵`** (submit, accept) et **`⌘D`** (cancel), messages d'erreur | 36-13 à 36-19 |
| 13 | 🆕 OAuth des connecteurs dans Workflows : intercepteur de slots, événement `auth_url`, attente par polling | [36-10](sources/images/36-10-doc-workflows-connector-oauth-flow.png) |
| 14 | 🆕 Document QnA : images extraites ignorées si le modèle n'a pas la vision ; annotations de document fondées sur les 8 premières bbox | 36-21, 36-22 |
| 15 | 🆕 Schéma « Vibe agentic runtime » des remote agents | [36-33](sources/images/36-33-news-vibe-remote-agents-schema.png) |
| 16 | 🆕 Search Toolkit : extracteurs par type de source (OCR pour PDF, Doc AI pour HTML), retrieval hybride + BM25, boucle Plan/Search/Inspect/Reflect/Answer | 36-31, 36-32 |
| 17 | 🆕 Distinction « SDK Built-in » / « API Built-in » pour les serveurs MCP (Agents API, mai 2025) | annonce agents-api |
| 18 | 🆕 Invite d'approbation de Vibe Work : `Allow once` / `Always allow` / `Reject` ; tâches planifiées « Task created » | page produit Vibe |

### 5.2 Contradictions

| # | Contradiction | Détail |
|---|---|---|
| 1 | ⚠️ Capture `new-key-modal.png` vs texte de la même page (et [11](11-demarrage-playground-agents-connecteurs.md)) | Le texte annonce 3 champs dont `Connector access scope` ; la capture n'en montre que 2 (`Key name`, `Expiration`), avec une date d'octobre 2025. Le libellé du champ est `Key name`, pas `Name`. |
| 2 | ⚠️ Capture `new-key-button.png` vs texte | Le texte dit « `API Keys` in the left sidebar » ; la capture montre l'onglet `API Keys` d'une **modale de workspace**. |
| 3 | ⚠️ Capture `api-key.png` vs texte et [21](21-vibe-code.md) | La capture renvoie vers `https://console.mistral.ai/codestral/vibe` et ne propose que la saisie de clé ; le texte décrit un assistant `Launch browser` / `Use an API key` et une clé générée sur `chat.mistral.ai/code/extensions`. |
| 4 | ⚠️ Capture `demo.png` vs texte et [21](21-vibe-code.md) §3.21 | 3 choix (`Yes`, `Yes and always allow write_file this session`, `No and tell the agent what to do instead`, `ESC reject`) contre 4 touches documentées (`1`/`y` une fois, `2` session, `3` toujours, `4`/`n`/`Escape` refuser). |
| 5 | ⚠️ `query.png` / `results.png` vs [21](21-vibe-code.md) | Bascule binaire « auto-approve off (shift+tab to toggle) » contre le cycle d'agents `default` / `accept-edits` (par défaut) / `smart-approve` / `auto-approve` documenté aujourd'hui ; version `v0.1.0` avec `devstral-2`. |
| 6 | ⚠️ Menu `Build` de la page produit vs groupes observés ([30](30-video-pentiminax-agents-sans-coder.md) §4.2) | La console réelle range Connecteurs, Connaissances, Prompts et Skills sous *Contexte*, et n'a ni `Models` ni `Datasets` dans *Créer* ; la page produit est une maquette (inférence : vision cible de l'« AI registry »). |
| 7 | ⚠️ Libellé `Evaluations` **`Preview`** vs base | La base classe Observabilité/Évaluations en **Private Preview** ; le badge de l'écran dit seulement `Preview`. |
| 8 | ⚠️ Centre d'aide vs [22](22-vibe-work-le-chat.md) | Les captures Memories montrent « Memories in **Le Chat** » ; la base (doc actuelle) dit `Memories in Vibe` : captures antérieures au renommage du 28/05/2026. |
| 9 | ⚠️ Annonce Agentic Search (texte) vs [15](15-recherche-libraries-search-toolkit.md) | L'annonce parle de **cinq** outils (`search`, `open`, `navigate`, `read`, `grep`) ; la doc décrit **7 outils MCP**. Les schémas de l'annonce n'en citent aucun nommément. |
| 10 | ⚠️ Alt du SVG `admin_overview` vs dessin | Le texte alternatif cite « roles, groups, and SCIM provisioning » ; le schéma ne montre ni groupes ni SCIM. |

---

## 6. Questions ouvertes

1. Les écrans `Evaluations`, `Judges`, `Chat details`, `Traces` sont-ils accessibles hors Enterprise ? Les captures viennent d'organisations de démonstration (`Mistral AI`, `Sam Personal`).
2. Que regroupent les 4 dernières icônes du rail de 2026 (liste, loupe sur fenêtre, document, jauge) ? Hypothèse : Traces, Explorer, Logs ou Usage (non vérifiable sans libellé).
3. Le premier encart de la maquette d'accueil (vide) correspond-il à la carte `Create` animée ?
4. La vue d'exécution de la page produit (`Run Again`, `Reset from here`) est-elle la vue réelle de `/build/workflows/executions` ? Aucune capture doc ne la montre.
5. Le modèle `…m-2508-lightspeed` affiché dans `Chat details` (oct. 2025) : variante interne non documentée (inférence : `mistral-medium-2508`).
6. Les captures de la doc (clés API, CLI) seront-elles mises à jour ? Elles ont un an de retard sur le texte.

---

## Annexe A — Les 40 images copiées

Dossier : [`sources/images/`](sources/images/) (préfixe `36-`, largeur ≤ 1 600 px, 5,6 Mo au total).

| Fichier | Origine | Sujet |
|---|---|---|
| [36-01](sources/images/36-01-doc-studio-workspace-api-keys.png) | doc | Modale de workspace, onglet API Keys (2025) |
| [36-02](sources/images/36-02-doc-studio-create-new-key.png) | doc | Modale `Create new key` |
| [36-03](sources/images/36-03-doc-vibe-cli-api-key.png) | doc | CLI Vibe : saisie de la clé |
| [36-04](sources/images/36-04-doc-vibe-cli-accueil.png) | doc | CLI Vibe v0.1.0 : bandeau et invite |
| [36-05](sources/images/36-05-doc-vibe-cli-approbation.png) | doc | CLI Vibe : approbation `write_file` |
| [36-06](sources/images/36-06-doc-admin-overview.png) | doc | Schéma Admin Console / Admin API |
| [36-07](sources/images/36-07-doc-admin-enterprise-hierarchy.png) | doc | Enterprise Account › Organizations › Workspaces |
| [36-08](sources/images/36-08-doc-workflows-hybrid-mode.png) | doc | Workflows : mode hybride |
| [36-09](sources/images/36-09-doc-workflows-mental-model.png) | doc | Workflows : modèle mental |
| [36-10](sources/images/36-10-doc-workflows-connector-oauth-flow.png) | doc | Workflows : OAuth des connecteurs |
| [36-11](sources/images/36-11-doc-vibe-code-web-agent-loop.png) | doc | Vibe Code Web : boucle de l'agent |
| [36-12](sources/images/36-12-doc-voice-agent-pipeline.png) | doc | Pipeline d'agent vocal |
| [36-13](sources/images/36-13-doc-cw-greeting-chatinput.png) | doc | Workflow conversationnel : accueil et saisie |
| [36-14](sources/images/36-14-doc-cw-chatinput-suggestions.png) | doc | Saisie avec suggestions |
| [36-15](sources/images/36-15-doc-cw-formulaire-expense.png) | doc | Formulaire structuré |
| [36-16](sources/images/36-16-doc-cw-composants-charts.png) | doc | Composants UI (cartes + graphiques) |
| [36-17](sources/images/36-17-doc-cw-file-tool-state.png) | doc | État d'outil : fichiers |
| [36-18](sources/images/36-18-doc-cw-generic-tool-state.png) | doc | État d'outil : générique |
| [36-19](sources/images/36-19-doc-cw-command-tool-state.png) | doc | État d'outil : commande |
| [36-20](sources/images/36-20-doc-agents-built-in-tools.png) | doc | Agent avec outils intégrés |
| [36-21](sources/images/36-21-doc-document-qna.png) | doc | Document QnA |
| [36-22](sources/images/36-22-doc-ocr-annotations-workflow.png) | doc | Flux d'annotations OCR |
| [36-23](sources/images/36-23-news-ai-studio-marketecture.png) | annonce ai-studio | Marketecture AI Studio |
| [36-24](sources/images/36-24-news-ai-studio-observability-chat-details.jpg) | annonce ai-studio | Observabilité : `Chat details` |
| [36-25](sources/images/36-25-news-ai-studio-agent-workflows.jpg) | annonce ai-studio | Menu AI Studio + Workflows |
| [36-26](sources/images/36-26-news-ai-studio-judges.jpg) | annonce ai-studio | Page `Judges` |
| [36-27](sources/images/36-27-news-connectors-custom-vs-builtin.png) | annonce connectors | Custom MCP vs Built-in |
| [36-28](sources/images/36-28-news-connectors-human-in-the-loop.png) | annonce connectors | Humain dans la boucle |
| [36-29](sources/images/36-29-news-connectors-controle-par-workspace.jpg) | annonce more-control | Contrôle par workspace et par outil |
| [36-30](sources/images/36-30-news-prompts-skills-evaluations.png) | annonce prompts & skills | Écran `Evaluations` (2026) |
| [36-31](sources/images/36-31-news-search-toolkit-architecture.png) | annonce search-toolkit | Ingestion / index / retrieval |
| [36-32](sources/images/36-32-news-search-toolkit-boucle-agentique.png) | annonce search-toolkit | Boucle agentique |
| [36-33](sources/images/36-33-news-vibe-remote-agents-schema.png) | annonce remote agents | Vibe agentic runtime |
| [36-34](sources/images/36-34-news-forge-marketecture.png) | annonce forge | Chaîne Forge |
| [36-35](sources/images/36-35-news-mistral-compute-ai-studio-prive.png) | annonce mistral-compute | Niveaux d'offre (Private AI Studio) |
| [36-36](sources/images/36-36-produit-studio-home-govern.png) | page produit | Maquette d'accueil (`Govern`) |
| [36-37](sources/images/36-37-produit-studio-workflow-execution.jpg) | page produit | Vue d'exécution de workflow |
| [36-38](sources/images/36-38-produit-studio-traces.jpg) | page produit | Arbre de traces |
| [36-39](sources/images/36-39-produit-studio-ai-registry-build.jpg) | page produit | Menu `Build` |
| [36-40](sources/images/36-40-produit-studio-version-history.jpg) | page produit | `Version history` |

---

## Annexe B — Couverture

### B.1 Chiffres

| Source | Références trouvées | Téléchargées | Examinées | Ignorées (raison) |
|---|---|---|---|---|
| Doc `llms-full` (422 pages) + HTML de 312 pages Studio/Admin/Vibe/Getting started | 115 références (dont doublons absolus/relatifs) + 13 noms `img-N.jpeg` | **104** | **104** (dont 14 variantes sombres en planche) | 4 photos d'entrée d'exemples Vision (`eiffel-tower-paris.jpg`, `stadium-paris.jpeg`, `food-receipt.jpg`, `old-page.jpg`, chacune en 2 URL), infographie `cdn.statcdn.com/…/30322.jpeg`, `receipt.png` du cookbook (entrées de démonstration) ; badge Colab ; `__emitted_0.png` (référence non résolue) ; 13 `img-N.jpeg` (noms relatifs dans des exemples de sortie OCR) ; logos `admin/studio/vibe.svg`, `Voxtral.svg` ; sprites décoratifs (herbe, chat, soleil) |
| Doc, 145 pages hors `llms-full` (cookbooks, `developers/`, `le-chat/`, `/api`) | 61 images + 18 `data:` + décor `/api` | **6** | 6 (dont 12 images extraites de 4 GIF) | 55 images d'outils tiers (Langfuse, Langtrace, MLflow, Phoenix, W&B, MongoDB, x-cmd, E2B, OpenLIT, Maxim…), badges, vignettes YouTube ; 18 `data:` (sorties de notebooks) ; décor de la page `/api` : sans rapport avec Studio |
| Doc FR (`/fr/…`) | contrôle ponctuel (2 pages) | — | — | mêmes fichiers `/img/…` que l'anglais |
| Annonces (33 articles) | 262 images + 23 fichiers audio | **125** | **125** (planches + zooms) | 128 logos de connecteurs (64 × noir/blanc ; les 2 `n8n` téléchargés puis écartés), 9 icônes/pictos/dégradés ; 23 extraits audio Voxtral 3 (hors sujet image) |
| Page produit Studio EN + FR, Vibe, Vibe Code, Forge | 138 références (Studio 18, Vibe 46, Vibe Code 37, Forge 37) | **74** | **74** | 64 logos clients, icônes génériques, chats décoratifs ; la version FR de `/products/studio` utilise exactement les mêmes 18 images |
| Centre d'aide (43 articles EN, 7 collections ; accueil FR vérifié) | 14 captures + icônes Intercom | **14** | **14** | icônes sociales et logos Intercom |
| GitHub README `mistral-vibe`, `cookbook` | 4 badges / 0 image | 0 | 4 badges (vus dans le Markdown) | badges |
| **Total** | — | **323** | **323** | — |

### B.2 Non couvert

- **Vidéos YouTube intégrées** aux annonces (traitées par [31](31-autres-videos.md) et les autres agents de la phase 2) : workflows `7TnJJ0D__kk`, `9tXQBnpvVsU` ; more-control-over-connectors `AR2IedLkEHo`, `hUPcLLti5x0`, `QjoTkonLub4` ; manage-prompts-and-skills `nxhRrry5UiY`, `v_LttjsevRg` ; search-toolkit `Kj7Ewd64QTA` (absente de la base) ; vibe-agent `3D8T5vDDLYM`, `AWXwY_ig4Uc`, `KQz62nh4XwU`, `y4TuBNXxRq0`, `YpK3-1h-Ync` ; mistral-vibe-2-0 (5), agents-api (5), le-chat-mcp-connectors-memories (9), voxtral-3 (5), voxtral-tts (2), le-chat-enterprise (3), le-chat-dives-deep (3), mistral-ocr-3, voxtral-transcribe-2, ocr-4, memory, devstral-2-vibe-cli (1 chacune).
- **Démos interactives** de l'annonce `spaces` (iframes `spaces-blogs-staging-…koyeb.app/*`) : non ouvertes (outil interne Applied AI, hors Studio).
- Pages `/fr/` de la doc au-delà du contrôle ponctuel ; les 59 annonces non liées à la plateforme (modèles, partenariats) : non téléchargées, hormis celles listées en §3.2.
- Aucun écran **Admin Panel**, **Playground**, **Prompts**, **Skills**, **Libraries** ou **Connectors** de la console n'a été trouvé sous forme d'image publique.
