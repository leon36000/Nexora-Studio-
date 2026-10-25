/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  catalogEntryById,
  catalogEntryOf,
  isTriggerType,
  STEP_CATALOG,
} from '@/lib/nexora/steps/catalog'
import { getBlock } from '@/blocks/registry'

const block = (type: string, values: Record<string, unknown> = {}) => ({
  type,
  subBlocks: Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, { id, type: 'short-input', value }])
  ),
})

vi.unmock('@/blocks/registry')

describe('catalogue d’étapes', () => {
  it('compte environ vingt-cinq étapes aux identifiants uniques', () => {
    expect(STEP_CATALOG.length).toBeGreaterThanOrEqual(22)
    expect(STEP_CATALOG.length).toBeLessThanOrEqual(28)
    expect(new Set(STEP_CATALOG.map((entry) => entry.id)).size).toBe(STEP_CATALOG.length)
  })

  it.each(STEP_CATALOG.map((entry) => [entry.id, entry.blockType] as const))(
    '%s correspond à un bloc du registre (%s)',
    (_id, blockType) => {
      expect(getBlock(blockType), blockType).toBeDefined()
    }
  )

  it('contient les six étapes du langage du Copilote', () => {
    const types = new Set(STEP_CATALOG.map((entry) => entry.blockType))
    for (const type of ['agent', 'condition', 'api', 'wait', 'human_in_the_loop_v2', 'response']) {
      expect(types.has(type), type).toBe(true)
    }
  })

  it('distingue un envoi de données (POST) d’un appel de lecture (GET)', () => {
    expect(catalogEntryOf(block('api', { method: 'POST' }))?.id).toBe('api-send')
    expect(catalogEntryOf(block('api', { method: 'GET' }))?.id).toBe('api-get')
    expect(catalogEntryOf(block('api'))?.id).toBe('api-get')
  })

  it('distingue l’ajout d’une ligne de la lecture d’une table', () => {
    expect(catalogEntryOf(block('table_v2', { operation: 'insert_row' }))?.id).toBe('table-add')
    expect(catalogEntryOf(block('table_v2', { operation: 'query_rows' }))?.id).toBe('table-read')
  })

  it('ne reconnaît pas un bloc hors catalogue', () => {
    expect(catalogEntryOf(block('router_v2'))).toBeNull()
    expect(catalogEntryOf(block('loop'))).toBeNull()
  })

  it('le préréglage d’une entrée la fait reconnaître comme elle-même', () => {
    for (const entry of STEP_CATALOG) {
      expect(catalogEntryOf(block(entry.blockType, { ...entry.preset }))?.id, entry.id).toBe(
        entry.id
      )
    }
  })

  it('connaît les déclencheurs du Copilote', () => {
    for (const type of ['start_trigger', 'generic_webhook', 'schedule', 'chat_trigger']) {
      expect(isTriggerType(type)).toBe(true)
    }
    expect(isTriggerType('agent')).toBe(false)
    expect(catalogEntryById('agent')?.blockType).toBe('agent')
  })
})
