import { describe, expect, it } from 'vitest'
import {
  checkDelegation,
  DEFAULT_MAX_DELEGATION_DEPTH,
  normalizeChain,
  resolveMaxDepth,
} from '@/lib/nexora/delegation/guard'

const names: Record<string, string> = {
  A: 'Assistant général',
  B: 'Agent tarifs',
  C: 'Agent SAV',
  D: 'Agent RH',
}
const nameOf = (id: string) => names[id] ?? id

describe('delegation guard', () => {
  it('allows a first delegation from the root agent', () => {
    expect(
      checkDelegation({ chain: ['A'], current: 'A', target: 'B', maxDepth: 3, nameOf })
    ).toEqual({ ok: true })
  })

  it('treats a missing chain as the current agent alone', () => {
    expect(normalizeChain([], 'A')).toEqual(['A'])
    expect(normalizeChain(undefined, 'A')).toEqual(['A'])
  })

  it('adds the current agent to a chain that does not hold it', () => {
    expect(normalizeChain(['X'], 'A')).toEqual(['X', 'A'])
    expect(normalizeChain(['X', 'A'], 'A')).toEqual(['X', 'A'])
  })

  it('stops an agent that hands over to itself', () => {
    const verdict = checkDelegation({
      chain: ['A'],
      current: 'A',
      target: 'A',
      maxDepth: 3,
      nameOf,
    })
    expect(verdict).toMatchObject({ ok: false, reason: 'self' })
    expect(verdict.ok === false && verdict.message).toContain('Assistant général')
  })

  it('stops a loop A → B → A with a French message naming the path', () => {
    const verdict = checkDelegation({
      chain: ['A', 'B'],
      current: 'B',
      target: 'A',
      maxDepth: 3,
      nameOf,
    })
    expect(verdict).toMatchObject({ ok: false, reason: 'loop' })
    expect(verdict.ok === false && verdict.message).toBe(
      'Boucle de délégation : « Assistant général » a déjà été sollicité dans cette conversation (Assistant général → Agent tarifs → Assistant général). La demande n’a pas été transmise.'
    )
  })

  it('stops the delegation that would pass the depth limit', () => {
    const base = { current: 'D', target: 'X', maxDepth: 3, nameOf }
    expect(checkDelegation({ ...base, chain: ['A', 'B', 'C'], current: 'C' })).toEqual({ ok: true })
    const verdict = checkDelegation({ ...base, chain: ['A', 'B', 'C', 'D'] })
    expect(verdict).toMatchObject({ ok: false, reason: 'depth' })
    expect(verdict.ok === false && verdict.message).toBe(
      'Limite de délégation atteinte (3 niveaux) : « Agent RH » ne peut pas confier cette demande à un autre agent. Répondez avec ce que vous savez.'
    )
  })

  it('uses the singular for a limit of one level', () => {
    const verdict = checkDelegation({
      chain: ['A', 'B'],
      current: 'B',
      target: 'C',
      maxDepth: 1,
      nameOf,
    })
    expect(verdict.ok === false && verdict.message).toContain('(1 niveau)')
  })

  it('falls back to the default limit when the setting is not a whole number from 1 to 10', () => {
    expect(DEFAULT_MAX_DELEGATION_DEPTH).toBe(3)
    for (const raw of [undefined, '', 'abc', '0', '11', '-2', '2.5']) {
      expect(resolveMaxDepth(raw)).toBe(3)
    }
    expect(resolveMaxDepth('1')).toBe(1)
    expect(resolveMaxDepth('10')).toBe(10)
  })
})
