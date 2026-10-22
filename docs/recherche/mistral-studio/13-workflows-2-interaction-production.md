# 13 — Workflows (2/2) : interaction, production et observabilité

> **Périmètre** : workflows conversationnels (Vibe Work : chat, formulaires, confirmations, suivi de progression, canvas, composants UI, tool UI, publication), interaction externe avec une exécution (signals, queries, updates), exploitation en production (deployments, hardened deployments, managed deployments, concurrence, rate limiting, contexte d'exécution, reset, codes d'erreur API), observabilité (OpenTelemetry, logs, traces) et visualizer · **Sources** : 24 pages de docs.mistral.ai (copie du 21/10/2026), complétées par des vérifications ciblées dans la spec OpenAPI locale (signalées « [spec OpenAPI] ») · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Workflows conversationnels : bases (messages, `ChatInput`, timeout, streaming d'agent)
   - 3.2 Formulaires structurés (`FormInput` et 7 types de champs)
   - 3.3 Confirmations (`ConfirmationInput`, `AcceptDeclineConfirmation`)
   - 3.4 Suivi de progression (`TodoList`)
   - 3.5 Canvas (sorties riches et édition humaine)
   - 3.6 Tool UI (composants UI riches et états d'outils)
   - 3.7 Publication dans Vibe (`ChatAssistantWorkflowOutput`, `@input_tag`, erreurs, `structuredContent`)
   - 3.8 Signals
   - 3.9 Queries
   - 3.10 Updates (et comparatif des trois mécanismes)
   - 3.11 Deployments (nommage, isolation, routage, cycle de vie, mise à l'échelle)
   - 3.12 Hardened deployments (pins, propriété, OBO)
   - 3.13 Managed deployments (démarrage, fonctionnement, secrets, quotas, dépannage)
   - 3.14 Concurrence (`execute_activities_in_parallel`)
   - 3.15 Rate limiting
   - 3.16 Contexte d'exécution
   - 3.17 Reset d'une exécution
   - 3.18 Codes d'erreur de l'API Workflows (liste complète)
   - 3.19 Observabilité (télémétrie OTel, traces, logs, export personnalisé)
   - 3.20 Visualizer
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
Annexe — Couverture

---

## 1. En bref

- **Workflows conversationnels** : workflows conçus pour être intégrés dans une interface de chat ; l'utilisateur les déclenche, leur fournit des entrées *pendant* l'exécution et suit leur progression. La surface de rendu principale est **Vibe Work** (UI de chat web et mobile de Mistral), où l'utilisateur attache un workflow publié depuis le menu `+`. Ils s'appuient sur le plugin `mistralai-workflows[mistralai]` et la classe de base `workflows.InteractiveWorkflow`.
- **Briques d'interaction** côté workflow : messages assistant (`send_assistant_message`), attente d'entrée (`wait_for_input`) avec `ChatInput`, formulaires typés (`FormInput` + 7 types de champs dont upload de fichiers), confirmations en un clic, check-list de progression (`TodoList`), canvas éditables (7 types de contenu), 12 composants UI (cartes, graphiques, badges…), 3 types d'« états d'outil » (fichier, générique, commande), streaming token par token des réponses d'agent.
- **Contrat de publication** : pour apparaître comme assistant dans Vibe Work, un workflow doit retourner un `ChatAssistantWorkflowOutput` (contenu texte/ressources, `isError`, `structuredContent`).
- **Interaction externe programmatique** avec une exécution en cours : **signals** (asynchrones, modifient l'état, sans retour), **queries** (synchrones, lecture seule, avec retour), **updates** (synchrones, modifient l'état, retournent une valeur, peuvent exécuter des activités). Payloads validés, HTTP 422 en cas d'erreur.
- **Deployments** : groupe nommé de workers (`DEPLOYMENT_NAME`, obligatoire au démarrage) qui possède des définitions de workflows et reçoit leurs exécutions ; isolation entre développeurs, routage automatique, `409 AMBIGUOUS_WORKFLOW` si deux déploiements actifs déclarent le même workflow.
- **Hardened deployments** : restreignent l'enregistrement de workflows à des principaux autorisés (« pins » : utilisateurs ou service accounts) ; obligatoires pour les workflows **on-behalf-of (OBO)**.
- **Managed deployments** (statut : **public preview**) : Mistral Cloud clone un dépôt GitHub, construit l'image Docker et exécute le worker (région `nl-north-1`, Pays-Bas), authentifié par un service account sans clé API. Quotas : 0 (Free, Pro/Team sans pay-as-you-go), 3 (pay-as-you-go), 10 (Enterprise).
- **Production** : framework de concurrence (`execute_activities_in_parallel`, 3 patrons, continue-as-new automatique au-delà de la limite d'historique de 51 200 événements), rate limiting partagé par activité ou par clé, `get_execution_id()`, reset d'une exécution à un événement `WORKFLOW_TASK_COMPLETED`, 16 codes d'erreur API `WF_1000`–`WF_1600`.
- **Observabilité** : le worker exporte par défaut logs, traces et métriques OpenTelemetry vers la plateforme d'observabilité hébergée de Mistral (visibles dans Studio, page d'exécution) ; redirection par signal vers un endpoint OTLP propre ou désactivation possible ; API de traces (OTel brut, résumé, événements) et de logs (paginés ou SSE).
- **Visualizer** : graphe du workflow construit par le worker au démarrage (avant toute exécution), avec résumés générés par IA ; requiert `mistralai-workflows` ≥ 3.15.0 ; activé par défaut.

---

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| Conversational workflow | Workflow intégré à une interface conversationnelle : déclenché par l'utilisateur, il peut lui envoyer des messages, attendre ses réponses et afficher sa progression. |
| Vibe Work | UI de chat web et mobile (« Vibe ») qui est la surface de rendu principale des workflows conversationnels ; l'utilisateur y attache des workflows publiés via le menu `+`. |
| `InteractiveWorkflow` | Classe de base (`workflows.InteractiveWorkflow`) dont hérite un workflow qui utilise `self.wait_for_input()`. |
| `send_assistant_message()` | Fonction du plugin qui affiche un message assistant dans le chat Vibe Work (texte, liste de sorties, canvas optionnel). |
| `wait_for_input()` | Méthode qui met le workflow en pause jusqu'à ce que l'utilisateur fournisse l'entrée décrite (chat, formulaire, confirmation, canvas). |
| `ChatInput` | Entrée de type message de chat libre, avec `prompt` (placeholder) et `suggestions` optionnels. |
| `FormInput` | Classe de base d'un formulaire structuré dont les attributs sont des champs typés. |
| `ConfirmationInput` / `AcceptDeclineConfirmation` | Formulaires à un seul champ dont le choix d'une option soumet immédiatement. |
| `CanvasInput` | Entrée qui laisse l'utilisateur éditer un canvas envoyé précédemment. |
| Canvas | Surface de contenu riche du chat (markdown, HTML, SVG, slides, React, code, Mermaid), éditable par l'utilisateur. |
| `CanvasPayload` / `CanvasResource` | Contenu d'un canvas (`type`, `title`, `content`) et ressource qui l'enveloppe (porte un `uri`). |
| `ResourceOutput` | Élément de sortie qui transporte une ressource (canvas ou composant UI). |
| `TextOutput` | Élément de sortie texte. |
| `TodoList` / `TodoListItem` | Check-list d'étapes affichée en temps réel, dont chaque élément a un statut `todo`, `in_progress` ou `done`. |
| `UIComponentResource` | Ressource qui transporte un composant UI de la bibliothèque du design system. |
| Tool UI state | Représentation visuelle structurée de l'exécution d'un outil (fichier, générique, commande), attachée à un `ChatAssistantWorkingTask`. |
| `ChatAssistantWorkingTask` | Tâche « en cours » affichée dans le chat (titre, contenu, `toolUIState`). |
| `ChatAssistantWorkflowOutput` | Type de sortie obligatoire pour publier un workflow comme assistant dans Vibe ; reflète un protocole d'« assistant compatible chat ». |
| `@input_tag` | Décorateur qui ajoute `x-input-tag` au JSON Schema d'un modèle d'entrée, pour qu'un client choisisse la bonne variante d'une union. |
| `RemoteSession(stream=True)` | Session d'agent dont la réponse est streamée automatiquement vers l'UI (événements custom contenant des JSON patches). |
| Signal | Message asynchrone envoyé à une exécution en cours ; peut modifier l'état ; ne retourne rien. |
| Query | Lecture synchrone de l'état d'une exécution en cours ; ne doit pas modifier l'état ; retourne une valeur. |
| Update | Requête synchrone qui modifie l'état, peut exécuter des activités et retourne une valeur. |
| Deployment | Groupe nommé de workers qui possède un ensemble de définitions de workflows et reçoit toutes leurs exécutions. |
| `DEPLOYMENT_NAME` / `WORKER_NAME` | Nom du déploiement (obligatoire au démarrage du worker) / nom du processus worker (défaut : nom d'hôte). |
| Active / inactive deployment | Actif tant qu'au moins un worker a émis un heartbeat dans la fenêtre de vivacité ; inactif sinon. |
| Hardened deployment | Déploiement dont l'enregistrement de workflows est limité aux principaux autorisés. |
| Pin | Entrée d'autorisation d'un hardened deployment (utilisateur, service account, ou — héritage — clé API utilisateur). |
| Owner (deployment) | Utilisateur propriétaire du déploiement ; peut gérer le hardening et les pins ; n'est pas automatiquement autorisé à enregistrer. |
| OBO (on-behalf-of) workflow | Workflow agissant en tant que l'utilisateur qui déclenche l'exécution (accès délégué à ses fichiers, connecteurs) ; exige un hardened deployment. |
| `AccessWorkflows` | Permission de workspace requise pour posséder un déploiement, être pinné ou auto-revendiquer un déploiement OBO local. |
| Managed deployment | Déploiement dont le worker est construit (Docker) et exécuté par Mistral Cloud à partir d'un dépôt GitHub. |
| Service account | Identité non humaine sous laquelle tourne chaque managed deployment ; jeton rotatif monté en fichier. |
| `MISTRAL_SA_TOKEN_PATH` | Variable d'environnement pointant vers le fichier du jeton de service account dans le conteneur. |
| Mistral GitHub App | Application GitHub (`github.com/apps/mistralai`) par laquelle Mistral Cloud clone les dépôts. |
| Secrets Manager (workspace) | Gestionnaire de secrets du workspace ; un secret est lié à une variable d'environnement d'un managed deployment via une référence `secret:workspace:<NAME>`. |
| List / Chain / Offset Pagination Executor | Trois patrons d'exécution parallèle d'activités : liste connue, chaîne par jeton de continuation, pagination par index. |
| Continue-as-new | Mécanisme qui redémarre une exécution avec un historique vierge pour ne pas dépasser la limite de 51 200 événements. |
| `RateLimit` | Limite de débit d'une activité (`time_window_in_sec`, `max_execution`, `key` optionnelle) partagée entre tous les workers et workflows d'un déploiement. |
| Poller | Connexion de polling ouverte par un worker interne Temporal (5 pour les workflows + 5 pour les activités par worker interne). |
| Reset | Redémarrage d'une exécution depuis un point de son historique, en rejouant avec la dernière version du code. |
| `WORKFLOW_TASK_COMPLETED` | Type d'événement d'historique, seul point de reset valide. |
| `WF_XXXX` | Format des codes d'erreur structurés de l'API Workflows. |
| Telemetry signal | Logs, traces ou métriques OpenTelemetry, routables indépendamment. |
| `traceparent` | Contexte de trace W3C transmis dans le corps de la requête d'exécution pour fixer l'ID de trace ou la décision d'échantillonnage. |
| Visualizer | Vue graphe d'un workflow dans Studio, générée à partir du code au démarrage du worker. |

---

## 3. Fonctionnalités en détail

### 3.1 Workflows conversationnels : bases

**Installation** : `uv add 'mistralai-workflows[mistralai]'` (plugin Mistral). Imports usuels : `import mistralai.workflows as workflows` et `import mistralai.workflows.plugins.mistralai as workflows_mistralai`.

**Définition d'un workflow** (forme commune à tous les exemples du périmètre) : décorateur `@workflows.workflow.define(name=..., workflow_display_name=..., workflow_description=...)` sur une classe, méthode `async def run(...)` décorée `@workflows.workflow.entrypoint`. Le worker est lancé par `asyncio.run(workflows.run_worker([MaClasse]))`.

**Échange minimal** (message puis attente) :

```python
class GreetingWorkflow(workflows.InteractiveWorkflow):
    @workflows.workflow.entrypoint
    async def run(self) -> workflows_mistralai.ChatAssistantWorkflowOutput:
        await workflows_mistralai.send_assistant_message("What's your name?")
        user_input = await self.wait_for_input(workflows_mistralai.ChatInput())
        name = user_input.message[0].text if user_input.message else "friend"
        return workflows_mistralai.ChatAssistantWorkflowOutput(
            content=[workflows_mistralai.TextOutput(text=f"Nice to meet you, {name}!")])
```

| Élément | Paramètres | Comportement |
|---|---|---|
| `send_assistant_message(message, canvas=None)` | 1er argument : une chaîne **ou** une liste de sorties (`TextOutput`, `ResourceOutput`…) ; `canvas` (mot-clé, optionnel) : un `CanvasResource` | Affiche un message assistant dans le chat Vibe Work ; avec `canvas`, joint un canvas au texte. |
| `self.wait_for_input(input, label=None, timeout=None)` | `input` : instance (`ChatInput()`, `ConfirmationInput(...)`, `CanvasInput(...)`) ou **classe** (`ExpenseForm` pour un `FormInput`) ; `label` : libellé (ex. `"Submit Expense"`, `"Review & Edit Report"`) ; `timeout` : `timedelta` ou `float` (secondes) | Met le workflow en pause jusqu'à la réponse. Défaut : attente **indéfinie**. Au-delà du timeout : lève `asyncio.TimeoutError` (conseil doc : l'entourer d'un `try/except asyncio.TimeoutError` pour ne pas faire échouer le workflow). |
| `ChatInput(prompt=None, suggestions=None)` | `prompt` : texte de contexte affiché **en placeholder** (peut être passé en positionnel : `ChatInput("Do you approve…?")`) ; `suggestions` : liste d'options pré-remplies, chacune étant une **liste** de `TextChunk(text=...)` | Réponse : objet avec `.message` (liste de chunks ; `message[0].text`). |

**Streaming des réponses d'agent** : avec `workflows_mistralai.RemoteSession(stream=True)`, la réponse d'un agent est streamée automatiquement vers l'UI sous forme d'**événements custom porteurs de JSON patches**, token par token, sans code additionnel. Forme : `Agent(model="mistral-medium-2508", name=..., description=..., instructions=...)` puis `await workflows_mistralai.Runner.run(agent=..., inputs=..., session=session)`.

**Exemple complet documenté** (« Full Expense Processing ») : combine une `TodoList` de 3 étapes (« AI Analysis », « Manager Review », « Process »), une analyse d'agent streamée dans la 1re étape (`async with analyze_item:`), une demande d'approbation via `ChatInput` avec deux suggestions (« Yes, approve this expense », « Reject ») dans la 2e, et un contrôle manuel du statut (`set_status("in_progress")` / `set_status("done")`) dans la 3e pour une logique conditionnelle.

### 3.2 Formulaires structurés (`FormInput`)

On déclare une sous-classe de `FormInput` (import : `from mistralai.workflows.conversational import FormInput, TextField, NumberField, DateField, DateTimeField, SingleChoice, MultiChoice, FileField`) dont chaque attribut annoté est un champ ; on passe **la classe** à `wait_for_input(ExpenseForm, label="Submit Expense")` ; le retour expose les valeurs typées (`expense.amount`, `expense.expense_date.isoformat()`…).

| Type de champ | Rendu | Propriétés | Type Python retourné (d'après les exemples) |
|---|---|---|---|
| `TextField` | Saisie texte | `description`, `pattern` (regex optionnelle), `prefilled_value`, `error_message` | `str` |
| `NumberField` | Saisie numérique | `description`, `minimum`, `maximum` (inclusifs), `exclusive_minimum`, `exclusive_maximum` (stricts), `prefilled_value` | `float` |
| `DateTimeField` | Sélecteur date/heure | `description`, `prefilled_value` (chaîne ISO 8601 datetime, ex. `"2025-01-15T10:00:00Z"`) | `datetime` |
| `DateField` | Sélecteur de date | `description`, `prefilled_value` (chaîne ISO 8601 date, ex. `"2025-01-15"`) | `date` |
| `SingleChoice` | Liste déroulante | `options` (liste de tuples `(valeur, libellé)` ou de chaînes — valeur = libellé), `description`, `prefilled_value` (une valeur) | `str` |
| `MultiChoice` | Multi-sélection | `options` (idem), `description`, `prefilled_value` (liste de valeurs) | `list[str]` |
| `FileField` | Upload de fichier(s) | `description`, `multiple` (défaut `False`), `include_metadata` (défaut `False`) | `str` (URL) ; `list[str]` si `multiple=True` ; `FileWithMetadataValue` / `list[FileWithMetadataValue]` si `include_metadata=True` |

Règles :
- `prefilled_value` (tous les champs **sauf `FileField`**) est un **simple indice d'UI** : il pré-remplit, mais ne rend pas le champ optionnel ; l'utilisateur doit toujours soumettre explicitement. Une valeur pré-remplie invalide (hors bornes, non conforme au pattern, option inconnue) est **ignorée silencieusement**.
- `TextField.pattern` : en cas d'échec, un message généré **cite la regex** à l'utilisateur (ex. `^00\d{8}$`). `error_message` remplace ce message par une formulation actionnable ; il est purement présentationnel (ne change pas ce qui est accepté), est affiché **tel quel** (pas adapté à la langue de l'utilisateur, contrairement au message généré) et remplace aussi la regex dans l'aide affichée sous le champ.
- `FileWithMetadataValue` (import `from mistralai.workflows.conversational import FileField, FileWithMetadataValue`) :

| Champ | Type | Requis | Description |
|---|---|---|---|
| `filename` | `str` | Oui | Nom de fichier d'origine |
| `url` | `str` | Oui | URL signée de téléchargement |
| `content_type` | `str` | Oui | Type MIME |

- Les URLs de fichiers **peuvent expirer** : le workflow doit stocker les fichiers ailleurs s'il en a besoin à long terme.

### 3.3 Confirmations

Ces helpers créent un formulaire à un seul champ où sélectionner une option soumet immédiatement.

| Helper | Propriétés | Retour / lecture |
|---|---|---|
| `ConfirmationInput` | `options` (`list[tuple[str, str]]` ou `list[str]`), `description` (affichée au-dessus des options) | `.choice` = **valeur** de l'option choisie (ex. `"fire"`). Les options « devraient » être rendues comme des boutons. |
| `AcceptDeclineConfirmation` | `description` (au-dessus des boutons), `accept_label`, `decline_label` | Helper `workflows_mistralai.is_accepted(confirmation)` → booléen. Les clients peuvent le rendre comme une UI de validation standard **avec raccourcis clavier**. |

### 3.4 Suivi de progression (`TodoList`)

- `workflows_mistralai.TodoList(items=[...])` s'utilise en gestionnaire de contexte asynchrone (`async with ... as todo_list:`) ; chaque `TodoListItem(title=..., description=...)` est affiché comme une étape avec statut temps réel.
- Deux façons de mettre à jour un élément :
  - **Gestionnaire de contexte** `async with item:` → `in_progress` à l'entrée, `done` à la sortie réussie.
  - **Contrôle manuel** `await item.set_status("in_progress")` / `await item.set_status("done")` → pour des mises à jour à des points précis, des flux conditionnels ou une gestion d'exception personnalisée.

| Propriété `TodoListItem` | Type | Description |
|---|---|---|
| `id` | `str` | UUID auto-généré |
| `title` | `str` | Titre affiché de l'étape |
| `description` | `str` | Description détaillée |
| `status` | `"todo" \| "in_progress" \| "done"` | Statut courant (défaut `"todo"`) |

La doc ne précise pas le statut affiché en cas d'exception dans un `async with item:` (voir §8).

### 3.5 Canvas

Le canvas est la surface de contenu riche du chat (documents markdown, code, diagrammes, slides, composants interactifs). Deux usages :

**1. Sortie riche** : `CanvasPayload(type=..., title=..., content=...)` → `CanvasResource(canvas=payload)` → `ResourceOutput(resource=resource)` dans `ChatAssistantWorkflowOutput.content` (exemple : camembert Mermaid « Expense Breakdown »).

| `type` de canvas | Contenu |
|---|---|
| `text/markdown` | Markdown |
| `text/html` | HTML |
| `image/svg+xml` | Images SVG |
| `slides` | Diapositives de présentation |
| `react` | Composants React |
| `code` | Code avec coloration syntaxique |
| `mermaid` | Diagrammes Mermaid |

**2. Édition humaine (human-in-the-loop)** : envoyer le canvas en cours d'exécution via `send_assistant_message("…", canvas=canvas_resource)`, puis `await self.wait_for_input(CanvasInput(canvas_uri=canvas_resource.uri, prompt="Any feedback?"), label="Review & Edit Report")` (import `from mistralai.workflows.conversational import CanvasInput`). Contrainte : `canvas_uri` doit correspondre à l'`uri` d'un `CanvasResource` émis lors d'une étape précédente.

Retour de `CanvasInput` :
- `canvas.title` — titre du canvas édité ;
- `canvas.content` — contenu édité ;
- `chatInput` — message de chat optionnel, présent seulement si `prompt` a été fourni **et** que l'utilisateur a envoyé un message.

### 3.6 Tool UI

#### Composants UI riches

Composants Python de la bibliothèque du design system, envoyés comme `UIComponentResource(component=...)` dans un `ResourceOutput` — soit en cours de route via `send_assistant_message([TextOutput(...), ResourceOutput(...)])`, soit dans la sortie finale. Import : `mistralai.workflows.plugins.mistralai.conversational_ui_components`.

| Composant | Rôle | Props clés |
|---|---|---|
| `Alert` | Message important avec niveau de sévérité | `title`, `variant` (`info`/`warning`/`error`/`success`), `children` |
| `Avatar` | Image d'avatar utilisateur | `src`, `alt`, `text`, `size` |
| `Badge` | Petite étiquette de statut | `variant` (`default`/`primary`/`success`/`warning`/`error`), `size`, `children` |
| `ButtonLink` | Lien stylé en bouton | `href`, `variant`, `size`, `external`, `children` |
| `Card` | Conteneur avec titre et description optionnels | `title`, `description`, `padding`, `children` |
| `Chart` | Graphique en ligne ou en barres | `variant` (`line`/`bar`), `data`, `xAxis`, `yAxis` (chaîne ou liste de séries), `title` |
| `Column` | Conteneur vertical | `alignment`, `distribution`, `gap`, `children` |
| `Image` | Affichage d'image | `src`, `alt`, `size` |
| `Markdown` | Texte formaté Markdown | `content` |
| `PieChart` | Camembert à segments étiquetés | `data`, `title` |
| `Row` | Conteneur horizontal | `alignment`, `distribution`, `gap`, `wrap`, `children` |
| `Tooltip` | Information au survol | `trigger`, `children` |

Les composants acceptant `children` s'imbriquent (ex. `Row` contenant deux `Card`, chacune avec un `Chart` ; `data` = liste de dictionnaires, `xAxis="month"`, `yAxis=["actual", "target"]`).

#### États d'outils (Tool UI states)

Représentations visuelles optionnelles de l'exécution d'outils dans le chat Vibe Work, attachées à un `ChatAssistantWorkingTask(title=..., content=..., toolUIState=...)` (import `from mistralai.workflows.conversational import ...`). Chaque état porte un `toolCallId`.

| État | Paramètres | Variantes de résultat / opérations |
|---|---|---|
| `FileToolUIState` | `toolCallId`, `operations` (liste) | `CreateFileOperation(uri, content)` ; `ReplaceFileOperation(uri, fileContentBefore, blocks=[SearchReplaceBlock(search, replace)])` ; `DeleteFileOperation(uri)` — URIs de forme `file:///workspace/...` |
| `GenericToolUIState` | `toolCallId`, `name` (ex. `"bash"`, `"grep"`), `arguments` (dict), `result` | `ToolResultRunning()` ; `ToolResultSuccess(value=...)` ; `ToolResultFailed(error="...")` |
| `CommandToolUIState` | `toolCallId`, `command` (ex. `"npm install"`), `result` | `CommandResultRunning()` ; `CommandResultSuccess(output="...")` ; `CommandResultFailed(error="...")` |

### 3.7 Publication dans Vibe

- **Condition** : le workflow doit retourner un `ChatAssistantWorkflowOutput` pour être publié comme assistant dans **Vibe Work** (web et mobile). Le nom reflète le protocole sous-jacent (« assistant compatible chat ») ; la valeur de sortie **n'est pas rendue seule**, mais une interface commune est imposée pour l'interopérabilité entre surfaces. Le même contrat alimente l'expérience consommateur décrite dans « Run Workflows in Vibe Work » (`/vibe/work/workflows`, hors périmètre).

| Champ de `ChatAssistantWorkflowOutput` | Type | Effet |
|---|---|---|
| `content` | liste de `TextOutput` / `ResourceOutput` | Contenu de la réponse finale |
| `isError` | booléen (défaut implicite : faux) | Si `True`, le texte de `content` sert de message d'erreur affiché à l'utilisateur et le workflow est marqué **failed** dans la conversation |
| `structuredContent` | `dict[str, Any]`, optionnel | Données structurées arbitraires attachées à la sortie (ex. `{"tool": "web_search", "results": [...]}`) |

- **Variantes d'entrée étiquetées** : pour une entrée de type union (`params: FullParams | SimpleParams`), `@input_tag("simplified")` (import `from mistralai.workflows.plugins.mistralai import input_tag`) ajoute `"x-input-tag": "simplified"` à `SimpleParams.model_json_schema()`. Les clients inspectent les membres de l'union dans l'`input_schema` du workflow et choisissent la variante dont ils reconnaissent le tag ; le workflow distingue ensuite avec `isinstance`.

### 3.8 Signals

- **Nature** : messages **asynchrones** envoyés par un système externe à une exécution en cours, à tout moment ; le workflow doit les gérer explicitement ; ils peuvent porter un payload.
- **Déclaration** : `@workflows.workflow.signal(name="add_notification")` sur une méthode `async` (ex. `async def add_notification(self, message: str, priority: int = 1) -> None`). Le workflow attend sans busy-waiting avec `await workflows.workflow.wait_condition(lambda: ...)`.
- **Validation** : payload vérifié contre les paramètres déclarés (types) ; tout champ **non déclaré est rejeté** (ex. `{"message": "hi", "extra": "bad"}`) → **HTTP 422** avec message descriptif. Pour les structures complexes, paramètre de type modèle Pydantic (désérialisation + validation champ par champ).
- **Envoi** : `client.workflows.executions.signal_workflow_execution(execution_id=..., name=..., input={...})` ou `POST /v1/workflows/executions/{execution_id}/signals` avec `{"name": ..., "input": {...}}`. [spec OpenAPI] Réponse `202` avec `SignalWorkflowResponse` (`message`, défaut `"Signal accepted"`).

### 3.9 Queries

- **Nature** : lecture **synchrone** de l'état courant ; lecture seule (ne doit pas modifier l'état) ; appelable à tout moment, mais doit **répondre vite** (inadaptée aux opérations longues).
- **Déclaration** : `@workflows.workflow.query(name="get_status")` sur une méthode **synchrone** (`def`, pas `async def`) qui retourne une valeur (ex. `{"progress": ..., "completed": ...}`).
- **Validation** : mêmes règles que les signals (types, champs supplémentaires rejetés, **HTTP 422**) ; paramètres Pydantic possibles (ex. `StatusRequest(include_details: bool = False)`).
- **Envoi** : `client.workflows.executions.query_workflow_execution(execution_id=..., name="get_status")` ou `POST /v1/workflows/executions/{execution_id}/queries` avec `{"name": "get_status"}` (et `input` optionnel [spec OpenAPI]). Réponse : `{"query_name": "get_status", "result": {"progress": 60.0, "completed": false}}`.

### 3.10 Updates

- **Nature** : requête **synchrone** qui modifie l'état, **peut exécuter des activités** et **retourne une réponse** — à privilégier quand l'appelant a besoin de la confirmation que l'opération est terminée.
- **Déclaration** : `@workflows.workflow.update(name="update_data")` sur une méthode `async` ; exemple : appelle l'activité `process_update_data` (décorée `@workflows.activity()`), met à jour `self.current_value`, retourne `{"success", "processed_value", "message"}`.
- **Validation** : identique (types, champs en trop rejetés, **HTTP 422**) ; Pydantic pour regrouper des champs liés (ex. `ConfigUpdate(timeout: int, retry_count: int)`).
- **Envoi** : `client.workflows.executions.update_workflow_execution(execution_id=..., name=..., input={...})` ou `POST /v1/workflows/executions/{execution_id}/updates`. Réponse : `{"update_name": "update_data", "result": {...}}`.

**Comparatif (tableau identique sur les trois pages)** :

| Mécanisme | Communication | Modifie l'état | Retourne une valeur | Peut exécuter des activités |
|---|---|---|---|---|
| Signal | Asynchrone | Oui | Non | Non |
| Query | Synchrone | Non | Oui | Non |
| Update | Synchrone | Oui | Oui | Oui |

Une action (signal, query, update, terminate) sur une exécution qui ne tourne plus renvoie `WF_1102` (409) avec le `status` courant (§3.18).

### 3.11 Deployments

**Définition** : un *deployment* est un groupe nommé de workers qui possède un ensemble de définitions de workflows et reçoit toutes les exécutions de ces définitions. Il permet l'isolation des workers dans un workspace partagé et le routage automatique des exécutions.

| Variable | Statut | Règles |
|---|---|---|
| `DEPLOYMENT_NAME` | **Obligatoire** au démarrage du worker ; sinon le worker échoue immédiatement au boot | Caractères : alphanumériques, tirets, underscores ; **max 128 caractères** |
| `WORKER_NAME` | Optionnel | Identifie le processus worker ; visible dans la console et l'API ; défaut `socket.gethostname()` |

Lancement type : `DEPLOYMENT_NAME=invoice-service MISTRAL_API_KEY=your-key uv run python worker.py`.

**Isolation** : dans un workspace partagé, plusieurs développeurs lancent leurs workers avec la même clé partagée mais des `DEPLOYMENT_NAME` différents (`alice`, `bob`) ; chaque déploiement ne reçoit que les exécutions des définitions qu'il a enregistrées.

**Routage** :
- Un seul déploiement actif possède le workflow → routage automatique (`client.execute_workflow(workflow_identifier="invoice_processor", input_data=...)`).
- Deux déploiements actifs enregistrent le même nom de workflow → **`409 Conflict`** avec corps `{"code": "AMBIGUOUS_WORKFLOW", "deployments": ["alice", "bob"]}`. Résolution : passer `deployment_name="alice"` explicitement. [spec OpenAPI] Dans `WorkflowExecutionRequest`, `deployment_name` remplace `task_queue` (déprécié).

**Détection de conflit** : quand un worker enregistre un nom déjà possédé par un *autre* déploiement actif, l'enregistrement **n'est pas bloqué** ; un avertissement est renvoyé dans la réponse d'enregistrement et apparaît dans les logs du worker (`"warnings": ["Workflow 'invoice_processor' is also registered by active deployment 'bob'"]`). Le conflit se résout de lui-même quand l'un des déploiements devient inactif. Plusieurs workers du **même** déploiement enregistrant les mêmes définitions = mise à l'échelle horizontale, sans avertissement.

**Cycle de vie** :
- Les workers émettent un heartbeat automatiquement toutes les **~10 secondes**.
- Un déploiement est **actif** tant qu'au moins un worker a émis un heartbeat dans la **fenêtre de vivacité** ; il devient **inactif** quand tous les workers sont arrêtés et que la fenêtre s'est écoulée : **50 secondes en production**, « configurable ».
- Un déploiement inactif ne reçoit pas d'exécutions et n'est pas compté comme conflictuel.

**Mise à l'échelle horizontale** : plusieurs workers sous le même `DEPLOYMENT_NAME` ; exécutions réparties sur tous les workers actifs. En production : Kubernetes `Deployment` ou `StatefulSet` avec réplicas pointant sur le même nom ; la plateforme répartit la charge automatiquement.

**Lister / inspecter** :
- `client.workflows.deployments.list_deployments()` / `GET /v1/workflows/deployments` → `{"deployments": [{"id", "name", "is_active", "created_at", "updated_at"}]}` (ID au format UUIDv7-like, ex. `019d2585-…`). Filtres documentés : `workflow_name`, `active_only=false` (inclut les inactifs ; défaut `true` [spec OpenAPI]).
- `client.workflows.deployments.get_deployment(name="invoice-service")` / `GET /v1/workflows/deployments/{name}` → mêmes champs + `workers: [{"name", "created_at", "updated_at"}]`.
- [spec OpenAPI] Filtres supplémentaires de la liste : `is_hardened`, `created_by`, `owner`, `location_types`, `search` (préfixe de nom ou d'ID), `order_by`, `order` (défaut `desc`), `limit`, `cursor`, `workspace_id`. Champs supplémentaires de `DeploymentResponse` : `is_hardened`, `last_heartbeat` (`updated_at` en est l'alias **déprécié**), `owner` (null = géré par administrateur), `location`, `locations`, `worker_count`, `active_worker_count`, `managed` (état du service managé ; null pour un déploiement auto-hébergé).

### 3.12 Hardened deployments

**Principe** : un hardened deployment restreint l'enregistrement de workflows à des utilisateurs et service accounts autorisés ; chaque autorisation est un **pin**. Le hardening est un **réglage explicite, indépendant du nombre de pins** : retirer le dernier pin laisse le déploiement **fermé** (aucune réouverture accidentelle de l'enregistrement à tous).

**Pourquoi** : si des workers d'un même déploiement enregistrent des implémentations différentes sous le même nom, on ne peut pas prédire laquelle traite une exécution ; un enregistrement accidentel ou non autorisé peut perturber la production. Les **workflows OBO** (accès délégué aux fichiers et connecteurs de l'utilisateur déclencheur) **exigent** un hardened deployment.

**Types de pins** :

| Pin | Ce qu'il autorise | Rotation |
|---|---|---|
| **User** | Les clés API éligibles de cet utilisateur | Rotation de clé sans modifier le pin |
| **Service account** | Les workloads authentifiés comme ce service account, y compris via *workload identity federation* | Rotation des credentials sans modifier le pin |
| **API-key pin utilisateur (existant)** | Uniquement cette clé précise (pas les autres clés du même utilisateur) | Conservé « pour compatibilité », visible et supprimable ; préférer un pin User |

Les **clés API de service account ne peuvent pas être choisies comme pin** : on pinne le principal service account, pour que l'autorisation suive l'identité d'exécution plutôt qu'un credential remplaçable.

**Propriété et permissions** :
- Les **owners** du déploiement et les **administrateurs de workspace** gèrent hardening et pins dans l'onglet **Settings** du déploiement dans Studio. Les administrateurs conservent les capacités de récupération et de réattribution de propriété.
- **Owner ≠ pin** : être propriétaire n'autorise pas, à soi seul, l'enregistrement de workers.
- Permission **`AccessWorkflows`** requise dans le workspace cible pour posséder un déploiement, être pinné ou auto-revendiquer un déploiement OBO local (un utilisateur sans accès Workflows ne doit pas l'obtenir indirectement).

**Premier enregistrement OBO local (auto-claim)** :
1. Utiliser une clé API d'un utilisateur ayant `AccessWorkflows`.
2. Configurer un workflow OBO et démarrer son worker avec un **nouveau** nom de déploiement.
3. L'enregistrement crée **atomiquement** le déploiement, nomme l'utilisateur owner, pinne son **principal utilisateur** (pas la clé) et active le hardening.
4. Ouvrir **Settings** pour revoir/ajouter des principaux avant que des coéquipiers rejoignent.

Restrictions : l'auto-claim ne vaut que pour les enregistrements **OBO utilisateur** (durcir tout déploiement local partagé permettrait au premier worker de verrouiller les coéquipiers). Un nom existant n'est pas repris s'il est sans owner ou possédé par un autre ; le durcissement automatique d'un déploiement local existant n'est possible que si l'on en est owner, qu'il est non durci **sans pins** et qu'**aucun autre worker n'est vivant**. Un second utilisateur ne peut pas revendiquer un déploiement durci existant. Les appelants **service account** ne sont pas auto-revendiqués et ne deviennent pas owners par ce flux ; un service account pinné peut néanmoins exécuter des workflows OBO (l'identité du runtime autorise l'enregistrement, celle de l'utilisateur déclencheur fournit l'accès délégué).

**Hardening initial selon le chemin de création** :

| Chemin de création | Hardening initial | Pin initial |
|---|---|---|
| 1er enregistrement OBO local d'un utilisateur éligible sous un nouveau nom | Automatique | L'utilisateur devenu owner |
| Managed deployment créé dans Studio | Activé par défaut, avec opt-out | Le service account du runtime managé |
| Managed deployment créé via d'autres clients | Les autres clients envoient actuellement `hardened: false` | Aucun pin automatique sauf si le hardening est demandé |

[spec OpenAPI] `CreateDeploymentRequest.hardened` : booléen, défaut `false`.

**Gestion dans Studio (onglet Settings ; owner ou admin requis)** :
- **Activer** : (1) arrêter les workers (et le service managé le cas échéant) ; (2) attendre que le déploiement soit inactif ; (3) activer dans **Settings**. Pin initial choisi automatiquement : l'owner (local) ou le service account du runtime (managé) ; si un déploiement local n'a pas d'owner, un administrateur doit d'abord en assigner un éligible. L'inactivité est exigée car changer l'autorisation n'arrête pas les workers déjà actifs.
- **Ajouter / retirer des pins** : plusieurs pins = plusieurs principaux autorisés ; retirer le dernier pin laisse le hardening actif et l'enregistrement fermé.
- **Désactiver** : réouvre l'enregistrement ; supprime **atomiquement tous les pins**, y compris celui du runtime managé. **Refusé tant qu'un workflow OBO est enregistré** sur le déploiement (arrêter les workers ne suffit pas : il faut retirer les enregistrements OBO). [spec OpenAPI] Endpoint `POST /v1/workflows/deployments/{deployment_id}/unharden` : `204`, `403` (owner ou admin requis), `404`, `409` (enregistrement OBO présent), `422` (définition d'enregistrement non validable).
- **Réconciliation automatique** : les pins user et service account invalides sont réconciliés périodiquement ; un pin n'est supprimé que si la validation montre de façon concluante que le principal n'est plus éligible ; une panne de dépendance ou un contexte manquant **préserve** le pin (pas de révocation sur échec temporaire).

**Garanties et limites** : le hardening limite l'enregistrement aux principaux autorisés ; il **ne valide pas le code** soumis par un principal autorisé et ne remplace pas la protection de ses credentials.

**Dépannage de l'enregistrement** (les refus d'autorisation contiennent un **lien direct vers l'onglet Settings** du déploiement, présélectionnant organisation, workspace et déploiement) :

| Problème | Cause | Action |
|---|---|---|
| Impossible d'auto-revendiquer / d'être ajouté owner ou pin | Permission `AccessWorkflows` manquante | Demander l'accès Workflows à un administrateur du workspace |
| L'accès Workflows ne peut être vérifié | Vérification de permission temporairement indisponible | Réessayer ; un échec de vérification ne crée pas de revendication |
| Enregistrement refusé sur un déploiement durci | Aucun pin ne correspond au principal du worker (ensemble de pins éventuellement vide) | Suivre le lien Settings et demander l'autorisation à l'owner/admin, ou changer de nom de déploiement |
| Enregistrement OBO refusé sur un déploiement existant non durci | Déploiement non éligible au durcissement automatique | Demander à l'owner/admin de l'arrêter et d'activer le hardening, ou utiliser un nouveau nom |
| Hardening refusé alors que des workers sont actifs | Changement d'autorisation impossible en sécurité avec workers actifs | Arrêter workers (et service managé), attendre l'inactivité, réessayer |
| Désactivation du hardening refusée | Des enregistrements OBO existent | Retirer les enregistrements OBO (arrêter les workers ne suffit pas) |

### 3.13 Managed deployments

> Encadré `:::info` : managed deployments en **public preview** ; la fonctionnalité et ses limites peuvent changer.

**Principe** : Mistral exécute le worker pour vous. On pointe Mistral vers un dépôt GitHub ; **Mistral Cloud** construit une image Docker à partir du `Dockerfile` du dépôt et exécute le conteneur. Aucun serveur à gérer, **aucune clé API à créer** pour le worker. Un managed deployment peut être durci (§3.12).

#### Démarrage (guide en 6 étapes)

**Prérequis** :
- Compte Mistral avec **pay-as-you-go activé** sur l'organisation, ou plan **Enterprise**. Le plan Free ne peut pas, et les plans payants Pro ou Team **seuls ne suffisent pas**.
- Python **3.12+** et `uv` (`uvx` est fourni avec `uv`).
- Compte GitHub avec droit de créer un dépôt (organisation ou personnel).

| Étape | Action | Détails |
|---|---|---|
| 1. Scaffold | `uvx mistralai-workflows-cli@latest setup` | Génère un projet Python avec le SDK Workflows, un workflow d'exemple `hello-world` et un `Dockerfile` prêt pour le managed. Vérifier localement avec `make start-worker` puis `Ctrl+C` une fois les workflows enregistrés. La clé API locale doit rester dans un fichier ignoré par git. |
| 2. Push GitHub | `git init`, commit, `git remote add origin https://github.com/<org>/<repo>.git`, `git branch -M main`, `git push -u origin main` | **Seul GitHub public (github.com)** est supporté ; GitLab et GitHub Enterprise « à venir ». Le dépôt peut être **public ou privé** : le clonage passe par la Mistral GitHub App, pas par HTTPS public. |
| 3. GitHub App | (a) installer l'App sur les dépôts via `github.com/apps/mistralai` › **Configure** › organisation › dépôts ; (b) connecter GitHub dans la console : **GitHub App settings** (`https://console.mistral.ai/connectors/github_app`) › ajouter un credential | La liste de dépôts de la boîte de création ne contient que les dépôts où l'App est installée **et** accessibles au compte. Pour un dépôt d'organisation qu'on n'administre pas, demander à un owner de l'organisation. |
| 4. Créer le déploiement | Console : **Deployments** (`https://console.mistral.ai/workflows/deployments`) › créer › choisir dépôt et branche › garder la configuration par défaut › créer et attendre la fin du build. API : `POST /v1/workflows/deployments` `{"name", "spec": {"github_url", "revision": "main"}}` → **`202 Accepted`**. Python : `client.workflows.deployments.create_deployment(name=..., spec={...})` | Choisir un **nom unique** : deux déploiements du même nom « se volent » leurs exécutions. |
| 5. Vérifier et exécuter | Attendre le statut **Active** (= le worker a enregistré ses workflows, listés sur la page du déploiement). Exécuter `hello-world` : console (`https://console.mistral.ai/workflows/hello-world`, input `{"name": "World"}`), `POST /v1/workflows/hello-world/execute` `{"input": {"name": "World"}}`, ou `client.workflows.execute_workflow(workflow_identifier="hello-world", input={...})` (→ `execution.execution_id`) ; `client.workflows.execute_workflow_and_wait` pour attendre la sortie | En cas d'échec de build : ouvrir les détails du déploiement pour lire l'erreur. |
| 6. Nouvelle version | Pousser sur la branche déployée puis **Redeploy** (console) ou `POST /v1/workflows/deployments/<name>/restart` (→ `202 Accepted`) ou `client.workflows.deployments.restart_deployment(name=...)` | Mistral Cloud résout la branche vers son **dernier commit** (re-pin), reconstruit l'image et redémarre le worker. Pour figer une version exacte : mettre à jour le déploiement avec `revision` = SHA de commit. |

#### Fonctionnement

- **Authentification par service account** : chaque managed deployment tourne sous **son propre service account** ; aucune clé API n'est provisionnée. La plateforme monte un **jeton rotatif** en fichier dans le conteneur et positionne `MISTRAL_SA_TOKEN_PATH` ; le SDK lit le fichier et suit les rotations. (encadré `:::warning`) l'image doit installer **`mistralai-workflows` ≥ 3.10** ; les versions antérieures ne savent pas lire les jetons de service account (le worker ne peut pas s'authentifier).
- **Exigences du dépôt** : l'image est exécutée **telle quelle** ; **pas de réglage `entrypoint`** : l'`ENTRYPOINT`/`CMD` de l'image doit démarrer le worker (ex. `python worker.py` appelant `run_worker([...])`). La boîte de création de la console inclut un **Dockerfile d'exemple**. Le `Dockerfile` est lu à la racine du contexte de build par défaut ; à la création, on peut indiquer le **chemin du Dockerfile** (fichier imbriqué ou nommé autrement) et le **répertoire de build** (worker dans un sous-dossier ; tout ce que copie le Dockerfile doit s'y trouver). [spec OpenAPI] Champs `spec.backend_spec.build_directory` (défaut : racine du dépôt) et `dockerfile_path` (relatif à `build_directory`, défaut `Dockerfile`) ; `backend_spec.type` ∈ {`mistral_cloud` (défaut), `koyeb`}.
- **Région** : le worker Mistral Cloud tourne dans **`nl-north-1`** (Pays-Bas).
- **Variables injectées** : `DEPLOYMENT_NAME`, `SERVER_URL`, et le fichier de jeton derrière `MISTRAL_SA_TOKEN_PATH`. L'installation des dépendances relève du `Dockerfile`.

#### Secrets

Les workers lisent leurs credentials depuis le **Secrets Manager du workspace** : on lie un secret du workspace à une variable d'environnement ; le worker lit la valeur au boot. **Seuls les secrets du workspace du déploiement** peuvent être liés.

- **Console** : (1) créer les secrets dans **Secrets** (`https://console.mistral.ai/secrets`) ; (2) les référencer à la création sur **Deployments** : chaque liaison associe une variable d'environnement à un secret ; **laisser le nom de variable vide réutilise le nom du secret** ; (3) modifier les liaisons d'un déploiement en cours dans son onglet **Settings** (`https://console.mistral.ai/workflows/deployments/<your-deployment-name>?tab=settings`).
- **API** : `PATCH /v1/workflows/deployments/<name>` avec `{"spec": {"backend_spec": {"secrets": [{"env_var_name": "GITHUB_TOKEN", "reference": "secret:workspace:github_token"}]}}}` ; Python `client.workflows.deployments.update_deployment(name=..., spec={...})`. La liste `secrets` **redéfinit l'ensemble** des liaisons (envoyer la liste complète ; omettre `secrets` pour ne rien changer ; [spec OpenAPI] liste vide = tout délier). **Seules les références `secret:workspace:<NAME>`** sont supportées. [spec OpenAPI] La valeur est résolue au boot par un conteneur *runtime-init* ; elle n'atteint jamais le plan de contrôle.
- (encadré `:::warning`) **changer la valeur d'un secret ne redémarre pas le worker** : il garde la valeur lue au boot ; redémarrer manuellement le déploiement.
- **Double disponibilité** : à l'exécution (variable d'environnement lue au boot) **et** au build (Docker *build arg* de même nom ; déclarer un `ARG` correspondant, ex. `ARG UV_INDEX_USERNAME` / `ARG UV_INDEX_PASSWORD` pour un registre privé avant `RUN uv sync --frozen --no-dev`). Les build args sont **stockés dans l'historique et les couches de l'image** : toute personne ayant accès à l'image peut les récupérer ; préférer des credentials rotatifs et éviter de lier des secrets de forte valeur au build.

#### Quotas

| Plan | Managed deployments simultanés (par organisation) |
|---|---|
| Free | 0 |
| Pro ou Team, pay-as-you-go désactivé | 0 |
| Pay-as-you-go activé | **3** |
| Enterprise | **10** |

- Cap de 0 → la création échoue avec **`403`**. Cap atteint (PAYG/Enterprise) → créer **ou démarrer** un déploiement au-delà échoue en **`403`** ; arrêter ou supprimer un déploiement libère un emplacement.
- Mistral Cloud choisit la **taille d'instance** : identique pour tous les workers managés ; métriques CPU/mémoire par déploiement **non exposées** pour l'instant.

#### Dépannage

- **Tester l'image localement** : `docker build -t my-worker .` (depuis `build_directory` si sous-dossier) puis `docker run --rm -e MISTRAL_API_KEY -e DEPLOYMENT_NAME=my-worker-local my-worker`. `MISTRAL_API_KEY` est transmis depuis le shell ; le worker se connecte réellement à `https://api.mistral.ai` et enregistre ses workflows : utiliser un `DEPLOYMENT_NAME` **différent** du déploiement live (sinon vol d'exécutions).
- **Échecs courants** : le worker tourne mais aucun workflow n'apparaît → vérifier `ENTRYPOINT`/`CMD` ; le build échoue → lire l'erreur dans les détails du déploiement puis reproduire localement ; exécutions sur le mauvais worker → deux déploiements de même nom.

### 3.14 Concurrence

**Petits lots** : en dessous d'environ **10 000 activités**, `asyncio.gather(*[process_item(i) for i in items])` suffit. Le framework de concurrence devient utile pour le continue-as-new automatique, le suivi de progression, ou des volumes risquant de dépasser la **limite d'historique de 51 200 événements**.

**Avantages annoncés** : parallélisme massif (milliers d'activités), continue-as-new automatique, validation de types sur entrées/sorties, tolérance aux pannes (retries), suivi de progression via l'observabilité intégrée.

**Fonction unique** `workflows.execute_activities_in_parallel(activity, *, ...)` ; il faut fournir **exactement un** de `items`, `get_item_from_prev_item_activity`, `get_item_from_index_activity`.

| Patron | Paramètre déclencheur | Cas d'usage | Fonctionnement |
|---|---|---|---|
| **List Executor** | `items` (liste de dicts mappés sur les paramètres de l'activité) | Collection connue d'avance : résultats SQL, documents, réponses d'API complètes, lots d'utilisateurs/fichiers | Exécute l'activité sur chaque élément en parallèle |
| **Chain Executor** | `get_item_from_prev_item_activity` (activité `prev -> next`, appelée d'abord avec `None`, s'arrête quand elle retourne `None`) | Pagination par jeton : S3 ListObjects (ContinuationToken), DynamoDB Scan/Query (LastEvaluatedKey), Azure Blob (marker) | **Découverte séquentielle**, **traitement parallèle** : chaque élément récupéré est immédiatement dispatché ; la récupération de N+1 dépend de N, mais son traitement est concurrent avec celui de 1…N |
| **Offset Pagination Executor** | `get_item_from_index_activity` (reçoit `workflows.GetItemFromIndexParams` avec `.idx` et `.extra_params`) + `n_items` (requis) | API REST paginées, SQL OFFSET/LIMIT, fichiers par offset d'octets | Regroupe les éléments par lots traités dans une même exécution d'activité |

| Paramètre | Défaut | Effet | Executors concernés |
|---|---|---|---|
| `max_concurrent_scheduled_tasks` | **100** | Nombre max d'exécutions d'activités planifiées simultanément | List, Offset (pas Chain) |
| `max_concurrent_executions_per_worker` | **100** | **Taille du groupe** d'éléments traités ensemble dans une seule exécution d'activité | Offset uniquement |
| `n_items` | requis (Offset) | Nombre total d'éléments | Offset |
| `extra_params` | `None` | Paramètres additionnels passés aux activités | Tous |

Retour : `None` si l'activité retourne `None`, sinon `List[U]`. Lève `ValueError` si l'activité n'est pas décorée ou si les paramètres sont invalides.

**Interaction des paramètres (Offset)** : ex. 1 000 éléments, `max_concurrent_executions_per_worker=10`, `max_concurrent_scheduled_tasks=5` → groupes de 10, jusqu'à 5 groupes en parallèle. **Un échec d'un élément fait rejouer tout le groupe** (petites valeurs = retries fins mais surcoût ; grandes = efficacité mais périmètre de retry large).

**Réglages recommandés** :

| Charge | Taille de groupe | `max_concurrent_scheduled_tasks` | Exemple |
|---|---|---|---|
| I/O-bound (API, BDD) | 50–100 | 100–200 | `50` / `150` |
| CPU-bound | 5–20 | 20–50 | `10` / `30` |
| Mixte | 20–50 | 50–100 | `25` / `75` |

Autres points : la taille du groupe impacte la mémoire par activité ; la concurrence élevée peut épuiser les ressources ; **limite de 2 MB d'entrée/sortie par activité** ; continue-as-new automatique pour les très grands volumes (exemples à 100 000 éléments) ; activités exécutables près des sources de données, `sticky_to_worker=True` pour celles qui bénéficient de la localité ; seuls les éléments en échec sont retraités (état de progression maintenu) ; mettre en place des alertes sur exécutions longues ou en échec.

**Dépannage** : `ValueError: 'activity' must be an activity, please decorate it with @workflows.activity` → décorer avec `@workflows.activity()` ; `ValueError: Must specify one execution pattern` → fournir exactement un des trois déclencheurs ; retries excessifs (Offset) → réduire la taille de groupe, investiguer les échecs individuels, mieux gérer les erreurs dans l'activité ; problèmes mémoire → réduire la taille de groupe, vérifier la limite de 2 MB. Conseils : annoter les types des activités, démarrer avec une faible concurrence, journaliser, déboguer l'Offset avec `max_concurrent_executions_per_worker=1`.

### 3.15 Rate limiting

- Déclaration : `@workflows.activity(rate_limit=workflows.RateLimit(time_window_in_sec=1, max_execution=100, key=None))`.
- Les limites sont **toujours partagées entre tous les workers et workflows d'un même déploiement**.
  - **Sans `key`** : la limite s'applique à l'activité elle-même (ex. 100 exécutions/s pour `generate_chat_response` ; si le workflow A fait 60 appels et B 50 dans la même seconde, ils puisent dans le même pool). Usage : protéger une ressource partagée (client d'API).
  - **Avec `key`** (ex. `key="mistral_api"`) : plusieurs activités différentes partagent **un seul pool** (ex. `generate_chat_response`, `generate_embeddings`, `moderate_content`).
- Client recommandé dans les activités : `client = Depends(get_mistral_client)` (`from mistralai.workflows.client import get_mistral_client`, `from mistralai.workflows import Depends`) — fabrique intégrée gérant authentification, télémétrie et métadonnées d'observabilité.
- **Coût en pollers** : chaque **clé distincte** fait démarrer un worker **Temporal** interne supplémentaire. Un processus worker exécute : 1 worker principal (workflows + activités par défaut), 1 worker d'activités *sticky*, + 1 par clé distincte. Chaque worker interne ouvre **5 pollers de workflow et 5 pollers d'activité**.

| Clés distinctes | Workers internes | Pollers totaux |
|---|---|---|
| 0 | 2 | 20 |
| 5 | 7 | 70 |
| 12 | 14 | 140 |

Au-delà du quota de pollers concurrents du namespace : `ResourceExhausted: namespace concurrent poller limit exceeded`. Bonne pratique : minimiser les clés ; les activités qui frappent la même ressource avec le même budget partagent une clé (ex. `key="document_pipeline"` pour `run_ocr` et `classify_document` plutôt que `"ocr"` et `"classify"` → un seul worker interne au lieu de deux).

### 3.16 Contexte d'exécution

`workflows.get_execution_id()` retourne l'identifiant unique de l'exécution courante depuis le code du workflow — pour la journalisation, la corrélation avec des systèmes externes ou la transmission aux activités qui doivent référencer l'exécution parente. C'est la seule API documentée sur cette page.

### 3.17 Reset d'une exécution

- **Quand** : workflow bloqué (ex. erreur de non-déterminisme après un changement de code) ou ne pouvant pas se terminer à cause d'un bug depuis corrigé. (encadré `:::warning`) à n'utiliser **qu'après correction** du problème ; **toute progression postérieure au point de reset est perdue**.
- **Mécanique** : (1) le run courant est terminé ; (2) un **nouveau run** est créé **sous le même execution ID** ; (3) tous les événements jusqu'au point de reset sont copiés ; (4) le workflow rejoue depuis ce point avec **la dernière version du code** (le correctif déployé s'applique).
- **Appel** : `client.workflows.executions.reset_workflow(execution_id=..., event_id=42, reason="...", exclude_signals=True, exclude_updates=True)` ; [spec OpenAPI] `POST /v1/workflows/executions/{execution_id}/reset` → `204`.

| Paramètre | Type | Requis (doc) | Description |
|---|---|---|---|
| `execution_id` | `str` | Oui | Exécution à réinitialiser |
| `event_id` | `int` | Oui | Événement cible, **obligatoirement** de type `WORKFLOW_TASK_COMPLETED` |
| `reason` | `str` | Oui (doc) / optionnel nullable [spec OpenAPI] | Motif, consigné dans l'historique d'événements |
| `exclude_signals` | `bool` | Non (défaut `false` [spec]) | Ne pas rejouer les signals reçus après le point de reset |
| `exclude_updates` | `bool` | Non (défaut `false` [spec]) | Ne pas rejouer les updates reçus après le point de reset |

- **Trouver le point** : `client.workflows.executions.get_workflow_execution_trace_events(execution_id=..., include_internal_events=True)` puis filtrer `e.event_type == "WORKFLOW_TASK_COMPLETED"`. Un `event_id` invalide → `WF_1001` (422) avec `valid_reset_events` (ex. `[3, 7, 12]`).
- **Bonnes pratiques** : corriger la cause d'abord ; toujours fournir un motif (audit) ; utiliser `exclude_signals` avec prudence (entrées externes perdues) ; tester le correctif dans un workspace de développement avant de réinitialiser en production.

### 3.18 Codes d'erreur de l'API Workflows (liste complète)

Format : `{"detail": "...", "code": "WF_XXXX"}` (+ champs additionnels selon le code). Pour les **4xx**, `detail` décrit le problème ; pour les **5xx**, `detail` vaut **toujours `"An error occurred"`** (cause réelle journalisée côté serveur).

| Code | Nom | HTTP | Catégorie | Signification / champs | Résolution |
|---|---|---|---|---|---|
| `WF_1000` | Unknown Error | 500 | General (1000–1099) | Fourre-tout | Logs serveur / équipe plateforme |
| `WF_1001` | Invalid Request | 422 | General | Requête bien formée mais données invalides ; actuellement renvoyé pour un event ID de reset invalide, avec `valid_reset_events` | Choisir un événement valide |
| `WF_1100` | Workflow Not Found | 404 | Workflow (1100–1199) | Exécution inexistante (ID erroné ou workflow purgé) | Vérifier l'ID ; voir le Workflows Dashboard (`https://console.mistral.ai/build/workflows`) |
| `WF_1101` | Workflow Already Started | 409 | Workflow | Une exécution avec le même ID tourne déjà ; IDs uniques par workspace | Autre ID, attendre la fin, ou terminer l'exécution d'abord |
| `WF_1102` | Workflow Not Running | 409 | Workflow | Signal/query/update/terminate sur une exécution terminée ; renvoie `status` (ex. `"COMPLETED"`) | Démarrer une nouvelle exécution |
| `WF_1103` | Platform Request Failed | 500 / 504 | Workflow | Échec de l'appel RPC à la plateforme sous-jacente (connexion, timeout, inattendu) ; **504 = deadline dépassée** | Réessayer ; sinon équipe plateforme |
| `WF_1104` | Workflow Registration Failed | 500 | Workflow | Échec d'enregistrement des définitions par le worker ; typiquement désaccord specs / identifiants de version au démarrage | Logs du worker ; validité des définitions ; joignabilité de l'API |
| `WF_1105` | Execution Not Found | 500 | Workflow | Incohérence interne : une exécution qui aurait dû exister est introuvable (≠ `WF_1100`) | Signaler si persistant |
| `WF_1200` | Schedule Failed | 422 / 500 / 503 | Schedule (1200–1299) | **422** : spécification invalide (cron, arguments) ou planification d'un workflow à **payloads déchargés (offloaded)** ; **503** : search attributes pas encore disponibles (transitoire, mise en place du workspace) ; **500** : autre échec de création/suppression | 422 : vérifier cron et taille de payload ; 503 : réessayer après quelques secondes ; 500 : logs |
| `WF_1201` | Schedule Not Found | 404 | Schedule | Schedule ID inexistant (supprimé ou jamais créé) | Lister les schedules |
| `WF_1300` | Platform Client Creation Failed | 500 | Infrastructure (1300–1399) | Construction du client plateforme impossible (adresse, credentials) | Vérifier hôte, port, TLS |
| `WF_1301` | Platform Initialization Failed | 500 | Infrastructure | Échec d'enregistrement des search attributes au démarrage du système | Équipe plateforme |
| `WF_1302` | Payload Encoding Required | 500 | Infrastructure | Encodage de payload imposé mais entrée non encodée (déploiements **hybrides** où les données doivent rester chiffrées) | Utiliser le payload codec côté client |
| `WF_1400` | Streaming Error | 500 | Streaming (1400–1499) | Échec de connexion, publication ou lecture d'un stream | Vérifier la connectivité de streaming |
| `WF_1500` | Trace Error | 500 | Tracing (1500–1599) | Récupération/parsing des traces depuis le backend **Tempo** impossible (spans manquants, données malformées, connectivité) | Vérifier la santé du backend ; si spans absents, attendre et réessayer |
| `WF_1600` | Event Store Error | 500 | Event Store (1600–1699) | Incohérence de base de l'event store (événement attendu introuvable après un conflit) | Réessayer ; signaler si persistant |

Le SDK Python `mistralai-workflows` a ses **propres codes d'erreur côté worker** (définitions invalides, configuration d'activités…), documentés dans le guide « Workflows Exception » (`/studio/workflows/building-workflows/workflow_exception`, hors périmètre). Autres codes HTTP rencontrés dans le périmètre hors `WF_XXXX` : `409` `AMBIGUOUS_WORKFLOW` (routage), `422` (validation des payloads signal/query/update), `403` (quota de managed deployments).

### 3.19 Observabilité

**Télémétrie par défaut** : le worker exporte **logs, traces et métriques OpenTelemetry** vers la plateforme d'observabilité hébergée de Mistral, sans configuration ; l'export est authentifié par la clé API Mistral et envoyé au endpoint de télémétrie de Mistral. C'est ce qui rend logs et traces visibles dans Studio, sur la page d'exécution (**Workflows › Executions**, `https://console.mistral.ai/build/workflows/executions`, puis sélection d'une exécution).

**Traces** : détails d'exécution (spans, durées, erreurs) pour le débogage et l'analyse de performance ; **indépendantes des custom task events**. Les activités génèrent automatiquement des spans ; le paramètre `name` de `@workflows.activity(name="Processing customer emails")` rend les spans lisibles.

**Échantillonnage** : par défaut **100 %** des traces exportées. Pour fixer l'ID de trace ou la décision d'échantillonnage, passer `traceparent` **dans le corps** de la requête d'exécution (`{"input": {...}, "traceparent": "00-4bf92f…-00f067aa0ba902b7-01"}`) ; le worker utilise un **sampler parent-based** et suit cette décision. Les SDK envoient automatiquement le traceparent du span courant à chaque `execute`. **Passer `traceparent` en en-tête HTTP est déprécié** (fonctionne encore ; les en-têtes peuvent être réécrits en transit). [spec OpenAPI] `force_new_trace` (défaut `false`) ignore le contexte de trace de l'appelant ; `custom_tracing_attributes` existe aussi.

**Récupération des traces** (SDK `client.workflows.executions.*`) :

| Méthode | Retour | Usage |
|---|---|---|
| `get_workflow_execution_trace_otel(execution_id)` | Trace OpenTelemetry brute (spans, durées, attributs, relations parent-enfant) | Alimenter un backend propre (Jaeger, Grafana Tempo…) |
| `get_workflow_execution_trace_summary(execution_id)` | Résumé haut niveau (doc : durée totale, nombre d'activités, nombre d'erreurs) | Dashboards, vérifications rapides |
| `get_workflow_execution_trace_events(execution_id, include_internal_events=False)` | Liste chronologique d'événements ; `include_internal_events=False` masque les événements internes de la plateforme | Suivi fin ; points de reset (avec `True`) |

**Récupération des logs** (les mêmes que dans Studio) :
- `get_workflow_execution_logs(execution_id, run_id=, activity_id=, after=, before=, order="asc"|"desc", cursor=, limit=)` → une page de logs ; pagination via `logs.next_cursor`. [spec OpenAPI] `limit` défaut **50**, max **100** ; `order` défaut `asc`, ignoré quand `cursor` est fourni (le curseur mémorise fenêtre et ordre).
- `stream_workflow_execution_logs(...)` → flux **SSE** en direct. [spec OpenAPI] Événements `log` (`ExecutionLogRecord`) et `error` (`StreamError`) ; reprise via en-tête `Last-Event-ID` ou paramètre `last_event_id` (l'en-tête prime, et prime sur `after`) ; sans rien, suit depuis le début de l'exécution ; `404` exécution introuvable, `503` backend de logs indisponible.

**Export vers son propre endpoint OTLP** — chaque signal est routé indépendamment :

| Variable | Signal |
|---|---|
| `OTEL_TRACES_ENDPOINT` | Traces |
| `OTEL_METRICS_ENDPOINT` | Métriques |
| `OTEL_LOGS_ENDPOINT` | Logs |
| `OTEL_ENDPOINT` | **Tous** les signaux vers un seul endpoint, **sans** authentification Mistral |

- Fournir l'URL **de base** OTLP HTTP (ex. `https://otel.example.com`) ; le worker ajoute `/v1/traces`, `/v1/metrics` ou `/v1/logs`.
- Les signaux non surchargés continuent vers Mistral (visibles dans Studio). Pour un signal surchargé, le worker **n'attache plus la clé Mistral** : s'authentifier via la variable d'en-tête **spécifique au signal** (`OTEL_EXPORTER_OTLP_TRACES_HEADERS`, `OTEL_EXPORTER_OTLP_METRICS_HEADERS`, `OTEL_EXPORTER_OTLP_LOGS_HEADERS`), ex. `OTEL_EXPORTER_OTLP_METRICS_HEADERS=Authorization=Bearer <your-token>`.
- (encadré `:::warning`) éviter `OTEL_EXPORTER_OTLP_HEADERS` (générique) : il s'applique à **tous** les signaux, et le worker l'utilise déjà en interne pour attacher la clé Mistral → risque de **fuite du token** vers l'endpoint tiers ou d'écrasement de l'auth Mistral.
- (encadré `:::warning`) rediriger (ou désactiver) les **logs** ou **traces** signifie qu'ils ne sont plus stockés chez Mistral ni **visibles dans Studio**.

**Désactivation** :

| Variable | Effet |
|---|---|
| `OTEL_ENABLED=false` | Désactive toute la télémétrie (logs, traces, métriques) |
| `MISTRAL_WORKFLOWS_OTEL_TRACES_EXPORT=false` | Désactive l'export des traces seulement |
| `MISTRAL_WORKFLOWS_OTEL_METRICS_EXPORT=false` | Désactive l'export des métriques seulement |
| `MISTRAL_WORKFLOWS_OTEL_LOGS_EXPORT=false` | Désactive l'export des logs seulement |

(encadré `:::info`) désactiver l'export des traces continue de **créer les spans en processus** (propagation de contexte, corrélation logs/traces) ; seul l'export OTLP est stoppé.

### 3.20 Visualizer

- **Rôle** : affiche le workflow sous forme de **graphe** dans Studio ; le worker construit le graphe à partir du code **au démarrage**, donc disponible **avant la première exécution**.
- **Contenu du graphe** : l'entrypoint et les activités / child workflows qu'il appelle ; le flot de contrôle — branches (`if`/`elif`/`else`), boucles, fan-outs parallèles (`asyncio.gather`), sorties en erreur (`raise`) ; les handlers de signal, update et query ; les **connecteurs** déclarés ; de **courts résumés générés par IA pour chaque nœud** plus un résumé du workflow entier.
- **Stockage** : chaque **déploiement stocke son propre graphe** ; un nouvel enregistrement du workflow par un worker **remplace** le graphe précédent.
- **Accès** : **Workflows** (`https://console.mistral.ai/build/workflows`) › sélectionner un workflow › ouvrir `Visualizer` depuis le menu.
- **Prérequis** : `mistralai-workflows` **≥ 3.15.0** sur les workers (`uv add "mistralai-workflows>=3.15.0"`).

| Variable | Défaut | Effet |
|---|---|---|
| `UPLOAD_GRAPH` | `true` | Construit et téléverse le graphe au démarrage du worker (`false` désactive le visualizer) |
| `GRAPH_SUMMARISE_ENABLED` | `true` | Génère les résumés IA ; ne s'applique que si `UPLOAD_GRAPH=true` |

- Le téléversement tourne **en arrière-plan** après l'enregistrement des workflows : il ne retarde pas le worker ; en cas d'échec, le worker **journalise seulement un avertissement**.
- **Données envoyées à Mistral** (au démarrage ; **jamais les entrées/sorties d'exécution**) :
  - *Graphe* : la structure, pas les fichiers source — noms du workflow, activités, child workflows, handlers, connecteurs ; noms et annotations de types des paramètres ; **chemin du fichier source** définissant le workflow et **positions de ligne** de chaque nœud ; arêtes.
  - *Résumés IA* : extraits de code de l'entrypoint, des activités définies dans le fichier du workflow et de chaque nœud ; résumés générés avec des modèles Mistral ; **non facturés**. Avant envoi, le worker remplace **chaque littéral de chaîne par `'...'`** (y compris docstrings et parties littérales des f-strings) ; **identifiants et commentaires sont envoyés tels quels** (ne pas y mettre de secrets). `GRAPH_SUMMARISE_ENABLED=false` → envoi du graphe seul, sans extraits de code.

---

## 4. Interface utilisateur

### 4.1 Vibe Work (surface de rendu des workflows conversationnels)

- L'utilisateur attache un workflow **publié** depuis le menu `+` de Vibe Work (web et mobile) ; expérience consommateur détaillée dans « Run Workflows in Vibe Work » (`/vibe/work/workflows`, hors périmètre).
- Rendus décrits par les légendes des captures de la doc :

| Élément workflow | Rendu dans Vibe Work |
|---|---|
| `send_assistant_message` | Message assistant dans le fil de chat (ex. le greeting demandant le prénom) |
| `ChatInput` | Champ de saisie de message en attente de réponse ; `prompt` en placeholder ; `suggestions` sélectionnables directement |
| `FormInput` | Formulaire structuré (champ texte, numérique, sélecteur date/heure, sélecteur de date, liste déroulante, multi-sélection, upload simple ou multiple avec liste des fichiers joints) ; libellé `label` ; aide sous le champ (regex ou `error_message`) |
| `ConfirmationInput` | Un bouton par option ; clic = soumission |
| `AcceptDeclineConfirmation` | Deux boutons accepter/refuser ; raccourcis clavier possibles côté client |
| `TodoList` | Check-list d'étapes avec statut en temps réel |
| Canvas | Surface de contenu riche éditable (panneau canvas) |
| `UIComponentResource` | Composants du design system (ex. carte « Summary » avec score et badge « Pass » ; deux cartes contenant chacune un graphique) |
| Tool UI states | Retour visuel d'opérations fichier, d'exécution d'outil générique et d'exécution de commande |
| Réponse d'agent streamée | Texte affiché token par token |
| `isError=True` | Message d'erreur et workflow marqué en échec dans la conversation |

### 4.2 Console / Studio : routes et parcours

| Écran (chemin) | URL | Contenu / actions |
|---|---|---|
| Workflows (dashboard) | `https://console.mistral.ai/build/workflows` | Liste des workflows ; sélection d'un workflow ; menu → **`Visualizer`** ; recherche d'execution IDs (cité dans `WF_1100`) |
| Workflows › Executions | `https://console.mistral.ai/build/workflows/executions` | Liste des exécutions ; **page d'exécution** avec logs et traces (télémétrie exportée vers Mistral) |
| Deployments | `https://console.mistral.ai/workflows/deployments` | Création d'un deployment (managed) ; bouton **Redeploy** ; page d'un déploiement (statut **Active**, liste des workflows enregistrés, détails/erreur de build) |
| Deployment › Settings | `https://console.mistral.ai/workflows/deployments/<your-deployment-name>?tab=settings` | Onglet **Settings** : activer/désactiver le hardening, ajouter/retirer des pins (users, service accounts), mettre à jour les secrets liés ; lien direct inclus dans les refus d'enregistrement (présélection organisation, workspace, déploiement) |
| Page d'un workflow | `https://console.mistral.ai/workflows/hello-world` | Exécuter le workflow avec une entrée JSON (ex. `{"name": "World"}`) |
| GitHub App settings | `https://console.mistral.ai/connectors/github_app` | Connecter GitHub : ajouter un credential |
| Secrets | `https://console.mistral.ai/secrets` | Créer les secrets du workspace |
| Compte | `https://console.mistral.ai/` | Création de compte Mistral |
| (externe) Mistral GitHub App | `https://github.com/apps/mistralai` | **Configure** › organisation › choix des dépôts |

**Boîte de création d'un managed deployment** (éléments mentionnés) : liste des dépôts GitHub (uniquement ceux où l'App est installée et accessibles au compte), choix de la **branche**, configuration par défaut (compatible avec le starter CLI), **chemin du Dockerfile**, **répertoire de build**, **liaisons de secrets** (variable d'environnement ↔ secret ; nom de variable vide = nom du secret), **hardening activé par défaut avec opt-out**, **Dockerfile d'exemple** fourni.

Autres éléments visibles : le `WORKER_NAME` de chaque worker apparaît dans la console et l'API ; les avertissements de conflit de nom apparaissent dans les logs du worker (pas d'élément d'UI documenté).

---

## 5. API et SDK

### 5.1 Endpoints REST (base `https://api.mistral.ai`, en-tête `Authorization: Bearer $MISTRAL_API_KEY`)

Endpoints cités par les pages du périmètre :

| Méthode | Chemin | Rôle | Réponse documentée |
|---|---|---|---|
| POST | `/v1/workflows/executions/{execution_id}/signals` | Envoyer un signal (`name`, `input`) | `202` [spec] `{"message": "Signal accepted"}` ; `422` validation |
| POST | `/v1/workflows/executions/{execution_id}/queries` | Interroger l'état (`name`, `input` optionnel) | `200` `{"query_name", "result"}` ; `422` |
| POST | `/v1/workflows/executions/{execution_id}/updates` | Envoyer un update (`name`, `input`) | `200` `{"update_name", "result"}` ; `422` |
| POST | `/v1/workflows/executions/{execution_id}/reset` [spec] | Reset (`event_id`, `reason`, `exclude_signals`, `exclude_updates`) | `204` [spec] ; `WF_1001` si event invalide |
| GET | `/v1/workflows/deployments` | Lister les déploiements (`workflow_name`, `active_only`…) | `{"deployments": [...]}` |
| POST | `/v1/workflows/deployments` | Créer un managed deployment (`name`, `spec.github_url`, `spec.revision`, [spec] `spec.backend_spec`, `resources.replicas`, `hardened`) | `202 Accepted` |
| GET | `/v1/workflows/deployments/{name}` | Détail d'un déploiement et de ses workers | objet + `workers` |
| PATCH | `/v1/workflows/deployments/{name}` | Mettre à jour (ex. `spec.backend_spec.secrets`, `revision`) | [spec] `202` |
| POST | `/v1/workflows/deployments/{name}/restart` | Redéployer (re-pin dernier commit, rebuild, restart) | `202 Accepted` |
| POST | `/v1/workflows/{workflow_identifier}/execute` | Exécuter un workflow (`input`, `traceparent`, `deployment_name`…) | — |

Endpoints présents dans la spec OpenAPI locale et liés au périmètre (non décrits dans les pages lues) : `GET /v1/workflows/executions/{execution_id}/trace/info` (`otel_trace_id`, `has_trace_data`), `/trace/otel`, `/trace/summary`, `/trace/events` (query `merge_same_id_events`, `include_internal_events`, tous deux défaut `false`), `GET /v1/workflows/executions/{execution_id}/logs` et `/logs/stream` (SSE), `GET /v1/workflows/executions/{execution_id}/stream` (SSE, `event_source`, `last_event_id`), `POST .../terminate`, `POST .../cancel` (et variantes en lot `/v1/workflows/executions/terminate|cancel`), `DELETE /v1/workflows/deployments/{name}`, `POST /v1/workflows/deployments/{name}/stop` et `/start`, `GET /v1/workflows/deployments/{name}/workers` (filtre `worker_status`), `GET /v1/workflows/deployments/{name}/logs` (`log_type` = `runtime` par défaut ou `build` — ce dernier réservé aux managed deployments ; filtres `worker_name`, `workflow_name`, `after`, `before`, `order`, `cursor`, `limit` 50/max 100) et `/logs/stream` (SSE), `POST /v1/workflows/deployments/{deployment_id}/unharden`.

### 5.2 Client Python `mistralai` (`from mistralai.client import Mistral`)

| Méthode | Usage |
|---|---|
| `client.workflows.executions.signal_workflow_execution(execution_id, name, input)` | Signal |
| `client.workflows.executions.query_workflow_execution(execution_id, name)` | Query (`result.model_dump_json(...)`) |
| `client.workflows.executions.update_workflow_execution(execution_id, name, input)` | Update |
| `client.workflows.executions.reset_workflow(execution_id, event_id, reason, exclude_signals, exclude_updates)` | Reset |
| `client.workflows.executions.get_workflow_execution_trace_otel(execution_id)` | Trace OTel brute |
| `client.workflows.executions.get_workflow_execution_trace_summary(execution_id)` | Résumé de trace |
| `client.workflows.executions.get_workflow_execution_trace_events(execution_id, include_internal_events)` | Événements (objets avec `.event_type`) |
| `client.workflows.executions.get_workflow_execution_logs(execution_id, run_id, activity_id, after, before, order, cursor, limit)` | Logs paginés (`.next_cursor`) |
| `client.workflows.executions.stream_workflow_execution_logs(...)` | Logs en SSE |
| `client.workflows.deployments.list_deployments()` | Liste (`response.deployments`, `.name`, `.is_active`) |
| `client.workflows.deployments.get_deployment(name)` | Détail (`.workers`, `worker.name`, `worker.updated_at`) |
| `client.workflows.deployments.create_deployment(name, spec)` | Création managed |
| `client.workflows.deployments.update_deployment(name, spec)` | Mise à jour (secrets…) |
| `client.workflows.deployments.restart_deployment(name)` | Redeploy |
| `client.workflows.execute_workflow(workflow_identifier, input)` | Lancer (→ `execution_id`) |
| `client.workflows.execute_workflow_and_wait(...)` | Lancer et attendre la sortie |

Les exemples managed déclarent la dépendance `mistralai>=3.0` (en-tête de script inline `# /// script`). La page Deployments utilise une autre forme : `await client.execute_workflow(workflow_identifier=..., deployment_name=..., input_data=InputData(...))` (voir §8).

### 5.3 SDK worker `mistralai-workflows` (`import mistralai.workflows as workflows`)

| API | Rôle |
|---|---|
| `@workflows.workflow.define(name, workflow_display_name, workflow_description)` | Déclare un workflow |
| `@workflows.workflow.entrypoint` | Méthode `run` |
| `@workflows.workflow.signal(name)` / `.query(name)` / `.update(name)` | Handlers d'interaction |
| `workflows.workflow.wait_condition(lambda)` | Attente non bloquante d'une condition |
| `workflows.InteractiveWorkflow` | Base des workflows avec `self.wait_for_input(...)` |
| `@workflows.activity(name=..., rate_limit=...)` | Déclare une activité (nom lisible dans les spans) |
| `workflows.RateLimit(time_window_in_sec, max_execution, key=None)` | Limite de débit |
| `workflows.execute_activities_in_parallel(...)` / `workflows.GetItemFromIndexParams` | Concurrence |
| `workflows.get_execution_id()` | Contexte d'exécution |
| `workflows.run_worker([...])` / `workflows.execute_workflow(Workflow, params=...)` | Lancer un worker / exécuter localement (exemple de la page concurrence) |
| `workflows.Depends` + `mistralai.workflows.client.get_mistral_client` | Injection d'un client Mistral configuré dans une activité |

**Plugin `mistralai.workflows.plugins.mistralai`** (alias `workflows_mistralai`) : `send_assistant_message`, `ChatInput`, `TextChunk`, `ConfirmationInput`, `AcceptDeclineConfirmation`, `is_accepted`, `TodoList`, `TodoListItem`, `CanvasPayload`, `CanvasResource`, `ResourceOutput`, `TextOutput`, `UIComponentResource`, `ChatAssistantWorkflowOutput`, `input_tag`, `RemoteSession`, `Agent`, `Runner`.

**Module `mistralai.workflows.conversational`** : `FormInput`, `TextField`, `NumberField`, `DateField`, `DateTimeField`, `SingleChoice`, `MultiChoice`, `FileField`, `FileWithMetadataValue`, `CanvasInput`, `ChatAssistantWorkingTask`, `FileToolUIState`, `CreateFileOperation`, `ReplaceFileOperation`, `DeleteFileOperation`, `GenericToolUIState`, `ToolResultRunning`, `ToolResultSuccess`, `ToolResultFailed`, `CommandToolUIState`, `CommandResultRunning`, `CommandResultSuccess`, `CommandResultFailed` (et `SearchReplaceBlock`, utilisé sans import explicite).

**Module `mistralai.workflows.plugins.mistralai.conversational_ui_components`** : `Alert`, `Avatar`, `Badge`, `ButtonLink`, `Card`, `Chart`, `Column`, `Image`, `Markdown`, `PieChart`, `Row`, `Tooltip`.

**CLI** : `uvx mistralai-workflows-cli@latest setup` (scaffold) ; le projet généré expose `make start-worker`.

### 5.4 Variables d'environnement du worker (consolidées)

| Variable | Défaut | Rôle |
|---|---|---|
| `DEPLOYMENT_NAME` | aucun (obligatoire) | Nom du déploiement ; injecté automatiquement en managed |
| `WORKER_NAME` | `socket.gethostname()` | Nom du worker |
| `MISTRAL_API_KEY` | — | Authentification d'un worker auto-hébergé |
| `SERVER_URL` | — | Injecté en managed (connexion) |
| `MISTRAL_SA_TOKEN_PATH` | — | Chemin du jeton de service account (managed) |
| `OTEL_TRACES_ENDPOINT` / `OTEL_METRICS_ENDPOINT` / `OTEL_LOGS_ENDPOINT` | Mistral | Endpoint OTLP de base par signal |
| `OTEL_ENDPOINT` | — | Tous les signaux vers un endpoint, sans auth Mistral |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_HEADERS` | — | En-têtes d'auth par signal |
| `OTEL_EXPORTER_OTLP_HEADERS` | utilisé en interne | À ne pas définir soi-même |
| `OTEL_ENABLED` | (vrai) | `false` coupe toute la télémétrie |
| `MISTRAL_WORKFLOWS_OTEL_{TRACES,METRICS,LOGS}_EXPORT` | (vrai) | `false` coupe l'export d'un signal |
| `UPLOAD_GRAPH` | `true` | Visualizer |
| `GRAPH_SUMMARISE_ENABLED` | `true` | Résumés IA du visualizer |

### 5.5 Formes de réponses et d'erreurs

- Erreur API : `{"detail", "code": "WF_XXXX"}` (+ `valid_reset_events` pour `WF_1001`, `status` pour `WF_1102`).
- Ambiguïté de routage : `409` `{"code": "AMBIGUOUS_WORKFLOW", "deployments": [...]}`.
- Avertissement d'enregistrement : `{"warnings": ["Workflow '…' is also registered by active deployment '…'"]}`.
- Validation de payload signal/query/update : `422` avec message descriptif.
- Streaming : réponses d'agent poussées comme événements custom avec JSON patches ; logs SSE `log`/`error` [spec].

---

## 6. Limites, quotas, tarifs, disponibilité

| Élément | Valeur | Source |
|---|---|---|
| Historique d'événements par exécution | **51 200 événements** max (au-delà : continue-as-new) | Concurrency |
| Seuil indicatif pour `asyncio.gather` | < ~**10 000 activités** | Concurrency |
| Taille d'entrée/sortie d'une activité | **2 MB** | Concurrency |
| `max_concurrent_scheduled_tasks` | défaut **100** | Concurrency |
| `max_concurrent_executions_per_worker` | défaut **100** | Concurrency |
| Nom de déploiement | **128 caractères** max ; `[A-Za-z0-9-_]` | Deployments |
| Heartbeat des workers | ~**10 s** | Deployments |
| Fenêtre de vivacité | **50 s** en production (configurable) | Deployments |
| Managed deployments simultanés | Free **0** · Pro/Team sans PAYG **0** · PAYG **3** · Enterprise **10** (par organisation) ; dépassement → `403` | Quotas |
| Plan requis pour le managed | Pay-as-you-go activé ou Enterprise | Getting started / Quotas |
| Statut du managed | **Public preview** | Managed deployments |
| Région du managed | **`nl-north-1`** (Pays-Bas) | How it works |
| Taille d'instance managée | Unique, choisie par Mistral ; pas de métriques CPU/mémoire par déploiement | Quotas |
| Hébergeur Git supporté | **github.com** seulement (GitLab, GitHub Enterprise à venir) ; dépôts publics ou privés | Getting started |
| Versions minimales | `mistralai-workflows` ≥ **3.10** (jeton SA) ; ≥ **3.15.0** (visualizer) ; client `mistralai>=3.0` (exemples) ; Python ≥ **3.12** (starter) | How it works / Visualizer / Getting started |
| Pollers | 5 workflow + 5 activité par worker interne ; 2 workers internes de base + 1 par clé de rate limit (0 clé → 20 pollers ; 5 → 70 ; 12 → 140) | Rate limiting |
| Échantillonnage des traces | **100 %** par défaut | Observability |
| Logs paginés | `limit` défaut 50, max 100 [spec] | Spec OpenAPI |
| Timeout de `wait_for_input` | aucun par défaut (attente indéfinie) | Conversational workflows |
| Facturation des résumés du visualizer | **Non facturés** | Visualizer |
| Permission requise (owner/pin/auto-claim) | `AccessWorkflows` | Hardened deployments |

Aucune information de tarif (prix) n'apparaît dans les pages du périmètre, hormis la gratuité des résumés du visualizer et la condition de plan pour le managed. Pas de mention de ZDR ni de durée de rétention des logs/traces.

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Conversationnel**
- `wait_for_input` attend indéfiniment par défaut ; prévoir `timeout` + `try/except asyncio.TimeoutError`.
- Pour un `FormInput`, on passe **la classe** (`ExpenseForm`) ; pour les autres entrées, une **instance**.
- `prefilled_value` ne rend pas un champ optionnel ; les valeurs invalides sont ignorées **silencieusement** ; non supporté par `FileField`.
- `error_message` n'est **pas localisé** (affiché tel quel) contrairement au message généré ; il masque aussi la regex dans l'aide.
- Les URLs de fichiers uploadés sont signées et **peuvent expirer**.
- `ConfirmationInput.choice` renvoie la **valeur** (pas le libellé).
- `CanvasInput.canvas_uri` doit référencer un `CanvasResource` déjà émis ; `chatInput` n'existe que si `prompt` est fourni et que l'utilisateur écrit.
- `ChatAssistantWorkflowOutput` n'est pas rendu seul : c'est un contrat d'interopérabilité ; `isError=True` marque le workflow en échec dans la conversation.
- `RemoteSession(stream=True)` streame automatiquement — pas de code de streaming à écrire.

**Signals / queries / updates**
- Les champs non déclarés sont **rejetés** (pas ignorés) → 422.
- Les handlers de query sont synchrones (`def`) et doivent répondre vite ; ceux de signal et d'update sont `async`.
- Agir sur une exécution terminée → `WF_1102` (409) avec `status`.

**Deployments**
- Sans `DEPLOYMENT_NAME`, le worker refuse de démarrer.
- **Deux déploiements de même nom se volent leurs exécutions** (avertissement répété dans le guide managed et le dépannage) ; un test local doit utiliser un autre nom.
- Un conflit de nom de workflow entre déploiements actifs n'est **pas bloquant** à l'enregistrement, mais rend l'exécution ambiguë (`409`) tant que les deux sont actifs.
- `updated_at` d'un déploiement est un alias **déprécié** de `last_heartbeat` [spec] ; `task_queue` est déprécié au profit de `deployment_name` [spec].

**Hardening**
- Retirer le dernier pin **ne rouvre pas** l'enregistrement ; désactiver le hardening **efface tous les pins** (y compris celui du runtime managé).
- Activer le hardening exige l'**inactivité** du déploiement ; le désactiver exige l'absence d'enregistrement OBO.
- Studio crée les managed deployments durcis par défaut, mais l'API et les autres clients envoient `hardened: false`.
- Les clés API de service account ne sont pas pinnables ; les pins par clé API utilisateur sont un héritage.
- Être owner n'autorise pas à enregistrer des workers.
- La réconciliation ne supprime un pin qu'en cas d'inéligibilité **concluante**.

**Managed deployments**
- Pas de réglage `entrypoint` : c'est l'`ENTRYPOINT`/`CMD` de l'image qui doit lancer le worker (symptôme sinon : worker vivant mais aucun workflow).
- Image avec `mistralai-workflows` < 3.10 → impossible de s'authentifier.
- `restart` re-pin sur le **dernier commit de la branche** ; pour figer, mettre un SHA dans `revision`.
- Changer un secret **ne redémarre pas** le worker ; la liste `secrets` du PATCH **remplace** l'ensemble ; les secrets exposés en build args restent lisibles dans l'image.
- Le quota compte aussi au **démarrage** (`start`) d'un déploiement, pas seulement à la création.

**Concurrence et rate limiting**
- `max_concurrent_executions_per_worker` est en réalité une **taille de lot** par activité (nom trompeur) ; tout le lot est rejoué si un élément échoue.
- Le Chain Executor n'utilise ni `max_concurrent_scheduled_tasks` ni `max_concurrent_executions_per_worker` ; le List Executor n'utilise pas le second.
- Chaque clé de rate limit distincte coûte un worker Temporal interne et 10 pollers → `ResourceExhausted: namespace concurrent poller limit exceeded`.

**Reset**
- Seuls les événements `WORKFLOW_TASK_COMPLETED` sont valides ; il faut `include_internal_events=True` pour les voir dans les trace events.
- Le reset rejoue avec la **dernière version du code** et perd toute progression postérieure ; `exclude_signals` perd les entrées externes reçues après le point.

**Observabilité**
- `traceparent` en **en-tête HTTP : déprécié** (utiliser le corps).
- Rediriger logs/traces vers un endpoint propre les fait **disparaître de Studio**.
- Ne jamais définir `OTEL_EXPORTER_OTLP_HEADERS` (fuite de la clé Mistral ou écrasement de l'auth).
- `OTEL_ENDPOINT` n'attache aucune authentification Mistral.
- Couper l'export des traces conserve la création de spans en processus.
- Les 5xx renvoient toujours `"An error occurred"` : la cause n'est visible que côté serveur.

**Visualizer**
- Graphe par déploiement, remplacé à chaque ré-enregistrement.
- Données envoyées : chemin du fichier source et positions de lignes ; identifiants et **commentaires** envoyés tels quels (seuls les littéraux de chaîne sont masqués par `'...'`).
- Échec d'upload = simple avertissement dans les logs (pas d'échec du worker).

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **`reason` du reset** : « Required: Yes » dans le tableau de la doc, mais nullable et non requis dans `ResetInvocationBody` de la spec OpenAPI (seul `event_id` est requis).
2. **Résumé de trace** : la doc annonce « total duration, activity count, error count », alors que `WorkflowExecutionTraceSummaryResponse` (spec) expose `total_duration_ms`, `status`, `result`, `span_tree`, `search_keys`… sans champ explicite de nombre d'activités ou d'erreurs (peut-être dérivable de `span_tree` — inférence).
3. **Deux familles de routes console** : `https://console.mistral.ai/build/workflows[...]` (dashboard, exécutions, visualizer) et `https://console.mistral.ai/workflows/[...]` (deployments, page `hello-world`). La doc ne dit pas si l'une redirige vers l'autre.
4. **Deux formes de client d'exécution** : la page Deployments utilise `await client.execute_workflow(workflow_identifier=..., deployment_name=..., input_data=InputData(...))` (client asynchrone, `input_data`), le guide managed `client.workflows.execute_workflow(workflow_identifier=..., input={...})` (client `Mistral`, `input`). Le type de `client` de la page Deployments n'est pas précisé.
5. **Nom de variable vide pour un secret** : la console permet de laisser le nom de variable vide (réutilise le nom du secret), mais `DeploymentSecretBinding.env_var_name` est requis dans la spec (le remplissage se fait sans doute côté console — inférence).
6. **Spec vs doc managed** : la spec contient `DeploymentK8sBackendSpec` avec `entrypoint` et `working_dir`, un type de backend `koyeb`, et `resources.replicas` ; la doc affirme qu'il n'y a pas de réglage `entrypoint` (backend Mistral Cloud) et ne mentionne ni réplicas ni Koyeb.
7. **Héritage d'`InteractiveWorkflow`** : certains exemples qui appellent `send_assistant_message` ou streament un agent (`ExpenseAnalysisWorkflow`, `ReportWorkflow`) n'héritent pas d'`InteractiveWorkflow` ; la doc ne dit pas explicitement si cette base n'est nécessaire que pour `wait_for_input` (inférence probable).
8. **`SearchReplaceBlock`** utilisé dans l'exemple `ReplaceFileOperation` sans import ni description de son module.
9. **Émission d'un `ChatAssistantWorkingTask`** : la doc montre sa construction avec `toolUIState`, mais pas comment l'envoyer à l'UI (via `send_assistant_message` ? autre API ?).
10. **Statut d'un `TodoListItem` en cas d'exception** dans `async with item:` : non documenté (seul le cas « sortie réussie → done » l'est).
11. **Fenêtre de vivacité « configurable »** : ni le mécanisme ni le titulaire de ce réglage ne sont précisés ; la valeur hors production n'est pas donnée.
12. **Unicité des IDs** : `WF_1101` parle de « Workflow IDs must be unique within a workspace » alors qu'il s'agit d'execution IDs (la spec permet un `execution_id` personnalisé dans la requête d'exécution).
13. **`WF_1100` vs `WF_1105`** : `WF_1100` s'appelle « Workflow Not Found » mais décrit une *exécution* introuvable ; `WF_1105` « Execution Not Found » est une erreur interne 500.
14. **Quotas et déploiements arrêtés** : « stop or delete a deployment to free a slot » suggère qu'un déploiement arrêté ne compte pas dans le quota (inférence) ; la doc ne le dit pas explicitement.
15. **`sticky_to_worker=True`** est mentionné (localité réseau) sans indication de l'API où il se pose (décorateur d'activité ? — non précisé dans le périmètre).
16. **Statut GA/beta** : seul le managed deployment porte un statut explicite (public preview) ; aucune mention de statut pour les workflows conversationnels, le hardening ou le visualizer.
17. **`ChatInput` suggestions** : chaque suggestion est une *liste* de `TextChunk` ; la doc n'explique pas l'intérêt de plusieurs chunks par suggestion.
18. **Limite de 2 MB** citée pour les activités : la doc ne précise pas si elle s'applique aussi aux payloads de signals/queries/updates ni le comportement au dépassement (cf. « offloaded payloads » dans `WF_1200`, non expliqué ici).

---

## Annexe — Couverture

| # | Fichier (relatif à `docs/studio/workflows/`) | Statut | Source |
|---|---|---|---|
| 1 | `interacting-with-workflows/conversational_workflows.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/conversational_workflows.md |
| 2 | `interacting-with-workflows/conversational_workflows/canvas.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/conversational_workflows/canvas.md |
| 3 | `interacting-with-workflows/conversational_workflows/forms_and_confirmations.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/conversational_workflows/forms_and_confirmations.md |
| 4 | `interacting-with-workflows/conversational_workflows/progress_tracking.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/conversational_workflows/progress_tracking.md |
| 5 | `interacting-with-workflows/conversational_workflows/publish_in_vibe.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/conversational_workflows/publish_in_vibe.md |
| 6 | `interacting-with-workflows/conversational_workflows/tool_ui.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/conversational_workflows/tool_ui.md |
| 7 | `interacting-with-workflows/queries.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/queries.md |
| 8 | `interacting-with-workflows/signals.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/signals.md |
| 9 | `interacting-with-workflows/updates.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/interacting-with-workflows/updates.md |
| 10 | `managing-workflows-in-production/concurrency.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/concurrency.md |
| 11 | `managing-workflows-in-production/deployments.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/deployments.md |
| 12 | `managing-workflows-in-production/error_codes.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/error_codes.md |
| 13 | `managing-workflows-in-production/execution_context.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/execution_context.md |
| 14 | `managing-workflows-in-production/hardened_deployments.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/hardened_deployments.md |
| 15 | `managing-workflows-in-production/managed-deployments.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments.md |
| 16 | `managing-workflows-in-production/managed-deployments/getting-started.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments/getting-started.md |
| 17 | `managing-workflows-in-production/managed-deployments/how-it-works.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments/how-it-works.md |
| 18 | `managing-workflows-in-production/managed-deployments/quotas.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments/quotas.md |
| 19 | `managing-workflows-in-production/managed-deployments/secrets.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments/secrets.md |
| 20 | `managing-workflows-in-production/managed-deployments/troubleshooting.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/managed-deployments/troubleshooting.md |
| 21 | `managing-workflows-in-production/rate_limiting.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/rate_limiting.md |
| 22 | `managing-workflows-in-production/reset_workflow.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/managing-workflows-in-production/reset_workflow.md |
| 23 | `observability.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/observability.md |
| 24 | `visualizer.md` | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/visualizer.md |

Vérifications complémentaires (grep ciblés) dans `scratchpad/web/openapi.yaml` : endpoints `/v1/workflows/executions/{id}/{signals,queries,updates,reset,trace/*,logs,logs/stream}`, `/v1/workflows/deployments*` (dont `unharden`, `stop`, `start`, `workers`, `logs`), schémas `CreateDeploymentRequest`, `DeploymentWorkerSpecInput`, `DeploymentMistralCloudBackendSpec`, `DeploymentK8sBackendSpec`, `DeploymentSecretBinding`, `DeploymentResourceConfig`, `DeploymentResponse`, `ManagedDeploymentResponse`, `ResetInvocationBody`, `SignalInvocationBody`, `QueryInvocationBody`, `UpdateInvocationBody`, `SignalWorkflowResponse`, `QueryWorkflowResponse`, `UpdateWorkflowResponse`, `WorkflowExecutionRequest`, `WorkflowExecutionTraceSummaryResponse`, `ExecutionTraceInfoResponse`.
