/**
 * Errors of the OpenAI-compatible developer API, in OpenAI's wire shape
 * (`{ error: { message, type, code, param } }`) so official clients raise the matching exception
 * (`AuthenticationError` on 401, `PermissionDeniedError` on 403, `RateLimitError` on 429…), with
 * messages in French: the person reading them administers a French SME's instance.
 */
export class GatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly type: string = typeForStatus(status),
    readonly headers: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'GatewayError'
  }
}

function typeForStatus(status: number): string {
  if (status === 401) return 'authentication_error'
  if (status === 403) return 'permission_error'
  if (status === 404) return 'not_found_error'
  if (status === 429) return 'rate_limit_error'
  if (status >= 500) return 'api_error'
  return 'invalid_request_error'
}

/** The body an OpenAI client parses. */
export function openAiErrorBody(error: GatewayError) {
  return { error: { message: error.message, type: error.type, code: error.code, param: null } }
}

/** The JSON response of a refused or failed call. */
export function gatewayErrorResponse(error: GatewayError): Response {
  return Response.json(openAiErrorBody(error), {
    status: error.status,
    headers: error.headers,
  })
}

const MANAGE_KEYS = 'Réglages › Clés API'

function frenchDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone }).format(date)
}

const frenchNumber = new Intl.NumberFormat('fr-FR')

/** Every refusal the gateway can answer, with its status, code and French message. */
export const gatewayErrors = {
  invalidKey: () =>
    new GatewayError(
      401,
      'invalid_api_key',
      `Clé d’API invalide. Créez une clé dans ${MANAGE_KEYS} et envoyez-la dans l’en-tête « Authorization: Bearer <clé> ».`
    ),
  expiredKey: (expiresAt: Date, timeZone: string) =>
    new GatewayError(
      401,
      'expired_api_key',
      `Clé d’API expirée le ${frenchDate(expiresAt, timeZone)}. Créez-en une nouvelle dans ${MANAGE_KEYS}.`
    ),
  revokedKey: () =>
    new GatewayError(
      401,
      'revoked_api_key',
      `Clé d’API révoquée : elle ne donne plus accès à l’instance. Créez-en une nouvelle dans ${MANAGE_KEYS}.`
    ),
  modelNotAllowed: (model: string, allowed: readonly string[]) =>
    new GatewayError(
      403,
      'model_not_allowed',
      allowed.length > 0
        ? `Le modèle « ${model} » n’est pas autorisé pour cette clé. Modèles autorisés : ${allowed.join(', ')}.`
        : `Le modèle « ${model} » n’est pas autorisé pour cette clé.`
    ),
  agentsNotAllowed: (model: string) =>
    new GatewayError(
      403,
      'model_not_allowed',
      `Les agents ne sont pas autorisés pour cette clé (« ${model} »). Un administrateur peut créer une clé qui les autorise dans ${MANAGE_KEYS}.`
    ),
  agentNeedsWorkspaceKey: () =>
    new GatewayError(
      403,
      'agent_needs_workspace_key',
      'Les agents ne sont appelables qu’avec une clé d’espace : une clé d’instance n’appelle que les modèles.'
    ),
  monthlyCapReached: (cap: number) =>
    new GatewayError(
      429,
      'monthly_cap_reached',
      `Plafond mensuel de la clé atteint (${frenchNumber.format(cap)} jetons). Il se renouvelle le 1er du mois ; un administrateur peut créer une clé au plafond plus élevé.`,
      'insufficient_quota'
    ),
  rateLimited: (requestsPerMinute: number, retryAfterSeconds: number) =>
    new GatewayError(
      429,
      'rate_limit_exceeded',
      `Trop de requêtes : cette clé est limitée à ${requestsPerMinute} requêtes par minute. Réessayez dans ${retryAfterSeconds} s.`,
      'rate_limit_error',
      { 'Retry-After': String(retryAfterSeconds) }
    ),
  budgetReached: (message: string) =>
    new GatewayError(402, 'monthly_budget_reached', message, 'insufficient_quota'),
  agentNotFound: (reference: string) =>
    new GatewayError(
      404,
      'model_not_found',
      `Aucun agent publié « ${reference} » dans l’espace de cette clé. Publiez l’agent, ou utilisez « agent:<identifiant> ».`
    ),
  agentAmbiguous: (reference: string) =>
    new GatewayError(
      409,
      'agent_name_ambiguous',
      `Plusieurs agents publiés s’appellent « ${reference} » : utilisez « agent:<identifiant> » (affiché par le bouton « Code » de l’agent).`
    ),
  modelNotFound: (model: string) =>
    new GatewayError(404, 'model_not_found', `Modèle « ${model} » introuvable sur cette instance.`),
  invalidRequest: (message: string, code = 'invalid_request') =>
    new GatewayError(400, code, message),
  notFound: (path: string) =>
    new GatewayError(
      404,
      'unknown_endpoint',
      `Point d’accès inconnu : ${path}. Points d’accès disponibles : /v1/models, /v1/chat/completions, /v1/embeddings, /v1/audio/transcriptions.`
    ),
  unavailable: () =>
    new GatewayError(
      503,
      'service_unavailable',
      'Le service de modèles de l’instance (Nexora API) ne répond pas. Réessayez dans un instant ; si cela dure, prévenez l’administrateur.'
    ),
}
