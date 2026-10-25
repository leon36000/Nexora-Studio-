import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import type { ItemOutcome } from '@/lib/nexora/batches/engine'
import type { BatchRecord, ItemRecord } from '@/lib/nexora/batches/repository'
import { type BatchEndpoint, UPSTREAM_PATH } from '@/lib/nexora/batches/types'
import { GatewayError } from '@/lib/nexora/developer-api/errors'
import type { SpendingReservation } from '@/lib/nexora/developer-api/gateway'
import {
  authenticationRefusal,
  embeddingInputCharacters,
  estimateCallTokens,
  type GatewayKey,
} from '@/lib/nexora/developer-api/policy'
import { upstreamError } from '@/lib/nexora/developer-api/upstream'
import { readMessageReasoning } from '@/lib/nexora/reasoning'
import type { CallTrace, CallTraceContext } from '@/lib/nexora/traces/call'

/** What the executor needs from the gateway (injected: the real ones are in `live.ts`). */
export interface ApiExecutorDeps {
  now: () => Date
  loadKey: (keyId: string) => Promise<GatewayKey | null>
  admitModel: (key: GatewayKey, model: string) => Promise<string>
  reserveSpending: (
    key: GatewayKey,
    model: string,
    estimate: { promptTokens: number; completionTokens: number }
  ) => Promise<SpendingReservation>
  callUpstream: (
    path: string,
    init: { method: 'POST'; body: string; contentType: string; signal: AbortSignal }
  ) => Promise<Response>
  beginTrace: (context: CallTraceContext, model: string, messages: unknown) => CallTrace
}

function tokens(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function refusal(error: GatewayError): ItemOutcome {
  return {
    kind: 'error',
    retryable: false,
    problem: { code: error.code, message: error.message, status: error.status },
    response: null,
    latencyMs: null,
  }
}

function requestId(item: ItemRecord): string {
  return `req_${item.id}`
}

/**
 * Runs one request of an API batch the way the gateway runs a call made with the key: the key
 * is read again (revoked, expired or deleted ⇒ no call), the model and the monthly cap and budget
 * are checked, the call goes to Nexora API without streaming, the key's usage is settled with the
 * real tokens and the call is traced. A busy model or an unreachable service is tried again; a
 * refusal of the model is kept as the request's response in the error file.
 */
export async function executeApiItem(
  batch: BatchRecord,
  item: ItemRecord,
  signal: AbortSignal,
  deps: ApiExecutorDeps
): Promise<ItemOutcome> {
  const key = batch.apiKeyId ? await deps.loadKey(batch.apiKeyId) : null
  if (!key) {
    return refusal(
      new GatewayError(
        401,
        'revoked_api_key',
        'La clé d’API de ce lot a été supprimée : le lot ne peut plus s’exécuter.'
      )
    )
  }
  const keyRefusal = authenticationRefusal(key, deps.now())
  if (keyRefusal) return refusal(keyRefusal)

  const endpoint = batch.endpoint as BatchEndpoint
  const body = item.request
  const model = typeof body.model === 'string' ? body.model : batch.model
  const isChat = endpoint === '/v1/chat/completions'

  let reservation: SpendingReservation
  try {
    const usageModel = await deps.admitModel(key, model)
    reservation = await deps.reserveSpending(
      key,
      usageModel,
      isChat
        ? estimateCallTokens(
            JSON.stringify(body.messages ?? '').length,
            body.max_completion_tokens ?? body.max_tokens
          )
        : estimateCallTokens(embeddingInputCharacters(body.input), 0, { answers: false })
    )
  } catch (error) {
    if (error instanceof GatewayError) return refusal(error)
    throw error
  }

  const trace = deps.beginTrace(
    {
      source: 'api_key',
      workspaceId: key.workspaceId,
      userId: null,
      apiKeyId: key.id,
      name: `API · lot · ${key.name}`,
    },
    model,
    isChat ? body.messages : body.input
  )
  const startedAt = deps.now().getTime()
  const elapsed = () => Math.max(0, deps.now().getTime() - startedAt)

  let upstream: Response
  try {
    upstream = await deps.callUpstream(UPSTREAM_PATH[endpoint], {
      method: 'POST',
      body: JSON.stringify({ ...body, stream: false }),
      contentType: 'application/json',
      signal,
    })
  } catch (error) {
    await reservation.release()
    if (signal.aborted) {
      trace.finish({ answer: null, usage: null, error: 'Lot interrompu', interrupted: true })
      return { kind: 'aborted' }
    }
    const problem =
      error instanceof GatewayError
        ? { code: error.code, message: error.message, status: error.status }
        : { code: 'upstream_error', message: getErrorMessage(error, 'Nexora API est injoignable.') }
    trace.finish({ answer: null, usage: null, error: problem.message })
    return { kind: 'error', retryable: true, problem, response: null, latencyMs: elapsed() }
  }

  if (!upstream.ok) {
    await reservation.release()
    const text = await upstream.text().catch(() => '')
    const failure = await upstreamError(
      new Response(text, { status: upstream.status, headers: upstream.headers }),
      model
    )
    trace.finish({ answer: null, usage: null, error: failure.message })
    let parsedBody: unknown = null
    try {
      parsedBody = JSON.parse(text)
    } catch {
      parsedBody = { error: { message: text || `HTTP ${upstream.status}` } }
    }
    const transient = upstream.status === 429 || upstream.status >= 500
    return {
      kind: 'error',
      retryable: transient,
      problem: { code: failure.code, message: failure.message, status: upstream.status },
      response: transient
        ? null
        : { status_code: upstream.status, request_id: requestId(item), body: parsedBody },
      latencyMs: elapsed(),
    }
  }

  const completion: unknown = await upstream.json().catch(() => null)
  if (completion === null) {
    await reservation.settle(reservation.estimate)
    trace.finish({ answer: null, usage: null, error: 'Réponse du modèle illisible' })
    return {
      kind: 'error',
      retryable: true,
      problem: { code: 'upstream_error', message: 'La réponse du modèle est illisible.' },
      response: null,
      latencyMs: elapsed(),
    }
  }

  const usage = toRecord(toRecord(completion).usage)
  const promptTokens = tokens(usage.prompt_tokens ?? usage.total_tokens)
  const completionTokens = isChat ? tokens(usage.completion_tokens) : 0
  await reservation.settle({ promptTokens, completionTokens })
  const choices = toRecord(completion).choices
  const message = Array.isArray(choices) ? toRecord(toRecord(choices[0]).message) : {}
  const reading = isChat ? readMessageReasoning(message) : null
  trace.finish({
    answer: reading?.content || null,
    reasoning: reading?.reasoning || null,
    usage: { promptTokens, completionTokens },
    error: null,
  })
  return {
    kind: 'done',
    result: {
      response: { status_code: 200, request_id: requestId(item), body: completion },
      answer: null,
      promptTokens,
      completionTokens,
      latencyMs: elapsed(),
    },
  }
}
