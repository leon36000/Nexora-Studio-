'use client'

import { useState } from 'react'
import { Chip, Label, Skeleton, Switch, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import {
  ApplySettingsNotice,
  SettingsTextField,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-instance/instance-settings-ui'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  getNexoraSettingsErrorCode,
  type NexoraSettings,
  type NexoraSmtpDraft,
  useNexoraSettings,
  useTestNexoraEmail,
  useUpdateNexoraSettings,
} from '@/hooks/queries/nexora-settings'

interface EmailDraft {
  enabled: boolean
  host: string
  port: string
  user: string
  /** Blank keeps the stored password. */
  password: string
  from: string
}

const DEFAULT_SMTP_PORT = '587'

function draftFrom(settings: NexoraSettings): EmailDraft {
  return {
    enabled: settings.smtp !== null,
    host: settings.smtp?.host ?? '',
    port: settings.smtp ? String(settings.smtp.port) : DEFAULT_SMTP_PORT,
    user: settings.smtp?.user ?? '',
    password: '',
    from: settings.smtp?.from ?? '',
  }
}

function toSmtp(draft: EmailDraft): NexoraSmtpDraft | null {
  const port = Number(draft.port)
  if (!draft.host.trim() || !Number.isInteger(port) || port < 1 || port > 65535) return null
  return {
    host: draft.host.trim(),
    port,
    user: draft.user.trim() || undefined,
    password: draft.password || undefined,
    from: draft.from.trim() || undefined,
  }
}

/**
 * Réglages › E-mail (Nexora edition): the SMTP server WorkStudio sends invitations, password
 * resets and notifications through. A test e-mail goes to the administrator before anything is
 * saved; the saved server takes effect when WorkStudio restarts (« Appliquer »).
 */
export function NexoraEmailSettings() {
  const t = useTranslations('settings.instanceEmail')
  const tShared = useTranslations('settings.instanceSettings')
  const { data, error, isLoading, isFetching, refetch } = useNexoraSettings()

  if (isLoading) {
    return (
      <SettingsPanel>
        <Skeleton className='h-[240px] w-full rounded-lg' />
      </SettingsPanel>
    )
  }
  if (!data) {
    return (
      <SettingsPanel>
        {getNexoraSettingsErrorCode(error) === 'forbidden' ? (
          <SettingsEmptyState>{tShared('errors.forbidden')}</SettingsEmptyState>
        ) : (
          <SettingsQueryErrorState
            error={error}
            fallback={t('loadError')}
            isRetrying={isFetching}
            onRetry={() => void refetch()}
          />
        )}
      </SettingsPanel>
    )
  }
  return <EmailForm key={JSON.stringify(draftFrom(data))} settings={data} />
}

interface EmailFormProps {
  settings: NexoraSettings
}

function EmailForm({ settings }: EmailFormProps) {
  const t = useTranslations('settings.instanceEmail')
  const tShared = useTranslations('settings.instanceSettings')
  const update = useUpdateNexoraSettings()
  const testEmail = useTestNexoraEmail()
  const [initial] = useState(() => draftFrom(settings))
  const [draft, setDraft] = useState(initial)
  const overridden = settings.envOverrides.smtp
  const dirty = (Object.keys(draft) as (keyof EmailDraft)[]).some(
    (key) => draft[key] !== initial[key]
  )
  const smtp = toSmtp(draft)
  const incomplete = !overridden && draft.enabled && smtp === null

  useSettingsUnsavedGuard({
    isDirty: dirty,
    navigationBlocked: update.isPending,
    onDiscard: () => setDraft(initial),
  })

  const set = <K extends keyof EmailDraft>(key: K, value: EmailDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const handleSave = () => {
    if (draft.enabled ? smtp === null : settings.smtp === null) return
    update.mutate(
      { smtp: draft.enabled ? smtp : null },
      {
        onSuccess: () => toast.success(tShared('saved')),
        onError: (cause) => toast.error(tShared(`errors.${getNexoraSettingsErrorCode(cause)}`)),
      }
    )
  }

  const handleTest = () => {
    testEmail.mutate(overridden ? undefined : (smtp ?? undefined), {
      onSuccess: (result) => {
        if (result.ok) {
          toast.success(t('test.success', { address: result.sentTo }))
        } else {
          toast.error(t(`test.failures.${result.reason}`), {
            description: result.detail || undefined,
          })
        }
      },
      onError: (cause) => toast.error(tShared(`errors.${getNexoraSettingsErrorCode(cause)}`)),
    })
  }

  const locked = overridden || update.isPending
  const canTest = !testEmail.isPending && (overridden || (draft.enabled && smtp !== null))

  return (
    <SettingsPanel
      actions={saveDiscardActions({
        dirty,
        saving: update.isPending,
        onSave: handleSave,
        onDiscard: () => setDraft(initial),
        saveDisabled: incomplete,
        saveTooltip: incomplete ? t('incomplete') : undefined,
      })}
    >
      <div className='flex flex-col gap-7'>
        <ApplySettingsNotice pending={settings.pendingApply} dirty={dirty} />

        <SettingsSection label={t('title')}>
          <div className='flex flex-col gap-4'>
            {overridden ? (
              <p className='text-[var(--text-muted)] text-small'>{tShared('envOverride')}</p>
            ) : (
              <>
                <div className='flex items-center justify-between gap-3'>
                  <Label htmlFor='nexora-smtp-enabled'>{t('enabled')}</Label>
                  <Switch
                    id='nexora-smtp-enabled'
                    checked={draft.enabled}
                    disabled={locked}
                    onCheckedChange={(checked) => set('enabled', checked)}
                  />
                </div>
                {draft.enabled && (
                  <>
                    <div className='grid grid-cols-[1fr_8rem] gap-3'>
                      <SettingsTextField
                        id='nexora-smtp-host'
                        label={t('host')}
                        placeholder={t('hostPlaceholder')}
                        value={draft.host}
                        disabled={locked}
                        onValueChange={(value) => set('host', value)}
                      />
                      <SettingsTextField
                        id='nexora-smtp-port'
                        label={t('port')}
                        inputMode='numeric'
                        value={draft.port}
                        disabled={locked}
                        onValueChange={(value) => set('port', value.replace(/\D/g, ''))}
                      />
                    </div>
                    <SettingsTextField
                      id='nexora-smtp-user'
                      label={t('user')}
                      value={draft.user}
                      disabled={locked}
                      onValueChange={(value) => set('user', value)}
                    />
                    <SettingsTextField
                      id='nexora-smtp-password'
                      type='password'
                      label={t('password')}
                      placeholder={settings.smtp?.hasPassword ? tShared('secretSet') : ''}
                      value={draft.password}
                      disabled={locked}
                      onValueChange={(value) => set('password', value)}
                    />
                    <SettingsTextField
                      id='nexora-smtp-from'
                      label={t('from')}
                      hint={t('fromHint')}
                      placeholder={t('fromPlaceholder')}
                      value={draft.from}
                      disabled={locked}
                      onValueChange={(value) => set('from', value)}
                    />
                  </>
                )}
              </>
            )}
            {(overridden || draft.enabled) && (
              <div>
                <Chip variant='outline' disabled={!canTest} onClick={handleTest}>
                  {testEmail.isPending ? t('test.sending') : t('test.action')}
                </Chip>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
