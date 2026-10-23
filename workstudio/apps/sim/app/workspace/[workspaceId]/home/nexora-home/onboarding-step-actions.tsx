'use client'

import { useState } from 'react'
import {
  Chip,
  ChipInput,
  ChipLink,
  cn,
  scrollFadeAttributes,
  scrollFadeClass,
  toast,
  useScrollEdges,
} from '@sim/emcn'
import { Loader } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { toRecordOrNull } from '@sim/utils/object'
import { useTranslations } from 'next-intl'
import { NEXORA_TEMPLATES, NEXORA_TEMPLATES_FOLDER } from '@/lib/nexora/templates'
import { InviteModal } from '@/app/workspace/[workspaceId]/components/invite-modal'
import { useTemplateWorkflows } from '@/app/workspace/[workspaceId]/home/nexora-home/use-template-workflows'
import { useWorkspaceHostContext } from '@/app/workspace/[workspaceId]/providers/workspace-host-provider'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useRunWorkflowOnce } from '@/hooks/queries/nexora-home'
import { useOrganization, useUpdateOrganization } from '@/hooks/queries/organization'
import { useWorkspaceInvitePolicy } from '@/hooks/use-workspace-invite-policy'

const QUOTE_TEMPLATE = NEXORA_TEMPLATES.find((template) => template.slug === 'devis')

/** The text a run produced: the final Agent's `content`, or a plain string output. */
function outputText(output: unknown): string {
  if (typeof output === 'string') return output.trim()
  const content = toRecordOrNull(output)?.content
  return typeof content === 'string' ? content.trim() : ''
}

interface StepActionProps {
  onDone: () => void
}

/** Step 1: rename the workspace's organization in place, then mark the step done. */
export function OrganizationStepAction({ onDone }: StepActionProps) {
  const t = useTranslations('home.nexoraHome.onboarding.steps.organization')
  const { hostOrganizationId } = useWorkspaceHostContext()
  const { data: organization } = useOrganization(hostOrganizationId ?? '')
  const updateOrganization = useUpdateOrganization()
  const [draft, setDraft] = useState<string | null>(null)

  if (!hostOrganizationId) return null

  const currentName = organization?.name ?? ''
  const name = draft ?? currentName
  const canSave =
    name.trim().length > 0 && name.trim() !== currentName && !updateOrganization.isPending

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    updateOrganization.mutate(
      { organizationId: hostOrganizationId, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(t('saved'))
          setDraft(null)
          onDone()
        },
        onError: () => toast.error(t('failed')),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex items-center gap-2'>
      <ChipInput
        aria-label={t('name')}
        placeholder={t('name')}
        value={name}
        onChange={(event) => setDraft(event.target.value)}
        className='min-w-0 max-w-[320px] flex-1'
      />
      <Chip type='submit' variant='border' disabled={!canSave}>
        {t('save')}
      </Chip>
    </form>
  )
}

interface TeamStepActionProps {
  workspaceId: string
}

/** Step 3: the workspace's invite flow; without e-mail, invitation links are copied from Teammates. */
export function TeamStepAction({ workspaceId }: TeamStepActionProps) {
  const t = useTranslations('home.nexoraHome.onboarding.steps.team')
  const host = useWorkspaceHostContext()
  const { canAdmin } = useUserPermissionsContext()
  const { inviteDisabledReason, isInvitationsDisabled } = useWorkspaceInvitePolicy(workspaceId)
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <Chip
          variant='border'
          disabled={!canAdmin || isInvitationsDisabled}
          onClick={() => setIsInviteOpen(true)}
        >
          {t('invite')}
        </Chip>
        <ChipLink href={`/workspace/${workspaceId}/settings/teammates`}>{t('teammates')}</ChipLink>
      </div>
      <p className='text-[var(--text-muted)] text-caption'>{t('linkHint')}</p>
      {isInviteOpen && (
        <InviteModal
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          workspaceId={workspaceId}
          workspaceName={host.workspace.name}
          organizationId={host.hostOrganizationId}
          inviteDisabledReason={inviteDisabledReason}
          canInvite={canAdmin}
        />
      )}
    </div>
  )
}

interface FirstRunStepActionProps extends StepActionProps {
  workspaceId: string
}

/**
 * Step 5: runs the « Devis client » template once with its example values and shows the quote.
 * A successful run ends the first launch.
 */
export function FirstRunStepAction({ workspaceId, onDone }: FirstRunStepActionProps) {
  const t = useTranslations('home.nexoraHome.onboarding.steps.first-run')
  const { templates, isLoading } = useTemplateWorkflows(workspaceId)
  const runWorkflow = useRunWorkflowOnce()
  const [resultElement, setResultElement] = useState<HTMLDivElement | null>(null)
  const resultEdges = useScrollEdges(resultElement)

  if (!QUOTE_TEMPLATE) return null
  const quoteTemplate = QUOTE_TEMPLATE
  const workflow = templates.find((candidate) => candidate.name === quoteTemplate.name)

  if (!isLoading && !workflow) {
    return (
      <p className='text-[var(--text-muted)] text-caption'>
        {t('missing', { template: quoteTemplate.name, folder: NEXORA_TEMPLATES_FOLDER })}
      </p>
    )
  }

  const handleRun = () => {
    if (!workflow) return
    const input = Object.fromEntries(
      quoteTemplate.inputs.map((field) => [field.name, field.example])
    )
    runWorkflow.mutate(
      { workflowId: workflow.id, input },
      {
        onSuccess: (result) => {
          if (result.success && outputText(result.output)) onDone()
        },
      }
    )
  }

  const result = runWorkflow.data
  const text = result?.success ? outputText(result.output) : ''
  let error: string | null = null
  if (runWorkflow.error) error = t('failed', { error: getErrorMessage(runWorkflow.error) })
  else if (result && !result.success) error = t('failed', { error: result.error ?? '' })
  else if (result && !text) error = t('empty')

  return (
    <div className='flex flex-col gap-2'>
      <div>
        <Chip
          variant='border'
          disabled={!workflow || runWorkflow.isPending}
          rightAdornment={
            runWorkflow.isPending ? (
              <Loader animate className='size-[14px] text-[var(--text-icon)]' />
            ) : undefined
          }
          onClick={handleRun}
        >
          {runWorkflow.isPending ? t('running') : t('run')}
        </Chip>
      </div>
      {error && <p className='text-[var(--text-error)] text-caption'>{error}</p>}
      {text && (
        <div
          ref={setResultElement}
          className={cn(
            'max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-body)] text-small',
            scrollFadeClass
          )}
          {...scrollFadeAttributes(resultEdges)}
        >
          {text}
        </div>
      )}
    </div>
  )
}
