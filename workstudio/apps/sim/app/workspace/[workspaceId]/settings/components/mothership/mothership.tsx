'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Chip,
  ChipCopyInput,
  ChipInput,
  ChipModalTabs,
  ChipSelect,
  Label,
  Skeleton,
} from '@sim/emcn'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import {
  type MothershipTab,
  mothershipParsers,
  mothershipUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/components/mothership/search-params'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  type MothershipEnv,
  useGenerateLicense,
  useMothershipLicenses,
  useMothershipRequests,
  useMothershipUserBreakdown,
} from '@/hooks/queries/mothership-admin'
import { useDateFormat } from '@/hooks/use-date-format'
import { useSettingsDirtyStore } from '@/stores/settings/dirty/store'

const TABS: readonly MothershipTab[] = ['overview', 'licenses', 'byok']

const ENVIRONMENTS: readonly MothershipEnv[] = ['dev', 'staging', 'prod']

function defaultTimeRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)
  return {
    start: start.toISOString().slice(0, 16),
    end: end.toISOString().slice(0, 16),
  }
}

function toRFC3339(local: string) {
  if (!local) return ''
  return new Date(local).toISOString()
}

function formatCost(cost: number) {
  return `$${cost.toFixed(4)}`
}

/** Timestamps in the interface language; `—` when missing or unreadable. */
function useFormatDate() {
  const { formatDateTime } = useDateFormat()
  return (d: string | null | undefined) => {
    if (!d) return '—'
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return '—'
    return formatDateTime(date)
  }
}

function Divider() {
  return <div className='h-px bg-[var(--border)]' />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className='text-[var(--text-muted)] text-small'>{children}</p>
}

export function Mothership() {
  const t = useTranslations('settings.mothership')
  const [{ tab: activeTab, env: environment }, setMothershipParams] = useQueryStates(
    mothershipParsers,
    mothershipUrlKeys
  )
  const defaults = useMemo(() => defaultTimeRange(), [])
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const requestLeave = useSettingsDirtyStore((state) => state.requestLeave)

  return (
    <SettingsPanel>
      <div className='flex flex-col gap-6'>
        <div className='flex items-center gap-2'>
          <Label className='text-[var(--text-secondary)] text-sm'>{t('environment')}</Label>
          <ChipSelect
            align='start'
            dropdownWidth={160}
            value={environment}
            onChange={(value) => {
              if (value !== environment)
                requestLeave(() => {
                  void setMothershipParams({ env: value as MothershipEnv })
                })
            }}
            placeholder={t('selectEnvironment')}
            options={ENVIRONMENTS.map((value) => ({ value, label: t(`environments.${value}`) }))}
          />
        </div>

        <ChipModalTabs
          tabs={TABS.map((tab) => ({ value: tab, label: t(`tabs.${tab}`) }))}
          value={activeTab}
          onChange={(value) => {
            if (value !== activeTab)
              requestLeave(() => {
                void setMothershipParams({ tab: value as MothershipTab })
              })
          }}
        />

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Label className='text-[var(--text-secondary)] text-caption'>{t('from')}</Label>
            <ChipInput
              type='datetime-local'
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2'>
            <Label className='text-[var(--text-secondary)] text-caption'>{t('to')}</Label>
            <ChipInput type='datetime-local' value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <Divider />

        {activeTab === 'overview' && (
          <OverviewTab environment={environment} start={toRFC3339(start)} end={toRFC3339(end)} />
        )}
        {activeTab === 'licenses' && <LicensesTab environment={environment} />}
        {activeTab === 'byok' && <ByokTab />}
      </div>
    </SettingsPanel>
  )
}

function ByokTab() {
  const t = useTranslations('settings.mothership.byok')
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('')
  const workspaceId = targetWorkspaceId.trim()
  return (
    <div className='flex flex-col gap-4'>
      <p className='text-[var(--text-secondary)] text-sm'>{t('description')}</p>
      <div className='flex items-center gap-2'>
        <Label className='text-[var(--text-secondary)] text-sm'>{t('targetWorkspace')}</Label>
        <ChipInput
          value={targetWorkspaceId}
          onChange={(event) => setTargetWorkspaceId(event.target.value)}
          placeholder={t('workspaceIdPlaceholder')}
          className='w-[280px]'
        />
      </div>
      {workspaceId && (
        <Link
          href={`/workspace/${encodeURIComponent(workspaceId)}/settings/byok`}
          className='text-sm underline'
        >
          {t('manageKeys')}
        </Link>
      )}
    </div>
  )
}

function OverviewTab({
  environment,
  start,
  end,
}: {
  environment: MothershipEnv
  start: string
  end: string
}) {
  const t = useTranslations('settings.mothership.overview')
  const formatDate = useFormatDate()
  const { data: breakdown, isLoading: breakdownLoading } = useMothershipUserBreakdown(
    environment,
    start,
    end
  )
  const { data: requests, isLoading: requestsLoading } = useMothershipRequests(
    environment,
    start,
    end
  )

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-4 gap-3'>
        <StatCard
          label={t('totalRequests')}
          value={breakdown?.total_requests}
          loading={breakdownLoading}
        />
        <StatCard
          label={t('uniqueUsers')}
          value={breakdown?.total_users}
          loading={breakdownLoading}
        />
        <StatCard
          label={t('totalCost')}
          value={
            breakdown?.users
              ? formatCost(
                  breakdown.users.reduce(
                    (s: number, u: { total_cost: number }) => s + u.total_cost,
                    0
                  )
                )
              : undefined
          }
          loading={breakdownLoading}
        />
        <StatCard
          label={t('avgCost')}
          value={
            breakdown?.total_requests && breakdown.users
              ? formatCost(
                  breakdown.users.reduce(
                    (s: number, u: { total_cost: number }) => s + u.total_cost,
                    0
                  ) / breakdown.total_requests
                )
              : undefined
          }
          loading={breakdownLoading}
        />
      </div>

      <SectionLabel>{t('userBreakdown')}</SectionLabel>
      {breakdownLoading && (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-[36px] w-full rounded-md' />
          ))}
        </div>
      )}
      {breakdown?.users && (
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-3 border-[var(--border)] border-b px-3 py-2 text-[var(--text-tertiary)] text-caption'>
            <span className='flex-1'>{t('columns.userId')}</span>
            <span className='w-[100px] text-right'>{t('columns.requests')}</span>
            <span className='w-[100px] text-right'>{t('columns.cost')}</span>
            <span className='w-[160px] text-right'>{t('columns.lastRequest')}</span>
          </div>
          {breakdown.users.map(
            (u: {
              user_id: string
              request_count: number
              total_cost: number
              last_request: string
            }) => (
              <div
                key={u.user_id}
                className='flex items-center gap-3 border-[var(--border)] border-b px-3 py-2 text-small last:border-b-0'
              >
                <span className='flex-1 truncate font-mono text-[var(--text-primary)] text-caption'>
                  {u.user_id}
                </span>
                <span className='w-[100px] text-right text-[var(--text-secondary)]'>
                  {u.request_count}
                </span>
                <span className='w-[100px] text-right text-[var(--text-secondary)]'>
                  {formatCost(u.total_cost)}
                </span>
                <span className='w-[160px] text-right text-[var(--text-tertiary)] text-caption'>
                  {formatDate(u.last_request)}
                </span>
              </div>
            )
          )}
        </div>
      )}

      <Divider />
      <SectionLabel>{t('recentRequests', { count: requests?.count ?? '…' })}</SectionLabel>
      {requestsLoading && (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-[36px] w-full rounded-md' />
          ))}
        </div>
      )}
      {requests?.requests && (
        <div className='max-h-[400px] overflow-auto'>
          <div className='flex flex-col gap-0.5'>
            <div className='sticky top-0 z-10 flex items-center gap-3 border-[var(--border)] border-b bg-[var(--surface-1)] px-3 py-2 text-[var(--text-tertiary)] text-caption'>
              <span className='w-[180px]'>{t('columns.requestId')}</span>
              <span className='w-[80px]'>{t('columns.model')}</span>
              <span className='w-[80px] text-right'>{t('columns.duration')}</span>
              <span className='w-[80px] text-right'>{t('columns.cost')}</span>
              <span className='w-[60px] text-right'>{t('columns.tools')}</span>
              <span className='w-[70px] text-right'>{t('columns.status')}</span>
              <span className='flex-1 text-right'>{t('columns.time')}</span>
            </div>
            {requests.requests
              .slice(0, 100)
              .map(
                (r: {
                  request_id: string
                  model: string
                  duration_ms: number
                  billed_total_cost: number
                  tool_call_count: number
                  error: boolean
                  aborted: boolean
                  created_at: string
                }) => (
                  <div
                    key={r.request_id}
                    className='flex items-center gap-3 border-[var(--border)] border-b px-3 py-1.5 text-small last:border-b-0'
                  >
                    <span className='w-[180px] truncate font-mono text-[var(--text-primary)] text-caption'>
                      {r.request_id ?? '—'}
                    </span>
                    <span className='w-[80px] truncate text-[var(--text-secondary)] text-caption'>
                      {(r.model ?? '').replace('claude-', '')}
                    </span>
                    <span className='w-[80px] text-right text-[var(--text-secondary)] text-caption'>
                      {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </span>
                    <span className='w-[80px] text-right text-[var(--text-secondary)] text-caption'>
                      {formatCost(r.billed_total_cost ?? 0)}
                    </span>
                    <span className='w-[60px] text-right text-[var(--text-secondary)] text-caption'>
                      {r.tool_call_count ?? 0}
                    </span>
                    <span className='w-[70px] text-right'>
                      {r.error ? (
                        <Badge variant='red'>{t('statuses.error')}</Badge>
                      ) : r.aborted ? (
                        <Badge variant='amber'>{t('statuses.abort')}</Badge>
                      ) : (
                        <Badge variant='green'>{t('statuses.ok')}</Badge>
                      )}
                    </span>
                    <span className='flex-1 text-right text-[var(--text-tertiary)] text-caption'>
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                )
              )}
          </div>
        </div>
      )}
    </div>
  )
}

function LicensesTab({ environment }: { environment: MothershipEnv }) {
  const t = useTranslations('settings.mothership.licenses')
  const tSettings = useTranslations('settings')
  const formatDate = useFormatDate()
  const { data, isLoading } = useMothershipLicenses(environment)
  const generateLicense = useGenerateLicense(environment)
  const [newName, setNewName] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const [approvalReference, setApprovalReference] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const resetForm = () => {
    setNewName('')
    setNewExpiry('')
    setApprovalReference('')
  }
  useSettingsUnsavedGuard({
    isDirty: Boolean(newName.trim() || newExpiry || approvalReference.trim() || generatedKey),
    navigationBlocked: generateLicense.isPending,
    onDiscard: () => {
      resetForm()
      setGeneratedKey(null)
    },
  })

  const handleGenerate = () => {
    if (!newName.trim() || !approvalReference.trim() || generateLicense.isPending || generatedKey)
      return
    generateLicense.mutate(
      {
        name: newName.trim(),
        approvalReference: approvalReference.trim(),
        ...(newExpiry ? { expirationDate: newExpiry } : {}),
      },
      {
        onSuccess: (result) => {
          setGeneratedKey(result.license_key)
          resetForm()
        },
      }
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      <SectionLabel>{t('generateTitle')}</SectionLabel>
      <div className='flex items-end gap-2'>
        <div className='flex flex-col gap-1'>
          <Label className='text-[var(--text-secondary)] text-caption'>{t('enterpriseName')}</Label>
          <ChipInput
            disabled={generateLicense.isPending}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('enterpriseNamePlaceholder')}
            className='w-[200px]'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label className='text-[var(--text-secondary)] text-caption'>
            {t('approvalReference')}
          </Label>
          <ChipInput
            disabled={generateLicense.isPending}
            value={approvalReference}
            onChange={(event) => setApprovalReference(event.target.value)}
            placeholder={t('approvalReferencePlaceholder')}
            className='w-[240px]'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label className='text-[var(--text-secondary)] text-caption'>{t('expiration')}</Label>
          <ChipInput
            disabled={generateLicense.isPending}
            type='date'
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
            className='w-[160px]'
          />
        </div>
        <Button
          variant='primary'
          className='h-[32px]'
          onClick={handleGenerate}
          disabled={
            generateLicense.isPending ||
            Boolean(generatedKey) ||
            !newName.trim() ||
            !approvalReference.trim()
          }
        >
          {generateLicense.isPending ? t('generating') : t('generate')}
        </Button>
      </div>

      {generatedKey && (
        <div className='flex flex-col gap-1.5'>
          <p className='text-[var(--text-secondary)] text-caption'>{t('keyShownOnce')}</p>
          <div className='flex items-center gap-2'>
            <ChipCopyInput value={generatedKey} copyLabel={t('copyKey')} className='flex-1' />
            <Chip onClick={() => setGeneratedKey(null)}>{tSettings('shared.done')}</Chip>
          </div>
        </div>
      )}

      {generateLicense.error && (
        <p className='text-[var(--text-error)] text-small'>{generateLicense.error.message}</p>
      )}

      <Divider />
      <SectionLabel>{t('allLicenses')}</SectionLabel>

      {isLoading && (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-[40px] w-full rounded-md' />
          ))}
        </div>
      )}

      {data?.licenses && (
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-3 border-[var(--border)] border-b px-3 py-2 text-[var(--text-tertiary)] text-caption'>
            <span className='flex-1'>{t('columns.name')}</span>
            <span className='w-[100px] text-right'>{t('columns.validations')}</span>
            <span className='w-[140px] text-right'>{t('columns.expiration')}</span>
            <span className='w-[140px] text-right'>{t('columns.created')}</span>
          </div>
          {data.licenses.length === 0 && (
            <SettingsEmptyState variant='inline'>{t('noLicenses')}</SettingsEmptyState>
          )}
          {data.licenses.map(
            (lic: {
              id: string
              name: string
              count: number
              expiration_date?: string
              created_at: string
            }) => (
              <div
                key={lic.id}
                className='flex items-center gap-3 border-[var(--border)] border-b px-3 py-2 text-small last:border-b-0'
              >
                <span className='flex-1 text-[var(--text-primary)]'>{lic.name}</span>
                <span className='w-[100px] text-right text-[var(--text-secondary)]'>
                  {lic.count}
                </span>
                <span className='w-[140px] text-right text-[var(--text-tertiary)] text-caption'>
                  {lic.expiration_date ? formatDate(lic.expiration_date) : t('never')}
                </span>
                <span className='w-[140px] text-right text-[var(--text-tertiary)] text-caption'>
                  {formatDate(lic.created_at)}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value?: string | number
  loading?: boolean
}) {
  return (
    <div className='rounded-md border border-[var(--border)] p-3'>
      <p className='text-[var(--text-tertiary)] text-caption'>{label}</p>
      {loading ? (
        <Skeleton className='mt-1 h-[24px] w-[80px] rounded-sm' />
      ) : (
        <p className='mt-1 text-[var(--text-primary)] text-lg'>{value ?? '—'}</p>
      )}
    </div>
  )
}
