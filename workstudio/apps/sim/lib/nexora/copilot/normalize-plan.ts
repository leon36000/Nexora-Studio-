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

/** Step kinds, so a reference written `{{validation_humaine.submission}}` finds its step. */
const STEP_KINDS: ReadonlySet<string> = new Set([
  'agent',
  'condition',
  'api',
  'attente',
  'validation_humaine',
  'reponse',
])
/** What a chat trigger carries besides its message, `input`, which any other field stands for. */
const CHAT_FIELDS: ReadonlySet<string> = new Set(['input', 'conversationId', 'files'])
/** The compiled human validation's form: a yes/no, then a comment. */
const APPROVAL_FIELD = 'approuve'
const COMMENT_FIELD = 'commentaire'
/** Texts a step cannot do without, and what they become once only trigger data was removed. */
const REQUIRED_TEXT_FALLBACKS: Record<string, Record<string, string>> = {
  agent: {
    instructions: 'Vous aidez une PME.',
    message: 'Effectuez la tâche décrite dans vos consignes.',
  },
  validation_humaine: { message: 'Validez-vous la suite du workflow ?' },
}

export interface NormalizedPlanCandidate {
  plan: Record<string, unknown>
  /** What the repairs changed in the plan's meaning, in French, for the person to check. */
  warnings: string[]
}

/**
 * Moves the steps a condition lists as objects (`"then": [{ "kind": "agent", … }]`) into the plan,
 * right after the condition (then before else, each in order), and keeps the object itself in the
 * branch list so its final name can be read once names are normalized. A step that is also listed
 * by name in the plan is only referred to, never duplicated.
 */
function hoistBranchSteps(steps: unknown[]): unknown[] {
  const hoisted = [...steps]
  const listed = new Map<string, unknown>()
  for (const step of hoisted) {
    if (isRecordLike(step) && typeof step.name === 'string') {
      listed.set(toSnakeCase(step.name), step)
    }
  }
  for (let index = 0; index < hoisted.length; index++) {
    const condition = hoisted[index]
    if (!isRecordLike(condition) || condition.kind !== 'condition') continue
    let insertAt = index + 1
    for (const side of ['then', 'else'] as const) {
      const targets = condition[side]
      if (!Array.isArray(targets)) continue
      condition[side] = targets.map((target) => {
        if (!isRecordLike(target)) return target
        const key = typeof target.name === 'string' ? toSnakeCase(target.name) : ''
        const twin = key ? listed.get(key) : undefined
        if (twin) return twin
        if (key) listed.set(key, target)
        else target.name = typeof target.kind === 'string' ? target.kind : 'etape'
        hoisted.splice(insertAt++, 0, target)
        return target
      })
    }
  }
  return hoisted
}

/** Collapses the spaces and the dangling « : » left where a reference was removed. */
function tidyAfterRemoval(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s*[:,;]\s*$/, '')
    .trim()
}

/**
 * Brings what a small model writes back to the Copilot's step language before validation, so a
 * plan whose only faults are its form does not cost the one retry:
 * - step, trigger field, output field and response field names become ASCII snake_case (unique,
 *   never reserved), with every `{{step.field}}` / `{{declencheur.field}}` reference, condition
 *   operand and branch list rewritten to match;
 * - steps written as objects inside a condition's `then` / `else` move into the plan right after
 *   it, and the branch lists name them;
 * - a branch target naming no step is dropped (with a warning) when another target remains;
 * - a reference to a step by its kind (`{{validation_humaine.submission}}`) reads the only step of
 *   that kind; any field of a chat trigger reads its message (`{{declencheur.input}}`); a field a
 *   human validation declares in `output` reads its form (`approuve` for a yes/no, else
 *   `commentaire`);
 * - a schedule carries no data: `{{declencheur.…}}` in its steps' texts is removed (with a warning);
 * - output type synonyms (« texte », « nombre », « booléen »…) become the step language's types; a
 *   schedule time such as « 9h » or « 9:00 » becomes « 09:00 ».
 * Anything else (an unknown step, an `http://` address, a missing field, more than 12 steps) is
 * left for validation to refuse. A plan already valid comes out unchanged, without warnings.
 */
export function normalizePlanCandidate(
  candidate: Record<string, unknown>
): NormalizedPlanCandidate {
  const warnings: string[] = []
  if (!Array.isArray(candidate.steps)) return { plan: candidate, warnings }
  const plan = structuredClone(candidate)
  plan.steps = hoistBranchSteps(plan.steps as unknown[])
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
      if (step.kind === 'validation_humaine') {
        stepFields.set(step.name, approvalFields(step.output.fields))
        continue
      }
      stepFields.set(step.name, renameAll(step.output.fields, new Set(), 'champ'))
      for (const field of step.output.fields) {
        if (!isRecordLike(field) || typeof field.type !== 'string') continue
        field.type = OUTPUT_TYPE_SYNONYMS[plain(field.type)] ?? field.type
      }
    }
    if (step.kind === 'reponse') renameAll(step.fields, new Set(), 'champ')
  }

  const stepsByKind = new Map<string, string[]>()
  for (const step of steps) {
    if (typeof step.kind !== 'string' || typeof step.name !== 'string') continue
    stepsByKind.set(step.kind, [...(stepsByKind.get(step.kind) ?? []), step.name])
  }
  const findStep = (key: string): string | undefined => {
    const named = stepNames.get(key)
    if (named) return named
    const ofKind = STEP_KINDS.has(key) ? stepsByKind.get(key) : undefined
    return ofKind?.length === 1 ? ofKind[0] : undefined
  }

  const scheduled = trigger?.kind === 'planification'
  /** Trigger references removed from the text being rewritten. */
  let removed: string[] = []

  const stepByName = new Map(
    steps.flatMap((step) => (typeof step.name === 'string' ? [[step.name, step] as const] : []))
  )
  /** `{{name.field.rest}}` for a step, its field normalized; `field` absent reads its main output. */
  const readStep = (
    name: string,
    field: string | undefined,
    rest: string[]
  ): string | undefined => {
    const step = stepByName.get(name)
    let targetField: string | undefined
    if (field === undefined) {
      targetField = mainOutput(step)
    } else {
      const fieldKey = toSnakeCase(field)
      targetField =
        stepFields.get(name)?.get(fieldKey) ?? (IDENTIFIER.test(field) ? field : fieldKey)
      if (step?.kind === 'agent' && !hasOutput(step) && !AGENT_TEXT_OUTPUTS.has(targetField)) {
        targetField = 'content'
      }
    }
    return targetField ? `{{${[name, targetField, ...rest].join('.')}}}` : undefined
  }

  const rewriteReference = (whole: string, inner: string): string => {
    const [source, field, ...rest] = inner.split('.').map((part) => part.trim())
    if (field === undefined || !source) return whole
    const sourceKey = toSnakeCase(source)
    const fieldKey = toSnakeCase(field)
    if (sourceKey !== TRIGGER_REFERENCE) {
      const step = findStep(sourceKey)
      return (step && readStep(step, field, rest)) ?? whole
    }
    const isTriggerField =
      triggerFields.has(fieldKey) || (trigger?.kind === 'chat' && CHAT_FIELDS.has(field))
    const throughStep =
      trigger?.kind !== 'webhook' && !isTriggerField ? stepNames.get(fieldKey) : undefined
    if (throughStep) {
      const [stepField, ...stepRest] = rest
      const read = readStep(throughStep, stepField, stepRest)
      if (read) return read
    }
    if (scheduled) {
      removed.push(whole.replace(/\s+/g, ''))
      return ''
    }
    const targetField =
      trigger?.kind === 'chat' && !CHAT_FIELDS.has(field)
        ? 'input'
        : (triggerFields.get(fieldKey) ?? (IDENTIFIER.test(field) ? field : fieldKey))
    return `{{${[TRIGGER_REFERENCE, targetField, ...rest].join('.')}}}`
  }
  const rewrite = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const before = removed.length
      const rewritten = value.replace(REFERENCE, rewriteReference)
      return removed.length > before ? tidyAfterRemoval(rewritten) : rewritten
    }
    if (Array.isArray(value)) return value.map(rewrite)
    if (isRecordLike(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rewrite(inner)]))
    }
    return value
  }

  for (const step of steps) {
    removed = []
    for (const key of ['instructions', 'message', 'url', 'body'] as const) {
      if (!(key in step)) continue
      step[key] = rewrite(step[key])
      const fallback =
        typeof step.kind === 'string' ? REQUIRED_TEXT_FALLBACKS[step.kind]?.[key] : undefined
      if (fallback && step[key] === '' && removed.length > 0) step[key] = fallback
    }
    if (Array.isArray(step.fields) && step.kind === 'reponse') {
      const fields = step.fields.filter(isRecordLike)
      for (const field of fields) field.value = rewrite(field.value)
      const kept = fields.filter((field) => field.value !== '')
      if (removed.length > 0 && kept.length > 0) step.fields = kept
    }
    if (step.kind === 'condition' && isRecordLike(step.if) && typeof step.if.ref === 'string') {
      const ref = step.if.ref.trim()
      step.if.ref = ref.startsWith('{{')
        ? rewrite(ref)
        : String(rewrite(`{{${ref}}}`)).replace(/^\{\{|\}\}$/g, '')
    }
    if (removed.length > 0 && typeof step.name === 'string') {
      const refs = [...new Set(removed)]
      warnings.push(
        `Étape « ${step.name} » : ${refs.map((ref) => `« ${ref} »`).join(', ')} ${refs.length > 1 ? 'retirés' : 'retiré'}, car une planification ne transmet aucune donnée.`
      )
    }
  }

  for (const step of steps) {
    if (step.kind === 'condition') resolveBranches(step, stepNames, warnings)
  }
  return { plan, warnings }
}

/** What an agent without `output` answers besides its run's metadata: its text, `content`. */
const AGENT_TEXT_OUTPUTS: ReadonlySet<string> = new Set(['content', 'model', 'tokens', 'toolCalls'])

function hasOutput(step: Record<string, unknown>): boolean {
  return (
    isRecordLike(step.output) && Array.isArray(step.output.fields) && step.output.fields.length > 0
  )
}

/** The output a step is read as when no field is named: an agent's answer, an API's data. */
function mainOutput(step: Record<string, unknown> | undefined): string | undefined {
  if (step?.kind === 'api') return 'data'
  if (step?.kind !== 'agent') return undefined
  const fields =
    isRecordLike(step.output) && Array.isArray(step.output.fields) ? step.output.fields : []
  if (fields.length === 0) return 'content'
  const [only] = fields
  return fields.length === 1 && isRecordLike(only) && typeof only.name === 'string'
    ? only.name
    : undefined
}

/** A human validation's declared output fields, read as its form: a yes/no, else the comment. */
function approvalFields(fields: unknown[]): Map<string, string> {
  const mapped = new Map<string, string>()
  for (const field of fields) {
    if (!isRecordLike(field) || typeof field.name !== 'string') continue
    const type =
      typeof field.type === 'string' ? OUTPUT_TYPE_SYNONYMS[plain(field.type)] : undefined
    mapped.set(toSnakeCase(field.name), type === 'boolean' ? APPROVAL_FIELD : COMMENT_FIELD)
  }
  return mapped
}

/**
 * Turns a condition's branch lists into step names: a moved step by its final name, a written name
 * by the step it normalizes to. Names matching no step are dropped with a warning when at least one
 * target remains; otherwise they stay for compilation to refuse, so the model is asked again.
 */
function resolveBranches(
  condition: Record<string, unknown>,
  stepNames: Map<string, string>,
  warnings: string[]
): void {
  const resolved: Partial<Record<'then' | 'else', (string | undefined)[]>> = {}
  const unknown: string[] = []
  for (const side of ['then', 'else'] as const) {
    const targets = condition[side]
    if (!Array.isArray(targets)) continue
    resolved[side] = targets.map((target) => {
      const name = isRecordLike(target)
        ? target.name
        : typeof target === 'string'
          ? stepNames.get(toSnakeCase(target))
          : undefined
      if (typeof name === 'string') return name
      unknown.push(typeof target === 'string' ? target : JSON.stringify(target))
      return undefined
    })
  }
  const known = [...(resolved.then ?? []), ...(resolved.else ?? [])].filter(Boolean).length
  if (known === 0) return
  for (const side of ['then', 'else'] as const) {
    const names = resolved[side]
    if (names) condition[side] = names.filter((name): name is string => name !== undefined)
  }
  if (unknown.length > 0 && typeof condition.name === 'string') {
    warnings.push(
      `Condition « ${condition.name} » : ${unknown.map((name) => `« ${name} »`).join(', ')} ne désigne aucune étape, branche ignorée.`
    )
  }
}
