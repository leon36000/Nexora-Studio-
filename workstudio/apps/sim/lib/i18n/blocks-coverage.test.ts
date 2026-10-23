import { describe, expect, it, vi } from 'vitest'
import frBlocks from '@/messages/fr/blocks.json'

type BlockMessages = Record<
  string,
  { name?: string; description?: string; subBlocks?: Record<string, { title?: string }> }
>

/** Core blocks: every visible label is translated (spec v2 §8bis.3). */
const CORE_BLOCK_TYPES = [
  'agent',
  'router_v2',
  'evaluator',
  'condition',
  'function',
  'api',
  'response',
  'start_trigger',
  'chat_trigger',
  'api_trigger',
  'input_trigger',
  'manual_trigger',
  'schedule',
  'generic_webhook',
  'wait',
  'human_in_the_loop_v2',
  'knowledge',
  'memory',
  'guardrails',
  'variables',
  'workflow_input',
  'table_v2',
  'file_v5',
  'searxng',
  'thinking',
  'note',
]

async function loadRegistry() {
  const { BLOCK_REGISTRY } =
    await vi.importActual<typeof import('@/blocks/registry-maps')>('@/blocks/registry-maps')
  return BLOCK_REGISTRY
}

const messages = frBlocks as BlockMessages

describe('French block texts', () => {
  it('translate every visible label of the core blocks', async () => {
    const registry = await loadRegistry()
    const missing: string[] = []
    for (const type of CORE_BLOCK_TYPES) {
      const block = registry[type]
      expect(block, `core block ${type} exists`).toBeDefined()
      const entry = messages[type]
      if (!entry?.name) missing.push(`${type}.name`)
      if (!entry?.description) missing.push(`${type}.description`)
      for (const subBlock of block.subBlocks) {
        if (subBlock.title && !subBlock.hidden && !entry?.subBlocks?.[subBlock.id]?.title) {
          missing.push(`${type}.subBlocks.${subBlock.id}.title`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('give every block shown in the toolbar a French name and description', async () => {
    const registry = await loadRegistry()
    const missing = Object.values(registry)
      .filter((block) => !block.hideFromToolbar)
      .filter((block) => !messages[block.type]?.name || !messages[block.type]?.description)
      .map((block) => block.type)
    expect(missing).toEqual([])
  })
})
