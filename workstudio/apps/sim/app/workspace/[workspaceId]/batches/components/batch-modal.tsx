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
import { useBatchSources, useCreateBatch } from '@/hooks/queries/nexora-batches'
import { useImportCsv } from '@/hooks/queries/tables'

const CONCURRENCY_CHOICES = ['1', '2', '3', '4'] as const
const DEFAULT_CONCURRENCY = '2'
const EXPIRY_CHOICES = ['1', '6', '24', '72', '168'] as const
const DEFAULT_EXPIRY = '24'
const MAX_TOKENS_LIMIT = 8192

/** The answer cap typed by a person: `null` for none, `undefined` when it is not a usable whole number. */
function parseMaxTokens(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isInteger(value) && value >= 1 && value <= MAX_TOKENS_LIMIT ? value : undefined
}

interface BatchModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Starts a batch: a table (or an imported CSV), who answers each row, and the new column for the answers. */
export function BatchModal({ workspaceId, open, onOpenChange }: BatchModalProps) {
  const t = useTranslations('batches.modal')
  const router = useRouter()
  const [importedTableId, setImportedTableId] = useState<string | undefined>(undefined)
  const { data: tables } = useBatchSources(workspaceId, open, importedTableId)
  const { mutateAsync: createBatch, isPending } = useCreateBatch()
  const { mutateAsync: importCsv, isPending: isImporting } = useImportCsv()
  const [name, setName] = useState('')
  const [tableId, setTableId] = useState('')
  const [target, setTarget] = useState<NexoraEvalTargetInput[]>([emptyTarget('model', {})])
  const [template, setTemplate] = useState('')
  const [column, setColumn] = useState('')
  const [maxTokens, setMaxTokens] = useState('')
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY)
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY)
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setImportedTableId(undefined)
      setName('')
      setTableId('')
      setTarget([emptyTarget('model', {})])
      setTemplate('')
      setColumn('')
      setMaxTokens('')
      setConcurrency(DEFAULT_CONCURRENCY)
      setExpiry(DEFAULT_EXPIRY)
      setError(null)
    }
  }

  const chosenTable = tables?.find((table) => table.id === (tableId || tables[0]?.id))
  const answerCap = parseMaxTokens(maxTokens)
  const exampleColumn = `{{${chosenTable?.columns[0] ?? 'colonne'}}}`
  const canStart =
    name.trim().length > 0 &&
    Boolean(chosenTable && chosenTable.rowCount > 0) &&
    template.trim().length > 0 &&
    column.trim().length > 0 &&
    targetsComplete(target) &&
    answerCap !== undefined &&
    !isPending &&
    !isImporting

  const handleImport = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setError(null)
    try {
      const imported = await importCsv({ workspaceId, file })
      if (!imported.tableId) throw new Error(t('importFailed'))
      setImportedTableId(imported.tableId)
      setTableId(imported.tableId)
    } catch (caught) {
      setError(getErrorMessage(caught, t('importFailed')))
    }
  }

  const handleStart = async () => {
    if (!canStart || !chosenTable || answerCap === undefined) return
    try {
      const { batch } = await createBatch({
        workspaceId,
        name: name.trim(),
        tableId: chosenTable.id,
        target: target[0],
        template: template.trim(),
        outputColumnName: column.trim(),
        maxTokens: answerCap,
        concurrency: Number(concurrency),
        expiresInHours: Number(expiry),
      })
      onOpenChange(false)
      router.push(`/workspace/${workspaceId}/batches/${batch.id}`)
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
          title={t('table')}
          value={chosenTable?.id}
          onChange={setTableId}
          options={(tables ?? []).map((table) => ({
            value: table.id,
            label: t('tableOption', { name: table.name, rows: table.rowCount }),
          }))}
          placeholder={t('noTable')}
          required
        />
        <ChipModalField
          type='file'
          title={t('importCsv')}
          accept='.csv,.tsv,text/csv'
          label={isImporting ? t('importing') : t('importCsv')}
          loading={isImporting}
          hint={importedTableId ? t('importHint') : undefined}
          onChange={(files) => void handleImport(files)}
        />
        <ChipModalField type='custom' title={t('target')} required>
          <TargetsField
            workspaceId={workspaceId}
            value={target}
            onChange={setTarget}
            disabled={isPending}
            single
          />
        </ChipModalField>
        <ChipModalField
          type='textarea'
          title={t('template')}
          value={template}
          onChange={setTemplate}
          placeholder={t('templatePlaceholder', { example: exampleColumn })}
          hint={
            chosenTable
              ? `${t('templateHint', { example: exampleColumn })} ${t('columns', { columns: chosenTable.columns.join(', ') })}`
              : t('templateHint', { example: exampleColumn })
          }
          rows={3}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='input'
          title={t('column')}
          value={column}
          onChange={setColumn}
          hint={t('columnHint')}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='input'
          title={t('maxTokens')}
          value={maxTokens}
          onChange={setMaxTokens}
          inputMode='numeric'
          hint={t('maxTokensHint')}
          error={answerCap === undefined ? t('maxTokensInvalid') : undefined}
          disabled={isPending}
        />
        <ChipModalField
          type='dropdown'
          title={t('concurrency')}
          value={concurrency}
          onChange={setConcurrency}
          options={CONCURRENCY_CHOICES.map((choice) => ({ value: choice, label: choice }))}
        />
        <ChipModalField
          type='dropdown'
          title={t('expires')}
          value={expiry}
          onChange={setExpiry}
          options={EXPIRY_CHOICES.map((choice) => ({
            value: choice,
            label: t(`expiresChoices.${choice}`),
          }))}
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
