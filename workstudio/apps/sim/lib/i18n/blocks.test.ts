import { describe, expect, it } from 'vitest'
import { type BlockTranslator, translateBlockConfig, translatedBlockName } from '@/lib/i18n/blocks'
import type { BlockConfig } from '@/blocks/types'

const block = {
  type: 'function',
  name: 'Function',
  description: 'Run custom logic',
  longDescription: 'Execute custom code',
  category: 'blocks',
  bgColor: '#000',
  icon: () => null,
  subBlocks: [
    { id: 'code', title: 'Code', type: 'code', placeholder: 'Write code' },
    { id: 'notice', type: 'text', defaultValue: 'Python needs a sandbox.' },
    { id: 'timeout', title: 'Timeout', type: 'short-input' },
  ],
  tools: { access: [] },
  inputs: {},
  outputs: {},
} as unknown as BlockConfig

/** The `blocks` messages flattened to their keys, behind the translator contract. */
const french: Record<string, string> = {
  'function.name': 'Fonction',
  'function.description': 'Exécuter une logique personnalisée',
  'function.subBlocks.code.title': 'Code',
  'function.subBlocks.code.placeholder': 'Écrivez le code',
  'function.subBlocks.notice.content': 'Python demande un bac à sable.',
}

const t: BlockTranslator = Object.assign((key: string) => french[key] ?? key, {
  has: (key: string) =>
    Object.keys(french).some((known) => known === key || known.startsWith(`${key}.`)),
})

describe('translateBlockConfig', () => {
  it('translates the name, description and sub-block labels that have a French text', () => {
    const translated = translateBlockConfig(block, t)
    expect(translated.name).toBe('Fonction')
    expect(translated.description).toBe('Exécuter une logique personnalisée')
    expect(translated.subBlocks[0].placeholder).toBe('Écrivez le code')
    expect(translated.subBlocks[1].defaultValue).toBe('Python demande un bac à sable.')
  })

  it('keeps the original text where no translation exists, and never mutates the registry', () => {
    const translated = translateBlockConfig(block, t)
    expect(translated.longDescription).toBe('Execute custom code')
    expect(translated.subBlocks[2].title).toBe('Timeout')
    expect(block.name).toBe('Function')
    expect(block.subBlocks[0].placeholder).toBe('Write code')
  })

  it('returns the block unchanged when the type has no translations at all', () => {
    const other = { ...block, type: 'slack' } as BlockConfig
    expect(translateBlockConfig(other, t)).toBe(other)
  })
})

describe('translatedBlockName', () => {
  it('gives the French name when there is one, the source name otherwise', () => {
    expect(translatedBlockName('function', 'Function', t)).toBe('Fonction')
    expect(translatedBlockName('slack', 'Slack', t)).toBe('Slack')
  })
})
