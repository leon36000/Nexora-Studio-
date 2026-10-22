# 33 — Vidéos « console » : agents, connecteurs, prompts, skills et Vibe (analyse image par image)

> **État au 21/10/2026.** Douze vidéos (Mistral officielles + deux créateurs) ont été téléchargées (vidéo seule, ≤ 1080p), découpées à **1 image / 2 s**, dédoublonnées, puis **toutes les images distinctes** ont été examinées (planches-contact 4×4, puis plein écran ou recadrage agrandi pour chaque écran porteur d'interface). But : inventorier ce que la base ([00](00-synthese.md), [30 §4](30-video-pentiminax-agents-sans-coder.md), [31](31-autres-videos.md), [11](11-demarrage-playground-agents-connecteurs.md), [22](22-vibe-work-le-chat.md), [21](21-vibe-code.md), [03](03-administration-securite-facturation.md)) ne contenait pas encore. Aucun prix n'est repris (consigne du fondateur), même quand l'écran en affiche.
>
> **Légende** : 🆕 = absent de la base ; ✅ = confirme la base ; ⚠️ = contredit ou nuance la base ; « (inférence) » = déduction. Référence d'image : `<id> tMMmSSs` ; lien cliquable quand l'image est copiée dans [`sources/videos-images/console/`](sources/videos-images/console/). Les horodatages sont ceux de la vidéo.

## Sommaire
0. [En bref : 12 constats](#0-en-bref--12-constats)
1. [Fiches et chronologies par vidéo](#1-fiches-et-chronologies-par-vidéo)
2. [Inventaire consolidé par écran](#2-inventaire-consolidé-par-écran)
   - 2.1 Cadre global · 2.2 Menu latéral (évolution) · 2.3 Accueil · 2.4 Clés API
   - 2.5 Connecteurs : liste · 2.6 Connecteurs : fiche, outils, credentials, OAuth · 2.7 Connectors Debugger
   - 2.8 Agents : liste, création, éditeur, versions · 2.9 Playground : outils, exécution, raisonnement, JSON Schema
   - 2.10 Skills (Studio) · 2.11 Prompts · 2.12 Workflows (aperçu)
   - 2.13 Vibe Work (web) · 2.14 Vibe CLI · 2.15 SDK vu à l'écran
3. [Récapitulatif 🆕 / ⚠️](#3-récapitulatif--nouveautés-et-contradictions)
4. [Questions ouvertes](#4-questions-ouvertes)
- [Annexe A — 40 images copiées](#annexe-a--40-images-copiées)
- [Annexe B — Couverture](#annexe-b--couverture)

---

## 0. En bref : 12 constats

1. 🆕 **La console a changé de squelette au moins six fois en dix mois** (déc. 2025 → oct. 2026) : groupe « Améliorer / Improve » (Observer, Évaluer, Fine-tune) présent en déc. 2025 et avril 2026, absent ensuite ; « Create » devient « Build » en juillet 2026 ; Connecteurs (avril), Prompts/Skills (mai, badge `WIP`), Libraries (juin) arrivent par étapes ; en juillet 2026 le sélecteur organisation/workspace **descend en pied de menu latéral**. Voir §2.2.
2. 🆕 **Trois générations d'écran « Connectors »** : liste plate à interrupteurs + fiche en modale (avril, badge **`Private Preview`**), sections « Featured / Custom connectors » + page fiche avec onglets Overview / Credentials / **Permissions** (mai, `Public Preview`), groupes **« Connected N / Available N »** + colonnes Name / Type / Credentials / Updated (juin, badge `Preview`). §2.5–2.6.
3. 🆕 **Fiche connecteur détaillée** : Visibility (`Organization` / `Private`), Authentication (`OAuth2`), Origin (`Featured` / `Custom`), Capabilities (`Interactive`, `Read-only`), Server URL, Connector name, Connector ID ; outils groupés **« Interactive N » / « Read-only N »** avec schéma d'entrée JSON dépliable ; modale **« Credential name »** ; onglet **Preferences** (juillet). §2.6.
4. 🆕 **Connectors Debugger réellement vu** : état vide, badges `Error` / `Running` / `Completed` + durée, bouton `Cancel` en cours d'exécution, panneau par étape (`Information`, `Headers (N)`, `Body`, `Raw response`, `Metadata`, `Attempt 1`, `Capabilities`, `Scope mismatch`), champs de l'étape « Detect authentication method » (Auth method, Registration endpoint, PKCE required, Scopes, Requires Client Info), synthèse « MCP server ready » avec **`Checks 10/10`** pour 12 étapes. ⚠️ URL réelle `/build/connectors/playground?source=test_connector` et redirect URI **`…/build/connectors/playground/oauth-callback`**, alors que la doc donne `…/debugger/oauth-callback`. §2.7.
5. 🆕 **Skills dans Studio enfin montrés** : liste (une colonne Name), éditeur avec arborescence **FILES** (`SKILL.md`, dossiers `references/…`) et éditeur Markdown WYSIWYG, badge `vN • Latest`, **labels de version** (`staging`, `production`, `main`), boutons `Publish to Vibe` / `Share` / `Discard changes` / `Save changes`, modale **« Save new version »** (Version notes), modale **« Publish to Vibe? »**, état **`● Published ▾`**, panneau **« Version history »** (note, date, auteur implicite, labels). §2.10.
6. 🆕 **`Publish to Vibe` pose le label `main`** sur la version publiée (observé : apparition de `● main` à côté de `v2 • Latest` après publication ; dans un autre skill, `main` reste sur v2 alors que la dernière version est v6) → (inférence) la publication dans Vibe est un **alias de version**, ce qui répond à la question ouverte n° 14 de [22](22-vibe-work-le-chat.md).
7. 🆕 **Création de clé API (côté utilisateur)** vue en entier : dialogue profil (Profile / Preferences / [Security & Access] / My API Keys), liste à onglets `Active keys | Expired`, colonnes Name / Type / Key / Expires / Created / Last used, formulaire « Create API Key » (Key name, Expiration « No expiration date » par défaut, Connector access scope « Shared connectors only » par défaut, Workspace verrouillé), confirmation « API key successfully created ». §2.4.
8. 🆕 **Agents : l'historique de l'UI** : en déc. 2025, pas de versions (« Mettre à jour l'agent », fil « Playground / AA », menu sans « Historique des versions », « Déployer sur Le Chat ») ; en mars 2026, versions `v0 • Latest`, revue de diff, « Deploy to Le Chat » ; en juillet 2026 (base), « Disponible dans Vibe ». L'onglet **Configuration** du diff, jamais vu dans la base, est montré (sections Model, Model settings, Response format, Capabilities). §2.8.
9. 🆕 **Playground : écrans manquants de la base** : modale **« Configurer le schéma JSON »** (Éditeur de code / Constructeur visuel / Modèles ▾ / Générer le schéma / Effacer / Enregistrer), bloc **« Exécution D'outil »** (`web_search`), blocs **« Thinking… » / « Thoughts »** des modèles de raisonnement, infobulle de l'outil Code. §2.9.
10. 🆕 **Vibe Work** : menu `+` (Upload Files, Skills ›, Connectors ›, Libraries ›, Workflows ›, Agents › grisé, Reset input) avec sous-menus filtrables ; « Type / for quick access » ; page Skills avec **New skill ▾ = Create manually / Upload skill file / Upload skill folder** ; page tâches **« My Tasks »** (Suggested tasks, onglets Scheduled / Paused / Completed, `Run now`, `Previous runs`) ; projets (Tone, Instructions, « Include other projects' chats as context »). §2.13.
11. 🆕 **Vibe CLI** : panneau `/connectors` (« MCP Servers & Connectors » › « Workspace Connectors », compteur d'outils et état par connecteur) et **invite de permission à 4 choix** : `Allow once` / `Allow for remainder of this session` / `Always allow` / `Deny`. §2.14.
12. ⚠️ **Prompts : toujours aucun écran réel.** La vidéo officielle « versioned prompts and skills » n'est que du motion design (cartes stylisées) ; seules les étiquettes `staging` / `production` / `main` vues sur les Skills renseignent indirectement le modèle de labels. §2.11.

---

## 1. Fiches et chronologies par vidéo

Ordre : date de publication. « Console » = écrans réels de `console.mistral.ai` ; « MG » = motion design (illustrations, pas l'UI).

### 1.1 mC27FQVO3Lk — Loïc (FR), « Comment créer un agent IA sur Mistral »

| Champ | Valeur |
|---|---|
| Publication · durée | 20/12/2025 · 17:36 · tournée le 19/12/2025 (horloge Windows ; ID d'agent UUIDv7 `ag_019b3886…` = 19/12/2025 21:31 UTC, cohérent) |
| Contenu écran | Console **en français**, compte « Personal », plan non visible ; alternance face caméra / écran ; Le Chat (sombre) pour comparaison |
| Apport | **Seul état connu de la console avant les versions d'agent** ; modale JSON Schema ; exécution d'outil `web_search` ; catalogue de modèles de déc. 2025 |

Chronologie :
- 00:06–00:34 Google « MISTRAL » → mistral.ai (bouton « Essayez AI Studio »).
- 00:36 [Accueil déc. 2025](sources/videos-images/console/mC27FQVO3Lk_t00m36s.jpg) : cartes Créer / Observer / Améliorer avec liens « Bientôt disponible » (§2.3) ; menu latéral avec **Espace de travail**, **IA Document… `Bêta`**, groupe **Améliorer** (§2.2).
- 01:00 Playground FR : « Outils » = 4 icônes en ligne, « Functions » non traduit (§2.9).
- 01:08 [Liste des agents](sources/videos-images/console/mC27FQVO3Lk_t01m08s.jpg) : 5 colonnes, Source **« Agent Builder V1 »**, ID au format **`ag:6…3da4`** (§2.8).
- 01:58–03:20 saisie des instructions (bulle « Compatibility Notice » = extension navigateur Voice In, pas Studio).
- 04:16–04:30, 06:14–07:58 conversations de test (User / Assistant, tableaux Markdown, pastilles durée/tokens).
- 05:20–06:06, 10:22, 15:36, 16:58–17:22 Le Chat (hors Studio) : Nouveau Chat, Agents, Intelligence `Beta`, Nouveau Projet ; boutons Recherche / Réflexion / Outils.
- 08:08 modale « Créer un agent » **sans métadonnées** ; 08:12 « Agent créé avec succès » (cURL avec en-tête `X-API-KEY`).
- 08:18 éditeur « ← Playground / AA » + **« Mettre à jour l'agent »** ; 09:00 menu ⋮ avec **« Déployer sur Le Chat »** (§2.8).
- 11:00–12:14 sélecteur de modèles (liste §2.9) ; 12:22 infobulle « Code — Permettre au modèle d'exécuter du code. ».
- 13:38 bloc **« Exécution D'outil »** `web_search` (§2.9).
- 14:12–14:42 popover temperature / max_tokens / top_p (✅ identique à [30 §4.9](30-video-pentiminax-agents-sans-coder.md)).
- 15:00 modale « Ajouter une fonction » (✅ [30 §4.11](30-video-pentiminax-agents-sans-coder.md)).
- 15:52–16:06 Format de réponse **JSON-Schema** → [modale « Configurer le schéma JSON »](sources/videos-images/console/mC27FQVO3Lk_t15m56s.jpg) (§2.9).

### 1.2 X5IuZhiyftI — Coders Academy, « Mistral AI Agent: Your 2-Minute Code Review Bot »

| Champ | Valeur |
|---|---|
| Publication · durée | 31/03/2026 · 11:24 · 720p · agent créé le 29/03/2026 (UUIDv7) |
| Contenu écran | Console **en anglais**, org « CodersAcademy » ; console visible 00:58–03:58 et 05:58–10:00 ; le reste : face caméra, VS Code / PowerShell, Google, Perplexity |
| Apport | Agents avec **versions** (mars 2026), onglet **Configuration** du diff, menu ⋮ « Deploy to Le Chat », modale « Update Agent », affichage « Thinking / Thoughts » |

Chronologie :
- 00:58 mistral.ai, menu « Try Studio ▾ » : Mistral Studio / Vibe / Le Chat.
- 01:00 Accueil « Mistral AI Studio — Build, observe, and improve your AI Apps », cartes Create (Playground, Agents) et Audio (Speech to text, Text to speech), accordéon « Welcome Coders! » ; menu latéral mars 2026 (§2.2).
- 01:02 liste des agents (6 colonnes, filtres Source + Metadata ; ✅ [30 §4.18](30-video-pentiminax-agents-sans-coder.md)).
- 01:04 🆕 `/build/document-ai/ocr-playground` : « Document Intelligence », « Extract text from your documents », « 10 Docs Max • 50MB Each • PDFs, Images & more », Upload files / Add a URL / Paste files Ctrl+V, « Need More? Try the API. Up to 1,000 pages per document and 2,000 pages/min. ».
- 01:06 🆕 `/build/files` vide : « Files — Upload and manage your raw files for processing, fine-tuning, and other AI workflows. » ; « No files for now » ; See documentation / Upload file.
- 01:18 🆕 menu avatar (§2.1) ; liste d'agents vide : « No agent found — Create a new agent to handle specific tasks and use cases. ».
- 01:24–01:38 Playground EN → « Create Agent » → « Agent Created Successfully » (cURL `Authorization: Bearer`, `agent_version: 0`).
- 01:54–02:16 éditeur `Agents / Tech Triage Pro` `v0 • Latest` ; sélecteur de modèles ; modale « Review your changes » ; toast « Agent updated successfully ».
- 02:40–02:44 popover de paramètres puis [**onglet Configuration du diff**](sources/videos-images/console/X5IuZhiyftI_t02m44s.jpg) (§2.8).
- 03:08 bloc « Thinking… » (Magistral Small) ; 03:56 pastilles 3.20s ↑236 ↓522.
- 05:58–06:20 VS Code : SDK `mistralai` 1.7, erreur pydantic sur la sortie « thinking ».
- 06:56 modale **« Update Agent »** ; 07:02 [menu ⋮ avec « Deploy to Le Chat »](sources/videos-images/console/X5IuZhiyftI_t07m02s.jpg) ; 07:12 Capabilities dépliées (Built-in tools : Code / Image / Search / Premium Search ; Functions + Add ; **pas de « Reasoning effort »**).
- 08:10–09:30 diff Configuration `Model` : `magistral-small-latest` → `mistral-small-latest` ; versions jusqu'à `v5 • Latest`.

### 1.3 bemtZTeCtQ8 — Mistral, « Build, manage and run custom connectors »

| Champ | Valeur |
|---|---|
| Publication · durée | 15/04/2026 · 2:22 · tournage 14/04/2026 (UUIDv7 du connecteur) |
| Contenu écran | Safari, console claire ; scripts `step1…step7` du projet `pr_agent` dans VS Code |
| Apport | **Connectors en `Private Preview`** (avril), liste plate snake_case, fiche en **modale**, OAuth GitHub par SDK, callback `callback.mistral.ai` |

Chronologie :
- 00:00 [console avril 2026](sources/videos-images/console/bemtZTeCtQ8_t00m00s.jpg) : en-tête « AI Studio ▾ », org « Perso », workspace « my super workspace » ; menu avec **Improve : Observe, Evaluate, Fine-tune** ; liste des connecteurs à interrupteurs (§2.5).
- 00:02–00:20 terminal : `list_async` → « Total connectors: 15 » ; `create_async(name="custom_deepwiki", …, visibility="private")` → « Auth type: None ».
- 00:22–00:24 [« Connectors » `Private Preview` + modale du connecteur](sources/videos-images/console/bemtZTeCtQ8_t00m24s.jpg) (Overview | Tools ; « Interactive tools 3 »).
- 00:32–00:46 « Total connectors: 16 » ; OAuth via `get_auth_url_async` → page GitHub → `callback.mistral.ai/…/oauth2_callback` → `{"message":"Authorization successful"}` ; custom_deepwiki dans la section « Custom connectors » (pastille 1).
- 00:48–00:54 modale GitHub « Connected » onglet Tools ; onglet Overview + encart de confidentialité (§2.6).
- 00:58–01:56 `list_tools_async`, `call_tool_async` (appel direct), `agents.create_async` avec `tools=[{"type":"connector","connector_id":"custom_deepwiki"}, {"type":"connector","connector_id":"github_app"}, {"type":"web_search"}]` (le **nom** sert d'identifiant) ; agent `oss_auditor` ; 02:12 verdict « SAFE TO ADOPT ».

### 1.4 hUPcLLti5x0 — Mistral, « Use Connectors in Workflows »

| Champ | Valeur |
|---|---|
| Publication · durée | 28/05/2026 · 1:55 |
| Contenu écran | Console claire incrustée sur fond pixel-art ; terminal ; vue d'exécution de workflow |
| Apport | **Liste mai 2026** (Featured / Custom, colonnes Authentications / Enabled), **page fiche** Overview / Credentials / Permissions, **modale Credential name**, outils Interactive 18 / Read-only 28 avec schéma, menu latéral mai 2026 |

Chronologie :
- 00:26 [liste « Connectors » `Public Preview`](sources/videos-images/console/hUPcLLti5x0_t00m26s.jpg) : « Featured connectors » (Atlassian, Notion, Box, Stripe, Linear, **GitHub (PAT - DEPRECATED)**, Github, Slack…) (§2.5).
- 00:30 recherche « l » → Atlassian, Linear, Slack, Outlook Calendar, Gmail, Outlook, Google Calendar ; section « Custom connectors ».
- 00:38 [fiche Linear](sources/videos-images/console/hUPcLLti5x0_t00m38s.jpg) : « Authentication required — This connector requires credentials to display its tools. Connect to it from Le Chat or AI Studio to see available tools. » + `+ Add credentials` (§2.6).
- 00:44 [modale « Credential name »](sources/videos-images/console/hUPcLLti5x0_t00m44s.jpg) (Cancel / Connect).
- 00:54–01:00 [outils « Interactive 18 » / « Read-only 28 »](sources/videos-images/console/hUPcLLti5x0_t00m54s.jpg) ; 01:10 [outil déplié avec bloc `json`](sources/videos-images/console/hUPcLLti5x0_t01m10s.jpg).
- 01:12 doc « Your first workflow » ; 01:18–01:22 `make execute-linear-summary input='{"team":"DevRel","project":"*"}'`.
- 01:26 [menu latéral mai 2026 + exécution « Linear Weekly Summary »](sources/videos-images/console/hUPcLLti5x0_t01m26s.jpg) (§2.2, §2.12).

### 1.5 AR2IedLkEHo — Mistral, « Use Connectors in Vibe »

| Champ | Valeur |
|---|---|
| Publication · durée | 28/05/2026 · 2:37 (même tournage que 1.4 pour la partie Studio) |
| Contenu écran | Studio (Connectors) puis **Vibe CLI** dans un terminal macOS |
| Apport | Effet d'une credential (pastille + interrupteur `Enabled`), **panneau `/connectors`**, **invite de permission à 4 choix**, nommage `connector_<connecteur>_<outil>` |

Chronologie :
- 00:22–00:52 même parcours que 1.4 (liste, fiche Linear, Credential name « Linear credential »).
- 01:04 [liste après ajout](sources/videos-images/console/AR2IedLkEHo_t01m04s.jpg) : Linear remonte en tête, Authentications « ● 1 », interrupteur **Enabled vert**.
- 01:06 GitHub « github-credential » ; 01:08–01:10 fiche Notion (outils `notion-create-pages`, `notion-update-page`, `notion-move-pages`, `notion-duplicate-page`, `notion-create-database`, `notion-create-comment`, `notion-create-view`…).
- 01:12 [Vibe CLI : `/connectors`](sources/videos-images/console/AR2IedLkEHo_t01m12s.jpg) (§2.14) ; 01:16 bannière de session.
- 01:26–01:30 « Generating… » puis [invite « Permission for the connector_notion_notion-search tool »](sources/videos-images/console/AR2IedLkEHo_t01m30s.jpg).
- 01:36–02:04 lecture de fichier, `get_issue` Linear (choix 2), todos, diff appliqué, commit, `create_pull_request`, `save_issue` ; résumé final (jauge « 32% of 200k tokens »).
- 02:06 issue Linear mise à jour (hors Studio).

### 1.6 8MHd_arELJo — Mistral, « Automate GitHub issue management with Vibe »

| Champ | Valeur |
|---|---|
| Publication · durée | 15/06/2026 · 3:20 |
| Contenu écran | Console (claire) puis **Vibe Work (sombre)**, GitHub ; MG au début et à la fin |
| Apport | **Liste juin 2026** (Connected / Available, `Indexed`), fiche **GitHub** (Visibility Organization, OAuth2), retour OAuth `?success=true`, **sélecteur de produits**, page **Skills de Vibe**, **New skill ▾**, projet Vibe, page connecteur Vibe |

Chronologie :
- 00:28 liste « Connectors » `Public Preview`, workspace « GitHub Issue Management », groupes « Connected 7 » / « Available 10 » (§2.5).
- 00:30 [fiche GitHub `/build/connectors/019d8b52-…`](sources/videos-images/console/8MHd_arELJo_t00m30s.jpg) : Overview | Credentials ; Visibility Organization ; Authentication OAuth2 ; Capabilities Interactive / Read-only ; puce `github_app`.
- 00:32–00:42 Credential name (GitHub, puis Linear « linear-credential ») → écran noir (redirection OAuth).
- 00:44–00:48 retour `/build/connectors/<id>?connector=<id>&integration_id=<id>&success=true` ; Capabilities « — » puis chips ; outils « Interactive 18 ».
- 00:48 clic « Studio ▾ » → menu Vibe / Studio / Docs & API / Admin (§2.1).
- 00:54 [Vibe `chat.mistral.ai/skills`](sources/videos-images/console/8MHd_arELJo_t00m54s.jpg) ; 00:56 menu **New skill ▾** ; 00:58 sélecteur de fichiers ; 01:02 panneau de création `?dialog=create` (§2.13).
- 01:34 skill personnel créé ; 01:38 modale « Create a new project ».
- 01:44–01:48 `chat.mistral.ai/connections?connector=github_app` (modale GitHub « Connected », Overview | Functions, « Configure repositories ») → page d'installation de l'app GitHub de Mistral (permissions).
- 01:52 [projet Vibe + menu `+`](sources/videos-images/console/8MHd_arELJo_t01m52s.jpg) ; 02:10 message avec puces GitHub / Linear / skill, état « Thinking » ; 02:16 « Some Time Later… » ; 02:24 réponse finale ; 02:28–02:44 GitHub.

### 1.7 QjoTkonLub4 — Mistral, « Debug MCP Connector Auth with the Connectors Debugger »

| Champ | Valeur |
|---|---|
| Publication · durée | 24/06/2026 · 4:56 · tournage ~21/06/2026 (en-tête HTTP `date: Sun, 21 Jun 2026`) |
| Contenu écran | Console claire incrustée (00:40–01:50, 02:44–03:02, 04:10–04:22) ; le reste : face caméra et **MG** (panneau sombre stylisé « Connectors Debugger », à ne pas confondre avec l'UI) |
| Apport | **Accueil et menu latéral EN de juin**, **liste Connected / Available**, **Debugger complet** (3 exécutions : 2 échecs puis succès) |

Chronologie :
- 00:40 [Accueil EN + menu latéral juin](sources/videos-images/console/QjoTkonLub4_t00m40s.jpg) (✅ structure de [30 §4.3](30-video-pentiminax-agents-sans-coder.md), en anglais).
- 00:42 [liste « Connectors » badge `Preview` + bouton « Debugger »](sources/videos-images/console/QjoTkonLub4_t00m42s.jpg).
- 00:44 [Debugger, état vide](sources/videos-images/console/QjoTkonLub4_t00m44s.jpg) ; 00:46 URL saisie (`…koyeb.app/mcp`).
- 01:00 [exécution 1 : `Error 1.1s`](sources/videos-images/console/QjoTkonLub4_t01m00s.jpg) ; 01:06 étape 2 ; 01:16 étape 3 ; 01:24 étape 4 ; 01:36 [étape 5](sources/videos-images/console/QjoTkonLub4_t01m36s.jpg) ; 01:42–01:50 [étape 6 en échec](sources/videos-images/console/QjoTkonLub4_t01m50s.jpg).
- 02:46 exécution 2 (`Error 1.7s`, étape 6 OK, échec étape 9) ; 03:00 détail `unsupported_grant_type`.
- 04:10 exécution 3 « Running » + `Cancel` ; 04:12 [`Completed 2.1s`](sources/videos-images/console/QjoTkonLub4_t04m12s.jpg) ; 04:14 Validate token ; 04:16 Initialize MCP ; 04:20 [Report overview](sources/videos-images/console/QjoTkonLub4_t04m20s.jpg) (§2.7).

### 1.8 nxhRrry5UiY — Mistral, « Introducing versioned prompts and skills in Studio »

| Champ | Valeur |
|---|---|
| Publication · durée | 09/07/2026 · 3:17 · 99 images, toutes distinctes |
| Contenu écran | **Aucune capture de la console** : 100 % face caméra + **MG** (cartes beige/orange stylisées « Studio ») |
| Apport | Modèle conceptuel illustré (pas d'UI) ; à ne citer que comme intention produit |

Chronologie (illustrations) :
- 00:00 schéma « Agent » relié à LLM, Tools, Skills, Connectors, Prompts, Memory.
- 00:16 frise de versions en **semver** (`v1.0.0`, `v1.0.1`, `v1.1.0`, `v2.0.0-rc`, `v2.0.0`) ⚠️ la console numérote `v1`, `v2`… (§2.10).
- 00:26 Update prompt → Open PR → Await review → Await deployment.
- 00:40 carte « support_prompt » (texte + badge `Published`) ; 00:48 carte « Version History » : Last modified — / Author Unknown / Changelog None (état « non versionné »).
- 01:00 « Studio » : Skills / Prompts / Shareable objects ; Version History : « Last modified 2 min ago / Author @support-ops / Changelog v3.1 → v3.2 ».
- 01:20 Skill = Instructions / Tools / Reference documents ; 01:30 Name `tier1-support-v1`, Description, Owner `@support-ops`.
- 01:38 `customer-support-workflow` « 🔒 Pinned to tier1-support-v1 ».
- 01:52 Prompts `support-system-prompt` v2 / v3 [`production`] ; « ✓ No code release required ».
- 02:02 environnements **dev** (@support-ops, author) → **staging** (@product-manager, test) → **prod** (@compliance, promote).
- 02:14 carte « Activity » : authored v3 / promoted to staging / promoted to prod / « @engineering not required ».
- 02:22 Skills [🔒 Private], Prompts [Shared], Objects [🔒 Private] ; 02:28 « Private variants » (`support-prompt:eu`, `:enterprise`, `:internal`, chacun privé) face à `support-system-prompt` [◎ workspace].
- 02:56 « Change history » [visible to all] avec bouton « ↺ revert ».

### 1.9 v_LttjsevRg — Mistral, « Update a skill with versioning in Studio »

| Champ | Valeur |
|---|---|
| Publication · durée | 09/07/2026 · 1:22 |
| Contenu écran | Console claire EN (menu « Build ») puis Vibe Work (claire) |
| Apport | **Écrans Skills de Studio** (liste, éditeur, sauvegarde de version, publication) ; menu `+` de Vibe et ses sous-menus |

Chronologie :
- 00:04 Accueil ; menu latéral juillet EN (§2.2).
- 00:08 [liste Skills](sources/videos-images/console/v_LttjsevRg_t00m08s.jpg) ; 00:12 éditeur (FILES + `SKILL.md`).
- 00:20 [en-tête du skill modifié : `v1 • Latest`, label `staging`, boutons](sources/videos-images/console/v_LttjsevRg_t00m20s.jpg).
- 00:22–00:26 [modale « Save new version »](sources/videos-images/console/v_LttjsevRg_t00m26s.jpg) ; 00:28 toast « Skill updated », `v2 • Latest`, URL `/build/skills/019ead47-…`.
- 00:30 [modale « Publish to Vibe? »](sources/videos-images/console/v_LttjsevRg_t00m30s.jpg) ; 00:36 [`● main` + `● Published ▾`](sources/videos-images/console/v_LttjsevRg_t00m36s.jpg).
- 00:40 Vibe Work accueil ; 00:42 projet vide ; 00:44–00:50 [menu `+` et sous-menus Skills / Libraries / Connectors](sources/videos-images/console/v_LttjsevRg_t00m46s.jpg) ; 00:54–01:14 exécution et réponse.

### 1.10 sTxSGrLkro0 — Mistral, « Automate tasks using skills and Connectors in Vibe »

| Champ | Valeur |
|---|---|
| Publication · durée | 20/07/2026 · 2:44 · **format vertical 9:16** |
| Contenu écran | Face caméra plein cadre + incrustations (console et Vibe, thème sombre) dans le bas de l'image |
| Apport | **Nouvelle mise en page de la console** (sélecteur org/workspace en pied de menu), fiche connecteur **custom** (Server URL, Visibility Private, onglet **Preferences**), skill `v6` avec **Copy ID / Copy name**, **Version history** avec labels, **Scheduled tasks** de Vibe |

Chronologie :
- 00:00 incrustation SKILL.md « Bitly to Notion Toggle Integration ».
- 00:28–00:42 Bitly Analytics (tiers).
- 00:46 [fiche connecteur Bitly](sources/videos-images/console/sTxSGrLkro0_t00m46s.jpg) (§2.6) ; 00:48 « Interactive 16 ».
- 00:50–01:44 Vibe : chats « Top Performing Links Analysis », « Latest Database Page by Date » ; « Worked for 3min 34s » ; « Execution of Notion Update Page » + bulle **« Allowed »** ; « ✅ All tasks completed! ».
- 01:46 « Write a Skill… » → « ✅ Skill created: bitly-notion-toggle » + puce « Skill creation » ; enregistré dans `/home/user/skills/bitly-notion-toggle/SKILL.md` ; sélecteur « Fast ▾ » dans la zone de saisie.
- 01:52–02:10 SKILL.md (appels `tools.bitly.get_groups`, `tools.notion.notion_query_database_view`…).
- 02:12 menu latéral Vibe ; 02:16 **« My Tasks »** ; 02:20 onglets Scheduled / Paused / Completed ; 02:22 détail de tâche (§2.13).
- 02:24 skill dans Studio `v6 • Latest` ; 02:26–02:30 [panneau « Version history »](sources/videos-images/console/sTxSGrLkro0_t02m26s.jpg) (§2.10).

### 1.11 qIAJyb1w7Js — Mistral, « Build a database advisor agent with a custom DeepWiki Connector »

| Champ | Valeur |
|---|---|
| Publication · durée | 05/08/2026 · 6:36 · tournage ~04/08/2026 (UUIDv7) |
| Contenu écran | Console **sombre** 01:20–01:34 ; notebook VS Code ; face caméra, pixel art |
| Apport | **Liste des clés API** (dialogue profil, onglets Active keys / Expired, colonnes) |

Chronologie :
- 01:20 [`/build/agents?profile_dialog=api-keys`](sources/videos-images/console/qIAJyb1w7Js_t01m20s.jpg) : liste des clés (§2.4).
- 01:22–01:30 formulaire « Create API Key », menu Connector access scope (✅ identique à 1.12).
- 02:54–06:20 notebook : `create_async(…, server="https://mcp.deepwiki.com/mcp", visibility="private")`, `create_or_update_user_credentials_async(…, credentials={"headers": {}}, is_default=True)`, outils DeepWiki `ask_question`, `read_wiki_contents`, `read_wiki_structure` ; événements `tool.execution.*` ; `update_async`, `delete_async` (« Connector deleted successfully ») (§2.15).

### 1.12 Th8npm3z1kA — Mistral, « Build a quickstart generating agent with web search and Connectors »

| Champ | Valeur |
|---|---|
| Publication · durée | 01/10/2026 · 7:09 · connecteur créé le 18/08/2026 (UUIDv7) |
| Contenu écran | Console claire 01:20–01:32 (clé API) ; notebook ; face caméra |
| Apport | **Formulaire « Create API Key » complet**, entrée « Security & Access » du dialogue profil, menu latéral flouté d'oct. 2026 (lecture probable d'un groupe « Traces ») |

Chronologie :
- 00:48–00:54 tableau des 5 étapes du cookbook (None / Web search / Context7 connector / Both / Filtered connector).
- 01:22 [dialogue profil « My API Keys », état vide](sources/videos-images/console/Th8npm3z1kA_t01m22s.jpg) ; 01:24 [formulaire](sources/videos-images/console/Th8npm3z1kA_t01m24s.jpg) ; 01:26 [menu Connector access scope](sources/videos-images/console/Th8npm3z1kA_t01m26s.jpg) ; 01:28 [« API key successfully created »](sources/videos-images/console/Th8npm3z1kA_t01m28s.jpg) (§2.4).
- 03:56 `connectors.create_async(name="quickstart_context7", server="https://mcp.context7.com/mcp", visibility="private")` ; outils `resolve-library-id`, `query-docs`.
- 05:24 filtrage `"tool_configuration": {"include": [DOC_TOOL_NAME]}` ; 06:20 nettoyage ; récapitulatif « Mistral features used: Connectors (beta), Conversations API (beta), Agents API (beta)… ».

---

## 2. Inventaire consolidé par écran

### 2.1 Cadre global : barre supérieure, sélecteur de produit, menu avatar, dialogue profil

| Élément | Observé | Source | Statut |
|---|---|---|---|
| Nom de produit dans l'en-tête | « AI Studio ▾ » (déc. 2025, mars, avril 2026) → « Studio ▾ » (mai 2026 →) ; logo violet → bleu | mC27 t00m36s, X5Iu t01m00s, bemt t00m00s, QjoT t00m40s | 🆕 (évolution) |
| **Sélecteur de produit** (clic « Studio ▾ ») | menu : **Vibe · Studio · Docs & API · Admin** (icônes) | 8MHd t00m48s | 🆕 (✅ onglets cités en [31 §4.2](31-autres-videos.md)) |
| Organisation / workspace | pastilles « P Personal » / « C CodersAcademy » / « D devrel » + « D Default Workspace ⇕ » dans la barre noire ; **en juillet 2026 (20/07), déplacés en pied de menu latéral** (« JP devrel / Default Workspace ») avec une loupe à côté de « Studio ▾ » | sTxS t00m46s | 🆕 |
| Boutons de droite | « Feedback » apparaît entre avril et mai 2026 (absent le 29/03 et le 14/04, présent le 28/05) ; « Search ⌘K » / « Rechercher Ctrl+K » ; avatar | X5Iu t01m00s, bemt t00m00s, hUPc t00m26s | 🆕 |
| Titre d'onglet | « AI Studio - Mistral AI » ; « Agents - AI Studio - Mistral AI » ; « Skills - AI Studio - Mistral AI » ; « Connectors - AI Studio - Mistral AI - AI Studio - Mistral AI » (doublé, bug de titre) | bemt t00m42s, v_Lt t00m38s | ✅ / 🆕 |
| **Menu avatar** (mars 2026) | nom + e-mail ; **Profile ; API Keys ; Admin settings ; Billing ; Terms of service ; Help center ; Log out** | X5Iu t01m18s | 🆕 |
| **Dialogue profil** (modale, `?profile_dialog=api-keys`) | en-tête avatar + nom + e-mail ; menu **Profile · Preferences · My API Keys** (août 2026) ; **+ « Security & Access »** (oct. 2026) | qIAJ t01m20s, Th8n t01m22s | 🆕 (✅ route citée en [03](03-administration-securite-facturation.md)) |
| Mode sombre | la console existe en thème sombre (août 2026) | qIAJ t01m20s | 🆕 |
| Icônes flottantes en bas à droite | drapeau (feedback, inférence) et « ? » | QjoT t00m40s, sTxS t00m46s | 🆕 |

### 2.2 Menu latéral : évolution observée (déc. 2025 → oct. 2026)

| Date (source) | Groupes et entrées (ordre exact ; badges entre crochets) |
|---|---|
| **19/12/2025** (mC27 t00m36s, FR) | Accueil · **Espace de travail** · Clés API · **Créer** : Playground, Agents, Batches, IA Document… [Bêta] · **Améliorer** : Observer, Évaluer, Fine-tune · **Contexte** : Fichiers · **Code** (replié) · **Documentation** : Documentation, Models, API, Cookbooks · « Obtenir de l'aide » |
| **29/03/2026** (X5Iu t01m00s, EN) | Home · API Keys · **Create** : Playground, Agents, Batches, Document AI, Audio · **Improve** : Fine-tune · **Context** : Files · **Code** : Vibe CLI [New], Codestral · Help & Resources |
| **14/04/2026** (bemt t00m00s) | Home · API Keys · **Create** : Playground, Agents, Batches, Document AI, Workflows, Audio · **Improve** : Observe, Evaluate, Fine-tune · **Context** : Files, **Connectors [New]** · **Code** : Vibe CLI [New], Codestral · Help & Resources |
| **mai 2026** (hUPc t01m26s) | Home · API Keys · **Create** : Playground, Agents, Batches, Document AI, Workflows (**List, Executions, Workers [WIP]**), Audio · **Improve** : Fine-tune · **Context** : **Prompts [WIP], Skills [WIP]**, Files, Connectors [New] · **Code** : Vibe CLI [New], Codestral · Help & Resources |
| **juin 2026** (QjoT t00m40s, 8MHd t00m28s) | Home · API Keys · **Create** : Playground, Agents, Batches, Document AI, Workflows ›, Audio › · **Context** : Prompts [New], Skills [New], Files, **Libraries [New]**, Connectors · **Code** : Vibe CLI [New] · Help & Resources (plus de groupe Improve) |
| **09/07/2026** (v_Lt t00m04s, EN) | Home · API Keys · **Build** : Agents ›, Audio ›, Batches, Document AI, Workflows › · **Context** : Connectors, Knowledge ›, Prompts [New], Skills [New] · Help & Resources (= version FR de [30 §4.2](30-video-pentiminax-agents-sans-coder.md) : « Créer » / « Contexte ») |
| **20/07/2026** (sTxS t00m46s) | idem, sélecteur org/workspace en pied de menu |
| **~18/08/2026, publié 01/10** (Th8n, image floutée) | Home · API Keys · Agents, Audio, Batches, Document AI, Workflows · Connectors, Knowledge, Prompts, Skills · 3e groupe : « **Traces** » (lecture probable d'un fond flou ; inférence) |

Constats :
- 🆕 Le groupe **« Améliorer / Improve » (Observer, Évaluer, Fine-tune)** était visible en déc. 2025 et avril 2026, réduit à Fine-tune en mars et mai, absent dès juin (inférence : affichage dépendant du compte ou de flags d'accès ; cohérent avec l'Observability en Private Preview, [00 §10](00-synthese.md)).
- 🆕 **Prompts et Skills sont passés par un badge `WIP`** (mai) avant `New` (juin) ; **Workflows** avait les sous-entrées **List / Executions / Workers [WIP]** en mai.
- 🆕 « Codestral » et « Vibe CLI » formaient un groupe « Code » jusqu'en mai ; **« Espace de travail »** était une entrée de menu en déc. 2025.
- ⚠️ La base ([00 §4](00-synthese.md)) décrit le menu FR de juillet comme état de référence ; c'est **une étape parmi au moins sept**.

### 2.3 Accueil (`/home`) : évolution

| Date | Contenu | Source |
|---|---|---|
| déc. 2025 (FR) 🆕 | Fond orange plein ; bouton « Explorer le Playground » ; titre « Mistral AI Studio » ; « Construisez, observez et améliorez vos applications IA » ; 3 cartes : **Créer** (« Utilisez l'IA de pointe dans votre application, ouverte et personnalisable selon vos besoins. » → Playground, Agents), **Observer** (« Maîtrisez vos conversations IA et les performances de vos outils. » → Observer `Bientôt disponible`, Explorateur `Bientôt disponible`), **Améliorer** (« Maximisez les performances de l'IA et minimisez les coûts avec un fine-tuning qui répond exactement à vos besoins. » → Évaluer `Bientôt disponible`, Fine-tune) ; toast « Bienvenue ! » | [mC27 t00m36s](sources/videos-images/console/mC27FQVO3Lk_t00m36s.jpg) |
| mars 2026 (EN) 🆕 | Bandeau orange, « Explore Playground » ; « Mistral AI Studio — Build, observe, and improve your AI Apps » ; cartes **Create** (→ Playground, Agents) et **Audio** (« Test our audio models in the audio playground. » → Speech to text, Text to speech) ; accordéon « Welcome <prénom>! » | X5Iu t01m00s |
| juin 2026 (EN) ✅ | « Mistral Studio » / « Your workspace for building, testing, and managing AI-powered apps. » ; Discord, Help Center ; cartes **Build** (Playground, Workflows, Create an API key) / **Capture** (OCR, Speech-to-text, Text-to-speech) ; Quickstart (Create an Agent, Test audio models, API Requests) ; Documentation (Document AI, Text & Chat completion, Agents ; « See all docs ») | [QjoT t00m40s](sources/videos-images/console/QjoTkonLub4_t00m40s.jpg) (= [30 §4.3](30-video-pentiminax-agents-sans-coder.md) en FR) |

🆕 L'accueil de déc. 2025 confirme visuellement le découpage **Create / Observe / Improve** évoqué en [31 §4.2](31-autres-videos.md) et montre qu'Observer, Explorateur et Évaluer y étaient annoncés « Bientôt disponible ».

### 2.4 Clés API (côté utilisateur, dialogue profil)

**Liste** (août 2026, [qIAJ t01m20s](sources/videos-images/console/qIAJyb1w7Js_t01m20s.jpg)) 🆕

| Élément | Détail |
|---|---|
| Accès | dialogue profil › « My API Keys » ; URL `…?profile_dialog=api-keys` sur n'importe quelle page (ici `/build/agents`) |
| En-tête | « Manage keys » ; « Keys are tied to your account and the workspace: <nom du workspace> » |
| Onglets | **« Active keys » | « Expired »** (✅ « clés actives et expirées », [03](03-administration-securite-facturation.md)) |
| Bouton | « + Add a new key » |
| Colonnes | **Name ⇅ · Type ⇅ · Key ⇅ · Expires ⓘ ⇅ · Created ⇅ · Last used** |
| Valeurs | Type = badge bleu `Studio` ; Key masquée `**...6bUB` ; Expires « Never » ; Created « 11 days ago » ; Last used date longue (« July 24th 2026 ») ; clé sans nom affichée « *No name* » en italique |
| Actions par ligne | icône ↻ (inférence : régénérer / rotation) et corbeille |

**État vide** (oct. 2026, [Th8n t01m22s](sources/videos-images/console/Th8npm3z1kA_t01m22s.jpg)) 🆕 : icône clé pixel-art ; « No API Key created? » ; « Generate one to start using the API and build great things » ; bouton « Create new key ».

**Formulaire « Create API Key »** ([Th8n t01m24s](sources/videos-images/console/Th8npm3z1kA_t01m24s.jpg), [t01m26s](sources/videos-images/console/Th8npm3z1kA_t01m26s.jpg)) 🆕

| Champ | Défaut / placeholder | Options / aide |
|---|---|---|
| Key name `[Optional]` | placeholder « My API Key » | — |
| Expiration `[Optional]` | **« No expiration date » ▾** | (liste non ouverte) |
| Connector access scope ▾ | **« Shared connectors only »** (✅ [03](03-administration-securite-facturation.md)) | ✓ « Shared connectors only — Access only connectors shared with the workspace (not your private ones) » ; « Private and shared connectors — Access both your private connectors and the ones that are shared with the workspace. » ; aide : « Choose which workspace connectors the API key should have access to. Learn more about connector visibility here. » |
| Workspace ▾ | workspace courant, **grisé** (non modifiable depuis ce dialogue) | — |
| Boutons | « Cancel » / **« New key »** | ⚠️ la doc ([11 §4.2](11-demarrage-playground-agents-connecteurs.md)) nomme le bouton `Create new key` (libellé du bouton de l'état vide, pas du formulaire) |

**Confirmation** ([Th8n t01m28s](sources/videos-images/console/Th8npm3z1kA_t01m28s.jpg)) 🆕 : « ✓ API key successfully created » ; champ de clé masqué + « Copy » ; « Save this key somewhere safe. You won't see it again. » ; « Done ».

### 2.5 Connecteurs : liste (`/build/connectors`)

| Génération | Date (source) | Badge | Mise en page | Colonnes | Contenu |
|---|---|---|---|---|---|
| 1 🆕 | 14/04/2026 (bemt t00m00s, t00m22s) | **`Private Preview`** | liste plate ; noms techniques snake_case ; « Custom connectors » en section après ajout | (nom + description), compteur de credentials, date, **interrupteur** | `google_drive`, `sharepoint`, `google_calendar`, `atlassian`, `notion`, `box`, `stripe`, `github` (« …using a Personal Access Token. »), `outlook`, `github_oauth`, `slack`, `github_app` ; le SDK en liste 15 dont **`memories`**, `gmail`, `linear` |
| 2 🆕 | 28/05/2026 ([hUPc t00m26s](sources/videos-images/console/hUPcLLti5x0_t00m26s.jpg)) | **`Public Preview`** | sections **« Featured connectors »** puis **« Custom connectors »** ; « Columns 4 » ; Search ; « + Add Connector » | **Connector Name ⇅ · Authentications ⌄ · Created ⇅ · Enabled ⇅** | Atlassian, Notion, Box, Stripe, Linear, **« GitHub (PAT - DEPRECATED) »**, Github, Slack, Outlook Calendar, Gmail, Outlook, Google Calendar… ; Authentications « 0 » ou « ● 1 » ; **Enabled = interrupteur, vert après ajout d'une credential** ([AR2I t01m04s](sources/videos-images/console/AR2IedLkEHo_t01m04s.jpg)) |
| 3 🆕 | 15–21/06/2026 (8MHd t00m28s, [QjoT t00m42s](sources/videos-images/console/QjoTkonLub4_t00m42s.jpg)) | `Public Preview` puis **`Preview`** | groupes repliables **« ● Connected N »** / **« ● Available N »** ; boutons **« Debugger »** et « + Add Connector » | **Name ⇅ · Type ⇅ · Credentials ⌄ · Updated ⇅** | Type = `Featured` ou `Custom` ; badge **`Indexed`** sur Google Drive et SharePoint ; Credentials = pastilles colorées (verte, et une rouge sur Notion : inférence, credential en erreur ou expirée) ; exemples Connected : GSC, LinkedIn MCP, Notion, Bitly, GitHub, Google Calendar, Linear, Slack ; Available : Atlassian, Box, GitHub, Gmail, Google Drive, Linear, Outlook, Outlook Calendar, SharePoint |

Textes : sous-titre constant « Create and manage your connectors » ; descriptions des connecteurs intégrés, par ex. Atlassian « Connect to Confluence and Jira to search, summarize, and perform project actions. », Box « Search, analyze, and get insights from your files in Box. », Stripe « Access and manage payments, customers, and transactions in Stripe. », Linear « Search, summarize, and manage your issues and projects in Linear. », GitHub « Search repositories, review issues, and manage pull requests in Git… », Slack « Search messages, read channels, send messages, and manage can… », Outlook Calendar « Manage your Outlook Calendar — search events, schedule and delete meetings, and accept or decline invitations. », Gmail « Read and send emails with Gmail. », Google Calendar « Manage your Google Calendar events. » ; connecteur custom sans description : « No description ».

🆕 **Dépréciation affichée** : « GitHub (PAT - DEPRECATED) — This connector is deprecated and will be removed on 2026/04/27. The GitHub OAuth connector should be used instead. » (toujours listé le 28/05, donc après la date annoncée).
🆕 Trois connecteurs GitHub coexistent en avril : `github` (PAT), `github_oauth`, `github_app` ; c'est `github_app` qui est utilisé ensuite (puce « github_app » de la fiche GitHub en juin).
⚠️ Base : Connectors « Public Preview » depuis le 22/05/2026 ([00 §12](00-synthese.md)) ✅ ; mais le badge était **`Private Preview`** le 14/04 et devient **`Preview`** le 21/06.

### 2.6 Connecteurs : fiche, outils, credentials, OAuth

**Fiche en modale (avril 2026)** — [bemt t00m24s](sources/videos-images/console/bemtZTeCtQ8_t00m24s.jpg) 🆕 : icône, nom, **« ● Connected »** ; onglets **Overview | Tools** ; « **Interactive tools 3** » (`read_wiki_structure`, `read_wiki_contents`, `ask_question`, descriptions complètes avec « Args ») ; onglet Overview : description + encart bouclier **« Your data will be kept private to members of this workspace. Mistral will not use it as training data. »** (bemt t00m54s ; même encart côté Vibe, 8MHd t01m46s).

**Page fiche (mai → juillet 2026)** `/build/connectors/<uuid>` 🆕

| Élément | Mai (hUPc t00m38s) | Juin (8MHd t00m30s) | Juillet (sTxS t00m46s, custom) |
|---|---|---|---|
| Fil d'Ariane | « Connectors / Linear » | « Connectors / GitHub » | « Connectors / Bitly » |
| Bouton principal | « + Add credentials » (dans l'encart) | **« + Add credentials »** noir en haut à droite | « + Add credentials » + **« ⋯ »** |
| Identité | logo, nom, description | + puce copiable **« ⧉ github_app »** | + pastille verte sur le logo (connecté) ; puce « ⧉ bitly » |
| Onglets | **Overview | Credentials | Permissions** | **Overview | Credentials** | **Overview | Credentials | Preferences** |
| Carte « Information » | Origin `Featured` · Capabilities `—` · Connector name `linear` · Connector ID `0198f11e-…` | **Visibility `Organization` ⓘ** · **Authentication `OAuth2`** · Origin `Featured` · Capabilities `[Interactive] [Read-only]` · Connector name `github_app` · Connector ID (vide) | **Server URL** `https://api-ssl.bitly.com/v4/mcp` · Visibility **`Private`** ⓘ · Authentication `OAuth2` · Origin **`Custom`** · Capabilities `[Interactive] [Read-only]` · Connector name `bitly` · Connector ID `019e2b0c-…` |
| Section « Includes » sans credential | encadré bleu « **Authentication required** — This connector requires credentials to display its tools. Connect to it from Le Chat or AI Studio to see available tools. » + « + Add credentials » (infobulle « Store new credentials for your connector. ») | « Authentication required — This connector requires credentials to display its tools. » | — |

🆕 Le champ **Visibility** affiche `Organization` pour un connecteur intégré et `Private` pour un connecteur custom (correspond à `shared_org` / `private` de l'API, [11](11-demarrage-playground-agents-connecteurs.md) ; inférence sur la correspondance).

**Outils (section « Includes »)** 🆕 — [hUPc t00m54s](sources/videos-images/console/hUPcLLti5x0_t00m54s.jpg), [t01m10s](sources/videos-images/console/hUPcLLti5x0_t01m10s.jpg) :
- groupes repliables **« Interactive N »** et **« Read-only N »** (Linear : 18 / 28 ; Bitly : Interactive 16) ; chaque ligne = icône, nom (`save_issue`, `create_attachment` [« Deprecated fallback… »], `list_issues`, `get_document`…), description tronquée, chevron › ;
- outil déplié : description complète (exemples, « Workflow: 1… 4 », exemple curl) + **bloc `json` copiable = `inputSchema`** (`$schema` draft-07, `properties`, `required`).
- ✅ cohérent avec « interactive / read-only tools » ([31 C4](31-autres-videos.md)) ; ⚠️ le vocabulaire diffère de Vibe Work (« Read functions / Write functions », [22](22-vibe-work-le-chat.md)) et l'activation outil par outil dans Studio (citée en [31 §3.13](31-autres-videos.md)) **n'est pas visible** dans ces captures (pas d'interrupteur par outil).

**Ajout d'une credential** — [hUPc t00m44s](sources/videos-images/console/hUPcLLti5x0_t00m44s.jpg) 🆕 : modale titrée par le logo + nom du connecteur ; champ **« Credential name »** (placeholder « My credential ») ; aide « You are registering new credentials for this connector. Give them a name to help you identify them later. » ; boutons « Cancel » / **« Connect »** (noir). Pour un connecteur OAuth, « Connect » ouvre la page du fournisseur (écran noir intermédiaire, 8MHd 00:42), puis retour sur `/build/connectors/<id>?connector=<id>&integration_id=<id>&success=true` (8MHd t00m44s) 🆕 ; la carte Capabilities passe de « — » à `[Interactive] [Read-only]` et les outils se chargent (squelettes).

**OAuth par le SDK** (bemt 00:40–00:42) 🆕 : `get_auth_url_async` renvoie une URL GitHub `…/login/oauth/authorize?client_id=…&response_type=code&redirect_uri=https://callback.mistral.ai/v1/integrations_auth/oauth2_callback&state=<uuid>&scope=repo read:org read:user user:email read:packages write:packages read:project project gist notifications workflow codespace&code_challenge=…&code_challenge_method=S256&resource=https://api.githubcopilot.com/mcp/` ; la page de callback affiche `{"message":"Authorization successful"}`. (PKCE S256 ; serveur MCP GitHub = `api.githubcopilot.com/mcp`.)

**App GitHub de Mistral** (8MHd t01m48s) 🆕 : page d'installation GitHub « …connect GitHub to all Mistral products, including Vibe and AI Studio » ; permissions **lecture** (actions, commit statuses, metadata) et **lecture-écriture** (checks, code, discussions, issues, pull requests, repository hooks, workflows) ; accès « All repositories » ou « Only select repositories ».

### 2.7 Connectors Debugger — étape par étape

**Accès et état vide** — [QjoT t00m44s](sources/videos-images/console/QjoTkonLub4_t00m44s.jpg) 🆕

| Élément | Observé |
|---|---|
| Entrée | bouton **« Debugger »** à gauche de « + Add Connector » sur la liste (✅ [11](11-demarrage-playground-agents-connecteurs.md)) |
| URL | ⚠️ **`/build/connectors/playground?source=test_connector`** (la doc donne `/build/connectors/debugger`) |
| Fil d'Ariane | « Connectors / Debugger » |
| Champ | icône lien + placeholder **« https://my-mcp-server.example.com/ »** (pas d'étiquette « Connector URL » visible) ; bouton icône réglages (curseurs) ; bouton **« Run diagnostic »** |
| Colonne gauche | liste des 12 étapes en squelette |
| État vide (droite) | chat pixel-art + **« Validate the server, review the MCP report, then create your connector. »** |

**Exécution** 🆕
- En-tête d'état : **« Debugger [Error] ⏱ 1.1s »** (exécution 1), « Error ⏱ 1.7s » (exécution 2), **« ↻ Running »** avec le bouton **« Cancel »** à la place de « Run diagnostic » (exécution 3, t04m10s), puis **« ✓ Completed ⏱ 2.1s »** ([t04m12s](sources/videos-images/console/QjoTkonLub4_t04m12s.jpg)).
- Colonne des étapes : ✓ vert (réussie), ✗ rouge (échec), numéro gris (non exécutée) ; latence affichée seulement pour les étapes réseau (1, 3, 4, 6, 9, 11) ; panneau droit vide pendant l'exécution : « Select a step to inspect ».
- ✅ Les 12 libellés de [31 §3.7](31-autres-videos.md) sont confirmés à l'identique.

| # | Étape | Panneau de détail observé (sections et champs) | Image |
|---|---|---|---|
| 1 | Reach server | « Information » ; **« Headers (22) »** (JSON : `date`, `content-type`, `x-powered-by: Express`, en-têtes CORS/HSTS/CSP, `www-authenticate` **partiellement masqué** « Bear***app" ») ; **« Body »** `{"error":"unauthorized","error_description":"Missing Bearer token"}` | [t01m00s](sources/videos-images/console/QjoTkonLub4_t01m00s.jpg) |
| 2 | Parse authentication challenge | Information : **Realm** = URL du serveur ; **Raw** = `Bearer realm="…"` | QjoT t01m06s |
| 3 | Fetch protected resource metadata | Information : **« Succeeded Url »** ; **« Metadata »** JSON (`resource`, `authorization_servers[]`, `bearer_methods_supported: ["header"]`) ; **« Attempt 1 »** ; Headers (21) | QjoT t01m16s |
| 4 | Fetch authorization server metadata | Succeeded Url ; Metadata (`issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `scopes_supported: ["mcp"]`, `response_types_supported: ["code"]`, `grant_types_supported`, `code_challenge_methods_supported`) ; Headers (22) | QjoT t01m24s |
| 5 | Detect authentication method | Information : **Auth method `OAUTH2` · Registration endpoint `Yes` · PKCE required `Yes` · Scopes `mcp` · Requires Client Info `No`** | [t01m36s](sources/videos-images/console/QjoTkonLub4_t01m36s.jpg) |
| 6 | Register OAuth client | **Échec** : bandeau rouge « **Likely cause:** Dynamic client registration failed / **Suggested fix:** Check the registration endpoint and try providing client_id manually » ; **« Raw response »** `{"error":"invalid_client_metadata","error_description":"Dynamic client registration is not permitted on this server. Contact the server administrator to obtain cl…"}` ; Information ; Headers (21) ; Body. **Succès** (exéc. 2) : Information « Client Id <uuid> » ; Body avec `client_secret` **masqué `[RED***TED]`** et `redirect_uris: ["https://console.mistral.ai/build/connectors/playground/oauth-callback"]` | [t01m50s](sources/videos-images/console/QjoTkonLub4_t01m50s.jpg), QjoT t02m46s |
| 7 | Build authorization URL | ✓ sans latence (détail non ouvert) | — |
| 8 | Get user consent | ✓ sans latence (aucune fenêtre de consentement montrée ; inférence : popup hors champ) | — |
| 9 | Exchange authorization code | **Échec** : « Likely cause: Token exchange failed / Suggested fix: Verify the authorization code and client credentials » ; Raw response `{"error":"unsupported_grant_type"}`. **Succès** : Information **Access Token Preview** (tronqué) · **Token Type `Bearer`** · **Expires In `3600s`** · **Scope `mcp`** ; bloc **« Scope mismatch »** `{"requested":["mcp"],"granted":["mcp"],"missing":[]}` ; Headers (22) | QjoT t03m00s, [t04m12s](sources/videos-images/console/QjoTkonLub4_t04m12s.jpg) |
| 10 | Validate token | JSON `{"header":null,"payload":null,"expires_at":null,"seconds_until_expiry":null}` (inférence : jeton opaque, non JWT, donc non décodé) | QjoT t04m14s |
| 11 | Initialize MCP | **« Capabilities »** JSON : `protocolVersion: "2024-11-05"`, `capabilities.tools`, `serverInfo {name, version}`, `tools[]` (nom, description, `inputSchema`) | QjoT t04m16s |
| 12 | Report overview | **« MCP server ready »** ; compteurs **Tools 1 · Prompts 0 · Resources 0 · Duration 5.6s · Checks 10/10** ; onglet « Tools » ; « Search… » ; groupe **« Interactive »** › `greet` ; détail : Description + « Input schema » JSON | [t04m20s](sources/videos-images/console/QjoTkonLub4_t04m20s.jpg) |

Constats :
- 🆕 Les secrets sont **masqués dans l'UI** (`client_secret` → `[RED***TED]`, `www-authenticate` partiellement étoilé).
- ⚠️ **Redirect URI réelle** `https://console.mistral.ai/build/connectors/playground/oauth-callback` vs doc `…/build/connectors/debugger/oauth-callback` ([11 §3.10.10](11-demarrage-playground-agents-connecteurs.md)) : soit la route a été renommée, soit les deux coexistent (inférence).
- ⚠️ **« Checks 10/10 »** pour 12 étapes et **Duration 5.6s** dans la synthèse contre 2.1s dans l'en-tête : les compteurs ne mesurent pas la même chose (inférence : 2 étapes non comptées comme « checks », et durée incluant le consentement).
- ⚠️ La doc décrit le succès avec « Protocol … », « View official docs », « Instructions » et le bouton « Run again » / « Copy as curl » : **non visibles** dans ces captures (serveur de démo sans instructions ; vue possiblement tronquée).
- 🆕 L'état vide parle de « create your connector » alors que la doc dit que le Debugger « ne crée pas » de connecteur (« The Connector creation flow isn't in scope for this release ») — (inférence) le Debugger est pensé comme l'antichambre de « + Add Connector ».

### 2.8 Agents : liste, création, éditeur, versions

**Liste** 🆕 (déc. 2025, [mC27 t01m08s](sources/videos-images/console/mC27FQVO3Lk_t01m08s.jpg)) : « Agents » / « Assistants IA spécialisés pour gérer des tâches et des cas d'utilisation spécifiques. » ; filtre **« + Source » seul** ; **« Colonnes 5 »** ; colonnes Nom de l'agent, Source, Modèle, Créé le, ID API (**pas de Métadonnées**) ; Source = **« Agent Builder V1 »** pour des agents créés 3 à 10 mois plus tôt (inférence : agents créés dans l'Agent Builder de Le Chat, visibles dans Studio) ; modèles datés (`mistral-small-2501`, `mistral-large-2411`, `ministral-8b-latest`) ; **ID affiché `ag:6…3da4`** (deux-points ; ancien format) alors que l'agent créé ce jour-là reçoit `ag_019b…` (UUIDv7). Mars 2026 : 6 colonnes + Metadata, filtres Source + Metadata (✅ [30 §4.18](30-video-pentiminax-agents-sans-coder.md)) ; état vide « No agent found / Create a new agent to handle specific tasks and use cases. / Create agent » (X5Iu t01m18s) 🆕.

**Modale de création** : déc. 2025 = « Créer un agent / Créer un nouvel agent avec les paramètres actuels » avec **seulement Nom de l'agent + Description** (bouton grisé tant que vide) 🆕 ; mars 2026 = « Create Agent » + « Metadata (Optional) » (✅ [30 §4.5](30-video-pentiminax-agents-sans-coder.md)).

**Modale de succès — extrait cURL** 🆕 (évolution)

| Date | Extrait |
|---|---|
| déc. 2025 (mC27 t08m12s) | `curl --location 'https://api.mistral.ai/v1/conversations' --header "Content-Type: application/json" --header "X-API-KEY: $MISTRAL_API_KEY" --data '{"agent_id": "ag_…", "inputs": "Hello there!"}'` |
| mars 2026 (X5Iu t01m38s) | `curl https://api.mistral.ai/v1/conversations -H "Content-Type: application/json" -H "Authorization: Bearer $MISTRAL_API_KEY" -d '{"agent_id": "ag_…", "agent_version": 0, "inputs": [{"role":"user","content":"Hello!"}]}'` |

**Éditeur : trois états historiques**

| Élément | déc. 2025 (FR) 🆕 | mars 2026 (EN) 🆕 | juil. 2026 (FR, base) |
|---|---|---|---|
| Fil d'Ariane | « ← Playground / AA » (flèche retour) | « Agents / Tech Triage Pro » | « Agents / Support Produit » |
| Badge de version | **aucun** | `v0 • Latest` → `v5 • Latest` + « + » | `v0 • Dernière`… |
| Boutons | **« Mettre à jour l'agent »** (seul) + ⋮ | « Save Agent Changes » (grisé sans modification) · « Reset changes » · « Restore this version » · ⋮ (infobulle « See more ») | « Enregistrer les modifications de l'agent » · « Réinitialiser les modifications » · « Rétablir cette version » · ⋮ |
| Menu ⋮ | Modifier les métadonnées de l'agent · Copier l'ID de l'agent · Code · **☐ Déployer sur Le Chat** · Supprimer l'agent (**pas d'Historique des versions**) | [Edit Agent Metadata · Copy Agent ID · Version history · Code · **☐ Deploy to Le Chat** · Delete Agent](sources/videos-images/console/X5IuZhiyftI_t07m02s.jpg) | … · Historique des versions · Code · **Disponible dans Vibe** · Supprimer l'agent |
| Fonctionnalités | « Outils » (4 icônes) + « Functions » (+) | « Capabilities ⓘ Add + » → Built-in tools (Code / Image / Search / Premium Search) + Functions ; **pas de Reasoning effort** | + « Effort de raisonnement » (Aucun / Élevé) |

🆕 **Modale « Update Agent »** (X5Iu t06m56s ; = « Modifier les métadonnées ») : « Update Agent / Update the agent with new settings and metadata » ; Agent Name ; Description ; Metadata (Optional) ▾ Key / Value ✕ ; « + Add metadata » ; Cancel / **Update Agent**.

**Revue avant enregistrement — onglet Configuration enfin visible** 🆕 ([X5Iu t02m44s](sources/videos-images/console/X5IuZhiyftI_t02m44s.jpg)) : modale « Review your changes / This will create a new version of your agent. » ; « Current version: v2 » → « New version: v3 » ; onglets « Instructions » | « Configuration • » ; dans Configuration, **quatre sections** : **Model** (« No changes. » ou diff `magistral-small-latest` rouge → `mistral-small-latest` vert, 08:10–08:24), **Model settings** (`Temperature: 0.7  Max tokens: 2048  Top P: 1` → `Temperature: 0.2  Max tokens: 2048  Top P: 1`), **Response format**, **Capabilities** ; champ « Describe this version (optional) » (placeholder « e.g. Friendly tone update ») ; Cancel / Save Agent Changes. ⚠️ La base ([30 §4.14](30-video-pentiminax-agents-sans-coder.md)) notait « Le contenu de l'onglet Configuration n'est jamais affiché ».

**Déploiement** : ⚠️ libellé « Déployer sur Le Chat » (déc. 2025) / « Deploy to Le Chat » (mars 2026) puis « Disponible dans Vibe » (juil. 2026) ; c'est une évolution de nom, cohérente avec Le Chat → Vibe le 28/05/2026 ([00 §2](00-synthese.md)).

### 2.9 Playground : outils, exécution d'outil, raisonnement, JSON Schema

- 🆕 **Disposition déc. 2025** (mC27 t01m00s) : lignes « Modèle ⓘ » (Mistral Medium), résumé `temperature: 0.7 max_tokens: 2048 top_p: 1` (✅ défauts de [30 §4.4](30-video-pentiminax-agents-sans-coder.md)), **« Outils ⓘ »** = 4 icônes compactes alignées (code, image, globe, journal ; bleu = actif), **« Functions ⓘ »** (non traduit) + « + », « Format de réponse ⓘ » Texte, « Instructions ⓘ » (placeholder identique à juillet).
- 🆕 **Infobulle de l'outil Code** (non capturée dans [30 §4.10](30-video-pentiminax-agents-sans-coder.md)) : **« Code — Permettre au modèle d'exécuter du code. »** (mC27 t12m22s).
- 🆕 **Catalogue du sélecteur (déc. 2025)** : Codestral, Devstral, Devstral Medium, Devstral Small, Magistral Medium, Magistral Small, Ministral 14b, Ministral 3b, Ministral 8b, Mistral Large, Mistral Medium [Sélectionné], Mistral Small, Mistral Tiny, **Mistral Vibe Cli**, **Pixtral 12b**, **Pixtral Large**, **Voxtral Mini** ; carte de survol « mistral-medium-latest — Update on Mistral Medium 3 with improved capabilities. », lignes Entrée / Sortie / **Entraînement** (prix par million de tokens, valeurs non reprises) et Alias `mistral-medium-2508`, `mistral-medium`. En mars 2026 les prix de la carte sont libellés « Input / Output … / 1M tokens » en **dollars** (X5Iu t02m02s) alors qu'ils sont en euros en juillet ([30 §4.8](30-video-pentiminax-agents-sans-coder.md)) ; carte Magistral Small « Our efficient reasoning model released September 2025. », alias `magistral-small-2509`.
- 🆕 **Bloc « Exécution D'outil »** (mC27 t13m38s) : titre + badge **`web_search`** + icône Mistral ; à droite « ID ⧉ tool…8881 » ; sous-titre « Arguments » ; JSON `{"query": "…"}` ; actions régénérer / corbeille. (Complète « Appel De Fonction » / « Résultat De Fonction » de [30 §4.15](30-video-pentiminax-agents-sans-coder.md) : les outils intégrés s'affichent comme **exécutions**, sans résultat à simuler.)
- 🆕 **Modèles de raisonnement** (X5Iu t03m08s) : bloc repliable **« Thinking… » ⌃** pendant la génération puis **« Thoughts ⌄ »** ; bouton « Stop » carré ; aucun interrupteur pour désactiver le raisonnement dans l'éditeur d'agent (✅ [31 §7](31-autres-videos.md)).
- 🆕 **Format de réponse JSON-Schema** (mC27 t15m58s) : à droite du sélecteur, **icône ⚠ rouge** (schéma non défini) + **icône engrenage** (configurer) ; infobulle latérale de l'option (illisible).
- 🆕 **Modale « Configurer le schéma JSON »** ([mC27 t15m56s](sources/videos-images/console/mC27FQVO3Lk_t15m56s.jpg)) :

| Élément | Libellé exact |
|---|---|
| Titre / aide | « Configurer le schéma JSON » ; « Définissez le format de réponse attendu à l'aide d'un schéma JSON qui spécifie la structure, les types et les contraintes de la sortie du modèle. En savoir plus » |
| Onglets | **« Éditeur de code »** (actif) · **« Constructeur visuel »** (non ouvert) |
| Actions | **« Modèles ▾ »** (gabarits de schéma, non ouverts) · **« Générer le schéma »** (icône robot : génération assistée, inférence) · icône agrandir ⤢ · ✕ |
| Zone | éditeur sombre numéroté, vide par défaut |
| Boutons | « Effacer » · « ✓ Enregistrer » |

### 2.10 Skills (Studio)

**Liste** `/build/skills` — [v_Lt t00m08s](sources/videos-images/console/v_LttjsevRg_t00m08s.jpg) 🆕 : titre « Skills » [New] ; sous-titre **« Teach agents reusable skills for specialized tasks across projects, Vibe Work, and Vibe Code. »** ; tableau à **une seule colonne « Name ⇅ »** (nom + description tronquée, icône losange) ; squelettes au chargement ; aucun bouton de création visible dans l'en-tête (⚠️ la doc cite `New Skill`, [11 §4.2](11-demarrage-playground-agents-connecteurs.md)). Exemples : `bitly-notion-toggle` (« Load this skill when you need to pull Bitly analytics and insert the data inside … ») ; `issue-triage-and-fix` (« Use when a user wants you to evaluate issues on a given GitHub repo or rep… »).

**Page d'un skill** `/build/skills/<uuid>` 🆕

| Zone | Observé | Source |
|---|---|---|
| En-tête | « Skills / <nom> » ; badge **`vN • Latest`** ; séparateur ; **pastilles de labels** (`● staging` point rouge ; `● main` point vert) ; bouton **« + »** (inférence : ajouter un label) | [v_Lt t00m20s](sources/videos-images/console/v_LttjsevRg_t00m20s.jpg), [t00m36s](sources/videos-images/console/v_LttjsevRg_t00m36s.jpg) |
| Boutons (non modifié, 09/07) | **Publish to Vibe · Share · Delete skill · Version history** | v_Lt t00m28s |
| Boutons (modifié) | « Publish to Vibe » (**grisé**) · « Share » · **« Discard changes »** · **« Save changes »** (orange) | v_Lt t00m20s |
| Boutons (publié) | **« ● Published ▾ »** (menu déroulant) à la place de « Publish to Vibe » | v_Lt t00m36s |
| Boutons (20/07) | « Publish to Vibe » · « Share » · **« ⋮ »** | sTxS t02m24s |
| Sous le titre | description complète ; à droite **« Created by <nom> »** | v_Lt t00m20s |
| Puces (20/07) | **« Copy ID 019f28b0-… ⧉ »** et **« Copy name bitly-notion-toggle ⧉ »** | sTxS t02m24s |
| Panneau **FILES** | boutons « + » (fichier) et « dossier + » ; `SKILL.md` ⋯ ; dossier `references` ⋯ › `response-format.md` ⋯ | v_Lt t00m12s, sTxS t02m24s |
| Éditeur | **éditeur Markdown WYSIWYG** (titres, puces rendus) titré par le nom du fichier | v_Lt t00m12s |

**Enregistrer une version** — [v_Lt t00m26s](sources/videos-images/console/v_LttjsevRg_t00m26s.jpg) 🆕 : modale **« Save new version » / « Create a new version with your changes. »** ; champ **« Version notes (optional) »** ; Cancel / Save (spinner) ; toast **« ✓ Skill updated »** ; le badge passe à `v2 • Latest` ; le label `staging` n'est plus affiché sur v2 (inférence : il reste sur v1).

**Publier dans Vibe** — [v_Lt t00m30s](sources/videos-images/console/v_LttjsevRg_t00m30s.jpg) 🆕 : modale **« Publish to Vibe? » / « This selected skill version will be available in Vibe. »** ; Cancel / Publish ; puis label **`● main`** sur la version et bouton **`● Published ▾`**. (Inférence) publier = poser l'alias `main` sur la version choisie ; le skill vu le 20/07 a `main` sur **v2** alors que la dernière est **v6** → **Vibe utilise une version épinglée, pas la dernière**.

**Historique des versions** — [sTxS t02m26s](sources/videos-images/console/sTxSGrLkro0_t02m26s.jpg) 🆕 : panneau latéral droit « Version history » ✕ ; une ligne par version : numéro, **note de version**, **date et heure**, pastilles : v6 « Adding more details about how toggles work » (July 9, 3:29 PM) [`Latest`] ; v5 « Fix formatting » (3:27 PM) ; v4 « Add instructions to reference specific formatting of d… » (3:16 PM) ; v3 « Adding an example of formatting » (3:14 PM) ; v2 (sans note, July 9, 3:10 PM) [`● main`] ; v1 (July 3, 5:54 PM) [`● production`] [`● staging`]. Aucun diff entre versions n'est montré.

Constats : ✅ notes de version, attribution (« Created by »), Share ≠ Publish to Vibe ([11](11-demarrage-playground-agents-connecteurs.md)) ; 🆕 **les Skills portent des labels d'environnement** (`staging`, `production`) comme les Prompts, plus `main` pour Vibe ; ⚠️ la vidéo d'annonce illustre des versions **semver** (`v2.1.0`), la console numérote **`v1…v6`**.

### 2.11 Prompts

- ⚠️ **Aucun écran Prompts réel dans les 12 vidéos.** La seule vidéo dédiée (nxhRrry5UiY) est du motion design ; ses cartes montrent : nom `support-system-prompt`, versions v2/v3 avec résumé, label `production`, chaîne **dev → staging → prod** avec un rôle par étape (author / test / promote), un journal « Activity » (« authored v3 », « promoted to staging », « promoted to prod ») et des « private variants » (`support-prompt:eu`…) face à une version « workspace ». À traiter comme intention produit.
- Ce que l'UI réelle apporte indirectement : les labels `staging` / `production` existent aussi sur les **Skills** (§2.10) ; le registre de prompts a les mêmes alias ([10](10-conversations-capacites.md)). L'écran du Prompt Registry reste un **trou** de la base ([00 §14](00-synthese.md)).

### 2.12 Workflows (aperçu, hors périmètre principal)

[hUPc t01m26s](sources/videos-images/console/hUPcLLti5x0_t01m26s.jpg) 🆕 (mai 2026) : exécution « Linear Weekly Summary » ; sélecteur « …a0ad0cb4 (latest) ▾ » ; durée qui croît (4088 ms → 14 s) ; pastille **« • Live »** ; frise START … ms ; boutons ↑ ↓, **« ✕ Cancel »** (rouge), **« Run again »**, ✕ ; onglets **Trace | Task** ; arbre : Workflow Output, `get_team_id_by_name` (4519 ms ✓), `fetch_recent_issues` (2903 ms ✓), `generate_weekly_summary` ; panneau **Inspector (I) | Metadata (M)** ; blocs Input / Output JSON copiables. Terminal : « Workflow registered WITHOUT versioning behavior ». (À croiser avec [12](12-workflows-1-concepts-construction.md)–[13](13-workflows-2-interaction-production.md).)

### 2.13 Vibe Work (web, `chat.mistral.ai`)

**Navigation** 🆕
- Barre latérale (juillet, v_Lt t00m40s / sTxS t02m12s) : « Vibe ▾ » ; onglets **Chat | Work | Code** ; New Chat ; **Context** ; **Meeting Notes [Preview]** ; **Scheduled [Preview]** ; Projects + ; section Scheduled (« Link Impression Analysis Trends ») ; Chats ; pied « <org> / <plan> ⓘ » (« devrel / Free ») ; « Help Center ».
- Juin (8MHd t00m54s) : Context = **Skills [New], Connectors, Libraries, Instructions** (⚠️ la doc d'octobre donne `Knowledge · Skills · Instructions`, [22](22-vibe-work-le-chat.md) : évolution).
- Accueil : « Welcome back, <prénom> » ; zone **« Type / for quick access »** + micro ; « Suggested for you » / « Discover more ».
- Pied de conversation : « Vibe can make mistakes. Check answers. Learn more » ; actions sous réponse 👍 👎 copier ↻ ; sélecteur **« Fast ▾ »** dans la saisie (20/07 ; ✅ toggle fast/think, [00 §2](00-synthese.md), visible dès juillet).

**Menu `+` de la saisie** — [v_Lt t00m46s](sources/videos-images/console/v_LttjsevRg_t00m46s.jpg), 8MHd t01m52s 🆕

| Entrée | Sous-menu |
|---|---|
| Upload Files | — |
| **Skills ›** | « Search » ; « **+ New skill** » ; filtres **All · Personal · Workspace · Built-in** ; listes par section (Personal : `issue-triage-and-fix` ; Built-in : `deep-research`, `skill-creator`, `vibe-work-onboarding`…) |
| **Connectors ›** | « Search » ; « **Reset** » ; liste avec logos (GitHub, Google Calendar, Linear, Notion, Slack, Bitly, GSC) |
| **Libraries ›** | « Search » ; « Vibe Code » (grisé) |
| Workflows › | (non ouvert) |
| Agents › | **grisé** |
| *(séparateur)* Reset input | grisé si vide |

⚠️ La base ([22](22-vibe-work-le-chat.md)) liste `Upload Files · Libraries · Tools · Workflows · (legacy) Agents` : en juillet, « Tools » n'apparaît pas et **Skills / Connectors** sont des entrées propres. Les éléments choisis deviennent des **puces** dans le message (« ◇ issue-triage-and-fix », « GitHub », « Linear »). Le `/` sert à l'accès rapide (« Type / for quick access ») et à invoquer un skill (transcription 8MHd 01:59) ; **aucune utilisation de `@` n'est montrée** dans ces vidéos.

**Page Skills** (`chat.mistral.ai/skills`) — [8MHd t00m54s](sources/videos-images/console/8MHd_arELJo_t00m54s.jpg) 🆕
- Bouton rouge **« New skill ▾ »** → **Create manually · Upload skill file · Upload skill folder** (8MHd t00m56s).
- « Search for skills » ; sections **Personal** (vide : « No personal skills yet / Create a private skill to teach Vibe a repeatable workflow. »), **Workspace (<nom>)** (vide : « No workspace skills yet / Shared skills will appear here for everyone in your workspace. »), **Built-in** (challenge-my-thinking, data-analysis, deep-research, doc-coauthoring, document-review, internal-comms… + « Load more ») ; **interrupteur par skill** ; ligne créée : « Created by You · <description> ».
- Panneau de création `?dialog=create` (8MHd t01m02s) : titre, description, section « Instructions » (+), contenu Markdown, pied **« ● Enable skill »** (interrupteur ON) + bouton de validation.
- ✅ sections et toggles ([22](22-vibe-work-le-chat.md)) ; 🆕 menu à 3 modes de création et textes d'état vide.

**Connecteurs dans Vibe** (`/connections?connector=github_app`, 8MHd t01m46s) 🆕 : page « My Connectors » en fond ; modale « GitHub ● Connected » ; onglets **Overview | Functions** ; « Reference ⧉ github_app » ; « Visibility Organization ⓘ » ; boutons **« New Chat »**, **« Configure repositories »**, réglages ; encart de confidentialité (§2.6).

**Projets** (8MHd t01m38s, [t01m52s](sources/videos-images/console/8MHd_arELJo_t01m52s.jpg)) 🆕 : modale « Create a new project / Use projects to organize chats. » (champ « New Project », **Suggestions** : Learning, Research, Coding, Work, Health, Writing ; Cancel / Create) ; page projet : vues liste/grille + ⋯ ; panneau droit **Tone « Default (Global) »**, Instructions « No instructions set for this project » + « Customize », **Additional Context ☑ « Include other projects' chats as context »**, « No files uploaded » + « Upload files » ; état vide « No conversations yet / Every big idea starts with a chat. What's yours? Let's talk! ».

**Exécution et approbations** 🆕 : « Thinking • <résumé> › » pendant le travail (8MHd t02m10s) ; icônes des connecteurs utilisés à droite ; « Worked for 3min 34s » ; étape « **Execution of Notion Update Page ↩** » suivie d'une bulle **« Allowed »** (approbation donnée ; sTxS 01:32) ; « ✅ All tasks completed! » ; création de skill par l'agent : « ✅ Skill created: <nom> » + puce « Skill creation », fichier écrit dans `/home/user/skills/<nom>/SKILL.md` (bac à sable de Vibe, inférence). ⚠️ Les libellés de la boîte d'approbation Work (`Continue` / `Always allow` / `Decline`, [22](22-vibe-work-le-chat.md)) ne sont pas visibles ici.

**Tâches planifiées** 🆕 (sTxS t02m16s–t02m22s)
- Page **« My Tasks »** (l'entrée de menu s'appelle « Scheduled » : répond à la question n° 12 de [22](22-vibe-work-le-chat.md)) ; « Hide suggestions » ; « + New Task ».
- **« Suggested tasks »** (cartes avec icônes de connecteurs et fréquence, bouton +) : « Brief me for my Monday meetings » (Google Calendar · Every Mon at 7:15 AM) ; « Generate a weekly status update from my project channels » (Linear + Slack · Every Fri at 3:45 PM) ; « Send me a weekly briefing on AI industry news » (Every Mon at 7:50 AM) ; « Send me a weekly deep research report on AI agent tooling » (Every Mon at 8:10 AM).
- Onglets **Scheduled · Paused · Completed** ; ligne « Link Impression Analysis Trends · Every Thu at 12:00 PM ⋮ ».
- Détail : « ← Scheduled tasks » ; titre ; **« Edit »** ; **« Run now »** ; ⋮ ; « Every Thu at 12:00 PM » ; « Instructions » (texte + puces Bitly, skill `bitly-notion-toggle`, Notion) ; **« Previous runs »** (✓ Jul 16, Jul 9, Jul 2, 2026 12:00 PM).

### 2.14 Vibe CLI (terminal)

- 🆕 Bannière de session (AR2I 01:16) : « Mistral Vibe v2.10.1 · mistral-medium-3.5[high] · [API] Scale plan / 8 models · 6 connectors · 0 MCP servers · 16 skills » ; « Type /help for more information ».
- 🆕 **Panneau `/connectors`** ([AR2I t01m12s](sources/videos-images/console/AR2IedLkEHo_t01m12s.jpg)) : titre « MCP Servers & Connectors », section **« Workspace Connectors »** ; une ligne par connecteur : nom `[connector]` + nombre d'outils + état (« github_app [connector] 45 tools ● connected », « linear … 46 tools ● connected », « notion … 16 tools ● connected », « … 0/3 tools ○ disabled », « 0/1 tool ») ; pied **« ↑↓ Navigate · Enter Show tools · D Disable · E Enable · R Refresh · Esc Close »** (✅ touches de [21](21-vibe-code.md)) ; messages « MCP servers opened… / MCP servers closed. ».
- 🆕 **Invite de permission** ([AR2I t01m30s](sources/videos-images/console/AR2IedLkEHo_t01m30s.jpg)) : « Permission for the `connector_notion_notion-search` tool » + arguments ; choix **« › 1. Allow once / 2. Allow for remainder of this session / 3. Always allow / 4. Deny »** (Deny en rouge) ; pied « ↑↓ navigate · Enter select · ESC reject ». Demandée aussi pour `connector_linear_get_issue`, `connector_github_app_create_pull_request`, `connector_linear_save_issue`.
- 🆕 Messages d'état : « Generating… (3s Esc/Ctrl+C to interrupt) », « Reading file… », « Calling connector tool get_issue… (1m24s …) », « Managing todos… », « Editing files… », « Running command… », messages ludiques (« Seeding Mistral weights… ») ; résultats « ✓ Connector tool notion-search completed », « ✓ Read 175 lines from workflow.py », « ✓ Updated 6 todos », « Applied 1 block to workflow.py » + diff ; bloc « Thought ▶ » repliable ; jauge **« 0% of 200k tokens »** → « 32% of 200k tokens » ; saisie encadrée étiquetée **« default »** (agent actif) ; commit signé « Generated by Mistral Vibe. Co-Authored-By: Mistral Vibe <vibe@mistral.ai> ».
- ✅ nommage `connector_<connecteur>_<outil>` ([21](21-vibe-code.md)).

### 2.15 SDK vu à l'écran (compléments)

| Élément | Observé | Statut |
|---|---|---|
| `client.beta.connectors.create_async(name, description, server, visibility="private")` | DeepWiki, Context7 ; retour « Auth type: None » | ✅ [11](11-demarrage-playground-agents-connecteurs.md) |
| `create_or_update_user_credentials_async(connector_id_or_name=…, name=f"{name}-default", credentials={"headers": {}}, is_default=True)` | « Register credentials (empty, since Context7 is public — but the record must exist) » | ✅ + 🆕 nommage `-default` |
| Outil connecteur dans un agent | `{"type": "connector", "connector_id": …}` ; **le nom (`github_app`, `custom_deepwiki`) est accepté** comme `connector_id` | 🆕 |
| Filtrage | `"tool_configuration": {"include": [<outil>]}` via `agents.update_async` | ✅ |
| Événements de flux | `tool.execution.started`, `tool.execution.delta`, `tool.execution.done`, `conversation.response.done` | ✅ (cf. [11](11-demarrage-playground-agents-connecteurs.md)) |
| Appel direct | `call_tool_async(connector_id_or_name, tool_name, arguments)` → `result.content[0].text` | ✅ |
| OAuth | `get_auth_url_async` → URL avec PKCE S256, `resource`, redirect `callback.mistral.ai/v1/integrations_auth/oauth2_callback` | 🆕 |
| Identifiants | connecteurs, skills, agents, conversations en **UUIDv7** (horodatage décodé = date de création observée : agent `ag_019b3886…` = 19/12/2025 21:31 UTC, horloge à l'écran 22:31) | ✅ confirme l'inférence de [30 §4.21](30-video-pentiminax-agents-sans-coder.md) |

---

## 3. Récapitulatif : nouveautés et contradictions

### 3.1 Principales nouveautés 🆕 (par écran)
- **Cadre** : sélecteur de produit Vibe / Studio / Docs & API / Admin ; menu avatar (Profile, API Keys, Admin settings, Billing…) ; dialogue profil (Profile / Preferences / Security & Access / My API Keys) ; thème sombre ; sélecteur org/workspace déplacé en pied de menu (juillet 2026).
- **Menu latéral** : 7 états datés, dont Améliorer/Improve (Observer, Évaluer, Fine-tune), Workflows (List / Executions / Workers [WIP]), Prompts/Skills [WIP].
- **Accueil** : versions déc. 2025 (Créer / Observer / Améliorer, « Bientôt disponible ») et mars 2026.
- **Clés API** : liste (onglets, colonnes, actions), état vide, formulaire complet avec défauts, confirmation.
- **Connecteurs** : trois générations de liste ; fiche (Visibility, Authentication, Origin, Capabilities, Server URL, Connector name/ID, onglets Permissions puis Preferences) ; outils Interactive / Read-only avec schéma ; modale Credential name ; retour OAuth `success=true` ; dépréciation GitHub PAT ; connecteur `memories` ; encart de confidentialité ; app GitHub.
- **Debugger** : état vide, états d'exécution, Cancel, détail par étape, masquage des secrets, synthèse et compteurs.
- **Agents** : version déc. 2025 sans versionnage ; « Agent Builder V1 » ; ancien format d'ID `ag:` ; cURL `X-API-KEY` ; modale Update Agent ; onglet Configuration du diff.
- **Playground** : modale JSON Schema (Éditeur de code / Constructeur visuel / Modèles / Générer le schéma) ; bloc Exécution D'outil ; Thinking / Thoughts ; infobulle Code ; catalogue de déc. 2025 (Pixtral, Voxtral Mini, Mistral Vibe Cli).
- **Skills Studio** : liste, éditeur FILES + WYSIWYG, labels de version, Save new version, Publish to Vibe? / Published ▾ / label `main`, Version history, Copy ID / Copy name.
- **Vibe Work** : menu `+` et sous-menus, page Skills (New skill ▾ à 3 modes, états vides, Enable skill), projets (Tone, Include other projects' chats), page connecteur Vibe (Configure repositories), My Tasks (Suggested tasks, Scheduled/Paused/Completed, Run now, Previous runs), bulle « Allowed ».
- **Vibe CLI** : panneau `/connectors`, invite de permission à 4 choix, messages d'état, jauge de contexte.

### 3.2 Contradictions et nuances ⚠️

| # | Base | Vidéo | Source |
|---|---|---|---|
| 1 | Route Debugger `/build/connectors/debugger` et redirect `…/debugger/oauth-callback` ([11](11-demarrage-playground-agents-connecteurs.md)) | `/build/connectors/playground?source=test_connector` et `redirect_uris: [".../build/connectors/playground/oauth-callback"]` | QjoT t00m44s, t02m46s |
| 2 | Connectors en Public Preview depuis le 22/05/2026 | badge `Private Preview` (14/04), `Public Preview` (28/05), `Preview` (21/06) | bemt t00m22s, hUPc t00m26s, QjoT t00m42s |
| 3 | « Le contenu de l'onglet Configuration n'est jamais affiché » ([30 §4.14](30-video-pentiminax-agents-sans-coder.md)) | affiché : Model, Model settings, Response format, Capabilities | X5Iu t02m44s |
| 4 | Infobulle de l'outil Code « non capturée » ([30 §4.10](30-video-pentiminax-agents-sans-coder.md)) | « Permettre au modèle d'exécuter du code. » | mC27 t12m22s |
| 5 | Bouton du formulaire de clé `Create new key` ([11 §4.2](11-demarrage-playground-agents-connecteurs.md)) | formulaire « Create API Key » avec bouton « New key » ; « Create new key » = bouton de l'état vide | Th8n t01m22s–t01m24s |
| 6 | Menu `+` de Vibe : `Upload Files · Libraries · Tools · Workflows · (legacy) Agents` ([22](22-vibe-work-le-chat.md)) | `Upload Files · Skills › · Connectors › · Libraries › · Workflows › · Agents ›` (grisé) · `Reset input` (juillet 2026) | v_Lt t00m46s |
| 7 | Context de Vibe = `Knowledge · Skills · Instructions` ([22](22-vibe-work-le-chat.md), doc d'octobre) | juin 2026 : `Skills · Connectors · Libraries · Instructions` (évolution probable) | 8MHd t00m54s |
| 8 | Menu latéral de juillet présenté comme état de référence ([00 §4](00-synthese.md)) | au moins 7 états entre déc. 2025 et oct. 2026 | §2.2 |
| 9 | Debugger : succès avec « Protocol … », « View official docs », « Instructions », bouton « Run again », « Copy as curl » (doc) | non visibles ; « Checks 10/10 » pour 12 étapes ; Duration 5.6s vs 2.1s | QjoT t04m12s, t04m20s |
| 10 | Debugger « ne crée pas de connecteur » (doc) | état vide : « Validate the server, review the MCP report, then create your connector. » | QjoT t00m44s |
| 11 | Versions illustrées en semver dans l'annonce officielle | console : `v1 … v6` (entiers) | nxhR 00:16 vs sTxS t02m26s |
| 12 | `New Skill` dans la liste Studio (doc) | aucun bouton de création visible dans l'en-tête de la liste (création non montrée dans Studio) | v_Lt t00m08s |
| 13 | Vocabulaire des outils : « Read functions / Write functions » (Vibe, [22](22-vibe-work-le-chat.md)) | Studio : « Interactive » / « Read-only » | hUPc t00m54s |

---

## 4. Questions ouvertes

1. Le label `main` est-il réservé à « Publish to Vibe » ? Peut-on publier dans Vibe une version autre que la dernière depuis l'UI (le menu `● Published ▾` n'a pas été ouvert) ?
2. Que contient le bouton « + » à côté du badge de version (agents comme skills) : ajout de label, nouvelle version, comparaison ?
3. Le « Constructeur visuel » et « Générer le schéma » de la modale JSON Schema (déc. 2025) existent-ils encore en 2026 ?
4. L'onglet **Permissions** de la fiche connecteur (mai) est-il devenu **Preferences** (juillet) ? Que contient-il (aucun des deux n'a été ouvert) ?
5. Quelle est la signification de la pastille rouge dans la colonne Credentials (Notion, juin) : credential expirée, en erreur ?
6. « Agent Builder V1 » : les agents de l'ancien Agent Builder de Le Chat restent-ils modifiables dans Studio, et migrent-ils au format `ag_` ?
7. Le groupe « Traces » lu dans le menu flouté d'oct. 2026 (Th8n) est-il réel (Observability visible en dehors de l'Enterprise) ?
8. Le connecteur `memories` (liste SDK d'avril) correspond-il à la Knowledge Base / mémoire de Vibe ?
9. Prompts : à quoi ressemble l'écran (liste, éditeur, labels, diff) ? Aucune vidéo ne le montre.

---

## Annexe A — 40 images copiées

Dossier : [`sources/videos-images/console/`](sources/videos-images/console/) (6,0 Mo).

| Image | Contenu |
|---|---|
| [QjoTkonLub4_t00m40s](sources/videos-images/console/QjoTkonLub4_t00m40s.jpg) | Accueil EN + menu latéral (juin 2026) |
| [QjoTkonLub4_t00m42s](sources/videos-images/console/QjoTkonLub4_t00m42s.jpg) | Liste Connectors « Connected / Available », bouton Debugger |
| [QjoTkonLub4_t00m44s](sources/videos-images/console/QjoTkonLub4_t00m44s.jpg) | Debugger, état vide |
| [QjoTkonLub4_t01m00s](sources/videos-images/console/QjoTkonLub4_t01m00s.jpg) | Debugger, exécution en erreur, étape 1 (Headers, Body) |
| [QjoTkonLub4_t01m36s](sources/videos-images/console/QjoTkonLub4_t01m36s.jpg) | Étape « Detect authentication method » |
| [QjoTkonLub4_t01m50s](sources/videos-images/console/QjoTkonLub4_t01m50s.jpg) | Échec « Register OAuth client » (Likely cause / Suggested fix / Raw response) |
| [QjoTkonLub4_t04m12s](sources/videos-images/console/QjoTkonLub4_t04m12s.jpg) | Exécution « Completed », détail du jeton |
| [QjoTkonLub4_t04m20s](sources/videos-images/console/QjoTkonLub4_t04m20s.jpg) | Report overview « MCP server ready » |
| [Th8npm3z1kA_t01m22s](sources/videos-images/console/Th8npm3z1kA_t01m22s.jpg) | Dialogue profil, My API Keys vide |
| [Th8npm3z1kA_t01m24s](sources/videos-images/console/Th8npm3z1kA_t01m24s.jpg) | Formulaire « Create API Key » |
| [Th8npm3z1kA_t01m26s](sources/videos-images/console/Th8npm3z1kA_t01m26s.jpg) | Menu Connector access scope |
| [Th8npm3z1kA_t01m28s](sources/videos-images/console/Th8npm3z1kA_t01m28s.jpg) | « API key successfully created » |
| [qIAJyb1w7Js_t01m20s](sources/videos-images/console/qIAJyb1w7Js_t01m20s.jpg) | Liste des clés (thème sombre) |
| [hUPcLLti5x0_t00m26s](sources/videos-images/console/hUPcLLti5x0_t00m26s.jpg) | Liste Connectors mai 2026 (Featured, GitHub PAT déprécié) |
| [hUPcLLti5x0_t00m38s](sources/videos-images/console/hUPcLLti5x0_t00m38s.jpg) | Fiche Linear (Overview / Credentials / Permissions) |
| [hUPcLLti5x0_t00m44s](sources/videos-images/console/hUPcLLti5x0_t00m44s.jpg) | Modale « Credential name » |
| [hUPcLLti5x0_t00m54s](sources/videos-images/console/hUPcLLti5x0_t00m54s.jpg) | Outils Interactive 18 / Read-only 28 |
| [hUPcLLti5x0_t01m10s](sources/videos-images/console/hUPcLLti5x0_t01m10s.jpg) | Outil déplié avec schéma JSON |
| [hUPcLLti5x0_t01m26s](sources/videos-images/console/hUPcLLti5x0_t01m26s.jpg) | Menu latéral mai 2026 + exécution de workflow |
| [AR2IedLkEHo_t01m04s](sources/videos-images/console/AR2IedLkEHo_t01m04s.jpg) | Liste après credential (Enabled vert) |
| [AR2IedLkEHo_t01m12s](sources/videos-images/console/AR2IedLkEHo_t01m12s.jpg) | Vibe CLI `/connectors` |
| [AR2IedLkEHo_t01m30s](sources/videos-images/console/AR2IedLkEHo_t01m30s.jpg) | Vibe CLI, invite de permission à 4 choix |
| [bemtZTeCtQ8_t00m00s](sources/videos-images/console/bemtZTeCtQ8_t00m00s.jpg) | Console avril 2026 (Improve : Observe, Evaluate), liste à interrupteurs |
| [bemtZTeCtQ8_t00m24s](sources/videos-images/console/bemtZTeCtQ8_t00m24s.jpg) | « Private Preview » + fiche en modale |
| [v_LttjsevRg_t00m08s](sources/videos-images/console/v_LttjsevRg_t00m08s.jpg) | Liste Skills (Studio) |
| [v_LttjsevRg_t00m20s](sources/videos-images/console/v_LttjsevRg_t00m20s.jpg) | Skill modifié : label staging, boutons |
| [v_LttjsevRg_t00m26s](sources/videos-images/console/v_LttjsevRg_t00m26s.jpg) | Modale « Save new version » |
| [v_LttjsevRg_t00m30s](sources/videos-images/console/v_LttjsevRg_t00m30s.jpg) | Modale « Publish to Vibe? » |
| [v_LttjsevRg_t00m36s](sources/videos-images/console/v_LttjsevRg_t00m36s.jpg) | Label `main` + « Published ▾ » |
| [v_LttjsevRg_t00m46s](sources/videos-images/console/v_LttjsevRg_t00m46s.jpg) | Vibe : menu `+` › Skills |
| [8MHd_arELJo_t00m30s](sources/videos-images/console/8MHd_arELJo_t00m30s.jpg) | Fiche GitHub (Visibility Organization, OAuth2) |
| [8MHd_arELJo_t00m54s](sources/videos-images/console/8MHd_arELJo_t00m54s.jpg) | Vibe : page Skills |
| [8MHd_arELJo_t01m52s](sources/videos-images/console/8MHd_arELJo_t01m52s.jpg) | Vibe : projet + menu `+` › Connectors |
| [sTxSGrLkro0_t00m46s](sources/videos-images/console/sTxSGrLkro0_t00m46s.jpg) | Fiche connecteur custom Bitly (Server URL, Preferences) ; nouvelle mise en page (vertical) |
| [sTxSGrLkro0_t02m26s](sources/videos-images/console/sTxSGrLkro0_t02m26s.jpg) | Skill v6 + panneau Version history (labels) (vertical) |
| [X5IuZhiyftI_t02m44s](sources/videos-images/console/X5IuZhiyftI_t02m44s.jpg) | Revue de version, onglet Configuration |
| [X5IuZhiyftI_t07m02s](sources/videos-images/console/X5IuZhiyftI_t07m02s.jpg) | Menu ⋮ de l'agent, « Deploy to Le Chat » (mars 2026) |
| [mC27FQVO3Lk_t00m36s](sources/videos-images/console/mC27FQVO3Lk_t00m36s.jpg) | Accueil déc. 2025 (Créer / Observer / Améliorer) |
| [mC27FQVO3Lk_t01m08s](sources/videos-images/console/mC27FQVO3Lk_t01m08s.jpg) | Liste d'agents déc. 2025 (Agent Builder V1, `ag:`) |
| [mC27FQVO3Lk_t15m56s](sources/videos-images/console/mC27FQVO3Lk_t15m56s.jpg) | Modale « Configurer le schéma JSON » |

## Annexe B — Couverture

**Méthode** : `yt-dlp` (format H.264 ≤ 1080p, vidéo seule ; pour la vidéo verticale sTxSGrLkro0, le filtre `height<=1080` avait donné du 480×854 illisible → re-téléchargée en 1080×1920 avec `width<=1080`) ; `ffmpeg fps=1/2` ; dédoublonnage par différence d'image (seuil 2,0 sur 160×90, image conservée au moins toutes les 45 s) ; **toutes** les images dédoublonnées vues en planches 4×4 (480 px), puis **plein écran ou recadrage agrandi** pour chaque écran d'interface ; quand un passage d'interface avait été écrasé par le dédoublonnage (incrustations sur fond fixe), les images brutes du segment ont été relues (colonne « + brutes »). Les vidéos longues (X5Iu, mC27) ont été couvertes **en entier** (pas seulement les segments repérés par la transcription). Dossiers de travail : `$SP/videos-console/<id>/` (raw, frames, sheets, notes).

| Vidéo | Durée | Résolution | Images brutes | Distinctes examinées | + brutes relues | Plein écran / recadrages (≈) | Écran console réel |
|---|---|---|---|---|---|---|---|
| QjoTkonLub4 | 4:56 | 1920×1080 | 148 | 106 | 10 | 16 | oui (3 passages) |
| nxhRrry5UiY | 3:17 | 1920×1080 | 99 | 99 | — | 16 recadrages | **non** (MG seulement) |
| Th8npm3z1kA | 7:09 | 1920×1080 | 214 | 161 | 4 | 9 | oui (01:20–01:32) |
| qIAJyb1w7Js | 6:36 | 1920×1080 | 198 | 131 | 3 | 4 | oui (01:20–01:34) |
| hUPcLLti5x0 | 1:55 | 1920×1080 | 57 | 28 | 12 | 12 | oui |
| AR2IedLkEHo | 2:37 | 1920×1080 | 78 | 35 | — | 7 | oui + Vibe CLI |
| bemtZTeCtQ8 | 2:22 | 1920×1080 | 71 | 64 | — | 7 | oui |
| v_LttjsevRg | 1:22 | 1920×1080 | 41 | 23 | 6 | 12 | oui + Vibe |
| 8MHd_arELJo | 3:20 | 1920×1080 | 100 | 66 | 4 | 13 | oui + Vibe |
| sTxSGrLkro0 | 2:44 | 1080×1920 | 82 | 82 | — | 12 recadrages | oui (incrustations) + Vibe |
| X5IuZhiyftI | 11:24 | 1280×720 | 342 | 188 | — | 20 | oui (≈ 6 min) |
| mC27FQVO3Lk | 17:36 | 1920×1080 | 528 | 391 | — | 25 | oui (≈ 11 min) |
| **Total** | **65 min** | | **1 958** | **1 374** | **39** | **≈ 150** | |

**Vidéos non téléchargeables** : aucune (12/12 téléchargées sans erreur 429 ; avertissement yt-dlp « n challenge solving failed » sans effet sur les formats H.264 utilisés).

**Limites** :
- Les planches (480 px) ne permettent pas de lire le texte : seuls les écrans retenus comme porteurs d'interface ont été lus en pleine résolution ; les images de conversation (contenu généré), de code de notebook et de face caméra n'ont été lues qu'en planche.
- Le motion design (nxhRrry5UiY entier, début et fin de QjoTkonLub4, 8MHd_arELJo) **n'est pas l'interface** ; il est signalé comme tel.
- Images à recadrer avec prudence : sTxSGrLkro0 (incrustations réduites dans une vidéo verticale), Th8npm3z1kA (menu latéral flouté derrière une modale).
- Les prix visibles (sélecteur de modèles) n'ont pas été repris.
