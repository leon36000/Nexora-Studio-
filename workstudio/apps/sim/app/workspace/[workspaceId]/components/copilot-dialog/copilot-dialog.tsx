'use client'

import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react'
import {
  Chip,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  type ChipModalFooterAction,
  ChipModalHeader,
} from '@sim/emcn'
import {
  Calendar,
  Clock,
  Globe,
  Hand,
  Loader,
  MessageSquareText,
  Play,
  Send,
  Sparkles,
  Split,
  TriangleAlert,
  Wand,
  Webhook,
  Workflow,
} from '@sim/emcn/icons'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { GeneratedCopilotPlan } from '@/lib/api/contracts/nexora-copilot'
import {
  type CopilotErrorMessage,
  copilotErrorMessage,
} from '@/app/workspace/[workspaceId]/components/copilot-dialog/copilot-errors'
import {
  defaultFolderId,
  folderChoices,
} from '@/app/workspace/[workspaceId]/components/copilot-dialog/folder-choices'
import {
  buildPlanPreview,
  type PreviewRowType,
} from '@/app/workspace/[workspaceId]/components/copilot-dialog/plan-preview'
import { useFolderMap } from '@/hooks/queries/folders'
import { useCreateCopilotWorkflow, useGenerateCopilotPlan } from '@/hooks/queries/nexora-copilot'

/** The five descriptions of §8octies the Copilot must turn into working workflows. */
const EXAMPLES = ['invoices', 'emailTriage', 'knowledge', 'meeting', 'api'] as const

/** Longest description the plan route accepts. */
const DESCRIPTION_MAX_LENGTH = 4000

/** Dropdown value standing for the workspace root (folder ids are UUIDs). */
const ROOT_FOLDER_VALUE = 'root'

const ROW_ICONS: Record<PreviewRowType, ComponentType<{ className?: string }>> = {
  manuel: Play,
  planification: Calendar,
  webhook: Webhook,
  chat: MessageSquareText,
  agent: Sparkles,
  condition: Split,
  api: Globe,
  attente: Clock,
  validation_humaine: Hand,
  reponse: Send,
  unknown: Workflow,
}

export interface CopilotDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Folders to suggest first, such as the sidebar's current one; the workspace root otherwise. */
  suggestedFolderIds?: ReadonlyArray<string | null | undefined>
}

/**
 * « Décrire une automatisation »: the Nexora model turns a description into a plan shown as
 * readable steps, which the person can change in plain words before creating the workflow and
 * opening it in the editor. Nothing is created or run before « Créer le workflow ».
 */
export function CopilotDialog({
  workspaceId,
  open,
  onOpenChange,
  suggestedFolderIds,
}: CopilotDialogProps) {
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()
  const t = useTranslations('copilot.dialog')
  const generatePlan = useGenerateCopilotPlan()
  const createWorkflow = useCreateCopilotWorkflow()
  const { data: folderMap } = useFolderMap(workspaceId)

  const [description, setDescription] = useState('')
  const [change, setChange] = useState('')
  const [draft, setDraft] = useState<GeneratedCopilotPlan | null>(null)
  /** `undefined` until the person picks one: the suggested folder applies meanwhile. */
  const [pickedFolderId, setPickedFolderId] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<CopilotErrorMessage | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const generating = generatePlan.isPending
  const creating = createWorkflow.isPending

  const choices = useMemo(
    () => (folderMap ? folderChoices(folderMap, workspaceId) : []),
    [folderMap, workspaceId]
  )
  const folderId =
    pickedFolderId !== undefined
      ? pickedFolderId
      : defaultFolderId(choices, suggestedFolderIds ?? [])
  const folderOptions = useMemo(
    () => [
      { value: ROOT_FOLDER_VALUE, label: t('root') },
      ...choices.map((choice) => ({ value: choice.id, label: choice.label })),
    ],
    [choices, t]
  )
  const rows = useMemo(() => (draft ? buildPlanPreview(draft.plan, draft.summary) : []), [draft])

  useEffect(() => {
    if (!generating) return
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [generating])

  useEffect(() => () => abortRef.current?.abort(), [])

  const requestPlan = (text: string, currentPlan?: GeneratedCopilotPlan['plan']) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setElapsedSeconds(0)
    generatePlan.mutate(
      { workspaceId, description: text, currentPlan, signal: controller.signal },
      {
        onSuccess: (result) => {
          setDraft(result)
          setChange('')
        },
        onError: (cause) => setError(copilotErrorMessage(cause)),
      }
    )
  }

  const handleGenerate = () => {
    if (description.trim()) requestPlan(description.trim())
  }

  const handleApplyChange = () => {
    if (draft && change.trim()) requestPlan(change.trim(), draft.plan)
  }

  const handleStop = () => abortRef.current?.abort()

  const handleStartOver = () => {
    abortRef.current?.abort()
    setDraft(null)
    setChange('')
    setError(null)
  }

  const handleCreate = () => {
    if (!draft) return
    setError(null)
    createWorkflow.mutate(
      { workspaceId, plan: draft.plan, folderId: folderId ?? undefined },
      {
        onSuccess: ({ workflowId }) => {
          onOpenChange(false)
          router.push(`/workspace/${workspaceId}/w/${workflowId}`)
        },
        onError: (cause) => setError(copilotErrorMessage(cause)),
      }
    )
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) abortRef.current?.abort()
    onOpenChange(next)
  }

  const stopAction: ChipModalFooterAction = { label: t('stop'), onClick: handleStop }
  const busy = generating || creating

  return (
    <ChipModal
      open={open}
      onOpenChange={handleOpenChange}
      srTitle={t('title')}
      size='lg'
      dismissDisabled={creating}
    >
      <ChipModalHeader
        icon={Wand}
        onClose={() => handleOpenChange(false)}
        closeAriaLabel={t('close')}
      >
        {t('title')}
      </ChipModalHeader>

      <ChipModalBody>
        {draft ? (
          <>
            <ChipModalField type='custom' title={t('plan')}>
              <div className='flex flex-col gap-2'>
                <p className='text-[var(--text-body)] text-sm'>{draft.plan.title}</p>
                <ol className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
                  {rows.map((row) => {
                    const Icon = ROW_ICONS[row.type]
                    return (
                      <li key={row.key} className='flex items-start gap-2.5 px-3 py-2'>
                        <Icon className='mt-[3px] size-[14px] shrink-0 text-[var(--text-icon)]' />
                        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                          <p className='text-[var(--text-body)] text-small'>
                            {row.name === null ? t('trigger') : t(`stepTypes.${row.type}`)}
                            {row.name !== null && (
                              <span className='ml-1.5 break-all font-mono text-[var(--text-muted)] text-caption'>
                                {row.name}
                              </span>
                            )}
                          </p>
                          {(row.sentence || row.name === null) && (
                            <p className='text-[var(--text-muted)] text-caption'>
                              {row.sentence ?? t(`stepTypes.${row.type}`)}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </ChipModalField>

            {draft.warnings.length > 0 && (
              <ChipModalField type='custom' title={t('warnings')}>
                <ul className='flex flex-col gap-1'>
                  {draft.warnings.map((warning, index) => (
                    <li
                      key={`${index}:${warning}`}
                      className='flex items-start gap-2 text-[var(--text-body)] text-caption'
                    >
                      <TriangleAlert className='mt-px size-[14px] shrink-0 text-[var(--text-icon)]' />
                      <span className='min-w-0 flex-1'>{warning}</span>
                    </li>
                  ))}
                </ul>
              </ChipModalField>
            )}

            <ChipModalField
              type='textarea'
              title={t('change')}
              value={change}
              onChange={setChange}
              placeholder={t('changePlaceholder')}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={2}
              disabled={busy}
            />

            <ChipModalField
              type='dropdown'
              title={t('folder')}
              value={folderId ?? ROOT_FOLDER_VALUE}
              onChange={(value) => setPickedFolderId(value === ROOT_FOLDER_VALUE ? null : value)}
              options={folderOptions}
              disabled={busy}
            />
          </>
        ) : (
          <>
            <ChipModalField
              type='textarea'
              title={t('description')}
              value={description}
              onChange={setDescription}
              placeholder={t('descriptionPlaceholder')}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={5}
              required
              disabled={generating}
            />

            <ChipModalField type='custom' title={t('examples')}>
              <div className='flex flex-wrap gap-2'>
                {EXAMPLES.map((example) => (
                  <Chip
                    key={example}
                    variant='outline'
                    disabled={generating}
                    onClick={() => setDescription(t(`example.${example}`))}
                  >
                    {t(`example.${example}Label`)}
                  </Chip>
                ))}
              </div>
            </ChipModalField>
          </>
        )}

        {generating && (
          <div role='status' aria-live='polite' className='flex items-start gap-2.5 px-2'>
            <Loader className='mt-px size-[14px] shrink-0 text-[var(--text-icon)]' animate />
            <div className='flex flex-col gap-0.5'>
              <p className='text-[var(--text-body)] text-small'>
                {t('generating', { seconds: elapsedSeconds })}
              </p>
              <p className='text-[var(--text-muted)] text-caption'>{t('generatingHint')}</p>
            </div>
          </div>
        )}

        <ChipModalError>{error ? t(`errors.${error.key}`, error.values) : null}</ChipModalError>
      </ChipModalBody>

      {draft ? (
        <ChipModalFooter
          onCancel={() => handleOpenChange(false)}
          cancelLabel={t('cancel')}
          cancelDisabled={creating}
          defaultAction='none'
          secondaryActions={[
            generating
              ? stopAction
              : { label: t('startOver'), onClick: handleStartOver, disabled: creating },
          ]}
          primaryAdjacentAction={{
            label: t('applyChange'),
            onClick: handleApplyChange,
            disabled: busy || !change.trim(),
          }}
          primaryAction={{
            label: creating ? t('creating') : t('create'),
            onClick: handleCreate,
            disabled: busy,
          }}
        />
      ) : (
        <ChipModalFooter
          onCancel={() => handleOpenChange(false)}
          cancelLabel={t('cancel')}
          defaultAction='none'
          secondaryActions={generating ? [stopAction] : undefined}
          primaryAction={{
            label: t('generate'),
            onClick: handleGenerate,
            disabled: generating || !description.trim(),
          }}
        />
      )}
    </ChipModal>
  )
}
