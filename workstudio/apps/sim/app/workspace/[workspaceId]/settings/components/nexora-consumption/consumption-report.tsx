'use client'

import { Avatar, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sim/emcn'
import { useFormatter, useTranslations } from 'next-intl'
import { ApiKeysConsumption } from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/api-keys-consumption'
import { DailyChart } from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/daily-chart'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import type { NexoraConsumption } from '@/hooks/queries/nexora-consumption'

interface ConsumptionReportProps {
  report: NexoraConsumption
}

interface TileProps {
  label: string
  value: string
  /** The exact figure, when `value` is rounded. */
  title?: string
  detail?: string
}

function Tile({ label, value, title, detail }: TileProps) {
  return (
    <div className='flex flex-col gap-1 rounded-lg border border-[var(--border)] px-3 py-2'>
      <span className='text-[var(--text-muted)] text-caption'>{label}</span>
      <span className='text-[var(--text-body)] text-lg tabular-nums' title={title}>
        {value}
      </span>
      {detail && <span className='text-[var(--text-muted)] text-caption'>{detail}</span>}
    </div>
  )
}

/**
 * The read-only part of Réglages › Consommation: totals with the carbon footprint and its car
 * equivalent, the daily chart, then the tables per model, workspace and person.
 */
export function ConsumptionReport({ report }: ConsumptionReportProps) {
  const t = useTranslations('governance.consumption')
  const format = useFormatter()
  const integer = (value: number) => format.number(value)
  const compact = (value: number) =>
    format.number(value, { notation: 'compact', maximumFractionDigits: 1 })
  const measure = (value: number) => format.number(value, { maximumSignificantDigits: 3 })
  const { measured, workstudio } = report
  const unavailable = t('unavailable')
  const tokens = measured?.totalTokens ?? workstudio.totalTokens
  const footprint = (row: { footprint: { kgCO2eq: number } | null }) =>
    row.footprint ? measure(row.footprint.kgCO2eq) : '—'

  return (
    <div className='flex flex-col gap-7'>
      {!report.nexoraApiAvailable && (
        <p
          role='status'
          className='rounded-lg border border-[var(--border)] px-3 py-2.5 text-[var(--text-body)] text-small'
        >
          {t('apiUnavailable')}
        </p>
      )}

      <div className='flex flex-col gap-3'>
        <div className='grid grid-cols-2 gap-3 md:grid-cols-5'>
          <Tile
            label={t('tiles.requests')}
            value={measured ? compact(measured.requests) : unavailable}
            title={measured ? integer(measured.requests) : undefined}
          />
          <Tile
            label={t('tiles.tokens')}
            value={compact(tokens)}
            title={integer(tokens)}
            detail={measured ? t('tiles.tokensFromApi') : t('tiles.tokensFromWorkstudio')}
          />
          <Tile
            label={t('tiles.executions')}
            value={compact(workstudio.executions)}
            title={integer(workstudio.executions)}
          />
          <Tile
            label={t('tiles.energy')}
            value={measured ? t('units.kWh', { value: measure(measured.kWh) }) : unavailable}
          />
          <Tile
            label={t('tiles.footprint')}
            value={
              measured ? t('units.kgCO2eq', { value: measure(measured.kgCO2eq) }) : unavailable
            }
            detail={
              measured
                ? t('carEquivalent', {
                    km: format.number(measured.carKm, {
                      maximumFractionDigits: measured.carKm < 10 ? 1 : 0,
                    }),
                  })
                : undefined
            }
          />
        </div>
        <p className='text-[var(--text-muted)] text-caption'>
          {t('tokensSource')}{' '}
          {t('co2Source', {
            factor: format.number(report.carEmissionFactor.kgCO2eqPerKm),
            source: report.carEmissionFactor.source,
            date: format.dateTime(new Date(`${report.carEmissionFactor.recordedOn}T12:00:00Z`), {
              dateStyle: 'long',
              timeZone: 'UTC',
            }),
          })}
        </p>
      </div>

      <SettingsSection label={t('daily.title')}>
        <DailyChart days={report.days} />
      </SettingsSection>

      <SettingsSection label={t('models.title')}>
        {report.models === null ? (
          <SettingsEmptyState variant='inline'>{t('models.unavailable')}</SettingsEmptyState>
        ) : report.models.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('models.empty')}</SettingsEmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('models.columns.model')}</TableHead>
                <TableHead className='text-right'>{t('models.columns.requests')}</TableHead>
                <TableHead className='text-right'>{t('models.columns.tokens')}</TableHead>
                <TableHead className='text-right'>{t('models.columns.energy')}</TableHead>
                <TableHead className='text-right'>{t('models.columns.footprint')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.models.map((model) => (
                <TableRow key={model.model}>
                  <TableCell>{model.model}</TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {integer(model.requests)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {integer(model.totalTokens)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{measure(model.kWh)}</TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {measure(model.kgCO2eq)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SettingsSection>

      <SettingsSection label={t('workspaces.title')}>
        {report.workspaces.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('workspaces.empty')}</SettingsEmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('workspaces.columns.workspace')}</TableHead>
                <TableHead className='text-right'>{t('workspaces.columns.executions')}</TableHead>
                <TableHead className='text-right'>{t('workspaces.columns.tokens')}</TableHead>
                <TableHead className='text-right'>{t('workspaces.columns.footprint')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.workspaces.map((workspace) => (
                <TableRow key={workspace.workspaceId ?? 'deleted'}>
                  <TableCell>
                    {workspace.workspaceId === null
                      ? t('workspaces.deleted')
                      : workspace.status === 'archived'
                        ? t('workspaces.archived', {
                            name: workspace.name ?? workspace.workspaceId,
                          })
                        : (workspace.name ?? workspace.workspaceId)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {integer(workspace.executions)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {integer(workspace.totalTokens)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{footprint(workspace)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SettingsSection>

      <SettingsSection label={t('users.title')}>
        {report.users.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('users.empty')}</SettingsEmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.columns.person')}</TableHead>
                <TableHead className='text-right'>{t('users.columns.executions')}</TableHead>
                <TableHead className='text-right'>{t('users.columns.tokens')}</TableHead>
                <TableHead className='text-right'>{t('users.columns.footprint')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.users.map((person) => {
                const name = person.name || person.email || person.userId
                return (
                  <TableRow key={person.userId}>
                    <TableCell>
                      <span className='flex items-center gap-2'>
                        <Avatar size='xs' name={name} aria-hidden />
                        {name}
                      </span>
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {integer(person.executions)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {integer(person.totalTokens)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>{footprint(person)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {report.nexoraApiAvailable && (report.workspaces.length > 0 || report.users.length > 0) && (
          <p className='mt-3 text-[var(--text-muted)] text-caption'>{t('estimateNote')}</p>
        )}
      </SettingsSection>

      <ApiKeysConsumption apiKeys={report.apiKeys} />
    </div>
  )
}
