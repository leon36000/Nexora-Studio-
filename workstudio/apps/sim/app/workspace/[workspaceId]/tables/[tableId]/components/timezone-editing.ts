import { sanitizeTimezoneForDisplay } from '@/lib/core/utils/timezone'
import type { TimezoneState } from '@/hooks/queries/general-settings'

/** Translator scoped to the `tables.timezone` namespace. */
type Translate = (key: string, values?: Record<string, string | number>) => string

export function getTimezoneEditBlockedMessage(state: TimezoneState, t: Translate): string | null {
  if (state.status === 'ready') return null
  if (state.status === 'loading') {
    return t('loadingMessage')
  }
  if (state.status === 'error') {
    return t('errorMessage')
  }
  const savedTimezone = sanitizeTimezoneForDisplay(state.savedTimezone ?? '')
  return t('invalidMessage', { timezone: savedTimezone })
}
