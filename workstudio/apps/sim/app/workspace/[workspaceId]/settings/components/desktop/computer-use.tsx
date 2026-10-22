'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComputerUseAppPermission } from '@sim/desktop-bridge'
import { Chip, ChipSwitch, Label, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { ComputerUseActivity } from '@/components/computer-use/activity'
import { getDesktopBridge } from '@/lib/desktop'
import { useFeatureFlag } from '@/app/workspace/[workspaceId]/providers/feature-flags-provider'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useComputerUseStatus } from '@/hooks/use-computer-use-status'

type SettingsAction = () => Promise<void> // i18n-ignore: type signature

export function ComputerUseSettings() {
  return (
    <>
      <ComputerUseActivity />
      <ComputerUseSettingsControls />
    </>
  )
}

function ComputerUseSettingsControls() {
  const t = useTranslations('settings.computerUse')
  const tShared = useTranslations('settings.shared')
  const requestVersion = useRef(0)
  const bridge = getDesktopBridge()?.computerUse
  const enabled = useFeatureFlag('mothership-computer-use')
  const { status, setStatus, refresh, error } = useComputerUseStatus()
  const [apps, setApps] = useState<ComputerUseAppPermission[]>([])
  const [pending, setPending] = useState(false)
  const refreshApps = useCallback(async () => {
    if (!bridge) return
    const version = ++requestVersion.current
    try {
      const approved = await bridge.listAppPermissions()
      if (version === requestVersion.current) setApps(approved)
    } catch {
      if (version === requestVersion.current) toast.error(t('loadAppsError'))
    }
  }, [bridge])
  useEffect(() => {
    if (!enabled) return
    void refreshApps()
    return () => {
      requestVersion.current += 1
    }
  }, [enabled, refreshApps, status?.activeAction])
  if (!bridge || !enabled || status?.supported === false) return null
  const update = async (action: SettingsAction) => {
    setPending(true)
    try {
      await action()
    } catch {
      toast.error(t('updateError'))
    } finally {
      setPending(false)
    }
  }
  return (
    <SettingsSection label={t('title')}>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <Label asChild>
            <span>{t('allowMacApps')}</span>
          </Label>
          <ChipSwitch
            aria-label={t('allowMacApps')}
            options={[
              { value: 'off', label: t('off') },
              { value: 'on', label: t('on') },
            ]}
            value={status?.enabled ? 'on' : 'off'}
            disabled={pending || !status}
            onChange={(value) =>
              void update(async () => setStatus(await bridge.setEnabled(value === 'on')))
            }
          />
        </div>
        <p className='text-[var(--text-muted)] text-sm'>{t('intro')}</p>
        {error && (
          <div className='flex items-center justify-between text-sm'>
            <span>{t('helperError')}</span>
            <Chip onClick={() => void refresh()}>{tShared('retry')}</Chip>
          </div>
        )}
        {(['accessibility', 'screenCapture'] as const).map((permission) => (
          <div className='flex items-center justify-between' key={permission}>
            <Label>{t(`permissions.${permission}`)}</Label>
            {status?.permissions[permission] ? (
              <span className='text-[var(--text-muted)] text-sm'>{t('allowed')}</span>
            ) : (
              <Chip
                aria-label={t('openSystemSettingsFor', {
                  permission: t(`permissions.${permission}`),
                })}
                disabled={pending || !status?.enabled}
                onClick={() =>
                  void update(async () => setStatus(await bridge.requestPermission(permission)))
                }
              >
                {t('openSystemSettings')}
              </Chip>
            )}
          </div>
        ))}
        <p className='text-[var(--text-muted)] text-sm'>{t('permissionsHint')}</p>
        {apps.length > 0 && (
          <div className='flex flex-col gap-2'>
            <Label>{t('approvedApps')}</Label>
            {apps.map((app) => (
              <div className='flex items-center justify-between gap-3' key={app.bundleId}>
                <span className='truncate text-sm' title={app.bundleId}>
                  {app.displayName}
                </span>
                <Chip
                  disabled={pending}
                  onClick={() =>
                    void update(async () => {
                      requestVersion.current += 1
                      await bridge.revokeApp(app.bundleId)
                      await refreshApps()
                    })
                  }
                >
                  {t('revoke')}
                </Chip>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
