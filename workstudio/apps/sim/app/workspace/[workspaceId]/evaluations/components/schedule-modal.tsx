'use client'

import { useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import type { NexoraEvalTargetInput } from '@/lib/api/contracts/nexora-evaluations'
import { parseThreshold } from '@/app/workspace/[workspaceId]/evaluations/components/campaign-modal'
import {
  emptyTarget,
  TargetsField,
  targetsComplete,
} from '@/app/workspace/[workspaceId]/evaluations/components/targets-field'
import {
  useEvalDatasets,
  useEvalJudges,
  useSaveEvalSchedule,
} from '@/hooks/queries/nexora-evaluations'

/** The usual timetables; `custom` lets the person write the expression. */
const PRESETS = [
  { id: 'nightly3', cron: '0 3 * * *' },
  { id: 'nightly2', cron: '0 2 * * *' },
  { id: 'weekly', cron: '0 7 * * 1' },
  { id: 'hourly', cron: '0 * * * *' },
] as const
const CUSTOM = 'custom'

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
  } catch {
    return 'Europe/Paris'
  }
}

interface ScheduleModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Schedules a campaign: it runs on its own, and an alert is raised when a target falls under the threshold. */
export function ScheduleModal({ workspaceId, open, onOpenChange }: ScheduleModalProps) {
  const t = useTranslations('evaluations.scheduleModal')
  const { data: datasets } = useEvalDatasets(workspaceId)
  const { data: judges } = useEvalJudges(workspaceId)
  const { mutateAsync: saveSchedule, isPending } = useSaveEvalSchedule()
  const [name, setName] = useState('')
  const [preset, setPreset] = useState<string>(PRESETS[0].id)
  const [customCron, setCustomCron] = useState('')
  const [timezone, setTimezone] = useState(browserTimezone)
  const [datasetId, setDatasetId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [targets, setTargets] = useState<NexoraEvalTargetInput[]>([emptyTarget('model', {})])
  const [threshold, setThreshold] = useState('80')
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setName('')
      setPreset(PRESETS[0].id)
      setCustomCron('')
      setDatasetId('')
      setJudgeId('')
      setTargets([emptyTarget('model', {})])
      setThreshold('80')
      setError(null)
    }
  }

  const cron =
    preset === CUSTOM
      ? customCron.trim()
      : (PRESETS.find((candidate) => candidate.id === preset)?.cron ?? '')
  const alertThreshold = parseThreshold(threshold)
  const chosenDataset = datasetId || datasets?.[0]?.id || ''
  const chosenJudge = judgeId || judges?.[0]?.id || ''
  const canSave =
    name.trim().length > 0 &&
    cron.length > 0 &&
    timezone.trim().length > 0 &&
    chosenDataset.length > 0 &&
    chosenJudge.length > 0 &&
    targetsComplete(targets) &&
    alertThreshold !== undefined &&
    !isPending

  const handleSave = async () => {
    if (!canSave || alertThreshold === undefined) return
    try {
      await saveSchedule({
        workspaceId,
        name: name.trim(),
        cron,
        timezone: timezone.trim(),
        datasetId: chosenDataset,
        judgeId: chosenJudge,
        targets,
        concurrency: 2,
        alertThreshold,
        enabled: true,
      })
      onOpenChange(false)
    } catch (caught) {
      setError(getErrorMessage(caught, t('failed')))
    }
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')} size='lg'>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={setName}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='dropdown'
          title={t('when')}
          value={preset}
          onChange={setPreset}
          options={[
            ...PRESETS.map((candidate) => ({
              value: candidate.id,
              label: t(`presets.${candidate.id}`),
            })),
            { value: CUSTOM, label: t('presets.custom') },
          ]}
        />
        {preset === CUSTOM && (
          <ChipModalField
            type='input'
            title={t('cron')}
            value={customCron}
            onChange={setCustomCron}
            hint={t('cronHint')}
            required
            disabled={isPending}
          />
        )}
        <ChipModalField
          type='input'
          title={t('timezone')}
          value={timezone}
          onChange={setTimezone}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='dropdown'
          title={t('dataset')}
          value={chosenDataset}
          onChange={setDatasetId}
          options={(datasets ?? []).map((dataset) => ({ value: dataset.id, label: dataset.name }))}
          placeholder={t('noDataset')}
          required
        />
        <ChipModalField
          type='dropdown'
          title={t('judge')}
          value={chosenJudge}
          onChange={setJudgeId}
          options={(judges ?? []).map((judge) => ({ value: judge.id, label: judge.name }))}
          placeholder={t('noJudge')}
          required
        />
        <ChipModalField type='custom' title={t('targets')} required>
          <TargetsField
            workspaceId={workspaceId}
            value={targets}
            onChange={setTargets}
            disabled={isPending}
          />
        </ChipModalField>
        <ChipModalField
          type='input'
          title={t('threshold')}
          value={threshold}
          onChange={setThreshold}
          hint={t('thresholdHint')}
          error={alertThreshold === undefined ? t('thresholdInvalid') : undefined}
          disabled={isPending}
        />
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        primaryAction={{
          label: isPending ? t('saving') : t('save'),
          onClick: () => void handleSave(),
          disabled: !canSave,
        }}
      />
    </ChipModal>
  )
}
