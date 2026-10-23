'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sim/emcn'
import { useFormatter, useTranslations } from 'next-intl'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import type { NexoraConsumption } from '@/hooks/queries/nexora-consumption'

interface ApiKeysConsumptionProps {
  apiKeys: NexoraConsumption['apiKeys']
}

/** Réglages › Consommation: what each developer API key used over the period. */
export function ApiKeysConsumption({ apiKeys }: ApiKeysConsumptionProps) {
  const t = useTranslations('developers.consumption')
  const format = useFormatter()
  const integer = (value: number) => format.number(value)

  return (
    <SettingsSection label={t('title')}>
      {apiKeys.length === 0 ? (
        <SettingsEmptyState variant='inline'>{t('empty')}</SettingsEmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.key')}</TableHead>
              <TableHead>{t('columns.scope')}</TableHead>
              <TableHead className='text-right'>{t('columns.requests')}</TableHead>
              <TableHead className='text-right'>{t('columns.modelTokens')}</TableHead>
              <TableHead className='text-right'>{t('columns.agentTokens')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.keyId}>
                <TableCell>
                  {key.name}
                  {key.revoked && (
                    <span className='ml-2 text-[var(--text-muted)] text-caption'>
                      {t('revoked')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {key.scope === 'instance'
                    ? t('instance')
                    : (key.workspaceName ?? t('deletedWorkspace'))}
                </TableCell>
                <TableCell className='text-right tabular-nums'>{integer(key.requests)}</TableCell>
                <TableCell className='text-right tabular-nums'>
                  {integer(key.modelTokens)}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {integer(key.agentTokens)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className='mt-3 text-[var(--text-muted)] text-caption'>{t('note')}</p>
    </SettingsSection>
  )
}
