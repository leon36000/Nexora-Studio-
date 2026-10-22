'use client'

import type { DesktopAppearanceTheme } from '@sim/desktop-bridge'
import { ChipSelect } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface AppearanceThemeSelectProps {
  value: DesktopAppearanceTheme
  onChange: (value: DesktopAppearanceTheme) => void
  disabled?: boolean
  ariaLabel: string
}

/** Settings dropdown for the device-owned browser theme. */
export function AppearanceThemeSelect({
  value,
  onChange,
  disabled,
  ariaLabel,
}: AppearanceThemeSelectProps) {
  const t = useTranslations('settings.appearance.themes')
  return (
    <div className='w-[240px] max-w-[55%] shrink-0 md:max-w-none'>
      <ChipSelect
        aria-label={ariaLabel}
        align='start'
        fullWidth
        dropdownWidth='trigger'
        value={value}
        onChange={(next) => onChange(next as DesktopAppearanceTheme)}
        disabled={disabled}
        options={[
          { label: 'Nexora', value: 'app' },
          { label: t('light'), value: 'light' },
          { label: t('dark'), value: 'dark' },
        ]}
      />
    </div>
  )
}
