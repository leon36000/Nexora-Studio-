'use client'

import { useEffect, useRef, useState } from 'react'
import { Chip, ChipInput, ChipLink, ChipTextarea, cn } from '@sim/emcn'
import { HelpCircle, Plus, Send, Sparkles, Square } from '@sim/emcn/icons'
import { generateId } from '@sim/utils/id'
import { omit } from '@sim/utils/object'
import { useTranslations } from 'next-intl'
import { docsUrl } from '@/lib/branding/docs-url'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import { FormField } from '@/app/workspace/[workspaceId]/agents/components/form-field'
import { useNewAgent } from '@/app/workspace/[workspaceId]/agents/use-new-agent'
import {
  type ColumnRun,
  PlaygroundColumn,
} from '@/app/workspace/[workspaceId]/playground/components/playground-column'
import { streamPlaygroundAnswer } from '@/app/workspace/[workspaceId]/playground/stream-answer'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useProviderModels } from '@/hooks/queries/providers'

const MAX_COLUMNS = 3
const DEFAULT_MODEL = `vllm/${DEFAULT_MODEL_ALIAS}`
const DEFAULT_TEMPERATURE = '0.7'
const DEFAULT_MAX_TOKENS = '1024'
const MAX_TOKENS_LIMIT = 8192

const COLUMN_GRID = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
} as const

interface Column {
  id: string
  model: string
}

interface PlaygroundProps {
  workspaceId: string
}

function isWithin(value: number, min: number, max: number): boolean {
  return Math.min(Math.max(value, min), max) === value
}

function parseTemperature(value: string): number | null {
  const parsed = Number(value)
  return value.trim() && isWithin(parsed, 0, 2) ? parsed : null
}

function parseMaxTokens(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && isWithin(parsed, 1, MAX_TOKENS_LIMIT) ? parsed : null
}

/**
 * Nexora edition: try and compare up to three models side by side on the same instructions and
 * message. Nothing is stored; leaving the page stops every answer.
 */
export function Playground({ workspaceId }: PlaygroundProps) {
  const controllersRef = useRef<Map<string, AbortController> | null>(null)
  controllersRef.current ??= new Map()
  const t = useTranslations('agents.playground')
  const { canEdit } = useUserPermissionsContext()
  const { data: modelList } = useProviderModels('vllm')
  const { createAgent, isCreating } = useNewAgent(workspaceId)
  const [columns, setColumns] = useState<Column[]>(() => [
    { id: generateId(), model: DEFAULT_MODEL },
  ])
  const [runs, setRuns] = useState<Record<string, ColumnRun>>({})
  const [instructions, setInstructions] = useState('')
  const [message, setMessage] = useState('')
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE)
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS)

  const temperatureValue = parseTemperature(temperature)
  const maxTokensValue = parseMaxTokens(maxTokens)
  const isStreaming = Object.values(runs).some((run) => run.status === 'streaming')
  const canSend =
    !isStreaming &&
    message.trim().length > 0 &&
    temperatureValue !== null &&
    maxTokensValue !== null &&
    columns.every((column) => column.model)

  useEffect(() => {
    const controllers = controllersRef.current
    return () => {
      for (const controller of controllers?.values() ?? []) controller.abort()
    }
  }, [])

  const updateRun = (columnId: string, controller: AbortController, change: Partial<ColumnRun>) => {
    if (controllersRef.current?.get(columnId) !== controller) return
    setRuns((previous) => {
      const current = previous[columnId]
      return current ? { ...previous, [columnId]: { ...current, ...change } } : previous
    })
  }

  const startColumn = (column: Column, temperatureSetting: number, maxTokensSetting: number) => {
    const controllers = controllersRef.current
    if (!controllers) return
    controllers.get(column.id)?.abort()
    const controller = new AbortController()
    controllers.set(column.id, controller)
    const startedAt = performance.now()
    let text = ''
    setRuns((previous) => ({ ...previous, [column.id]: { text: '', status: 'streaming' } }))
    void streamPlaygroundAnswer({
      body: {
        workspaceId,
        model: column.model,
        messages: [
          ...(instructions.trim() ? [{ role: 'system' as const, content: instructions }] : []),
          { role: 'user' as const, content: message },
        ],
        temperature: temperatureSetting,
        maxTokens: maxTokensSetting,
      },
      signal: controller.signal,
      onChunk: (chunk) => {
        text += chunk
        updateRun(column.id, controller, { text })
      },
    }).then((outcome) => {
      const latencyMs = performance.now() - startedAt
      if (outcome.status === 'done') {
        updateRun(column.id, controller, { status: 'done', latencyMs, usage: outcome.usage })
      } else if (outcome.status === 'stopped') {
        updateRun(column.id, controller, { status: 'stopped', latencyMs })
      } else {
        updateRun(column.id, controller, { status: 'error', error: outcome.code, latencyMs })
      }
      if (controllers.get(column.id) === controller) controllers.delete(column.id)
    })
  }

  const handleSend = () => {
    if (!canSend || temperatureValue === null || maxTokensValue === null) return
    for (const column of columns) startColumn(column, temperatureValue, maxTokensValue)
  }

  const handleStop = () => {
    for (const controller of controllersRef.current?.values() ?? []) controller.abort()
  }

  const handleAddColumn = () => {
    const used = new Set(columns.map((column) => column.model))
    const next = modelList?.models.find((model) => !used.has(model)) ?? DEFAULT_MODEL
    setColumns((previous) => [...previous, { id: generateId(), model: next }])
  }

  const handleRemoveColumn = (columnId: string) => {
    controllersRef.current?.get(columnId)?.abort()
    controllersRef.current?.delete(columnId)
    setColumns((previous) => previous.filter((column) => column.id !== columnId))
    setRuns((previous) => omit(previous, [columnId]))
  }

  const handleModelChange = (columnId: string, model: string) => {
    setColumns((previous) =>
      previous.map((column) => (column.id === columnId ? { ...column, model } : column))
    )
  }

  const handleSaveAsAgent = () => {
    void createAgent({
      model: columns[0]?.model ?? DEFAULT_MODEL,
      ...(instructions.trim() ? { instructions } : {}),
    })
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[80rem] flex-col gap-6 py-10'>
        <header className='flex items-center justify-between gap-4'>
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
          <div className='flex shrink-0 items-center gap-1'>
            {canEdit && (
              <Chip leftIcon={Sparkles} disabled={isCreating} onClick={handleSaveAsAgent}>
                {t('saveAsAgent')}
              </Chip>
            )}
            <ChipLink
              href={docsUrl('/playground')}
              target='_blank'
              rel='noopener noreferrer'
              leftIcon={HelpCircle}
            >
              {t('help')}
            </ChipLink>
          </div>
        </header>

        <div className='flex flex-col gap-4'>
          <FormField label={t('instructions')} htmlFor='playground-instructions'>
            <ChipTextarea
              id='playground-instructions'
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder={t('instructionsPlaceholder')}
              rows={4}
              resizable
            />
          </FormField>
          <FormField label={t('message')} htmlFor='playground-message'>
            <ChipTextarea
              id='playground-message'
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder={t('messagePlaceholder')}
              rows={3}
              resizable
            />
          </FormField>
          <div className='flex flex-wrap items-end gap-4'>
            <div className='w-[140px]'>
              <FormField label={t('temperature')} htmlFor='playground-temperature'>
                <ChipInput
                  id='playground-temperature'
                  type='number'
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  error={temperatureValue === null}
                  onChange={(event) => setTemperature(event.target.value)}
                />
              </FormField>
            </div>
            <div className='w-[200px]'>
              <FormField label={t('maxTokens')} htmlFor='playground-max-tokens'>
                <ChipInput
                  id='playground-max-tokens'
                  type='number'
                  min={1}
                  max={MAX_TOKENS_LIMIT}
                  step={1}
                  value={maxTokens}
                  error={maxTokensValue === null}
                  onChange={(event) => setMaxTokens(event.target.value)}
                />
              </FormField>
            </div>
            <div className='ml-auto flex items-center gap-1'>
              {columns.length < MAX_COLUMNS && (
                <Chip leftIcon={Plus} onClick={handleAddColumn}>
                  {t('addModel')}
                </Chip>
              )}
              {isStreaming ? (
                <Chip leftIcon={Square} onClick={handleStop}>
                  {t('stop')}
                </Chip>
              ) : (
                <Chip variant='primary' leftIcon={Send} disabled={!canSend} onClick={handleSend}>
                  {t('send')}
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className={cn('grid gap-3', COLUMN_GRID[columns.length as keyof typeof COLUMN_GRID])}>
          {columns.map((column) => (
            <PlaygroundColumn
              key={column.id}
              model={column.model}
              run={runs[column.id]}
              disabled={runs[column.id]?.status === 'streaming'}
              onModelChange={(model) => handleModelChange(column.id, model)}
              onRemove={columns.length > 1 ? () => handleRemoveColumn(column.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
