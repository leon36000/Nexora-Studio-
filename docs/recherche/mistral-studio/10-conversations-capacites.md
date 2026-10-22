# 10 — Conversations, chat completions et capacités des modèles

> **Périmètre** : page d'accueil Studio ; API Chat Completions (requête, réponse, streaming, multi-tour, `prefix`, `stop`, `safe_prompt`) et référence exhaustive de ses paramètres ; Prompt Registry ; guide de prompting ; reasoning ; vision ; function calling ; structured outputs (JSON mode, schéma custom) ; citations ; predicted outputs ; prompt caching ; embeddings texte et code ; modération (API de classification + guardrails déclaratifs) ; Secrets Manager. · **Sources** : 19 pages de docs.mistral.ai (copie du 21/10/2026), complétées par des vérifications ciblées dans la spec OpenAPI locale (signalées « (spec) ») · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Page d'accueil Studio
   - 3.2 Chat Completions : fonctionnement général
   - 3.3 Référence complète des paramètres de requête
   - 3.4 Messages et blocs de contenu (chunks)
   - 3.5 Objet réponse et streaming
   - 3.6 Prompt Registry (prompts versionnés)
   - 3.7 Guide de prompting
   - 3.8 Reasoning (`reasoning_effort`)
   - 3.9 Vision
   - 3.10 Function calling
   - 3.11 Structured outputs (JSON mode et schéma custom)
   - 3.12 Citations & références
   - 3.13 Predicted outputs
   - 3.14 Prompt caching
   - 3.15 Embeddings texte (`mistral-embed`)
   - 3.16 Embeddings code (`codestral-embed`)
   - 3.17 Moderation API
   - 3.18 Custom guardrails
   - 3.19 Secrets Manager
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Studio** (console : https://console.mistral.ai) est la plateforme développeur de Mistral : l'**API** sert à construire IA conversationnelle, agents autonomes, « document intelligence » et RAG ; la **console** sert à gérer des briques réutilisables, gérer les clés, tester les modèles (Playground) et suivre l'usage. Certaines fonctionnalités varient selon le plan (renvoi vers la page de tarifs).
- **Chat Completions** (`POST https://api.mistral.ai/v1/chat/completions`) est l'API cœur, **sans état** : on envoie la liste complète des messages (`system`, `user`, `assistant`, `tool`) et on reçoit un message `assistant` ; le multi-tour se fait en renvoyant l'historique. Deux modes : réponse complète ou **streaming SSE**. Le `content` d'une réponse est soit une chaîne, soit une **liste de chunks typés** (texte, `thinking`, `reference`…).
- Sur cette même API se greffent les capacités : **vision** (images par URL ou base64, ≤ 8 images, ≤ 10 Mo), **function calling** (`tools`, `tool_choice`, `parallel_tool_calls`, exécution côté développeur), **structured outputs** (`response_format` : `json_object` ou `json_schema`), **citations** (chunks `reference` renvoyant aux sources fournies via un résultat d'outil), **reasoning** (`reasoning_effort`, chunk `thinking`), **predicted outputs** (`prediction`, réduction de latence), **prompt caching** (`prompt_cache_key`, tokens en cache facturés **10 %** du prix d'entrée), **guardrails** déclaratifs (`guardrails`) et `safe_prompt`.
- **Prompt Registry** (bêta, `client.beta.prompts`, endpoints `/v2/prompts`) : stockage centralisé, versionné, de prompts avec variables `{{variable}}`, **alias** (`production`, `staging`…) modifiables depuis Studio, portée de partage `private`/`workspace`. **SDK Python V2 uniquement.**
- **Embeddings** (`POST /v1/embeddings`) : `mistral-embed` (texte, 1024 dimensions) et `codestral-embed` (code, 1536 par défaut, max 3072, `output_dimension` + `output_dtype` : `float`, `int8`, `uint8`, `binary`, `ubinary`). Vecteurs de norme 1.
- **Modération** : modèle `mistral-moderation-2603` (11 catégories dont `jailbreaking`), deux endpoints (`/v1/moderations` texte brut, `/v1/chat/moderations` conversation). `mistral-moderation-2411` **déprécié le 31 mars 2026**. Les **Custom Guardrails** (config `moderation_llm_v2`, recommandés) s'attachent à une chat completion, une conversation ou un agent, filtrent **uniquement l'entrée** et renvoient **403** en cas de blocage.
- **Reasoning** : les modèles de raisonnement « natifs » `magistral-small-latest` / `magistral-medium-latest` sont **dépréciés** ; le raisonnement passe désormais par `reasoning_effort` sur `mistral-small-latest`, `mistral-medium-3-5`, `mistral-large-4-0` et `zai-glm-5-3`.
- **Secrets Manager** (Studio › Secrets Manager, **Public Preview**) : coffre de secrets à portée **workspace**, valeurs en écriture seule, versionnées, suppression douce restaurable, lus au démarrage par les **managed deployments** de workflows via la référence `secret:workspace:<name>`.
- SDK officiels : Python (`mistralai`, deux générations **V1** `from mistralai import Mistral` et **V2** `from mistralai.client import Mistral`, V2 par défaut dans la doc) et TypeScript (`@mistralai/mistralai`, paramètres en camelCase). Plusieurs fonctionnalités récentes (Prompt Registry, reasoning, guardrails) n'existent **qu'en V2**.

---

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| Studio / AI Studio | Plateforme développeur Mistral (console + API). La page Secrets parle d'« AI Studio ». |
| Console | Interface web `https://console.mistral.ai` (Playground, clés, usage, agents, secrets…). |
| Playground | Zone de la console pour tester prompts, comparer modèles et régler les paramètres sans code. |
| Chat Completion API | Endpoint `POST /v1/chat/completions` : liste de messages en entrée → un message `assistant` en sortie. |
| `messages` | Historique envoyé à chaque appel ; chaque message a un `role` (`system`, `user`, `assistant`, `tool`). |
| System message | Message optionnel fixant comportement/contexte (géré par le développeur). |
| User message | Message côté humain (question, instruction, contexte). |
| Assistant message | Réponse du modèle ; peut aussi ouvrir une conversation (salutation) ou servir de **préfixe**. |
| Tool message | Message `role: "tool"` portant le résultat d'une fonction exécutée par le développeur (`tool_call_id`, `name`, `content`). |
| Multi-turn | Conversation à plusieurs tours, gérée en renvoyant tout l'historique. |
| Interleaved events | Éléments intercalés dans une réponse : appels d'outils, citations, (côté agents) handoffs. |
| Chunk (content chunk) | Bloc typé d'un `content` sous forme de liste : `text`, `image_url`, `document_url`, `reference`, `file`, `thinking`, `input_audio`, `resource`, `resource_link` (spec). |
| `prefix` | Drapeau d'un message `assistant` final forçant la réponse à commencer par son contenu. |
| `safe_prompt` | Booléen qui injecte un prompt de sécurité avant la conversation (premier niveau de modération). |
| `stop` | Séquence(s) d'arrêt ; non incluse(s) dans la sortie. |
| Streaming | Envoi de la complétion par fragments (`chat.completion.chunk`) en SSE, terminé par `data: [DONE]`. |
| `finish_reason` | Motif de fin : `stop`, `length`, `model_length`, `error`, `tool_calls` (spec). |
| Prompt Registry | Registre central de prompts versionnés dans Studio (API `beta.prompts`). |
| Template variable | Emplacement `{{variable}}` dans un prompt stocké, à substituer côté client. |
| Alias (prompt) | Étiquette nommée (`production`, `staging`) pointant vers une version d'un prompt, déplaçable depuis Studio. |
| Pinning | Fixer la version (numéro ou alias) d'un prompt récupéré pour figer le comportement en production. |
| Few-shot / zero-shot prompting | Inclure (ou non) des exemples d'échanges dans l'historique. |
| Reasoning / Test Time Computation | Génération d'une chaîne de pensée avant la réponse finale, consommant plus de tokens. |
| `reasoning_effort` | Paramètre réglant le raisonnement (`high` → trace complète ; `none` → raisonnement minimal sans trace). |
| ThinkChunk | Chunk `type: "thinking"` contenant la trace de raisonnement (liste de `TextChunk`). |
| Native reasoning (deprecated) | Anciens modèles Magistral dédiés au raisonnement, dépréciés. |
| Vision | Analyse d'images en entrée (pas de génération d'images). |
| Function calling / Tool calling | Le modèle génère nom + arguments d'une fonction déclarée ; le développeur l'exécute et renvoie le résultat. |
| `tool_choice` | Politique d'usage des outils : `auto`, `any`, `none` (+ `required` et choix d'une fonction précise dans la spec). |
| `parallel_tool_calls` | Autorise plusieurs appels d'outils dans une même réponse (défaut `true`). |
| Successive / parallel function calling | Enchaînement d'appels sur plusieurs tours / plusieurs appels dans un même tour. |
| Structured outputs | Sortie contrainte : JSON mode (`json_object`) ou schéma custom (`json_schema`). |
| `client.chat.parse` | Méthode SDK prenant un modèle Pydantic/Zod comme `response_format` et renvoyant `message.parsed`. |
| Citations & References | Chunks `reference` (`reference_ids`) indiquant quelles sources (fournies par un outil) étayent le texte. |
| Predicted outputs | Paramètre `prediction` fournissant le contenu attendu pour réduire la latence. |
| Prompt caching | Réutilisation de tokens de préfixe déjà calculés ; facturés 10 % ; blocs de 64 tokens. |
| `prompt_cache_key` | Identifiant applicatif stable (session, conversation, workflow) augmentant les chances de cache hit. |
| Embeddings | Vecteurs représentant le sens d'un texte ; norme 1. |
| `output_dimension` / `output_dtype` | Taille et type numérique des embeddings (`codestral-embed`). |
| Moderation API | Classification de texte/conversation en catégories de politique, avec scores et booléens. |
| Custom Guardrails | Règles de modération déclarées dans la requête (`guardrails`), appliquées avant le modèle. |
| `moderation_llm_v2` | Configuration de guardrail adossée à `mistral-moderation-2603`. |
| `block_on_error` | Bloque la requête si l'évaluation de modération échoue. |
| Secrets Manager | Coffre de secrets par workspace, consommé par les managed deployments. |
| Managed deployments | Déploiements gérés de workflows sur AI Studio (lecteurs des secrets). |
| Secret reference | Chaîne `secret:workspace:<name>`, résout toujours la dernière version. |
| Soft delete | Suppression récupérable sans expiration (secrets). |

---

## 3. Fonctionnalités en détail

### 3.1 Page d'accueil Studio (`/studio`)

**Description** : Studio est présenté comme la plateforme développeur de Mistral pour les applications d'IA. Deux usages : l'**API** (IA conversationnelle, agents autonomes, document intelligence, RAG) et la **console** (gérer des briques réutilisables, gérer les clés, tester des modèles, suivre l'usage). Lien console : `<AppLink href="https://console.mistral.ai" app="studio">` → « Studio ».

**Sections de la page et cartes de navigation (« Studio capabilities »)** — elles reflètent la structure fonctionnelle de Studio :

| Carte | Description (paraphrasée) | Lien doc |
|---|---|---|
| Core API | API unifiée : génération de texte, vision, extraction de données structurées | `/studio/conversations/chat-completion` |
| Agent Tools | Modèles + outils intégrés pour raisonnement multi-étapes et tâches autonomes | `/studio/agents/introduction` |
| Document AI | Traitement de documents à l'échelle : Mistral OCR, annotations, extraction structurée | `/studio/document-processing/overview` |
| Audio | Transcription et synthèse vocale avec Voxtral | `/studio/audio/overview` |
| RAG & Embeddings | Pipelines de récupération sur mesure avec embeddings + génération | `/studio/knowledge-rag/rag_quickstart` |
| Libraries | Ingestion et recherche de documents gérées (RAG intégré) | `/studio/search/libraries` |
| Connectors | Relier modèles et Agents à des outils et sources externes | `/studio/connectors` |
| Safety & Moderation | Détection/filtrage de contenus indésirables via l'API de modération | `/studio/safety-moderation` |
| Batch processing | Réduction des coûts **jusqu'à 50 %** pour les charges asynchrones volumineuses | `/studio/batch-processing` |

**« Getting started with the API »** (2 étapes) :
1. Créer une clé API dans la console ou via la page **API keys** d'Admin (`/admin/identity-access/api-keys`).
2. Envoyer une première requête : quickstart « send your first API request » (chat completion en Python ou TypeScript).
- Encadré `:::tip` : commencer par le guide Chat Completions puis explorer les autres fonctionnalités.

**« Getting started with the console »** : ouvrir Studio, aller dans le **Playground** pour tester des prompts, comparer des modèles et expérimenter les paramètres « sans code » ; depuis là, gérer les clés API, consulter l'usage et configurer des agents.
- Encadré `:::info` : certaines fonctionnalités varient selon le plan → page https://mistral.ai/pricing.

**« Explore »** : cartes « Developer quickstart » et « Studio quickstart » (toutes deux vers `/#quickstarts`), « API reference » (`/api`, documentation complète des endpoints), « SDKs » (`/resources/sdks`, bibliothèques officielles Python et TypeScript).

### 3.2 Chat Completions : fonctionnement général

**Principe** : l'API accepte une liste de messages et génère un nouveau message de rôle `"assistant"`. Le champ `content` de la réponse peut être une `string` ou une **liste de chunks** de types différents selon les fonctionnalités activées (citations, tool calls, reasoning…). Cas d'usage cités : chatbots, classification, extraction de données, résumé, génération de code, question-réponse.

**Non-streaming** : une seule réponse complète, jusqu'à ce que le modèle s'arrête ou que le nombre maximal de tokens soit atteint ; plus la sortie est longue, plus la latence est élevée.

**Streaming** (`"stream": true`) : la latence du **premier token** dépend surtout du nombre de tokens d'entrée ; ensuite flux de tokens jusqu'à l'arrêt. Des événements intercalés (tool calls, citations) peuvent apparaître entre les tokens.

Requête minimale (curl) :
```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -H "Authorization: Bearer $MISTRAL_API_KEY" \
  -d '{"model": "mistral-large-latest",
       "messages": [{"role": "user", "content": "How far is the moon from earth?"}]}'
```

**Rôles des messages** :
- `system` : **optionnel** ; fixe comportement et contexte (personnalité, instructions de tâche, traits, contexte, contraintes de créativité…).
- `user` : point de vue humain (requête, question, commentaire, feedback).
- `assistant` : réponse du modèle ; peut aussi figurer en début de conversation (ex. message d'accueil).
- `tool` : n'apparaît qu'avec le **function calling**, à l'étape où le modèle formule la réponse finale à partir du résultat de l'outil.
- Astuce (`:::tip`) : on peut soit fusionner `system` et `user` dans un seul message `user`, soit les séparer ; la doc recommande de tester les deux selon le cas d'usage.

**Multi-tour** : renvoyer l'historique (`user` → `assistant` → `user`…). Exemple : « What is the capital of France? » → « The Capital of France is **Paris**. » → « Translate that to French. » → réponse « La capitale de la France est **Paris**. » (usage 26/10/36 tokens). Des événements (tool calls, handoffs d'agents) peuvent s'intercaler. Encadré `:::tip` : pour simplifier la gestion multi-tour, voir les **Agents and Conversations APIs** (outils et connecteurs intégrés).

**Fonctions annexes (« Other useful features »)** :

| Fonction | Forme | Comportement | Exemple de la doc |
|---|---|---|---|
| `prefix` | `{"role":"assistant","content":"…","prefix":true}` en **dernier** message | La réponse commence toujours exactement par ce contenu, puis continue. Usages : imposer un format, limiter les hallucinations. | Préfixe « The Capital of France is » → réponse « The Capital of France is **Paris**. » (le contenu renvoyé inclut le préfixe) |
| `safe_prompt` | booléen de premier niveau | Premier niveau de modération simple pour des réponses « plus sûres et respectueuses » ; renvoi vers la doc modération/guardrailing pour une modération plus poussée. | Demande « répondre par une insulte » : avec `safe_prompt: true` réponse polie (37 tokens de sortie) ; sans, insulte (64 tokens). Les `prompt_tokens` restent 16 dans les deux cas. |
| `stop` | liste de chaînes | Le modèle s'arrête dès qu'une chaîne est générée ; la sortie **ne contient pas** la chaîne d'arrêt. | `stop: ["."]` → « The capital of France is **Paris** » (sans point final), `finish_reason: "stop"` |

« More » : la page renvoie vers Vision, Function Calling, Predicted Outputs, Structured Outputs.

### 3.3 Référence complète des paramètres de requête `POST /v1/chat/completions`

Les guides ne documentent qu'une partie des paramètres ; la table ci-dessous fusionne guides et schéma `ChatCompletionRequest` de la spec (`additionalProperties: false` : tout champ inconnu est rejeté ; requis : `model`, `messages`).

| Paramètre | Type | Défaut | Bornes / valeurs | Effet | Source |
|---|---|---|---|---|---|
| `model` | string (requis) | — | ID de modèle (ex. `mistral-large-latest`) ; liste via l'endpoint Models | Modèle cible | guides + spec |
| `messages` | array (requis) | — | Union discriminée par `role` : `SystemMessage`, `UserMessage`, `AssistantMessage`, `ToolMessage` | Historique de la conversation | guides + spec |
| `temperature` | number \| null | **dépend du modèle** (récupérable via l'endpoint `/models`) | 0 ≤ t ≤ **1.5** ; recommandé 0.0–0.7 | Aléa d'échantillonnage (0.2 focalisé/déterministe, 0.7 plus aléatoire). Modifier `temperature` **ou** `top_p`, pas les deux. | spec ; exemples guides : 0, 0.1 |
| `top_p` | number \| null | non précisé | 0 < p ≤ 1 (exclusif en 0) | Nucleus sampling (0.1 = 10 % de masse de probabilité) | spec ; exemple guide : 0.9 |
| `max_tokens` | integer \| null | non précisé | ≥ 0 ; prompt + `max_tokens` ≤ contexte du modèle | Nombre max de tokens générés | spec ; exemples : 256, 300 |
| `min_tokens` | integer \| null | — | ≥ 0 | (non documenté dans les guides) | spec seule |
| `stream` | boolean | `false` | — | SSE « data-only », fin par `data: [DONE]` ; sinon réponse JSON complète | guides + spec |
| `stop` | string \| string[] \| null | — | — | Arrêt à la détection d'un token/chaîne | guides + spec |
| `random_seed` | integer \| null | — | ≥ 0 | Graine : résultats déterministes entre appels | spec |
| `metadata` | object \| null | — | libre | (non documenté dans les guides) | spec seule |
| `response_format` | objet `ResponseFormat` | `{"type":"text"}` | `type` ∈ `text`, `json_object`, `json_schema` ; `json_schema` = {`name` (requis), `description`, `schema` (requis), `strict` (défaut `false`)} | Contraint le format de sortie (cf. 3.11) | guides + spec |
| `tools` | array \| null | — | Union discriminée par `type` : `function` (`Tool`), `image_generation`, `document_library` (`library_ids` ≥ 1), `connector` (`connector_id`, `authorization` OAuth2 ou API key) | Outils que le modèle peut appeler | guides (function) + spec (autres types) |
| `tool_choice` | `ToolChoiceEnum` \| `ToolChoice` | `auto` | `auto`, `none`, `any`, `required`, ou `{"type":"function","function":{"name":"…"}}` | `none` : aucun outil ; `auto` : le modèle choisit ; `any`/`required` : au moins un appel obligatoire ; objet : force une fonction précise | guides (`auto`/`any`/`none`) + spec |
| `parallel_tool_calls` | boolean | `true` | — | `false` force un seul appel d'outil par réponse | guides + spec |
| `presence_penalty` | number \| null | non précisé | −2 à 2 | Pénalise la répétition de mots/phrases → plus de diversité | spec (+ champ vu dans `completion_args` d'agent) |
| `frequency_penalty` | number \| null | non précisé | −2 à 2 | Pénalise les mots selon leur fréquence déjà générée | spec (+ `completion_args`) |
| `repetition_penalty` | number \| null | — | 0 < x ≤ 2 | (non documenté dans les guides) | spec seule |
| `top_k` | integer \| null | — | ≥ −1 | (non documenté dans les guides) | spec seule |
| `logprobs` | boolean \| null | — | — | (non documenté) ; réponses exposent `choices[].logprobs` | spec seule |
| `top_logprobs` | integer \| null | — | — | (non documenté) | spec seule |
| `prompt_logprobs` | boolean \| null | — | — | (non documenté) ; réponses exposent `choices[].prompt_logprobs` | spec seule |
| `top_prompt_logprobs` | integer \| null | — | — | (non documenté) | spec seule |
| `n` | integer \| null | — | ≥ 1 | Nombre de complétions par requête ; tokens d'entrée **facturés une seule fois** ; **non supporté avec `prediction`** | spec + FAQ predicted outputs |
| `prediction` | objet `Prediction` | `{"type":"content","content":""}` | `type` = constante `content` | Contenu attendu pour réduire la latence (cf. 3.13) | guides + spec |
| `reasoning_effort` | enum \| null | — | spec : `none`, `minimal`, `low`, `medium`, `high`, `xhigh` ; guides : `high`, `none` (+ `low`, `high`, `max` pour `zai-glm-5-3`) | Niveau de raisonnement et présence du chunk `thinking` (cf. 3.8) | guides + spec |
| `prompt_mode` | enum \| null | — | `reasoning` (seule valeur) | Bascule entre le mode « reasoning » (prompt système de raisonnement utilisé) et l'absence de prompt système ; les valeurs expriment une intention, l'affectation au prompt système réel est interne (peut inclure date de coupure, capacités, ton, consignes de sécurité) | spec seule |
| `guardrails` | `GuardrailConfig[]` \| null | — | cf. 3.18 | Modération déclarative de l'entrée, blocage 403 | guides + spec |
| `prompt_cache_key` | string \| null | — | — | Clé de cache de préfixe (cf. 3.14) | guides + spec |
| `service_tier` | enum \| null | — | `auto`, `standard_only` | Servir la requête sur capacité prioritaire ou standard ; `usage.service_tier` renvoie `standard` ou `priority` | spec seule |
| `safe_prompt` | boolean | `false` | — | Injecte un prompt de sécurité avant toute conversation | guides + spec |

> Remarque : la spec indique que la valeur par défaut de `temperature` varie selon le modèle ; les guides ne fournissent aucune valeur par défaut pour `top_p`, `max_tokens` ni les pénalités.

### 3.4 Messages et blocs de contenu (chunks)

Formes vérifiées dans la spec :

| Objet | Champs | Notes |
|---|---|---|
| `SystemMessage` | `role` = `system`, `content` (requis) : string ou liste de `TextChunk`/`ThinkChunk` | — |
| `UserMessage` | `role` = `user`, `content` (requis) : string, null ou liste de `ContentChunk` | Images, documents, audio passent ici |
| `AssistantMessage` | `role` = `assistant`, `content` (string/null/chunks), `tool_calls` (liste de `ToolCall` ou null), `prefix` (bool, défaut `false`) | `prefix: true` force le début de la réponse |
| `ToolMessage` | `role` = `tool`, `content` (requis), `tool_call_id`, `name` | Résultat d'un appel d'outil |
| `ToolCall` | `id` (défaut chaîne `'null'`), `type` (`function`), `function` = {`name`, `arguments` (objet **ou** chaîne JSON)}, `index` (défaut 0) | Les exemples montrent `arguments` en chaîne JSON |

Types de chunks (`ContentChunk`, discriminant `type`) :

| `type` | Objet | Champs principaux |
|---|---|---|
| `text` | `TextChunk` | `text` |
| `image_url` | `ImageURLChunk` | `image_url` : chaîne (URL ou data URI) **ou** objet {`url`, `detail` ∈ `low`/`auto`/`high`} (spec) |
| `document_url` | `DocumentURLChunk` | `document_url`, `document_name` (optionnel) |
| `reference` | `ReferenceChunk` | `reference_ids` (liste d'entiers ou chaînes) |
| `file` | `FileChunk` | `file_id` (UUID) |
| `thinking` | `ThinkChunk` | `thinking` (liste de `TextChunk`/`ToolReferenceChunk`/`ReferenceChunk`), `signature` (pour rejouer des blocs de raisonnement entre tours), `closed` (bool, défaut `true`, « utilisé seulement pour le préfixage ») |
| `input_audio` | `AudioChunk` | `input_audio` (chaîne/binaire) |
| `resource`, `resource_link` | `ResourceChunk`, `ResourceLinkChunk` | (non détaillés dans le périmètre) |

### 3.5 Objet réponse et streaming

**Réponse non-streaming** (`object: "chat.completion"`) : `id`, `object`, `model`, `created` (timestamp Unix), `usage` {`prompt_tokens`, `completion_tokens`, `total_tokens`, et selon les cas `prompt_tokens_details.cached_tokens`}, `choices[]` {`index`, `message` {`role: "assistant"`, `content`, `tool_calls`, `prefix`}, `finish_reason`}. Selon la spec, un choix peut aussi porter `logprobs`, `prompt_logprobs` et `messages` (liste de `DeltaMessage`) ; `finish_reason` ∈ `stop`, `length`, `model_length`, `error`, `tool_calls`. `usage` peut aussi contenir `prompt_audio_seconds` et `service_tier` (spec).

**Streaming** : chaque événement SSE porte un objet `chat.completion.chunk` (`CompletionEvent.data` = `CompletionChunk`) avec `id` (identique sur tout le flux), `model`, `created`, `choices[]` {`index`, `delta` {`role`, `content`, `tool_calls`, `tool_call_id`, …}, `finish_reason`}, `usage`.
- Premier chunk : `delta` = {`role: "assistant"`, `content: ""`}, `finish_reason: null`, `usage: null`.
- Chunks intermédiaires : `delta.content` incrémental (ex. « 3 », « 84 », « 4 », « 00 » → « 384400 »).
- Dernier chunk : `finish_reason: "stop"` et `usage` renseigné (ex. 19/7/26) ; puis `data: [DONE]` (spec).
- `finish_reason` en streaming ∈ `stop`, `length`, `error`, `tool_calls`, `null` (spec).
- SDK Python : itérer `for chunk in stream_response: chunk.data.choices[0].delta.content` ; en asynchrone, tester `is not None`. TS : `for await (const chunk of result)` et vérifier `typeof streamText === "string"` (le delta peut être une liste de chunks, cf. reasoning).

### 3.6 Prompt Registry (prompts versionnés)

**Description** : le Prompt Registry (tag API `beta.prompts`) permet de **stocker, versionner et gérer des prompts de façon centralisée dans Studio**. La page guide montre comment récupérer un prompt stocké et l'utiliser comme message `system` d'une chat completion. Statut : **bêta** (namespace `client.beta.prompts`). **Indisponible dans le SDK Python V1** (`mistralai 1.x`) : il faut `pip install "mistralai>=2"` (renvoi au guide de migration `https://docs.mistral.ai/resources/migration-guides`).

**Usage de base** (récupération par nom **ou** ID) :
```python
prompt = client.beta.prompts.get(prompt_id="coding-assistant")
system_content = prompt.definition.content
response = client.chat.complete(model="mistral-large-latest", messages=[
    {"role": "system", "content": system_content},
    {"role": "user", "content": "Help me debug this function."}])
```
TS : `await client.beta.prompts.get({ promptId: 'coding-assistant' })`, puis `prompt.definition?.content ?? ''`.

**Variables de gabarit** : un prompt peut contenir des emplacements `{{variable}}` (ex. « You are a coding assistant. You specialise in {{language}}. »). La substitution se fait **côté client**, avant l'envoi (exemple : `.replace("{{language}}", "Python")`). Aucun mécanisme de rendu serveur n'est décrit dans le guide. La spec expose une liste `definition.variables` (objets `{name}`) décrivant les variables utilisées.

**Épinglage de version** : par défaut `get` renvoie la **dernière version**. On peut épingler :

| Mode | Python | TypeScript |
|---|---|---|
| Numéro de version | `client.beta.prompts.get(prompt_id="coding-assistant", version=3)` | `get({ promptId, version: 3 })` |
| Alias | `client.beta.prompts.get(prompt_id="coding-assistant", alias="production")` | `get({ promptId, alias: 'production' })` |

Encadré `:::tip` : utiliser des alias nommés (`production`, `staging`) pour découpler le code des numéros de version ; **on peut changer depuis Studio la version vers laquelle pointe un alias** sans modifier l'application.

**Modèle de données (spec, `/v2/prompts`)** :

| Objet / champ | Type | Rôle |
|---|---|---|
| `Prompt.id` | string | Identifiant |
| `name` | string | « Nom d'objet stable » (utilisable comme `prompt_id` d'après l'exemple `coding-assistant`) |
| `definition` | `PromptDefinition` {`content` (requis, gabarit), `variables[]` ({`name`})} | Contenu versionné |
| `version` / `latestVersion` | int32 | Version courante renvoyée / dernier numéro |
| `notes` | string | Notes de cette version |
| `aliases` | string[] | Alias pointant vers cette version |
| `sharingScope` | enum `RegistrySharingScope` : `sharing_scope_unspecified`, `private`, `workspace` | Portée de partage |
| `workspaceRelation` (création/mise à jour) | enum `ShareRelation` : `share_relation_unspecified`, `reader`, `writer` | Accès accordé à chaque membre du workspace quand la portée est `workspace` ; défaut `writer` (comportement historique) ; **rejeté si la portée n'est pas `workspace`** |
| `title`, `description` | string | Titre et description d'affichage |
| `createdAt`, `updatedAt`, `versionCreatedAt`, `createdBy` | timestamp / string | Traçabilité |

Création (`CreatePromptRequest`) : requis `name` + `definition` ; optionnels `title`, `description`, `notes`, `sharingScope`, `aliases`, `workspaceRelation`. Mise à jour des métadonnées de version : champ `aliases` encapsulé dans `AliasList {values}` pour distinguer « ne pas toucher » (champ omis) de « tout effacer » (liste vide). Liste paginée par curseur (`pageSize`, `pageToken` → `nextPageToken`), filtrable par `alias`, triable (`sort_by` ∈ `created_at`, `last_modified_at`, `name`, `title` ; `sort_direction` ∈ `asc`, `desc` ; par défaut `created_at`, descendant pour les dates, ascendant pour le texte), projection par `fields`.

### 3.7 Guide de prompting

**Concepts principaux** :
- **System vs user prompt** : le prompt `system` (début de conversation, géré par le développeur) fixe contexte et règles ; le prompt `user` apporte le contexte de l'interaction courante. Note : si on ne contrôle pas le `system`, on peut concaténer contexte + requête dans le `user` (forme `"system_prompt\n\nUser: user_prompt"`).
- **Donner un objectif (« Providing a Purpose » / roleplaying)** : ouvrir par « You are a <role>, your task is to <task>. ».
- **Structure** : instructions hiérarchisées en sections/sous-sections, prompt clair et complet ; règle : écrire pour quelqu'un **sans aucun contexte préalable**. Exemple structuré (détection de langue) : sections `# Available Languages` (codes `en`, `fr`, `es`, `de`, sinon `other` / code `on`), `# Response Format` (`{"language_iso": <code>}`), `# Examples`.
- **Formatting** : Markdown et/ou balises de style XML — lisibles, analysables programmatiquement, familiers au modèle (vus massivement à l'entraînement) ; facilitent l'itération et la maintenance.
- **Example prompting / Few-shot** : fournir quelques exemples, surtout pour le **format de sortie** ; few-shot = faux échanges `user`/`assistant` insérés dans l'historique (vs zero-shot sans exemple) ; ou exemples directement dans le prompt (`Input:` / `Output:`).
- **Structured outputs** : imposer un format JSON (renvoi à 3.11), utile pour contraindre aussi les catégories.
- **Conseil** : rester flexible, itérer et évaluer les prompts comme du code — un changement de modèle ou une simple mise à jour peut modifier le comportement.

**À éviter** :

| Piège | Recommandation |
|---|---|
| Adjectifs quantitatifs flous (« too long », « many », « few ») et mots vagues (« things », « interesting », « better ») | Donner des mesures objectives ; définir ce qu'on entend par « intéressant », « mieux » |
| Contradictions dans un long system prompt (ex. « mettre à jour si lié » vs « créer si nouveau ») | Écrire un **arbre de décision** explicite (« If… Otherwise, if… Otherwise… ») |
| Faire compter les mots/caractères au LLM | Fournir les comptes en entrée (ex. `charCount`) |
| Générer trop de tokens | Les modèles ingèrent plus vite qu'ils ne génèrent : ne générer que le strict nécessaire (pas de contenu complet pour un `NO_OP`, pas un livre entier d'un coup) |
| Échelles numériques (« 1 à 5 ») | Préférer une **échelle verbale** (Very Low, Low, Neutral, Good, Very Good), convertible ensuite en nombre |

**Exemples de prompts** (notebook Colab `prompting_capabilities.ipynb`) :
- **Classification** (bot de service client bancaire) : catégories `card_arrival`, `change_pin`, `exchange_rate`, `country_support`, `cancel_transfer`, `charge_dispute`, repli `customer_service`. Deux stratégies : (1) demander directement le libellé (rapide, peu de tokens, moins fiable/flexible) ; (2) demander un JSON `{"category": …}` (fiable, flexible, un peu plus de tokens) — astuce : `response_format` pour forcer le JSON ou un schéma.
- **Summarization** : prompt en étapes (résumer ; générer 3 questions avec « Q: »/« A: » et réponse entre `<>` ; rédiger un rapport Markdown). Stratégies : instructions pas-à-pas (inspirées du chain-of-thought), génération d'exemples, formatage de sortie.
- **Personalization** : réponse e-mail personnalisée d'un prêteur immobilier à partir d'une liste de **faits** (taux/APR) fournis dans le prompt ; stratégie « providing facts ».
- **Evaluation** : trois approches — (a) **score de confiance** joint à chaque résumé, avec JSON mode (`response_format: {"type": "json_object"}`) et **température plus élevée** pour diversifier ; (b) **étape d'évaluation** dans le même prompt ; (c) **autre LLM évaluateur** (« LLM chaining ») — flexible mais plus d'appels API et de coûts.

### 3.8 Reasoning (`reasoning_effort`)

**Description** : le raisonnement prolonge le chain-of-thought : le modèle, entraîné à générer librement des chaînes de pensée avant la réponse, utilise du calcul supplémentaire au moment de l'inférence (**Test Time Computation**) pour mieux résoudre les problèmes (maths, code, mais aussi usages variés). La sortie comprend un chunk de raisonnement puis la réponse finale.

**Statut** : `:::note` — les modèles natifs `magistral-small-latest` et `magistral-medium-latest` sont **dépréciés** (page `/resources/deprecated/native-reasoning`).

**Modèles et support** :

| Modèle | Support de `reasoning_effort` | Remarque |
|---|---|---|
| `mistral-small-latest` | oui | Aucune configuration supplémentaire |
| `mistral-medium-3-5` | oui | `reasoning_effort="high"` recommandé pour l'agentique et le code |
| `mistral-large-4-0` | oui | Aucune configuration supplémentaire |
| `zai-glm-5-3` | oui, valeurs `low`, `high`, `max` (**pas `none`**) | `message.content` est **toujours** une liste de chunks (thinking + text), aucun mode chaîne simple |

**Valeurs documentées** :

| Valeur | Effet sur la sortie |
|---|---|
| `"high"` | Chunk de réflexion complet avant la réponse ; coût en tokens accru ; `content` = liste de chunks |
| `"none"` | Raisonnement minimal, chunk omis ; `content` = simple `str` |

La spec déclare en outre `minimal`, `low`, `medium`, `xhigh` (comportement non décrit dans le guide). `reasoning_effort` existe aussi sur les endpoints **Agents** et **Conversations**, dans `completion_args` (on le voit à `null` dans l'objet agent renvoyé).

**Forme de la réponse** (`reasoning_effort="high"`) : `content = [ {"type":"thinking","thinking":[{"type":"text","text":"…"}]}, {"type":"text","text":"…réponse…"} ]`. Exemple : énigme d'âge (John a 22 ans) → usage 77 prompt / 1114 completion / 1191 total, `prompt_tokens_details.cached_tokens: 0`.
- `ThinkChunk` (`type: "thinking"`) : trace ; son champ `thinking` est une liste de `TextChunk`.
- `TextChunk` (`type: "text"`) : réponse finale.
- Python : `from mistralai.client.models import TextChunk, ThinkChunk` puis tests `isinstance`. TS : test `chunk.type === 'thinking'`.

**Streaming** — la forme de `delta.content` change en cours de route :
1. phase de réflexion : liste contenant un `ThinkChunk` ;
2. transition : **une liste** contenant à la fois le `ThinkChunk` de clôture et le premier `TextChunk` ;
3. phase de réponse : `delta.content` devient une **chaîne simple**.
Le code client doit donc gérer les deux types (`str` vs liste) et un état « in_thinking ».

**Multi-tour** : **toujours rejouer le message assistant complet (y compris le `ThinkChunk`)** dans l'historique ; le supprimer dégrade fortement la qualité (`:::warning` : gain de tokens mais forte dégradation). Exemple chiffré : tour 1 `prompt=25`, `completion=187` ; tour 2 `prompt=221` = 25 (1er message) + 187 (réponse complète avec réflexion) + 9 (nouveau message). Le client de l'exemple fixe `timeout_ms=300_000` (5 min).

### 3.9 Vision

**Description** : analyse d'images en plus du texte, via l'API Chat Completions (multimodal en entrée). Ne **génère pas** d'images. Pour OCR/parsing/extraction de documents, la doc renvoie à **Document AI**.

**Modèles recommandés** : Mistral Large 3 (`mistral-large-2512`), Mistral Medium 3.1 (`mistral-medium-2508`), Mistral Small 3.2 (`mistral-small-2506`), Ministral 3 14B (`ministral-14b-2512`), 8B (`ministral-8b-2512`), 3B (`ministral-3b-2512`). Les exemples utilisent `mistral-small-latest` et `ministral-14b-latest`.

**Deux façons d'envoyer une image** (chunk `{"type": "image_url", "image_url": …}` dans un message `user`, à côté d'un chunk `text`) :
1. **URL publique** : `"image_url": "https://docs.mistral.ai/img/eiffel-tower-paris.jpg"`.
2. **Base64** (data URI) : `"image_url": "data:image/jpeg;base64,<base64_image>"` (encodage local `base64.b64encode(...)` / `Buffer.toString('base64')`).
En TypeScript la clé devient `imageUrl`. Plusieurs images peuvent être envoyées dans le même message (exemple de comparaison avec 2 URLs). Un message `system` peut lui aussi avoir un `content` en liste de chunks texte.

**Cas d'usage illustrés** : compréhension de graphiques (infographie « France's Social Divide », `max_tokens: 300`), comparaison de deux images (3051 tokens de prompt), transcription de ticket de caisse, OCR de document ancien (manuscrit 1855), **OCR + sortie structurée** (system prompt + `response_format: {"type": "json_object"}` → JSON `order_id`, `items.item_names`, `items.prices`, `total_price`).

**FAQ (limites)** :

| Question | Réponse |
|---|---|
| Prix par image | Facturée comme des **tokens d'entrée** (l'image est tokenisée) |
| Tokens / résolution max | Voir tableau ci-dessous ; image plus grande que la résolution max → **redimensionnée** ; au-delà de **10000×10000** → **erreur** |
| Génération d'images | Non (compréhension uniquement) |
| Formats | PNG (`.png`), JPEG (`.jpeg`, `.jpg`), WEBP (`.webp`), GIF **non animé à une seule image** (`.gif`) |
| Taille de fichier | **10 Mo** (« 10Mb ») |
| Nombre d'images par requête | **8** (via API) |
| Rate limit | Voir Studio › Limits (`https://console.mistral.ai/limits/`) |

| Modèle | Résolution max | Formule ≈ | Tokens max ≈ |
|---|---|---|---|
| Mistral Large 3 | 1540×1540 | (X × Y) / 784 | 3025 |
| Mistral Small 3.2 | 1540×1540 | (X × Y) / 784 | 3025 |
| Mistral Medium 3 | 1540×1540 | (X × Y) / 784 | 3025 |
| Ministral 3 | 1540×1540 | (X × Y) / 784 | 3025 |
| Pixtral Large | 1024×1024 | (X × Y) / 256 | 4096 |
| Pixtral 12B | 1024×1024 | (X × Y) / 256 | 4096 |

(784 = 28², 256 = 16² : taille de patch implicite 28 px vs 16 px — (inférence).) Exemple observé : une seule image Tour Eiffel ≈ 2099 tokens de prompt sur `mistral-small-latest`.

### 3.10 Function calling

**Description** : sous l'ombrelle « Tool Calling », permet aux modèles de se connecter à des **outils locaux externes** (fonctions utilisateur, API). Le modèle **n'exécute pas** la fonction : il choisit la fonction, détecte les informations manquantes et génère les arguments ; **l'exécution est à la charge du développeur**. (Des outils exécutés côté serveur existent pour les Agents et Conversations API → `/studio/agents/agent-tools`.)

**Modèles compatibles (liste non exhaustive)** :

| Généralistes | Spécialisés | Raisonnement |
|---|---|---|
| Mistral Large 3 `mistral-large-latest` | Devstral 2.0 `devstral-latest` | Magistral Medium 1.2 `magistral-medium-latest` |
| Mistral Medium 3.5 `mistral-medium-latest` | Devstral Small 2 `devstral-small-latest` | Magistral Small 1.2 `magistral-small-latest` |
| Mistral Small 3.2 `mistral-small-latest` | Voxtral Small `voxtral-small-latest` | |
| Mistral Small Creative `labs-mistral-small-creative` | Codestral `codestral-latest` | |
| Ministral 3 14B `ministral-14b-latest` | | |
| Ministral 3 8B `ministral-8b-latest` | | |
| Ministral 3 3B `ministral-3b-latest` | | |

**Cycle complet en 5 étapes** :
1. **Développeur** : définir les fonctions (ex. `retrieve_payment_status`, `retrieve_payment_date` sur un DataFrame de transactions T1001–T1005), un dictionnaire nom → fonction pour l'appel dynamique, et un **system prompt** (recommandé pour l'agentique). Décrire chaque outil en **JSON Schema** : `{"type": "function", "function": {"name", "description", "parameters": {"type": "object", "properties": {...}, "required": [...]}}}` (plusieurs paramètres possibles dans `properties`).
2. **Utilisateur** : poser la question (« What's the status of my transaction T1001? »).
3. **Modèle** : appel avec `tools`, éventuellement `tool_choice` et `parallel_tool_calls` ; réponse avec `finish_reason: "tool_calls"`, `content: ""` et `tool_calls: [{"id": "D681PevKs", "type": "function", "function": {"name": "retrieve_payment_status", "arguments": "{\"transaction_id\": \"T1001\"}"}}]`. Ajouter ce message assistant à l'historique.
4. **Développeur** : `json.loads(tool_call.function.arguments)`, exécuter la fonction → `{"status": "Paid"}`.
5. **Modèle** : ajouter `{"role": "tool", "name": function_name, "content": function_result, "tool_call_id": tool_call.id}` puis rappeler le modèle → réponse finale (« The status of your transaction with ID T1001 is "Paid"… ») **ou un nouvel appel d'outil**.

`:::note` : un appel d'outil peut être suivi d'un autre ; il faut **rappeler le modèle récursivement** jusqu'à une réponse finale.

**Séquences de rôles possibles** (`system` optionnel) :

| Séquence | Flux |
|---|---|
| Sans appel | system* → user → assistant → user → … |
| Appel simple | system* → user → assistant (fc 1) → tool (r 1) → assistant → user … |
| Appels successifs | … assistant fc1 → tool r1 → assistant fc2 → tool r2 → assistant → user … |
| Appels parallèles | … assistant (fc1, fc2) → tool r1 → tool r2 → assistant → user … |

**Paramètres de contrôle** :

| Paramètre | Valeurs | Défaut | Effet |
|---|---|---|---|
| `tool_choice` | `"auto"`, `"any"`, `"none"` (spec : + `"required"` et choix d'une fonction nommée) | `"auto"` | auto : le modèle décide ; any : force l'usage d'un outil ; none : interdit les outils |
| `parallel_tool_calls` | `true` / `false` | `true` | false : un seul appel d'outil par réponse |
| `strict` (dans `function`) | booléen | `false` (spec) | Utilisé avec `"additionalProperties": false` dans l'exemple citations (sémantique non détaillée par les guides) |

**Exemple complet** : boucle de chat qui, tant que `message.tool_calls` est non vide, affiche le texte éventuel intercalé, exécute **chaque** appel (gestion des appels parallèles), ajoute les messages `tool`, rappelle le modèle (avec `temperature = 0.1`, `top_p = 0.9`), jusqu'à la réponse finale. Cookbook Colab `function_calling.ipynb`. Pour MCP, outils intégrés et agentique → doc Agents.

### 3.11 Structured outputs (JSON mode et schéma custom)

**Principe** : imposer une sortie structurée (JSON) pour les pipelines/agents. Deux modes : **JSON mode** et **Custom structured outputs**. `:::warning` : en JSON mode il faut **explicitement demander du JSON dans le prompt** et décrire le format ; les sorties custom sont **plus fiables et recommandées** ; JSON mode quand on veut plus de souplesse tout en restant en JSON.

**JSON mode** : `response_format = {"type": "json_object"}` ; garantit un objet JSON valide quel que soit le prompt (mais on recommande quand même de demander le JSON et le format). Le `content` est une **chaîne JSON** à parser. Exemple : « best French meal » → `{"meal": "Boeuf Bourguignon", "ingredients": [...]}` (réponse servie par `mistral-large-2512` pour un appel `mistral-large-latest`). Modèles : **tous sauf `codestral-mamba`**.

**Custom structured outputs** : on fournit un schéma JSON via `response_format = {"type": "json_schema", "json_schema": {"name": "book", "schema": {...}, "strict": true}}`. Schéma d'exemple `Book` : `name` (string), `authors` (array de string), `required`, `"additionalProperties": false`.
- SDK : `client.chat.parse(model=…, messages=…, response_format=Book, max_tokens=256, temperature=0)` où `Book` est une classe **Pydantic** (Python) ou un objet **Zod** (TS `client.chat.parse({ responseFormat: Book, maxTokens: 256 })`).
- Deux sorties accessibles : brute `choices[0].message.content` (chaîne JSON) et **parsée** `choices[0].message.parsed` (instance `Book` / objet TS).
- `:::note` : le système **préfixe toujours le system prompt** avec « Your output should be an instance of a JSON object following this schema: {{ json_schema }} » ; il reste conseillé d'ajouter des explications et d'itérer.
- Modèles : **tous sauf `codestral-mamba`**. Exemple sur `ministral-8b-latest` (23 tokens prompt, 24 completion).

| Champ `response_format` | Type | Défaut | Valeurs |
|---|---|---|---|
| `type` | enum | `text` | `text`, `json_object`, `json_schema` |
| `json_schema.name` | string (requis) | — | ex. `book` |
| `json_schema.description` | string \| null | — | — |
| `json_schema.schema` | objet JSON Schema (requis) | — | — |
| `json_schema.strict` | boolean | `false` (spec) | `true` dans les exemples |

### 3.12 Citations & références

**Description** : les modèles sont entraînés à s'ancrer sur des documents et à citer leurs sources ; utile pour le RAG et les applications agentiques. Les sources sont fournies **comme réponse d'un appel de fonction** ; le modèle renvoie alors un `content` en liste mêlant chunks `text` et chunks `reference`.

**Parcours** :
1. Préparer un dictionnaire de **références** indexées par chaîne (`"0"`, `"1"`, `"2"`), chacune avec `url`, `title`, `snippets` (liste de listes de chaînes), `description`, `date`, `source` (ex. `wikipedia`).
2. Déclarer un outil `get_information` (paramètres vides, `"additionalProperties": false`, `"strict": true`) qui renvoie `json.dumps(references)`.
3. Historique : system « Answer the user by providing references to the source of the information. » + question.
4. Premier appel avec `tools=[get_information_tool]` → `finish_reason: "tool_calls"`.
5. Exécuter l'outil, ajouter un `ToolMessage(content=result, tool_call_id=…, name=…)`.
6. Second appel → `content: [{"type":"text","text":"…Oslo, Norway "}, {"type":"reference","reference_ids":[0]}, {"type":"text","text":"."}]`.
7. Extraire : parcourir les chunks, `TextChunk` → texte, `ReferenceChunk` → accumuler `reference_ids`, puis retrouver `title`/`url` dans le JSON de l'outil via `str(ref)`.

Exemple sur `mistral-small-latest` (706 tokens prompt / 96 completion au second appel). Cookbook Colab `mistral-reference-rag.ipynb` (RAG Wikipedia, base pour recherche web et grounding documentaire avec citations).

### 3.13 Predicted outputs

**Description** : optimise le **temps de réponse** en exploitant un contenu connu ou prévisible (édition de gros textes, modification de code, réponses à gabarit) : le modèle consacre plus de calcul aux parties imprévisibles.

**Paramètre** : `prediction = {"type": "content", "content": <texte attendu>}`. Exemple : changer `open-mistral-7b` en `open-mistral-nemo` dans un extrait de code ; le code est envoyé à la fois comme message `user` et comme `prediction` (modèle `mistral-large-2411`).

**FAQ** :

| Question | Réponse |
|---|---|
| Modèles supportés | `codestral-latest` et `mistral-large-2411` (« as of now ») |
| Impact tarifaire | **Aucun** actuellement |
| Paramètres non supportés | **`n`** (nombre de complétions par requête) |
| La position des phrases dans la prédiction compte-t-elle ? | Non : la prédiction peut apparaître n'importe où dans la réponse et aide quand même |

### 3.14 Prompt caching

**Description** : réutilise des tokens de prompt déjà calculés lorsque des requêtes partagent le même **préfixe** (même début de prompt). Avantages : tokens en cache facturés **10 % du prix standard d'entrée** et latence réduite.

`:::info` : `prompt_cache_key` **augmente la probabilité** d'un cache hit mais **ne le garantit pas** ; un hit survient quand l'API trouve un préfixe compatible en cache.

**Quand l'utiliser** : sessions de chat multi-tours qui renvoient l'historique ; même system prompt / mêmes instructions développeur ; requêtes **fill-in-the-middle** réutilisant un long préfixe ; requêtes d'agents réutilisant le même contexte. Moins utile (`:::tip`) pour prompts courts, requêtes sans rapport, ou requêtes dont le début change à chaque appel.

**Activation** : placer la même `prompt_cache_key` sur les requêtes susceptibles de partager un préfixe, avec un **identifiant applicatif stable** (ID de conversation, session ou workflow), et conserver le préfixe identique dans le corps (on ajoute les nouveaux tours à la fin). **Ne jamais mettre de secrets, clés API ou données utilisateur sensibles** dans la clé. Exemple : `"prompt_cache_key": "support-session-42"`.

**Lecture des tokens en cache** : `usage.prompt_tokens_details.cached_tokens`. `prompt_tokens` contient **tous** les tokens de prompt ; tokens non cachés facturables = `prompt_tokens − cached_tokens`. Exemple : `prompt_tokens: 1013`, `cached_tokens: 1008`, `completion_tokens: 30` → 5 tokens au prix d'entrée standard, 1008 à 10 %, 30 au prix de sortie. Sans hit : `cached_tokens` vaut `0` ou est **omis**.

`:::info` — blocs de cache de **64 tokens** : `cached_tokens` est un multiple de 64 ; un prompt de **moins de 64 tokens** n'a jamais de cache hit ; plus le préfixe partagé est long, plus on réutilise.

**Suivi de facturation** : Admin › Usage (`https://admin.mistral.ai/organization/usage`), usage par modèle.

### 3.15 Embeddings texte (`mistral-embed`)

**Vue d'ensemble (page Embeddings)** : vecteurs dans un espace de grande dimension capturant le sens ; usages : RAG, clustering, classification, recherche sémantique de code, analytics de code, détection de doublons, recherche dans du texte ou du code brut. Deux modèles : **texte** et **code**. Si l'on veut une fonction gérée d'ingestion/vectorisation/recherche → **Libraries** ; pour chercher dans des sources connectées (Google Drive, SharePoint) → **Connectors** ; introduction RAG → RAG Quickstart.

**Génération** : `client.embeddings.create(model="mistral-embed", inputs=["Embed this sentence.", "As well as this one."])` (Python et TS) ; en REST le champ est **`input`** (`POST /v1/embeddings`). Réponse : `object: "list"`, `data[]` {`object: "embedding"`, `embedding` (floats), `index`}, `model`, `usage` {`prompt_tokens` (15 pour l'exemple), `total_tokens`, `completion_tokens: 0`, `prompt_audio_seconds`, `request_count`, `prompt_token_details` à null}.

**Dimension** : **1024** quel que soit la longueur du texte. Compromis rappelé : plus de dimensions = meilleure capture mais plus de ressources, latence et mémoire.

**Propriété clé** : embeddings de **norme 1** → similarité cosinus, produit scalaire et distance euclidienne sont équivalents.

**Exemples d'usage** :

| Usage | Ce que montre la doc |
|---|---|
| Similarité | Distance euclidienne : phrase « livres » 0,58 vs « chat » 0,80 par rapport à la référence |
| Paraphrase | Distances par paires (0,54 pour les deux phrases « Memorial Day » vs ~0,91–0,93 avec la phrase fromage) |
| Batching | Fonction `get_embeddings_by_chunks(data, chunk_size)` avec lots de **50** sur le dataset Symptom2Disease (1200 lignes) ; « l'API fournira un auto-chunking à l'avenir » ; visualisation t-SNE ; comparaison fastText (séparation moins nette) |
| Classification | Régression logistique sur embeddings : **98,75 %** vs **86,25 %** avec fastText ; prédiction « Migraine » |
| Clustering | K-means à 24 clusters sur le même dataset |
| Retrieval | Principe RAG (embed base de connaissances → base vectorielle → récupération → génération) ; renvoi Libraries/Connectors/RAG quickstart |

### 3.16 Embeddings code (`codestral-embed`)

**Description** : embeddings de bases de code et dépôts pour assistants de code, retrieval, clustering, analytics, classification. Notebook Colab `code_embedding.ipynb`.

**Paramètres spécifiques** :

| Paramètre | Type | Défaut | Valeurs / bornes | Effet |
|---|---|---|---|---|
| `output_dimension` | integer | **1536** | max **3072** (spec : > 0) | Garde les *n* premières dimensions, **ordonnées par pertinence** → compromis qualité/coût progressif |
| `output_dtype` | enum | `float` | `float`, `int8`, `uint8`, `binary`, `ubinary` | Précision/format numérique |
| `encoding_format` | enum | `float` | `float`, `base64` | Format des embeddings dans la réponse (spec seule) |
| `input` (REST) / `inputs` (SDK) | string \| string[] | — | — | Textes à encoder |
| `metadata` | object \| null | — | — | (spec seule) |

**Types `output_dtype`** :
- `float` (défaut) : flottants 32 bits (4 octets), précision et qualité de retrieval maximales ;
- `int8` : entiers 8 bits de −128 à 127 ;
- `uint8` : entiers 8 bits de 0 à 255 ;
- `binary` : entiers 8 bits (type `int8`) représentant des valeurs **1 bit empaquetées** ; longueur = **1/8 de `output_dimension`** ; méthode « offset binary » ;
- `ubinary` : idem avec type `uint8`.

**Exemples** : 2 entrées (énoncé LeetCode « two sum » + solution) → 263 tokens ; similarité (référence « palindrome number » : « reverse integer » 0,64 plus proche que « two sum » 0,91), batching (dataset LeetCodeTSNE, 37 lignes, lots de 50), t-SNE, retrieval. Cookbooks : Embedding et **Dequantization** (`dequantization.ipynb`).

### 3.17 Moderation API

**Description** : service de classification propulsé par **`mistral-moderation-2603`**, qui classe le texte selon des catégories de politique, **dont `jailbreaking`**. `:::note` : `mistral-moderation-2411` **déprécié le 31 mars 2026** (référence legacy `/resources/deprecated/guardrailing/mistral_moderation_2411`). Deux voies de guardrailing proposées : **Custom Guardrails** (*recommandé*) et **Moderation API** (scores bruts, contrôle total, pipelines sur mesure).

**Endpoints** :

| Endpoint | Méthode SDK | Entrée | Particularité |
|---|---|---|---|
| `POST /v1/moderations` (texte brut) | Python `client.classifiers.moderate(model, inputs=[...])` ; TS `client.classifiers.moderate({model, inputs})` | Une chaîne ou une liste de chaînes (« petits lots ») | Un résultat par chaîne |
| `POST /v1/chat/moderations` (conversationnel) | Python `client.classifiers.moderate_chat(model, inputs=[messages])` ; TS `client.classifiers.moderateChat(...)` | Liste de messages (`user`/`assistant`…) — spec : ou liste de conversations | Le modèle classe **le dernier tour** en tenant compte du contexte |

**Réponse** : `id`, `model`, `usage` (`prompt_tokens`, `total_tokens`, `completion_tokens: 0`, `request_count: 1`, `prompt_audio_seconds`, `prompt_token_details`), `results[]` avec `category_scores` (scores flottants) et `categories` (booléens). Exemple : « take over the world » → score « dangerous and criminal » 0,97 → `true`.

**Seuils** (`:::note`) : le seuil de politique est fixé selon la performance optimale sur le jeu de test interne ; on peut utiliser les **scores bruts** ou ajuster le seuil. Le modèle sous-jacent sera amélioré en continu : des politiques maison basées sur `category_scores` peuvent nécessiter un **recalibrage**. FAQ : précision entre **0,8 et 1,0** et rappel entre **0,7 et 1,0** sur le jeu interne ; recommandation d'utiliser les scores bruts selon l'objectif (ex. réduire les faux positifs).

**Catégories détectées (`mistral-moderation-2603`)** — clés telles qu'elles apparaissent dans les guardrails / la spec V2 :

| Catégorie (libellé doc) | Clé | Définition (paraphrasée) |
|---|---|---|
| Sexual | `sexual` | Contenu sexuel explicite, nudité, services sexuels, pornographie, sollicitation ; contenu éducatif/médical non explicite généralement exempté |
| Hate and Discrimination | `hate_and_discrimination` | Préjugés, hostilité, discrimination sur caractéristiques protégées ; insultes, déshumanisation, appels à l'exclusion, harcèlement ciblé |
| Violence and Threats | `violence_and_threats` | Description, glorification, incitation ou menaces de violence physique ; représentations graphiques ; instructions d'actes violents |
| Dangerous | `dangerous` | Comportements extrêmement dangereux présentant un risque important de blessure physique |
| Criminal | `criminal` | Description ou promotion d'activités illégales |
| Self-Harm | `selfharm` | Automutilation, suicide, troubles alimentaires, défis dangereux, argot associé |
| Health | `health` | Contient ou cherche à obtenir un avis **médical** détaillé ou personnalisé |
| Financial | `financial` | Contient ou cherche à obtenir un avis **financier** détaillé ou personnalisé |
| Law | `law` | Contient ou cherche à obtenir un avis **juridique** détaillé ou personnalisé |
| PII | `pii` | Demande, partage ou tentative d'obtention d'informations personnelles (noms complets, adresses, téléphones, numéros de sécurité sociale, comptes financiers) |
| Jailbreaking | `jailbreaking` | Tentatives de contourner les règles de sécurité du modèle (manipulation de prompt, jeux de rôle…) |

Attention : les **exemples de sortie** des endpoints `/v1/moderations` et `/v1/chat/moderations` montrent encore 9 clés de l'ancien schéma (`dangerous_and_criminal_content` fusionné, pas de `jailbreaking`) — cf. section 8.

Cookbooks : « system level guardrails » et « moderation explored » (liens internes `/resources/cookbooks/...` sur une page, Colab sur l'autre).

### 3.18 Custom guardrails

**Description** : règles de modération **déclarées dans la requête API**, sans appel séparé ni logique de seuil côté application. S'appliquent **uniquement à l'entrée** (input moderation), **avant** que la requête n'atteigne le modèle. En cas de déclenchement : requête **bloquée**, erreur **403**. Chaque guardrail utilise la config **`moderation_llm_v2`**, adossée à `mistral-moderation-2603`. **SDK Python V2 uniquement** (V1 : non disponible).

**Structure** (`guardrails: [GuardrailConfig, …]`) :

| Champ | Niveau | Type | Défaut | Effet |
|---|---|---|---|---|
| `block_on_error` | guardrail | boolean | `false` (spec) | Si `true`, bloque la requête (403 selon la spec) quand l'API de modération elle-même échoue |
| `moderation_llm_v2` | guardrail | objet | — | Config de modération (une par objet guardrail) |
| `moderation_llm_v1` | guardrail | objet | — | (spec seule ; ancien schéma, modèle par défaut `mistral-moderation-2411`, catégories V1) |
| `custom_category_thresholds` | config | objet catégorie → nombre (0 à 1) | null | Seuils par catégorie ; mettre **`1` désactive explicitement** la catégorie |
| `ignore_other_categories` | config | boolean | `false` | Si `true`, seules les catégories listées sont évaluées |
| `action` | config | enum `none` \| `block` | `none` (spec) | `"block"` pour bloquer en cas de violation |
| `model_name` | config | string | `mistral-moderation-2603` | Surcharge du modèle de modération (« à omettre en général » selon la spec) |

On peut déclarer **plusieurs objets guardrail** par requête ; la requête est bloquée si **un seul** se déclenche ; chaque objet contient au plus une config `moderation_llm_v2`.

**Trois points d'attache** :

| Niveau | Endpoint | Méthode SDK | Comportement |
|---|---|---|---|
| Chat completion | `POST /v1/chat/completions` (champ `guardrails`) | `client.chat.complete(..., guardrails=[...])` | Requête unique, pas de Conversation persistante |
| Conversation | `POST /v1/conversations` | `client.beta.conversations.start(model=…, inputs=[…], guardrails=[…])` | Conversation à état ; s'applique à une requête avec `model` ou **surcharge** les guardrails hérités d'un agent |
| Agent | `POST /v1/agents` | `client.beta.agents.create(model=…, name=…, guardrails=[…])` | Défini à la création ; **toutes les conversations** de l'agent en héritent ; surcharge possible via `guardrails` sur `POST /v1/conversations` |

TS : `blockOnError`, `moderationLlmV2`, `customCategoryThresholds`, `ignoreOtherCategories`.

**Réponses** :
- **Requête non bloquée** : champ `guardrails` ajouté à la réponse, avec pour chaque guardrail `moderation_llm_v2.action` et `categories` {`<cat>`: {`score`, `violated`}}. Les exemples réels montrent `action: "none"` et les 11 catégories ; l'exemple de la section « Responses » montre `action: "pass"` et 4 catégories. Règle énoncée : seules les catégories de `custom_category_thresholds` sont renvoyées, sauf si `ignore_other_categories` est `false` (alors toutes les catégories évaluées).
- **Requête bloquée** : HTTP **403**, corps `{"error": {"message": "Content blocked by guardrail", "status": 403}, "guardrails": {"results": {"moderation_llm_v2": {"model_name", "decisions": {<cat>: {"threshold", "score", "violated"}}, "violated": true, "action": "block"}}}}`. Les catégories non configurées apparaissent avec `threshold: 1.0`.
- **Erreur d'évaluation + `block_on_error: true`** : `{"object": "Error", "message": "Request blocked due to error in guardrail evaluation and block_on_error is set to True.", "type": "invalid_request_error", "code": 3201, "guardrails": [{"moderation_llm_v2": {"action": "block", "error": {"message": "Moderation API request failed."}}}]}`.
- Agent créé : l'objet renvoyé normalise les seuils (catégories non fournies à `null`), affiche `model_name: "mistral-moderation-2603"`, et expose `completion_args` (`stop`, `presence_penalty`, `frequency_penalty`, `temperature`, `top_p`, `max_tokens`, `random_seed`, `prediction`, `response_format`, `tool_choice: "auto"`, `reasoning_effort`), `handoffs`, `metadata`, `deployment_chat: false`, `source: "api"`, `version: 0`, IDs préfixés `ag_` ; conversation : `conv_…`, entrées `msg_…`, `object: "conversation.response"`, `outputs[]` de type `message.output`.

### 3.19 Secrets Manager

**Description** : stocke des identifiants (clés API, tokens, chaînes de connexion) que les **managed deployments** (workflows déployés sur AI Studio) lisent à l'exécution, sans les coder en dur. Public : développeurs déployant des workflows. `:::info` : **Public Preview** — comportement et limites susceptibles d'évoluer.

**Portée et droits** :
- Secrets **à portée workspace**, partagés par ses membres ; accès selon le **rôle workspace**.
- **Tout membre** voit la liste et les noms des secrets.
- Créer, modifier, supprimer, restaurer : rôle **Developer** (inclus dans **Workspace Contributor** et **Workspace Admin**).

**Limites** : nom ≤ **256 caractères** ; valeur ≤ **64 KiB** ; description ≤ **512 octets**. Nom : lettres, chiffres, `-`, `_` ; **normalisé en minuscules** (`MySecret` → `mysecret`) ; unique dans le workspace.

**Comportements** :
- Toute nouvelle valeur crée une **nouvelle version** ; les versions antérieures sont conservées.
- Valeurs **write-only** : masquées dans la console, non relisibles ; seules les charges de travail autorisées les lisent via l'API, **chaque lecture est auditée** (événements `secret_store.entry.*` dans les audit logs). `:::warning` : garder sa propre copie ; ne jamais committer de valeurs.
- **Suppression douce** : le secret cesse de se résoudre mais reste récupérable **sans expiration**.
- Un déploiement en cours garde la valeur lue à son démarrage ; son **prochain démarrage échoue** à résoudre un secret supprimé tant qu'il n'est pas restauré.
- **Référence** : `secret:workspace:<name>`, résout **toujours la dernière version** ; résolution au démarrage de la charge, avec l'identité de la charge et la portée de son workspace. Les secrets liés sont aussi passés au **build Docker comme build args** (avec des réserves décrites sur la page « Secrets on managed deployments »).
- **Rotation** : définir une nouvelle valeur puis **redémarrer** les déploiements concernés.

---

## 4. Interface utilisateur

| Écran / chemin | URL | Contenu et actions documentés |
|---|---|---|
| Studio (accueil console) | `https://console.mistral.ai` | Point d'entrée ; Playground, gestion des clés, usage, agents |
| Studio › Playground | (non précisée) | Tester des prompts, comparer des modèles, régler les paramètres sans code |
| Admin › API keys | doc `/admin/identity-access/api-keys` | Création de clés API (aussi possible dans la console) |
| Studio › Limits | `https://console.mistral.ai/limits/` | Limites de débit (référencé par la FAQ vision) |
| Admin › Usage | `https://admin.mistral.ai/organization/usage` | Usage par modèle, dont tokens en cache (prompt caching) |
| Studio (Prompt Registry) | (non précisée) | Prompts stockés, versionnés ; **réaffectation d'un alias à une autre version depuis Studio** |
| Studio › Secrets Manager | `https://console.mistral.ai/secrets` | Liste avec recherche par nom ; bouton `Create secrets` ; menu d'actions par secret (`Edit`, `Delete`) ; `More actions` › `View deleted secrets` › `Restore` |

**Parcours « Créer un secret »** (Studio › Secrets Manager) :
1. `Create secrets` ;
2. champ `Name` (règles de nommage ci-dessus) ;
3. champ `Value` ;
4. champ `Description` (optionnel) ;
5. bouton `Create Secret`.
La valeur devient la version 1 et **n'est plus jamais affichée**.

**Parcours « Gérer »** : `Edit` (description ou nouvelle valeur → nouvelle version) ; `Delete` (soft delete) ; restauration via `More actions` › `View deleted secrets` › `Restore`.

Les autres capacités du périmètre (chat, vision, function calling, structured outputs, reasoning, citations, caching, embeddings, modération) ne sont décrites dans ces pages **qu'au niveau API** ; aucun écran dédié n'y est documenté (hormis le Playground pour l'expérimentation générale).

---

## 5. API et SDK

### 5.1 Endpoints du périmètre

Base URL : `https://api.mistral.ai`. Authentification : en-tête `Authorization: Bearer $MISTRAL_API_KEY` ; `Content-Type: application/json`.

| Méthode | Chemin | Rôle | operationId (spec) |
|---|---|---|---|
| POST | `/v1/chat/completions` | Chat completion (JSON ou `text/event-stream`) ; porte vision, tools, structured outputs, reasoning, prediction, cache, guardrails | `chat_completion_v1_chat_completions_post` |
| POST | `/v1/embeddings` | Embeddings texte/code | `embeddings_v1_embeddings_post` |
| POST | `/v1/moderations` | Modération de texte brut (tag `classifiers`) | `moderations_v1_moderations_post` |
| POST | `/v1/chat/moderations` | Modération conversationnelle | `chat_moderations_v1_chat_moderations_post` |
| POST | `/v1/conversations` | Démarrer/continuer une Conversation (exemple guardrails) | — |
| POST | `/v1/agents` | Créer un agent (exemple guardrails) | — |
| GET | `/v2/prompts` | Lister les prompts (pagination curseur, tri, filtre `alias`, `fields`) | `prompts_list` |
| POST | `/v2/prompts` | Créer un prompt | `prompts_create` |
| GET | `/v2/prompts/{prompt_id}` | Lire un prompt (query `version`, `alias`, `fields`) | `prompts_get` |
| PATCH | `/v2/prompts/{prompt_id}` | Mettre à jour `title`, `description`, `sharingScope`, `workspaceRelation` | `prompts_update` |
| DELETE | `/v2/prompts/{prompt_id}` | Supprimer un prompt | `prompts_delete` |
| GET | `/v2/prompts/{prompt_id}/versions` | Lister les versions | `prompts_list_versions` |
| POST | `/v2/prompts/{prompt_id}/versions` | Créer une version (`definition` requis, `notes`, `aliases`) | `prompts_create_version` |
| GET | `/v2/prompts/{prompt_id}/versions/{version}` | Lire une version | `prompts_get_version` |
| PATCH | `/v2/prompts/{prompt_id}/versions/{version}` | Modifier `notes` / `aliases` d'une version | `prompts_update_version_metadata` |

### 5.2 Méthodes SDK

| Fonction | Python (V1 `from mistralai import Mistral` / V2 `from mistralai.client import Mistral`) | TypeScript (`@mistralai/mistralai`) |
|---|---|---|
| Chat synchrone | `client.chat.complete(model=…, messages=…)` | `client.chat.complete({...})` |
| Chat asynchrone | `await client.chat.complete_async(...)` | (async natif) |
| Streaming | `client.chat.stream(...)` / `await client.chat.stream_async(...)` → `chunk.data.choices[0].delta.content` | `client.chat.stream({...})` + `for await` |
| Sortie structurée parsée | `client.chat.parse(response_format=<Pydantic>)` → `message.parsed` | `client.chat.parse({ responseFormat: <Zod> })` |
| Embeddings | `client.embeddings.create(model=…, inputs=[...])` | `client.embeddings.create({ model, inputs })` |
| Modération texte | `client.classifiers.moderate(model=…, inputs=[...])` | `client.classifiers.moderate({...})` |
| Modération chat | `client.classifiers.moderate_chat(model=…, inputs=[...])` | `client.classifiers.moderateChat({...})` |
| Prompt Registry | `client.beta.prompts.get(prompt_id=…, version=…, alias=…)` (**V2 seulement**) | `client.beta.prompts.get({ promptId, version, alias })` |
| Conversation | `client.beta.conversations.start(model=…, inputs=…, guardrails=…)` (V2) | `client.beta.conversations.start({...})` |
| Agent | `client.beta.agents.create(model=…, name=…, guardrails=…)` (V2) | `client.beta.agents.create({...})` |

Classes Python utiles : `UserMessage`, `ToolMessage` (V1 : `from mistralai import ToolMessage` ; V2 : `from mistralai.client import Mistral, ToolMessage`), `TextChunk`, `ReferenceChunk`, `ThinkChunk` (V1 : `mistralai.models` ; V2 : `mistralai.client.models`). Option client : `timeout_ms` (exemple 300 000 ms pour le raisonnement).

Conventions TS (camelCase) relevées : `toolChoice`, `parallelToolCalls`, `responseFormat`, `maxTokens`, `topP`, `toolCalls`, `toolCallId`, `imageUrl`, `reasoningEffort`, `promptId`, `blockOnError`, `moderationLlmV2`, `customCategoryThresholds`, `ignoreOtherCategories`.

Fonctionnalités **absentes du SDK Python V1** (message explicite « Not available in the V1 SDK (mistralai 1.x) ») : Prompt Registry, reasoning (`reasoning_effort`), guardrails (chat, conversations, agents).

### 5.3 Streaming (événements)

- Transport : Server-Sent Events « data-only », flux terminé par `data: [DONE]` (spec).
- Chaque événement : `{ "data": CompletionChunk }` côté SDK ; `object: "chat.completion.chunk"`.
- `delta` : `role` (premier chunk), `content` (chaîne **ou** liste de chunks pendant le raisonnement), `tool_calls`, `tool_call_id`, `index` (pour réponses multi-messages), `metadata`.
- `usage` : `null` sauf sur le dernier chunk.
- Événements intercalés possibles : appels d'outils, citations.

### 5.4 Codes d'erreur et réponses spéciales

| Code / cas | Contexte | Détail |
|---|---|---|
| `422` | Toute requête chat invalide | `HTTPValidationError` (spec) |
| `403` | Guardrail déclenché | `error.message: "Content blocked by guardrail"`, détails `guardrails.results.moderation_llm_v2.decisions` |
| code `3201`, type `invalid_request_error` | Guardrail en erreur + `block_on_error: true` | Message « Request blocked due to error in guardrail evaluation… » |
| Erreur (non chiffrée) | Image > 10000×10000 | L'API renvoie une erreur ; en dessous mais > résolution max : redimensionnement |
| `finish_reason: "length"` / `"model_length"` | Limite `max_tokens` / longueur du modèle | (spec) |
| `finish_reason: "tool_calls"` | Le modèle demande un outil | `content: ""` + `tool_calls` |

---

## 6. Limites, quotas, tarifs, disponibilité

| Sujet | Valeur / règle |
|---|---|
| Plans | « Certaines fonctionnalités varient selon le plan » (https://mistral.ai/pricing) — détail non fourni dans ces pages |
| Batch processing | Jusqu'à **−50 %** de coût pour charges asynchrones volumineuses (carte d'accueil Studio) |
| Prompt caching | Tokens en cache à **10 %** du prix d'entrée ; blocs de **64 tokens** ; aucun hit sous 64 tokens ; hit non garanti ; suivi Admin › Usage par modèle |
| Predicted outputs | **Aucun impact tarifaire** actuellement ; `codestral-latest`, `mistral-large-2411` ; `n` non supporté |
| `n` | Tokens d'entrée **facturés une fois** quel que soit `n` (spec) |
| Vision — coût | Image facturée comme tokens d'entrée (≈ X×Y/784 pour Large 3, Small 3.2, Medium 3, Ministral 3 ; ≈ X×Y/256 pour Pixtral) |
| Vision — limites | Max **8 images**/requête ; **10 Mo** par fichier ; PNG/JPEG/WEBP/GIF mono-image ; résolution max 1540×1540 (ou 1024×1024 Pixtral) avec redimensionnement ; erreur au-delà de 10000×10000 |
| Rate limits | Studio › Limits (`https://console.mistral.ai/limits/`) |
| Reasoning | `high` augmente la consommation de tokens ; replay des ThinkChunks = tokens de prompt supplémentaires aux tours suivants |
| Structured outputs / JSON mode | Tous les modèles disponibles **sauf `codestral-mamba`** |
| Function calling | Liste non exhaustive de modèles (cf. 3.10) |
| `service_tier` | `auto` ou `standard_only` ; réponse `standard` ou `priority` (spec, pas de tarif dans le périmètre) |
| Embeddings | `mistral-embed` 1024 dim ; `codestral-embed` 1536 par défaut, ≤ 3072 ; lots de 50 dans les exemples ; auto-chunking « à venir » |
| Modération | Précision 0,8–1,0 et rappel 0,7–1,0 (jeu interne) ; `mistral-moderation-2411` déprécié au 31/03/2026 |
| Guardrails | Entrée uniquement ; plusieurs guardrails par requête ; un seul `moderation_llm_v2` par objet |
| Secrets Manager | **Public Preview** ; nom ≤ 256 car. ; valeur ≤ 64 KiB ; description ≤ 512 octets ; suppression douce sans expiration ; rôle Developer requis pour écrire |
| Régions / ZDR / rétention | Non abordés dans les pages du périmètre |

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Chat completions**
- `content` de réponse **polymorphe** : chaîne en usage simple, liste de chunks dès que citations, reasoning (`high`) ou certains modèles (`zai-glm-5-3`) entrent en jeu. Un client robuste doit toujours gérer les deux formes, y compris en streaming où la forme change au milieu du flux.
- `prefix: true` : le texte renvoyé **reprend le préfixe** (« The Capital of France is **Paris**. »), il ne faut pas le concaténer une seconde fois.
- `stop` : la séquence d'arrêt est exclue de la sortie ; `finish_reason` reste `"stop"`.
- `safe_prompt` n'est qu'un **premier niveau** ; la doc oriente vers modération/guardrails pour un contrôle réel.
- `temperature` : plage 0–1,5 mais recommandation 0–0,7 ; ne pas régler `temperature` et `top_p` simultanément. Défaut **propre à chaque modèle**.
- `additionalProperties: false` sur la requête : un champ mal orthographié provoque une erreur de validation (422) (inférence à partir de la spec).
- Les alias `-latest` sont résolus vers une version datée : appel `mistral-large-latest` → `model: "mistral-large-2512"` dans une réponse ; `ministral-14b-latest` → `ministral-14b-2512`.
- La doc renvoie vers les **Agents and Conversations APIs** pour simplifier la gestion d'état multi-tours (la Chat Completion API reste sans état).

**Function calling**
- `arguments` est une **chaîne JSON** à parser (`json.loads`) ; la spec tolère aussi un objet.
- Il faut boucler tant que `tool_calls` est non vide et exécuter **chaque** appel (parallèles) ; le modèle peut aussi produire du texte intercalé avec des appels d'outils.
- Chaque `tool` message doit porter le `tool_call_id` correspondant et le `name` de la fonction.
- `tool_choice: "any"` force un appel même si non pertinent ; `parallel_tool_calls: false` force un appel unique par tour.
- Les exemples TS utilisent des noms camelCase (`retrievePaymentStatus`) et des clés camelCase (`toolCallId`, `toolCalls`).

**Reasoning**
- Ne **jamais** retirer les `ThinkChunk` de l'historique (dégradation significative), même si cela coûte des tokens.
- `zai-glm-5-3` n'accepte pas `none`, accepte `max` et renvoie toujours une liste de chunks.
- Les Magistral natifs sont dépréciés mais figurent encore dans la table « Reasoning Models » du function calling.

**Structured outputs**
- JSON mode sans consigne explicite dans le prompt = risque de JSON non conforme au format souhaité ; le mode custom est préférable.
- Le mode custom **modifie le system prompt** (préfixe automatique avec le schéma) : à prendre en compte dans le comptage de tokens et le design du prompt (inférence).
- `strict` vaut `false` par défaut dans la spec alors que tous les exemples le passent à `true`.

**Vision**
- Le coût d'une image peut dépasser 2 000 tokens d'entrée (≈ 2099 pour une photo) ; limiter via la résolution (inférence à partir de la formule).
- GIF : seuls les GIF **non animés à une seule image** sont acceptés (un GIF animé n'est pas supporté).
- Les exemples recommandent des IDs datés (`mistral-small-2506`, `ministral-14b-2512`…) mais utilisent des alias `-latest` dans le code.
- Pour l'OCR de documents, la doc recommande Document AI plutôt que la vision générique.

**Prompt caching**
- Le cache est par **préfixe** : modifier le début du prompt (ex. horodatage dans le system prompt) annule les hits (inférence cohérente avec le `:::tip`).
- `cached_tokens` peut être **absent** (pas seulement `0`).
- Ne pas mettre de données sensibles dans `prompt_cache_key`.

**Embeddings**
- SDK : paramètre `inputs` ; REST : `input`.
- Vecteurs normalisés : cosinus = produit scalaire = distance euclidienne (équivalents pour le classement).
- `binary`/`ubinary` : longueur de liste = dimension / 8 ; nécessite une déquantification (cookbook dédié) pour revenir à des flottants.
- La troncature `output_dimension` conserve les premières dimensions (ordonnées par pertinence).

**Modération et guardrails**
- Guardrails = **entrée seulement** ; la sortie du modèle n'est pas filtrée par ce mécanisme (la Moderation API, elle, peut être appelée sur les sorties : titre « Moderate Inputs/Outputs »).
- Un seuil à `1` désactive une catégorie ; sans `ignore_other_categories`, les catégories non listées sont évaluées avec le seuil par défaut (inférence : non chiffré dans la doc).
- Endpoint conversationnel : seul le **dernier tour** est classé.
- Les seuils maison sur `category_scores` peuvent nécessiter un recalibrage à chaque évolution du modèle.
- Dépréciation : `mistral-moderation-2411` (31/03/2026) ; la spec garde une config `moderation_llm_v1` (catégorie fusionnée `dangerous_and_criminal_content`).

**Prompt Registry**
- La substitution `{{variable}}` est manuelle ; une variable non remplacée partira telle quelle au modèle (inférence).
- `get` sans `version`/`alias` = dernière version : risque de changement de comportement en production → épingler.

**Secrets**
- Valeur jamais relisible : conserver une copie hors plateforme.
- La rotation n'a d'effet qu'après **redémarrage** des déploiements.
- Le nom est mis en minuscules : `MySecret` et `mysecret` désignent le même secret.
- Les secrets liés sont injectés comme **build args Docker** (réserves de sécurité détaillées sur une autre page).

**Sécurité de la documentation**
- L'exemple curl « Transcribe » de la page Vision contient en dur une valeur de jeton Bearer au lieu de `$MISTRAL_API_KEY` (valeur non reproduite ici).

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Prompt caching — multiple de 64** : la doc affirme que `cached_tokens` est un multiple de 64, mais son propre exemple affiche `cached_tokens: 1008` (1008 / 64 = 15,75).
2. **Catégories de modération** : le texte annonce `mistral-moderation-2603` avec `jailbreaking` et une table à 11 catégories (Dangerous et Criminal séparés), mais les sorties d'exemple de `/v1/moderations` et `/v1/chat/moderations` affichent les **9 clés de l'ancien modèle** (`dangerous_and_criminal_content`, pas de `jailbreaking`). Les sorties guardrails, elles, montrent bien `dangerous`, `criminal`, `jailbreaking`. Le schéma réel des endpoints de classification avec 2603 reste à confirmer.
3. **`action` des guardrails** : `"none"` dans les réponses réelles, `"pass"` dans l'exemple de la section « Responses » ; la spec n'énumère que `none` et `block`.
4. **Catégories renvoyées** : la phrase « seules les catégories spécifiées sont renvoyées (si `ignore_other_categories` est `false`, toutes) » est ambiguë et l'exemple « Responses » (4 catégories avec `ignore_other_categories` implicite) ne l'illustre pas clairement.
5. **Objet agent** : clé `"moderation_llm_v2": null` **dupliquée** avant la vraie config — probablement `moderation_llm_v1: null` (la spec possède les deux champs) (inférence).
6. **Statut HTTP de `block_on_error`** : la spec dit « return HTTP 403 », la doc montre un corps `invalid_request_error` code 3201 sans préciser le statut.
7. **`reasoning_effort`** : le guide ne documente que `high` et `none` (+ `low`/`high`/`max` pour `zai-glm-5-3`), la spec énumère `none`, `minimal`, `low`, `medium`, `high`, `xhigh` — et **`max` n'y figure pas**. Effets de `minimal`/`low`/`medium`/`xhigh` non décrits.
8. **Identifiants de modèles de raisonnement** : `mistral-medium-3-5`, `mistral-large-4-0`, `zai-glm-5-3` (format inhabituel, sans `-latest` ni date) ; aucun de ces IDs n'apparaît dans les tables vision/function calling.
9. **Magistral** : déclarés dépréciés dans Reasoning, mais encore listés comme modèles compatibles function calling (« Magistral Medium 1.2 », « Magistral Small 1.2 »).
10. **Versions de Medium** : Function calling cite « Mistral Medium 3.5 » (`mistral-medium-latest`), Vision recommande « Mistral Medium 3.1 » (`mistral-medium-2508`) et la table de tokens d'image dit « Mistral Medium 3 ».
11. **Pixtral** : présents dans la table de tokenisation d'images mais absents des modèles recommandés (statut non précisé).
12. **Predicted outputs** : modèles supportés `codestral-latest` et `mistral-large-2411` (ancienne version datée) — liste possiblement obsolète ; exemple utilisant des modèles anciens (`open-mistral-7b`, `open-mistral-nemo`).
13. **Codestral Embed — dimension** : défaut annoncé 1536, mais le texte dit que la longueur renvoyée est **1553** ; il est aussi écrit que le modèle génère « jusqu'à 3072 » dimensions. L'exemple curl utilise `output_dimension: 10` avec `binary` (non multiple de 8 alors que `binary` renvoie dimension/8 éléments).
14. **TypeScript reasoning** : l'exemple non-streaming passe `reasoning_effort: "high"` (snake_case) alors que l'exemple streaming utilise `reasoningEffort`.
15. **JSON mode TS** : import `from "mistralai"` au lieu de `@mistralai/mistralai`.
16. **Exemples TS de modération** : syntaxe invalide (virgule manquante après `model`, `inputs = [...]`).
17. **Function calling TS** : commentaires `#` dans du TypeScript ; sortie affichant des noms camelCase alors que le code Python utilise snake_case.
18. **Citations** : l'outil `get_information` n'a aucun paramètre, mais la sortie d'exemple montre `arguments: "{\"query\": \"Nobel Prize winners 2024\"}"` (et `"{}"` dans la requête suivante, avec un autre ID d'appel).
19. **Liens internes** : chat-completion renvoie vers `/studio/agents/agent-tools/function-calling` alors que la page est `/studio/conversations/function-calling` ; le lien `safe_prompt` pointe vers `./guardrailing` ; le lien Retrieval de codestral-embed pointe vers `/rag_quickstart`.
20. **Deux pages modération identiques** (`/studio/conversations/moderation` et `/studio/safety-moderation`), seuls les liens cookbook diffèrent (internes vs Colab).
21. **`usage.prompt_tokens_details`** : présent dans les réponses documentées (cache, guardrails, reasoning) mais absent du schéma `UsageInfo` de la spec (qui a `additionalProperties: false`).
22. **Paramètres non documentés** dans les guides mais présents dans la spec : `min_tokens`, `repetition_penalty`, `top_k`, `logprobs`, `top_logprobs`, `prompt_logprobs`, `top_prompt_logprobs`, `metadata`, `prompt_mode`, `service_tier`, ainsi que les types d'outils `image_generation`, `document_library`, `connector` dans `tools` et la forme objet `image_url` avec `detail`. Leur disponibilité réelle par modèle n'est pas établie.
23. **Prompt Registry** : aucune page du périmètre ne décrit l'écran Studio de gestion des prompts (création, éditeur, gestion des alias) — seule l'existence de la réaffectation d'alias depuis Studio est mentionnée. L'exemple TS redéclare `const prompt` deux fois.
24. **Valeurs par défaut** de `top_p`, `max_tokens`, pénalités : non indiquées (seule `temperature` est dite « dépendante du modèle »).
25. **Seuil par défaut** des catégories de guardrails (quand non listées et `ignore_other_categories: false`) : non chiffré.
26. **Taille d'image** : « 10Mb » (mégabits ou mégaoctets ?) — interprété comme 10 Mo.
27. **Secrets Manager** : la page parle d'« AI Studio » et de rôles « Developer », « Workspace Contributor », « Workspace Admin » sans préciser si le rôle Developer est attribuable seul.

---

## Annexe — Couverture

| # | Fichier | Source | Statut |
|---|---|---|---|
| 1 | `studio.md` | https://docs.mistral.ai/studio.md | ✅ lu en entier |
| 2 | `studio/conversations/chat-completion.md` | https://docs.mistral.ai/studio/conversations/chat-completion.md | ✅ lu en entier |
| 3 | `studio/conversations/chat-completion/prompt-registry.md` | https://docs.mistral.ai/studio/conversations/chat-completion/prompt-registry.md | ✅ lu en entier |
| 4 | `studio/conversations/chat-completion/prompting.md` | https://docs.mistral.ai/studio/conversations/chat-completion/prompting.md | ✅ lu en entier |
| 5 | `studio/conversations/advanced/predicted-outputs.md` | https://docs.mistral.ai/studio/conversations/advanced/predicted-outputs.md | ✅ lu en entier |
| 6 | `studio/conversations/advanced/prompt-caching.md` | https://docs.mistral.ai/studio/conversations/advanced/prompt-caching.md | ✅ lu en entier |
| 7 | `studio/conversations/citations.md` | https://docs.mistral.ai/studio/conversations/citations.md | ✅ lu en entier |
| 8 | `studio/conversations/function-calling.md` | https://docs.mistral.ai/studio/conversations/function-calling.md | ✅ lu en entier |
| 9 | `studio/conversations/moderation.md` | https://docs.mistral.ai/studio/conversations/moderation.md | ✅ lu en entier |
| 10 | `studio/conversations/reasoning.md` | https://docs.mistral.ai/studio/conversations/reasoning.md | ✅ lu en entier |
| 11 | `studio/conversations/structured-output.md` | https://docs.mistral.ai/studio/conversations/structured-output.md | ✅ lu en entier |
| 12 | `studio/conversations/structured-output/custom.md` | https://docs.mistral.ai/studio/conversations/structured-output/custom.md | ✅ lu en entier |
| 13 | `studio/conversations/structured-output/json_mode.md` | https://docs.mistral.ai/studio/conversations/structured-output/json_mode.md | ✅ lu en entier |
| 14 | `studio/conversations/vision.md` | https://docs.mistral.ai/studio/conversations/vision.md | ✅ lu en entier |
| 15 | `studio/knowledge-rag/embeddings.md` | https://docs.mistral.ai/studio/knowledge-rag/embeddings.md | ✅ lu en entier |
| 16 | `studio/knowledge-rag/embeddings/code_embeddings.md` | https://docs.mistral.ai/studio/knowledge-rag/embeddings/code_embeddings.md | ✅ lu en entier |
| 17 | `studio/knowledge-rag/embeddings/text_embeddings.md` | https://docs.mistral.ai/studio/knowledge-rag/embeddings/text_embeddings.md | ✅ lu en entier |
| 18 | `studio/safety-moderation.md` | https://docs.mistral.ai/studio/safety-moderation.md | ✅ lu en entier (quasi-doublon de #9, diff vérifié) |
| 19 | `studio/secrets.md` | https://docs.mistral.ai/studio/secrets.md | ✅ lu en entier |

Vérifications complémentaires (grep ciblé) dans `openapi.yaml` : `ChatCompletionRequest`, `ResponseFormat`, `JsonSchema`, `Tool`, `Function`, `ToolChoice(Enum)`, `Prediction`, `ReasoningEffort`, `MistralPromptMode`, `RequestedServiceTier`, `GuardrailConfig`, `ModerationLLMV1/V2Config` et seuils, messages et chunks, `ChatCompletionChoice`, `CompletionChunk`, `UsageInfo`, `EmbeddingRequest`, `EmbeddingDtype`, `EncodingFormat`, `ClassificationRequest`, `ChatModerationRequest`, `ModerationResponse`, chemins `/v1/chat/completions`, `/v1/embeddings`, `/v1/moderations`, `/v1/chat/moderations`, `/v2/prompts*`, schémas `Prompt`, `PromptDefinition`, `CreatePromptRequest`, `RegistrySharingScope`, `ShareRelation`, `AliasList`.
