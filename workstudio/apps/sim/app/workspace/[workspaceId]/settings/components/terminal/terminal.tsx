'use client'

import { useEffect, useState } from 'react'
import type {
  DesktopAppearanceTheme,
  DesktopPreferences,
  DesktopZoomPercent,
  TerminalThemeProfile,
} from '@sim/desktop-bridge'
import { Label, Switch, toast } from '@sim/emcn'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getDesktopBridge } from '@/lib/desktop'
import { loadDesktopTerminalThemeProfiles } from '@/lib/desktop/appearance'
import { DefaultZoomSelect } from '@/app/workspace/[workspaceId]/settings/components/default-zoom-select'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { TerminalThemePicker } from '@/app/workspace/[workspaceId]/settings/components/terminal/terminal-theme-picker'
import { useDesktopPreferenceMutation } from '@/hooks/use-desktop-preference-mutation'

export function Terminal() {
  const t = useTranslations('settings.terminal')
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const [preferences, setPreferences] = useState<DesktopPreferences | null>(null)
  const [profiles, setProfiles] = useState<TerminalThemeProfile[]>([])

  useEffect(() => {
    const bridge = getDesktopBridge()
    if (!bridge?.terminal) {
      router.replace(`/workspace/${workspaceId}/settings/general`)
      return
    }
    void Promise.all([bridge.settings.getPreferences(), loadDesktopTerminalThemeProfiles()])
      .then(([nextPreferences, nextProfiles]) => {
        setPreferences(nextPreferences)
        setProfiles(nextProfiles)
      })
      .catch(() => toast.error(t('errors.load')))
  }, [router, workspaceId])

  const { pending: togglePending, mutate: setEnabled } = useDesktopPreferenceMutation(
    (bridge, enabled: boolean) => bridge.settings.setPreference('terminalEnabled', enabled),
    t('errors.update'),
    setPreferences
  )

  // A missing profile resolves without preferences; surface that as the same
  // failure a rejected call reports.
  const { pending: profilePending, mutate: selectProfile } = useDesktopPreferenceMutation(
    async (bridge, profile: TerminalThemeProfile) => {
      if (!bridge.terminalThemes) return undefined
      const next = await bridge.terminalThemes.selectProfile(profile.id)
      if (!next) throw new Error('unknown terminal theme profile')
      return next
    },
    t('errors.selectTheme'),
    setPreferences
  )

  const { pending: builtInThemePending, mutate: setTheme } = useDesktopPreferenceMutation(
    (bridge, theme: DesktopAppearanceTheme) => bridge.settings.setTerminalTheme(theme),
    t('errors.updateAppearance'),
    setPreferences
  )

  const { pending: zoomPending, mutate: setDefaultZoom } = useDesktopPreferenceMutation(
    (bridge, zoom: DesktopZoomPercent) => bridge.settings.setTerminalDefaultZoom(zoom),
    t('errors.updateZoom'),
    setPreferences
  )

  const themePending = profilePending || builtInThemePending

  if (!preferences) {
    return null
  }

  return (
    <SettingsPanel>
      <SettingsSection label={t('general')}>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='terminal-enabled'>{t('letChatRunCommands')}</Label>
            <Switch
              id='terminal-enabled'
              checked={preferences.terminalEnabled}
              disabled={togglePending}
              onCheckedChange={(checked) => void setEnabled(checked)}
            />
          </div>

          <div className='flex items-center justify-between gap-4'>
            <Label>{t('theme')}</Label>
            <TerminalThemePicker
              value={preferences.terminalTheme}
              profiles={profiles}
              disabled={themePending}
              onBuiltInSelect={(theme) => void setTheme(theme)}
              onProfileSelect={(profile) => void selectProfile(profile)}
            />
          </div>

          <div className='flex items-center justify-between gap-4'>
            <Label>{t('defaultZoom')}</Label>
            <DefaultZoomSelect
              ariaLabel={t('defaultZoomLabel')}
              value={preferences.terminalDefaultZoom}
              onChange={(zoom) => void setDefaultZoom(zoom)}
              disabled={zoomPending}
            />
          </div>
        </div>
      </SettingsSection>
    </SettingsPanel>
  )
}
