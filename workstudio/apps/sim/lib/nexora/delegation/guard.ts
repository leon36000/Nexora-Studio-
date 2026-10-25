/**
 * Nexora edition: the guards of a delegation between agents. An agent's chain is the list of
 * workflows (root first) that led to it; a delegation may not pass the depth limit nor come back
 * to an agent already in the chain.
 */

export const DEFAULT_MAX_DELEGATION_DEPTH = 3
const MIN_DEPTH = 1
const MAX_DEPTH = 10

/** The instance's limit (`NEXORA_DELEGATION_MAX_DEPTH`), the default when it is not a whole number from 1 to 10. */
export function resolveMaxDepth(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return DEFAULT_MAX_DELEGATION_DEPTH
  const value = Number(raw)
  return value >= MIN_DEPTH && value <= MAX_DEPTH ? value : DEFAULT_MAX_DELEGATION_DEPTH
}

/** The chain of agents up to `current`, root first, always ending with the current agent. */
export function normalizeChain(chain: readonly string[] | undefined, current: string): string[] {
  const known = chain ?? []
  return known.includes(current) ? [...known] : [...known, current]
}

type DelegationVerdict =
  | { ok: true }
  | { ok: false; reason: 'self' | 'loop' | 'depth'; message: string }

interface CheckDelegationInput {
  chain: readonly string[] | undefined
  current: string
  target: string
  maxDepth: number
  nameOf: (workflowId: string) => string
}

function levels(count: number): string {
  return count === 1 ? '1 niveau' : `${count} niveaux`
}

export function checkDelegation(input: CheckDelegationInput): DelegationVerdict {
  const { current, target, maxDepth, nameOf } = input
  const chain = normalizeChain(input.chain, current)
  if (target === current) {
    return {
      ok: false,
      reason: 'self',
      message: `Boucle de délégation : « ${nameOf(current)} » ne peut pas se confier une demande à lui-même. La demande n’a pas été transmise.`,
    }
  }
  if (chain.includes(target)) {
    const path = [...chain.slice(chain.indexOf(target)), target].map(nameOf).join(' → ')
    return {
      ok: false,
      reason: 'loop',
      message: `Boucle de délégation : « ${nameOf(target)} » a déjà été sollicité dans cette conversation (${path}). La demande n’a pas été transmise.`,
    }
  }
  if (chain.length - 1 >= maxDepth) {
    return {
      ok: false,
      reason: 'depth',
      message: `Limite de délégation atteinte (${levels(maxDepth)}) : « ${nameOf(current)} » ne peut pas confier cette demande à un autre agent. Répondez avec ce que vous savez.`,
    }
  }
  return { ok: true }
}
