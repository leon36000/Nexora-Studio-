'use client'

import { useLocale } from 'next-intl'
import { getNexoraSiteUrl, type NexoraSiteLinks, nexoraSiteLinks } from '@/lib/nexora/site-links'
import { useNexoraHome } from '@/hooks/queries/nexora-home'

/**
 * Nexora edition: the pages of the person's Nexora AI account (account, wallet, token consumption)
 * in the interface language, `null` for a person who did not come by the site (an operator's
 * local account has no wallet there), while the status loads, or when the instance does not know
 * the site.
 */
export function useNexoraSiteLinks(): NexoraSiteLinks | null {
  const locale = useLocale()
  const { data: home } = useNexoraHome()
  return home?.viaSite ? nexoraSiteLinks(getNexoraSiteUrl(), locale) : null
}
