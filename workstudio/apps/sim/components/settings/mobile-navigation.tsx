'use client'

import { Chip, ChipSelect, SimWordmark } from '@sim/emcn'
import { ChevronLeft } from '@sim/emcn/icons'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  SETTINGS_PLANE_CHROME,
  type SettingsNavigationItem,
  type SettingsSection,
  type StandaloneSettingsPlane,
} from '@/components/settings/navigation'
import { usePendingSettingsSelection } from '@/components/settings/use-pending-settings-selection'
import { useSettingsNavCopy } from '@/components/settings/use-settings-nav-copy'
import { APP_ENTRY_PATH, LANDING_HREF } from '@/lib/navigation/paths'
import { popSettingsReturnUrl } from '@/lib/navigation/settings-return'
import { useSettingsDirtyStore } from '@/stores/settings/dirty/store'

interface SettingsMobileNavigationProps<Section extends SettingsSection> {
  activeSection: Section
  plane: StandaloneSettingsPlane
  items: readonly SettingsNavigationItem<Section>[]
  hrefForSection: (section: Section) => string
}

/** Guarded section and exit navigation for standalone settings on narrow screens. */
export function SettingsMobileNavigation<Section extends SettingsSection>({
  activeSection,
  plane,
  items,
  hrefForSection,
}: SettingsMobileNavigationProps<Section>) {
  const router = useRouter()
  const t = useTranslations('settings.nav.chrome')
  const navCopy = useSettingsNavCopy()
  const { activeSection: selectedSection, navigateToSection } =
    usePendingSettingsSelection(activeSection)
  const requestLeave = useSettingsDirtyStore((state) => state.requestLeave)

  return (
    <nav
      aria-label={t('navigation')}
      className='flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2 md:hidden'
    >
      {SETTINGS_PLANE_CHROME[plane].showWordmark ? (
        <button
          type='button'
          aria-label={t('home')}
          onClick={() => requestLeave(() => router.push(LANDING_HREF))}
          className='flex min-h-11 shrink-0 items-center px-2 transition-opacity hover-hover:opacity-70'
        >
          <SimWordmark />
        </button>
      ) : (
        <Chip
          leftIcon={ChevronLeft}
          onClick={() => requestLeave(() => router.push(popSettingsReturnUrl(APP_ENTRY_PATH)))}
        >
          {t('back')}
        </Chip>
      )}
      <ChipSelect
        value={selectedSection}
        options={items.map((item) => ({
          value: item.id,
          label: navCopy.label(item),
          icon: item.icon,
        }))}
        onChange={(value) => {
          const item = items.find((candidate) => candidate.id === value)
          if (!item || item.id === selectedSection) return
          requestLeave(() => navigateToSection(item.id, hrefForSection(item.id)))
        }}
        align='end'
        modal={false}
        searchable
        className='min-w-0 max-w-full'
      />
    </nav>
  )
}
