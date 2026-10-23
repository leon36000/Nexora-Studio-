'use client'

import {
  Button,
  ChipCombobox,
  ChipInput,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sim/emcn'
import { Trash } from '@sim/emcn/icons'
import { useFormatter, useTranslations } from 'next-intl'
import {
  type BudgetDraft,
  parseTokenCap,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/budget-draft'
import { SettingsTextField } from '@/app/workspace/[workspaceId]/settings/components/nexora-instance/instance-settings-ui'
import { SegmentedMeter } from '@/app/workspace/[workspaceId]/settings/components/segmented-meter'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import type { NexoraBudgets } from '@/hooks/queries/nexora-consumption'

const METER_SEGMENTS = 20

interface BudgetsEditorProps {
  overview: NexoraBudgets
  draft: BudgetDraft
  onDraftChange: (draft: BudgetDraft) => void
  disabled: boolean
  invalid: boolean
}

/**
 * Monthly token budgets: the instance cap, the alert threshold and a cap per workspace, each
 * beside this month's usage. Edits stay a draft until the page header's Save.
 */
export function BudgetsEditor({
  overview,
  draft,
  onDraftChange,
  disabled,
  invalid,
}: BudgetsEditorProps) {
  const t = useTranslations('governance.consumption.budgets')
  const format = useFormatter()
  const names = new Map(overview.workspaces.map((workspace) => [workspace.id, workspace.name]))
  const capped = new Set(draft.workspaceCaps.map((row) => row.workspaceId))
  const instanceCap = parseTokenCap(draft.instanceCap)
  const usageLine = (usage: number, cap: number | null | 'invalid') =>
    typeof cap === 'number'
      ? t('usage', {
          usage: format.number(usage),
          cap: format.number(cap),
          percent: Math.floor((usage / cap) * 100),
        })
      : t('usageNoCap', { usage: format.number(usage) })

  const setWorkspaceCap = (workspaceId: string, cap: string) =>
    onDraftChange({
      ...draft,
      workspaceCaps: draft.workspaceCaps.map((row) =>
        row.workspaceId === workspaceId ? { ...row, cap } : row
      ),
    })

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-[var(--text-muted)] text-small'>
        {t('month', {
          month: format.dateTime(new Date(`${overview.month}-15T12:00:00Z`), {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }),
        })}
      </p>

      <div className='grid grid-cols-[1fr_10rem] gap-3'>
        <SettingsTextField
          id='nexora-budget-instance'
          label={t('instanceCap')}
          inputMode='numeric'
          placeholder={t('noCap')}
          value={draft.instanceCap}
          disabled={disabled}
          error={instanceCap === 'invalid'}
          onValueChange={(instanceCapInput) =>
            onDraftChange({ ...draft, instanceCap: instanceCapInput })
          }
          hint={usageLine(overview.usage.instance, instanceCap)}
        />
        <SettingsTextField
          id='nexora-budget-threshold'
          label={t('threshold')}
          inputMode='numeric'
          value={draft.threshold}
          disabled={disabled}
          onValueChange={(threshold) =>
            onDraftChange({ ...draft, threshold: threshold.replace(/\D/g, '') })
          }
        />
      </div>
      {typeof instanceCap === 'number' && (
        <SegmentedMeter
          used={overview.usage.instance}
          total={instanceCap}
          segments={METER_SEGMENTS}
        />
      )}

      <div className='flex flex-col gap-[9px]'>
        <Label>{t('workspaceCaps')}</Label>
        {draft.workspaceCaps.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('noWorkspaceCaps')}</SettingsEmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('workspaceColumn')}</TableHead>
                <TableHead>{t('usageColumn')}</TableHead>
                <TableHead>{t('capColumn')}</TableHead>
                <TableHead className='w-8' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.workspaceCaps.map((row) => {
                const name = names.get(row.workspaceId) ?? row.workspaceId
                const cap = parseTokenCap(row.cap)
                const used = overview.usage.workspaces[row.workspaceId] ?? 0
                return (
                  <TableRow key={row.workspaceId}>
                    <TableCell>{name}</TableCell>
                    <TableCell className='tabular-nums'>
                      <div className='flex min-w-[8rem] flex-col gap-1.5'>
                        <span className='text-caption'>{usageLine(used, cap)}</span>
                        {typeof cap === 'number' && (
                          <SegmentedMeter used={used} total={cap} segments={METER_SEGMENTS} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ChipInput
                        aria-label={`${t('capColumn')} — ${name}`}
                        inputMode='numeric'
                        placeholder={t('capPlaceholder')}
                        value={row.cap}
                        disabled={disabled}
                        error={cap === null || cap === 'invalid'}
                        onChange={(event) => setWorkspaceCap(row.workspaceId, event.target.value)}
                        className='w-[10rem]'
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('remove', { name })}
                        disabled={disabled}
                        onClick={() =>
                          onDraftChange({
                            ...draft,
                            workspaceCaps: draft.workspaceCaps.filter(
                              (entry) => entry.workspaceId !== row.workspaceId
                            ),
                          })
                        }
                      >
                        <Trash className='size-[14px]' />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <ChipCombobox
          options={overview.workspaces
            .filter((workspace) => !capped.has(workspace.id))
            .map((workspace) => ({ label: workspace.name, value: workspace.id }))}
          placeholder={t('pickWorkspace')}
          searchable
          searchPlaceholder={t('searchWorkspace')}
          disabled={disabled}
          value=''
          onChange={(workspaceId) => {
            if (!workspaceId || capped.has(workspaceId)) return
            onDraftChange({
              ...draft,
              workspaceCaps: [...draft.workspaceCaps, { workspaceId, cap: '' }],
            })
          }}
          className='max-w-[20rem]'
        />
      </div>

      <p
        className={
          invalid
            ? 'text-[var(--text-error)] text-caption'
            : 'text-[var(--text-muted)] text-caption'
        }
      >
        {invalid ? t('invalid') : t('refusalNote')}
      </p>
    </div>
  )
}
