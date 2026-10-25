'use client'

import { useRef, useState } from 'react'
import {
  Button,
  Chip,
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  OverflowText,
  Skeleton,
} from '@sim/emcn'
import { Paperclip, Plus, X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  getProjectRefusalCode,
  useAddAssistantProjectFile,
  useAssistantProject,
  useAssistantProjects,
  useCreateAssistantProject,
  useDeleteAssistantProject,
  useDeleteAssistantProjectFile,
  useUpdateAssistantProject,
} from '@/hooks/queries/nexora-assistant-extended'

const NAME_MAX_LENGTH = 120
const INSTRUCTIONS_MAX_LENGTH = 8_000

type View = { kind: 'list' } | { kind: 'new' } | { kind: 'edit'; projectId: string }

interface ProjectsModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A project was deleted: the conversations it held are outside any project now. */
  onProjectDeleted: (projectId: string) => void
}

/**
 * The member's projects: instructions and files shared by the conversations opened in them. A
 * project is private to its author, like a conversation.
 */
export function ProjectsModal({
  workspaceId,
  open,
  onOpenChange,
  onProjectDeleted,
}: ProjectsModalProps) {
  const t = useTranslations('assistant.projects')
  const [view, setView] = useState<View>({ kind: 'list' })
  const projects = useAssistantProjects(workspaceId)

  const close = () => {
    onOpenChange(false)
    setView({ kind: 'list' })
  }

  return (
    <ChipModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      srTitle={t('title')}
      size='md'
    >
      <ChipModalHeader onClose={close}>{t('title')}</ChipModalHeader>
      {view.kind === 'list' ? (
        <>
          <ChipModalBody>
            {projects.isPending ? (
              <Skeleton className='h-[52px] w-full rounded-lg' />
            ) : projects.isError ? (
              <p className='px-2 text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
            ) : projects.data.length === 0 ? (
              <p className='px-2 text-[var(--text-muted)] text-small'>{t('empty')}</p>
            ) : (
              <ul className='flex flex-col gap-0.5 px-2'>
                {projects.data.map((project) => (
                  <li key={project.id}>
                    <button
                      type='button'
                      onClick={() => setView({ kind: 'edit', projectId: project.id })}
                      className='flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover-hover:bg-[var(--surface-hover)]'
                    >
                      <OverflowText
                        label={project.name}
                        className='text-[var(--text-body)] text-small'
                      />
                      <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                        {t('fileCount', { count: project.fileCount })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ChipModalBody>
          <ChipModalFooter
            cancelLabel={t('close')}
            onCancel={close}
            primaryAction={{
              label: t('create'),
              leftAdornment: <Plus className='size-[14px]' />,
              onClick: () => setView({ kind: 'new' }),
            }}
          />
        </>
      ) : view.kind === 'new' ? (
        <NewProject
          workspaceId={workspaceId}
          onBack={() => setView({ kind: 'list' })}
          onCreated={(projectId) => setView({ kind: 'edit', projectId })}
        />
      ) : (
        <ProjectEditor
          key={view.projectId}
          projectId={view.projectId}
          onBack={() => setView({ kind: 'list' })}
          onDeleted={(projectId) => {
            onProjectDeleted(projectId)
            setView({ kind: 'list' })
          }}
        />
      )}
    </ChipModal>
  )
}

interface NewProjectProps {
  workspaceId: string
  onBack: () => void
  onCreated: (projectId: string) => void
}

function NewProject({ workspaceId, onBack, onCreated }: NewProjectProps) {
  const t = useTranslations('assistant.projects')
  const { mutate: create, isPending, isError } = useCreateAssistantProject()
  const [name, setName] = useState('')

  const submit = () => {
    if (!name.trim() || isPending) return
    create({ workspaceId, name: name.trim() }, { onSuccess: (project) => onCreated(project.id) })
  }

  return (
    <>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={setName}
          maxLength={NAME_MAX_LENGTH}
          required
          disabled={isPending}
        />
        <ChipModalError>{isError ? t('saveFailed') : null}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        cancelLabel={t('back')}
        onCancel={onBack}
        primaryAction={{
          label: t('createConfirm'),
          onClick: submit,
          disabled: !name.trim() || isPending,
        }}
      />
    </>
  )
}

interface ProjectEditorProps {
  projectId: string
  onBack: () => void
  onDeleted: (projectId: string) => void
}

function ProjectEditor({ projectId, onBack, onDeleted }: ProjectEditorProps) {
  const t = useTranslations('assistant.projects')
  const detail = useAssistantProject(projectId)

  if (detail.isPending) {
    return (
      <>
        <ChipModalBody>
          <Skeleton className='h-[120px] w-full rounded-lg' />
        </ChipModalBody>
        <ChipModalFooter cancelLabel={t('back')} onCancel={onBack} defaultAction='none' />
      </>
    )
  }
  if (!detail.data) {
    return (
      <>
        <ChipModalBody>
          <p className='px-2 text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
        </ChipModalBody>
        <ChipModalFooter cancelLabel={t('back')} onCancel={onBack} defaultAction='none' />
      </>
    )
  }
  return (
    <ProjectForm
      key={detail.data.project.version}
      project={detail.data.project}
      files={detail.data.files}
      onBack={onBack}
      onDeleted={onDeleted}
    />
  )
}

interface ProjectFormProps {
  project: { id: string; name: string; instructions: string }
  files: { id: string; name: string; size: number }[]
  onBack: () => void
  onDeleted: (projectId: string) => void
}

function ProjectForm({ project, files, onBack, onDeleted }: ProjectFormProps) {
  const t = useTranslations('assistant.projects')
  const tRefusals = useTranslations('assistant.projects.refusals')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(project.name)
  const [instructions, setInstructions] = useState(project.instructions)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const update = useUpdateAssistantProject()
  const addFile = useAddAssistantProjectFile()
  const removeFile = useDeleteAssistantProjectFile()
  const remove = useDeleteAssistantProject()

  const changed = name.trim() !== project.name || instructions !== project.instructions
  const busy = update.isPending || addFile.isPending || removeFile.isPending
  const refusal = addFile.isError ? getProjectRefusalCode(addFile.error) : null

  const save = () => {
    if (!name.trim() || !changed || busy) return
    update.mutate({ projectId: project.id, name: name.trim(), instructions })
  }

  return (
    <>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={setName}
          maxLength={NAME_MAX_LENGTH}
          required
          disabled={busy}
        />
        <ChipModalField
          type='textarea'
          title={t('instructions')}
          value={instructions}
          onChange={setInstructions}
          maxLength={INSTRUCTIONS_MAX_LENGTH}
          placeholder={t('instructionsPlaceholder')}
          rows={5}
          resizable
          disabled={busy}
        />
        <ChipModalField type='custom' title={t('files')} hint={t('limits')}>
          <div className='flex flex-col gap-2'>
            {files.length > 0 && (
              <ul className='flex flex-col gap-1'>
                {files.map((file) => (
                  <li
                    key={file.id}
                    className='flex items-center gap-2 rounded-md border border-[var(--border)] py-0.5 pr-0.5 pl-2 text-[var(--text-body)] text-caption'
                  >
                    <Paperclip className='size-[12px] shrink-0 text-[var(--text-icon)]' />
                    <span className='min-w-0 flex-1 break-all'>{file.name}</span>
                    <Button
                      type='button'
                      variant='quiet'
                      size='icon'
                      aria-label={t('removeFile', { name: file.name })}
                      disabled={busy}
                      onClick={() => removeFile.mutate({ projectId: project.id, fileId: file.id })}
                    >
                      <X className='size-[12px]' />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Chip
              leftIcon={Plus}
              className='self-start'
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {addFile.isPending ? t('addingFile') : t('addFile')}
            </Chip>
            <input
              ref={fileInputRef}
              type='file'
              className='hidden'
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) addFile.mutate({ projectId: project.id, file })
              }}
            />
          </div>
        </ChipModalField>
        <ChipModalError>
          {addFile.isError
            ? refusal
              ? tRefusals(refusal)
              : t('fileFailed')
            : update.isError || removeFile.isError
              ? t('saveFailed')
              : null}
        </ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        cancelLabel={t('back')}
        onCancel={onBack}
        secondaryActions={[
          {
            label: t('delete'),
            variant: 'destructive',
            onClick: () => setConfirmingDelete(true),
            disabled: busy,
          },
        ]}
        primaryAction={{
          label: t('save'),
          onClick: save,
          disabled: !name.trim() || !changed || busy,
        }}
      />
      <ChipConfirmModal
        open={confirmingDelete}
        onOpenChange={(open) => !open && !remove.isPending && setConfirmingDelete(false)}
        title={t('deleteTitle')}
        text={
          remove.isError
            ? [{ text: t('deleteFailed'), error: true }]
            : t('deleteText', { name: project.name })
        }
        dismissLabel={t('cancel')}
        confirm={{
          label: t('delete'),
          pending: remove.isPending,
          disabled: remove.isPending,
          onClick: () =>
            remove.mutate(project.id, {
              onSuccess: () => {
                setConfirmingDelete(false)
                onDeleted(project.id)
              },
            }),
        }}
      />
    </>
  )
}
