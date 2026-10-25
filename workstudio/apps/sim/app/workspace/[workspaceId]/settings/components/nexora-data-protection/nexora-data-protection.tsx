'use client'

import { useState } from 'react'
import { ChipSelect, Skeleton, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import {
  draftFromOverview,
  type PolicyDraft,
  policyChange,
  samePolicyDraft,
  type WorkspaceChoice,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-data-protection/policy-draft'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  type NexoraDataProtection,
  useNexoraDataProtection,
  useUpdateNexoraDataProtection,
} from '@/hooks/queries/nexora-data-protection'

const MODES = ['allow', 'mask', 'refuse'] as const

/**
 * Réglages › Données personnelles (Nexora edition, instance admins): what happens to personal data
 * on its way to a model outside this server — sent as it is, masked, or refused — for the whole
 * instance and for each workspace.
 */
export function NexoraDataProtectionSettings() {
  const t = useTranslations('settings.dataProtection')
  const { data, error, isLoading, isFetching, refetch } = useNexoraDataProtection()

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
        <SettingsQueryErrorState
          error={error}
          fallback={t('loadError')}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      </SettingsPanel>
    )
  }
  return <PolicyForm key={JSON.stringify(draftFromOverview(data))} overview={data} />
}

interface PolicyFormProps {
  overview: NexoraDataProtection
}

function PolicyForm({ overview }: PolicyFormProps) {
  const t = useTranslations('settings.dataProtection')
  const update = useUpdateNexoraDataProtection()
  const [initial] = useState(() => draftFromOverview(overview))
  const [draft, setDraft] = useState<PolicyDraft>(initial)
  const dirty = !samePolicyDraft(draft, initial)

  useSettingsUnsavedGuard({
    isDirty: dirty,
    navigationBlocked: update.isPending,
    onDiscard: () => setDraft(initial),
  })

  const handleSave = () => {
    const change = policyChange(initial, draft)
    if (!change) return
    update.mutate(change, {
      onSuccess: () => toast.success(t('saved')),
      onError: () => toast.error(t('saveError')),
    })
  }

  const modeOptions = MODES.map((mode) => ({ value: mode, label: t(`modes.${mode}`) }))
  const choiceOptions = [
    { value: 'inherit', label: t('inherit', { mode: t(`modes.${draft.defaultMode}`) }) },
    ...modeOptions,
  ]
  const setChoice = (workspaceId: string, choice: WorkspaceChoice) =>
    setDraft((current) => ({
      ...current,
      choices: { ...current.choices, [workspaceId]: choice },
    }))

  return (
    <SettingsPanel
      actions={saveDiscardActions({
        dirty,
        saving: update.isPending,
        onSave: handleSave,
        onDiscard: () => setDraft(initial),
      })}
    >
      <div className='flex flex-col gap-7'>
        <SettingsSection label={t('service.title')}>
          <p role='status' className='text-[var(--text-muted)] text-small'>
            {!overview.service.configured
              ? t('service.notInstalled')
              : overview.service.reachable
                ? t('service.running')
                : t('service.down')}
          </p>
        </SettingsSection>

        <SettingsSection
          label={t('instance.title')}
          action={
            <ChipSelect
              value={draft.defaultMode}
              disabled={update.isPending}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  defaultMode: MODES.find((mode) => mode === value) ?? current.defaultMode,
                }))
              }
              options={modeOptions}
              align='end'
            />
          }
        >
          <p className='text-[var(--text-muted)] text-small'>{t('instance.hint')}</p>
        </SettingsSection>

        <SettingsSection label={t('workspaces.title')}>
          {overview.workspaces.length === 0 ? (
            <SettingsEmptyState variant='inline'>{t('workspaces.empty')}</SettingsEmptyState>
          ) : (
            <div className={RESOURCE_LIST_STACK}>
              {overview.workspaces.map((workspace) => (
                <SettingsResourceRow
                  key={workspace.id}
                  title={workspace.name}
                  description={
                    workspace.status === 'archived' ? t('workspaces.archived') : undefined
                  }
                  trailing={
                    <ChipSelect
                      value={draft.choices[workspace.id] ?? 'inherit'}
                      disabled={update.isPending}
                      onChange={(value) =>
                        setChoice(
                          workspace.id,
                          value === 'inherit'
                            ? 'inherit'
                            : (MODES.find((m) => m === value) ?? 'inherit')
                        )
                      }
                      options={choiceOptions}
                      align='end'
                    />
                  }
                />
              ))}
            </div>
          )}
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
