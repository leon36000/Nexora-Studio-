import { isRecordLike, toArray, toRecord } from '@sim/utils/object'
import type { AssistantWorkflowField } from '@/lib/api/contracts/nexora-assistant-extras'

/** Longest result text kept in the thread. */
const OUTPUT_MAX_CHARS = 100_000
const RESUME_PATH = /^\/api\/resume\/[\w-]{1,128}\/[\w-]{1,128}\/[\w-]{1,128}$/

type FieldError = 'required' | 'number' | 'json'

type RunInputResult =
  | { ok: true; input: Record<string, unknown> }
  | { ok: false; errors: Record<string, FieldError> }

/**
 * The input a run receives from the form: each field read as its type. A text left empty is left
 * out (the workflow sees no value), a switch is always true or false. Fields that are wrong are
 * reported by name so the form can mark them.
 */
export function buildRunInput(
  fields: AssistantWorkflowField[],
  values: Record<string, string | boolean | undefined>
): RunInputResult {
  const input: Record<string, unknown> = {}
  const errors: Record<string, FieldError> = {}
  for (const field of fields) {
    const raw = values[field.name]
    if (field.type === 'boolean') {
      input[field.name] = raw === true || raw === 'true'
      continue
    }
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (text === '') {
      if (field.required) errors[field.name] = 'required'
      continue
    }
    if (field.type === 'number') {
      const value = Number(text.replace(',', '.'))
      if (Number.isFinite(value)) input[field.name] = value
      else errors[field.name] = 'number'
    } else if (field.type === 'json') {
      try {
        input[field.name] = JSON.parse(text)
      } catch {
        errors[field.name] = 'json'
      }
    } else {
      input[field.name] = text
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input }
}

/** A workflow's output as the text the thread shows, `null` when there is nothing to show. */
export function outputText(output: unknown): string | null {
  if (output === undefined || output === null) return null
  const record = toRecord(output)
  const direct =
    typeof output === 'string'
      ? output
      : typeof record.content === 'string'
        ? record.content
        : typeof record.response === 'string'
          ? record.response
          : null
  if (direct !== null) return direct.trim() === '' ? null : direct.trim()
  const text = JSON.stringify(output, null, 2)
  if (!text || text === '{}') return null
  return text.length > OUTPUT_MAX_CHARS ? text.slice(0, OUTPUT_MAX_CHARS) : text
}

interface PauseField {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
}

interface RunResult {
  status: 'completed' | 'paused' | 'failed'
  executionId: string | null
  output: string | null
  error: string | null
  pause: { resumePath: string; message: string | null; fields: PauseField[] } | null
}

function pauseFieldType(declared: unknown): PauseField['type'] {
  return declared === 'boolean' || declared === 'number' ? declared : 'string'
}

function readPause(output: unknown): RunResult['pause'] {
  const data = toRecord(toRecord(output).data)
  const apiUrl = toRecord(data._resume).apiUrl
  if (typeof apiUrl !== 'string') return null
  let path: string
  try {
    path = new URL(apiUrl, 'http://localhost').pathname
  } catch {
    return null
  }
  if (!RESUME_PATH.test(path)) return null
  const message = [data.message, data.prompt, data.title].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== ''
  )
  const fields = toArray(data.inputFormat)
    .filter(isRecordLike)
    .flatMap((entry) => {
      const name = typeof entry.name === 'string' ? entry.name.trim() : ''
      if (!name) return []
      const description = typeof entry.description === 'string' ? entry.description.trim() : ''
      return [
        {
          name,
          label: description || name,
          type: pauseFieldType(entry.type),
          required: entry.required === true,
        },
      ]
    })
  return { resumePath: path, message: message?.trim() ?? null, fields }
}

/**
 * Reads the answer of a synchronous run of a workflow: its result, its failure, or the validation
 * it waits for (where to answer and what to ask). A resume address that is not the resume API of
 * this application is not believed.
 */
export function readRunResult(body: {
  success: boolean
  executionId?: string
  output?: unknown
  error?: string
}): RunResult {
  const executionId = body.executionId ?? null
  const pause = body.success ? readPause(body.output) : null
  if (pause) return { status: 'paused', executionId, output: null, error: null, pause }
  if (!body.success) {
    return {
      status: 'failed',
      executionId,
      output: null,
      error: body.error ?? 'Le workflow a échoué.',
      pause: null,
    }
  }
  return {
    status: 'completed',
    executionId,
    output: outputText(body.output),
    error: null,
    pause: null,
  }
}

/**
 * What the resume API receives for an answer in the thread: yes or no on the first yes/no field of
 * the form (`approuve`), and the comment on the first text field.
 */
export function buildSubmission(
  fields: PauseField[],
  approved: boolean,
  comment: string
): { input: { submission: Record<string, unknown> } } {
  const decision = fields.find((field) => field.type === 'boolean')?.name ?? 'approuve'
  const commentField = fields.find((field) => field.type === 'string')?.name ?? 'commentaire'
  const trimmed = comment.trim()
  return {
    input: {
      submission: { [decision]: approved, ...(trimmed ? { [commentField]: trimmed } : {}) },
    },
  }
}
