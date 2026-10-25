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
      '/audio/speech': {
        post: {
          summary: 'Lire un texte à voix haute (synthèse vocale)',
          requestBody: jsonBody(
            'Corps OpenAI « audio.speech » : model (un modèle de synthèse vocale), input (4 096 caractères au plus), voice, response_format (mp3, wav, flac, pcm), speed.'
          ),
          responses: {
            '200': { description: 'Le fichier audio, avec son type (audio/mpeg, audio/wav…).' },
            ...callRefusals,
          },
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
      '/files': {
        post: {
          summary: 'Envoyer un fichier JSONL pour un lot (purpose « batch »)',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file', 'purpose'],
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    purpose: { type: 'string', enum: ['batch'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'L’objet « file » (id « file-… »).' },
            '400': errorResponse('Fichier ou purpose absent, ou purpose autre que « batch ».'),
            '413': errorResponse('Fichier de plus de 25 Mo (file_too_large).'),
            ...refusals,
          },
        },
        get: {
          summary: 'Lister les fichiers de l’espace de la clé (les plus récents d’abord)',
          parameters: [
            { name: 'purpose', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { name: 'after', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Liste au format OpenAI.' }, ...refusals },
        },
      },
      '/files/{file_id}': {
        get: {
          summary: 'Lire les informations d’un fichier',
          parameters: [{ name: 'file_id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'L’objet « file ».' },
            '404': errorResponse('Fichier introuvable pour cette clé (file_not_found).'),
            ...refusals,
          },
        },
        delete: {
          summary: 'Supprimer un fichier',
          parameters: [{ name: 'file_id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: '« deleted »: true.' },
            '404': errorResponse('Fichier introuvable pour cette clé (file_not_found).'),
            ...refusals,
          },
        },
      },
      '/files/{file_id}/content': {
        get: {
          summary:
            'Télécharger un fichier : le JSONL envoyé, ou la sortie ou les erreurs d’un lot (une ligne par requête)',
          parameters: [{ name: 'file_id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Le JSONL, en flux.' },
            '404': errorResponse('Fichier introuvable pour cette clé (file_not_found).'),
            ...refusals,
          },
        },
      },
      '/batches': {
        post: {
          summary:
            'Créer un lot : les requêtes d’un fichier JSONL, exécutées en arrière-plan à priorité basse, un seul modèle par lot',
          description:
            'Un lot a un seul modèle (« body.model » identique sur toutes les lignes) et un seul point d’accès (/v1/chat/completions ou /v1/embeddings). Il s’efface devant les requêtes interactives, reprend après un redémarrage du serveur et expire après « completion_window » (24h par défaut, de 1h à 168h ou de 1d à 7d). 10 000 lignes au plus par lot. Un fichier invalide donne un lot au statut « failed » dont « errors » indique les lignes à corriger.',
          requestBody: jsonBody(
            'input_file_id (fichier de purpose « batch »), endpoint, completion_window (24h par défaut), metadata (16 clés de texte au plus).'
          ),
          responses: {
            '200': { description: 'L’objet « batch » (statut « in_progress » ou « failed »).' },
            '400': errorResponse('Point d’accès, fenêtre ou métadonnées invalides.'),
            '403': errorResponse('Modèle non autorisé pour cette clé (model_not_allowed).'),
            '404': errorResponse(
              'Fichier ou modèle introuvable (file_not_found, model_not_found).'
            ),
            ...refusals,
            '429': errorResponse(
              'Débit de la clé dépassé, plafond mensuel atteint, ou trop de requêtes en attente (batch_queue_full).'
            ),
          },
        },
        get: {
          summary: 'Lister les lots de l’espace de la clé (les plus récents d’abord)',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { name: 'after', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Liste au format OpenAI.' }, ...refusals },
        },
      },
      '/batches/{batch_id}': {
        get: {
          summary: 'Lire un lot : statut, compteurs, fichiers de sortie et d’erreurs',
          parameters: [
            { name: 'batch_id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'L’objet « batch ».' },
            '404': errorResponse('Lot introuvable pour cette clé (batch_not_found).'),
            ...refusals,
          },
        },
      },
      '/batches/{batch_id}/cancel': {
        post: {
          summary: 'Annuler un lot en cours (statut « cancelling », puis « cancelled »)',
          parameters: [
            { name: 'batch_id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'L’objet « batch ».' },
            '404': errorResponse('Lot introuvable pour cette clé (batch_not_found).'),
            '409': errorResponse('Le lot est déjà terminé (batch_not_cancellable).'),
            ...refusals,
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
