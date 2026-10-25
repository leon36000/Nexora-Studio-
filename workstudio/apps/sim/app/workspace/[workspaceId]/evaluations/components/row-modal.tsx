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
import type { NexoraEvalRow } from '@/lib/api/contracts/nexora-evaluations'
import { useAppendEvalRows, useUpdateEvalRow } from '@/hooks/queries/nexora-evaluations'

const NO_VERDICT = 'none'

interface RowModalProps {
  workspaceId: string
  datasetId: string
  /** The row being edited, `null` to add one. */
  row: NexoraEvalRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Adds a row to a test set, or edits one: its question, expected answer, guidance and annotation. */
export function RowModal({ workspaceId, datasetId, row, open, onOpenChange }: RowModalProps) {
  const t = useTranslations('evaluations.rowModal')
  const { mutateAsync: appendRows, isPending: isAdding } = useAppendEvalRows()
  const { mutateAsync: updateRow, isPending: isUpdating } = useUpdateEvalRow()
  const [input, setInput] = useState('')
  const [expected, setExpected] = useState('')
  const [guidance, setGuidance] = useState('')
  const [candidate, setCandidate] = useState('')
  const [verdict, setVerdict] = useState(NO_VERDICT)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setInput(row?.input ?? '')
      setExpected(row?.expected ?? '')
      setGuidance(row?.guidance ?? '')
      setCandidate(row?.candidate ?? '')
      setVerdict(row?.humanVerdict ?? NO_VERDICT)
      setNote(row?.humanNote ?? '')
      setError(null)
    }
  }

  const isPending = isAdding || isUpdating
  const humanVerdict: 'pass' | 'fail' | null =
    verdict === 'pass' ? 'pass' : verdict === 'fail' ? 'fail' : null
  const canSave =
    input.trim().length > 0 && (humanVerdict === null || candidate.trim().length > 0) && !isPending

  const handleSave = async () => {
    if (!canSave) return
    const fields = {
      input: input.trim(),
      expected: expected.trim() || null,
      guidance: guidance.trim() || null,
      candidate: candidate.trim() || null,
      humanVerdict,
      humanNote: note.trim() || null,
    }
    try {
      if (row) await updateRow({ workspaceId, datasetId, rowId: row.id, patch: fields })
      else await appendRows({ workspaceId, datasetId, rows: [fields] })
      onOpenChange(false)
    } catch (caught) {
      setError(getErrorMessage(caught, t('failed')))
    }
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')} size='lg'>
      <ChipModalHeader onClose={() => onOpenChange(false)}>
        {row ? t('editTitle') : t('title')}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='textarea'
          title={t('input')}
          value={input}
          onChange={setInput}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='textarea'
          title={t('expected')}
          value={expected}
          onChange={setExpected}
          disabled={isPending}
        />
        <ChipModalField
          type='input'
          title={t('guidance')}
          value={guidance}
          onChange={setGuidance}
          hint={t('guidanceHint')}
          disabled={isPending}
        />
        <ChipModalField
          type='textarea'
          title={t('candidate')}
          value={candidate}
          onChange={setCandidate}
          hint={t('candidateHint')}
          disabled={isPending}
        />
        <ChipModalField
          type='dropdown'
          title={t('verdict')}
          value={verdict}
          onChange={setVerdict}
          options={[
            { value: NO_VERDICT, label: t('verdicts.none') },
            { value: 'pass', label: t('verdicts.pass') },
            { value: 'fail', label: t('verdicts.fail') },
          ]}
        />
        <ChipModalField
          type='input'
          title={t('note')}
          value={note}
          onChange={setNote}
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
