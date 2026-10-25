import { displaySubflowName } from '@sim/workflow-renderer'
import { getDefaultBlockName } from '@/lib/workflows/blocks/canvas-presentation'
import type { BlockConfig, CanvasSentence, SubBlockConfig } from '@/blocks/types'

/** A next-intl translator scoped to the `blocks` messages (`useTranslations('blocks')`). */
export interface BlockTranslator {
  (key: string): string
  has(key: string): boolean
  /** The message as written, without ICU formatting: block texts hold braces and tags. */
  raw(key: string): unknown
}

type CanvasPresentation = NonNullable<BlockConfig['canvasPresentation']>

/**
 * The message key of one title among several declared under the same sub-block id: the source
 * title without its spaces and punctuation (`Calendar Name` → `CalendarName`).
 */
export function blockVariantKey(title: string): string {
  return title.replace(/[^A-Za-z0-9]/g, '')
}

/** A translated title read as a noun inside a sentence, so no English noun stays beside it. */
function nounFromTitle(title: string): string {
  return /^\p{Lu}(?!\p{Lu})/u.test(title)
    ? `${title.charAt(0).toLocaleLowerCase('fr')}${title.slice(1)}`
    : title
}

function translateSentence(
  sentence: CanvasSentence | undefined,
  text: (key: string) => string | undefined
): CanvasSentence | undefined {
  if (!sentence) return sentence
  return sentence.map((clause, index) => {
    if (typeof clause === 'string') return text(`${index}`) ?? clause
    const before = text(`${index}`) ?? clause.text
    const after = text(`${index}_after`) ?? clause.after
    return {
      ...clause,
      ...(before !== undefined ? { text: before } : {}),
      ...(after !== undefined ? { after } : {}),
    }
  })
}

function translateKeyedSentences(
  keyed: Record<string, CanvasSentence> | undefined,
  text: (key: string) => string | undefined
): Record<string, CanvasSentence> | undefined {
  if (!keyed) return keyed
  return Object.fromEntries(
    Object.entries(keyed).map(([id, sentence]) => [
      id,
      translateSentence(sentence, (key) => text(`${id}.${key}`)) ?? sentence,
    ])
  )
}

function translatePresentation(
  presentation: CanvasPresentation | undefined,
  text: (key: string) => string | undefined
): CanvasPresentation | undefined {
  if (!presentation) return presentation
  return {
    ...presentation,
    defaultTitle: text('defaultTitle') ?? presentation.defaultTitle,
    typeLabel: text('typeLabel') ?? presentation.typeLabel,
    operationRowTitle: text('operationRowTitle') ?? presentation.operationRowTitle,
    sentences: presentation.sentences && {
      ...presentation.sentences,
      default: translateSentence(presentation.sentences.default, (key) =>
        text(`sentences.default.${key}`)
      ),
      byOperation: translateKeyedSentences(presentation.sentences.byOperation, (key) =>
        text(`sentences.${key}`)
      ),
    },
    triggerSentences: presentation.triggerSentences && {
      ...presentation.triggerSentences,
      default: translateSentence(presentation.triggerSentences.default, (key) =>
        text(`triggerSentences.default.${key}`)
      ),
      byTrigger: translateKeyedSentences(presentation.triggerSentences.byTrigger, (key) =>
        text(`triggerSentences.${key}`)
      ),
    },
  }
}

function translateSubBlock(
  subBlock: SubBlockConfig,
  sharedTitle: string | undefined,
  text: (key: string) => string | undefined,
  has: (key: string) => boolean
): SubBlockConfig {
  const base = `subBlocks.${subBlock.id}`
  if (!has(base)) return subBlock
  const variant =
    subBlock.title && sharedTitle !== undefined && subBlock.title !== sharedTitle
      ? `${base}.variants.${blockVariantKey(subBlock.title)}`
      : undefined
  const field = (name: string) =>
    (variant ? text(`${variant}.${name}`) : undefined) ?? text(`${base}.${name}`)

  const title = field('title') ?? subBlock.title
  const titleChanged = title !== undefined && title !== subBlock.title
  const canvasNoun =
    field('canvasNoun') ?? (titleChanged ? nounFromTitle(title) : subBlock.canvasNoun)
  const content = field('content')
  const options = Array.isArray(subBlock.options)
    ? subBlock.options.map((option) => {
        const label = field(`options.${option.id}`)
        return label === undefined ? option : { ...option, label }
      })
    : subBlock.options

  return {
    ...subBlock,
    title,
    placeholder: field('placeholder') ?? subBlock.placeholder,
    description: field('description') ?? subBlock.description,
    ...(canvasNoun !== undefined ? { canvasNoun } : {}),
    ...(options !== subBlock.options ? { options } : {}),
    ...(subBlock.type === 'text' && content !== undefined ? { defaultValue: content } : {}),
  }
}

/**
 * Nexora edition: the block registry keeps its English source text, which also names new block
 * instances and their `<block.output>` references. Display surfaces translate a copy instead, from
 * `blocks.<type>.…` (texts read raw, never ICU-formatted; a missing key keeps the source text):
 *
 * - `name`, `description`, `longDescription`, `defaultTitle`, `typeLabel`, `operationRowTitle`;
 * - `sentences.<default|operationId>.<i>`: the text of clause `i` (a literal clause, or the text
 *   before its chip), `.<i>_after` the text after the chip; `triggerSentences.<default|triggerId>`
 *   likewise;
 * - per sub-block, `subBlocks.<id>.title|placeholder|description|content|canvasNoun` and
 *   `options.<optionId>` (static options only; `content` is the text a `text` sub-block shows,
 *   `canvasNoun` the noun of an empty sentence chip, with its article). An id declared again
 *   under another title reads `subBlocks.<id>.variants.<blockVariantKey(title)>` first.
 */
export function translateBlockConfig(config: BlockConfig, t: BlockTranslator): BlockConfig {
  const prefix = config.type
  if (!t.has(prefix)) return config

  const has = (key: string) => t.has(`${prefix}.${key}`)
  const text = (key: string): string | undefined => {
    if (!has(key)) return undefined
    const message = t.raw(`${prefix}.${key}`)
    return typeof message === 'string' ? message : undefined
  }

  const sharedTitles = new Map<string, string | undefined>()
  for (const subBlock of config.subBlocks) {
    if (subBlock.title && !subBlock.hidden && !sharedTitles.has(subBlock.id)) {
      sharedTitles.set(subBlock.id, subBlock.title)
    }
  }

  return {
    ...config,
    name: text('name') ?? config.name,
    description: text('description') ?? config.description,
    longDescription: text('longDescription') ?? config.longDescription,
    canvasPresentation: translatePresentation(config.canvasPresentation, text),
    subBlocks: config.subBlocks.map((subBlock) =>
      translateSubBlock(subBlock, sharedTitles.get(subBlock.id), text, has)
    ),
  }
}

/** A block type's display name: its French name when translated, the registry name otherwise. */
export function translatedBlockName(type: string, name: string, t: BlockTranslator): string {
  return t.has(`${type}.name`) ? t(`${type}.name`) : name
}

const SUBFLOW_SOURCE_NAMES = { loop: 'Loop', parallel: 'Parallel' } as const

/**
 * The heading of a Loop / Parallel container (they have no registry config): the translated type
 * name while the stored name is still the generated `Loop 2` / `Parallel`, a chosen name as typed.
 * The stored name stays the identifier of its references (`<loop1.index>`).
 */
export function displaySubflowBlockName(
  storedName: string,
  type: 'loop' | 'parallel',
  t: BlockTranslator
): string {
  return displaySubflowName(
    storedName,
    type,
    translatedBlockName(type, SUBFLOW_SOURCE_NAMES[type], t)
  )
}

const START_BLOCK_TYPES = new Set(['start_trigger', 'starter'])

/**
 * The heading a block instance shows. Its stored name stays the identifier of its references
 * (`<start.input>`), so it is never renamed; while it is still the generated one (the default
 * name, the legacy registry name or the legacy `Start` / `Response`, with its copy number), the
 * heading reads the translated default instead. A name the user chose shows as typed.
 */
export function displayBlockName(
  storedName: string,
  rawConfig: BlockConfig,
  translatedConfig: BlockConfig
): string {
  if (rawConfig === translatedConfig) return storedName

  const match = storedName.match(/^(.*?)(\s+\d+)?$/)
  const base = match?.[1] ?? storedName
  const copyNumber = match?.[2] ?? ''

  const translatedDefault = getDefaultBlockName(translatedConfig)
  if (base === getDefaultBlockName(rawConfig)) return `${translatedDefault}${copyNumber}`
  if (base === rawConfig.name) return `${translatedConfig.name}${copyNumber}`
  if (storedName === 'Start' && START_BLOCK_TYPES.has(rawConfig.type)) return translatedDefault
  if (storedName === 'Response' && rawConfig.type === 'response') return translatedDefault
  return storedName
}
