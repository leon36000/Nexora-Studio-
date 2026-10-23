// i18n-defaults: common.workflowRenderer
'use client'

import { createContext, type ReactNode, useContext, useMemo } from 'react'

/**
 * The copy the workflow canvas renders on its own: handle captions, card states, note and edge
 * controls.
 *
 * The renderer cannot depend on an application's translations, so this English set is the one
 * place its copy lives; an application supplies its own language through
 * {@link WorkflowRendererLabelsProvider}.
 */
const WORKFLOW_RENDERER_DEFAULT_LABELS = {
  addNote: 'Add note…',
  adminRequiredToDeploy: 'Admin permission required to deploy',
  clickToDeploy: 'Click to deploy',
  clickToReactivate: 'Click to reactivate',
  clickToRedeploy: 'Click to redeploy',
  codePreview: 'Code preview',
  collapseNote: 'Collapse note',
  context: 'Context',
  deleteConnection: 'Delete connection',
  deploying: 'Deploying...',
  disabled: 'Disabled',
  disabledBadge: 'disabled',
  editAccessRequired: 'Edit access required to fix',
  editNoteContent: 'Edit note content',
  editNoteTitle: 'Edit note title',
  expandNote: 'Expand note',
  locked: 'Locked',
  loop: 'Loop',
  media: 'Media',
  nextStep: 'Next Step',
  note: 'Note',
  noteContent: '{name} content',
  noteTitle: 'Note title',
  onError: 'On error',
  onErrorBranch: 'On error branch',
  parallel: 'Parallel',
  providerWebhook: '{provider} Webhook',
  redeploy: 'redeploy',
  routeNumber: 'Route {number}',
  select: 'Select',
  start: 'Start',
  undeployed: 'undeployed',
  webhook: 'Webhook',
  webhookPath: 'Path: {path}',
  webhookTriggered: 'This workflow is triggered by a webhook.',
} as const

export type WorkflowRendererLabels = {
  readonly [K in keyof typeof WORKFLOW_RENDERER_DEFAULT_LABELS]: string
}

const WorkflowRendererLabelsContext = createContext<WorkflowRendererLabels>(
  WORKFLOW_RENDERER_DEFAULT_LABELS
)

interface WorkflowRendererLabelsProviderProps {
  /** Labels in the interface language; a missing key keeps its English default. */
  labels?: Partial<WorkflowRendererLabels>
  children: ReactNode
}

/**
 * Supplies the canvas's built-in copy in the application's language.
 *
 * @example
 * <WorkflowRendererLabelsProvider labels={translatedLabels}>{canvas}</WorkflowRendererLabelsProvider>
 */
export function WorkflowRendererLabelsProvider({
  labels,
  children,
}: WorkflowRendererLabelsProviderProps) {
  const value = useMemo(() => ({ ...WORKFLOW_RENDERER_DEFAULT_LABELS, ...labels }), [labels])
  return (
    <WorkflowRendererLabelsContext.Provider value={value}>
      {children}
    </WorkflowRendererLabelsContext.Provider>
  )
}

/** Fills the `{name}` placeholders of a label. */
export function formatRendererLabel(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  )
}

/** The canvas's built-in copy, from the nearest {@link WorkflowRendererLabelsProvider}. */
export function useWorkflowRendererLabels(): WorkflowRendererLabels {
  return useContext(WorkflowRendererLabelsContext)
}
