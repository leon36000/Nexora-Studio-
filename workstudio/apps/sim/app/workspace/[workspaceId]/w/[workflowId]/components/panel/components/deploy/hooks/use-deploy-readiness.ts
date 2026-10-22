import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'
import { useOperationQueueStore } from '@/stores/operation-queue/store'
import { useWorkflowDiffStore } from '@/stores/workflow-diff/store'

export type DeployReadinessStatus =
  | 'ready'
  | 'missing-workflow'
  | 'saving'
  | 'reviewing-diff'
  | 'syncing'
  | 'error'

interface DeployReadinessInput {
  workflowId: string | null
  hasPendingOperations: boolean
  hasOperationError: boolean
  hasActiveDiff: boolean
  hasPendingExternalUpdate: boolean
  isReconciling: boolean
  reconciliationError?: string
}

export interface DeployReadiness {
  status: DeployReadinessStatus
  isReady: boolean
  isBlocked: boolean
  isSyncing: boolean
  label: string
  tooltip: string
  waitUntilReady: () => Promise<boolean> // i18n-ignore: type signature
}

type DeployReadinessMessageKey =
  | 'deploy'
  | 'noWorkflow'
  | 'syncFailed'
  | 'saveFailed'
  | 'saving'
  | 'savingTooltip'
  | 'reviewing'
  | 'reviewingTooltip'
  | 'syncing'
  | 'syncingTooltip'
  | 'ready'
  | 'readyTooltip'

type DeployReadinessTranslator = (key: DeployReadinessMessageKey) => string

export function getDeployReadinessState(input: DeployReadinessInput, t: DeployReadinessTranslator) {
  if (!input.workflowId) {
    return {
      status: 'missing-workflow' as const,
      label: t('deploy'),
      tooltip: t('noWorkflow'),
    }
  }

  if (input.hasOperationError || input.reconciliationError) {
    return {
      status: 'error' as const,
      label: t('syncFailed'),
      tooltip: input.reconciliationError || t('saveFailed'),
    }
  }

  if (input.hasPendingOperations) {
    return {
      status: 'saving' as const,
      label: t('saving'),
      tooltip: t('savingTooltip'),
    }
  }

  if (input.hasActiveDiff) {
    return {
      status: 'reviewing-diff' as const,
      label: t('reviewing'),
      tooltip: t('reviewingTooltip'),
    }
  }

  if (input.hasPendingExternalUpdate || input.isReconciling) {
    return {
      status: 'syncing' as const,
      label: t('syncing'),
      tooltip: t('syncingTooltip'),
    }
  }

  return {
    status: 'ready' as const,
    label: t('ready'),
    tooltip: t('readyTooltip'),
  }
}

export function useDeployReadiness(workflowId: string | null): DeployReadiness {
  const t = useTranslations('editor.deploy.readiness')
  const { hasPendingOperations, hasOperationError } = useOperationQueueStore(
    useShallow((state) => ({
      hasPendingOperations: workflowId
        ? state.operations.some((op) => op.workflowId === workflowId)
        : false,
      hasOperationError: state.hasOperationError,
    }))
  )

  const { hasActiveDiff, hasPendingExternalUpdate, isReconciling, reconciliationError } =
    useWorkflowDiffStore(
      useShallow((state) => ({
        hasActiveDiff: state.hasActiveDiff,
        hasPendingExternalUpdate: workflowId
          ? Boolean(state.pendingExternalUpdates[workflowId])
          : false,
        isReconciling: workflowId ? Boolean(state.reconcilingWorkflows[workflowId]) : false,
        reconciliationError: workflowId ? state.reconciliationErrors[workflowId] : undefined,
      }))
    )

  const readiness = useMemo(
    () =>
      getDeployReadinessState(
        {
          workflowId,
          hasPendingOperations,
          hasOperationError,
          hasActiveDiff,
          hasPendingExternalUpdate,
          isReconciling,
          reconciliationError,
        },
        t
      ),
    [
      workflowId,
      hasPendingOperations,
      hasOperationError,
      hasActiveDiff,
      hasPendingExternalUpdate,
      isReconciling,
      reconciliationError,
      t,
    ]
  )

  const waitUntilReady = useCallback(async () => {
    if (!workflowId) return false

    const queue = useOperationQueueStore.getState()
    if (queue.hasOperationError) return false

    const drainResult = await queue.waitForWorkflowOperations(workflowId)
    if (drainResult !== 'drained') return false

    const latestQueue = useOperationQueueStore.getState()
    const diff = useWorkflowDiffStore.getState()
    return (
      !latestQueue.hasOperationError &&
      !latestQueue.hasPendingOperations(workflowId) &&
      !diff.hasActiveDiff &&
      !diff.pendingExternalUpdates[workflowId] &&
      !diff.reconcilingWorkflows[workflowId] &&
      !diff.reconciliationErrors[workflowId]
    )
  }, [workflowId])

  const isReady = readiness.status === 'ready'
  const isSyncing = readiness.status === 'saving' || readiness.status === 'syncing'

  return {
    ...readiness,
    isReady,
    isBlocked: !isReady,
    isSyncing,
    waitUntilReady,
  }
}
