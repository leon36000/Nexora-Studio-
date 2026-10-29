import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { type NextRequest, NextResponse } from 'next/server'
import {
  providerModelsResponseSchema,
  vllmUpstreamResponseSchema,
} from '@/lib/api/contracts/providers'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/core/config/env'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { resolveGatewayAccess } from '@/lib/nexora/gateway-access'
import { nexoraGatewayUrl } from '@/lib/nexora/gateway-url'
import { DEFAULT_MODEL_ALIAS, listedModelIds } from '@/lib/nexora/model-ids'
import { getOpenAICompatibleApiBaseUrl } from '@/providers/openai-compat/base-url'
import { filterBlacklistedModels, isProviderBlacklisted } from '@/providers/utils'

const logger = createLogger('VLLMModelsAPI')

interface ModelListTarget {
  baseUrl: string | undefined
  apiKey: string | undefined
  /** The list is the signed-in person's own at the site's gateway. */
  viaGateway: boolean
}

/**
 * Nexora edition: with the site's gateway, the models are those of the signed-in person's own key
 * (`null`: nobody signed in, or the gateway cannot say who pays; the instance's list is not shown
 * in its place). An operator account that never used the site keeps the instance's Nexora API.
 */
async function modelListTarget(): Promise<ModelListTarget | null> {
  const instance = {
    baseUrl: env.VLLM_BASE_URL?.trim(),
    apiKey: env.VLLM_API_KEY,
    viaGateway: false,
  }
  if (!nexoraGatewayUrl()) return instance
  const userId = (await getSession())?.user?.id
  if (!userId) return null
  try {
    const access = await resolveGatewayAccess({ userId })
    return access ? { baseUrl: access.baseUrl, apiKey: access.apiKey, viaGateway: true } : instance
  } catch (error) {
    logger.warn('Gateway access unavailable for the model list', {
      error: getErrorMessage(error, 'Unknown error'),
    })
    return null
  }
}

/**
 * Get available vLLM models
 */
export const GET = withRouteHandler(async (_request: NextRequest) => {
  if (isProviderBlacklisted('vllm')) {
    logger.info('vLLM provider is blacklisted, returning empty models')
    return NextResponse.json({ models: [] })
  }

  const target = await modelListTarget()
  if (!target) return NextResponse.json({ models: [] })
  const baseUrl = target.baseUrl

  if (!baseUrl) {
    logger.info('VLLM_BASE_URL not configured')
    return NextResponse.json({ models: [] })
  }

  try {
    const apiBaseUrl = getOpenAICompatibleApiBaseUrl(baseUrl)
    logger.info('Fetching vLLM models', {
      baseUrl,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (target.apiKey) {
      headers.Authorization = `Bearer ${target.apiKey}`
    }

    const response = await fetch(`${apiBaseUrl}/models`, {
      headers,
      // Nexora edition: models are added and the default changes in Réglages › Modèles.
      cache: 'no-store',
    })

    if (!response.ok) {
      logger.warn('vLLM service is not available', {
        status: response.status,
        statusText: response.statusText,
      })
      return NextResponse.json({ models: [] })
    }

    const data = vllmUpstreamResponseSchema.parse(await response.json())
    const defaultAlias = `vllm/${DEFAULT_MODEL_ALIAS}`
    const listed = listedModelIds(data.data)
    // The gateway does not know the alias: each person's default model answers to it.
    const allModels = target.viaGateway
      ? [defaultAlias, ...listed.filter((model) => model !== defaultAlias)]
      : listed
    const models = filterBlacklistedModels(allModels)

    logger.info('Successfully fetched vLLM models', {
      count: models.length,
      filtered: allModels.length - models.length,
      models,
    })

    return NextResponse.json(providerModelsResponseSchema.parse({ models }))
  } catch (error) {
    logger.error('Failed to fetch vLLM models', {
      error: getErrorMessage(error, 'Unknown error'),
      baseUrl,
    })

    return NextResponse.json({ models: [] })
  }
})
