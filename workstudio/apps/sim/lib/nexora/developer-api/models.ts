import { isRecordLike, toRecord } from '@sim/utils/object'
import { SSE_HEADERS } from '@/lib/core/utils/sse'
import { agentModelIds, listApiAgents } from '@/lib/nexora/developer-api/agents'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import {
  admitModel,
  admitSpending,
  type GatewayCall,
  recordUsage,
} from '@/lib/nexora/developer-api/gateway'
import { agentRefusal, modelRefusal } from '@/lib/nexora/developer-api/policy'
import { relayWithUsage } from '@/lib/nexora/developer-api/sse'
import {
  callUpstream,
  listUpstreamModels,
  routerResolver,
  upstreamError,
} from '@/lib/nexora/developer-api/upstream'

const OWNED_BY_AGENT = 'nexora-agent'

function tokens(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/** The models (and, for a workspace key, the published agents) this key may call. */
export async function listGatewayModels(call: GatewayCall) {
  const [models, resolve] = await Promise.all([listUpstreamModels(), routerResolver()])
  const allowed = models.filter(
    (model) =>
      modelRefusal(call.key, model.id, resolve) === null ||
      model.aliases.some((alias) => modelRefusal(call.key, alias, resolve) === null)
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

/** Relays a chat completion to Nexora API (streamed or not) and records its tokens on the key. */
export async function relayChatCompletion(
  call: GatewayCall,
  body: Record<string, unknown> & { model: string; stream?: boolean },
  signal: AbortSignal
): Promise<Response> {
  await admitModel(call.key, body.model)
  await admitSpending(call.key)
  const upstream = await callUpstream('/chat/completions', {
    method: 'POST',
    body: JSON.stringify(body),
    contentType: 'application/json',
    signal,
  })
  if (!upstream.ok) throw await upstreamError(upstream, body.model)

  if (body.stream && upstream.body) {
    const relayed = relayWithUsage(upstream.body, (usage) => {
      void recordUsage(
        call.key,
        usage.model ?? body.model,
        usage.promptTokens,
        usage.completionTokens
      )
    })
    return new Response(relayed, { status: 200, headers: { ...SSE_HEADERS, ...call.headers } })
  }

  const completion: unknown = await upstream.json()
  const usage = toRecord(toRecord(completion).usage)
  const model =
    isRecordLike(completion) && typeof completion.model === 'string' ? completion.model : body.model
  await recordUsage(call.key, model, tokens(usage.prompt_tokens), tokens(usage.completion_tokens))
  return Response.json(completion, { headers: call.headers })
}

/** Relays an embeddings request and records its tokens on the key. */
export async function relayEmbeddings(
  call: GatewayCall,
  body: Record<string, unknown> & { model: string },
  signal: AbortSignal
): Promise<Response> {
  await admitModel(call.key, body.model)
  await admitSpending(call.key)
  const upstream = await callUpstream('/embeddings', {
    method: 'POST',
    body: JSON.stringify(body),
    contentType: 'application/json',
    signal,
  })
  if (!upstream.ok) throw await upstreamError(upstream, body.model)
  const result: unknown = await upstream.json()
  const usage = toRecord(toRecord(result).usage)
  await recordUsage(call.key, body.model, tokens(usage.prompt_tokens ?? usage.total_tokens), 0)
  return Response.json(result, { headers: call.headers })
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
  await admitModel(call.key, model)
  await admitSpending(call.key)
  const upstream = await callUpstream('/audio/transcriptions', {
    method: 'POST',
    body: form,
    signal,
  })
  if (!upstream.ok) throw await upstreamError(upstream, model)
  await recordUsage(call.key, model, 0, 0)
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      ...call.headers,
    },
  })
}
