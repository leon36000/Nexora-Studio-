'use client'

import { useState } from 'react'
import {
  Badge,
  Chip,
  ChipCombobox,
  ChipConfirmModal,
  ChipLink,
  OverflowText,
  toast,
} from '@sim/emcn'
import { ArrowLeft, Loader } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { PROMPT_LABELS, type PromptLabel } from '@/lib/nexora/prompts/template'
import { FormField } from '@/app/workspace/[workspaceId]/agents/components/form-field'
import { VersionDiff } from '@/app/workspace/[workspaceId]/prompts/[promptId]/components/version-diff'
import { VersionEditor } from '@/app/workspace/[workspaceId]/prompts/[promptId]/components/version-editor'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  useDeleteNexoraPrompt,
  useMoveNexoraPromptLabel,
  useNexoraPrompt,
} from '@/hooks/queries/nexora-prompts'

interface PromptDetailProps {
  workspaceId: string
  promptId: string
}

interface PendingMove {
  label: PromptLabel
  version: number
}

/**
 * Nexora edition: one prompt — its versions and their notes, where `production` and `test`
 * point, the text of a version, the next version, and the difference between two versions.
 */
export function PromptDetail({ workspaceId, promptId }: PromptDetailProps) {
  const t = useTranslations('agents.prompts')
  const tTypes = useTranslations('agents.editor.instructionsPrompt.types')
  const format = useFormatter()
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const { data: prompt, isLoading, isError } = useNexoraPrompt(workspaceId, promptId)
  const { mutateAsync: moveLabel, isPending: isMoving } = useMoveNexoraPromptLabel()
  const { mutateAsync: deletePrompt, isPending: isDeleting } = useDeleteNexoraPrompt()
  const [selected, setSelected] = useState<number | null>(null)
  const [compareFrom, setCompareFrom] = useState<number | null>(null)
  const [compareTo, setCompareTo] = useState<number | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const back = (
    <ChipLink
      href={`/workspace/${workspaceId}/prompts`}
      leftIcon={ArrowLeft}
      className='self-start'
    >
      {t('back')}
    </ChipLink>
  )

  if (isLoading || isError || !prompt) {
    return (
      <div className='min-h-0 flex-1 overflow-y-auto px-6'>
        <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-6 py-10'>
          {back}
          {isLoading ? (
            <Loader className='size-[16px] text-[var(--text-muted)]' animate />
          ) : (
            <p className='text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
          )}
        </div>
      </div>
    )
  }

  const versions = prompt.versions
  const defaultVersion = prompt.labels.production ?? prompt.latestVersion
  const shown = versions.find((version) => version.version === (selected ?? defaultVersion))
  const labelsOf = (version: number) =>
    PROMPT_LABELS.filter((label) => prompt.labels[label] === version)
  const from = compareFrom ?? versions[1]?.version ?? null
  const to = compareTo ?? versions[0]?.version ?? null
  const fromVersion = versions.find((version) => version.version === from)
  const toVersion = versions.find((version) => version.version === to)
  const versionOptions = versions.map((version) => ({
    value: String(version.version),
    label: t('versionLabel', { version: version.version }),
  }))

  const handleMove = async () => {
    if (!pendingMove) return
    try {
      await moveLabel({ workspaceId, promptId, ...pendingMove })
      toast.success(t('labelMoved', { label: pendingMove.label, version: pendingMove.version }))
      setPendingMove(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('labelFailed')))
    }
  }

  const handleDelete = async () => {
    try {
      await deletePrompt({ workspaceId, promptId })
      router.push(`/workspace/${workspaceId}/prompts`)
    } catch (error) {
      toast.error(getErrorMessage(error, t('deleteFailed')))
    }
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-7 py-10'>
        <header className='flex flex-col gap-3'>
          {back}
          <div className='flex items-center justify-between gap-4'>
            <OverflowText
              label={prompt.name}
              className='font-medium text-[var(--text-body)] text-lg'
            />
            {canEdit && (
              <Chip disabled={isDeleting} onClick={() => setIsConfirmingDelete(true)}>
                {t('delete')}
              </Chip>
            )}
          </div>
          {prompt.description && (
            <p className='text-[var(--text-muted)] text-small'>{prompt.description}</p>
          )}
        </header>

        <SettingsSection label={t('versions')}>
          <ul className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
            {versions.map((version) => (
              <li
                key={version.id}
                className='flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5'
              >
                <button
                  type='button'
                  onClick={() => setSelected(version.version)}
                  className='text-left text-[var(--text-body)] text-small underline-offset-2 hover:underline'
                  aria-pressed={shown?.version === version.version}
                >
                  {t('versionLabel', { version: version.version })}
                </button>
                {version.note && (
                  <span className='text-[var(--text-body)] text-caption'>{version.note}</span>
                )}
                <span className='text-[var(--text-muted)] text-caption'>
                  {[
                    version.createdByName,
                    format.dateTime(new Date(version.createdAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {labelsOf(version.version).map((label) => (
                  <Badge key={label} variant={label === 'production' ? 'green' : 'blue'} size='sm'>
                    {label}
                  </Badge>
                ))}
                {canEdit && (
                  <div className='ml-auto flex gap-1'>
                    {PROMPT_LABELS.filter((label) => prompt.labels[label] !== version.version).map(
                      (label) => (
                        <Chip
                          key={label}
                          onClick={() => setPendingMove({ label, version: version.version })}
                        >
                          {t(label === 'production' ? 'toProduction' : 'toTest')}
                        </Chip>
                      )
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </SettingsSection>

        {shown && (
          <SettingsSection label={t('versionText', { version: shown.version })}>
            <div className='flex flex-col gap-3'>
              <pre className='whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-body)] text-small'>
                {shown.content}
              </pre>
              {shown.variables.length > 0 && (
                <ul className='flex flex-col gap-1 pl-0.5'>
                  {shown.variables.map((variable) => (
                    <li key={variable.name} className='text-[var(--text-muted)] text-caption'>
                      <span className='font-mono text-[var(--text-body)]'>{`{{${variable.name}}}`}</span>{' '}
                      {tTypes(variable.type)}
                      {variable.defaultValue &&
                        ` · ${t('defaultSummary', { value: variable.defaultValue })}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SettingsSection>
        )}

        {canEdit && shown && (
          <SettingsSection label={t('newVersion')}>
            <VersionEditor
              key={shown.id}
              workspaceId={workspaceId}
              promptId={promptId}
              base={shown}
              onSaved={(version) => {
                setSelected(version)
                setCompareFrom(null)
                setCompareTo(null)
              }}
            />
          </SettingsSection>
        )}

        {versions.length > 1 && (
          <SettingsSection label={t('compare')}>
            <div className='flex flex-col gap-3'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField label={t('compareFrom')}>
                  <ChipCombobox
                    options={versionOptions}
                    value={from === null ? undefined : String(from)}
                    onChange={(value) => setCompareFrom(Number(value))}
                  />
                </FormField>
                <FormField label={t('compareTo')}>
                  <ChipCombobox
                    options={versionOptions}
                    value={to === null ? undefined : String(to)}
                    onChange={(value) => setCompareTo(Number(value))}
                  />
                </FormField>
              </div>
              {fromVersion && toVersion && (
                <VersionDiff before={fromVersion.content} after={toVersion.content} />
              )}
            </div>
          </SettingsSection>
        )}
      </div>

      <ChipConfirmModal
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open && !isMoving) setPendingMove(null)
        }}
        title={t('moveTitle', pendingMove ?? { label: 'production', version: 0 })}
        text={t('moveText', pendingMove ?? { label: 'production', version: 0 })}
        dismissLabel={t('cancel')}
        confirm={{
          label: t('move'),
          variant: 'primary',
          pending: isMoving,
          disabled: isMoving,
          onClick: () => void handleMove(),
        }}
      />
      <ChipConfirmModal
        open={isConfirmingDelete}
        onOpenChange={(open) => {
          if (!isDeleting) setIsConfirmingDelete(open)
        }}
        title={t('deleteTitle', { name: prompt.name })}
        text={t('deleteText')}
        dismissLabel={t('cancel')}
        confirm={{
          label: t('delete'),
          variant: 'destructive',
          pending: isDeleting,
          disabled: isDeleting,
          onClick: () => void handleDelete(),
        }}
      />
    </div>
  )
}
