'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Badge,
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  cn,
  toast,
} from '@sim/emcn'
import { useFormatter, useTranslations } from 'next-intl'
import type { NexoraModelSource } from '@/lib/nexora/model-admin'
import {
  canonicalOllamaName,
  classifyOllamaPullError,
  NEXORA_MODEL_USAGES,
  type NexoraModelUsage,
  OLLAMA_MODEL_NAME,
} from '@/lib/nexora/model-ids'
import {
  getNexoraModelErrorCode,
  type NexoraModel,
  type OllamaCatalogModel,
  OllamaPullError,
  type OllamaPullProgress,
  useAddNexoraModel,
  usePullOllamaModel,
} from '@/hooks/queries/nexora-models'

const WIZARD_STEPS = ['source', 'model', 'confirm'] as const
type WizardStep = (typeof WIZARD_STEPS)[number]

const MODEL_SOURCES: readonly NexoraModelSource[] = ['ollama', 'mistral', 'openai-compatible']
/**
 * Mistral AI's model for each usage: chat, OCR (Mistral Document AI) and Voxtral transcription;
 * speech synthesis is not offered through Mistral AI (empty).
 */
const DEFAULT_MISTRAL_MODEL: Record<NexoraModelUsage, string> = {
  chat: 'mistral-small-latest',
  vision: 'mistral-ocr-latest',
  transcription: 'voxtral-mini-latest',
  speech: '',
}
const SERVICE_URL = /^https?:\/\/[^\s/]+(\/\S*)?$/
const REMOTE_MODEL_NAME = /^\S{1,128}$/
const BYTES_PER_GB = 1_000_000_000

interface DownloadProgress {
  status: string
  completed: number
  total: number
}

/** Ollama names an untagged model `name:latest` once downloaded. */
function isDownloaded(model: string, localModels: readonly string[]): boolean {
  return localModels.includes(model) || localModels.includes(`${model}:latest`)
}

interface AddModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: readonly OllamaCatalogModel[]
  localModels: readonly string[]
  ollamaAvailable: boolean
}

/**
 * Three-step wizard: pick where the model runs, name it (and its key or address), then add it.
 * A local model not yet on the server is downloaded first, with its progress; Nexora API checks
 * that a remote service answers before keeping it.
 */
export function AddModelModal({
  open,
  onOpenChange,
  catalog,
  localModels,
  ollamaAvailable,
}: AddModelModalProps) {
  const t = useTranslations('settings.models.wizard')
  const tModels = useTranslations('settings.models')
  const tShared = useTranslations('settings.shared')
  const format = useFormatter()
  const abortRef = useRef<AbortController | null>(null)
  const layersRef = useRef<Map<string, { completed: number; total: number }> | null>(null)
  layersRef.current ??= new Map()
  const addModel = useAddNexoraModel()
  const pullModel = usePullOllamaModel()

  const [step, setStep] = useState<WizardStep>('source')
  const [usage, setUsage] = useState<NexoraModelUsage>('chat')
  const [source, setSource] = useState<NexoraModelSource | null>(null)
  const [ollamaModel, setOllamaModel] = useState('')
  const [mistralModel, setMistralModel] = useState(DEFAULT_MISTRAL_MODEL.chat)
  const [mistralKey, setMistralKey] = useState('')
  const [serviceUrl, setServiceUrl] = useState('')
  const [serviceModel, setServiceModel] = useState('')
  const [serviceKey, setServiceKey] = useState('')
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep('source')
      setUsage('chat')
      setSource(null)
      setOllamaModel('')
      setMistralModel(DEFAULT_MISTRAL_MODEL.chat)
      setMistralKey('')
      setServiceUrl('')
      setServiceModel('')
      setServiceKey('')
      setProgress(null)
      setError(null)
    }
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  const isDownloading = pullModel.isPending
  const isAdding = addModel.isPending
  const isBusy = isDownloading || isAdding

  // Ollama serves chat and vision models, it neither transcribes nor synthesizes speech; speech
  // synthesis is reached through an OpenAI-compatible service only.
  const isSourceAvailable = (candidate: NexoraModelSource) => {
    if (usage === 'speech') return candidate === 'openai-compatible'
    return candidate !== 'ollama' || (ollamaAvailable && usage !== 'transcription')
  }
  const usageCatalog = catalog.filter((entry) => entry.usage === usage)

  const chooseUsage = (next: NexoraModelUsage) => {
    setUsage(next)
    setMistralModel(DEFAULT_MISTRAL_MODEL[next])
    setOllamaModel('')
    if (
      (next === 'transcription' && source === 'ollama') ||
      (next === 'speech' && source !== 'openai-compatible')
    ) {
      setSource(null)
    }
  }

  // Shown and sent as Ollama lists it (lowercase, with a tag), the name Nexora API checks.
  const ollamaName = canonicalOllamaName(ollamaModel)
  const catalogEntry = catalog.find((entry) => entry.name === ollamaName)
  const ollamaNameValid = OLLAMA_MODEL_NAME.test(ollamaModel.trim().toLowerCase())
  const needsDownload =
    source === 'ollama' && !(catalogEntry?.installed || isDownloaded(ollamaName, localModels))

  const modelStepValid =
    source === 'ollama'
      ? ollamaNameValid
      : source === 'mistral'
        ? REMOTE_MODEL_NAME.test(mistralModel.trim()) && mistralKey.trim().length > 0
        : SERVICE_URL.test(serviceUrl.trim()) && REMOTE_MODEL_NAME.test(serviceModel.trim())

  const formatGb = (value: number) => format.number(value, { maximumFractionDigits: 1 })

  const handleProgress = ({ status, completed, total }: OllamaPullProgress) => {
    const layers = layersRef.current ?? new Map()
    if (total !== null) layers.set(status, { completed: completed ?? 0, total })
    let doneBytes = 0
    let totalBytes = 0
    for (const layer of layers.values()) {
      doneBytes += layer.completed
      totalBytes += layer.total
    }
    setProgress({ status, completed: doneBytes, total: totalBytes })
  }

  const describeProgress = (current: DownloadProgress) => {
    if (current.status.startsWith('pulling') && current.total > 0) {
      return t('confirm.downloading', {
        percent: Math.floor((current.completed / current.total) * 100),
        done: formatGb(current.completed / BYTES_PER_GB),
        total: formatGb(current.total / BYTES_PER_GB),
      })
    }
    if (current.status.startsWith('verifying')) return t('confirm.verifyingFiles')
    if (current.status.startsWith('writing') || current.status === 'success') {
      return t('confirm.finishing')
    }
    return t('confirm.preparing')
  }

  const handleClose = () => {
    if (isAdding) return
    abortRef.current?.abort()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!source || isBusy) return
    setError(null)
    const controller = new AbortController()
    try {
      let added: Pick<NexoraModel, 'name'>
      if (source === 'ollama') {
        if (needsDownload) {
          abortRef.current = controller
          layersRef.current?.clear()
          setProgress(null)
          await pullModel.mutateAsync({
            model: ollamaName,
            onProgress: handleProgress,
            signal: controller.signal,
          })
        }
        const result = await addModel.mutateAsync({
          source: 'ollama',
          model: ollamaName,
          usage: usage === 'vision' ? 'vision' : 'chat',
          ...(catalogEntry ? { totalParams: catalogEntry.paramsB } : {}),
        })
        added = result.model
      } else if (source === 'mistral') {
        const result = await addModel.mutateAsync({
          source: 'mistral',
          model: mistralModel.trim(),
          usage,
          key: mistralKey.trim(),
        })
        added = result.model
      } else {
        const key = serviceKey.trim()
        const result = await addModel.mutateAsync({
          source: 'openai-compatible',
          model: serviceModel.trim(),
          usage,
          url: serviceUrl.trim(),
          ...(key ? { key } : {}),
        })
        added = result.model
      }
      toast.success(tModels('added', { name: added.name }))
      onOpenChange(false)
    } catch (cause) {
      if (controller.signal.aborted) {
        setProgress(null)
        setError(t('confirm.cancelled'))
      } else if (cause instanceof OllamaPullError) {
        const kind = classifyOllamaPullError(cause.message)
        setError(
          tModels(
            kind === 'unknownModel'
              ? 'errors.downloadUnknownModel'
              : kind === 'noSpace'
                ? 'errors.downloadNoSpace'
                : kind === 'network'
                  ? 'errors.downloadNetwork'
                  : 'errors.download'
          )
        )
      } else {
        setError(tModels(`errors.${getNexoraModelErrorCode(cause)}`))
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const stepIndex = WIZARD_STEPS.indexOf(step)
  const goBack = () => {
    setError(null)
    setStep(WIZARD_STEPS[Math.max(0, stepIndex - 1)])
  }
  const goNext = () => {
    setError(null)
    setStep(WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, stepIndex + 1)])
  }

  const submitLabel = isDownloading
    ? t('confirm.downloadingAction')
    : isAdding
      ? source === 'ollama'
        ? t('confirm.adding')
        : t('confirm.checkingService')
      : needsDownload
        ? t('confirm.downloadAndAdd')
        : tShared('add')

  const primaryAction =
    step === 'confirm'
      ? { label: submitLabel, onClick: () => void handleSubmit(), disabled: isBusy }
      : {
          label: t('next'),
          onClick: goNext,
          disabled: step === 'source' ? source === null : !modelStepValid,
        }

  const sourceHint = [
    source ? t(`source.hints.${source}`) : null,
    usage === 'transcription'
      ? t('source.transcriptionNoOllama')
      : usage === 'speech'
        ? t('source.speechOnlyOpenAi')
        : ollamaAvailable
          ? null
          : t('source.ollamaUnavailable'),
  ]
    .filter(Boolean)
    .join(' ')

  const percent =
    progress && progress.total > 0 ? Math.floor((progress.completed / progress.total) * 100) : 0

  return (
    <ChipModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
      dismissDisabled={isAdding}
      srTitle={t('title', { step: stepIndex + 1 })}
      size='md'
    >
      <ChipModalHeader
        onClose={handleClose}
        closeDisabled={isAdding}
        closeAriaLabel={tShared('close')}
      >
        {t('title', { step: stepIndex + 1 })}
      </ChipModalHeader>
      <ChipModalBody>
        {step === 'source' && (
          <>
            <ChipModalField type='custom' title={t('usage.title')} hint={t(`usage.hints.${usage}`)}>
              <ChipButtonGroup
                value={usage}
                onValueChange={(value) => {
                  const next = NEXORA_MODEL_USAGES.find((candidate) => candidate === value)
                  if (next) chooseUsage(next)
                }}
              >
                {NEXORA_MODEL_USAGES.map((candidate) => (
                  <ChipButtonGroupItem key={candidate} value={candidate}>
                    {tModels(`usages.${candidate}`)}
                  </ChipButtonGroupItem>
                ))}
              </ChipButtonGroup>
            </ChipModalField>
            <ChipModalField type='custom' title={t('source.title')} hint={sourceHint || undefined}>
              <ChipButtonGroup
                value={source ?? undefined}
                onValueChange={(value) => {
                  const next = MODEL_SOURCES.find((candidate) => candidate === value)
                  if (next && isSourceAvailable(next)) setSource(next)
                }}
              >
                {MODEL_SOURCES.map((candidate) => (
                  <ChipButtonGroupItem
                    key={candidate}
                    value={candidate}
                    disabled={!isSourceAvailable(candidate)}
                  >
                    {t(`source.options.${candidate}`)}
                  </ChipButtonGroupItem>
                ))}
              </ChipButtonGroup>
            </ChipModalField>
          </>
        )}

        {step === 'model' && source === 'ollama' && (
          <>
            <ChipModalField type='custom' title={t('ollama.catalog')}>
              <div
                role='radiogroup'
                aria-label={t('ollama.catalog')}
                className='flex flex-col gap-1'
              >
                {usageCatalog.map((entry) => {
                  const selected = entry.name === ollamaName
                  return (
                    <button
                      key={entry.name}
                      type='button'
                      role='radio'
                      aria-checked={selected}
                      onClick={() => setOllamaModel(entry.name)}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-[var(--selection)] bg-[var(--surface-active)]'
                          : 'border-[var(--border)] hover:bg-[var(--surface-active)]'
                      )}
                    >
                      <span className='flex min-w-0 flex-col gap-0.5'>
                        <span className='text-[var(--text-body)] text-sm'>{entry.name}</span>
                        <span className='text-[var(--text-muted)] text-caption'>
                          {t('ollama.size', {
                            disk: formatGb(entry.diskGb),
                            memory: formatGb(entry.memoryGb),
                          })}
                        </span>
                      </span>
                      {entry.installed && (
                        <Badge variant='gray-secondary' size='sm'>
                          {t('ollama.installed')}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </ChipModalField>
            <ChipModalField
              type='input'
              title={t('ollama.name')}
              value={ollamaModel}
              onChange={setOllamaModel}
              placeholder={t('ollama.namePlaceholder')}
              autoComplete='off'
              mono
              error={ollamaModel.trim() && !ollamaNameValid ? t('ollama.invalidName') : undefined}
            />
          </>
        )}

        {step === 'model' && source === 'mistral' && (
          <>
            <ChipModalField
              type='input'
              title={t('mistral.model')}
              value={mistralModel}
              onChange={setMistralModel}
              autoComplete='off'
              mono
              required
            />
            <ChipModalField
              type='input'
              inputType='password'
              title={t('mistral.key')}
              value={mistralKey}
              onChange={setMistralKey}
              autoComplete='new-password'
              required
            />
          </>
        )}

        {step === 'model' && source === 'openai-compatible' && (
          <>
            <ChipModalField
              type='input'
              inputType='url'
              title={t('service.url')}
              value={serviceUrl}
              onChange={setServiceUrl}
              placeholder={t('service.urlPlaceholder')}
              autoComplete='off'
              required
              error={
                serviceUrl.trim() && !SERVICE_URL.test(serviceUrl.trim())
                  ? t('service.invalidUrl')
                  : undefined
              }
            />
            <ChipModalField
              type='input'
              title={t('service.model')}
              value={serviceModel}
              onChange={setServiceModel}
              autoComplete='off'
              mono
              required
            />
            <ChipModalField
              type='input'
              inputType='password'
              title={t('service.key')}
              value={serviceKey}
              onChange={setServiceKey}
              autoComplete='new-password'
            />
          </>
        )}

        {step === 'confirm' && source && (
          <>
            <ChipModalField type='custom' title={t('confirm.summary')}>
              <div className='flex flex-col gap-0.5 text-sm'>
                <span className='text-[var(--text-body)]'>
                  {`${tModels(`usages.${usage}`)} · ${t(`source.options.${source}`)}`}
                </span>
                <span className='break-all font-mono text-[var(--text-muted)]'>
                  {source === 'ollama'
                    ? ollamaName
                    : source === 'mistral'
                      ? mistralModel.trim()
                      : `${serviceModel.trim()} · ${serviceUrl.trim()}`}
                </span>
              </div>
            </ChipModalField>
            {needsDownload && (
              <ChipModalField type='custom' title={t('confirm.download')}>
                {isDownloading ? (
                  <div className='flex flex-col gap-2'>
                    <div
                      role='progressbar'
                      aria-label={t('confirm.download')}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      className='h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-5)]'
                    >
                      <div
                        className='h-full rounded-full bg-[var(--brand-blue)] transition-[width]'
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className='text-[var(--text-muted)] text-caption'>
                      {progress ? describeProgress(progress) : t('confirm.preparing')}
                    </span>
                  </div>
                ) : (
                  <span className='text-[var(--text-muted)] text-caption'>
                    {catalogEntry
                      ? t('confirm.downloadNoticeSize', { disk: formatGb(catalogEntry.diskGb) })
                      : t('confirm.downloadNotice')}
                  </span>
                )}
              </ChipModalField>
            )}
          </>
        )}

        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={isDownloading ? () => abortRef.current?.abort() : handleClose}
        cancelLabel={isDownloading ? t('confirm.cancelDownload') : tShared('cancel')}
        cancelDisabled={isAdding}
        primaryAdjacentAction={
          step === 'source' || isBusy ? undefined : { label: tShared('back'), onClick: goBack }
        }
        primaryAction={primaryAction}
      />
    </ChipModal>
  )
}
