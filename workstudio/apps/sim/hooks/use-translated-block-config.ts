'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { type BlockTranslator, translateBlockConfig } from '@/lib/i18n/blocks'
import type { BlockConfig } from '@/blocks/types'

/** The `blocks` translator, typed for {@link translateBlockConfig}. */
export function useBlockTranslator(): BlockTranslator {
  return useTranslations('blocks')
}

/** A display copy of a block config, in the user's language (see {@link translateBlockConfig}). */
export function useTranslatedBlockConfig<T extends BlockConfig | null | undefined>(config: T): T {
  const t = useBlockTranslator()
  return useMemo(() => (config ? translateBlockConfig(config, t) : config) as T, [config, t])
}
