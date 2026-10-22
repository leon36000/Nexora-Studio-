# 12 — Workflows (1/2) : concepts et construction

> **Périmètre** : Mistral Workflows — architecture (moteur durable, mode hybride), concepts de base (workflows, activities, workers, executions, events, deployments), installation, premier workflow, cookbooks, et toutes les pages « Building workflows » (activities, compression, connectors, consommation d'événements, continue-as-new, injection de dépendances, durable agents, chiffrement, client Mistral, on-behalf-of, payload offloading, plugins, scheduling, search keys, streaming, child workflows, attente de conditions, exceptions, tags, déterminisme). L'interaction (signals/queries/updates en détail), la mise en production (deployments avancés, hardened deployments) et l'observabilité relèvent du chapitre 13 (2/2). · **Sources** : 35 pages de docs.mistral.ai (copie du 21/10/2026) + vérifications ciblées dans la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Architecture : moteur durable et mode hybride
   - 3.2 Installation (paquets, extras, CLI, versions)
   - 3.3 Premier workflow pas à pas
   - 3.4 Cookbooks
   - 3.5 Concepts de base : Workflow
   - 3.6 Concepts de base : Activity
   - 3.7 Concepts de base : Worker
   - 3.8 Concepts de base : Execution (et run)
   - 3.9 Concepts de base : Events (historique d'exécution)
   - 3.10 Concepts de base : Deployment
   - 3.11 Construire un workflow (`@workflow.define`, entrées, timeout, signals/queries/updates, reset, contexte)
   - 3.12 Règles de déterminisme et sandbox
   - 3.13 Activities : bases (timeouts, retries, heartbeats, granularité, imbrication)
   - 3.14 Local activities
   - 3.15 Sticky worker sessions
   - 3.16 Injection de dépendances (`Depends`)
   - 3.17 Client Mistral (`get_mistral_client`)
   - 3.18 Workflows on-behalf-of (OBO)
   - 3.19 Connectors dans les workflows
   - 3.20 Durable agents
   - 3.21 Plugins
   - 3.22 Streaming : publication d'événements (`Task`)
   - 3.23 Consommation des événements de streaming
   - 3.24 Child workflows (sub-workflows)
   - 3.25 Attente de conditions (`wait_condition`)
   - 3.26 Continue-as-new
   - 3.27 Scheduling
   - 3.28 Search keys
   - 3.29 Tags de workflow
   - 3.30 Payload offloading
   - 3.31 Compression
   - 3.32 Chiffrement
   - 3.33 `WorkflowsException` et `ErrorCode`
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Ce que c'est** : Mistral Workflows est la plateforme de Mistral pour construire des **workflows d'IA « production-grade »** : processus multi-étapes combinant appels LLM, usage d'outils, API externes et intervention humaine, qui **survivent aux crashs, redémarrages et pannes** de n'importe quelle étape. Les workflows s'écrivent **en code (Python)** ; la plateforme gère durabilité, retries, planification, streaming, observabilité et intégration au reste de Mistral.
- **Statut** : **Public Preview** (encadré `:::info` de la page Overview) — pas de changement majeur prévu des API, mais possible, avec notification préalable. Sous-briques également en Public Preview : intégration Connectors (`mistralai-workflows-plugins-mistralai`) et API `client.beta.connectors`. `LocalSession` (durable agents) est **expérimental**. Les schedules déclarés via `@workflow.define(schedules=[...])` sont **dépréciés**.
- **Moteur** : l'exécution durable repose sur **Temporal** (moteur open source d'orchestration tolérante aux pannes). Les noms de variables d'environnement (`TEMPORAL_PAYLOAD_...`) et la description `SchedulePolicy` de la spec (« After a Temporal server is unavailable… ») le confirment.
- **Mode hybride** : Mistral héberge l'**orchestrateur** (état, historique, dispatch de tâches) derrière une API REST publique + l'UI Studio ; le **code des workflows et activities tourne chez le client** dans des **workers** (laptop en dev, Kubernetes/VM en prod) qui se connectent **en sortant** (aucune connexion entrante depuis la plateforme). Pour les clients enterprise, l'environnement Studio peut tourner en **cloud privé ou on-premises**.
- **Contrôle des données** : chiffrement côté SDK (AES-GCM 256, la plateforme ne stocke que du chiffré), payload offloading vers **le stockage blob du client** (S3, GCS, Azure) au-delà de 2 Mo, compression zstd.
- **Points d'invocation** : API Mistral `POST /v1/workflows/{name}/execute` (tout langage), **Studio** (formulaire d'entrée généré depuis la signature du workflow + timeline d'exécution en direct), **Vibe Work** (les workflows apparaissent comme des **assistants** invocables dans une conversation), et les **schedules**.
- **Primitives IA incluses** : durable agents (`Agent`, `Runner`, sessions, handoffs multi-agents, MCP), streaming de tokens vers les clients, client Mistral instrumenté, Connectors avec OAuth à la demande, exécution « on behalf of » l'utilisateur déclencheur.
- **Pour qui / quand** : pipelines LLM multi-étapes devant survivre aux crashs, processus human-in-the-loop qui attendent des heures/jours, tâches IA planifiées (cron ou ponctuelles), orchestration multi-agents, et tout ce qu'on construirait sinon avec « une file, une machine à états et beaucoup de code de retry ». Pour un simple appel LLM sans orchestration, le SDK suffit.
- **Prérequis techniques** : Python **3.12+**, gestionnaire **uv** (`uvx`), paquet PyPI `mistralai-workflows`, CLI de scaffolding `mistralai-workflows-cli`.
- **Limites clés** : 2 Mo par entrée/sortie (workflow et activity), historique plafonné à **51 200 événements ou 50 Mo**, `execution_timeout` par défaut **1 h**, code workflow limité à **2 s** entre deux appels d'activités, messages de streaming plafonnés à **1 Mo**, 20 search keys par exécution.

---

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| **Mistral Workflows** | Plateforme d'orchestration durable de processus IA, programmée en Python, exécutée en mode hybride. |
| **Workflows API** / **orchestrator** | Point d'entrée hébergé par Mistral pour démarrer, interroger et signaler des exécutions ; détient l'état, l'historique et le dispatch des tâches, **jamais le code**. |
| **Hybrid mode** | Orchestrateur chez Mistral (« Studio environment »), code + workers chez le client (« Your environment ») ; connexions sortantes uniquement. |
| **Temporal** | Moteur open source d'exécution durable sous-jacent. |
| **Worker** | Processus déployé par le client qui se connecte à la plateforme, enregistre ses workflows/activities et interroge (poll) les tâches. Sans état, interchangeable. |
| **Workflow** | Logique d'orchestration (« quoi et quand ») : classe Python décorée, **déterministe**, rejouable depuis l'historique. |
| **Activity** | Unité de travail réel (« comment ») : fonction async qui fait les effets de bord (LLM, HTTP, BD, fichiers, outils). Non déterministe autorisé, retentée automatiquement. |
| **Execution** | Une invocation d'un workflow, identifiée par un `execution_id` stable (auto-généré ou fourni). |
| **Run** | Une tentative au sein d'une exécution ; un reset crée un nouveau run sous le même `execution_id`. Un seul run actif à la fois. |
| **Event** / **execution history** | Enregistrement ordonné et append-only de chaque action significative (démarrage, activité planifiée/terminée, signal reçu…). Source de vérité de l'état. |
| **Replay** | Ré-exécution du code workflow depuis le début en relisant l'historique ; les activités terminées ne sont pas ré-exécutées (résultat relu). |
| **Determinism** | Contrainte : à historique égal, le workflow doit produire la même séquence de commandes. |
| **Sandbox** (determinism enforcement) | Environnement qui ré-importe les modules, intercepte les appels non déterministes et restreint la boucle asyncio ; actif par défaut. |
| **Deployment** | Groupe nommé de workers (même `DEPLOYMENT_NAME`) qui possède un ensemble de définitions de workflows et reçoit leurs exécutions. |
| **Namespace** | Frontière d'isolement des workflows d'un workspace (ex. `mistral-workflows` dans la réponse `whoami`) ; les blobs offloadés sont préfixés par namespace. |
| **Heartbeat** | Ping périodique d'une activité longue (`activity_heartbeat()`), pouvant porter un checkpoint de progression. |
| **Retry policy** | Politique de nouvelle tentative d'une activité (nombre max, coefficient de backoff exponentiel). |
| **Local activity** | Activité exécutée directement dans le processus du worker de workflow, sans passer par le scheduling plateforme. |
| **Sticky worker session** | Séquence d'activités épinglées sur une même instance de worker pour partager une ressource en mémoire. |
| **Dependency injection** / `Depends` | Marqueur de paramètre d'activité résolu par un « provider » initialisé une fois au démarrage du worker. |
| **Signal** | Message « fire-and-forget » envoyé à un workflow en cours (sans réponse). |
| **Query** | Lecture de l'état d'un workflow sans le modifier. |
| **Update** | Comme un signal, mais l'appelant attend que le workflow traite et réponde. |
| **Child workflow** (sub-workflow) | Workflow lancé par un autre, avec sa propre exécution, son historique et sa politique de retry. |
| **Parent close policy** | Ce qu'il advient d'un enfant quand le parent se termine (`ABANDON`, `TERMINATE`, …). |
| **Continue-as-new** | Remise à zéro de l'historique en reportant un état vers une nouvelle exécution/run. |
| **Reset** | Redémarrage d'une exécution à partir d'un événement donné de son historique (nouveau run). |
| **Schedule** | Planification persistante (calendars, intervals, cron) qui déclenche des exécutions ; gérée hors du code worker. |
| **Overlap policy** / **catchup window** / **jitter** | Politique de chevauchement des runs planifiés / fenêtre de rattrapage après panne / délai aléatoire ajouté. |
| **Search keys** | Paires clé/valeur attachées à une exécution (métadonnées indexées, non chiffrées) pour la retrouver. |
| **Tags** | Chaînes filtrables attachées aux **définitions** de workflows (pas aux exécutions). |
| **Payload offloading** | Déport automatique d'un payload > 2 Mo vers le stockage blob du client ; l'orchestrateur ne garde qu'une référence. |
| **Activity field offloading** | Déport champ par champ (`OffloadableField`) de données volumineuses manipulées uniquement dans les activités. |
| **Compression** | Compression zstd des payloads avant sortie du worker. |
| **Encryption** | Chiffrement AES-GCM des payloads côté SDK (mode `full` ou `partial`). |
| **Task** (streaming) | Flux nommé de mises à jour d'état publié depuis une activité (`async with Task(...)`). |
| **Stream** | Nom du topic d'un événement de streaming (`type` de la `Task`). |
| **`broker_sequence`** | Numéro de séquence monotone, unique, des événements de streaming ; base de la reprise (`start_seq`). |
| **`CUSTOM_TASK_*`** | Événements de streaming émis depuis des activités via `Task`. |
| **Durable agent** | Agent LLM dont la boucle (appels modèle, outils, handoffs) tourne **dans un workflow** et survit aux crashs. |
| **`Agent` / `Runner`** | Définition d'agent (modèle, instructions, outils, handoffs) / exécuteur de la boucle de conversation. |
| **`RemoteSession` / `LocalSession`** | Session adossée à l'API Agents de Mistral (prod, recommandée) / boucle locale via chat completions (expérimental). |
| **Handoff** | Délégation d'une tâche d'un agent à un agent spécialisé. |
| **Plugin** | Paquet Python exposant workflows/activities/dépendances réutilisables sous le namespace réservé `mistralai.workflows.plugins`. |
| **Connector slot** | Déclaration (`connector("name")`) d'un Connector requis par un workflow ; résolu à l'exécution en client authentifié (`ToolCallClient`). |
| **On-behalf-of (OBO)** | Mode où le workflow agit avec l'identité de l'**utilisateur déclencheur** (JWT court terme). Exige un hardened deployment. |
| **Hardened deployment** | Déploiement dont l'enregistrement de workflows est restreint à des clés API précises (détaillé au chapitre 13). |
| **`run_as`** | Identité utilisée par un Connector : `"auto"` (suit `on_behalf_of`) ou `"deployment"` (identité de service du worker). |
| **MCP App** | Application d'interface `ui://` exposée par certains outils MCP, affichée en « side app » lors d'un `call_tool()`. |
| **`WorkflowsException` / `ErrorCode`** | Exception structurée (code, message, statut HTTP, type) et énumération des codes d'erreur. |
| **Vibe Work** | Surface conversationnelle (chat.mistral.ai) où les workflows apparaissent comme assistants. |
| **`InteractiveWorkflow` / `wait_for_input()`** | Primitive de workflow conversationnel pour demander une saisie utilisateur (formulaires, confirmations, timeouts) — mentionnée ici, détaillée au chapitre 13. |
| **Cookbook** | Projet modèle complet généré par la CLI (`setup`) illustrant un pattern. |

---

## 3. Fonctionnalités en détail

### 3.1 Architecture : moteur durable et mode hybride

**Moteur sous-jacent.** La durabilité est fournie par **Temporal**. Chaque étape est consignée dans un historique d'événements ; si un processus meurt, un autre reprend depuis la dernière étape terminée. Les retries sont de première classe (backoff configurable par activité). Durées supportées : de secondes à **mois** (page Overview) — la page « Building › Workflows » parle de « seconds to years ».

**Répartition des rôles.**

| Côté | Contenu | Détails |
|---|---|---|
| **Your environment** (client) | Le code (typiquement dans votre dépôt) et les **workers** qui l'exécutent | Laptop en dev ; Kubernetes ou VM en prod. Les workers se connectent **en sortie** à la plateforme. |
| **Studio environment** (Mistral) | L'**orchestrateur** (état, historique, dispatch) derrière une **API REST publique**, et l'**UI Studio** | N'initie jamais de connexion vers le réseau client ; ne détient jamais le code. Enterprise : déployable en cloud privé / on-prem. |

Diagrammes référencés (non disponibles en texte dans la copie) : `/img/workflows_hybrid_mode.svg`, `/img/workflows_mental_model.svg`.

**Encadré `:::info` « Hybrid mode : your data stays where you want it »** : les entrées/sorties transitent par la plateforme, mais (1) le SDK peut **chiffrer** avant sortie du worker (la plateforme ne stocke que du chiffré) ; (2) la plateforme **déporte** les entrées/sorties **> 2 Mo** vers le stockage blob **du client** (S3, GCS, Azure) et ne garde que des références.

**Déroulé type d'une exécution (Core concepts).**
1. Un client (votre code, Studio, Vibe Work ou un schedule) appelle la Workflows API pour démarrer une exécution.
2. L'orchestrateur enregistre la requête comme événement et la route vers le bon **deployment**.
3. Un worker de ce deployment prend la tâche, instancie la classe du workflow et lance l'entrypoint.
4. Le workflow appelle des activités ; chaque appel devient une **tâche** que n'importe quel worker du deployment peut prendre.
5. Chaque étape est enregistrée comme événement ; les clients peuvent streamer en direct ou lire l'historique ensuite.
6. Si un worker crashe en cours, un autre reprend depuis l'historique enregistré : l'exécution survit.

La page Workers détaille la même chose en 7 étapes (workflow task planifiée → worker exécute le workflow → appel d'activité = activity task planifiée → n'importe quel worker l'exécute → résultat consigné → le workflow reprend).

**Conséquence** : les workflows peuvent tourner dans un réseau privé sans trafic entrant depuis la plateforme.

### 3.2 Installation (paquets, extras, CLI, versions)

**Prérequis** : Python **3.12 ou plus** ; **uv** installé (`uvx` est livré avec `uv`) ; un compte Mistral et une clé API (pour le premier workflow et les cookbooks).

**Paquets et extras** :

| Commande | Contenu / usage |
|---|---|
| `uv add mistralai-workflows` | SDK Workflows + dépendances cœur (crée le venv si absent). Module importé : `mistralai.workflows`. |
| `uv add "mistralai-workflows[mistralai]"` | **Plugin Mistral** : durable agents, tool calling, handoffs multi-agents, Connector slots. |
| `uv add "mistralai-workflows[s3]"` | Support AWS S3 (payload offloading, accès stockage depuis activités). |
| `uv add "mistralai-workflows[azure]"` | Support Azure Blob Storage. |
| `uv add "mistralai-workflows[gcs]"` | Support Google Cloud Storage. |
| `uv add "mistralai-workflows[storage]"` | Tous les fournisseurs de stockage. |
| `uv add "mistralai[workflow-payload-compression]"` | Extra du **SDK client `mistralai`** pour la compression (tire `zstandard` et `msgpack`). |
| `uv add "mistralai[workflow-payload-encryption]"` | Extra du SDK client pour le chiffrement (tire `cryptography`, AES-GCM). |
| `pip install mistralai-workflows-plugins-mistralai` | Plugin Mistral AI en paquet séparé (nom de paquet cité par la page Plugins et la page Connectors). |
| `pip install mistralai-workflows-plugins-evaluations` | Plugin d'évaluations offline. |
| `uvx mistralai-workflows-cli@latest setup` | CLI de scaffolding (projet prêt à l'emploi, cookbooks). |

**Contraintes de versions relevées** :
- `mistralai>=2.8.0` requis pour `MCPStreamableHTTPConfig` (client Streamable HTTP) — encadré `:::note`.
- L'exemple de `pyproject.toml` d'une bibliothèque interne déclare `mistralai-workflows>=2.0.0`.

**Vérification** :
```bash
uv run python -c "import mistralai.workflows; print('Workflows is installed successfully!')"
```

### 3.3 Premier workflow pas à pas

1. **Scaffolding** : `uvx mistralai-workflows-cli@latest setup`. Génère un projet Python prêt à tourner (SDK configuré, workflow d'exemple minimal, commandes d'aide pour lancer le worker et déclencher des exécutions). La commande invite à **générer une clé API** dans la console (`https://console.mistral.ai/home?profile_dialog=api-keys`) et à la coller ; une clé n'est **affichable qu'une fois**. Nom de projet par défaut : `my-workflow`.
2. **Code d'exemple** `src/workflows/hello.py` : un modèle `HelloInput(BaseModel)` avec `name: str = "World"`, une activité `@workflows.activity()` `greet(name) -> str`, et une classe `HelloWorkflow` décorée :
   ```python
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
3. **Worker** `src/entrypoints/worker.py` : `discovered = discover_workflows()` puis `await mistralai_workflows.run_worker(discovered)` — découvre les classes dans `src/workflows` et les passe à `run_worker()`, qui les enregistre et démarre le worker.
4. **Lancement** : `make start-worker` (à la racine ; voir le `Makefile`). Le worker se connecte à l'API Mistral et enregistre le workflow.
5. **Déclenchement** (4 voies) :
   - **Console** : ouvrir la console dans le workspace de la clé → **Workflows** (barre latérale) → **hello-world** → bouton **Start Workflow** avec l'entrée `{"name": <your_name>}` → onglet **Executions** → sortie `{"result": "Hello, <your_name>! Welcome to Mistral Workflows."}`.
   - **Makefile** (second terminal) : `make execute workflow=hello-world input='{"name": "World"}'` → log `Result: {'result': 'Hello, World! Welcome to Mistral Workflows.'}`.
   - **SDK Python** : `Mistral(api_key=...).workflows.execute_workflow(workflow_identifier="hello-world", input={"name": "Alice"})`.
   - **curl** : `POST https://api.mistral.ai/v1/workflows/hello-world/execute` avec corps `{"input": {"name": "Alice"}}`.
   - **Réponse** (asynchrone) : `workflow_name`, `execution_id`, `root_execution_id`, `status: "RUNNING"`, `start_time`, `end_time: null`, `result: null`, `parent_execution_id: null`, `total_duration_ms: null`.
6. **Arrêt** : `Ctrl+C` stoppe le worker.

Note : le résultat d'un workflow retournant une `str` apparaît encapsulé sous la clé `"result"` dans la console et dans le log Makefile.

### 3.4 Cookbooks

**Prérequis** : compte Mistral, « Python 3.12 installed », `uvx`, clé API du workspace cible. **Mise en place** : `uvx mistralai-workflows-cli@latest setup` (choisir le template), puis `cd my-workflow` et `make start-examples` (enregistre les workflows cookbook dans le workspace et garde le worker prêt). Exécutions lançables depuis un second terminal (commandes `make execute-…`) ou depuis Studio (`https://console.mistral.ai/build/workflows`). Chaque projet généré contient le code, des données d'exemple, un entrypoint worker et des commandes d'aide ; les fichiers à adapter sont dans `src/workflows/`.

| Cookbook | Démontre | Workflow principal dans Studio | Commande |
|---|---|---|---|
| Cargo release (conformité marchandises dangereuses) | Approbation humaine, sub-workflows, sorties structurées | `cargo-release-compliance` | `make execute-cargo-release` |
| Insurance claims (triage avec vision) | Activités parallèles, retries, routage déterministe | `insurance-claims-triage` | `make execute-insurance-claims` |
| Code modernization | Sub-workflows parallèles, validation syntaxique, approbation humaine | `code-modernization` | `make execute-code-modernization` |
| Linear Summarization | Connectors, retry policies, human-in-the-loop, sortie LLM structurée | `linear-summarization` (tableau) / `linear-weekly-summary` (URLs et texte) | `make execute-linear-summary` |

**Cargo release** : extrait le document d'expédition, classe la cargaison, lance les contrôles « dangerous goods » si besoin (dans un **child workflow**), valide la conformité douanière, et **met en pause pour un relecteur** si une anomalie est détectée (`wait_for_input()`). Chemin anomalie : `input='{"document_uri":"src/examples/cargo_release/sample_data/shipping_doc_anomaly.png","shipment_id":"BL-2024-RTD-004812"}'`. À observer dans Studio : le child workflow de validation, l'événement `wait_for_input`, approuver/bloquer, puis vérifier que le parent **reprend à l'étape d'approbation sans rejouer** les activités précédentes.

**Insurance claims** : triage à partir de texte + photos ; analyse des photos **en parallèle** (activités `analyze_photo`), contrôle de cohérence de la description, **sévérité déterministe** (décidée par le code du workflow, pas par un appel modèle), score de risque de fraude, rapport typé. Entrée : `claim_id`, `claimant_name`, `description`, `photos` (liste de chemins).

**Code modernization** : le parent scanne le dépôt, lance **un child workflow par fichier**, valide le code généré dans un **sous-processus**, agrège en change set, pause pour revue humaine avant de produire une proposition de PR. Entrée : `{"repo_path": "examples/code_modernization/sample_data/legacy_repo", "target": "Python 2.7 → 3.12"}`. La PR n'est écrite qu'après approbation.

**Linear Summarization** : résumés hebdomadaires de projets Linear ; entrée équipe et projet (nom ou ID), récupération des issues en parallèle, résumé LLM, et **pause pour clarification humaine** si l'équipe/le projet ne se résout pas (ou si aucune entrée n'est fournie). Entrée exemple `{"team": "Engineering", "project": "*"}`. **Prérequis spécifiques** (Connector Linear en mode **OBO**, donc **hardened deployment**) :
1. Créer un **Linear Connector** dans Studio › Context › Connectors (`https://console.mistral.ai/build/connectors`) **nommé `linear`** (doit correspondre au code).
2. Suivre le flux d'auth pour ajouter la credential dans l'onglet **Credentials** du connector.
3. Amorcer (« bootstrap ») le deployment, puis le durcir dans **Settings › Hardened Deployments** ; **ré-enregistrer** le workflow après durcissement pour que le workflow OBO s'enregistre.

### 3.5 Concepts de base : Workflow

- **Rôle** : couche de composition — définit **quoi faire et quand** ; coordonne les activités, attend des événements externes, gère des timers, décide de la suite selon les résultats. Survit aux redémarrages car la plateforme reconstruit l'état depuis l'historique.
- **Définition** : `@workflows.workflow.define(name=...)` sur une **classe**, `@workflows.workflow.entrypoint` sur la méthode de démarrage (souvent `run`, mais `execute`/`entrypoint` apparaissent dans les exemples).
- **Entrée** : tout type JSON-sérialisable (modèles Pydantic, dicts, primitives). La plateforme **valide les entrées et génère les schémas d'UI de la Console** dans tous les cas. Un unique `BaseModel` → ses champs deviennent les clés de premier niveau (pas d'objet enveloppe). Union de modèles → validation dans l'ordre, premier qui matche ; `extra="forbid"` recommandé.
- **Déterminisme** : contrainte fondamentale (voir 3.12). Remplaçants SDK : `workflow.now()`, `workflow.uuid4()`, `workflow.random()`. Toute opération touchant le monde extérieur va dans une activité. La sandbox est **active par défaut** ; opt-out par workflow (`enforce_determinism=False`) ou worker (`DEFAULT_ENFORCE_DETERMINISM` → `config.worker.default_enforce_determinism = False`). Désactivée, une erreur non déterministe ne casse pas à l'appel mais **corrompt silencieusement l'historique** et apparaît en divergence au prochain replay, parfois des heures ou jours plus tard.
- **`execution_timeout`** : plafond dur de la durée de vie totale, **retries et itérations continue-as-new inclus** ; **défaut 1 heure** ; à augmenter explicitement (`execution_timeout=timedelta(days=7)`).
- **Limitations** :
  - **2 secondes** max de code workflow entre deux appels d'activités (déplacer le calcul lourd dans des activités).
  - **Aucune I/O** dans le workflow.
  - **2 Mo en entrée et 2 Mo en sortie** par invocation de workflow (au-delà : payload offloading).
  - **Historique** : 51 200 événements ou 50 Mo par exécution.

### 3.6 Concepts de base : Activity

- **Rôle** : là où le travail réel a lieu (email, API externe, requête BD, traitement de fichier, génération IA). Fonctions **async** ordinaires, sans contrainte de déterminisme.
- **Atomicité** : chaque appel est une unité atomique ; échec → retry automatique selon une politique configurable ; succès → résultat consigné dans l'historique et **jamais ré-exécuté au replay**.
- **Ré-exécution sûre** : un échec ou timeout en cours d'exécution entraîne un retry, potentiellement après des effets de bord partiels. Propriété exigée : les **effets de bord convergent vers le même état observable** (plus précis que « idempotence » ; les sorties n'ont pas à être identiques octet pour octet — ex. une complétion LLM différente au retry reste acceptable).
- **Appel** : `await` direct dans le code du workflow (`user = await fetch_user_data(user_id)`).
- **Retry policy et timeouts** sur le décorateur ; **toujours fixer `start_to_close_timeout`**, sinon une activité non réactive bloque indéfiniment.
- **Heartbeats** : pour les activités de plus de quelques minutes ; `activity_heartbeat(progress)` envoie un ping et peut porter un **checkpoint** pour reprendre au retry ; au-delà de `heartbeat_timeout` sans heartbeat, la plateforme considère le worker mort et replanifie l'activité sur un autre worker.
- **Limitations** : utiliser des bibliothèques **async** pour l'I/O (`httpx.AsyncClient` ✅, `requests.post` ❌ — un appel bloquant fige le worker pour toutes les activités concurrentes) ; **2 Mo** en entrée et en sortie par appel.

### 3.7 Concepts de base : Worker

- **Rôle** : processus qui exécute réellement le code ; se connecte, **enregistre** workflows et activities, **poll** les tâches.
- **Sans état et interchangeables** : aucune affinité exécution↔worker ; autant de workers que nécessaire, la plateforme répartit.
- **Auto-registration** (`:::tip`) : au démarrage, tous les workflows et activities du worker sont enregistrés automatiquement — **pas d'étape d'enregistrement séparée, de manifeste ni de schéma** à maintenir.
- **Tolérance aux pannes** : en cas de crash, la plateforme détecte l'absence de heartbeats et réassigne la tâche en cours ; reprise sans perte grâce à l'historique.
- **Démarrage** :
  ```python
  import asyncio
  import mistralai.workflows as workflows

  async def main():
      await workflows.run_worker([MyWorkflow])

  if __name__ == "__main__":
      asyncio.run(main())
  ```
  `run_worker()` prend la **liste des classes de workflows** ; tourne jusqu'à l'arrêt du processus.
- **Variables d'environnement** : `MISTRAL_API_KEY` détermine le **workspace** ; `DEPLOYMENT_NAME` le **deployment** rejoint. Exemple : `MISTRAL_API_KEY=your_key DEPLOYMENT_NAME=invoice-service uv run python my_worker.py`.
- **Worker info** : `GET https://api.mistral.ai/v1/workflows/workers/whoami` (Bearer) → `{"scheduler_url": "...", "namespace": "mistral-workflows", "tls": false}` ; champs : `scheduler_url` (endpoint plateforme auquel le worker est connecté), `namespace` (frontière d'isolement du workspace), `tls` (connexion au scheduler chiffrée ou non).

### 3.8 Concepts de base : Execution (et run)

- **Execution** : invocation unique d'un workflow ; `execution_id` unique (auto-généré ou fourni par l'appelant ; la spec limite à **256 caractères**). Le `workflow_identifier` doit correspondre au `name` passé à `@workflows.workflow.define()`.
- **Déclenchement SDK** : `client.workflows.execute_workflow(workflow_identifier="my_workflow", input={...}, execution_id="my-run-2024-01-15")` → objet avec `status` initial typiquement `RUNNING`. Aussi depuis Studio, Vibe Work ou un schedule.
- **Statuts** :

| Statut | Type | Signification |
|---|---|---|
| `RUNNING` | initial | En cours |
| `COMPLETED` | terminal | Succès |
| `FAILED` | terminal | Erreur non gérée |
| `CANCELED` | terminal | Arrêt gracieux |
| `TERMINATED` | terminal | Arrêt forcé |
| `TIMED_OUT` | terminal | `execution_timeout` dépassé |
| `CONTINUED_AS_NEW` | terminal | Historique réinitialisé via continue-as-new ; un nouveau run prend le relais « sous un nouvel `execution_id` » |
| `RETRYING_AFTER_ERROR` | transitoire | Échec planifié pour retry ; reste dans cet état jusqu'à résolution terminale |

(La spec `WorkflowExecutionStatus` confirme exactement ces 8 valeurs.)
- **Lecture** : `client.workflows.executions.get_workflow_execution(execution_id=...)` ou `GET /v1/workflows/executions/{execution_id}` ; historique complet : `GET /v1/workflows/executions/{execution_id}/history` ; progression live : streaming.
- **Executions vs runs** : l'exécution a un `execution_id` stable sur toute sa vie ; un **run** est une tentative. En général 1 run ; un **reset** crée un nouveau run sous le même `execution_id`. **Un seul run actif** ; les endpoints `/cancel`, `/terminate`, `/signals`, `/queries`, `/updates` ciblent toujours le **dernier run**.

### 3.9 Concepts de base : Events (historique d'exécution)

- Chaque action significative produit un événement, consigné dans l'ordre → **execution history** append-only, source de vérité de l'état.
- **Replay** : après crash/redémarrage/réassignation, le worker rejoue l'historique depuis le début ; les activités terminées ne sont pas ré-exécutées ; le workflow revient exactement au point d'interruption, sans code de reprise.
- **Types d'événements d'historique** :

| Type | Émis quand |
|---|---|
| `WORKFLOW_EXECUTION_STARTED` | Début d'exécution |
| `WORKFLOW_EXECUTION_COMPLETED` | Fin en succès |
| `WORKFLOW_EXECUTION_FAILED` | Fin sur erreur non gérée |
| `WORKFLOW_EXECUTION_CANCELED` | Annulation |
| `WORKFLOW_EXECUTION_CONTINUED_AS_NEW` | Réinitialisation de l'historique |
| `WORKFLOW_TASK_TIMED_OUT` | Une workflow task dépasse sa limite de temps |
| `WORKFLOW_TASK_FAILED` | Une workflow task rencontre une erreur |
| `ACTIVITY_TASK_STARTED` | Début d'activité |
| `ACTIVITY_TASK_COMPLETED` | Fin d'activité en succès |
| `ACTIVITY_TASK_RETRYING` | Activité en retry |
| `ACTIVITY_TASK_FAILED` | Échec d'activité |

- **Limites** : **51 200 événements** ou **50 Mo**, le premier atteint. Au-delà : continue-as-new.
- **`:::note`** : ces événements d'**historique** (durabilité/replay) sont distincts des **événements de streaming** consommables en temps réel (voir 3.22–3.23).

### 3.10 Concepts de base : Deployment

- **Définition** : groupe nommé de workers qui **possède** un ensemble de définitions de workflows et reçoit **toutes** leurs exécutions. Les workers le rejoignent via `DEPLOYMENT_NAME` au démarrage ; tous les workers d'un même nom partagent des définitions identiques.
- **`:::tip`** : un `DEPLOYMENT_NAME` par environnement (`invoice-service-staging`, `invoice-service-prod`) pour que staging et prod ne se disputent pas les exécutions.
- **Capacités** (la page annonce « quatre » mais en liste cinq) :
  - **Isolation des workers** : dans un workspace partagé, chaque deployment reçoit exclusivement les exécutions de ses workflows ; plusieurs équipes coexistent.
  - **Routage automatique** : si un seul deployment actif possède un workflow, les exécutions y vont sans configuration.
  - **Scalabilité horizontale** : plusieurs workers sous le même nom = plus de débit.
  - **Suivi de cycle de vie** : un deployment est **actif** tant qu'au moins un de ses workers a envoyé un heartbeat dans la **fenêtre de vivacité** ; les deployments inactifs sont exclus du routage.
  - **Contrôle d'accès** : restreindre l'enregistrement de workflows à certaines clés API via les **hardened deployments**.
- Renvoi vers « Managing Deployments » (routage, détection de conflits, Deployments API) — hors périmètre (chapitre 13).

### 3.11 Construire un workflow (`@workflow.define`, entrées, timeout, signals/queries/updates, reset, contexte)

**Workflow ou activity ?** Le workflow est le « cerveau » : coordonne, décide, garde l'état sur de longues durées, attend des événements externes ; doit être déterministe. L'activity est le travail réel (LLM, HTTP, BD, fichiers, outils) : non déterministe, dure de secondes à minutes, retentée avec backoff. Exemple de la doc (traitement de factures) : activités `fetch_invoice_pdf` (téléchargement HTTP) → `extract_fields` (LLM, sortie structurée) → branchement sur le total (approbation humaine requise ?) → attente d'un signal `approve` → activité `post_to_accounting_system`. L'ordre, le branchement et l'attente vivent dans le workflow ; chaque effet de bord dans une activity.

**Deux styles d'import équivalents** dans la doc : `import mistralai.workflows as workflows` puis `@workflows.workflow.define`, ou `from mistralai.workflows import workflow` puis `@workflow.define`.

**Paramètres de `@workflows.workflow.define(...)` relevés dans les pages assignées** :

| Paramètre | Type | Défaut | Effet | Source |
|---|---|---|---|---|
| `name` | `str` | requis | Identifiant du workflow (= `workflow_identifier` côté API, schedules) | toutes |
| `workflow_display_name` | `str` | — | Nom affiché (ex. « Hello World ») | Premier workflow |
| `workflow_description` | `str` | — | Description affichée | Premier workflow |
| `execution_timeout` | `timedelta` | 1 h | Durée de vie totale max (retries et continue-as-new inclus) | Workflows |
| `enforce_determinism` | `bool` | non fixé → suit `DEFAULT_ENFORCE_DETERMINISM` (vrai par défaut) | Active/désactive la sandbox pour ce workflow | Determinism |
| `on_behalf_of` | `bool` | `False` | Exécute avec l'identité de l'utilisateur déclencheur ; exige un hardened deployment ; incompatible avec `schedules` | OBO, Connectors |
| `search_keys` | `list[str]` | — | Chemins pointés extraits de l'entrée et indexés (validés au démarrage du worker) | Search keys |
| `schedules` | `list[ScheduleDefinition]` | — | **Déprécié** : schedules déclarés dans le code | Scheduling, Workflows |

Décorateurs complémentaires : `@workflows.workflow.entrypoint` (méthode d'entrée), `@uses_connectors(...)` (à appliquer **après** `@workflow.define`, voir 3.19).

**Formes d'entrée de l'entrypoint** :

| Forme | Exemple de signature | Entrée JSON attendue | Remarques |
|---|---|---|---|
| Primitives / multi-paramètres | `run(self, report_type: str, include_details: bool = False)` | `{"report_type": "daily", "include_details": false}` | Chaque paramètre = une clé |
| Un seul `BaseModel` | `run(self, params: ReportParams)` | `{"report_type": "daily", "include_details": true}` | Champs du modèle au premier niveau, **sans enveloppe** |
| Union de `BaseModel` | `run(self, params: PromptInput \| CountInput)` | `{"prompt": "hello"}` → `PromptInput` ; `{"count": 42}` → `CountInput` ; `{"count": 42, "extra": "field"}` → `ValidationError` | Validation dans l'ordre, premier match ; `ConfigDict(extra="forbid")` recommandé (`:::tip`) |
| Union optionnelle | `run(self, params: PromptInput \| CountInput \| None)` | absence d'entrée → `None` | `\| None` ou `Optional` |
| Union `BaseModel` + non-modèle | `run(self, params: PromptInput \| str)` | — | **Interdit** : erreur à la définition de classe : « Parameter 'params' of 'run' has unsupported union members: str. Union inputs only support Pydantic BaseModel subclasses and None. Use a dedicated BaseModel instead. » |
| Contournement | `class PromptOrRaw(RootModel[PromptInput \| str])` puis `run(self, params: PromptOrRaw)` | `params.root` est le `PromptInput` ou la `str` | Le `RootModel` nommé donne aussi un schéma JSON plus propre |

**Execution timeout** : `@workflow.define(name="long_running_workflow", execution_timeout=timedelta(days=7))`. Un workflow encore actif après `execution_timeout` est annulé avec une erreur `WORKFLOW_EXECUTION_TIMED_OUT`. `:::note` : c'est une limite **murale totale**, pas un timeout d'activité ; les timeouts d'activité se règlent via `start_to_close_timeout` ou `schedule_to_close_timeout` sur chaque activité.

**Signals, queries, updates** (déclarés comme méthodes de la classe ; détail au chapitre 13) :

| Décorateur | Signature type | Sémantique |
|---|---|---|
| `@workflows.workflow.signal(name="approve", description="Approval signal")` | `async def approve_signal(self, data: ApprovalData) -> None` | Fire-and-forget ; le workflow met à jour son état de façon asynchrone (approbations humaines, callbacks externes) |
| `@workflows.workflow.query(name="get_status", description="Get current status")` | `def get_status(self) -> WorkflowStatus` (**synchrone**) | Lecture d'état sans modification (progression, statut) |
| `@workflows.workflow.update(name="update_config", description="Update workflow configuration")` | `async def update_config(self, config: UpdateConfig) -> UpdateResult` | L'appelant attend traitement + réponse (ajuster une config en cours et récupérer le nouvel état, soumettre une valeur et recevoir sa version validée) |

**Autres primitives de base** (détaillées plus loin) : schedules (3.27), child workflows (3.24), `workflow.wait_condition(lambda: self.ready, timeout=timedelta(minutes=5))` (3.25 ; lève `TimeoutError` si non satisfait), continue-as-new (3.26 ; utile près de la limite « 50K events »).

**Reset** (fonctionnalité avancée) : redémarre une exécution depuis un point de son historique ; termine le run courant et en démarre un nouveau à partir de l'événement choisi. Tous les événements jusqu'au point de reset sont copiés ; la suite s'exécute avec **la version actuelle du code** ; toute progression postérieure est perdue. À faire **après avoir corrigé** la cause (ex. erreur de non-déterminisme) ; fournir une raison (consignée dans l'historique).
```python
client.workflows.executions.reset_workflow(
    execution_id="your-execution-id",
    event_id=42,  # doit être un événement WORKFLOW_TASK_COMPLETED
    reason="Bug fixed in activity logic",
    exclude_signals=True,   # optionnel : ne pas rejouer les signals postérieurs
    exclude_updates=True,   # optionnel : ne pas rejouer les updates postérieurs
)
```
Spec : `POST /v1/workflows/executions/{execution_id}/reset`, corps `ResetInvocationBody` (`event_id` entier, `reason` optionnel, `exclude_signals` et `exclude_updates` booléens **défaut `false`**).

**Contexte d'exécution** : `workflows.get_execution_id()` renvoie l'ID de l'exécution courante (logs, corrélation inter-services, transmission à un système externe qui renverra des signals).

### 3.12 Règles de déterminisme et sandbox

**Principe** : à entrées égales, même séquence de **commandes** ; au replay, chaque commande est confrontée à l'historique ; divergence → erreur de non-déterminisme. `:::note` : enforcement **actif par défaut**.

**À utiliser / à proscrire dans le code workflow** :

| Usage | ✅ API SDK (`from mistralai.workflows import workflow`) | ❌ Équivalent dangereux |
|---|---|---|
| Heure courante | `workflow.now()` | `datetime.now()` |
| UUID | `workflow.uuid4()` | `uuid.uuid4()` |
| Aléatoire | `workflow.random()` | `random.random()` |

Aussi dangereux en workflow : accès fichiers (`open()`, `os.listdir()`…), appels HTTP ou requêtes BD directs, **modification de variables globales**, appels système (`os.environ`, `os.getcwd()`…). Ces opérations vont dans des activités (où `datetime.now()` est permis, car les activités ne sont pas rejouées).

**Ce que fait la sandbox** :
- **Ré-importe les modules** dans un environnement isolé (le code à effets de bord au niveau module est confiné).
- **Intercepte** les appels stdlib dangereux (`datetime.now()`, `random.random()`, `uuid.uuid4()`, `open()`, `os.environ`, etc.).
- **Restreint la boucle asyncio** pour empêcher de lancer des coroutines non contrôlées.
→ erreur **immédiate à l'exécution** plutôt qu'un bug latent au replay. `:::info` : sans sandbox, le code non déterministe casse quand même au replay, simplement sans alerte immédiate.

**Désactivation et précédence** :
- Par workflow : `@workflow.define(name="my_workflow", enforce_determinism=False)`.
- Par worker : `DEFAULT_ENFORCE_DETERMINISM=0` (positionne `config.worker.default_enforce_determinism` à `False`).

| `enforce_determinism=` (décorateur) | `DEFAULT_ENFORCE_DETERMINISM` | Résultat |
|---|---|---|
| `True` | quelconque | sandboxé |
| `False` | quelconque | **non** sandboxé |
| non fixé (défaut) | `1` / `True` (défaut) | sandboxé |
| non fixé (défaut) | `0` / `False` | **non** sandboxé |

**Échappatoires temporaires** (`:::warning` : elles annulent l'intérêt de l'enforcement) — deux context managers sous `workflow.unsafe` :
- `workflow.unsafe.imports_passed_through()` : les imports dans le bloc contournent le mécanisme de ré-import (bibliothèque tierce à effets de bord à l'import).
- `workflow.unsafe.skip_determinism_enforcement()` : lève **toutes** les restrictions dans le bloc (comme `enforce_determinism=False`) ; exemple : lire `os.environ.get("SOME_CONFIG", "default")`.

**Recommandations** : (1) garder l'enforcement ; ne le désactiver que temporairement pendant une migration ; (2) migrer workflow par workflow avec `enforce_determinism=False` ciblé, éviter la désactivation worker-wide ; (3) blocs `unsafe` minimaux et commentés ; (4) mettre tous les effets de bord dans des activités.

### 3.13 Activities : bases (timeouts, retries, heartbeats, granularité, imbrication)

**Caractéristiques (page parent « Activities »)** : ré-exécution sûre (convergence des effets de bord), **exécution isolée** (« chaque activité tourne dans son propre processus », retries automatiques), I/O JSON-sérialisables (`str`, `int`, `dict`, `list`…), **2 Mo** max d'entrée ou de sortie par appel.

**Définition** : `@workflows.activity()` sur une fonction `async` (paramètres positionnels/nommés avec défauts acceptés, ex. `my_activity(input_data: str, count: int = 1) -> dict`).

**Paramètres de `@workflows.activity(...)` relevés** :

| Paramètre | Type | Défaut | Effet | Local activity ? |
|---|---|---|---|---|
| `name` | `str` | nom de la fonction Python | Identifiant d'enregistrement, de routage d'exécution, et nom visible dans traces et console | oui |
| `start_to_close_timeout` | `timedelta` | non documenté (sans timeout, blocage indéfini possible) | Durée max entre début d'exécution et retour ; dépassement = échec (peut déclencher un retry) | oui |
| `schedule_to_close_timeout` | `timedelta` | non documenté | Cité comme alternative de timeout par activité (page Workflows) ; non détaillé | ? |
| `retry_policy_max_attempts` | `int` | non documenté | Nombre max de tentatives ; ensuite l'échec remonte au workflow | oui |
| `retry_policy_backoff_coefficient` | `float` | non documenté | Backoff exponentiel : `2.0` → délais 1 s, 2 s, 4 s, 8 s… | oui |
| `heartbeat_timeout` | `timedelta` | — | Exige des `activity_heartbeat()` périodiques ; sinon échec + retry | **non** |
| `sticky_to_worker` | `bool` | `False` (inférence) | Rend l'activité éligible aux sticky worker sessions | **non** |
| `rate_limit` | ? | — | Mentionné uniquement comme non supporté en local ; non documenté dans ce périmètre | **non** |

**Heartbeat** (référence canonique) : `from mistralai.workflows import activity_heartbeat` ; appel `activity_heartbeat({"processed": i + 1, "total": len(items)})` (n'importe quelle donnée de progression). Permet de détecter une activité non réactive **sans attendre** le `start_to_close_timeout` complet. `:::note` : non supporté pour les local activities. Exemple type : `start_to_close_timeout=timedelta(minutes=30)`, `heartbeat_timeout=timedelta(seconds=30)`.

**Granularité** (recommandation) : activités aussi fines que possible, chacune encapsulant toute la logique pouvant échouer → isolation des échecs, débogage plus facile, retries ciblés. Exemple : 3 activités séparées « récupérer depuis l'API », « traiter », « stocker en BD ».

**Activités imbriquées** (`:::warning` « Retry boundary ») : si une activité en appelle une autre, **seule l'activité externe** est une frontière de retry ; l'état est checkpointé avant l'activité externe, pas avant l'appel imbriqué. Si l'imbriquée échoue, **toute** l'externe est relancée depuis le début. Pour une isolation par étape, composer au niveau du workflow.

**Choisir une saveur d'activité** :

| Mode | Surcoût de routage | Isolation worker | Partage de ressources | Idéal pour |
|---|---|---|---|---|
| Regular activity | Standard | Oui | Non | Appels API, logique complexe, tout ce qui a des retries |
| Sticky session | Standard | Oui | Oui (en mémoire) | Réutiliser un modèle chargé ou une connexion BD |
| Local activity | Aucun | Non | N/A | Calculs purs et lookups sub-seconde |

### 3.14 Local activities

- **Principe** : exécution directe dans le processus du **worker de workflow**, sans le saut de scheduling plateforme. Pour opérations **< 1 s** où le surcoût de scheduling pèse.
- **Bon pour** : calculs rapides, validations, transformations ; scénarios haut volume sensibles à la latence. **À éviter** : opérations longues (plus de quelques secondes), appels API externes / I/O lourdes, besoin d'isolation de retry ou de scaling séparé.
- **Usage** : context manager `run_activities_locally()` (`from mistralai.workflows import run_activities_locally`) ; les activités `await`ées dans le bloc `with` tournent localement. Mélange possible : bloc local pour `quick_lookup`, appel normal hors bloc pour `external_api_call`.
- **Performance** : local = sub-milliseconde à quelques ms ; regular = dizaines à centaines de ms (dépend de l'infra et de la charge).
- **Limites** :
  - `:::warning` **Risque de crash du worker** : une exception inattendue dans une local activity peut faire tomber le worker et **tous** les workflows/activités qu'il porte (pas d'isolation processus). Réserver à du code sûr vis-à-vis des exceptions.
  - Pas d'isolation au niveau deployment (ressources partagées avec les workflows) ; une local activity lente **bloque** le worker de workflow ; pas de scaling indépendant.
  - **Paramètres** : timeouts, retry policies et injection de dépendances **fonctionnent** ; `sticky_to_worker`, `rate_limit`, `heartbeat_timeout` **ne s'appliquent pas**.

### 3.15 Sticky worker sessions

- **Principe** : router plusieurs activités vers la **même instance** de worker pour réutiliser une ressource coûteuse (modèle ML chargé, connexion BD ouverte, cache chaud) ou un état en mémoire construit par l'étape N et utilisé par l'étape N+1, sans le sérialiser via l'orchestrateur.
- **Compromis** : disponibilité — la session est liée à un worker ; s'il crashe ou est réduit (scale down), la session prend fin et les activités restantes repartent sur un autre worker (cache froid). Éviter pour des workflows de plusieurs heures ou quand le coût d'init par appel est faible.
- **API** :
  - Activités marquées `@workflows.activity(sticky_to_worker=True)`.
  - `async with run_sticky_worker_session():` (`from mistralai.workflows import run_sticky_worker_session`) : toutes les activités du bloc vont sur le même worker.
  - Réutilisation explicite : `session = await get_sticky_worker_session()` puis `async with run_sticky_worker_session(session):` dans chaque itération (import de `get_sticky_worker_session` non montré).
- **Limites** : `:::warning` état **uniquement en mémoire processus** (perdu au redémarrage/redéploiement, non partagé entre workers — utiliser une BD/un store externe pour la persistance) ; session rompue en cas de panne (concevoir les activités pour les **cold starts**) ; contention (capacité monopolisée, points chauds si beaucoup de workflows ciblent le même worker — surveiller l'utilisation). `sticky_to_worker` ne s'applique pas aux local activities.

### 3.16 Injection de dépendances (`Depends`)

- **But** : passer des ressources partagées (connexions BD, clients API, configuration) aux activités sans les construire à chaque appel.
- **Usage** : `from mistralai.workflows import Depends` ; paramètre d'activité `db: Database = Depends(get_db)` ; le worker passe le résultat du provider à chaque appel.
- **Durée de vie** (`:::tip` « Provider lifetime ») : provider **appelé une fois au démarrage du worker**, instance **partagée par toutes les exécutions d'activités** (pools de connexions, clients API, config parsée créés une fois). La valeur doit être **sûre en accès concurrent**.
- **Styles de providers supportés** :

| Style | Usage | Exemple |
|---|---|---|
| Fonction synchrone | Config simple, objets en mémoire | `def get_config() -> dict` |
| Fonction asynchrone | Dépendances I/O (connexion BD) | `async def get_db_connection()` |
| Context manager sync (`@contextmanager`) | Ressource à nettoyer (login/logout) | `yield session` puis `session.logout()` dans `finally` |
| Context manager async (`@asynccontextmanager`) | Ressource async à nettoyer | `yield conn` puis `await conn.close()` |
| Générateur sync | Flux de données, cycles de vie complexes | `yield line.strip()` sur un fichier |
| Générateur async | Flux async | `aiofiles` + `async for` |

- **Exemple complet** : activité `create_user(name, db=Depends(get_db), config=Depends(get_config), session=Depends(get_session))` appelée par `DIWorkflow` ; lancement par `await workflows.execute_workflow(DIWorkflow, params=Input(name="Alice"))` → `{'status': 'success', 'record_id': 1, 'timeout_used': 30}`.
- **Cas d'usage** : session SQLAlchemy async (`async_sessionmaker`, `expire_on_commit=False`) avec fermeture dans `finally` ; client de paiement initialisé une fois (`await client.initialize()`) et réutilisé.
- **Autres providers documentés** : `get_mistral_client` (3.17) et les Connector slots (`Depends(github_connector)` → `ToolCallClient`, 3.19). Les local activities supportent aussi `Depends`.

### 3.17 Client Mistral (`get_mistral_client`)

- `from mistralai.workflows.client import get_mistral_client` ; `client = get_mistral_client()` renvoie un **client SDK Mistral standard** pré-configuré avec des hooks « workflow-aware ».
- `:::warning` : **toujours** l'utiliser dans les activités au lieu de `Mistral(api_key=...)` — un client « vanilla » ne collecte pas la télémétrie workflow, n'injecte pas les métadonnées d'observabilité et ne supporte pas les credentials OBO.

| Apport | Détail |
|---|---|
| Télémétrie | Si le provider OpenTelemetry du workflow est activé, les appels API Mistral apparaissent dans les traces ; si la télémétrie est désactivée côté worker, le câblage est ignoré silencieusement |
| Métadonnées d'observabilité | En-tête HTTP JSON **`x-metadata`** sur chaque requête : `execution_id`, `run_id`, `task_id` (ID d'activité), `attempt` (n° de tentative) |
| Credentials OBO | `get_mistral_client(use_executor_credentials=True)` appelle l'API **en tant qu'utilisateur déclencheur** |
| Authentification automatique | Ordre : (1) argument explicite `api_key="..."` ; (2) fichier de token **Service Account** si `MISTRAL_SA_TOKEN_PATH` est défini (prioritaire sur `MISTRAL_API_KEY`) ; (3) variable `MISTRAL_API_KEY` |

- **Avec DI** : `client = Depends(get_mistral_client)` dans la signature d'activité → client initialisé une fois au démarrage du worker et réutilisé ; ex. `await client.chat.complete_async(model="mistral-large-latest", messages=[...])`.
- Les durable agents utilisent `get_mistral_client()` en interne (télémétrie et métadonnées de traçage par défaut sur tous les appels LLM).

### 3.18 Workflows on-behalf-of (OBO)

- `:::warning` : **exige un hardened deployment** ; impossible d'enregistrer un workflow OBO dans un deployment non durci.
- **But** : agir **en tant que l'utilisateur déclencheur** (accéder à ses connectors, à des ressources de son workspace, appeler l'API Mistral avec son identité).
- **Mécanisme** : la plateforme attache l'identité de l'utilisateur au contexte d'exécution. Quand une activité demande des credentials utilisateur, le SDK : (1) récupère le **token d'exécution** depuis le contexte ; (2) l'**échange** auprès de la plateforme contre un **JWT court terme** représentant l'utilisateur ; (3) l'injecte dans l'en-tête `Authorization` de chaque requête sortante ; (4) le **met en cache et le rafraîchit** automatiquement. Le worker ne voit jamais la clé API ni le token de session de l'utilisateur ; le swap d'identité est transparent.
- **Activation** : `@workflows.workflow.define(name="user_report", on_behalf_of=True)`.
- **Dans une activité** : `get_mistral_client(use_executor_credentials=True)` (utilisateur) ; `get_mistral_client(use_executor_credentials=False)` (**défaut**, identité du worker — ex. pour que le rate limiting s'impute au workspace du worker). Les deux peuvent coexister dans la même activité (choix d'identité par appel).
- **Contraintes** :
  - `:::warning` `on_behalf_of=True` **incompatible avec `schedules`** (pas d'utilisateur déclencheur) — contrôlé **à la décoration et à l'enregistrement**.
  - L'appelant doit avoir une **identité utilisateur complète** : les exécutions déclenchées par des clés API **sans en-têtes `user_id` / `organization_id`** sont rejetées.
  - Le JWT est court terme et lié à l'exécution : une fois l'exécution terminée, il ne peut plus être rafraîchi.

### 3.19 Connectors dans les workflows

**Principe** : utiliser les Connectors Mistral (GitHub, Notion, Slack, Outlook…) dans un workflow sans gérer de credentials : le workflow **déclare** les connectors requis ; la plateforme résout les credentials à l'exécution et déclenche l'OAuth à la demande. `:::info` : intégration via `mistralai-workflows-plugins-mistralai`, API **Public Preview**.

**Identité de résolution** : workflows **OBO** → credentials de l'**utilisateur déclencheur** (hardened deployment requis) ; workflows **réguliers** → credentials du **worker** (identité de la clé API du worker).

**Pourquoi des slots** : pas de secrets dans le code ; OAuth automatique (pause + émission d'une URL d'auth, reprise une fois fait) ; credentials scopés par identité ; auth interchangeable (bearer PAT et OAuth2 avec le même code).

**Prérequis** : `uv add "mistralai-workflows[mistralai]"` ; au moins un Connector enregistré dans le workspace (Studio › Context › Connectors, `https://console.mistral.ai/build/connectors`, ou Connectors API) ; credentials ajoutées **avant** l'exécution — obligatoire pour les connectors **Bearer** (ex. PAT GitHub), recommandé pour **OAuth2** (fallback : OAuth à la première exécution).

**Ajouter des credentials (UI)** : Studio › Context › Connectors → choisir un connector → onglet `Credentials` → `+ Add credentials` → nom (**alphanumérique et tirets uniquement**) → coller le bearer token ou faire le flux OAuth → une credential est toujours **par défaut** (modifiable en éditant une credential). Plusieurs credentials nommées possibles (ex. deux PAT GitHub de scopes différents ; compte Microsoft perso et pro). Stockage **par utilisateur**.

**Gérer les credentials par SDK** (`client.beta.connectors`, Public Preview) :

| Méthode | Paramètres montrés | Effet |
|---|---|---|
| `create_or_update_user_credentials_async` | `connector_id_or_name`, `name`, `credentials={"bearer_token": ...}`, `is_default=True` | Crée/maj une credential nommée (bearer) |
| `get_auth_url_async` | `connector_id_or_name`, `credentials_name` | Renvoie `result.auth_url` à ouvrir dans un navigateur (OAuth2) |
| `list_user_credentials_async` | `connector_id_or_name` | Liste |
| `delete_user_credentials_async` | `connector_id_or_name`, `credentials_name` | Supprime |

Renvoi au cookbook externe « multiple authentication » (dépôt `mistralai/connector-sdk-demo`).

**Flux OAuth de repli** : au démarrage d'une exécution, l'**intercepteur d'auth** du worker fait un **preflight** sur chaque slot déclaré par `@uses_connectors`. Credentials valides → le corps du workflow s'exécute. Sinon (typique au premier usage OAuth2) : le worker se met en pause, obtient une URL d'auth auprès de l'API Mistral, la transmet au client comme événement **`auth_url`**, et attend ; une fois les credentials stockées, le workflow reprend. L'activité de polling **heartbeat** pendant l'attente (pas de timeout worker si l'utilisateur est lent). Fenêtre de **10 minutes** avant `ConnectorAuthTimeout`. Diagramme : `/img/workflows_connector_oauth_flow.svg`.

**Construction en 3 étapes** :
1. **Déclarer les slots** au niveau module : `from mistralai.workflows.plugins.mistralai.connectors import connector` ; `github_connector = connector("github_app")`.

| Paramètre de `connector()` | Défaut | Effet |
|---|---|---|
| `name` | requis | Nom ou ID du connector tel qu'enregistré dans Studio |
| `auto_auth` | `True` | Lancer le preflight OAuth avant le démarrage du workflow |
| `credentials_name` | `None` | Épingler une credential nommée ; sinon credential par défaut de l'appelant, ou surcharge par exécution (runtime binding) |
| `allow_mcp_ui` | `False` | Autoriser les outils MCP « app-visible » à afficher leur app `ui://` en side app lors d'un `ToolCallClient.call_tool()` |
| `run_as` | `"auto"` | Identité d'accès : `"auto"` suit `on_behalf_of` du workflow ; `"deployment"` = toujours l'identité de service du worker |

2. **Activité appelant le connector** : paramètre `github: ToolCallClient = Depends(github_connector)` ; `await github.call_tool(tool_name="issue_write", arguments={"method": "create", "owner": ..., "repo": ..., "title": ..., "body": ...})` — dispatch vers le connector **MCP**, renvoie la réponse brute de l'outil.
3. **Attacher au workflow** :
   ```python
   @workflows.workflow.define(name="github-issue-creator", on_behalf_of=True)
   @uses_connectors(github_connector)
   class GitHubIssueCreatorWorkflow:
       @workflows.workflow.entrypoint
       async def run(self, prompt: GitHubIssuePrompt) -> None:
           await create_github_issue(prompt.owner, prompt.repo, prompt.title, prompt.body)
   ```
   Plusieurs slots : `@uses_connectors(github_connector, notion_connector)`. **`@uses_connectors` après `@workflow.define`** (l'ordre compte). Au démarrage, le plugin enregistre automatiquement un **`ConnectorAuthInterceptor`**.

**`run_as`** (choix d'identité par connector) : chaque connector fait son preflight (résolution, listing des credentials, OAuth, validation des outils) et ses appels sous une seule identité. Un même workflow peut mélanger : lire le GitHub de l'utilisateur (`run_as="auto"` + `on_behalf_of=True`) et poster sur un Slack partagé (`connector("slack", run_as="deployment")`). `:::warning` : (1) `deployment` **ne peut pas faire d'OAuth interactif** (pas d'utilisateur) — sans credentials utilisables en OAuth2, le preflight **échoue immédiatement** au lieu d'émettre une URL ; ajouter les credentials du worker dans Studio au préalable ; (2) **durable agents** : tous les connectors d'un même `Agent` doivent partager le même `run_as` (valeurs mixtes rejetées) ; utiliser `ToolCallClient` pour une identité par connector.

**Exécuter un workflow à connectors** :
- **Studio** : Workflows (`https://console.mistral.ai/build/workflows`) → choisir le workflow → `Start workflow`. S'il existe **plusieurs credentials nommées**, la boîte de lancement permet d'en choisir une. Fallback OAuth2 sans credentials : le panneau d'exécution affiche une invite OAuth (**icône de clé orange**) ; terminer le flux dans un onglet et le workflow reprend.
- **SDK** : `execute_with_connector_auth_async(client=..., workflow_identifier=..., input_data={...}, on_auth_required=callback, connectors=[...])` (`from mistralai.extra.workflows.connector_auth import ConnectorAuthTaskState, execute_with_connector_auth_async`) : poll l'exécution, détecte les demandes d'auth, appelle `on_auth_required(state)` avec `state.auth_url`, attend la fin du flux. Si toutes les credentials existent, l'étape OAuth est sautée.
- **Runtime binding** : `ConnectorSlot(connector_name="github_app", credentials_name="github-pat-full")` (`from mistralai.extra.workflows.connector_slot import ConnectorSlot`) passés via `connectors=[...]` ; `connector_name` doit correspondre à un slot de `@uses_connectors` ; omettre `credentials_name` = credential par défaut. Même code partagé dans une équipe, chacun avec ses credentials.

**MCP Apps depuis les outils de connector** : slot avec `allow_mcp_ui=True`, puis appel **direct** via `ToolCallClient.call_tool()` dans une activité. À la résolution du slot, le worker découvre quels outils déclarent une ressource `ui://` « app-visible » ; lors du `call_tool()`, le workflow émet une **étape MCP app** : la side app démarre avant l'appel, se termine quand l'appel réussit, échoue si l'appel lève ou renvoie une erreur MCP ; l'appel Python renvoie toujours la réponse normale. Exemple combiné avec `workflows_mistralai.send_assistant_message("...")` avant/après. Limites : seulement pour des appels **directs** depuis des activités (pas pour des outils appelés par un modèle/agent/sous-agent) ; l'outil doit déclarer `_meta.ui.resourceUri` (ou l'ancien `_meta["ui/resourceUri"]`) et, si `_meta.ui.visibility` est présent, il doit inclure `"app"` ; le workflow **n'attend pas** l'interaction utilisateur et ne peut pas consommer ses résultats de façon déterministe (l'ordre entre étapes suivantes et interactions n'est pas garanti) ; le rendu dépend d'une surface cliente compatible (les appelants SDK reçoivent juste le résultat).

**Avec les durable agents** : passer le slot à `Agent(..., connectors=[github_connector])` et **garder `@uses_connectors`** sur le workflow pour que l'intercepteur tourne ; l'agent reçoit les outils du connector et les invoque à chaque tour ; OAuth et résolution automatiques. Exemple : `Runner.run(agent=agent, inputs=...)` puis `result.final_output`.

**Erreurs courantes** :

| Erreur | Cause | Correction |
|---|---|---|
| `ConnectorError: Credential 'x' not found` | Credential nommée inexistante | La créer (Studio › Connectors › Credentials) ou retirer `credentials_name` |
| `ConnectorAuthTimeout` | OAuth non terminé en 10 min | Relancer et finir le flux rapidement |
| `ConnectorError: ... requires bearer authentication` | Connector bearer-only sans credential stockée | Ajouter un bearer dans Studio ; **pas de bearer « à la volée »** |
| `ConnectorError: Extension bindings reference unknown connectors` | `ConnectorSlot` runtime nommant un slot non déclaré | Aligner `connector_name` sur un slot du workflow |
| Pas de MCP app après `call_tool()` | Slot sans `allow_mcp_ui=True`, outil sans ressource `ui://` app-visible, appel indirect, ou surface non compatible | Activer l'option, appeler directement, vérifier les métadonnées |
| `404` sur execute | Worker non démarré ou nom de workflow erroné | Démarrer le worker, vérifier le `workflow_identifier` exact |

### 3.20 Durable agents

**Définition** : agent LLM dont la boucle (appels modèle, outils, handoffs) tourne **dans un workflow** → état préservé aux crashs/redémarrages. Plugin `mistralai-workflows[mistralai]` ; primitives `Agent`, `Runner`, `RemoteSession`, `LocalSession` (expérimental). Import usuel : `import mistralai.workflows.plugins.mistralai as workflows_mistralai`.

**Apports** : durabilité ; **activités utilisables directement comme outils** (la docstring `Args:` documente les paramètres) ; handoffs multi-agents ; MCP (stdio, SSE, Streamable HTTP) ; télémétrie via `get_mistral_client()`.

**`Agent(...)`** — paramètres relevés :

| Paramètre | Rôle |
|---|---|
| `id` | ID d'un agent distant existant à réutiliser (sinon création) |
| `model` | Ex. `"mistral-medium-latest"` |
| `name` | Nom de l'agent |
| `description` | Sert aussi aux décisions de handoff (description des spécialistes) |
| `instructions` | Instructions système (guident aussi le coordinateur pour les handoffs) |
| `tools` | Liste d'activités et/ou d'outils intégrés (`WebSearchTool()`…) |
| `handoffs` | Liste d'agents vers lesquels déléguer |
| `mcp_clients` | Liste de configs MCP (`MCPStdioConfig`, `MCPSSEConfig`, `MCPStreamableHTTPConfig`) |
| `connectors` | Liste de Connector slots (page Connectors) ; un seul `run_as` par agent |

**`Runner.run(agent=..., inputs=..., session=..., max_turns=10)`** : appelle le modèle, traite les tool calls, boucle jusqu'à une réponse finale ou `max_turns` (alors renvoie les sorties collectées). Retourne une **liste d'items de sortie** (textes, résultats d'outils, résultats de handoff) ; extraction du texte : filtrer `isinstance(output, TextChunk)` (`from mistralai.client.models import TextChunk`). (La page Connectors utilise `result.final_output`.)

**Sessions** :

| Session | Usage | Backend | Comportement |
|---|---|---|---|
| `RemoteSession()` | **Production (recommandé)** | Mistral **Agents SDK** | Crée paresseusement l'agent côté serveur (ou réutilise si `agent.id`) et délègue les complétions ; intégration Agents complète, création/maj auto, état de conversation géré |
| `LocalSession()` | Expérimental / on-prem | API **chat completions** directe | Boucle dans le processus worker ; pour on-prem/cloud privé sans API Agents, dev/test, contrôle total du contexte ; `:::warning` peut être retiré |

**Cycle de vie des agents distants** (`RemoteSession`) : à l'initialisation d'une conversation, parcourt **tout le graphe de handoffs** : `Agent(id=None)` → `beta.agents.create()`, ID stocké sur l'objet (réutilisé si **même instance**) ; `Agent(id="existing-id")` → `beta.agents.update()`. `:::warning` : les agents créés **ne sont pas nettoyés** ; sans `id`, un nouvel agent distant est créé **à chaque exécution**.

**Handoffs** : `handoffs=[interest_rate_agent]` ; le modèle décide de déléguer selon la requête, les `instructions` du coordinateur et les `description` des spécialistes ; conversation de handoff gérée automatiquement.

**MCP** :

| Config | Champs | Notes |
|---|---|---|
| `MCPStdioConfig` | `command`, `args`, `name`, `env_mapping` | Serveur local en ligne de commande (ex. `npx -y @modelcontextprotocol/server-everything`). `env_mapping={"NOTION_TOKEN": "NOTION_TOKEN_BOT_A"}` : variable du sous-processus ← variable du worker |
| `MCPSSEConfig` | `url`, `timeout` (ex. 60), `name`, `headers` (optionnel) | Serveur distant SSE |
| `MCPStreamableHTTPConfig` | `url`, `name`, `auth_token_env`, `header_mapping`, `headers`, `follow_redirects` (défaut `False`) | Transport Streamable HTTP (`--transport http`) ; requiert `mistralai>=2.8.0` |

Sécurité des secrets : les entrées d'activités étant persistées dans l'historique, on passe des **noms de variables** (seuls sérialisés) ; les valeurs sont lues dans l'environnement du worker et ne le quittent jamais ; variable manquante → **échec immédiat** de l'activité ; permet plusieurs instances d'un même serveur avec des credentials différentes. `auth_token_env` → `Authorization: Bearer <valeur>` ; `header_mapping={"Notion-Token": "NOTION_TOKEN_BOT_A"}` ; `headers` statiques réservés aux valeurs non secrètes. **Redirections** : non suivies par défaut ; `httpx` ne retire `Authorization` que sur les sauts cross-origin, donc les en-têtes secrets de `header_mapping` seraient renvoyés à la cible ; n'activer `follow_redirects=True` que si nécessaire (ex. `/mcp` → `/mcp/`) et pour des hôtes de confiance.

**Outils intégrés** (exécutés **côté serveur Mistral**, pas dans le worker ; `from mistralai.client.models import WebSearchTool`…) : `WebSearchTool()`, `CodeInterpreterTool()`, `ImageGenerationTool()`, `DocumentLibraryTool()`. `:::warning` : **exigent `RemoteSession`** — `LocalSession` les **ignore silencieusement** (log d'avertissement).

**Exemple complet** : `DealAnalysisWorkflow` avec un `risk_agent` (outil `calculate_risk_score`) et un `coordinator` (handoffs), worker lancé par `asyncio.run(workflows.run_worker([DealAnalysisWorkflow]))`.

**Observabilité** : mêmes événements workflow/activity que tout workflow (streaming + historique).

**Bonnes pratiques** : `RemoteSession` en prod ; fixer `agent.id` pour réutiliser ; encapsuler les effets de bord des outils dans des activités (isolation de retry, visibilité dans l'historique).

### 3.21 Plugins

- **Définition** : paquets Python standard exposant workflows, activities et dépendances réutilisables sous le namespace **`mistralai.workflows.plugins`** (réservé aux plugins supportés par Mistral, `:::note`).
- **Plugin Mistral AI** — paquet `mistralai-workflows-plugins-mistralai` :

| Activité | Rôle |
|---|---|
| `mistralai_chat_complete` | Chat completion mono-tour |
| `mistralai_chat_stream` | Chat completion en streaming |
| `mistralai_chat_parse` | Chat completion avec parsing de sortie structurée |
| `mistralai_embeddings` | Embeddings |
| `mistralai_ocr` | OCR images/documents |
| `mistralai_create_agent` / `mistralai_update_agent` | Créer / mettre à jour un agent distant |
| `mistralai_start_conversation` / `mistralai_start_conversation_stream` | Démarrer une conversation d'agent (avec/sans streaming) |
| `mistralai_append_conversation` / `mistralai_append_conversation_stream` | Ajouter des messages à une conversation (avec/sans streaming) |

| Composant | Rôle |
|---|---|
| `Agent`, `Runner`, `LocalSession`, `RemoteSession` | Voir 3.20 |
| `MCPStdioConfig`, `MCPSSEConfig` | Configs MCP |
| `MCPConfig` | Alias d'union `MCPStdioConfig \| MCPSSEConfig` |
| `collect_mcp_tools` | Activité : collecter les définitions d'outils d'un ou plusieurs serveurs MCP |
| `execute_mcp_tool` | Activité : exécuter un outil nommé sur son serveur MCP |
| `get_mistral_client` | Dépendance : client `mistralai.Mistral` configuré (auth, télémétrie, métadonnées) |

Exemple : `ChatCompletionRequest(model="mistral-large-latest", messages=[UserMessage(content=...)])` puis `result = await mistralai_chat_complete(request)` et `result.choices[0].message.content` (imports depuis `mistralai.workflows.plugins.mistralai`).
- **Plugin Evaluation** — `mistralai-workflows-plugins-evaluations` : évaluations offline dans un workflow ; **chaque enregistrement dans son propre child workflow**, tâche et scorers en **activités parallèles**, résultats envoyés à Studio. Composants : `evaluation.run`, `evaluation.rescore` (re-scorer un run persisté sans relancer la tâche), `evaluation.optimize` (recherche de meilleurs prompts/paramètres), décorateurs `evaluation.task` / `evaluation.scorer`.
- **Installation** : `pip install mistralai-workflows`, `pip install mistralai-workflows-plugins-mistralai`, `pip install mistralai-workflows-plugins-evaluations`.
- **Bibliothèques internes** : package à son propre nom de premier niveau (ex. `acme-workflows/` avec `acme_workflows/activities.py`, `workflows.py`, `tests/`), `pyproject.toml` hatchling avec dépendance `mistralai-workflows>=2.0.0`, puis import direct (`from acme_workflows.activities import my_custom_activity`).

### 3.22 Streaming : publication d'événements (`Task`)

- **But** : diffuser en temps réel depuis activités/workflows (UI live, barres de progression, tokens LLM).
- **API** : `from mistralai.workflows.core.task import Task` ; dans une activité, `async with Task(type="token-stream", state=initial_state) as task:` ; `await task.update_state({...})` publie le nouvel état comme événement à tous les abonnés ; `task.state` lit l'état courant. `type` = **nom de topic** choisi ; `state` = payload initial.
- `:::tip` **Événement terminal à la sortie** : à la sortie du bloc `async with`, la task est marquée terminée et un événement terminal est publié ; aucun `close()`/`complete()` à appeler.
- **Patterns** : streaming de tokens (accumuler `chunk.choices[0].delta.content`) ; progression (`processed_words`, `progress_idx`, `progress_total`).
- **Nommage des types** : décrire le **contenu** (`token`, `progress`, `search_result`) plutôt que `data`, `Stream1`, `myStream` ; minuscules avec underscores, courts, cohérents.
- **Limite** : **1 Mo par message** de streaming (distinct des 2 Mo d'I/O d'activité) ; pour du volumineux, stocker ailleurs et streamer une **référence** (`{"url": url, "size": ...}`).
- **Schéma d'un événement publié** : `stream` (nom du topic), `broker_sequence` (séquence monotone), `timestamp` (ISO), `data` (réponse typée, union discriminée par `event_type`, ex. `CUSTOM_TASK_IN_PROGRESS`, avec `event_id`, `event_timestamp`, `workflow_name`, `workflow_exec_id`, `root_workflow_exec_id`, `parent_workflow_exec_id`, `workflow_run_id`, `attributes`), `workflow_context` (`workflow_name`, `workflow_exec_id`, `parent_workflow_exec_id`).
- **Garanties `broker_sequence`** : **ordonné** (jamais une séquence plus basse après une plus haute) ; **unique** (jamais réutilisé, même après expiration des événements) ; **reprise sûre** (`start_seq=N` reprend exactement à N, sans saut ni re-livraison d'avant N) ; **durable** (valable à travers redémarrages et reconnexions ; si le flux a été interrompu, les événements historiques sont rejoués dans l'ordre avant le live). Reconnecter avec `event.broker_sequence + 1`.

### 3.23 Consommation des événements de streaming

**Deux voies** : client SDK (recommandé : modèles Pydantic typés, aides à la reconnexion, filtrage, reprise par séquence) ou endpoints SSE bruts (clients non-Python).

**SDK** : `client.workflows.events.get_stream_events(...)` (itérateur async). Paramètres montrés : `workflow_exec_id`, `root_workflow_exec_id`, `start_seq`, `stream`, `scope`. Chaque `event` expose `stream`, `data` (peut être `None` → ignorer), `broker_sequence`, `workflow_context`. Détecter la fin : `event.data.event_type == "WORKFLOW_EXECUTION_COMPLETED"` (ou `FAILED` / `CANCELED`) puis `break`.

**Reprise** : `start_seq=N` est **inclusif** → après chaque événement, `last_seq = event.broker_sequence + 1` ; boucle `while True` avec `try/except ConnectionError` + `asyncio.sleep(1)`. Bonne pratique : backoff exponentiel `min(2 ** attempt, 30)` sur 10 tentatives ; `is_terminal_status()` est un helper **à écrire soi-même**.

**Endpoints SSE** :

`GET /v1/workflows/executions/{execution_id}/stream` (une exécution) :

| Paramètre | Description |
|---|---|
| `event_source` | Filtre optionnel par source (la doc cite `workflow`, `activity` ; la spec type ce paramètre en enum `DATABASE`/`LIVE`/`HYBRID`) |
| `last_event_id` | Reprise après un numéro de séquence (↔ `start_seq`) ; aussi via l'en-tête standard SSE `Last-Event-ID` |

`GET /v1/workflows/events/stream` (filtrage multi-exécutions — dashboards, outils d'observabilité, arbre parent + descendants) :

| Paramètre | Description | Défaut (spec) |
|---|---|---|
| `scope` | `workflow`, `activity` ou `*` | `*` |
| `stream` | Nom de stream (ex. `token`) | `*` |
| `workflow_name` | Nom du workflow | `*` |
| `workflow_exec_id` | ID d'exécution | `*` |
| `root_workflow_exec_id` | ID d'exécution racine | `*` |
| `parent_workflow_exec_id` | ID d'exécution parente | `*` |
| `activity_name` | Nom d'activité | `*` |
| `activity_id` | ID d'exécution d'activité | `*` |
| `start_seq` | Reprise depuis une séquence | `0` |
| `metadata_filters` | Objet JSON de filtres de métadonnées | — |
| `workflow_event_types` | Types d'événements workflow (ex. `WORKFLOW_EXECUTION_COMPLETED`) | — |
| en-tête `last-event-id` | Reprise SSE (spec) | — |

Réponse SSE : lignes `data: {"stream":"token","data":{"event_type":"CUSTOM_TASK_IN_PROGRESS",...},"broker_sequence":1,"workflow_context":{...}}`. Exemples curl : `-N` + `?workflow_exec_id=${EXEC_ID}&stream=token`, `&scope=activity`, `&scope=workflow`.

**Arbres de workflows** : chaque événement porte `workflow_context` avec `workflow_exec_id`, `parent_workflow_exec_id`, `root_workflow_exec_id` ; s'abonner avec `root_workflow_exec_id=parent_execution_id` reçoit le parent **et tous ses descendants** ; distinguer via `event.workflow_context.parent_workflow_exec_id`.

**Types d'événements de streaming** : modèles Pydantic discriminés par `event_type` (ex. `WorkflowExecutionCompletedResponse`, `CustomTaskInProgressResponse`) avec `event_id`, `event_timestamp`, `workflow_exec_id`, `workflow_name`, `attributes`. Liste (17 valeurs, identique à l'enum `WorkflowEventType` de la spec) : les 11 types d'historique (3.9) + `CUSTOM_TASK_STARTED`, `CUSTOM_TASK_IN_PROGRESS`, `CUSTOM_TASK_COMPLETED`, `CUSTOM_TASK_FAILED`, `CUSTOM_TASK_TIMED_OUT`, `CUSTOM_TASK_CANCELED` (émis depuis les activités via `Task`).

**Bonnes pratiques** : toujours gérer la déconnexion ; **filtrer à la source** (`stream="token"` dans l'abonnement plutôt que filtrer en code — économie de bande passante) ; utiliser `scope="activity"` si seuls les événements d'activité comptent.

### 3.24 Child workflows (sub-workflows)

**Quand préférer un child workflow à une activité** :

| Child workflow si… | Activity si… |
|---|---|
| L'unité est longue, a ses propres retries ou a besoin de son propre historique rejouable indépendamment | Effet de bord unique (écriture BD, appel API/LLM) à retenter comme un tout |
| On veut l'inspecter, le signaler ou l'interroger de l'extérieur | Pas besoin d'observabilité au-delà de l'historique du parent |
| On veut l'exécuter sur un autre worker / deployment | Le worker parent peut l'exécuter directement |

Les child workflows sont **plus lourds** (ligne d'exécution, historique, retry policy propres) : commencer par une activité.

**API** : `await workflow.execute_workflow(ChildWorkflow, params=child_params, execution_timeout=timedelta(hours=1))` (aussi écrit `workflows.workflow.execute_workflow(...)` ou `workflows.execute_workflow(...)` dans les exemples).

| Paramètre | Effet |
|---|---|
| 1er argument | Classe du workflow enfant |
| `params` | Entrée de l'enfant (ex. `ChildInput(value=...)`) |
| `execution_timeout` | Timeout total de l'enfant |
| `wait` | `True` (implicite) : attend le résultat ; `False` : fire-and-forget, renvoie un `handle` (on peut `await handle` plus tard) |
| `parent_close_policy` | `ParentClosePolicy.*` (`from mistralai.workflows import ParentClosePolicy`) ; avec `wait=False`, défaut **`ABANDON`** (l'enfant continue si le parent se termine) ; `TERMINATE` montré en surcharge |

**Observation** : chaque enfant a son propre `execution_id` et historique ; ses événements portent `parent_workflow_exec_id` et `root_workflow_exec_id`. Pour un workflow de premier niveau, `parent_workflow_exec_id` = `null` et `root_workflow_exec_id` = son propre ID.

### 3.25 Attente de conditions (`wait_condition`)

- **API** : `await workflow.wait_condition(lambda: self.ready, timeout=timedelta(minutes=5))` ; le workflow reste **suspendu sans coût de calcul** jusqu'à ce que le prédicat soit vrai ou que le timeout expire → `asyncio.TimeoutError` (la page Workflows dit `TimeoutError`).
- **Prédicat** typiquement basculé par un **signal** externe (API, autre service, action UI).
- **Patterns** : flux d'approbation (signal), callback externe (webhook tiers / job), polling avec backoff (rare ; mieux exprimé comme une activité qui poll).
- **Exemple d'approbation** : `__init__` met `self.approved = False` ; `@workflows.workflow.signal(name="approve")` met `True` ; l'entrypoint attend jusqu'à **24 h** et renvoie « timed out » sur `asyncio.TimeoutError`.
- `:::tip` : pour une interaction de type chat, préférer **`wait_for_input()`** de `InteractiveWorkflow` (invite + attente de réponse, formulaires structurés, confirmations, timeouts intégrés, sans définir de signal ni de prédicat).

### 3.26 Continue-as-new

- **Quand** : workflows itérant indéfiniment ; historique approchant les limites (~50K événements ou 50 Mo) ; workflows de semaines/mois.
- **Fonctionnement** : `continue_as_new()` termine le run courant et en démarre un neuf depuis le début avec l'état fourni ; l'historique est remis à zéro. **La méthode `run` doit accepter l'état reporté en paramètres.**
- **API** : `workflows.workflow.should_continue_as_new()` → `True` quand l'historique approche du plafond ; `workflows.workflow.continue_as_new(state)`.
  ```python
  @workflows.workflow.define(name="long-running-processor")
  class LongRunningProcessor:
      @workflows.workflow.entrypoint
      async def run(self, page: int = 0, total_processed: int = 0):
          while True:
              result = await process_page(page)
              total_processed += result.count
              page += 1
              if workflows.workflow.should_continue_as_new():
                  workflows.workflow.continue_as_new(
                      ProcessorState(page=page, total_processed=total_processed))
  ```
- Rappel : `execution_timeout` couvre aussi les itérations continue-as-new ; statut `CONTINUED_AS_NEW` et événement `WORKFLOW_EXECUTION_CONTINUED_AS_NEW`.

### 3.27 Scheduling

- **Principe** : exécutions récurrentes sur **cron**, **intervalle** ou **calendrier**. Les schedules sont **stockés par la plateforme**, persistent aux redémarrages des workers et se gèrent **indépendamment du code worker** (création/listing/suppression sans redémarrer). Des politiques de chevauchement et de rattrapage gèrent les runs manqués ou concurrents. Gestion aussi possible dans AI Studio (`https://console.mistral.ai/build/workflows/schedules`) : créer, éditer, supprimer, pause, reprise, déclenchement.
- `:::note` : l'ancienne approche `@workflow.define(schedules=[...])` est **dépréciée**.

**Création** (SDK async montré : `await client.workflows.schedules.schedule_workflow(...)`, avec `from mistralai.client import Mistral, models`) :
```python
response = await client.workflows.schedules.schedule_workflow(
    workflow_identifier="report-workflow",
    deployment_name="production",
    schedule=models.ScheduleDefinition(
        input={"report_type": "daily"},
        calendars=[models.ScheduleCalendar(
            hour=[models.ScheduleRange(start=9)],
            minute=[models.ScheduleRange(start=0)],
        )],  # tous les jours à 9:00 UTC
    ),
)
print(response.schedule_id)
```
Équivalent REST : `POST /v1/workflows/schedules` avec `{"workflow_identifier", "deployment_name", "schedule": {...}}`.
- `workflow_identifier` : `name` du `@workflow.define` **ou** un ID d'enregistrement de workflow.
- `deployment_name` : optionnel ; **requis s'il existe plus d'un deployment nommé** pour le workflow ; sinon deployment par défaut (erreur s'il y en a plusieurs).
- Spec (`WorkflowScheduleRequest`) : champs supplémentaires `workflow_registration_id`, `workflow_version_id`, `workflow_task_queue`, `schedule_id` (tous optionnels).

**`ScheduleDefinition`** (doc + spec) :

| Champ | Type | Défaut | Effet |
|---|---|---|---|
| `input` | objet | **requis** (spec) | Entrée passée à l'entrypoint à chaque run |
| `calendars` | `list[ScheduleCalendar]` | — | Spécification calendrier (**recommandée**, représentation native) |
| `intervals` | `list[ScheduleInterval]` | — | Intervalles fixes |
| `cron_expressions` | `list[str]` | — | Cron 5 champs (`minute hour day-of-month month day-of-week`), convertis en calendars côté serveur |
| `skip` | `list[ScheduleCalendar]` | — | Instants calendaires à exclure |
| `start_at` / `end_at` | datetime | — | Fenêtre de validité (premier / dernier run possible) |
| `jitter` | durée ISO 8601 | — | Délai aléatoire dans `[t, t + jitter)`, sans dépasser le prochain run |
| `time_zone_name` | str (IANA) | UTC | Fuseau (ex. `"Europe/Paris"` ; spec : `US/Central`) |
| `policy` | `SchedulePolicy` | — | Politiques (voir plus bas) |
| `max_executions` | int \| null | `null` (illimité) | Arrêt automatique après N runs |
| `schedule_id` | str | — | Identifiant (spec) |

`calendars`, `intervals` et `cron_expressions` se **combinent librement** : un run part dès qu'**une** spec correspond ; chaque spec active déclenche indépendamment.

**`ScheduleCalendar`** : correspond quand **tous** ses champs correspondent simultanément ; chaque champ est une liste de `ScheduleRange(start, end, step)`.

| Champ | Plage | Défaut (spec) |
|---|---|---|
| `second` | 0–59 | `[{start:0,end:0,step:0}]` |
| `minute` | 0–59 | `[{start:0,end:0,step:0}]` |
| `hour` | 0–23 | `[{start:0,end:0,step:0}]` |
| `day_of_month` | 1–31 | `[{start:1,end:31,step:0}]` |
| `month` | 1–12 | `[{start:1,end:12,step:0}]` |
| `year` | — | `[]` |
| `day_of_week` | 0–6 (**0 = dimanche**) | `[{start:0,end:6,step:0}]` |
| `comment` | str (spec) | — |

`ScheduleRange` : `start` requis ; `end` et `step` défaut `0` (spec). Exemples : `ScheduleRange(start=9)` = exactement 9 ; `(start=1, end=5)` = 1 à 5 inclus ; `(start=0, end=59, step=15)` = 0, 15, 30, 45. Lun–ven 9:30 UTC : `hour=[9]`, `minute=[30]`, `day_of_week=[{start:1,end:5}]`.

**`ScheduleInterval`** : `every` (requis, durée ISO 8601 : `PT30M`, `PT1H`, `PT4H`, `P1D`, `PT2H30M`) et `offset` optionnel. `every="PT4H", offset="PT30M"` → 00:30, 04:30, 08:30, 12:30, 16:30, 20:30 UTC (sans offset : sur les frontières 00:00, 04:00…).

**Cron** : `cron_expressions=["0 9 * * 1-5"]` (9 h UTC lun–ven) ; `:::note` utiliser `calendars` pour ranges/steps/valeurs multiples que cron exprime mal.

**Bornage et exclusion** : `start_at=datetime(2026, 1, 1, 9, 30, tzinfo=timezone.utc)`, `end_at=...` ; `skip=[ScheduleCalendar(month=[12], day_of_month=[25])]` (sauter le 25 décembre). En REST, dates ISO (`"2026-01-01T09:30:00Z"`).

**`SchedulePolicy`** :

| Champ | Défaut | Effet |
|---|---|---|
| `overlap` | `1` (`SKIP`) | Que faire si un run est dû alors que le précédent tourne encore |
| `catchup_window_seconds` | `31536000` (365 j) | Jusqu'où rattraper rétroactivement les runs manqués après une panne plateforme ; au-delà, ignorés |
| `pause_on_failure` | `false` (spec) | Met le schedule en pause si un run déclenché échoue ; reste en pause jusqu'à reprise manuelle via l'API |

**`ScheduleOverlapPolicy`** (entiers 1–6 en REST, énum en SDK) :

| Valeur | Nom | Comportement |
|---|---|---|
| `1` | `SKIP` | Abandonne le nouveau run (**défaut**) ; jobs de sync où seule la donnée la plus récente compte |
| `2` | `BUFFER_ONE` | Met un run en attente, abandonne les suivants jusqu'à son démarrage ; garantit une relance sans backlog |
| `3` | `BUFFER_ALL` | Met en file tous les runs ; backlog potentiellement non borné (prudence) |
| `4` | `CANCEL_OTHER` | Annule gracieusement l'exécution en cours et démarre la nouvelle |
| `5` | `TERMINATE_OTHER` | Termine de force l'exécution en cours et démarre la nouvelle |
| `6` | `ALLOW_ALL` | Lance tous les runs en parallèle (runs totalement indépendants) |

**Jitter** : ex. `intervals=[ScheduleInterval(every="PT1H")]`, `jitter="PT5M"` → départ aléatoire entre l'heure pile et +5 min ; sert à étaler la charge (centaines de schedules horaires à `:00`).

**Max executions** : `cron_expressions=["0 9 * * 1"]`, `max_executions=4` → chaque lundi pendant 4 semaines puis arrêt.

**Gestion** (SDK `client.workflows.schedules.*` ↔ REST) :

| Opération | SDK | REST |
|---|---|---|
| Créer | `schedule_workflow(workflow_identifier, deployment_name, schedule)` → `schedule_id` | `POST /v1/workflows/schedules` |
| Lister (tous les schedules des workflows actifs du workspace) | `get_schedules()` → `response.schedules[*].schedule_id`, `.workflow_name` | `GET /v1/workflows/schedules` |
| Lire | `get_schedule(schedule_id)` → spec complète, `.paused`, `.future_executions` | `GET /v1/workflows/schedules/{schedule_id}` |
| Mettre à jour (seuls les champs fournis changent) | `update_schedule(schedule_id, schedule=models.PartialScheduleDefinition(...))` | `PATCH /v1/workflows/schedules/{schedule_id}` corps `{"schedule": {...}}` |
| Pause / reprise | `pause_schedule(schedule_id, note=...)` / `resume_schedule(schedule_id, note=...)` | `POST .../{schedule_id}/pause` et `/resume` corps `{"note": "..."}` |
| Supprimer | `unschedule_workflow(schedule_id)` | `DELETE /v1/workflows/schedules/{schedule_id}` |
| Déclencher maintenant | `trigger(schedule_id, overlap=models.ScheduleOverlapPolicy.ALLOW_ALL)` | `POST .../{schedule_id}/trigger` corps `{"overlap": 6}` (optionnel) |

Déclenchement manuel : par défaut la politique d'overlap du schedule s'applique (avec `SKIP` et un run actif, le déclenchement est **abandonné**) ; `overlap` surcharge pour ce seul déclenchement (`ALLOW_ALL` = immédiat quoi qu'il arrive).

**Déprécié : schedules dans le décorateur** (`:::warning`) — `from mistralai.workflows.models import ScheduleDefinition, SchedulePolicy, ScheduleOverlapPolicy` puis `@workflows.workflow.define(name=..., schedules=[schedule])`. Deux problèmes : (1) changement de schedule = **redémarrage du worker** (lu une fois au démarrage) ; (2) **conflits multi-workers** : chaque instance enregistre sa copie ; deux configs différentes → registrations conflictuelles, comportement **indéfini**. Migration : appeler `schedule_workflow()` depuis l'extérieur du worker (script de déploiement, control plane), puis retirer `schedules=[...]`.

**Notes** : UTC par défaut ; chaque schedule porte son propre `input`.

### 3.28 Search keys

- **Définition** : paires clé/valeur attachées à une **exécution** (métadonnées), extraites de l'entrée ou ajoutées en cours de run, pour filtrer via `GET /v1/workflows/runs` ou la vue **Executions** de Studio.
- `:::warning` : valeurs stockées **non chiffrées** (pour être cherchables) — ne pas indexer de champs sensibles.

**Indexer depuis l'entrée** : `@workflows.workflow.define(name="order_processor", search_keys=["order_id", "customer_tier"])` ; chemins pointés **validés au démarrage du worker**, extraits au début de chaque run.

| Signature d'entrypoint | Racine des chemins | Exemple |
|---|---|---|
| Un seul paramètre `BaseModel` | Les champs du modèle | `order_id`, `customer_tier` |
| Plusieurs paramètres | Les noms de paramètres (modèle enveloppe généré) | `payload.order_id`, `context.tenant` |
| Un seul paramètre scalaire | Le nom du paramètre | `city` |

Champs avec défaut : le défaut est utilisé si omis. Le chemin doit aboutir à un **scalaire** (union de scalaires ou `Optional[scalar]` admis) ; traverse des attributs de modèles mais **pas d'indices de liste ni de clés de dict**.

**Ajouter en cours de run** : `await workflows.workflow.add_search_keys({"customer.tier": customer.tier})` (depuis le workflow **ou une activité**) ; l'`await` confirme la persistance ; clés existantes **écrasées** ; valeur `None` = clé présente mais nulle. **Supprimer** : `await workflows.workflow.delete_search_keys(["customer.tier"])` (libère des places dans le budget de 20 ; idempotent).

**Règles** :
- Clé non vide, sans `:`, ne finissant pas par `=`, sans espaces en bordure, ne commençant pas par le préfixe réservé `internal.`, **≤ 256 caractères**.
- Valeurs converties en chaînes : enums → leur valeur ; booléens en minuscules ; dates/datetimes ISO 8601 ; sinon `str()`.
- Valeurs **> 8192 caractères tronquées**.
- **20 clés max par exécution** ; `add_search_keys` accepte **20 clés max par appel**.

**Comportement en cas d'échec** : un échec de stockage **ne fait jamais échouer** l'exécution — 3 tentatives sur erreurs transitoires (5xx, 429, 408, timeouts), puis warning et poursuite ; rejets permanents loggés en erreur et ignorés (« un déploiement serveur peut en produire à l'échelle de la flotte en cours de run ») ; au plafond de 20, les nouvelles clés sont ignorées (la réponse serveur indique clés ignorées/tronquées). En revanche, des **clés invalides** (vides, avec `:`, finissant par `=`, préfixe `internal.`, > 256 car., > 20 par appel) lèvent une **erreur non retentable** et **font échouer l'exécution** ; idem pour une erreur in-process inattendue (valeur non convertible). Préférer des clés littérales plutôt que construites depuis des données non fiables.

**Requête** : paramètre répété `search_key` sur `GET /v1/workflows/runs` ; correspondance de clé exacte ; entrées combinées en **ET** ; **3 entrées max** par requête (spec : `maxItems: 3`, motif `^(?:[^:]+==:.+|[^:]+==|[^:]+:.+|[^:]+)$`).

| Entrée | Correspond à |
|---|---|
| `key:value` | Valeur **similaire** à `value` (flou) |
| `key==:value` | Valeur **égale octet par octet** |
| `key` | Clé présente |
| `key==` | Clé présente et nulle |

Exemple : `?search_key=order_id:12345&search_key=customer_tier==:premium`. Spec : `WorkflowExecutionResponse.search_keys` renvoyé « si demandé via `include_search_keys` ».

### 3.29 Tags de workflow

- Chaînes filtrables attachées aux **définitions** de workflows (pas aux exécutions), visibles dans l'UI AI Studio et l'API.
- Créés **vides à l'enregistrement par le worker** ; posés ensuite via `PUT /v1/workflows/{workflow_identifier}` corps `{"tags": ["ocr", "document-processing"]}`. **Remplace** la liste ; liste vide = tout effacer ; omettre `tags` = inchangé. (Spec `WorkflowUpdateRequest` : aussi `display_name` ≤ 128 car., `description`, `available_in_chat_assistant`.)
- Filtre : `GET /v1/workflows?tags=ocr&tags=document-processing` — sémantique **ET** (tous les tags requis).
- Validation : ≤ **100 caractères** par tag ; espaces retirés aux extrémités ; tags vides (y compris blancs) rejetés ; doublons dédupliqués silencieusement ; **pas de limite de nombre**.
- (Spec : `GET /v1/workflows/runs` accepte aussi `workflow_tags`, `maxItems: 20`.)

### 3.30 Payload offloading

**Contexte** : limite de **2 Mo** sur entrées de workflow, entrées et sorties d'activités (pour garder l'orchestration rapide et prévisible). Pattern recommandé : **passer des références** (clé d'objet, ID de ligne, ID de document). Deux aides SDK, **côté worker, configurées par deployment** :

| Problème | Solution |
|---|---|
| I/O d'activité > 2 Mo, manipulée uniquement dans les activités | **Activity field offloading** (*recommandé*) |
| Entrée de workflow ou I/O d'activité > 2 Mo, manipulée dans le code workflow | **Payload offloading** |

`:::tip` : si les grosses données peuvent rester dans les activités (cas le plus courant), utiliser le field offloading — aucun coût au replay.

**Prérequis** : extras `mistralai-workflows[s3|azure|gcs|storage]` ; un bucket/container accessible par **tous** les workers. `:::warning` **définir une politique d'expiration** : Workflows **ne supprime pas** les payloads offloadés ; aligner sur la rétention des workflows (**défaut 30 jours**) ; blobs **préfixés par namespace** (politiques par namespace possibles).

**Activity field offloading** :
- `from mistralai.workflows.core.encoding.fields_offloader import OffloadableModel, OffloadableField` ; modèle héritant d'`OffloadableModel`, champ `transcript: OffloadableField[str] = OffloadableField(value="")`.
- Dans l'activité : lire via `.get_value()`, renvoyer `OffloadableField(value=text)` ; upload/download **dans le contexte de l'activité** (soumis à ses timeouts).
- Dans le workflow : **ne pas appeler `.get_value()`** (valeur possiblement non locale) ; passer l'objet tel quel à l'activité suivante.
- Valeurs accessibles **uniquement dans les activités**. Chaque `OffloadableField` = **un blob séparé** (un aller-retour) → regrouper les champs lus ensemble dans un modèle (`OffloadableField[LargeContext]` = un blob, trois champs).
- Config worker (la présence du bloc storage **active** la fonctionnalité ; pas de flag `ENABLED` ; seuil par défaut 1 Mo) :

| Fournisseur | Variables `ACTIVITY_ATTRIBUTES_OFFLOADING__…` |
|---|---|
| Commun | `MIN_SIZE_BYTES=1048576` |
| Azure | `STORAGE_CONFIG__STORAGE_PROVIDER=azure`, `STORAGE_CONFIG__CONTAINER_NAME`, `STORAGE_CONFIG__AZURE_CONNECTION_STRING` |
| S3 | `STORAGE_CONFIG__STORAGE_PROVIDER=s3`, `STORAGE_CONFIG__BUCKET_NAME`, `STORAGE_CONFIG__REGION_NAME` (opt.), `STORAGE_CONFIG__AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (opt. ; sinon chaîne de credentials AWS par défaut) |
| GCS | `STORAGE_CONFIG__STORAGE_PROVIDER=gcs`, `STORAGE_CONFIG__BUCKET_ID` ; credentials via ADC |

**Payload offloading (échappatoire « payload entier »)** :
- Le SDK déporte automatiquement tout payload **> 2 Mo** ; la plateforme stocke une référence ; les workers téléchargent à la demande.
- `:::warning` **coût au replay** : chaque payload offloadé est **re-téléchargé** à chaque replay (redémarrage, reprise après crash) → risques de timeouts d'activités et de blocage des workers ; préférer le field offloading pour les chemins chauds.
- Configuration **côté client ET worker**. Responsabilités du client : créer/gérer le bucket, les credentials, l'accès **commun client + worker**, la politique d'expiration.
- Worker : mêmes variables que ci-dessus mais préfixe **`TEMPORAL_PAYLOAD_OFFLOADING__STORAGE_CONFIG__…`** (pas de `MIN_SIZE_BYTES` montré) ; présence du bloc = activé.
- Client :
  ```python
  from mistralai.client import Mistral
  from mistralai.extra.workflows.encoding import PayloadOffloadingConfig, BlobStorageConfig

  client = Mistral(
      api_key="your_api_key",
      workflow_payload_offloading=PayloadOffloadingConfig(
          storage_config=BlobStorageConfig(storage_provider="s3",
              bucket_name="workflow-payloads", region_name="us-east-1"),
      ),
  )
  ```
  `BlobStorageConfig` : `storage_provider` (`"azure"` | `"s3"` | `"gcs"`), `container_name` + `azure_connection_string` (Azure), `bucket_name`, `region_name`, `aws_access_key_id`, `aws_secret_access_key` (S3), `bucket_id` (GCS).

### 3.31 Compression

- Compresse tous les payloads (entrées de workflow, I/O d'activités, données de signals) **avant sortie du worker** ; la plateforme stocke les octets compressés ; décompression transparente au retour. Réduit les octets réseau et ce qui compte dans la **limite de 2 Mo** — un payload repassé sous 2 Mo évite l'offloading (pas d'aller-retour blob ni de coût au replay).
- **Prérequis** : `uv add "mistralai[workflow-payload-compression]"` (tire `zstandard` et `msgpack`, ce dernier stockant les paramètres d'algorithme à côté des octets).
- **Quand compresser** : taille ≥ `min_size_bytes` (**défaut 1 Mo**) **et** résultat plus petit que l'original (sinon octets d'origine envoyés). L'algorithme et le niveau sont enregistrés **dans le payload** : un worker décompresse même avec un niveau configuré différent ou sans compression configurée — pas besoin de synchroniser configs d'encodage et de décodage.
- **Configuration client ET worker**. Worker (présence du bloc = activé, pas de `ENABLED`) :
  - `TEMPORAL_PAYLOAD_COMPRESSION__MIN_SIZE_BYTES=1048576` (défaut)
  - `TEMPORAL_PAYLOAD_COMPRESSION__ALGORITHM_CONFIG__ALGORITHM=zstd` (défaut)
  - `TEMPORAL_PAYLOAD_COMPRESSION__ALGORITHM_CONFIG__LEVEL=3` (1–22, défaut 3 ; plus haut = plus compressé, plus de CPU)
- Client : `await configure_workflow_encoding(WorkflowEncodingConfig(payload_compression=PayloadCompressionConfig(min_size_bytes=1024 * 1024, algorithm_config=ZstdCompressionConfig(level=3))), client=client)` avant `execute_workflow` (imports : `mistralai.extra.workflows` pour `WorkflowEncodingConfig`, `configure_workflow_encoding` ; `mistralai.extra.workflows.encoding` pour `PayloadCompressionConfig`, `ZstdCompressionConfig`).
- **Combinaison** (ordre fixe) : **compresser** (si au-dessus du seuil) → **offloader** (si encore au-dessus du seuil d'offloading) → **chiffrer** en dernier ; décodage dans l'ordre inverse. Config combinée : `WorkflowEncodingConfig(payload_compression=PayloadCompressionConfig(), payload_offloading=PayloadOffloadingConfig(storage_config=BlobStorageConfig(...)), payload_encryption=PayloadEncryptionConfig(mode=PayloadEncryptionMode.FULL, main_key="<hex>"))`.
- **Dépannage** : `WorkflowPayloadCompressionException: Payload compression requires installing mistralai[workflow_payload_compression]` → installer l'extra sur **chaque** worker et client qui encode/décode ; payload > seuil non compressé → zstd n'a pas pu réduire (images, vidéo, archives déjà compressées) — comportement attendu.

### 3.32 Chiffrement

| Mode | Entrée workflow | I/O activités | Stocké en base Mistral |
|---|---|---|---|
| Défaut | clair | clair | oui (clair) |
| Chiffrement | chiffré | chiffré | oui (chiffré) |

- Chiffre tous les payloads (entrées, I/O d'activités, données de signals) avant sortie du worker ; **seuls vos workers peuvent déchiffrer**. Combinable avec offloading et compression (chiffrement en dernier → l'orchestrateur ne voit qu'une **référence chiffrée**).
- **Prérequis** : `uv add "mistralai[workflow-payload-encryption]"` (tire `cryptography`, **AES-GCM**).
- **Clé** : 256 bits — `AESGCM.generate_key(bit_length=256)` puis `key.hex()` ; à stocker dans un gestionnaire de secrets (quiconque a la clé lit les données).
- **Modes** : `full` (tout payload) ; `partial` (seuls les champs typés **`EncryptedStrField`**, `from mistralai.extra.workflows.encoding import EncryptedStrField` — ex. `ssn: EncryptedStrField` à côté de `user_id: str` en clair).
- **Variables worker** : `TEMPORAL_PAYLOAD_ENCRYPTION__MODE=full|partial`, `TEMPORAL_PAYLOAD_ENCRYPTION__MAIN_KEY=<hex>`, `TEMPORAL_PAYLOAD_ENCRYPTION__SECONDARY_KEY=<hex>` (rotation). Côté client (page Compression) : `PayloadEncryptionConfig(mode=PayloadEncryptionMode.FULL, main_key=...)`.
- **Affichage** : les payloads chiffrés apparaissent comme **`<encrypted>`** dans les traces d'exécution et l'UI Studio.
- **Rotation sans interruption** : (1) générer une nouvelle clé ; (2) la promouvoir en `MAIN_KEY` et garder l'ancienne en `SECONDARY_KEY` (déchiffrement des exécutions en vol) ; (3) attendre la fin des workflows démarrés avant rotation — durée = rétention + durée des workflows (**défaut 30 jours**) ; (4) retirer `SECONDARY_KEY`.

### 3.33 `WorkflowsException` et `ErrorCode`

- **Quand** : erreurs **attendues et structurées** que les appelants (autres workflows, activités, consommateurs API) doivent inspecter (entrée invalide, règle métier, mode d'échec connu d'un service externe). Pour les erreurs **inattendues** (`KeyError`, `httpx.ConnectError`…), laisser propager : la plateforme les consigne dans l'historique, applique la retry policy et marque l'exécution en échec si les retries sont épuisés ; tout envelopper « ajoute du bruit sans information ».
- **Apports** : codes structurés (`ErrorCode`), mapping de statut HTTP, sérialisation en réponses JSON, méthodes factory pour cas courants (non détaillées).
- **Import** : `from mistralai.workflows.exceptions import WorkflowsException, ErrorCode`. Exemple : `raise WorkflowsException(code=ErrorCode.INVALID_ARGUMENTS_ERROR, message="Input value cannot be empty", status=http.HTTPStatus.BAD_REQUEST)` ; attrapé côté appelant : `e.code` → `invalid_arguments_error`, `e.message`, `e.status` → `400`.

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `message` | `str` | requis | Message lisible |
| `status` | `HTTPStatus` | `INTERNAL_SERVER_ERROR` | Statut HTTP |
| `code` | `ErrorCode` | `EXECUTION_ERROR` | Code structuré |
| `type` | `str` | `"invalid_request_error"` | Type de premier niveau exposé dans les réponses API (comme le champ `type` des autres API Mistral) |

**Codes `ErrorCode`** (valeurs chaînes ; catégories numérotées dans la doc) :

| Catégorie | Codes |
|---|---|
| Générales (40xx) | `execution_error`, `platform_error`, `platform_service_error`, `platform_connection_error`, `platform_client_creation_error`, `search_attributes_creation_error` |
| Activités (41xx) | `activity_definition_error`, `activity_not_found_error`, `invalid_arguments_error`, `activity_not_module_level` (activité devant être au niveau module), `tool_argument_error`, `rate_limit_error` |
| Workflows (42xx) | `workflow_definition_error`, `workflow_description_error`, `workflow_already_started`, `workflow_not_found`, `invalid_params_error`, `workflow_timeout_error`, `workflow_signal_definition_error`, `workflow_update_definition_error`, `workflow_query_error` |
| Workers (43xx) | `worker_registration_error`, `worker_runtime_config_error` |
| Durable agents (44xx) | `agent_execution_error` |
| Infrastructure (45xx) | `workspace_already_used`, `in_memory_cache_error`, `rejected_query_error`, `unserializable_payload_error`, `blob_storage_config_error` |

---

## 4. Interface utilisateur

Routes console et parcours relevés (périmètre « construction » ; l'UI détaillée d'exécution/observabilité est au chapitre 13) :

| Écran / chemin | URL | Usage relevé |
|---|---|---|
| Console (home) — dialogue clés API | `https://console.mistral.ai/home?profile_dialog=api-keys` | Générer la clé API demandée par `setup` (affichée une seule fois) |
| Studio › **Workflows** (barre latérale) | `https://console.mistral.ai/build/workflows` | Liste des workflows ; sélectionner un workflow (ex. **hello-world**) ; bouton **Start Workflow** / `Start workflow` avec saisie de l'entrée JSON ; formulaire d'entrée **généré depuis la signature** |
| Recherche de workflow | `https://console.mistral.ai/build/workflows?workflowSearch=<nom>` | Lien direct vers `cargo-release-compliance`, `insurance-claims-triage`, `code-modernization`, `linear-weekly-summary` |
| Page d'un workflow | `https://console.mistral.ai/build/workflows/linear-weekly-summary` | Le workflow en attente y affiche l'invite (équipe/projet) à compléter |
| Onglet / vue **Executions** | `https://console.mistral.ai/build/workflows/executions` | Retrouver une exécution, voir sortie, **timeline d'exécution live**, child executions, événements `wait_for_input` (approuver / bloquer / décliner), filtrage par **search keys** |
| **Schedules** | `https://console.mistral.ai/build/workflows/schedules` | Créer, éditer, supprimer, pause, reprise, déclenchement de schedules |
| Studio › **Context › Connectors** | `https://console.mistral.ai/build/connectors` | Créer un connector (ex. **Linear** nommé `linear`) ; onglet **`Credentials`** ; bouton **`+ Add credentials`** ; nommage alphanumérique + tirets ; marquer une credential **par défaut** |
| **Settings › Hardened Deployments** | (URL non donnée) | Durcir un deployment (préalable aux workflows OBO) |
| Boîte de lancement d'un workflow à connectors | — | Choix de la credential nommée pour cette exécution |
| Panneau d'exécution — invite OAuth | — | **Icône de clé orange** quand un connector OAuth2 n'a pas de credentials ; reprise automatique après le flux |
| Affichage des données chiffrées | — | **`<encrypted>`** dans traces et UI |
| UI AI Studio — tags | — | Tags des workflows visibles et filtrables |
| **Vibe Work** | `https://chat.mistral.ai/` | Les workflows apparaissent comme **assistants** invocables en conversation |

Parcours « premier workflow » côté console : workspace de la clé → **Workflows** → **hello-world** → **Start Workflow** (`{"name": ...}`) → **Executions** → vérifier `{"result": "Hello, ...! Welcome to Mistral Workflows."}`.

---

## 5. API et SDK

### 5.1 Endpoints REST cités dans le périmètre

| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/v1/workflows/{workflow_identifier}/execute` | Démarrer une exécution (corps `{"input": {...}}` ; spec : aussi `execution_id` ≤ 256, `wait_for_result` (défaut `false`), `timeout_seconds`, `deployment_name`, `custom_tracing_attributes`, `force_new_trace`, `traceparent`, `extensions`, `task_queue` **déprécié**) ; réponse `WorkflowExecutionResponse` ou `WorkflowExecutionSyncResponse` (`workflow_name`, `execution_id`, `result`) |
| GET | `/v1/workflows/executions/{execution_id}` | État d'une exécution |
| GET | `/v1/workflows/executions/{execution_id}/history` | Historique complet des événements |
| POST | `/v1/workflows/executions/{execution_id}/reset` | Reset (corps `event_id`, `reason`, `exclude_signals`, `exclude_updates`) |
| — | `/cancel`, `/terminate`, `/signals`, `/queries`, `/updates` (sous `/v1/workflows/executions/{execution_id}/`) | Ciblent toujours le dernier run (détail chap. 13) |
| GET | `/v1/workflows/executions/{execution_id}/stream` | SSE d'une exécution (`event_source`, `last_event_id` / `Last-Event-ID`) |
| GET | `/v1/workflows/events/stream` | SSE filtré multi-exécutions (voir 3.23) |
| GET | `/v1/workflows/runs` | Lister les runs ; filtres dont `search_key` (≤ 3), `workflow_tags` (≤ 20), `status`, `deployment_name`, dates, pagination `page_size` (50) / `next_page_token` (spec) |
| GET | `/v1/workflows` | Lister les workflows ; filtre `tags` (ET) ; spec : `active_only`, `archived`, `deployment_name`, `limit` (50), `cursor`… |
| PUT | `/v1/workflows/{workflow_identifier}` | Mettre à jour une définition (tags ; spec : `display_name`, `description`, `available_in_chat_assistant`) |
| POST / GET | `/v1/workflows/schedules` | Créer / lister des schedules |
| GET / PATCH / DELETE | `/v1/workflows/schedules/{schedule_id}` | Lire / mettre à jour partiellement / supprimer |
| POST | `/v1/workflows/schedules/{schedule_id}/pause` · `/resume` · `/trigger` | Pause, reprise (`note`), déclenchement (`overlap` optionnel) |
| GET | `/v1/workflows/workers/whoami` | Infos de connexion worker (`scheduler_url`, `namespace`, `tls`) — **absent de la spec locale** |

Authentification : `Authorization: Bearer $MISTRAL_API_KEY` ; base `https://api.mistral.ai`.

### 5.2 SDK client (`mistralai`, `from mistralai.client import Mistral`)

| Méthode | Usage |
|---|---|
| `client.workflows.execute_workflow(workflow_identifier, input, execution_id=None)` | Démarrer une exécution |
| `client.workflows.executions.get_workflow_execution(execution_id)` | Lire `status`, `result` |
| `client.workflows.executions.reset_workflow(execution_id, event_id, reason, exclude_signals, exclude_updates)` | Reset |
| `client.workflows.events.get_stream_events(workflow_exec_id=…, root_workflow_exec_id=…, start_seq=…, stream=…, scope=…)` | Itérateur async d'événements |
| `client.workflows.schedules.schedule_workflow / get_schedules / get_schedule / update_schedule / pause_schedule / resume_schedule / unschedule_workflow / trigger` | Gestion des schedules (modèles `models.ScheduleDefinition`, `ScheduleCalendar`, `ScheduleRange`, `ScheduleInterval`, `SchedulePolicy`, `ScheduleOverlapPolicy`, `PartialScheduleDefinition`) |
| `client.beta.connectors.create_or_update_user_credentials_async / get_auth_url_async / list_user_credentials_async / delete_user_credentials_async` | Credentials de connectors (Public Preview) |
| `Mistral(..., workflow_payload_offloading=PayloadOffloadingConfig(...))` | Offloading côté client |
| `await configure_workflow_encoding(WorkflowEncodingConfig(...), client=client)` | Compression/offloading/chiffrement côté client |
| `execute_with_connector_auth_async(client, workflow_identifier, input_data, on_auth_required, connectors=None)` | Exécution avec gestion OAuth (`mistralai.extra.workflows.connector_auth`) |
| `ConnectorSlot(connector_name, credentials_name)` | Runtime binding (`mistralai.extra.workflows.connector_slot`) |

Modules d'encodage client : `mistralai.extra.workflows` (`WorkflowEncodingConfig`, `configure_workflow_encoding`) ; `mistralai.extra.workflows.encoding` (`PayloadCompressionConfig`, `ZstdCompressionConfig`, `PayloadOffloadingConfig`, `BlobStorageConfig`, `PayloadEncryptionConfig`, `PayloadEncryptionMode`, `EncryptedStrField`).

### 5.3 SDK worker (`mistralai.workflows`)

| Symbole | Import / forme | Rôle |
|---|---|---|
| `workflow.define(...)` | `workflows.workflow.define` / `from mistralai.workflows import workflow` | Décorateur de classe workflow |
| `workflow.entrypoint` | décorateur de méthode | Point d'entrée |
| `workflow.signal(name, description)` / `workflow.query(...)` / `workflow.update(...)` | décorateurs de méthode | Handlers d'interaction |
| `workflows.activity(...)` | décorateur de fonction async | Activité |
| `activity_heartbeat(details)` | `from mistralai.workflows import activity_heartbeat` | Heartbeat + checkpoint |
| `run_worker(list_of_workflow_classes)` | `workflows.run_worker` | Démarrer un worker |
| `discover_workflows()` | (projet scaffoldé) | Découverte des classes dans `src/workflows` |
| `workflow.now()` / `uuid4()` / `random()` | — | Substituts déterministes |
| `workflow.unsafe.imports_passed_through()` / `skip_determinism_enforcement()` | context managers | Échappatoires sandbox |
| `workflow.execute_workflow(Cls, params=, execution_timeout=, wait=, parent_close_policy=)` | aussi `workflows.execute_workflow` | Child workflow / exécution |
| `ParentClosePolicy` | `from mistralai.workflows import ParentClosePolicy` | `ABANDON`, `TERMINATE`… |
| `workflow.wait_condition(predicate, timeout=)` | — | Attente de condition |
| `workflow.should_continue_as_new()` / `continue_as_new(state)` | `workflows.workflow.*` | Continue-as-new |
| `workflow.add_search_keys(dict)` / `delete_search_keys(list)` | async | Search keys |
| `get_execution_id()` | `workflows.get_execution_id` | ID d'exécution courante |
| `run_activities_locally()` | `from mistralai.workflows import run_activities_locally` | Local activities |
| `run_sticky_worker_session(session=None)` / `get_sticky_worker_session()` | `from mistralai.workflows import run_sticky_worker_session` | Sticky sessions |
| `Depends(provider)` | `from mistralai.workflows import Depends` | Injection de dépendances |
| `get_mistral_client(api_key=None, use_executor_credentials=False)` | `from mistralai.workflows.client import get_mistral_client` | Client Mistral instrumenté |
| `Task(type=, state=)` | `from mistralai.workflows.core.task import Task` | Publication de streaming (`update_state`, `state`) |
| `OffloadableModel`, `OffloadableField` | `mistralai.workflows.core.encoding.fields_offloader` | Field offloading (`get_value()`) |
| `ScheduleDefinition`, `SchedulePolicy`, `ScheduleOverlapPolicy` | `mistralai.workflows.models` | Schedules (décorateur déprécié) |
| `WorkflowsException`, `ErrorCode` | `mistralai.workflows.exceptions` | Erreurs structurées |
| `connector`, `uses_connectors`, `ToolCallClient` | `mistralai.workflows.plugins.mistralai.connectors` | Connector slots |
| `Agent`, `Runner`, `RemoteSession`, `LocalSession`, `MCPStdioConfig`, `MCPSSEConfig`, `MCPStreamableHTTPConfig`, `MCPConfig`, `send_assistant_message`, `mistralai_*`, `collect_mcp_tools`, `execute_mcp_tool`, `ChatCompletionRequest`, `UserMessage` | `mistralai.workflows.plugins.mistralai` | Plugin Mistral |

### 5.4 Variables d'environnement worker

| Variable | Effet |
|---|---|
| `MISTRAL_API_KEY` | Workspace de connexion ; clé par défaut de `get_mistral_client` |
| `DEPLOYMENT_NAME` | Deployment rejoint |
| `MISTRAL_SA_TOKEN_PATH` | Fichier de token Service Account (prioritaire sur `MISTRAL_API_KEY` pour `get_mistral_client`) |
| `DEFAULT_ENFORCE_DETERMINISM` | `0`/`False` désactive la sandbox par défaut sur le worker |
| `TEMPORAL_PAYLOAD_COMPRESSION__MIN_SIZE_BYTES` / `__ALGORITHM_CONFIG__ALGORITHM` / `__ALGORITHM_CONFIG__LEVEL` | Compression |
| `TEMPORAL_PAYLOAD_ENCRYPTION__MODE` / `__MAIN_KEY` / `__SECONDARY_KEY` | Chiffrement |
| `TEMPORAL_PAYLOAD_OFFLOADING__STORAGE_CONFIG__*` | Payload offloading |
| `ACTIVITY_ATTRIBUTES_OFFLOADING__MIN_SIZE_BYTES` / `__STORAGE_CONFIG__*` | Field offloading |
| Variables arbitraires référencées par `env_mapping`, `auth_token_env`, `header_mapping` | Secrets MCP lus dans l'environnement du worker |

### 5.5 Événements et erreurs

- Événements d'historique (11 types) et de streaming (17 types) : voir 3.9 et 3.23.
- Événement de connector : `auth_url` (URL OAuth transmise au client).
- Exceptions : `WorkflowsException` (+ `ErrorCode`, 3.33), `ConnectorError`, `ConnectorAuthTimeout`, `WorkflowPayloadCompressionException`, `ValidationError` (Pydantic, entrées), `asyncio.TimeoutError` (`wait_condition`), erreur `WORKFLOW_EXECUTION_TIMED_OUT`, erreur de non-déterminisme au replay.

---

## 6. Limites, quotas, tarifs, disponibilité

| Élément | Valeur |
|---|---|
| Statut | Public Preview (Workflows ; intégration Connectors ; `client.beta.connectors`) |
| Python | 3.12+ |
| Entrée / sortie de workflow | 2 Mo chacune |
| Entrée / sortie d'activité | 2 Mo chacune par appel |
| Message de streaming | 1 Mo |
| Historique d'exécution | 51 200 événements ou 50 Mo (premier atteint) |
| `execution_timeout` par défaut | 1 heure (retries et continue-as-new inclus) |
| Code workflow entre deux activités | 2 secondes |
| Local activity (cible) | < 1 seconde |
| Seuils offloading / compression | 1 Mo par défaut (`MIN_SIZE_BYTES`) ; offloading payload entier au-delà de 2 Mo |
| Niveau zstd | 1–22, défaut 3 |
| Clé de chiffrement | AES-GCM 256 bits |
| Rétention des workflows | défaut 30 jours (cité pour l'expiration des blobs et la rotation de clés) |
| Fenêtre OAuth connector | 10 minutes |
| Search keys | 20 par exécution, 20 par appel, clé ≤ 256 car., valeur tronquée à 8192 car., 3 filtres `search_key` par requête |
| Tags | ≤ 100 car. par tag, nombre illimité |
| `catchup_window_seconds` | défaut 31 536 000 s (365 jours) |
| `execution_id` | ≤ 256 caractères (spec) |
| Disponibilité | Orchestrateur hébergé par Mistral ; enterprise : Studio environment en cloud privé ou on-prem ; `LocalSession` pour environnements sans API Agents |
| Tarifs | **Aucune information tarifaire** dans les pages assignées |

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

- **Ordre des décorateurs** : `@uses_connectors` **après** `@workflow.define` (sinon ça ne marche pas).
- **Union d'entrée** : une union `BaseModel | str` fait échouer la **définition de la classe** ; passer par un `RootModel` nommé.
- **Single BaseModel** : pas d'objet enveloppe — l'API attend directement les champs.
- **Sandbox désactivée** = bugs de non-déterminisme découverts au replay « des heures ou des jours plus tard » ; ne jamais désactiver worker-wide pour migrer.
- **Variables globales** : leur modification est interdite en workflow, mais elles sont le mécanisme même de l'état worker des sticky sessions (côté activités).
- **Activités imbriquées** : seule l'externe est frontière de retry → travail déjà fait refait au retry.
- **Pas de `start_to_close_timeout`** = blocage indéfini possible.
- **Bibliothèques bloquantes** (`requests`) dans une activité figent toutes les activités concurrentes du worker.
- **Local activities** : une exception inattendue peut faire crasher le worker entier ; `heartbeat_timeout`, `sticky_to_worker`, `rate_limit` ignorés.
- **Sticky sessions** : état perdu au redéploiement ; prévoir les cold starts ; risque de points chauds.
- **DI** : provider instancié **une fois par worker** → l'objet doit être thread/concurrency-safe ; ce n'est pas une instance par appel.
- **`get_mistral_client` obligatoire** dans les activités : un `Mistral(api_key=...)` direct perd télémétrie, `x-metadata` et OBO.
- **OBO** : impossible sans hardened deployment ; incompatible avec les schedules ; rejeté si l'appelant n'a pas d'en-têtes `user_id`/`organization_id` ; ré-enregistrer le workflow après durcissement (cookbook Linear).
- **`run_as="deployment"`** : pas d'OAuth interactif ; échec immédiat sans credentials ; un `Agent` ne peut pas mélanger les `run_as`.
- **Bearer à la volée non supporté** : credentials bearer à ajouter au préalable dans Studio.
- **MCP Apps** : uniquement sur appel direct `ToolCallClient.call_tool()` ; pas de synchronisation déterministe avec les interactions utilisateur.
- **Secrets MCP** : ne jamais passer de valeurs secrètes en paramètres (persistées dans l'historique) ; utiliser `env_mapping` / `auth_token_env` / `header_mapping`. `follow_redirects=False` par défaut pour ne pas renvoyer les en-têtes secrets à un autre hôte.
- **`RemoteSession`** crée un agent distant par exécution si `id` n'est pas fixé, **sans nettoyage**. Outils intégrés ignorés silencieusement en `LocalSession`.
- **Streaming** : `start_seq` est **inclusif** → reprendre à `broker_sequence + 1` ; `event.data` peut être `None` ; filtrer côté serveur.
- **Payload offloading** : re-téléchargement à chaque replay ; pas de suppression automatique des blobs → politique d'expiration obligatoire ; ne pas appeler `.get_value()` dans le workflow.
- **Compression/offloading** exigent la config **sur client et worker** ; le chiffrement se configure par variables worker (et `PayloadEncryptionConfig` côté client).
- **Search keys** non chiffrées ; clés invalides = échec de l'exécution (non retentable), alors que les échecs de stockage n'échouent jamais l'exécution.
- **Tags** : `PUT` remplace toute la liste ; omettre `tags` ≠ liste vide.
- **Schedules** : overlap par défaut `SKIP` — un `trigger` manuel pendant un run actif est abandonné sauf surcharge `overlap` ; `day_of_week` 0 = dimanche ; tout en UTC sauf `time_zone_name`.
- **Dépréciations** : `schedules=` dans `@workflow.define` ; champ `task_queue` de `WorkflowExecutionRequest` (spec, remplacé par `deployment_name`) ; endpoint `POST /v1/workflows/registrations/{workflow_registration_id}/execute` (spec, `deprecated: true`) ; `LocalSession` susceptible d'être retiré.
- **Reset** : `event_id` doit désigner un événement `WORKFLOW_TASK_COMPLETED` ; la suite s'exécute avec le **code actuel** ; corriger le bug avant.
- **Namespace des plugins** `mistralai.workflows.plugins` réservé à Mistral.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Endpoint `whoami`** : `GET /v1/workflows/workers/whoami` (page Workers) n'existe pas dans la spec OpenAPI locale (seul `/v1/whoami` y figure).
2. **`event_source`** : la doc le décrit comme filtre « `workflow`, `activity` » alors que la spec le type `EventSource` = `DATABASE` | `LIVE` | `HYBRID` (source de données, pas portée).
3. **Horodatage des événements** : `event_timestamp` est un entier en nanosecondes dans « Consuming events » (`1736938200000000000`) mais une chaîne ISO dans « Streaming ».
4. **Exemple d'événement** : `"stream": "token"` attribué à un `WORKFLOW_EXECUTION_STARTED` et à un `WORKFLOW_EXECUTION_COMPLETED` — le rapport entre `stream` et événements système n'est pas expliqué.
5. **Nom du cookbook Linear** : `linear-summarization` dans le tableau, `linear-weekly-summary` dans les URLs, la saisie Studio et le texte.
6. **Chemins d'exemples cookbook** : `src/examples/cargo_release/...` vs `examples/insurance_claims/...` / `examples/code_modernization/...` (sans `src/`).
7. **Extra compression** : `mistralai[workflow-payload-compression]` (commande) vs `mistralai[workflow_payload_compression]` (message d'exception) ; et les extras de compression/chiffrement sont sur le paquet **client `mistralai`**, ceux de stockage sur **`mistralai-workflows`**.
8. **MCP** : la page Durable agents annonce « Two transport types are supported » puis en documente trois (stdio, SSE, Streamable HTTP) ; la page Plugins définit `MCPConfig = MCPStdioConfig | MCPSSEConfig` sans `MCPStreamableHTTPConfig`.
9. **Sortie de `Runner.run`** : liste d'items à filtrer par `TextChunk` (Durable agents) vs `result.final_output` (exemple Connectors).
10. **`execute_workflow` top-level** : `workflows.execute_workflow(...)` est utilisé à la fois dans des `main()` hors worker (DI, exceptions, child workflows) et dans un workflow parent ; la différence avec `workflows.workflow.execute_workflow` et le contexte d'exécution de ces `main()` (exécution locale de test ?) ne sont pas expliqués.
11. **Continue-as-new et `execution_id`** : la page Executions dit que `CONTINUED_AS_NEW` lance un nouveau run « sous un nouvel `execution_id` », alors que la notion de run est définie comme une tentative sous un `execution_id` stable ; par ailleurs `execution_timeout` couvre « toutes les itérations continue-as-new », ce qui suppose une continuité d'identité.
12. **Exemple continue-as-new** : `run(self, page, total_processed)` (paramètres primitifs) mais `continue_as_new(ProcessorState(...))` passe un modèle — compatibilité non expliquée (peut-être par aplatissement des champs, inférence).
13. **Timeout d'exécution** : le workflow est « canceled with a `WORKFLOW_EXECUTION_TIMED_OUT` error », alors que le statut est `TIMED_OUT` et que `WORKFLOW_EXECUTION_TIMED_OUT` ne figure pas dans la liste des types d'événements.
14. **Durées** : « seconds to months » (Overview, Core concepts) vs « seconds to years » (Building › Workflows).
15. **Deployments** : « four key capabilities » annoncées, cinq listées. Le lien du premier workflow vers `core_concepts/deployments#scaling` pointe vers une ancre absente.
16. **Python** : « 3.12 or later » (Installation, premier workflow) vs « Python 3.12 installed » (Cookbooks).
17. **Valeurs par défaut des activités** non documentées : `start_to_close_timeout`, `retry_policy_max_attempts`, `retry_policy_backoff_coefficient`, intervalle initial de retry ; `schedule_to_close_timeout` et `rate_limit` seulement mentionnés.
18. **« Each activity runs in its own process »** (page Activities) : difficile à concilier avec les providers DI partagés « across all activity executions » et l'état global des sticky sessions (inférence : isolation au sens tâche/retry plutôt que processus OS).
19. **Détection de crash worker** : la page Workers attribue la réassignation à l'absence de heartbeats, alors que les heartbeats ne sont exigés que si `heartbeat_timeout` est fixé.
20. **OBO + schedules** : l'interdiction vise l'argument `schedules` du décorateur ; rien n'indique si un schedule créé par API peut cibler un workflow OBO (logiquement non, inférence).
21. **`DEFAULT_ENFORCE_DETERMINISM`** : Core concepts dit « positionner la variable » pour désactiver, sans valeur ; la page Determinism précise `0`/`False`.
22. **`get_mistral_client`** : listé comme composant du plugin Mistral, mais importé depuis `mistralai.workflows.client` ; renvoie « `mistralai.Mistral` » alors que les exemples clients importent `from mistralai.client import Mistral` (et l'anti-exemple `from mistralai import Mistral`).
23. **`Depends(connector_slot)`** : les providers DI sont initialisés « une fois au démarrage du worker », mais un `ToolCallClient` doit résoudre l'identité **par exécution** (OBO) — mécanisme non expliqué.
24. **Import de `get_sticky_worker_session`** non montré ; `mistralai_workflows.run_worker` (alias de module) dans le projet scaffoldé vs `mistralai.workflows`.
25. **Codes `ErrorCode`** : catégories « 40xx…45xx » mais aucune valeur numérique par code ; « méthodes factory » annoncées sans être listées. Propagation d'une `WorkflowsException` levée dans une activité jusqu'à l'appelant API non décrite.
26. **Rétention** « par défaut 30 jours » mentionnée sans indication de configurabilité dans ce périmètre.
27. **Search keys** : la phrase « un déploiement serveur peut produire des rejets permanents à l'échelle de la flotte en cours de run » n'est pas expliquée.
28. **`WorkflowExecutionResponse`** : la spec ajoute `workflow_id`, `deployment_name`, `run_id`, `user_id`, `search_keys` absents des exemples de sortie de la doc ; `wait_for_result`/`timeout_seconds` (exécution synchrone) ne sont pas documentés dans les pages assignées.
29. **Diagrammes** (`workflows_hybrid_mode.svg`, `workflows_mental_model.svg`, `workflows_connector_oauth_flow.svg`) non disponibles en texte.

---

## Annexe — Couverture

| # | Fichier | Statut | Source |
|---|---|---|---|
| 1 | getting-started/overview.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/overview.md |
| 2 | getting-started/installation.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/installation.md |
| 3 | getting-started/your_first_workflow.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/your_first_workflow.md |
| 4 | getting-started/cookbook_examples.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/cookbook_examples.md |
| 5 | getting-started/core_concepts.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts.md |
| 6 | getting-started/core_concepts/workflows.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts/workflows.md |
| 7 | getting-started/core_concepts/activities.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts/activities.md |
| 8 | getting-started/core_concepts/workers.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts/workers.md |
| 9 | getting-started/core_concepts/executions.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts/executions.md |
| 10 | getting-started/core_concepts/events.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts/events.md |
| 11 | getting-started/core_concepts/deployments.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/getting-started/core_concepts/deployments.md |
| 12 | building-workflows/workflows.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/workflows.md |
| 13 | building-workflows/workflows/determinism.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/workflows/determinism.md |
| 14 | building-workflows/activities.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/activities.md |
| 15 | building-workflows/activities/basics.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/activities/basics.md |
| 16 | building-workflows/activities/local_activities.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/activities/local_activities.md |
| 17 | building-workflows/activities/sticky_worker_sessions.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/activities/sticky_worker_sessions.md |
| 18 | building-workflows/compression.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/compression.md |
| 19 | building-workflows/connectors.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/connectors.md |
| 20 | building-workflows/consuming_events.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/consuming_events.md |
| 21 | building-workflows/continue_as_new.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/continue_as_new.md |
| 22 | building-workflows/dependency_injection.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/dependency_injection.md |
| 23 | building-workflows/durable_agents.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/durable_agents.md |
| 24 | building-workflows/encryption.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/encryption.md |
| 25 | building-workflows/mistral_client.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/mistral_client.md |
| 26 | building-workflows/on_behalf_of.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/on_behalf_of.md |
| 27 | building-workflows/payload_offloading.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/payload_offloading.md |
| 28 | building-workflows/plugins.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/plugins.md |
| 29 | building-workflows/scheduling.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/scheduling.md |
| 30 | building-workflows/search_keys.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/search_keys.md |
| 31 | building-workflows/streaming.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/streaming.md |
| 32 | building-workflows/sub_workflows.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/sub_workflows.md |
| 33 | building-workflows/waiting_for_conditions.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/waiting_for_conditions.md |
| 34 | building-workflows/workflow_exception.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/workflow_exception.md |
| 35 | building-workflows/workflow_tags.md | ✅ lu en entier | https://docs.mistral.ai/studio/workflows/building-workflows/workflow_tags.md |

Vérifications complémentaires (grep ciblé) dans la spec OpenAPI locale : `WorkflowExecutionRequest`, `WorkflowExecutionResponse`, `WorkflowExecutionSyncResponse`, `WorkflowExecutionStatus`, `WorkflowUpdateRequest`, `ScheduleDefinition`, `ScheduleCalendar`, `ScheduleRange`, `ScheduleInterval`, `SchedulePolicy`, `ScheduleOverlapPolicy`, `WorkflowScheduleRequest`, `ResetInvocationBody`, `EventSource`, `WorkflowEventType`, et les paramètres de `/v1/workflows/events/stream`, `/v1/workflows/executions/{execution_id}/stream`, `/v1/workflows/runs`, `/v1/workflows`.
