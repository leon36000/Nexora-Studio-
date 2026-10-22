'use client'

import { ArrowLeft, Label, Switch, toast } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { useDeploymentShape } from '@/lib/core/config/deployment-shape'
import {
  getBrowserTelemetryPreference,
  setBrowserTelemetryPreference,
} from '@/lib/telemetry/browser-preference'
import { CookiePreferences } from '@/app/workspace/[workspaceId]/settings/components/general/components/cookie-preferences'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useGeneralSettings, useUpdateGeneralSetting } from '@/hooks/queries/general-settings'

interface PrivacyViewProps {
  onBack: () => void
}

/**
 * Privacy sub-view of General — the one place a signed-in user changes what Sim
 * may collect.
 *
 * A detail sub-view rather than its own settings tab: the nav is already long,
 * and a tab a user opens once and never returns to is the wrong weight for it.
 * Telemetry shows everywhere; cookies only on the hosted service, which is the
 * only deployment that sets them.
 */
export function PrivacyView({ onBack }: PrivacyViewProps) {
  const t = useTranslations('settings.general.privacy')
  const { data: settings } = useGeneralSettings()
  const updateSetting = useUpdateGeneralSetting()
  const { hosted } = useDeploymentShape()

  const handleTelemetryToggle = async (checked: boolean) => {
    if (checked === settings?.telemetryEnabled || updateSetting.isPending) return

    const previous = getBrowserTelemetryPreference()
    setBrowserTelemetryPreference(false)
    try {
      await updateSetting.mutateAsync({ key: 'telemetryEnabled', value: checked })
      setBrowserTelemetryPreference(checked)
    } catch (error) {
      setBrowserTelemetryPreference(previous)
      toast.error(getErrorMessage(error, t('telemetrySaveFailed')))
    }
  }

  return (
    <SettingsPanel
      back={{ text: t('back'), icon: ArrowLeft, onSelect: onBack }}
      title={t('title')}
      description={t('description')}
    >
      <SettingsSection label={t('telemetry')}>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='telemetry'>{t('allowTelemetry')}</Label>
            <Switch
              id='telemetry'
              checked={settings?.telemetryEnabled ?? true}
              disabled={!settings || updateSetting.isPending}
              onCheckedChange={handleTelemetryToggle}
            />
          </div>
          <p className='text-[var(--text-muted)] text-small'>{t('telemetryHint')}</p>
        </div>
      </SettingsSection>

      {hosted && <CookiePreferences />}
    </SettingsPanel>
  )
}
