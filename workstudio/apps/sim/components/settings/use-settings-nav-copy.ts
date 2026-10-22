import { useTranslations } from 'next-intl'
import type {
  SettingsNavGroupKey,
  SettingsNavMessageKey,
  StandaloneSettingsPlane,
} from '@/components/settings/navigation'

interface LocalizableNavItem {
  messageKey: SettingsNavMessageKey
  description?: string
}

/**
 * Localized copy for settings navigation entries. The catalog in `navigation.ts` keeps
 * English values for non-rendering consumers; every surface that shows a section name,
 * description, group heading, or plane name reads it here so it follows the locale.
 */
export function useSettingsNavCopy() {
  const t = useTranslations('settings')
  return {
    label: (item: LocalizableNavItem) => t(`${item.messageKey}.label`),
    /** Empty when the entry has no description (the organization's Sources page). */
    description: (item: LocalizableNavItem) =>
      item.description ? t(`${item.messageKey}.description`) : '',
    group: (key: SettingsNavGroupKey) => t(`nav.groups.${key}`),
    plane: (plane: StandaloneSettingsPlane) => t(`nav.planes.${plane}`),
  }
}
