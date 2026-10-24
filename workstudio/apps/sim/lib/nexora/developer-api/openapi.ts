/**
 * The OpenAPI 3.1 description of the developer API, served at `<instance>/v1/openapi.json` (no key
 * needed) so tools and developers can read what the instance offers. Kept to what the gateway
 * implements; request and answer bodies follow OpenAI's, documented by reference.
 */
export function buildDeveloperOpenApi(baseUrl: string) {
  const errorResponse = (description: string) => ({
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  })
  /** What every call can meet: the key, its rate, the instance's model service. */
  const refusals = {
    '401': errorResponse(
      'Clé absente, invalide, expirée (expired_api_key) ou révoquée (revoked_api_key, y compris quand son espace a été supprimé).'
    ),
    '429': errorResponse(
      'Débit de la clé dépassé (rate_limit_exceeded) ou plafond mensuel atteint (monthly_cap_reached).'
    ),
    '503': errorResponse(
      'Service de modèles de l’instance injoignable (service_unavailable) ou modèle occupé (model_busy).'
    ),
  }
  /** What a call that runs a model can meet on top of {@link refusals}. */
  const callRefusals = {
    ...refusals,
    '400': errorResponse('Requête invalide (invalid_request, unsupported_content).'),
    '402': errorResponse(
      'Budget mensuel de l’espace ou de l’instance atteint (monthly_budget_reached).'
    ),
    '403': errorResponse(
      'Modèle ou agent non autorisé pour cette clé ou par le groupe d’accès de son créateur (model_not_allowed, agent_needs_workspace_key).'
    ),
    '404': errorResponse('Modèle ou agent introuvable (model_not_found).'),
    '413': errorResponse(
      'Corps trop volumineux : 20 Mo pour un JSON (request_too_large), 25 Mo pour un fichier audio (file_too_large).'
    ),
    '502': errorResponse('Nexora API n’a pas pu traiter la requête (upstream_error).'),
  }
  const jsonBody = (description: string) => ({
    required: true,
    description,
    content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
  })
  return {
    openapi: '3.1.0',
    info: {
      title: 'Nexora — API compatible OpenAI',
      version: '1.0.0',
      description:
        'Modèles et agents publiés de l’instance au format OpenAI. Authentification : « Authorization: Bearer <clé> », clé créée dans Réglages › Clés API. Les agents s’appellent avec « model »: « agent:<nom> » ou « agent:<identifiant> ».',
      'x-openai-reference': 'https://platform.openai.com/docs/api-reference',
    },
    servers: [{ url: `${baseUrl.replace(/\/+$/, '')}/v1` }],
    security: [{ bearer: [] }],
    paths: {
      '/models': {
        get: {
          summary: 'Lister les modèles et agents que la clé peut appeler',
          responses: {
            '200': { description: 'Liste au format OpenAI (« object »: « list »).' },
            ...refusals,
          },
        },
      },
      '/models/{model}': {
        get: {
          summary: 'Lire un modèle ou un agent',
          parameters: [{ name: 'model', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Le modèle.' },
            '404': errorResponse('Modèle introuvable.'),
            ...refusals,
          },
        },
      },
      '/chat/completions': {
        post: {
          summary:
            'Répondre à une conversation (modèle ou agent publié, en flux avec « stream »: true)',
          requestBody: jsonBody(
            'Corps OpenAI « chat.completions » : model, messages, stream, temperature…'
          ),
          responses: {
            '200': {
              description:
                '« chat.completion », ou flux SSE de « chat.completion.chunk » terminé par « [DONE] ».',
            },
            '409': errorResponse(
              'Plusieurs agents publiés portent ce nom (agent_name_ambiguous) : utilisez « agent:<identifiant> ».'
            ),
            ...callRefusals,
          },
        },
      },
      '/embeddings': {
        post: {
          summary: 'Calculer des vecteurs (embeddings)',
          requestBody: jsonBody('Corps OpenAI « embeddings » : model, input.'),
          responses: { '200': { description: 'Vecteurs au format OpenAI.' }, ...callRefusals },
        },
      },
      '/audio/transcriptions': {
        post: {
          summary: 'Transcrire un fichier audio',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file', 'model'],
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    model: { type: 'string' },
                    language: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Transcription au format OpenAI.' },
            ...callRefusals,
          },
        },
      },
    },
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Message en français.' },
                type: { type: 'string' },
                code: { type: 'string' },
                param: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
  }
}
