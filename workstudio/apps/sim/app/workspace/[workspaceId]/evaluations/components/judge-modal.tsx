'use client'

import { useState } from 'react'
import {
  Chip,
  ChipDropdown,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSwitch,
  ChipTag,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useLocale, useTranslations } from 'next-intl'
import type {
  NexoraEvalJudge,
  NexoraEvalJudgeConfig,
  NexoraEvalTryResult,
} from '@/lib/api/contracts/nexora-evaluations'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import {
  defaultJudgeConfig,
  formatRate,
  isJudgeKind,
  JUDGE_KINDS,
  type JudgeKind,
} from '@/app/workspace/[workspaceId]/evaluations/utils/format'
import {
  useEvalDatasets,
  useSaveEvalJudge,
  useTryEvalJudge,
} from '@/hooks/queries/nexora-evaluations'
import { useProviderModels } from '@/hooks/queries/providers'

const DEFAULT_MODEL = `vllm/${DEFAULT_MODEL_ALIAS}`

const splitList = (text: string) =>
  text
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

interface JudgeForm {
  kind: JudgeKind
  model: string
  instructions: string
  labels: string
  passLabels: string
  min: string
  max: string
  passAt: string
  value: string
  useExpected: boolean
  caseSensitive: boolean
  pattern: string
  keys: string
}

function formFrom(config: NexoraEvalJudgeConfig): JudgeForm {
  const base: JudgeForm = {
    kind: config.kind,
    model: DEFAULT_MODEL,
    instructions: '',
    labels: 'correct, incorrect',
    passLabels: 'correct',
    min: '1',
    max: '10',
    passAt: '7',
    value: '',
    useExpected: true,
    caseSensitive: false,
    pattern: '',
    keys: '',
  }
  switch (config.kind) {
    case 'llm_class':
      return {
        ...base,
        model: `vllm/${config.model.replace(/^vllm\//, '')}`,
        instructions: config.instructions,
        labels: config.labels.join(', '),
        passLabels: config.passLabels.join(', '),
      }
    case 'llm_score':
      return {
        ...base,
        model: `vllm/${config.model.replace(/^vllm\//, '')}`,
        instructions: config.instructions,
        min: String(config.min),
        max: String(config.max),
        passAt: String(config.passAt),
      }
    case 'contains':
      return {
        ...base,
        value: config.value ?? '',
        useExpected: config.value === null,
        caseSensitive: config.caseSensitive,
      }
    case 'regex':
      return { ...base, pattern: config.pattern, caseSensitive: config.caseSensitive }
    case 'json_valid':
      return { ...base, keys: config.requiredKeys.join(', ') }
    case 'semantic':
      return { ...base, model: config.model, passAt: String(config.passAt) }
  }
}

/** The judge settings the form describes, or `null` while a number is not a number. */
function configFrom(form: JudgeForm): NexoraEvalJudgeConfig | null {
  const wireModel = form.model.replace(/^vllm\//, '')
  switch (form.kind) {
    case 'llm_class':
      return {
        kind: 'llm_class',
        model: wireModel,
        instructions: form.instructions,
        labels: splitList(form.labels),
        passLabels: splitList(form.passLabels),
      }
    case 'llm_score': {
      const [min, max, passAt] = [form.min, form.max, form.passAt].map((text) =>
        Number(text.replace(',', '.'))
      )
      return [min, max, passAt].some((number) => !Number.isFinite(number))
        ? null
        : { kind: 'llm_score', model: wireModel, instructions: form.instructions, min, max, passAt }
    }
    case 'contains':
      return {
        kind: 'contains',
        value: form.useExpected ? null : form.value,
        caseSensitive: form.caseSensitive,
      }
    case 'regex':
      return { kind: 'regex', pattern: form.pattern, caseSensitive: form.caseSensitive }
    case 'json_valid':
      return { kind: 'json_valid', requiredKeys: splitList(form.keys) }
    case 'semantic': {
      const passAt = Number(form.passAt.replace(',', '.'))
      return Number.isFinite(passAt) ? { kind: 'semantic', model: 'bge-m3', passAt } : null
    }
  }
}

interface JudgeModalProps {
  workspaceId: string
  /** The judge being edited, `null` for a new one. */
  judge: NexoraEvalJudge | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Creates or edits a judge, and tries it on up to 10 rows of a test set before it is used. */
export function JudgeModal({ workspaceId, judge, open, onOpenChange }: JudgeModalProps) {
  const t = useTranslations('evaluations.judgeModal')
  const locale = useLocale()
  const { data: modelList } = useProviderModels('vllm')
  const { data: datasets } = useEvalDatasets(workspaceId)
  const { mutateAsync: saveJudge, isPending: isSaving } = useSaveEvalJudge()
  const {
    mutateAsync: tryJudge,
    isPending: isTrying,
    reset: resetTry,
    data: tried,
  } = useTryEvalJudge()
  const [name, setName] = useState('')
  const [form, setForm] = useState<JudgeForm>(() => formFrom(defaultJudgeConfig('llm_class', '')))
  const [tryDataset, setTryDataset] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setName(judge?.name ?? '')
      setForm(formFrom(judge?.config ?? defaultJudgeConfig('llm_class', '')))
      setTryDataset('')
      setError(null)
      resetTry()
    }
  }

  const patch = (change: Partial<JudgeForm>) => setForm((previous) => ({ ...previous, ...change }))
  const config = configFrom(form)
  const modelOptions = [...new Set([DEFAULT_MODEL, ...(modelList?.models ?? [])])].map((model) => ({
    value: model,
    label: model.replace(/^vllm\//, ''),
  }))
  const chosenDataset = tryDataset || datasets?.[0]?.id || ''
  const isBusy = isSaving || isTrying
  const canSave = name.trim().length > 0 && config !== null && !isBusy

  const handleSave = async () => {
    if (!canSave || !config) return
    try {
      await saveJudge({ judgeId: judge?.id, workspaceId, name: name.trim(), config })
      onOpenChange(false)
    } catch (caught) {
      setError(getErrorMessage(caught, t('failed')))
    }
  }

  const handleTry = async () => {
    if (!config || !chosenDataset) return
    setError(null)
    try {
      await tryJudge({ workspaceId, config, datasetId: chosenDataset, limit: 10 })
    } catch (caught) {
      setError(getErrorMessage(caught, t('tryFailed')))
    }
  }

  const usesModel = form.kind === 'llm_class' || form.kind === 'llm_score'

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')} size='lg'>
      <ChipModalHeader onClose={() => onOpenChange(false)}>
        {judge ? t('editTitle') : t('title')}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={setName}
          required
          disabled={isBusy}
        />
        <ChipModalField
          type='dropdown'
          title={t('kind')}
          value={form.kind}
          onChange={(kind) => isJudgeKind(kind) && setForm(formFrom(defaultJudgeConfig(kind, '')))}
          options={JUDGE_KINDS.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
        />
        {usesModel && (
          <ChipModalField
            type='dropdown'
            title={t('model')}
            value={form.model}
            onChange={(model) => patch({ model })}
            options={modelOptions}
          />
        )}
        {usesModel && (
          <ChipModalField
            type='textarea'
            title={t('instructions')}
            value={form.instructions}
            onChange={(instructions) => patch({ instructions })}
            hint={t('instructionsHint')}
            disabled={isBusy}
          />
        )}
        {form.kind === 'llm_class' && (
          <>
            <ChipModalField
              type='input'
              title={t('labels')}
              value={form.labels}
              onChange={(labels) => patch({ labels })}
              hint={t('labelsHint')}
              disabled={isBusy}
            />
            <ChipModalField
              type='input'
              title={t('passLabels')}
              value={form.passLabels}
              onChange={(passLabels) => patch({ passLabels })}
              disabled={isBusy}
            />
          </>
        )}
        {form.kind === 'llm_score' && (
          <>
            <ChipModalField
              type='input'
              title={t('min')}
              value={form.min}
              onChange={(min) => patch({ min })}
              disabled={isBusy}
            />
            <ChipModalField
              type='input'
              title={t('max')}
              value={form.max}
              onChange={(max) => patch({ max })}
              disabled={isBusy}
            />
            <ChipModalField
              type='input'
              title={t('passAt')}
              value={form.passAt}
              onChange={(passAt) => patch({ passAt })}
              hint={t('passAtHint')}
              disabled={isBusy}
            />
          </>
        )}
        {form.kind === 'contains' && (
          <>
            <ChipModalField type='custom' title={t('contains.source')}>
              <ChipSwitch
                aria-label={t('contains.source')}
                options={[
                  { value: 'expected', label: t('contains.expected') },
                  { value: 'text', label: t('contains.text') },
                ]}
                value={form.useExpected ? 'expected' : 'text'}
                onChange={(source) => patch({ useExpected: source === 'expected' })}
              />
            </ChipModalField>
            {!form.useExpected && (
              <ChipModalField
                type='input'
                title={t('contains.value')}
                value={form.value}
                onChange={(value) => patch({ value })}
                disabled={isBusy}
              />
            )}
          </>
        )}
        {form.kind === 'regex' && (
          <ChipModalField
            type='input'
            title={t('pattern')}
            value={form.pattern}
            onChange={(pattern) => patch({ pattern })}
            hint={t('patternHint')}
            disabled={isBusy}
          />
        )}
        {(form.kind === 'contains' || form.kind === 'regex') && (
          <ChipModalField type='custom' title={t('case')}>
            <ChipSwitch
              aria-label={t('case')}
              options={[
                { value: 'ignore', label: t('caseIgnore') },
                { value: 'respect', label: t('caseRespect') },
              ]}
              value={form.caseSensitive ? 'respect' : 'ignore'}
              onChange={(mode) => patch({ caseSensitive: mode === 'respect' })}
            />
          </ChipModalField>
        )}
        {form.kind === 'json_valid' && (
          <ChipModalField
            type='input'
            title={t('keys')}
            value={form.keys}
            onChange={(keys) => patch({ keys })}
            hint={t('keysHint')}
            disabled={isBusy}
          />
        )}
        {form.kind === 'semantic' && (
          <ChipModalField
            type='input'
            title={t('similarity')}
            value={form.passAt}
            onChange={(passAt) => patch({ passAt })}
            hint={t('similarityHint')}
            disabled={isBusy}
          />
        )}

        <ChipModalField
          type='custom'
          title={t('try.title')}
          hint={datasets?.length ? t('try.hint') : t('try.noDataset')}
        >
          <div className='flex flex-wrap items-center gap-1'>
            <ChipDropdown
              value={chosenDataset}
              onChange={setTryDataset}
              options={(datasets ?? []).map((dataset) => ({
                value: dataset.id,
                label: dataset.name,
              }))}
              disabled={isBusy || !datasets?.length}
            />
            <Chip
              disabled={isBusy || config === null || !chosenDataset}
              onClick={() => void handleTry()}
            >
              {isTrying ? t('try.running') : t('try.run')}
            </Chip>
          </div>
        </ChipModalField>
        {tried && (
          <TryResults
            results={tried.results}
            agreement={tried.agreement}
            locale={locale}
            labels={{
              agreement: (matched, total, rate) => t('try.agreement', { matched, total, rate }),
              noAnnotation: t('try.noAnnotation'),
              human: t('try.human'),
              judge: t('try.judge'),
              verdicts: {
                pass: t('verdicts.pass'),
                fail: t('verdicts.fail'),
                error: t('verdicts.error'),
              },
              expectedUsed: t('try.expectedUsed'),
            }}
          />
        )}
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        primaryAction={{
          label: isSaving ? t('saving') : t('save'),
          onClick: () => void handleSave(),
          disabled: !canSave,
        }}
      />
    </ChipModal>
  )
}

interface TryResultsProps {
  results: NexoraEvalTryResult[]
  agreement: { total: number; matched: number; rate: number | null }
  locale: string
  labels: {
    agreement: (matched: number, total: number, rate: string) => string
    noAnnotation: string
    human: string
    judge: string
    verdicts: Record<'pass' | 'fail' | 'error', string>
    expectedUsed: string
  }
}

/** The judge's verdict on each tried row, next to the person's when the row is annotated. */
function TryResults({ results, agreement, locale, labels }: TryResultsProps) {
  return (
    <div className='flex flex-col gap-2 px-2'>
      <p className='text-[var(--text-body)] text-small'>
        {agreement.total > 0
          ? labels.agreement(agreement.matched, agreement.total, formatRate(agreement.rate, locale))
          : labels.noAnnotation}
      </p>
      <ul className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
        {results.map((result) => (
          <li key={result.rowId} className='flex flex-col gap-1 px-3 py-2'>
            <p className='line-clamp-2 text-[var(--text-body)] text-small'>{result.input}</p>
            <p className='line-clamp-2 text-[var(--text-muted)] text-caption'>
              {result.usedExpected ? `${labels.expectedUsed} ` : ''}
              {result.answer}
            </p>
            <div className='flex flex-wrap items-center gap-1'>
              {result.humanVerdict && (
                <ChipTag variant='gray'>
                  {labels.human} : {labels.verdicts[result.humanVerdict]}
                </ChipTag>
              )}
              <ChipTag variant='gray' invalid={result.verdict === 'error'}>
                {labels.judge} : {labels.verdicts[result.verdict]}
              </ChipTag>
            </div>
            <p className='text-[var(--text-muted)] text-caption'>{result.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
