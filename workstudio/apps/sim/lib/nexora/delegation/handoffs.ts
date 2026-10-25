import { generateId } from '@sim/utils/id'
import { isRecordLike, toRecord } from '@sim/utils/object'

/**
 * Nexora edition: « Peut confier à ». `reply`: the called agent answers and the calling agent
 * takes over again; `transfer`: the called agent keeps the conversation from then on.
 */
export const HANDOFF_MODES = ['reply', 'transfer'] as const
export type HandoffMode = (typeof HANDOFF_MODES)[number]

export interface AgentHandoff {
  /** Workflow id of the called agent. */
  agentId: string
  mode: HandoffMode
}

interface HandoffRow {
  id: string
  cells: { Agent: string; Mode: string }
}

function isHandoffMode(value: string): value is HandoffMode {
  return (HANDOFF_MODES as readonly string[]).includes(value)
}

/** A reference to another block's output or a variable cannot be shown as a chosen agent. */
function isReference(value: string): boolean {
  return value.includes('<') || value.includes('{{')
}

/** The table rows the Agent block's `handoffs` sub-block stores. */
export function handoffsToRows(handoffs: readonly AgentHandoff[]): HandoffRow[] {
  return handoffs.map(({ agentId, mode }) => ({
    id: generateId(),
    cells: { Agent: agentId, Mode: mode },
  }))
}

/**
 * The handoffs a stored `handoffs` value holds: none when it is missing (an agent saved before),
 * `null` when the form cannot show it faithfully (unknown mode, reference, not a table).
 */
export function rowsToHandoffs(value: unknown): AgentHandoff[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  const handoffs: AgentHandoff[] = []
  for (const row of value) {
    if (!isRecordLike(row)) return null
    const cells = toRecord(row.cells)
    if (typeof cells.Agent !== 'string') return null
    const agentId = cells.Agent.trim()
    if (!agentId) continue
    if (isReference(agentId)) return null
    const rawMode = cells.Mode ?? ''
    if (typeof rawMode !== 'string') return null
    const mode = rawMode.trim() === '' ? 'reply' : rawMode.trim()
    if (!isHandoffMode(mode)) return null
    if (handoffs.some((handoff) => handoff.agentId === agentId)) continue
    handoffs.push({ agentId, mode })
  }
  return handoffs
}
