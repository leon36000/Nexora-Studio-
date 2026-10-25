'use client'

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Chip, ChipCombobox, ChipLink, OverflowText } from '@sim/emcn'
import { ArrowUpRight, Loader, RefreshCw } from '@sim/emcn/icons'
import { generateId } from '@sim/utils/id'
import { useLocale, useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { isApiClientError } from '@/lib/api/client/errors'
import type {
  AssistantAgent,
  AssistantCard,
  AssistantMessage,
  AssistantMessageFile,
} from '@/lib/api/contracts/nexora-assistant'
import type { AssistantTask } from '@/lib/api/contracts/nexora-assistant-extras'
import { type AnswerExtras, splitExtras } from '@/lib/nexora/agent-extras'
import { canOpenInEditor, looksLikeScheduledTask } from '@/lib/nexora/assistant/schedule-phrase'
import type { ConfirmationItem } from '@/lib/nexora/tool-confirmation/client-state'
import {
  ASSISTANT_MAX_FILE_BYTES,
  ASSISTANT_MAX_FILES,
  type AttachmentRefusal,
  admitAttachments,
} from '@/app/workspace/[workspaceId]/assistant/attachments'
import {
  AssistantTools,
  Composer,
  ConversationList,
  type DraftFile,
  MessageItem,
} from '@/app/workspace/[workspaceId]/assistant/components'
import type { LaunchedWorkflow } from '@/app/workspace/[workspaceId]/assistant/components/workflow-launcher'
import { useAssistantTurn } from '@/app/workspace/[workspaceId]/assistant/hooks/use-assistant-turn'
import {
  useRecordCardTurn,
  useResolveWorkflowRun,
} from '@/app/workspace/[workspaceId]/assistant/hooks/use-cards'
import { useReadAloud } from '@/app/workspace/[workspaceId]/assistant/hooks/use-read-aloud'
import {
  assistantParsers,
  assistantUrlKeys,
} from '@/app/workspace/[workspaceId]/assistant/search-params'
import {
  useAssistantAgents,
  useAssistantConversation,
  useAssistantConversations,
} from '@/hooks/queries/nexora-assistant'
import {
  useAssistantCanEdit,
  useAssistantProjects,
  useAssistantSkills,
} from '@/hooks/queries/nexora-assistant-extended'
import { useNexoraModelUsages } from '@/hooks/queries/nexora-home'

/** The dictated words after what is already typed, on the same line unless it ended one. */
function appendDictation(draft: string, text: string): string {
  if (!draft.trim()) return text
  return `${draft.replace(/[ \t]+$/, '')}${draft.endsWith('\n') ? '' : ' '}${text}`
}

/** The Assistant's panels load when first opened: they keep their forms out of the page's first bundle. */
const ProjectsModal = lazy(() =>
  import('@/app/workspace/[workspaceId]/assistant/components/projects-modal').then((m) => ({
    default: m.ProjectsModal,
  }))
)
const TasksModal = lazy(() =>
  import('@/app/workspace/[workspaceId]/assistant/components/tasks-modal').then((m) => ({
    default: m.TasksModal,
  }))
)
const WorkflowLauncher = lazy(() =>
  import('@/app/workspace/[workspaceId]/assistant/components/workflow-launcher').then((m) => ({
    default: m.WorkflowLauncher,
  }))
)
const WorkflowsManageModal = lazy(() =>
  import('@/app/workspace/[workspaceId]/assistant/components/workflows-manage-modal').then((m) => ({
    default: m.WorkflowsManageModal,
  }))
)
const ScheduleProposal = lazy(() =>
  import('@/app/workspace/[workspaceId]/assistant/components/schedule-proposal').then((m) => ({
    default: m.ScheduleProposal,
  }))
)

const NO_AGENTS: AssistantAgent[] = []
const NO_PROJECTS: { id: string; name: string }[] = []
const NO_MESSAGES: AssistantMessage[] = []
const NO_FILES: AssistantMessageFile[] = []
const NO_EXTRAS: AnswerExtras = { files: [], sources: [] }
const MAX_FILE_MEGABYTES = ASSISTANT_MAX_FILE_BYTES / (1024 * 1024)
/** Distance from the bottom under which the thread keeps following a growing answer. */
const STICK_TO_BOTTOM_PX = 80

interface ThreadItem {
  key: string
  role: 'user' | 'assistant'
  content: string
  files: AssistantMessageFile[]
  isStreaming: boolean
  thinking?: string
  note?: string
  error?: string
  extras: AnswerExtras
  /** The « Autoriser / Refuser » cards of the answer being streamed. */
  confirmations?: ConfirmationItem[]
  /** A workflow run or a created task, shown in place of text. */
  card?: AssistantCard | null
}

/** « Sans projet » in the project picker of a new conversation. */
const NO_PROJECT = 'none'

interface AssistantProps {
  workspaceId: string
}

/**
 * Nexora edition: the employees' Assistant — the member's own conversations with the workspace's
 * published agents (the general Assistant first), answers streamed from each agent's deployed chat.
 */
export function Assistant({ workspaceId }: AssistantProps) {
  const threadRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const t = useTranslations('assistant')
  const tVoice = useTranslations('assistant.voice.readAloudErrors')
  const locale = useLocale()
  const [{ conversation: conversationId }, setParams] = useQueryStates(
    assistantParsers,
    assistantUrlKeys
  )
  const agentsQuery = useAssistantAgents(workspaceId)
  const conversationsQuery = useAssistantConversations(workspaceId)
  const detailQuery = useAssistantConversation(conversationId || undefined)
  const turn = useAssistantTurn(
    workspaceId,
    (id) => void setParams({ conversation: id }, { history: 'replace' }),
    () => void setParams({ conversation: null }, { history: 'replace' })
  )
  const modelUsages = useNexoraModelUsages()
  const readAloud = useReadAloud(workspaceId)
  // Writers also schedule tasks, answer validations and manage published workflows.
  const canEdit = useAssistantCanEdit(workspaceId)
  const tTasks = useTranslations('assistant.tasks')
  const tWorkflows = useTranslations('assistant.workflows')
  const projectsQuery = useAssistantProjects(workspaceId)
  const skillsQuery = useAssistantSkills(workspaceId)
  const recordCardTurn = useRecordCardTurn(workspaceId)
  const runResolution = useResolveWorkflowRun()
  const [draftAgentId, setDraftAgentId] = useState<string | null>(null)
  const [draftProjectId, setDraftProjectId] = useState<string>(NO_PROJECT)
  const [proposalFor, setProposalFor] = useState<string | null>(null)
  const [openPanel, setOpenPanel] = useState<
    'projects' | 'tasks' | 'launcher' | 'published' | null
  >(null)
  const [draft, setDraft] = useState('')
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([])
  const [refusals, setRefusals] = useState<AttachmentRefusal[]>([])

  const agents = agentsQuery.data ?? NO_AGENTS
  const detail =
    conversationId && detailQuery.data?.conversation.id === conversationId
      ? detailQuery.data
      : undefined
  const messages = detail?.messages ?? NO_MESSAGES
  const newAgent = agents.find((agent) => agent.workflowId === draftAgentId) ?? agents[0]
  const activeAgent = conversationId ? (detail?.agent ?? null) : (newAgent ?? null)
  const projects = projectsQuery.data ?? NO_PROJECTS
  const draftProject = projects.find((project) => project.id === draftProjectId)
  const conversationProject = detail?.conversation.projectId
    ? projects.find((project) => project.id === detail.conversation.projectId)
    : undefined
  const pending = turn.pending?.conversationId === conversationId ? turn.pending : null

  const storedIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages])

  const lastQuestion = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].role === 'user') return messages[index]
    }
    return null
  }, [messages])

  const items: ThreadItem[] = messages.map((message) => {
    const { text, extras } = splitExtras(message.content)
    return {
      key: message.id,
      role: message.role,
      content: text,
      files: message.files,
      isStreaming: false,
      note: message.interrupted ? t('thread.interrupted') : undefined,
      extras,
      card: message.card,
    }
  })
  if (pending?.question && !(pending.question.id && storedIds.has(pending.question.id))) {
    items.push({
      key: 'pending-question',
      role: 'user',
      content: pending.question.content,
      files: pending.question.files,
      isStreaming: false,
      extras: NO_EXTRAS,
    })
  }
  if (pending && !(pending.answer.id && storedIds.has(pending.answer.id))) {
    const { answer } = pending
    const isStreaming = answer.status === 'waiting' || answer.status === 'streaming'
    if (isStreaming || answer.text || answer.error) {
      items.push({
        key: 'pending-answer',
        role: 'assistant',
        content: answer.text,
        thinking: answer.thinking,
        files: NO_FILES,
        isStreaming,
        note: answer.status === 'stopped' ? t('thread.stopped') : undefined,
        error: answer.error ? t(`errors.${answer.error}`) : undefined,
        extras: answer.extras,
        confirmations: turn.confirmations,
      })
    }
  }
  const lastItem = items[items.length - 1]
  const canAskAgain = Boolean(detail?.agent && lastQuestion && !turn.isBusy)
  const pendingText = pending?.answer.text

  useEffect(() => {
    const thread = threadRef.current
    if (thread && stickToBottomRef.current) thread.scrollTop = thread.scrollHeight
  }, [items.length, pendingText, conversationId])

  const selectConversation = (id: string | null) => {
    stickToBottomRef.current = true
    setRefusals([])
    turn.dismissNotice()
    void setParams({ conversation: id })
  }

  const regenerate = () => {
    if (!detail?.agent || !lastQuestion || turn.isBusy) return
    stickToBottomRef.current = true
    turn.regenerate(detail.conversation.id, detail.agent, lastQuestion)
  }

  const handleAddFiles = (incoming: File[]) => {
    const { admitted, refused } = admitAttachments(
      draftFiles.map((draftFile) => draftFile.file),
      incoming
    )
    setRefusals(refused)
    if (admitted.length > 0) {
      setDraftFiles((previous) => [
        ...previous,
        ...admitted.map((file) => ({ id: generateId(), file })),
      ])
    }
  }

  const handleSend = async (options: { skipProposal?: boolean } = {}) => {
    const text = draft.trim()
    if (!activeAgent || !text || turn.isBusy) return
    // A message that reads as « chaque lundi, … » is offered as a scheduled task first.
    if (!options.skipProposal && canEdit && looksLikeScheduledTask(text)) {
      setProposalFor(text)
      return
    }
    setProposalFor(null)
    const files = draftFiles
    setDraft('')
    setDraftFiles([])
    setRefusals([])
    stickToBottomRef.current = true
    const sent = await turn.send({
      conversationId: conversationId || null,
      agent: activeAgent,
      text,
      files: files.map((draftFile) => draftFile.file),
      ...(draftProject ? { projectId: draftProject.id } : {}),
    })
    if (!sent) {
      setDraft((current) => current || text)
      setDraftFiles((current) => (current.length > 0 ? current : files))
    }
  }

  /** The conversation a card goes to: the open one while its agent answers, else a new one. */
  const cardTarget = () => {
    const agent = (conversationId ? detail?.agent : null) ?? agents[0]
    if (!agent) return null
    return {
      agent,
      conversationId: conversationId && detail?.agent ? conversationId : null,
      projectId: draftProject?.id,
    }
  }

  const showCardTurn = async (input: { question: string; answer: string; card: AssistantCard }) => {
    const target = cardTarget()
    if (!target) throw new Error('No agent can hold this conversation')
    const recorded = await recordCardTurn({ ...target, ...input })
    stickToBottomRef.current = true
    void setParams({ conversation: recorded.conversationId }, { history: 'replace' })
  }

  const handleTaskCreated = async (task: AssistantTask, request: string) => {
    setProposalFor(null)
    await showCardTurn({
      question: request,
      answer: tTasks('createdMessage', { title: task.title }),
      card: {
        kind: 'task',
        payload: {
          taskId: task.id,
          title: task.title,
          schedule: task.schedule?.label ?? '',
          request,
        },
      },
    }).then(() => setDraft(''))
  }

  const handleWorkflowLaunched = async ({ workflow, inputs, result }: LaunchedWorkflow) => {
    await showCardTurn({
      question: tWorkflows('launchQuestion', { name: workflow.name }),
      answer: tWorkflows(`summary.${result.status}`, { name: workflow.name }),
      card: {
        kind: 'workflow_run',
        payload: {
          workflowId: workflow.workflowId,
          name: workflow.name,
          executionId: result.executionId,
          status: result.status,
          inputs,
          output: result.output,
          error: result.error,
          pause: result.pause,
        },
      },
    })
  }

  const detailError =
    conversationId && detailQuery.isError
      ? isApiClientError(detailQuery.error) && detailQuery.error.status === 404
        ? t('thread.notFound')
        : t('thread.loadFailed')
      : null
  const isThreadLoading = Boolean(conversationId) && !detail && detailQuery.isLoading
  const isReadOnly = Boolean(conversationId) && Boolean(detail) && !detail?.agent

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col md:flex-row'>
      <ConversationList
        conversations={conversationsQuery.data ?? []}
        isLoading={conversationsQuery.isLoading}
        isError={conversationsQuery.isError}
        selectedId={conversationId}
        onSelect={selectConversation}
        onNew={() => selectConversation(null)}
        onDeleted={(id) => {
          if (id === conversationId) void setParams({ conversation: null }, { history: 'replace' })
        }}
        tools={
          <AssistantTools
            workspaceId={workspaceId}
            canWrite={canEdit}
            onOpenProjects={() => setOpenPanel('projects')}
            onOpenTasks={() => setOpenPanel('tasks')}
            onOpenLauncher={() => setOpenPanel('launcher')}
            onOpenPublished={() => setOpenPanel('published')}
          />
        }
      />
      <section className='flex min-h-0 min-w-0 flex-1 flex-col'>
        <header className='flex min-h-[52px] items-center gap-3 border-[var(--border)] border-b px-6 py-2'>
          <h1 className='min-w-0 flex-1 text-[var(--text-body)] text-md'>
            <OverflowText
              label={detail?.conversation.title ?? t('conversations.new')}
              className='font-medium'
            />
          </h1>
          {conversationId ? (
            detail && (
              <div className='flex shrink-0 items-center gap-3'>
                {conversationProject && (
                  <span className='text-[var(--text-muted)] text-small'>
                    {t('projects.inProject', { name: conversationProject.name })}
                  </span>
                )}
                <span className='text-[var(--text-muted)] text-small'>
                  {detail.agent?.name ?? t('agents.unpublished')}
                </span>
                {detail.agent && canOpenInEditor(canEdit ? 'write' : 'read') && (
                  <ChipLink
                    href={`/workspace/${workspaceId}/agents/${detail.agent.workflowId}`}
                    rightIcon={ArrowUpRight}
                  >
                    {t('header.openEditor')}
                  </ChipLink>
                )}
              </div>
            )
          ) : agents.length > 0 ? (
            <div className='flex shrink-0 items-center gap-2'>
              {projects.length > 0 && (
                <ChipCombobox
                  options={[
                    { label: t('projects.none'), value: NO_PROJECT },
                    ...projects.map((project) => ({ label: project.name, value: project.id })),
                  ]}
                  value={draftProject?.id ?? NO_PROJECT}
                  onChange={setDraftProjectId}
                  disabled={turn.isBusy}
                  aria-label={t('projects.label')}
                  className='w-[200px]'
                />
              )}
              <span className='text-[var(--text-muted)] text-small'>{t('agents.label')}</span>
              <ChipCombobox
                options={agents.map((agent) => ({ label: agent.name, value: agent.workflowId }))}
                value={newAgent?.workflowId}
                onChange={setDraftAgentId}
                disabled={turn.isBusy}
                aria-label={t('agents.label')}
                className='w-[240px]'
              />
            </div>
          ) : null}
        </header>

        <div
          ref={threadRef}
          onScroll={(event) => {
            const thread = event.currentTarget
            stickToBottomRef.current =
              thread.scrollHeight - thread.scrollTop - thread.clientHeight < STICK_TO_BOTTOM_PX
          }}
          className='min-h-0 flex-1 overflow-y-auto px-6'
        >
          <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-5 py-6'>
            {isThreadLoading ? (
              <Loader className='size-[16px] text-[var(--text-muted)]' animate />
            ) : detailError ? (
              <p className='text-[var(--text-error)] text-small'>{detailError}</p>
            ) : !conversationId && items.length === 0 ? (
              <NewConversationState
                agent={newAgent}
                isLoading={agentsQuery.isLoading}
                isError={agentsQuery.isError}
              />
            ) : (
              items.map((item) => (
                <MessageItem
                  key={item.key}
                  role={item.role}
                  content={item.content}
                  files={item.files}
                  isStreaming={item.isStreaming}
                  thinking={item.thinking}
                  note={item.note}
                  error={item.error}
                  extras={item.extras}
                  confirmations={item.confirmations}
                  onAnswerConfirmation={(id, decision) =>
                    void turn.answerConfirmation(id, decision)
                  }
                  card={item.card}
                  canAnswerRun={canEdit}
                  isAnsweringRun={runResolution.answeringId === item.key}
                  runAnswerFailed={runResolution.failedId === item.key}
                  onAnswerRun={(answer) => {
                    if (item.card?.kind !== 'workflow_run' || !conversationId) return
                    void runResolution.resolve({
                      conversationId,
                      messageId: item.key,
                      card: item.card,
                      approved: answer.approved,
                      comment: answer.comment,
                    })
                  }}
                  onOpenTasks={() => setOpenPanel('tasks')}
                  onRegenerate={
                    item === lastItem && item.role === 'assistant' && canAskAgain
                      ? regenerate
                      : undefined
                  }
                  readAloud={
                    modelUsages.data?.speech && item.role === 'assistant'
                      ? {
                          phase:
                            readAloud.reading?.key === item.key ? readAloud.reading.phase : 'idle',
                          onToggle: () => void readAloud.toggle(item.key, item.content),
                        }
                      : undefined
                  }
                />
              ))
            )}
            {lastItem?.role === 'user' && canAskAgain && (
              <Chip leftIcon={RefreshCw} onClick={regenerate} className='self-start'>
                {t('thread.retry')}
              </Chip>
            )}
          </div>
        </div>

        {!detailError && (
          <div className='border-[var(--border)] border-t px-6 py-3'>
            <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-2'>
              {isReadOnly ? (
                <p className='text-[var(--text-muted)] text-small'>{t('thread.unpublished')}</p>
              ) : (
                <>
                  {readAloud.error && (
                    <p role='alert' className='text-[var(--text-error)] text-caption'>
                      {tVoice(readAloud.error)}
                    </p>
                  )}
                  {(turn.notice || refusals.length > 0) && (
                    <ul className='flex flex-col gap-0.5 text-[var(--text-error)] text-caption'>
                      {turn.notice && (
                        <li>
                          {t(`notices.${turn.notice.kind}`, {
                            name: turn.notice.kind === 'upload-failed' ? turn.notice.name : '',
                          })}
                        </li>
                      )}
                      {refusals.map((refusal) => (
                        <li key={`${refusal.reason}:${refusal.name}`}>
                          {t(`attachments.${refusal.reason}`, {
                            name: refusal.name,
                            max:
                              refusal.reason === 'too-large'
                                ? MAX_FILE_MEGABYTES
                                : ASSISTANT_MAX_FILES,
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                  {proposalFor !== null && proposalFor === draft.trim() && (
                    <Suspense fallback={null}>
                      <ScheduleProposal
                        workspaceId={workspaceId}
                        request={proposalFor}
                        onSendToAgent={() => void handleSend({ skipProposal: true })}
                        onCreated={(task, request) => void handleTaskCreated(task, request)}
                      />
                    </Suspense>
                  )}
                  <Composer
                    value={draft}
                    onChange={setDraft}
                    skills={skillsQuery.data}
                    files={draftFiles}
                    onAddFiles={handleAddFiles}
                    onRemoveFile={(id) =>
                      setDraftFiles((previous) =>
                        previous.filter((draftFile) => draftFile.id !== id)
                      )
                    }
                    onSend={() => void handleSend()}
                    onStop={turn.stop}
                    isBusy={turn.isBusy}
                    canAttach={Boolean(activeAgent)}
                    dictation={
                      modelUsages.data?.transcription
                        ? {
                            workspaceId,
                            language: locale === 'en' ? 'en' : 'fr',
                            onText: (text) =>
                              setDraft((previous) => appendDictation(previous, text)),
                          }
                        : undefined
                    }
                  />
                </>
              )}
            </div>
          </div>
        )}
      </section>
      <Suspense fallback={null}>
        {openPanel === 'projects' && (
          <ProjectsModal
            workspaceId={workspaceId}
            open
            onOpenChange={(open) => setOpenPanel(open ? 'projects' : null)}
            onProjectDeleted={(projectId) => {
              if (draftProjectId === projectId) setDraftProjectId(NO_PROJECT)
            }}
          />
        )}
        {openPanel === 'tasks' && (
          <TasksModal
            workspaceId={workspaceId}
            open
            onOpenChange={(open) => setOpenPanel(open ? 'tasks' : null)}
            canOpenEditor={canOpenInEditor(canEdit ? 'write' : 'read')}
          />
        )}
        {openPanel === 'launcher' && (
          <WorkflowLauncher
            workspaceId={workspaceId}
            open
            onOpenChange={(open) => setOpenPanel(open ? 'launcher' : null)}
            onLaunched={handleWorkflowLaunched}
          />
        )}
        {canEdit && openPanel === 'published' && (
          <WorkflowsManageModal
            workspaceId={workspaceId}
            open
            onOpenChange={(open) => setOpenPanel(open ? 'published' : null)}
          />
        )}
      </Suspense>
    </div>
  )
}

interface NewConversationStateProps {
  agent: AssistantAgent | undefined
  isLoading: boolean
  isError: boolean
}

/** Before the first message: the chosen agent's welcome message, or why no agent can answer. */
function NewConversationState({ agent, isLoading, isError }: NewConversationStateProps) {
  const t = useTranslations('assistant')
  if (isLoading) return <Loader className='size-[16px] text-[var(--text-muted)]' animate />
  if (isError)
    return <p className='text-[var(--text-error)] text-small'>{t('agents.loadFailed')}</p>
  if (!agent) return <p className='text-[var(--text-muted)] text-small'>{t('agents.empty')}</p>
  return (
    <div className='flex flex-col items-center gap-2 py-16 text-center'>
      <h2 className='text-[var(--text-body)] text-lg'>{t('thread.emptyTitle')}</h2>
      {agent.welcomeMessage && (
        <p className='max-w-[36rem] whitespace-pre-wrap text-[var(--text-muted)] text-sm'>
          {agent.welcomeMessage}
        </p>
      )}
    </div>
  )
}
