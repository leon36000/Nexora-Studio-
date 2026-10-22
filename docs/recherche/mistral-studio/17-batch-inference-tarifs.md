# 17 — Batch, inférence, tarification et choix des modèles

> **Périmètre** : Batch API (traitement asynchrone), page d'accueil « Inference », modèles Labs, politique de cycle de vie des modèles, Priority Tier, inférence régionale, paramètres d'échantillonnage (sampling), guide de prompting, grille tarifaire de l'API, guide de sélection de modèle · **Sources** : 10 pages de docs.mistral.ai (copie du 21/10/2026), plus vérifications ciblées dans la spec OpenAPI locale et, pour l'annexe A uniquement, les fiches modèles locales (hors fichiers assignés) · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Batch API (traitement par lots)
   - 3.2 Labs
   - 3.3 Cycle de vie des modèles
   - 3.4 Priority Tier
   - 3.5 Inférence régionale
   - 3.6 Sampling (paramètres d'échantillonnage)
   - 3.7 Prompting
   - 3.8 Tarification : grille complète et modificateurs
   - 3.9 Guide de sélection de modèle
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe A — Tarifs et cycle de vie de tous les modèles (fiches modèles, hors périmètre)
- Annexe B — Prix dérivés par niveau de service (calcul, inférence)
- Annexe — Couverture

---

## 1. En bref

- **Batch API** : inférence **asynchrone** sur de gros volumes, avec une **remise de 50 %**. Un lot (batch) est une liste de requêtes `{custom_id, body}`, envoyée soit sous forme de **fichier JSONL** (jusqu'à **1 million** de requêtes), soit **en ligne** dans la requête de création (« inline batching », **moins de 10 000** requêtes). Il y a **un seul modèle et un seul endpoint par job**. Neuf endpoints sont compatibles (chat, FIM, embeddings, modération, OCR, classification, conversations, transcription audio). Sept statuts sont possibles : `QUEUED` → `RUNNING` → `SUCCESS` / `FAILED` / `TIMEOUT_EXCEEDED`, ou `CANCELLATION_REQUESTED` → `CANCELLED`. Le délai d'expiration par défaut est de 24 h, avec un maximum de 7 jours (`timeout_hours`). Les résultats sont téléchargeables via l'API Files et **n'expirent pas**.
- **Interface** : Studio › Files (`console.mistral.ai/build/files`, purpose « Batch Processing ») et Studio › Batches (`console.mistral.ai/build/batches`) permettent de lancer un batch sans écrire de code.
- **Labs** : modèles expérimentaux préfixés `labs-`, **gratuits**, mis à jour silencieusement, sans opt-out de la collecte de données. Ils sont **déconseillés en production** et peuvent être dépréciés avec 1 mois de préavis.
- **Cycle de vie** : 5 étapes (Labs → Public Preview → General Availability → Deprecated → Retired). Les modèles GA ne reçoivent pas de mise à jour silencieuse et bénéficient d'un **préavis de dépréciation de 6 mois** ; ce préavis est d'1 mois pour Labs, Public Preview et les modèles tiers. Après le retrait, toute requête renvoie une erreur **`404`**. Trois formats d'alias existent : `-latest`, `-major` et `-major-minor`.
- **Priority Tier** : file d'attente prioritaire, sur contrat (« account executive »). Elle s'active avec le paramètre `service_tier: "auto"` ; la valeur par défaut est `standard_only`. En cas de dépassement, la requête **retombe en Standard Tier**. Le prix vaut **1,75× le tarif standard**, appliqué après la remise de cache. Il s'agit du **seul niveau avec SLA (99,5 %)**.
- **Inférence régionale** : endpoints dédiés `api.eu.mistral.ai` (UE + AELE) et `api.us.mistral.ai`, facturés **1,1× le tarif standard**. Seul l'outil **function calling** y est disponible : **pas d'Agents, pas de Batch, pas de Files API**. Le plan de contrôle (control plane) n'est pas régionalisé.
- **Sampling** : la page documente `n`, `temperature`, `top_p`, `presence_penalty` et `frequency_penalty` (ces deux pénalités vont de −2 à 2, défaut 0). Avec `n`, les tokens d'entrée ne sont facturés qu'une fois. `mistral-large-2512` ne supporte pas `n`.
- **Tarifs** : la grille publique liste 18 modèles, répartis en 4 catégories : « Flagship » (7), « Specialized » (8), « Third-party hosted » (1) et « Code » (2). Le guide de sélection ajoute les prix de 4 autres modèles. Les unités sont `/M Tokens`, `/M Chars`, `/Min` et `/1000 Pages`. **Aucun prix d'outil** (web search, code interpreter, connecteurs, bibliothèques…) ne figure dans la copie locale (voir §8).
- **Guide de sélection** : un tableau comparatif de 27 modèles avec notes de vitesse et de performance (0–5), modalités, contexte, prix et licence.

---

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| Batch / batch job | Job asynchrone qui exécute une liste de requêtes API sur un endpoint et un modèle donnés, à −50 %. |
| Batch file / input file | Fichier `.jsonl` (une requête JSON par ligne), téléversé avec `purpose="batch"`. |
| `custom_id` | Identifiant libre fourni par l'utilisateur pour chaque requête du lot. Il est recopié dans la ligne de résultat pour faire la correspondance. |
| `body` | Corps de requête brut, identique à celui de l'endpoint cible appelé hors batch. |
| File batching | Mode standard : les requêtes sont dans un ou plusieurs fichiers (`input_files`), jusqu'à 1 M de requêtes. |
| Inline batching | Mode « en ligne » : les requêtes sont passées directement dans `requests` à la création du job (< 10 000). Il est sorti le 2026-01-19 d'après le changelog. |
| Pending requests | Requêtes soumises mais pas encore traitées. Le plafond est de 1 M par workspace. |
| `output_file` / `error_file` | IDs (UUID) des fichiers de résultats et d'erreurs produits par le job. |
| `timeout_hours` | Durée après laquelle un job non terminé expire (statut `TIMEOUT_EXCEEDED`). |
| Labs | Modèles expérimentaux, gratuits, temporaires, préfixés `labs-`. |
| Public Preview | Lancement public pas encore final, au prix GA, avec mises à jour silencieuses possibles. |
| General Availability (GA) | Modèle stable de production, sans mise à jour silencieuse. |
| Deprecated / Retired | Retrait annoncé (le modèle reste accessible) / retrait effectif (erreur `404`). |
| Silent update | Modification du comportement d'un modèle sans changement d'identifiant. |
| Alias (`-latest`, `-major`, `-major-minor`) | Nom qui pointe vers une version. Seul `-major-minor` est figé. |
| Standard Tier | Niveau de service par défaut, en routage « best-effort ». |
| Priority Tier | File prioritaire, à limites personnalisées par modèle, avec SLA de 99,5 %. |
| `service_tier` | Paramètre de requête (`auto`, `standard_only`) et champ de réponse dans `usage` (`priority`, `standard`). |
| Fallback | Bascule automatique d'une requête `auto` vers le Standard Tier quand le Priority Tier n'est pas disponible. |
| Regional inference | Exécution du modèle sur une infrastructure située dans une géographie choisie (UE ou US). |
| Global endpoint | `api.mistral.ai`, sans engagement sur le lieu d'inférence. |
| Control plane | Plan de contrôle (configuration de compte, clés API, facturation, accès, analytics, métadonnées), **non régionalisé**. |
| ZDR (Zero data retention) | Non-rétention du contenu des requêtes et réponses. Contrôle distinct de la régionalisation. |
| Sampling | Ensemble des paramètres qui gouvernent le tirage des tokens (`temperature`, `top_p`, pénalités, `n`). |
| System prompt / user prompt | Instructions générales fixées par le développeur / message de l'utilisateur pour l'interaction en cours. |
| Few-shot / zero-shot | Prompt avec exemples d'échanges / sans exemple. |
| Structured outputs | Sortie JSON forcée via `response_format` (`json_object` ou `json_schema`). |
| LLM chaining | Enchaînement de plusieurs appels LLM, où la sortie de l'un sert d'entrée au suivant. |
| Cached input | Tokens d'entrée servis depuis le cache de prompt, facturés à prix réduit (jusqu'à −90 %). |
| Speed / Performance rating | Notes de 0 à 5 du guide de sélection de modèle. |
| Premier / Open | Type de modèle : propriétaire / à poids ouverts (colonne « Type »). |
| Generalist / Specialist | Modèle généraliste / spécialisé (OCR, audio, embeddings, modération, séries temporelles…). |

---

## 3. Fonctionnalités en détail

### 3.1 Batch API (traitement par lots)

Source : `studio/batch-processing.md`.

#### 3.1.1 Principe

- Le batch sert à exécuter de l'**inférence asynchrone** sur de grandes entrées, **en parallèle**, avec une **remise de 50 %**.
- Il vise les tâches à fort débit mais peu sensibles à la latence ou à la priorité.
- La FAQ indique :
  - le batch est disponible « pour tous les modèles » ;
  - il **n'affecte pas les rate limits** ;
  - il n'y a **pas de nombre maximal de jobs** ;
  - les jobs sont **propres à un workspace** : on voit tous les batches et résultats créés dans le workspace associé à la clé API ;
  - les résultats **n'expirent pas** « at this time » ;
  - un batch **peut légèrement dépasser la limite de dépense** (spend limit) du workspace, en raison du débit élevé et du traitement concurrent.
- La vitesse de traitement « peut être ajustée selon la demande et le volume ». Les résultats ne sont **accessibles qu'une fois tout le lot terminé**.
- Le tableau comparatif du Priority Tier précise : traitement « over a 24-hour period », file « Batch queue », disponibilité « Global », pas de SLA, fiabilité « High ».

#### 3.1.2 Format d'entrée (JSONL)

Chaque ligne du fichier est un objet JSON valide, **sans retour à la ligne interne**.

| Champ | Type | Obligatoire | Rôle |
|---|---|---|---|
| `custom_id` | string | Oui d'après la doc ; nullable dans la spec (`BatchRequest.custom_id: string \| null`) | ID unique, renvoyé tel quel dans le résultat. |
| `body` | objet | Oui (seul champ `required` dans la spec) | Requête brute de l'endpoint cible. Toute requête valide pour cet endpoint est acceptée. |
| `body.model` | string | Non | « Optionnel quand on spécifie le modèle à la création du job ». La section « Explanation » dit que le modèle est fourni *uniquement* à la création du job. |

Forme minimale :

```jsonl
{"custom_id": "0", "body": {"model": "mistral-small-latest", "max_tokens": 100, "messages": [{"role": "user", "content": "What is the best French cheese?"}]}}
{"custom_id": "1", "body": {"max_tokens": 512, "temperature": 0.2, "messages": [{"role": "user", "content": "What is the best French wine?"}]}}
```

- Chaque ligne peut avoir ses propres paramètres : `max_tokens`, `temperature`, etc. varient d'une ligne à l'autre dans les exemples.
- Un même fichier peut être relancé avec un autre modèle pour comparer les sorties : « run multiple batches on the same files with different models ».

#### 3.1.3 Endpoints compatibles et exemples par endpoint

Liste officielle de la doc (paramètre `endpoint`) : `/v1/embeddings`, `/v1/chat/completions`, `/v1/fim/completions`, `/v1/moderations`, `/v1/chat/moderations`, `/v1/ocr`, `/v1/classifications`, `/v1/conversations`, `/v1/audio/transcriptions`. L'enum `ApiEndpoint` de la spec OpenAPI ajoute **`/v1/chat/classifications`**, soit 10 valeurs.

La doc donne six exemples complets, chacun avec un fichier d'entrée, un fichier de résultat et une explication commentée :

| Onglet doc | Endpoint | Modèle d'exemple | Champs de `body` illustrés | Forme du `response.body` |
|---|---|---|---|---|
| Chat Completion | `v1/chat/completions` | `ministral-3b-latest` | `max_tokens`, `temperature`, `messages[{role, content}]` | `{id, object: "chat.completion", model, usage{prompt_tokens, completion_tokens, total_tokens}, created, choices[{index, finish_reason, message{role, content, tool_calls}}]}` |
| Structured Outputs | `v1/chat/completions` | `ministral-3b-latest` | `messages`, `response_format{type: "json_schema", json_schema{schema, name, strict: true}}`, `max_tokens`, `temperature: 0` | Identique au chat ; `content` contient le JSON sous forme de chaîne (ex. `"{\"result\": 2}"`). |
| Embeddings | `v1/embeddings` | `mistral-embed` | `input` : chaîne **ou** tableau de chaînes | `{id, object: "list", model, usage{prompt_tokens, completion_tokens: 0, total_tokens, prompt_audio_seconds, prompt_token_details, request_count}, data[{object: "embedding", embedding[…], index}]}` |
| OCR | `v1/ocr` | `mistral-ocr-latest` | `document{document_url}` (PDF ou image par URL) ou `document{image_url: "data:image/jpeg;base64,…"}` | `{pages[{index, markdown, images[], dimensions{dpi, height, width}}], model, usage_info{pages_processed, doc_size_bytes}, document_annotation}` |
| Annotations (OCR) | `v1/ocr` | `mistral-ocr-latest` | `document`, `bbox_annotation_format`, `document_annotation_format` (tous deux `{type: "json_schema", json_schema{…}}`), `pages: [0,…,7]` | Comme l'OCR, plus `images[{id, top_left_x, top_left_y, bottom_right_x, bottom_right_y, image_base64, image_annotation}]` (JSON en chaîne) et `document_annotation` (JSON en chaîne). |
| Transcriptions | `v1/audio/transcriptions` | `voxtral-mini-latest` | `file_url` (ou `file_id`, d'après le commentaire) | `{model, text, usage{prompt_tokens, completion_tokens, total_tokens, prompt_audio_seconds}, language, segments[], finish_reason: null}` |

Remarques tirées des exemples :

- **Chat** : quand `max_tokens` est atteint, `finish_reason` vaut `"length"`, sinon `"stop"`.
- **Structured outputs** : le commentaire de la doc recommande `strict: true` (« always recommended »). Il affirme aussi qu'on peut mettre `"json_mode"` comme `type` pour le mode JSON simple ; la page Prompting utilise au contraire `{"type": "json_object"}` (voir §8). Les trois schémas d'exemple sont `Math` (`result: integer`), `Wine` (`name`, `region`, `year`) et `Book` (`name`, `authors[]`), tous avec `additionalProperties: false`.
- **Embeddings** : un tableau d'entrées produit plusieurs objets `embedding` indexés.
- **OCR** : dans l'exemple OCR simple, le résultat indique `"model": "mistral-ocr-2505-completion"` alors que le job a été lancé avec `mistral-ocr-latest`. Dans l'exemple Annotations, il indique `"mistral-ocr-latest"`. L'exemple arXiv donne `pages_processed: 24` et `doc_size_bytes: 12640953`. `image_base64` vaut `null` dans tous les exemples.
- **Annotations** : un encadré `:::note` affirme que « **toutes les fonctionnalités Document AI sont disponibles via Batching** ». Un exemple de bout en bout existe sur GitHub (`client-python/examples/mistral/jobs/async_jobs_ocr_batch_annotation.py`). Avec `pages: [0..7]`, `pages_processed` vaut 8. Les `image_annotation` d'exemple suivent le schéma `BBOXAnnotation` (`document_type`, `short_description`, `summary`), avec des valeurs comme « Image », « Chart » ou « Diagram ».
- **Transcriptions** : `total_tokens` est très supérieur à `prompt_tokens + completion_tokens` (ex. 4 + 29 → 408 pour 11 s d'audio ; 4 + 634 → 3263 pour 203 s). Les tokens audio semblent comptés dans le total (inférence). `segments` est vide et `language` vaut `"en"`.

#### 3.1.4 Format de sortie (fichier de résultats JSONL)

Une ligne par requête :

| Champ | Exemple | Rôle |
|---|---|---|
| `id` | `batch-cd0da3ab-1-377e2e82-…` | ID de la requête dans le batch. Le format observé est `batch-<8 hex>-<n° d'ordre à partir de 1>-<uuid>` (inférence d'après les exemples). |
| `custom_id` | `"0"` | Recopie de l'ID fourni en entrée. |
| `response.status_code` | `200` | Code HTTP qu'aurait renvoyé l'endpoint. |
| `response.body` | objet | Réponse complète de l'endpoint, dans sa forme native. |
| `error` | `null` | Erreur éventuelle pour cette ligne. |

Le job expose aussi `error_file`, un fichier distinct pour les requêtes en échec, téléchargé à part dans l'exemple de bout en bout. Sa structure n'est pas décrite dans la doc. Le job contient également un tableau `errors[]` de `BatchError{message, count (défaut 1)}` d'après la spec.

#### 3.1.5 Téléversement du fichier

Deux voies sont possibles :

- **A. Via Studio**
  - Téléverser le fichier dans **Files** (`https://console.mistral.ai/build/files`) en réglant `purpose` sur « Batch Processing ».
  - Créer et démarrer le job dans **Batches** (`https://console.mistral.ai/build/batches`) en fournissant `files`, `endpoint` et `model`.
  - Aucun appel API n'est nécessaire.
- **B. Via l'API** : `POST /v1/files` en multipart, avec `purpose="batch"` et `file=@batch_input_file.jsonl`.
  - Python : `client.files.upload(file={"file_name": "test.jsonl", "content": open(..., "rb")}, purpose="batch")`.
  - TypeScript : `client.files.upload({ file: { fileName, content }, purpose: "batch" })`.
  - L'enum `FilePurpose` de la spec contient `fine-tune`, `batch`, `ocr` et `agentic_safety`. L'enum `SampleType` prévoit `batch_request`, `batch_result` et `batch_error`.

#### 3.1.6 Création d'un job

Endpoint : `POST /v1/batch/jobs`. Le job est mis en file (« queued »).

| Paramètre | Type | Défaut | Valeurs / contraintes | Effet |
|---|---|---|---|---|
| `input_files` | liste d'UUID | — | Fichiers `.jsonl` téléversés avec `purpose=batch` | Mode « file batching » (jusqu'à 1 M de requêtes). |
| `requests` | liste de `BatchRequest{custom_id, body}` | — | `maxItems: 10000` (spec) ; « fewer than 10,000 » (doc) | Mode « inline batching ». |
| `endpoint` | enum `ApiEndpoint` | — | Voir §3.1.3 ; **seul champ requis** dans la spec | Endpoint appliqué à toutes les lignes. |
| `model` | string \| null | — | Un **seul modèle par batch** (ex. `codestral-latest`, `mistral-small-latest`) | Modèle utilisé pour toutes les lignes. |
| `agent_id` | string \| null | — | — | Spec uniquement : permet d'utiliser un agent de l'**API Agents dépréciée** pour l'inférence batch. Absent de la page doc. |
| `metadata` | objet clé → string \| null | — | Clés de 1 à 32 caractères, valeurs string de 1 à 512 caractères (spec) | Métadonnées libres, filtrables à la liste (ex. `{"job_type": "testing"}`). |
| `timeout_hours` | integer | **24** | Doc : « should be lower than 7 days » ; spec : `minimum 1`, `maximum 168` | Le job expire si le traitement n'est pas fini dans le délai. |

Il faut fournir soit `input_files`, soit `requests` : la doc présente les deux options comme alternatives. Le cas où l'on fournirait les deux n'est pas documenté.

Exemple (file batching, curl) :

```bash
curl https://api.mistral.ai/v1/batch/jobs -H "Authorization: Bearer $MISTRAL_API_KEY" \
  -H "Content-Type: application/json" -d '{
    "model": "mistral-small-latest", "input_files": ["<uuid>"],
    "endpoint": "/v1/chat/completions", "metadata": {"job_type": "testing"} }'
```

En inline batching, on remplace `input_files` par `"requests": [{"custom_id": "0", "body": {...}}, ...]`. En Python, cette fonction **n'existe pas dans le SDK V1** (`mistralai 1.x`) : il faut le SDK V2 (`pip install "mistralai>=2"`) ; un guide de migration est disponible sur `docs.mistral.ai/resources/migration-guides`.

#### 3.1.7 Cycle de vie et statuts

| Statut | Signification |
|---|---|
| `QUEUED` | Job créé, en file d'attente. |
| `RUNNING` | Traitement en cours. |
| `SUCCESS` | Terminé. |
| `FAILED` | Échec. |
| `TIMEOUT_EXCEEDED` | Le traitement n'était pas fini avant `timeout_hours`. |
| `CANCELLATION_REQUESTED` | Annulation demandée, pas encore effective. |
| `CANCELLED` | Annulé. |

- Transitions (inférence d'après les noms et l'exemple) : `QUEUED` → `RUNNING` → {`SUCCESS` | `FAILED` | `TIMEOUT_EXCEEDED`}. Une annulation fait passer par `CANCELLATION_REQUESTED` → `CANCELLED`.
- L'exemple de bout en bout boucle tant que le statut est dans `["QUEUED", "RUNNING"]`, en interrogeant toutes les secondes.
- Le comportement des résultats partiels en cas d'annulation ou de timeout n'est pas documenté : la doc dit seulement que les résultats ne sont accessibles qu'à la fin du lot.

#### 3.1.8 Objet `BatchJob` (spec OpenAPI)

| Champ | Type | Notes |
|---|---|---|
| `id` | string | UUID du job. |
| `object` | `"batch"` | Constante. |
| `input_files` | UUID[] | Requis. |
| `metadata` | objet \| null | — |
| `endpoint` | string | Requis. |
| `model` | string \| null | — |
| `agent_id` | string \| null | — |
| `output_file` | UUID \| null | Fichier de résultats. |
| `error_file` | UUID \| null | Fichier d'erreurs. |
| `errors` | `BatchError[]` | Requis ; `{message, count}`. |
| `outputs` | objet[] \| null | Résultats en ligne (lié au paramètre `inline` du GET ; non documenté dans la page). |
| `status` | `BatchJobStatus` | Voir §3.1.7. |
| `created_at` | integer | Timestamp. L'exemple calcule `completed_at - created_at` en secondes. |
| `started_at`, `completed_at` | integer \| null | — |
| `total_requests`, `completed_requests`, `succeeded_requests`, `failed_requests` | integer | Compteurs de progression. L'exemple affiche « Percent done » = (succeeded + failed) / total. |

#### 3.1.9 Suivi, liste, résultats, annulation

| Opération | REST | Python | TypeScript |
|---|---|---|---|
| Détail d'un job | `GET /v1/batch/jobs/{job_id}` (spec : query `inline` booléen, « return results inline in the response ») | `client.batch.jobs.get(job_id=...)` | `client.batch.jobs.get({ jobId })` |
| Liste | `GET /v1/batch/jobs?status=RUNNING` | `client.batch.jobs.list(status="RUNNING", metadata={...})` | `client.batch.jobs.list({ status, metadata })` |
| Téléchargement des résultats | `GET /v1/files/{uuid}/content` | `client.files.download(file_id=job.output_file)`, puis `.read()` ou itération sur `.stream` | `client.files.download({ fileId: job.outputFile })` renvoie un flux à rediriger (`pipeTo`) vers un fichier |
| Annulation | `POST /v1/batch/jobs/{job_id}/cancel` | `client.batch.jobs.cancel(job_id=...)` | `mistral.batch.jobs.cancel({ jobId })` |
| Suppression (spec seulement) | `DELETE /v1/batch/jobs/{job_id}`, réponse `{id, object: "batch", deleted: true}` | — | — |

Filtres de liste. La doc ne cite que `status` et `metadata` ; la spec ajoute les autres :

| Paramètre | Type | Défaut | Valeurs |
|---|---|---|---|
| `page` | int | 0 | — |
| `page_size` | int | 100 | — |
| `model` | string | — | — |
| `agent_id` | string | — | — |
| `metadata` | objet | — | Clé/valeur personnalisée. |
| `created_after` | date-time | — | — |
| `created_by_me` | bool | `false` | — |
| `status` | `BatchJobStatus[]` | — | Les 7 statuts. |
| `order_by` | enum | `-created` | `created`, `-created` |

La réponse est de type `ListBatchJobsResponse{data: BatchJob[], object: "list", total}`.

#### 3.1.10 Exemple de bout en bout (résumé)

Le script fourni existe en deux versions, V1 et V2. Elles ne diffèrent que par l'import : `from mistralai import File, Mistral` contre `from mistralai.client import File, Mistral`. Il enchaîne les étapes suivantes :

1. Créer le client.
2. Générer N requêtes aléatoires : `custom_id = str(idx)`, `max_tokens` aléatoire entre 10 et 1000, contenu de 100 à 5000 lettres.
3. Écrire le tout dans un `BytesIO`, puis appeler `client.files.upload(file=File(file_name="file.jsonl", content=...), purpose="batch")`.
4. Appeler `client.batch.jobs.create(input_files=[id], model=..., endpoint="/v1/chat/completions", metadata={"job_type": "testing"})`.
5. Interroger `get` toutes les secondes et afficher les statistiques.
6. Télécharger `error_file` et `output_file`, chacun seulement s'il n'est pas `None`.

Valeurs par défaut des options CLI : `--num_samples 100`, `--success_path output.jsonl`, `--error_path error.jsonl`, `--model codestral-latest`.

#### 3.1.11 Limites et quotas du batch

| Limite | Valeur |
|---|---|
| Requêtes par fichier batch | Jusqu'à **1 000 000**. |
| Requêtes en attente par workspace | **1 000 000** maximum. Exemple de la doc : deux jobs de 600 000 ne peuvent pas être soumis en même temps ; il faut que le premier ait traité au moins 200 000 requêtes (il lui en reste alors 400 000 en attente). |
| Inline batching | < 10 000 requêtes (`maxItems: 10000` dans la spec). |
| Nombre de jobs | Pas de maximum. |
| Modèles par job | 1. |
| Endpoints par job | 1. |
| `timeout_hours` | Défaut 24 ; inférieur à 7 jours (1 à 168 dans la spec). |
| Rate limits | Non affectés par le batch. |
| Spend limit | Peut être légèrement dépassée. |
| Rétention des résultats | Pas d'expiration actuellement. |
| Régional | Batch **indisponible** sur les endpoints régionaux (fonction « stateful »). |
| Tarif | **−50 %**. |

### 3.2 Labs

Source : `inference/labs.md`.

- **Définition** : modèles **expérimentaux, qui évoluent vite**, disponibles pour une **durée limitée**, afin de recueillir les retours des développeurs et de la communauté.
- **Identification** : tag `Labs` sur la fiche modèle et préfixe **`labs-`** dans l'identifiant (ex. `labs-devstral-small-2512`).
- Ils sont mis à jour fréquemment, sujets à changement, et **peuvent être dépréciés ou retirés avec 1 mois de préavis**.
- Encadré `:::note` : usage entreprise des modèles Labs possible sur demande, via `https://mistral.ai/contact`.
- Encadré `:::note` : « We do not recommend using these models in production environments. »
- Les retours se font sur le Discord Mistral AI (`https://discord.gg/mistralai`), le subreddit `r/MistralAI` ou d'autres canaux.
- D'après la politique de cycle de vie (§3.3), les Labs sont **gratuits**, admettent des mises à jour silencieuses et **ne permettent pas l'opt-out de la collecte de données**.
- Le tableau des modèles Labs est **généré automatiquement depuis les fiches modèles** de type « Labs » (commentaire MDX). Il inclut les modèles dépréciés et retirés ; un modèle sans dates est disponible.

**Tableau des modèles Labs** (copie au 21/10/2026) :

| Modèle | API name | Statut affiché | Contexte | Résumé | Dépréciation | Retrait | Remplacement |
|---|---|---|---|---|---|---|---|
| Shieldstral 1.0 | — (vide) | Public Preview | 32k | Modèle de modération multimodal compact (classification de sûreté texte + image) | — | — | — |
| Leanstral 1.5 | `labs-leanstral-1-5` | Deprecated | 256k | Agent de code mis à jour pour l'ingénierie de preuves formelles Lean 4 et la démonstration automatique de théorèmes | 2026-09-29 | 2026-09-30 | — |
| Leanstral | `labs-leanstral-2603` | Retired | 256k | Agent de code open source pour Lean 4 | 2026-05-22 | 2026-06-30 | Leanstral 1.5 |
| Mistral Small Creative | `labs-mistral-small-creative` | Deprecated | 32k | Écriture créative et interaction avec des personnages | 2026-03-31 | 2026-04-30 | Ministral 3 8B |
| Devstral Small 2 | `labs-devstral-small-2512` | Deprecated | 256k | Usage d'outils pour explorer des bases de code, éditer plusieurs fichiers, agents de génie logiciel | 2026-02-27 | 2026-03-31 | Mistral Medium 3.5 |

---

### 3.3 Cycle de vie des modèles

Source : `inference/model-lifecycle.md`. La politique s'applique aux modèles de la **Mistral Serverless API**.

#### 3.3.1 Étapes

| Étape | Description | Mises à jour silencieuses |
|---|---|---|
| **Labs** | Expérimental, pas pour la production. | Oui |
| **Public Preview** | Quasi-final avant GA. | Oui |
| **General Availability** | Prêt pour la production, stable. | Non |
| **Deprecated** | Retrait annoncé ; accessible jusqu'à la date de retrait. | Non |
| **Retired** | Plus accessible. | Non |

Détail par étape :

- **Labs** :
  - préfixe `labs-` (ex. `labs-mistral-model-x-y`) ;
  - **gratuits** ;
  - mises à jour silencieuses à tout moment ;
  - **pas d'opt-out de la collecte de données** ;
  - déconseillés en production.
- **Public Preview** :
  - lancements publics non finaux, activement promus ;
  - **même prix que la GA** ;
  - mises à jour silencieuses autorisées ;
  - **aucune garantie de passage en GA** : le modèle peut être retiré avant.
- **General Availability** :
  - **aucune mise à jour silencieuse** ;
  - supportés jusqu'au retrait.

#### 3.3.2 Convention de nommage et alias

- Les identifiants suivent le format `model-name-major-minor` (ex. `mistral-medium-3-5`).

| Alias | Exemple | Pointe vers |
|---|---|---|
| `model-name-latest` | `mistral-medium-latest` | Dernière version, **toutes générations confondues** |
| `model-name-major` | `mistral-medium-3` | Dernière version mineure de cette génération majeure |
| `model-name-major-minor` | `mistral-medium-3-5` | Version majeure et mineure figées |

- Les Labs sont toujours préfixés `labs-`. Les Public Preview utilisent le format `major-minor`.
- Encadré `:::warning` : utiliser un alias peut exposer à des **mises à jour silencieuses de comportement et de prix**. Pour un contrôle précis, il faut épingler une version `major.minor`.
- Les anciens modèles (cf. annexe A) suivent un autre schéma, de type `AAMM` (ex. `mistral-small-2603`, `ministral-8b-2512`, `codestral-2508`). Les plus récents (`mistral-medium-3-5`, `mistral-large-4`, `mistral-ocr-4-1`, `voxtral-mini-transcribe-3-0`) suivent le nouveau schéma (observation).

#### 3.3.3 Politique de dépréciation

- La dépréciation est **annoncée dès qu'un modèle de remplacement est disponible**, que ce remplaçant soit en GA ou en Public Preview.

| Étape | Préavis |
|---|---|
| Labs | 1 mois |
| Public Preview | 1 mois |
| General Availability | **6 mois** |
| Modèles tiers (third-party) | 1 mois |

- Pendant la période de dépréciation, le modèle reste accessible. **Une fois retiré, toute requête vers ses identifiants échoue avec une erreur `404`.**

---

### 3.4 Priority Tier

Source : `inference/priority-tier.md`. Public visé : **administrateurs entreprise** qui planifient la capacité API, et développeurs qui ajoutent le routage prioritaire aux requêtes de complétion.

#### 3.4.1 Fonctionnement

- En période de forte charge, les requêtes éligibles passent par une **file prioritaire, avant le trafic Standard Tier**.
- Usage visé : charges **temps réel et critiques** nécessitant un accès prévisible aux modèles hébergés.
- Encadré `:::info` : le Priority Tier **nécessite une configuration de compte avec Mistral**. Il faut contacter son account executive ou son contact Mistral pour configurer des rate limits Priority **par modèle**.
- **Conditions d'éligibilité, toutes requises** :
  1. l'organisation dispose d'un droit (entitlement) Priority Tier actif ;
  2. le modèle est configuré pour le Priority Tier ;
  3. la requête respecte les limites Priority personnalisées pour ce modèle ;
  4. de la capacité Priority est disponible pour le modèle et la région de déploiement.
- Une requête non éligible peut quand même passer en Standard Tier, selon la valeur de `service_tier`.

#### 3.4.2 Comparatif des niveaux de service (tableau officiel)

| Critère | Batch | Standard Tier | Priority Tier |
|---|---|---|---|
| Cas d'usage | Traitement asynchrone, sans besoin de réponse temps réel | Traitement standard | Temps réel, critique |
| Latence | Mise en file pour traitement asynchrone | Secondes à minutes | Secondes |
| Routage | File batch | Best-effort | File prioritaire |
| Rate limits | Limites de traitement batch | Limites à l'usage ou limites standard personnalisées | Limites Priority personnalisées par modèle |
| Pics (bursting) | Requêtes mises en file et traitées sur 24 h | Comportement standard des rate limits | **Retombe en Standard** si les limites Priority sont dépassées |
| Disponibilité | Globale | Globale ou régionale selon endpoint et modèle | Globale ou régionale selon configuration du compte, modèle et capacité |
| SLA de disponibilité | Aucun | Aucun | **99,5 %** |
| Fiabilité | Élevée | Élevée à moyenne | Élevée |

#### 3.4.3 Paramètre `service_tier`

Le paramètre se pose dans le corps des requêtes de complétion supportées. D'après la spec, il existe sur `ChatCompletionRequest` et `AgentsCompletionRequest` via l'enum `RequestedServiceTier`.

| Valeur | Comportement |
|---|---|
| `auto` | Priority Tier si la requête est éligible, sinon Standard Tier. |
| `standard_only` | Standard Tier, **sans consommer** les limites Priority. |
| *(omis)* | Équivaut à `standard_only`. |

- Conseil (`:::tip`) : ne mettre `auto` que sur les requêtes qui doivent bénéficier du Priority Tier.
- SDK : `service_tier="auto"` en Python, `serviceTier: "auto"` en TypeScript. Les noms de champs peuvent varier selon le langage et la version ; si le SDK refuse le champ, il faut le mettre à jour ou appeler le REST directement.

#### 3.4.4 Vérifier le niveau ayant servi la requête

- L'objet `usage` de la réponse contient `service_tier`, qui vaut `priority` ou `standard`.
- Ce champ sert à confirmer l'usage du Priority Tier, à détecter les fallbacks et à surveiller les rétrogradations inattendues.
- Python : `response.usage.service_tier` ; TypeScript : `response.usage?.serviceTier`.

```json
{ "model": "mistral-medium-latest",
  "usage": { "prompt_tokens": 22, "completion_tokens": 70, "total_tokens": 92, "service_tier": "priority" } }
```

- Causes d'un `service_tier: standard` (FAQ) : limites Priority dépassées, modèle non éligible, droit absent, accès expiré, capacité indisponible.

#### 3.4.5 Mise en place

- **Prérequis** :
  - une clé API de l'organisation configurée ;
  - un accord ou une configuration Priority actifs ;
  - des limites Priority configurées pour chaque modèle cible ;
  - une version de SDK Python ou TypeScript qui supporte le champ ;
  - la confirmation de l'éligibilité du modèle.
- **Étapes d'accès** :
  1. contacter l'account executive ;
  2. partager les modèles cibles et le profil de trafic attendu ;
  3. attendre la configuration des limites par Mistral ;
  4. passer `service_tier` à `auto` ;
  5. vérifier le niveau servi dans `usage`.
- Les augmentations de capacité se coordonnent à l'avance et peuvent exiger un préavis (`:::note`).

#### 3.4.6 Quotas, limites, facturation

- Les limites sont **personnalisées et propres à chaque modèle** : requêtes par minute, tokens par minute ou autres limites convenues.
- En cas de dépassement avec `auto` : **fallback vers le Standard Tier, pas d'échec**.
- **Facturation** : multiplicateur de **1,75× le prix catalogue standard**, soit +75 % sur les tokens d'entrée, de sortie et en cache.
- Les requêtes Priority restent **pleinement éligibles aux remises de cache de prompt**, qui vont jusqu'à **90 % d'économie sur les tokens d'entrée en cache**. Le multiplicateur 1,75× s'applique **après** la remise de cache.
- Les requêtes servies en Priority sont facturées selon les conditions Priority du contrat. Celles qui retombent en Standard sont traitées comme du Standard.
- **Régional** : le Priority Tier peut être configuré pour du trafic global ou régional, selon l'accord, le modèle et la capacité.
- La spec contient les événements webhook `billing.priority_service_tier.updated` et `billing.priority_service_tier.removed`. L'objet `PriceData` de l'API d'usage admin a une dimension `service_tier` (`standard` | `priority`) et une dimension `api_zone` (`global` | `us` | `eu`).

---

### 3.5 Inférence régionale

Source : `inference/regional-inference.md`.

#### 3.5.1 Principe

- C'est un **service optionnel**, accessible via des **endpoints dédiés**. Il garantit que l'inférence est traitée par des systèmes situés dans une géographie choisie : **Union européenne** ou **États-Unis**.
- Cas d'usage :
  - exigences de **localisation des données** d'entrée et de sortie de l'inférence ;
  - **réduction de latence** quand les utilisateurs sont concentrés dans une région.
- L'inférence s'exécute sur une infrastructure GPU gérée par Mistral. L'endpoint régional détermine où a lieu le traitement ; l'API reste la même.
- Encadré `:::info` : facturation à **1,1× le prix catalogue standard** (+10 %) pour les tokens d'entrée, les tokens de sortie, les **lectures de cache** et les **écritures de cache**.
- Encadré `:::important` :
  - la régionalisation **ne régionalise pas le plan de contrôle** : configuration de compte, clés API, facturation, gestion des accès, analytics d'usage et autres métadonnées opérationnelles peuvent être traités hors de la géographie choisie ;
  - sans région spécifiée, l'API utilise l'endpoint global.

#### 3.5.2 Endpoints

| Endpoint | Région | Surcoût régional | Géographie | Quand l'utiliser |
|---|---|---|---|---|
| `api.mistral.ai` | Global | Non | Non spécifique | Pas de besoin de localisation. Mistral **ne s'engage pas** sur un lieu d'inférence. |
| `api.eu.mistral.ai` | EU | Oui | **Plusieurs datacenters dans des pays de l'UE et de l'AELE (EFTA)** | Traitement dans l'UE. |
| `api.us.mistral.ai` | US | Oui | Plusieurs datacenters aux États-Unis | Traitement aux États-Unis. |

#### 3.5.3 Limitations

- Si une charge dépend d'une fonctionnalité non supportée, **les garanties de traitement régional ne s'appliquent pas** à cette charge.
- **Outils** : seul le **function calling** est supporté en régional ; les autres tool calls ne le sont pas.
- **Fonctions stateful indisponibles** : **Agents, Batch, Files API**.
- **Modèles** : la disponibilité varie par région ; un endpoint régional ne sert que les modèles hébergés dans cette région. Les IDs de modèles sont les mêmes que sur l'API globale. Il faut vérifier la disponibilité avant d'envoyer du trafic de production, par exemple avec `models.list` sur l'URL régionale (`curl https://api.eu.mistral.ai/v1/models`).

#### 3.5.4 Configuration

| Méthode | Paramètre | Exemple |
|---|---|---|
| SDK **≥ 2.70** (Python, TS) | `server` | `Mistral(api_key=..., server="eu")` ; TS : `new Mistral({ apiKey, server: "eu" })` |
| SDK plus ancien | `server_url` | `Mistral(api_key=..., server_url="https://api.eu.mistral.ai/")` |
| REST | URL de base | `curl https://api.eu.mistral.ai/v1/chat/completions …` |

- Les exemples Python avec `server` importent `from mistralai.client import Mistral` (SDK V2) ; l'exemple « older SDK » importe `from mistralai import Mistral`.
- Seule la valeur `server="eu"` est montrée ; `"us"` est probable mais non illustré (inférence).

#### 3.5.5 Vérification et audit

- L'endpoint appelé est la **source de vérité** de la géographie de traitement demandée.
- Il est recommandé de journaliser, **pour chaque requête régionale** : le nom d'hôte de l'endpoint, la valeur `server` du SDK, l'ID du modèle, l'horodatage et l'identifiant de requête de la réponse.
- Derrière un proxy, une passerelle ou un outil d'observabilité, il faut conserver des logs montrant l'URL de base cible (`api.eu.mistral.ai` ou `api.us.mistral.ai`).

#### 3.5.6 Régional et ZDR

- Ce sont **deux contrôles distincts** : la régionalisation fixe **où** l'inférence est traitée ; la **Zero Data Retention** fixe **si** le contenu est conservé après traitement. Ils peuvent être nécessaires tous les deux. Renvoi : `/admin/monitor-comply/zero-data-retention`.

---

### 3.6 Sampling (paramètres d'échantillonnage)

Source : `inference/sampling.md`. Tous les exemples utilisent `ministral-3b-latest` et le prompt « What is the best mythical creature? Answer with a single word. ». Le code est montré pour le SDK V1 (`from mistralai import Mistral`) et V2 (`from mistralai.client import Mistral`).

#### 3.6.1 Tableau des paramètres

| Paramètre | Type | Défaut | Plage | Effet |
|---|---|---|---|---|
| `n` | int ≥ 1 | — | — | Nombre de complétions renvoyées par requête, dans `choices[]`. **Les tokens d'entrée ne sont facturés qu'une fois.** Il faut `temperature > 0` pour obtenir des sorties variées. **Non supporté par `mistral-large-2512`** (`:::note`). |
| `temperature` | float \| null | **Variable selon le modèle** (spec : à récupérer via `/models`) | Spec : 0 à 1,5 ; recommandation : 0,0 à 0,7 | Aplatit (valeur haute) ou accentue (valeur basse) la distribution softmax. À 0, on obtient un choix glouton (greedy). |
| `top_p` | float \| null | Non indiqué | Spec : ]0, 1] | Nucleus sampling : on ne garde que les tokens dont la probabilité cumulée atteint le seuil, puis on renormalise. Il est **appliqué après la température**. |
| `presence_penalty` | float | **0** | **[−2, 2]** | Pénalité **ponctuelle, additive**, appliquée à tout token déjà apparu au moins une fois. Favorise la variété. |
| `frequency_penalty` | float | **0** | **[−2, 2]** | Pénalité **cumulative**, proportionnelle au nombre d'occurrences du token. Effet plus fort sur les longues sorties. |

Paramètres présents dans `ChatCompletionRequest` (spec) mais **non traités par la page Sampling** :

- `random_seed` (int ≥ 0, sorties déterministes) ;
- `top_k` (int ≥ −1) ;
- `min_tokens` ;
- `repetition_penalty` (]0, 2]) ;
- `logprobs`, `top_logprobs`, `prompt_logprobs`, `top_prompt_logprobs` ;
- `stop`, `max_tokens`.

#### 3.6.2 Comportements et conseils documentés

- **Déterminisme à `temperature=0`** (`:::note`) : de **légères variations** restent possibles, dues aux différences matérielles et aux erreurs d'arrondi. Elles sont plus visibles quand les probabilités sont proches et sur les contextes ou sorties longs, où un seul token divergent change toute la suite.
- **Choix de la température** :
  - tâches **déterministes** (mathématiques, classification, santé, raisonnement) : valeurs très basses. Un agent de classification devrait utiliser 0 ; un assistant mathématique, une valeur très basse mais non nulle pour éviter les répétitions ;
  - tâches **créatives** (brainstorming, romans, slogans, jeu de rôle) : valeurs hautes, sans excès pour éviter les sorties absurdes.
- **Température et top_p** : il est difficile de régler les deux. Le conseil est d'**en fixer un et d'ajuster l'autre**. À `temperature=0`, `top_p` n'a pas d'effet.
- **Illustrations** :
  - avec `temperature=0.1, n=10`, on obtient 10 fois « Dragon » ;
  - avec `temperature=1`, on obtient un mélange de Dragon, Unicorn et Phoenix ;
  - avec `temperature=1, top_p=0.5`, seuls Unicorn et Dragon restent (2 tokens atteignent le seuil de 50 %).
  - Les graphiques (`/img/barplot.png`, `/img/top_barplot*.png`) sont faits avec Mistral 7B quantifié en 4 bits.
- **Pénalités** (prompt « List 10 possible titles for a fantasy book », `temperature=0`) :
  - avec `presence_penalty=2`, on obtient moins de tokens « The » ;
  - avec `frequency_penalty=2`, la sortie est plus variée, mais à partir du 7e élément les guillemets et la ponctuation sont aussi pénalisés (effet cumulatif).
  - Les pénalités peuvent avoir un fort impact, positif ou négatif, sur les longs contextes et les longues sorties. Elles aident à éviter les boucles répétitives.

---

### 3.7 Prompting

Source : `inference/prompting.md`. Un notebook Colab l'accompagne : `colab.research.google.com/github/mistralai/cookbook/blob/main/mistral/prompting/prompting_capabilities.ipynb`.

#### 3.7.1 Concepts principaux

| Concept | Contenu |
|---|---|
| System prompt | Rôle `system`, en début de conversation, géré par le développeur : contexte général et règles de comportement. |
| User prompt | Rôle `user`, pendant la conversation : contexte ou instructions pour l'interaction en cours. Si l'on ne contrôle pas le system prompt, on peut **concaténer** les instructions système et la requête dans un seul message `user` (`"system_prompt\n\nUser: user_prompt"`). |
| Purpose (« Roleplaying ») | Commencer par un rôle et une tâche concis : « You are a \<role\>, your task is to \<task\>. » |
| Structure | Organiser les instructions de façon hiérarchique (sections et sous-sections), claire et complète. Règle : écrire comme pour quelqu'un **sans aucun contexte préalable**. |
| Formatting | Utiliser du **Markdown et/ou des balises de style XML** : lisibles, faciles à parser, familières au modèle grâce à l'entraînement. |
| Example / few-shot prompting | Donner quelques exemples pour améliorer la compréhension, la précision et surtout le **format de sortie**. Variante few-shot : des tours `user`/`assistant` artificiels dans l'historique. Zero-shot : aucun exemple. |
| Structured outputs | Forcer un format JSON précis (renvoi vers `/studio/conversations/structured-output`), via `response_format` (`{"type": "json_object"}` ou un schéma JSON). |
| Itération | Les prompts doivent être réévalués quand le modèle change, même lors d'une simple mise à jour, comme on itère sur du code. |

#### 3.7.2 Ce qu'il faut éviter

- **Mots subjectifs ou flous** : « too long », « many », « few », « things », « interesting », « better ». Il faut donner des mesures objectives et définir les critères.
- **Contradictions** dans les longs system prompts. On les remplace par un **arbre de décision** (exemple : mise à jour d'enregistrements de base de données, avec des branches ignore / create / delete+create / update).
- **Faire compter des mots au LLM** : il vaut mieux fournir les longueurs en entrée (ex. `charCount`).
- **Générer trop de tokens** : les modèles ingèrent plus vite qu'ils ne génèrent. Il ne faut générer que le nécessaire, par exemple pas le contenu complet d'un enregistrement pour une opération `NO_OP`.
- **Échelles numériques** : préférer des **échelles verbales** (Very Low / Low / Neutral / Good / Very Good), convertibles en chiffres ensuite.

#### 3.7.3 Exemples fournis (4 capacités)

| Capacité | Cas | Techniques mises en avant |
|---|---|---|
| Classification | Bot de service client bancaire. Catégories `card_arrival`, `change_pin`, `exchange_rate`, `country_support`, `cancel_transfer`, `charge_dispute`, avec repli `customer_service`. | Deux stratégies : (1) **label direct**, en un seul terme composé (rapide et peu coûteux en tokens, mais moins fiable et moins flexible) ; (2) **sortie JSON** `{"category": …}` (fiable et flexible, un peu plus de tokens), forçable via `response_format`. |
| Summarization | Rapport sur un essai : résumé, puis 3 questions avec réponses (« Q: », « A: », réponse finale entre `<>`), puis rapport Markdown. | Instructions **étape par étape** (inspirées du chain-of-thought), génération d'exemples, consigne de format de sortie. |
| Personalization | Réponse e-mail d'un prêteur immobilier, à partir d'une liste de taux (APR). | **Fournir les faits** dans le prompt, de façon claire et concise. |
| Evaluation | Trois approches. | (1) **Score de confiance** dans une sortie JSON (`{"type": "json_object"}`) avec une **température plus élevée** pour diversifier les résumés ; (2) **étape d'évaluation** dans le même prompt ; (3) **un autre LLM évalue** (LLM chaining). Ce dernier point est fréquent en production, mais implique plus d'appels API et donc un coût plus élevé. |

---

### 3.8 Tarification : grille complète et modificateurs

Sources : `inference/pricing.md` (grille officielle), `inference/model-selection-guide.md` (prix complémentaires), `priority-tier.md`, `regional-inference.md`, `batch-processing.md`, `sampling.md` et `model-lifecycle.md` (modificateurs). Toutes les valeurs sont en **USD**. Unités : `/M Tokens` = par million de tokens ; `/M Chars` = par million de caractères ; `/Min` = par minute d'audio ; `/1000 Pages` = par millier de pages.

#### 3.8.1 Grille officielle (page « API pricing »)

**Flagship models** (sous-titre de la page : « Premier frontier models for the most demanding workloads ») :

| Modèle | API name | Entrée | Entrée en cache | Sortie |
|---|---|---|---|---|
| Mistral Large 4 | `mistral-large-4` | $1.36 /M tokens | **$0.14 /M tokens** | $4.18 /M tokens |
| Mistral Large 3 | `mistral-large-2512` | $0.5 /M tokens | — | $1.5 /M tokens |
| Mistral Medium 3.5 | `mistral-medium-3-5` | $1.5 /M tokens | — | $7.5 /M tokens |
| Mistral Small 4 | `mistral-small-2603` | $0.15 /M tokens | — | $0.6 /M tokens |
| Ministral 3 14B | `ministral-14b-2512` | $0.2 /M tokens | — | $0.2 /M tokens |
| Ministral 3 8B | `ministral-8b-2512` | $0.15 /M tokens | — | $0.15 /M tokens |
| Ministral 3 3B | `ministral-3b-2512` | $0.1 /M tokens | — | $0.1 /M tokens |

**Specialized models** (« vision, OCR, and audio ») :

| Modèle | API name | Prix | Unité |
|---|---|---|---|
| OCR 4.1 | `mistral-ocr-4-1` | Entrée $4 ; entrée **annotée** $5 | /1000 pages |
| Voxtral Mini Transcribe 3 | `voxtral-mini-transcribe-3-0` | Entrée $0.0035 | /min |
| Voxtral Mini Transcribe Realtime 3 | `voxtral-mini-transcribe-realtime-3-0` | Entrée $0.008 | /min |
| Voxtral Small Transcribe 3 | `voxtral-small-transcribe-3-0` | Entrée $0.004 | /min |
| Voxtral TTS 3 | `voxtral-mini-tts-3-0` | Entrée $13 | /M caractères |
| Voxtral Mini Transcribe 2 | `voxtral-mini-2602` | Entrée $0.003 | /min |
| Voxtral TTS | `voxtral-mini-tts-2603` | Entrée $16 | /M caractères |
| Mistral Moderation 2 | `mistral-moderation-2603` | **Gratuit** ($0) | /M tokens |

**Third-party hosted** (« Third-party models hosted by Mistral ») :

| Modèle | API name | Entrée | Entrée en cache | Sortie |
|---|---|---|---|---|
| Z.ai GLM 5.3 | `zai-glm-5-3` | $1.4 /M tokens | **$0.14 /M tokens** | $4.4 /M tokens |

**Code models** :

| Modèle | API name | Entrée | Sortie |
|---|---|---|---|
| Codestral | `codestral-2508` | $0.3 /M tokens | $0.9 /M tokens |
| Codestral Embed | `codestral-embed-2505` | $0.15 /M tokens | — |

#### 3.8.2 Prix figurant seulement dans le guide de sélection

| Modèle | API name | Prix |
|---|---|---|
| OCR 3 | `mistral-ocr-2512` | $2 /1000 pages ; $3 /1000 pages annotées |
| Voxtral Mini Transcribe Realtime | `voxtral-mini-transcribe-realtime-2602` | $0.006 /min |
| Voxtral Small | `voxtral-small-2507` | Entrée audio $0.004 /min ; entrée texte $0.1 /M tokens ; sortie $0.4 /M tokens |
| Mistral Embed | `mistral-embed-2312` | Entrée $0.1 /M tokens |
| Shieldstral 1.0 (Labs) | — | Pas de prix affiché |
| Timestral 1.0 (5M, 28M, 123M, 209M) | — | Pas de prix affiché, pas d'API name |

Les prix des modèles dépréciés ou retirés, tirés des fiches modèles, figurent en **annexe A**.

#### 3.8.3 Modificateurs de prix (règles documentées)

| Règle | Effet | Source |
|---|---|---|
| **Batch API** | **−50 %** (« 50% discount on batch API ») | batch-processing |
| **Priority Tier** | **×1,75** sur l'entrée, la sortie et le cache, appliqué **après** la remise de cache | priority-tier |
| **Inférence régionale** (EU/US) | **×1,1** sur l'entrée, la sortie, les lectures et les écritures de cache | regional-inference |
| **Cache de prompt** | Jusqu'à **−90 %** sur les tokens d'entrée en cache. Un prix « Cached input » n'est affiché que pour Mistral Large 4 ($0.14 contre $1.36, soit −89,7 %) et GLM 5.3 ($0.14 contre $1.4, soit −90 %). | priority-tier, pricing |
| **`n` complétions** | Les tokens d'entrée ne sont facturés qu'**une fois**, quel que soit `n` | sampling (et description `n` dans la spec) |
| **Labs** | **Gratuits** | model-lifecycle |
| **Public Preview** | Même prix qu'en GA | model-lifecycle |
| **Alias** | Exposent à des changements silencieux **de prix** | model-lifecycle |
| **Mistral Moderation 2** | Gratuit | pricing |

#### 3.8.4 Tarification des outils (web search, code interpreter, image generation, connecteurs, bibliothèques…)

**Absente des 10 pages assignées.** Ni la page « API pricing » ni le guide de sélection ne donnent de prix d'outil, de connecteur, de bibliothèque (Libraries/RAG), d'agent, de fine-tuning ou de déploiement. Une recherche dans le reste de la copie locale n'en trouve pas non plus (voir §8).

À titre d'indice sur les **métriques de facturation** existantes, la spec OpenAPI (API d'usage admin, `LagoEventType`) énumère :

- `api_tokens`, `api_pages`, `api_audio_seconds`, `api_audio_characters` ;
- `api_connectors` ;
- `api_libraries_tokens`, `api_libraries_pages`, `api_libraries_audio` ;
- `deployment_tokens`, `gpu_hour`, `reserved_instance` ;
- `vibe_tokens`, `vibe_connectors`, `vibe_pages`, `vibe_audio_seconds`, `vibe_audio_characters`.

`UsageOUTJSON` ventile l'usage en `completion`, `ocr`, `connectors`, `libraries_api`, `fine_tuning`, `audio`, `audio_characters`, `audio_agents` (durée de session), `vibe_code` et `chat`, avec `currency`, `currency_symbol` et `prices[]`. Les connecteurs et les Libraries sont donc facturés selon des métriques propres (inférence), mais leurs tarifs unitaires ne sont pas publiés dans la copie.

---

### 3.9 Guide de sélection de modèle

Source : `inference/model-selection-guide.md`. Il compare les modèles « actuels » avec des notes de **0 à 5** ; chaque nom renvoie vers la fiche du modèle (`/models/<slug>`). Tableau intégral (27 lignes, dans l'ordre de la page) :

| Modèle | API name | Type | Vitesse | Perf. | Entrée | Sortie | Contexte | Prix | Licence |
|---|---|---|---|---|---|---|---|---|---|
| Z.ai GLM 5.3 | `zai-glm-5-3` | Open, Generalist | 5/5 | 5/5 | texte | raisonnement, texte | 1M | $1.4 in / $0.14 cache / $4.4 out (/M tok) | — |
| Shieldstral 1.0 | — | Labs, Specialist | — | — | texte, image | texte | 32k | — | Apache 2.0 |
| Timestral 1.0 209M | — | Premier, Specialist | — | — | séries temporelles | séries temporelles | 32K | — | Modified MIT |
| Timestral 1.0 123M | — | Premier, Specialist | — | — | séries temporelles | séries temporelles | 32K | — | Modified MIT |
| Timestral 1.0 28M | — | Premier, Specialist | — | — | séries temporelles | séries temporelles | 32K | — | Modified MIT |
| Timestral 1.0 5M | — | Premier, Specialist | — | — | séries temporelles | séries temporelles | 32K | — | Modified MIT |
| Mistral Medium 3.5 | `mistral-medium-3-5` | Open, Generalist | 2/5 | 4.5/5 | texte, image | raisonnement, texte | 256k | $1.5 / $7.5 (/M tok) | Modified MIT |
| Voxtral TTS | `voxtral-mini-tts-2603` | Open, Specialist | 4.5/5 | 4/5 | texte, audio | audio | — | $16 /M caractères | CC BY-NC 4.0 |
| Voxtral Mini Transcribe 3 | `voxtral-mini-transcribe-3-0` | Premier, Specialist | 4/5 | 4/5 | audio | texte | 32k | $0.0035 /min | — |
| Voxtral Small Transcribe 3 | `voxtral-small-transcribe-3-0` | Premier, Specialist | 3.5/5 | 4.5/5 | audio | texte | 32k | $0.004 /min | — |
| Voxtral Mini Transcribe Realtime 3 | `voxtral-mini-transcribe-realtime-3-0` | Premier, Specialist | 4.5/5 | 4/5 | audio | texte | -- | $0.008 /min | — |
| Voxtral TTS 3 | `voxtral-mini-tts-3-0` | Premier, Specialist | 4.5/5 | 4/5 | texte, audio | audio | — | $13 /M caractères | — |
| Mistral Small 4 | `mistral-small-2603` | Open, Generalist | 4/5 | 3.5/5 | texte, image | raisonnement, texte | 256k | $0.15 / $0.6 | Apache 2.0 |
| Mistral Large 4 | `mistral-large-4` | Open, Generalist | 5/5 | 4/5 | texte, image | raisonnement, texte | 1M | $1.36 / cache $0.14 / $4.18 | — |
| Mistral Large 3 | `mistral-large-2512` | Open, Generalist | 2/5 | 4/5 | texte, image | texte | 256k | $0.5 / $1.5 | Apache 2.0 |
| OCR 4.1 | `mistral-ocr-4-1` | Premier, Specialist | 4/5 | 4/5 | image, document | texte, image | — | $4 /1000 p. ; $5 /1000 p. annotées | — |
| OCR 3 | `mistral-ocr-2512` | Premier, Specialist | 4/5 | 3/5 | image, document | texte, image | — | $2 /1000 p. ; $3 /1000 p. annotées | — |
| Voxtral Mini Transcribe 2 | `voxtral-mini-2602` | Premier, Specialist | 4/5 | 4/5 | audio | texte | -- | $0.003 /min | — |
| Voxtral Mini Transcribe Realtime | `voxtral-mini-transcribe-realtime-2602` | Open, Specialist | 4/5 | 4/5 | audio | texte | -- | $0.006 /min | Apache 2.0 |
| Codestral | `codestral-2508` | Premier, Specialist | 3/5 | 4/5 | texte | texte | 128k | $0.3 / $0.9 | — |
| Codestral Embed | `codestral-embed-2505` | Premier, Specialist | 4/5 | 4/5 | texte | embeddings | 8k | $0.15 | — |
| Ministral 3 14B | `ministral-14b-2512` | Open, Generalist | 3/5 | 2/5 | texte, image | texte | 256k | $0.2 / $0.2 | Apache 2.0 |
| Ministral 3 8B | `ministral-8b-2512` | Open, Generalist | 3/5 | 2/5 | texte, image | texte | 256k | $0.15 / $0.15 | Apache 2.0 |
| Ministral 3 3B | `ministral-3b-2512` | Open, Generalist | 4/5 | 1/5 | texte, image | texte | 256k | $0.1 / $0.1 | Apache 2.0 |
| Voxtral Small | `voxtral-small-2507` | Open, Specialist | 3/5 | 3/5 | audio, texte | texte | 32k | $0.004 /min ; $0.1 / $0.4 (/M tok) | Apache 2.0 |
| Mistral Moderation 2 | `mistral-moderation-2603` | Premier, Specialist | 5/5 | 3.5/5 | texte | scores | 128k | Gratuit ($0 /M tok) | — |
| Mistral Embed | `mistral-embed-2312` | Premier, Specialist | 4/5 | 2/5 | texte | embeddings | 8k | $0.1 | — |

Lecture rapide du tableau (constats factuels, pas des recommandations) :

- **Contexte maximal** : 1M pour GLM 5.3 et Mistral Large 4. Les autres généralistes ont 256k, Codestral 128k, les embeddings 8k.
- **Meilleure performance affichée** : GLM 5.3 (5/5), puis Medium 3.5 et Voxtral Small Transcribe 3 (4.5/5).
- **Vitesse 5/5** : GLM 5.3, Large 4, Moderation 2.
- **Sortie « reasoning »** : GLM 5.3, Medium 3.5, Small 4, Large 4. Large 3 et les Ministral produisent du texte seul.
- **Multimodal image en entrée** : Medium 3.5, Small 4, Large 4, Large 3, Ministral 3 (×3), Shieldstral.
- **Modèle le moins cher** : Ministral 3 3B ($0.1 / $0.1). Mistral Moderation 2 est gratuit.

---

## 4. Interface utilisateur

| Écran | Chemin / URL console | Contenu documenté |
|---|---|---|
| Fichiers | Studio › **Files** — `https://console.mistral.ai/build/files` | Téléverser le fichier JSONL dans le format décrit, en réglant `purpose` sur **« Batch Processing »**. |
| Batches | Studio › **Batches** — `https://console.mistral.ai/build/batches` | Créer et démarrer un job en fournissant `files`, `endpoint` et `model` ; gérer les batches existants. « You won't need to use the API to upload your files or create batching jobs. » |

- Les deux routes partagent le préfixe **`/build/`** de la console, ce qui rattache le batch à la section « Build » de Studio (observation sur la structure d'URL).
- **Aucun écran** n'est décrit pour le Priority Tier : l'activation passe par l'account executive. Aucun écran non plus pour l'inférence régionale (choix d'endpoint côté client), le cycle de vie ou les Labs.
- Côté documentation, chaque modèle a une fiche `/models/<slug>` (tag « Labs », dates de dépréciation et de retrait, prix). La page d'accueil « Inference » (`/inference`) affiche le sous-titre « Use Mistral models through the API, compare model options, route requests, and tune generation behavior. » ; son contenu est rendu par un composant `<InferenceOverview>`, absent de la copie.
- La doc ne décrit pas l'affichage des statuts, des compteurs (`total_requests`…) ni le téléchargement des résultats dans l'écran Batches.

---

## 5. API et SDK

### 5.1 Endpoints

| Méthode | Chemin | Rôle | Source |
|---|---|---|---|
| POST | `/v1/files` | Téléverser le fichier batch (multipart, `purpose=batch`) | doc |
| GET | `/v1/files/{file_id}/content` | Télécharger un fichier de résultats ou d'erreurs | doc |
| POST | `/v1/batch/jobs` | Créer un job batch (`input_files` ou `requests`) | doc + spec |
| GET | `/v1/batch/jobs` | Lister les jobs (filtres §3.1.9) | doc + spec |
| GET | `/v1/batch/jobs/{job_id}` | Détail d'un job (`inline` en option) | doc + spec |
| POST | `/v1/batch/jobs/{job_id}/cancel` | Demander l'annulation | doc + spec |
| DELETE | `/v1/batch/jobs/{job_id}` | Demander la suppression d'un job | spec uniquement |
| GET | `/v1/models` | Lister les modèles (y compris sur un endpoint régional) | doc |
| POST | `/v1/chat/completions` | Complétion, avec `service_tier` et paramètres de sampling | doc |

Hôtes : `https://api.mistral.ai` (global ; seul serveur déclaré dans la spec), `https://api.eu.mistral.ai`, `https://api.us.mistral.ai`.

### 5.2 Méthodes SDK

| Action | Python | TypeScript |
|---|---|---|
| Client | `Mistral(api_key=...)` (V1 `from mistralai import Mistral` ; V2 `from mistralai.client import Mistral`) | `new Mistral({ apiKey })` (`@mistralai/mistralai`) |
| Client régional | `Mistral(..., server="eu")` (SDK ≥ 2.70) ou `server_url="https://api.eu.mistral.ai/"` | `new Mistral({ apiKey, server: "eu" })` |
| Upload | `client.files.upload(file={"file_name", "content"}, purpose="batch")` ou `File(file_name=..., content=...)` | `client.files.upload({ file: { fileName, content }, purpose: "batch" })` |
| Création de job | `client.batch.jobs.create(input_files=[...] \| requests=[...], model=, endpoint=, metadata=)` | `client.batch.jobs.create({ inputFiles \| requests, model, endpoint, metadata })` |
| Détail | `client.batch.jobs.get(job_id=)` | `client.batch.jobs.get({ jobId })` |
| Liste | `client.batch.jobs.list(status=, metadata=)` | `client.batch.jobs.list({ status, metadata })` |
| Annulation | `client.batch.jobs.cancel(job_id=)` | `client.batch.jobs.cancel({ jobId })` |
| Téléchargement | `client.files.download(file_id=)` → `.read()` / `.stream` | `client.files.download({ fileId })` → `ReadableStream` |
| Liste des modèles | `client.models.list()` | `mistral.models.list()` |
| Priority | `client.chat.complete(..., service_tier="auto")` → `response.usage.service_tier` | `chat.complete({ ..., serviceTier: "auto" })` → `response.usage?.serviceTier` |
| Sampling | `client.chat.complete(..., temperature=, top_p=, n=, presence_penalty=, frequency_penalty=)` | — (pas d'exemple TS dans la page Sampling) |

Inline batching en Python : **SDK V2 uniquement**.

### 5.3 Schémas clés (spec OpenAPI)

- `BatchRequest{custom_id?: string|null, body: object}`.
- `CreateBatchJobRequest{input_files?, requests? (≤ 10000), endpoint (requis), model?, agent_id?, metadata?, timeout_hours (1–168, défaut 24)}`.
- `BatchJob` (§3.1.8), `BatchError{message, count=1}`, `ListBatchJobsResponse{data, object="list", total}`, `DeleteBatchJobResponse{id, object="batch", deleted=true}`.
- `BatchJobStatus` : `QUEUED | RUNNING | SUCCESS | FAILED | TIMEOUT_EXCEEDED | CANCELLATION_REQUESTED | CANCELLED`.
- `ApiEndpoint` : 10 valeurs (§3.1.3).
- `RequestedServiceTier` : `auto | standard_only`. `ServiceTier` (tier résolu) : `standard | priority`. `UsageInfo.service_tier` : string|null (« standard or priority »).
- `ChatCompletionRequest` (sampling) : `temperature` (0–1,5), `top_p` (]0,1]), `presence_penalty` et `frequency_penalty` ([−2,2]), `n` (≥ 1), `random_seed`, `top_k`, `min_tokens`, `repetition_penalty`, `logprobs`…, `prompt_cache_key`, `service_tier`, `safe_prompt` (défaut `false`).

### 5.4 Codes et erreurs

- **`404`** : renvoyé pour toute requête vers l'identifiant d'un modèle **retiré**.
- Dans un résultat batch, chaque ligne porte `response.status_code` (200 dans les exemples) et un champ `error` (null si succès). Les échecs sont aussi agrégés dans `error_file` et `errors[]`.
- Le Priority Tier n'a **pas d'erreur de saturation** : en cas de dépassement, la requête retombe en Standard.

---

## 6. Limites, quotas, tarifs, disponibilité

| Sujet | Règle |
|---|---|
| **Batch — volume** | 1 M de requêtes par fichier ; 1 M de requêtes en attente par workspace ; inline < 10 000 ; nombre de jobs illimité. |
| **Batch — durée** | `timeout_hours` : défaut 24 h, < 7 jours (1–168). Traitement « sur 24 h » selon le tableau des niveaux de service ; vitesse ajustée selon la demande. |
| **Batch — résultats** | Disponibles seulement quand tout le lot est terminé ; **sans expiration** actuellement ; visibles par tout le workspace. |
| **Batch — coût et quotas** | −50 % ; n'affecte pas les rate limits ; peut dépasser légèrement la spend limit. |
| **Batch — disponibilité** | « All models » d'après la FAQ ; global uniquement (indisponible en régional). |
| **Priority Tier — accès** | Sur accord commercial (account executive), limites personnalisées par modèle (RPM, TPM…), selon la capacité par région. |
| **Priority Tier — prix et SLA** | ×1,75 après remise de cache ; SLA de disponibilité **99,5 %** (seul niveau avec SLA). |
| **Régional — prix** | ×1,1 (entrée, sortie, lectures et écritures de cache). |
| **Régional — fonctionnalités** | Function calling seulement ; pas d'Agents, de Batch ni de Files API ; modèles variables selon la région ; plan de contrôle non régional ; ZDR à part. |
| **Régions** | Global (sans engagement de localisation), **EU** (UE + AELE, plusieurs datacenters), **US** (plusieurs datacenters). |
| **Labs** | Gratuits, sans opt-out de la collecte de données, mises à jour silencieuses, retrait avec 1 mois de préavis, déconseillés en production. Usage entreprise sur contact. |
| **Préavis de dépréciation** | GA : 6 mois ; Labs, Public Preview et tiers : 1 mois. |
| **Public Preview** | Prix GA ; peut être retiré avant la GA. |
| **Cache de prompt** | Jusqu'à −90 % sur l'entrée en cache. Prix « cached input » publié pour Large 4 et GLM 5.3 seulement. |
| **`n` complétions** | Entrée facturée une seule fois ; non supporté par `mistral-large-2512`. |
| **Outils** | Tarifs non publiés dans la copie locale. |

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

1. **Alias et prix** : `-latest` traverse les générations. Un alias peut donc changer **le comportement et le prix** sans préavis côté client. Seul `-major-minor` est stable.
2. **`service_tier` omis = `standard_only`** : une organisation qui a souscrit au Priority Tier n'en bénéficie pas tant qu'elle n'envoie pas explicitement `auto`.
3. **Fallback silencieux** : avec `auto`, le dépassement des limites Priority ne produit pas d'erreur. Seul `usage.service_tier` permet de savoir quel niveau a servi la requête et donc d'anticiper la facture.
4. **Ordre de calcul Priority** : on applique d'abord la remise de cache, puis ×1,75.
5. **Garanties régionales conditionnelles** : une seule fonctionnalité non supportée (outil autre que le function calling, Agents, Files, Batch) **annule la garantie régionale** pour toute la charge. Le contrôle de compte, les clés et la facturation restent globaux.
6. **Batch et régional sont incompatibles** : Batch et Files API sont « stateful », donc absents des endpoints régionaux.
7. **Batch, un modèle par job** : pour comparer des modèles, il faut lancer plusieurs jobs sur le même fichier.
8. **Résultats tout-ou-rien** : on n'accède à rien avant la fin complète du lot. Le comportement en cas de timeout ou d'annulation n'est pas documenté.
9. **Plafond de 1 M de requêtes en attente par workspace** : deux gros jobs simultanés peuvent être refusés tant que le premier n'a pas assez avancé.
10. **Dépassement de spend limit possible** avec le batch : la limite de dépense n'est pas une barrière stricte dans ce cas.
11. **JSONL strict** : un objet par ligne, sans retour à la ligne interne.
12. **Inline batching en Python** : indisponible en V1 (`mistralai 1.x`).
13. **`temperature=0` n'est pas parfaitement déterministe** (matériel, arrondis), surtout sur les longues séquences.
14. **`n` > 1 nécessite `temperature > 0`** pour être utile ; non supporté par `mistral-large-2512`.
15. **`frequency_penalty` élevée** peut finir par pénaliser la ponctuation et les guillemets sur les longues listes.
16. **Labs et confidentialité** : pas d'opt-out de la collecte de données, ce qui compte pour tout usage avec des données clientes.
17. **Retrait = `404`** : aucun repli automatique vers le modèle de remplacement n'est documenté.
18. **Public Preview** : même prix que la GA mais des mises à jour silencieuses, et une GA non garantie. Mistral Large 4 est en Public Preview depuis le 2026-10-06 (fiche modèle et changelog, hors périmètre), avec un « Launch pricing: 50% off for 2 weeks » d'après le changelog.
19. **TypeScript et métadonnées** : l'exemple TS utilise la clé `jobType` alors que Python et curl utilisent `job_type`. Ce sont des clés libres, donc des filtres différents (piège de portage).
20. **Résultat OCR** : le champ `model` peut contenir un identifiant interne (`mistral-ocr-2505-completion`) différent de l'alias demandé (`mistral-ocr-latest`).
21. **Transcriptions en batch** : `total_tokens` inclut manifestement les tokens audio (inférence d'après les chiffres), à prendre en compte dans les estimations.
22. **Dépréciations récentes visibles** (pages assignées et changelog) :
    - Leanstral 1.5 : dépréciée le 2026-09-29, retirée le 2026-09-30 ;
    - Mistral Small Creative : retirée le 2026-04-30, remplacée par Ministral 3 8B ;
    - Devstral Small 2 (`labs-`) : retirée le 2026-03-31, remplacée par Mistral Medium 3.5 ;
    - Leanstral (2603) : retirée le 2026-06-30.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Grille d'outils absente** : la mission attend les prix des outils (web search, code interpreter, image generation, document library, connecteurs…), mais **aucune page locale ne les donne**. La page « API pricing » ne couvre que des modèles. La page `studio.md` renvoie vers `https://mistral.ai/pricing`, non copiée. La spec révèle les métriques de facturation `api_connectors` et `api_libraries_*`, sans prix unitaires.
2. **Statuts Labs incohérents avec les dates** (au 21/10/2026) : Leanstral 1.5, Mistral Small Creative et Devstral Small 2 sont affichés « Deprecated » alors que leur date de retrait est passée. Seul Leanstral (2603) est marqué « Retired ».
3. **Préavis non respectés** :
   - Leanstral 1.5 : 1 jour entre dépréciation et retrait, pour un préavis Labs annoncé d'1 mois ;
   - OCR 4.0 (fiche modèle et changelog, hors périmètre) : également 1 jour, alors que le préavis GA est de 6 mois s'il était en GA.
4. **« Labs = gratuits »** contredit par les fiches modèles (hors périmètre) : `labs-mistral-small-creative` et `labs-devstral-small-2512` y affichent $0.1 / $0.3 par M tokens. Leanstral est bien gratuit.
5. **Shieldstral 1.0** :
   - listé dans le tableau Labs avec le statut « Public Preview » ;
   - typé « Labs, Specialist » dans le guide ;
   - **sans API name ni prix**. On ne sait pas comment l'appeler ni à quel prix.
6. **Timestral 1.0** (4 tailles) : typé « Premier » mais sous licence « Modified MIT » ; ni API name ni prix ; endpoint non précisé dans ces pages.
7. **Catégorie « Flagship » = « Premier frontier models »** : elle inclut des modèles typés « Open » (Large 3, Small 4, Ministral 3 sous Apache 2.0).
8. **Licences manquantes** : Large 4 et GLM 5.3 sont typés « Open » sans licence indiquée dans le guide. La fiche Large 4 annonce les poids « Coming soon ».
9. **`json_mode`** (commentaire de l'exemple batch Structured Outputs) contre **`json_object`** (page Prompting) pour le mode JSON simple : une des deux valeurs est probablement erronée.
10. **Inline batching** : « fewer than 10,000 » dans la doc, mais `maxItems: 10000` dans la spec (10 000 accepté ?).
11. **Timeout** : « lower than 7 days » dans la doc contre `maximum: 168` dans la spec (7 jours pile accepté ?).
12. **Endpoints batch** : 9 dans la doc, 10 dans la spec (`/v1/chat/classifications` en plus). Le paramètre `agent_id` (agents de l'API dépréciée), le paramètre `inline` / le champ `outputs`, la route `DELETE` et les filtres `page`, `page_size`, `model`, `created_after`, `created_by_me` et `order_by` ne sont pas documentés dans la page.
13. **Résultats en ligne** : on ne sait pas comment récupérer les résultats d'un job créé en inline batching. On ignore s'il y a toujours un `output_file`, ou si les résultats arrivent via `GET …?inline=true` → `outputs`.
14. **`model` dans `body` et à la création** : la doc dit que `body.model` est optionnel, puis que le modèle est fourni « only during the job creation ». La priorité en cas de conflit n'est pas précisée. Le premier exemple JSONL contient `model` dans `body`.
15. **« Batch disponible pour tous les modèles »** contre les fiches modèles (hors périmètre), dont la liste de fonctionnalités n'inclut pas `batching` pour Voxtral Mini Transcribe 2/3, Realtime, TTS, Leanstral… L'exemple de transcription batch utilise pourtant `voxtral-mini-latest`, alias qui figure sur deux fiches (Voxtral Mini 2507, dépréciée, et Voxtral Mini Transcribe 2).
16. **Assiette de la remise batch** : elle n'est pas précisée pour les unités autres que les tokens (pages OCR, minutes audio) ni pour l'entrée en cache.
17. **Cumul des modificateurs** : on ignore si Priority ×1,75 et régional ×1,1 se multiplient. Le batch est exclu du régional, mais rien n'est dit sur Batch + Priority.
18. **Écritures de cache** : la page régionale mentionne des « cache writes » facturées, mais aucune grille ne donne de prix d'écriture de cache.
19. **Priority Tier** : le prix est fixé à « 1.75x », puis les requêtes Priority sont dites « billed according to your Priority Tier terms ». Le multiplicateur est-il négociable ? La liste des modèles éligibles n'est pas publiée.
20. **Batch et rate limits** : la FAQ dit que le batch n'affecte pas les rate limits, alors que le tableau des niveaux de service mentionne des « Batch processing limits » non chiffrées.
21. **Exemple TypeScript d'annulation** : il appelle `mistral.batch.jobs.cancel` alors que les autres exemples utilisent la variable `client`.
22. **Format de `error_file`** et structure de `error` dans une ligne de résultat : non documentés.
23. **Région US via SDK** : seule `server="eu"` est montrée. La valeur pour les US (`"us"` ?) n'est pas confirmée.
24. **Périmètre du cycle de vie** : la politique vise la « Mistral Serverless API ». Son application aux autres surfaces (Le Chat/Vibe, déploiements dédiés) n'est pas précisée.
25. **Page « Inference »** : son contenu est un composant (`<InferenceOverview>`) non exporté dans la copie.
26. **Valeurs par défaut de sampling** : la température par défaut dépend du modèle (à lire via `/models`) ; le défaut de `top_p` n'est pas donné dans la page.

---

## Annexe A — Tarifs et cycle de vie de tous les modèles (fiches modèles, hors périmètre)

Ce complément est extrait des 75 fiches `models/*.md` de la copie locale (non assignées), pour couvrir les prix des modèles absents de la grille publique. Le statut est celui affiché sur la fiche. « batch » indique que la fiche liste la fonctionnalité `batching`.

| Modèle | API names | Statut | Prix | Dépréciation → Retrait | Remplacement | batch |
|---|---|---|---|---|---|---|
| Mistral Large 4 | `mistral-large-4`, `mistral-large-4-0` | Public Preview | $1.36 / cache $0.14 / $4.18 | — | — | oui |
| Mistral Large 3 | `mistral-large-2512`, `mistral-large-latest` | GA | $0.5 / $1.5 | — | — | oui |
| Mistral Large 2.1 | `mistral-large-2411` | Deprecated | $2 / $6 | 2026-02-27 → 2026-05-31 | Medium 3.5 | oui |
| Mistral Large 2.0 | `mistral-large-2407` | Retired | — | 2024-11-30 → 2025-03-30 | Large 3 | — |
| Mistral Large 1.0 | `mistral-large-2402` | Retired | — | 2024-11-30 → 2025-06-16 | Large 3 | — |
| Mistral Medium 3.5 | `mistral-medium-3-5`, `mistral-medium-3`, `mistral-medium-latest` | GA | $1.5 / $7.5 | — | — | oui |
| Mistral Medium 3.1 | `mistral-medium-2508` | Deprecated | $0.4 / $2 | 2026-05-22 → 2026-08-31 | Medium 3.5 | oui |
| Mistral Medium 3 | `mistral-medium-2505` | Deprecated | $0.4 / $2 | 2026-05-22 → 2026-08-31 | Medium 3.5 | oui |
| Mistral Medium 1.0 | `mistral-medium-2312` | Retired | — | 2024-11-30 → 2025-06-16 | Medium 3.5 | — |
| Mistral Small 4 | `mistral-small-2603`, `mistral-small-latest` | GA | $0.15 / $0.6 | — | — | oui |
| Mistral Small 3.2 | `mistral-small-2506` | Deprecated | $0.1 / $0.3 | 2026-04-30 → 2026-07-31 | Small 4 | oui |
| Mistral Small 3.1 / 3.0 / 2.0 | `mistral-small-2503` / `-2501` / `-2409` | Retired | $0.1 / $0.3 | 2025-11-06 → 2025-11-30 | Small 4 | oui |
| Mistral Small 1.0 | `mistral-small-2402` | Retired | — | 2024-11-30 → 2025-06-16 | Small 4 | — |
| Mistral Small Creative | `labs-mistral-small-creative` | Deprecated | $0.1 / $0.3 | 2026-03-31 → 2026-04-30 | Ministral 3 8B | oui |
| Ministral 3 14B / 8B / 3B | `ministral-14b-2512` / `ministral-8b-2512` / `ministral-3b-2512` (+ `-latest`) | GA | $0.2/$0.2 · $0.15/$0.15 · $0.1/$0.1 | — | — | oui |
| Ministral 8B (2410) | `ministral-8b-2410` | Deprecated | $0.1 / $0.1 | 2025-12-02 → 2025-12-31 | Ministral 3 8B | oui |
| Ministral 3B (2410) | `ministral-3b-2410` | Deprecated | $0.04 / $0.04 | 2025-12-02 → 2025-12-31 | Ministral 3 3B | oui |
| Magistral Medium 1.2 | `magistral-medium-2509`, `magistral-medium-latest` | Deprecated | $2 / $5 | 2026-05-22 → 2026-07-31 | Medium 3.5 | oui |
| Magistral Medium 1.1 / 1.0 | `magistral-medium-2507` / `-2506` | Retired | $2 / $5 | 2025-10-31 → 2025-11-30 | Medium 3.5 | oui |
| Magistral Small 1.2 | `magistral-small-2509`, `magistral-small-latest` | Deprecated | $0.5 / $1.5 | 2026-04-30 → 2026-07-31 | Small 4 | oui |
| Magistral Small 1.1 / 1.0 | `magistral-small-2507` / `-2506` | Retired | $0.5 / $1.5 | 2025-10-31 → 2025-11-30 | Small 4 | oui |
| Devstral 2 | `devstral-2512`, `devstral-latest`, `devstral-medium-latest` | Deprecated | $0.4 / $2 | 2026-05-22 → 2026-07-31 | Medium 3.5 | oui |
| Devstral Medium 1.0 | `devstral-medium-2507` | Deprecated | $0.4 / $2 | 2026-02-27 → 2026-05-31 | Medium 3.5 | oui |
| Devstral Small 2 | `labs-devstral-small-2512`, `devstral-small-latest` | Deprecated | $0.1 / $0.3 | 2026-02-27 → 2026-03-31 | Medium 3.5 | oui |
| Devstral Small 1.1 | `devstral-small-2507` | Deprecated | $0.1 / $0.3 | 2026-02-27 → 2026-05-31 | Small 4 | oui |
| Devstral Small 1.0 | `devstral-small-2505` | Retired | $0.1 / $0.3 | 2025-10-31 → 2025-11-30 | Medium 3.5 | oui |
| Codestral (2508) | `codestral-2508`, `codestral-latest` | GA | $0.3 / $0.9 | — | — | oui |
| Codestral (2501) | `codestral-2501` | Retired | $0.3 / $0.9 | 2025-11-06 → 2025-11-30 | Codestral 2508 | oui |
| Codestral (2405) | `codestral-2405` | Retired | — | 2024-12-02 → 2025-06-16 | Codestral 2508 | — |
| Codestral Mamba 7B | `open-codestral-mamba` | Retired | — | 2025-06-06 → 2025-06-06 | Codestral 2508 | — |
| Codestral Embed | `codestral-embed-2505`, `codestral-embed` | GA | $0.15 (entrée) | — | — | oui |
| Mistral Embed | `mistral-embed-2312`, `mistral-embed` | GA | $0.1 (entrée) | — | — | oui |
| Pixtral Large | `pixtral-large-2411`, `pixtral-large-latest` | Deprecated | $2 / $6 | 2026-02-27 → 2026-05-31 | Medium 3.5 | oui |
| Pixtral 12B | `pixtral-12b-2409` | Deprecated | $0.15 / $0.15 | 2025-12-02 → 2025-12-31 | Ministral 3 14B | oui |
| Mistral Nemo 12B | `open-mistral-nemo-2407`, `open-mistral-nemo` | Deprecated | $0.15 / $0.15 | 2026-05-22 → 2026-07-31 | Ministral 3 8B | oui |
| Mistral Saba | `mistral-saba-2502`, `mistral-saba-latest` | Retired | — | 2025-06-10 → 2025-09-30 | Small 4 | — |
| Mistral 7B / Mixtral 8x7B / 8x22B | `open-mistral-7b`, `open-mixtral-8x7b`, `open-mixtral-8x22b` | Retired | — | 2024-11-30 → 2025-03-30 | Ministral 3 8B / Small 4 | — |
| Mathstral 7B, Mistral Next | — | Retired | — | — | Small 4 / Large 3 | — |
| Mistral Moderation 2 | `mistral-moderation-2603` | GA | Gratuit | — | — | oui |
| Mistral Moderation | `mistral-moderation-2411` | Deprecated | $0.1 (entrée) | 2026-03-31 → 2026-06-30 | Moderation 2 | oui |
| OCR 4.1 | `mistral-ocr-4-1`, `mistral-ocr-4`, `mistral-ocr-latest` | GA | $4 / $5 annotées (/1000 p.) | — | — | oui |
| OCR 4.0 | `mistral-ocr-4-0` | Deprecated | $4 / $5 | 2026-09-29 → 2026-09-30 | OCR 4.1 | oui |
| OCR 3 | `mistral-ocr-2512` | GA | $2 / $3 | — | OCR 4.1 (indiqué) | oui |
| OCR 2 | `mistral-ocr-2505` | Deprecated | $1 / $3 | 2026-02-27 → 2026-05-31 | OCR 4.1 | oui |
| OCR | `mistral-ocr-2503` | Deprecated | — | 2025-12-02 → 2025-12-31 | OCR 4.1 | — |
| Voxtral Small | `voxtral-small-2507`, `voxtral-small-latest` | GA | $0.004/min ; $0.1 / $0.4 | — | — | oui |
| Voxtral Mini | `voxtral-mini-2507`, `voxtral-mini-latest` | Deprecated | $0.001/min ; $0.04 / $0.04 | 2026-02-27 → 2026-05-31 | Voxtral Mini Transcribe 2 | oui |
| Voxtral Mini Transcribe | `voxtral-mini-2507` | Deprecated | $0.002/min | 2026-02-27 → 2026-05-31 | Voxtral Mini Transcribe 2 | — |
| Voxtral Mini Transcribe 2 | `voxtral-mini-2602`, `voxtral-mini-latest` | GA | $0.003/min | — | — | — |
| Voxtral Mini Transcribe 3 | `voxtral-mini-transcribe-3-0`, `-3`, `-latest` | Public Preview | $0.0035/min | — | — | — |
| Voxtral Small Transcribe 3 | `voxtral-small-transcribe-3-0`, `-3`, `-latest` | Public Preview | $0.004/min | — | — | — |
| Voxtral Mini Transcribe Realtime | `voxtral-mini-transcribe-realtime-2602`, `voxtral-mini-realtime-latest` | GA | $0.006/min | — | — | — |
| Voxtral Mini Transcribe Realtime 3 | `voxtral-mini-transcribe-realtime-3-0`, `-3`, `-latest` | Public Preview | $0.008/min | — | — | — |
| Voxtral TTS | `voxtral-mini-tts-2603`, `voxtral-mini-tts-latest` | GA | $16 /M caractères | — | — | — |
| Voxtral TTS 3 | `voxtral-mini-tts-3-0`, `-3`, `-latest`, `voxtral-mini-tts-realtime-3-0`, `-realtime-3`, `-realtime-latest` | Public Preview | $13 /M caractères | — | — | — |
| Z.ai GLM 5.3 | `zai-glm-5-3`, `zai-glm-5`, `zai-glm-latest` | GA | $1.4 / cache $0.14 / $4.4 | — | — | oui |
| Z.ai GLM 5.2 | `zai-glm-5-2` | Deprecated | $1.4 / cache $0.14 / $4.4 | 2026-09-29 → 2026-10-31 | GLM 5.3 | oui |
| Leanstral 1.5 | `labs-leanstral-1-5` | Deprecated | Gratuit | 2026-09-29 → 2026-09-30 | — | — |
| Leanstral | `labs-leanstral-2603` | Retired | Gratuit | 2026-05-22 → 2026-06-30 | Leanstral 1.5 | — |
| Shieldstral 1.0, Timestral 1.0 (×4) | — | Public Preview | — | — | — | — |

Prix texte notés « entrée / sortie » par M tokens, sauf mention contraire. Collisions d'alias relevées dans les fiches : `voxtral-mini-latest` (Voxtral Mini et Voxtral Mini Transcribe 2), `voxtral-mini-tts-latest` (Voxtral TTS et TTS 3), `voxtral-mini-2507` (deux fiches). Les statuts « Deprecated » dont la date de retrait est passée (Ministral 2410, Pixtral, Large 2.1…) sont repris tels qu'affichés.

---

## Annexe B — Prix dérivés par niveau de service (calcul, inférence)

**(inférence)** Ces valeurs sont calculées en appliquant mécaniquement les multiplicateurs documentés (batch ×0,5 ; Priority ×1,75 ; régional ×1,1) aux prix de la grille. Elles ne sont **pas publiées par Mistral**. Leur applicabilité par modèle n'est pas garantie : l'éligibilité Priority dépend du modèle et la disponibilité régionale de la région. En USD par M tokens, au format entrée / [cache] / sortie.

| Modèle | Standard | Batch (−50 %) | Priority (×1,75) | Régional (×1,1) |
|---|---|---|---|---|
| Mistral Large 4 | 1.36 / 0.14 / 4.18 | 0.68 / 0.07 / 2.09 | 2.38 / 0.245 / 7.315 | 1.496 / 0.154 / 4.598 |
| Mistral Large 3 | 0.5 / 1.5 | 0.25 / 0.75 | 0.875 / 2.625 | 0.55 / 1.65 |
| Mistral Medium 3.5 | 1.5 / 7.5 | 0.75 / 3.75 | 2.625 / 13.125 | 1.65 / 8.25 |
| Mistral Small 4 | 0.15 / 0.6 | 0.075 / 0.3 | 0.2625 / 1.05 | 0.165 / 0.66 |
| Ministral 3 14B | 0.2 / 0.2 | 0.1 / 0.1 | 0.35 / 0.35 | 0.22 / 0.22 |
| Ministral 3 8B | 0.15 / 0.15 | 0.075 / 0.075 | 0.2625 / 0.2625 | 0.165 / 0.165 |
| Ministral 3 3B | 0.1 / 0.1 | 0.05 / 0.05 | 0.175 / 0.175 | 0.11 / 0.11 |
| Z.ai GLM 5.3 | 1.4 / 0.14 / 4.4 | 0.7 / 0.07 / 2.2 | 2.45 / 0.245 / 7.7 | 1.54 / 0.154 / 4.84 |
| Codestral | 0.3 / 0.9 | 0.15 / 0.45 | 0.525 / 1.575 | 0.33 / 0.99 |
| Codestral Embed | 0.15 | 0.075 | 0.2625 | 0.165 |
| Mistral Embed | 0.1 | 0.05 | 0.175 | 0.11 |

Le batch n'est **pas disponible** en régional ; aucune case « batch régional » n'est donc présentée.

---

## Annexe — Couverture

| Fichier | Statut | Source |
|---|---|---|
| `inference.md` | ✅ lu en entier (page d'accueil ; contenu principal rendu par un composant non exporté) | https://docs.mistral.ai/inference.md |
| `inference/labs.md` | ✅ lu en entier | https://docs.mistral.ai/inference/labs.md |
| `inference/model-lifecycle.md` | ✅ lu en entier | https://docs.mistral.ai/inference/model-lifecycle.md |
| `inference/model-selection-guide.md` | ✅ lu en entier | https://docs.mistral.ai/inference/model-selection-guide.md |
| `inference/pricing.md` | ✅ lu en entier | https://docs.mistral.ai/inference/pricing.md |
| `inference/priority-tier.md` | ✅ lu en entier | https://docs.mistral.ai/inference/priority-tier.md |
| `inference/prompting.md` | ✅ lu en entier | https://docs.mistral.ai/inference/prompting.md |
| `inference/regional-inference.md` | ✅ lu en entier | https://docs.mistral.ai/inference/regional-inference.md |
| `inference/sampling.md` | ✅ lu en entier | https://docs.mistral.ai/inference/sampling.md |
| `studio/batch-processing.md` | ✅ lu en entier (1 437 lignes). Les sorties JSON très longues (vecteurs d'embeddings, markdown OCR de 81 K et 36 K caractères sur une seule ligne, transcriptions) ont été parcourues par extraction des clés et des champs (`model`, `usage`, annotations) plutôt que lues caractère par caractère ; les versions V1 et V2 de l'exemple de bout en bout ont été comparées par diff (seul l'import diffère). | https://docs.mistral.ai/studio/batch-processing.md |

Compléments consultés hors périmètre, pour vérification uniquement : la spec OpenAPI locale (schémas batch, `service_tier`, sampling, facturation), `resources/changelogs.md` (dates de l'inline batching, de Large 4 et des dépréciations de septembre 2026) et les 75 fiches `models/*.md` (annexe A).
