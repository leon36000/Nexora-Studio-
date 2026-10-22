# 11 — Démarrage, Playground, Prompts, Skills, Agents et Connecteurs

> **Périmètre** : vue d'ensemble de la plateforme (Vibe / Studio / Admin), tous les quickstarts (Studio, développeur, Admin, Vibe), SDK clients, Agents & Conversations API, handoffs, outils intégrés (web search, code interpreter, image generation, document library, function calling), Connecteurs MCP (gestion, conversations, appel direct, confirmation humaine, debugger, fournisseur Google), serveur MCP Mistral · **Sources** : 34 pages de docs.mistral.ai (copie du 21/10/2026), avec vérifications ciblées dans la spec OpenAPI locale (signalées « (spec) ») · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Vue d'ensemble de la plateforme : Vibe, Studio, Admin
   - 3.2 Quickstarts Studio : clé API, Playground, Prompts, Skills
   - 3.3 Quickstarts développeur : premier appel, agent avec outils, RAG, workflow
   - 3.4 Quickstarts Admin : organisation, SSO, workspaces et clés
   - 3.5 Quickstarts Vibe (en bref) : Vibe Code et Vibe Work
   - 3.6 SDK clients
   - 3.7 Agents & Conversations API
   - 3.8 Handoffs (chaînage d'agents)
   - 3.9 Outils des agents : vue d'ensemble et outils intégrés
   - 3.10 Connecteurs (MCP gérés)
   - 3.11 Serveur MCP Mistral (page ressource)
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Trois produits** : **Vibe** (agent unifié pour l'utilisateur final : modes **Work** dans le web/mobile et **Code** en CLI / VS Code / sessions web), **Studio** (console développeur + API Mistral : clés, Playground, Prompts, Skills, agents, workflows, évaluations, suivi d'usage) et **Admin** (plan de contrôle IT/sécurité/finance : organisation, membres, rôles, workspaces, facturation, SSO, politiques). URLs : `chat.mistral.ai`, `console.mistral.ai`, `admin.mistral.ai`.
- **Démarrage Studio** : mode **Free** activé par défaut sans carte bancaire (limites d'usage et de débit), création de clé API avec **nom**, **date d'expiration** et **portée d'accès aux Connecteurs** ; Playground sans code pour tester modèles et paramètres ; **Prompts** et **Skills** versionnés, privés ou partagés au workspace, les Skills pouvant être **publiés dans Vibe**.
- **Agents & Conversations API** (préfixe SDK `client.beta.*`) : un **Agent** = modèle + instructions + outils + `completion_args` + `handoffs`, **versionné** à chaque mise à jour ; une **Conversation** = historique persistant d'**entries** (messages, appels de fonctions, exécutions d'outils, handoffs), démarrable avec un agent ou directement avec un modèle, avec streaming SSE, redémarrage depuis une entry et option `store=False`.
- **Outils intégrés** exécutés côté Mistral : `web_search` / `web_search_premium`, `code_interpreter`, `image_generation`, `document_library` ; plus les **fonctions locales** (`function`) et les **Connecteurs** (`connector`). `web_search*` et `code_interpreter` ne fonctionnent **pas** avec Chat Completions.
- **Handoffs** : un agent peut céder la conversation à d'autres agents déclarés dans sa liste `handoffs` ; exécution côté serveur (`server`, défaut) ou rendue au client (`client`) ; pas de limite au nombre de handoffs chaînés.
- **Connecteurs** (statut **Public Preview**, API susceptible de changer) : serveurs **MCP** enregistrés et exécutés côté serveur, visibilité `private` / `shared_workspace` / `shared_org`, authentification par en-têtes ou OAuth2, filtrage d'outils (`include` / `exclude`), **appel direct** d'un outil sans modèle, **confirmation humaine** (`requires_confirmation` + `tool_confirmations` allow/deny), **Debugger** de serveurs MCP dans Studio (Public Preview).
- **Serveur MCP Mistral** (`https://api.mistral.ai/mcp`, Streamable HTTP, Bearer clé API) : expose le workspace Studio (Apps, Connectors, Documentation, Evaluations, Libraries, Observability, Organization, Skills, Workflows) à n'importe quel client MCP (Vibe CLI, Claude Code, Codex, Cursor…).
- **SDK officiels** : Python (`mistralai`, V2 par défaut, import `from mistralai.client import Mistral`) et TypeScript (`@mistralai/mistralai`) ; SDK tiers communautaires non maintenus par Mistral.
- **Modèles supportés par les Agents** selon la FAQ : uniquement `mistral-medium-latest` et `mistral-large-latest` (« bientôt » d'autres) — alors que les exemples Connecteurs utilisent `mistral-small-latest` (cf. § 8).

## 2. Concepts et vocabulaire

| Terme original | Définition en français |
|---|---|
| **Vibe** | Produit utilisateur final de Mistral (ex-« Le Chat »), agent unifié de productivité et de code. |
| **Work** (Vibe Work) | Mode de Vibe dans les apps web/mobile : l'utilisateur décrit un résultat, l'agent choisit les outils, exécute les étapes, affiche des todos en direct. Bascule **fast/think**. |
| **Code** (Vibe Code) | Mode développeur de Vibe : CLI (`vibe`), extension VS Code, sessions Vibe Code Web à distance. |
| **Chat** (onglet) | Ancien onglet de conversation de Vibe, en cours de retrait (d'abord plans self-serve ; fenêtre de migration de 6 mois pour l'Enterprise). |
| **Studio** | Console développeur (`console.mistral.ai`) et API Mistral. |
| **Admin** | Plan de contrôle organisationnel (`admin.mistral.ai`). |
| **Free mode** | Mode gratuit de Studio activé par défaut : accès API sans carte bancaire, avec limites d'usage et de débit. |
| **Workspace** | Espace qui isole clés API, métriques d'usage et facturation (par équipe ou environnement). |
| **Organization** | Entité de plus haut niveau regroupant membres, workspaces, facturation, SSO. |
| **Playground** | Interface de chat de Studio pour tester modèles et paramètres sans code. |
| **Prompt** (Studio) | Gabarit de prompt réutilisable (texte, instructions, format de sortie), versionné, privé ou partagé au workspace. |
| **Skill** | Méthode réutilisable packagée : *quand* l'appliquer (description), *comment* (instructions / `SKILL.md`) et fichiers d'appui optionnels. Suit le standard ouvert **Agent Skills** (agentskills.io). |
| **Progressive disclosure** | Chargement sélectif des seuls Skills pertinents (et de leurs fichiers) dans le contexte, pour éviter l'encombrement. |
| **Publish to Vibe** | Action distincte du partage qui rend un Skill de Studio disponible dans Vibe. |
| **Alias** (Prompt / Agent) | Étiquette nommée (ex. `stable`) pointant vers une version donnée. |
| **Agent** | Ensemble de valeurs présélectionnées (modèle, instructions, outils, `completion_args`, `handoffs`) définissant le comportement du modèle ; ID préfixé `ag_`. |
| **Version** (d'agent) | Entier incrémenté à chaque mise à jour ; la nouvelle version devient la version par défaut, les anciennes restent disponibles. |
| **Conversation** | Historique persistant d'interactions (entries) avec un agent ou un modèle ; ID préfixé `conv_`. |
| **Entry** | Unité d'événement dans une conversation (`object: "entry"`), typée par `type` : `message.input`, `message.output`, `function.call`, `function.result`, `tool.execution`, `agent.handoff`. |
| **Handoff** | Transfert de la conversation d'un agent à un autre agent autorisé, en cours d'action. |
| **`handoff_execution`** | Mode d'exécution des handoffs : `server` (défaut, sur le cloud Mistral) ou `client` (la réponse est rendue à l'appelant qui gère le handoff). |
| **Built-in tool** / « built-in connector tool » | Outil intégré exécuté dans l'environnement interne de Mistral (web search, code interpreter, image generation, document library). |
| **Function calling** | Outil personnalisé décrit par un schéma JSON ; exécuté **localement** par le développeur qui renvoie le résultat. |
| **Connector** | Serveur MCP enregistré auprès de Mistral, utilisable comme outil (`type: "connector"`) dans conversations et agents ; outils découverts automatiquement et exécutés côté serveur. |
| **MCP** (Model Context Protocol) | Standard ouvert pour connecter des modèles à des outils/données externes via une interface unifiée. |
| **Streamable HTTP** | Transport MCP sur HTTP (réponses JSON ou flux SSE). |
| **`tool_configuration`** | Objet de configuration d'un outil : `include`, `exclude`, `requires_confirmation`. |
| **Human-in-the-loop** | Interception des appels d'outils pour approbation (`allow`) ou refus (`deny`) avant exécution. |
| **`RunContext`** / **`DeferredToolCallsException`** | Objets du SDK Python pour gérer une boucle de conversation avec appels différés en attente de confirmation. |
| **Connectors Debugger** | Outil de Studio qui diagnostique un serveur MCP (joignabilité, auth, découverte d'outils). |
| **Connector access scope** | Portée d'une clé API vis-à-vis des Connecteurs : `Shared connectors only` ou `Private and shared connectors`. |
| **`tool_reference`** / **`tool_file`** | Types de « chunks » de contenu : référence/citation (titre, URL) produite par un outil de recherche ; fichier produit par un outil (image, graphique). |
| **`connector_tokens`** / **`connectors`** | Champs d'usage des conversations : jetons consommés par les outils intégrés et nombre d'appels par outil. |
| **Library** | Conteneur de documents interrogeable par le modèle (RAG). |
| **Activity** (Workflows) | Fonction marquée `@workflows.activity()` : étape durable ; en cas de crash, reprise depuis la dernière activité terminée. |
| **Worker** (Workflows) | Processus local qui se connecte à l'API Mistral, enregistre les workflows et attend des tâches. |

## 3. Fonctionnalités en détail

### 3.1 Vue d'ensemble de la plateforme : Vibe, Studio, Admin

Source : *Platform overview*.

| Produit | Pour qui | Ce qu'on y fait | Point d'entrée |
|---|---|---|---|
| **Vibe** | Utilisateurs finaux (knowledge workers, développeurs) | Agent unifié de productivité et de code ; chat web/mobile, terminal, éditeur | `https://chat.mistral.ai` (« Open Vibe Work ») |
| **Studio** | Développeurs | Générer des clés API, tester des prompts dans le Playground, construire et déployer des agents, construire des workflows durables, lancer des évaluations, suivre l'usage ; appeler modèles texte, audio et OCR depuis un seul SDK | `https://console.mistral.ai` (« Open Studio ») |
| **Admin** | Équipes IT, sécurité, finance | Compte d'organisation, membres, rôles, Workspaces, facturation, SSO, politiques de sécurité | `https://admin.mistral.ai` (« Open Admin ») |

Comparatif fonctionnalités/plans renvoyé vers `https://mistral.ai/pricing` (encadré tip).

**Vibe — deux modes**
- **Work** : expérience unifiée des apps web et mobile. On pose une question ou on décrit un résultat ; Work choisit les outils, exécute les étapes, montre des **todos en direct**. Un **toggle fast/think** bascule entre réponses conversationnelles rapides et workflows agentiques plus profonds. Usages : conversations, recherche, analyse de documents, exploration de données, **tâches planifiées**. Fonctions citées dans la FAQ : Connectors, Skills, Projects.
- **Code** : CLI, extension VS Code ou sessions distantes **Vibe Code Web**. Lit les fichiers, édite le code, exécute des commandes, ouvre des pull requests « sous supervision ».
- L'onglet **Chat** séparé est retiré progressivement (d'abord plans self-serve) ; les organisations Enterprise peuvent encore le voir pendant une **fenêtre de migration de six mois**.

**FAQ (faits)**
- Vibe = produit d'usage ; Studio = console développeur ; la plupart des organisations utilisent les deux.
- « Le Chat est maintenant Vibe » : compte, plan, historique et réglages sont conservés ; `chat.mistral.ai` reste l'entrée. Les anciens **Agents** de Chat sont remplacés par les **Skills**, invoqués avec `@` dans l'expérience unifiée. Les « Chat Agents » sont l'équivalent hérité des Skills.
- Rôle **Billing** : réservé à la personne en charge des opérations financières ; accès aux abonnements, factures et moyens de paiement sans accès aux réglages d'organisation ni à la gestion des utilisateurs. La plupart des membres doivent être **Admin** ou **Member**.

### 3.2 Quickstarts Studio

#### 3.2.1 Activer Studio et générer une clé API (~5 min)

- **Free mode** : accès API activé par défaut, **sans carte bancaire** ; limites d'usage et de débit.
- Bonne pratique affichée : fixer des dates d'expiration et faire tourner les clés régulièrement.
- **Parcours** : console Studio → `API Keys` (barre latérale gauche) → bouton `Create new key` → modale de configuration :

| Champ | Contenu | Remarque |
|---|---|---|
| `Name` | Libellé d'identification (ex. `First test key`) | Décrit comme optionnel dans la légende d'image (« optional name and expiration date ») |
| `Expiration` | Date d'expiration | « La rotation régulière améliore la sécurité » |
| `Connector access scope` | `Shared connectors only` : uniquement les Connecteurs partagés au Workspace, pas les Connecteurs privés de l'utilisateur · `Private and shared connectors` : Connecteurs privés + partagés au Workspace | Lien avec la visibilité des Connecteurs (§ 3.10) |

- Puis `Create new key` → copier immédiatement. **Avertissement** : la clé complète n'apparaît **qu'une fois** ; impossible de la récupérer après fermeture de la boîte de confirmation.
- Vérification : `curl https://api.mistral.ai/v1/chat/completions` avec `mistral-small-latest` et le message « Hello, Mistral! ».

#### 3.2.2 Tester un modèle dans le Playground (~5 min)

- Prérequis : compte Studio actif ; Free mode suffit (limites d'usage/débit).
- **Promesses** : test interactif (réponse en secondes), comparaison de modèles (en changeant de modèle), réglage de paramètres en temps réel.
- **Parcours** : Studio → **Playground** (barre latérale gauche) → interface de chat.
  1. Liste déroulante **Model** en haut du Playground ; exemples : `mistral-small-latest` (réponses rapides), `mistral-large-latest` (qualité supérieure).
  2. Champ de saisie → **Send** (ou touche Entrée) → réponse dans le panneau de chat.
  3. **Barre latérale droite** = paramètres de génération :

| Paramètre UI | Effet décrit | Valeurs d'exemple |
|---|---|---|
| **Temperature** | Aléa ; bas = déterministe, haut = créatif | `0.1` vs `0.9` |
| **Max tokens** | Limite la longueur de réponse (coût, verbosité) | — |
| **Top P** | Alternative à la température pour la diversité | — |

  Le texte mentionne « and other settings » sans les lister.
- **Comparaison de modèles** : décrite comme séquentielle — changer de modèle dans la liste et renvoyer le même prompt. Aucune vue côte à côte n'est mentionnée.
- Expérience proposée : même prompt à température 0.1 puis 0.9 et comparaison de la cohérence.

#### 3.2.3 Créer un Prompt réutilisable (~5 min)

- Route : `https://console.mistral.ai/build/prompts` ; navigation `Build` › `Prompts`.
- Usage : gabarits réutilisables **en privé** ou **partagés avec le workspace**, dans Studio « et dans les applications qui référencent des définitions de prompts partagées ».
- Atouts : instructions réutilisables (instructions système, gabarits de tâche, formats de sortie) ; **versionnage** sans perte des versions antérieures.
- **Parcours** :
  1. `Build` › `Prompts` → `New prompt`.
  2. Détails :

| Champ | Exemple | Consigne |
|---|---|---|
| `Title` | `Support tone` | Titre clair |
| `Description` | `Tone and response structure for customer support replies.` | Orientée tâche, expliquer le cas d'usage plutôt que répéter le titre |

  3. Texte du gabarit (ex. assistant support : reconnaître le problème, répondre, proposer l'action suivante, ton calme et concis).
  4. `Save` ou `Create prompt` → ouvrir le Prompt et vérifier sa **première version** → tester dans une surface Studio supportée, « comme le `Playground` ».
  5. **Visibilité** : depuis la page de détails, bouton `Share` → privé ou partagé à **tout le workspace** ; modifiable plus tard via le même bouton.
  6. **Nouvelle version** : ouvrir depuis la liste `Prompts` → modifier le texte → ajouter des **notes de version** (ex. `Shorter support replies`, `Adds escalation guidance`) → `Save` → l'historique de versions montre la nouvelle version. Les anciennes versions restent disponibles pour **revue et rollback**. « Si votre workspace utilise des alias », promouvoir la version testée vers un alias tel que `stable`.
- Critères de validation : présent dans la liste avec bons titre/description ; test conforme (ton, structure, contraintes) ; visibilité correcte ; historique avec version originale + mise à jour.

#### 3.2.4 Créer un Skill dans Studio (~10 min)

- Route : `https://console.mistral.ai/build/skills` ; navigation `Build` › `Skills`.
- **Skill vs Prompt** : un Prompt stocke du texte/des instructions réutilisables ; un Skill stocke **quand** utiliser une méthode, **la méthode** elle-même, et des **fichiers optionnels** (exemples, gabarits, référence).
- **Parcours** :
  1. `Build` › `Skills` → `New Skill`.
  2. Détails — la **description est le champ le plus important** (elle détermine quand l'assistant charge le Skill) :

| Champ | Exemple |
|---|---|
| `Title` | `contract-risk-review` (format kebab-case dans l'exemple) |
| `Description` | `Use when reviewing customer contracts for renewal, liability, or termination risk.` |

     Écrire la description comme une **condition** (vague : « Helps with contracts. » ; spécifique : liste des éléments à identifier).
  3. Champ **instructions** : procédure (ex. extraire date de renouvellement, préavis, droits de résiliation, plafond de responsabilité ; signaler approbations manquantes ; tableau **Risk / Evidence / Recommended action** ; marquer `Not found` sans inventer). Un Skill = un seul job ; sinon plusieurs Skills.
  4. **Fichiers** : ex. `checklist.md`, `template.md`, contrat annoté. Soumis à une **limite de nombre de fichiers** (valeur non précisée) ; au-delà, découper ou utiliser des fichiers de référence ciblés (renvoi aux bonnes pratiques agentskills.io « progressive disclosure »).
  5. `Create Skill` → ouvrir depuis la liste `Skills` → la page de détails montre titre, description, instructions, fichiers joints et **première version**.
  6. **Visibilité et disponibilité Vibe** (deux contrôles séparés) : `Share` (privé / tout le workspace ; contrôle l'accès **dans Studio**) et `Publish to Vibe` (rend le Skill disponible **dans Vibe**). Skills privés visibles par soi seul ; Skills de workspace trouvables et utilisables par les membres.
  7. Test sur une tâche réaliste ; si publié, tester dans **Vibe Work**.
  8. **Nouvelle version** : modifier instructions ou fichiers → notes de version (ex. `Adds liability cap checks`) → `Save` → historique ; anciennes versions pour revue et rollback.

### 3.3 Quickstarts développeur

#### 3.3.1 Envoyer son premier appel API (~5 min)

- Prérequis : Python 3.9+ **ou** Node.js 18+ ; compte Mistral ; clé API (« Studio is enabled in Free mode by default, with no credit card required »).
- Étape 1 — clé : `https://console.mistral.ai/api-keys` → `Create new key` → nom (ex. `quickstart`) → `Create` → copier (affichée une seule fois ; si perdue, en générer une nouvelle) → variable d'environnement : `export MISTRAL_API_KEY="..."` (macOS/Linux) ou `$env:MISTRAL_API_KEY="..."` (Windows PowerShell).
- Étape 2 — SDK : `pip install mistralai` ou `npm install @mistralai/mistralai`.
- Étape 3 — code : `client.chat.complete(model="mistral-large-latest", messages=[{"role":"user","content":"What is Mistral AI?"}])` puis `response.choices[0].message.content` ; équivalent TS `await client.chat.complete({...})` ; curl `POST https://api.mistral.ai/v1/chat/completions`.
- Étape 4 — exécution : `python quickstart.py` ou `npx tsx quickstart.ts`.
- **Table d'erreurs** :

| Code | Cause | Correctif |
|---|---|---|
| `401 Unauthorized` | Clé incorrecte ou non définie | `echo $MISTRAL_API_KEY` |
| `402 Payment Required` | Aucun moyen de paiement sur le compte | En ajouter un dans Admin › Subscriptions › Billing (`admin.mistral.ai/organization/billing`) |
| `429 Too Many Requests` | Limite de débit atteinte | Attendre et réessayer avec backoff exponentiel |

#### 3.3.2 Construire un agent avec outils (~10 min)

Ce quickstart utilise **Chat Completions + function calling**, pas l'Agents API.
- Prérequis : clé, Python 3.9+ ou Node 18+, SDK installé.
- Étape 1 — schéma d'outil : liste `tools` d'objets `{"type": "function", "function": {"name", "description", "parameters": <JSON Schema>}}` (ex. `get_weather` avec `city` requis).
- Étape 2 — requête : `client.chat.complete(model="mistral-medium-latest", messages=..., tools=tools)` ; le modèle renvoie `tool_calls` au lieu d'un texte. Accès : `response.choices[0].message.tool_calls[0]` → `.function.name`, `.function.arguments` (chaîne JSON), `.id`. En TS : `message.toolCalls[0]`.
- Étape 3 — exécution locale puis retour : ajouter le message assistant à `messages`, puis un message `{"role": "tool", "name": <nom>, "content": json.dumps(result), "tool_call_id": tool_call.id}` (TS : `toolCallId`), et rappeler `chat.complete` avec les mêmes `tools`.
- `tool_choice` : `"any"` force l'appel d'un outil ; `"auto"` (défaut) laisse décider le modèle. (La spec liste aussi `none` et `required` dans `ToolChoiceEnum` (spec).)

#### 3.3.3 RAG avec recherche documentaire (~10 min)

- Objectif annoncé : « téléverser des documents dans une Library et les interroger dans une chat completion ».
- Prérequis : clé, Python 3.9+ ou Node 18+, SDK, un document **PDF, TXT ou DOCX**.
- Étape 1 (intitulée « Create a Library ») : en pratique `client.files.upload(file=open(...,"rb"), purpose="retrieval")` ; TS `client.files.upload({file: fs.createReadStream(...), purpose: 'retrieval'})` ; curl `POST /v1/files` multipart (`file=@...`, `purpose=retrieval`).
- Étape 2 — attente d'indexation : boucle `client.files.retrieve(file_id=...)` jusqu'à `status == "processed"` (pause 2 s). Petits fichiers (< 10 pages) traités « en général en moins de 30 secondes » ; gros documents : quelques minutes.
- Étape 3 — requête : `client.chat.complete(model="mistral-medium-latest", messages=[...], documents=[{"type": "file", "id": <file_id>}])`.
- Vérification : réponse citant des détails spécifiques du document ; si réponse générique, vérifier `processed` et la présence du paramètre `documents`.
- ⚠️ Forme d'API non confirmée par la spec : `purpose` n'accepte que `fine-tune`, `batch`, `ocr`, `agentic_safety` et `ChatCompletionRequest` n'a pas de champ `documents` (spec) — voir § 8.

#### 3.3.4 Construire un workflow (~15 min)

- Principe : pipelines IA multi-étapes **durables** (survivent aux crashs, retries, longues attentes). « Votre code s'exécute dans votre environnement ; Mistral gère orchestration, état et observabilité. »
- Prérequis : clé API, **Python 3.12+**, **uv** (fournit `uvx`).
- Étape 1 — scaffold : `uvx mistralai-workflows-cli@latest setup` ; le CLI génère un projet Python prêt à l'emploi et demande la clé API (stockée dans la configuration d'environnement du projet). Répertoire par défaut : `my-workflow`.
- Étape 2 — fichier `src/workflows/hello.py` : modèle d'entrée Pydantic (`HelloInput`, `name: str = "World"`), activité et workflow :

```python
import mistralai.workflows as workflows

@workflows.activity()
async def greet(name: str) -> str: ...

@workflows.workflow.define(name="hello-world",
    workflow_display_name="Hello World", workflow_description="...")
class HelloWorkflow:
    @workflows.workflow.entrypoint
    async def run(self, input: HelloInput) -> str:
        return await greet(input.name)
```

  - `@workflows.activity()` = étape durable (rejeu depuis la dernière activité terminée en cas de crash).
  - `@workflows.workflow.define` enregistre le workflow sous le nom servant à le déclencher.
- Étape 3 — `make start-worker` : le worker se connecte à l'API Mistral, enregistre le workflow, attend des tâches (terminal à garder ouvert).
- Étape 4 — déclenchement : `make execute workflow=hello-world input='{"name": "World"}'`, **ou** depuis la console : **Workflows** (barre latérale) → sélectionner **hello-world** → **Start Workflow** avec l'entrée JSON → onglet **Executions** pour suivre.
- Résultat attendu : `{"result": "Hello, World! Welcome to Mistral Workflows."}`. Erreur de connexion → vérifier clé et worker. `Ctrl+C` arrête le worker.

### 3.4 Quickstarts Admin

#### 3.4.1 Créer son organisation (~15 min)

- Prérequis : compte Mistral ; **carte bancaire ou compte de facturation cloud (AWS ou Azure Marketplace)** ; e-mail d'au moins un collègue.
- **Étape 1** : se connecter à Studio ; les nouveaux comptes sont invités à **nommer leur organisation** puis **redirigés automatiquement vers Admin**. Compte existant sans organisation : ouvrir Admin et suivre l'invite.
- **Étape 2 — facturation** : « les membres ne peuvent pas générer de clés API fonctionnelles tant que la facturation n'est pas active ». Admin › Subscriptions › Billing (`https://admin.mistral.ai/organization/billing`) → **Add payment method** → carte ou compte marketplace ; optionnel : **Monthly spending limit**. Prise d'effet en **2–3 minutes** (clés « inactives » juste après : attendre et réessayer).
- **Étape 3 — workspace** : un workspace par défaut est créé automatiquement. Pour en ajouter : Manage › Workspaces (`https://admin.mistral.ai/organization/workspaces`) → **Create workspace** → nom (ex. « Engineering », « Production »).
- **Étape 4 — invitations** : Administration › Members (`https://admin.mistral.ai/organization/members`) → **Invite member** → e-mail + rôle :

| Rôle d'organisation | Permissions |
|---|---|
| **Admin** | Contrôle total : réglages d'organisation, utilisateurs, sécurité, facturation |
| **Billing** | Abonnements, factures et moyens de paiement uniquement |
| **Member** | Utilise les modèles et crée des clés API dans son workspace |

- **Étape 5 — sécurité et supervision** : Administration › Settings pour configurer le SSO SAML et définir un **Allowed email domain** (bloque les invitations vers des adresses personnelles/externes). **Audit logs** : Administration › Audit logs (`https://admin.mistral.ai/audit-logs`) — trace la création de clés API, les invitations, les changements de réglages de facturation.
- Vérification : e-mail d'invitation reçu en quelques minutes ; statut dans Members passe de **Pending** à **Active**.

#### 3.4.2 Configurer le SSO et la vérification de domaine (~20 min)

- Prérequis : **plan Enterprise** pour le SAML SSO (la **vérification de domaine fonctionne dès Team+**) ; rôle Admin ; accès DNS ; console d'administration de l'IdP (Okta, Azure AD, Ping Identity…).
- **Étape 1 — vérifier le domaine** : Administration › Settings → section **Domain verification** → **Add domain** → saisir `acme.com` → Mistral génère un enregistrement TXT :

| Type | Name | Value |
|---|---|---|
| `TXT` | `_mistral-verification` | `mistral-verify=<jeton>` |

  → **Verify**. Propagation DNS jusqu'à **48 h**, généralement **< 15 min** ; contrôle préalable : `dig TXT _mistral-verification.acme.com`.
- **Étape 2 (optionnelle) — authentification par domaine e-mail** : section **Email domain authentication** → activer → rôle par défaut des utilisateurs auto-rattachés : **Member** (recommandé). Tout utilisateur s'inscrivant avec `@acme.com` est ajouté automatiquement à l'organisation. À n'activer que si tous les employés doivent avoir accès.
- **Étape 3 — SAML SSO** : section **SAML SSO** → **Configure** → Mistral fournit deux valeurs à copier depuis la page :

| Champ | Valeur |
|---|---|
| **ACS URL** (Assertion Consumer Service) | Fournie par Mistral |
| **Entity ID** (Audience URI) | Fournie par Mistral |

  Dans l'IdP : créer une application SAML, coller ACS URL et Entity ID, puis mapper les attributs :

| Attribut IdP | Attribut Mistral |
|---|---|
| Email | Name ID (format e-mail) |
| First name | `firstName` |
| Last name | `lastName` |

  Copier l'**IdP metadata URL** (ou télécharger le XML de métadonnées) → la coller dans la page de réglages → **Save**.
- **Étape 4 — test** : fenêtre de navigation privée → ouvrir Vibe ou Studio → **Sign in with SSO** → e-mail professionnel → page de l'IdP → arrivée dans le tableau de bord avec l'organisation sélectionnée. En cas d'échec : ACS URL et Entity ID identiques des deux côtés, format Name ID = **email**.
- Critères : domaine **Verified** dans les Organization Settings ; connexion via IdP sans mot de passe Mistral ; nouveaux utilisateurs SSO **ajoutés automatiquement** à l'organisation ; prénom/nom corrects.

#### 3.4.3 Gérer workspaces et clés API (~10 min)

- Rôles : workspaces = isolation des clés et métriques par équipe/environnement ; clés **scopées au workspace** ; **limites de dépense** par workspace.
- Prérequis : rôle Admin ; facturation activée (« les clés API sont inactives tant qu'aucun moyen de paiement n'est enregistré »).
- **Étape 1** : Manage › Workspaces → **Create workspace** → nom (ex. `Production`, `ML Research`) → **icône et description optionnelles** → **Create**. Recommandation : au moins deux workspaces (développement et production) pour que le trafic de test ne consomme pas les quotas de production.
- **Étape 2** : ouvrir le workspace → **Add members** → sélectionner des membres de l'organisation → rôle de workspace → **Confirm** :

| Rôle de workspace | Permissions |
|---|---|
| **Admin** | Contrôle complet du workspace : membres, clés, réglages, consultation de l'usage |
| **Member** | Utiliser les clés API |

- **Étape 3** : `https://console.mistral.ai/api-keys` → choisir le workspace cible dans la **liste déroulante de workspace** → **Create new key** → nom descriptif (ex. `prod-backend`, `staging-chatbot`) → copier (affichée une fois). Usage suivi et facturé **par workspace**. Avertissement : ne jamais committer une clé.
- **Étape 4 — limites** : Subscriptions › Billing → sous le workspace, **Set limit** → budget mensuel en **USD** (ex. `$500`) → à la limite, l'API renvoie **`429 Too Many Requests` jusqu'au prochain cycle de facturation**. Suivi de l'usage en temps réel sur le tableau de bord de facturation.
- Vérification : workspace visible dans la liste déroulante de Studio ; visible par ses membres ; clés fonctionnelles ; usage imputé au bon workspace ; test `curl https://api.mistral.ai/v1/models` (liste JSON des modèles).

### 3.5 Quickstarts Vibe (en bref)

#### Vibe Code — installer le CLI et envoyer un premier prompt (~5 min)
- OS : macOS, Linux, Windows ; Python 3.12+ pour l'installation manuelle ; compte Mistral **optionnel** (le CLI fonctionne hors ligne avec des modèles locaux ou avec toute clé d'API compatible OpenAI).
- Installation one-liner (macOS/Linux) : `curl -LsSf https://mistral.ai/vibe/install.sh | bash` — vérifie `uv`, installe/met à jour `mistral-vibe`, expose les commandes `vibe` et `vibe-acp`. Manuel : `uv tool install mistral-vibe` (recommandé) ou `pip install mistral-vibe` ; Windows : installer `uv` via PowerShell puis `uv tool install mistral-vibe`.
- Premier lancement `vibe` → **assistant de configuration** : choix du thème, puis connexion **Launch browser** (recommandé, compte Mistral dans le navigateur ; touche `c` pour copier l'URL si le navigateur ne s'ouvre pas) ou **Use an API key**. Identifiants stockés localement. Clé à générer depuis Code › Vibe CLI (`https://chat.mistral.ai/code/extensions`) ; la même clé marche en Free mode, en plan payant ou en pay-as-you-go. Relancer l'assistant : `vibe --setup`.
- **Dossiers de confiance** : si le projet contient `AGENTS.md` ou une config Vibe (`.vibe/config.toml`, `.agents/skills/`), le CLI demande si l'on fait confiance au dossier avant de charger la configuration locale.
- Préfixe `!` pour une commande shell (`!ls`, `!git status`). Vérification : `vibe --version`.

#### Vibe Code — générer un projet (~10 min)
- Agent CLI **`ask`** (`vibe --agent ask`) : demande l'approbation avant chaque édition. Par défaut, Vibe démarre avec **`accept-edits`** (écrit dans le répertoire de travail sans demander à chaque étape). Autres agents cités : `smart-approve`, `auto-approve`.
- Vibe découpe la demande en étapes et affiche un **aperçu** de chaque fichier avant écriture. Touches d'approbation : `1`/`y` (une fois), `2` (ce type d'édition pour la session), `3` (toujours), `4`/`n`/`Escape` (refuser) ; flèches + `Entrée` ou clic.
- Fonctions du CLI citées : références de fichiers `@`, commandes `/`, shell `!`, envoi cloud `&`, `resume`.

#### Vibe Work — première tâche (~5 min)
- `https://chat.mistral.ai/work` ; ouvrir la barre latérale (icône tiroir ou `Cmd+Shift+B` / `Ctrl+Shift+B`) ; sélecteur de mode **Work** (Vibe mémorise le dernier onglet).
- Work démarre immédiatement et diffuse en direct : fragments de raisonnement, appels d'outils (ex. Web Search), résultats, synthèse. Pendant l'exécution : lire chaque étape, **Stop** (bouton carré noir), envoyer un message de suivi pour réorienter.
- Tâches complexes : **panneau de todos** à droite, **questions de clarification**, **pause pour approbation** avant les outils touchant aux données, au calendrier ou aux apps externes.
- Vérification : conversation dans l'historique ; todos cochés ; sources cliquables.

#### Vibe Work — analyser un jeu de données (~10 min)
- Fichiers CSV, XLSX, JSON ; Free mode suffisant pour essayer, plans payants recommandés pour les jeux lourds.
- Barre d'outils du chat : icône `+` → `Upload Files` → aperçu du fichier. Work choisit lecteur de fichiers, **sandbox de code intégrée** et **Canvas** (panneau latéral éditable qui s'ouvre automatiquement pour documents, graphiques, sorties longues ; ou sur demande « open this in Canvas »). Work affiche le code exécuté.
- Bouton **Export** dans Canvas : tableaux en CSV/Excel, graphiques en images. Le contexte des données est conservé entre les questions.

#### Vibe Work — créer son premier Skill (~10 min)
- Standard ouvert **Agent Skills** : un Skill = dossier avec `SKILL.md` (instructions + métadonnées) et fichiers optionnels ; chargement par **progressive disclosure**. Les admins de workspace peuvent **forcer l'activation ou la désactivation** des Skills au niveau du workspace.
- Skill intégré à essayer : `/deep-research` (plan de recherche, requêtes web multiples, synthèse sourcée dans Canvas).
- Vue : `Context` › `Skills` → **New Skill** ; trois sections : **Built-in**, **Personal**, **Workspace**. Voie recommandée : demander à Work « turn this into a Skill » après une tâche réussie (Work génère un brouillon de `SKILL.md`).
- Formulaire à trois champs : **Title**, **Description** (condition de déclenchement), **`SKILL.md`**. Fichiers d'appui soumis à une limite de nombre.
- **Create Skill** → activation automatique si la description correspond (visible dans les todos) ou invocation explicite `/{skill-name}` ou mention dans le prompt. Partage : **Share** (privé / workspace) ; les admins peuvent **force-enable** un Skill pour tout le workspace.

### 3.6 SDK clients

| SDK | Installation | Import / client | Appel de base | Dépôt |
|---|---|---|---|---|
| **Python V2** (défaut) | `pip install mistralai` (= `mistralai>=2`) | `from mistralai.client import Mistral` ; `client = Mistral(api_key=...)` | `client.chat.complete(model=..., messages=[...])` | github.com/mistralai/client-python |
| **Python V1** | `pip install "mistralai<2"` | `from mistralai import Mistral` | idem | idem |
| **TypeScript** | `npm install @mistralai/mistralai` | `import { Mistral } from '@mistralai/mistralai'` ; `new Mistral({apiKey})` | `await client.chat.complete({model, messages})` | github.com/mistralai/client-ts (exemples liés à `client-js`) |

- Recommandation forte d'utiliser les SDK officiels. Modèle des exemples : `mistral-medium-latest`.
- Forme de réponse Chat Completion (exemple) : `id`, `created`, `model`, `usage{prompt_tokens, total_tokens, completion_tokens}`, `object: "chat.completion"`, `choices[{index, finish_reason: "stop", message{role: "assistant", tool_calls: null, content}}]`.
- **Migration V1 → V2 (Python 2.0.0)** : peu de ruptures ; toutes les autres API inchangées (chat, streaming, embeddings, agents, function calling, batch…).

| Domaine | V1 | V2 |
|---|---|---|
| Paquet | `mistralai<2` | `mistralai>=2` |
| Import principal | `from mistralai import Mistral` | `from mistralai.client import Mistral` |
| Azure (import) | `from mistralai_azure import MistralAzure` (paquet `mistralai-azure>=1.0.0`) | `from mistralai.azure.client import MistralAzure` (même paquet `mistralai>=2.0.0`) |
| Azure (constructeur) | `azure_endpoint=`, `azure_api_key=` | `server_url=`, `api_key=` |
| GCP (import) | `from mistralai_gcp import MistralGoogleCloud` (`mistralai[gcp]`) | `from mistralai.gcp.client import MistralGCP` (aucun paquet séparé) |
| GCP (auth) | Variables `GOOGLE_CLOUD_REGION` + `GOOGLE_CLOUD_PROJECT_ID` | Automatique via `google.auth.default()` ; région par défaut `"europe-west4"`, surchargeable (`MistralGCP(region="us-central1", project_id="my-project")`) |

- Objets Python V2 sous `mistralai.client` (ex. `CompletionArgs`, `ResponseFormat`, `JSONSchema`, `FunctionResultEntry`) et `mistralai.client.models` (`ToolFileChunk`) ; en V1 : `mistralai` et `mistralai.models`. Extras : `mistralai[mcp]` (requis pour `DeferredToolCallsException`, v2.4+), `mistralai.extra.run.context.RunContext`, `mistralai.extra.exceptions`.
- TS : types sous `@mistralai/mistralai/models/components/index.js` (`FunctionResultEntry`, `MessageOutputEntry`, `ToolFileChunk`, `ConversationResponse`) ; helper `responseFormatFromZodObject` dans `@mistralai/mistralai/extra/structChat.js`. Convention TS : paramètres en camelCase et corps de requête imbriqués (`agentUpdateRequest`, `conversationAppendRequest`, `conversationRestartRequest`, `updateConnectorRequest`, `connectorCallToolRequest`, `credentialsCreateOrUpdate`).
- **SDK tiers** (communauté, non maintenus ni supportés par Mistral) :

| Langage | Dépôts |
|---|---|
| CLI | icebaker/ruby-nano-bots |
| Dart | nomtek/mistralai_client_dart |
| Elixir | axonzeta/mistral_elixir |
| Go | Gage-Technologies/mistral-go |
| Java | langchain4j/langchain4j ; spring-projects/spring-ai |
| JavaScript/TS | vercel/ai |
| PHP | HelgeSverre/mistral ; partITech/php-mistral |
| Ruby | gbaptista/mistral-ai ; wilsonsilva/mistral |
| Rust | ivangabriele/mistralai-client-rs |

### 3.7 Agents & Conversations API

Sources : *Agents Introduction*, *Agents & Conversations*, *Agents Tools Overview* ; compléments vérifiés dans la spec OpenAPI.

#### 3.7.1 Capacités annoncées (introduction)

- Plusieurs modèles multimodaux (**texte et vision**) ; **état persistant** entre conversations ; conversations avec **modèles de base**, **un agent** ou **plusieurs agents**.
- Outils intégrés prêts à l'emploi : **exécution de code**, **recherche web**, **génération d'images**, **bibliothèque de documents**.
- **Handoffs** : des agents en appellent d'autres au sein d'un workflow.
- Fonctions de Chat Completions également supportées : **Structured Outputs**, **Document Understanding**, **Tool Usage**, **Citations**.
- **Modèles supportés (FAQ)** : « currently, only `mistral-medium-latest` and `mistral-large-latest` », d'autres « bientôt ».
- Cookbooks cités (dépôt `mistralai/cookbook`, `mistral/agents/agents_api/`) : Github Agent, Linear Tickets (PRD → tickets), Financial Analyst, Travel Assistant, Food Diet Companion.

#### 3.7.2 Les trois objets

| Objet | Rôle | ID |
|---|---|---|
| **Agent** | Valeurs présélectionnées augmentant le modèle : outils, instructions, paramètres de complétion | `ag_…` |
| **Conversation** | Historique d'interactions (messages, exécutions d'outils…), démarré par un Agent **ou** un Modèle | `conv_…` |
| **Entry** | Action créée par l'utilisateur ou un assistant ; représentation plus expressive que les messages | `msg_…`, `fc_…`, `tool_exec_…`, `handoff_…` |

Les deux API (Agents, Conversations) sont **indépendantes** : on peut créer des conversations sans agent.

#### 3.7.3 Créer un agent

Paramètres de création :

| Paramètre | Type | Obligatoire | Défaut / valeurs | Effet |
|---|---|---|---|---|
| `model` | string | oui | ex. `mistral-medium-latest` | Modèle de chat completion utilisé |
| `name` | string | oui | — | Nom de l'agent |
| `description` | string | présenté sans mention « optional » par la doc ; non requis dans `CreateAgentRequest` (spec) | — | Tâche / cas d'usage de l'agent |
| `instructions` | string | non | `null` | Instructions principales (prompt système) |
| `tools` | array | non | `[]` | Outils : `function`, `web_search`, `web_search_premium`, `code_interpreter`, `image_generation`, `document_library`, et `connector` (pages Connecteurs) |
| `completion_args` | object | non | voir ci-dessous | Arguments d'échantillonnage ; « tous les arguments de chat completion sont acceptés » ; surchargeables à chaque requête |
| `handoffs` | array<string> | non | `null` | IDs des agents vers lesquels céder la conversation (cf. § 3.8) |
| `guardrails`, `metadata`, `version_message` | — | non | — | Présents dans `CreateAgentRequest` (spec), non décrits dans les pages |

`completion_args` renvoyé dans l'objet Agent (exemple Python) : `stop`, `presence_penalty`, `frequency_penalty`, `temperature` (`0.3` dans l'exemple sans valeur fournie), `top_p`, `max_tokens`, `random_seed`, `prediction`, `response_format`, `tool_choice` (`"auto"`). La spec ajoute `reasoning_effort` et donne les bornes : `temperature` 0–1, `top_p` 0–1, `presence_penalty`/`frequency_penalty` −2 à 2, `max_tokens` ≥ 0, `random_seed` ≥ 0, `tool_choice` ∈ `auto`/`none`/`any`/`required` (spec).

Méthodes : Python `client.beta.agents.create(...)` (async : `create_async`) ; TS `client.beta.agents.create({...})` ; REST `POST /v1/agents`.

Objet **Agent** renvoyé : `model`, `name`, `id`, `version` (`0` à la création), `created_at`, `updated_at`, `instructions`, `tools`, `completion_args`, `description`, `handoffs`, `object: "agent"`. Dans la spec, l'objet comporte aussi `guardrails`, `metadata`, `versions` (liste d'entiers), `owner_id`, `deployment_chat` (bool), `source`, `version_message` (spec). Le SDK TS renvoie les clés en camelCase (`completionArgs`, `createdAt`…).

#### 3.7.4 Versions d'agent

- **Mettre à jour** = créer une **nouvelle `version`**, utilisée **par défaut** ; les versions précédentes restent disponibles. Mêmes arguments que la création.
  - Python : `client.beta.agents.update(agent_id=..., description=..., completion_args={...})`
  - TS : `client.beta.agents.update({ agentId, agentUpdateRequest: {...} })`
  - REST : `PATCH /v1/agents/{agent_id}` (spec ; l'exemple curl de la doc utilise `--data` sans méthode explicite).
  - Exemple : version `0` → `1`, `updated_at` modifié, `created_at` conservé.
- **Changer de version active** manuellement :
  - Python : `client.beta.agents.update_version(agent_id=..., version=0)`
  - TS : `client.beta.agents.updateVersion({ agentId, version: 0 })`
  - REST : `/v1/agents/{agent_id}/version` ; la doc envoie `{"version": 0}` en corps, la spec définit `PATCH` avec `version` en **paramètre de requête** (spec).
- Endpoints de versions et d'alias **présents dans la spec mais non décrits dans les pages lues** (spec) : `GET /v1/agents/{agent_id}/versions` (pagination `page`/`page_size`, défaut 20), `GET /v1/agents/{agent_id}/versions/{version}`, `PUT|GET|DELETE /v1/agents/{agent_id}/aliases` (paramètres `alias`, `version` ; alias uniques par agent, réassignables), `GET /v1/agents/{agent_id}?agent_version=` (entier ou alias), `DELETE /v1/agents/{agent_id}`, `GET /v1/agents/pages` (pagination par curseur, `page_size` défaut 20, filtres `deployment_chat`, `sources`, `name`, `search`, `id`, `metadata`, respecte le partage par agent). `GET /v1/agents` (pagination par page, 0-indexée) est marqué **déprécié** (spec).

#### 3.7.5 Démarrer une conversation

- **Accès** (encadré info) : l'API Conversations publique ne lit/modifie que les conversations **appartenant au créateur de la clé API** utilisée.
- Démarrage avec un agent : `agent_id` + `inputs` ; `inputs` = chaîne (premier message) **ou** liste de messages (historique).
- Démarrage sans agent : `model` à la place de `agent_id` (on ne peut pas passer les deux — encadré caution de la page Connecteurs). On peut alors passer `instructions`, `tools`, `completion_args` directement.
- Renvoie un **conversation ID**.
- `store=False` : désactive le stockage de l'historique sur le cloud Mistral.
- **Guardrails** : si l'agent a des guardrails configurés, ils s'appliquent automatiquement à toutes ses conversations ; on peut les surcharger via un champ `guardrails` dans `POST /v1/conversations` **avec un modèle** (renvoi vers « Custom guardrails »).
- `handoff_execution` : `server` (défaut) ou `client` (cf. § 3.8).
- Méthodes : Python `client.beta.conversations.start(agent_id=..., inputs=..., store=False)` (async `start_async`) ; TS `client.beta.conversations.start({ agentId, inputs })` ; REST `POST /v1/conversations`.
- Format d'entrée explicite (curl) : `{"role": "user", "content": "...", "object": "entry", "type": "message.input"}` ; corps avec `"stream": false` et `"agent_id"` ou `"model"`.
- Corps complet selon la spec (`ConversationRequestBase`) : `inputs` (requis), `stream`, `store`, `handoff_execution`, `instructions`, `tools`, `completion_args`, `guardrails`, `name`, `description`, `metadata`, `agent_id`, `agent_version` (entier ou alias), `model` (spec).

#### 3.7.6 Poursuivre (append)

- Fournir `conversation_id` + `inputs` (chaîne ou liste de messages / entries). L'historique est stocké par défaut. La doc affirme « un nouvel ID de conversation est fourni à chaque append » (cf. § 8).
- Python : `client.beta.conversations.append(conversation_id=..., inputs="Translate to French.", completion_args={...})`.
- TS : `client.beta.conversations.append({ conversationId, conversationAppendRequest: { inputs, completionArgs } })`.
- REST : `POST /v1/conversations/{conversation_id}` avec `inputs`, `stream` (défaut `false`), `store` (défaut `true`), `handoff_execution` (défaut `server`), `completion_args`, et `tool_confirmations` (confirmation humaine, § 3.10.9).
- **Réponse** `conversation.response` : `conversation_id`, `outputs` (liste d'entries, ex. `message.output` avec `content`, `created_at`, `completed_at`, `id`, `agent_id`, `model`, `role`), `usage` {`prompt_tokens`, `completion_tokens`, `total_tokens`, `connector_tokens`, `connectors`}, `object`. La spec ajoute un champ `guardrails` dans la réponse (spec).

#### 3.7.7 Consulter les conversations

| Opération | Python | TS | REST | Réponse |
|---|---|---|---|---|
| Lister | `conversations.list(page=0, page_size=100)` | `list({ page, pageSize })` | `GET /v1/conversations?page=0&page_size=100` (filtre `metadata` en spec) | Tableau d'objets `conversation` : `id`, `created_at`, `updated_at`, `agent_id` **ou** (`model`, `instructions`, `tools`, `completion_args`), `name`, `description`, `object` |
| Détails | `conversations.get(conversation_id=...)` | `get({ conversationId })` | `GET /v1/conversations/{id}` | Objet `conversation` |
| Historique (toutes entries) | `conversations.get_history(conversation_id=...)` | `getHistory({ conversationId })` | `GET /v1/conversations/{id}/history` | `{conversation_id, entries[], object: "conversation.history"}` |
| Messages seuls | `conversations.get_messages(conversation_id=...)` | `getMessages({ conversationId })` | `GET /v1/conversations/{id}/messages` | `{conversation_id, messages[], object: "conversation.messages"}` |
| Supprimer | — | — | `DELETE /v1/conversations/{id}` (spec uniquement) | — |

Pagination de la liste : `page` 0-indexée défaut 0, `page_size` défaut 100 (spec).

#### 3.7.8 Redémarrer depuis une entry (restart)

- Reprend une conversation à partir de n'importe quelle entry de l'historique et crée une **nouvelle conversation** (nouvel ID dans l'exemple).
- Python : `conversations.restart(conversation_id=..., from_entry_id="msg_…", inputs="Translate to Portuguese.")`.
- TS : `restart({ conversationId, conversationRestartRequest: { inputs, fromEntryId } })`.
- REST : `POST /v1/conversations/{id}/restart` avec `from_entry_id` (requis), `inputs`, `stream`, `store`, `handoff_execution` ; la spec ajoute `completion_args`, `guardrails`, `metadata`, `agent_version` (version spécifique ; sinon version courante) (spec).
- **Restriction** (note) : on ne peut redémarrer **que des conversations sur lesquelles `append()` a été utilisé au moins une fois**.

#### 3.7.9 Streaming

- Disponible pour démarrer, poursuivre et redémarrer.
  - Python : `start_stream`, `append_stream`, `restart_stream`.
  - TS : `startStream({ agentId, inputs })`, `appendStream({ conversationId, conversationAppendStreamRequest: {...} })`, `restartStream({ conversationId, conversationRestartStreamRequest: {...} })`.
  - REST : mêmes routes avec `"stream": true` et `Accept: text/event-stream` (variantes `#stream` dans la spec).
- **Événements SSE** (champ `event:` + `data:` JSON avec `type`) :

| Événement | Signification | Champs observés |
|---|---|---|
| `conversation.response.started` | Début de la réponse | `conversation_id` |
| `conversation.response.done` | Réponse terminée | `usage` |
| `conversation.response.error` | Erreur | `message`, `code` (spec) |
| `message.output.delta` | Fragment de contenu (jetons de la réponse) | `output_index`, `id`, `content_index`, `model`, `agent_id`, `role`, `content` |
| `tool.execution.started` | Début d'exécution d'un outil | `output_index`, `id`, `name` ; + `arguments`, `model`, `agent_id` (spec) |
| `tool.execution.done` | Fin d'exécution | `output_index`, `id`, `name` ; + `info` (spec) |
| `agent.handoff.started` | Début d'un handoff | `previous_agent_id`, `previous_agent_name` (spec) |
| `agent.handoff.done` | Handoff conclu | `next_agent_id`, `next_agent_name` (spec) |
| `function.call.delta` | Fragment de l'appel de fonction | `name`, `tool_call_id`, `arguments`, `confirmation_status` (spec) |
| `tool.execution.delta` | Non cité dans la doc ; présent dans la spec | `name`, `arguments` (spec) |

Exemple de séquence : `conversation.response.started` → `tool.execution.started` (`web_search`) → `tool.execution.done` → série de `message.output.delta` (`output_index: 1`, `content_index` croissant) → `conversation.response.done` (usage : 18 709 prompt tokens, 183 completion tokens dans l'exemple avec recherche web).

#### 3.7.10 Types d'entries et de chunks

| Entry (`type`) | Produite par | Champs clés |
|---|---|---|
| `message.input` | Utilisateur | `role: "user"`, `content`, `id`, `created_at` |
| `message.output` | Assistant | `content` (chaîne ou liste de chunks), `agent_id`, `model`, `role: "assistant"`, `created_at`, `completed_at`, `id` |
| `function.call` | Modèle demandant une fonction locale ou une confirmation | `tool_call_id`, `name`, `arguments` (chaîne JSON), `id` (`fc_…`), `completed_at: null`, `confirmation_status` (`pending`/`allowed`/`denied`) |
| `function.result` | Client (résultat de fonction) | `tool_call_id`, `result` (chaîne) |
| `tool.execution` | Outil intégré exécuté côté serveur | `name` (`web_search`, `code_interpreter`, `image_generation`…), `id` (`tool_exec_…`), `created_at`, `completed_at`, `info` (ex. `code`, `code_output`), `arguments` (spec) |
| `agent.handoff` | Changement d'agent | dans les exemples : `agent_id`, `agent_name`, `id` (`handoff_…`) ; dans la spec : `previous_agent_id/name`, `next_agent_id/name` |

| Chunk de contenu (`type`) | Champs |
|---|---|
| `text` | `text` |
| `tool_reference` | `tool`, `title`, `url`, `source` (ex. `"brave"`, dans l'exemple) ; la spec liste `favicon`, `description` et pas `source` |
| `tool_file` | `tool`, `file_id`, `file_name`, `file_type` (ex. `png`) |

Champ `usage` des conversations : `prompt_tokens`, `completion_tokens`, `total_tokens`, `connector_tokens` (jetons apportés par les outils intégrés ; ex. 7 112 pour une recherche web), `connectors` (dictionnaire outil → nombre d'appels, ex. `{"web_search": 1}`).

### 3.8 Handoffs (chaînage d'agents)

- Définition : capacité d'un agent à **confier une tâche** ou **céder la conversation** à d'autres agents en cours d'action, pour orchestrer des workflows.
- **Pas de limite** au nombre de handoffs chaînés dans un workflow.
- **Mise en place** : 1) créer tous les agents ; 2) mettre à jour chaque agent avec la liste `handoffs` des IDs d'agents autorisés (via `agents.update` → nouvelle version). Exemple (5 agents en `mistral-large-latest`) :

| Agent | Outils / particularité | Handoffs autorisés |
|---|---|---|
| `finance-agent` | aucun | `ecb-interest-rate-agent`, `websearch-agent` |
| `websearch-agent` | `web_search` | `graph-drawing-agent`, `calculator-agent` |
| `ecb-interest-rate-agent` | fonction locale `get_european_central_bank_interest_rate(date)` | `graph-drawing-agent`, `calculator-agent` |
| `graph-drawing-agent` | `code_interpreter` | — |
| `calculator-agent` | sortie structurée via `completion_args.response_format` `json_schema` (`name: "calc_result"`, `strict: true`, schéma `{reasoning, result}`) | — |

  Construction du format structuré : Python `CompletionArgs(response_format=ResponseFormat(type="json_schema", json_schema=JSONSchema(name=..., schema=Model.model_json_schema())))` ; TS `completionArgs: { responseFormat: responseFormatFromZodObject(ZodSchema) }`.
- **`handoff_execution`** : `server` (défaut, handoff exécuté dans le cloud Mistral) ; `client` (au déclenchement d'un handoff, une réponse est rendue à l'utilisateur pour qu'il gère le handoff lui-même).
- **Exemple A** (« taux d'intérêt US + effet composé sur 10 ans ») — entries successives : `agent.handoff` → `websearch-agent` ; `tool.execution` `web_search` ; `message.output` (texte + `ToolReferenceChunk` vers la source) annonçant le passage au calculateur ; `agent.handoff` → `calculator-agent` ; `message.output` JSON `{result, reasoning}`.
- **Exemple B** (« taux BCE janv. 2025 + graphique ») : `agent.handoff` → `ecb-interest-rate-agent` ; `function.call` (`arguments: {"date": "2025-01-01"}`) — la conversation **s'interrompt** et rend la main au client ; le client exécute la fonction et ajoute un `FunctionResultEntry(tool_call_id=..., result="2.5%")` via `conversations.append` ; puis `agent.handoff` → `graph-drawing-agent` ; `message.output` ; `tool.execution` `code_interpreter` ; `message.output` avec `ToolFileChunk` (`file_name: plot_0.png`, `file_type: png`) et un texte contenant `![Image](__emitted_0.png)`.
- Récupération des fichiers produits : itérer sur `response.outputs[-1].content`, détecter `ToolFileChunk`, `client.files.download(file_id=chunk.file_id).read()`.

### 3.9 Outils des agents

#### 3.9.1 Typologie et compatibilité

| Type (`type`) | Nature | Exécution | Chat Completions | Conversations / Agents |
|---|---|---|---|---|
| `web_search` | Intégré | Serveur Mistral | **Non** | Oui |
| `web_search_premium` | Intégré | Serveur Mistral | **Non** | Oui |
| `code_interpreter` | Intégré | Conteneur isolé Mistral | **Non** | Oui |
| `image_generation` | Intégré | Serveur Mistral | **Oui** | Oui |
| `document_library` | Intégré (RAG sur Libraries) | Serveur Mistral | Oui (spec) | Oui |
| `function` | Personnalisé | **Local** (chez le développeur) | Oui | Oui |
| `connector` | MCP enregistré | Serveur Mistral (outils découverts automatiquement) | Oui (spec) | Oui |

- Les outils intégrés sont utilisables **directement via Conversations sans créer d'agent** ; on peut en combiner plusieurs (« You can use multiple tools at the same time! »). Le modèle reste libre d'utiliser ou non chaque outil.
- Raison de l'exclusion de `web_search*` de Chat Completions : ses réponses n'incluent pas les références de recherche que ces outils renvoient.
- Tous les outils intégrés et `connector` acceptent un `tool_configuration` optionnel (`include`, `exclude`, `requires_confirmation`) (spec). L'énumération `BuiltInConnectors` de la spec contient aussi `mistral_mcp` (non documenté dans les pages lues) (spec).

#### 3.9.2 Web Search (`web_search`, `web_search_premium`)

| Variante | Capacité |
|---|---|
| `web_search` | Accès simple à un moteur de recherche |
| `web_search_premium` | Moteur de recherche **+ articles d'actualité** via un fournisseur de news intégré « vérifié » ; ses sous-outils nommés dans l'exemple de confirmation : `web_search`, `news_search` |

- Création : `tools=[{"type": "web_search"}]` (exemple avec `instructions` mentionnant `web_search`, `temperature 0.3`, `top_p 0.95`).
- Sortie : entry `tool.execution` (`name: "web_search"`, horodatages) puis `message.output` dont `content` entrelace des chunks `text` et `tool_reference` (`tool`, `title`, `url`, `source` — `"brave"` dans l'exemple) servant de **citations**.
- Usage : l'exemple montre `connector_tokens: 7112` et `connectors: {"web_search": 1}` pour 188 prompt tokens et 55 completion tokens (total 7 355).
- Renvois : guide des citations, Libraries (autre outil à références).

#### 3.9.3 Code Interpreter (`code_interpreter`)

- Exécution sûre de code dans un **conteneur isolé**, à la demande : graphiques, analyse de données, opérations mathématiques, validation de code.
- Utilisation : créer l'agent avec `{"type": "code_interpreter"}` puis converser via `/v1/conversations`.
- Sortie : `message.output` (annonce), `tool.execution` avec `info.code` (code exécuté, Python dans l'exemple) et `info.code_output` (sortie), puis `message.output` final. Usage : `connectors: {"code_interpreter": 1}`.
- Les fichiers produits (ex. graphiques) arrivent sous forme de chunks `tool_file` (cf. handoffs).

#### 3.9.4 Image Generation (`image_generation`)

- Permet au modèle de créer des images à tout moment ; supporté aussi en Chat Completions.
- Sortie : `tool.execution` (`name: "image_generation"`) puis `message.output` avec chunks `text` + `tool_file` (`tool: "image_generation"`, `file_id` (UUID), `file_name: "image_generated_0"`, `file_type: "png"`). Usage : `connectors: {"image_generation": 1}`.
- **Téléchargement obligatoire via l'API Files** : Python `client.files.download(file_id=...).read()` ; TS `client.files.download({ fileId })` renvoie un `ReadableStream` (helper `saveStreamToFile` dans l'exemple) ; REST `GET /v1/files/{file_id}/content` (`Accept: application/octet-stream`).

#### 3.9.5 Document Library (`document_library`)

- Outil RAG intégré cherchant dans les documents téléversés dans les **Libraries** ; produit aussi des références (citations). Les pages lues renvoient au guide Libraries pour le détail.
- Paramètre (spec) : `library_ids` (tableau de chaînes, **au moins 1**, requis) + `tool_configuration` optionnel.

#### 3.9.6 Function Calling (fonctions locales) avec les Agents

- Définir la fonction localement (ex. `get_european_central_bank_interest_rate(date)` renvoyant `{date, interest_rate}`), puis la déclarer dans `tools` : `{"type": "function", "function": {"name", "description", "parameters"}}`. L'objet renvoyé ajoute `"strict": false` (défaut) dans `function` ; la spec définit `description` défaut `""` et `strict` défaut `false` (spec).
- Démarrage : `conversations.start(agent_id=..., inputs=[{"role":"user","content":...}])` → `outputs` contient une entry `function.call` (`tool_call_id`, `name`, `arguments` JSON, `id: fc_…`, `completed_at: null`).
- Retour du résultat : détecter `response.outputs[-1].type == "function.call"`, exécuter, puis `conversations.append(conversation_id=..., inputs=[FunctionResultEntry(tool_call_id=..., result=json.dumps(...))])` ; REST : entry `{"tool_call_id", "result", "object": "entry", "type": "function.result"}`. La réponse finale est un `message.output`.
- Les fonctions locales peuvent aussi être soumises à confirmation humaine via le SDK Python (§ 3.10.9).

### 3.10 Connecteurs (MCP gérés)

#### 3.10.1 Principe et statut

- **Public Preview** : « The API interface can change. »
- Connecteur = **serveur MCP enregistré**, utilisable comme **outil** dans les conversations et les agents, depuis n'importe quel SDK ou l'API, **sans gérer le transport MCP localement**. Le modèle découvre les outils et appelle le bon selon la demande.
- Tout serveur **compatible MCP** peut être enregistré.
- **Portée des clés API** : à la création d'une clé, choisir l'accès aux seuls Connecteurs partagés au Workspace ou aux Connecteurs privés + partagés (cf. § 3.2.1).
- **Cycle de vie** documenté : 1) tester dans le Debugger (optionnel) ; 2) créer (URL + visibilité) ; 3) authentifier (si OAuth) ; 4) lister les outils ; 5) utiliser (conversations ou appel direct) ; 6) mettre à jour / supprimer.

#### 3.10.2 Créer un connecteur

| Champ | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `name` | string | oui | — | ≤ 64 caractères, alphanumérique avec `_` et `-` uniquement ; **unique dans le Workspace** (référence possible par nom ou UUID) |
| `description` | string | oui (spec) | — | Description |
| `server` | string (URI ≤ 2083, spec) | oui | — | URL du serveur MCP (ex. `https://mcp.deepwiki.com/mcp`) |
| `visibility` | enum | non | `private` (spec) | `private` (créateur seul), `shared_workspace` (tout le Workspace), `shared_org` (toute l'organisation ; **seuls les admins d'organisation** peuvent créer/gérer) |
| `icon_url` | string | non | — | Icône |
| `headers` | object | non | — | En-têtes HTTP envoyés à chaque requête vers le serveur MCP (ex. clés API statiques) |
| `auth_data` | object | non | — | `client_id` et `client_secret` OAuth2 ; requis si le serveur utilise OAuth (absent du schéma `CreateConnectorRequest` de la spec, cf. § 8) |
| `system_prompt` | string | non | — | Prompt système injecté quand les outils du connecteur sont utilisés |
| `title`, `global_headers`, `oauth2_server_metadata`, `oauth2_server_metadata_url`, `auth_methods` (`oauth2`/`bearer`/`none`), `protocol` (`mcp`) | — | non | — | Présents dans la spec seulement (spec) |

- Python : `await client.beta.connectors.create_async(name=..., description=..., server=..., visibility="private")` ; TS `client.beta.connectors.create({...})` ; REST `POST /v1/connectors`.
- Objet renvoyé : `id`, `name`, `description`, `server`, `auth_type`, `created_at`, `modified_at` (TS : `authType`, `createdAt`, `modifiedAt`).

#### 3.10.3 Authentifier

- **Après création, un appel d'authentification est requis même sans identifiants** : passer des identifiants vides.
  - Python : `create_or_update_user_credentials_async(connector_id_or_name=..., name="credential-name", credentials={"headers": {}}, is_default=True)`.
  - TS : `createOrUpdateUserCredentials({ connectorIdOrName, credentialsCreateOrUpdate: { name, credentials: { headers: {} }, isDefault: true } })`.
- **OAuth** : récupérer une URL d'autorisation et y rediriger l'utilisateur ; après consentement, retour vers `app_return_url`.
  - Python : `get_auth_url_async(connector_id_or_name="gmail", app_return_url="https://…/oauth/callback")` ; TS `getAuthUrl({ connectorIdOrName, appReturnUrl })` ; REST `GET /v1/connectors/{connector_id_or_name}/auth_url?app_return_url=…`.
  - Réponse : `auth_url` (URL de redirection) et `ttl` (validité en secondes).
  - **Caution** : passer des jetons par programme **n'est pas supporté** ; utiliser Studio (`https://console.mistral.ai/build/connectors`) pour authentifier.
- Sans auth complétée, impossible de lister ou d'appeler les outils d'un connecteur qui l'exige.
- Endpoints de credentials détaillés **dans la spec seulement** : `GET …/authentication_methods`, `GET …/{organization|workspace|user}/credentials`, `POST|PATCH …/{consumer_scope}/credentials`, `DELETE …/{consumer_scope}/credentials/{credentials_name}`, `DELETE …/user/credentials` (toutes) ; `consumer_scope` ∈ `user`, `workspace`… (spec).

#### 3.10.4 Récupérer et lister

- **Un connecteur** par nom ou UUID : Python `get_async(connector_id_or_name=...)` ; TS `get({ connectorIdOrName })` ; REST `GET /v1/connectors/{name_or_uuid}`. La réponse inclut un tableau `tools` si les outils ont déjà été découverts.
- **Liste** paginée par **curseur** : Python `list_async(page_size=10, cursor=..., query_filters={"active": True})` → `page.items`, `page.pagination.next_cursor` ; TS `list({ pageSize, cursor, queryFilters })` ; REST `GET /v1/connectors?page_size=10&cursor=…`. Filtre `active: true` = connecteurs actifs pour l'utilisateur et le Workspace. `page_size` défaut 100 (spec).

#### 3.10.5 Lister les outils d'un connecteur

- Python `list_tools_async(connector_id_or_name=...)` → objets avec `name`, `description` ; TS `listTools({ connectorIdOrName })` ; REST `GET /v1/connectors/{name}/tools`.

| Paramètre de requête | Défaut | Effet |
|---|---|---|
| `page` | `1` | Pagination par offset |
| `page_size` | `100` | Outils par page |
| `refresh` | `false` | Re-interroge le serveur MCP au lieu du cache |
| `pretty` | `false` | Charge utile simplifiée : `name`, `description`, `annotations`, `inputSchema` compact |

#### 3.10.6 Mettre à jour / supprimer

- **Update** : uniquement les champs à changer ; `connector_id` doit être l'**UUID** (pas le nom). Python `update_async(connector_id=..., description=...)` ; TS `update({ connectorId, updateConnectorRequest: {...} })` ; REST `PATCH /v1/connectors/{id}`. Champs modifiables : `name`, `description`, `server`, `icon_url`, `system_prompt`, `headers`, `auth_data`.
- **Delete** : suppression **définitive** ; les agents qui le référencent **perdent l'accès** à ses outils. Python `delete_async(connector_id=...)` → `result.message` ; TS `delete({ connectorId })` ; REST `DELETE /v1/connectors/{id}`.
- Spec seulement : partage/départage vers le workspace (`PUT|DELETE /v1/connectors/{id}/share`), vers l'organisation (`PUT|DELETE /v1/connectors/{id}/organization/share`), activation/désactivation par consommateur (`POST /v1/connectors/{id}/{consumer_scope}/activate|deactivate`) (spec).

#### 3.10.7 Utiliser un connecteur dans une conversation

- Outil `{"type": "connector", "connector_id": "<nom ou UUID>"}` (TS : `connectorId`) dans `tools` de `conversations.start(_async)`. Tous les outils exposés sont disponibles par défaut.
- **Filtrer** via `tool_configuration` (TS `toolConfiguration`) : `include` (liste blanche) **ou** `exclude` (liste noire) — **pas les deux à la fois**. Ex. `exclude: ["read_wiki_structure"]`, `include: ["ask_question"]`.
- `requires_confirmation` dans le même objet pour exiger l'approbation (§ 3.10.9).
- **Mélange avec outils intégrés** dans le même tableau `tools` (ex. `web_search` + connecteur DeepWiki) ; le modèle choisit selon la requête.
- **Sur un agent** : déclarer le connecteur dans `tools` à la création (`agents.create_async`) ; chaque conversation démarrée avec `agent_id` en dispose sans repasser `tools` (cas d'usage : agent support interrogeant toujours un CRM).
- **Caution** : utiliser `agent_id` **au lieu de** `model` ; impossible de passer les deux.
- La spec prévoit aussi un champ `authorization` (types `oauth2-token` ou `api-key`) sur l'outil `connector` (spec), non documenté dans les pages.

#### 3.10.8 Appel direct d'un outil (`call_tool`)

- Appelle un outil MCP précis **sans conversation ni modèle** : outil et arguments connus, sortie brute pour traitement aval, pipelines chaînés, débogage.
- Python : `call_tool_async(connector_id_or_name="my_deepwiki", tool_name="read_wiki_structure", arguments={"repoName": "sqlite/sqlite"})`.
- TS : `callTool({ connectorIdOrName, toolName, connectorCallToolRequest: { arguments } })`.
- REST : `POST /v1/connectors/{connector_id_or_name}/tools/{tool_name}/call` — `tool_name` **dans le chemin**, corps = `{"arguments": {...}}` seulement.
- Réponse : `content` = liste de blocs typés (**text, image, audio, resource**) renvoyés par le serveur MCP ; la spec ajoute `resource_link` et un objet `metadata` (qui porte `structuredContent`/`isError`/`_meta`) (spec).
- Les noms d'outils doivent correspondre **exactement** (vérifier via list tools). Auth préalable obligatoire si requise.
- Chaînage : plusieurs `call_tool` successifs (ex. `read_wiki_structure` puis `ask_question` avec `question`) sans faire intervenir le modèle.

#### 3.10.9 Confirmation humaine (human-in-the-loop)

- `requires_confirmation` intercepte les appels sensibles (envoi d'e-mail, modification de données) avant exécution pour **approbation ou refus** par un utilisateur ou un système.
- Fonctionne pour **tous les types d'outils** : Connecteurs, outils intégrés (ex. `web_search_premium`), fonctions locales (**SDK Python uniquement**).
- **Configuration** : dans `tool_configuration`, liste des **noms d'outils** à confirmer :

```json
[{"type": "connector", "connector_id": "gmail",
  "tool_configuration": {"requires_confirmation": ["gmail_search"]}},
 {"type": "web_search_premium",
  "tool_configuration": {"requires_confirmation": ["web_search", "news_search"]}}]
```

- **Flux REST** :
  1. `POST /v1/conversations` → au lieu d'exécuter l'outil, `outputs` contient un `function.call` avec `confirmation_status: "pending"` (`tool_call_id`, `name`, `arguments`).
  2. `POST /v1/conversations/{conversation_id}` avec `{"tool_confirmations": [{"tool_call_id": "...", "confirmation": "allow"}]}` pour exécuter et obtenir la réponse, ou `"deny"` pour refuser (« le modèle gère le refus avec élégance »).
  - Plusieurs appels peuvent être en attente : confirmation **individuelle ou par lot** dans une même requête.
- **Flux SDK Python** — prérequis `mistralai` **v2.4+** et extra `mcp` (`pip install mistralai[mcp]`) :
  - `RunContext(model="mistral-large-latest")` (gestionnaire de contexte async) ; `run_ctx.conversation_id = ...` ; `run_ctx.register_func(fn, requires_confirmation=True|False)` pour les fonctions locales (docstring et signature servent de description).
  - `await client.beta.conversations.run_async(run_ctx=..., inputs=..., instructions=..., tools=[...])` exécute la boucle ; résultat : `result.output_entries`, `result.output_as_text`.
  - En cas d'appel à confirmer : levée de `DeferredToolCallsException` avec `.conversation_id`, `.deferred_calls` (chaque `dc` : `tool_name`, `arguments`, `dc.confirm()`, `dc.reject("raison")`), `.executed_results` (résultats d'outils déjà exécutés avant le point de report).
  - Boucle type : attraper l'exception, construire `pending_inputs` à partir de `confirm()`/`reject()`, relancer avec `conversation_id`.
  - **Mode sans état** (API web où l'approbation arrive dans une autre requête) : `deferred.to_dict()` pour sérialiser (front-end / base de données) puis `DeferredToolCallsException.from_dict(state)` pour reprendre ; **toujours préfixer** `executed_results` aux nouvelles entrées pour que le modèle ait le contexte complet.
- Côté schéma : `ToolCallConfirmation {tool_call_id, confirmation: allow|deny}` ; `confirmation_status` ∈ `pending`/`allowed`/`denied` (spec).

#### 3.10.10 Connectors Debugger (Public Preview)

- But : tester un serveur MCP **avant** de l'utiliser avec Studio — joignabilité, configuration d'auth, découverte d'outils, erreurs de validation. Couverture et détails d'erreur susceptibles d'évoluer.
- **Prérequis** : accès Studio + URL du serveur ; si auth : en-tête statique (`Authorization: Bearer <token>`) **ou** identifiants client OAuth2. Pour OAuth2, configurer l'URI de redirection `https://console.mistral.ai/build/connectors/debugger/oauth-callback` dans l'application OAuth.
- Les identifiants saisis dans le Debugger **ne sont pas stockés** (durée de la session uniquement).
- **Accès** : Studio → menu gauche `Connectors` → `Debugger` (coin supérieur droit), ou Studio › Connectors › Debugger (`https://console.mistral.ai/build/connectors/debugger`).
- **Configuration** : champ **Connector URL** ; icône de réglages à côté de `Run diagnostic` → `Credentials` : `Custom header` (`Header name` = `Authorization`, `Header value` = `Bearer <token>`) ou `OAuth 2.0` (`Client ID`, `Client Secret`) → `Run diagnostic`. Caution : ne tester que des serveurs de confiance (les identifiants leur sont envoyés).
- **Rapport** (panneau de droite) ; `Run again` pour relancer. En échec : étape fautive + `Likely cause`, `Suggested fix`, `Raw response`, `Copy as curl`, `Headers`, `Body`, rapport JSON de l'étape (ex. `step: "transport_detection"`, `status: "error"`, `duration`, `data.attempt.request/response`, `error.type: "not_mcp_server"` ; cause affichée « The server responded but does not appear to be an MCP server »).
- **Succès** : `MCP server ready`, version de protocole (ex. `Protocol 2025-11-25`), lien `View official docs`, métriques `Tools`, `Prompts`, `Resources`, `Duration`, `Checks` (ex. `3/3`), `Instructions` (si le serveur en renvoie) ; section Tools avec `Search...` et mode `Interactive` pour inspecter description et `inputSchema` de chaque outil (ex. `echo`, `add`, `current_time`).
- **FAQ de dépannage** (cause → correctif) :

| Symptôme | Correctif indiqué |
|---|---|
| Réponse HTML / JSON-RPC invalide | Utiliser l'URL Streamable HTTP (chemin finissant souvent par `/mcp`) renvoyant du JSON-RPC 2.0 |
| JSON malformé, corps vide | Corps complet avec `jsonrpc`, `id`, `result` ou `error` ; retirer HTML, BOM, bannières de debug, `200` vides |
| Mauvais content-type / erreur gzip | Content-type JSON ou event-stream adapté ; `Content-Encoding: gzip` seulement si le corps est gzippé |
| Timeout, 500, 429 | Vérifier logs, timeouts, retries, rate limits ; renvoyer `Retry-After` sur `429` ; initialisation rapide |
| Auth ne démarre pas après 401 | En-tête `WWW-Authenticate` valide ; métadonnées de ressource protégée disponibles |
| Échec découverte / échange de jeton | Vérifier métadonnées de l'émetteur, enregistrement client, `Client ID`, `Client Secret`, scopes, token endpoint, redirect URI |
| Jeton rejeté après consentement | Valider issuer, audience, expiration, scopes, signature ; même serveur d'autorisation que l'endpoint MCP |
| Erreur CORS | Autoriser l'origine Studio et les en-têtes `Authorization`, `Content-Type`, `Accept`, `Mcp-Session-Id`, `Mcp-Protocol-Version` |
| Reprise de session / réinitialisations répétées | Renvoyer et conserver `Mcp-Session-Id` |
| Échec `initialize` | Résultat `initialize` valide : version de protocole supportée, capabilities, `serverInfo` bien formé |
| Découverte d'outils incorrecte | Noms uniques, descriptions concises, `inputSchema` JSON Schema valide, revue anti-injection de prompt |
| `tools/call` bloque, énorme, `isError`, contenu malformé | Résultats bornés, blocs `content` valides ; `isError` pour erreurs d'outil, erreurs JSON-RPC pour le protocole ; timeouts sur appels aval |

- Limite explicite : « The Connector creation flow isn't in scope for this release » — le Debugger valide, il ne crée pas le connecteur.

#### 3.10.11 Fournisseur Google (Connecteurs de Vibe)

Page orientée Vibe : intégrations OAuth 2.0 « sécurisées » ; lecture/recherche, et action **avec approbation explicite** ; Vibe ne stocke ni mots de passe ni identifiants (flux OAuth Google).

| Service | Fonctions | Scopes demandés (justification) |
|---|---|---|
| **Gmail** | Rechercher des fils, lire des messages, créer des **brouillons** à relire, organiser par libellés | `gmail.readonly` (recherche/lecture, brouillons, libellés en lecture) ; `gmail.compose` (création de brouillons ; **jamais d'envoi automatique**, choisi plutôt que `send`) ; `gmail.modify` (créer/modifier/supprimer des libellés, les appliquer) |
| **Google Calendar** | Lister calendriers, chercher, créer/modifier/supprimer des événements, répondre aux invitations (accept/decline/tentative) | `calendar` (accès complet ; `calendar.readonly` insuffisant) |
| **Google Drive** | Recherche (titre, contenu, type, propriétaire), fichiers récents, lecture (Docs, Sheets via export), métadonnées, permissions | `drive.readonly` (plutôt que `drive.file`, pour lire tout le Drive) |
| **Google BigQuery** | Explorer datasets/tables, exécuter du SQL | `bigquery` (`bigquery.readonly` insuffisant : tables temporaires, gestion de jobs) |
| **Google Workspace (Admin Directory)** | Pour l'Enterprise : synchroniser les Google Groups avec le RBAC de Vibe | `admin.directory.user.readonly` (email, nom, unité organisationnelle) ; `admin.directory.group.readonly` (groupes et membres ; jamais créés/modifiés) |

- **Modèle de consentement** : 1) consentement OAuth (permissions visibles) ; 2) **approbation par action** pour toute écriture (approuver, refuser, ou **pré-autoriser** certaines actions) ; 3) déconnexion à tout moment depuis la page Connectors ou les permissions du compte Google (arrêt immédiat).
- **Données** : connecteurs **temps réel** (Gmail, Calendar, BigQuery) → données récupérées pour la requête en cours, **non stockées** ; **aucun entraînement** sur les données des connecteurs, quel que soit le plan ; traitement et stockage dans les **datacenters européens** de Mistral ; TLS en transit ; conformité à la *Google API Services User Data Policy* (dont *Limited Use*).

### 3.11 Serveur MCP Mistral (page ressource)

- Connecte un agent IA au **workspace Studio** via MCP ; expose le workspace sous forme d'outils MCP ; chaque requête authentifiée par la clé API.

| Propriété | Valeur |
|---|---|
| Endpoint | `https://api.mistral.ai/mcp` |
| Transport | Streamable HTTP |
| Authentification | `Authorization: Bearer <MISTRAL_API_KEY>` |

- Prérequis : clé API (scopée au workspace : l'agent hérite de ses accès) ; client MCP supportant Streamable HTTP **et des en-têtes statiques**. Exporter `MISTRAL_API_KEY` dans l'environnement qui lance le client.
- **Connexion des clients** :

| Client | Commande / configuration | Vérification |
|---|---|---|
| Vibe Code CLI | `vibe mcp add mistralai --url https://api.mistral.ai/mcp --transport streamable-http --api-key-env MISTRAL_API_KEY` → écrit dans `~/.vibe/config.toml` un bloc `[[mcp_servers]]` (`name`, `transport`, `url`) + `[mcp_servers.auth]` (`type = "static"`, `api_key_env`) ; la config stocke le **nom de variable**, pas la clé | `/mcp mistralai` |
| Claude Code | `claude mcp add --transport http mistral https://api.mistral.ai/mcp --header 'Authorization: Bearer ${MISTRAL_API_KEY}'` | `/mcp` |
| Codex | `codex mcp add mistral --url https://api.mistral.ai/mcp --bearer-token-env-var MISTRAL_API_KEY` → `~/.codex/config.toml` (`[mcp_servers.mistral]`, `url`, `bearer_token_env_var`) | `codex mcp list` |
| Autres (Cursor…) | Bloc JSON `mcpServers.mistral` : `type: "http"`, `url`, `headers.Authorization` ; chemins et expansion `${...}` propres à chaque client | Liste d'outils du client |
| curl | `POST` JSON-RPC `{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}` avec `Accept: application/json, text/event-stream` ; réponse en flux SSE | — |

- **Capacités exposées** (outils groupés par capacité Studio) :

| Capacité | Ce qu'un agent peut faire | Garde-fou |
|---|---|---|
| **Apps** | Lister les apps ; lire modules, environnements, versions en cours ; lire runs de déploiement et logs de module/gateway ; redéployer ou rollback un module vers une version déjà exécutée ; publier/dépublier une app au catalogue | Valeurs des variables d'env jamais renvoyées (noms seulement) |
| **Connectors** | Lister, lire détails et outils exposés, lister les credentials | Secrets jamais renvoyés |
| **Documentation** | Chercher dans docs.mistral.ai et lire les pages en Markdown | — |
| **Evaluations** | Gérer projets et évaluations, lire runs et records, suivre les optimisations | — |
| **Libraries** | Lister/créer/supprimer des bibliothèques, ajouter/retirer des documents, gérer les accès | Contenu des documents jamais renvoyé |
| **Observability** | Chercher traces, spans et logs ; ouvrir une trace/un span | — |
| **Organization** | Chercher des membres du workspace, résoudre un nom en ID utilisateur | — |
| **Skills** | Parcourir le même catalogue que Studio, lire un Skill et ses fichiers, écrire une nouvelle version, changer le partage, supprimer | — |
| **Workflows** | Lister, déployer des workflows managés, démarrer et signaler des exécutions, lire événements et logs, gérer les planifications | — |

- Les outils **Observability, Evaluations et Apps** n'apparaissent que si ces fonctionnalités sont **activées pour le workspace**. Le serveur liste les outils disponibles pour la clé (`tools/list`) ; chaque outil décrit ses arguments.
- **Permissions** : chaque appel utilise les permissions de la clé ; certains outils écrivent ou suppriment → configurer une **approbation par outil** dans le client.
- **Dépannage** : `401 {"detail":"Invalid API Key"}` (clé absente, mal orthographiée, révoquée) ; erreur de permission (demander l'accès à un admin du workspace) ; outils Observability/Evaluations/Apps absents (fonctionnalité désactivée → vérifier dans Studio puis reconnecter).

## 4. Interface utilisateur

### 4.1 Carte des routes et chemins de navigation

| Application | Chemin UI | URL | Rôle |
|---|---|---|---|
| Studio | (accueil) | `https://console.mistral.ai` | Console développeur ; création de compte |
| Studio | `API Keys` (barre latérale) | `https://console.mistral.ai/api-keys` | Liste et création de clés ; **liste déroulante de workspace** pour choisir la cible |
| Studio | **Playground** (barre latérale) | non indiquée | Chat de test ; liste **Model** en haut ; paramètres dans la barre latérale droite |
| Studio | `Build` › `Prompts` | `https://console.mistral.ai/build/prompts` | Liste, création (`New prompt`), détails, `Share`, historique de versions |
| Studio | `Build` › `Skills` | `https://console.mistral.ai/build/skills` | Liste, création (`New Skill`), détails, `Share`, `Publish to Vibe`, versions |
| Studio | `Connectors` (menu gauche) | `https://console.mistral.ai/build/connectors` | Gestion / authentification des connecteurs (OAuth) |
| Studio | Studio › Connectors › Debugger (bouton `Debugger` en haut à droite) | `https://console.mistral.ai/build/connectors/debugger` | Diagnostic de serveurs MCP |
| Studio | — | `https://console.mistral.ai/build/connectors/debugger/oauth-callback` | URI de redirection OAuth2 à déclarer pour le Debugger |
| Studio | **Workflows** (barre latérale) › workflow › **Start Workflow** ; onglet **Executions** | non indiquée | Déclenchement et suivi d'exécutions |
| Admin | (accueil) | `https://admin.mistral.ai` | Plan de contrôle ; invite de création d'organisation |
| Admin | Subscriptions › Billing | `https://admin.mistral.ai/organization/billing` | **Add payment method**, **Monthly spending limit**, **Set limit** par workspace, tableau de bord d'usage temps réel |
| Admin | Manage › Workspaces | `https://admin.mistral.ai/organization/workspaces` | **Create workspace**, **Add members**, rôles de workspace |
| Admin | Administration › Members | `https://admin.mistral.ai/organization/members` | **Invite member**, rôles, statut Pending/Active |
| Admin | Administration › Audit logs | `https://admin.mistral.ai/audit-logs` | Journal (clés créées, invitations, changements de facturation) |
| Admin | Administration › Settings | non indiquée (appelée aussi « Organization Settings ») | **Domain verification**, **Email domain authentication**, **SAML SSO**, **Allowed email domain** |
| Vibe | (accueil) | `https://chat.mistral.ai` | Entrée Vibe (ex-Le Chat) ; **Sign in with SSO** |
| Vibe | Work | `https://chat.mistral.ai/work` | Mode Work ; `Context` › `Skills` |
| Vibe | Code › Vibe CLI | `https://chat.mistral.ai/code/extensions` | Génération d'une clé API pour le CLI (lien marqué `app="studio"` dans la source) |

### 4.2 Écrans détaillés

**Modale « Create new key » (Studio)** : champs `Name`, `Expiration`, `Connector access scope` (`Shared connectors only` / `Private and shared connectors`) ; bouton `Create new key` ; dialogue de confirmation affichant la clé une seule fois.

**Playground** : panneau de chat central, liste **Model** en haut, champ de saisie + **Send** (ou Entrée), barre latérale droite avec **Temperature**, **Max tokens**, **Top P** (« and other settings »).

**Prompts** : liste `Prompts` ; bouton `New prompt` ; formulaire `Title`, `Description`, texte du gabarit ; boutons `Save` / `Create prompt` ; page de détails avec `Share` (privé / workspace), historique de versions, champ de **notes de version** ; promotion vers un **alias** (`stable`) si le workspace utilise les alias.

**Skills (Studio)** : liste `Skills` ; `New Skill` ; champs `Title`, `Description`, instructions, pièces jointes ; `Create Skill` ; page de détails (titre, description, instructions, fichiers, version) ; `Share` ; `Publish to Vibe` ; notes de version ; historique.

**Skills (Vibe Work)** : `Context` › `Skills` ; sections **Built-in** / **Personal** / **Workspace** ; **New Skill** ; formulaire **Title**, **Description**, **`SKILL.md`** ; **Create Skill** ; **Share** ; force-enable admin.

**Connectors Debugger** : champ **Connector URL** ; icône de réglages près de `Run diagnostic` (`Credentials` : `Custom header` → `Header name`/`Header value` ; `OAuth 2.0` → `Client ID`/`Client Secret`) ; rapport à droite (`Run again`, `Likely cause`, `Suggested fix`, `Raw response`, `Copy as curl`, `Headers`, `Body`, JSON) ; écran de succès (`MCP server ready`, `Protocol …`, `View official docs`, compteurs `Tools`/`Prompts`/`Resources`/`Duration`/`Checks`, `Instructions`, liste d'outils avec `Search...` et `Interactive`).

**Workflows (console)** : liste dans la barre latérale ; page d'un workflow (ex. **hello-world**) avec **Start Workflow** (saisie de l'entrée JSON) et onglet **Executions**.

**Admin › Settings** : section **Domain verification** (**Add domain**, enregistrement TXT généré, **Verify**, statut **Verified**) ; **Email domain authentication** (toggle + rôle par défaut) ; **SAML SSO** (**Configure** ; ACS URL et Entity ID à copier ; champ d'URL de métadonnées IdP ; **Save**) ; **Allowed email domain**.

**Vibe Work (tâche)** : sélecteur de mode (Chat/Work/Code) dans la barre latérale ; flux en direct (raisonnement, appels d'outils, résultats) ; bouton **Stop** (carré noir) ; panneau **todos** à droite ; demandes d'approbation ; **Canvas** (panneau latéral éditable, bouton **Export**) ; bouton `+` › `Upload Files`.

## 5. API et SDK

### 5.1 Endpoints

Légende : « doc » = décrit dans les pages lues ; « spec » = présent uniquement dans la spec OpenAPI locale.

| Méthode | Chemin | Rôle | Source |
|---|---|---|---|
| POST | `/v1/chat/completions` | Chat completion (function calling, `image_generation`, `document_library`, `connector` acceptés ; pas `web_search*` ni `code_interpreter`) | doc + spec |
| GET | `/v1/models` | Liste des modèles (test de clé) | doc |
| POST | `/v1/files` | Téléversement de fichier | doc |
| GET | `/v1/files/{file_id}/content` | Télécharger un fichier (images/graphiques produits par les outils) | doc |
| POST | `/v1/agents` | Créer un agent | doc |
| GET | `/v1/agents` | Lister (pagination par page) — **déprécié** | spec |
| GET | `/v1/agents/pages` | Lister par curseur, respecte le partage | spec |
| GET | `/v1/agents/{agent_id}` | Lire un agent (`agent_version` entier ou alias) | spec |
| PATCH | `/v1/agents/{agent_id}` | Mettre à jour → nouvelle version | doc + spec |
| DELETE | `/v1/agents/{agent_id}` | Supprimer | spec |
| PATCH | `/v1/agents/{agent_id}/version` | Changer la version active | doc + spec |
| GET | `/v1/agents/{agent_id}/versions` | Lister les versions | spec |
| GET | `/v1/agents/{agent_id}/versions/{version}` | Lire une version | spec |
| PUT / GET / DELETE | `/v1/agents/{agent_id}/aliases` | Créer/mettre à jour, lister, supprimer un alias de version | spec |
| POST | `/v1/conversations` | Démarrer (agent ou modèle) ; `stream: true` pour SSE | doc |
| GET | `/v1/conversations` | Lister | doc |
| GET | `/v1/conversations/{id}` | Détails | doc |
| POST | `/v1/conversations/{id}` | Append (entrées, résultats de fonction, `tool_confirmations`) ; SSE possible | doc |
| DELETE | `/v1/conversations/{id}` | Supprimer | spec |
| GET | `/v1/conversations/{id}/history` | Toutes les entries | doc |
| GET | `/v1/conversations/{id}/messages` | Messages seuls | doc |
| POST | `/v1/conversations/{id}/restart` | Redémarrer depuis `from_entry_id` ; SSE possible | doc |
| POST | `/v1/connectors` | Créer un connecteur | doc |
| GET | `/v1/connectors` | Lister (curseur, `query_filters`) | doc |
| GET | `/v1/connectors/{id_or_name}` | Lire | doc |
| PATCH | `/v1/connectors/{connector_id}` | Mettre à jour (UUID requis) | doc |
| DELETE | `/v1/connectors/{connector_id}` | Supprimer | doc |
| GET | `/v1/connectors/{id_or_name}/auth_url` | URL OAuth (`app_return_url`) → `auth_url`, `ttl` | doc |
| GET | `/v1/connectors/{id_or_name}/tools` | Lister les outils (`page`, `page_size`, `refresh`, `pretty`) | doc |
| POST | `/v1/connectors/{id_or_name}/tools/{tool_name}/call` | Appel direct d'outil | doc |
| PUT / DELETE | `/v1/connectors/{connector_id}/share` | Partager/départager au workspace | spec |
| PUT / DELETE | `/v1/connectors/{connector_id}/organization/share` | Partager/départager à l'organisation | spec |
| POST | `/v1/connectors/{connector_id}/{consumer_scope}/activate` · `/deactivate` | Activer/désactiver pour un consommateur | spec |
| GET | `/v1/connectors/{id_or_name}/authentication_methods` | Méthodes d'auth | spec |
| GET | `/v1/connectors/{id_or_name}/{organization,workspace,user}/credentials` | Lister des credentials | spec |
| POST / PATCH | `/v1/connectors/{id_or_name}/{consumer_scope}/credentials` | Créer / créer-ou-mettre-à-jour des credentials | spec (méthode SDK `create_or_update_user_credentials` en doc) |
| DELETE | `/v1/connectors/{id_or_name}/{consumer_scope}/credentials/{credentials_name}` · `/user/credentials` | Supprimer des credentials | spec |
| POST (JSON-RPC) | `https://api.mistral.ai/mcp` | Serveur MCP Mistral (`tools/list`, `tools/call`…) | doc |

### 5.2 Méthodes SDK

| Domaine | Python (`client.…`) | TypeScript (`client.…`) |
|---|---|---|
| Chat | `chat.complete` | `chat.complete` |
| Fichiers | `files.upload`, `files.retrieve`, `files.download` | `files.upload`, `files.retrieve`, `files.download` |
| Agents | `beta.agents.create` / `create_async`, `beta.agents.update`, `beta.agents.update_version` | `beta.agents.create`, `beta.agents.update({agentId, agentUpdateRequest})`, `beta.agents.updateVersion` |
| Conversations | `beta.conversations.start` / `start_async`, `append`, `restart`, `list`, `get`, `get_history`, `get_messages`, `start_stream`, `append_stream`, `restart_stream`, `run_async` (avec `RunContext`) | `beta.conversations.start`, `append({conversationId, conversationAppendRequest})`, `restart({conversationId, conversationRestartRequest})`, `list`, `get`, `getHistory`, `getMessages`, `startStream`, `appendStream`, `restartStream` |
| Connecteurs | `beta.connectors.create_async`, `get_async`, `list_async`, `list_tools_async`, `update_async`, `delete_async`, `get_auth_url_async`, `create_or_update_user_credentials_async`, `call_tool_async` | `beta.connectors.create`, `get`, `list`, `listTools`, `update({connectorId, updateConnectorRequest})`, `delete`, `getAuthUrl`, `createOrUpdateUserCredentials({connectorIdOrName, credentialsCreateOrUpdate})`, `callTool({connectorIdOrName, toolName, connectorCallToolRequest})` |
| Workflows | décorateurs `workflows.activity()`, `workflows.workflow.define(...)`, `workflows.workflow.entrypoint` ; CLI `mistralai-workflows-cli` | — |

Classes/objets Python cités : `Mistral`, `CompletionArgs`, `ResponseFormat`, `JSONSchema`, `FunctionResultEntry`, `ToolFileChunk`, `RunContext` (`register_func`, `conversation_id`), `DeferredToolCallsException` (`conversation_id`, `deferred_calls`, `executed_results`, `to_dict`, `from_dict`), objets différés (`tool_name`, `arguments`, `confirm()`, `reject(reason)`), résultat de run (`output_entries`, `output_as_text`), `MistralAzure`, `MistralGCP`.

### 5.3 Schémas clés (résumé)

- **Tool** (union discriminée par `type`) : `function` {`function`: {`name`, `description`, `parameters`, `strict`}} · `web_search` · `web_search_premium` · `code_interpreter` · `image_generation` · `document_library` {`library_ids`} · `connector` {`connector_id`, `authorization` (spec), `tool_configuration`} ; `tool_configuration` = {`include`, `exclude`, `requires_confirmation`}.
- **ConversationResponse** : `object: "conversation.response"`, `conversation_id`, `outputs[]` (`message.output` | `tool.execution` | `function.call` | `agent.handoff`), `usage`, `guardrails` (spec).
- **Entrée de confirmation** : `tool_confirmations: [{tool_call_id, confirmation: "allow"|"deny"}]`.
- **Résultat de fonction** : `{type: "function.result", tool_call_id, result}`.

### 5.4 Codes d'erreur et réponses notables

| Code / message | Contexte | Signification |
|---|---|---|
| `401 Unauthorized` | API | Clé incorrecte ou absente |
| `401 {"detail":"Invalid API Key"}` | Serveur MCP Mistral | Clé absente, mal orthographiée ou révoquée |
| `402 Payment Required` | API | Aucun moyen de paiement |
| `429 Too Many Requests` | API | Limite de débit **ou** limite de dépense mensuelle du workspace atteinte (jusqu'au prochain cycle) |
| Erreur de permission | Outil MCP | Accès workspace supplémentaire requis |
| `error.type: "not_mcp_server"` | Debugger (étape `transport_detection`) | L'URL ne répond pas en MCP |
| `403` | Guardrails | `block_on_error: true` bloque la requête par un 403 en cas d'erreur serveur (spec) |

## 6. Limites, quotas, tarifs, disponibilité

| Sujet | Fait documenté |
|---|---|
| Free mode Studio | Activé par défaut, sans carte ; limites d'usage et de débit (valeurs non données) |
| Activation de la facturation | Nécessaire pour des clés « fonctionnelles » selon les quickstarts Admin ; effet sous 2–3 min |
| Moyens de paiement | Carte bancaire ou marketplace cloud (AWS, Azure) |
| Limites de dépense | Mensuelles, en USD, par workspace (`Set limit`) et au niveau organisation (`Monthly spending limit`) ; dépassement → `429` jusqu'au cycle suivant |
| SSO SAML | Plan **Enterprise** |
| Vérification de domaine | Dès **Team+** ; propagation DNS ≤ 48 h (souvent < 15 min) |
| Chat (onglet Vibe) | Retrait progressif ; fenêtre de migration de 6 mois pour l'Enterprise |
| Agents | Modèles supportés : `mistral-medium-latest`, `mistral-large-latest` (FAQ) |
| Handoffs | Aucune limite au nombre de handoffs chaînés |
| Conversations | Accès limité aux conversations du créateur de la clé ; `store=False` pour ne pas stocker |
| Outils intégrés | `web_search*` et `code_interpreter` : Conversations/Agents uniquement |
| Connecteurs | **Public Preview** ; `name` ≤ 64 caractères `[A-Za-z0-9_-]` ; unicité par workspace ; `shared_org` réservé aux admins d'organisation ; liste d'outils `page_size` 100 par défaut ; URL OAuth à durée de vie `ttl` (secondes) |
| Debugger | **Public Preview** ; identifiants non stockés ; ne crée pas de connecteur |
| Confirmation humaine (SDK) | `mistralai` ≥ 2.4 + extra `mcp` ; fonctions locales : SDK Python uniquement |
| Skills | Limite de nombre de fichiers d'appui (valeur non donnée) |
| RAG (quickstart) | PDF/TXT/DOCX ; < 10 pages traité en < 30 s en général |
| Prérequis runtimes | Python 3.9+ / Node 18+ (SDK) ; Python 3.12+ (Workflows, Vibe CLI manuel) ; `uv` (Workflows) |
| Région GCP (SDK) | `europe-west4` par défaut |
| Connecteurs Google (Vibe) | Données temps réel non stockées (Gmail, Calendar, BigQuery) ; aucun entraînement quel que soit le plan ; traitement en datacenters européens |
| Serveur MCP Mistral | Outils Observability/Evaluations/Apps seulement si activés pour le workspace |
| Tarifs | Non détaillés dans ces pages ; renvoi à `https://mistral.ai/pricing`. L'usage des outils intégrés apparaît dans `connector_tokens` / `connectors` (lien avec la facturation non précisé) |

## 7. Détails fins, pièges, cas particuliers, dépréciations

- **Clés API affichées une seule fois** (Studio et quickstarts) ; à régénérer si perdues. Clés scopées au workspace ; sélectionner le bon workspace dans la liste déroulante **avant** `Create new key`.
- **Portée Connecteurs d'une clé** : une clé `Shared connectors only` ne voit pas les connecteurs privés de son créateur.
- **Python V2** : import `mistralai.client` (et non `mistralai`) ; Azure/GCP intégrés au paquet principal, constructeurs renommés.
- **TS** : les méthodes prennent souvent un objet imbriqué (`…Request`) en plus des identifiants ; noms en camelCase dans réponses (`toolCalls`, `conversationId`, `authType`).
- **`agent_id` XOR `model`** au démarrage d'une conversation.
- **`include` XOR `exclude`** dans `tool_configuration`.
- **Mise à jour d'agent = nouvelle version active** : y compris l'ajout de `handoffs` (chaque mise à jour de la liste crée une version) ; revenir en arrière avec `update_version`.
- **`restart` impossible** si la conversation n'a jamais reçu d'`append`.
- **Fonctions locales** : la conversation s'arrête sur un `function.call` ; il faut `append` un `function.result` avec le même `tool_call_id`, sinon pas de réponse finale. Le nom de fonction déclaré doit correspondre à celui testé côté client (snake_case en Python, camelCase dans les exemples TS).
- **Images et graphiques** : jamais inline ; récupérer via `file_id` et l'API Files.
- **`web_search` en Chat Completions** : non supporté (pas de références renvoyées).
- **Connecteurs** : appel d'authentification requis **même sans identifiants** (credentials vides) ; OAuth uniquement via Studio (pas de jeton programmatique) ; `update`/`delete` exigent l'**UUID**, alors que `get`, `list_tools`, `call_tool`, `auth_url` et l'outil `connector` acceptent nom **ou** UUID ; supprimer un connecteur coupe l'accès des agents qui le référencent ; `refresh=true` pour forcer la redécouverte d'outils (sinon cache).
- **Confirmation** : la liste `requires_confirmation` porte sur des **noms d'outils** (pour `web_search_premium` : `web_search`, `news_search`) ; en mode sans état, préfixer `executed_results` ; plusieurs confirmations possibles dans une requête.
- **Debugger** : n'envoyer des secrets qu'à des serveurs de confiance ; enregistrer l'URI `…/debugger/oauth-callback` côté fournisseur OAuth.
- **Serveur MCP Mistral** : la config Vibe/Codex stocke le **nom** de la variable d'environnement ; l'expansion `${...}` dépend du client ; certains outils écrivent/suppriment → approbation par outil recommandée.
- **Vibe CLI** : agent par défaut `accept-edits` (écrit sans confirmation par étape) ; `ask` plus prudent ; demande de confiance pour les dossiers contenant `AGENTS.md`, `.vibe/config.toml`, `.agents/skills/`.
- **Skills Studio** : `Share` ≠ `Publish to Vibe` ; description = condition de déclenchement (champ le plus important) ; un Skill par procédure.
- **SSO** : Name ID au format e-mail ; ACS URL / Entity ID identiques des deux côtés ; l'**Email domain authentication** ajoute automatiquement **tout** porteur d'une adresse du domaine.
- **429 ambigu** : même code pour rate limit et dépassement de budget workspace.
- **Dépréciations** : `GET /v1/agents` déprécié au profit de `GET /v1/agents/pages` (spec) ; Agents de l'ancien Chat → Skills ; onglet Chat retiré ; SDK Python V1 (`mistralai<2`) remplacé par V2.

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Free mode vs facturation obligatoire** : les quickstarts Studio/développeur affirment un accès API gratuit sans carte, alors que les quickstarts Admin disent que les clés restent inactives tant qu'aucun moyen de paiement n'est enregistré, et que la table d'erreurs prévoit `402 Payment Required`. Le périmètre exact (Free mode personnel vs organisation ?) n'est pas expliqué.
2. **Quickstart RAG** : intitulé « Create a Library » mais le code téléverse un fichier (`files.upload`, `purpose="retrieval"`) et passe `documents=[{"type":"file","id":…}]` à `chat.complete`. La spec n'a ni `retrieval` dans `FilePurpose` (`fine-tune`, `batch`, `ocr`, `agentic_safety`) ni champ `documents` dans `ChatCompletionRequest`, alors que l'outil `document_library` attend des `library_ids`. Exemple probablement obsolète ou API non publique (inférence).
3. **Modèles des Agents** : la FAQ limite les agents à `mistral-medium-latest` / `mistral-large-latest`, mais les exemples Connecteurs créent un agent en `mistral-small-latest`.
4. **ID de conversation après append** : la doc dit qu'un nouvel ID est fourni à chaque append, mais l'exemple d'append renvoie le même `conv_0684fe18…` que la conversation d'origine (seul `restart` change l'ID dans les exemples).
5. **Sorties d'exemple erronées** : l'onglet « output » du démarrage de conversation affiche un objet Agent au lieu d'une `conversation.response`.
6. **Champs `agent.handoff`** : exemples avec `agent_id`/`agent_name` ; spec avec `previous_agent_id/name` et `next_agent_id/name`.
7. **Chunk `tool_reference`** : l'exemple contient `source: "brave"` ; la spec ne définit pas `source` mais `favicon` et `description`.
8. **Changement de version** : curl de la doc avec corps JSON et méthode implicite POST ; spec : `PATCH` avec `version` en paramètre de requête. Idem pour l'update d'agent (curl sans `-X PATCH`).
9. **`description` d'agent** : présentée comme non optionnelle dans la doc ; la spec n'exige que `model` et `name` ; un exemple curl Connecteurs crée un agent sans description.
10. **Création de connecteur** : la doc liste `auth_data` (client_id/secret OAuth2) ; le schéma `CreateConnectorRequest` de la spec ne l'a pas mais propose `auth_methods`, `oauth2_server_metadata(_url)`, `global_headers`, `title`, `protocol`. Par ailleurs la spec prévoit un champ `authorization` (jeton OAuth2 ou clé API) sur l'outil `connector`, alors que la doc affirme que passer des jetons par programme n'est pas supporté.
11. **Visibilité `shared_org`** : présente dans la doc et l'enum de la spec, mais la description du champ dans la spec ne cite que `shared_workspace` et `private`.
12. **Handoffs, exemple B (curl)** : le résultat de fonction est envoyé par un nouveau `POST /v1/conversations` avec `agent_id` (donc une nouvelle conversation) au lieu d'un append sur `/v1/conversations/{id}`.
13. **Coquilles dans les exemples TS** : `getEuropeanentralBankInterestRate`, type Python `date: str` en TS, guillemet manquant dans `inputs: "Who is Albert Einstein?,`, variable `agent.id` non définie (websearch) ; lien d'exemples TS vers `client-js` alors que l'installation pointe vers `client-ts`.
14. **Invocation des Skills dans Vibe** : `@` (Platform overview) vs `/{skill-name}` ou mention (quickstart Vibe Work).
15. **Création de connecteurs dans Studio** : le Debugger indique que « le flux de création de connecteur n'est pas dans le périmètre de cette version », alors que la page de gestion renvoie à `console.mistral.ai/build/connectors` pour l'authentification. On ignore si l'UI Studio permet de créer un connecteur ou seulement de l'authentifier.
16. **Page Google** : « chaque action d'écriture (envoyer un brouillon…) requiert approbation » alors que Gmail ne fait que créer des brouillons sans jamais envoyer ; Google Drive n'est pas classé parmi les connecteurs « temps réel » non stockés — le traitement/stockage des données Drive n'est pas précisé.
17. **Prompts** : mention d'« applications qui référencent des définitions de prompts partagées » sans API documentée dans ces pages ; alias disponibles « si votre workspace utilise des alias » (condition non expliquée).
18. **Valeurs manquantes** : limites du Free mode, limite de fichiers des Skills, `ttl` typique d'une URL OAuth, autres paramètres du Playground (« and other settings »).
19. **Playground** : « comparer des sorties » se fait en changeant de modèle et en renvoyant le prompt ; aucune vue de comparaison côte à côte n'est décrite.
20. **Défaut de `temperature`** : l'objet Agent Python montre `0.3` sans valeur fournie, la sortie TS montre `null`.
21. **Vocabulaire « connector »** : la doc Agents appelle les outils intégrés des « built-in connector tools » et l'usage les compte dans `connectors`/`connector_tokens`, ce qui peut se confondre avec les Connecteurs MCP. L'enum `BuiltInConnectors` de la spec inclut en plus `mistral_mcp`, non documenté.
22. **Styles de pagination différents** : conversations (`page` 0-indexée), outils de connecteur (`page` 1-indexée), connecteurs et `/v1/agents/pages` (curseur).
23. **Nom de clé optionnel ?** : la légende d'image de la modale parle d'un nom « optionnel », le texte demande d'en ajouter un.
24. **Sous-outils de `web_search_premium`** : la configuration de confirmation cite `web_search` et `news_search`, ce qui suggère que la variante premium expose deux outils internes (inférence) ; non expliqué ailleurs.
25. **FAQ Agents** : le composant `Faq` référence des entrées `price-per-image` / `tokens-per-image` absentes de la page (reste d'une autre page, inférence).

## Annexe — Couverture

| # | Fichier | Statut | Source |
|---|---|---|---|
| 1 | getting-started/clients.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/clients.md |
| 2 | getting-started/platform-overview.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/platform-overview.md |
| 3 | quickstarts/admin/configure-sso.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/admin/configure-sso.md |
| 4 | quickstarts/admin/create-organization.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/admin/create-organization.md |
| 5 | quickstarts/admin/manage-workspaces.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/admin/manage-workspaces.md |
| 6 | quickstarts/developer/build-a-workflow.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/developer/build-a-workflow.md |
| 7 | quickstarts/developer/build-an-agent.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/developer/build-an-agent.md |
| 8 | quickstarts/developer/first-api-request.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/developer/first-api-request.md |
| 9 | quickstarts/developer/rag-document-search.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/developer/rag-document-search.md |
| 10 | quickstarts/studio/activate-and-generate-api-key.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key.md |
| 11 | quickstarts/studio/create-reusable-prompt.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/studio/create-reusable-prompt.md |
| 12 | quickstarts/studio/create-skill.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/studio/create-skill.md |
| 13 | quickstarts/studio/test-model-playground.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/studio/test-model-playground.md |
| 14 | quickstarts/vibe-code/install-cli.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/vibe-code/install-cli.md |
| 15 | quickstarts/vibe-code/scaffold-a-project.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/vibe-code/scaffold-a-project.md |
| 16 | quickstarts/vibe-work/analyze-data.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/vibe-work/analyze-data.md |
| 17 | quickstarts/vibe-work/create-first-skill.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/vibe-work/create-first-skill.md |
| 18 | quickstarts/vibe-work/first-task.md | ✅ lu en entier | https://docs.mistral.ai/getting-started/quickstarts/vibe-work/first-task.md |
| 19 | resources/mcp.md | ✅ lu en entier | https://docs.mistral.ai/resources/mcp.md |
| 20 | studio/agents/agent-tools.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/agent-tools.md |
| 21 | studio/agents/agent-tools/code_interpreter.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/agent-tools/code_interpreter.md |
| 22 | studio/agents/agent-tools/function-calling.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/agent-tools/function-calling.md |
| 23 | studio/agents/agent-tools/image_generation.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/agent-tools/image_generation.md |
| 24 | studio/agents/agent-tools/websearch.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/agent-tools/websearch.md |
| 25 | studio/agents/agents-api.md | ✅ lu en entier (3 lectures successives, sorties JSON longues résumées) | https://docs.mistral.ai/studio/agents/agents-api.md |
| 26 | studio/agents/handoffs.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/handoffs.md |
| 27 | studio/agents/introduction.md | ✅ lu en entier | https://docs.mistral.ai/studio/agents/introduction.md |
| 28 | studio/connectors.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors.md |
| 29 | studio/connectors/confirmation.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors/confirmation.md |
| 30 | studio/connectors/conversations.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors/conversations.md |
| 31 | studio/connectors/debugger.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors/debugger.md |
| 32 | studio/connectors/management.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors/management.md |
| 33 | studio/connectors/providers/google.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors/providers/google.md |
| 34 | studio/connectors/tool_calling.md | ✅ lu en entier | https://docs.mistral.ai/studio/connectors/tool_calling.md |

Vérifications complémentaires (grep ciblé) dans `openapi.yaml` : chemins `/v1/agents*`, `/v1/conversations*`, `/v1/connectors*` ; schémas `Agent`, `CreateAgentRequest`, `UpdateAgentRequest`, `ConversationRequestBase`, `AppendConversationRequest`, `RestartConversationRequest`, `CompletionArgs`, `ToolConfiguration`, `ToolCallConfirmation`, `FunctionCallEntry`, `ToolExecutionEntry`, `AgentHandoffEntry`, chunks `ToolFileChunk`/`ToolReferenceChunk`, événements SSE, `CustomConnector`, `DocumentLibraryTool`, `CreateConnectorRequest`, `PublicResourceVisibility`, `ConnectorToolCallResponse`, `FilePurpose`, `ChatCompletionRequest`.
