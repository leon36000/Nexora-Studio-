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
import { toRecordOrNull } from '@sim/utils/object'
import { truncate } from '@sim/utils/string'
import dynamic from 'next/dynamic'
import { useFormatter, useTranslations } from 'next-intl'
import { NEXORA_TEMPLATES, NEXORA_TEMPLATES_FOLDER } from '@/lib/nexora/templates'
import { InviteModal } from '@/app/workspace/[workspaceId]/components/invite-modal'
import { quoteFailureKind } from '@/app/workspace/[workspaceId]/home/nexora-home/onboarding-state'
import { useTemplateWorkflows } from '@/app/workspace/[workspaceId]/home/nexora-home/use-template-workflows'
import { useWorkspaceHostContext } from '@/app/workspace/[workspaceId]/providers/workspace-host-provider'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import {
  DefaultModelTestError,
  useRunWorkflowOnce,
  useTestDefaultModel,
} from '@/hooks/queries/nexora-home'
import { useOrganization, useUpdateOrganization } from '@/hooks/queries/organization'
import { useWorkspaceInvitePolicy } from '@/hooks/use-workspace-invite-policy'

/** Loaded on demand: the quote is shown only after the sample run. */
const MarkdownRenderer = dynamic(
  () => import('@/app/(interfaces)/chat/components/message/components/markdown-renderer')
)

const QUOTE_TEMPLATE = NEXORA_TEMPLATES.find((template) => template.slug === 'devis')

const TEST_REPLY_MAX_LENGTH = 160

/** The text a run produced: the final Agent's `content`, or a plain string output. */
function outputText(output: unknown): string {
  if (typeof output === 'string') return output.trim()
  const content = toRecordOrNull(output)?.content
  return typeof content === 'string' ? content.trim() : ''
}

interface StepActionProps {
  onDone: () => void
}

interface OrganizationStepActionProps extends StepActionProps {
  /** The organization whose first launch this is, from the home status. */
  organizationId: string | null
}

/** Step 1: rename the first launch's organization in place, then mark the step done. */
export function OrganizationStepAction({ organizationId, onDone }: OrganizationStepActionProps) {
  const t = useTranslations('home.nexoraHome.onboarding.steps.organization')
  const { data: organization } = useOrganization(organizationId ?? '')
  const updateOrganization = useUpdateOrganization()
  const [draft, setDraft] = useState<string | null>(null)

  if (!organizationId) return null

  const currentName = organization?.name ?? ''
  const name = draft ?? currentName
  const canSave =
    name.trim().length > 0 && name.trim() !== currentName && !updateOrganization.isPending

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    updateOrganization.mutate(
      { organizationId, name: name.trim() },
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

interface ModelStepActionProps {
  workspaceId: string
  defaultModel: string | null
}

/** Step 2: the default model, a one-question test, and the way to the models settings. */
export function ModelStepAction({ workspaceId, defaultModel }: ModelStepActionProps) {
  const t = useTranslations('home.nexoraHome.onboarding.steps.model')
  const tErrors = useTranslations('agents.playground.errors')
  const format = useFormatter()
  const testModel = useTestDefaultModel()

  const handleTest = () => {
    testModel.mutate({ workspaceId, question: t('testQuestion') })
  }

  const testError = testModel.error
    ? tErrors(testModel.error instanceof DefaultModelTestError ? testModel.error.code : 'unknown')
    : null

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-[var(--text-muted)] text-small'>
          {t('current', { name: defaultModel ?? t('unavailable') })}
        </span>
        <Chip
          variant='border'
          disabled={testModel.isPending}
          rightAdornment={
            testModel.isPending ? (
              <Loader animate className='size-[14px] text-[var(--text-icon)]' />
            ) : undefined
          }
          onClick={handleTest}
        >
          {testModel.isPending ? t('testing') : t('test')}
        </Chip>
        <ChipLink variant='border' href={`/workspace/${workspaceId}/settings/models`}>
          {t('manage')}
        </ChipLink>
      </div>
      <div aria-live='polite'>
        {testModel.data && (
          <p className='text-[var(--text-body)] text-caption'>
            {t('testReply', {
              seconds: format.number(testModel.data.latencyMs / 1000, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              reply: truncate(testModel.data.reply, TEST_REPLY_MAX_LENGTH, '…'),
            })}
          </p>
        )}
      </div>
      {testError && (
        <p role='alert' className='text-[var(--text-error)] text-caption'>
          {testError}
        </p>
      )}
    </div>
  )
}

interface TeamStepActionProps extends StepActionProps {
  workspaceId: string
  emailConfigured: boolean
}

/**
 * Step 3: with an e-mail service, the workspace's invite flow (the step is done once someone is
 * invited); without one, the invitation e-mail would never leave, so the invitation link is
 * copied from Teammates instead.
 */
export function TeamStepAction({ workspaceId, emailConfigured, onDone }: TeamStepActionProps) {
  const t = useTranslations('home.nexoraHome.onboarding.steps.team')
  const host = useWorkspaceHostContext()
  const { canAdmin } = useUserPermissionsContext()
  const { inviteDisabledReason, isInvitationsDisabled } = useWorkspaceInvitePolicy(workspaceId)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const teammatesHref = `/workspace/${workspaceId}/settings/teammates`

  if (!emailConfigured) {
    return (
      <div className='flex flex-col gap-2'>
        <div>
          <ChipLink variant='border' href={teammatesHref}>
            {t('teammates')}
          </ChipLink>
        </div>
        <p className='text-[var(--text-muted)] text-caption'>{t('noEmailHint')}</p>
      </div>
    )
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Chip
        variant='border'
        disabled={!canAdmin || isInvitationsDisabled}
        onClick={() => setIsInviteOpen(true)}
      >
        {t('invite')}
      </Chip>
      <ChipLink href={teammatesHref}>{t('teammates')}</ChipLink>
      {isInviteOpen && (
        <InviteModal
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          workspaceId={workspaceId}
          workspaceName={host.workspace.name}
          organizationId={host.hostOrganizationId}
          inviteDisabledReason={inviteDisabledReason}
          canInvite={canAdmin}
          onInvited={onDone}
        />
      )}
    </div>
  )
}

interface FirstRunStepActionProps extends StepActionProps {
  workspaceId: string
  /** Nexora API names a default model; without one the sample run cannot answer. */
  hasDefaultModel: boolean
}

/**
 * Step 5: runs the « Devis client » template once with its example values and shows the quote.
 * A successful run ends the first launch.
 */
export function FirstRunStepAction({
  workspaceId,
  hasDefaultModel,
  onDone,
}: FirstRunStepActionProps) {
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
  if (runWorkflow.error) error = t(`errors.${quoteFailureKind(runWorkflow.error)}`)
  else if (result && !result.success) error = t(`errors.${quoteFailureKind(null)}`)
  else if (result && !text) error = t('empty')

  return (
    <div className='flex flex-col gap-2'>
      <div>
        <Chip
          variant='border'
          disabled={!workflow || !hasDefaultModel || runWorkflow.isPending}
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
      {!hasDefaultModel && (
        <p className='text-[var(--text-muted)] text-caption'>{t('noDefaultModel')}</p>
      )}
      {error && (
        <p role='alert' className='text-[var(--text-error)] text-caption'>
          {error}
        </p>
      )}
      {text && (
        <div
          ref={setResultElement}
          className={cn(
            'max-h-[320px] overflow-y-auto rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-body)] text-small',
            scrollFadeClass
          )}
          {...scrollFadeAttributes(resultEdges)}
        >
          <MarkdownRenderer content={text} />
        </div>
      )}
    </div>
  )
}
