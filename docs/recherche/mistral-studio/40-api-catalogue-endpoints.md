# 40 — Catalogue de l'API Mistral (spécification OpenAPI)

> **Source** : https://docs.mistral.ai/openapi.yaml (copie du 21/10/2026) · OpenAPI 3.1.0 · serveur `https://api.mistral.ai` · **232 chemins, 319 opérations, 951 schémas** · généré automatiquement (script) puis relu.

Légende : `*` = obligatoire ; paramètres `p:` chemin, `q:` query, `h:` en-tête ; « (SSE) » = réponse en streaming Server-Sent Events. Les libellés de résumé et les noms sont ceux de la spécification, non traduits.

## 1. Authentification (security schemes)

| Schéma | Type | Détail |
|---|---|---|
| `DashboardUserContextAuth` | apiKey | Public API key. The gateway validates the key and forwards authenticated user context to the dashboard. (en-tête `x-api-key`) |
| `BearerUserContextAuth` | http/bearer | Bearer token. The gateway validates the token and forwards authenticated user context to the dashboard. |
| `DashboardUserOrServiceAccountContextAuth` | apiKey | Public API key. The gateway validates the key and forwards authenticated user context to the dashboard. (en-tête `x-api-key`) |
| `AdminApiKey` | http/bearer | Admin-scoped API key passed as a bearer token. Standard workspace/inference API keys are rejected. |
| `ApiKey` | http/bearer |  |

## 2. Vue d'ensemble par domaine

| Tag | Opérations | Description (spec) |
|---|---:|---|
| [`beta.prompts`](#betaprompts) | 9 | (beta) Prompts API. |
| [`beta.skills`](#betaskills) | 9 | (beta) Skills API. |
| [`audio.speech`](#audiospeech) | 1 | API for speech generation. |
| [`models`](#models) | 6 | Model Management API |
| [`realtime.sessions`](#realtimesessions) | 1 | Realtime - Sessions API. |
| [`beta.service_accounts`](#betaservice_accounts) | 8 | (beta) Service Accounts API. |
| [`beta.conversations`](#betaconversations) | 11 | (beta) Conversations API |
| [`beta.agents`](#betaagents) | 12 | (beta) Agents API |
| [`files`](#files) | 6 | Files API |
| [`batch`](#batch) | 5 | Batch API |
| [`chat`](#chat) | 1 | Chat Completion API. |
| [`fim`](#fim) | 1 | Fill-in-the-middle API. |
| [`agents`](#agents) | 1 | Agents API. |
| [`embeddings`](#embeddings) | 1 | Embeddings API. |
| [`classifiers`](#classifiers) | 4 | Classifiers API. |
| [`ocr`](#ocr) | 1 | OCR API |
| [`audio.transcriptions`](#audiotranscriptions) | 2 | API for audio transcription. |
| [`beta.libraries`](#betalibraries) | 6 | (beta) Libraries API to create and manage libraries - index your documents to enhance agent capabilities. |
| [`beta.libraries.documents`](#betalibrariesdocuments) | 11 | (beta) Libraries API - manage documents in a library. |
| [`beta.libraries.accesses`](#betalibrariesaccesses) | 3 | (beta) Libraries API - manage access to a library. |
| [`beta.observability.judges`](#betaobservabilityjudges) | 6 | (beta) Observability API - judges. |
| [`beta.observability.datasets`](#betaobservabilitydatasets) | 14 | (beta) Observability API - datasets. |
| [`beta.observability.datasets.records`](#betaobservabilitydatasetsrecords) | 6 | (beta) Observability API - dataset records. |
| [`beta.observability.evaluations`](#betaobservabilityevaluations) | 7 | (beta) Observability - Evaluations API. |
| [`beta.observability.logs`](#betaobservabilitylogs) | 3 | (beta) Observability API - logs. |
| [`beta.observability.traces`](#betaobservabilitytraces) | 7 | (beta) Observability API - traces. |
| [`beta.observability.spans`](#betaobservabilityspans) | 10 | (beta) Observability API - spans. |
| [`beta.observability.evaluations.projects`](#betaobservabilityevaluationsprojects) | 2 | (beta) Observability - Evaluations - Projects API. |
| [`beta.observability.evaluations.runs`](#betaobservabilityevaluationsruns) | 5 | (beta) Observability - Evaluations - Runs API. |
| [`beta.observability.evaluations.records`](#betaobservabilityevaluationsrecords) | 2 | (beta) Observability - Evaluations - Records API. |
| [`beta.observability.evaluations.optimizations`](#betaobservabilityevaluationsoptimizations) | 3 | (beta) Observability - Evaluations - Optimizations API. |
| [`beta.connectors`](#betaconnectors) | 22 | (beta) Connectors API - manage your connectors |
| [`audio.voices`](#audiovoices) | 7 | API for voice management. |
| [`workflows.executions`](#workflowsexecutions) | 17 | Workflows API - executions. |
| [`workflows.metrics`](#workflowsmetrics) | 1 | Workflows API - metrics. |
| [`workflows.runs`](#workflowsruns) | 3 | Workflows API - runs. |
| [`workflows.schedules`](#workflowsschedules) | 8 | Workflows API - schedules. |
| [`events`](#events) | 2 | Events API. |
| [`workflows.deployments`](#workflowsdeployments) | 12 | Workflows API - deployments. |
| [`workflows`](#workflows) | 11 | Workflows API. |
| [`beta.rag.ingestion_pipeline_configurations`](#betaragingestion_pipeline_configurations) | 3 | (beta) RAG API - ingestion pipeline configurations. |
| [`beta.rag.search_indexes`](#betaragsearch_indexes) | 4 | (beta) RAG API - search indexes. |
| [`beta.rag.managed_indexes`](#betaragmanaged_indexes) | 12 | (beta) RAG API - managed indexes. |
| [`beta.users`](#betausers) | 4 | (beta) Users API. |
| [`beta.admin.billing`](#betaadminbilling) | 5 | (beta) Admin API - manage spend limits, rate limits and roles. Requires an admin API key. |
| [`beta.admin.users`](#betaadminusers) | 10 | (beta) Admin API - manage users. Requires an admin API key. |
| [`beta.admin.workspaces`](#betaadminworkspaces) | 7 | (beta) Admin API - manage workspaces. Requires an admin API key. |
| [`beta.admin.audit-logs`](#betaadminaudit-logs) | 1 | (beta) Admin API - access audit logs. Requires an admin API key. |
| [`beta.admin.user-groups`](#betaadminuser-groups) | 16 | (beta) Admin API - manage user groups. Requires an admin API key. |
| [`beta.admin.api-keys`](#betaadminapi-keys) | 3 | (beta) Admin API - manage API keys. Requires an admin API key. |
| [`beta.admin.scim`](#betaadminscim) | 2 | (beta) Admin - Scim API. |
| [`beta.admin.vibe-work-analytics`](#betaadminvibe-work-analytics) | 3 | Admin usage analytics for Vibe Work. |
| [`beta.admin.vibe-code-analytics`](#betaadminvibe-code-analytics) | 2 | Admin usage analytics for Vibe Code. |

## 3. Opérations détaillées

### beta.prompts

_(beta) Prompts API._

- **`GET /v2/prompts`** — ListPrompts · `operationId: prompts_list`
  - Paramètres : q:`pageSize` q:`pageToken` q:`alias` q:`fields` q:`sort.field` q:`sort.direction` q:`sort_by` q:`sort_direction`
  - Réponses : 200→ListPromptsResponse
- **`POST /v2/prompts`** — CreatePrompt · `operationId: prompts_create`
  - Corps : `application/json` (CreatePromptRequest) → `name`*: string, `definition`*: PromptDefinition, `title`: string, `description`: string, `notes`: string, `sharingScope`: RegistrySharingScope, `aliases`: array<string>, `workspaceRelation`: ShareRelation
  - Réponses : 200→Prompt
- **`GET /v2/prompts/{prompt_id}`** — GetPrompt · `operationId: prompts_get`
  - Paramètres : p:`prompt_id`* q:`version` q:`alias` q:`fields`
  - Réponses : 200→Prompt
- **`PATCH /v2/prompts/{prompt_id}`** — UpdatePrompt · `operationId: prompts_update`
  - Paramètres : p:`prompt_id`*
  - Corps : `application/json` (object) → `title`: string, `description`: string, `sharingScope`: RegistrySharingScope, `workspaceRelation`: ShareRelation
  - Réponses : 200→Prompt
- **`DELETE /v2/prompts/{prompt_id}`** — DeletePrompt · `operationId: prompts_delete`
  - Paramètres : p:`prompt_id`*
  - Réponses : 200→DeletePromptResponse
- **`GET /v2/prompts/{prompt_id}/versions`** — ListPromptVersions · `operationId: prompts_list_versions`
  - Paramètres : p:`prompt_id`*
  - Réponses : 200→ListPromptVersionsResponse
- **`POST /v2/prompts/{prompt_id}/versions`** — CreatePromptVersion · `operationId: prompts_create_version`
  - Paramètres : p:`prompt_id`*
  - Corps : `application/json` (object) → `definition`*: PromptDefinition, `notes`: string, `aliases`: array<string>
  - Réponses : 200→CreatePromptVersionResponse
- **`GET /v2/prompts/{prompt_id}/versions/{version}`** — GetPromptVersion · `operationId: prompts_get_version`
  - Paramètres : p:`prompt_id`* p:`version`* q:`fields`
  - Réponses : 200→Prompt
- **`PATCH /v2/prompts/{prompt_id}/versions/{version}`** — UpdatePromptVersionMetadata · `operationId: prompts_update_version_metadata`
  - Paramètres : p:`prompt_id`* p:`version`*
  - Corps : `application/json` (object) → `notes`: string, `aliases`: AliasList
  - Réponses : 200→Prompt

### beta.skills

_(beta) Skills API._

- **`GET /v2/skills`** — ListSkills · `operationId: skills_list`
  - Paramètres : q:`pageSize` q:`pageToken` q:`alias` q:`fields` q:`sort.field` q:`sort.direction` q:`sort_by` q:`sort_direction`
  - Réponses : 200→ListSkillsResponse
- **`POST /v2/skills`** — CreateSkill · `operationId: skills_create`
  - Corps : `application/json` (CreateSkillRequest) → `name`*: string, `definition`*: SkillDefinition, `notes`: string, `sharingScope`: RegistrySharingScope, `aliases`: array<string>, `workspaceRelation`: ShareRelation
  - Réponses : 200→Skill
- **`GET /v2/skills/{skill_id}`** — GetSkill · `operationId: skills_get`
  - Paramètres : p:`skill_id`* q:`version` q:`alias` q:`fields`
  - Réponses : 200→Skill
- **`PATCH /v2/skills/{skill_id}`** — UpdateSkill · `operationId: skills_update`
  - Paramètres : p:`skill_id`*
  - Corps : `application/json` (object) → `sharingScope`: RegistrySharingScope, `workspaceRelation`: ShareRelation
  - Réponses : 200→Skill
- **`DELETE /v2/skills/{skill_id}`** — DeleteSkill · `operationId: skills_delete`
  - Paramètres : p:`skill_id`*
  - Réponses : 200→DeleteSkillResponse
- **`GET /v2/skills/{skill_id}/versions`** — ListSkillVersions · `operationId: skills_list_versions`
  - Paramètres : p:`skill_id`*
  - Réponses : 200→ListSkillVersionsResponse
- **`POST /v2/skills/{skill_id}/versions`** — CreateSkillVersion · `operationId: skills_create_version`
  - Paramètres : p:`skill_id`*
  - Corps : `application/json` (object) → `definition`*: SkillDefinition, `notes`: string, `aliases`: array<string>
  - Réponses : 200→CreateSkillVersionResponse
- **`GET /v2/skills/{skill_id}/versions/{version}`** — GetSkillVersion · `operationId: skills_get_version`
  - Paramètres : p:`skill_id`* p:`version`* q:`fields`
  - Réponses : 200→Skill
- **`PATCH /v2/skills/{skill_id}/versions/{version}`** — UpdateSkillVersionMetadata · `operationId: skills_update_version_metadata`
  - Paramètres : p:`skill_id`* p:`version`*
  - Corps : `application/json` (object) → `notes`: string, `aliases`: AliasList
  - Réponses : 200→Skill

### audio.speech

_API for speech generation._

- **`POST /v1/audio/speech`** — Speech · `operationId: speech_v1_audio_speech_post`
  - Corps : `application/json` (SpeechRequest) → `model`: string \| null, `metadata`: MetadataDict \| null, `stream`: boolean, `prompt_cache_key`: string \| null, `voice_id`: string \| null, `ref_audio`: string \| string \| null, `input`*: string, `phoneme_hints`: object \| null, `response_format`: SpeechOutputFormat
  - Réponses : 200→object, 422→HTTPValidationError

### models

_Model Management API_

- **`GET /v1/models`** — List Models · `operationId: list_models_v1_models_get`
  - Description : List all models available to the user.
  - Paramètres : q:`provider` q:`model`
  - Réponses : 200→ModelList, 422→HTTPValidationError
- **`GET /v1/models/{model_id}`** — Retrieve Model · `operationId: retrieve_model_v1_models__model_id__get`
  - Description : Retrieve information about a model.
  - Paramètres : p:`model_id`*
  - Réponses : 200→BaseModelCard \| FTModelCard, 422→HTTPValidationError
- **`DELETE /v1/models/{model_id}`** — Delete Model · `operationId: delete_model_v1_models__model_id__delete`
  - Description : Delete a fine-tuned model.
  - Paramètres : p:`model_id`*
  - Réponses : 200→DeleteModelResponse, 422→HTTPValidationError
- **`PATCH /v1/fine_tuning/models/{model_id}`** — Update Fine Tuned Model · `operationId: jobs_api_routes_fine_tuning_update_fine_tuned_model`
  - Description : Update a model name or description.
  - Paramètres : p:`model_id`*
  - Corps : `application/json` (UpdateModelRequest) → `name`: string \| null, `description`: string \| null
  - Réponses : 200→CompletionFineTunedModel \| ClassifierFineTunedModel
- **`POST /v1/fine_tuning/models/{model_id}/archive`** — Archive Fine Tuned Model · `operationId: jobs_api_routes_fine_tuning_archive_fine_tuned_model`
  - Description : Archive a fine-tuned model.
  - Paramètres : p:`model_id`*
  - Réponses : 200→ArchiveModelResponse
- **`DELETE /v1/fine_tuning/models/{model_id}/archive`** — Unarchive Fine Tuned Model · `operationId: jobs_api_routes_fine_tuning_unarchive_fine_tuned_model`
  - Description : Un-archive a fine-tuned model.
  - Paramètres : p:`model_id`*
  - Réponses : 200→UnarchiveModelResponse

### realtime.sessions

_Realtime - Sessions API._

- **`POST /v1/client/sessions`** — Create Client Session · `operationId: create_client_session_v1_client_sessions_post`
  - Description : Create a client session. Requires the `create_client_session` permission.
  - Corps : `application/json` → CreateRealtimeSessionRequest
  - Réponses : 201→CreateRealtimeSessionResponse, 422→HTTPValidationError

### beta.service_accounts

_(beta) Service Accounts API._

- **`GET /v1/service-accounts`** — List Service Accounts · `operationId: list_service_accounts_v1_service_accounts_get`
  - Description : List the service accounts in a workspace, or across the organization.  Scoped to a workspace, this requires the Workspace admin (`workspace_admin`) role on it. Omitting the workspace lists the whole organization and requires the Organization admin (`organization_admin`) role instead.  ``q`` narrows the list to accounts whose name or description contains it. ``order`` sorts by creation time (ascending by default).
  - Paramètres : q:`workspace_id` q:`include_deleted` q:`q` q:`order` q:`offset`* q:`limit`*
  - Réponses : 200→ListServiceAccountsResponse, 422→HTTPValidationError
- **`POST /v1/service-accounts`** — Create Service Account · `operationId: create_service_account_v1_service_accounts_post`
  - Description : Create a service account in a workspace. Requires the Workspace admin (`workspace_admin`) role.
  - Corps : `application/json` (CreateServiceAccountRequest) → `name`*: string, `workspace_id`*: string, `description`: string \| null, `role_ids`: array<string>
  - Réponses : 201→ServiceAccount, 422→HTTPValidationError
- **`GET /v1/service-accounts/assignable-roles`** — List Assignable Service Account Roles · `operationId: list_assignable_service_account_roles_v1_service_accounts_assignable_roles_get`
  - Description : List the workspace roles that can be assigned to a service account.  Requires the Workspace admin (`workspace_admin`) role.
  - Paramètres : q:`workspace_id`*
  - Réponses : 200→ListAssignableServiceAccountRolesResponse, 422→HTTPValidationError
- **`GET /v1/service-accounts/{service_account_id}`** — Get Service Account · `operationId: get_service_account_v1_service_accounts__service_account_id__get`
  - Description : Retrieve a service account.  Requires the Workspace admin (`workspace_admin`) role.
  - Paramètres : p:`service_account_id`*
  - Réponses : 200→ServiceAccount, 422→HTTPValidationError
- **`PATCH /v1/service-accounts/{service_account_id}`** — Update Service Account · `operationId: update_service_account_v1_service_accounts__service_account_id__patch`
  - Description : Update a service account.  Requires the Workspace admin (`workspace_admin`) role.
  - Paramètres : p:`service_account_id`*
  - Corps : `application/json` (UpdateServiceAccountRequest) → `description`: string \| null
  - Réponses : 200→ServiceAccount, 422→HTTPValidationError
- **`DELETE /v1/service-accounts/{service_account_id}`** — Delete Service Account · `operationId: delete_service_account_v1_service_accounts__service_account_id__delete`
  - Description : Delete a service account.  Requires the Workspace admin (`workspace_admin`) role.
  - Paramètres : p:`service_account_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`GET /v1/service-accounts/{service_account_id}/roles`** — List Service Account Roles · `operationId: list_service_account_roles_v1_service_accounts__service_account_id__roles_get`
  - Description : List the workspace roles assigned to a service account.  Requires the Workspace admin (`workspace_admin`) role.
  - Paramètres : p:`service_account_id`*
  - Réponses : 200→ListServiceAccountRolesResponse, 422→HTTPValidationError
- **`PUT /v1/service-accounts/{service_account_id}/roles`** — Set Service Account Roles · `operationId: set_service_account_roles_v1_service_accounts__service_account_id__roles_put`
  - Description : Replace the workspace roles assigned to a service account.  Requires the Workspace admin (`workspace_admin`) role.
  - Paramètres : p:`service_account_id`*
  - Corps : `application/json` (SetServiceAccountRolesRequest) → `role_ids`*: array<string>
  - Réponses : 200→ListServiceAccountRolesResponse, 422→HTTPValidationError

### beta.conversations

_(beta) Conversations API_

- **`GET /v1/conversations`** — List all created conversations. · `operationId: agents_api_v1_conversations_list`
  - Description : Retrieve a list of conversation entities sorted by creation time.
  - Paramètres : q:`page` q:`page_size` q:`metadata`
  - Réponses : 200→array<ModelConversation \| AgentConversation>, 422→HTTPValidationError
- **`POST /v1/conversations`** — Create a conversation and append entries to it. · `operationId: agents_api_v1_conversations_start`
  - Description : Create a new conversation, using a base model or an agent and append entries. Completion and tool executions are run and the response is appended to the conversation.Use the returned conversation_id to continue the conversation.
  - Corps : `application/json` (ConversationRequest) → `inputs`*: ConversationInputs, `stream`: enum(False), `store`: boolean \| null, `handoff_execution`: enum(client, server) \| null, `instructions`: string \| null, `tools`: array<FunctionTool \| WebSearchTool \| WebSearchPremiumTool \| CodeInterpreterTool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector> \| null, `completion_args`: CompletionArgs \| null, `guardrails`: array<GuardrailConfig> \| null, `name`: string \| null, `description`: string \| null, `metadata`: MetadataDict \| null, `agent_id`: string \| null, `agent_version`: string \| integer \| null, `model`: string \| null
  - Réponses : 200→ConversationResponse, 422→HTTPValidationError
- **`GET /v1/conversations/{conversation_id}`** — Retrieve a conversation information. · `operationId: agents_api_v1_conversations_get`
  - Description : Given a conversation_id retrieve a conversation entity with its attributes.
  - Paramètres : p:`conversation_id`*
  - Réponses : 200→ModelConversation \| AgentConversation, 422→HTTPValidationError
- **`POST /v1/conversations/{conversation_id}`** — Append new entries to an existing conversation. · `operationId: agents_api_v1_conversations_append`
  - Description : Run completion on the history of the conversation and the user entries. Return the new created entries.
  - Paramètres : p:`conversation_id`*
  - Corps : `application/json` (ConversationAppendRequest) → `inputs`: ConversationInputs, `stream`: enum(False), `store`: boolean, `handoff_execution`: enum(client, server), `completion_args`: CompletionArgs, `tool_confirmations`: array<ToolCallConfirmation> \| null
  - Réponses : 200→ConversationResponse, 422→HTTPValidationError
- **`DELETE /v1/conversations/{conversation_id}`** — Delete a conversation. · `operationId: agents_api_v1_conversations_delete`
  - Description : Delete a conversation given a conversation_id.
  - Paramètres : p:`conversation_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`GET /v1/conversations/{conversation_id}/history`** — Retrieve all entries in a conversation. · `operationId: agents_api_v1_conversations_history`
  - Description : Given a conversation_id retrieve all the entries belonging to that conversation. The entries are sorted in the order they were appended, those can be messages, connectors or function_call.
  - Paramètres : p:`conversation_id`*
  - Réponses : 200→ConversationHistory, 422→HTTPValidationError
- **`GET /v1/conversations/{conversation_id}/messages`** — Retrieve all messages in a conversation. · `operationId: agents_api_v1_conversations_messages`
  - Description : Given a conversation_id retrieve all the messages belonging to that conversation. This is similar to retrieving all entries except we filter the messages only.
  - Paramètres : p:`conversation_id`*
  - Réponses : 200→ConversationMessages, 422→HTTPValidationError
- **`POST /v1/conversations/{conversation_id}/restart`** — Restart a conversation starting from a given entry. · `operationId: agents_api_v1_conversations_restart`
  - Description : Given a conversation_id and an id, recreate a conversation from this point and run completion. A new conversation is returned with the new entries returned.
  - Paramètres : p:`conversation_id`*
  - Corps : `application/json` (ConversationRestartRequest) → `inputs`: ConversationInputs, `stream`: enum(False), `store`: boolean, `handoff_execution`: enum(client, server), `completion_args`: CompletionArgs, `guardrails`: array<GuardrailConfig> \| null, `metadata`: MetadataDict \| null, `from_entry_id`*: string, `agent_version`: string \| integer \| null
  - Réponses : 200→ConversationResponse, 422→HTTPValidationError
- **`POST /v1/conversations#stream`** — Create a conversation and append entries to it. · `operationId: agents_api_v1_conversations_start_stream`
  - Description : Create a new conversation, using a base model or an agent and append entries. Completion and tool executions are run and the response is appended to the conversation.Use the returned conversation_id to continue the conversation.
  - Corps : `application/json` (ConversationStreamRequest) → `inputs`*: ConversationInputs, `stream`: enum(True), `store`: boolean \| null, `handoff_execution`: enum(client, server) \| null, `instructions`: string \| null, `tools`: array<FunctionTool \| WebSearchTool \| WebSearchPremiumTool \| CodeInterpreterTool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector> \| null, `completion_args`: CompletionArgs \| null, `guardrails`: array<GuardrailConfig> \| null, `name`: string \| null, `description`: string \| null, `metadata`: MetadataDict \| null, `agent_id`: string \| null, `agent_version`: string \| integer \| null, `model`: string \| null
  - Réponses : 200→ConversationEvents (SSE), 422→HTTPValidationError
- **`POST /v1/conversations/{conversation_id}#stream`** — Append new entries to an existing conversation. · `operationId: agents_api_v1_conversations_append_stream`
  - Description : Run completion on the history of the conversation and the user entries. Return the new created entries.
  - Paramètres : p:`conversation_id`*
  - Corps : `application/json` (ConversationAppendStreamRequest) → `inputs`: ConversationInputs, `stream`: enum(True), `store`: boolean, `handoff_execution`: enum(client, server), `completion_args`: CompletionArgs, `tool_confirmations`: array<ToolCallConfirmation> \| null
  - Réponses : 200→ConversationEvents (SSE), 422→HTTPValidationError
- **`POST /v1/conversations/{conversation_id}/restart#stream`** — Restart a conversation starting from a given entry. · `operationId: agents_api_v1_conversations_restart_stream`
  - Description : Given a conversation_id and an id, recreate a conversation from this point and run completion. A new conversation is returned with the new entries returned.
  - Paramètres : p:`conversation_id`*
  - Corps : `application/json` (ConversationRestartStreamRequest) → `inputs`: ConversationInputs, `stream`: enum(True), `store`: boolean, `handoff_execution`: enum(client, server), `completion_args`: CompletionArgs, `guardrails`: array<GuardrailConfig> \| null, `metadata`: MetadataDict \| null, `from_entry_id`*: string, `agent_version`: string \| integer \| null
  - Réponses : 200→ConversationEvents (SSE), 422→HTTPValidationError

### beta.agents

_(beta) Agents API_

- **`GET /v1/agents`** — List agent entities. · `operationId: agents_api_v1_agents_list` · **DÉPRÉCIÉ**
  - Description : Retrieve a list of agent entities sorted by creation time. Deprecated: some features such as agent sharing are not supported by this endpoint. Use the cursor-paginated `GET /v1/agents/pages` instead.
  - Paramètres : q:`page` q:`page_size` q:`deployment_chat` q:`sources` q:`name` q:`search` q:`id` q:`metadata`
  - Réponses : 200→array<Agent>, 422→HTTPValidationError
- **`POST /v1/agents`** — Create a agent that can be used within a conversation. · `operationId: agents_api_v1_agents_create`
  - Description : Create a new agent giving it instructions, tools, description. The agent is then available to be used as a regular assistant in a conversation or as part of an agent pool from which it can be used.
  - Corps : `application/json` (CreateAgentRequest) → `instructions`: string \| null, `tools`: array<FunctionTool \| WebSearchTool \| WebSearchPremiumTool \| CodeInterpreterTool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector>, `completion_args`: CompletionArgs, `guardrails`: array<GuardrailConfig> \| null, `model`*: string, `name`*: string, `description`: string \| null, `handoffs`: array<string> \| null, `metadata`: MetadataDict \| null, `version_message`: string \| null
  - Réponses : 200→Agent, 422→HTTPValidationError
- **`GET /v1/agents/pages`** — List agent entities, cursor-paginated. · `operationId: agents_api_v1_agents_list_pages`
  - Description : Retrieve a page of agent entities. Unlike the deprecated `GET /v1/agents`, this endpoint paginates by opaque cursor and honors per-agent sharing, returning only agents the caller is authorized to see.
  - Paramètres : q:`page_size` q:`deployment_chat` q:`sources` q:`name` q:`search` q:`id` q:`metadata` q:`page_token`
  - Réponses : 200→AgentListPage, 422→HTTPValidationError
- **`GET /v1/agents/{agent_id}`** — Retrieve an agent entity. · `operationId: agents_api_v1_agents_get`
  - Description : Given an agent, retrieve an agent entity with its attributes. The agent_version parameter can be an integer version number or a string alias.
  - Paramètres : p:`agent_id`* q:`agent_version`
  - Réponses : 200→Agent, 422→HTTPValidationError
- **`PATCH /v1/agents/{agent_id}`** — Update an agent entity. · `operationId: agents_api_v1_agents_update`
  - Description : Update an agent attributes and create a new version.
  - Paramètres : p:`agent_id`*
  - Corps : `application/json` (UpdateAgentRequest) → `instructions`: string \| null, `tools`: array<FunctionTool \| WebSearchTool \| WebSearchPremiumTool \| CodeInterpreterTool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector>, `completion_args`: CompletionArgs, `guardrails`: array<GuardrailConfig> \| null, `model`: string \| null, `name`: string \| null, `description`: string \| null, `handoffs`: array<string> \| null, `deployment_chat`: boolean \| null, `metadata`: MetadataDict \| null, `version_message`: string \| null
  - Réponses : 200→Agent, 422→HTTPValidationError
- **`DELETE /v1/agents/{agent_id}`** — Delete an agent entity. · `operationId: agents_api_v1_agents_delete`
  - Paramètres : p:`agent_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`PATCH /v1/agents/{agent_id}/version`** — Update an agent version. · `operationId: agents_api_v1_agents_update_version`
  - Description : Switch the version of an agent.
  - Paramètres : p:`agent_id`* q:`version`*
  - Réponses : 200→Agent, 422→HTTPValidationError
- **`GET /v1/agents/{agent_id}/versions`** — List all versions of an agent. · `operationId: agents_api_v1_agents_list_versions`
  - Description : Retrieve all versions for a specific agent with full agent context. Supports pagination.
  - Paramètres : p:`agent_id`* q:`page` q:`page_size`
  - Réponses : 200→array<Agent>, 422→HTTPValidationError
- **`GET /v1/agents/{agent_id}/versions/{version}`** — Retrieve a specific version of an agent. · `operationId: agents_api_v1_agents_get_version`
  - Description : Get a specific agent version by version number.
  - Paramètres : p:`agent_id`* p:`version`*
  - Réponses : 200→Agent, 422→HTTPValidationError
- **`GET /v1/agents/{agent_id}/aliases`** — List all aliases for an agent. · `operationId: agents_api_v1_agents_list_version_aliases`
  - Description : Retrieve all version aliases for a specific agent.
  - Paramètres : p:`agent_id`*
  - Réponses : 200→array<AgentAliasResponse>, 422→HTTPValidationError
- **`PUT /v1/agents/{agent_id}/aliases`** — Create or update an agent version alias. · `operationId: agents_api_v1_agents_create_or_update_alias`
  - Description : Create a new alias or update an existing alias to point to a specific version. Aliases are unique per agent and can be reassigned to different versions.
  - Paramètres : p:`agent_id`* q:`alias`* q:`version`*
  - Réponses : 200→AgentAliasResponse, 422→HTTPValidationError
- **`DELETE /v1/agents/{agent_id}/aliases`** — Delete an agent version alias. · `operationId: agents_api_v1_agents_delete_alias`
  - Description : Delete an existing alias for an agent.
  - Paramètres : p:`agent_id`* q:`alias`*
  - Réponses : 204, 422→HTTPValidationError

### files

_Files API_

- **`GET /v1/files`** — List Files · `operationId: files_api_routes_list_files`
  - Description : Returns a list of files that belong to the user's organization.
  - Paramètres : q:`page` q:`page_size` q:`include_total` q:`sample_type` q:`source` q:`search` q:`purpose` q:`mimetypes`
  - Réponses : 200→ListFilesResponse
- **`POST /v1/files`** — Upload File · `operationId: files_api_routes_upload_file`
  - Description : Upload a file that can be used across various endpoints.  The size of individual files can be a maximum of 512 MB. The Fine-tuning API only supports .jsonl files.  Please contact us if you need to increase these storage limits.
  - Corps : `multipart/form-data` (object) → `expiry`: integer \| null, `visibility`: object, `purpose`: FilePurpose, `file`*: File
  - Réponses : 200→CreateFileResponse
- **`GET /v1/files/{file_id}`** — Retrieve File · `operationId: files_api_routes_retrieve_file`
  - Description : Returns information about a specific file.
  - Paramètres : p:`file_id`*
  - Réponses : 200→GetFileResponse
- **`DELETE /v1/files/{file_id}`** — Delete File · `operationId: files_api_routes_delete_file`
  - Description : Delete a file.
  - Paramètres : p:`file_id`*
  - Réponses : 200→DeleteFileResponse
- **`GET /v1/files/{file_id}/content`** — Download File · `operationId: files_api_routes_download_file`
  - Description : Download a file
  - Paramètres : p:`file_id`*
  - Réponses : 200→string
- **`GET /v1/files/{file_id}/url`** — Get Signed Url · `operationId: files_api_routes_get_signed_url`
  - Paramètres : p:`file_id`* q:`expiry`
  - Réponses : 200→GetSignedUrlResponse

### batch

_Batch API_

- **`GET /v1/batch/jobs`** — Get Batch Jobs · `operationId: jobs_api_routes_batch_get_batch_jobs`
  - Description : Get a list of batch jobs for your organization and user.
  - Paramètres : q:`page` q:`page_size` q:`model` q:`agent_id` q:`metadata` q:`created_after` q:`created_by_me` q:`status` q:`order_by`
  - Réponses : 200→ListBatchJobsResponse
- **`POST /v1/batch/jobs`** — Create Batch Job · `operationId: jobs_api_routes_batch_create_batch_job`
  - Description : Create a new batch job, it will be queued for processing.
  - Corps : `application/json` (CreateBatchJobRequest) → `input_files`: array<string> \| null, `requests`: array<BatchRequest> \| null, `endpoint`*: ApiEndpoint, `model`: string \| null, `agent_id`: string \| null, `metadata`: object \| null, `timeout_hours`: integer
  - Réponses : 200→BatchJob
- **`GET /v1/batch/jobs/{job_id}`** — Get Batch Job · `operationId: jobs_api_routes_batch_get_batch_job`
  - Description : Get a batch job details by its UUID.  Args:     inline: If True, return results inline in the response.
  - Paramètres : p:`job_id`* q:`inline`
  - Réponses : 200→BatchJob
- **`DELETE /v1/batch/jobs/{job_id}`** — Delete Batch Job · `operationId: jobs_api_routes_batch_delete_batch_job`
  - Description : Request the deletion of a batch job.
  - Paramètres : p:`job_id`*
  - Réponses : 200→DeleteBatchJobResponse
- **`POST /v1/batch/jobs/{job_id}/cancel`** — Cancel Batch Job · `operationId: jobs_api_routes_batch_cancel_batch_job`
  - Description : Request the cancellation of a batch job.
  - Paramètres : p:`job_id`*
  - Réponses : 200→BatchJob

### chat

_Chat Completion API._

- **`POST /v1/chat/completions`** — Chat Completion · `operationId: chat_completion_v1_chat_completions_post`
  - Corps : `application/json` (ChatCompletionRequest) → `model`*: string, `temperature`: number \| null, `top_p`: number \| null, `max_tokens`: integer \| null, `stream`: boolean, `stop`: string \| array<string> \| null, `random_seed`: integer \| null, `metadata`: object \| null, `messages`*: array<SystemMessage \| UserMessage \| AssistantMessage \| ToolMessage>, `response_format`: ResponseFormat, `tools`: array<Tool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector> \| null, `tool_choice`: ToolChoice \| ToolChoiceEnum, `presence_penalty`: number \| null, `frequency_penalty`: number \| null, `min_tokens`: integer \| null, `repetition_penalty`: number \| null, `top_k`: integer \| null, `logprobs`: boolean \| null, `top_logprobs`: integer \| null, `prompt_logprobs`: boolean \| null, `top_prompt_logprobs`: integer \| null, `n`: integer \| null, `prediction`: Prediction, `parallel_tool_calls`: boolean, `reasoning_effort`: ReasoningEffort \| null, `prompt_mode`: MistralPromptMode \| null, `guardrails`: array<GuardrailConfig> \| null, `prompt_cache_key`: string \| null, `service_tier`: RequestedServiceTier \| null, `safe_prompt`: boolean
  - Réponses : 200→ChatCompletionResponse, 422→HTTPValidationError

### fim

_Fill-in-the-middle API._

- **`POST /v1/fim/completions`** — Fim Completion · `operationId: fim_completion_v1_fim_completions_post`
  - Description : FIM completion.
  - Corps : `application/json` (FIMCompletionRequest) → `model`*: string, `temperature`: number \| null, `top_p`: number \| null, `max_tokens`: integer \| null, `stream`: boolean, `stop`: string \| array<string> \| null, `random_seed`: integer \| null, `metadata`: object \| null, `prompt`*: string, `suffix`: string \| null, `min_tokens`: integer \| null, `prompt_cache_key`: string \| null
  - Réponses : 200→FIMCompletionResponse, 422→HTTPValidationError

### agents

_Agents API._

- **`POST /v1/agents/completions`** — Agents Completion · `operationId: agents_completion_v1_agents_completions_post`
  - Corps : `application/json` (AgentsCompletionRequest) → `max_tokens`: integer \| null, `stream`: boolean, `stop`: string \| array<string> \| null, `random_seed`: integer \| null, `metadata`: object \| null, `messages`*: array<SystemMessage \| UserMessage \| AssistantMessage \| ToolMessage>, `response_format`: ResponseFormat, `tools`: array<Tool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector> \| null, `tool_choice`: ToolChoice \| ToolChoiceEnum, `presence_penalty`: number \| null, `frequency_penalty`: number \| null, `min_tokens`: integer \| null, `repetition_penalty`: number \| null, `top_k`: integer \| null, `logprobs`: boolean \| null, `top_logprobs`: integer \| null, `prompt_logprobs`: boolean \| null, `top_prompt_logprobs`: integer \| null, `n`: integer \| null, `prediction`: Prediction, `parallel_tool_calls`: boolean, `reasoning_effort`: ReasoningEffort \| null, `prompt_mode`: MistralPromptMode \| null, `guardrails`: array<GuardrailConfig> \| null, `prompt_cache_key`: string \| null, `service_tier`: RequestedServiceTier \| null, `agent_id`*: string
  - Réponses : 200→ChatCompletionResponse, 422→HTTPValidationError

### embeddings

_Embeddings API._

- **`POST /v1/embeddings`** — Embeddings · `operationId: embeddings_v1_embeddings_post`
  - Corps : `application/json` (EmbeddingRequest) → `model`*: string, `metadata`: object \| null, `input`*: string \| array<string>, `output_dimension`: integer \| null, `output_dtype`: EmbeddingDtype, `encoding_format`: EncodingFormat
  - Réponses : 200→EmbeddingResponse, 422→HTTPValidationError

### classifiers

_Classifiers API._

- **`POST /v1/moderations`** — Moderations · `operationId: moderations_v1_moderations_post`
  - Corps : `application/json` (ClassificationRequest) → `model`*: string, `metadata`: object \| null, `input`*: string \| array<string>
  - Réponses : 200→ModerationResponse, 422→HTTPValidationError
- **`POST /v1/chat/moderations`** — Chat Moderations · `operationId: chat_moderations_v1_chat_moderations_post`
  - Corps : `application/json` (ChatModerationRequest) → `input`*: array<SystemMessage \| UserMessage \| AssistantMessage \| ToolMessage> \| array<array<SystemMessage \| UserMessage \| AssistantMessage \| ToolMessage>>, `model`*: string
  - Réponses : 200→ModerationResponse, 422→HTTPValidationError
- **`POST /v1/classifications`** — Classifications · `operationId: classifications_v1_classifications_post`
  - Corps : `application/json` (ClassificationRequest) → `model`*: string, `metadata`: object \| null, `input`*: string \| array<string>
  - Réponses : 200→ClassificationResponse, 422→HTTPValidationError
- **`POST /v1/chat/classifications`** — Chat Classifications · `operationId: chat_classifications_v1_chat_classifications_post`
  - Corps : `application/json` (ChatClassificationRequest) → `model`*: string, `input`*: ChatClassificationRequestInputs
  - Réponses : 200→ClassificationResponse, 422→HTTPValidationError

### ocr

_OCR API_

- **`POST /v1/ocr`** — OCR · `operationId: ocr_v1_ocr_post`
  - Corps : `application/json` (OCRRequest) → `model`*: string \| null, `document`*: FileChunk \| DocumentURLChunk \| ImageURLChunk, `pages`: string \| array<integer> \| null, `include_image_base64`: boolean \| null, `image_limit`: integer \| null, `image_min_size`: integer \| null, `bbox_annotation_format`: ResponseFormat \| null, `document_annotation_format`: ResponseFormat \| null, `document_annotation_prompt`: string \| null, `table_format`: enum(markdown, html) \| null, `extract_header`: boolean, `extract_footer`: boolean, `include_blocks`: boolean, `confidence_scores_granularity`: enum(word, page, block) \| null
  - Réponses : 200→OCRResponse, 422→HTTPValidationError

### audio.transcriptions

_API for audio transcription._

- **`POST /v1/audio/transcriptions`** — Create Transcription · `operationId: audio_api_v1_transcriptions_post`
  - Corps : `multipart/form-data` (AudioTranscriptionRequest) → `model`*: string, `file`: File \| null, `file_url`: string \| null, `file_id`: string \| null, `language`: string \| null, `temperature`: number \| null, `stream`: const False, `diarize`: boolean, `context_bias`: array<string>, `timestamp_granularities`: array<TimestampGranularity>
  - Réponses : 200→TranscriptionResponse
- **`POST /v1/audio/transcriptions#stream`** — Create Streaming Transcription (SSE) · `operationId: audio_api_v1_transcriptions_post_stream`
  - Corps : `multipart/form-data` (AudioTranscriptionRequestStream) → `model`*: string, `file`: File \| null, `file_url`: string \| null, `file_id`: string \| null, `language`: string \| null, `temperature`: number \| null, `stream`: const True, `diarize`: boolean, `context_bias`: array<string>, `timestamp_granularities`: array<TimestampGranularity>
  - Réponses : 200→TranscriptionStreamEvents (SSE)

### beta.libraries

_(beta) Libraries API to create and manage libraries - index your documents to enhance agent capabilities._

- **`GET /v1/libraries`** — List all libraries you have access to. · `operationId: libraries_list_v1`
  - Description : List all libraries that you have created or have been shared with you.
  - Paramètres : q:`page_size` q:`page_token` q:`page` q:`search` q:`filter_owned_by_me`
  - Réponses : 200→ListLibrariesResponse, 422→HTTPValidationError
- **`POST /v1/libraries`** — Create a new Library. · `operationId: libraries_create_v1`
  - Description : Create a new Library, you will be marked as the owner and only you will have the possibility to share it with others. When first created this will only be accessible by you.
  - Corps : `application/json` (CreateLibraryRequest) → `name`*: string, `description`: string \| null, `chunk_size`: integer \| null, `owner_type`: enum(User, Workspace) \| null
  - Réponses : 201→Library, 422→HTTPValidationError
- **`GET /v1/libraries/{library_id}`** — Detailed information about a specific Library. · `operationId: libraries_get_v1`
  - Description : Given a library id, details information about that Library.
  - Paramètres : p:`library_id`*
  - Réponses : 200→Library, 422→HTTPValidationError
- **`PUT /v1/libraries/{library_id}`** — Update a library. · `operationId: libraries_update_v1` · **DÉPRÉCIÉ**
  - Description : Given a library id, you can update the name and description.
  - Paramètres : p:`library_id`*
  - Corps : `application/json` (UpdateLibraryRequest) → `name`: string, `description`: string \| null
  - Réponses : 200→Library, 422→HTTPValidationError
- **`PATCH /v1/libraries/{library_id}`** — Update a library. · `operationId: libraries_patch_v1`
  - Description : Given a library id, you can update the name and description.
  - Paramètres : p:`library_id`*
  - Corps : `application/json` (UpdateLibraryRequest) → `name`: string, `description`: string \| null
  - Réponses : 200→Library, 422→HTTPValidationError
- **`DELETE /v1/libraries/{library_id}`** — Delete a library and all of it's document. · `operationId: libraries_delete_v1`
  - Description : Given a library id, deletes it together with all documents that have been uploaded to that library. Warning: the response will change from 200 (returning the deleted library) to 204 No Content in a future version.
  - Paramètres : p:`library_id`*
  - Réponses : 200→Library, 204, 422→HTTPValidationError

### beta.libraries.documents

_(beta) Libraries API - manage documents in a library._

- **`GET /v1/libraries/{library_id}/documents`** — List documents in a given library. · `operationId: libraries_documents_list_v1`
  - Description : Given a library, lists the document that have been uploaded to that library.
  - Paramètres : p:`library_id`* q:`search` q:`page_size` q:`page` q:`filters_attributes` q:`sort_by` q:`sort_order`
  - Réponses : 200→ListDocumentsResponse, 422→HTTPValidationError
- **`POST /v1/libraries/{library_id}/documents`** — Upload a new document. · `operationId: libraries_documents_upload_v1`
  - Description : Given a library, upload a new document to that library. It is queued for processing, it status will change it has been processed. The processing has to be completed in order be discoverable for the library search
  - Paramètres : p:`library_id`*
  - Corps : `multipart/form-data` (object) → `file`*: File
  - Réponses : 201→Document, 200→Document, 422→HTTPValidationError
- **`GET /v1/libraries/{library_id}/documents/{document_id}`** — Retrieve the metadata of a specific document. · `operationId: libraries_documents_get_v1`
  - Description : Given a library and a document in this library, you can retrieve the metadata of that document.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Réponses : 200→Document, 422→HTTPValidationError
- **`PUT /v1/libraries/{library_id}/documents/{document_id}`** — Update the metadata of a specific document. · `operationId: libraries_documents_update_v1` · **DÉPRÉCIÉ**
  - Description : Given a library and a document in that library, update the name of that document.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Corps : `application/json` (UpdateDocumentRequest) → `name`: string, `attributes`: object \| null, `expires_at`: string \| null
  - Réponses : 200→Document, 422→HTTPValidationError
- **`PATCH /v1/libraries/{library_id}/documents/{document_id}`** — Update the metadata of a specific document. · `operationId: libraries_documents_patch_v1`
  - Description : Given a library and a document in that library, update the name and/or attributes of that document.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Corps : `application/json` (UpdateDocumentRequest) → `name`: string, `attributes`: object \| null, `expires_at`: string \| null
  - Réponses : 200→Document, 422→HTTPValidationError
- **`DELETE /v1/libraries/{library_id}/documents/{document_id}`** — Delete a document. · `operationId: libraries_documents_delete_v1`
  - Description : Given a library and a document in that library, delete that document. The document will be deleted from the library and the search index.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`GET /v1/libraries/{library_id}/documents/{document_id}/text_content`** — Retrieve the text content of a specific document. · `operationId: libraries_documents_get_text_content_v1`
  - Description : Given a library and a document in that library, you can retrieve the text content of that document if it exists. For documents like pdf, docx and pptx the text content results from our processing using Mistral OCR.
  - Paramètres : p:`library_id`* p:`document_id`* q:`page_start` q:`page_end`
  - Réponses : 200→DocumentTextContent, 422→HTTPValidationError
- **`GET /v1/libraries/{library_id}/documents/{document_id}/status`** — Retrieve the processing status of a specific document. · `operationId: libraries_documents_get_status_v1`
  - Description : Given a library and a document in that library, retrieve the processing status of that document.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Réponses : 200→ProcessingStatus, 422→HTTPValidationError
- **`GET /v1/libraries/{library_id}/documents/{document_id}/signed-url`** — Retrieve the signed URL of a specific document. · `operationId: libraries_documents_get_signed_url_v1`
  - Description : Given a library and a document in that library, retrieve the signed URL of a specific document.The url will expire after 30 minutes and can be accessed by anyone with the link.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Réponses : 200→string, 422→HTTPValidationError
- **`GET /v1/libraries/{library_id}/documents/{document_id}/extracted-text-signed-url`** — Retrieve the signed URL of text extracted from a given document. · `operationId: libraries_documents_get_extracted_text_signed_url_v1`
  - Description : Given a library and a document in that library, retrieve the signed URL of text extracted. For documents that are sent to the OCR this returns the result of the OCR queries.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Réponses : 200→string, 422→HTTPValidationError
- **`POST /v1/libraries/{library_id}/documents/{document_id}/reprocess`** — Reprocess a document. · `operationId: libraries_documents_reprocess_v1`
  - Description : Given a library and a document in that library, reprocess that document, it will be billed again.
  - Paramètres : p:`library_id`* p:`document_id`*
  - Réponses : 204, 422→HTTPValidationError

### beta.libraries.accesses

_(beta) Libraries API - manage access to a library._

- **`GET /v1/libraries/{library_id}/share`** — List all of the access to this library. · `operationId: libraries_share_list_v1`
  - Description : Given a library, list all of the Entity that have access and to what level.
  - Paramètres : p:`library_id`*
  - Réponses : 200→ListSharingResponse, 422→HTTPValidationError
- **`PUT /v1/libraries/{library_id}/share`** — Create or update an access level. · `operationId: libraries_share_create_v1`
  - Description : Given a library id, you can create or update the access level of an entity. You have to be owner of the library to share a library. An owner cannot change their own role. A library cannot be shared outside of the organization.
  - Paramètres : p:`library_id`*
  - Corps : `application/json` (SharingRequest) → `org_id`: string \| null, `level`*: ShareEnum, `share_with_uuid`*: string, `share_with_type`*: EntityType
  - Réponses : 200→Sharing, 422→HTTPValidationError
- **`DELETE /v1/libraries/{library_id}/share`** — Delete an access level. · `operationId: libraries_share_delete_v1`
  - Description : Given a library id, you can delete the access level of an entity. An owner cannot delete their own access. You have to be the owner of the library to delete an access other than yours. Warning: the response will change from 200 (returning the deleted sharing) to 204 No Content in a future version.
  - Paramètres : p:`library_id`*
  - Corps : `application/json` (SharingDelete) → `org_id`: string \| null, `share_with_uuid`*: string, `share_with_type`*: EntityType
  - Réponses : 200→Sharing, 204, 422→HTTPValidationError

### beta.observability.judges

_(beta) Observability API - judges._

- **`GET /v1/observability/judges`** — Get judges with optional filtering and search · `operationId: get_judges_v1_observability_judges_get`
  - Paramètres : q:`type_filter` q:`model_filter` q:`page_size` q:`page` q:`q`
  - Réponses : 200→ListJudgesResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/judges`** — Create a new judge · `operationId: create_judge_v1_observability_judges_post`
  - Corps : `application/json` (CreateJudgeRequest) → `name`*: string, `description`*: string, `model_name`*: string, `output`*: JudgeClassificationOutput \| JudgeRegressionOutput, `instructions`*: string, `tools`*: array<string>
  - Réponses : 201→Judge, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/judges/{judge_id}`** — Get judge by id · `operationId: get_judge_by_id_v1_observability_judges__judge_id__get`
  - Paramètres : p:`judge_id`*
  - Réponses : 200→Judge, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`PUT /v1/observability/judges/{judge_id}`** — Update a judge · `operationId: update_judge_v1_observability_judges__judge_id__put`
  - Paramètres : p:`judge_id`*
  - Corps : `application/json` (UpdateJudgeRequest) → `name`*: string, `description`*: string, `model_name`*: string, `output`*: JudgeClassificationOutput \| JudgeRegressionOutput, `instructions`*: string, `tools`*: array<string>
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`DELETE /v1/observability/judges/{judge_id}`** — Delete a judge · `operationId: delete_judge_v1_observability_judges__judge_id__delete`
  - Paramètres : p:`judge_id`*
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/judges/{judge_id}/live-judging`** — Run a saved judge on a conversation · `operationId: judge_conversation_v1_observability_judges__judge_id__live_judging_post`
  - Paramètres : p:`judge_id`*
  - Corps : `application/json` (JudgeConversationRequest) → `messages`*: array<object>, `properties`: object \| null
  - Réponses : 200→JudgeOutput, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.datasets

_(beta) Observability API - datasets._

- **`GET /v1/observability/datasets`** — List existing datasets · `operationId: get_datasets_v1_observability_datasets_get`
  - Paramètres : q:`page_size` q:`page` q:`q`
  - Réponses : 200→ListDatasetsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/datasets`** — Create a new empty dataset · `operationId: create_dataset_v1_observability_datasets_post`
  - Corps : `application/json` (CreateDatasetRequest) → `name`*: string, `description`*: string
  - Réponses : 201→Dataset, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/datasets/{dataset_id}`** — Get dataset by ID or slug · `operationId: get_dataset_by_id_v1_observability_datasets__dataset_id__get`
  - Paramètres : p:`dataset_id`*
  - Réponses : 200→DatasetPreview, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`PATCH /v1/observability/datasets/{dataset_id}`** — Patch dataset · `operationId: update_dataset_v1_observability_datasets__dataset_id__patch`
  - Paramètres : p:`dataset_id`*
  - Corps : `application/json` (UpdateDatasetRequest) → `name`: string \| null, `description`: string \| null
  - Réponses : 200→DatasetPreview, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`DELETE /v1/observability/datasets/{dataset_id}`** — Delete a dataset · `operationId: delete_dataset_v1_observability_datasets__dataset_id__delete`
  - Paramètres : p:`dataset_id`*
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/datasets/{dataset_id}/records`** — List existing records in the dataset · `operationId: get_dataset_records_v1_observability_datasets__dataset_id__records_get`
  - Paramètres : p:`dataset_id`* q:`page_size` q:`page`
  - Réponses : 200→ListDatasetRecordsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/datasets/{dataset_id}/records`** — Add a record to the dataset · `operationId: create_dataset_record_v1_observability_datasets__dataset_id__records_post`
  - Paramètres : p:`dataset_id`*
  - Corps : `application/json` (CreateDatasetRecordRequest) → `payload`*: DatasetRecordPayload, `properties`: object, `source`: enum(DIRECT_INPUT, TELEMETRY_SPAN)
  - Réponses : 201→DatasetRecord, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/datasets/{dataset_id}/imports/from-file`** — Populate the dataset with records from an uploaded file · `operationId: post_dataset_records_from_file_v1_observability_datasets__dataset_id__imports_from_file_post`
  - Paramètres : p:`dataset_id`*
  - Corps : `application/json` (ImportDatasetFromFileRequest) → `file_id`*: string
  - Réponses : 202→DatasetImportTask, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/datasets/{dataset_id}/imports/from-playground`** — Populate the dataset with records from playground conversations · `operationId: post_dataset_records_from_playground_v1_observability_datasets__dataset_id__imports_from_playground_post`
  - Paramètres : p:`dataset_id`*
  - Corps : `application/json` (ImportDatasetFromPlaygroundRequest) → `conversation_ids`*: array<string>
  - Réponses : 202→DatasetImportTask, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/datasets/{dataset_id}/imports/from-spans`** — Populate the dataset with records mapped from telemetry spans · `operationId: post_dataset_records_from_spans_v1_observability_datasets__dataset_id__imports_from_spans_post`
  - Description : Starts an asynchronous import of the requested telemetry spans. References not returned by the tenant-scoped telemetry query are skipped without distinguishing absence from access restrictions.
  - Paramètres : p:`dataset_id`*
  - Corps : `application/json` (ImportDatasetFromSpansRequest) → `span_references`*: array<TelemetrySpanReference>, `mapping_contract`*: SpanDatasetMappingContract
  - Réponses : 202→DatasetImportTask, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/datasets/{dataset_id}/imports/from-dataset`** — Populate the dataset with records from another dataset · `operationId: post_dataset_records_from_dataset_v1_observability_datasets__dataset_id__imports_from_dataset_post`
  - Paramètres : p:`dataset_id`*
  - Corps : `application/json` (ImportDatasetFromDatasetRequest) → `dataset_record_ids`*: array<string>
  - Réponses : 202→DatasetImportTask, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/datasets/{dataset_id}/exports/to-jsonl`** — Export to the Files API and retrieve presigned URL to download the resulting JSONL file · `operationId: export_dataset_to_jsonl_v1_observability_datasets__dataset_id__exports_to_jsonl_get`
  - Paramètres : p:`dataset_id`*
  - Réponses : 200→ExportDatasetResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/datasets/{dataset_id}/tasks/{task_id}`** — Get status of a dataset import task · `operationId: get_dataset_import_task_v1_observability_datasets__dataset_id__tasks__task_id__get`
  - Paramètres : p:`dataset_id`* p:`task_id`*
  - Réponses : 200→DatasetImportTask, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/datasets/{dataset_id}/tasks`** — List import tasks for the given dataset · `operationId: get_dataset_import_tasks_v1_observability_datasets__dataset_id__tasks_get`
  - Paramètres : p:`dataset_id`* q:`page_size` q:`page`
  - Réponses : 200→ListDatasetImportTasksResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.datasets.records

_(beta) Observability API - dataset records._

- **`GET /v1/observability/dataset-records/{dataset_record_id}`** — Get the content of a given dataset record · `operationId: get_dataset_record_v1_observability_dataset_records__dataset_record_id__get`
  - Paramètres : p:`dataset_record_id`*
  - Réponses : 200→DatasetRecord, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`DELETE /v1/observability/dataset-records/{dataset_record_id}`** — Delete a record from a dataset · `operationId: delete_dataset_record_v1_observability_dataset_records__dataset_record_id__delete`
  - Paramètres : p:`dataset_record_id`*
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/dataset-records/bulk-delete`** — Delete multiple records from datasets · `operationId: delete_dataset_records_v1_observability_dataset_records_bulk_delete_post`
  - Corps : `application/json` (DeleteDatasetRecordsRequest) → `dataset_record_ids`*: array<string>
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/dataset-records/{dataset_record_id}/live-judging`** — Run Judge on a dataset record based on the given options · `operationId: judge_dataset_record_v1_observability_dataset_records__dataset_record_id__live_judging_post`
  - Paramètres : p:`dataset_record_id`*
  - Corps : `application/json` (JudgeDatasetRecordRequest) → `judge_definition`*: CreateJudgeRequest
  - Réponses : 200→JudgeOutput, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`PUT /v1/observability/dataset-records/{dataset_record_id}/payload`** — Update a dataset record payload · `operationId: update_dataset_record_payload_v1_observability_dataset_records__dataset_record_id__payload_put`
  - Paramètres : p:`dataset_record_id`*
  - Corps : `application/json` (UpdateDatasetRecordPayloadRequest) → `payload`*: DatasetRecordPayload
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`PUT /v1/observability/dataset-records/{dataset_record_id}/properties`** — Update dataset record properties · `operationId: update_dataset_record_properties_v1_observability_dataset_records__dataset_record_id__properties_put`
  - Paramètres : p:`dataset_record_id`*
  - Corps : `application/json` (UpdateDatasetRecordPropertiesRequest) → `properties`*: object
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.evaluations

_(beta) Observability - Evaluations API._

- **`GET /v1/observability/pipelines`** — List pipelines · `operationId: list_pipelines_v1_observability_pipelines_get`
  - Paramètres : q:`enabled` q:`page_size` q:`page` q:`q`
  - Réponses : 200→PipelinesResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/pipelines`** — Create a pipeline · `operationId: create_pipeline_v1_observability_pipelines_post`
  - Corps : `application/json` (CreatePipelineRequest) → `name`*: string, `description`: string \| null, `selectors`*: array<PipelineConfigSelector>, `definitions`*: array<LlmJudgeReference>, `enabled`: boolean
  - Réponses : 201→Pipeline, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/pipelines/{pipeline_id}`** — Get a pipeline · `operationId: get_pipeline_v1_observability_pipelines__pipeline_id__get`
  - Paramètres : p:`pipeline_id`*
  - Réponses : 200→Pipeline, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`PUT /v1/observability/pipelines/{pipeline_id}`** — Update a pipeline · `operationId: update_pipeline_v1_observability_pipelines__pipeline_id__put`
  - Paramètres : p:`pipeline_id`*
  - Corps : `application/json` (UpdatePipelineRequest) → `name`: string, `description`: string \| null, `selectors`: array<PipelineConfigSelector>, `definitions`: array<LlmJudgeReference>, `enabled`: boolean
  - Réponses : 200→Pipeline, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`DELETE /v1/observability/pipelines/{pipeline_id}`** — Delete a pipeline · `operationId: delete_pipeline_v1_observability_pipelines__pipeline_id__delete`
  - Paramètres : p:`pipeline_id`*
  - Réponses : 204, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/projects/{project_slug}/evaluations_v2`** — List evaluations for a project · `operationId: get_project_evaluations_v2_v1_observability_projects__project_slug__evaluations_v2_get`
  - Paramètres : p:`project_slug`* q:`page_size` q:`page`
  - Réponses : 200→EvaluationsV2, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/evaluations_v2/{evaluation_slug}`** — Get evaluation by slug · `operationId: get_evaluation_v2_v1_observability_evaluations_v2__evaluation_slug__get`
  - Paramètres : p:`evaluation_slug`*
  - Réponses : 200→EvaluationV2, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.logs

_(beta) Observability API - logs._

- **`POST /v1/observability/logs/search`** — Search logs · `operationId: search_logs_v1_observability_logs_search_post`
  - Paramètres : q:`from` q:`to` q:`page_size` q:`cursor`
  - Corps : `application/json` (LogsRequest) → `search_expression`: string \| null, `order`: enum(asc, desc)
  - Réponses : 200→GetLogs, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/logs/fields`** — Get log field definitions · `operationId: get_log_fields_v1_observability_logs_fields_get`
  - Réponses : 200→GetLogFields, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/logs/fields/{field_name}/options`** — Get options for a log field · `operationId: get_log_field_options_v1_observability_logs_fields__field_name__options_get`
  - Paramètres : p:`field_name`* q:`from` q:`to`
  - Réponses : 200→GetLogFieldOptions, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.traces

_(beta) Observability API - traces._

- **`POST /v1/observability/traces/search`** — Search traces · `operationId: search_traces_v1_observability_traces_search_post`
  - Paramètres : q:`from` q:`to` q:`page_size` q:`cursor`
  - Corps : `application/json` (TracesRequest) → `search_expression`: string \| null
  - Réponses : 200→GetTraces, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/traces/aggregate`** — Aggregate traces · `operationId: aggregate_traces_v1_observability_traces_aggregate_post`
  - Paramètres : q:`from` q:`to`
  - Corps : `application/json` (AggregationRequest) → `metric`*: MetricDefinition, `dimensions`: array<string>, `time_dimension`: TimeDimension \| null, `search_expression`: string \| null, `order_by`: array<OrderByClause> \| null, `limit`: integer
  - Réponses : 200→Aggregation, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/traces/fields`** — Get trace field definitions · `operationId: get_trace_fields_v1_observability_traces_fields_get`
  - Réponses : 200→GetTraceFields, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/traces/{trace_id}`** — Get trace by id · `operationId: get_trace_by_id_v1_observability_traces__trace_id__get`
  - Paramètres : p:`trace_id`*
  - Réponses : 200→GetTrace, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/traces/{trace_id}/spans`** — Get trace spans · `operationId: get_trace_spans_v1_observability_traces__trace_id__spans_get`
  - Paramètres : p:`trace_id`* q:`from` q:`to` q:`page_size` q:`cursor`
  - Réponses : 200→GetSpans, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/traces/fields/{field_name}/options`** — Get options for a trace field · `operationId: get_trace_field_options_v1_observability_traces_fields__field_name__options_get`
  - Paramètres : p:`field_name`* q:`from` q:`to`
  - Réponses : 200→GetTraceFieldOptions, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/traces/{trace_id}/spans/{span_id}`** — Get span by id · `operationId: get_span_by_id_v1_observability_traces__trace_id__spans__span_id__get`
  - Paramètres : p:`trace_id`* p:`span_id`* q:`from` q:`to`
  - Réponses : 200→GetSpan, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.spans

_(beta) Observability API - spans._

- **`POST /v1/observability/spans/search`** — Search spans · `operationId: search_spans_v1_observability_spans_search_post`
  - Paramètres : q:`from` q:`to` q:`page_size` q:`cursor`
  - Corps : `application/json` (SpansRequest) → `search_expression`: string \| null
  - Réponses : 200→GetSpans, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/spans/aggregate`** — Aggregate spans · `operationId: aggregate_spans_v1_observability_spans_aggregate_post`
  - Paramètres : q:`from` q:`to`
  - Corps : `application/json` (AggregationRequest) → `metric`*: MetricDefinition, `dimensions`: array<string>, `time_dimension`: TimeDimension \| null, `search_expression`: string \| null, `order_by`: array<OrderByClause> \| null, `limit`: integer
  - Réponses : 200→Aggregation, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/spans/evaluations/aggregate`** — Aggregate span evaluations · `operationId: aggregate_span_evaluations_v1_observability_spans_evaluations_aggregate_post`
  - Paramètres : q:`from` q:`to`
  - Corps : `application/json` (AggregationRequest) → `metric`*: MetricDefinition, `dimensions`: array<string>, `time_dimension`: TimeDimension \| null, `search_expression`: string \| null, `order_by`: array<OrderByClause> \| null, `limit`: integer
  - Réponses : 200→Aggregation, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/spans/evaluations/search`** — Search span evaluations · `operationId: search_span_evaluations_v1_observability_spans_evaluations_search_post`
  - Paramètres : q:`from` q:`to` q:`page_size` q:`cursor`
  - Corps : `application/json` (SpanEvaluationsRequest) → `search_expression`: string \| null
  - Réponses : 200→GetSpanEvaluations, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/spans/evaluations/search/latest`** — Search latest span evaluations · `operationId: search_latest_span_evaluations_v1_observability_spans_evaluations_search_latest_post`
  - Paramètres : q:`from` q:`to` q:`page_size` q:`cursor`
  - Corps : `application/json` (SpanEvaluationsRequest) → `search_expression`: string \| null
  - Réponses : 200→GetSpanEvaluations, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/pipeline-results/search`** — Search pipeline results · `operationId: search_pipeline_results_v1_observability_pipeline_results_search_post`
  - Paramètres : q:`from` q:`to` q:`page_size` q:`cursor`
  - Corps : `application/json` (PipelineResultsRequest) → `pipeline_config_slugs`*: array<string>, `search_expression`: string \| null
  - Réponses : 200→GetPipelineResults, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/spans/fields`** — Get span field definitions · `operationId: get_span_fields_v1_observability_spans_fields_get`
  - Réponses : 200→GetSpanFields, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/spans/evaluations/fields`** — Get span evaluation field definitions · `operationId: get_span_evaluation_fields_v1_observability_spans_evaluations_fields_get`
  - Réponses : 200→GetSpanEvaluationFields, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/spans/fields/{field_name}/options`** — Get options for a span field · `operationId: get_span_field_options_v1_observability_spans_fields__field_name__options_get`
  - Paramètres : p:`field_name`* q:`from` q:`to`
  - Réponses : 200→GetSpanFieldOptions, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/spans/evaluations/fields/{field_name}/options`** — Get options for a span evaluation field · `operationId: get_span_evaluation_field_options_v1_observability_spans_evaluations_fields__field_name__options_get`
  - Paramètres : p:`field_name`* q:`from` q:`to`
  - Réponses : 200→GetSpanEvaluationFieldOptions, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.evaluations.projects

_(beta) Observability - Evaluations - Projects API._

- **`GET /v1/observability/projects`** — List projects · `operationId: get_projects_v1_observability_projects_get`
  - Paramètres : q:`q` q:`page_size` q:`page`
  - Réponses : 200→Projects, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/projects/{project_slug}`** — Get project by slug · `operationId: get_project_v1_observability_projects__project_slug__get`
  - Paramètres : p:`project_slug`*
  - Réponses : 200→Project, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.evaluations.runs

_(beta) Observability - Evaluations - Runs API._

- **`POST /v1/observability/evaluations_v2/{evaluation_slug}/runs/search`** — Search evaluation runs with filters · `operationId: search_evaluation_runs_v2_v1_observability_evaluations_v2__evaluation_slug__runs_search_post`
  - Paramètres : p:`evaluation_slug`* q:`page_size` q:`page`
  - Corps : `application/json` → EvaluationRunFilterInput \| null
  - Réponses : 200→ListEvaluationRunsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/evaluation-runs_v2/search`** — Search evaluation runs across all evaluations · `operationId: search_all_evaluation_runs_v2_v1_observability_evaluation_runs_v2_search_post`
  - Paramètres : q:`page_size` q:`page`
  - Corps : `application/json` → EvaluationRunFilterInput \| null
  - Réponses : 200→SearchAllEvaluationRunsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/evaluation-runs_v2/{run_id}`** — Get a specific evaluation run by ID · `operationId: get_evaluation_run_v2_v1_observability_evaluation_runs_v2__run_id__get`
  - Paramètres : p:`run_id`*
  - Réponses : 200→EvaluationRunV2Response, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/evaluation-runs_v2/{run_id}/statistics`** — Get statistics for a specific evaluation run · `operationId: get_single_evaluation_run_statistics_v2_v1_observability_evaluation_runs_v2__run_id__statistics_get`
  - Paramètres : p:`run_id`*
  - Réponses : 200→RunStatisticsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/evaluation-runs_v2/{run_id}/statistics/compute`** — Compute statistics for a specific evaluation run with optional filters · `operationId: compute_filtered_run_statistics_v2_v1_observability_evaluation_runs_v2__run_id__statistics_compute_post`
  - Paramètres : p:`run_id`*
  - Corps : `application/json` → EvaluationRunRecordFilterInput \| null
  - Réponses : 200→RunStatisticsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.evaluations.records

_(beta) Observability - Evaluations - Records API._

- **`GET /v1/observability/evaluation-runs_v2/{run_id}/records/{record_id}`** — Get a specific record from an evaluation run · `operationId: get_evaluation_run_record_v2_v1_observability_evaluation_runs_v2__run_id__records__record_id__get`
  - Paramètres : p:`run_id`* p:`record_id`*
  - Réponses : 200→EvaluationRunRecordV2Response, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`POST /v1/observability/evaluation-runs_v2/{run_id}/records/search`** — Search records for an evaluation run with content filters · `operationId: search_evaluation_run_records_v2_v1_observability_evaluation_runs_v2__run_id__records_search_post`
  - Paramètres : p:`run_id`* q:`page_size` q:`page`
  - Corps : `application/json` → EvaluationRunRecordFilterInput \| null
  - Réponses : 200→ListEvaluationRunRecordsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.observability.evaluations.optimizations

_(beta) Observability - Evaluations - Optimizations API._

- **`GET /v1/observability/optimizations`** — List optimizations with optional filters · `operationId: list_optimizations_v1_observability_optimizations_get`
  - Paramètres : q:`project` q:`evaluation` q:`status` q:`algorithm` q:`tags` q:`page_size` q:`page`
  - Réponses : 200→ListOptimizationsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/optimizations/{optimization_id}`** — Get an optimization by id (with its anchored evaluation + project) · `operationId: get_optimization_v1_observability_optimizations__optimization_id__get`
  - Paramètres : p:`optimization_id`*
  - Réponses : 200→OptimizationDetail, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError
- **`GET /v1/observability/optimizations/{optimization_id}/trials`** — List an optimization's trials with their observation runs (paginated) · `operationId: list_optimization_trials_v1_observability_optimizations__optimization_id__trials_get`
  - Paramètres : p:`optimization_id`* q:`page_size` q:`page`
  - Réponses : 200→ListOptimizationTrialsResponse, 400→ObservabilityError, 404→ObservabilityError, 408→ObservabilityError, 409→ObservabilityError, 422→ObservabilityError

### beta.connectors

_(beta) Connectors API - manage your connectors_

- **`GET /v1/connectors`** — List all connectors. · `operationId: connector_list_v1`
  - Description : List all your custom connectors with keyset pagination and filters.
  - Paramètres : q:`query_filters` q:`cursor` q:`page_size`
  - Réponses : 200→PaginatedConnectors, 422→HTTPValidationError
- **`POST /v1/connectors`** — Create a new connector. · `operationId: connector_create_v1`
  - Description : Create a new MCP or HTTP connector. You can customize its visibility, URL, and auth type.
  - Corps : `application/json` → CreateConnectorRequest \| CreateHTTPConnectorRequest
  - Réponses : 201→Connector, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}/auth_url`** — Get the auth URL for a connector. · `operationId: connector_get_auth_url_v1`
  - Description : Get the OAuth2 authorization URL for a connector to initiate user authentication.
  - Paramètres : p:`connector_id_or_name`* q:`app_return_url` q:`method_type` q:`credentials_name` q:`credentials_title` q:`github_installation_link`
  - Réponses : 200→AuthUrlResponse, 422→HTTPValidationError
- **`PUT /v1/connectors/{connector_id}/share`** — Share a private connector to the current workspace. · `operationId: connector_share_v1`
  - Description : Transfers ownership of a private user-owned connector to the current workspace, making it available to all workspace members. The creator can later revert this via the unshare endpoint. Any authentication flows that rely on the original owner's identity (e.g. OAuth on-behalf-of) will be affected and must be reconfigured after sharing. Only the connector's creator can call this endpoint. Requires the ShareConnectorToWorkspace workspace permission.
  - Paramètres : p:`connector_id`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`DELETE /v1/connectors/{connector_id}/share`** — Unshare a connector from the current workspace. · `operationId: connector_unshare_v1`
  - Description : Reverts a workspace-shared connector back to a private, creator-owned connector. Workspace-scoped connections and other members' connections are removed; the creator's own connection is preserved. Only the connector's creator can call this endpoint. Requires the ShareConnectorToWorkspace workspace permission.
  - Paramètres : p:`connector_id`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`PUT /v1/connectors/{connector_id}/organization/share`** — Share a connector to the current organization. · `operationId: connector_share_to_organization_v1`
  - Description : Transfers ownership of a private user-owned connector to the current organization, making it available to all organization members. The creator can later revert this via the unshare endpoint. Any authentication flows that rely on the original owner's identity (e.g. OAuth on-behalf-of) will be affected and must be reconfigured after sharing. Requires the ShareConnectorToOrg organization permission.
  - Paramètres : p:`connector_id`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`DELETE /v1/connectors/{connector_id}/organization/share`** — Unshare a connector from the current organization. · `operationId: connector_unshare_from_organization_v1`
  - Description : Reverts an organization-shared connector back to a private, creator-owned connector. Organization-scoped connections and other members' connections are removed; the creator's own connection is preserved. Requires the ShareConnectorToOrg organization permission.
  - Paramètres : p:`connector_id`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`POST /v1/connectors/{connector_id}/{consumer_scope}/activate`** — Activate a connector for the given consumer (organization, workspace, user). · `operationId: connector_activate_for_consumer_v1`
  - Description : Enable a connector for the consumer.
  - Paramètres : p:`connector_id`* p:`consumer_scope`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`POST /v1/connectors/{connector_id}/{consumer_scope}/deactivate`** — Deactivate a connector for the current consumer (at organization, workspace or user level). · `operationId: connector_deactivate_for_consumer_v1`
  - Description : Disable a connector for the calling consumer only.
  - Paramètres : p:`connector_id`* p:`consumer_scope`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`POST /v1/connectors/{connector_id_or_name}/tools/{tool_name}/call`** — Call Connector Tool · `operationId: connector_call_tool_v1` · **DÉPRÉCIÉ**
  - Description : Call a tool on an MCP connector.
  - Paramètres : p:`tool_name`* p:`connector_id_or_name`* q:`credentials_name`
  - Corps : `application/json` (ConnectorCallToolRequest) → `arguments`: object
  - Réponses : 200→ConnectorToolCallResponse, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}/tools`** — List tools for a connector. · `operationId: connector_list_tools_v1`
  - Description : List all tools available for an MCP connector.
  - Paramètres : p:`connector_id_or_name`* q:`page_size` q:`refresh` q:`pretty` q:`credentials_name`
  - Réponses : 200→array<MCPTool> \| array<object>, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}/authentication_methods`** — Get authentication methods for a connector. · `operationId: connector_get_authentication_methods_v1`
  - Description : Get the authentication schema for a connector. Returns the list of supported authentication methods and their required headers.
  - Paramètres : p:`connector_id_or_name`*
  - Réponses : 200→array<PublicAuthenticationMethod>, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}/organization/credentials`** — List organization credentials for a connector. · `operationId: connector_list_organization_credentials_v1`
  - Description : List all credentials configured at the organization level for a given connector.
  - Paramètres : p:`connector_id_or_name`* q:`auth_type` q:`fetch_default`
  - Réponses : 200→CredentialsResponse, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}/workspace/credentials`** — List workspace credentials for a connector. · `operationId: connector_list_workspace_credentials_v1`
  - Description : List all credentials configured at the workspace level for a given connector.
  - Paramètres : p:`connector_id_or_name`* q:`auth_type` q:`fetch_default`
  - Réponses : 200→CredentialsResponse, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}/user/credentials`** — List user credentials for a connector. · `operationId: connector_list_user_credentials_v1`
  - Description : List all credentials configured at the user level for a given connector.
  - Paramètres : p:`connector_id_or_name`* q:`auth_type` q:`fetch_default`
  - Réponses : 200→CredentialsResponse, 422→HTTPValidationError
- **`DELETE /v1/connectors/{connector_id_or_name}/user/credentials`** — Delete all user credentials for a connector. · `operationId: connector_delete_all_user_credentials_v1`
  - Description : Delete all credentials configured at the user level for a given connector.
  - Paramètres : p:`connector_id_or_name`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`POST /v1/connectors/{connector_id_or_name}/{consumer_scope}/credentials`** — Create consumer credentials for a connector. · `operationId: connector_create_credentials_v1`
  - Description : Create consumer credentials for a given connector and consumer scope (organization, workspace, user)
  - Paramètres : p:`connector_id_or_name`* p:`consumer_scope`*
  - Corps : `application/json` (CredentialsCreateOrUpdate) → `name`*: string, `title`: string \| null, `is_default`: boolean \| null, `credentials`: ConnectionCredentialsInput \| null
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`PATCH /v1/connectors/{connector_id_or_name}/{consumer_scope}/credentials`** — Create or update consumer credentials for a connector. · `operationId: connector_update_credentials`
  - Description : Create or update consumer credentials for a given connector.
  - Paramètres : p:`connector_id_or_name`* p:`consumer_scope`*
  - Corps : `application/json` (CredentialsCreateOrUpdate) → `name`*: string, `title`: string \| null, `is_default`: boolean \| null, `credentials`: ConnectionCredentialsInput \| null
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`DELETE /v1/connectors/{connector_id_or_name}/{consumer_scope}/credentials/{credentials_name}`** — Delete credentials for a consumer. · `operationId: connector_delete_credentials`
  - Description : Delete connector credentials for a given consumer.
  - Paramètres : p:`credentials_name`* p:`connector_id_or_name`* p:`consumer_scope`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError
- **`GET /v1/connectors/{connector_id_or_name}#idOrName`** — Get a connector. · `operationId: connector_get_v1`
  - Description : Get a connector by its ID or name.
  - Paramètres : p:`connector_id_or_name`* q:`fetch_user_data`
  - Réponses : 200→Connector, 422→HTTPValidationError
- **`PATCH /v1/connectors/{connector_id}#id`** — Update a connector. · `operationId: connector_update_v1`
  - Description : Update a connector by its ID.
  - Paramètres : p:`connector_id`*
  - Corps : `application/json` → ConnectorMCPPublicUpdate \| UpdateHTTPConnectorRequest
  - Réponses : 200→Connector, 422→HTTPValidationError
- **`DELETE /v1/connectors/{connector_id}#id`** — Delete a connector. · `operationId: connector_delete_v1`
  - Description : Delete a connector by its ID.
  - Paramètres : p:`connector_id`*
  - Réponses : 200→MessageResponse, 422→HTTPValidationError

### audio.voices

_API for voice management._

- **`GET /v1/audio/voices`** — List all voices · `operationId: list_voices_v1_audio_voices_get` · **DÉPRÉCIÉ**
  - Description : Offset pagination will not be supported anymore. Use GET /v2/audio/voices instead.
  - Paramètres : q:`limit` q:`offset` q:`type`
  - Réponses : 200→VoiceListResponse, 422→HTTPValidationError
- **`POST /v1/audio/voices`** — Create a new voice · `operationId: create_voice_v1_audio_voices_post`
  - Description : Create a new voice with a base64-encoded audio sample
  - Corps : `application/json` (VoiceCreateRequest) → `name`*: string, `slug`: string \| null, `languages`: array<string>, `gender`: string \| null, `age`: integer \| null, `tags`: array<string> \| null, `color`: string \| null, `description`: string \| null, `retention_notice`: integer, `sample_audio`: string \| null, `sample_filename`: string \| null
  - Réponses : 200→VoiceResponse, 422→HTTPValidationError
- **`GET /v1/audio/voices/{voice_id}`** — Get voice details · `operationId: get_voice_v1_audio_voices__voice_id__get`
  - Description : Get voice details (excluding sample)
  - Paramètres : p:`voice_id`*
  - Réponses : 200→VoiceResponse, 422→HTTPValidationError
- **`PATCH /v1/audio/voices/{voice_id}`** — Update voice metadata · `operationId: update_voice_v1_audio_voices__voice_id__patch`
  - Description : Update voice metadata (name, gender, languages, age, tags, retention notice).
  - Paramètres : p:`voice_id`*
  - Corps : `application/json` (VoiceUpdateRequest) → `name`: string \| null, `languages`: array<string> \| null, `gender`: string \| null, `age`: integer \| null, `tags`: array<string> \| null, `description`: string \| null, `retention_notice`: integer \| null
  - Réponses : 200→VoiceResponse, 422→HTTPValidationError
- **`DELETE /v1/audio/voices/{voice_id}`** — Delete a custom voice · `operationId: delete_voice_v1_audio_voices__voice_id__delete`
  - Paramètres : p:`voice_id`*
  - Réponses : 200→VoiceResponse, 422→HTTPValidationError
- **`GET /v1/audio/voices/{voice_id}/sample`** — Get voice sample audio · `operationId: get_voice_sample_audio_v1_audio_voices__voice_id__sample_get`
  - Description : Get the audio sample for a voice
  - Paramètres : p:`voice_id`*
  - Réponses : 200→string, 422→HTTPValidationError
- **`GET /v2/audio/voices`** — List voices, cursor-paginated · `operationId: audio_v2_voices_list`
  - Paramètres : q:`page_size` q:`page_token` q:`type` q:`gender` q:`language` q:`query`
  - Réponses : 200→VoiceListPage, 422→HTTPValidationError

### workflows.executions

_Workflows API - executions._

- **`GET /v1/workflows/executions/{execution_id}`** — Get Workflow Execution · `operationId: get_workflow_execution_v1_workflows_executions__execution_id__get`
  - Paramètres : p:`execution_id`* q:`include_search_keys`
  - Réponses : 200→WorkflowExecutionResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/history`** — Get Workflow Execution History · `operationId: get_workflow_execution_history_v1_workflows_executions__execution_id__history_get`
  - Paramètres : p:`execution_id`* q:`decode_payloads`
  - Réponses : 200→object, 422→HTTPValidationError
- **`POST /v1/workflows/executions/{execution_id}/signals`** — Signal Workflow Execution · `operationId: signal_workflow_execution_v1_workflows_executions__execution_id__signals_post`
  - Paramètres : p:`execution_id`*
  - Corps : `application/json` (SignalInvocationBody) → `name`*: string, `input`: NetworkEncodedInput \| object \| null
  - Réponses : 202→SignalWorkflowResponse, 422→HTTPValidationError
- **`POST /v1/workflows/executions/{execution_id}/queries`** — Query Workflow Execution · `operationId: query_workflow_execution_v1_workflows_executions__execution_id__queries_post`
  - Paramètres : p:`execution_id`*
  - Corps : `application/json` (QueryInvocationBody) → `name`*: string, `input`: NetworkEncodedInput \| object \| null
  - Réponses : 200→QueryWorkflowResponse, 422→HTTPValidationError
- **`POST /v1/workflows/executions/{execution_id}/terminate`** — Terminate Workflow Execution · `operationId: terminate_workflow_execution_v1_workflows_executions__execution_id__terminate_post`
  - Paramètres : p:`execution_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`POST /v1/workflows/executions/terminate`** — Batch Terminate Workflow Executions · `operationId: batch_terminate_workflow_executions_v1_workflows_executions_terminate_post`
  - Corps : `application/json` (BatchExecutionBody) → `execution_ids`*: array<string>
  - Réponses : 200→BatchExecutionResponse, 422→HTTPValidationError
- **`POST /v1/workflows/executions/{execution_id}/cancel`** — Cancel Workflow Execution · `operationId: cancel_workflow_execution_v1_workflows_executions__execution_id__cancel_post`
  - Paramètres : p:`execution_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`POST /v1/workflows/executions/cancel`** — Batch Cancel Workflow Executions · `operationId: batch_cancel_workflow_executions_v1_workflows_executions_cancel_post`
  - Corps : `application/json` (BatchExecutionBody) → `execution_ids`*: array<string>
  - Réponses : 200→BatchExecutionResponse, 422→HTTPValidationError
- **`POST /v1/workflows/executions/{execution_id}/reset`** — Reset Workflow · `operationId: reset_workflow_v1_workflows_executions__execution_id__reset_post`
  - Paramètres : p:`execution_id`*
  - Corps : `application/json` (ResetInvocationBody) → `event_id`*: integer, `reason`: string \| null, `exclude_signals`: boolean, `exclude_updates`: boolean
  - Réponses : 204, 422→HTTPValidationError
- **`POST /v1/workflows/executions/{execution_id}/updates`** — Update Workflow Execution · `operationId: update_workflow_execution_v1_workflows_executions__execution_id__updates_post`
  - Paramètres : p:`execution_id`*
  - Corps : `application/json` (UpdateInvocationBody) → `name`*: string, `input`: NetworkEncodedInput \| object \| null
  - Réponses : 200→UpdateWorkflowResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/trace/info`** — Get Workflow Execution Trace Info · `operationId: get_workflow_execution_trace_info`
  - Paramètres : p:`execution_id`*
  - Réponses : 200→ExecutionTraceInfoResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/trace/otel`** — Get Workflow Execution Trace Otel · `operationId: get_workflow_execution_trace_otel`
  - Paramètres : p:`execution_id`*
  - Réponses : 200→WorkflowExecutionTraceOTelResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/trace/summary`** — Get Workflow Execution Trace Summary · `operationId: get_workflow_execution_trace_summary`
  - Paramètres : p:`execution_id`*
  - Réponses : 200→WorkflowExecutionTraceSummaryResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/trace/events`** — Get Workflow Execution Trace Events · `operationId: get_workflow_execution_trace_events`
  - Paramètres : p:`execution_id`* q:`merge_same_id_events` q:`include_internal_events`
  - Réponses : 200→WorkflowExecutionTraceEventsResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/stream`** — Stream · `operationId: stream_v1_workflows_executions__execution_id__stream_get`
  - Paramètres : p:`execution_id`* q:`event_source` q:`last_event_id`
  - Réponses : 200→object (SSE), 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/logs`** — Get Workflow Execution Logs · `operationId: get_workflow_execution_logs`
  - Description : Retrieve logs for a workflow execution.  Use `after`/`before`/`order` on the first request to set the time range and sort order; for the next pages pass the `cursor` from the previous response (it remembers the range and order).
  - Paramètres : p:`execution_id`* q:`run_id` q:`activity_id` q:`after` q:`before` q:`order` q:`cursor` q:`limit`
  - Réponses : 200→ExecutionLogSearchResponse, 422→HTTPValidationError
- **`GET /v1/workflows/executions/{execution_id}/logs/stream`** — Stream Workflow Execution Logs · `operationId: stream_workflow_execution_logs`
  - Description : Stream logs for a workflow execution via SSE.  Resume cursor comes from the `Last-Event-ID` header or `last_event_id` query param (header wins) and takes precedence over `after`; omit all to tail from the execution start.
  - Paramètres : p:`execution_id`* q:`run_id` q:`activity_id` q:`after` q:`last_event_id` h:`Last-Event-ID`
  - Réponses : 200→object (SSE), 404, 503, 422→HTTPValidationError

### workflows.metrics

_Workflows API - metrics._

- **`GET /v1/workflows/{workflow_name}/metrics`** — Get Workflow Metrics · `operationId: get_workflow_metrics_v1_workflows__workflow_name__metrics_get`
  - Description : Get comprehensive metrics for a specific workflow.  Args:     workflow_name: The name of the workflow type to get metrics for     start_time: Optional start time filter (ISO 8601 format)     end_time: Optional end time filter (ISO 8601 format)  Returns:     WorkflowMetrics: Dictionary containing metrics:         - execution_count: Total number of executions         - success_count: Number of successful executions         - error_count: Number of failed/terminated executions         - average_latency_ms: Average execution duration in milliseconds         - retry_rate: Deprecated, always -1. Nev…
  - Paramètres : p:`workflow_name`* q:`start_time` q:`end_time`
  - Réponses : 200→WorkflowMetrics, 422→HTTPValidationError

### workflows.runs

_Workflows API - runs._

- **`GET /v1/workflows/runs`** — List Runs · `operationId: list_runs_v1_workflows_runs_get`
  - Paramètres : q:`workflow_identifier` q:`root_execution_id` q:`search` q:`status` q:`deployment_name` q:`sort_by` q:`order` q:`start_time_after` q:`start_time_before` q:`end_time_after` q:`end_time_before` q:`user_id` q:`workflow_tags` q:`include_internal` q:`page_size` q:`next_page_token` q:`search_key`
  - Réponses : 200→WorkflowExecutionListResponse, 422→HTTPValidationError
- **`GET /v1/workflows/runs/{run_id}`** — Get Run · `operationId: get_run_v1_workflows_runs__run_id__get`
  - Paramètres : p:`run_id`*
  - Réponses : 200→WorkflowExecutionResponse, 422→HTTPValidationError
- **`GET /v1/workflows/runs/{run_id}/history`** — Get Run History · `operationId: get_run_history_v1_workflows_runs__run_id__history_get`
  - Paramètres : p:`run_id`* q:`decode_payloads`
  - Réponses : 200→object, 422→HTTPValidationError

### workflows.schedules

_Workflows API - schedules._

- **`GET /v1/workflows/schedules`** — Get Schedules · `operationId: get_schedules_v1_workflows_schedules_get`
  - Paramètres : q:`workflow_name` q:`user_id` q:`status` q:`search` q:`page_size` q:`next_page_token`
  - Réponses : 200→WorkflowScheduleListResponse, 422→HTTPValidationError
- **`POST /v1/workflows/schedules`** — Schedule Workflow · `operationId: schedule_workflow_v1_workflows_schedules_post`
  - Corps : `application/json` (WorkflowScheduleRequest) → `schedule`*: ScheduleDefinition, `workflow_registration_id`: string \| null, `workflow_version_id`: string \| null, `workflow_identifier`: string \| null, `workflow_task_queue`: string \| null, `schedule_id`: string \| null, `deployment_name`: string \| null
  - Réponses : 201→WorkflowScheduleResponse, 422→HTTPValidationError
- **`GET /v1/workflows/schedules/{schedule_id}`** — Get Schedule · `operationId: get_schedule_v1_workflows_schedules__schedule_id__get`
  - Paramètres : p:`schedule_id`*
  - Réponses : 200→ScheduleDefinitionOutput, 422→HTTPValidationError
- **`PATCH /v1/workflows/schedules/{schedule_id}`** — Update Schedule · `operationId: update_schedule_v1_workflows_schedules__schedule_id__patch`
  - Paramètres : p:`schedule_id`*
  - Corps : `application/json` (WorkflowScheduleUpdateRequest) → `schedule`*: PartialScheduleDefinition
  - Réponses : 200→WorkflowScheduleResponse, 422→HTTPValidationError
- **`DELETE /v1/workflows/schedules/{schedule_id}`** — Unschedule Workflow · `operationId: unschedule_workflow_v1_workflows_schedules__schedule_id__delete`
  - Paramètres : p:`schedule_id`*
  - Réponses : 204, 422→HTTPValidationError
- **`POST /v1/workflows/schedules/{schedule_id}/pause`** — Pause Schedule · `operationId: pause_schedule_v1_workflows_schedules__schedule_id__pause_post`
  - Paramètres : p:`schedule_id`*
  - Corps : `application/json` → WorkflowSchedulePauseRequest \| null
  - Réponses : 204, 422→HTTPValidationError
- **`POST /v1/workflows/schedules/{schedule_id}/resume`** — Resume Schedule · `operationId: resume_schedule_v1_workflows_schedules__schedule_id__resume_post`
  - Paramètres : p:`schedule_id`*
  - Corps : `application/json` → WorkflowSchedulePauseRequest \| null
  - Réponses : 204, 422→HTTPValidationError
- **`POST /v1/workflows/schedules/{schedule_id}/trigger`** — Trigger Schedule · `operationId: trigger_schedule_v1_workflows_schedules__schedule_id__trigger_post`
  - Paramètres : p:`schedule_id`*
  - Corps : `application/json` → WorkflowScheduleTriggerRequest \| null
  - Réponses : 204, 422→HTTPValidationError

### events

_Events API._

- **`GET /v1/workflows/events/stream`** — Get Stream Events · `operationId: get_stream_events_v1_workflows_events_stream_get`
  - Description : Stream workflow events as Server-Sent Events (SSE).  One of `root_workflow_exec_id`, `parent_workflow_exec_id` or `workflow_exec_id` is required.
  - Paramètres : q:`scope` q:`activity_name` q:`activity_id` q:`workflow_name` q:`workflow_exec_id` q:`root_workflow_exec_id` q:`parent_workflow_exec_id` q:`stream` q:`start_seq` q:`metadata_filters` q:`workflow_event_types` h:`last-event-id`
  - Réponses : 200→object (SSE), 400, 422→HTTPValidationError
- **`GET /v1/workflows/events/list`** — Get Workflow Events · `operationId: get_workflow_events_v1_workflows_events_list_get`
  - Paramètres : q:`root_workflow_exec_id` q:`workflow_exec_id` q:`workflow_run_id` q:`limit` q:`cursor`
  - Réponses : 200→ListWorkflowEventResponse, 422→HTTPValidationError

### workflows.deployments

_Workflows API - deployments._

- **`POST /v1/workflows/deployments/{deployment_id}/unharden`** — Unharden Deployment · `operationId: unharden_deployment_v1_workflows_deployments__deployment_id__unharden_post`
  - Paramètres : p:`deployment_id`* q:`workspace_id`
  - Réponses : 204, 403, 404, 409, 422
- **`GET /v1/workflows/deployments`** — List Deployments · `operationId: list_deployments_v1_workflows_deployments_get`
  - Paramètres : q:`active_only` q:`is_hardened` q:`workflow_name` q:`created_by` q:`owner` q:`location_types` q:`search` q:`order_by` q:`order` q:`limit` q:`cursor` q:`workspace_id`
  - Réponses : 200→DeploymentListResponse, 422→HTTPValidationError
- **`POST /v1/workflows/deployments`** — Create Deployment · `operationId: create_deployment_v1_workflows_deployments_post`
  - Corps : `application/json` (CreateDeploymentRequest) → `name`*: string, `spec`*: DeploymentWorkerSpecInput, `resources`: DeploymentResourceConfig \| null, `hardened`: boolean
  - Réponses : 202→ManagedDeploymentResponse, 422→HTTPValidationError
- **`GET /v1/workflows/deployments/{name}`** — Get Deployment · `operationId: get_deployment_v1_workflows_deployments__name__get`
  - Paramètres : p:`name`* q:`workflow_name`
  - Réponses : 200→DeploymentDetailResponse, 422→HTTPValidationError
- **`PATCH /v1/workflows/deployments/{name}`** — Update Deployment · `operationId: update_deployment_v1_workflows_deployments__name__patch`
  - Paramètres : p:`name`*
  - Corps : `application/json` (UpdateDeploymentRequest) → `spec`: WorkflowsWorkerSpecUpdate \| null, `resources`: DeploymentResourceConfigUpdate \| null
  - Réponses : 202→ManagedDeploymentResponse, 422→HTTPValidationError
- **`DELETE /v1/workflows/deployments/{name}`** — Delete Deployment · `operationId: delete_deployment_v1_workflows_deployments__name__delete`
  - Paramètres : p:`name`*
  - Réponses : 202→ManagedDeploymentResponse, 422→HTTPValidationError
- **`POST /v1/workflows/deployments/{name}/stop`** — Stop Deployment · `operationId: stop_deployment_v1_workflows_deployments__name__stop_post`
  - Paramètres : p:`name`*
  - Réponses : 202→ManagedDeploymentResponse, 422→HTTPValidationError
- **`POST /v1/workflows/deployments/{name}/start`** — Start Deployment · `operationId: start_deployment_v1_workflows_deployments__name__start_post`
  - Paramètres : p:`name`*
  - Réponses : 202→ManagedDeploymentResponse, 422→HTTPValidationError
- **`POST /v1/workflows/deployments/{name}/restart`** — Restart Deployment · `operationId: restart_deployment_v1_workflows_deployments__name__restart_post`
  - Paramètres : p:`name`*
  - Réponses : 202→ManagedDeploymentResponse, 422→HTTPValidationError
- **`GET /v1/workflows/deployments/{name}/workers`** — List Deployment Workers · `operationId: list_deployment_workers_v1_workflows_deployments__name__workers_get`
  - Paramètres : p:`name`* q:`worker_status` q:`limit` q:`cursor`
  - Réponses : 200→DeploymentWorkerListResponse, 422→HTTPValidationError
- **`GET /v1/workflows/deployments/{name}/logs`** — Get Deployment Logs · `operationId: get_deployment_logs`
  - Description : Retrieve logs for a deployment (across all of its workers).  Use `after`/`before`/`order` on the first request to set the time range and sort order; for the next pages pass the `cursor` from the previous response (it remembers the range and order).  `log_type=build` serves the managed build pipeline's output instead. It pages the same way, and a null `next_cursor` means the window is drained.
  - Paramètres : p:`name`* q:`log_type` q:`worker_name` q:`workflow_name` q:`after` q:`before` q:`order` q:`cursor` q:`limit`
  - Réponses : 200→DeploymentLogSearchResponse, 422→HTTPValidationError
- **`GET /v1/workflows/deployments/{name}/logs/stream`** — Stream Deployment Logs · `operationId: stream_deployment_logs`
  - Description : Stream logs for a deployment (all of its workers) via SSE.  Resume cursor comes from the `Last-Event-ID` header or `last_event_id` query param (header wins) and takes precedence over `after`; omit all to tail from the deployment start.
  - Paramètres : p:`name`* q:`worker_name` q:`workflow_name` q:`after` q:`last_event_id` h:`Last-Event-ID`
  - Réponses : 200→object (SSE), 404, 503, 422→HTTPValidationError

### workflows

_Workflows API._

- **`GET /v1/workflows`** — Get Workflows · `operationId: get_workflows_v1_workflows_get`
  - Paramètres : q:`status` q:`include_shared` q:`available_in_chat_assistant` q:`deployment_name` q:`deployment_status` q:`archived` q:`tags` q:`sort_by` q:`order` q:`cursor` q:`limit` q:`active_only` q:`search`
  - Réponses : 200→WorkflowListResponse, 422→HTTPValidationError
- **`GET /v1/workflows/registrations`** — Get Workflow Registrations · `operationId: get_workflow_registrations_v1_workflows_registrations_get`
  - Paramètres : q:`workflow_id` q:`task_queue` q:`active_only` q:`include_shared` q:`workflow_name` q:`workflow_search` q:`archived` q:`with_workflow` q:`available_in_chat_assistant` q:`limit` q:`cursor`
  - Réponses : 200→WorkflowRegistrationListResponse, 422→HTTPValidationError
- **`POST /v1/workflows/{workflow_identifier}/execute`** — Execute Workflow · `operationId: execute_workflow_v1_workflows__workflow_identifier__execute_post`
  - Paramètres : p:`workflow_identifier`*
  - Corps : `application/json` (WorkflowExecutionRequest) → `execution_id`: string \| null, `input`: object \| object \| null, `wait_for_result`: boolean, `timeout_seconds`: number \| null, `custom_tracing_attributes`: object \| null, `force_new_trace`: boolean, `traceparent`: string \| null, `extensions`: object \| null, `task_queue`: string \| null, `deployment_name`: string \| null
  - Réponses : 200→WorkflowExecutionResponse \| WorkflowExecutionSyncResponse, 422→HTTPValidationError
- **`POST /v1/workflows/registrations/{workflow_registration_id}/execute`** — Execute Workflow Registration · `operationId: execute_workflow_registration_v1_workflows_registrations__workflow_registration_id__execute_post` · **DÉPRÉCIÉ**
  - Paramètres : p:`workflow_registration_id`*
  - Corps : `application/json` (WorkflowExecutionRequest) → `execution_id`: string \| null, `input`: object \| object \| null, `wait_for_result`: boolean, `timeout_seconds`: number \| null, `custom_tracing_attributes`: object \| null, `force_new_trace`: boolean, `traceparent`: string \| null, `extensions`: object \| null, `task_queue`: string \| null, `deployment_name`: string \| null
  - Réponses : 200→WorkflowExecutionResponse \| WorkflowExecutionSyncResponse, 422→HTTPValidationError
- **`GET /v1/workflows/{workflow_identifier}`** — Get Workflow · `operationId: get_workflow_v1_workflows__workflow_identifier__get`
  - Paramètres : p:`workflow_identifier`*
  - Réponses : 200→WorkflowGetResponse, 422→HTTPValidationError
- **`PUT /v1/workflows/{workflow_identifier}`** — Update Workflow · `operationId: update_workflow_v1_workflows__workflow_identifier__put`
  - Paramètres : p:`workflow_identifier`*
  - Corps : `application/json` (WorkflowUpdateRequest) → `display_name`: string \| null, `description`: string \| null, `available_in_chat_assistant`: boolean \| null, `tags`: array<string> \| null
  - Réponses : 200→WorkflowUpdateResponse, 422→HTTPValidationError
- **`GET /v1/workflows/registrations/{workflow_registration_id}`** — Get Workflow Registration · `operationId: get_workflow_registration_v1_workflows_registrations__workflow_registration_id__get`
  - Paramètres : p:`workflow_registration_id`* q:`with_workflow` q:`include_shared`
  - Réponses : 200→WorkflowRegistrationGetResponse, 422→HTTPValidationError
- **`PUT /v1/workflows/archive`** — Bulk Archive Workflows · `operationId: bulk_archive_workflows_v1_workflows_archive_put`
  - Corps : `application/json` (WorkflowBulkArchiveRequest) → `workflow_ids`*: array<string>
  - Réponses : 200→WorkflowBulkArchiveResponse, 422→HTTPValidationError
- **`PUT /v1/workflows/unarchive`** — Bulk Unarchive Workflows · `operationId: bulk_unarchive_workflows_v1_workflows_unarchive_put`
  - Corps : `application/json` (WorkflowBulkUnarchiveRequest) → `workflow_ids`*: array<string>
  - Réponses : 200→WorkflowBulkUnarchiveResponse, 422→HTTPValidationError
- **`PUT /v1/workflows/{workflow_identifier}/archive`** — Archive Workflow · `operationId: archive_workflow_v1_workflows__workflow_identifier__archive_put`
  - Paramètres : p:`workflow_identifier`*
  - Réponses : 200→WorkflowArchiveResponse, 422→HTTPValidationError
- **`PUT /v1/workflows/{workflow_identifier}/unarchive`** — Unarchive Workflow · `operationId: unarchive_workflow_v1_workflows__workflow_identifier__unarchive_put`
  - Paramètres : p:`workflow_identifier`*
  - Réponses : 200→WorkflowUnarchiveResponse, 422→HTTPValidationError

### beta.rag.ingestion_pipeline_configurations

_(beta) RAG API - ingestion pipeline configurations._

- **`GET /v1/rag/ingestion_pipeline_configurations`** — List ingestion pipeline configurations · `operationId: get_configs_v1_rag_ingestion_pipeline_configurations_get`
  - Description : For the current workspace, lists all of the registered ingestion pipeline configurations.
  - Réponses : 200→array<IngestionPipelineConfiguration>
- **`PUT /v1/rag/ingestion_pipeline_configurations`** — Register Config · `operationId: register_config_v1_rag_ingestion_pipeline_configurations_put`
  - Description : Register an ingestion configuration.
  - Corps : `application/json` (CreateIngestionPipelineConfigurationRequest) → `name`*: string, `pipeline_composition`: object \| null, `target_indexes`: array<IngestionPipelineTargetIndexRef> \| null
  - Réponses : 200→IngestionPipelineConfiguration, 422→HTTPValidationError
- **`PUT /v1/rag/ingestion_pipeline_configurations/{id}/run_info`** — Update Run Info · `operationId: update_run_info_v1_rag_ingestion_pipeline_configurations__id__run_info_put`
  - Paramètres : p:`id`*
  - Corps : `application/json` (UpdateRunInfo) → `execution_time`*: string, `chunks_count`*: integer
  - Réponses : 200→IngestionPipelineConfiguration, 422→HTTPValidationError

### beta.rag.search_indexes

_(beta) RAG API - search indexes._

- **`GET /v1/rag/deployments`** — Get Deployment Summaries · `operationId: get_deployment_summaries_v1_rag_deployments_get`
  - Description : Fetch all indexes available to a user
  - Réponses : 200→GetDeploymentSummariesResponse, 403, 404, 400, 500
- **`PUT /v1/rag/deployments`** — Register (or re-register) a search index · `operationId: register_deployment_v1_rag_deployments_put`
  - Corps : `application/json` (RegisterDeploymentRequestDeployment) → `name`*: string, `status`: enum(online, offline), `deployment`*: RegisterDeploymentRequestVespaDeployment
  - Réponses : 200→RegisterSearchIndexResponseIndex, 403, 404, 400, 500, 422→HTTPValidationError
- **`DELETE /v1/rag/deployments/{deployment_id}`** — Unregister Deployment · `operationId: unregister_deployment_v1_rag_deployments__deployment_id__delete`
  - Description : Delete all information about a deployment
  - Paramètres : p:`deployment_id`*
  - Réponses : 200→object, 403, 404, 400, 500, 422→HTTPValidationError
- **`PUT /v1/rag/deployments/{deployment_id}/metrics`** — Update Index Metrics · `operationId: update_index_metrics_v1_rag_deployments__deployment_id__metrics_put`
  - Description : Update the metrics for a given index
  - Paramètres : p:`deployment_id`*
  - Corps : `application/json` → UpdateMetricsRequestDeploymentMetricsOnline \| UpdateMetricsRequestDeploymentMetricsOffline
  - Réponses : 200→object, 403, 404, 400, 422, 500

### beta.rag.managed_indexes

_(beta) RAG API - managed indexes._

- **`GET /v1/rag/managed_indexes`** — List managed indexes · `operationId: list_indexes_v1_rag_managed_indexes_get`
  - Description : Lists all managed search indexes for the current workspace.
  - Paramètres : q:`page_size` q:`page_token` q:`name` q:`status` q:`creator_id`
  - Réponses : 200→ListManagedIndexesResponse, 422→HTTPValidationError
- **`POST /v1/rag/managed_indexes`** — Create a managed index · `operationId: create_index_v1_rag_managed_indexes_post`
  - Description : Reserves a managed search index and starts asynchronous backing-table provisioning. Poll the returned Location until status is ready or failed.
  - Corps : `application/json` (CreateManagedIndexRequest) → `name`*: string, `schema`: ManagedIndexFields, `config`*: ManagedIndexConfig
  - Réponses : 202→ManagedIndexResponse, 409, 422→HTTPValidationError
- **`GET /v1/rag/managed_indexes/{index_name}`** — Get a managed index · `operationId: get_index_v1_rag_managed_indexes__index_name__get`
  - Description : Returns the managed search index with the given name.
  - Paramètres : p:`index_name`*
  - Réponses : 200→ManagedIndexResponse, 404, 422→HTTPValidationError
- **`PUT /v1/rag/managed_indexes/{index_name}`** — Update a managed index schema · `operationId: update_index_v1_rag_managed_indexes__index_name__put`
  - Description : Records a new schema for the managed search index and applies it asynchronously. The index keeps serving its current schema until the new one is on disk; poll it until status is ready. Additive only: the new schema must keep every field the current one has.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (UpdateManagedIndexRequest) → `schema`*: ManagedIndexFields
  - Réponses : 202→ManagedIndexResponse, 404, 409, 422
- **`DELETE /v1/rag/managed_indexes/{index_name}`** — Delete a managed index · `operationId: delete_index_v1_rag_managed_indexes__index_name__delete`
  - Description : Marks the managed search index for deletion and returns it with status deleting. The backing table is dropped asynchronously; poll the index until it returns 404.
  - Paramètres : p:`index_name`*
  - Réponses : 202→DeleteManagedIndexResponse, 404, 409, 422→HTTPValidationError
- **`POST /v1/rag/managed_indexes/{index_name}/documents`** — Ingest documents into a managed index · `operationId: ingest_documents_v1_rag_managed_indexes__index_name__documents_post`
  - Description : Validates and persists documents. Always returns 200; each document is reported as accepted or rejected in the response body.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (IngestDocumentsRequest) → `documents`*: array<object>
  - Réponses : 200→IngestDocumentsResponse, 404, 409, 422→HTTPValidationError
- **`DELETE /v1/rag/managed_indexes/{index_name}/documents`** — Delete documents from a managed index · `operationId: delete_documents_v1_rag_managed_indexes__index_name__documents_delete`
  - Description : Deletes the given documents by id. Returns the ids actually removed and, in `missing`, any requested ids that were not present.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (DeleteDocumentsRequest) → `document_ids`*: array<string>
  - Réponses : 200→DeleteDocumentsResponse, 404, 409, 422→HTTPValidationError
- **`POST /v1/rag/managed_indexes/{index_name}/search`** — Search a managed index · `operationId: search_index_v1_rag_managed_indexes__index_name__search_post`
  - Description : Runs an approximate-nearest-neighbor vector search over the index and returns matching chunks, closest-first.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (SearchRequest) → `retriever`*: KeywordRetriever \| NearestNeighbourRetriever \| RRFRetriever
  - Réponses : 200→SearchResponse, 400→array<MissingFieldResponse \| MissingEmbeddingResponse \| IncorrectFieldTypeResponse \| EmbeddingMismatchResponse \| MaxCandidatesTooSmallResponse \| TopKTooLargeResponse>, 404, 409, 500, 422→HTTPValidationError
- **`POST /v1/rag/managed_indexes/{index_name}/navigate`** — Navigate to adjacent chunks · `operationId: navigate_index_v1_rag_managed_indexes__index_name__navigate_post`
  - Description : Returns the chunks adjacent to a position within a source, in reading order. NEXT fetches chunks at or after the end offset; PREVIOUS fetches chunks before the start offset. A 200 with an empty list means the source exists but no chunk falls in the requested direction; a 404 means the source has no chunks at all.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (NavigateRequest) → `source_id`*: string, `start_offset`*: integer, `end_offset`*: integer, `direction`*: NavigationDirection, `top_k`: integer, `content_type`: string
  - Réponses : 200→NavigationResponse, 404, 409, 500, 422→HTTPValidationError
- **`POST /v1/rag/managed_indexes/{index_name}/read`** — Read chunks within a span · `operationId: read_index_v1_rag_managed_indexes__index_name__read_post`
  - Description : Returns the chunks of a source whose span falls within [start_offset, end_offset). Either bound may be omitted to leave that side open. A 200 with an empty list means the source exists but no chunk falls in the range; a 404 means the source has no chunks at all.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (ReadRequest) → `source_id`*: string, `start_offset`: integer \| null, `end_offset`: integer \| null, `top_k`: integer, `content_type`: string
  - Réponses : 200→NavigationResponse, 404, 409, 500, 422→HTTPValidationError
- **`POST /v1/rag/managed_indexes/{index_name}/grep`** — Grep for a pattern within a source · `operationId: grep_index_v1_rag_managed_indexes__index_name__grep_post`
  - Description : Lexical substring match within a single source, in reading order. PHRASE mode matches the pattern literally (whitespace-sensitive, case-insensitive); TERM mode requires every whitespace-split token present in any order. A 200 with an empty list means the source exists but no chunk matched; a 404 means the source has no chunks at all.
  - Paramètres : p:`index_name`*
  - Corps : `application/json` (GrepRequest) → `source_id`*: string, `pattern`*: string, `mode`: GrepMode, `top_k`: integer, `content_type`: string
  - Réponses : 200→NavigationResponse, 404, 409, 500, 422→HTTPValidationError
- **`GET /v1/rag/managed_indexes/{index_name}/chunks/{chunk_id}`** — Get a single chunk by id · `operationId: get_chunk_index_v1_rag_managed_indexes__index_name__chunks__chunk_id__get`
  - Description : Returns a single chunk by its canonical id. A 404 means no chunk with that id exists in the index.
  - Paramètres : p:`index_name`* p:`chunk_id`*
  - Réponses : 200→NavigationResponse, 404, 409, 500, 422→HTTPValidationError

### beta.users

_(beta) Users API._

- **`GET /v1/users/me`** — Get Identity · `operationId: users_api_get_identity` · auth: DashboardUserContextAuth, BearerUserContextAuth
  - Réponses : 200→UserIdentity
- **`GET /v1/users/me/organizations`** — List Organizations · `operationId: users_api_list_organizations` · auth: DashboardUserContextAuth, BearerUserContextAuth
  - Description : List every organization the authenticated user is a member of.  Identity-only: the caller need not have selected an organization, so this reads only the user and never scopes by the active org.
  - Paramètres : q:`offset` q:`limit`
  - Réponses : 200→ListOrganizationsResponse
- **`GET /v1/users/me/workspaces`** — List Workspaces · `operationId: users_api_list_workspaces` · auth: DashboardUserContextAuth, BearerUserContextAuth
  - Description : List every workspace the authenticated user is a member of, across all their organizations, each tagged with the organization it belongs to.
  - Paramètres : q:`organization_id` q:`offset` q:`limit`
  - Réponses : 200→ListWorkspacesResponse
- **`GET /v1/whoami`** — Whoami · `operationId: users_api_whoami` · auth: DashboardUserOrServiceAccountContextAuth, BearerUserContextAuth
  - Description : Return the authenticated caller's identity.  Principal-agnostic: resolves both users and service accounts.
  - Réponses : 200→WhoamiResponse

### beta.admin.billing

_(beta) Admin API - manage spend limits, rate limits and roles. Requires an admin API key._

- **`POST /v1/admin/usage/query`** — Detailed Usage Query · `operationId: users_api_admin_usage_query_usage` · auth: AdminApiKey
  - Description : Query the organization's detailed usage for a required time range.  Optional filters, caller-selected grouping and time buckets, pagination, aggregates, and distinct API-call counts are supported. The response contains usage quantities only; it does not include prices, currency, or calculated costs. For a fixed monthly report with pricing, use `GET /v1/admin/usage`.
  - Corps : `application/json` (UsageQueryIN) → `usage_type`: array<UsageType> \| null, `billing_metric`: array<string> \| null, `billing_display_name`: array<string> \| null, `billing_group`: array<string> \| null, `workspace_ids`: array<string \| null> \| null, `organization_id`: array<string> \| null, `user_id`: array<string> \| null, `service_account_id`: array<string> \| null, `api_key_id`: array<string> \| null, `api_zone`: array<string> \| null, `service_tier`: array<string> \| null, `start`*: string, `end`*: string, `filters`: array<AdminUsageQueryFilter> \| null, `group_by`: array<enum(api_zone, service_tier, customer_id, usage_type, billing_metric, billing_group, billing_display_name, workspace_id, organization_id, user_id, service_account_id, api_key_id, …)> \| null, `time_bucket`: enum(second, 1min, 5min, 15min, 30min, hour, 4hours, day, week, month) \| null, `untracked`: boolean \| null, `limit`: integer \| null, `offset`: integer \| null, `include_aggregates`: boolean, `include_nb_api_calls`: boolean
  - Réponses : 200→UsageQueryOUT, 422→HTTPValidationError
- **`GET /v1/admin/rate-limit`** — Get Rate Limits · `operationId: users_api_admin_rate_limits_get_rate_limits` · auth: AdminApiKey
  - Réponses : 200→RateLimitsOUT
- **`GET /v1/admin/spend-limit`** — Get Spend Limits · `operationId: users_api_admin_spend_limits_get_spend_limits` · auth: AdminApiKey
  - Description : Get usage, rate, and job limits for the Organization.
  - Réponses : 200→LimitsOUT
- **`POST /v1/admin/spend-limit`** — Update Spend Limits · `operationId: users_api_admin_spend_limits_update_spend_limits` · auth: AdminApiKey
  - Description : Update the Organization usage limit.
  - Corps : `application/json` (NewUsageLimitIN) → `amount`*: integer, `no_monthly_limit`: boolean
  - Réponses : 200→LimitsOUT
- **`GET /v1/admin/usage`** — Monthly Usage and Pricing · `operationId: users_api_admin_usage_get_usage` · auth: AdminApiKey
  - Description : Return the organization's usage for a calendar month in a fixed, product-oriented format.  The response includes the applicable price catalog and currency. For custom time ranges, filters, grouping, and pagination, use `POST /v1/admin/usage/query`.
  - Paramètres : q:`month` q:`year` q:`workspace_id` q:`api_zone`
  - Réponses : 200→UsageOUTJSON

### beta.admin.users

_(beta) Admin API - manage users. Requires an admin API key._

- **`GET /v1/admin/users`** — Get Users · `operationId: users_api_admin_users_get_users` · auth: AdminApiKey
  - Description : List Organization members and pending invitations.
  - Paramètres : q:`page` q:`page_size` q:`email`
  - Réponses : 200→OrganizationAdminUsersOUT
- **`POST /v1/admin/users`** — Create Users · `operationId: users_api_admin_users_create_users` · auth: AdminApiKey
  - Description : Create Organization members.
  - Corps : `application/json` → array<OrganizationMemberCreate>
  - Réponses : 200→OrganizationUsersCreateOUT
- **`GET /v1/admin/users-invite`** — Get Invite · `operationId: users_api_admin_users_get_invite` · auth: AdminApiKey
  - Description : List pending Organization invitations.
  - Réponses : 200→array<OrganizationUserInviteOUT>
- **`POST /v1/admin/users-invite`** — Invite Users · `operationId: users_api_admin_users_invite_users` · auth: AdminApiKey
  - Description : Invite users to the Organization.
  - Corps : `application/json` (OrganizationInviteIN) → `role_names`: array<enum(member, billing_manager, organization_admin)> \| null, `roles`: array<UserRole> \| array<StaticOrganizationRoles> \| null, `role_name`: enum(member, billing_manager, organization_admin) \| null, `role`: UserRole \| StaticOrganizationRoles \| null, `email`*: string, `subscription_type`: PlanType \| null, `subscription_types`: array<PlanType> \| null, `subscription_seat_automatic_granting`: boolean, `email_language`: enum(en, fr, es, de, it, pt_br, pl, ar, nl, ko) \| null, `workspace_uuids`: array<string> \| null
  - Réponses : 200→OrganizationInvitesCreateOUT
- **`DELETE /v1/admin/users-invite/{invite_uuid}`** — Delete Invite · `operationId: users_api_admin_users_delete_invite` · auth: AdminApiKey
  - Paramètres : p:`invite_uuid`*
  - Réponses : 200→DeleteOUT
- **`GET /v1/admin/users/{user_id}`** — Get User · `operationId: users_api_admin_users_get_user` · auth: AdminApiKey
  - Description : Get details for an Organization member.
  - Paramètres : p:`user_id`*
  - Réponses : 200→AdminUserOUT
- **`PATCH /v1/admin/users/{user_id}`** — Update User · `operationId: users_api_admin_users_update_user` · auth: AdminApiKey
  - Description : Update an Organization member's roles and product seats.
  - Paramètres : p:`user_id`*
  - Corps : `application/json` (AdminOrganizationMemberUpdate) → `role_names`: array<enum(member, billing_manager, organization_admin)> \| null, `roles`: array<UserRole> \| array<StaticOrganizationRoles> \| null, `role_name`: enum(member, billing_manager, organization_admin) \| null, `role`: UserRole \| StaticOrganizationRoles \| null, `subscription_types`: array<enum(CHAT, MISTRAL_CODE)> \| null
  - Réponses : 200→AdminOrganizationMemberOUT
- **`DELETE /v1/admin/users/{user_id}`** — Delete User · `operationId: users_api_admin_users_delete_user` · auth: AdminApiKey
  - Description : Remove a member from the Organization.
  - Paramètres : p:`user_id`*
  - Réponses : 200→DeleteOUT
- **`POST /v1/admin/users/{user_id}/deactivate`** — Deactivate User · `operationId: users_api_admin_users_deactivate_user` · auth: AdminApiKey
  - Description : Deactivate a user whose email address is on one of the Organization's verified domains: remove them from every organization they belong to, which revokes their API keys, and end their sessions.
  - Paramètres : p:`user_id`*
  - Réponses : 200→DeactivateUserOUT
- **`GET /v1/admin/roles`** — Get Roles · `operationId: users_api_admin_roles_get_roles` · auth: AdminApiKey
  - Description : List Organization and Workspace roles.
  - Réponses : 200→RolesOut

### beta.admin.workspaces

_(beta) Admin API - manage workspaces. Requires an admin API key._

- **`GET /v1/admin/workspaces`** — Get Workspaces · `operationId: users_api_admin_workspaces_get_workspaces` · auth: AdminApiKey
  - Description : List Workspaces in the Organization.
  - Paramètres : q:`is_archived` q:`page` q:`page_size` q:`search`
  - Réponses : 200→WorkspacesOut
- **`POST /v1/admin/workspaces`** — Create Workspace · `operationId: users_api_admin_workspaces_create_workspace` · auth: AdminApiKey
  - Description : Create a Workspace.
  - Corps : `application/json` (AdminWorkspaceIn) → `name`*: string, `description`: string, `icon`: string, `add_all_org_members`: boolean, `admin_user_id`*: string
  - Réponses : 200→WorkspaceEnrichedOUT
- **`PATCH /v1/admin/workspaces/{workspace_uuid}`** — Update Workspaces · `operationId: users_api_admin_workspaces_update_workspaces` · auth: AdminApiKey
  - Description : Update a Workspace.
  - Paramètres : p:`workspace_uuid`*
  - Corps : `application/json` (UpdateWorkspaceIN) → `name`: string \| null, `description`: string \| null, `icon`: string \| null
  - Réponses : 200→WorkspaceOUT
- **`DELETE /v1/admin/workspaces/{workspace_uuid}`** — Delete Workspaces · `operationId: users_api_admin_workspaces_delete_workspaces` · auth: AdminApiKey
  - Description : Archive a Workspace.
  - Paramètres : p:`workspace_uuid`*
  - Réponses : 204
- **`POST /v1/admin/workspaces/{workspace_uuid}/add-users`** — Add Users Workspaces · `operationId: users_api_admin_workspaces_add_users_workspaces` · auth: AdminApiKey
  - Description : Add members to a Workspace.
  - Paramètres : p:`workspace_uuid`*
  - Corps : `application/json` (AdminWorkspaceMemberIN) → `members`: array<AdminWorkspaceMemberSingleIN> \| null
  - Réponses : 200→AddUsersToWorkspaceOUT
- **`PATCH /v1/admin/workspaces/{workspace_uuid}/users`** — Add Or Update Users Workspaces · `operationId: users_api_admin_workspaces_add_or_update_users_workspaces` · auth: AdminApiKey
  - Description : Add or update Workspace members.
  - Paramètres : p:`workspace_uuid`*
  - Corps : `application/json` (AdminWorkspaceMemberIN) → `members`: array<AdminWorkspaceMemberSingleIN> \| null
  - Réponses : 200→AddOrUpdateUsersToWorkspaceOUT
- **`DELETE /v1/admin/workspaces/{workspace_uuid}/remove-users`** — Remove Users Workspaces · `operationId: users_api_admin_workspaces_remove_users_workspaces` · auth: AdminApiKey
  - Description : Remove members from a Workspace.
  - Paramètres : p:`workspace_uuid`*
  - Corps : `application/json` (RemoveWorkspaceMembersIN) → `members`*: array<BaseWorkspaceMemberIN>
  - Réponses : 200→RemoveWorkspaceMembersOUT

### beta.admin.audit-logs

_(beta) Admin API - access audit logs. Requires an admin API key._

- **`GET /v1/admin/audit-logs`** — Get Audit Logs · `operationId: users_api_admin_audit_logs_get_audit_logs` · auth: AdminApiKey
  - Description : List audit log entries for the Organization.
  - Paramètres : q:`actor_type` q:`event_type` q:`target_type` q:`actor_user_uuid` q:`sort` q:`after` q:`before` q:`limit`
  - Réponses : 200→array<AuditLogOut>

### beta.admin.user-groups

_(beta) Admin API - manage user groups. Requires an admin API key._

- **`GET /v1/admin/user-groups`** — Get User Groups · `operationId: users_api_admin_user_groups_get_user_groups` · auth: AdminApiKey
  - Description : Get all user groups across the organization.
  - Paramètres : q:`page` q:`page_size` q:`search`
  - Réponses : 200→AdminUserGroupsOut
- **`POST /v1/admin/user-groups`** — Create User Group · `operationId: users_api_admin_user_groups_create_user_group` · auth: AdminApiKey
  - Description : Create a new user group.
  - Corps : `application/json` (AdminUserGroupIn) → `name`*: string, `description`: string \| null, `parent_group_ids`: array<string>
  - Réponses : 200→AdminUserGroupOut
- **`POST /v1/admin/user-groups/provision-workspace`** — Provision Group To Workspace · `operationId: users_api_admin_user_groups_provision_group_to_workspace` · **DÉPRÉCIÉ** · auth: AdminApiKey
  - Description : Deprecated: provision all users from a user group to a workspace with a specific role.  Use `POST /user-groups/{group_uuid}/workspaces` with `role_names` to assign the group to a workspace, and `PATCH /user-groups/{group_uuid}/workspaces/{workspace_uuid}` to change the roles of an existing assignment.
  - Corps : `application/json` (AdminProvisionGroupToWorkspaceIn) → `user_group_uuid`*: string, `workspace_uuid`*: string, `workspace_role`: WorkspaceRole \| StaticWorkspaceRoles \| null, `workspace_role_name`: enum(billing, user, contributor, dev, dev_contributor, mistral_code_user, cloud_user, mistral_cloud_admin, workspace_contributor, workspace_admin, observability_viewer, workflow_executor, …) \| null
  - Réponses : 204
- **`GET /v1/admin/user-groups/{group_uuid}`** — Get User Group · `operationId: users_api_admin_user_groups_get_user_group` · auth: AdminApiKey
  - Description : Get a specific user group.
  - Paramètres : p:`group_uuid`*
  - Réponses : 200→AdminUserGroupOut
- **`PATCH /v1/admin/user-groups/{group_uuid}`** — Update User Group · `operationId: users_api_admin_user_groups_update_user_group` · auth: AdminApiKey
  - Paramètres : p:`group_uuid`*
  - Corps : `application/json` (AdminUpdateUserGroupIn) → `name`: string \| null, `description`: string \| null, `parent_group_ids`: array<string> \| null
  - Réponses : 200→AdminUserGroupOut
- **`DELETE /v1/admin/user-groups/{group_uuid}`** — Delete User Group · `operationId: users_api_admin_user_groups_delete_user_group` · auth: AdminApiKey
  - Description : Delete a user group.
  - Paramètres : p:`group_uuid`*
  - Réponses : 204
- **`GET /v1/admin/user-groups/{group_uuid}/members`** — Get User Group Members · `operationId: users_api_admin_user_groups_get_user_group_members` · auth: AdminApiKey
  - Description : Get members of a user group.
  - Paramètres : p:`group_uuid`* q:`page` q:`page_size`
  - Réponses : 200→AdminUserGroupMembersOut
- **`POST /v1/admin/user-groups/{group_uuid}/members`** — Assign Users To Group · `operationId: users_api_admin_user_groups_assign_users_to_group` · auth: AdminApiKey
  - Description : Assign users to a user group.
  - Paramètres : p:`group_uuid`*
  - Corps : `application/json` (AdminAssignUsersToGroupIn) → `user_uuids`*: array<string>
  - Réponses : 204
- **`DELETE /v1/admin/user-groups/{group_uuid}/members`** — Remove Users From Group · `operationId: users_api_admin_user_groups_remove_users_from_group` · auth: AdminApiKey
  - Description : Remove users from a user group.
  - Paramètres : p:`group_uuid`*
  - Corps : `application/json` (AdminAssignUsersToGroupIn) → `user_uuids`*: array<string>
  - Réponses : 204
- **`GET /v1/admin/user-groups/{group_uuid}/workspaces`** — Get Group Workspace Assignments · `operationId: users_admin_user_groups_get_group_workspace_assignments` · auth: AdminApiKey
  - Description : List workspace assignments for a user group.
  - Paramètres : p:`group_uuid`* q:`page` q:`page_size`
  - Réponses : 200→GroupWorkspaceAssignmentsOut
- **`POST /v1/admin/user-groups/{group_uuid}/workspaces`** — Assign Group To Workspace · `operationId: users_api_admin_user_groups_assign_group_to_workspace` · auth: AdminApiKey
  - Description : Assign a user group to a workspace.
  - Paramètres : p:`group_uuid`*
  - Corps : `application/json` (AdminAssignGroupToWorkspaceIn) → `role_names`: array<enum(billing, user, contributor, dev, dev_contributor, mistral_code_user, cloud_user, workspace_contributor, workspace_admin, observability_viewer, workflow_executor, member)> \| null, `roles`: array<WorkspaceRole \| StaticWorkspaceRoles> \| null, `role`: WorkspaceRole \| StaticWorkspaceRoles \| null, `workspace_uuid`*: string
  - Réponses : 201
- **`PATCH /v1/admin/user-groups/{group_uuid}/workspaces/{workspace_uuid}`** — Update Group Workspace Assignment · `operationId: users_admin_user_groups_update_group_workspace_assignment` · auth: AdminApiKey
  - Description : Update the workspace role assignment for a user group.
  - Paramètres : p:`group_uuid`* p:`workspace_uuid`*
  - Corps : `application/json` (AdminUpdateGroupWorkspaceAssignmentIn) → `role_names`: array<enum(billing, user, contributor, dev, dev_contributor, mistral_code_user, cloud_user, workspace_contributor, workspace_admin, observability_viewer, workflow_executor, member)> \| null, `roles`: array<WorkspaceRole \| StaticWorkspaceRoles> \| null, `role`: WorkspaceRole \| StaticWorkspaceRoles \| null
  - Réponses : 204
- **`DELETE /v1/admin/user-groups/{group_uuid}/workspaces/{workspace_uuid}`** — Remove Group From Workspace · `operationId: users_admin_user_groups_remove_group_from_workspace` · auth: AdminApiKey
  - Description : Remove a user group from a workspace.
  - Paramètres : p:`group_uuid`* p:`workspace_uuid`*
  - Réponses : 204
- **`PATCH /v1/admin/user-groups/{group_uuid}/organization-role`** — Update User Group Organization Role · `operationId: users_admin_user_groups_update_user_group_organization_role` · auth: AdminApiKey
  - Description : Update the organization role for a user group.
  - Paramètres : p:`group_uuid`*
  - Corps : `application/json` (AdminUpdateUserGroupOrganizationRoleIn) → `organization_role`*: enum(member, billing_manager, organization_admin) \| UserRole \| StaticOrganizationRoles
  - Réponses : 204
- **`GET /v1/admin/user-groups/{group_uuid}/nested`** — Get Nested Groups Admin · `operationId: users_api_admin_user_groups_get_nested_groups` · auth: AdminApiKey
  - Description : List the groups directly nested inside this group.
  - Paramètres : p:`group_uuid`*
  - Réponses : 200→NestedGroupsOut
- **`PATCH /v1/admin/user-groups/{group_uuid}/nested`** — Set Nested Groups Admin · `operationId: users_api_admin_user_groups_set_nested_groups` · auth: AdminApiKey
  - Description : Replace the set of groups directly nested inside this group.
  - Paramètres : p:`group_uuid`*
  - Corps : `application/json` (SetNestedGroupsIn) → `child_group_uuids`*: array<string>
  - Réponses : 204

### beta.admin.api-keys

_(beta) Admin API - manage API keys. Requires an admin API key._

- **`GET /v1/admin/api-keys`** — Get Api Keys · `operationId: users_api_admin_api_keys_get_api_keys` · auth: AdminApiKey
  - Description : List API keys for the Organization.
  - Paramètres : q:`limit` q:`offset` q:`name`
  - Réponses : 200→APIKeysExtendedOUT
- **`POST /v1/admin/api-keys`** — Create Api Key · `operationId: users_api_admin_api_keys_create_api_key` · auth: AdminApiKey
  - Description : Create a Workspace API key.
  - Corps : `application/json` (AdminCreateAPIKeyIN) → `name`: string \| null, `expiration`: string \| null, `workspace_uuid`*: string, `user_id`*: string
  - Réponses : 200→APIKeyOUT
- **`DELETE /v1/admin/api-keys/{key_id}`** — Delete Api Key · `operationId: users_api_admin_api_keys_delete_api_key` · auth: AdminApiKey
  - Description : Delete an API key.
  - Paramètres : p:`key_id`*
  - Réponses : 200→DeleteAPIKeyOUT

### beta.admin.scim

_(beta) Admin - Scim API._

- **`POST /v1/admin/scim/sync`** — Trigger Scim Sync · `operationId: users_api_admin_scim_sync_trigger_scim_sync` · auth: AdminApiKey
  - Description : Trigger an on-demand SCIM synchronization for the Organization.  Requires SAML authentication to be enabled and the Organization to be in SCIM user provisioning mode. A dry run previews every change without applying it; a real run applies the categories selected in `sync_config`. Only one run may be active at a time — a conflicting request returns the already-active run.
  - Corps : `application/json` (AdminScimSyncTriggerIN) → `dry_run`: boolean, `sync_config`: AdminScimSyncConfig \| null
  - Réponses : 202→AdminScimSyncTriggerOUT, 409→AdminScimSyncActiveRunOUT
- **`GET /v1/admin/scim/sync/{run_id}`** — Get Scim Sync Run · `operationId: users_api_admin_scim_sync_get_scim_sync_run` · auth: AdminApiKey
  - Description : Retrieve an on-demand SCIM synchronization run for the Organization.  Returns the run's lifecycle status along with the preview or result summary once the synchronization plan has been built.
  - Paramètres : p:`run_id`*
  - Réponses : 200→AdminScimSyncRunOUT

### beta.admin.vibe-work-analytics

_Admin usage analytics for Vibe Work._

- **`GET /v1/admin/analytics/vibe/work/usage/by_user_stats`** — Usage by user · `operationId: get_by_user_stats_v1_admin_analytics_vibe_work_usage_by_user_stats` · auth: AdminApiKey
  - Description : Get Vibe Work usage by user for a time range.
  - Paramètres : q:`start_time`* q:`end_time`*
  - Réponses : 200→VibeWorkByUserStatsOUT, 422→HTTPValidationError
- **`GET /v1/admin/analytics/vibe/work/usage/by_agent_stats`** — Usage by agent · `operationId: get_by_agent_stats_v1_admin_analytics_vibe_work_usage_by_agent_stats` · auth: AdminApiKey
  - Description : Get Vibe Work usage by agent for a time range.
  - Paramètres : q:`start_time`* q:`end_time`*
  - Réponses : 200→VibeWorkByAgentStatsOUT, 422→HTTPValidationError
- **`GET /v1/admin/analytics/vibe/work/usage/by_time_stats`** — Usage over time · `operationId: get_by_time_stats_v1_admin_analytics_vibe_work_usage_by_time_stats` · auth: AdminApiKey
  - Description : Get Vibe Work usage over time.
  - Paramètres : q:`start_time`* q:`end_time`* q:`granularity`
  - Réponses : 200→VibeWorkByTimeStatsOUT, 422→HTTPValidationError

### beta.admin.vibe-code-analytics

_Admin usage analytics for Vibe Code._

- **`GET /v1/admin/analytics/vibe/code/usage/by_workspace`** — Usage by workspace · `operationId: get_workspace_stats_v1_admin_analytics_vibe_code_usage_by_workspace` · auth: AdminApiKey
  - Description : Get Vibe Code usage for a Workspace.
  - Paramètres : q:`start_time`* q:`end_time`* q:`workspace_id`
  - Réponses : 200→VibeWorkspaceStatsOUT, 422→HTTPValidationError
- **`GET /v1/admin/analytics/vibe/code/usage/by_organization`** — Usage by organization · `operationId: get_organization_stats_v1_admin_analytics_vibe_code_usage_by_organization` · auth: AdminApiKey
  - Description : Get Vibe Code usage for the Organization.
  - Paramètres : q:`start_time`* q:`end_time`*
  - Réponses : 200→VibeOrganizationStatsOUT, 422→HTTPValidationError


## Annexe A — Énumérations de la spécification (toutes)

Valeurs autorisées telles que définies dans `components.schemas` (statuts, rôles, types, modes…).

| Schéma | Valeurs |
|---|---|
| `APIKeyProduct` | `API`, `Mistral Code`, `Vibe` |
| `APIPlan` | `FREE`, `PAY_AS_YOU_GO` |
| `ActorType` | `HUMAN`, `API_KEY`, `ADMIN_API_KEY`, `SERVICE_ACCOUNT`, `OTHER` |
| `ApiEndpoint` | `/v1/chat/completions`, `/v1/embeddings`, `/v1/fim/completions`, `/v1/moderations`, `/v1/chat/moderations`, `/v1/ocr`, `/v1/classifications`, `/v1/chat/classifications`, `/v1/conversations`, `/v1/audio/transcriptions` |
| `ApiObjectType` | `list` |
| `ApiZone` | `global`, `us`, `eu` |
| `AuditLogEventType` | `user.create`, `user.delete`, `user.log_in`, `user.info.update`, `user.password.update`, `user.phone_number.verify`, `user.organization.leave`, `user.organization.role.update`, `user.organization.delete`, `user.organization.join`, `organization.create`, `organization.delete`, `organization.update`, `organization.invite.send`, `organization.invite.resend`, `organization.invite.accepted`, `organization.invite.revoked`, `organization.join_by_email_domain`, `organization.domain_verification.disable`, `organization.domain_verification.enable`, `organization.email_domain_authentication.enable`, `organization.email_domain_authentication.disable`, `organization.saml_authentication.enable`, `organization.saml_authentication.disable`, `organization.saml_authentication.sso_user_provisioning.update`, `organization.scim_sync.trigger`, `organization.scim.secret.rotate`, `organization.seat_auto_assign.enable`, `organization.seat_auto_assign.disable`, `organization.kind.update`, `organization.sso_seat_auto_assign.enable`, `organization.sso_seat_auto_assign.disable`, `workspace.create`, `workspace.update`, `workspace.delete`, `workspace.member.add`, `workspace.member.remove`, `workspace.member.role.update`, `user_group.create`, `user_group.update`, `user_group.delete`, `user_group.member.add`, `user_group.member.remove`, `user_group.workspace.provision`, `user_group.workspace.deprovision`, `user_group.workspace.update`, `billing.information.updated`, `billing.payment_method.added`, `billing.payment_method.removed`, `billing.payment_method.default_changed`, `billing.invoice.retried`, `billing.subscription.subscribe`, `billing.subscription.unsubscribe`, `billing.subscription.cancel_unsubscribe`, `billing.subscription.add_seats`, `billing.subscription.remove_seats`, `billing.subscription.termination_date.updated`, `billing.credits.added`, `billing.gift_code.used`, `billing.credit_coupon.used`, `billing.subscription_coupon.used`, `billing.monthly_limit.updated`, `billing.workspace_monthly_limit.updated`, `billing.shared_budget_override.updated`, `billing.auto_recharge.updated`, `billing.seat.grant`, `billing.seat.revoke`, `billing.priority_service_tier.updated`, `billing.priority_service_tier.removed`, `le_chat.conversation.created`, `le_chat.temporary_conversation.created`, `le_chat.temporary_conversation.converted`, `le_chat.conversation.deleted`, `le_chat.conversation_batch.deleted`, `le_chat.conversation.public_sharing.enabled`, `le_chat.conversation.public_sharing.disabled`, `le_chat.flash_answers.enabled`, `le_chat.flash_answers.disabled`, `le_chat.localisation_sharing.enabled`, `le_chat.localisation_sharing.disabled`, `le_chat.memories.enabled`, `le_chat.memories.disabled`, `le_chat.data.training_enabled`, `le_chat.data.training_disabled`, `le_chat.actions.external_link`, `admin_api_key.created`, `admin_api_key.delete`, `api_key.create`, `api_key.rotate`, `api_key.delete`, `api_key_policy.update`, `secret_store.entry.create`, `secret_store.entry.update`, `secret_store.entry.delete`, `service_account.create`, `service_account.update`, `service_account.delete`, `service_account.client_secret.create`, `service_account.client_secret.delete`, `service_account.roles.set`, `workload_identity.credential_registration.create`, `workload_identity.credential.create`, `trusted_issuer.create`, `trusted_issuer.update`, `trusted_issuer.delete`, `agent.create`, `agent.delete`, `agent.update`, `skill.create`, `skill.delete`, `skill.enable`, `skill.disable`, `skill.update`, `skill.share`, `skill.unshare`, `skill.load`, `skill.force_load`, `skill.version.create`, `plugin.create`, `plugin.update`, `plugin.delete`, `prompt.create`, `prompt.delete`, `prompt.update`, `prompt.version.create`, `knowledge_base.create`, `knowledge_base.delete`, `knowledge_base.update`, `knowledge_base.version.create`, `custom_voice.create`, `custom_voice.update`, `custom_voice.delete`, `feature_permission.override.created`, `feature_permission.override.deleted`, `resource.share`, `resource.unshare`, `la_plateforme.training.enabled`, `la_plateforme.training.disabled`, `cloud_runtime.app.created`, `cloud_runtime.app.updated`, `cloud_runtime.app.deleted`, `cloud_runtime.app.paused`, `cloud_runtime.app.resumed`, `cloud_runtime.deployment.created`, `cloud_runtime.deployment.succeeded`, `cloud_runtime.deployment.canceled`, `cloud_runtime.deployment.stopped`, `cloud_runtime.deployment.failed`, `cloud_runtime.deployment.autoscaled`, `cloud_runtime.domain.created`, `cloud_runtime.domain.updated`, `cloud_runtime.domain.deleted`, `cloud_runtime.secret.created`, `cloud_runtime.secret.updated`, `cloud_runtime.secret.deleted`, `cloud_runtime.service.created`, `cloud_runtime.service.paused`, `cloud_runtime.service.resumed`, `cloud_runtime.service.deleted`, `cloud_runtime.service.manually_scaled`, `cloud_runtime.service.manual_scaling_deleted`, `cloud_runtime.persistent_volume.created`, `cloud_runtime.persistent_volume.deleted`, `cloud_runtime.persistent_volume.attached`, `cloud_runtime.persistent_volume.detached`, `fine_tuning_job.create`, `fine_tuning_job.cancel`, `batch_job.create`, `batch_job.cancel`, `batch_job.delete`, `data_capture.extract_job.create`, `data_capture.extract_job.cancel`, `dataset.create`, `dataset.delete`, `library.create`, `library.delete`, `library.update`, `library.share`, `library.unshare`, `library.document.create`, `library.document.delete`, `library.document.bulk_delete`, `library.document.update`, `library.document.reprocess`, `integration.connected`, `integration.disconnected`, `indexing.workflow.completed`, `indexing.deleted`, `connection.admin.setup_index`, `connection.admin.deleted`, `integration.activated_for_org`, `integration.deactivated_for_org`, `integration.activated_for_workspace`, `integration.deactivated_for_workspace`, `integration.activated_for_user`, `integration.deactivated_for_user`, `integration.created`, `integration.updated`, `integration.deleted`, `integration.tool_called`, `integration.tool_activated`, `integration.tool_deactivated`, `integration.credentials.created_or_updated`, `integration.credentials.deleted`, `integration.credentials.revoked`, `integration.credentials.revocation_failed`, `integration.preferences.created_or_updated`, `integration.preferences.deleted`, `integration.authentication_method.created_or_updated`, `integration.connection.created`, `integration.shared`, `integration.unshared`, `connectors_gateway.tool_called`, `connectors_debugger.tool_called`, `crawler.config.create`, `crawler.config.update`, `crawler.config.delete`, `crawler.run.create`, `crawler.run.cancel`, `web_search.filter_config.update`, `web_search.filter_domain.add`, `web_search.filter_domain.remove`, `web_filters.config.update`, `web_filters.domain.add`, `web_filters.domain.remove`, `secrets_manager.secret.created`, `secrets_manager.secret.updated`, `secrets_manager.secret.revealed`, `secrets_manager.secret.metadata_updated`, `secrets_manager.secret.deleted`, `secrets_manager.secret.version.deleted`, `secrets_manager.secret.version.restored`, `rate_limit.rule.create`, `rate_limit.rule.update`, `rate_limit.rule.delete`, `workflow.execution.started`, `workflow.execution.canceled`, `workflow.execution.terminated`, `workflow.execution.signal`, `workflow.execution.query`, `workflow.execution.update`, `workflow.worker.registered`, `workflow.schedule.created`, `workflow.schedule.updated`, `workflow.schedule.paused`, `workflow.schedule.resumed`, `workflow.schedule.deleted`, `workflow.schedule.triggered`, `workflow.archived`, `workflow.unarchived`, `workflow.deployment.authorized_credential.granted`, `workflow.deployment.authorized_credential.revoked` |
| `AuthStatus` | `valid`, `invalid`, `error` |
| `AuthenticationType` | `oauth2`, `bearer`, `none`, `github_app`, `slack_app` |
| `BaseTaskStatus` | `RUNNING`, `COMPLETED`, `FAILED`, `CANCELED`, `TERMINATED`, `CONTINUED_AS_NEW`, `TIMED_OUT`, `UNKNOWN` |
| `BatchJobStatus` | `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `TIMEOUT_EXCEEDED`, `CANCELLATION_REQUESTED`, `CANCELLED` |
| `BuiltInConnectors` | `web_search`, `web_search_premium`, `code_interpreter`, `image_generation`, `document_library`, `mistral_mcp` |
| `ChatPlan` | `INDIVIDUAL`, `EDU`, `TEAM` |
| `ClientSessionPurpose` | `realtime` |
| `CodePlan` | `ENTERPRISE` |
| `ConnectionConfigType` | `mcp`, `turbine`, `eolienne` |
| `ConnectorSupportedLanguage` | `en`, `fr`, `ar`, `es`, `de`, `pl`, `pt-BR`, `it`, `nl`, `uk`, `ko` |
| `ConsumerType` | `user`, `org`, `workspace`, `system` |
| `ContentSearchOperator` | `contains`, `equals` |
| `CredentialsStatusErrorReason` | `oauth expired`, `oauth near expiry`, `empty credentials`, `blank bearer token`, `unparsable credentials`, `you need to reconnect`, `oauth refresh error`, `MCP server unreachable`, `MCP server timed out`, `MCP server error`, `unknown error` |
| `DatasetRecordSource` | `EXPLORER`, `UPLOADED_FILE`, `DIRECT_INPUT`, `PLAYGROUND`, `TELEMETRY_SPAN` |
| `DeleteUnavailableReason` | `not_allowed` |
| `DeploymentLogType` | `build`, `runtime` |
| `DistanceMetric` | `cosine`, `inner_product`, `l2` |
| `EmbeddingDtype` | `float`, `int8`, `uint8`, `binary`, `ubinary` |
| `EncodedPayloadOptions` | `offloaded`, `encrypted`, `encrypted-partial`, `compressed` |
| `EncodingFormat` | `float`, `base64` |
| `EntityType` | `User`, `Workspace`, `Org` |
| `EventProgressStatus` | `RUNNING`, `COMPLETED`, `FAILED` |
| `EventSource` | `DATABASE`, `LIVE`, `HYBRID` |
| `EventType` | `EVENT`, `EVENT_PROGRESS` |
| `FTClassifierLossFunction` | `single_class`, `multi_class` |
| `FilePurpose` | `fine-tune`, `batch`, `ocr`, `agentic_safety` |
| `FileVisibility` | `workspace`, `user` |
| `FilterCombinator` | `and`, `or` |
| `GoalStatus` | `passed`, `failed`, `not_evaluated` |
| `Granularity` | `auto`, `second`, `minute`, `hour`, `day`, `week`, `month` |
| `GrepMode` | `phrase`, `term` |
| `HTTPStatus` | `100`, `101`, `102`, `103`, `200`, `201`, `202`, `203`, `204`, `205`, `206`, `207`, `208`, `226`, `300`, `301`, `302`, `303`, `304`, `305`, `307`, `308`, `400`, `401`, `402`, `403`, `404`, `405`, `406`, `407`, `408`, `409`, `410`, `411`, `412`, `413`, `414`, `415`, `416`, `417`, `418`, `421`, `422`, `423`, `424`, `425`, `426`, `428`, `429`, `431`, `451`, `500`, `501`, `502`, `503`, `504`, `505`, `506`, `507`, `508`, `510`, `511` |
| `IPAPhoneme` | `a`, `aɪ`, `aʊ`, `b`, `d`, `dʒ`, `e`, `eɪ`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `oʊ`, `p`, `s`, `t`, `tʃ`, `u`, `v`, `w`, `z`, `æ`, `ð`, `ŋ`, `ɑ`, `ɔ`, `ɔɪ`, `ɖ`, `ə`, `ɚ`, `ɛ`, `ɜ`, `ɪ`, `ɱ`, `ɹ`, `ɾ`, `ʃ`, `ʈ`, `ʊ`, `ʋ`, `ʌ`, `ʒ`, `ʔ`, `θ` |
| `ImageDetail` | `low`, `auto`, `high` |
| `JudgeOutputType` | `REGRESSION`, `CLASSIFICATION` |
| `LagoEventType` | `api_tokens`, `api_pages`, `api_audio_seconds`, `api_audio_characters`, `api_connectors`, `api_libraries_tokens`, `api_libraries_pages`, `api_libraries_audio`, `deployment_tokens`, `gpu_hour`, `reserved_instance`, `vibe_tokens`, `vibe_connectors`, `vibe_pages`, `vibe_audio_seconds`, `vibe_audio_characters` |
| `ListSortDirection` | `list_sort_direction_unspecified`, `list_sort_direction_asc`, `list_sort_direction_desc` |
| `ListSortField` | `list_sort_field_unspecified`, `list_sort_field_created_at`, `list_sort_field_last_modified_at`, `list_sort_field_name`, `list_sort_field_title` |
| `LocationType` | `local`, `k8s`, `managed` |
| `MCPSupportedLanguage` | `en`, `fr`, `de`, `es`, `pl`, `it`, `ar`, `pt-BR`, `nl`, `uk`, `ko` |
| `ManagedIndexStatus` | `provisioning`, `ready`, `failed`, `deleting` |
| `MetricAggregation` | `count`, `count_distinct`, `sum`, `avg`, `min`, `max`, `p50`, `p90`, `p95`, `p99` |
| `MistralPromptMode` | `reasoning` |
| `ModerationLLMAction` | `none`, `block` |
| `NavigationDirection` | `next`, `previous` |
| `NumericScoreMetric` | `avg`, `min`, `max`, `std` |
| `OAuth2GrantType` | `authorization_code`, `client_credentials` |
| `OAuth2TokenEndpointAuthMethod` | `client_secret_post`, `client_secret_basic`, `private_key_jwt` |
| `OAuthMetadataSource` | `autodiscovery`, `provided` |
| `ObservabilityErrorCode` | `UNKNOWN_ERROR`, `VALIDATION_ERROR`, `AUTH_FORBIDDEN`, `AUTH_FORBIDDEN_NOT_WORKSPACE_ADMIN`, `AUTH_FORBIDDEN_WORKSPACE_NOT_FOUND`, `AUTH_FORBIDDEN_ROLE_NOT_FOUND`, `AUTH_UNAUTHORIZED`, `FEATURE_NOT_SUPPORTED`, `FIELDS_BAD_REQUEST`, `SEARCH_BAD_REQUEST`, `DATABASE_ERROR`, `DATABASE_TIMEOUT`, `DATABASE_UNAVAILABLE`, `DATABASE_QUERY_ERROR`, `SEARCH_FILTER_TO_SQL_CONVERSION_ERROR`, `JUDGE_CONVERSATION_FORMAT_ERROR`, `JUDGE_MISTRAL_API_ERROR`, `JUDGE_MISTRAL_API_TIMEOUT`, `JUDGE_NAME_ALREADY_EXISTS`, `JUDGE_NOT_FOUND`, `JUDGE_DID_NOT_CHANGE`, `DATASET_NOT_FOUND`, `DATASET_TASK_NOT_FOUND`, `DATASET_RECORD_NOT_FOUND`, `DATASET_RECORD_FORMAT_ERROR`, `AGENT_NOT_FOUND`, `AGENT_MISTRAL_API_ERROR`, `EVALUATION_NOT_FOUND`, `EVALUATION_CURRENTLY_RUNNING`, `EVALUATION_RECORD_NOT_FOUND`, `EVALUATION_RUN_NOT_FOUND`, `EVALUATION_RUN_TRANSITION_IS_INVALID`, `EVALUATION_RUN_TRANSITION_IS_RUNNING_ALREADY`, `EVALUATION_RUN_TRANSITION_ERROR`, `EVALUATION_RUN_OUTPUT_RECORD_CONFLICT`, `TEMPLATE_ERROR`, `TEMPLATE_SYNTAX_ERROR`, `PROJECT_NOT_FOUND`, `PROJECT_NAME_ALREADY_EXISTS`, `PIPELINE_CONFIG_NOT_FOUND`, `PIPELINE_CONFIG_ALREADY_EXISTS`, `PIPELINE_NOT_FOUND`, `PIPELINE_ALREADY_EXISTS`, `SCORER_NOT_FOUND`, `SCORER_ALREADY_EXISTS`, `SCORER_CONFIG_KIND_MISMATCH`, `EVALUATION_NAME_ALREADY_EXISTS`, `OPTIMIZATION_NOT_FOUND`, `OPTIMIZATION_TRIAL_KEY_ALREADY_EXISTS`, `TRACES_FILTER_QUERY_PARSE_ERROR`, `TRACE_NOT_FOUND`, `SPAN_NOT_FOUND` |
| `PipelineConfigScope` | `workspace`, `shared` |
| `PipelineKind` | `detection-v1`, `moderation-v1`, `judge-v1`, `export-v1` |
| `PlanType` | `API`, `CHAT`, `ON_PREMISE`, `LICENSE`, `MISTRAL_CODE` |
| `PrincipalType` | `api_key`, `service_account`, `user` |
| `ProcessStatus` | `self_managed`, `missing_content`, `noop`, `done`, `todo`, `in_progress`, `error`, `waiting_for_capacity` |
| `PublicResourceVisibility` | `shared_org`, `shared_workspace`, `private` |
| `ReasoningEffort` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `RecordSortField` | `created_at` |
| `RegistrySharingScope` | `sharing_scope_unspecified`, `private`, `workspace` |
| `RequestSource` | `api`, `playground`, `agent_builder_v1` |
| `RequestedServiceTier` | `auto`, `standard_only` |
| `ResourceVisibility` | `shared_global`, `shared_org`, `shared_workspace`, `private` |
| `ResponseFormats` | `text`, `json_object`, `json_schema` |
| `RotateUnavailableReason` | `unsupported_scope`, `key_expired`, `not_allowed` |
| `SSETypes` | `conversation.response.started`, `conversation.response.done`, `conversation.response.error`, `message.output.delta`, `tool.execution.started`, `tool.execution.delta`, `tool.execution.done`, `agent.handoff.started`, `agent.handoff.done`, `function.call.delta` |
| `SampleType` | `pretrain`, `instruct`, `batch_request`, `batch_result`, `batch_error` |
| `ScheduleOverlapPolicy` | `1`, `2`, `3`, `4`, `5`, `6` |
| `SchemaFieldDataType` | `int`, `bool`, `string`, `embedding`, `long`, `float` |
| `SchemaFieldIndex` | `ann`, `bm25`, `attribute` |
| `SchemaFieldRankingType` | `count`, `embedding`, `timestamp`, `text`, `string`, `bool`, `int`, `language` |
| `SchemaFieldStorage` | `in_memory`, `on_disk` |
| `ScimSyncRunStatus` | `PENDING`, `RUNNING`, `SUCCESS`, `SKIPPED`, `FAILED` |
| `ScoreOperator` | `gt`, `gte`, `lt`, `lte`, `eq` |
| `ServiceTier` | `standard`, `priority` |
| `ShareEnum` | `Viewer`, `Editor` |
| `ShareRelation` | `share_relation_unspecified`, `reader`, `writer` |
| `SortDirection` | `asc`, `desc` |
| `SortOrder` | `asc`, `desc` |
| `Source` | `upload`, `repository`, `mistral` |
| `SourceKind` | `span`, `log`, `metric` |
| `SpanDatasetSourceNamespace` | `span_attributes`, `resource_attributes` |
| `SpeechOutputFormat` | `pcm`, `wav`, `mp3`, `flac`, `opus` |
| `StaticOrganizationRoles` | `0d48f530-095c-43fe-8aea-6673bcacabe6`, `c955f4e1-9477-43f0-8349-6fbc629fccc9`, `7bde5959-d676-47d2-b779-35b64323d278` |
| `StaticWorkspaceRoles` | `d7ea77c5-9260-41d0-ab26-52b5add3ee56`, `48436751-ee56-44bd-8a2d-712233977821`, `375cd0db-3bbe-4b79-80f3-954ccf04f3d1`, `578584f1-4319-4c88-9948-38a5184483b6`, `d79b3027-4eb2-4521-8722-825acfee7d8b`, `252a0825-40b9-4b98-be80-7658956f13e9`, `17aa61c5-1c61-477e-a40a-e52c8ccd74b9`, `348fc8da-f6da-4464-ad3e-af7bc137e221`, `b23cd6e0-91cd-4a8a-9869-b30366bf3966`, `731eb2be-a74f-4070-b797-35bf7009e553`, `ff86d432-7f27-47f8-b02f-b5c102ef6a55`, `0f9acbf6-93b5-42c7-a227-fc7652755f65`, `94ef59cf-56bf-4383-9dd6-1fee77d370af`, `7e69e493-caf6-4671-af60-84951754d9fc`, `b23cd6e0-91cd-4a8a-9869-b30366bf3966` |
| `SubscriptionStatus` | `NS`, `S`, `IC`, `A`, `CF`, `CG`, `C`, `PC`, `GP` |
| `SystemParamOperator` | `eq`, `contains`, `gt`, `gte`, `lt`, `lte` |
| `TargetType` | `USER`, `USER_GROUP`, `ORGANIZATION`, `WORKSPACE`, `API_KEY`, `ADMIN_API_KEY`, `API_KEY_POLICY`, `SERVICE_ACCOUNT`, `AGENT`, `SKILL`, `PLUGIN`, `PROMPT`, `KNOWLEDGE_BASE`, `CUSTOM_VOICE`, `DATASET`, `FINE_TUNING_JOB`, `BATCH_JOB`, `DATA_CAPTURE_EXTRACT_JOB`, `LE_CHAT_CONVERSATION`, `LE_CHAT_MEMORIES`, `LE_CHAT_FLASH_ANSWERS`, `LE_CHAT_LOCALISATION`, `LE_CHAT_DATA`, `INVOICE`, `WALLET`, `MONTHLY_LIMIT`, `WORKSPACE_MONTHLY_LIMIT`, `SHARED_BUDGET`, `AUTO_RECHARGE`, `PAYMENT_METHOD`, `SUBSCRIPTION`, `BILLING_INFO`, `LIBRARY`, `LIBRARY_DOCUMENT`, `INTEGRATION`, `CONNECTORS_GATEWAY`, `CONNECTORS_DEBUGGER`, `FEATURE_PERMISSION`, `SECRET_STORE_ENTRY`, `CRAWLER_CONFIG`, `WEB_SEARCH_FILTER`, `WEB_FILTERS`, `SHARED_RESOURCE`, `RATE_LIMIT_RULE`, `APP`, `DEPLOYMENT`, `DOMAIN`, `PERSISTENT_VOLUME`, `SECRET`, `SERVICE`, `TRUSTED_ISSUER`, `WORKFLOW`, `SCHEDULE` |
| `TempoTraceScopeKind` | `SPAN_KIND_INTERNAL`, `SPAN_KIND_SERVER`, `SPAN_KIND_CLIENT` |
| `TimestampGranularity` | `segment`, `word` |
| `ToolChoiceEnum` | `auto`, `none`, `any`, `required` |
| `ToolType` | `rag`, `image`, `code`, `event` |
| `ToolTypes` | `function` |
| `TranscriptionStreamEventTypes` | `transcription.language`, `transcription.segment`, `transcription.text.delta`, `transcription.done` |
| `UsageType` | `usage`, `codestral`, `document_library`, `document_library_api`, `libraries_pages`, `libraries_tokens`, `libraries_audio`, `chat`, `rlhf`, `ocr`, `audio_seconds`, `audio_characters`, `audio_agents`, `connectors`, `workflow_executions`, `vibe`, `vibe_connectors`, `vibe_ocr`, `vibe_audio_seconds`, `vibe_audio_characters` |
| `UserRole` | `A`, `M`, `B` |
| `VectorDType` | `float16`, `float32` |
| `VoiceGender` | `female`, `male`, `neutral` |
| `VoiceKind` | `ivc`, `pvc` |
| `WorkflowEventType` | `WORKFLOW_EXECUTION_STARTED`, `WORKFLOW_EXECUTION_COMPLETED`, `WORKFLOW_EXECUTION_FAILED`, `WORKFLOW_EXECUTION_CANCELED`, `WORKFLOW_EXECUTION_CONTINUED_AS_NEW`, `WORKFLOW_TASK_TIMED_OUT`, `WORKFLOW_TASK_FAILED`, `CUSTOM_TASK_STARTED`, `CUSTOM_TASK_IN_PROGRESS`, `CUSTOM_TASK_COMPLETED`, `CUSTOM_TASK_FAILED`, `CUSTOM_TASK_TIMED_OUT`, `CUSTOM_TASK_CANCELED`, `ACTIVITY_TASK_STARTED`, `ACTIVITY_TASK_COMPLETED`, `ACTIVITY_TASK_RETRYING`, `ACTIVITY_TASK_FAILED` |
| `WorkflowExecutionStatus` | `RUNNING`, `COMPLETED`, `FAILED`, `CANCELED`, `TERMINATED`, `CONTINUED_AS_NEW`, `TIMED_OUT`, `RETRYING_AFTER_ERROR` |
| `WorkflowType` | `code` |
| `WorkspaceRole` | `A`, `M` |

## Annexe B — Schémas clés (champs)

Sélection de schémas centraux ; les noms absents de la spec sont ignorés (WorkflowExecution, Deployment, Schedule).

### `CompletionArgs`

_White-listed arguments from the completion API_

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `stop` | CompletionArgsStop |  |  |  |
| `presence_penalty` | number \| null |  |  |  |
| `frequency_penalty` | number \| null |  |  |  |
| `temperature` | number \| null |  |  |  |
| `top_p` | number \| null |  |  |  |
| `max_tokens` | integer \| null |  |  |  |
| `random_seed` | integer \| null |  |  |  |
| `prediction` | Prediction \| null |  |  |  |
| `response_format` | ResponseFormat \| null |  |  |  |
| `tool_choice` | ToolChoiceEnum |  | `auto` |  |
| `reasoning_effort` | ReasoningEffort \| null |  |  |  |

### `Agent`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `instructions` | string \| null |  |  | Instruction prompt the model will follow during the conversation. |
| `tools` | array<FunctionTool \| WebSearchTool \| WebSearchPremiumTool \| CodeInterpreterTool \| ImageGenerationTool \| DocumentLibraryTool \| CustomConnector> |  |  | List of tools which are available to the model during the conversation. |
| `completion_args` | CompletionArgs |  |  | Completion arguments that will be used to generate assistant responses. Can be overridden at each message request. |
| `guardrails` | array<GuardrailConfig> \| null |  |  |  |
| `model` | string | oui |  |  |
| `name` | string | oui |  |  |
| `description` | string \| null |  |  |  |
| `handoffs` | array<string> \| null |  |  |  |
| `metadata` | MetadataDict \| null |  |  |  |
| `object` | const `agent` |  | `agent` |  |
| `id` | string | oui |  |  |
| `version` | integer | oui |  |  |
| `versions` | array<integer> | oui |  |  |
| `owner_id` | string \| null |  |  |  |
| `created_at` | string | oui |  |  |
| `updated_at` | string | oui |  |  |
| `deployment_chat` | boolean | oui |  |  |
| `source` | string | oui |  |  |
| `version_message` | string \| null |  |  |  |

### `FunctionTool`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `type` | enum(function) |  | `function` |  |
| `function` | Function | oui |  |  |

### `WebSearchTool`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `tool_configuration` | ToolConfiguration \| null |  |  |  |
| `type` | enum(web_search) |  | `web_search` |  |

### `WebSearchPremiumTool`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `tool_configuration` | ToolConfiguration \| null |  |  |  |
| `type` | enum(web_search_premium) |  | `web_search_premium` |  |

### `CodeInterpreterTool`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `tool_configuration` | ToolConfiguration \| null |  |  |  |
| `type` | enum(code_interpreter) |  | `code_interpreter` |  |

### `ImageGenerationTool`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `tool_configuration` | ToolConfiguration \| null |  |  |  |
| `type` | enum(image_generation) |  | `image_generation` |  |

### `DocumentLibraryTool`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `tool_configuration` | ToolConfiguration \| null |  |  |  |
| `type` | enum(document_library) |  | `document_library` |  |
| `library_ids` | array<string> | oui |  | Ids of the library in which to search. |

### `CustomConnector`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `type` | enum(connector) |  | `connector` |  |
| `connector_id` | string | oui |  |  |
| `authorization` | OAuth2TokenAuth \| APIKeyAuth \| null |  |  |  |
| `tool_configuration` | ToolConfiguration \| null |  |  |  |

### `GuardrailConfig`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `block_on_error` | boolean |  | `False` | If true, return HTTP 403 and block request in the event of a server-side error |
| `moderation_llm_v1` | ModerationLLMV1Config \| null |  |  |  |
| `moderation_llm_v2` | ModerationLLMV2Config \| null |  |  |  |

### `ResponseFormat`

_Specify the format that the model must output. By default it will use `{ "type": "text" }`. Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is in JSON. When using JSON mode you MUST also instruct the model to produce JSON yourself with a system or a user message. Setting to `{ "type": "json_schema" }` enables JSON schema mode, which guaran_

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `type` | ResponseFormats |  | `text` |  |
| `json_schema` | JsonSchema \| null |  |  |  |

### `Prediction`

_Enable users to specify an expected completion, optimizing response times by leveraging known or predictable content._

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `type` | const `content` |  | `content` |  |
| `content` | string |  |  |  |

### `ToolChoice`

_ToolChoice is either a ToolChoiceEnum or a ToolChoice_

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `type` | ToolTypes |  | `function` |  |
| `function` | FunctionName | oui |  |  |

### `ConversationRequest`

Type : object

### `ConversationResponse`

_The response after appending new entries to the conversation._

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `object` | const `conversation.response` |  | `conversation.response` |  |
| `conversation_id` | string | oui |  |  |
| `outputs` | array<MessageOutputEntry \| ToolExecutionEntry \| FunctionCallEntry \| AgentHandoffEntry> | oui |  |  |
| `usage` | ConversationUsageInfo | oui |  |  |
| `guardrails` | array<object> \| null |  | `None` |  |

### `UsageInfo`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `prompt_tokens` | integer | oui | `0` |  |
| `completion_tokens` | integer | oui | `0` |  |
| `total_tokens` | integer | oui | `0` |  |
| `prompt_audio_seconds` | integer \| null |  |  |  |
| `service_tier` | string \| null |  |  | The service tier at which the request was processed: standard or priority. |

### `ChatCompletionResponse`

Type : object

### `Library`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  |  |
| `name` | string | oui |  |  |
| `created_at` | string | oui |  |  |
| `updated_at` | string | oui |  |  |
| `owner_id` | string \| null | oui |  |  |
| `owner_type` | string | oui |  |  |
| `total_size` | integer | oui |  |  |
| `nb_documents` | integer | oui |  |  |
| `chunk_size` | integer \| null | oui |  |  |
| `emoji` | string \| null |  |  |  |
| `description` | string \| null |  |  |  |
| `generated_description` | string \| null |  |  |  |
| `explicit_user_members_count` | integer \| null |  |  |  |
| `explicit_workspace_members_count` | integer \| null |  |  |  |
| `org_sharing_role` | string \| null |  |  |  |
| `generated_name` | string \| null |  |  | Generated Name |

### `Document`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  |  |
| `library_id` | string | oui |  |  |
| `hash` | string \| null | oui |  |  |
| `mime_type` | string \| null | oui |  |  |
| `extension` | string \| null | oui |  |  |
| `size` | integer \| null | oui |  |  |
| `name` | string | oui |  |  |
| `summary` | string \| null |  |  |  |
| `created_at` | string | oui |  |  |
| `last_processed_at` | string \| null |  |  |  |
| `number_of_pages` | integer \| null |  |  |  |
| `process_status` | ProcessStatus | oui |  | Processing status of the document.  |
| `uploaded_by_id` | string \| null | oui |  |  |
| `uploaded_by_type` | string | oui |  |  |
| `tokens_processing_main_content` | integer \| null |  |  |  |
| `tokens_processing_summary` | integer \| null |  |  |  |
| `url` | string \| null |  |  |  |
| `attributes` | object \| null |  |  |  |
| `expires_at` | string \| null |  |  | If set, the document will be automatically deleted after this date. |
| `processing_status` | string | oui |  |  |
| `tokens_processing_total` | integer | oui |  |  |

### `BatchJob`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  |  |
| `object` | const `batch` |  | `batch` |  |
| `input_files` | array<string> | oui |  |  |
| `metadata` | object \| null |  |  |  |
| `endpoint` | string | oui |  |  |
| `model` | string \| null |  |  |  |
| `agent_id` | string \| null |  |  |  |
| `output_file` | string \| null |  |  |  |
| `error_file` | string \| null |  |  |  |
| `errors` | array<BatchError> | oui |  |  |
| `outputs` | array<object> \| null |  |  |  |
| `status` | BatchJobStatus | oui |  |  |
| `created_at` | integer | oui |  |  |
| `total_requests` | integer | oui |  |  |
| `completed_requests` | integer | oui |  |  |
| `succeeded_requests` | integer | oui |  |  |
| `failed_requests` | integer | oui |  |  |
| `started_at` | integer \| null |  |  |  |
| `completed_at` | integer \| null |  |  |  |

### `Judge`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  |  |
| `created_at` | string | oui |  |  |
| `updated_at` | string | oui |  |  |
| `deleted_at` | string \| null | oui |  |  |
| `owner_id` | string | oui |  |  |
| `workspace_id` | string | oui |  |  |
| `name` | string | oui |  |  |
| `description` | string | oui |  |  |
| `model_name` | string | oui |  |  |
| `output` | JudgeClassificationOutput \| JudgeRegressionOutput | oui |  |  |
| `instructions` | string | oui |  |  |
| `tools` | array<string> | oui |  |  |
| `up_revision` | string \| null |  |  |  |
| `down_revision` | string \| null |  |  |  |
| `base_revision` | string \| null |  |  |  |

### `Dataset`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  |  |
| `created_at` | string | oui |  |  |
| `updated_at` | string | oui |  |  |
| `deleted_at` | string \| null | oui |  |  |
| `name` | string | oui |  |  |
| `slug` | string | oui |  |  |
| `description` | string | oui |  |  |
| `owner_id` | string | oui |  |  |
| `workspace_id` | string | oui |  |  |

### `Prompt`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string |  |  |  |
| `name` | string |  |  | Stable object name. |
| `definition` | PromptDefinition |  |  |  |
| `version` | integer |  |  |  |
| `notes` | string |  |  | Notes for this version. |
| `aliases` | array<string> |  |  | Aliases pointing to this version. |
| `sharingScope` | RegistrySharingScope |  |  | Registry sharing scope. |
| `createdAt` | Timestamp |  |  | Creation time. |
| `updatedAt` | Timestamp |  |  | Last update time. |
| `latestVersion` | integer |  |  | Latest version number. |
| `title` | string |  |  | Display title. |
| `description` | string |  |  | Display description. |
| `createdBy` | string |  |  |  |
| `versionCreatedAt` | Timestamp |  |  |  |

### `Skill`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string |  |  |  |
| `name` | string |  |  | Stable object name. |
| `definition` | SkillDefinition |  |  |  |
| `version` | integer |  |  |  |
| `notes` | string |  |  | Notes for this version. |
| `aliases` | array<string> |  |  | Aliases pointing to this version. |
| `sharingScope` | RegistrySharingScope |  |  | Registry sharing scope. |
| `createdAt` | Timestamp |  |  | Creation time. |
| `updatedAt` | Timestamp |  |  | Last update time. |
| `latestVersion` | integer |  |  | Latest version number. |

### `Workflow`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  | Unique identifier of the workflow |
| `name` | string | oui |  | Name of the workflow |
| `display_name` | string | oui |  | Display name of the workflow |
| `type` | WorkflowType | oui |  | Type of the workflow |
| `description` | string \| null |  |  | Description of the workflow |
| `customer_id` | string | oui |  | Customer ID of the workflow |
| `workspace_id` | string | oui |  | Workspace ID of the workflow |
| `shared_namespace` | string \| null |  |  | Reserved namespace for shared workflows (e.g., 'shared:my-shared-workflow') |
| `available_in_chat_assistant` | boolean |  | `False` | Whether the workflow is available in chat assistant |
| `is_technical` | boolean |  | `False` | Whether the workflow is technical (e.g. SDK-managed) |
| `archived` | boolean |  | `False` | Whether the workflow is archived |
| `tags` | array<string> |  |  | Tags for filtering and discovery |

### `ServiceAccount`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `id` | string | oui |  |  |
| `name` | string | oui |  |  |
| `customer_id` | string | oui |  |  |
| `organization_id` | string | oui |  |  |
| `workspace_id` | string | oui |  |  |
| `description` | string \| null | oui |  |  |
| `created_at` | string | oui |  |  |
| `updated_at` | string | oui |  |  |
| `deleted_at` | string \| null | oui |  |  |

### `Connector`

Type : MCPConnector \| HTTPConnector

### `OCRRequest`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `model` | string \| null | oui |  |  |
| `document` | FileChunk \| DocumentURLChunk \| ImageURLChunk | oui |  | Document to run OCR on |
| `pages` | string \| array<integer> \| null |  |  | Specific pages to process. Accepts a list of integers or a string of comma-separated numbers and ranges (e.g. '0,1,2' or '0-5' or '0,2-4'). Page numbers start from 0. |
| `include_image_base64` | boolean \| null |  |  | Include image URLs in response |
| `image_limit` | integer \| null |  |  | Max images to extract |
| `image_min_size` | integer \| null |  |  | Minimum height and width of image to extract |
| `bbox_annotation_format` | ResponseFormat \| null |  |  | Structured output class for extracting useful information from each extracted bounding box / image from document. Only json_schema is valid for this field |
| `document_annotation_format` | ResponseFormat \| null |  |  | Structured output class for extracting useful information from the entire document. Only json_schema is valid for this field |
| `document_annotation_prompt` | string \| null |  |  | Optional prompt to guide the model in extracting structured output from the entire document. A document_annotation_format must be provided. |
| `table_format` | enum(markdown, html) \| null |  |  |  |
| `extract_header` | boolean |  | `False` | Extract the page header into the response's `header` field and remove it from the markdown content |
| `extract_footer` | boolean |  | `False` | Extract the page footer into the response's `footer` field and remove it from the markdown content |
| `include_blocks` | boolean |  | `True` | Return paragraph-level bounding boxes for all content blocks in the response |
| `confidence_scores_granularity` | enum(word, page, block) \| null |  |  | Granularity for confidence scores: 'page' (aggregate only), 'word' (per-word scores), or 'block' (per-block scores). Defaults to None (no confidence scores) to keep response payload small. |

### `OCRResponse`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `pages` | array<OCRPageObject> | oui |  | List of OCR info for pages. |
| `model` | string | oui |  | The model used to generate the OCR. |
| `document_annotation` | string \| null |  |  | Formatted response in the request_format if provided in json str |
| `usage_info` | OCRUsageInfo | oui |  | Usage info for the OCR request. |

### `EmbeddingRequest`

| Champ | Type | Obl. | Défaut | Description |
|---|---|---|---|---|
| `model` | string | oui |  | ID of the model to use. |
| `metadata` | object \| null |  |  |  |
| `input` | string \| array<string> | oui |  | Text to embed. |
| `output_dimension` | integer \| null |  |  | The dimension of the output embeddings when feature available. If not provided, a default output dimension will be used. |
| `output_dtype` | EmbeddingDtype |  | `float` | The data type of the output embeddings when feature available. If not provided, a default output data type will be used. |
| `encoding_format` | EncodingFormat |  | `float` | The format of embeddings in the response. |

