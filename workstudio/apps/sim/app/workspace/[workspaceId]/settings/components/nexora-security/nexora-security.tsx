'use client'

import { useState } from 'react'
import { Chip, ChipCopyInput, Label, Skeleton, Switch, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import type { UpdateNexoraSettingsBody } from '@/lib/api/contracts/nexora-settings'
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
  useNexoraSettings,
  useTestNexoraSso,
  useUpdateNexoraSettings,
} from '@/hooks/queries/nexora-settings'

interface SecurityDraft {
  ssoEnabled: boolean
  issuer: string
  clientId: string
  /** Blank keeps the stored secret. */
  clientSecret: string
  buttonName: string
  required: boolean
  domains: string
}

function draftFrom(settings: NexoraSettings): SecurityDraft {
  return {
    ssoEnabled: settings.sso !== null,
    issuer: settings.sso?.issuer ?? '',
    clientId: settings.sso?.clientId ?? '',
    clientSecret: '',
    buttonName: settings.sso?.buttonName ?? '',
    required: settings.sso?.required ?? false,
    domains: settings.allowedDomains.join(', '),
  }
}

function parseDomains(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((domain) => domain.trim())
    .filter(Boolean)
}

function sameDraft(a: SecurityDraft, b: SecurityDraft): boolean {
  return (
    a.ssoEnabled === b.ssoEnabled &&
    a.issuer === b.issuer &&
    a.clientId === b.clientId &&
    a.clientSecret === b.clientSecret &&
    a.buttonName === b.buttonName &&
    a.required === b.required &&
    parseDomains(a.domains).join(',') === parseDomains(b.domains).join(',')
  )
}

/**
 * Réglages › Sécurité (Nexora edition): single sign-on with the company identity provider and the
 * domains whose addresses may sign up on their own. Saved settings take effect when WorkStudio
 * restarts (« Appliquer »); deploy/.env always wins and is shown read-only.
 */
export function NexoraSecuritySettings() {
  const t = useTranslations('settings.instanceSecurity')
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
  return <SecurityForm key={JSON.stringify(draftFrom(data))} settings={data} />
}

interface SecurityFormProps {
  settings: NexoraSettings
}

function SecurityForm({ settings }: SecurityFormProps) {
  const t = useTranslations('settings.instanceSecurity')
  const tShared = useTranslations('settings.instanceSettings')
  const update = useUpdateNexoraSettings()
  const testSso = useTestNexoraSso()
  const [initial] = useState(() => draftFrom(settings))
  const [draft, setDraft] = useState(initial)
  const overrides = settings.envOverrides
  const dirty = !sameDraft(draft, initial)

  useSettingsUnsavedGuard({
    isDirty: dirty,
    navigationBlocked: update.isPending,
    onDiscard: () => setDraft(initial),
  })

  const set = <K extends keyof SecurityDraft>(key: K, value: SecurityDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const ssoIncomplete =
    !overrides.sso &&
    draft.ssoEnabled &&
    (!draft.issuer.trim() ||
      !draft.clientId.trim() ||
      !draft.buttonName.trim() ||
      (!draft.clientSecret && !settings.sso?.hasSecret))

  const handleSave = () => {
    const body: UpdateNexoraSettingsBody = {}
    if (!overrides.sso) {
      if (draft.ssoEnabled) {
        body.sso = {
          issuer: draft.issuer.trim(),
          clientId: draft.clientId.trim(),
          clientSecret: draft.clientSecret || undefined,
          buttonName: draft.buttonName.trim(),
          required: draft.required,
        }
      } else if (settings.sso) {
        body.sso = null
      }
    }
    if (!overrides.domains) body.allowedDomains = parseDomains(draft.domains)
    update.mutate(body, {
      onSuccess: () => toast.success(tShared('saved')),
      onError: (cause) => toast.error(tShared(`errors.${getNexoraSettingsErrorCode(cause)}`)),
    })
  }

  const handleTest = () => {
    testSso.mutate(overrides.sso ? undefined : draft.issuer.trim() || undefined, {
      onSuccess: (result) => {
        if (!result.ok) {
          toast.error(t(`test.failures.${result.reason}`))
        } else if (result.issuerMatches) {
          toast.success(t('test.success', { issuer: result.issuer }))
        } else {
          toast.success(t('test.success', { issuer: result.issuer }), {
            description: t('test.issuerMismatch', { issuer: result.issuer }),
          })
        }
      },
      onError: (cause) => toast.error(tShared(`errors.${getNexoraSettingsErrorCode(cause)}`)),
    })
  }

  const ssoLocked = overrides.sso || update.isPending
  const showSsoFields = overrides.sso || draft.ssoEnabled

  return (
    <SettingsPanel
      actions={saveDiscardActions({
        dirty,
        saving: update.isPending,
        onSave: handleSave,
        onDiscard: () => setDraft(initial),
        saveDisabled: ssoIncomplete,
        saveTooltip: ssoIncomplete ? t('sso.incomplete') : undefined,
      })}
    >
      <div className='flex flex-col gap-7'>
        <ApplySettingsNotice pending={settings.pendingApply} dirty={dirty} />

        <SettingsSection label={t('sso.title')}>
          <div className='flex flex-col gap-4'>
            {overrides.sso ? (
              <p className='text-[var(--text-muted)] text-small'>{tShared('envOverride')}</p>
            ) : (
              <div className='flex items-center justify-between gap-3'>
                <Label htmlFor='nexora-sso-enabled'>{t('sso.enabled')}</Label>
                <Switch
                  id='nexora-sso-enabled'
                  checked={draft.ssoEnabled}
                  disabled={ssoLocked}
                  onCheckedChange={(checked) => set('ssoEnabled', checked)}
                />
              </div>
            )}

            {showSsoFields && !overrides.sso && (
              <>
                <SettingsTextField
                  id='nexora-sso-issuer'
                  label={t('sso.issuer')}
                  hint={t('sso.issuerHint')}
                  placeholder={t('sso.issuerPlaceholder')}
                  value={draft.issuer}
                  disabled={ssoLocked}
                  onValueChange={(value) => set('issuer', value)}
                />
                <SettingsTextField
                  id='nexora-sso-client-id'
                  label={t('sso.clientId')}
                  value={draft.clientId}
                  disabled={ssoLocked}
                  onValueChange={(value) => set('clientId', value)}
                />
                <SettingsTextField
                  id='nexora-sso-client-secret'
                  type='password'
                  label={t('sso.clientSecret')}
                  placeholder={settings.sso?.hasSecret ? tShared('secretSet') : ''}
                  value={draft.clientSecret}
                  disabled={ssoLocked}
                  onValueChange={(value) => set('clientSecret', value)}
                />
                <SettingsTextField
                  id='nexora-sso-button-name'
                  label={t('sso.buttonName')}
                  hint={t('sso.buttonNameHint')}
                  maxLength={60}
                  value={draft.buttonName}
                  disabled={ssoLocked}
                  onValueChange={(value) => set('buttonName', value)}
                />
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex flex-col gap-1'>
                    <Label htmlFor='nexora-sso-required'>{t('sso.required')}</Label>
                    <p className='text-[var(--text-muted)] text-caption'>{t('sso.requiredHint')}</p>
                  </div>
                  <Switch
                    id='nexora-sso-required'
                    checked={draft.required}
                    disabled={ssoLocked}
                    onCheckedChange={(checked) => set('required', checked)}
                  />
                </div>
              </>
            )}

            {showSsoFields && (
              <>
                <div className='flex flex-col gap-[9px]'>
                  <Label htmlFor='nexora-sso-redirect'>{t('sso.redirectUri')}</Label>
                  <ChipCopyInput
                    id='nexora-sso-redirect'
                    value={settings.redirectUri}
                    copyLabel={t('sso.copyRedirectUri')}
                    inputClassName='font-mono'
                  />
                </div>
                <div>
                  <Chip
                    variant='outline'
                    disabled={testSso.isPending || (!overrides.sso && !draft.issuer.trim())}
                    onClick={handleTest}
                  >
                    {testSso.isPending ? t('test.testing') : t('test.action')}
                  </Chip>
                </div>
              </>
            )}
          </div>
        </SettingsSection>

        <SettingsSection label={t('domains.title')}>
          {overrides.domains ? (
            <p className='text-[var(--text-muted)] text-small'>{tShared('envOverride')}</p>
          ) : (
            <SettingsTextField
              id='nexora-allowed-domains'
              label={t('domains.label')}
              hint={t('domains.hint')}
              placeholder={t('domains.placeholder')}
              value={draft.domains}
              disabled={update.isPending}
              onValueChange={(value) => set('domains', value)}
            />
          )}
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
