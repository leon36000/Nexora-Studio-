import { isRecordLike, toArray, toRecord } from '@sim/utils/object'
import { catalogEntryOf, isTriggerType } from '@/lib/nexora/steps/catalog'

/** Why the Steps view cannot rewrite a workflow; each has a message under `steps.view.refusal`. */
export type StepsRefusal =
  | 'no-trigger'
  | 'several-triggers'
  | 'unknown-block'
  | 'disabled-block'
  | 'locked-block'
  | 'subflow'
  | 'extra-edges'
  | 'unreachable'
  | 'branch-in-branch'

export interface StepNode {
  blockId: string
  name: string
  /** The catalog entry the block is. */
  entryId: string
  blockType: string
  /** Only a condition has branches; their steps are never conditions. */
  branches?: { if: StepNode[]; else: StepNode[] }
}

export interface StepsDocument {
  trigger: { blockId: string; name: string; type: string }
  /** The main line, in order. */
  steps: StepNode[]
}

export type StepsReading =
  | { recognized: true; document: StepsDocument }
  | { recognized: false; reasons: StepsRefusal[]; order: string[] }

export type LinkHandle = 'source' | 'if' | 'else'

export interface StepLink {
  from: string
  handle: LinkHandle
  to: string
}

/**
 * The edges a document stands for, as `compilePlan` draws them: a line from step to step, each
 * condition branch chained from the condition's handle and rejoining the step after the condition
 * (an empty branch goes straight to it; with nothing after, the branches simply end).
 */
export function linksOf(document: StepsDocument): StepLink[] {
  const links: StepLink[] = []
  const { steps } = document
  if (steps.length > 0) {
    links.push({ from: document.trigger.blockId, handle: 'source', to: steps[0].blockId })
  }
  steps.forEach((step, index) => {
    const next = steps[index + 1]?.blockId
    if (!step.branches) {
      if (next) links.push({ from: step.blockId, handle: 'source', to: next })
      return
    }
    for (const side of ['if', 'else'] as const) {
      const members = step.branches[side]
      if (members.length === 0) {
        if (next) links.push({ from: step.blockId, handle: side, to: next })
        continue
      }
      links.push({ from: step.blockId, handle: side, to: members[0].blockId })
      members.slice(1).forEach((member, i) => {
        links.push({ from: members[i].blockId, handle: 'source', to: member.blockId })
      })
      if (next) links.push({ from: members[members.length - 1].blockId, handle: 'source', to: next })
    }
  })
  return links
}

interface RawBlock {
  id: string
  type: string
  name: string
  enabled: boolean
  locked: boolean
  parentId: string | null
  position: { x: number; y: number }
  raw: Record<string, unknown>
}

interface RawEdge {
  source: string
  target: string
  handle: LinkHandle | 'other'
}

/** The handle an edge leaves its source by: `source`, a condition's `if` / `else`, or `other` (an error handle…). */
export function edgeHandleOf(source: string, sourceHandle: unknown): LinkHandle | 'other' {
  if (sourceHandle === undefined || sourceHandle === null || sourceHandle === 'source') return 'source'
  if (sourceHandle === `condition-${source}-if`) return 'if'
  if (sourceHandle === `condition-${source}-else`) return 'else'
  return 'other'
}

function readBlocks(state: Record<string, unknown>): RawBlock[] {
  const blocks: RawBlock[] = []
  for (const [key, value] of Object.entries(toRecord(state.blocks))) {
    if (!isRecordLike(value) || typeof value.type !== 'string') continue
    const position = toRecord(value.position)
    const parentId = toRecord(value.data).parentId
    blocks.push({
      id: typeof value.id === 'string' ? value.id : key,
      type: value.type,
      name: typeof value.name === 'string' ? value.name : '',
      enabled: value.enabled !== false,
      locked: value.locked === true,
      parentId: typeof parentId === 'string' ? parentId : null,
      position: {
        x: typeof position.x === 'number' ? position.x : 0,
        y: typeof position.y === 'number' ? position.y : 0,
      },
      raw: value,
    })
  }
  return blocks
}

function readEdges(state: Record<string, unknown>): RawEdge[] {
  const edges: RawEdge[] = []
  for (const edge of toArray(state.edges)) {
    if (!isRecordLike(edge) || typeof edge.source !== 'string' || typeof edge.target !== 'string') continue
    edges.push({
      source: edge.source,
      target: edge.target,
      handle: edgeHandleOf(edge.source, edge.sourceHandle),
    })
  }
  return edges
}

/** Every block, the trigger first, then along the edges, then by position: what a read-only view lists. */
function fallbackOrder(blocks: RawBlock[], edges: RawEdge[]): string[] {
  const ids = new Set(blocks.map((block) => block.id))
  const order: string[] = []
  const seen = new Set<string>()
  const visit = (id: string): void => {
    if (seen.has(id) || !ids.has(id)) return
    seen.add(id)
    order.push(id)
    for (const edge of edges) if (edge.source === id) visit(edge.target)
  }
  for (const trigger of blocks.filter((block) => isTriggerType(block.type))) visit(trigger.id)
  const rest = blocks
    .filter((block) => !seen.has(block.id))
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
  for (const block of rest) visit(block.id)
  return order
}

const refuse = (reasons: Iterable<StepsRefusal>, blocks: RawBlock[], edges: RawEdge[]): StepsReading => ({
  recognized: false,
  reasons: [...new Set(reasons)],
  order: fallbackOrder(blocks, edges),
})

/**
 * Reads a workflow state as steps, or says why it cannot: the shape must be exactly what the
 * Copilot and the SME templates build (one trigger, a line of catalog blocks, conditions with two
 * branches that rejoin), because the view rewrites the edges. Anything else stays in the canvas.
 */
export function readSteps(state: unknown): StepsReading {
  if (!isRecordLike(state)) return refuse(['no-trigger'], [], [])
  const blocks = readBlocks(state)
  const edges = readEdges(state)
  const reasons = new Set<StepsRefusal>()

  const triggers = blocks.filter((block) => isTriggerType(block.type))
  if (triggers.length === 0) reasons.add('no-trigger')
  if (triggers.length > 1) reasons.add('several-triggers')
  if (Object.keys(toRecord(state.loops)).length > 0 || Object.keys(toRecord(state.parallels)).length > 0) {
    reasons.add('subflow')
  }
  for (const block of blocks) {
    if (block.type === 'loop' || block.type === 'parallel' || block.parentId) reasons.add('subflow')
    else if (!isTriggerType(block.type) && catalogEntryOf({ type: block.type, subBlocks: block.raw.subBlocks }) === null) {
      reasons.add('unknown-block')
    }
    if (!block.enabled) reasons.add('disabled-block')
    if (block.locked) reasons.add('locked-block')
  }
  if (reasons.size > 0) return refuse(reasons, blocks, edges)

  const byId = new Map(blocks.map((block) => [block.id, block]))
  const outgoing = new Map<string, RawEdge[]>()
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])

  const entryIdOf = (block: RawBlock): string =>
    catalogEntryOf({ type: block.type, subBlocks: block.raw.subBlocks })?.id ?? ''
  const isCondition = (block: RawBlock): boolean => block.type === 'condition'
  const nodeOf = (block: RawBlock): StepNode => ({
    blockId: block.id,
    name: block.name,
    entryId: entryIdOf(block),
    blockType: block.type,
  })

  /** The single edge leaving `id` by `handle`; `undefined` when none, `null` when several. */
  const leaving = (id: string, handle: LinkHandle): string | undefined | null => {
    const matching = (outgoing.get(id) ?? []).filter((edge) => edge.handle === handle)
    if (matching.length > 1) return null
    return matching[0]?.target
  }
  const hasOtherHandles = (block: RawBlock): boolean =>
    (outgoing.get(block.id) ?? []).some((edge) =>
      isCondition(block) ? edge.handle === 'source' || edge.handle === 'other' : edge.handle !== 'source'
    )

  /** Blocks along the `source` handle from `start`, stopping after a condition or a repeat. */
  const chainFrom = (start: string | undefined): string[] => {
    const chain: string[] = []
    let current = start
    while (current !== undefined && byId.has(current) && !chain.includes(current)) {
      chain.push(current)
      const block = byId.get(current)
      if (!block || isCondition(block)) break
      const next = leaving(current, 'source')
      current = next === null ? undefined : next
    }
    return chain
  }

  const trigger = triggers[0]
  const visited = new Set<string>([trigger.id])
  const steps: StepNode[] = []
  let current = leaving(trigger.id, 'source')
  if (current === null || hasOtherHandles(trigger)) return refuse(['extra-edges'], blocks, edges)

  while (current !== undefined) {
    const block = byId.get(current)
    if (!block || visited.has(current)) return refuse(['extra-edges'], blocks, edges)
    visited.add(current)
    if (hasOtherHandles(block)) return refuse(['extra-edges'], blocks, edges)
    if (!isCondition(block)) {
      steps.push(nodeOf(block))
      const next = leaving(current, 'source')
      if (next === null) return refuse(['extra-edges'], blocks, edges)
      current = next
      continue
    }

    const ifTarget = leaving(current, 'if')
    const elseTarget = leaving(current, 'else')
    if (ifTarget === null || elseTarget === null) return refuse(['extra-edges'], blocks, edges)
    const ifChain = chainFrom(ifTarget)
    const elseChain = chainFrom(elseTarget)
    const elseSet = new Set(elseChain)
    const join = ifChain.find((id) => elseSet.has(id))
    const cut = (chain: string[]): string[] => (join === undefined ? chain : chain.slice(0, chain.indexOf(join)))
    const members = { if: cut(ifChain), else: cut(elseChain) }
    const memberBlocks = { if: members.if.map((id) => byId.get(id)), else: members.else.map((id) => byId.get(id)) }
    for (const side of ['if', 'else'] as const) {
      for (const member of memberBlocks[side]) {
        if (!member) return refuse(['extra-edges'], blocks, edges)
        if (isCondition(member)) return refuse(['branch-in-branch'], blocks, edges)
        if (visited.has(member.id)) return refuse(['extra-edges'], blocks, edges)
      }
    }
    const nodes = {
      if: memberBlocks.if.flatMap((member) => (member ? [nodeOf(member)] : [])),
      else: memberBlocks.else.flatMap((member) => (member ? [nodeOf(member)] : [])),
    }
    for (const member of [...members.if, ...members.else]) visited.add(member)
    steps.push({ ...nodeOf(block), branches: nodes })
    current = join
  }

  const document: StepsDocument = {
    trigger: { blockId: trigger.id, name: trigger.name, type: trigger.type },
    steps,
  }
  const key = (from: string, handle: string, to: string): string => `${from}|${handle}|${to}`
  const expected = linksOf(document).map((link) => key(link.from, link.handle, link.to)).sort()
  const actual = edges.map((edge) => key(edge.source, edge.handle, edge.target)).sort()
  if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index])) {
    return refuse(['extra-edges'], blocks, edges)
  }
  if (blocks.some((block) => !visited.has(block.id))) return refuse(['unreachable'], blocks, edges)
  return { recognized: true, document }
}
