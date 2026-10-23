import { isRecordLike, toRecordOrNull } from '@sim/utils/object'
import { RESERVED_STEP_NAMES, START_BUILT_IN_FIELDS } from '@/lib/nexora/copilot/plan'

/** The step language's longest name. */
const MAX_NAME_LENGTH = 40
const TRIGGER_REFERENCE = 'declencheur'
const REFERENCE = /\{\{([^{}]*)\}\}/g
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const LOOSE_TIME = /^(\d{1,2})\s*[h:]\s*(\d{1,2})?$/i

/**
 * Output types the model writes for the three the step language has. A list or an object is
 * asked for as text: the compiled response format is strict and holds scalar fields only.
 */
const OUTPUT_TYPE_SYNONYMS: Record<string, 'string' | 'number' | 'boolean'> = {
  string: 'string',
  str: 'string',
  text: 'string',
  texte: 'string',
  chaine: 'string',
  list: 'string',
  liste: 'string',
  array: 'string',
  tableau: 'string',
  dict: 'string',
  object: 'string',
  objet: 'string',
  number: 'number',
  nombre: 'number',
  int: 'number',
  integer: 'number',
  entier: 'number',
  float: 'number',
  decimal: 'number',
  numeric: 'number',
  boolean: 'boolean',
  bool: 'boolean',
  booleen: 'boolean',
}

function plain(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
}

/** ASCII snake_case: accents dropped, other characters as `_`, a leading digit prefixed. */
function toSnakeCase(name: string): string {
  const base = plain(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const lettered = /^[0-9]/.test(base) ? `e_${base}` : base
  return lettered.slice(0, MAX_NAME_LENGTH).replace(/_+$/, '')
}

/** A free snake_case name for `raw`, suffixed `_2`, `_3`… past a taken or reserved one. */
function allocateName(
  raw: string,
  taken: Set<string>,
  reserved: ReadonlySet<string>,
  fallback: string
): string {
  const base = toSnakeCase(raw) || fallback
  let name = base
  for (let suffix = 2; taken.has(name) || reserved.has(name); suffix++) {
    const tail = `_${suffix}`
    name = `${base.slice(0, MAX_NAME_LENGTH - tail.length)}${tail}`
  }
  taken.add(name)
  return name
}

/** Renames each record's `name` in place; returns written name (as snake_case) → new name. */
function renameAll(
  items: unknown,
  reserved: ReadonlySet<string>,
  fallback: string
): Map<string, string> {
  const renamed = new Map<string, string>()
  if (!Array.isArray(items)) return renamed
  const taken = new Set<string>()
  for (const item of items) {
    if (!isRecordLike(item) || typeof item.name !== 'string') continue
    const name = allocateName(item.name, taken, reserved, fallback)
    const key = toSnakeCase(item.name)
    if (!renamed.has(key)) renamed.set(key, name)
    item.name = name
  }
  return renamed
}

function normalizeTime(time: string): string {
  const match = LOOSE_TIME.exec(time.trim())
  if (!match) return time
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? '0')
  if (hours > 23 || minutes > 59) return time
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Brings what a small model writes back to the Copilot's step language before validation, so a
 * plan whose only faults are its spelling does not cost the one retry: step, trigger field,
 * output field and response field names become ASCII snake_case (unique, never reserved), with
 * every `{{step.field}}` / `{{declencheur.field}}` reference, condition operand and branch list
 * rewritten to match; output type synonyms (« texte », « nombre », « booléen »…) become the
 * step language's types; a schedule time such as « 9h » or « 9:00 » becomes « 09:00 ».
 * Anything else (an unknown step, an `http://` address, a missing field) is left for validation
 * to refuse. A plan already valid comes out unchanged.
 */
export function normalizePlanCandidate(
  candidate: Record<string, unknown>
): Record<string, unknown> {
  if (!Array.isArray(candidate.steps)) return candidate
  const plan = structuredClone(candidate)
  const steps = (plan.steps as unknown[]).filter(isRecordLike)
  const trigger = toRecordOrNull(plan.trigger)

  const triggerFields =
    trigger?.kind === 'manuel'
      ? renameAll(trigger.fields, START_BUILT_IN_FIELDS, 'champ')
      : new Map<string, string>()
  if (trigger && typeof trigger.time === 'string') trigger.time = normalizeTime(trigger.time)

  const stepNames = renameAll(steps, RESERVED_STEP_NAMES, 'etape')
  const stepFields = new Map<string, Map<string, string>>()
  for (const step of steps) {
    if (typeof step.name !== 'string') continue
    if (isRecordLike(step.output) && Array.isArray(step.output.fields)) {
      stepFields.set(step.name, renameAll(step.output.fields, new Set(), 'champ'))
      for (const field of step.output.fields) {
        if (!isRecordLike(field) || typeof field.type !== 'string') continue
        field.type = OUTPUT_TYPE_SYNONYMS[plain(field.type)] ?? field.type
      }
    }
    if (step.kind === 'reponse') renameAll(step.fields, new Set(), 'champ')
  }

  const rewriteReference = (whole: string, inner: string): string => {
    const [source, field, ...rest] = inner.split('.').map((part) => part.trim())
    if (field === undefined || !source) return whole
    const sourceKey = toSnakeCase(source)
    const fieldKey = toSnakeCase(field)
    const fallbackField = IDENTIFIER.test(field) ? field : fieldKey
    let target: string
    let targetField: string
    if (sourceKey === TRIGGER_REFERENCE) {
      target = TRIGGER_REFERENCE
      targetField = triggerFields.get(fieldKey) ?? fallbackField
    } else {
      const step = stepNames.get(sourceKey)
      if (!step) return whole
      target = step
      targetField = stepFields.get(step)?.get(fieldKey) ?? fallbackField
    }
    return `{{${[target, targetField, ...rest].join('.')}}}`
  }
  const rewrite = (value: unknown): unknown => {
    if (typeof value === 'string') return value.replace(REFERENCE, rewriteReference)
    if (Array.isArray(value)) return value.map(rewrite)
    if (isRecordLike(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rewrite(inner)]))
    }
    return value
  }
  const rewriteStepList = (names: unknown): unknown =>
    Array.isArray(names)
      ? names.map((name) =>
          typeof name === 'string' ? (stepNames.get(toSnakeCase(name)) ?? name) : name
        )
      : names

  for (const step of steps) {
    for (const key of ['instructions', 'message', 'url', 'body'] as const) {
      if (key in step) step[key] = rewrite(step[key])
    }
    if (Array.isArray(step.fields) && step.kind === 'reponse') {
      for (const field of step.fields) {
        if (isRecordLike(field)) field.value = rewrite(field.value)
      }
    }
    if (step.kind === 'condition') {
      step.then = rewriteStepList(step.then)
      step.else = rewriteStepList(step.else)
      if (isRecordLike(step.if) && typeof step.if.ref === 'string') {
        const ref = step.if.ref.trim()
        step.if.ref = ref.startsWith('{{')
          ? rewrite(ref)
          : String(rewrite(`{{${ref}}}`)).replace(/^\{\{|\}\}$/g, '')
      }
    }
  }
  return plan
}
