'use client'

import { useState } from 'react'
import {
  Chip,
  ChipConfirmModal,
  ChipDropdown,
  ChipLink,
  ChipSwitch,
  ChipTag,
  OverflowText,
  toast,
} from '@sim/emcn'
import { ArrowLeft, Loader } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import type { NexoraEvalItem } from '@/lib/api/contracts/nexora-evaluations'
import { SummaryTable } from '@/app/workspace/[workspaceId]/evaluations/components/summary-table'
import { VerdictTag } from '@/app/workspace/[workspaceId]/evaluations/components/verdict-tag'
import { formatRate } from '@/app/workspace/[workspaceId]/evaluations/utils/format'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { formatDuration } from '@/app/workspace/[workspaceId]/traces/utils/span-tree'
import {
  useCancelEvalCampaign,
  useDeleteEvalCampaign,
  useEvalCampaign,
  useEvalCampaigns,
} from '@/hooks/queries/nexora-evaluations'

interface CampaignDetailProps {
  workspaceId: string
  campaignId: string
}

const VIEWS = ['all', 'problems'] as const
type View = (typeof VIEWS)[number]

function isView(value: string): value is View {
  return VIEWS.some((view) => view === value)
}

interface RowGroup {
  rowId: string
  input: string
  expected: string | null
  items: Map<string, NexoraEvalItem>
}

/** The items by question, each question with its item for every target, in the order of the test set. */
function groupByRow(items: readonly NexoraEvalItem[]): RowGroup[] {
  const groups = new Map<string, RowGroup>()
  for (const item of items) {
    const group = groups.get(item.rowId) ?? {
      rowId: item.rowId,
      input: item.input,
      expected: item.expected,
      items: new Map<string, NexoraEvalItem>(),
    }
    group.items.set(item.targetKey, item)
    groups.set(item.rowId, group)
  }
  return [...groups.values()]
}

/** Nexora edition: one campaign — progress, statistics per target, comparison, and every answer with its verdict. */
export function CampaignDetail({ workspaceId, campaignId }: CampaignDetailProps) {
  const t = useTranslations('evaluations.campaign')
  const tStatus = useTranslations('evaluations.status')
  const locale = useLocale()
  const format = useFormatter()
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const { data, isLoading, isError } = useEvalCampaign(workspaceId, campaignId)
  const { data: campaigns } = useEvalCampaigns(workspaceId)
  const { mutateAsync: cancelCampaign, isPending: isCancelling } = useCancelEvalCampaign()
  const { mutateAsync: deleteCampaign, isPending: isDeleting } = useDeleteEvalCampaign()
  const [view, setView] = useState<View>('all')
  const [seriesA, setSeriesA] = useState('')
  const [seriesB, setSeriesB] = useState('')
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const back = (
    <ChipLink
      href={`/workspace/${workspaceId}/evaluations`}
      leftIcon={ArrowLeft}
      className='self-start'
    >
      {t('back')}
    </ChipLink>
  )

  if (isLoading || isError || !data) {
    return (
      <div className='min-h-0 flex-1 overflow-y-auto px-6'>
        <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
          {back}
          {isLoading ? (
            <Loader className='size-[16px] text-[var(--text-muted)]' animate />
          ) : (
            <p className='text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
          )}
        </div>
      </div>
    )
  }

  const { campaign, summaries, items } = data
  const isActive = campaign.status === 'pending' || campaign.status === 'running'
  const finished = items.filter((item) => item.status === 'done' || item.status === 'error').length
  const summaryByTarget = new Map(summaries.map((entry) => [entry.targetKey, entry.summary]))
  const rows = groupByRow(items)
  const shownRows =
    view === 'all'
      ? rows
      : rows.filter((row) =>
          [...row.items.values()].some(
            (item) => item.verdict !== 'pass' && item.status !== 'pending'
          )
        )

  const seriesOptions = (campaigns ?? []).flatMap((entry) =>
    entry.targets.map((target) => ({
      value: `${entry.id}:${target.key}`,
      label: `${entry.name} · ${target.label}`,
    }))
  )
  const firstA = `${campaign.id}:${campaign.targets[0]?.key ?? 't1'}`
  const firstB = campaign.targets[1]
    ? `${campaign.id}:${campaign.targets[1].key}`
    : (seriesOptions.find((option) => option.value !== firstA)?.value ?? '')
  const chosenA = seriesA || firstA
  const chosenB = seriesB || firstB
  const compareHref = `/workspace/${workspaceId}/evaluations/compare?a=${encodeURIComponent(chosenA)}&b=${encodeURIComponent(chosenB)}`

  const handleConfirm = async () => {
    try {
      if (confirm === 'cancel') await cancelCampaign({ workspaceId, campaignId })
      if (confirm === 'delete') {
        await deleteCampaign({ workspaceId, campaignId })
        router.push(`/workspace/${workspaceId}/evaluations`)
      }
      setConfirm(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('actionFailed')))
    }
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-7 py-10'>
        <header className='flex flex-col gap-3'>
          {back}
          <div className='flex items-center justify-between gap-4'>
            <div className='flex min-w-0 items-center gap-2'>
              <OverflowText
                label={campaign.name}
                className='font-medium text-[var(--text-body)] text-lg'
              />
              <ChipTag
                variant='gray'
                invalid={campaign.status === 'failed' || campaign.status === 'interrupted'}
              >
                {tStatus(campaign.status)}
              </ChipTag>
            </div>
            {canEdit && (
              <Chip
                disabled={isCancelling || isDeleting}
                onClick={() => setConfirm(isActive ? 'cancel' : 'delete')}
              >
                {isActive ? t('cancel') : t('delete')}
              </Chip>
            )}
          </div>
          <p className='text-[var(--text-muted)] text-small'>
            {t('context', {
              dataset: data.datasetName ?? '—',
              judge: data.judgeName ?? '—',
              concurrency: campaign.concurrency,
            })}
          </p>
          <p className='text-[var(--text-body)] text-small'>
            {t('progress', { finished, total: campaign.itemTotal })}
            {campaign.startedAt
              ? ` · ${t('started', {
                  date: format.dateTime(new Date(campaign.startedAt), {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }),
                })}`
              : ''}
            {campaign.startedAt && campaign.finishedAt
              ? ` · ${t('duration', {
                  value: formatDuration(
                    new Date(campaign.finishedAt).getTime() -
                      new Date(campaign.startedAt).getTime(),
                    locale
                  ),
                })}`
              : ''}
          </p>
          {campaign.error && (
            <p className='text-[var(--text-error)] text-small'>{campaign.error}</p>
          )}
          {campaign.alertThreshold !== null && (
            <p className='text-[var(--text-muted)] text-caption'>
              {t('threshold', { value: formatRate(campaign.alertThreshold, locale) })}
            </p>
          )}
        </header>

        <SettingsSection label={t('statistics')}>
          <SummaryTable
            rows={campaign.targets.map((target) => ({
              key: target.key,
              label: target.label,
              summary: summaryByTarget.get(target.key) ?? {
                total: 0,
                finished: 0,
                passed: 0,
                failed: 0,
                errors: 0,
                passRate: null,
                meanScore: null,
                latencyP50: null,
                latencyP95: null,
                inputTokens: 0,
                outputTokens: 0,
                kgCo2eq: null,
              },
            }))}
          />
        </SettingsSection>

        {seriesOptions.length > 1 && (
          <SettingsSection label={t('compare')}>
            <div className='flex flex-wrap items-center gap-1'>
              <ChipDropdown value={chosenA} onChange={setSeriesA} options={seriesOptions} />
              <span className='text-[var(--text-muted)] text-small'>{t('versus')}</span>
              <ChipDropdown value={chosenB} onChange={setSeriesB} options={seriesOptions} />
              <ChipLink href={compareHref}>{t('compareAction')}</ChipLink>
            </div>
          </SettingsSection>
        )}

        <SettingsSection label={t('answers')}>
          <div className='flex flex-col gap-3'>
            <ChipSwitch
              aria-label={t('answers')}
              className='self-start'
              options={VIEWS.map((value) => ({ value, label: t(`views.${value}`) }))}
              value={view}
              onChange={(value) => isView(value) && setView(value)}
            />
            <div className='overflow-x-auto rounded-lg border border-[var(--border)]'>
              <table className='w-full min-w-[40rem] table-fixed text-left text-small'>
                <thead className='text-[var(--text-muted)] text-caption'>
                  <tr className='border-[var(--border)] border-b'>
                    <th className='w-[28%] px-3 py-2 font-normal'>{t('question')}</th>
                    {campaign.targets.map((target) => (
                      <th key={target.key} className='px-3 py-2 font-normal'>
                        {target.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--border)] align-top'>
                  {shownRows.map((row) => (
                    <tr key={row.rowId}>
                      <td className='px-3 py-2 text-[var(--text-body)]'>
                        <p className='line-clamp-3'>{row.input}</p>
                        {row.expected && (
                          <p className='mt-1 line-clamp-2 text-[var(--text-muted)] text-caption'>
                            {t('expected', { value: row.expected })}
                          </p>
                        )}
                      </td>
                      {campaign.targets.map((target) => {
                        const item = row.items.get(target.key)
                        return (
                          <td key={target.key} className='px-3 py-2'>
                            {item && item.status !== 'pending' && item.status !== 'running' ? (
                              <div className='flex flex-col gap-1'>
                                <div className='flex items-center gap-1'>
                                  <VerdictTag verdict={item.verdict} status={item.status} />
                                  {item.latencyMs !== null && (
                                    <span className='text-[var(--text-muted)] text-caption'>
                                      {formatDuration(item.latencyMs, locale)}
                                    </span>
                                  )}
                                </div>
                                <p className='line-clamp-4 text-[var(--text-body)] text-caption'>
                                  {item.answer ?? item.error}
                                </p>
                                {item.judgeNote && (
                                  <p className='line-clamp-2 text-[var(--text-muted)] text-caption'>
                                    {item.judgeNote}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className='text-[var(--text-muted)] text-caption'>
                                {item ? tStatus(item.status) : '—'}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SettingsSection>
      </div>
      <ChipConfirmModal
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !isCancelling && !isDeleting) setConfirm(null)
        }}
        title={confirm === 'cancel' ? t('cancelTitle') : t('deleteTitle')}
        text={confirm === 'cancel' ? t('cancelText') : t('deleteText')}
        dismissLabel={t('keep')}
        confirm={{
          label: confirm === 'cancel' ? t('cancel') : t('delete'),
          variant: 'destructive',
          pending: isCancelling || isDeleting,
          disabled: isCancelling || isDeleting,
          onClick: () => void handleConfirm(),
        }}
      />
    </div>
  )
}
