'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { SettingsAction } from '@/components/settings/settings-header'
import type { ConnectorData } from '@/lib/api/contracts/knowledge/connectors'
import { getConnectorSyncState } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connectors-section/connector-sync-state'
import {
  useDeleteConnector,
  useTriggerSync,
  useUpdateConnector,
} from '@/hooks/queries/kb/connectors'

export interface ConnectorActionsOptions {
  connector: ConnectorData
  knowledgeBaseId: string
  canEdit: boolean
  disabled?: boolean
  primarySync?: boolean
  onEdit?: () => void
  onRemoved?: () => void
}

export function useConnectorActions({
  connector,
  knowledgeBaseId,
  canEdit,
  disabled = false,
  primarySync = false,
  onEdit,
  onRemoved,
}: ConnectorActionsOptions) {
  const t = useTranslations('knowledge.connectors.sync')
  const sync = useTriggerSync()
  const update = useUpdateConnector()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [deleteDocuments, setDeleteDocuments] = useState(false)
  const remove = useDeleteConnector({
    onSuccess: () => {
      setConfirmRemove(false)
      setDeleteDocuments(false)
      onRemoved?.()
    },
  })
  const requiresDocumentDeletion = connector.accessMode !== 'workspace'
  const state = getConnectorSyncState(connector)
  const actionsDisabled = disabled || sync.isPending || update.isPending || remove.isPending
  const syncRunning =
    connector.status === 'syncing' ||
    (state.syncsPerMember && connector.memberSyncStatus === 'running')
  const pauseDisabled = actionsDisabled || syncRunning

  function resetErrors() {
    sync.reset()
    update.reset()
    remove.reset()
  }

  function triggerSync() {
    if (!canEdit || actionsDisabled || state.syncDisabled) return
    resetErrors()
    sync.mutate({ knowledgeBaseId, connectorId: connector.id })
  }

  function setRemoveOpen(open: boolean) {
    if (remove.isPending) return
    setConfirmRemove(open)
    if (!open) setDeleteDocuments(false)
  }

  const actions: SettingsAction[] = canEdit
    ? [
        {
          id: 'sync',
          text: t(state.syncLabelKey),
          variant: primarySync ? 'primary' : undefined,
          disabled: state.syncDisabled || actionsDisabled,
          tooltip: state.syncTooltipKey ? t(state.syncTooltipKey) : undefined,
          onSelect: () => triggerSync(),
        },
        ...(onEdit
          ? [{ id: 'settings', text: t('settings'), disabled: actionsDisabled, onSelect: onEdit }]
          : []),
        {
          id: 'pause',
          text: state.canResume ? t('resume') : t('pause'),
          disabled: pauseDisabled,
          tooltip: syncRunning ? t('waitForSync') : undefined,
          onSelect: () => {
            if (!canEdit || pauseDisabled) return
            resetErrors()
            update.mutate({
              knowledgeBaseId,
              connectorId: connector.id,
              updates: { status: state.canResume ? 'active' : 'paused' },
            })
          },
        },
        {
          id: 'delete',
          text: t('removeConnection'),
          disabled: actionsDisabled,
          onSelect: () => {
            if (actionsDisabled) return
            resetErrors()
            setRemoveOpen(true)
          },
        },
      ]
    : []

  return {
    actions,
    actionsDisabled,
    canEdit,
    error: sync.error ?? update.error,
    removal: {
      open: confirmRemove,
      onOpenChange: setRemoveOpen,
      requiresDocumentDeletion,
      deleteDocuments,
      setDeleteDocuments,
      pending: remove.isPending,
      disabled: actionsDisabled,
      error: remove.error,
      onConfirm: () => {
        if (!canEdit || actionsDisabled) return
        remove.mutate({
          knowledgeBaseId,
          connectorId: connector.id,
          deleteDocuments: requiresDocumentDeletion || deleteDocuments,
        })
      },
    },
  }
}

export type ConnectorActionState = ReturnType<typeof useConnectorActions>
