/**
 * The blocks a beginner reaches for, in the order of an automation: say what happens (the AI),
 * choose a path, call out, wait, ask a person, answer.
 */
export const ESSENTIAL_BLOCK_TYPES: readonly string[] = [
  'agent',
  'condition',
  'api',
  'function',
  'knowledge',
  'table_v2',
  'smtp',
  'human_in_the_loop_v2',
  'wait',
  'response',
  'workflow',
  'variables',
]

/** The block that reaches the services connected through Nexora Connect. */
const CONNECT_BLOCK_TYPE = 'mcp'

interface Sortable {
  type: string
  name: string
}

const byName = (a: Sortable, b: Sortable): number => a.name.localeCompare(b.name)

/** The core blocks, the essentials first (in `ESSENTIAL_BLOCK_TYPES` order), then the rest by name. */
export function splitCoreBlocks<T extends Sortable>(
  items: readonly T[]
): { essentials: T[]; others: T[] } {
  const rank = new Map(ESSENTIAL_BLOCK_TYPES.map((type, index) => [type, index]))
  const essentials = items
    .filter((item) => rank.has(item.type))
    .sort((a, b) => (rank.get(a.type) ?? 0) - (rank.get(b.type) ?? 0))
  const others = items.filter((item) => !rank.has(item.type)).sort(byName)
  return { essentials, others }
}

/** The integrations: Nexora Connect on its own, then the direct ones by name. */
export function splitIntegrations<T extends Sortable>(
  items: readonly T[]
): { connect: T[]; direct: T[] } {
  return {
    connect: items.filter((item) => item.type === CONNECT_BLOCK_TYPE),
    direct: items.filter((item) => item.type !== CONNECT_BLOCK_TYPE).sort(byName),
  }
}
