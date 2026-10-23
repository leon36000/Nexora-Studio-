'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { type BlockTranslator, displayBlockName, translateBlockConfig } from '@/lib/i18n/blocks'
import type { BlockConfig } from '@/blocks/types'

/**
 * Display copies per translator, then per registry config: every card of a canvas shares one copy
 * of its block type instead of translating it again on each mount.
 */
const translatedConfigs = new WeakMap<BlockTranslator, WeakMap<BlockConfig, BlockConfig>>()

function translateCached(config: BlockConfig, t: BlockTranslator): BlockConfig {
  let byConfig = translatedConfigs.get(t)
  if (!byConfig) {
    byConfig = new WeakMap()
    translatedConfigs.set(t, byConfig)
  }
  let translated = byConfig.get(config)
  if (!translated) {
    translated = translateBlockConfig(config, t)
    byConfig.set(config, translated)
  }
  return translated
}

/** The `blocks` translator, typed for {@link translateBlockConfig}. */
export function useBlockTranslator(): BlockTranslator {
  return useTranslations('blocks')
}

/** A display copy of a block config, in the user's language (see {@link translateBlockConfig}). */
function useTranslatedBlockConfig<T extends BlockConfig | null | undefined>(config: T): T {
  const t = useBlockTranslator()
  return useMemo(() => (config ? translateCached(config, t) : config) as T, [config, t])
}

/**
 * The heading of a block instance and its display config: the stored name stays the reference
 * identifier, the heading reads the translated default while that name is still generated
 * (see {@link displayBlockName}).
 */
export function useBlockDisplay<T extends BlockConfig | null | undefined>(
  config: T,
  storedName: string
): { config: T; name: string } {
  const translated = useTranslatedBlockConfig(config)
  const name = useMemo(
    () => (config && translated ? displayBlockName(storedName, config, translated) : storedName),
    [config, translated, storedName]
  )
  return { config: translated, name }
}
