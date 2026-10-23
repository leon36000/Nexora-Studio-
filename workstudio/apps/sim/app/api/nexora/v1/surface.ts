import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { NextResponse } from 'next/server'
import { getValidationErrorMessage, type ParseRequestOptions } from '@/lib/api/server'
import {
  GatewayError,
  gatewayErrorResponse,
  gatewayErrors,
  openAiErrorBody,
} from '@/lib/nexora/developer-api/errors'

const logger = createLogger('NexoraDeveloperApiRoutes')

/** A chat request can carry long conversations; the proxy clamps anything above its own limit. */
const MAX_JSON_BODY_BYTES = 20 * 1024 * 1024

function openAiJson(error: GatewayError) {
  return NextResponse.json(openAiErrorBody(error), { status: error.status })
}

/** Validation failures in OpenAI's error shape, so official clients raise `BadRequestError`. */
export const gatewayParseOptions: ParseRequestOptions = {
  maxBodyBytes: MAX_JSON_BODY_BYTES,
  validationErrorResponse: (error) =>
    openAiJson(gatewayErrors.invalidRequest(getValidationErrorMessage(error, 'Requête invalide.'))),
  invalidJsonResponse: () =>
    openAiJson(gatewayErrors.invalidRequest('Le corps de la requête n’est pas un JSON valide.')),
  payloadTooLargeResponse: () =>
    openAiJson(new GatewayError(413, 'request_too_large', 'Requête trop volumineuse.')),
}

/**
 * Runs a developer API handler: a refusal becomes its OpenAI-shaped answer (French message, status,
 * rate-limit headers); anything unexpected a 500 in the same shape, logged without the key.
 */
export async function answerGateway(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof GatewayError) return gatewayErrorResponse(error)
    logger.error('Developer API call failed', { error: getErrorMessage(error) })
    return gatewayErrorResponse(
      new GatewayError(
        500,
        'internal_error',
        'Erreur interne de l’instance. Réessayez ; si cela dure, prévenez l’administrateur.'
      )
    )
  }
}
