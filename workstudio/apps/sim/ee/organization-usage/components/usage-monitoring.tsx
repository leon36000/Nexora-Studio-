// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sim/emcn'
import { useFormatter, useTranslations } from 'next-intl'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { ApiClientError } from '@/lib/api/client/errors'
import { useNexoraUsage } from '@/hooks/queries/nexora-usage'

interface UsageMonitoringProps {
  organizationId: string
  eventsHref?: string
  auditLogsHref?: string
}

const PERIOD_DAYS = 30

/**
 * Nexora edition: model consumption of the instance as metered by Nexora API — requests
 * and tokens over the last 30 days, then day by day. Visible quotas, no surprise bill.
 */
export function UsageMonitoring(_props: UsageMonitoringProps) {
  const t = useTranslations('governance.usage')
  const format = useFormatter()
  const { data, error, isLoading } = useNexoraUsage(PERIOD_DAYS)

  if (isLoading) {
    return (
      <SettingsPanel>
        <p className='px-2 py-6 text-[var(--text-muted)] text-small'>{t('loading')}</p>
      </SettingsPanel>
    )
  }
  if (error || !data) {
    const forbidden = error instanceof ApiClientError && error.status === 403
    return (
      <SettingsPanel>
        <p className='px-2 py-6 text-[var(--text-error)] text-small'>
          {t(forbidden ? 'forbidden' : 'unavailable')}
        </p>
      </SettingsPanel>
    )
  }

  const tiles = [
    { label: t('totals.requests'), value: data.totals.requests },
    { label: t('totals.promptTokens'), value: data.totals.promptTokens },
    { label: t('totals.completionTokens'), value: data.totals.completionTokens },
    { label: t('totals.totalTokens'), value: data.totals.totalTokens },
  ]

  return (
    <SettingsPanel>
      <div className='flex flex-col gap-6'>
        <p className='px-2 text-[var(--text-muted)] text-small'>
          {t('period', { days: PERIOD_DAYS })}
        </p>
        <div className='grid grid-cols-2 gap-3 px-2 md:grid-cols-4'>
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className='flex flex-col gap-1 rounded-lg border border-[var(--border)] px-3 py-2'
            >
              <span className='text-[var(--text-muted)] text-caption'>{tile.label}</span>
              <span className='text-lg tabular-nums'>{format.number(tile.value)}</span>
            </div>
          ))}
        </div>
        {data.days.length === 0 ? (
          <p className='px-2 text-[var(--text-muted)] text-small'>{t('empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.date')}</TableHead>
                <TableHead>{t('columns.requests')}</TableHead>
                <TableHead>{t('columns.promptTokens')}</TableHead>
                <TableHead>{t('columns.completionTokens')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.days.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>
                    {format.dateTime(new Date(`${day.date}T00:00:00Z`), {
                      dateStyle: 'medium',
                      timeZone: 'UTC',
                    })}
                  </TableCell>
                  <TableCell className='tabular-nums'>{format.number(day.requests)}</TableCell>
                  <TableCell className='tabular-nums'>{format.number(day.promptTokens)}</TableCell>
                  <TableCell className='tabular-nums'>
                    {format.number(day.completionTokens)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </SettingsPanel>
  )
}
