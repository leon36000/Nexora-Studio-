'use client'

import { useMemo, useState } from 'react'
import {
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  SecretReveal,
} from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import type { SettingsAction } from '@/app/workspace/[workspaceId]/settings/components/settings-header/settings-header'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { useSettingsSearch } from '@/app/workspace/[workspaceId]/settings/components/use-settings-search'
import {
  type CopilotKey,
  useCopilotKeys,
  useDeleteCopilotKey,
  useGenerateCopilotKey,
} from '@/hooks/queries/copilot-keys'
import { useDateFormat } from '@/hooks/use-date-format'

const logger = createLogger('CopilotSettings')

/**
 * Copilot Keys management component for handling API keys used with the Copilot feature.
 * Provides functionality to create, view, and delete copilot API keys.
 */
export function Copilot() {
  const t = useTranslations('settings.copilot')
  const tSettings = useTranslations('settings')
  const { formatDate } = useDateFormat()
  const { data: keys = [], isLoading } = useCopilotKeys()
  const generateKey = useGenerateCopilotKey()
  const deleteKeyMutation = useDeleteCopilotKey()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [deleteKey, setDeleteKey] = useState<CopilotKey | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useSettingsSearch()
  const [createError, setCreateError] = useState<string | null>(null)

  const filteredKeys = useMemo(() => {
    if (!searchTerm.trim()) return keys
    const term = searchTerm.toLowerCase()
    return keys.filter(
      (key) =>
        key.name?.toLowerCase().includes(term) || key.displayKey?.toLowerCase().includes(term)
    )
  }, [keys, searchTerm])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    const trimmedName = newKeyName.trim()
    const isDuplicate = keys.some((k) => k.name === trimmedName)
    if (isDuplicate) {
      setCreateError(t('duplicateName', { name: trimmedName }))
      return
    }

    setCreateError(null)
    try {
      const data = await generateKey.mutateAsync({ name: trimmedName })
      if (data?.key?.apiKey) {
        setNewKey(data.key.apiKey)
        setShowNewKeyDialog(true)
        setNewKeyName('')
        setCreateError(null)
        setIsCreateDialogOpen(false)
      }
    } catch (error) {
      logger.error('Failed to generate copilot API key', { error })
      setCreateError(t('createFailed'))
    }
  }

  const handleDeleteKey = async () => {
    if (!deleteKey) return
    try {
      setShowDeleteDialog(false)
      const keyToDelete = deleteKey
      setDeleteKey(null)

      await deleteKeyMutation.mutateAsync({ keyId: keyToDelete.id })
    } catch (error) {
      logger.error('Failed to delete copilot API key', { error })
    }
  }

  const hasKeys = keys.length > 0
  const showEmptyState = !hasKeys
  const showNoResults = searchTerm.trim() && filteredKeys.length === 0 && keys.length > 0

  const actions: SettingsAction[] = [
    {
      text: t('createApiKey'),
      icon: Plus,
      variant: 'primary',
      onSelect: () => {
        setIsCreateDialogOpen(true)
        setCreateError(null)
      },
      disabled: isLoading,
    },
  ]

  return (
    <>
      <SettingsPanel
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: t('searchPlaceholder'),
        }}
        actions={actions}
      >
        {isLoading ? null : showEmptyState ? (
          <SettingsEmptyState>{t('emptyState')}</SettingsEmptyState>
        ) : (
          <div className={RESOURCE_LIST_STACK}>
            {filteredKeys.map((key) => (
              <SettingsResourceRow
                key={key.id}
                title={key.name || t('unnamedKey')}
                description={key.displayKey}
                badge={
                  <span className='whitespace-nowrap text-[var(--text-muted)] text-caption'>
                    {key.lastUsed
                      ? t('lastUsed', { date: formatDate(new Date(key.lastUsed)).toLowerCase() })
                      : t('neverUsed')}
                  </span>
                }
                trailing={
                  <RowActionsMenu
                    label={t('actionsFor', { name: key.name || t('unnamedKey') })}
                    actions={[
                      {
                        label: tSettings('shared.delete'),
                        destructive: true,
                        onSelect: () => {
                          setDeleteKey(key)
                          setShowDeleteDialog(true)
                        },
                      },
                    ]}
                  />
                }
              />
            ))}
            {showNoResults && (
              <SettingsEmptyState variant='inline'>
                {t('noResults', { term: searchTerm })}
              </SettingsEmptyState>
            )}
          </div>
        )}
      </SettingsPanel>

      <ChipModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        srTitle={t('createModal.title')}
      >
        <ChipModalHeader onClose={() => setIsCreateDialogOpen(false)}>
          {t('createModal.title')}
        </ChipModalHeader>
        <ChipModalBody>
          <p className='px-2 text-[var(--text-secondary)] text-sm'>
            {t('createModal.description')}
          </p>
          <ChipModalField
            type='input'
            title={t('createModal.keyName')}
            value={newKeyName}
            onChange={(value) => {
              setNewKeyName(value)
              if (createError) setCreateError(null)
            }}
            placeholder={t('createModal.keyNamePlaceholder')}
            required
          />
          <ChipModalError>{createError}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => {
            setIsCreateDialogOpen(false)
            setNewKeyName('')
            setCreateError(null)
          }}
          primaryAction={{
            label: generateKey.isPending
              ? tSettings('shared.creating')
              : tSettings('shared.create'),
            onClick: handleCreateKey,
            disabled: !newKeyName.trim() || generateKey.isPending,
          }}
        />
      </ChipModal>

      <ChipModal
        open={showNewKeyDialog}
        onOpenChange={(open) => {
          setShowNewKeyDialog(open)
          if (!open) {
            setNewKey(null)
          }
        }}
        srTitle={t('createdModal.title')}
      >
        <ChipModalHeader
          onClose={() => {
            setShowNewKeyDialog(false)
            setNewKey(null)
          }}
        >
          {t('createdModal.title')}
        </ChipModalHeader>
        <ChipModalBody>
          <ChipModalField type='custom' title={t('createdModal.copyNow')}>
            {newKey && <SecretReveal value={newKey} />}
          </ChipModalField>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => {
            setShowNewKeyDialog(false)
            setNewKey(null)
          }}
          primaryAction={{
            label: tSettings('shared.done'),
            onClick: () => {
              setShowNewKeyDialog(false)
              setNewKey(null)
            },
          }}
        />
      </ChipModal>

      <ChipConfirmModal
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false)
            setDeleteKey(null)
          }
        }}
        srTitle={t('deleteModal.title')}
        title={t('deleteModal.title')}
        text={[
          t('deleteModal.prefix'),
          { text: deleteKey?.name || t('unnamedKey'), bold: true },
          ' ',
          { text: t('deleteModal.consequence'), error: true },
          t('deleteModal.suffix'),
        ]}
        confirm={{
          label: tSettings('shared.delete'),
          onClick: handleDeleteKey,
          pending: deleteKeyMutation.isPending,
          pendingLabel: tSettings('shared.deleting'),
        }}
      />
    </>
  )
}
