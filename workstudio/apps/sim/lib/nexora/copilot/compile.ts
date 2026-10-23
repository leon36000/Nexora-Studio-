import { generateId } from '@sim/utils/id'
import { truncate } from '@sim/utils/string'
import { normalizeWorkflowBlockName } from '@sim/workflow-types/workflow'
import { createMcpToolId } from '@/lib/mcp/shared'
import { NEXORA_CONNECT_SERVER_NAME } from '@/lib/nexora/connect'
import type { CopilotPlan, CopilotStep, CopilotTrigger } from '@/lib/nexora/copilot/plan'
import type { StoredTool } from '@/lib/workflows/tool-input/types'

/** What the plan's names resolve against in the workspace it is created in. */
export interface CompileContext {
  /** Model id as blocks store it (`vllm/<name>`). */
  model: string
  knowledgeBases: readonly { id: string; name: string }[]
  /** The workspace's Nexora Connect MCP server and its connected services; absent without Connect. */
  connect?: { serverId: string; services: readonly string[] }
}

type CopilotPlanErrorCode =
  | 'reference-unknown'
  | 'reference-unreachable'
  | 'branch-unknown'
  | 'branch-cycle'
  | 'branch-invalid'

/** A plan that cannot become a working workflow; `detail` says why, in French, for the model to fix. */
export class CopilotPlanError extends Error {
  constructor(
    readonly code: CopilotPlanErrorCode,
    readonly detail: string
  ) {
    super(`${code}: ${detail}`)
    this.name = 'CopilotPlanError'
  }
}

interface SubBlock {
  id: string
  type: string
  value: unknown
}

interface CompiledBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  enabled: boolean
  subBlocks: Record<string, SubBlock>
  outputs: Record<string, never>
}

interface CompiledEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

interface CompiledWorkflowState {
  blocks: Record<string, CompiledBlock>
  edges: CompiledEdge[]
  loops: Record<string, never>
  parallels: Record<string, never>
  metadata: { name: string; description: string }
}

const TRIGGER_REFERENCE = 'declencheur'
const COLUMN_WIDTH = 420
const ROW_HEIGHT = 260
const TIMEZONE = 'Europe/Paris'
const DEFAULT_TIME = '09:00'
/** Waits up to this long run in-process; longer ones pause the run on disk (the block's limit). */
const MAX_INLINE_WAIT_SECONDS = 300
/** Nexora Connect's generic tools: find an action, read how to call it, call it. */
const CONNECT_TOOLS = ['search_actions', 'get_action_guide', 'execute_action'] as const

const WEEKDAY_IDS = {
  lundi: 'MON',
  mardi: 'TUE',
  mercredi: 'WED',
  jeudi: 'THU',
  vendredi: 'FRI',
  samedi: 'SAT',
  dimanche: 'SUN',
} as const

const TRIGGER_BLOCKS = {
  manuel: { type: 'start_trigger', name: 'Start' },
  chat: { type: 'start_trigger', name: 'Start' },
  webhook: { type: 'generic_webhook', name: 'Webhook' },
  planification: { type: 'schedule', name: 'Planification' },
} as const

const START_OUTPUTS = ['input', 'conversationId', 'files']
const AGENT_METADATA_OUTPUTS = ['model', 'tokens', 'toolCalls']

/** What a later step may read from each kind of step (first path segment). */
function stepOutputs(step: CopilotStep): string[] {
  switch (step.kind) {
    case 'agent':
      return [
        ...(step.output ? step.output.fields.map((f) => f.name) : ['content']),
        ...AGENT_METADATA_OUTPUTS,
      ]
    case 'condition':
      return ['conditionResult', 'selectedPath', 'selectedOption', 'selectedTitle']
    case 'api':
      return ['data', 'status', 'headers']
    case 'attente':
      return ['waitDuration', 'status', 'resumeAt']
    case 'validation_humaine':
      return ['url', 'resumeEndpoint', 'response', 'submission', 'resumeInput', 'submittedAt']
    case 'reponse':
      return ['data', 'status', 'headers']
  }
}

/** Trigger fields a step may read; `null` when the trigger's payload is open (webhook). */
function triggerOutputs(trigger: CopilotTrigger): string[] | null {
  switch (trigger.kind) {
    case 'manuel':
      return [...trigger.fields.map((f) => f.name), ...START_OUTPUTS]
    case 'chat':
      return START_OUTPUTS
    case 'webhook':
      return null
    case 'planification':
      return []
  }
}

function comparable(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
}

/** Longest service or knowledge base name the generation prompt shows whole. */
const PROMPT_NAME_LENGTH = 79
const TRAILING_ELLIPSIS = /\s*(…|\.\.\.)\s*$/

/** A workspace name as the generation prompt lists it: cut with « … » past the limit. */
export function promptName(name: string): string {
  return truncate(name, PROMPT_NAME_LENGTH, '…')
}

/**
 * The item a plan names: by its whole name (accents and case aside), or by the prompt's cut form
 * when exactly one item starts that way; two items sharing the cut form are never guessed between.
 */
function findByName<T>(
  items: readonly T[],
  nameOf: (item: T) => string,
  wanted: string
): T | undefined {
  const target = comparable(wanted)
  const exact = items.find((item) => comparable(nameOf(item)) === target)
  if (exact) return exact
  const cut = wanted.replace(TRAILING_ELLIPSIS, '').trim()
  if (cut.length < PROMPT_NAME_LENGTH - 1) return undefined
  const prefix = comparable(cut)
  const candidates = items.filter((item) => comparable(nameOf(item)).startsWith(prefix))
  return candidates.length === 1 ? candidates[0] : undefined
}

function quoted(names: readonly string[]): string {
  return names.map((name) => `« ${name} »`).join(', ')
}

function sub(id: string, type: string, value: unknown): SubBlock {
  return { id, type, value }
}

interface BranchMembership {
  condition: string
  side: 'if' | 'else'
}

/** The step graph: who follows whom, and through which condition handle. */
interface StepGraph {
  /** Step names, in plan order, not inside any condition branch. */
  mainLine: string[]
  membership: Map<string, BranchMembership>
  /** Edges between plan nodes (`null` source is the trigger). */
  links: { from: string | null; to: string; handle: 'source' | 'if' | 'else' }[]
}

function buildGraph(plan: CopilotPlan): StepGraph {
  const indexByName = new Map(plan.steps.map((step, index) => [step.name, index]))
  const membership = new Map<string, BranchMembership>()
  const branches = new Map<string, Record<'if' | 'else', string[]>>()

  plan.steps.forEach((step, conditionIndex) => {
    if (step.kind !== 'condition') return
    const sides = { if: step.then, else: step.else }
    const sorted: Record<'if' | 'else', string[]> = { if: [], else: [] }
    for (const side of ['if', 'else'] as const) {
      for (const target of sides[side]) {
        const targetIndex = indexByName.get(target)
        if (targetIndex === undefined) {
          throw new CopilotPlanError(
            'branch-unknown',
            `La condition « ${step.name} » renvoie vers l'étape « ${target} », qui n'existe pas.`
          )
        }
        if (targetIndex <= conditionIndex) {
          throw new CopilotPlanError(
            'branch-cycle',
            `La condition « ${step.name} » renvoie vers « ${target} », qui ne vient pas après elle : les branches ne peuvent pas revenir en arrière.`
          )
        }
        if (plan.steps[targetIndex].kind === 'condition') {
          throw new CopilotPlanError(
            'branch-invalid',
            `La condition « ${target} » ne peut pas se trouver dans une branche de « ${step.name} ».`
          )
        }
        if (membership.has(target)) {
          throw new CopilotPlanError(
            'branch-invalid',
            `L'étape « ${target} » est dans plusieurs branches : chaque étape appartient à une seule branche.`
          )
        }
        membership.set(target, { condition: step.name, side })
        sorted[side].push(target)
      }
      sorted[side].sort((a, b) => (indexByName.get(a) ?? 0) - (indexByName.get(b) ?? 0))
    }
    branches.set(step.name, sorted)
  })

  const mainLine = plan.steps.map((s) => s.name).filter((name) => !membership.has(name))
  const nextMain = (name: string): string | undefined => {
    const index = indexByName.get(name) ?? -1
    return mainLine.find((candidate) => (indexByName.get(candidate) ?? -1) > index)
  }

  const links: StepGraph['links'] = [{ from: null, to: mainLine[0], handle: 'source' }]
  for (const name of mainLine) {
    const sorted = branches.get(name)
    if (!sorted) {
      const next = nextMain(name)
      if (next) links.push({ from: name, to: next, handle: 'source' })
      continue
    }
    const join = nextMain(name)
    for (const side of ['if', 'else'] as const) {
      const members = sorted[side]
      if (members.length === 0) {
        if (join) links.push({ from: name, to: join, handle: side })
        continue
      }
      links.push({ from: name, to: members[0], handle: side })
      members.slice(1).forEach((member, index) => {
        links.push({ from: members[index], to: member, handle: 'source' })
      })
      if (join) links.push({ from: members[members.length - 1], to: join, handle: 'source' })
    }
  }
  return { mainLine, membership, links }
}

/** Steps that have run whenever each step runs, and each step's column (longest path). */
function analyseGraph(
  plan: CopilotPlan,
  graph: StepGraph
): { ancestors: Map<string, Set<string>>; columns: Map<string, number> } {
  const predecessors = new Map<string, string[]>(plan.steps.map((s) => [s.name, []]))
  for (const link of graph.links) {
    if (link.from !== null) predecessors.get(link.to)?.push(link.from)
  }
  const ancestors = new Map<string, Set<string>>()
  const columns = new Map<string, number>()
  const visit = (name: string): void => {
    if (ancestors.has(name)) return
    const paths: Set<string>[] = []
    let column = 1
    for (const predecessor of predecessors.get(name) ?? []) {
      visit(predecessor)
      const throughPredecessor = new Set(ancestors.get(predecessor))
      throughPredecessor.add(predecessor)
      paths.push(throughPredecessor)
      column = Math.max(column, (columns.get(predecessor) ?? 0) + 1)
    }
    // A join runs after whichever branch was taken: only steps on every path have surely run.
    const [first, ...others] = paths
    const own = first
      ? new Set([...first].filter((step) => others.every((path) => path.has(step))))
      : new Set<string>()
    ancestors.set(name, own)
    columns.set(name, column)
  }
  for (const step of plan.steps) visit(step.name)
  return { ancestors, columns }
}

const REFERENCE = /\{\{([^{}]*)\}\}/g
const REFERENCE_BODY = /^([a-z][a-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)((?:\.[A-Za-z0-9_]+)*)$/

/** Validates `{{x.y}}` references and rewrites them to the editor's `<block.y>` form. */
function createReferenceResolver(
  plan: CopilotPlan,
  triggerName: string,
  ancestors: Map<string, Set<string>>
) {
  const stepsByName = new Map(plan.steps.map((step) => [step.name, step]))
  const triggerFields = triggerOutputs(plan.trigger)

  const resolve = (raw: string, readerName: string): string => {
    const body = raw.trim()
    const match = REFERENCE_BODY.exec(body)
    if (!match) {
      throw new CopilotPlanError(
        'reference-unknown',
        `L'étape « ${readerName} » contient « {{${body}}} », qui n'est pas une référence valide : écrivez {{nom_etape.champ}} ou {{declencheur.champ}}.`
      )
    }
    const [, source, field, rest] = match

    if (source === TRIGGER_REFERENCE) {
      if (triggerFields !== null && !triggerFields.includes(field)) {
        throw new CopilotPlanError(
          'reference-unknown',
          triggerFields.length === 0
            ? `L'étape « ${readerName} » lit « {{${body}}} », mais une planification ne transmet aucune donnée.`
            : `L'étape « ${readerName} » lit « {{${body}}} », mais le déclencheur n'a pas de champ « ${field} » (champs : ${quoted(triggerFields)}).`
        )
      }
      return `<${normalizeWorkflowBlockName(triggerName)}.${field}${rest}>`
    }

    const sourceStep = stepsByName.get(source)
    if (!sourceStep) {
      throw new CopilotPlanError(
        'reference-unknown',
        `L'étape « ${readerName} » lit « {{${body}}} », mais l'étape « ${source} » n'existe pas.`
      )
    }
    const outputs = stepOutputs(sourceStep)
    if (!outputs.includes(field)) {
      throw new CopilotPlanError(
        'reference-unknown',
        `L'étape « ${readerName} » lit « {{${body}}} », mais l'étape « ${source} » n'a pas de sortie « ${field} » (sorties : ${quoted(outputs)}).`
      )
    }
    if (!ancestors.get(readerName)?.has(source)) {
      throw new CopilotPlanError(
        'reference-unreachable',
        `L'étape « ${readerName} » lit « {{${body}}} », mais l'étape « ${source} » ne s'exécute pas toujours avant elle.`
      )
    }
    return `<${normalizeWorkflowBlockName(source)}.${field}${rest}>`
  }

  return {
    /** A text with every reference rewritten. */
    text: (value: string, readerName: string): string =>
      value.replace(REFERENCE, (_whole, inner: string) => resolve(inner, readerName)),
    /** A condition operand, written `step.field` or `{{step.field}}`. */
    operand: (ref: string, readerName: string): string =>
      resolve(ref.replace(/^\s*\{\{|\}\}\s*$/g, ''), readerName),
  }
}

type ReferenceResolver = ReturnType<typeof createReferenceResolver>

function inputFormatField(name: string, type: string, description: string) {
  return { id: generateId(), name, type, value: '', description, collapsed: false }
}

function builderField(name: string, value: string) {
  return { id: generateId(), name, type: 'string', value, collapsed: false }
}

function scheduleSubBlocks(
  trigger: Extract<CopilotTrigger, { kind: 'planification' }>,
  warnings: string[]
): SubBlock[] {
  const time = trigger.time ?? DEFAULT_TIME
  const timezone = sub('timezone', 'dropdown', TIMEZONE)
  if (trigger.interval !== undefined && !['minutes', 'heure'].includes(trigger.frequency)) {
    warnings.push(
      `Planification : l'intervalle ${trigger.interval} est ignoré pour cette fréquence.`
    )
  }
  switch (trigger.frequency) {
    case 'minutes':
      return [
        sub('scheduleType', 'dropdown', 'minutes'),
        sub('minutesInterval', 'short-input', String(trigger.interval ?? 15)),
        timezone,
      ]
    case 'heure': {
      const minute = String(Number((trigger.time ?? '00:00').slice(3)))
      const interval = Math.min(trigger.interval ?? 1, 23)
      if ((trigger.interval ?? 1) > 23) {
        warnings.push('Planification : intervalle ramené à 23 heures.')
      }
      if (interval > 1) {
        return [
          sub('scheduleType', 'dropdown', 'custom'),
          sub('cronExpression', 'short-input', `${minute} */${interval} * * *`),
          timezone,
        ]
      }
      return [
        sub('scheduleType', 'dropdown', 'hourly'),
        sub('hourlyMinute', 'short-input', minute),
        timezone,
      ]
    }
    case 'jour':
      return [
        sub('scheduleType', 'dropdown', 'daily'),
        sub('dailyTime', 'time-input', time),
        timezone,
      ]
    case 'semaine':
      return [
        sub('scheduleType', 'dropdown', 'weekly'),
        sub('weeklyDay', 'dropdown', WEEKDAY_IDS[trigger.weekday ?? 'lundi']),
        sub('weeklyDayTime', 'time-input', time),
        timezone,
      ]
    case 'mois':
      return [
        sub('scheduleType', 'dropdown', 'monthly'),
        sub('monthlyDay', 'short-input', String(trigger.dayOfMonth ?? 1)),
        sub('monthlyTime', 'time-input', time),
        timezone,
      ]
  }
}

function triggerSubBlocks(trigger: CopilotTrigger, warnings: string[]): SubBlock[] {
  switch (trigger.kind) {
    case 'manuel':
      return [
        sub(
          'inputFormat',
          'input-format',
          trigger.fields.map((field) => inputFormatField(field.name, 'string', field.description))
        ),
      ]
    case 'chat':
      return [sub('inputFormat', 'input-format', [])]
    case 'webhook':
      return [sub('requireAuth', 'switch', true), sub('token', 'short-input', generateId())]
    case 'planification':
      return scheduleSubBlocks(trigger, warnings)
  }
}

/** The knowledge search tool entry, as the tool picker stores it. */
function knowledgeTool(knowledgeBaseId: string): StoredTool {
  return {
    type: 'knowledge',
    title: 'Knowledge', // i18n-ignore: persisted tool title, as the tool picker stores it
    toolId: 'knowledge_search',
    operation: 'search',
    params: { knowledgeBaseSelector: knowledgeBaseId },
    isExpanded: false,
    usageControl: 'auto',
  }
}

/** A Nexora Connect MCP tool entry, as the tool picker stores it (schema discovered at run time). */
function connectTool(serverId: string, toolName: string): StoredTool {
  return {
    type: 'mcp',
    title: toolName,
    toolId: createMcpToolId(serverId, toolName),
    params: { serverId, toolName, serverName: NEXORA_CONNECT_SERVER_NAME },
    isExpanded: false,
    usageControl: 'auto',
  }
}

function agentSubBlocks(
  step: Extract<CopilotStep, { kind: 'agent' }>,
  context: CompileContext,
  refs: ReferenceResolver,
  warnings: string[]
): SubBlock[] {
  const tools: StoredTool[] = []
  const notes: string[] = []

  if (step.services.length > 0) {
    if (!context.connect) {
      warnings.push(
        `Étape « ${step.name} » : Nexora Connect n'est pas configuré, services ignorés (${quoted(step.services)}).`
      )
    } else {
      const known: string[] = []
      for (const service of step.services) {
        const match = findByName(context.connect.services, (name) => name, service)
        if (match && !known.includes(match)) known.push(match)
        if (!match) {
          warnings.push(
            `Étape « ${step.name} » : service « ${service} » inconnu ou non connecté, ignoré.`
          )
        }
      }
      if (known.length > 0) {
        const { serverId } = context.connect
        tools.push(...CONNECT_TOOLS.map((tool) => connectTool(serverId, tool)))
        notes.push(
          `Services connectés à utiliser via Nexora Connect : ${known.join(', ')}. Trouvez l'action avec search_actions, lisez son mode d'emploi avec get_action_guide, puis exécutez-la avec execute_action.`
        )
      }
    }
  }

  if (step.knowledgeBases.length > 0) {
    const known: { id: string; name: string }[] = []
    for (const name of step.knowledgeBases) {
      const match = findByName(context.knowledgeBases, (kb) => kb.name, name)
      if (match && !known.includes(match)) known.push(match)
      if (!match) {
        warnings.push(
          `Étape « ${step.name} » : base de connaissances « ${name} » introuvable, ignorée.`
        )
      }
    }
    if (known.length > 0) {
      tools.push(...known.map((kb) => knowledgeTool(kb.id)))
      notes.push(
        `Avant de répondre, recherchez l'information dans ${known.length > 1 ? 'les bases de connaissances' : 'la base de connaissances'} ${quoted(known.map((kb) => kb.name))}.`
      )
    }
  }

  const system = [refs.text(step.instructions, step.name), ...notes].join('\n\n')
  const subBlocks = [
    sub('messages', 'messages-input', [
      { role: 'system', content: system },
      { role: 'user', content: refs.text(step.message, step.name) },
    ]),
    sub('model', 'combobox', context.model),
    sub('tools', 'tool-input', tools),
  ]
  if (step.output) {
    const properties = Object.fromEntries(
      step.output.fields.map((field) => [field.name, { type: field.type }])
    )
    const responseFormat = {
      name: step.name,
      schema: {
        type: 'object',
        properties,
        required: step.output.fields.map((field) => field.name),
        additionalProperties: false,
      },
      strict: true,
    }
    subBlocks.push(sub('responseFormat', 'code', JSON.stringify(responseFormat, null, 2)))
  }
  return subBlocks
}

/** The condition rule as a JavaScript expression; the compared value is always a literal. */
function conditionExpression(
  step: Extract<CopilotStep, { kind: 'condition' }>,
  refs: ReferenceResolver
): string {
  const operand = refs.operand(step.if.ref, step.name)
  const textOf = `String(${operand} ?? '').trim().toLowerCase()`
  const expected = (step.if.value ?? '').toLowerCase()
  switch (step.if.operator) {
    case 'contient':
      return `${textOf}.includes(${JSON.stringify(expected)})`
    case 'egal':
      return `${textOf} === ${JSON.stringify(expected)}`
    case 'different':
      return `${textOf} !== ${JSON.stringify(expected)}`
    case 'superieur':
      return `Number(${operand}) > ${Number(step.if.value)}`
    case 'inferieur':
      return `Number(${operand}) < ${Number(step.if.value)}`
    case 'vide':
      return `${textOf} === ''`
    case 'non_vide':
      return `${textOf} !== ''`
  }
}

function waitSubBlocks(
  step: Extract<CopilotStep, { kind: 'attente' }>,
  warnings: string[]
): SubBlock[] {
  const { seconds } = step
  if (seconds <= MAX_INLINE_WAIT_SECONDS) {
    return [
      sub('timeValue', 'short-input', String(seconds)),
      sub('timeUnit', 'dropdown', 'seconds'),
      sub('async', 'switch', false),
    ]
  }
  let amount: number
  let unit: 'days' | 'hours' | 'minutes'
  if (seconds % 86_400 === 0) {
    amount = seconds / 86_400
    unit = 'days'
  } else if (seconds % 3600 === 0) {
    amount = seconds / 3600
    unit = 'hours'
  } else {
    amount = Math.ceil(seconds / 60)
    unit = 'minutes'
    if (seconds % 60 !== 0) {
      warnings.push(`Étape « ${step.name} » : attente arrondie à ${amount} minutes.`)
    }
  }
  return [
    sub('timeValue', 'short-input', String(amount)),
    sub('timeUnitLong', 'dropdown', unit),
    sub('async', 'switch', true),
  ]
}

function stepBlockType(step: CopilotStep): string {
  switch (step.kind) {
    case 'agent':
      return 'agent'
    case 'condition':
      return 'condition'
    case 'api':
      return 'api'
    case 'attente':
      return 'wait'
    case 'validation_humaine':
      return 'human_in_the_loop_v2'
    case 'reponse':
      return 'response'
  }
}

function stepSubBlocks(
  step: CopilotStep,
  blockId: string,
  context: CompileContext,
  refs: ReferenceResolver,
  warnings: string[]
): SubBlock[] {
  switch (step.kind) {
    case 'agent':
      return agentSubBlocks(step, context, refs, warnings)
    case 'condition':
      return [
        sub(
          'conditions',
          'condition-input',
          JSON.stringify([
            { id: `${blockId}-if`, title: 'if', value: conditionExpression(step, refs) },
            { id: `${blockId}-else`, title: 'else', value: '' },
          ])
        ),
      ]
    case 'api': {
      const subBlocks = [
        sub('url', 'short-input', refs.text(step.url, step.name)),
        sub('method', 'dropdown', step.method),
        sub('redirectPolicyVersion', 'short-input', 'standard-v1'),
      ]
      if (step.body !== undefined) {
        subBlocks.push(sub('body', 'code', refs.text(step.body, step.name)))
      }
      return subBlocks
    }
    case 'attente':
      return waitSubBlocks(step, warnings)
    case 'validation_humaine':
      return [
        sub('builderData', 'response-format', [
          builderField('message', refs.text(step.message, step.name)),
        ]),
        sub('notification', 'tool-input', []),
        sub('inputFormat', 'input-format', [
          inputFormatField('approuve', 'boolean', 'Approuvez-vous ?'),
          inputFormatField('commentaire', 'string', 'Commentaire'),
        ]),
      ]
    case 'reponse':
      return [
        sub('dataMode', 'dropdown', 'structured'),
        sub(
          'builderData',
          'response-format',
          step.fields.map((field) => builderField(field.name, refs.text(field.value, step.name)))
        ),
      ]
  }
}

function toBlock(
  id: string,
  type: string,
  name: string,
  position: { x: number; y: number },
  subBlocks: SubBlock[]
): CompiledBlock {
  return {
    id,
    type,
    name,
    position,
    enabled: true,
    subBlocks: Object.fromEntries(subBlocks.map((subBlock) => [subBlock.id, subBlock])),
    outputs: {},
  }
}

/**
 * Compiles a validated plan into workflow state the importer reads (`parseWorkflowJson`):
 * one trigger block, one block per step named after it, edges in plan order with condition
 * branches on the condition block's `if` / `else` handles, laid out left to right.
 * Unknown services and knowledge bases become French warnings; anything that would produce a
 * broken workflow (unknown or unreachable reference, invalid branch) throws `CopilotPlanError`.
 */
export function compilePlan(
  plan: CopilotPlan,
  context: CompileContext
): { state: CompiledWorkflowState; warnings: string[] } {
  const warnings: string[] = []
  const graph = buildGraph(plan)
  const { ancestors, columns } = analyseGraph(plan, graph)
  const trigger = TRIGGER_BLOCKS[plan.trigger.kind]
  const refs = createReferenceResolver(plan, trigger.name, ancestors)

  const triggerId = generateId()
  const ids = new Map(plan.steps.map((step) => [step.name, generateId()]))
  const idOf = (name: string): string => ids.get(name) ?? ''

  const blocks: Record<string, CompiledBlock> = {
    [triggerId]: toBlock(
      triggerId,
      trigger.type,
      trigger.name,
      { x: 0, y: 0 },
      triggerSubBlocks(plan.trigger, warnings)
    ),
  }
  for (const step of plan.steps) {
    const id = idOf(step.name)
    const side = graph.membership.get(step.name)?.side
    const row = side === 'if' ? -1 : side === 'else' ? 1 : 0
    const position = { x: (columns.get(step.name) ?? 1) * COLUMN_WIDTH, y: row * ROW_HEIGHT }
    blocks[id] = toBlock(
      id,
      stepBlockType(step),
      step.name,
      position,
      stepSubBlocks(step, id, context, refs, warnings)
    )
  }

  const edges: CompiledEdge[] = graph.links.map((link) => {
    const source = link.from === null ? triggerId : idOf(link.from)
    return {
      id: generateId(),
      source,
      target: idOf(link.to),
      sourceHandle: link.handle === 'source' ? 'source' : `condition-${source}-${link.handle}`,
      targetHandle: 'target',
    }
  })

  return {
    state: {
      blocks,
      edges,
      loops: {},
      parallels: {},
      metadata: { name: plan.title, description: plan.description ?? '' },
    },
    warnings,
  }
}
