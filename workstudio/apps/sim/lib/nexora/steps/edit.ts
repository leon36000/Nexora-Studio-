import { generateId } from '@sim/utils/id'
import type { CatalogEntry } from '@/lib/nexora/steps/catalog'
import {
  edgeHandleOf,
  type LinkHandle,
  linksOf,
  readSteps,
  type StepNode,
  type StepsDocument,
} from '@/lib/nexora/steps/read'

const COLUMN_WIDTH = 420
const ROW_HEIGHT = 260

type EditErrorCode = 'not-recognized' | 'unknown-anchor' | 'condition-in-branch' | 'trigger-fixed'

/** An edit the Steps view cannot make; the view never offers these, the code guards the rest. */
export class StepsEditError extends Error {
  constructor(readonly code: EditErrorCode) {
    super(code)
    this.name = 'StepsEditError'
  }
}

export interface StepsBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  enabled: boolean
  subBlocks: Record<string, { id: string; type: string; value: unknown }>
  [key: string]: unknown
}

export interface StepsEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

export interface StepsState {
  blocks: Record<string, StepsBlock>
  edges: StepsEdge[]
  [key: string]: unknown
}

/** A block to create: the editor fills its sub-blocks from the registry, then applies `preset`. */
interface PatchBlock {
  id: string
  type: string
  name: string
  preset: Record<string, unknown>
}

/** What an edit changes in the workflow; applying it to the editor's store is the caller's job. */
export interface StepsPatch {
  addBlocks: PatchBlock[]
  removeBlockIds: string[]
  addEdges: StepsEdge[]
  removeEdgeIds: string[]
  /** New position of each block that moves (every new block included). */
  positions: Record<string, { x: number; y: number }>
}

export type InsertPoint = { after: string } | { branch: { condition: string; side: 'if' | 'else' } }

/**
 * Where each block sits: the trigger at the origin, the main line left to right, a condition's
 * branches one row above (« oui ») and below (« sinon ») — the layout `compilePlan` draws.
 */
export function layoutPositions(document: StepsDocument): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {
    [document.trigger.blockId]: { x: 0, y: 0 },
  }
  let column = 1
  for (const step of document.steps) {
    positions[step.blockId] = { x: column * COLUMN_WIDTH, y: 0 }
    if (!step.branches) {
      column += 1
      continue
    }
    for (const side of ['if', 'else'] as const) {
      step.branches[side].forEach((member, index) => {
        positions[member.blockId] = {
          x: (column + 1 + index) * COLUMN_WIDTH,
          y: side === 'if' ? -ROW_HEIGHT : ROW_HEIGHT,
        }
      })
    }
    column += 1 + Math.max(step.branches.if.length, step.branches.else.length)
  }
  return positions
}

function documentOf(state: unknown): StepsDocument {
  const reading = readSteps(state)
  if (!reading.recognized) throw new StepsEditError('not-recognized')
  return structuredClone(reading.document)
}

interface Location {
  list: StepNode[]
  index: number
  /** The condition whose branch holds the step; `null` on the main line. */
  within: StepNode | null
}

function locate(document: StepsDocument, blockId: string): Location | null {
  const index = document.steps.findIndex((step) => step.blockId === blockId)
  if (index !== -1) return { list: document.steps, index, within: null }
  for (const step of document.steps) {
    for (const side of ['if', 'else'] as const) {
      const list = step.branches?.[side]
      const found = list?.findIndex((member) => member.blockId === blockId) ?? -1
      if (list && found !== -1) return { list, index: found, within: step }
    }
  }
  return null
}

const linkKey = (from: string, handle: LinkHandle, to: string): string => `${from}|${handle}|${to}`

const handleName = (from: string, handle: LinkHandle): string =>
  handle === 'source' ? 'source' : `condition-${from}-${handle}`

/** The patch that turns `state` (read as `before`) into `after`: edges recomputed, blocks laid out. */
function patchBetween(
  state: StepsState,
  before: StepsDocument,
  after: StepsDocument,
  blocks: { add: PatchBlock[]; remove: string[] },
  edgeId: () => string
): StepsPatch {
  const beforeKeys = new Set(linksOf(before).map((l) => linkKey(l.from, l.handle, l.to)))
  const afterLinks = linksOf(after)
  const afterKeys = new Set(afterLinks.map((l) => linkKey(l.from, l.handle, l.to)))
  const removed = new Set(blocks.remove)

  const removeEdgeIds = state.edges
    .filter((edge) => {
      const handle = edgeHandleOf(edge.source, edge.sourceHandle)
      const key = handle === 'other' ? '' : linkKey(edge.source, handle, edge.target)
      return !afterKeys.has(key) || removed.has(edge.source) || removed.has(edge.target)
    })
    .map((edge) => edge.id)
  const addEdges = afterLinks
    .filter((l) => !beforeKeys.has(linkKey(l.from, l.handle, l.to)))
    .map((l) => ({
      id: edgeId(),
      source: l.from,
      target: l.to,
      sourceHandle: handleName(l.from, l.handle),
      targetHandle: 'target',
    }))

  const layout = layoutPositions(after)
  const positions: StepsPatch['positions'] = {}
  for (const [id, position] of Object.entries(layout)) {
    const current = state.blocks[id]?.position
    if (!current || current.x !== position.x || current.y !== position.y) positions[id] = position
  }
  return {
    addBlocks: blocks.add,
    removeBlockIds: blocks.remove,
    addEdges,
    removeEdgeIds,
    positions,
  }
}

/** Adds `entry` as a new step at `point`: after a step (or the trigger), or first in a branch. */
export function planInsert(
  state: StepsState,
  point: InsertPoint,
  entry: CatalogEntry,
  block: { blockId: string; name: string },
  edgeId: () => string = generateId
): StepsPatch {
  const before = documentOf(state)
  const after = structuredClone(before)
  const isCondition = entry.blockType === 'condition'
  const node: StepNode = {
    blockId: block.blockId,
    name: block.name,
    entryId: entry.id,
    blockType: entry.blockType,
    ...(isCondition ? { branches: { if: [], else: [] } } : {}),
  }

  if ('branch' in point) {
    const condition = after.steps.find((step) => step.blockId === point.branch.condition)
    if (!condition?.branches) throw new StepsEditError('unknown-anchor')
    if (isCondition) throw new StepsEditError('condition-in-branch')
    condition.branches[point.branch.side].unshift(node)
  } else if (point.after === after.trigger.blockId) {
    after.steps.unshift(node)
  } else {
    const where = locate(after, point.after)
    if (!where) throw new StepsEditError('unknown-anchor')
    if (where.within && isCondition) throw new StepsEditError('condition-in-branch')
    where.list.splice(where.index + 1, 0, node)
  }

  const preset: Record<string, unknown> = { ...entry.preset }
  return patchBetween(
    state,
    before,
    after,
    { add: [{ id: block.blockId, type: entry.blockType, name: block.name, preset }], remove: [] },
    edgeId
  )
}

/** Removes a step; a condition takes the steps of its branches with it. The trigger stays. */
export function planRemove(
  state: StepsState,
  blockId: string,
  edgeId: () => string = generateId
): StepsPatch {
  const before = documentOf(state)
  if (blockId === before.trigger.blockId) throw new StepsEditError('trigger-fixed')
  const after = structuredClone(before)
  const where = locate(after, blockId)
  if (!where) throw new StepsEditError('unknown-anchor')
  const [removedNode] = where.list.splice(where.index, 1)
  const remove = [
    removedNode.blockId,
    ...(removedNode.branches
      ? [...removedNode.branches.if, ...removedNode.branches.else].map((member) => member.blockId)
      : []),
  ]
  return patchBetween(state, before, after, { add: [], remove }, edgeId)
}

/** Swaps a step with its neighbour in the same list; `null` at the end of the list. */
export function planMove(
  state: StepsState,
  blockId: string,
  direction: 'up' | 'down',
  edgeId: () => string = generateId
): StepsPatch | null {
  const before = documentOf(state)
  const after = structuredClone(before)
  const where = locate(after, blockId)
  if (!where) throw new StepsEditError('unknown-anchor')
  const target = where.index + (direction === 'up' ? -1 : 1)
  if (target < 0 || target >= where.list.length) return null
  const [moved] = where.list.splice(where.index, 1)
  where.list.splice(target, 0, moved)
  return patchBetween(state, before, after, { add: [], remove: [] }, edgeId)
}

/** The state with `patch` applied (new blocks hold only their preset); for tests and previews. */
export function applyPatch(state: StepsState, patch: StepsPatch): StepsState {
  const removed = new Set(patch.removeBlockIds)
  const removedEdges = new Set(patch.removeEdgeIds)
  const blocks: Record<string, StepsBlock> = {}
  for (const [id, block] of Object.entries(state.blocks)) {
    if (removed.has(id)) continue
    const position = patch.positions[id]
    blocks[id] = position ? { ...block, position } : block
  }
  for (const added of patch.addBlocks) {
    blocks[added.id] = {
      id: added.id,
      type: added.type,
      name: added.name,
      position: patch.positions[added.id] ?? { x: 0, y: 0 },
      enabled: true,
      subBlocks: Object.fromEntries(
        Object.entries(added.preset).map(([id, value]) => [id, { id, type: 'short-input', value }])
      ),
      outputs: {},
    }
  }
  const edges = state.edges.filter(
    (edge) => !removedEdges.has(edge.id) && !removed.has(edge.source) && !removed.has(edge.target)
  )
  return { ...state, blocks, edges: [...edges, ...patch.addEdges] }
}
