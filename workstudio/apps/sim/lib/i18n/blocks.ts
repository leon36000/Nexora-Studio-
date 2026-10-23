import type { BlockConfig, SubBlockConfig } from '@/blocks/types'

/** A next-intl translator scoped to the `blocks` messages (`useTranslations('blocks')`). */
export interface BlockTranslator {
  (key: string): string
  has(key: string): boolean
}

/**
 * Nexora edition: the block registry keeps its English source text, which also names new block
 * instances and their `<block.output>` references. Display surfaces translate a copy instead:
 * `blocks.<type>.name|description|longDescription` and, per sub-block,
 * `blocks.<type>.subBlocks.<id>.title|placeholder|description|content` (`content` is the text
 * a `text` sub-block shows). Missing keys keep the source text.
 */
export function translateBlockConfig(config: BlockConfig, t: BlockTranslator): BlockConfig {
  const prefix = config.type
  if (!t.has(prefix)) return config

  const text = (key: string, fallback: string | undefined) =>
    t.has(`${prefix}.${key}`) ? t(`${prefix}.${key}`) : fallback

  const subBlocks = config.subBlocks.map((subBlock): SubBlockConfig => {
    const base = `subBlocks.${subBlock.id}`
    if (!t.has(`${prefix}.${base}`)) return subBlock
    const content = text(`${base}.content`, undefined)
    return {
      ...subBlock,
      title: text(`${base}.title`, subBlock.title),
      placeholder: text(`${base}.placeholder`, subBlock.placeholder),
      description: text(`${base}.description`, subBlock.description),
      ...(subBlock.type === 'text' && content !== undefined ? { defaultValue: content } : {}),
    }
  })

  return {
    ...config,
    name: text('name', config.name) ?? config.name,
    description: text('description', config.description) ?? config.description,
    longDescription: text('longDescription', config.longDescription),
    subBlocks,
  }
}

/** A block type's display name: its French name when translated, the registry name otherwise. */
export function translatedBlockName(type: string, name: string, t: BlockTranslator): string {
  return t.has(`${type}.name`) ? t(`${type}.name`) : name
}
