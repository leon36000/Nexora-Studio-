// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import { Checkbox, Label } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { modelRows, setModelAllowed } from '@/ee/access-control/components/denied-models'
import { useNexoraModels } from '@/hooks/queries/nexora-models'

interface GroupModelsProps {
  /** The WorkStudio ids (`vllm/<name>`) the group may not use. */
  denied: string[]
  onChange: (denied: string[]) => void
  disabled: boolean
}

/**
 * The models a group may choose, in blocks and through the API: a ticked model is allowed. A
 * model added later is allowed until someone unticks it. Only instance administrators read the
 * model list, so for anyone else the section is simply absent.
 */
export function GroupModels({ denied, onChange, disabled }: GroupModelsProps) {
  const t = useTranslations('settings.accessGroups.models')
  const tCard = useTranslations('settings.models.card.locations')
  const { data } = useNexoraModels()
  if (!data) return null
  const rows = modelRows(data.models, denied)

  return (
    <SettingsSection label={t('title')}>
      {rows.length === 0 ? (
        <SettingsEmptyState variant='inline'>{t('empty')}</SettingsEmptyState>
      ) : (
        <div className='flex flex-col gap-2'>
          {rows.map((row) => {
            const id = `access-model-${row.id}`
            return (
              <div key={row.id} className='flex items-center gap-2'>
                <Checkbox
                  id={id}
                  size='sm'
                  checked={row.allowed}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onChange(setModelAllowed(denied, row.id, checked === true))
                  }
                />
                <Label htmlFor={id}>{row.name}</Label>
                {row.location && (
                  <span className='text-[var(--text-muted)] text-caption'>
                    {tCard(row.location as 'local')}
                  </span>
                )}
                {row.isDefault && (
                  <span className='text-[var(--text-muted)] text-caption'>{t('default')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SettingsSection>
  )
}
