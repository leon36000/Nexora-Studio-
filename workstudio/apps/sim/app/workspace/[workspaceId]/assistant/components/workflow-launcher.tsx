'use client'

import { useRef, useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  OverflowText,
  Skeleton,
  Switch,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import type { AssistantWorkflow } from '@/lib/api/contracts/nexora-assistant-extras'
import { buildRunInput, type readRunResult } from '@/lib/nexora/assistant/workflow-run'
import {
  useAssistantWorkflows,
  useRunAssistantWorkflow,
} from '@/hooks/queries/nexora-assistant-extended'

type RunResult = ReturnType<typeof readRunResult>

/** What the thread records of a launched workflow. */
export interface LaunchedWorkflow {
  workflow: AssistantWorkflow
  /** What the person typed, by field label, as the card shows it. */
  inputs: Record<string, string>
  result: RunResult
}

interface WorkflowLauncherProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLaunched: (launched: LaunchedWorkflow) => Promise<void>
}

type FormValues = Record<string, string | boolean>

/** « Lancer un workflow »: pick a published workflow, fill its form, and its result lands in the thread. */
export function WorkflowLauncher({
  workspaceId,
  open,
  onOpenChange,
  onLaunched,
}: WorkflowLauncherProps) {
  const t = useTranslations('assistant.workflows')
  const workflows = useAssistantWorkflows(workspaceId, open)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = workflows.data?.find((workflow) => workflow.workflowId === selectedId) ?? null

  const close = () => {
    onOpenChange(false)
    setSelectedId(null)
  }

  return (
    <ChipModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      srTitle={t('launchTitle')}
      size='md'
    >
      <ChipModalHeader onClose={close}>{selected?.name ?? t('launchTitle')}</ChipModalHeader>
      {selected ? (
        <LaunchForm
          key={selected.workflowId}
          workflow={selected}
          onBack={() => setSelectedId(null)}
          onLaunched={async (launched) => {
            await onLaunched(launched)
            close()
          }}
        />
      ) : (
        <>
          <ChipModalBody>
            {workflows.isPending ? (
              <Skeleton className='h-[52px] w-full rounded-lg' />
            ) : workflows.isError ? (
              <p className='px-2 text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
            ) : workflows.data.length === 0 ? (
              <p className='px-2 text-[var(--text-muted)] text-small'>{t('empty')}</p>
            ) : (
              <ul className='flex flex-col gap-0.5 px-2'>
                {workflows.data.map((workflow) => (
                  <li key={workflow.workflowId}>
                    <button
                      type='button'
                      onClick={() => setSelectedId(workflow.workflowId)}
                      className='flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover-hover:bg-[var(--surface-hover)]'
                    >
                      <OverflowText
                        label={workflow.name}
                        className='text-[var(--text-body)] text-small'
                      />
                      {workflow.description && (
                        <span className='line-clamp-2 text-[var(--text-muted)] text-caption'>
                          {workflow.description}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ChipModalBody>
          <ChipModalFooter cancelLabel={t('close')} onCancel={close} defaultAction='none' />
        </>
      )}
    </ChipModal>
  )
}

interface LaunchFormProps {
  workflow: AssistantWorkflow
  onBack: () => void
  onLaunched: (launched: LaunchedWorkflow) => Promise<void>
}

function LaunchForm({ workflow, onBack, onLaunched }: LaunchFormProps) {
  const t = useTranslations('assistant.workflows')
  const tErrors = useTranslations('assistant.workflows.fieldErrors')
  const run = useRunAssistantWorkflow()
  const controllerRef = useRef<AbortController | null>(null)
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      workflow.fields.map((field) => [field.name, field.type === 'boolean' ? false : field.example])
    )
  )
  const [errors, setErrors] = useState<Record<string, 'required' | 'number' | 'json'>>({})
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const back = () => {
    controllerRef.current?.abort()
    onBack()
  }

  const submit = async () => {
    if (busy || workflow.needsFiles) return
    const built = buildRunInput(workflow.fields, values)
    if (!built.ok) {
      setErrors(built.errors)
      return
    }
    setErrors({})
    setFailed(false)
    setBusy(true)
    const controller = new AbortController()
    controllerRef.current = controller
    const inputs = Object.fromEntries(
      workflow.fields.flatMap((field) => {
        const value = values[field.name]
        if (field.type === 'boolean') return [[field.label, value === true ? t('yes') : t('no')]]
        return typeof value === 'string' && value.trim() ? [[field.label, value.trim()]] : []
      })
    )
    let result: RunResult
    try {
      result = await run.mutateAsync({
        workflowId: workflow.workflowId,
        input: built.input,
        signal: controller.signal,
      })
    } catch (error) {
      if (controller.signal.aborted) return
      result = {
        status: 'failed',
        executionId: null,
        output: null,
        error: getErrorMessage(error, t('runFailed')),
        pause: null,
      }
    }
    try {
      await onLaunched({ workflow, inputs, result })
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <>
      <ChipModalBody>
        {workflow.needsFiles && (
          <p className='px-2 text-[var(--text-muted)] text-small'>{t('needsFiles')}</p>
        )}
        {!workflow.needsFiles && workflow.fields.length === 0 && (
          <p className='px-2 text-[var(--text-muted)] text-small'>{t('noFields')}</p>
        )}
        {!workflow.needsFiles &&
          workflow.fields.map((field) =>
            field.type === 'boolean' ? (
              <ChipModalField key={field.name} type='custom' title={field.label}>
                <Switch
                  checked={values[field.name] === true}
                  disabled={busy}
                  aria-label={field.label}
                  onCheckedChange={(checked) =>
                    setValues((previous) => ({ ...previous, [field.name]: checked }))
                  }
                />
              </ChipModalField>
            ) : field.type === 'string' ? (
              <ChipModalField
                key={field.name}
                type='textarea'
                title={field.label}
                value={String(values[field.name] ?? '')}
                onChange={(value) =>
                  setValues((previous) => ({ ...previous, [field.name]: value }))
                }
                required={field.required}
                disabled={busy}
                rows={2}
                resizable
                error={errors[field.name] ? tErrors(errors[field.name]) : undefined}
              />
            ) : (
              <ChipModalField
                key={field.name}
                type='input'
                title={field.label}
                value={String(values[field.name] ?? '')}
                onChange={(value) =>
                  setValues((previous) => ({ ...previous, [field.name]: value }))
                }
                required={field.required}
                disabled={busy}
                error={errors[field.name] ? tErrors(errors[field.name]) : undefined}
              />
            )
          )}
        {busy && <p className='px-2 text-[var(--text-muted)] text-small'>{t('running')}</p>}
        <ChipModalError>{failed ? t('recordFailed') : null}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        cancelLabel={t('back')}
        onCancel={back}
        defaultAction='none'
        primaryAction={{
          label: busy ? t('runningShort') : t('run'),
          onClick: () => void submit(),
          disabled: busy || workflow.needsFiles,
        }}
      />
    </>
  )
}
