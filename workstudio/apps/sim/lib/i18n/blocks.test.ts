import { describe, expect, it } from 'vitest'
import {
  type BlockTranslator,
  displayBlockName,
  translateBlockConfig,
  translatedBlockName,
} from '@/lib/i18n/blocks'
import { resolveCanvasSentence } from '@/lib/workflows/blocks/canvas-sentence'
import type { BlockConfig, SubBlockConfig } from '@/blocks/types'

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

const agent = {
  type: 'agent',
  name: 'Agent',
  description: 'Build an agent',
  category: 'blocks',
  bgColor: '#000',
  icon: () => null,
  canvasPresentation: {
    defaultTitle: 'Agent',
    sentences: {
      default: [
        { text: 'Prompt', field: 'model', core: true },
        { text: 'with', field: 'messages' },
        { text: ', using', field: 'tools' },
      ],
    },
  },
  subBlocks: [
    { id: 'model', title: 'Model', type: 'combobox' },
    { id: 'messages', title: 'Messages', type: 'messages-input' },
    { id: 'tools', title: 'Tools', type: 'tool-input' },
  ],
  tools: { access: [] },
  inputs: {},
  outputs: {},
} as unknown as BlockConfig

const gmail = {
  type: 'gmail_v2',
  name: 'Gmail',
  description: 'Send email',
  category: 'tools',
  bgColor: '#fff',
  icon: () => null,
  canvasPresentation: {
    typeLabel: 'Gmail',
    defaultTitle: 'Send Email',
    operationSubBlockId: 'operation',
    operationRowTitle: 'Action',
    sentences: {
      byOperation: {
        send_gmail: [
          'Send',
          { text: 'an email to', field: 'to', core: true },
          { field: 'subject', after: 'as subject' },
        ],
        read_gmail: ['Read unread emails'],
      },
    },
    triggerSentences: {
      byTrigger: { gmail_poller: ['Run when an email arrives', { text: 'in', field: 'labels' }] },
    },
  },
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { id: 'send_gmail', label: 'Send Email' },
        { id: 'read_gmail', label: 'Read Email' },
      ],
      value: () => 'send_gmail',
    },
    { id: 'to', title: 'Recipient Email', type: 'short-input' },
    { id: 'subject', title: 'Subject', type: 'short-input' },
    { id: 'labels', title: 'Labels', type: 'short-input', canvasNoun: 'a label' },
    { id: 'summary', title: 'Event Title', type: 'short-input' },
    { id: 'summary', title: 'Calendar Name', type: 'short-input' },
    { id: 'priority', title: 'Priority', type: 'dropdown', options: () => [] },
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
  'agent.name': 'Agent',
  'agent.defaultTitle': 'Agent',
  'agent.sentences.default.0': 'Interroger',
  'agent.sentences.default.1': 'avec',
  'agent.sentences.default.2': ', en utilisant',
  'agent.subBlocks.model.title': 'Modèle',
  'agent.subBlocks.model.canvasNoun': 'un modèle',
  'agent.subBlocks.messages.title': 'Messages',
  'gmail_v2.name': 'Gmail',
  'gmail_v2.operationRowTitle': 'Opération',
  'gmail_v2.sentences.send_gmail.0': 'Envoyer',
  'gmail_v2.sentences.send_gmail.1': 'un e-mail à',
  'gmail_v2.sentences.send_gmail.2_after': 'comme objet',
  'gmail_v2.triggerSentences.gmail_poller.0': 'Exécuter à l’arrivée d’un e-mail',
  'gmail_v2.triggerSentences.gmail_poller.1': 'dans',
  'gmail_v2.subBlocks.operation.title': 'Opération',
  'gmail_v2.subBlocks.operation.options.send_gmail': 'Envoyer un e-mail',
  'gmail_v2.subBlocks.operation.options.read_gmail': 'Lire les e-mails',
  'gmail_v2.subBlocks.to.title': 'E-mail du destinataire',
  'gmail_v2.subBlocks.labels.title': 'Libellés',
  'gmail_v2.subBlocks.labels.canvasNoun': 'un libellé',
  'gmail_v2.subBlocks.summary.title': 'Titre de l’événement',
  'gmail_v2.subBlocks.summary.variants.CalendarName.title': 'Nom de l’agenda',
  'gmail_v2.subBlocks.priority.title': 'Priorité',
  'start_trigger.name': 'Démarrage',
}

const t: BlockTranslator = Object.assign((key: string) => french[key] ?? key, {
  has: (key: string) =>
    Object.keys(french).some((known) => known === key || known.startsWith(`${key}.`)),
  raw: (key: string) => french[key],
})

const subBlock = (config: BlockConfig, id: string, index = 0): SubBlockConfig =>
  config.subBlocks.filter((candidate) => candidate.id === id)[index]

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

  it('reads texts raw, so braces and tags in a placeholder are not parsed as ICU', () => {
    const raw: BlockTranslator = Object.assign(
      () => {
        throw new Error('ICU formatting is not used for block texts')
      },
      {
        has: (key: string) =>
          ['function', 'function.subBlocks', 'function.subBlocks.code'].includes(key) ||
          key === 'function.subBlocks.code.placeholder',
        raw: (key: string) =>
          key === 'function.subBlocks.code.placeholder'
            ? '{"ok": true} ou <bloc.sortie>'
            : undefined,
      }
    )
    expect(translateBlockConfig(block, raw).subBlocks[0].placeholder).toBe(
      '{"ok": true} ou <bloc.sortie>'
    )
  })

  it('reads the Agent card sentence in French, with a French noun in the empty chip', () => {
    const translated = translateBlockConfig(agent, t)
    const segments = resolveCanvasSentence(
      translated,
      { mode: 'action', operationValue: undefined },
      (id) => id === 'messages',
      (id) => translated.subBlocks.find((candidate) => candidate.id === id) ?? null
    )
    expect(segments).toEqual([
      'Interroger',
      { subBlockId: 'model', noun: 'un modèle' },
      'avec',
      { subBlockId: 'messages' },
    ])
  })

  it('translates operation sentences clause by clause, including the text after a chip', () => {
    const sentence = translateBlockConfig(gmail, t).canvasPresentation?.sentences?.byOperation
      ?.send_gmail
    expect(sentence).toEqual([
      'Envoyer',
      { text: 'un e-mail à', field: 'to', core: true },
      { field: 'subject', after: 'comme objet' },
    ])
    expect(
      translateBlockConfig(gmail, t).canvasPresentation?.sentences?.byOperation?.read_gmail
    ).toEqual(['Read unread emails'])
  })

  it('translates trigger sentences by trigger id', () => {
    expect(
      translateBlockConfig(gmail, t).canvasPresentation?.triggerSentences?.byTrigger?.gmail_poller
    ).toEqual(['Exécuter à l’arrivée d’un e-mail', { text: 'dans', field: 'labels' }])
  })

  it('translates static option labels and leaves option functions alone', () => {
    const translated = translateBlockConfig(gmail, t)
    expect(subBlock(translated, 'operation').options).toEqual([
      { id: 'send_gmail', label: 'Envoyer un e-mail' },
      { id: 'read_gmail', label: 'Lire les e-mails' },
    ])
    expect(subBlock(translated, 'priority').options).toBe(subBlock(gmail, 'priority').options)
  })

  it('translates the canvas noun, and never leaves an English noun beside a French title', () => {
    const translated = translateBlockConfig(gmail, t)
    expect(subBlock(translated, 'labels').canvasNoun).toBe('un libellé')
    expect(subBlock(translated, 'to').canvasNoun).toBe('e-mail du destinataire')
    expect(subBlock(translated, 'subject').canvasNoun).toBeUndefined()
  })

  it('gives a sub-block declared twice under one id the text written for its own title', () => {
    const translated = translateBlockConfig(gmail, t)
    expect(subBlock(translated, 'summary', 0).title).toBe('Titre de l’événement')
    expect(subBlock(translated, 'summary', 1).title).toBe('Nom de l’agenda')
  })

  it('translates the presentation labels shown on the card', () => {
    const presentation = translateBlockConfig(gmail, t).canvasPresentation
    expect(presentation?.operationRowTitle).toBe('Opération')
    expect(presentation?.typeLabel).toBe('Gmail')
    expect(translateBlockConfig(agent, t).canvasPresentation?.defaultTitle).toBe('Agent')
  })
})

describe('displayBlockName', () => {
  const start = {
    ...block,
    type: 'start_trigger',
    name: 'Start',
    subBlocks: [],
  } as unknown as BlockConfig

  it('shows the translated default for a block still carrying its generated name', () => {
    expect(displayBlockName('Start', start, translateBlockConfig(start, t))).toBe('Démarrage')
    expect(displayBlockName('Send Email', gmail, translateBlockConfig(gmail, t))).toBe(
      'Envoyer un e-mail'
    )
  })

  it('keeps the copy number of a generated name', () => {
    expect(displayBlockName('Send Email 2', gmail, translateBlockConfig(gmail, t))).toBe(
      'Envoyer un e-mail 2'
    )
    expect(displayBlockName('Function 3', block, translateBlockConfig(block, t))).toBe('Fonction 3')
  })

  it('treats the legacy Start name of a starter block as generated', () => {
    const starter = { ...start, type: 'starter', name: 'Starter' } as BlockConfig
    const translatedStarter = { ...starter, name: 'Démarreur' } as BlockConfig
    expect(displayBlockName('Start', starter, translatedStarter)).toBe('Démarreur')
  })

  it('shows a name the user chose exactly as typed', () => {
    expect(displayBlockName('Relancer les clients', gmail, translateBlockConfig(gmail, t))).toBe(
      'Relancer les clients'
    )
    expect(displayBlockName('Send Email Now', gmail, translateBlockConfig(gmail, t))).toBe(
      'Send Email Now'
    )
  })
})

describe('translatedBlockName', () => {
  it('gives the French name when there is one, the source name otherwise', () => {
    expect(translatedBlockName('function', 'Function', t)).toBe('Fonction')
    expect(translatedBlockName('slack', 'Slack', t)).toBe('Slack')
  })
})
