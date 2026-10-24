import { describe, expect, it, vi } from 'vitest'
import { blockVariantKey } from '@/lib/i18n/blocks'
import type { BlockConfig, CanvasSentence, SubBlockConfig } from '@/blocks/types'
import frBlocks from '@/messages/fr/blocks.json'

type MessageTree = { [key: string]: string | MessageTree }

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
  'nexora_extract',
]

/**
 * The 30 integration blocks a French SME meets first (K2): the blocks of the Nexora capture
 * templates, then the most common office, CRM, project, messaging and commerce services.
 */
const TOP_INTEGRATION_BLOCK_TYPES = [
  'mistral_parse_v3',
  'stt_v2',
  'vision_v2',
  'gmail_v2',
  'outlook',
  'slack_v2',
  'microsoft_teams',
  'google_sheets_v2',
  'google_drive',
  'google_calendar_v2',
  'google_docs',
  'microsoft_excel_v2',
  'onedrive',
  'sharepoint_v2',
  'notion_v2',
  'airtable',
  'hubspot',
  'salesforce',
  'pipedrive',
  'trello',
  'asana',
  'jira',
  'telegram',
  'whatsapp',
  'stripe',
  'shopify',
  'mailchimp',
  'typeform',
  'zendesk',
  'calendly',
]

async function loadRegistry() {
  const { BLOCK_REGISTRY } =
    await vi.importActual<typeof import('@/blocks/registry-maps')>('@/blocks/registry-maps')
  return BLOCK_REGISTRY
}

const messages = frBlocks as MessageTree

function hasMessage(path: string): boolean {
  let node: string | MessageTree | undefined = messages
  for (const segment of path.split('.')) {
    if (typeof node !== 'object') return false
    node = node[segment]
  }
  return typeof node === 'string' && node.trim().length > 0
}

const isVisible = (subBlock: SubBlockConfig) => Boolean(subBlock.title) && !subBlock.hidden

/**
 * The message a visible sub-block reads its `field` from: its own title's variant when its id is
 * declared again under another title, the shared entry otherwise.
 */
function subBlockFieldKey(block: BlockConfig, subBlock: SubBlockConfig, field: string): string {
  const base = `${block.type}.subBlocks.${subBlock.id}`
  const first = block.subBlocks.find(
    (candidate) => candidate.id === subBlock.id && isVisible(candidate)
  )
  return first && subBlock.title && first.title !== subBlock.title
    ? `${base}.variants.${blockVariantKey(subBlock.title)}.${field}`
    : `${base}.${field}`
}

function missingTitles(block: BlockConfig): string[] {
  return block.subBlocks
    .filter(isVisible)
    .map((subBlock) => subBlockFieldKey(block, subBlock, 'title'))
    .filter((key) => !hasMessage(key))
}

/** Every clause text, every text after a chip, and the noun of every core chip. */
function missingSentenceTexts(block: BlockConfig): string[] {
  const presentation = block.canvasPresentation
  const groups: [string, Record<string, CanvasSentence | undefined>][] = [
    [
      'sentences',
      { default: presentation?.sentences?.default, ...presentation?.sentences?.byOperation },
    ],
    [
      'triggerSentences',
      {
        default: presentation?.triggerSentences?.default,
        ...presentation?.triggerSentences?.byTrigger,
      },
    ],
  ]
  const missing = new Set<string>()
  for (const [group, sentences] of groups) {
    for (const [sentenceKey, sentence] of Object.entries(sentences)) {
      if (!sentence) continue
      sentence.forEach((clause, index) => {
        const key = `${block.type}.${group}.${sentenceKey}.${index}`
        if (typeof clause === 'string' || clause.text) {
          if (!hasMessage(key)) missing.add(key)
        }
        if (typeof clause === 'string') return
        if (clause.after && !hasMessage(`${key}_after`)) missing.add(`${key}_after`)
        if (!clause.core) return
        const fields = typeof clause.field === 'string' ? [clause.field] : clause.field
        for (const subBlock of block.subBlocks) {
          if (!fields.includes(subBlock.id) || !isVisible(subBlock)) continue
          const nounKey = subBlockFieldKey(block, subBlock, 'canvasNoun')
          if (!hasMessage(nounKey)) missing.add(nounKey)
        }
      })
    }
  }
  return [...missing]
}

describe('French block texts', () => {
  it('translate every visible label of the core blocks', async () => {
    const registry = await loadRegistry()
    const missing: string[] = []
    for (const type of CORE_BLOCK_TYPES) {
      const block = registry[type]
      expect(block, `core block ${type} exists`).toBeDefined()
      if (!hasMessage(`${type}.name`)) missing.push(`${type}.name`)
      if (!hasMessage(`${type}.description`)) missing.push(`${type}.description`)
      missing.push(...missingTitles(block))
    }
    expect(missing).toEqual([])
  })

  it('translate every clause of the core blocks’ canvas sentences, with a French noun per core chip', async () => {
    const registry = await loadRegistry()
    expect(CORE_BLOCK_TYPES.flatMap((type) => missingSentenceTexts(registry[type]))).toEqual([])
  })

  it('translate every visible label of the 30 most used integration blocks', async () => {
    const registry = await loadRegistry()
    expect(TOP_INTEGRATION_BLOCK_TYPES).toHaveLength(30)
    const missing: string[] = []
    for (const type of TOP_INTEGRATION_BLOCK_TYPES) {
      const block = registry[type]
      expect(block, `integration block ${type} exists`).toBeDefined()
      missing.push(...missingTitles(block))
    }
    expect(missing).toEqual([])
  })

  it('translate every canvas sentence of the 30 most used integration blocks', async () => {
    const registry = await loadRegistry()
    expect(
      TOP_INTEGRATION_BLOCK_TYPES.flatMap((type) => missingSentenceTexts(registry[type]))
    ).toEqual([])
  })

  it('give every block shown in the toolbar a French name and description', async () => {
    const registry = await loadRegistry()
    const missing = Object.values(registry)
      .filter((block) => !block.hideFromToolbar)
      .filter(
        (block) => !hasMessage(`${block.type}.name`) || !hasMessage(`${block.type}.description`)
      )
      .map((block) => block.type)
    expect(missing).toEqual([])
  })
})
