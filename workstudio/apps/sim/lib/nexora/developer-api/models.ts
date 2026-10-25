import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { SSE_HEADERS } from '@/lib/core/utils/sse'
import { agentModelIds, listApiAgents } from '@/lib/nexora/developer-api/agents'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import {
  admitModel,
  type GatewayCall,
  reserveSpending,
  type SpendingReservation,
} from '@/lib/nexora/developer-api/gateway'
import { keyModelConfig } from '@/lib/nexora/developer-api/key-model-policy'
import { keyModelRefusal } from '@/lib/nexora/developer-api/model-gate'
import { agentRefusal, estimateCallTokens, modelRefusal } from '@/lib/nexora/developer-api/policy'
import { type RelayedText, relayWithUsage } from '@/lib/nexora/developer-api/sse'
import {
  callUpstream,
  listUpstreamModels,
  routerResolver,
  upstreamError,
} from '@/lib/nexora/developer-api/upstream'
import { readMessageReasoning } from '@/lib/nexora/reasoning'
import { beginCallTrace } from '@/lib/nexora/traces/call'
import { MAX_SPEECH_CHARACTERS } from '@/lib/nexora/voice/client'

const OWNED_BY_AGENT = 'nexora-agent'

function arrayFirst(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined
}

function tokens(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/** The models (and, for a workspace key, the published agents) this key may call. */
export async function listGatewayModels(call: GatewayCall) {
  const [models, resolve, config] = await Promise.all([
    listUpstreamModels(),
    routerResolver(),
    keyModelConfig(call.key),
  ])
  const allowed = models.filter(
    (model) =>
      keyModelRefusal(config, model.id, resolve) === null &&
      (modelRefusal(call.key, model.id, resolve) === null ||
        model.aliases.some((alias) => modelRefusal(call.key, alias, resolve) === null))
  )
  const data: Record<string, unknown>[] = allowed.map((model) => ({
    ...model,
    object: 'model',
    owned_by: typeof model.owned_by === 'string' ? model.owned_by : 'nexora',
  }))
  if (call.key.workspaceId && agentRefusal(call.key) === null) {
    const agents = await listApiAgents(call.key.workspaceId)
    const ids = agentModelIds(agents)
    for (const agent of agents) {
      data.push({
        id: ids.get(agent.workflowId),
        object: 'model',
        created: Math.floor(agent.createdAt.getTime() / 1000),
        owned_by: OWNED_BY_AGENT,
        name: agent.name,
        description: agent.description,
        aliases: [],
      })
    }
  }
  return { object: 'list', data }
}

/** One model (or agent) by id or alias, when the key may call it. */
export async function retrieveGatewayModel(call: GatewayCall, id: string) {
  const { data } = await listGatewayModels(call)
  const wanted = id.trim().toLowerCase()
  const model = data.find(
    (entry) =>
      (typeof entry.id === 'string' && entry.id.toLowerCase() === wanted) ||
      (Array.isArray(entry.aliases) &&
        entry.aliases.some((alias) => typeof alias === 'string' && alias.toLowerCase() === wanted))
  )
  if (!model) throw gatewayErrors.modelNotFound(id)
  return model
}

/** Calls Nexora API for an admitted call; a call that never got an answer releases its reservation. */
async function callReserved(
  reservation: SpendingReservation,
  model: string,
  ...args: Parameters<typeof callUpstream>
): Promise<Response> {
  let upstream: Response
  try {
    upstream = await callUpstream(...args)
  } catch (error) {
    await reservation.release()
    throw error
  }
  if (!upstream.ok) {
    await reservation.release()
    throw await upstreamError(upstream, model)
  }
  return upstream
}

/** Relays a chat completion to Nexora API (streamed or not) and records its tokens on the key. */
export async function relayChatCompletion(
  call: GatewayCall,
  body: Record<string, unknown> & { model: string; stream?: boolean },
  signal: AbortSignal
): Promise<Response> {
  const usageModel = await admitModel(call.key, body.model)
  const reservation = await reserveSpending(
    call.key,
    usageModel,
    estimateCallTokens(
      JSON.stringify(body.messages ?? '').length,
      body.max_completion_tokens ?? body.max_tokens
    )
  )
  const trace = beginCallTrace(
    {
      source: 'api_key',
      workspaceId: call.key.workspaceId,
      userId: null,
      apiKeyId: call.key.id,
      name: `API · ${call.key.name}`,
    },
    body.model,
    body.messages
  )
  let upstream: Response
  try {
    upstream = await callReserved(reservation, body.model, '/chat/completions', {
      method: 'POST',
      body: JSON.stringify(body),
      contentType: 'application/json',
      signal,
    })
  } catch (error) {
    trace.finish({
      answer: null,
      usage: null,
      error: getErrorMessage(error, 'Appel refusé par le modèle'),
    })
    throw error
  }

  if (body.stream && upstream.body) {
    const captured: RelayedText = { answer: '', reasoning: '' }
    const relayed = relayWithUsage(
      upstream.body,
      (usage) => {
        void reservation.settle({
          // A stream cut short tells no prompt size: the estimate stands for it.
          promptTokens: usage.estimated ? reservation.estimate.promptTokens : usage.promptTokens,
          completionTokens: usage.completionTokens,
        })
        trace.finish({
          answer: captured.answer || null,
          reasoning: captured.reasoning || null,
          usage: usage.estimated
            ? null
            : { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens },
          error: null,
          interrupted: usage.estimated,
        })
      },
      captured
    )
    return new Response(relayed, { status: 200, headers: { ...SSE_HEADERS, ...call.headers } })
  }

  const completion: unknown = await upstream.json().catch(async (error: unknown) => {
    await reservation.settle(reservation.estimate)
    trace.finish({ answer: null, usage: null, error: 'Réponse du modèle illisible' })
    throw error
  })
  const usage = toRecord(toRecord(completion).usage)
  const reading = readMessageReasoning(
    toRecord(toRecord(arrayFirst(toRecord(completion).choices)).message)
  )
  await reservation.settle({
    promptTokens: tokens(usage.prompt_tokens),
    completionTokens: tokens(usage.completion_tokens),
  })
  trace.finish({
    answer: reading.content || null,
    reasoning: reading.reasoning || null,
    usage: {
      promptTokens: tokens(usage.prompt_tokens),
      completionTokens: tokens(usage.completion_tokens),
    },
    error: null,
  })
  return Response.json(completion, { headers: call.headers })
}

function embeddingInputCharacters(input: unknown): number {
  if (typeof input === 'string') return input.length
  if (!Array.isArray(input)) return 0
  return input.reduce<number>(
    (total, entry) =>
      total + (typeof entry === 'string' ? entry.length : Array.isArray(entry) ? entry.length : 1),
    0
  )
}

/** Relays an embeddings request and records its tokens on the key, under the router's name. */
export async function relayEmbeddings(
  call: GatewayCall,
  body: Record<string, unknown> & { model: string },
  signal: AbortSignal
): Promise<Response> {
  const usageModel = await admitModel(call.key, body.model)
  const reservation = await reserveSpending(
    call.key,
    usageModel,
    estimateCallTokens(embeddingInputCharacters(body.input), 0, { answers: false })
  )
  const upstream = await callReserved(reservation, body.model, '/embeddings', {
    method: 'POST',
    body: JSON.stringify(body),
    contentType: 'application/json',
    signal,
  })
  const result: unknown = await upstream.json().catch(async (error: unknown) => {
    await reservation.settle(reservation.estimate)
    throw error
  })
  const usage = toRecord(toRecord(result).usage)
  await reservation.settle({
    promptTokens: tokens(usage.prompt_tokens ?? usage.total_tokens),
    completionTokens: 0,
  })
  return Response.json(result, { headers: call.headers })
}

/**
 * Relays a speech synthesis (`/v1/audio/speech`, JSON in, audio out) and records the call on the
 * key: the characters of the text count as its prompt, the audio has no tokens.
 */
export async function relaySpeech(
  call: GatewayCall,
  body: Record<string, unknown> & { model: string; input: string },
  signal: AbortSignal
): Promise<Response> {
  if (body.input.length > MAX_SPEECH_CHARACTERS) {
    throw gatewayErrors.invalidRequest(
      `Le texte à lire fait ${body.input.length} caractères ; l’API en accepte 4 096 au plus (champ « input »).`
    )
  }
  const usageModel = await admitModel(call.key, body.model)
  const estimate = estimateCallTokens(body.input.length, 0, { answers: false })
  const reservation = await reserveSpending(call.key, usageModel, estimate)
  const upstream = await callReserved(reservation, body.model, '/audio/speech', {
    method: 'POST',
    body: JSON.stringify(body),
    contentType: 'application/json',
    signal,
  })
  await reservation.settle(estimate)
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
      ...call.headers,
    },
  })
}

/** Relays an audio transcription (multipart) and records the call on the key. */
export async function relayTranscription(
  call: GatewayCall,
  form: FormData,
  signal: AbortSignal
): Promise<Response> {
  const model = form.get('model')
  if (typeof model !== 'string' || !model.trim()) {
    throw gatewayErrors.invalidRequest('Indiquez le modèle de transcription (champ « model »).')
  }
  const usageModel = await admitModel(call.key, model)
  const reservation = await reserveSpending(call.key, usageModel, {
    promptTokens: 0,
    completionTokens: 0,
  })
  const upstream = await callReserved(reservation, model, '/audio/transcriptions', {
    method: 'POST',
    body: form,
    signal,
  })
  await reservation.settle({ promptTokens: 0, completionTokens: 0 })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      ...call.headers,
    },
  })
}
