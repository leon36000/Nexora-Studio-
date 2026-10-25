'use client'

import { useState } from 'react'
import {
  Chip,
  ChipInput,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  Label,
  Switch,
} from '@sim/emcn'
import { Plus, Trash } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import type { NexoraTraceSettings } from '@/lib/api/contracts/nexora-traces'
import {
  usePurgeNexoraTraces,
  useTestNexoraTraceExport,
  useUpdateNexoraTraceSettings,
} from '@/hooks/queries/nexora-traces'

interface HeaderDraft {
  name: string
  value: string
  /** The server holds a value for this name; blank keeps it. */
  stored: boolean
}

interface Draft {
  enabled: boolean
  retentionDays: string
  redaction: NexoraTraceSettings['redaction']
  conversationRetentionDays: string
  otlpEnabled: boolean
  endpoint: string
  headers: HeaderDraft[]
}

function draftOf(settings: NexoraTraceSettings): Draft {
  return {
    enabled: settings.enabled,
    retentionDays: String(settings.retentionDays),
    redaction: settings.redaction,
    conversationRetentionDays:
      settings.conversationRetentionDays === null ? '' : String(settings.conversationRetentionDays),
    otlpEnabled: settings.otlp.enabled,
    endpoint: settings.otlp.endpoint,
    headers: settings.otlp.headers.map(({ name }) => ({ name, value: '', stored: true })),
  }
}

function wholeDays(text: string, max: number): number | null {
  const value = Number(text.trim())
  return text.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= max ? value : null
}

interface TraceSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: NexoraTraceSettings
  lastExport: { at: string; ok: boolean; error?: string } | null
}

/** Instance administrators: capture, retention, masking, OTLP export, test and purge. */
export function TraceSettingsModal({
  open,
  onOpenChange,
  settings,
  lastExport,
}: TraceSettingsModalProps) {
  const t = useTranslations('traces.settings')
  const update = useUpdateNexoraTraceSettings()
  const testExport = useTestNexoraTraceExport()
  const purge = usePurgeNexoraTraces()
  const [draft, setDraft] = useState<Draft>(() => draftOf(settings))
  const [error, setError] = useState<string | null>(null)
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(draftOf(settings))
      setError(null)
      setNotice(null)
      setConfirmPurge(false)
    }
  }

  const retention = wholeDays(draft.retentionDays, 365)
  const conversations =
    draft.conversationRetentionDays.trim() === ''
      ? null
      : wholeDays(draft.conversationRetentionDays, 3650)
  const conversationsInvalid =
    draft.conversationRetentionDays.trim() !== '' && conversations === null
  const endpointMissing = draft.otlpEnabled && draft.endpoint.trim() === ''
  const headersInvalid = draft.headers.some(
    (header) => header.name.trim() === '' || (!header.stored && header.value === '')
  )
  const canSave = retention !== null && !conversationsInvalid && !endpointMissing && !headersInvalid
  const patch = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }))
  const patchHeader = (index: number, changes: Partial<HeaderDraft>) =>
    patch({
      headers: draft.headers.map((header, at) =>
        at === index ? { ...header, ...changes } : header
      ),
    })

  const save = async () => {
    if (!canSave || retention === null) return
    setError(null)
    try {
      await update.mutateAsync({
        enabled: draft.enabled,
        retentionDays: retention,
        redaction: draft.redaction,
        conversationRetentionDays: conversations,
        otlp: {
          enabled: draft.otlpEnabled,
          endpoint: draft.endpoint,
          headers: draft.headers.map((header) => ({
            name: header.name.trim(),
            value: header.value,
          })),
        },
      })
      onOpenChange(false)
    } catch (saveError) {
      setError(getErrorMessage(saveError, t('saveFailed')))
    }
  }

  const runTest = async () => {
    setNotice(null)
    const result = await testExport.mutateAsync()
    setNotice(
      result.ok ? t('testOk') : t('testFailed', { error: result.error ?? `HTTP ${result.status}` })
    )
  }

  const runPurge = async () => {
    setConfirmPurge(false)
    const result = await purge.mutateAsync({})
    setNotice(
      t('purged', { traces: result.deletedTraces, conversations: result.deletedConversations })
    )
  }

  const lastExportText = lastExport
    ? t('lastExport', {
        status: lastExport.ok
          ? t('lastExportOk')
          : t('lastExportFailed', { error: lastExport.error ?? '' }),
      })
    : null
  const busy = update.isPending

  return (
    <ChipModal
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
      dismissDisabled={busy}
      srTitle={t('title')}
    >
      <ChipModalHeader onClose={() => !busy && onOpenChange(false)}>{t('title')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField type='custom' title={t('enabled')}>
          <Switch
            id='trace-enabled'
            checked={draft.enabled}
            onCheckedChange={(enabled) => patch({ enabled })}
          />
        </ChipModalField>
        <ChipModalField
          type='input'
          title={t('retention')}
          value={draft.retentionDays}
          onChange={(retentionDays) => patch({ retentionDays })}
          inputMode='numeric'
          error={retention === null ? '1 – 365' : undefined}
        />
        <ChipModalField
          type='dropdown'
          title={t('redaction')}
          value={draft.redaction}
          onChange={(value) =>
            patch({ redaction: value === 'strict' || value === 'none' ? value : 'standard' })
          }
          options={[
            { value: 'standard', label: t('redactionStandard') },
            { value: 'strict', label: t('redactionStrict') },
            { value: 'none', label: t('redactionNone') },
          ]}
          hint={t('redactionNote')}
        />
        <ChipModalField
          type='input'
          title={t('conversations')}
          value={draft.conversationRetentionDays}
          onChange={(conversationRetentionDays) => patch({ conversationRetentionDays })}
          placeholder={t('conversationsPlaceholder')}
          inputMode='numeric'
          error={conversationsInvalid ? '1 – 3650' : undefined}
        />

        <ChipModalField type='custom' title={t('otlpTitle')} hint={t('otlpNote')}>
          <div className='flex items-center gap-2'>
            <Switch
              id='trace-otlp'
              checked={draft.otlpEnabled}
              onCheckedChange={(otlpEnabled) => patch({ otlpEnabled })}
            />
            <Label htmlFor='trace-otlp'>{t('otlpEnabled')}</Label>
          </div>
        </ChipModalField>
        <ChipModalField
          type='input'
          title={t('otlpEndpoint')}
          value={draft.endpoint}
          onChange={(endpoint) => patch({ endpoint })}
          placeholder={t('otlpEndpointPlaceholder')}
          autoComplete='off'
          error={endpointMissing ? t('otlpEndpoint') : undefined}
        />
        <ChipModalField type='custom' title={t('otlpHeaders')}>
          <div className='flex flex-col gap-2'>
            {draft.headers.map((header, index) => (
              <div key={`${header.name}-${index}`} className='flex items-center gap-1'>
                <ChipInput
                  className='min-w-0 flex-1'
                  aria-label={t('otlpHeaderName')}
                  placeholder={t('otlpHeaderName')}
                  value={header.name}
                  disabled={header.stored}
                  onChange={(event) => patchHeader(index, { name: event.target.value })}
                />
                <ChipInput
                  className='min-w-0 flex-1'
                  type='password'
                  autoComplete='off'
                  aria-label={t('otlpHeaderValue')}
                  placeholder={header.stored ? t('otlpHeaderKept') : t('otlpHeaderValue')}
                  value={header.value}
                  onChange={(event) => patchHeader(index, { value: event.target.value })}
                />
                <Chip
                  leftIcon={Trash}
                  aria-label={t('removeHeader', { name: header.name })}
                  onClick={() => patch({ headers: draft.headers.filter((_, at) => at !== index) })}
                />
              </div>
            ))}
            <Chip
              variant='border'
              leftIcon={Plus}
              className='self-start'
              onClick={() =>
                patch({ headers: [...draft.headers, { name: '', value: '', stored: false }] })
              }
            >
              {t('addHeader')}
            </Chip>
          </div>
        </ChipModalField>
        <ChipModalField type='custom' title={t('testExport')} hint={t('saveFirst')}>
          <div className='flex flex-col items-start gap-1'>
            <Chip
              variant='border'
              disabled={testExport.isPending || !settings.otlp.endpoint}
              onClick={() => void runTest()}
            >
              {testExport.isPending ? t('testing') : t('testExport')}
            </Chip>
            {lastExportText && (
              <p className='text-[var(--text-muted)] text-caption'>{lastExportText}</p>
            )}
          </div>
        </ChipModalField>

        <ChipModalField type='custom' title={t('purgeTitle')}>
          <div className='flex flex-col items-start gap-2'>
            {confirmPurge ? (
              <>
                <p className='text-[var(--text-body)] text-small'>{t('purgeConfirm')}</p>
                <div className='flex gap-1'>
                  <Chip variant='border' onClick={() => void runPurge()}>
                    {t('purgeNow')}
                  </Chip>
                  <Chip onClick={() => setConfirmPurge(false)}>{t('close')}</Chip>
                </div>
              </>
            ) : (
              <Chip
                variant='border'
                disabled={purge.isPending}
                onClick={() => setConfirmPurge(true)}
              >
                {purge.isPending ? t('purging') : t('purgeNow')}
              </Chip>
            )}
            {notice && <p className='text-[var(--text-muted)] text-caption'>{notice}</p>}
          </div>
        </ChipModalField>
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => !busy && onOpenChange(false)}
        primaryAction={{
          label: busy ? t('saving') : t('save'),
          onClick: save,
          disabled: !canSave || busy,
        }}
      />
    </ChipModal>
  )
}
