'use client'

import { useState } from 'react'
import { ChipSwitch, cn, Skeleton, toast } from '@sim/emcn'
import { Download } from '@sim/emcn/icons'
import { useFormatter, useTranslations } from 'next-intl'
import { useQueryState } from 'nuqs'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import { isApiClientError } from '@/lib/api/client/errors'
import { CONSUMPTION_PERIODS } from '@/lib/api/contracts/nexora-consumption'
import { saveBlob } from '@/lib/uploads/client/download'
import {
  budgetAlerts,
  budgetChange,
  draftFromBudgets,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/budget-draft'
import { BudgetsEditor } from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/budgets-editor'
import { buildConsumptionCsv } from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/consumption-csv'
import { ConsumptionReport } from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/consumption-report'
import {
  consumptionPeriodParam,
  consumptionPeriodUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/search-params'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  type NexoraBudgets,
  useNexoraBudgets,
  useNexoraConsumption,
  useUpdateNexoraBudgets,
} from '@/hooks/queries/nexora-consumption'

function isForbidden(error: unknown): boolean {
  return isApiClientError(error) && (error.status === 401 || error.status === 403)
}

/**
 * Réglages › Consommation (Nexora edition, instance admins): who consumes what over 7, 30 or
 * 90 days and with which footprint, exportable as CSV, and the monthly token budgets.
 */
export function NexoraConsumption() {
  const t = useTranslations('governance.consumption')
  const { data, error, isLoading, isFetching, refetch } = useNexoraBudgets()

  if (isLoading) {
    return (
      <SettingsPanel>
        <Skeleton className='h-[360px] w-full rounded-lg' />
      </SettingsPanel>
    )
  }
  if (!data) {
    return (
      <SettingsPanel>
        {isForbidden(error) ? (
          <SettingsEmptyState>{t('forbidden')}</SettingsEmptyState>
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
  return <ConsumptionView key={JSON.stringify(data.budgets)} overview={data} />
}

interface ConsumptionViewProps {
  overview: NexoraBudgets
}

function ConsumptionView({ overview }: ConsumptionViewProps) {
  const t = useTranslations('governance.consumption')
  const format = useFormatter()
  const [period, setPeriod] = useQueryState(
    consumptionPeriodParam.key,
    consumptionPeriodParam.parser.withOptions(consumptionPeriodUrlKeys)
  )
  const report = useNexoraConsumption(period)
  const update = useUpdateNexoraBudgets()
  const [initial] = useState(() => draftFromBudgets(overview.budgets))
  const [draft, setDraft] = useState(initial)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const change = budgetChange(overview.budgets, draft)
  const invalid = change === 'invalid'

  useSettingsUnsavedGuard({
    isDirty: dirty,
    navigationBlocked: update.isPending,
    onDiscard: () => setDraft(initial),
  })

  const handleSave = () => {
    if (change === null || change === 'invalid') return
    update.mutate(change, {
      onSuccess: () => toast.success(t('budgets.saved')),
      onError: (cause) => toast.error(t('budgets.saveFailed'), { description: cause.message }),
    })
  }

  const handleExport = () => {
    if (!report.data) return
    const csv = buildConsumptionCsv(report.data, {
      columns: [
        t('csv.columns.section'),
        t('csv.columns.label'),
        t('csv.columns.executions'),
        t('csv.columns.requests'),
        t('csv.columns.tokens'),
        t('csv.columns.kWh'),
        t('csv.columns.kgCO2eq'),
        t('csv.columns.note'),
      ],
      sections: {
        day: t('csv.sections.day'),
        model: t('csv.sections.model'),
        workspace: t('csv.sections.workspace'),
        person: t('csv.sections.person'),
      },
      deletedWorkspace: t('csv.deletedWorkspace'),
      estimate: t('csv.estimate'),
    })
    saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      t('exportFileName', { days: report.data.period.days })
    )
  }

  const alerts = budgetAlerts(overview)

  return (
    <SettingsPanel
      actions={[
        {
          id: 'export',
          text: t('export'),
          icon: Download,
          onSelect: handleExport,
          disabled: !report.data,
        },
        ...saveDiscardActions({
          dirty,
          saving: update.isPending,
          onSave: handleSave,
          onDiscard: () => setDraft(initial),
          saveDisabled: change === null || invalid,
          saveTooltip: invalid ? t('budgets.invalid') : undefined,
        }),
      ]}
    >
      <div className='flex flex-col gap-7'>
        {alerts.length > 0 && (
          <div
            role='alert'
            className={cn(
              'flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-small',
              alerts.some((alert) => alert.level === 'exceeded')
                ? 'border-[var(--text-error)] text-[var(--text-error)]'
                : 'border-[var(--badge-amber-text)] text-[var(--text-body)]'
            )}
          >
            {alerts.map((alert) => {
              const values = {
                name: alert.name ?? '',
                usage: format.number(alert.usage),
                cap: format.number(alert.cap),
                percent: Math.floor((alert.usage / alert.cap) * 100),
              }
              const key =
                `${alert.scope}${alert.level === 'exceeded' ? 'Exceeded' : 'Warning'}` as const
              return (
                <p key={`${alert.scope}:${alert.name}`}>{t(`budgets.banner.${key}`, values)}</p>
              )
            })}
          </div>
        )}

        <ChipSwitch
          aria-label={t('period.label')}
          value={period}
          onChange={(next) => void setPeriod(next)}
          options={CONSUMPTION_PERIODS.map((days) => ({
            value: days,
            label: t('period.option', { days }),
          }))}
          className='self-start'
        />

        {report.data ? (
          <ConsumptionReport report={report.data} />
        ) : report.isLoading ? (
          <Skeleton className='h-[320px] w-full rounded-lg' />
        ) : (
          <SettingsQueryErrorState
            error={report.error}
            fallback={t('loadError')}
            isRetrying={report.isFetching}
            onRetry={() => void report.refetch()}
          />
        )}

        <SettingsSection label={t('budgets.title')}>
          <BudgetsEditor
            overview={overview}
            draft={draft}
            onDraftChange={setDraft}
            disabled={update.isPending}
            invalid={invalid}
          />
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
