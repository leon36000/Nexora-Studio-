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
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { NexoraEvalTargetInput } from '@/lib/api/contracts/nexora-evaluations'
import {
  emptyTarget,
  TargetsField,
  targetsComplete,
} from '@/app/workspace/[workspaceId]/evaluations/components/targets-field'
import {
  useCreateEvalCampaign,
  useEvalDatasets,
  useEvalJudges,
} from '@/hooks/queries/nexora-evaluations'

const CONCURRENCY_CHOICES = ['1', '2', '3', '4', '6', '8'] as const
const DEFAULT_CONCURRENCY = '2'

/** A percentage typed by a person as a share between 0 and 1; `null` for none, `undefined` if invalid. */
export function parseThreshold(text: string): number | null | undefined {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value / 100 : undefined
}

interface CampaignModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Starts a campaign: a test set, a judge and what to evaluate, run in the background. */
export function CampaignModal({ workspaceId, open, onOpenChange }: CampaignModalProps) {
  const t = useTranslations('evaluations.campaignModal')
  const router = useRouter()
  const { data: datasets } = useEvalDatasets(workspaceId)
  const { data: judges } = useEvalJudges(workspaceId)
  const { mutateAsync: createCampaign, isPending } = useCreateEvalCampaign()
  const [name, setName] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [targets, setTargets] = useState<NexoraEvalTargetInput[]>([emptyTarget('model', {})])
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY)
  const [threshold, setThreshold] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setName('')
      setDatasetId('')
      setJudgeId('')
      setTargets([emptyTarget('model', {})])
      setConcurrency(DEFAULT_CONCURRENCY)
      setThreshold('')
      setError(null)
    }
  }

  const alertThreshold = parseThreshold(threshold)
  const chosenDataset = datasetId || datasets?.[0]?.id || ''
  const chosenJudge = judgeId || judges?.[0]?.id || ''
  const canStart =
    name.trim().length > 0 &&
    chosenDataset.length > 0 &&
    chosenJudge.length > 0 &&
    targetsComplete(targets) &&
    alertThreshold !== undefined &&
    !isPending

  const handleStart = async () => {
    if (!canStart || alertThreshold === undefined) return
    try {
      const { campaign } = await createCampaign({
        workspaceId,
        name: name.trim(),
        datasetId: chosenDataset,
        judgeId: chosenJudge,
        targets,
        concurrency: Number(concurrency),
        alertThreshold,
      })
      onOpenChange(false)
      router.push(`/workspace/${workspaceId}/evaluations/campaigns/${campaign.id}`)
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
          title={t('dataset')}
          value={chosenDataset}
          onChange={setDatasetId}
          options={(datasets ?? []).map((dataset) => ({
            value: dataset.id,
            label: t('datasetOption', { name: dataset.name, rows: dataset.rowCount }),
          }))}
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
          type='dropdown'
          title={t('concurrency')}
          value={concurrency}
          onChange={setConcurrency}
          options={CONCURRENCY_CHOICES.map((choice) => ({ value: choice, label: choice }))}
          hint={t('concurrencyHint')}
        />
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
          label: isPending ? t('starting') : t('start'),
          onClick: () => void handleStart(),
          disabled: !canStart,
        }}
      />
    </ChipModal>
  )
}
