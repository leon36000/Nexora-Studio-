import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { generateRandomHex } from '@sim/utils/random'
import { escapeRegExp, truncate } from '@sim/utils/string'
import type { StoredSpanRow, StoredTrace } from '@/lib/nexora/traces/stored'

const logger = createLogger('NexoraTraceExport')

const EXPORT_TIMEOUT_MS = 5000
const MAX_ERROR_LENGTH = 200
const SERVICE_NAME = 'nexora-workstudio'

interface ExportTarget {
  endpoint: string
  headers: { name: string; value: string }[]
}

type AnyValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean }

interface KeyValue {
  key: string
  value: AnyValue
}

interface OtlpSpan {
  traceId: string
  spanId: string
  parentSpanId: string
  name: string
  kind: number
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: KeyValue[]
  status: { code: number; message?: string }
}

export interface OtlpTracesPayload {
  resourceSpans: {
    resource: { attributes: KeyValue[] }
    scopeSpans: { scope: { name: string }; spans: OtlpSpan[] }[]
  }[]
}

export interface ExportResult {
  ok: boolean
  status?: number
  error?: string
}

const SPAN_KIND_INTERNAL = 1
const SPAN_KIND_CLIENT = 3
const STATUS_OK = 1
const STATUS_ERROR = 2

function text(key: string, value: string | null | undefined): KeyValue[] {
  return value ? [{ key, value: { stringValue: value } }] : []
}

function whole(key: string, value: number): KeyValue {
  return { key, value: { intValue: String(Math.round(value)) } }
}

function nanos(date: Date): string {
  return (BigInt(date.getTime()) * 1_000_000n).toString()
}

function spanAttributes(span: StoredSpanRow, trace: StoredTrace['trace']): KeyValue[] {
  const attributes: KeyValue[] = [...text('nexora.span.kind', span.kind)]
  if (span.kind === 'model') {
    attributes.push(
      { key: 'gen_ai.operation.name', value: { stringValue: 'chat' } },
      whole('gen_ai.usage.input_tokens', span.inputTokens ?? 0),
      whole('gen_ai.usage.output_tokens', span.outputTokens ?? 0),
      ...text('gen_ai.request.model', span.model)
    )
  } else if (span.kind === 'tool' || span.kind === 'knowledge') {
    attributes.push(
      { key: 'gen_ai.operation.name', value: { stringValue: 'execute_tool' } },
      ...text('gen_ai.tool.name', span.name)
    )
  }
  attributes.push(...text('input.value', span.input), ...text('output.value', span.output))
  // The root span carries the whole trace's footprint, the others their own.
  const kgCo2eq = span.position === 0 ? trace.kgCo2eq : span.kgCo2eq
  if (typeof kgCo2eq === 'number') {
    attributes.push({ key: 'nexora.kg_co2eq', value: { doubleValue: kgCo2eq } })
  }
  if (span.position === 0) {
    attributes.push(
      ...text('nexora.source', trace.source),
      ...text('nexora.workspace_id', trace.workspaceId),
      ...text('nexora.agent', trace.agentName)
    )
  }
  return attributes
}

function spanName(span: StoredSpanRow): string {
  if (span.kind === 'model') return `chat ${span.model ?? span.name}`
  if (span.kind === 'tool' || span.kind === 'knowledge') return `execute_tool ${span.name}`
  return span.name
}

/** One stored trace as an OTLP/HTTP JSON export request (OpenTelemetry GenAI conventions + `input.value`/`output.value`). */
export function buildOtlpPayload({ trace, spans }: StoredTrace): OtlpTracesPayload {
  return {
    resourceSpans: [
      {
        resource: { attributes: text('service.name', SERVICE_NAME) },
        scopeSpans: [
          {
            scope: { name: 'nexora.traces' },
            spans: spans.map((span) => ({
              traceId: span.traceId,
              spanId: span.id,
              parentSpanId: span.parentId ?? '',
              name: spanName(span),
              kind: span.kind === 'model' ? SPAN_KIND_CLIENT : SPAN_KIND_INTERNAL,
              startTimeUnixNano: nanos(span.startedAt),
              endTimeUnixNano: nanos(new Date(span.startedAt.getTime() + span.durationMs)),
              attributes: spanAttributes(span, trace),
              status: { code: span.status === 'error' ? STATUS_ERROR : STATUS_OK },
            })),
          },
        ],
      },
    ],
  }
}

let lastStatus: { at: string; ok: boolean; error?: string } | null = null

/** The outcome of the latest export in this process (no header value ever). */
export function lastExportStatus(): { at: string; ok: boolean; error?: string } | null {
  return lastStatus
}

function scrub(message: string, target: ExportTarget): string {
  let clean = message
  for (const { value } of target.headers) {
    if (value) clean = clean.replace(new RegExp(escapeRegExp(value), 'g'), '***')
  }
  return truncate(clean, MAX_ERROR_LENGTH)
}

async function post(
  target: ExportTarget,
  body: string,
  fetchFn: typeof fetch
): Promise<ExportResult & { retry: boolean }> {
  try {
    // boundary-raw-fetch: the OTLP collector is an external service chosen by the administrator
    const response = await fetchFn(target.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(target.headers.map(({ name, value }) => [name, value])),
      },
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
    })
    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status} : redirection refusée, les en-têtes d’autorisation ne sont jamais renvoyés vers une autre adresse. Réglez l’adresse finale du collecteur.`,
        retry: false,
      }
    }
    if (response.ok) return { ok: true, status: response.status, retry: false }
    const detail = await response.text().catch(() => '')
    return {
      ok: false,
      status: response.status,
      error: scrub(`HTTP ${response.status} ${detail}`.trim(), target),
      retry: response.status >= 500 || response.status === 429,
    }
  } catch (error) {
    return {
      ok: false,
      error: scrub(getErrorMessage(error, 'request failed'), target),
      retry: true,
    }
  }
}

/**
 * Sends one trace to the collector. One more try on a network failure, a 5xx or a 429; never
 * throws (the trace stays in PostgreSQL either way). The latest outcome is kept for the screen.
 */
export async function exportTrace(
  target: ExportTarget,
  stored: StoredTrace,
  fetchFn: typeof fetch = fetch
): Promise<ExportResult> {
  const body = JSON.stringify(buildOtlpPayload(stored))
  let outcome = await post(target, body, fetchFn)
  if (!outcome.ok && outcome.retry) outcome = await post(target, body, fetchFn)
  const { retry: _retry, ...result } = outcome
  lastStatus = {
    at: new Date().toISOString(),
    ok: result.ok,
    ...(result.error ? { error: result.error } : {}),
  }
  if (!result.ok) logger.warn('Trace export failed', { status: result.status, error: result.error })
  return result
}

/** The « Test the export » button: one small span sent to the collector as set on the screen. */
export async function sendTestSpan(
  target: ExportTarget & { enabled?: boolean },
  fetchFn: typeof fetch = fetch
): Promise<ExportResult> {
  if (!target.endpoint) return { ok: false, error: 'Aucune adresse de collecteur.' }
  const traceId = generateRandomHex(32)
  const now = new Date()
  return exportTrace(
    target,
    {
      trace: {
        id: traceId,
        source: 'workflow',
        name: 'nexora.test',
        status: 'ok',
        startedAt: now,
        durationMs: 1,
      },
      spans: [
        {
          traceId,
          id: generateRandomHex(16),
          parentId: null,
          position: 0,
          kind: 'step',
          name: 'nexora.test',
          startedAt: now,
          durationMs: 1,
          status: 'ok',
          attributes: {},
        },
      ],
    },
    fetchFn
  )
}
