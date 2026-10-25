'use client'

import { useId, useState } from 'react'
import {
  Checkbox,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSwitch,
  toast,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useFormatter, useTranslations } from 'next-intl'
import type { NexoraEvalDatasetSource } from '@/lib/api/contracts/nexora-evaluations'
import { useCreateEvalDataset, useEvalImportSources } from '@/hooks/queries/nexora-evaluations'

const SOURCES = ['file', 'table', 'traces', 'conversations', 'empty'] as const
type Source = (typeof SOURCES)[number]

const MAX_FILE_BYTES = 25_000_000

function isSource(value: string): value is Source {
  return SOURCES.some((source) => source === value)
}

interface PickedFile {
  name: string
  text: string
  kind: 'csv' | 'jsonl'
}

interface CheckRowProps {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  detail?: string | null
}

function CheckRow({ checked, onChange, title, detail }: CheckRowProps) {
  const id = useId()
  return (
    <label htmlFor={id} className='flex cursor-pointer items-start gap-2 px-3 py-2'>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className='mt-0.5'
      />
      <span className='flex min-w-0 flex-col gap-0.5'>
        <span className='line-clamp-2 text-[var(--text-body)] text-small'>{title}</span>
        {detail && (
          <span className='line-clamp-2 text-[var(--text-muted)] text-caption'>{detail}</span>
        )}
      </span>
    </label>
  )
}

function toggled(list: readonly string[], id: string, on: boolean): string[] {
  return on ? [...list.filter((entry) => entry !== id), id] : list.filter((entry) => entry !== id)
}

interface DatasetModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (datasetId: string) => void
}

/**
 * Creates a test set: empty, from a CSV or JSONL file, from a table of the workspace, from traces
 * the member may read, or from the member's own Assistant conversations (importing them is the
 * member's consent: nobody else's conversation is offered).
 */
export function DatasetModal({ workspaceId, open, onOpenChange, onCreated }: DatasetModalProps) {
  const t = useTranslations('evaluations.datasetModal')
  const format = useFormatter()
  const consentId = useId()
  const { mutateAsync: createDataset, isPending } = useCreateEvalDataset()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState<Source>('file')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [tableId, setTableId] = useState('')
  const [traceIds, setTraceIds] = useState<string[]>([])
  const [conversationIds, setConversationIds] = useState<string[]>([])
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setName('')
      setDescription('')
      setSource('file')
      setFile(null)
      setTableId('')
      setTraceIds([])
      setConversationIds([])
      setConsent(false)
      setError(null)
    }
  }

  const needsSources =
    open && (source === 'table' || source === 'traces' || source === 'conversations')
  const { data: sources, isLoading: isLoadingSources } = useEvalImportSources(
    workspaceId,
    needsSources
  )

  const handleFile = async (files: File[]) => {
    const picked = files[0]
    if (!picked) return
    if (picked.size > MAX_FILE_BYTES) {
      setError(t('fileTooLarge'))
      return
    }
    setError(null)
    setFile({
      name: picked.name,
      text: await picked.text(),
      kind: picked.name.toLowerCase().endsWith('.csv') ? 'csv' : 'jsonl',
    })
    if (!name.trim()) setName(picked.name.replace(/\.[^.]+$/, ''))
  }

  const payload = (): NexoraEvalDatasetSource | null => {
    switch (source) {
      case 'file':
        return file ? { kind: file.kind, text: file.text } : null
      case 'table':
        return tableId ? { kind: 'table', tableId } : null
      case 'traces':
        return traceIds.length > 0 ? { kind: 'traces', traceIds } : null
      case 'conversations':
        return conversationIds.length > 0 && consent
          ? { kind: 'conversations', conversationIds }
          : null
      case 'empty':
        return { kind: 'empty' }
    }
  }

  const body = payload()
  const canCreate = name.trim().length > 0 && body !== null && !isPending

  const handleCreate = async () => {
    if (!canCreate || !body) return
    try {
      const { dataset, skipped } = await createDataset({
        workspaceId,
        name: name.trim(),
        description: description.trim(),
        source: body,
      })
      onOpenChange(false)
      onCreated(dataset.id)
      if (skipped > 0) toast.success(t('skipped', { count: skipped }))
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
          type='input'
          title={t('description')}
          value={description}
          onChange={setDescription}
          disabled={isPending}
        />
        <ChipModalField type='custom' title={t('source')}>
          <ChipSwitch
            aria-label={t('source')}
            options={SOURCES.map((value) => ({ value, label: t(`sources.${value}`) }))}
            value={source}
            onChange={(value) => isSource(value) && setSource(value)}
          />
        </ChipModalField>

        {source === 'file' && (
          <ChipModalField
            type='file'
            title={t('file.title')}
            accept='.csv,.jsonl,.json,.txt'
            label={file ? t('file.picked', { name: file.name }) : t('file.drop')}
            draggingLabel={t('file.dragging')}
            description={t('file.formats')}
            onChange={(files) => void handleFile(files)}
          />
        )}

        {source === 'table' && (
          <ChipModalField
            type='dropdown'
            title={t('table.title')}
            value={tableId}
            onChange={setTableId}
            placeholder={isLoadingSources ? t('loading') : t('table.choose')}
            options={(sources?.tables ?? []).map((table) => ({
              value: table.id,
              label: t('table.option', { name: table.name, rows: table.rowCount }),
            }))}
            hint={t('table.hint')}
          />
        )}

        {source === 'traces' && (
          <ChipModalField type='custom' title={t('traces.title')} hint={t('traces.hint')}>
            {sources?.traces.length ? (
              <ul className='flex max-h-64 flex-col divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)]'>
                {sources.traces.map((trace) => (
                  <li key={trace.id}>
                    <CheckRow
                      checked={traceIds.includes(trace.id)}
                      onChange={(on) => setTraceIds((previous) => toggled(previous, trace.id, on))}
                      title={trace.input ?? trace.name}
                      detail={format.dateTime(new Date(trace.startedAt), {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-[var(--text-muted)] text-small'>
                {isLoadingSources ? t('loading') : t('traces.empty')}
              </p>
            )}
          </ChipModalField>
        )}

        {source === 'conversations' && (
          <ChipModalField type='custom' title={t('conversations.title')}>
            {sources?.conversations.length ? (
              <div className='flex flex-col gap-2'>
                <ul className='flex max-h-64 flex-col divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)]'>
                  {sources.conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <CheckRow
                        checked={conversationIds.includes(conversation.id)}
                        onChange={(on) =>
                          setConversationIds((previous) => toggled(previous, conversation.id, on))
                        }
                        title={conversation.title}
                        detail={format.dateTime(new Date(conversation.updatedAt), {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      />
                    </li>
                  ))}
                </ul>
                <label htmlFor={consentId} className='flex cursor-pointer items-start gap-2'>
                  <Checkbox
                    id={consentId}
                    checked={consent}
                    onCheckedChange={(value) => setConsent(value === true)}
                    className='mt-0.5'
                  />
                  <span className='text-[var(--text-body)] text-small'>
                    {t('conversations.consent')}
                  </span>
                </label>
              </div>
            ) : (
              <p className='text-[var(--text-muted)] text-small'>
                {isLoadingSources ? t('loading') : t('conversations.empty')}
              </p>
            )}
          </ChipModalField>
        )}
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        primaryAction={{
          label: isPending ? t('creating') : t('create'),
          onClick: () => void handleCreate(),
          disabled: !canCreate,
        }}
      />
    </ChipModal>
  )
}
