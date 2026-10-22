# 15 — Recherche : Libraries, agentic search et Search Toolkit

> **Périmètre** : Libraries (bases de connaissances gérées, RAG intégré aux agents), Agentic Search (boucle de recherche/navigation pilotée par le modèle, serveur MCP, starter app) et Search Toolkit (framework Python open-source d'ingestion, de retrieval et d'index : modèle de document, embeddings, loaders, extractors, splitters, enrichers, embedders, query engine, rerankers, cache sémantique, backends Vespa / Postgres / Qdrant / custom) · **Sources** : 29 pages de docs.mistral.ai (copie du 21/10/2026), plus des vérifications ciblées dans la spec OpenAPI locale (endpoints `/v1/libraries*`, schémas associés) · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Libraries (RAG géré)
   - 3.2 Agentic Search
   - 3.3 Search Toolkit : vue d'ensemble, installation, extras
   - 3.4 Modèle de document
   - 3.5 Modèle d'embedding
   - 3.6 Pipeline d'ingestion (`Pipeline`, checkpointing, `RoutedPipeline`)
   - 3.7 File loaders
   - 3.8 Document extractors
   - 3.9 Text splitters
   - 3.10 Chunk enrichers
   - 3.11 Embedders
   - 3.12 Retrieval : `QueryEngine`
   - 3.13 Query preprocessing
   - 3.14 Retrievers
   - 3.15 Rerankers
   - 3.16 Semantic cache
   - 3.17 Search index : panorama des backends
   - 3.18 Custom vector stores (`VectorStoreIndex`, `NavigableIndex`, `PatchableIndex`)
   - 3.19 Backend Postgres
   - 3.20 Backend Qdrant (communautaire)
   - 3.21 Vespa : anatomie d'une application
   - 3.22 Vespa : migrations (gestion de schéma) et helpers
   - 3.23 Vespa : query profiles et ranking
   - 3.24 Vespa : CLI `mistral-vespa`
   - 3.25 Vespa : développement local
   - 3.26 Vespa : déploiement et opérations
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
Annexe — Couverture

---

## 1. En bref

- **Trois briques complémentaires pour la recherche documentaire** :
  1. **Libraries** : bases de connaissances **persistantes et gérées** par Mistral. On y dépose des documents (PDF, articles, « any document ») ou on y indexe un site web, et on les branche sur un agent via l'outil intégré `document_library` pour du RAG « clé en main ».
  2. **Agentic Search** : une **couche d'orchestration** (pas une méthode de retrieval de plus). Le modèle cherche, ouvre la source, navigue entre chunks voisins, fait un `grep` exact, puis relance une recherche en excluant ce qu'il a déjà vu (`exclude_ids`). Elle est livrée sous forme de **7 outils MCP** ou via le SDK Search Toolkit. La doc indique qu'elle fonctionne « in Studio, in open-source deployments, and in Libraries ».
  3. **Search Toolkit** : un **framework Python** (`mistralai-search-toolkit`, PyPI, Python ≥ 3.12, `uv` recommandé) pour construire soi-même des systèmes de recherche d'information (IR). Il couvre l'ingestion, le retrieval et l'évaluation, sur plusieurs backends, avec **chaque composant remplaçable**.
- **Public** : développeurs d'agents (Libraries + `document_library`) ; équipes qui ont besoin d'un pipeline RAG sur mesure, auto-hébergé ou en environnement isolé (Search Toolkit, Vespa/Postgres auto-hébergés, OCR injectable).
- **Statut** :
  - Libraries est exposée sous l'espace de nom SDK `client.beta.libraries` et les tags OpenAPI `beta.libraries*`, donc **API beta**.
  - Search Toolkit est en **pré-1.0** : plusieurs éléments sont annoncés « Removed before 1.0.0 », et un ancien modèle intermédiaire de « pages » a été retiré.
  - Qdrant est un plugin **communautaire** maintenu par un tiers.
- **Facturation Libraries** : le traitement des documents est **pay-as-you-go**, y compris depuis Studio (« the same as when you use the Mistral API »). Le retraitement d'un document est **refacturé**. L'usage RAG apparaît en `connector_tokens` dans les réponses de conversation.
- **Résultats mis en avant** (cités par la doc d'après les supports de lancement de Search Toolkit) :
  - FinanceBench : précision de **27 % (RAG single-shot) à 86 %** avec la boucle agentique complète.
  - Latence p90 sur FinanceBench : **−40 %** par rapport à une boucle « search-only ».
  - Tokens sur OfficeQA : **÷1,8**.
  - Durée d'une tâche Vibe : de **368 s à 227 s**.
- **Backends officiels du Toolkit** :
  - **Vespa**, avec schémas versionnés via des migrations Python et le CLI `mistral-vespa`.
  - **Postgres**, avec `pgvector` + `pg_textsearch`, recherche dense et hybride, et le CLI `mistral-postgres`.
  - En plus : Qdrant (communautaire) et des stores custom (protocoles `VectorStoreIndex`, `NavigableIndex`, `PatchableIndex`, `KeywordStoreIndex`).
- **Démarrage rapide agentique** : le template Copier `mistralai/search-starter-app` génère un projet complet :
  - pipelines d'ingestion ;
  - index Vespa en Docker ;
  - serveur MCP exposant les 7 outils ;
  - skill d'agent ;
  - données d'exemple.

  Il est conçu pour être piloté par **Vibe** (`vibe --trust`).

---

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| **Library** | Base de connaissances persistante (objet API, ID UUID) qui contient des documents traités (OCR, résumé, indexation) et que l'on peut interroger depuis un agent. |
| **Document** (Libraries) | Fichier déposé dans une Library. Il porte des métadonnées (`mime_type`, `extension`, `size`, `summary`, `number_of_pages`, compteurs de tokens…) et un statut de traitement. |
| `processing_status` / `process_status` | Statut de traitement d'un document. La doc utilise `processing_status` (`"Running"` puis `"Completed"`). La spec le marque **déprécié** au profit de l'enum `process_status` (`todo`, `in_progress`, `done`, `error`, `waiting_for_capacity`, `noop`, `missing_content`, `self_managed`). |
| **Index a website** (crawler) | Création d'une Library par crawl d'un site à partir d'une URL graine, avec profondeur, nombre de pages, filtres d'URL, rafraîchissement planifié et rendu headless optionnel. |
| `document_library` | Outil intégré (« built-in agent tool ») qui permet à un agent de chercher dans des Libraries ; il se paramètre avec `library_ids`. |
| `tool.execution` / `message.output` | Types d'entrées dans une réponse de conversation : exécution de l'outil, puis réponse de l'agent (chunks `text` et `tool_reference` pour les citations). |
| `connector_tokens` | Tokens consommés par la recherche dans la Library, comptés dans `usage` et inclus dans `total_tokens`. |
| Access `level` | Niveau d'accès à une Library : `Viewer` (lecture) ou `Editor` (édition). |
| `share_with_type` | Type d'entité destinataire d'un partage : `User`, `Workspace` ou `Org`. |
| **Agentic Search** | Boucle de recherche itérative pilotée par le modèle (search → inspect → grep → navigate/read → re-query) au-dessus des primitives de retrieval. |
| Retrieval primitive | Méthode de recherche élémentaire : lexicale (keyword/BM25), sémantique (vecteurs) ou hybride. |
| `exclude_ids` | Liste d'IDs de chunks déjà vus, à exclure d'une nouvelle recherche. Elle permet une « pagination au niveau du corpus ». |
| `source_id` | Identifiant stable d'une source (chemin, URL ou schéma custom comme `arxiv:1706.03762`). C'est la base de l'identité déterministe. |
| `locator` | Position sémantique d'un chunk dans sa source (`char:{start}-{end}`, `page:{n}:char:{start}-{end}`, préfixé par le type si besoin). |
| `Document` / `DocumentChunk` (Toolkit) | Document extrait complet, et tranche récupérable de ce document (éventuellement avec son embedding). |
| `SearchResultChunk` | Côté retrieval, un chunk renvoyé ; il porte le même contrat d'identité que le chunk ingéré. |
| `chunk_type` | Type de chunk : `content`, `image_annotation` ou `summary`. |
| `EmbeddingModel` | Description, côté schéma d'index, des vecteurs stockés (dimensions, dtype, métrique). Elle est distincte de l'`Embedder` qui les produit. |
| `MistralEmbeddingPreset` | Enum des modèles d'embedding Mistral supportés (1024 / 256 / 128 dimensions). |
| `FileLoader` / `File` | Composant qui lit des octets bruts depuis une source (disque, S3, GCS, Azure, custom) / objet fichier (`path`, `name`, `raw`, `source_id`). |
| `DocumentExtractor` | Composant qui transforme un `File` en `Document` (OCR, HTML→Markdown, texte brut, tableur, e-mail, audio…). |
| `TextSplitter` | Composant qui découpe un document en chunks (caractères, tokens, Markdown, séparateurs). |
| `DocumentProcessor` / `ChunkEnricher` | Étape optionnelle d'enrichissement (métadonnées, résumé LLM) appliquée avant l'embedding. |
| `Embedder` | Composant qui produit les vecteurs (méthode abstraite `embed`). |
| `Pipeline` / `RoutedPipeline` | Orchestrateur d'ingestion / routeur multi-format qui choisit un pipeline par « protocole » de fichier. |
| `QueryEngine` | Orchestrateur de retrieval : préprocesseur de requête optionnel, un ou plusieurs retrievers, rerankers chaînés. |
| `ReRanker` / `GroupedRanker` | Reranker sur une seule liste de résultats / sur plusieurs groupes de résultats (fusion, par exemple RRF). |
| RRF | Reciprocal Rank Fusion, fusion de classements fondée sur les rangs. |
| `SemanticCache` / `CachedQueryEngine` | Cache de résultats indexé par similarité de requête / enveloppe transparente d'un `QueryEngine`. |
| `VectorStoreIndex` | Protocole minimal d'un backend vectoriel : `index_document`, `search`, `delete_document`. |
| `NavigableIndex` | Protocole optionnel de navigation positionnelle (`navigate`, `read`, `get_chunk`, `grep`), requis pour l'Agentic Search. |
| `PatchableIndex` | Protocole optionnel de mise à jour partielle (`patch_chunk`, `patch_document`) sans réindexation complète. |
| `KeywordStoreIndex` | Protocole de store lexical (BM25), utilisé par `KeywordRetriever`. Les backends intégrés ne l'implémentent pas. |
| Collection | Ensemble nommé de chunks dans un backend (schéma Vespa ou table Postgres), sélectionné par `collection_name`. |
| Vespa application package | Ensemble de fichiers de configuration Vespa (`schemas/*.sd`, query profiles). Il est **généré en mémoire** depuis les migrations et n'est jamais écrit à la main. |
| Migration (Vespa) | Fichier Python qui ajoute un incrément au schéma (classe `VespaMigration`) : en ajout seul, ordonné par horodatage, rejoué à chaque déploiement. |
| `SearchMode` | Mode de recherche d'un schéma Vespa : `INDEX` (BM25, ANN/HNSW, ranking en 2 phases) ou `STREAMING` (plus proches voisins exacts, filtrage par attribut, ranking en 1 phase). |
| `IndexingMode` | Disposition des documents Vespa : `DOCUMENT_PER_CHUNK` (recommandé) ou `SINGLE_DOCUMENT` (legacy, déprécié). |
| Ranking profile | Profil de classement Vespa. Le plugin en génère 4 par schéma : `root`, `match-only`, `weighted-rank1`, `weighted-rank2`. |
| Query profile | Configuration nommée (profil de ranking, poids des fonctions, paramètres) sélectionnable à la requête, versionnable (`name:version`). |
| `vespa.lock` | Instantané optionnel du package généré, pour la revue de code et la CI. Il ne sert pas au déploiement. |
| Bruno | Outil de tests d'API. `mistral-vespa bruno` génère des fichiers de test Bruno depuis les migrations. |

---

## 3. Fonctionnalités en détail

### 3.1 Libraries (RAG géré)

**Description.** Une Library est une base de connaissances persistante que l'on alimente en documents et que l'on connecte à des agents pour un RAG intégré : l'agent y cherche « on demand ». La page couvre la création, l'upload, l'indexation de sites web, le suivi du traitement et le contrôle d'accès.

**Interopérabilité avec Vibe** (encadré `:::tip`) :
- On peut réutiliser les Libraries créées dans « Vibe ». Leur ID figure dans l'URL `https://chat.mistral.ai/libraries/<library_id>`.
- Pour qu'un agent accède à une Library Vibe, il faut être **Org admin** et la **partager avec l'Organisation**.
- Dans l'autre sens, une Library créée par API peut être partagée à l'équipe dans Vibe.

#### 3.1.1 Créer une Library

- `POST /v1/libraries` ; Python `client.beta.libraries.create(name=..., description=...)` ; TS `client.beta.libraries.create({ name, description })`.
- Réponse **201** (spec) avec l'objet `Library`.

Paramètres (doc + spec `CreateLibraryRequest`) :

| Nom | Type | Défaut | Valeurs | Effet |
|---|---|---|---|---|
| `name` | string | requis | — | Nom de la Library. |
| `description` | string \| null | null | — | Description libre. |
| `owner_type` | enum \| null | `Workspace` pour les sessions par clé API | `User`, `Workspace` | `User` crée une Library **privée** (propriétaire seul) ; `Workspace` la partage avec le workspace. Seules les clés API avec le scope d'accès connecteurs **« Private and shared connectors »** peuvent créer des Libraries privées (`User`). (spec uniquement) |
| `chunk_size` | int \| null | null | 256–32768 caractères | Taille de découpage du texte. **Déprécié** (spec). |

Exemple de réponse (doc) :
- Les champs de premier niveau sont `id` (UUID, par exemple `0197f425-5e85-7353-…`), `name`, `created_at`, `updated_at`, `owner_id`, `owner_type: "Workspace"`, `total_size: 0`, `nb_documents: 0`, `chunk_size: null` et `description`.
- Les champs suivants sont **tous marqués dépréciés dans la spec** : `emoji`, `generated_name`, `generated_description`, `explicit_user_members_count`, `explicit_workspace_members_count`, `org_sharing_role`.
- La doc précise que `generated_name` et `generated_description` sont **mis à jour automatiquement** à mesure qu'on ajoute des fichiers.

Comportement (spec) :
- Le créateur devient **propriétaire**, et lui seul peut partager la Library.
- « When first created this will only be accessible by you », ce qui entre en tension avec le défaut `Workspace` (voir §8).

#### 3.1.2 Lister les Libraries

- `GET /v1/libraries` ; Python `client.beta.libraries.list().data` ; TS `client.beta.libraries.list()` puis `.data`. Chaque élément expose `nb_documents` (TS : `nbDocuments`).
- La doc parle de « toutes les Libraries de votre Workspace » ; la spec, de celles « que vous avez créées ou qui ont été partagées avec vous ».

Paramètres de requête (spec) :

| Nom | Type | Défaut | Effet |
|---|---|---|---|
| `page_size` | int 1–100 | 100 | Taille de page. |
| `page_token` | string | — | Jeton de continuation (`next_page_token` de la réponse précédente). **Méthode préférée.** |
| `page` | int | 0 | **Déprécié** : la pagination par offset « re-scans earlier pages » et va disparaître. |
| `search` | string | — | Recherche insensible à la casse sur le nom. |
| `filter_owned_by_me` | bool | — | **Déprécié.** |

Réponse `ListLibrariesResponse` : `data[]`, `next_page_token` (null en fin de liste), `pagination` (déprécié, renvoyé seulement avec `page`).

#### 3.1.3 Uploader un document

- `POST /v1/libraries/{library_id}/documents`, en `multipart/form-data` avec un champ `file`.
- curl : `--form "file=@mistral7b.pdf;type=application/pdf"`. La spec indique qu'on peut forcer un nom avec `file=@path;filename=custom_name`.
- Python : `client.beta.libraries.documents.upload(library_id=..., file=File(fileName="mistral7b.pdf", content=f))`. L'import de `File` dépend de la version du SDK :
  - SDK **V1** : `from mistralai.models import File` ;
  - SDK **V2** (onglet par défaut) : `from mistralai.client.models import File`.
- TS : `client.beta.libraries.documents.upload({ libraryId, requestBody: { file: { fileName, content } } })`, avec `content` lu par `fs.readFileSync`.

Codes de réponse (spec) :
- **201** : document créé.
- **200** : un document **de même hash** existe déjà dans cette Library ; il est renvoyé tel quel (**déduplication**).

Le document est **mis en file** de traitement et ne devient trouvable par la recherche qu'une fois le traitement terminé.

Réponse initiale (doc) :
- Statut et identité : `id`, `library_id`, `hash`, `mime_type: "application/pdf"`, `extension: "pdf"`, `size: 3749788`, `name`, `created_at`, `processing_status: "Running"`, `uploaded_by_id`, `uploaded_by_type: "Workspace"`.
- Champs encore vides à ce stade : `tokens_processing_total: 0`, `summary: null`, `last_processed_at: null`, `number_of_pages: null`, `tokens_processing_main_content: null`, `tokens_processing_summary: null`.

#### 3.1.4 Suivre le traitement

- `GET …/documents/{document_id}/status` ; Python `client.beta.libraries.documents.status(library_id=..., document_id=...)` ; TS `documents.status({ libraryId, documentId })`.
- La doc montre une boucle de polling d'une seconde tant que `processing_status == "Running"`. La valeur finale est `"Completed"`.
- Forme de la réponse : `{ "document_id": "...", "processing_status": "Running" | "Completed" }`.
- La spec renvoie aussi `process_status`, l'enum non déprécié : `self_managed`, `missing_content`, `noop`, `done`, `todo`, `in_progress`, `error`, `waiting_for_capacity`.

#### 3.1.5 Métadonnées, contenu, URL signées, retraitement

**Métadonnées complètes** :
- `GET …/documents/{document_id}` ; Python `documents.get(...)` ; TS `documents.get(...)`.
- Exemple après traitement :
  - `summary` est un **résumé généré automatiquement** d'environ un paragraphe ;
  - `last_processed_at` est renseigné ;
  - `number_of_pages: 9` ;
  - `tokens_processing_total: 17143`, soit `tokens_processing_main_content: 8436` + `tokens_processing_summary: 8707`.
- Sur l'exemple, environ 8,6 s séparent l'upload de la fin du traitement, pour un PDF de 3,7 Mo et 9 pages.
- La spec ajoute :
  - `url` (inférence : probablement renseigné pour les pages crawlées) ;
  - `attributes` (objet libre) ;
  - `expires_at` (suppression automatique après cette date) ;
  - `process_status`.
- `hash`, `tokens_processing_main_content`, `tokens_processing_summary` et `processing_status` y sont marqués dépréciés.

**Texte extrait** :
- `GET …/documents/{document_id}/text_content` ; Python `documents.text_content(...)` ; TS `documents.textContent(...)`.
- Réponse : `{ "text": "..." }`.
- La spec ajoute les paramètres optionnels `page_start` / `page_end`, et précise que pour les PDF, DOCX et PPTX ce texte provient du traitement **Mistral OCR**.
- Un commentaire de l'exemple Python signale qu'il existe aussi une URL signée du texte extrait et une URL signée du fichier brut.

**URL signées** (spec) :
- `GET …/signed-url` : URL du fichier d'origine. Elle **expire après 30 minutes** et est **accessible à quiconque possède le lien**.
- `GET …/extracted-text-signed-url` : URL du texte extrait (pour les documents passés à l'OCR, le résultat des requêtes OCR).

**Retraitement** (spec) : `POST …/documents/{document_id}/reprocess` renvoie 204. Le document est **facturé à nouveau**.

**Mise à jour d'un document** (spec) : `PATCH …/documents/{document_id}` avec `name`, `attributes` et `expires_at`.
- Valeurs admises pour `attributes` : bool, string, int, number, date-time, ou tableaux de string, int, number ou bool.
- `PUT` sur la même route est **déprécié**.

#### 3.1.6 Indexer un site web (crawler)

- Disponible depuis **Studio** (https://console.mistral.ai/libraries) via un **crawler ciblé**. Il récupère le texte de l'URL graine et suit les liens enfants jusqu'à une profondeur configurable.
- **Texte uniquement** : images et graphiques ne sont pas indexés. Pour inclure du visuel, il faut télécharger la page et l'uploader comme fichier.
- Facturation (`:::note`) : depuis Studio, le traitement des documents est facturé à l'usage, comme via l'API.
- Parcours : **Index a website** → saisir **Library Name** et **Website URL** → (optionnel) **Advanced Settings** → **Start Indexing**.

Paramètres avancés :

| Réglage | Type | Défaut | Valeurs | Effet |
|---|---|---|---|---|
| **Maximum Pages** | entier | non précisé | 1–10000 | Nombre maximum de pages crawlées depuis l'URL graine. |
| **Maximum Depth** | entier | **10** | 1–10 | Nombre de sauts de liens depuis l'URL graine. |
| **URL filter rules** | règles | — | include / exclude | Contrôle des URL crawlées. |
| **Refresh Schedule** | enum | non précisé (inférence : None) | None, Hourly, Daily, Weekly, Monthly | Ré-indexation automatique. |
| **Browser-based fetching** | booléen | **désactivé** | on/off | Rendu des pages lourdes en JavaScript par navigateur headless avant extraction. |

Aucun endpoint public de crawler n'apparaît dans la spec. On y trouve en revanche :
- le type de cible d'audit `CRAWLER_CONFIG` ;
- les événements d'audit `crawler.config.create`, `crawler.config.update`, `crawler.config.delete`, `crawler.run.create`, `crawler.run.cancel`.

Inférence : le crawler est modélisé en interne comme une configuration plus des exécutions (« runs »).

#### 3.1.7 Supprimer

- **Library** : `DELETE /v1/libraries/{library_id}` ; Python `client.beta.libraries.delete(library_id=...)` ; TS `libraries.delete({ libraryId })`.
  - La Library est supprimée **avec tous ses documents**.
  - Spec : la réponse actuelle est 200 avec la Library supprimée ; elle deviendra **204** dans une version future.
- **Document** : `DELETE …/documents/{document_id}` ; Python `documents.delete(...)`.
  - Le document est retiré de la Library **et de l'index de recherche**. Réponse 204.

#### 3.1.8 Contrôler l'accès (partage)

Paramètres :

| Paramètre | Valeurs | Remarque |
|---|---|---|
| `org_id` | ID d'organisation | Présenté comme paramètre dans la doc, mais **déprécié** dans la spec (`SharingRequest`, `SharingDelete`). |
| `level` | `"Viewer"`, `"Editor"` | Requis pour créer ou mettre à jour un accès. |
| `share_with_uuid` | UUID de l'entité | À trouver « dans vos paramètres console et plateforme ». |
| `share_with_type` | `"User"`, `"Workspace"`, `"Org"` | — |

Règles :
- Seul le **propriétaire** peut partager une Library.
- Le propriétaire **ne peut pas supprimer son propre accès**. La spec ajoute qu'il ne peut pas non plus changer son propre rôle.
- Seul le propriétaire peut supprimer l'accès d'un autre.
- Les `Viewer` ne peuvent pas modifier la Library ; les `Editor` le peuvent.
- Spec : **une Library ne peut pas être partagée hors de l'organisation.**

Opérations :

| Opération | REST | Python | TS |
|---|---|---|---|
| Lister les accès | `GET /v1/libraries/{id}/share` | `client.beta.libraries.accesses.list(library_id=…)` | `accesses.list({ libraryId })` |
| Créer ou mettre à jour | `PUT /v1/libraries/{id}/share` | `accesses.update_or_create(library_id, org_id, level, share_with_uuid, share_with_type)` | `accesses.updateOrCreate({ libraryId, sharingIn: { orgId, level, shareWithUuid, shareWithType } })` |
| Supprimer | `DELETE /v1/libraries/{id}/share` (corps JSON) | `accesses.delete(library_id, org_id, share_with_uuid, share_with_type)` | `accesses.delete({ libraryId, sharingDelete: { orgId, shareWithUuid, shareWithType } })` |

- Objet `Sharing` renvoyé : `library_id`, `role`, `share_with_type`, `share_with_uuid`, ainsi que `user_id` et `org_id` (dépréciés).
- La suppression renvoie aujourd'hui 200 avec le partage supprimé ; elle passera à **204**.

#### 3.1.9 Connecter une Library à un agent (`document_library`)

`document_library` est un **outil intégré** d'agent. On crée l'agent avec `tools=[{"type": "document_library", "library_ids": [...]}]`.

```python
library_agent = client.beta.agents.create(
    model="mistral-medium-latest",
    name="Document Library Agent",
    instructions="Use the library tool to access external documents.",
    tools=[{"type": "document_library", "library_ids": [new_library.id]}],
    completion_args={"temperature": 0.3, "top_p": 0.95},
)
```

- TS : `tools: [{ type: "document_library", libraryIds: [...] }]`, `completionArgs: { temperature, topP }`.
- REST : `POST /v1/agents`.
- Réponse de l'agent :
  - `id` au format `ag_…` ;
  - `version: 0` ;
  - `completion_args`, avec les champs non définis à null et `tool_choice: "auto"` ;
  - `handoffs: null` ;
  - `object: "agent"`.
- Spec `DocumentLibraryTool` :
  - `library_ids` est **requis, avec au moins 1 élément** ;
  - `tool_configuration` est optionnel et prend `include`, `exclude` et `requires_confirmation` (listes de chaînes) ;
  - `additionalProperties: false`.

**Conversation** :
- Python `client.beta.conversations.start(agent_id=..., inputs="...")` ; TS `conversations.start({ agentId, inputs })` ; REST `POST /v1/conversations` avec `{inputs, stream: false, agent_id}`.
- Réponse `conversation.response` (ID `conv_…`) :
  - `outputs[0]` : entrée `tool.execution` (`name: "document_library"`, `created_at`, `completed_at`, `id: tool_exec_…`) ;
  - `outputs[1]` : entrée `message.output` (`id: msg_…`, `agent_id`, `model`, `role: "assistant"`), dont `content` est une liste de chunks `text` ou **`tool_reference`** (citations vers les documents sources).
- Exemple de `usage` : `prompt_tokens 196`, `completion_tokens 485`, **`connector_tokens 3165`**, `total_tokens 3846`, soit la somme des trois. On y trouve aussi `connectors: {"document_library": 1}`, c'est-à-dire le nombre d'appels.
- `:::tip` : l'outil de web search utilise aussi des références (renvoi au guide des citations).

---

### 3.2 Agentic Search

#### 3.2.1 Positionnement

Le retrieval trouve des sources probables ; l'Agentic Search permet au modèle de **les inspecter** pour réunir assez de preuves. Elle s'utilise :
- comme un **ensemble d'outils MCP** qui s'ajoutent à n'importe quel agent ;
- ou comme partie du **SDK Search Toolkit**.

| Couche | Fonctionnement | Cas d'usage |
|---|---|---|
| Keyword (lexical) | Correspondance de termes ou phrases exacts | Identifiants connus, code, citations exactes |
| Hybride ou sémantique | Mots-clés + vecteurs, ou vecteurs seuls | Questions en langage naturel sur un corpus |
| Agentic Search | Appelle les outils de retrieval, navigue dans les documents, exclut les chunks déjà vus, relance | Questions complexes qui demandent de vérifier les sources ou de croiser plusieurs documents |

- La plupart des setups de production partent d'un **retrieval hybride** (précision lexicale + rappel sémantique).
- Dans la boucle agentique, `search` utilise le retrieval sémantique ou hybride, et `grep` ajoute un ciblage lexical **à l'intérieur d'un document**.

#### 3.2.2 La boucle de retrieval

1. **Search** : requête sur la collection, qui renvoie les chunks les plus pertinents.
2. **Inspect** : lecture du contexte autour d'un résultat prometteur, sans nouvelle recherche globale.
3. **Grep** : recherche exacte d'un terme dans le même document pour sauter à une zone précise.
4. **Navigate / read** : parcours des chunks adjacents ou lecture d'une plage de la source.
5. **Re-query** : nouvelle recherche avec `exclude_ids` pour ne pas revoir les mêmes chunks.

La boucle s'arrête quand le modèle a assez d'éléments.

#### 3.2.3 Outils de navigation

Chaque outil opère sur l'index de recherche et renvoie des chunks avec leur contenu, leur score et leurs métadonnées de position.

| Outil | Rôle |
|---|---|
| `search(query, top_k, exclude_ids)` | Retrieval sémantique ou hybride sur la collection ; `exclude_ids` évite les chunks déjà inspectés. |
| `open(source_id, start_offset, end_offset, window)` | Élargit le contexte autour d'un chunk ; renvoie les chunks adjacents dans l'ordre de lecture. |
| `navigate(source_id, start_offset, end_offset, direction, top_k)` | Avance ou recule dans un document depuis une position connue. |
| `read(source_id, start_offset, end_offset, top_k)` | Lit les chunks d'une plage connue (issue d'une recherche ou d'une navigation). |
| `grep(source_id, pattern, mode, top_k)` | Recherche lexicale exacte dans **un seul** document. |
| `ingest(uri)` | Ajoute un document à l'index : chemin local, URI `file://` ou URL `http(s)://`. |
| `delete(source_id)` | Supprime un document et tous ses chunks. |

`:::info` : la navigation agentique **exige un `NavigableIndex`**. Dans la migration de schéma, il faut poser `IndexingMode.DOCUMENT_PER_CHUNK` pour que les chunks portent leurs offsets de source et puissent être parcourus dans l'ordre.

#### 3.2.4 Starter app (`search-starter-app`)

C'est un template **Copier** qui génère un projet avec pipelines d'ingestion, index **Vespa**, serveur **MCP** exposant les outils de navigation, et données d'exemple. Il est conçu pour être piloté par un agent (Vibe ou tout agent compatible MCP).

Prérequis :
- clé API Mistral (console.mistral.ai) ;
- **Docker** (Vespa local) ;
- **uv** ;
- **Copier** ;
- **Vibe** ou un autre agent MCP.

Commandes :

```bash
uvx copier copy gh:mistralai/search-starter-app my-search-project
cd my-search-project
make setup-vespa
```

- Copier demande la **clé API Mistral** et un **nom de collection**.
- `make setup-vespa` démarre un conteneur Vespa via Docker et déploie les migrations.

Arborescence générée :
- `Makefile` : cibles `setup`, `ingest`, `search`, `mcp`, `bruno`.
- `.env` : clé API, nom de collection, ports Vespa.
- `.mcp.json` : enregistrement du serveur MCP pour Vibe.
- `.agents/skills/search/` : **skill d'agent** Search Toolkit.
- `src/entrypoints/ingest.py`, `search.py`, `mcp_server.py`.
- `src/search_app/__init__.py` : définition de l'app Vespa.
- `src/search_app/migrations/`.
- `sample_data/hello.txt`.

Démonstration avec Vibe :
- **Lancer** : `vibe --trust`. Vibe détecte le serveur MCP et la skill de recherche. `/mcp` liste le serveur et ses **7 outils**.
- **Ingérer** : on demande en langage naturel (« Ingest https://arxiv.org/pdf/1706.03762.pdf »).
  - L'agent choisit l'outil `ingest` et **demande l'approbation**.
  - L'outil télécharge le PDF, extrait le texte par **Mistral OCR**, découpe, embarque et indexe.
  - Sortie : « Indexed 16 chunks from '…' into 'exampledocs' ».
  - Les fichiers texte passent par l'extraction texte brut ; **PDF, DOCX et images** par Mistral OCR.
- **Interroger** : l'agent enchaîne `search` → `open` → `grep` (par exemple « scaled dot-product attention ») → `navigate` / `read` → `search` avec `exclude_ids` si besoin de croiser → réponse ancrée dans les sources.
- `:::tip` : on peut aussi passer par le shell avec `make ingest path=sample_data/hello.txt` et `make search query="hello world"`. Le serveur MCP reste la voie recommandée pour l'agentique.

#### 3.2.5 Serveur MCP

Il expose **7 outils** : `search`, `open`, `navigate`, `read`, `grep`, `ingest`, `delete`.

| Transport | Commande | Usage |
|---|---|---|
| stdio | `uv run python -m entrypoints.mcp_server` | Agents locaux (Vibe) ; démarrage automatique quand Vibe est lancé dans le dossier |
| HTTP | `uv run python -m entrypoints.mcp_server --http --host 127.0.0.1 --port 8000` | Déploiements distants ou partagés |
| Makefile | `make mcp` | Lance en **mode HTTP** |

Enregistrement :
- **Vibe** : via `.mcp.json`.
- **Studio** : ajouter le serveur « as a connector or MCP server » dans la configuration de l'agent.
- **Agents custom** : tout client MCP, sur l'endpoint stdio ou HTTP.

Le serveur embarque des **instructions** qui décrivent la boucle : commencer par `search`, creuser avec `open` / `grep` / `navigate` / `read`, puis relancer `search` avec `exclude_ids`.

`:::tip` : pour cibler un seul document, inclure son titre ou son `source_id` dans la requête. Cela restreint la recherche globale et réduit la latence.

#### 3.2.6 Usage via le SDK

Le SDK fournit les **mêmes `QueryEngine` et `VectorRetriever`** que le serveur MCP, plus des fonctions avancées : réécriture de requête, fusion multi-retrievers, cache sémantique.

- **Client** : `MistralEmbedder(client=client)`, importé ici depuis `mistralai.search.toolkit.embedders` (voir §8).
- **Query engine** : `QueryEngine(retriever=[VectorRetriever(client=vector_store, embedder=embedder)])`, avec `vector_store = get_index("exampledocs")` (`from search_app import get_index`). Ensuite `await query_engine.search(query=..., top_k=5, include_metadata=True, include_content=True)`, et pour chaque résultat `hit.score` et `hit.chunk.content`.
- **Preprocessing** : `LLMQueryExtension(llm_provider=llm, num_queries=3)` passé en `query_rewriter`, avec `llm = MistralChat(client, LLMConfig(model="mistral-small-latest"))`.
- **Hybride** : `get_index("exampledocs", query_profile="dense")` et `query_profile="hybrid"`, deux `VectorRetriever`, puis `rerankers=[RRFRanker(rrf_k=60, top_k=10)]`. On peut chaîner du moins cher au plus cher, par exemple RRF puis `LLMReRanker`.
- **Ingestion** : `Pipeline(loader=FilesystemFileLoader(), extractor=PlainTextExtractor() | MistralOCRExtractor(client=client), text_splitter=MarkdownTextSplitter(MarkdownTextSplitterConfig(chunk_size=4096, chunk_overlap=50)), embedder=embedder, stores=vector_store)`, puis `total = await pipeline.run(documents=["doc.txt"], use_checkpoint=False)`, qui renvoie le nombre de chunks.

La starter app route par extension : texte vers `PlainTextExtractor`, tout le reste vers `MistralOCRExtractor`.

#### 3.2.7 Latence et bonnes pratiques

Chaque appel d'outil a un coût, mais la navigation peut **réduire** la latence de bout en bout et les tokens, parce que le modèle converge plus vite. Chiffres cités : voir §1.

Pour garder la boucle efficace :
- utiliser `exclude_ids` sur les recherches de suivi ;
- cibler un document via son titre ou son `source_id` ;
- faire un `grep` avant une nouvelle recherche large quand le terme est connu ;
- régler `top_k` à chaque saut ;
- utiliser un **cache sémantique** ;
- **borner le nombre de sauts** dans la définition de l'agent.

#### 3.2.8 Intégration

- **Agents** : enregistrer le serveur MCP (Vibe : `.mcp.json`, `vibe --trust`, `/mcp`).
- **Workflows** : orchestrer ingestion et retrieval comme **activités** via la Mistral Workflows API, en partant des scripts `src/entrypoints/`.
- **Déploiements client** :
  - index Vespa auto-hébergé (Docker) ou backend managé ;
  - serveur MCP en HTTP **derrière votre propre authentification** ;
  - instantané `vespa.lock` pour la reproductibilité en CI via `make generate-vespa-lock`.

---

### 3.3 Search Toolkit : vue d'ensemble, installation, extras

Search Toolkit est un framework Python de construction de systèmes de **recherche d'information** couvrant l'ingestion, le retrieval et l'évaluation. Il fonctionne sur plusieurs backends et chaque composant est remplaçable. Le constat de départ de la doc : les LLM ne sont pas entraînés sur vos données privées ; pour ancrer leurs réponses, il faut un pipeline qui ingère, indexe et cherche.

**Fonctions clés annoncées** :
- **Ingestion** :
  - extraction multi-format (PDF, DOCX, PPTX via Mistral OCR ; HTML ; tableurs ; e-mails ; texte) ;
  - chargement depuis le système de fichiers local ou via des loaders custom ;
  - découpage par caractères, tokens, Markdown ou séparateurs ;
  - enrichissement (métadonnées custom, résumés LLM) ;
  - indexation en vector store.
- **Retrieval** :
  - recherche vectorielle avec reranking optionnel ;
  - préprocessing de requête (reformulation LLM, extension) ;
  - reranking (LLM, cross-encoder, custom) ;
  - cache sémantique.

**Architecture** :
- **Ingestion** : `FileLoader` (octets bruts) → `DocumentExtractor` (`Document`) → `TextSplitter` (chunks) → `DocumentProcessor` optionnels (`ChunkEnricher`, `SummaryEnricher`) → `Embedder` → vector store.
- **Retrieval** : préprocesseur de requête optionnel → `Retriever` → `Reranker` optionnel.
- Deux orchestrateurs gèrent le câblage et l'exécution : **`Pipeline`** pour l'ingestion, **`QueryEngine`** pour le retrieval.

**Composants intégrés** (tableau de la page d'accueil) :

| Composant | Options intégrées |
|---|---|
| File loaders | `FilesystemFileLoader`, loaders custom (S3, GCS, Azure documentés sur la page Loaders) |
| Extractors | `MistralOCRExtractor`, `SmartPDFExtractor`, `PlainTextExtractor`, `PyMuPDFExtractor`, `HTMLExtractor`, `SpreadsheetExtractor`, `EmailExtractor`, `EmailWithAttachmentsExtractor`, `NumbersExtractor`, `LegacyOfficeExtractor`, `MistralAudioTranscriptionExtractor` |
| Text splitters | `CharacterTextSplitter`, `TokenTextSplitter`, `MarkdownTextSplitter`, `ParagraphTokenTextSplitter`, `MarkdownTokenTextSplitter`, `SeparatorTextSplitter` |
| Enrichers | `SummaryEnricher`, `ChunkEnricher` custom |
| Embedders | `MistralEmbedder`, `Embedder` custom |
| Storage | Vespa, Postgres (pgvector), vector store custom |
| Retrievers | `VectorRetriever`, `KeywordRetriever` (avec un `KeywordStoreIndex` custom) |
| Rerankers | `LLMReRanker`, `CrossEncoderReRanker`, `RRFRanker` |
| Preprocessing | `LLMQueryRewriter`, `LLMQueryExtension` |
| Caching | `SemanticCache` avec `InMemoryCacheBackend` |

**Installation** : `uv add mistralai-search-toolkit` (PyPI). Il faut **Python 3.12+** (`:::info`) et `uv` est recommandé.

**Extras** :

| Extra | Apport |
|---|---|
| `vespa` | Plugin Vespa (stockage vectoriel, recherche sémantique) |
| `postgres` | Backend PostgreSQL avec pgvector et pg_textsearch |
| `extractor-pymupdf` | Extraction PDF avancée via PyMuPDF Pro |
| `extractor-spreadsheet` | Tableurs (Excel, CSV, format Calamine) |
| `extractor-email` | E-mails (EML, MSG) |
| `html-converter-markdownify` | Conversion HTML → Markdown |
| `text-splitter-langchain` | Stratégies de découpage supplémentaires via LangChain |
| `storage-gcs` / `storage-azure` / `storage-s3` | Intégrations Google Cloud Storage / Azure Blob / Amazon S3 |
| `language-detection-fasttext` | Détection de langue via fastText |
| `all` | Tous les extras |

Exemples : `uv add "mistralai-search-toolkit[vespa]"`, `uv add "mistralai-search-toolkit[vespa,extractor-pymupdf]"`, `uv add "mistralai-search-toolkit[all]"`.

**Quickstart** (« RAG pipeline in 5 minutes ») :
1. Prérequis : Python 3.12+, Docker, clé API.
2. `uv add "mistralai-search-toolkit[vespa]"`.
3. `docker run --detach --name vespa --hostname vespa-container --publish 8080:8080 --publish 19071:19071 vespaengine/vespa`.
4. Attendre `http://localhost:19071/state/v1/health` (curl `--retry 10 --retry-delay 3 --retry-all-errors`).
5. `export MISTRAL_API_KEY=…`.
6. `mistral-vespa generate-migration --app-dir ./vespa/migrations initial_schema`, puis remplir la migration (`set_app_name("myquickstart")`, `create_schema(name="quickstart_collection", mode=SearchMode.INDEX, embedding_model=MistralEmbeddingPreset.MISTRAL_EMBED_DIM_1024, indexing_mode=IndexingMode.DOCUMENT_PER_CHUNK, fields=[FieldDefinition.TextField(name="title")])`).
7. `mistral-vespa migrate --app-dir ./vespa/migrations --config-server http://localhost:19071 --query-port 8080` : construit le package en mémoire, déploie, attend que l'app soit prête.
8. Ingestion : `VespaClientConfig(endpoint="http://localhost:8080")`, `app.get_search_index(config, collection_name="quickstart_collection")` (`from vespa_app import app`), puis `Pipeline(FilesystemFileLoader(), PlainTextExtractor(), CharacterTextSplitter(chunk_size=500), MistralEmbedder(client, model_name="mistral-embed"), stores=vector_store)` et `await pipeline.run(documents=[Path("doc1.txt"), Path("doc2.txt")])`.
9. Recherche : `QueryEngine(retriever=[VectorRetriever(client=vector_store, embedder=embedder)])`, puis `search(query, top_k=5, include_metadata=True, include_content=True)` ; chaque résultat expose `r.score` et `r.chunk.content`.
10. Pour les PDF : `MistralOCRExtractor(client=…)` et `MarkdownTextSplitter(MarkdownTextSplitterConfig(chunk_size=5048, chunk_overlap=50))`.

---

### 3.4 Modèle de document

Un modèle unique, porté par deux classes du début à la fin du pipeline.

```python
class Document:
    id: str                       # déterministe, dérivé de source_id
    source_id: str
    content: str                  # texte extrait complet
    chunks: list[DocumentChunk]
    metadata: DocumentMetadata    # extensible, immuable

class DocumentChunk:
    id: str                       # déterministe, dérivé de source_id + locator
    source_id: str; locator: str
    start_offset: int; end_offset: int   # [start, end)
    parent_ref: str | None        # id du Document parent
    chunk_type: ChunkType         # content | image_annotation | summary
    content: str; metadata: DocumentChunkMetadata
    embedding: list[float] | None
```

**`source_id`** :
- Identifiant stable de la source : chemin, URL ou schéma custom (`arxiv:1706.03762`).
- Il est défini sur `File.source_id` et estampillé par les extracteurs sur le document et sur chaque chunk.
- Par défaut, c'est le chemin ou le nom du fichier. Le fixer explicitement découple l'identité de l'emplacement de stockage : **déplacer un fichier ne conserve ses IDs que si son `source_id` reste inchangé**.

**`locator`** :
- Formats intégrés : `char:{start}-{end}` et `page:{n}:char:{start}-{end}` (sources paginées).
- Pour un chunk non « content », le type préfixe le locator : `summary:char:0-512`, `image_annotation:page:2:char:0-128`.

**IDs déterministes** (UUID5) :
- `Document.id` = hash(`source_id`) ;
- `DocumentChunk.id` = hash(`source_id` + `locator`) ;
- `parent_ref` = hash(`source_id`).

Conséquence : réingérer la même source avec les mêmes locators **écrase les mêmes enregistrements**, ce qui rend l'indexation **idempotente**.

**Types de chunk** :
- `content` : tranche du texte principal ;
- `image_annotation` : texte décrivant une image (par exemple une légende OCR) ;
- `summary` : résumé généré, du document ou d'une section.

**Métadonnées** :
- `DocumentMetadata` et `DocumentChunkMetadata` sont **immuables** une fois créées et acceptent des clés supplémentaires.
- Sous-types fournis : `DocumentFileMetadata` (`filename`, `filepath`) et `PagedDocumentChunkMetadata` (`page_number`).
- Une clé de métadonnée **ne doit pas entrer en collision** avec un nom de champ du modèle (pas de `source_id` en métadonnée).

**Côté retrieval**, `SearchResultChunk` porte le même contrat (`id`, `source_id`, `locator`, `parent_ref`, `chunk_type`) : chaque résultat se rattache directement au chunk ingéré.

`:::info` : les préversions exposaient une représentation intermédiaire de **pages** entre documents et chunks. **Elle a été retirée** ; les extracteurs produisent désormais des `DocumentChunk` directement.

---

### 3.5 Modèle d'embedding

L'`EmbeddingModel` décrit les **dimensions, le type de données et la métrique de distance** des vecteurs stockés. C'est la source de vérité du schéma pour dimensionner les tenseurs et choisir la métrique de ranking, indépendamment de l'embedder qui produit les vecteurs. L'embedder et l'`EmbeddingModel` doivent **s'accorder sur les dimensions** : le schéma rejette les vecteurs de mauvaise taille.

Il existe deux variantes, discriminées par `type` (union exposée sous le nom `EmbeddingModel`) :
- **`MistralEmbeddingModel`** :
  - modèle servi par la Mistral Embedding API, à utiliser avec `MistralEmbedder` ;
  - les dimensions sont **validées** contre les presets connus ; un écart lève `DimensionMismatchError` ;
  - construction : `MistralEmbeddingModel(name="mistral-embed", dimensions=1024)`, ou via `MistralEmbeddingPreset.MISTRAL_EMBED_DIM_1024.build_embedding_model(dtype=VectorDType.FLOAT16, distance_metric=DistanceMetric.INNER_PRODUCT)`, ou en passant directement le preset à `create_schema(embedding_model=…)`.
- **`CustomEmbeddingModel`** :
  - modèle non servi par Mistral (tiers ou auto-hébergé), à utiliser avec un `Embedder` custom ;
  - pas de validation par preset ;
  - exemple : `CustomEmbeddingModel(name="my-provider/text-embedding-3-small", dimensions=1536, dtype=VectorDType.FLOAT32, distance_metric=DistanceMetric.COSINE)`.

Imports : `from mistralai.search.toolkit.embedding import DistanceMetric, MistralEmbeddingModel, MistralEmbeddingPreset, VectorDType, CustomEmbeddingModel`.

**Presets Mistral** (résolution par `MistralEmbeddingPreset.from_name("mistral-embed")`) :

| Preset | Modèle | Dimensions | Métrique | Constante `MistralEmbedder` associée |
|---|---|---|---|---|
| `MISTRAL_EMBED_DIM_1024` | `mistral-embed` | 1024 | `COSINE` | `MODEL_1024_EMBEDDING` |
| `MISTRAL_EMBED_DIM_256` | `mistral-embed-dim256-2510` | 256 | `COSINE` | `MODEL_256_EMBEDDING` |
| `MISTRAL_EMBED_DIM_128` | `mistral-embed-dim128-2510` | 128 | `COSINE` | `MODEL_128_EMBEDDING` |

**Configuration des vecteurs** (protocole `VectorConfig`) :

| Champ | Type | Défaut | Valeurs |
|---|---|---|---|
| `dimensions` | int | requis (≥ 1) | — |
| `dtype` | `VectorDType` | `FLOAT32` | `FLOAT32`, `FLOAT16` |
| `distance_metric` | `DistanceMetric` | `COSINE` | `COSINE`, `INNER_PRODUCT`, `L2` |

---

### 3.6 Pipeline d'ingestion

Rôle de chaque étape :
- `FileLoader` : lit les octets et renvoie un `File`.
- `DocumentExtractor` : produit un `Document` (OCR pour les PDF, HTML → Markdown, texte…).
- `TextSplitter` : produit des `DocumentChunk`. La stratégie et la taille influencent directement la qualité du retrieval.
- `DocumentProcessor` optionnels : enrichissent les chunks.
- `Embedder` : vectorise.
- Store : persiste le vecteur **et** le texte brut.

#### `Pipeline`

`Pipeline` est le point d'entrée. Il gère chargement, extraction, découpage, embedding et indexation, avec traitement par lots **concurrent**, suivi de progression et **checkpointing**.

```python
pipeline = Pipeline(
    loader=FilesystemFileLoader(),
    extractor=PlainTextExtractor(),
    text_splitter=CharacterTextSplitter(chunk_size=512),
    processors=[SummaryEnricher(llm_provider=llm)],
    embedder=MistralEmbedder(client=mistral_client, model_name=MODEL_1024_EMBEDDING),
    stores=vector_store,          # app.get_search_index(config, collection_name="my_collection")
)
num_chunks = await pipeline.run(documents=["doc1.txt", "doc2.txt"])
```

- Arguments de constructeur rencontrés : `loader`, `extractor`, `text_splitter`, `processors` (liste), `embedder`, `stores`, `checkpoint_store`.
- Arguments de `run()` : `documents` (chemins `str` ou `Path`), `use_checkpoint`, `progress_callback`. La valeur de retour est le **nombre de chunks**.
- `:::info` : le `collection_name` passé à `app.get_search_index` choisit le schéma ou la collection cible. Il faut utiliser le même nom au retrieval.

**Checkpointing** :
- Activation : `checkpoint_store=lambda: FilesystemStorage("./checkpoints")` (`from mistralai.search.toolkit.storage import FilesystemStorage`), puis `run(..., use_checkpoint=True, progress_callback=create_tqdm_progress_callback())` (`mistralai.search.toolkit.ingestion.progress`).
- Au redémarrage, les documents qui ont déjà un fichier de checkpoint sont **sautés**.

#### `RoutedPipeline`

`RoutedPipeline` route chaque fichier vers un pipeline selon l'**extension et le type MIME**, pour les collections hétérogènes. Il fournit 9 protocoles intégrés :

| Protocole | Types de fichiers |
|---|---|
| `ocr` | PDF, DOCX, PPTX, ODT, EPUB |
| `plain_text` | TXT, MD, CSV, JS, PY, JSON, YAML, … |
| `html` | HTML, HTM |
| `xlsx` | XLSX, XLS, ODS |
| `numbers` | NUMBERS |
| `legacy_office` | DOC, PPT, HWP, HWPX |
| `email` | EML, MSG |
| `image` | PNG, JPEG, GIF, WebP |
| `audio` | MP3, WAV, M4A, FLAC, OGG |

| Paramètre | Description |
|---|---|
| `pipelines` | Dictionnaire protocole → instance `Pipeline` |
| `mime_registry` | Registre MIME custom (optionnel) pour détecter les types |
| `protocol_overrides` | Dictionnaire extension → protocole qui force le routage (par exemple `{".doc": "ocr"}` pour envoyer les `.doc` à l'OCR plutôt qu'à `legacy_office`) |

Usage : `RoutedPipeline({"ocr": ocr_pipeline, "html": …, "plain_text": …, "xlsx": …})` puis `document = await router.run_file(file=file)`.

---

### 3.7 File loaders

| Loader | Source | Installation | Import |
|---|---|---|---|
| `FilesystemFileLoader` | Disque local | cœur | `mistralai.search.toolkit.ingestion.loaders` |
| `S3FileLoader` | AWS S3 et compatibles (MinIO, Ceph) | `uv add "mistralai-search-toolkit-storage-s3"` | `mistralai.search.toolkit.plugins.storage.s3` |
| `AzureBlobFileLoader` | Azure Blob Storage | `uv add "mistralai-search-toolkit-storage-azure"` | `mistralai.search.toolkit.plugins.storage.azure` |
| `GCSFileLoader` | Google Cloud Storage | `uv add "mistralai-search-toolkit-storage-gcs"` | `mistralai.search.toolkit.plugins.storage.gcs` |
| Custom | Toute source | — | implémenter `FileLoader` |

API commune : `file = await loader.load_file(path)`, qui renvoie un `File(path=…, name=…, raw=bytes)`.

**`FilesystemFileLoader`** :

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `root` | `Path \| str` | `"/"` | Racine autorisée. Tout chemin qui se résout hors de la racine est rejeté avant ouverture (anti **path traversal**). |
| `max_file_size` | `int \| None` | `None` (pas de limite) | Taille max en octets, vérifiée via les **métadonnées avant lecture** (le fichier n'est jamais chargé en mémoire). Au-delà : `FileSizeLimitExceededException`. |

**`S3FileLoader`** (enveloppe de `FileLoader` sur `S3BlobStorage`) :

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `bucket_name` | str | requis | Bucket |
| `region_name` | str \| None | None | Région (sinon défaut SDK ou environnement) |
| `endpoint_url` | str \| None | None | Endpoint custom (MinIO, Ceph…) |
| `aws_access_key_id` / `aws_secret_access_key` | str \| None | None | Identifiants explicites (sinon chaîne de credentials) |
| `max_file_size` | int \| None | None | Rejet au-delà de N octets |

Authentification : chaîne AWS par défaut (rôle IAM recommandé en production, variables `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, fichier `~/.aws/credentials`).

**`AzureBlobFileLoader`** (sur `AzureBlobStorage`) :

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `container_name` | str | requis | Conteneur |
| `azure_connection_string` | str \| None | None | Requis sauf si `use_workload_identity=True` |
| `account_url` | str \| None | None | Par exemple `https://myaccount.blob.core.windows.net`. Requis si `use_workload_identity=True` |
| `use_workload_identity` | bool | False | Workload Identity (recommandé sur les VMs et Functions Azure) |
| `max_file_size` | int \| None | None | — |

Authentification : Workload Identity, chaîne de connexion (paramètre ou variable `AZURE_STORAGE_CONNECTION_STRING`), ou token SAS.

**`GCSFileLoader`** (sur `GCSBlobStorage`) :

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `bucket_name` | str | requis | Bucket |
| `service_account_file` | str \| None | None | JSON de compte de service ; sinon **ADC** |
| `api_root` | str \| None | None | Endpoint d'émulateur (par exemple fake-gcs-server) ; repli sur `STORAGE_EMULATOR_HOST` |
| `max_file_size` | int \| None | None | — |

Authentification : ADC (recommandé), ou fichier de compte de service (paramètre ou `GOOGLE_APPLICATION_CREDENTIALS`).

**Chargement en lot** : la doc donne un exemple de concurrence bornée par `asyncio.Semaphore(max_concurrent)` (10 par défaut dans l'exemple, 5 dans l'appel) qui ignore les échecs.

**Avancé** (`:::info`) : chaque loader cloud enveloppe un `FileLoader` générique sur un backend `ObjectStorage`. Pour un contrôle total, on peut écrire `FileLoader(lambda: S3BlobStorage(...))`.

**Loader custom** : sous-classer `FileLoader` et implémenter `async load_file(self, path: Path | str) -> File`.

---

### 3.8 Document extractors

Tous les extracteurs intégrés estampillent `file.source_id` sur le `Document` et ses chunks ; l'ID est déterministe.

| Extracteur | Formats | Installation |
|---|---|---|
| `MistralOCRExtractor` | PDF, DOCX, PPTX, ODT | cœur |
| `PyMuPDFExtractor` | PDF, EPUB (+ DOCX, PPTX, DOC, PPT, HWP, HWPX avec licence Pro) | `extractor-pymupdf` |
| `SmartPDFExtractor` | PDF uniquement | pas d'extra propre (PyMuPDF requis pour la voie locale) |
| `MistralAudioTranscriptionExtractor` | MP3, WAV, M4A, FLAC, OGG | cœur |
| `PlainTextExtractor` | TXT, MD, CSV, JS, PY, autres fichiers texte ou code | cœur |
| `HTMLExtractor` | HTML, HTM | `html-converter-markdownify` (ou cœur avec un convertisseur custom) |
| `SpreadsheetExtractor` | XLS, XLSX, XLSM, XLSB, ODS, ODF | `extractor-spreadsheet` |
| `EmailExtractor` | EML, MSG | `extractor-email` (dépendances `eml-parser`, `extract-msg`) |
| `NumbersExtractor` | NUMBERS | `extractor-spreadsheet` |
| `LegacyOfficeExtractor` | DOC, PPT, HWP, HWPX | `extractor-pymupdf` (licence Pro pour le support complet) |
| Custom | toute source | implémenter `DocumentExtractor` |

API commune : `document = await extractor.extract(file, context=IngestContext())`.

#### `MistralOCRExtractor`

Utilise l'API **Mistral OCR** pour extraire texte structuré et images. C'est l'extracteur **recommandé pour les documents scannés ou riches en images**. Le client peut cibler un `server_url` custom (`MISTRAL_SERVER_URL`, optionnel).

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `client` | `Mistral` | requis | Client |
| `model_name` | str | `"mistral-ocr-latest"` | Modèle OCR |
| `timeout_seconds` | int | `900` | Timeout de requête |
| `strip_page_markdown` | bool | `True` | Retire les espaces en tête et fin du Markdown de chaque page |
| `populate_content` | bool | `True` | Remplit `Document.content` |
| `include_image_base64` | bool | `False` | Inclut les images en base64 |
| `include_image_annotation` | bool | `False` | Ajoute les annotations d'images au Markdown |
| `max_file_size_bytes` | int \| None | `None` | Taille au-delà de laquelle le fichier est découpé en parties |
| `pages_split_size` | int \| None | `None` | Pages par partie si `max_file_size_bytes` est dépassé |
| `pages_group_size` | int \| None | `None` | Pages par requête API |
| `http_headers` | Mapping \| None | `None` | En-têtes HTTP transmis à l'API OCR |
| `image_limit` | int \| None | `None` | Nombre max d'images par page |
| `pages` | Sequence[int] \| None | `None` | Pages à extraire (numérotées à partir de 1) |
| `table_format` | `"markdown"` \| `"html"` \| None | `None` | Format des tableaux |

Fonctions : OCR des scans et images, sortie Markdown qui préserve la structure, suivi des références d'images (base64 optionnel), sélection de pages, format de tableau, gestion des gros fichiers par découpage automatique.

#### `PyMuPDFExtractor`

- Extraction **locale, dans le processus**, de la couche texte native via PyMuPDF (`fitz`, bibliothèque C). Pas d'appel réseau, **pas de facturation par page** : le seul coût est le CPU local.
- **Pas d'OCR** : un document scanné ou sans couche texte donne une **sortie vide**.
- Ne renvoie ni images embarquées ni annotations de boîtes englobantes.
- Les métadonnées du document (titre, auteur, sujet, dates) sont reprises.

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `pymupdf_pro_license_key` | str \| None | None | Licence **PyMuPDF Pro** : débloque DOCX, PPTX, DOC, PPT, HWP, HWPX |
| `content_type` | str \| None | None | Indice MIME passé à PyMuPDF ; sinon inféré |

#### `SmartPDFExtractor`

Route **chaque PDF** entre extraction locale (`PyMuPDFExtractor`) et OCR selon la qualité de la couche texte. La plupart des PDF exportés d'Office ont une couche texte native ; les scans n'en ont pas.
- La décision porte sur le **document entier, une fois l'extraction locale terminée**, et non sur un échantillon des premières pages.
- La voie OCR est **n'importe quel `DocumentExtractor` injecté**. Une instance isolée du réseau (« air-gapped ») ou placée derrière une gateway peut donc fournir un moteur auto-hébergé.
- Le document du délégué choisi est renvoyé **inchangé** (son type, `extractor_type` et métadonnées) ; un `PyMuPDFDocument` garde ses métadonnées plus riches.
- **PDF uniquement** : toute autre entrée est rejetée.

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `pymupdf_extractor` | `PyMuPDFExtractor` | requis | Délégué local, construit avec `content_type="application/pdf"` ou sans `content_type`. Un délégué configuré pour un autre format échoue au premier usage. |
| `ocr_extractor` | `DocumentExtractor` | requis | Délégué OCR. Il reçoit le fichier **tel qu'arrivé** (`file.raw` peut être vide) et doit résoudre les octets lui-même. |
| `min_chars_per_page` | float | `200.0` | Moyenne de caractères extractibles par page à partir de laquelle le résultat local est accepté ; en dessous, l'OCR prend le relais. |
| `bytes_loader` | `Callable[[File], bytes \| Awaitable[bytes]] \| None` | None | Résout les octets quand `file.raw` est vide. Indispensable pour la voie locale si les documents sont passés par référence : sans lui, tout part en OCR. Les octets chargés ne servent qu'à la tentative locale. |

Justification du seuil de 200 caractères par page :
- une ligne de prose fait 70 à 90 caractères ;
- un seuil plus bas risque d'accepter comme texte des scans tamponnés (numéros Bates, « page 3 of 40 ») ;
- mal router un scan l'indexe **vide, silencieusement**, alors que mal router un document texte ne coûte qu'un appel OCR. Le défaut est donc conservateur.

Algorithme de routage :
1. Si `force_route = ocr` : OCR directement.
2. Sinon, charger les octets locaux.
   - S'ils sont indisponibles et que `force_route = pymupdf` : erreur.
   - S'ils sont indisponibles sinon : OCR.
3. Extraction locale.
   - Si elle échoue et que `force_route = pymupdf` : erreur.
   - Si elle échoue sinon : repli sur l'OCR.
4. Mesure du résultat. Si `force_route = pymupdf` ou si la moyenne par page atteint `min_chars_per_page` : document local. Sinon : OCR.

Gestion des erreurs :
- Un échec du loader renvoie `None` sans propager l'erreur, car l'OCR peut résoudre le fichier via `file.path`.
- Un échec de l'OCR, lui, **propage** l'erreur.

Forcer une route :
- Sous-classer `IngestContext` avec un champ `smart_pdf_options: SmartPDFExtractorRuntimeOptions` (`from mistralai.search.toolkit.ingestion.extractors.smart_pdf import PdfRoute, SmartPDFExtractorRuntimeOptions`).
- `force_route` accepte `PdfRoute.PYMUPDF` (`"pymupdf"`), `PdfRoute.OCR` (`"ocr"`) ou `None`.
- Un seul champ nullable plutôt que deux booléens rend l'état contradictoire « les deux à vrai » impossible à représenter.

**Limite connue** : le verdict mesure la *quantité* de texte, pas sa *lisibilité*. Un PDF à texte encodé en CID sans table `ToUnicode`, ou positionné glyphe par glyphe sans espaces, passe n'importe quel seuil et s'indexe comme du **charabia silencieux**. Aucune heuristique de lisibilité n'est tentée.

#### `MistralAudioTranscriptionExtractor`

Transcrit l'audio via l'API de transcription Mistral, avec diarisation et granularités d'horodatage.

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `client` | `Mistral` | requis | — |
| `model_name` | str | `"voxtral-mini-latest"` | Modèle de transcription |
| `language` | str \| None | None | Indice de langue (par exemple `"en"`) |
| `diarize` | bool | False | Diarisation des locuteurs |
| `timestamp_granularities` | list[str] \| None | None | Par exemple `["word", "segment"]` |
| `timeout_seconds` | int | 900 | — |
| `populate_content` | bool | True | — |
| `http_headers` | Mapping \| None | None | En-têtes transmis à l'API |

Il accepte les uploads bruts et les **URL distantes**.

#### `PlainTextExtractor`

| Option | Type | Défaut | Effet |
|---|---|---|---|
| `page_size` | int | 2000 | Caractères par « page » logique |
| `encoding` | str | `"utf-8"` | Encodage |
| `skip_encoding_detection` | bool | False | N'utiliser que l'encodage indiqué |

Comportement :
- Un fichier plus grand que `page_size` est découpé en plusieurs pages, chacune avec la métadonnée `page_number`.
- `document.content` conserve l'intégralité du fichier.
- La détection d'encodage essaie UTF-8 d'abord, puis d'autres encodages si elle est activée.

#### `HTMLExtractor`

Convertit le HTML en Markdown propre et retire par défaut le **boilerplate** (navigation, pieds de page, scripts).

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `encoding` | str | `"utf-8"` | — |
| `decode_errors` | str | `"strict"` | `"strict"`, `"ignore"`, `"replace"` |
| `converter` | `HtmlToMarkdownConverter \| None` | None (→ `MarkdownifyConverter`) | Convertisseur injectable : tout objet avec `convert(html: str) -> str` |

`MarkdownifyConverter` repose sur la bibliothèque markdownify (MIT). Il est réglé pour produire des titres ATX, des puces homogènes, la détection du langage des blocs de code et la suppression du sous-arbre entier des balises ignorées.

| Option | Type | Défaut | Effet |
|---|---|---|---|
| `ignore_tags` | list[str] \| None | `DEFAULT_IGNORE_TAGS` | Balises supprimées avec leurs enfants |
| `ignore_ids` | list[str] \| None | `DEFAULT_IGNORE_IDS` | Valeurs d'`id` (correspondance littérale), sous-arbre supprimé |
| `ignore_classes` | list[str] \| None | `DEFAULT_IGNORE_CLASSES` | **Regex** testées sur chaque classe CSS ; une correspondance supprime le sous-arbre |
| `escape_misc` | bool | True | Échappe les caractères Markdown divers (par exemple `\|` dans les tableaux) |

Avec `None`, la liste par défaut s'applique ; avec `[]`, le filtrage est désactivé. Listes par défaut :
- balises : `head`, `header`, `script`, `style`, `title`, `footer`, `form`, `button`, `nav`, `iframe` ;
- IDs : `footer`, `sidebar`, `cookie`, `metadata` ;
- motifs de classes : `footer`, `^ad-`, `^ad_`, `^menu$`, `^newsletter$`, `^metadata$`, `^muted$`, `vot(e|ing)`.

#### `SpreadsheetExtractor`

Produit **un bloc CSV par feuille**.

| Option | Type | Défaut | Effet |
|---|---|---|---|
| `include_sheet_name` | bool | True | Préfixe chaque bloc par le nom de la feuille |
| `row_limit` | int \| None | None | Lignes max par feuille |
| `col_limit` | int \| None | None | Colonnes max par feuille |
| `skip_empty_sheets` | bool | True | Ignore les feuilles vides |
| `preserve_formula_values` | bool | True | Garde les résultats de formules, pas leur texte |

Comportement :
- Les cellules fusionnées sont **développées**, valeur répétée.
- Les formules sont évaluées, sauf si `preserve_formula_values=False`.
- Les en-têtes sont inférés de la première ligne.

#### `EmailExtractor`

- Produit un document Markdown unique pour un `.eml` (RFC 822) ou un `.msg` (Outlook), avec sujet, expéditeur, destinataires, CC, date et corps.
- Il préfère le corps **texte brut** et se replie sur le HTML converti en Markdown.
- **Pièces jointes** : `extract_email_attachments(file.raw, extension="eml")`, ou `extract_eml_attachments` / `extract_msg_attachments`. Ces fonctions renvoient des `EmailAttachment` (`filename`, `content_type`, `data`, `extension`) à repasser dans d'autres extracteurs.

#### `NumbersExtractor`

- Apple Numbers : un CSV par table ou feuille. Options vues : `row_limit`, `col_limit`, `include_sheet_name`, ainsi qu'un objet `NumbersOptions` importé.
- `iter_csv_pages(blob, options=...)` itère sur les CSV sans construire de `Document`.

#### `LegacyOfficeExtractor`

- `.doc`, `.ppt`, `.hwp`, `.hwpx` sont **convertis en PDF en mémoire via PyMuPDF Pro**, puis passés à `MistralOCRExtractor`.
- Les **`.xls` ne sont pas gérés** : utiliser `SpreadsheetExtractor`.
- Construction : `LegacyOfficeExtractor(ocr_extractor, pymupdf_license_key="...")`.
- `extract(file, include_image_base64=True, include_image_annotation=True)` accepte les mêmes options que l'OCR (`http_headers`, `image_limit`…).

#### Extracteur custom

Implémenter le protocole `DocumentExtractor` (`async extract(self, file: File, context: IngestContext = IngestContext()) -> Document`).
- On construit le `Document` et ses `DocumentChunk` en s'appuyant sur `compute_char_locator(start, end)` et `compute_id(source_id)` (pour `parent_ref`).
- Les métadonnées de fichier passent par `DocumentFileMetadata(extractor_type=..., filename=..., filepath=..., **extra)`.
- Exemple de la doc : décodage d'un fichier base64.

---

### 3.9 Text splitters

`:::info` : tous les splitters conservent dans chaque chunk `page_number`, `filename`, `filepath`, `start_offset`, `end_offset` et `images` (références d'images, s'il y en a).

API : `chunks = splitter.split_document(document)`. Le protocole custom s'appuie sur `split_text(text, context) -> list[TextFragment]`.

**Taille de chunk conseillée** :

| Contexte LLM | Taille | Recouvrement | Cas |
|---|---|---|---|
| 4k tokens | 300–500 car. | 50–100 | Mémoire contrainte, retrieval rapide |
| 8k tokens | 500–1000 | 100–200 | Équilibré |
| 32k+ tokens | 1000–2000 | 200–500 | Contexte riche |
| Code / technique | 500–1000 | 100–200 | Préserver les unités logiques |
| Juridique / financier | 1000–2000 | 200–500 | Contexte complet pour l'interprétation |

Règle empirique : environ 400–600 caractères ≈ 100–150 tokens. Le recouvrement évite de couper un concept sur une frontière sémantique, mais augmente proportionnellement la taille d'index et la latence.

| Splitter | Paramètres (défauts) | Remarques |
|---|---|---|
| `CharacterTextSplitter` | `chunk_size=1000` (caractères) | Prototypage, texte simple |
| `TokenTextSplitter` | `chunk_size=1000` (tokens), `chunk_overlap=0`, `tokenizer_model="mistral"` | Budget de tokens précis, chunks homogènes quelle que soit la densité du texte |
| `SeparatorTextSplitter(config=SeparatorTextSplitterConfig(...))` | `chunk_size`, `chunk_max_size`, `chunk_overlap`, `chunk_separators`, `keep_separator`, `strip_whitespace` (défauts non documentés) | Découpage récursif : essaie les séparateurs dans l'ordre (exemple `"\n\n"`, `"\n"`, `". "`, `" "`, `""`), respecte la taille max même si le découpage échoue, **fusionne les petits chunks**, renvoie les offsets |
| `MarkdownTextSplitter(config=MarkdownTextSplitterConfig(...))` | hérite de `SeparatorTextSplitterConfig`, plus `headers_to_split_on=[("#","Header 1"),("##","Header 2"),("###","Header 3")]` et `strip_headers=False` | Découpe aux frontières de titres. **Requiert l'extra `text-splitter-langchain`.** |
| `ParagraphTokenTextSplitter`, `MarkdownTokenTextSplitter` | non documentés | Cités seulement sur la page d'accueil |

Exemple de la doc pour `SeparatorTextSplitterConfig` : `chunk_size=1000`, `chunk_max_size=1500`, `chunk_overlap=200`.

**Splitter custom** : sous-classer `TextSplitter` (`mistralai.search.toolkit.ingestion.text_splitters`), implémenter `split_text` et renvoyer des `TextFragment(content, start_offset, end_offset)` (`…text_splitters.models`). Exemple : regroupement par N paragraphes.

---

### 3.10 Chunk enrichers

Ils ajoutent des métadonnées aux chunks pendant l'ingestion (sources externes, classifications, tags, valeurs calculées). Ils s'enchaînent dans `Pipeline(processors=[...])` **séquentiellement, dans l'ordre de la liste**, chacun recevant la sortie du précédent.

#### `SummaryEnricher`

Il génère via un LLM un **résumé du document** et l'injecte dans les chunks et/ou les métadonnées du document, pour donner à chaque chunk le contexte du document entier.
- **Non bloquant par défaut** : en cas d'échec, il journalise et renvoie les chunks inchangés.
- Prérequis : une clé API Mistral.
- Imports : `from mistralai.search.toolkit.ingestion.enrichment import SummaryEnricher, SummaryConfig, SummarizeRequestConfig` ; LLM `MistralChat(client, LLMConfig(model="mistral-small-latest"))`.

| Paramètre | Type | Défaut |
|---|---|---|
| `llm_provider` | `ChatLLMProvider` | requis |
| `summary_config` | `SummaryConfig \| None` | None |

**`SummarizeRequestConfig`** (requête LLM, passée via `SummaryConfig(request_config=...)`) :

| Paramètre | Type | Défaut | Effet |
|---|---|---|---|
| `model` | str | `"mistral-small-latest"` | Modèle de résumé |
| `prompt` | str | `"Summarize the document in less than 5 lines."` | Prompt |
| `max_tokens` | int | 256 | Taille max du résumé |
| `max_chars_per_call` | int \| None | 32768 | Budget de caractères par appel |
| `overflow_strategy` | `OverflowStrategy` | `TRUNCATE` | `TRUNCATE` coupe à `max_chars_per_call` ; `MAP_REDUCE` découpe en parties, résume chacune, puis fusionne |
| `map_concurrency` | int | 10 | Appels concurrents de la phase « map » (map-reduce seulement) |
| `temperature` | float \| None | 0.6 | — |

**`SummaryRequestOptions`** (injection du résultat) :

| Paramètre | Défaut | Effet |
|---|---|---|
| `include_summary_chunk` | True | Ajoute un chunk dédié de type `summary` |
| `propagate_summary_to_chunks` | False | Préfixe le contenu de **chaque** chunk par le résumé |
| `populate_document_metadata` | True | Stocke le résumé dans les métadonnées du document |
| `fail_on_generation_error` | False | Lève une exception au lieu de journaliser et continuer |

#### Enricher custom (`ChunkEnricher`)

- `ChunkEnricher` est un `DocumentProcessor`. On implémente `async enrich_chunk(self, document, chunk, context: IngestContext = IngestContext()) -> DocumentChunk`, et `process(document)` le répartit sur les chunks.
- Les métadonnées étant immuables, la mise à jour passe par `chunk.model_copy(update={"metadata": chunk.metadata.model_copy(update={...})})`.
- `process` utilise un **pool de workers borné** : `concurrency`, défaut **10**, modifiable via `super().__init__(concurrency=20)`. Les appels à des API externes restent dans `enrich_chunk`.
- Imports : `mistralai.search.toolkit.context.IngestContext`, `mistralai.search.toolkit.document.{Document, DocumentChunk}`.

---

### 3.11 Embedders

Classe abstraite `Embedder` :

| Méthode | Signature | Nature |
|---|---|---|
| `embed` | `(texts: list[str]) -> EmbeddingResult` | **Seule méthode abstraite** (avec `context: RetrievalContext` optionnel) |
| `embed_chunks` | `(chunks: list[DocumentChunk]) -> list[DocumentChunk]` | Concrète : renvoie des copies avec `embedding` renseigné, découpage en lots interne |
| `embed_query` | `(text: str) -> list[float]` | Concrète |

`EmbeddingResult` (Pydantic) : `embeddings: list[list[float]]`, un vecteur par entrée, et `total_tokens: int`.

**`MistralEmbedder`** (cœur, aucun extra) :

| Option | Type | Défaut | Effet |
|---|---|---|---|
| `model_name` | str | **`MODEL_128_EMBEDDING`** | Modèle |
| `client` | `Mistral` | requis | Client configuré |

| Constante | Modèle | Dimensions | Preset associé | Usage indiqué |
|---|---|---|---|---|
| `MODEL_1024_EMBEDDING` | `mistral-embed` | 1024 | `MISTRAL_EMBED_DIM_1024` | « Default for Search Toolkit pipelines » |
| `MODEL_256_EMBEDDING` | `mistral-embed-dim256-2510` | 256 | `MISTRAL_EMBED_DIM_256` | Faible latence, mémoire contrainte |
| `MODEL_128_EMBEDDING` | `mistral-embed-dim128-2510` | 128 | `MISTRAL_EMBED_DIM_128` | Dimensions minimales (« default fallback ») |

**Embedder custom** :
- Sous-classer `Embedder` et implémenter `async embed(texts, context=RetrievalContext()) -> EmbeddingResult` ; `embed_chunks` et `embed_query` sont hérités.
- Il faut déclarer un `CustomEmbeddingModel` de même forme sur le schéma d'index.

---

### 3.12 Retrieval : `QueryEngine`

Trois stratégies sont supportées : vectorielle (sémantique), **keyword (BM25)** et **hybride**. Plusieurs retrievers peuvent s'exécuter **en parallèle** ; leurs résultats sont fusionnés, puis éventuellement rerankés.

```python
query_engine = QueryEngine(
    retriever=vector_retriever,      # ou une liste de retrievers
    query_rewriter=query_rewriter,   # optionnel
    rerankers=[llm_reranker],        # optionnel ; ReRanker et GroupedRanker acceptés
)
result = await query_engine.search(query="What is RAG?", top_k=10,
                                   include_metadata=True, include_content=True)
print(result.original_query, len(result.results))
```

- Le résultat expose `original_query` et `results`. Chaque élément porte `score` et `chunk`, avec `chunk.content` et `chunk.metadata`.
- Imports : `mistralai.search.toolkit.retrieval.QueryEngine`, `.retrieval.retrievers`, `.retrieval.rerankers`, `.retrieval.pre_processors`.

---

### 3.13 Query preprocessing

Il améliore les requêtes avant le retrieval, au prix de latence et de coût. Aucun extra n'est requis.

**`LLMQueryRewriter(llm_provider, prompt=…)`** :
- Reformule une requête informelle, développe les abréviations et clarifie l'intention. Exemple : `"rag mistral"` → `"What is Retrieval-Augmented Generation with Mistral AI?"`.
- Méthode : `await rewriter.rewrite(query)`.
- `prompt` est optionnel (exemple : « Reformulate this query for a technical documentation search engine: »).
- Coût : **1 appel LLM par requête**, **+100 à 500 ms**. À utiliser de façon ciblée.

**`LLMQueryExtension(llm_provider, num_queries=3)`** :
- Décompose la requête en sous-requêtes sur des facettes différentes, avec un retrieval indépendant par sous-requête, puis combine et **déduplique**.
- Méthode : `await extender.extend(query)`.
- Coût pour `num_queries=3` : 1 appel LLM, 3 passes de retrieval (environ 3 fois plus lent) et 3 appels d'embedding.
- Combinaison recommandée avec un `LLMReRanker(top_k=10)` : 2 appels LLM, 3 recherches vectorielles, environ 30 résultats, ramenés à 10.

**Préprocesseurs custom** :
- Ce sont des **classes simples sans base imposée**. `QueryEngine` accepte tout objet exposant `rewrite(query, context=RetrievalContext())` pour `query_rewriter`, ou `extend(...)` pour `query_extension`.
- Exemples de la doc : expansion d'abréviations métier ; réécriture conditionnelle des seules requêtes de moins de 3 mots.

Quand l'utiliser :
- **Oui** : requêtes courtes ou vagues, terminologie très spécifique, questions à facettes multiples, tolérance à la latence.
- **Non** : requêtes déjà bien formées, temps réel, coût sensible, retrieval vectoriel déjà suffisant.

---

### 3.14 Retrievers

| Retriever | Paramètres | Usage |
|---|---|---|
| `VectorRetriever(client, embedder)` | `client: VectorStoreIndex` (requis), `embedder: Embedder` (requis) | Recherche sémantique (synonymes, paraphrases). Avec un backend intégré, il **envoie à la fois le texte et l'embedding** au backend, ce qui permet l'hybride côté backend. |
| `KeywordRetriever(client)` | `client: KeywordStoreIndex` (requis) | BM25 / lexical (noms, identifiants, codes d'erreur), ou bras lexical d'un hybride |
| Hybride | `QueryEngine(retriever=[VectorRetriever(...), KeywordRetriever(...)], rerankers=[RRFRanker(rrf_k=60, top_k=10)])` | Si l'on dispose de stores vectoriel et lexical séparés |
| Custom | sous-classer `Retriever` : `async retrieve(query, top_k=10, include_metadata=True, include_content=True, context=RetrievalContext()) -> list[SearchResult]` | Logique métier |

- API directe : `results = await retriever.retrieve(query=..., top_k=10)`.
- `:::info` : **les backends Vespa et Postgres intégrés n'implémentent pas `KeywordStoreIndex`**. `KeywordRetriever` suppose donc un store lexical custom. Pour de l'hybride sur un backend intégré, on utilise `VectorRetriever`.

---

### 3.15 Rerankers

Deux familles :
- **`ReRanker`** agit sur une seule liste (`LLMReRanker`, `CrossEncoderReRanker`) ;
- **`GroupedRanker`** agit sur plusieurs groupes (`RRFRanker`).

Les rerankers listés dans `QueryEngine.rerankers` s'appliquent **séquentiellement**. Aucun extra n'est requis.

**`LLMReRanker`** :

| Option | Type | Défaut |
|---|---|---|
| `llm_provider` | LLMProvider | requis |
| `top_k` | int \| None | None (tout renvoyer) |

- Fonctionnement : le LLM reçoit la requête et les chunks, note la pertinence de chacun, puis trie et renvoie le top-k.
- L'exemple configure le LLM avec `temperature=0.1` et `response_format={"type": "json_object"}`.
- La doc le dit « coûteux (1 appel LLM par chunk) » ; conseil : laisser le retriever ramener beaucoup de candidats, puis réduire.

**`CrossEncoderReRanker`** : s'appuie sur un **service cross-encoder hébergé** (serveur de modèle dédié). Plus rapide que le LLM.

| Option | Type | Défaut |
|---|---|---|
| `base_url` | str | requis |
| `model` | str | requis |
| `top_k` | int \| None | None |
| `timeout` | float | 300.0 s |

Modèles cités : `cross-encoder/ms-marco-MiniLM-L-6-v2` (rapide, généraliste), `cross-encoder/ms-marco-TinyBERT-L-2-v2` (très léger), `cross-encoder/qnli-distilroberta-base` (appariement question-réponse).

**`RRFRanker`** (Reciprocal Rank Fusion, `GroupedRanker`) :

| Option | Type | Défaut | Effet |
|---|---|---|---|
| `rrf_k` | int | **60** | Lissage (essayer 30–100) : un k bas accentue les positions exactes, un k haut aplatit les écarts |
| `top_k` | int | **10** | Résultats renvoyés |

Usage typique : plusieurs `VectorRetriever` sur le même index avec des query profiles différents (`app.get_search_index(config, collection_name=…, query_profile="dense"` / `"hybrid")`). Pas de normalisation de score nécessaire ; utile quand les scores ne sont pas comparables.

**Rerankers custom** :
- `ReRanker` : `async rerank(query, search_results: list[SearchResult], context) -> list[SearchResult]`. Exemple de la doc : boost ×1,5 si `verified`, pénalité ×0,8 si `year < 2020`.
- `GroupedRanker` : `async rank(query, result_groups: list[SearchResultGroup], context) -> list[SearchResultGroup]`.
- Imports : `mistralai.search.toolkit.search.{SearchResult, SearchResultGroup}`.

**Chaînage conseillé**, du moins cher au plus cher : `RRFRanker(rrf_k=60, top_k=50)` → `MetadataReRanker()` → `LLMReRanker(top_k=10)`.

---

### 3.16 Semantic cache

Le cache associe les requêtes **par sens** plutôt que par chaîne exacte. En cas de hit, il saute **embedding de retrieval, retrieval, préprocessing et reranking**. Cœur, aucun extra.

```python
from mistralai.search.toolkit.retrieval.cache import (
    CachedQueryEngine, InMemoryCacheBackend, SemanticCache, EvictionPolicy)
backend = InMemoryCacheBackend(dim=1024, max_entries=500, ttl_seconds=3600,
                               eviction_policy=EvictionPolicy.LRU)
cache = SemanticCache(backend=backend, similarity_threshold=0.95)
cached_engine = CachedQueryEngine(engine=query_engine, cache=cache, embedder=embedder)
result = await cached_engine.search("What is RAG?", top_k=10)
```

Fonctionnement :
1. La requête est embarquée.
2. On cherche des vecteurs de requêtes en cache proches.
3. Si la similarité dépasse le seuil, les résultats en cache sont renvoyés.
4. Sinon, le pipeline complet s'exécute et le résultat est mis en cache.

Options de l'`InMemoryCacheBackend` :

| Option | Défaut | Effet |
|---|---|---|
| `dim` | requis | Dimension (1024 pour `mistral-embed`) |
| `max_entries` | 1000 | Capacité avant éviction |
| `ttl_seconds` | None (pas d'expiration) | Expiration ; les entrées expirées sont purgées au prochain accès ou à la prochaine éviction |
| `eviction_policy` | LRU | `LRU`, `LFU`, `FIFO` |

Seuil `similarity_threshold` (similarité cosinus) :
- 0.99 : très strict ;
- **0.95 : équilibré, défaut** ;
- 0.90 : permissif.

Les bonnes pratiques citent aussi 0.98 comme réglage « conservateur ».

**Métriques** :
- On crée `CacheMetrics()` puis `CachedQueryEngine(..., metrics=metrics)` ; `metrics.snapshot()` expose `hit_rate`, `avg_hit_similarity`, `total_requests`, `avg_embed_time_ms`, `avg_lookup_time_ms`, `avg_retrieval_time_ms` (sur miss), `evictions` et `errors`.
- Heuristiques de la doc :
  - un taux de hit inférieur à 0,2 indique un cache peu efficace : baisser le seuil, augmenter `max_entries`, analyser les requêtes ;
  - si les évictions dépassent 10 % de `max_entries`, augmenter la capacité ou passer en LFU.

**Tolérance aux pannes** : toute exception du cache ou de l'embedder est **journalisée**, la requête passe par le chemin normal et le résultat n'est **pas** mis en cache. Le cache est un best-effort.

**Gestion** :
- `await cache.invalidate(namespace="query_engine")` ;
- `await cache.clear()`.

**Backend custom** (Redis, pgvector…) : implémenter la classe abstraite `CacheBackend` :
- propriété `max_entries` ;
- `search(query_embedding, namespace, n_results)` ;
- `store(entry: CacheEntry)` ;
- `delete(entry_id)` ;
- `get_all(namespace=None)` ;
- `count(namespace=None)` ;
- `clear()` ;
- `update_hit(entry)`.

**Dimensionnement** : environ 4 Ko par entrée en 1024 dimensions, donc environ 4 Mo pour 1000 entrées. Le cache est le plus rentable devant un pipeline coûteux, par exemple avec un `LLMReRanker`.

---

### 3.17 Search index : panorama des backends

| Catégorie | Backend | Rôle | Distribution |
|---|---|---|---|
| Officiel | **Vespa** | Base vectorielle avec gestion de schéma, ranking, clustering, réplication | extra `vespa` |
| Officiel | **Postgres** | PostgreSQL + `pgvector` + `pg_textsearch`, recherche dense et hybride | extra `postgres` |
| Communautaire | **Qdrant** | Moteur Qdrant, plugin tiers | paquet séparé `mistralai-search-toolkit-plugins-qdrant` |
| Custom | Vector store maison | Implémenter les protocoles | — |

- Les deux backends intégrés implémentent `VectorStoreIndex` et partagent donc les mêmes interfaces `Pipeline` et `QueryEngine`.
- Leur **provisioning, leur gestion de schéma et leur cadrage des requêtes** (« query-scoping ») diffèrent.
- Les backends communautaires ne font pas partie du paquet `mistralai-search-toolkit` ; installation et support passent par leur dépôt.

### 3.18 Custom vector stores

**`VectorStoreIndex`** : trois méthodes asynchrones.
- `index_document(document: Document, context: IngestContext)` : stocke le document et ses chunks.
- `search(query: VectorSearchQuery, context: RetrievalContext) -> list[SearchResult]`.
- `delete_document(doc_id: str, context: IngestContext)`.

Pour la recherche lexicale, on sous-classe `KeywordStoreIndex`. Une fois implémenté, le store se branche sur `Pipeline` et `QueryEngine` comme un backend intégré.

**`NavigableIndex`** (optionnel, `@runtime_checkable`) : navigation positionnelle sur un index « un document par chunk ». Les appelants testent la capacité par `isinstance(store, NavigableIndex)` plutôt que d'attraper `NotImplementedError`.

| Méthode | Signature (défauts) | Rôle |
|---|---|---|
| `navigate` | `(source_id, start_offset, end_offset, direction, *, top_k=1, content_type=…, context=…)` | Chunks adjacents dans la direction `NavigationDirection.NEXT` / `PREVIOUS` |
| `read` | `(source_id, start_offset, end_offset, *, content_type=…, top_k=20, context=…)` | Chunks dont l'étendue tombe dans `[start, end)` |
| `get_chunk` | `(chunk_id, *, context=…)` | Résout un `chunk_id` en `SearchResult`, ou `None` |
| `grep` | `(source_id, pattern, *, mode=GrepMode.PHRASE, content_type=…, top_k=5, context=…)` | Correspondance lexicale dans une seule source, sans ranking vectoriel |

- Dans les boucles agentiques `open` et `navigate`, le modèle ne garde qu'un **`chunk_id` opaque** issu d'un résultat de recherche ; le serveur résout sa position.
- Les offsets suivent la convention semi-ouverte `[start, end)`.
- `read` et `navigate` lèvent `SourceNotFoundError` si le `source_id` est inconnu, et renvoient une liste vide à une frontière de source.

**`PatchableIndex`** (optionnel) : mises à jour partielles **sans réindexation** (une valeur de métadonnée, ou l'embedding d'un chunk).
- Méthodes : `patch_chunk(chunk_id, patch, *, context)` et `patch_document(document_id, patch, *, context)`.
- `ChunkPatch` et `DocumentPatch` (`mistralai.search.toolkit.search`) décrivent les champs à réassigner ou les clés de métadonnées à fusionner. **Une clé à `None` est supprimée.**

Imports : `from mistralai.search.toolkit.search import VectorStoreIndex, VectorSearchQuery, SearchResult, NavigableIndex, NavigationDirection, GrepMode, PatchableIndex`.

### 3.19 Backend Postgres

Installation : `uv add 'mistralai-search-toolkit[postgres]'`. `PostgresStoreIndex` implémente `VectorStoreIndex`, `NavigableIndex` et `PatchableIndex`.

`:::warning[Tenant isolation]` : le backend **ne dérive aucun filtre de tenant** depuis `IngestContext` / `RetrievalContext`. Il faut une collection par tenant, ou un filtrage en amont du store.

**Les trois objets** :
- **`PostgresCollectionSchema`** : déclare le modèle de document, le modèle d'embedding et le schéma PostgreSQL d'une collection. Le store lit cette déclaration et **ne réfléchit pas** le schéma de la base.
- **`PostgresApp([...])`** :
  - résout une collection déclarée en store vivant (`get_search_index(config, collection)`) ;
  - fournit `create_schema` pour les déploiements sans chaîne de migrations ;
  - sinon on utilise Alembic, Flyway, etc.
- **`PostgresStoreIndex`** : recherche dense et hybride, indexation, suppression, navigation, mises à jour partielles.

**Prérequis base** :
- extension `vector` (pgvector, index **HNSW**) ;
- extension `pg_textsearch` (méthode d'accès **BM25**). Elle doit figurer dans `shared_preload_libraries` **avant le démarrage** du serveur ; sinon `CREATE EXTENSION` échoue jusqu'à un redémarrage.
- Installation une fois par base avec un rôle privilégié : `CREATE EXTENSION vector; CREATE EXTENSION pg_textsearch;`.
- Le plugin **n'exécute jamais `CREATE EXTENSION`**, parce que sur un Postgres managé (RDS, Cloud SQL) un rôle applicatif à moindre privilège ne devrait pas en avoir le droit.
- `PostgresApp.create_schema` vérifie les deux extensions avant tout DDL et lève `MissingVectorExtensionError` ou `MissingBM25AccessMethodError` si l'une manque.

**Déclaration** :
- Exemple : `PostgresCollectionSchema(collection_name="docs", document_type=Document, embedding_model=MistralEmbeddingPreset.MISTRAL_EMBED_DIM_1024)`, puis `app = PostgresApp([DOCS])`.
- Imports : `from mistralai.search.toolkit.plugins.postgres import PostgresApp, PostgresCollectionSchema`.

| Champ | Type | Défaut | Rôle |
|---|---|---|---|
| `collection_name` | str | requis | Nom de collection **et de table** |
| `document_type` | `type[Document]` | requis | Sous-classe de `Document` |
| `embedding_model` | `EmbeddingModel \| MistralEmbeddingPreset` | requis | Dimensions, dtype et métrique de la colonne d'embedding |
| `db_schema` | str \| None | None (schéma par défaut de la connexion) | Schéma PostgreSQL |
| `hnsw_m` | int | **16** | Paramètre HNSW `m` |
| `hnsw_ef_construction` | int | **64** | Paramètre HNSW `ef_construction` |
| `text_search_config` | str | **`"english"`** | Configuration de recherche textuelle de l'index BM25 sur `content` |

Aucun nom de colonne n'est inféré par convention.

**Colonnes custom** :
- Les champs ajoutés à la sous-classe de `Document` deviennent des colonnes, **non bornées** sauf plafond demandé.
- Exemple : `section: Annotated[str | None, PostgresColumn(max_length=120)] = None`.

**Connexion** :
- `PostgresApp.get_search_index` accepte un `PostgresConnectionConfig` **ou** un `AsyncEngine` SQLAlchemy, et renvoie un `PostgresStoreIndex`.
- `PostgresConnectionConfig(dsn="postgresql://user:pw@localhost:5432/db")`, ou par parties : `host`, `port`, `database`, `user`, `password`.
- **TLS** :
  - un DSN avec `?sslmode=require` (ou plus strict) se passe tel quel ; `sslmode` est retiré de l'URL et traduit pour le driver **asyncpg** ;
  - la forme par parties prend `ssl="verify-full"` ;
  - un `ssl=` explicite l'emporte sur celui du DSN.
- `await app.create_schema(config, "docs")` est **idempotent** et vérifie les extensions ; ensuite `store = app.get_search_index(config, "docs")`.

**Création de la table**, trois voies :
1. `PostgresApp.create_schema(config, collection)` quand il n'y a pas de chaîne de migrations.
2. **Alembic** : ajouter `PostgresCollectionSchema.to_table()` au `target_metadata` et laisser l'autogénération écrire la révision. Cela garde un ordre de migration unique pour la base.
3. **Autres outils** (Flyway, Liquibase, SQL brut) : générer le DDL avec le CLI.

**CLI `mistral-postgres`** :
- `mistral-postgres ddl myapp.search:DOCS_COLLECTION` imprime les `CREATE TABLE` et `CREATE INDEX` d'une collection déclarée.
- L'argument `module:attribut` doit être importable.
- La sortie provient du même `to_table()` que celui utilisé par le store.
- Pas de `CREATE EXTENSION` dans la sortie.
- Équivalent en script : `render_ddl(collection)`.

**Recherche** :
- **Dense** : `store.search(VectorSearchQuery(embedding=vec, top_k=10))` utilise le retriever HNSW.
- **Hybride** : un `VectorSearchQuery(query="…", embedding=vec, top_k=10)` lance les deux retrievers sans configuration supplémentaire. Chaque table a un index BM25 sur `content`.
- **Fusion** : RRF pondérée, `score = w_vector / (k + rank_vector) + w_text / (k + rank_text)`.
- **Réglage par requête** avec `PostgresSearchQuery` :

| Champ | Type | Défaut | Effet |
|---|---|---|---|
| `vector_weight` | float | 1.0 | Poids du retriever vectoriel |
| `text_weight` | float | 1.0 | Poids du BM25 |
| `rrf_k` | int | **4** | Constante de lissage ; plus basse, elle accentue le haut de chaque liste |

  Seul le **ratio** des poids compte (1.0/1.0 équivaut à 0.5/0.5).

- **Autres réglages de recherche** :
  - `exclude_ids` ;
  - `max_candidates`, mappé sur `hnsw.ef_search` à chaque requête, avec des valeurs de 1 à 1000. S'il est inférieur à `top_k`, il est relevé à `top_k`.

**Replis et limites** :
- **Index lexical inutilisable** :
  - Au premier appel hybride, le store vérifie la disponibilité du ranking lexical.
  - Si l'index BM25 est absent ou `INVALID`, ou si `pg_textsearch` n'est pas installé, il **renvoie les résultats vectoriels** au lieu d'échouer, et journalise chaque requête dégradée au niveau `ERROR` avec la collection et le correctif suggéré.
  - `PostgresStoreIndex.lexical_ranking_resolved` vaut `True`, `False`, ou `None` avant le premier appel hybride. Le résultat est mis en cache pour toute la durée de vie du processus.
- **Pas de filtrage dérivé du contexte** : contrairement à Vespa, pas de `group_id` ni de `yql_filter`. Toute requête voit **toute la collection**.
- **Versions de pgvector** : **0.8 ou plus** recommandé.
  - Avant 0.8, `exclude_ids` peut renvoyer **moins de `top_k`** résultats, car HNSW filtre après récupération.
  - La 0.8 apporte `hnsw.iterative_scan`, que le store active ; sur un serveur plus ancien, un avertissement unique est émis.

### 3.20 Backend Qdrant (communautaire)

- Qdrant est un moteur open-source. Le plugin implémente `VectorStoreIndex`, `NavigableIndex` et `PatchableIndex`, et gère le schéma des collections Qdrant.
- Badge `<CommunityPlugin />` : maintenu par un tiers.
- PyPI : `mistralai-search-toolkit-plugins-qdrant`. Sources et doc : `github.com/qdrant-labs/mistral-qdrant-plugin`.
- Installation : `uv add mistralai-search-toolkit-plugins-qdrant` (ou `pip`). Configuration et usage sont renvoyés au dépôt du plugin.

### 3.21 Vespa : anatomie d'une application

Installation : `uv add "mistralai-search-toolkit[vespa]"`. La page Vespa sert de hub vers 6 guides : Anatomy, Manage Schema, Manage Ranking, Local Development, Deploy and Operate, CLI Reference.

**Package d'application** : `schemas/<document_type>.sd`, `search/query-profiles/<profile>.xml` et `search/query-profiles/types/root.xml`. On **ne l'écrit jamais à la main** : il est construit en mémoire depuis les migrations puis uploadé. `mistral-vespa generate` permet de l'inspecter.

**Migrations** : fichiers Python dans `vespa_app/migrations/`, qui sont la **source de vérité**.
- `mistral-vespa migrate` les exécute dans l'ordre, construit le package en mémoire et le déploie.
- Propriétés :
  - **ajout seul** : on ajoute des fichiers, on n'en modifie jamais ;
  - **ordonnées** par préfixe d'horodatage et rejouées à chaque déploiement ;
  - **versionnées** : seule chose à committer ;
  - **idempotentes**.

**Schémas** :
- Un schéma correspond à un type de document. Il produit un `.sd` **et** un query profile.
- Plusieurs schémas par application sont possibles (par exemple `articles`, `comments`), avec des noms uniques.
- `SearchMode` : `INDEX` (BM25, ANN/HNSW, ranking en 2 phases) ou `STREAMING` (plus proches voisins exacts, filtrage par attribut, ranking en 1 phase).
- `IndexingMode`, **requis** sur chaque schéma :
  - `DOCUMENT_PER_CHUNK` (**recommandé**) : un document Vespa par chunk, adressable par son ID déterministe ;
  - `SINGLE_DOCUMENT` (legacy, chunks en tableaux) : **déprécié, supprimé avant 1.0.0**.
- Avec `DOCUMENT_PER_CHUNK`, `create_schema()` **injecte automatiquement** les champs standard (contenu, embedding, identité, métadonnées).

**Types de champs** :

| Type | Usage | Indexation Vespa | Fonctions de ranking générées |
|---|---|---|---|
| `EmbeddingField` | Vecteurs sémantiques | attribute + HNSW | distance, similarité cosinus |
| `TextField` | Texte BM25 | index + summary | BM25, field match |
| `StringField` | Métadonnée stockée, non cherchée | attribute + summary | aucune |
| `TimestampField` | Ranking temporel (`long` / `int`) | attribute + summary | freshness, recency boost |
| `CountField` | Ranking numérique (`int`) | attribute + summary | normalisation, boost |
| `IntField` | Entier stocké, non classé | attribute + summary | aucune |
| `BoolField` | Booléen stocké | attribute + summary | aucune |
| `LanguageField` | Langue du document (RFC 3066) | index | aucune |

- `multi_dimensional=True` transforme un champ en **tableau** (tags, embeddings de sections).
- **Fieldset par défaut** : il contient tous les `TextField`. C'est l'ensemble cherché par `userQuery()` en YQL.

**Ranking profiles** générés par schéma :
- `root` : profil de base qui contient toutes les fonctions, générées et custom ;
- `match-only` : évalue la phase de retrieval, sans ranking ;
- `weighted-rank1` : phase 1, combinaison linéaire des fonctions de phase 1 avec poids fixés à la requête ;
- `weighted-rank2` : phase 1 + fonctions de phase 2.

**Ranking par phases** :
1. **First phase** : sur tous les matches, doit être rapide (BM25, distance d'embedding, freshness).
2. **Second phase** : sur le top-k de la phase 1, avec des fonctions plus coûteuses (field match, log, modèles ML).
3. **Global phase** (optionnelle) : sur l'ensemble fusionné, dans le nœud container.

Le plugin assigne chaque fonction générée à une phase selon le type de champ.

**Profils pondérés** : par exemple, phase 1 = `bm25_title_weight*bm25_title + content_embedding_distance_weight*content_embedding_distance + freshness_created_at_weight*freshness_created_at` ; phase 2 = `firstPhase + match_title_weight*match_title + log_freshness_created_at_weight*log_freshness_created_at`. **Tous les poids valent 0 au départ** : il faut en passer au moins un à une valeur non nulle pour activer le ranking.

**Query profile par défaut** (un par schéma) :
- nommé via `default_query_profile_name`, par défaut le nom du schéma ;
- contient une YQL hybride (si des embeddings existent) ou keyword ;
- utilise `weighted-rank2` comme profil de ranking par défaut ;
- déclare des champs de type de requête pour les poids des fonctions.

### 3.22 Vespa : migrations (gestion de schéma) et helpers

Génération : `uv run mistral-vespa generate-migration --app-dir ./vespa_app <name>` crée un fichier horodaté avec une classe `VespaMigration` dont la méthode `migrate()` est vide.

```python
class InitialSchema(VespaMigration):
    def migrate(self) -> None:
        set_app_name("myapp")
        create_schema(
            name="articles", mode=SearchMode.INDEX,
            embedding_model=MistralEmbeddingPreset.MISTRAL_EMBED_DIM_1024,
            indexing_mode=IndexingMode.DOCUMENT_PER_CHUNK,
            fields=[FieldDefinition.TextField(name="title"),
                    FieldDefinition.TimestampField(name="created_at")],
        )
```

Imports :
- `FieldDefinition`, `IndexingMode`, `SearchMode` depuis `mistralai.search.toolkit.plugins.vespa.app.schemas.app` ;
- les helpers depuis `mistralai.search.toolkit.plugins.vespa.migration`.

Restriction (`:::info`) : le nom passé à `set_app_name()` ne contient **que des minuscules a–z** (ni chiffres, ni `_`, ni `-`).

**Helpers de configuration d'application** :

| Helper | Signature | Effet |
|---|---|---|
| `set_app_name` | `(app_name: str)` | **Requis dans la première migration** ; a–z uniquement |
| `set_content_id` | `(content_id: str)` | Remplace l'ID du cluster de contenu dans `services.xml` (par défaut le nom d'app). Utile si le cluster a été créé avec un autre ID : sinon Vespa traite un renommage comme suppression puis recréation, et **détruit tous les documents** |
| `allow_schema_removal` | `(until: str)` | Autorise la suppression de schémas (refusée par défaut) en écrivant un `validation-overrides.xml` valable jusqu'à une date ISO `"YYYY-MM-DD"`. Conseil : une à deux semaines après la fenêtre de déploiement |
| `set_distribute_across_groups` | `(value: bool)` | **Déprécié** : crochet de compatibilité pour l'auto-découverte Kubernetes. Définir les groupes dans le fichier de topologie |

**`create_schema`** (méthode recommandée) :

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `name` | str | requis | Nom du type de document (**minuscules et `_` uniquement**) |
| `mode` | `SearchMode` | requis | `INDEX` / `STREAMING` |
| `indexing_mode` | `IndexingMode` | requis | `DOCUMENT_PER_CHUNK` / `SINGLE_DOCUMENT` |
| `embedding_model` | `EmbeddingModel \| MistralEmbeddingPreset \| None` | None | Appliqué à **tous** les champs d'embedding. Requis sauf si `embedding_dimensions` (déprécié) est fourni |
| `embedding_dimensions` | int \| None | None | **Déprécié** : construit `CustomEmbeddingModel(name="unknown")`. Fournir les deux paramètres lève `ValueError` |
| `fields` | `list[FieldDefinition] \| None` | None | Champs en plus des défauts du mode. `SINGLE_DOCUMENT` exige au moins un champ |
| `custom_functions` | `list[FunctionWithInputs] \| None` | None | Fonctions de ranking custom |
| `default_query_profile_name` | str \| None | None (nom du schéma) | Nom du query profile auto-généré |
| `top_chunks` | int \| None | None | `SINGLE_DOCUMENT` uniquement ; rejeté avec `DOCUMENT_PER_CHUNK` |
| `id_field` | str \| None | None | `SINGLE_DOCUMENT` uniquement, déprécié ; rejeté avec `DOCUMENT_PER_CHUNK` (l'identité y est toujours `id`) |
| `content_cluster` | str | `"content"` | Cluster de contenu Vespa qui héberge le schéma |

- `create_default_schema` : **déprécié, supprimé avant 1.0.0**. Il ne produit que le jeu de champs `SINGLE_DOCUMENT` et prend `schema_version` et `additional_fields`.
- Plusieurs schémas : appeler `create_schema()` plusieurs fois.

**Constructeurs de champs** (`FieldDefinition.*`) :
- `EmbeddingField(name, multi_dimensional=False)` : HNSW ; dimension et métrique dérivées de l'`embedding_model` du schéma.
- `TextField(name, multi_dimensional=False, summary=SummaryDefinition())` : BM25, inclus dans le fieldset par défaut ; `summary` règle le rendu dans les résultats.
- `StringField(name, multi_dimensional=False, fast_search=False, match: MatchDefinition | None = None, summary=SummaryDefinition(), attribute=True)` :
  - pour filtres, IDs et tags, **non apparié** à la requête ;
  - `fast_search` crée un index d'attribut dédié (plus de mémoire et de CPU, lookups plus rapides) ;
  - `attribute=False` garde la valeur hors des attributs en mémoire.
- `TimestampField(name, type: Literal["long","int"]="long")`.
- `CountField(name)` : génère normalisation et boost. Pour un entier non classé, utiliser `IntField`.
- `IntField(name, multi_dimensional=False, summary=SummaryDefinition())`.
- `BoolField(name, fast_search=False)` : `fast_search=True` émet `attribute { fast-search }` et permet le filtrage à la requête (par exemple `is_public`).
- `LanguageField(name="language")` : tag RFC 3066 indexé pour filtrer par langue.

**Faire évoluer un schéma** (chaque helper lève `ValueError` si le schéma n'existe pas) :
- `add_field(schema_name, field)` ;
- `add_custom_functions(schema_name, functions: list[FunctionWithInputs])` ;
- `add_query_profiles(query_profiles: list[QueryProfile])` : ajoute ou met à jour ;
- `add_schema_rank_profiles(schema_name, rank_profiles: list[Path])` : fichiers de profils de ranking ;
- `add_schema_model_files(schema_name, model_files: list[Path])` : modèles ML ;
- `add_schema_custom_document_summary(schema_name, custom_document_summary: DocumentSummary)`.

**Instantané optionnel** : `uv run mistral-vespa generate --app-dir ./vespa_app --path ./vespa.lock` écrit le package sur disque pour inspection ou CI ; il ne sert **pas** au déploiement.

### 3.23 Vespa : query profiles et ranking

Les query profiles permettent de **piloter le ranking à la requête sans toucher au schéma**. Chacun regroupe un profil de ranking, des poids et des paramètres sous un nom réutilisable d'une requête à l'autre.

- **Profil par défaut** : généré par `create_schema()` (YQL hybride ou keyword, `weighted-rank2`, champs de poids). Son nom est celui du schéma, sauf avec `default_query_profile_name`. Tous les poids valent 0.
- **Profils custom** : se créent dans une migration (`generate-migration … add_custom_query_profiles`) via `add_query_profiles`.

```python
from vespa.package import QueryField
from mistralai.search.toolkit.plugins.vespa.app.schemas.query_profile import QueryProfile
add_query_profiles([
    QueryProfile(name="hybrid-search", fields=[
        QueryField(name="ranking.features.query(bm25_title_weight)", value=100),
        QueryField(name="ranking.features.query(content_embedding_cosine_similarity_score_weight)", value=80),
        QueryField(name="ranking.features.query(freshness_created_at_weight)", value=20),
        QueryField(name="hits", value=10),
        QueryField(name="ranking.profile", value="weighted-rank2"),
    ]),
])
```

- `QueryProfile` (côté migration) prend `name: str` et `fields: list[QueryField]`. `QueryField` (de `vespa.package`, pyvespa) prend `name: str` et `value: str | int | float`.
- L'exemple de la doc définit aussi un profil `keyword-search` : `bm25_title_weight=100`, `bm25_content_weight=50`, `hits=10`, `ranking.profile="weighted-rank1"`.
- Champs de requête courants :
  - `ranking.profile` : `weighted-rank1`, `weighted-rank2` ou `match-only` ;
  - `ranking.features.query(<function>_weight)` : poids d'une fonction (par exemple `bm25_title` → `bm25_title_weight`) ;
  - `hits` : nombre de résultats.
- **Versionnement** : nom `"search:1.0.0"`, `"search:2.0.0"` (version après deux-points). À la requête : `QueryProfile(name="search", version="2.0.0")` depuis `mistralai.search.toolkit.plugins.vespa.search`. C'est une **autre classe** `QueryProfile` que celle des migrations.
- **Sélection à la requête** : `app.get_search_index(vespa_config, collection_name="articles", query_profile=QueryProfile(name="hybrid-search"))`. Sans `query_profile`, le profil par défaut du schéma s'applique. Ailleurs dans la doc, `query_profile` est passé comme simple chaîne (`"dense"`, `"hybrid"`).
- Variable d'environnement utilisée dans l'exemple : `VESPA_ENDPOINT` (défaut `http://localhost:18080`).

### 3.24 Vespa : CLI `mistral-vespa`

`uv run mistral-vespa --help` donne la liste complète.

| Commande | Syntaxe | Options (défauts) | Rôle |
|---|---|---|---|
| `generate-migration` | `generate-migration <name> [--app-dir]` | `name` requis ; `--app-dir ./vespa_app` | Stub de migration horodaté (nom de fichier et classe) |
| `migrate` | `migrate [--app-dir] [flags]` | `--app-dir ./vespa_app` ; `--dry-run false` ; `--config-server` auto (`http://localhost:19071` en local, URL de service in-cluster en K8s) ; `--query-port 8080` (port hôte interrogé après déploiement) | Construit depuis les migrations et déploie ; mono-nœud localhost ou Kubernetes |
| `migrate` (K8s, **dépréciés**) | `--k8s-namespace`, `--k8s-instance` (requis ensemble), `--k8s-context` (exige namespace, instance et `--config-server`) | — | Remplacés par `generate-topology` + `--topology-file` |
| `generate` | `generate --path <dir> [--app-dir]` | `--path` requis | Écrit le package sur disque (inspection, CI) ; ne déploie pas |
| `bruno` | `bruno --query-url <url> --document-url <url> [--app-dir]` | URLs requises | Génère des fichiers de test d'API **Bruno** |
| `local up` | `local up [--query-port] [--config-port] [--name]` | `8080`, `19071`, `vespa` | Démarre un conteneur Vespa Docker local |
| `local down` | `local down [--name]` | — | Arrête le conteneur **et supprime les volumes** |
| `local status` | `local status [--name]` | — | Indique si le conteneur tourne |

Exemples `migrate` :
- local : `--config-server http://localhost:19071` ;
- K8s in-cluster (CI) : `--k8s-namespace my-project --k8s-instance vespa` ;
- poste de travail avec `kubectl port-forward` : ajouter `--k8s-context staging --config-server http://localhost:19071`.

### 3.25 Vespa : développement local

Prérequis : plugin Vespa installé et Docker démarré.
1. `uv run mistral-vespa generate-migration --app-dir ./vespa_app initial_schema`, puis remplir : `set_app_name("mynewproject")`, schéma `articles`, `default_query_profile_name="hybrid-profile"`, champ `title`.
2. `uv run mistral-vespa local up --query-port 18080 --config-port 19171 --name vespa-dev`. Le port 18080 correspond au container HTTP (requêtes et feed), le port 19171 au config server (déploiements).
3. `uv run mistral-vespa migrate --app-dir ./vespa_app --config-server http://localhost:19171 --query-port 18080` : build en mémoire, déploiement, puis polling de l'endpoint de requête jusqu'à disponibilité.
4. Feed : `POST http://localhost:18080/document/v1/articles/articles/docid/doc1` avec `{"fields": {"title": "Document 1"}}`. Recherche : `POST http://localhost:18080/search/` avec `{"yql": "select * from sources * where true"}`.
5. Évolution : nouvelle migration `add_view_count` avec `add_field("articles", FieldDefinition.CountField(name="view_count"))`, prévisualisée par `--dry-run`, puis appliquée.

`:::info` :
- Mêmes restrictions de nom d'application.
- Les **fonctions de chunk sont générées automatiquement** : si un schéma contient à la fois un champ d'embedding multidimensionnel et un champ texte multidimensionnel, le plugin génère `best_chunks`, `chunk_scores` et des helpers associés.
- L'ancien helper `create_default_schema()` est déprécié.

**Effets d'un changement de schéma sur une application en cours** :

| Changement | Comportement |
|---|---|
| Ajout de champ | Sans problème ; pas de valeur tant qu'aucun document ne l'écrit |
| Changement d'indexation d'un champ | **Réindexation en arrière-plan** ; incohérence temporaire possible |
| Suppression de champ | Données et index du champ supprimés |
| Changement de type | **Perte de données** : préférer ajouter un champ, migrer, puis supprimer l'ancien |

- **Profils de ranking custom et assets** : `add_schema_rank_profiles("articles", [Path(__file__).parent.parent / "vespa-extra" / "custom.profile"])`. Même schéma pour `add_schema_model_files`, `add_schema_custom_document_summary` et `add_query_profiles`.
- **`vespa.lock`** : à régénérer après chaque changement de schéma ; le déploiement se fait toujours depuis les migrations.
- **IDE** : utiliser un IDE avec le plugin Vespa (coloration, complétion, navigation entre fonctions et profils, détection d'erreurs).

### 3.26 Vespa : déploiement et opérations

**`VespaClientConfig`** (`from mistralai.search.toolkit.plugins.vespa import VespaClientConfig`) :

| Paramètre | Défaut | Rôle |
|---|---|---|
| `endpoint` | requis | URL de l'endpoint de requête Vespa |
| `timeout` | 30 s | Timeout de requête |
| `max_retries` | 3 | Nouvelles tentatives automatiques |
| `verify_ssl` | True | Vérification TLS |
| `ca_cert_path` | non documenté (vu en exemple) | Bundle CA custom |

Usage : `vector_store = app.get_search_index(config, collection_name="my_collection")`.

**Santé et disponibilité** :
- La doc fournit une fonction `wait_for_vespa` (aiohttp) qui interroge `GET {endpoint}/ApplicationStatus` jusqu'à un 200 (30 tentatives toutes les 2 s, timeout de 5 s).
- Vérifications curl : `curl http://localhost:8080/ApplicationStatus` ; « document count » via `/search/?yql=select * from my_collection limit 1`.

**Production** :
- Cluster : **au moins 3 nœuds** Vespa, répartis sur plusieurs zones de disponibilité, derrière un load balancer avec health checks.
- Réseau : réseau privé entre nœuds ; endpoint de requête exposé derrière un reverse proxy (nginx, Cloudflare…) ; rate limiting et protection DDoS.
- Exemple de configuration distribuée : endpoint unique de load balancer (`https://vespa-lb.example.com`).
- Monitoring : latence et débit d'ingestion, latence et taux d'erreurs des requêtes, alertes sur les health checks, usage disque et croissance de l'index.

---

## 4. Interface utilisateur

| Écran / chemin | URL | Contenu documenté |
|---|---|---|
| **Studio › Libraries** | https://console.mistral.ai/libraries | Liste des Libraries ; bouton **Index a website** |
| Studio › Libraries › **Index a website** | (même route, flux modal ou assistant ; inférence) | Champs **Library Name** et **Website URL** ; lien **Advanced Settings** (Maximum Pages, Maximum Depth, URL filter rules, Refresh Schedule, Browser-based fetching) ; bouton **Start Indexing** |
| Libraries côté « Vibe » | `https://chat.mistral.ai/libraries/<library_id>` | L'ID de la Library est dans l'URL. Partage avec l'organisation réservé à un **Org admin** pour l'usage par les agents |
| Paramètres console et plateforme | non précisé | Endroit où trouver les UUID d'utilisateurs, workspaces et organisations pour `share_with_uuid` |
| Studio › configuration d'agent | non précisé | Ajout du serveur MCP Agentic Search « as a connector or MCP server » |
| console.mistral.ai | https://console.mistral.ai/ | Obtention de la clé API (prérequis Search Toolkit et starter app) |

Parcours documentés :
- **Indexer un site** : Index a website → nom + URL → (Advanced Settings) → Start Indexing. Le traitement est facturé à l'usage.
- **Utiliser une Library Vibe dans un agent API** : récupérer l'ID dans l'URL Vibe, puis un Org admin la partage avec l'organisation, puis on la passe dans `library_ids`.
- **Agentic Search via Vibe** (hors Studio) : `vibe --trust` dans le projet, `/mcp` pour vérifier, puis prompts en langage naturel. L'agent **demande approbation** avant d'appeler `ingest`.

Aucun écran Studio dédié au Search Toolkit n'est décrit : c'est une bibliothèque Python et des CLI.

---

## 5. API et SDK

### 5.1 Endpoints REST Libraries

Base `https://api.mistral.ai`. Les tags OpenAPI sont `beta.libraries`, `beta.libraries.documents` et `beta.libraries.accesses`.

| Méthode | Chemin | operationId | Rôle | Réponse |
|---|---|---|---|---|
| GET | `/v1/libraries` | `libraries_list_v1` | Lister (créées ou partagées) | 200 `ListLibrariesResponse` |
| POST | `/v1/libraries` | `libraries_create_v1` | Créer | **201** `Library` |
| GET | `/v1/libraries/{library_id}` | `libraries_get_v1` | Détail | 200 `Library` |
| PATCH | `/v1/libraries/{library_id}` | `libraries_patch_v1` | Modifier `name` et `description` | 200 `Library` |
| PUT | `/v1/libraries/{library_id}` | `libraries_update_v1` | Idem, **déprécié** (utiliser PATCH) | 200 |
| DELETE | `/v1/libraries/{library_id}` | `libraries_delete_v1` | Supprimer avec tous les documents | 200 `Library` (déprécié), **204** à terme |
| GET | `/v1/libraries/{id}/documents` | `libraries_documents_list_v1` | Lister les documents | 200 `ListDocumentsResponse` |
| POST | `/v1/libraries/{id}/documents` | `libraries_documents_upload_v1` | Upload multipart (`file`) | **201** créé / **200** doublon (même hash) |
| GET | `/v1/libraries/{id}/documents/{doc_id}` | `libraries_documents_get_v1` | Métadonnées | 200 `Document` |
| PATCH | `/v1/libraries/{id}/documents/{doc_id}` | `libraries_documents_patch_v1` | Modifier `name`, `attributes`, `expires_at` | 200 `Document` |
| PUT | `/v1/libraries/{id}/documents/{doc_id}` | `libraries_documents_update_v1` | Modifier le nom ; **déprécié** | 200 |
| DELETE | `/v1/libraries/{id}/documents/{doc_id}` | `libraries_documents_delete_v1` | Supprimer (Library + index) | 204 |
| GET | `…/{doc_id}/text_content` | `libraries_documents_get_text_content_v1` | Texte extrait (`page_start`, `page_end` optionnels) | 200 `{text}` |
| GET | `…/{doc_id}/status` | `libraries_documents_get_status_v1` | Statut | 200 `ProcessingStatus` |
| GET | `…/{doc_id}/signed-url` | `libraries_documents_get_signed_url_v1` | URL signée du fichier (30 min, accessible à quiconque a le lien) | 200 string |
| GET | `…/{doc_id}/extracted-text-signed-url` | `libraries_documents_get_extracted_text_signed_url_v1` | URL signée du texte extrait / résultat OCR | 200 string |
| POST | `…/{doc_id}/reprocess` | `libraries_documents_reprocess_v1` | Retraiter (**refacturé**) | 204 |
| GET | `/v1/libraries/{id}/share` | `libraries_share_list_v1` | Lister les accès | 200 `ListSharingResponse` |
| PUT | `/v1/libraries/{id}/share` | `libraries_share_create_v1` | Créer ou mettre à jour un accès | 200 `Sharing` |
| DELETE | `/v1/libraries/{id}/share` | `libraries_share_delete_v1` | Supprimer un accès (corps JSON) | 200 `Sharing` (déprécié), **204** à terme |

Toutes les routes renvoient **422** `HTTPValidationError` en cas d'erreur de validation. `library_id` et `document_id` sont des UUID.

**Paramètres de `GET …/documents`** (spec) :

| Nom | Défaut | Effet |
|---|---|---|
| `search` | — | Filtre textuel |
| `page_size` | 100 (1–100) | — |
| `page` | 0 | Page (non dépréciée ici, contrairement à la liste des Libraries) |
| `sort_by` | `created_at` | — |
| `sort_order` | `desc` | — |
| `filters_attributes` | — | **Déprécié** |

`ListDocumentsResponse` = `pagination` (`total_items`, `total_pages`, `current_page`, `page_size`, `has_more`) + `data[]`.

### 5.2 Schémas clés (spec)

| Schéma | Champs |
|---|---|
| `CreateLibraryRequest` | `name` (requis), `description`, `owner_type` (`User` / `Workspace`), `chunk_size` (256–32768, déprécié) |
| `UpdateLibraryRequest` | `name`, `description` |
| `Library` | `id`, `name`, `created_at`, `updated_at`, `owner_id`, `owner_type`, `total_size`, `nb_documents`, `chunk_size` (déprécié), `description`, et des champs dépréciés : `emoji`, `generated_name`, `generated_description`, `explicit_user_members_count`, `explicit_workspace_members_count`, `org_sharing_role` |
| `Document` | `id`, `library_id`, `hash` (déprécié), `mime_type`, `extension`, `size`, `name`, `summary`, `created_at`, `last_processed_at`, `number_of_pages`, `process_status`, `uploaded_by_id`, `uploaded_by_type`, `tokens_processing_main_content` / `tokens_processing_summary` (dépréciés), `url`, `attributes`, `expires_at`, `processing_status` (lecture seule, déprécié), `tokens_processing_total` (lecture seule) |
| `UpdateDocumentRequest` | `name`, `attributes` (valeurs bool, str, int, float, date-time ou tableaux typés), `expires_at` |
| `ProcessingStatus` | `document_id`, `process_status`, `processing_status` (déprécié) |
| `ProcessStatus` (enum) | `self_managed`, `missing_content`, `noop`, `done`, `todo`, `in_progress`, `error`, `waiting_for_capacity` |
| `DocumentTextContent` | `text` |
| `SharingRequest` | `level` (`ShareEnum` : `Viewer` / `Editor`), `share_with_uuid`, `share_with_type` (`EntityType` : `User` / `Workspace` / `Org`), `org_id` (déprécié) |
| `SharingDelete` | `share_with_uuid`, `share_with_type`, `org_id` (déprécié) |
| `Sharing` | `library_id`, `role`, `share_with_type`, `share_with_uuid`, `user_id` (déprécié), `org_id` (déprécié) |
| `DocumentLibraryTool` | `type: "document_library"`, `library_ids` (≥ 1), `tool_configuration` (`include`, `exclude`, `requires_confirmation`) |
| `ConversationUsageInfo` | `prompt_tokens`, `completion_tokens`, `total_tokens`, `connector_tokens`, `connectors` (dictionnaire nom → nombre) |

### 5.3 Méthodes SDK Libraries

| Action | Python (`client.beta.libraries…`) | TypeScript (`client.beta.libraries…`) |
|---|---|---|
| Créer | `.create(name, description)` | `.create({ name, description })` |
| Lister | `.list().data` | `.list()` puis `.data` |
| Supprimer | `.delete(library_id)` | `.delete({ libraryId })` |
| Lister les documents | `.documents.list(library_id).data` | `.documents.list({ libraryId })` |
| Uploader | `.documents.upload(library_id, file=File(fileName, content))` | `.documents.upload({ libraryId, requestBody: { file: { fileName, content } } })` |
| Statut | `.documents.status(library_id, document_id)` → `.processing_status` | `.documents.status({ libraryId, documentId })` → `.processingStatus` |
| Métadonnées | `.documents.get(library_id, document_id)` | `.documents.get({ libraryId, documentId })` |
| Texte | `.documents.text_content(library_id, document_id)` | `.documents.textContent({ libraryId, documentId })` |
| Supprimer un document | `.documents.delete(library_id, document_id)` | `.documents.delete({ libraryId, documentId })` |
| Lister les accès | `.accesses.list(library_id)` | `.accesses.list({ libraryId })` |
| Partager | `.accesses.update_or_create(library_id, org_id, level, share_with_uuid, share_with_type)` | `.accesses.updateOrCreate({ libraryId, sharingIn: {...} })` |
| Retirer un accès | `.accesses.delete(library_id, org_id, share_with_uuid, share_with_type)` | `.accesses.delete({ libraryId, sharingDelete: {...} })` |

Dans les réponses TS, les champs passent en camelCase (`nbDocuments`, `numberOfPages`). Python : SDK V2 `from mistralai.client.models import File` ; V1 `from mistralai.models import File`.

Agents et conversations associés : `client.beta.agents.create(..., tools=[{"type": "document_library", "library_ids": [...]}])`, puis `client.beta.conversations.start(agent_id, inputs)`.

### 5.4 Search Toolkit : carte des modules (paquet `mistralai-search-toolkit`)

| Module | Symboles documentés |
|---|---|
| `mistralai.client` | `Mistral` (client ; `api_key`, `server_url`) |
| `mistralai.search.toolkit.embedding` | `MistralEmbedder`, `MODEL_1024_EMBEDDING`, `MODEL_256_EMBEDDING`, `MODEL_128_EMBEDDING`, `Embedder`, `EmbeddingResult`, `EmbeddingModel`, `MistralEmbeddingModel`, `CustomEmbeddingModel`, `MistralEmbeddingPreset`, `VectorDType`, `DistanceMetric` (`VectorConfig`, `DimensionMismatchError` cités) |
| `mistralai.search.toolkit.embedders` | `MistralEmbedder` (chemin vu **seulement** sur la page Agentic Search) |
| `mistralai.search.toolkit.document` | `Document`, `DocumentChunk`, `DocumentFileMetadata`, `compute_char_locator`, `compute_id` (`DocumentMetadata`, `DocumentChunkMetadata`, `PagedDocumentChunkMetadata`, `ChunkType` cités) |
| `mistralai.search.toolkit.context` | `IngestContext`, `RetrievalContext` |
| `mistralai.search.toolkit.ingestion` | `File` |
| `…ingestion.pipelines` | `Pipeline`, `RoutedPipeline` |
| `…ingestion.loaders` | `FilesystemFileLoader`, `FileLoader` (`FileSizeLimitExceededException`) |
| `…ingestion.extractors` | `MistralOCRExtractor`, `PyMuPDFExtractor`, `SmartPDFExtractor`, `MistralAudioTranscriptionExtractor`, `PlainTextExtractor`, `HTMLExtractor`, `MarkdownifyConverter`, `HtmlToMarkdownConverter`, `SpreadsheetExtractor`, `EmailExtractor`, `EmailAttachment`, `extract_email_attachments` (et `extract_eml_attachments`, `extract_msg_attachments`), `NumbersExtractor`, `NumbersOptions`, `LegacyOfficeExtractor`, `DocumentExtractor` |
| `…ingestion.extractors.smart_pdf` | `PdfRoute`, `SmartPDFExtractorRuntimeOptions` |
| `…ingestion.text_splitters` | `CharacterTextSplitter`, `TokenTextSplitter`, `SeparatorTextSplitter`, `SeparatorTextSplitterConfig`, `MarkdownTextSplitter`, `MarkdownTextSplitterConfig`, `TextSplitter` ; `.models.TextFragment` |
| `…ingestion.enrichment` | `SummaryEnricher`, `SummaryConfig`, `SummarizeRequestConfig`, `ChunkEnricher` (`SummaryRequestOptions`, `OverflowStrategy` cités) |
| `…ingestion.progress` | `create_tqdm_progress_callback` |
| `mistralai.search.toolkit.storage` | `FilesystemStorage` |
| `mistralai.search.toolkit.llm` | `MistralChat`, `LLMConfig` (`model`, `temperature`, `response_format`) |
| `mistralai.search.toolkit.retrieval` | `QueryEngine` (et `VectorRetriever` selon la page Agentic Search) |
| `…retrieval.retrievers` | `VectorRetriever`, `KeywordRetriever`, `Retriever` |
| `…retrieval.rerankers` | `LLMReRanker`, `CrossEncoderReRanker`, `RRFRanker`, `ReRanker`, `GroupedRanker` |
| `…retrieval.pre_processors` | `LLMQueryRewriter`, `LLMQueryExtension` |
| `…retrieval.cache` | `SemanticCache`, `CachedQueryEngine`, `InMemoryCacheBackend`, `EvictionPolicy`, `CacheMetrics`, `CacheBackend`, `CacheEntry` |
| `mistralai.search.toolkit.search` | `SearchResult`, `SearchResultGroup`, `VectorStoreIndex`, `VectorSearchQuery`, `NavigableIndex`, `NavigationDirection`, `GrepMode`, `PatchableIndex`, `ChunkPatch`, `DocumentPatch` (`SourceNotFoundError`, `KeywordStoreIndex` cités) |
| `…plugins.vespa` | `VespaClientConfig` |
| `…plugins.vespa.migration` | `VespaMigration`, `set_app_name`, `set_content_id`, `allow_schema_removal`, `set_distribute_across_groups`, `create_schema`, `create_default_schema`, `add_field`, `add_custom_functions`, `add_query_profiles`, `add_schema_rank_profiles`, `add_schema_model_files`, `add_schema_custom_document_summary` |
| `…plugins.vespa.app.schemas.app` | `FieldDefinition`, `SearchMode`, `IndexingMode` (`SummaryDefinition`, `MatchDefinition`, `FunctionWithInputs`, `DocumentSummary` cités) |
| `…plugins.vespa.app.schemas.query_profile` | `QueryProfile` (définition en migration) |
| `…plugins.vespa.search` | `QueryProfile(name, version)` (sélection à la requête) |
| `vespa.package` (pyvespa) | `QueryField` |
| `…plugins.postgres` | `PostgresApp`, `PostgresCollectionSchema`, `PostgresColumn`, `PostgresConnectionConfig`, `PostgresSearchQuery`, `PostgresStoreIndex` (`render_ddl`, `MissingVectorExtensionError`, `MissingBM25AccessMethodError` cités) |
| `…plugins.storage.s3` / `.azure` / `.gcs` | `S3FileLoader` / `AzureBlobFileLoader` / `GCSFileLoader` (backends `S3BlobStorage`, `AzureBlobStorage`, `GCSBlobStorage`, `ObjectStorage`) |
| Module applicatif utilisateur | `vespa_app.app.get_search_index(config, collection_name=…, query_profile=…)` ; dans la starter app, `search_app.get_index(name, query_profile=…)` |

**Paquets PyPI distincts** :
- `mistralai-search-toolkit` (et ses extras) ;
- `mistralai-search-toolkit-storage-s3`, `-storage-azure`, `-storage-gcs` ;
- `mistralai-search-toolkit-plugins-qdrant` (communautaire).

**Signatures asynchrones** : la quasi-totalité de l'API est `async` : `pipeline.run`, `loader.load_file`, `extractor.extract`, `embedder.embed*`, `retriever.retrieve`, `query_engine.search`, `rerank` / `rank`, `rewrite` / `extend`, opérations de cache, méthodes de store. Exceptions : `splitter.split_document` et `split_text`, montrés en synchrone.

### 5.5 Outils CLI et commandes

| Outil | Commandes |
|---|---|
| `mistral-vespa` | `generate-migration`, `migrate`, `generate`, `bruno`, `local up`, `local down`, `local status` (et `generate-topology`, cité) |
| `mistral-postgres` | `ddl <module:attribut>` |
| Makefile de la starter app | `setup-vespa`, `ingest path=…`, `search query=…`, `mcp` (HTTP), `bruno`, `generate-vespa-lock` (plus `setup` cité dans l'arborescence) |
| Serveur MCP | `uv run python -m entrypoints.mcp_server [--http --host 127.0.0.1 --port 8000]` |
| Scaffolding | `uvx copier copy gh:mistralai/search-starter-app <dir>` |
| Vibe | `vibe --trust`, `/mcp` |

### 5.6 Endpoints Vespa natifs utilisés dans la doc

| Méthode | URL | Usage |
|---|---|---|
| GET | `http://localhost:19071/state/v1/health` | Santé du config server (quickstart) |
| POST | `http://<host>:<query-port>/document/v1/<namespace>/<doctype>/docid/<id>` | Feed d'un document (`{"fields": {...}}`) |
| POST / GET | `http://<host>:<query-port>/search/` | Requête YQL |
| GET | `http://<host>:8080/ApplicationStatus` | Disponibilité de l'application |

### 5.7 Erreurs et exceptions nommées

- **Libraries** : `422 HTTPValidationError`.
- **Toolkit** :
  - `DimensionMismatchError` : preset Mistral et dimension incohérents ;
  - `ValueError` : `create_schema` avec `embedding_model` et `embedding_dimensions` à la fois, ou helper d'évolution sur un schéma inexistant ;
  - `FileSizeLimitExceededException` : loader ;
  - `SourceNotFoundError` : `read` / `navigate` ;
  - `MissingVectorExtensionError` et `MissingBM25AccessMethodError` : Postgres.
- **Comportements non bloquants** :
  - `SummaryEnricher` : journalise par défaut ; `fail_on_generation_error=True` pour lever ;
  - `SemanticCache` : journalise et contourne le cache ;
  - Postgres sans BM25 : log `ERROR` et repli vectoriel ;
  - pgvector < 0.8 : un avertissement.

### 5.8 Audit (spec)

- **Types de cible** (`TargetType`) : `LIBRARY`, `LIBRARY_DOCUMENT`, `CRAWLER_CONFIG`.
- **Événements** (`AuditLogEventType`) :
  - Libraries : `library.create`, `library.delete`, `library.update`, `library.share`, `library.unshare` ;
  - documents : `library.document.create`, `library.document.delete`, `library.document.bulk_delete`, `library.document.update`, `library.document.reprocess` ;
  - crawler : `crawler.config.create`, `crawler.config.update`, `crawler.config.delete`, `crawler.run.create`, `crawler.run.cancel` ;
  - indexation : `indexing.workflow.completed`, `indexing.deleted`.
- `library.document.bulk_delete` n'a pas d'endpoint public correspondant dans la spec (inférence : opération réservée à l'interface).

---

## 6. Limites, quotas, tarifs, disponibilité

| Sujet | Information |
|---|---|
| Facturation Libraries | Traitement des documents **pay-as-you-go**, y compris depuis Studio (indexation de site). Retraitement (`reprocess`) **refacturé**. Coûts exposés par document : `tokens_processing_total` (contenu + résumé). |
| Types d'usage (spec, enum `UsageType`) | `document_library`, `document_library_api`, `libraries_pages`, `libraries_tokens`, `libraries_audio` (inférence : facturation des Libraries par pages, tokens et audio). Aucun tarif chiffré dans le périmètre. |
| Consommation RAG en conversation | `connector_tokens` inclus dans `total_tokens` ; `connectors.document_library` compte les appels. |
| Crawler | Maximum Pages 1–10000 ; Maximum Depth 1–10 (défaut 10) ; texte seulement ; rafraîchissement au plus horaire. |
| Création de Library privée | `owner_type: "User"` réservé aux clés API avec le scope « Private and shared connectors ». |
| Partage | Pas de partage hors organisation ; propriétaire seul pour partager ou retirer l'accès d'autrui. |
| URL signées | Expirent après **30 min** ; accessibles à toute personne qui a le lien. |
| Pagination | Libraries : `page_size` ≤ 100 (défaut 100), `page_token` recommandé. Documents : `page_size` ≤ 100. |
| Expiration de document | `expires_at` : suppression automatique après la date. |
| Formats et tailles acceptés par Libraries | **Non documentés** dans les pages du périmètre. On sait seulement : « PDFs, papers, or any document » ; texte OCR pour PDF, DOCX et PPTX ; ancien `chunk_size` 256–32768 caractères. |
| Search Toolkit | Python **≥ 3.12** ; dépend de clés API Mistral pour OCR, embeddings, LLM et transcription (facturés selon l'API). PyMuPDF : coût CPU local, **licence Pro payante** pour DOCX, PPTX, DOC, PPT, HWP et HWPX. |
| Statut de version | Toolkit pré-1.0 : `SINGLE_DOCUMENT`, `create_default_schema`, `embedding_dimensions`, `id_field` et les flags K8s sont dépréciés. Qdrant est communautaire (support par le tiers). |
| Postgres | Extensions `vector` et `pg_textsearch` (préchargée) requises ; `max_candidates` 1–1000 ; pgvector ≥ 0.8 recommandé ; **pas d'isolation multi-tenant** intégrée. |
| Vespa production | ≥ 3 nœuds recommandés, multi-AZ, load balancer, reverse proxy, rate limiting. Pas d'offre managée par Mistral décrite (« or use a managed backend »). |
| Cache sémantique | En mémoire par défaut (environ 4 Ko par entrée en 1024 dimensions) ; `max_entries` 1000 par défaut ; pas de persistance sans backend custom. |
| Régions, ZDR, rétention | **Non abordés** dans le périmètre (hors `expires_at` et durée des URL signées). |

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Libraries**
- **Déduplication à l'upload** : un fichier au même hash dans la même Library renvoie **200 avec le document existant** au lieu de 201. Le code client doit gérer les deux.
- **Recherche après traitement seulement** : un document n'est trouvable par l'agent qu'une fois traité. Il faut donc poller `status` (la doc boucle à 1 s).
- **Deux champs de statut** : la doc utilise `processing_status` (`Running` / `Completed`), alors que la spec le déprécie au profit de `process_status`, enum à 8 valeurs. Un état comme `waiting_for_capacity` (inférence : file d'attente sous charge) ou `error` n'apparaît pas dans la doc.
- **Résumé automatique** : chaque document reçoit un `summary`, dont la génération coûte des tokens (`tokens_processing_summary`, environ la moitié du coût total dans l'exemple).
- **Métadonnées générées** de Library (`generated_name`, `generated_description`) : présentées comme mises à jour automatiquement, mais dépréciées dans la spec.
- **Changement de codes de réponse annoncé** : DELETE Library et DELETE share passeront de 200 + corps à **204 sans corps**.
- **PUT dépréciés** (Library, Document) au profit de PATCH.
- **`org_id` déprécié** dans le partage alors que la doc le présente encore comme paramètre.
- **Crawler** : images et graphiques ignorés. Pour du visuel, télécharger la page et l'uploader comme fichier (l'OCR traitera alors le visuel ; inférence). Le rendu headless est **désactivé par défaut** : il faut l'activer pour les sites en JavaScript.
- **Accès d'un agent à une Library Vibe** : exige un Org admin et un partage à l'**Organisation**.

**Agentic Search**
- La navigation **exige `IndexingMode.DOCUMENT_PER_CHUNK`** : les schémas legacy `SINGLE_DOCUMENT` ne portent pas d'offsets parcourables.
- `exclude_ids` est la clé pour éviter de reboucler sur les mêmes chunks.
- Sur Postgres avec pgvector < 0.8, `exclude_ids` peut renvoyer moins de `top_k` résultats.
- Le serveur MCP HTTP n'a **pas d'authentification intégrée** documentée : le placer derrière sa propre authentification en production.
- L'ingestion par MCP passe par une étape d'**approbation** dans Vibe.

**Search Toolkit, ingestion**
- **Piège de dimensions** : le défaut de `MistralEmbedder.model_name` est `MODEL_128_EMBEDDING` (128 dimensions), alors que les schémas d'exemple utilisent `MISTRAL_EMBED_DIM_1024`. Plusieurs exemples instancient `MistralEmbedder(client=…)` sans `model_name` (quickstart OCR, Agentic Search), ce qui produit des vecteurs incompatibles avec un schéma 1024 si le défaut est bien 128. Le schéma rejette les vecteurs de mauvaise taille.
- **Idempotence par identité** : changer `source_id` (par exemple en déplaçant un fichier sans fixer `source_id`) crée de **nouveaux** IDs, donc des doublons potentiels.
- Les métadonnées sont **immuables** : toujours passer par `model_copy(update=…)`.
- Une clé de métadonnée ne peut pas porter le nom d'un champ du modèle (`source_id`…).
- **`PyMuPDFExtractor` sur un scan** renvoie une **sortie vide, sans erreur**. **`SmartPDFExtractor`** peut indexer du **charabia** pour des PDF à encodage CID sans `ToUnicode`.
- `SmartPDFExtractor` avec des documents passés par référence : sans `bytes_loader`, **tout part en OCR** (coût).
- `LegacyOfficeExtractor` ne gère pas `.xls`.
- `HTMLExtractor` : sans l'extra `html-converter-markdownify`, il faut fournir un convertisseur. `ignore_classes` attend des **regex**, `ignore_ids` des chaînes littérales.
- `MarkdownTextSplitter` exige l'extra **`text-splitter-langchain`**. Le quickstart n'installe que `[vespa]` mais l'utilise dans la section OCR.
- Le `RoutedPipeline` ne route que vers les protocoles pour lesquels un pipeline est fourni dans le dictionnaire (inférence : comportement pour un protocole absent non documenté).
- **`SummaryEnricher`** : `propagate_summary_to_chunks=False` par défaut ; seul un chunk `summary` dédié est ajouté. `overflow_strategy=TRUNCATE` par défaut : les documents de plus de 32 768 caractères sont **résumés sur leur début seulement**, sauf en `MAP_REDUCE`.
- `ChunkEnricher` : concurrence de 10 par défaut ; l'augmenter pour des API externes lentes.

**Search Toolkit, retrieval**
- `KeywordRetriever` **ne fonctionne pas** avec les backends Vespa et Postgres intégrés (pas de `KeywordStoreIndex`). L'hybride s'obtient via `VectorRetriever`, qui envoie texte et vecteur.
- `RRFRanker` : `rrf_k=60` par défaut, contre `rrf_k=4` dans `PostgresSearchQuery`. Deux défauts très différents pour le même concept.
- `LLMReRanker` coûte cher : le placer **en dernier** dans la chaîne.
- `CrossEncoderReRanker` exige un **service de modèle externe** à héberger soi-même (`base_url`), timeout 300 s.
- **Cache sémantique** : un hit renvoie les résultats d'une requête **proche mais différente**. Un seuil trop bas peut servir une réponse inadaptée. Le cache ne se vide pas automatiquement quand l'index change : invalider (`invalidate`, `clear`) ou utiliser un TTL (inférence d'après l'API).
- Le `dim` du cache doit correspondre à l'embedder.

**Vespa**
- Le nom d'application est **a–z uniquement** ; le nom de schéma accepte minuscules et `_`.
- **Migrations en ajout seul** : ne jamais modifier une migration existante.
- **Renommer le cluster de contenu détruit les données** : `set_content_id` existe pour l'éviter.
- La suppression de schéma est **refusée par défaut** ; `allow_schema_removal(until=…)` lève ce refus temporairement.
- Changer le type d'un champ provoque une **perte de données**. Changer son indexation déclenche une réindexation en arrière-plan.
- Les poids de ranking démarrent à **0** : sans poids non nul, pas de ranking effectif.
- `local down` **supprime les volumes**, donc les données locales.
- Deux classes `QueryProfile` homonymes : migration (`…app.schemas.query_profile`) et requête (`…plugins.vespa.search`).
- `vespa.lock` ne sert jamais au déploiement.
- Flags `--k8s-*` et `set_distribute_across_groups` dépréciés : utiliser la topologie.

**Postgres**
- Le plugin ne crée jamais les extensions ; `pg_textsearch` doit être **préchargé**, ce qui implique un redémarrage.
- Pas d'isolation de tenant (pas de `group_id` ni de `yql_filter`) : une collection par tenant.
- Le repli silencieux en vectoriel si le BM25 est indisponible (log `ERROR`) peut masquer une régression de pertinence. Surveiller `lexical_ranking_resolved`.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

**Libraries / API**
1. **Formats et tailles acceptés** pour l'upload dans une Library : aucune liste ni taille maximale dans les pages du périmètre ni dans la spec consultée. Seuls PDF, DOCX et PPTX sont cités pour l'OCR.
2. **Visibilité par défaut** : la spec dit à la fois « When first created this will only be accessible by you » et « `owner_type` … Defaults to 'Workspace' for API key sessions » (Library partagée avec le workspace). La doc parle des Libraries « de votre Workspace ».
3. **Statut** : la doc n'utilise que `processing_status` (`Running` / `Completed`), alors que la spec le déprécie au profit de `process_status` (8 valeurs, dont aucune n'est `Running` / `Completed`). La correspondance n'est pas documentée.
4. `org_id` est présenté comme paramètre de partage dans la doc et dans les signatures SDK, mais déprécié dans la spec.
5. **Spec** : `SharingDelete` liste `level` parmi les champs requis sans le déclarer en propriété ; la doc ne l'envoie pas à la suppression.
6. `generated_name` / `generated_description` sont présentés comme mis à jour automatiquement, mais dépréciés.
7. **Crawler** : pas d'endpoint public dans la spec, alors qu'il existe des événements d'audit `crawler.config.*` et `crawler.run.*`. Défauts non précisés pour Maximum Pages et Refresh Schedule ; syntaxe des « URL filter rules » non documentée.
8. Encadré `:::tip` : Libraries « créées dans Vibe » avec une URL `chat.mistral.ai`. La relation entre Vibe et `chat.mistral.ai` n'est pas expliquée dans le périmètre.
9. La doc mentionne en commentaire Python une URL signée « extracted_text » et « raw » sans donner le nom des méthodes SDK correspondantes. Côté REST : `signed-url`, `extracted-text-signed-url`.
10. Rôle exact de `attributes` sur les documents : filtrage de la recherche par l'outil `document_library` ? Non documenté. Le paramètre `filters_attributes` de la liste est déprécié.
11. « Agentic Search … works … in Libraries » : aucun détail sur l'activation ni sur le fonctionnement de la navigation dans l'outil `document_library` géré.

**Search Toolkit**
12. **Chemins d'import incohérents** :
    - `MistralEmbedder` depuis `mistralai.search.toolkit.embedders` (Agentic Search) contre `mistralai.search.toolkit.embedding` (partout ailleurs) ;
    - `VectorRetriever` depuis `mistralai.search.toolkit.retrieval` (Agentic Search) contre `…retrieval.retrievers`.
13. **Défaut de `MistralEmbedder.model_name`** = `MODEL_128_EMBEDDING`, alors que `MODEL_1024_EMBEDDING` est dit « default for Search Toolkit pipelines ». Plusieurs exemples omettent `model_name` avec un schéma 1024 (voir §7).
14. Quickstart : `MarkdownTextSplitterConfig(chunk_size=5048, …)` ; la valeur paraît être une coquille (4096 ailleurs).
15. **`app-dir`** : le CLI a pour défaut `./vespa_app`, l'anatomie parle de `vespa_app/migrations/`, le quickstart utilise `--app-dir ./vespa/migrations`, la starter app `src/search_app/migrations/`. L'objet `app` importé (`from vespa_app import app`) n'est défini nulle part dans le périmètre.
16. **Protocoles du `RoutedPipeline` contre extracteurs** :
    - `ocr` inclut EPUB, alors que `MistralOCRExtractor` liste PDF, DOCX, PPTX et ODT (EPUB relève de PyMuPDF) ;
    - `xlsx` = XLSX, XLS, ODS, alors que `SpreadsheetExtractor` couvre aussi XLSM, XLSB et ODF ;
    - aucun extracteur d'**images** n'est documenté pour le protocole `image` (Agentic Search dit « images use Mistral OCR »).
17. **Éléments listés mais non documentés** : `EmailWithAttachmentsExtractor`, `ParagraphTokenTextSplitter`, `MarkdownTokenTextSplitter`, extra `language-detection-fasttext` (usage inconnu), défauts de `SeparatorTextSplitterConfig`, options complètes de `NumbersExtractor` / `NumbersOptions`, `generate-topology` / `--topology-file`, `ca_cert_path`, contenu de `VectorSearchQuery` (hors `query`, `embedding`, `top_k`, `exclude_ids`, `max_candidates`), membres de `GrepMode` hors `PHRASE`.
18. **Loaders cloud** : la page Loaders installe des paquets séparés (`mistralai-search-toolkit-storage-s3`…), la page d'accueil des **extras** (`storage-s3`…). Les deux ne sont pas réconciliés.
19. **Modèle « page »** : la page Document model dit la représentation par pages **retirée**, mais `PlainTextExtractor` décrit encore « Each page becomes a document page with `page_number` metadata ».
20. **Coût du `LLMReRanker`** : la doc dit « 1 LLM call per chunk », mais décrit un LLM qui reçoit la requête et les chunks, et l'exemple de chaînage annonce « 10 LLM calls » alors que 50 chunks entrent dans le reranker.
21. **Préprocessing** : la page parle d'un paramètre `query_extension` (méthode `extend`), mais tous les exemples passent `LLMQueryExtension` à `query_rewriter`.
22. **`SummaryRequestOptions`** : on ne sait pas comment il est passé (probablement via `SummaryConfig`, inférence). Le paramètre `model` de `SummarizeRequestConfig` coexiste avec le modèle du `llm_provider`, sans règle de priorité donnée.
23. **Retrieval** : la page d'accueil n'annonce que « Vector (semantic) search with optional reranking », alors que la page Retrieval annonce vector, keyword (BM25) et hybride. En pratique, le keyword exige un store custom.
24. **Agentic Search** : les outils `open` et `navigate` prennent `source_id` et des offsets, alors que la page Custom vector stores dit que le modèle « keeps only an opaque `chunk_id` » résolu par le serveur. On ne sait pas lequel s'applique au serveur MCP.
25. **Santé Vespa** : le quickstart vérifie `19071/state/v1/health` (config server), la page Opérations `8080/ApplicationStatus`. Les deux sont complémentaires mais non expliqués.
26. **Cache** : le seuil est décrit comme « similarity > threshold » dans le fonctionnement, sans préciser si l'égalité compte. Le namespace par défaut utilisé par `CachedQueryEngine` n'est pas documenté (l'exemple invalide `"query_engine"`).
27. Le support de `exclude_ids` et `max_candidates` par le backend **Vespa** n'est pas documenté explicitement (il l'est pour Postgres). Même chose pour le filtrage par tenant Vespa (`group_id`, `yql_filter`), seulement mentionné en creux dans la page Postgres.
28. **Évaluation** : Search Toolkit se présente comme couvrant « ingestion, retrieval, and evaluation », mais aucune page du périmètre ne documente de composant d'évaluation.

---

## Annexe — Couverture

| Fichier (copie locale) | Source | Statut |
|---|---|---|
| `studio/search/agentic-search.md` | https://docs.mistral.ai/studio/search/agentic-search.md | ✅ lu en entier |
| `studio/search/libraries.md` | https://docs.mistral.ai/studio/search/libraries.md | ✅ lu en entier |
| `studio/search/search-toolkit.md` | https://docs.mistral.ai/studio/search/search-toolkit.md | ✅ lu en entier |
| `search-toolkit/concepts/document-model.md` | https://docs.mistral.ai/studio/search/search-toolkit/concepts/document-model.md | ✅ lu en entier |
| `search-toolkit/concepts/embedding-model.md` | https://docs.mistral.ai/studio/search/search-toolkit/concepts/embedding-model.md | ✅ lu en entier |
| `search-toolkit/ingestion.md` | https://docs.mistral.ai/studio/search/search-toolkit/ingestion.md | ✅ lu en entier |
| `search-toolkit/ingestion/embedders.md` | https://docs.mistral.ai/studio/search/search-toolkit/ingestion/embedders.md | ✅ lu en entier |
| `search-toolkit/ingestion/enrichers.md` | https://docs.mistral.ai/studio/search/search-toolkit/ingestion/enrichers.md | ✅ lu en entier |
| `search-toolkit/ingestion/extractors.md` | https://docs.mistral.ai/studio/search/search-toolkit/ingestion/extractors.md | ✅ lu en entier |
| `search-toolkit/ingestion/loaders.md` | https://docs.mistral.ai/studio/search/search-toolkit/ingestion/loaders.md | ✅ lu en entier |
| `search-toolkit/ingestion/splitters.md` | https://docs.mistral.ai/studio/search/search-toolkit/ingestion/splitters.md | ✅ lu en entier |
| `search-toolkit/quickstart.md` | https://docs.mistral.ai/studio/search/search-toolkit/quickstart.md | ✅ lu en entier |
| `search-toolkit/retrieval.md` | https://docs.mistral.ai/studio/search/search-toolkit/retrieval.md | ✅ lu en entier |
| `search-toolkit/retrieval/preprocessing.md` | https://docs.mistral.ai/studio/search/search-toolkit/retrieval/preprocessing.md | ✅ lu en entier |
| `search-toolkit/retrieval/rerankers.md` | https://docs.mistral.ai/studio/search/search-toolkit/retrieval/rerankers.md | ✅ lu en entier |
| `search-toolkit/retrieval/retrievers.md` | https://docs.mistral.ai/studio/search/search-toolkit/retrieval/retrievers.md | ✅ lu en entier |
| `search-toolkit/retrieval/semantic-cache.md` | https://docs.mistral.ai/studio/search/search-toolkit/retrieval/semantic-cache.md | ✅ lu en entier |
| `search-toolkit/search-index.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index.md | ✅ lu en entier |
| `search-toolkit/search-index/custom-vector-stores.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/custom-vector-stores.md | ✅ lu en entier |
| `search-toolkit/search-index/postgres.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/postgres.md | ✅ lu en entier |
| `search-toolkit/search-index/qdrant.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/qdrant.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/anatomy.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/anatomy.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/cli.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/cli.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/local-development.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/local-development.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/migration-helpers.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/migration-helpers.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/migrations.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/migrations.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/operations.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/operations.md | ✅ lu en entier |
| `search-toolkit/search-index/vespa/query-profiles.md` | https://docs.mistral.ai/studio/search/search-toolkit/search-index/vespa/query-profiles.md | ✅ lu en entier |

Complément : la spec OpenAPI locale (`openapi.yaml`) a été consultée par recherches ciblées. Ont été vérifiés : les 20 opérations `/v1/libraries*` ; les schémas `Library`, `Document`, `CreateLibraryRequest`, `UpdateLibraryRequest`, `UpdateDocumentRequest`, `ListLibrariesResponse`, `ListDocumentsResponse`, `PaginationInfo`, `ProcessingStatus`, `ProcessStatus`, `DocumentTextContent`, `SharingRequest`, `SharingDelete`, `Sharing`, `ShareEnum`, `EntityType`, `DocumentLibraryTool`, `ToolConfiguration`, `ConversationUsageInfo` ; les enums `UsageType`, `TargetType` et `AuditLogEventType` pour les entrées library et crawler. Les informations qui viennent uniquement de la spec sont signalées « (spec) » dans le texte.
