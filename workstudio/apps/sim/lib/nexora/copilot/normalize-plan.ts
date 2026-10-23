import { isRecordLike, omit, toRecordOrNull } from '@sim/utils/object'
import { RESERVED_STEP_NAMES, START_BUILT_IN_FIELDS } from '@/lib/nexora/copilot/plan'

/** The step language's longest name. */
const MAX_NAME_LENGTH = 40
/** Output fields an agent may declare, at most (the step language's limit). */
const MAX_OUTPUT_FIELDS = 10
const TRIGGER_REFERENCE = 'declencheur'
const REFERENCE = /\{\{([^{}]*)\}\}/g
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/
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

/** Step kinds, so a reference written `{{validation_humaine.submission}}` finds its step. */
const STEP_KINDS: ReadonlySet<string> = new Set([
  'agent',
  'condition',
  'api',
  'attente',
  'validation_humaine',
  'reponse',
])
const KIND_LABELS: Record<string, string> = {
  agent: 'agent',
  condition: 'condition',
  api: "appel d'API",
  attente: 'attente',
  validation_humaine: 'validation humaine',
  reponse: 'réponse',
}
/** What a chat trigger carries: its message `input`, the conversation and the files. */
const CHAT_FIELDS: ReadonlySet<string> = new Set(['input', 'conversationId', 'files'])
/** What the Start block (manual or chat trigger) always provides. */
const START_FIELDS: ReadonlySet<string> = new Set(['input', 'conversationId', 'files'])
/** What an agent without `output` answers besides its run's metadata: its text, `content`. */
const AGENT_TEXT_OUTPUTS: ReadonlySet<string> = new Set(['content', 'model', 'tokens', 'toolCalls'])

/** The compiled human validation's form: a required yes/no, then a comment. */
const APPROVAL_FIELD = 'approuve'
const COMMENT_FIELD = 'commentaire'
const VALIDATION_OUTPUTS: ReadonlySet<string> = new Set([
  'url',
  'resumeEndpoint',
  'response',
  'submission',
  'resumeInput',
  'submittedAt',
  APPROVAL_FIELD,
  COMMENT_FIELD,
])
/** Names that say « the reviewer's comment », whatever their declared type. */
const COMMENT_NAMES: ReadonlySet<string> = new Set([
  'commentaire',
  'commentaires',
  'comment',
  'remarque',
  'remarques',
  'motif',
])
/** Names that say « approved », read as the yes/no only when declared as a boolean. */
const APPROVAL_NAMES: ReadonlySet<string> = new Set([
  'approbation',
  'approuver',
  'approved',
  'approval',
  'valide',
  'validee',
  'validation',
  'valider',
  'accord',
  'accepte',
  'decision',
])
/** What a condition on the approval compares it to, written as the model writes it. */
const YES_WORDS: ReadonlySet<string> = new Set([
  'true',
  'vrai',
  'oui',
  'yes',
  'approuve',
  'approuvee',
  'accepte',
  'acceptee',
  'valide',
  'validee',
])
const NO_WORDS: ReadonlySet<string> = new Set([
  'false',
  'faux',
  'non',
  'no',
  'refuse',
  'refusee',
  'rejete',
  'rejetee',
])

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

type Warn = (warning: string) => void
type StepRecord = Record<string, unknown>

/**
 * Where a reference is written, which bounds what may be repaired in it: a natural-language text
 * (agent instructions and message, validation message, response value), a condition operand, or
 * an API address or body, where only renames apply since a guess could change the call's target.
 */
type ReferenceSite = 'text' | 'condition' | 'api'

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

/** A written field or payload name as a reference may hold it. */
function referenceName(name: string): string {
  return IDENTIFIER.test(name) ? name : toSnakeCase(name)
}

/** A free name from `base`: `base` itself unless `skipBase`, else suffixed `_2`, `_3`… */
function allocateName(
  base: string,
  taken: Set<string>,
  reserved: ReadonlySet<string>,
  skipBase = false
): string {
  let name = base
  for (
    let suffix = 2;
    (skipBase && name === base) || taken.has(name) || reserved.has(name);
    suffix++
  ) {
    const tail = `_${suffix}`
    name = `${base.slice(0, MAX_NAME_LENGTH - tail.length)}${tail}`
  }
  taken.add(name)
  return name
}

/** The final name a written name binds to; `undefined` when it names nothing, or two things. */
type NameBinding = (written: string) => string | undefined

const NO_BINDING: NameBinding = () => undefined

function namedRecords(items: unknown): (StepRecord & { name: string })[] {
  if (!Array.isArray(items)) return []
  return items.filter(
    (item): item is StepRecord & { name: string } =>
      isRecordLike(item) && typeof item.name === 'string'
  )
}

/**
 * Renames each record's `name` to unique snake_case, and binds what references write to the
 * record they meant: the name exactly as written first, then its snake_case form when only one
 * written name folds to it. A name already in the step language keeps it. Two different names
 * folding alike (`Résumé`, `resume`, or two long names cut alike) never share a name, and the
 * bare form goes to none of them unless one was written so, so a reference to it that names
 * neither is refused rather than read as one. Two records written with the same name keep it, for
 * validation to refuse as a duplicate.
 */
function renameAll(items: unknown, reserved: ReadonlySet<string>, fallback: string): NameBinding {
  const records = namedRecords(items)
  const written = [...new Set(records.map((record) => record.name.trim()))]
  const keyOf = (name: string) => toSnakeCase(name) || fallback
  const sharing = new Map<string, number>()
  for (const name of written) sharing.set(keyOf(name), (sharing.get(keyOf(name)) ?? 0) + 1)

  const taken = new Set<string>()
  const finalOf = new Map<string, string>()
  for (const name of written) {
    if (SNAKE_CASE.test(name) && name.length <= MAX_NAME_LENGTH && !reserved.has(name)) {
      finalOf.set(name, name)
      taken.add(name)
    }
  }
  for (const name of written) {
    if (finalOf.has(name)) continue
    const key = keyOf(name)
    finalOf.set(name, allocateName(key, taken, reserved, (sharing.get(key) ?? 0) > 1))
  }
  for (const record of records) record.name = finalOf.get(record.name.trim()) ?? record.name

  const byKey = new Map<string, string | null>()
  for (const [name, final] of finalOf) {
    const key = keyOf(name)
    byKey.set(key, byKey.has(key) ? null : final)
  }
  return (writtenName) => {
    const exact = finalOf.get(writtenName.trim())
    if (exact) return exact
    return byKey.get(keyOf(writtenName)) ?? undefined
  }
}

/** Renames each record's `name` to unique snake_case; nothing refers to these names. */
function renameEach(items: unknown, fallback: string): void {
  const taken = new Set<string>()
  for (const record of namedRecords(items)) {
    record.name = allocateName(toSnakeCase(record.name) || fallback, taken, new Set())
  }
}

function normalizeTime(time: string): string {
  const match = LOOSE_TIME.exec(time.trim())
  if (!match) return time
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? '0')
  if (hours > 23 || minutes > 59) return time
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function quoted(names: readonly string[]): string {
  return names.map((name) => `« ${name} »`).join(', ')
}

function sameStep(left: StepRecord, right: StepRecord): boolean {
  return JSON.stringify(omit(left, ['name'])) === JSON.stringify(omit(right, ['name']))
}

/**
 * Moves the steps a condition lists as objects (`"then": [{ "kind": "agent", … }]`) into the plan,
 * right after the condition (then before else, each in order), and keeps the object itself in the
 * branch list so its final name can be read once names are normalized. A step of the same kind
 * also listed under that name in the plan is only referred to (with a warning when the two
 * differ); a step of another kind that shares the name gets a new one.
 */
function hoistBranchSteps(steps: unknown[], warn: Warn): unknown[] {
  const hoisted = [...steps]
  const listed = hoisted.filter(
    (step): step is StepRecord & { name: string } =>
      isRecordLike(step) && typeof step.name === 'string'
  )
  const usedKeys = new Set(listed.map((step) => toSnakeCase(step.name)))
  const findListed = (name: string): StepRecord | undefined => {
    const exact = listed.filter((step) => step.name.trim() === name.trim())
    if (exact.length > 0) return exact[0]
    const folded = listed.filter((step) => toSnakeCase(step.name) === toSnakeCase(name))
    return folded.length === 1 ? folded[0] : undefined
  }

  for (let index = 0; index < hoisted.length; index++) {
    const condition = hoisted[index]
    if (!isRecordLike(condition) || condition.kind !== 'condition') continue
    const conditionName = typeof condition.name === 'string' ? condition.name : 'condition'
    let insertAt = index + 1
    for (const side of ['then', 'else'] as const) {
      const targets = condition[side]
      if (!Array.isArray(targets)) continue
      condition[side] = targets.map((target) => {
        if (!isRecordLike(target)) return target
        const written = typeof target.name === 'string' ? target.name : ''
        const twin = toSnakeCase(written) ? findListed(written) : undefined
        if (twin && twin.kind === target.kind) {
          if (!sameStep(twin, target)) {
            warn(
              `Condition « ${conditionName} » : l'étape « ${written} » écrite dans la branche existe déjà dans le plan, avec un autre contenu ; c'est celle du plan qui est gardée.`
            )
          }
          return twin
        }
        if (!toSnakeCase(written) || twin) {
          const base = toSnakeCase(written) || (typeof target.kind === 'string' ? target.kind : '')
          target.name = allocateName(base || 'etape', usedKeys, RESERVED_STEP_NAMES, Boolean(twin))
          if (twin) {
            warn(
              `Condition « ${conditionName} » : l'étape « ${written} » de la branche porte le nom d'une autre étape, renommée « ${target.name} ».`
            )
          }
        } else {
          usedKeys.add(toSnakeCase(written))
        }
        listed.push(target as StepRecord & { name: string })
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

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i++) {
    const current = [i]
    for (let j = 1; j <= right.length; j++) {
      const substitution = previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution))
    }
    previous = current
  }
  return previous[right.length]
}

/**
 * The one step a branch target nearly names (`envoyer_mail` for `envoyer_email`): at most two
 * edits, fewer for a short name, and no other step as close.
 */
function nearlyNamed(target: string, names: readonly string[]): string | undefined {
  const written = toSnakeCase(target)
  const allowed = Math.min(2, Math.floor(written.length / 4))
  if (allowed === 0) return undefined
  const close = names.filter((name) => editDistance(written, name) <= allowed)
  return close.length === 1 ? close[0] : undefined
}

/**
 * Brings what a small model writes back to the Copilot's step language before validation, so a
 * plan whose only faults are its form does not cost the one retry. A repair is made only where it
 * cannot change what the workflow does (which steps run on which path, which data a condition
 * tests, where an API call goes), and each one that changes the plan's meaning adds a French
 * warning. Anything else is left for validation or compilation to refuse, and the retry asks the
 * model again with the reason:
 * - step, trigger field, output field and response field names become ASCII snake_case (unique,
 *   never reserved), each reference, condition operand and branch list still naming what it named;
 * - steps written as objects inside a condition's `then` / `else` move into the plan right after
 *   it, and the branch lists name them;
 * - a branch target naming no step is matched only to the one step it nearly names;
 * - in texts and conditions: a reference to a step by its kind reads the only step of that kind;
 *   `{{declencheur.step.field}}` reads that step (any form under a schedule, which carries no
 *   data); a field an agent without `output` is read for becomes its structured output, unless its
 *   whole answer is also read; a human validation's declared field reads its form by name
 *   (`approuve`, `commentaire`), a boolean also by type, and « oui » / « non » compared with the
 *   approval read as true / false;
 * - in texts only: any field of a chat trigger reads its message (`{{declencheur.input}}`), and
 *   under a schedule `{{declencheur.…}}` is removed (a response field left empty is dropped);
 * - output type synonyms (« texte », « nombre », « booléen »…) become the step language's types; a
 *   schedule time such as « 9h » or « 9:00 » becomes « 09:00 ».
 * A plan already valid comes out unchanged, without warnings.
 */
export function normalizePlanCandidate(
  candidate: Record<string, unknown>
): NormalizedPlanCandidate {
  const warnings: string[] = []
  /** Off while a first pass only finds which fields agents without `output` are read for. */
  let warning = true
  const warn: Warn = (text) => {
    if (warning && !warnings.includes(text)) warnings.push(text)
  }
  if (!Array.isArray(candidate.steps)) return { plan: candidate, warnings }
  const plan = structuredClone(candidate)
  plan.steps = hoistBranchSteps(plan.steps as unknown[], warn)
  const steps = (plan.steps as unknown[]).filter(isRecordLike)
  const trigger = toRecordOrNull(plan.trigger)
  const scheduled = trigger?.kind === 'planification'

  const triggerField =
    trigger?.kind === 'manuel'
      ? renameAll(trigger.fields, START_BUILT_IN_FIELDS, 'champ')
      : NO_BINDING
  if (trigger && typeof trigger.time === 'string') trigger.time = normalizeTime(trigger.time)

  const stepName = renameAll(steps, RESERVED_STEP_NAMES, 'etape')
  const stepByName = new Map<string, StepRecord>()
  for (const step of steps) {
    if (typeof step.name === 'string' && !stepByName.has(step.name)) {
      stepByName.set(step.name, step)
    }
  }
  const outputField = new Map<string, NameBinding>()
  const declaredValidationFields = new Map<string, StepRecord[]>()
  for (const step of steps) {
    if (typeof step.name !== 'string') continue
    const fields =
      isRecordLike(step.output) && Array.isArray(step.output.fields) ? step.output.fields : null
    if (step.kind === 'validation_humaine') {
      declaredValidationFields.set(step.name, (fields ?? []).filter(isRecordLike))
      continue
    }
    if (fields) {
      outputField.set(step.name, renameAll(fields, new Set(), 'champ'))
      for (const field of fields) {
        if (!isRecordLike(field) || typeof field.type !== 'string') continue
        field.type = OUTPUT_TYPE_SYNONYMS[plain(field.type)] ?? field.type
      }
    }
    if (step.kind === 'reponse') renameEach(step.fields, 'champ')
  }

  const stepsByKind = new Map<string, string[]>()
  for (const step of steps) {
    if (typeof step.kind !== 'string' || typeof step.name !== 'string') continue
    stepsByKind.set(step.kind, [...(stepsByKind.get(step.kind) ?? []), step.name])
  }

  /** The form field a human validation's field stands for, by name, a boolean also by type. */
  const approvalFieldOf = (validation: string, written: string): string | undefined => {
    const key = toSnakeCase(written)
    if (key === APPROVAL_FIELD || key === COMMENT_FIELD) return key
    if (COMMENT_NAMES.has(key)) return COMMENT_FIELD
    const declared = declaredValidationFields.get(validation) ?? []
    const typeOf = (field: StepRecord) =>
      typeof field.type === 'string' ? OUTPUT_TYPE_SYNONYMS[plain(field.type)] : undefined
    const field = declared.find(
      (candidate) => typeof candidate.name === 'string' && toSnakeCase(candidate.name) === key
    )
    if (!field || typeOf(field) !== 'boolean') return undefined
    if (APPROVAL_NAMES.has(key)) return APPROVAL_FIELD
    return declared.filter((candidate) => typeOf(candidate) === 'boolean').length === 1
      ? APPROVAL_FIELD
      : undefined
  }

  /** Fields read from each agent without `output`, and the agents whose whole answer is read. */
  const agentFieldsRead = new Map<string, Set<string>>()
  const agentAnswerRead = new Set<string>()
  /** Fields given to agents without `output` because later steps read them. */
  const addedFields = new Map<string, string[]>()

  interface Read {
    path: string[]
    note?: string
  }

  /** `{{name.field.rest}}` for a step, its field normalized; `undefined` leaves it as written. */
  const readStep = (name: string, path: string[], site: ReferenceSite): Read | undefined => {
    const step = stepByName.get(name)
    const [field, ...rest] = path
    if (field === undefined) {
      if (step?.kind === 'api') return { path: ['data'] }
      if (step?.kind !== 'agent') return undefined
      const fields = addedFields.get(name) ?? declaredNames(step)
      if (fields.length === 0) {
        agentAnswerRead.add(name)
        return { path: ['content'] }
      }
      return fields.length === 1 ? { path: [fields[0]] } : undefined
    }
    if (step?.kind === 'agent') {
      const declared = outputField.get(name)
      if (declared) return { path: [declared(field) ?? referenceName(field), ...rest] }
      if (AGENT_TEXT_OUTPUTS.has(field)) {
        if (field === 'content') agentAnswerRead.add(name)
        return { path: [field, ...rest] }
      }
      const wanted = referenceName(field)
      if (site !== 'api' && wanted) {
        agentFieldsRead.set(name, new Set([...(agentFieldsRead.get(name) ?? []), wanted]))
      }
      return { path: [wanted, ...rest] }
    }
    if (step?.kind === 'validation_humaine') {
      const [submitted, ...deeper] = rest
      const formField = field === 'submission' ? submitted : field
      if (formField === undefined || site === 'api') {
        return { path: [VALIDATION_OUTPUTS.has(field) ? field : referenceName(field), ...rest] }
      }
      if (field !== 'submission' && VALIDATION_OUTPUTS.has(field)) return { path: [field, ...rest] }
      const mapped = approvalFieldOf(name, formField)
      if (!mapped) return undefined
      const mappedPath = field === 'submission' ? [field, mapped, ...deeper] : [mapped, ...rest]
      const note =
        toSnakeCase(formField) === mapped
          ? undefined
          : mapped === APPROVAL_FIELD
            ? `la réponse oui/non de la validation humaine « ${name} »`
            : `le commentaire de la validation humaine « ${name} »`
      return { path: mappedPath, note }
    }
    return { path: [referenceName(field), ...rest] }
  }

  /** What a reference becomes; `null` removes it (trigger data under a schedule, in a text). */
  const rewriteReference = (
    inner: string,
    site: ReferenceSite,
    notes: string[]
  ): string | null | undefined => {
    const [source, ...path] = inner.split('.').map((part) => part.trim())
    if (path.length === 0 || !source) return undefined
    const format = (head: string, tail: string[]) => `{{${[head, ...tail].join('.')}}}`

    if (toSnakeCase(source) !== TRIGGER_REFERENCE) {
      let name = stepName(source)
      let byKind = false
      if (!name && site !== 'api' && STEP_KINDS.has(toSnakeCase(source))) {
        const ofKind = stepsByKind.get(toSnakeCase(source))
        if (ofKind?.length === 1) {
          name = ofKind[0]
          byKind = true
        }
      }
      if (!name) return undefined
      const read = readStep(name, path, site)
      // Named by its kind, the step is named for the refusal to say what it lacks.
      if (!read) return byKind ? format(name, path) : undefined
      const rewritten = format(name, read.path)
      if (byKind) {
        notes.push(
          `lu comme l'étape « ${name} », la seule de type ${KIND_LABELS[toSnakeCase(source)]} : « ${rewritten} »`
        )
      } else if (read.note) {
        notes.push(`lu comme ${read.note} : « ${rewritten} »`)
      }
      return rewritten
    }

    const [field, ...rest] = path
    const declared = triggerField(field)
    const isTriggerField =
      declared !== undefined ||
      ((trigger?.kind === 'manuel' || trigger?.kind === 'chat') && START_FIELDS.has(field))
    if (!isTriggerField && site !== 'api' && trigger?.kind !== 'webhook') {
      const throughStep = scheduled || rest.length > 0 ? stepName(field) : undefined
      const read = throughStep ? readStep(throughStep, rest, site) : undefined
      if (throughStep && read) {
        const rewritten = format(throughStep, read.path)
        notes.push(`lu comme la sortie de l'étape « ${throughStep} » : « ${rewritten} »`)
        return rewritten
      }
    }
    if (scheduled) return site === 'text' ? null : undefined
    if (trigger?.kind === 'chat' && !CHAT_FIELDS.has(field)) {
      if (site !== 'text') return undefined
      const rewritten = format(TRIGGER_REFERENCE, ['input', ...rest])
      notes.push(`lu comme le message du chat, « ${rewritten} »`)
      return rewritten
    }
    return format(TRIGGER_REFERENCE, [declared ?? referenceName(field), ...rest])
  }

  /** A text with its references rewritten; `removed` collects the trigger data taken out. */
  const rewriteText = (
    value: string,
    site: ReferenceSite,
    reader: string,
    removed: string[] | null
  ): string => {
    let removedHere = false
    const rewritten = value.replace(REFERENCE, (whole: string, inner: string) => {
      const notes: string[] = []
      const result = rewriteReference(inner, site, notes)
      if (result === null && removed) {
        removed.push(whole.replace(/\s+/g, ''))
        removedHere = true
        return ''
      }
      for (const note of notes) {
        warn(`Étape « ${reader} » : « ${whole.replace(/\s+/g, '')} » ${note}.`)
      }
      return result ?? whole
    })
    return removedHere ? tidyAfterRemoval(rewritten) : rewritten
  }
  const rewriteValue = (
    value: unknown,
    site: ReferenceSite,
    reader: string,
    removed: string[] | null
  ): unknown => {
    if (typeof value === 'string') return rewriteText(value, site, reader, removed)
    if (Array.isArray(value)) return value.map((item) => rewriteValue(item, site, reader, removed))
    if (isRecordLike(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, inner]) => [
          key,
          rewriteValue(inner, site, reader, removed),
        ])
      )
    }
    return value
  }

  /** Rewrites one step's texts, operand and response values; `commit` writes them back. */
  const rewriteStep = (step: StepRecord, commit: boolean): void => {
    const reader = typeof step.name === 'string' ? step.name : ''
    const write = (key: string, value: unknown) => {
      if (commit) step[key] = value
    }
    const removed: string[] = []
    const site: ReferenceSite = step.kind === 'api' ? 'api' : 'text'
    for (const key of ['instructions', 'message', 'url', 'body'] as const) {
      if (!(key in step)) continue
      const before = removed.length
      let value = rewriteValue(step[key], site, reader, removed)
      const fallback =
        typeof step.kind === 'string' ? REQUIRED_TEXT_FALLBACKS[step.kind]?.[key] : undefined
      if (fallback && value === '' && removed.length > before) value = fallback
      write(key, value)
    }
    if (Array.isArray(step.fields) && step.kind === 'reponse') {
      const fields = step.fields.filter(isRecordLike)
      const values = fields.map((field) => rewriteValue(field.value, 'text', reader, removed))
      const emptied = fields.filter((field, index) => values[index] === '' && field.value !== '')
      if (emptied.length === fields.length) {
        removed.length = 0
        const kept = fields.map((field) => rewriteValue(field.value, 'text', reader, null))
        if (commit) fields.forEach((field, index) => Object.assign(field, { value: kept[index] }))
      } else if (commit) {
        fields.forEach((field, index) => Object.assign(field, { value: values[index] }))
        step.fields = fields.filter((field) => !emptied.includes(field))
        for (const field of emptied) {
          warn(
            `Étape « ${reader} » : champ « ${String(field.name)} » retiré, car il ne contenait que des données du déclencheur.`
          )
        }
      }
    }
    if (step.kind === 'condition' && isRecordLike(step.if) && typeof step.if.ref === 'string') {
      const ref = step.if.ref.trim()
      const braced = ref.startsWith('{{')
      const rewritten = rewriteText(braced ? ref : `{{${ref}}}`, 'condition', reader, null)
      if (commit) {
        step.if.ref = braced ? rewritten : rewritten.replace(/^\{\{|\}\}$/g, '')
        normalizeApprovalValue(step, warn)
      }
    }
    if (commit && removed.length > 0) {
      const refs = [...new Set(removed)]
      warn(
        `Étape « ${reader} » : ${quoted(refs)} ${refs.length > 1 ? 'retirés' : 'retiré'}, car une planification ne transmet aucune donnée.`
      )
    }
  }

  /** The yes/no a condition compares the approval with, read from « oui », « refusé »… */
  const normalizeApprovalValue = (step: StepRecord, warnOf: Warn): void => {
    if (!isRecordLike(step.if) || typeof step.if.ref !== 'string') return
    if (step.if.operator !== 'egal' && step.if.operator !== 'different') return
    const [source, field, submitted] = step.if.ref.replace(/^\{\{|\}\}$/g, '').split('.')
    const reads = field === 'submission' ? submitted : field
    if (stepByName.get(source)?.kind !== 'validation_humaine' || reads !== APPROVAL_FIELD) return
    const written = step.if.value
    if (
      typeof written === 'boolean' ||
      (typeof written !== 'string' && typeof written !== 'number')
    )
      return
    const word = toSnakeCase(String(written))
    const value = YES_WORDS.has(word) ? 'true' : NO_WORDS.has(word) ? 'false' : undefined
    if (value === undefined || String(written) === value) return
    step.if.value = value
    warnOf(
      `Condition « ${String(step.name)} » : valeur « ${String(written)} » lue comme ${value} (réponse oui/non de la validation humaine).`
    )
  }

  warning = false
  for (const step of steps) rewriteStep(step, false)
  warning = true
  for (const [name, fields] of agentFieldsRead) {
    const step = stepByName.get(name)
    if (!step || agentAnswerRead.has(name) || fields.size > MAX_OUTPUT_FIELDS) continue
    const added = [...fields]
    step.output = { fields: added.map((field) => ({ name: field, type: 'string' })) }
    addedFields.set(name, added)
    outputField.set(name, (written) => (fields.has(written) ? written : undefined))
    warn(
      `Étape « ${name} » : sortie structurée ${quoted(added)} ajoutée (texte), car d'autres étapes la lisent.`
    )
  }
  for (const step of steps) rewriteStep(step, true)

  const allNames = steps.flatMap((step) => (typeof step.name === 'string' ? [step.name] : []))
  for (const step of steps) {
    if (step.kind === 'condition') resolveBranches(step, stepName, allNames, warn)
  }
  return { plan, warnings }
}

function declaredNames(step: StepRecord): string[] {
  const fields =
    isRecordLike(step.output) && Array.isArray(step.output.fields) ? step.output.fields : []
  return fields.flatMap((field) =>
    isRecordLike(field) && typeof field.name === 'string' ? [field.name] : []
  )
}

/**
 * Turns a condition's branch lists into step names: a moved step by its final name, a written name
 * by the step it names. A name matching no step is matched only to the one step it nearly names
 * (with a warning); otherwise it stays, for compilation to refuse, since dropping it would run the
 * step it meant on every path.
 */
function resolveBranches(
  condition: StepRecord,
  stepName: NameBinding,
  names: readonly string[],
  warn: Warn
): void {
  const others = names.filter((name) => name !== condition.name)
  for (const side of ['then', 'else'] as const) {
    const targets = condition[side]
    if (!Array.isArray(targets)) continue
    condition[side] = targets.map((target) => {
      if (isRecordLike(target)) return target.name
      if (typeof target !== 'string') return target
      const named = stepName(target)
      if (named) return named
      const near = nearlyNamed(target, others)
      if (near) {
        warn(
          `Condition « ${String(condition.name)} » : branche « ${target} » lue comme l'étape « ${near} ».`
        )
        return near
      }
      return toSnakeCase(target) || target
    })
  }
}
