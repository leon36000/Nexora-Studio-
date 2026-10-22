'use client'

import type { TerminalAppearanceTheme, TerminalThemeProfile } from '@sim/desktop-bridge'
import { ChipCombobox } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { withSelectedProfile } from '@/lib/desktop/appearance'

interface TerminalThemePickerProps {
  value: TerminalAppearanceTheme
  profiles: TerminalThemeProfile[]
  disabled?: boolean
  onBuiltInSelect: (theme: 'app' | 'light' | 'dark') => void
  onProfileSelect: (profile: TerminalThemeProfile) => void
}

const BUILT_IN_THEMES = ['app', 'light', 'dark'] as const

function sourceLabel(source: TerminalThemeProfile['source']): string {
  return source === 'iterm2' ? 'iTerm2' : 'Terminal'
}

/** Searchable theme picker using the same ChipCombobox as General's timezone field. */
export function TerminalThemePicker({
  value,
  profiles,
  disabled,
  onBuiltInSelect,
  onProfileSelect,
}: TerminalThemePickerProps) {
  const t = useTranslations('settings.terminal.themePicker')
  const availableProfiles = withSelectedProfile(profiles, value)
  const selectedValue = typeof value === 'string' ? value : value.id

  return (
    <div className='w-[240px] max-w-[55%] shrink-0 md:max-w-none'>
      <ChipCombobox
        aria-label={t('label')}
        align='start'
        searchable
        searchPlaceholder={t('searchPlaceholder')}
        dropdownWidth={240}
        value={selectedValue}
        disabled={disabled}
        placeholder={t('placeholder')}
        options={[
          ...BUILT_IN_THEMES.map((theme) => ({ value: theme, label: t(`builtIn.${theme}`) })),
          ...availableProfiles.map((profile) => ({
            label: t('profileOption', { source: sourceLabel(profile.source), name: profile.name }),
            value: profile.id,
          })),
        ]}
        onChange={(next) => {
          if (next === 'app' || next === 'light' || next === 'dark') {
            onBuiltInSelect(next)
            return
          }
          const profile = availableProfiles.find(({ id }) => id === next)
          if (profile) onProfileSelect(profile)
        }}
      />
    </div>
  )
}
