'use client'

import { useState } from 'react'
import {
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  SecretReveal,
} from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { type CreatedApiKey, useCreateApiKey } from '@/hooks/queries/api-keys'

const logger = createLogger('CreateApiKeyModal')

interface CreateApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  existingKeyNames?: string[]
  allowPersonalApiKeys?: boolean
  canManageWorkspaceKeys?: boolean
  defaultKeyType?: 'personal' | 'workspace'
  source?: 'settings' | 'deploy_modal'
  onKeyCreated?: (key: CreatedApiKey) => void
}

const EMPTY_KEY_NAMES: string[] = []

/**
 * Reusable modal for creating API keys.
 * Used in both the API keys settings page and the deploy modal.
 */
export function CreateApiKeyModal({
  open,
  onOpenChange,
  workspaceId,
  existingKeyNames = EMPTY_KEY_NAMES,
  allowPersonalApiKeys = true,
  canManageWorkspaceKeys = false,
  defaultKeyType = 'personal',
  source = 'settings',
  onKeyCreated,
}: CreateApiKeyModalProps) {
  const t = useTranslations('settings.apiKeys.createModal')
  const tShared = useTranslations('settings.shared')
  const [keyName, setKeyName] = useState('')
  const [keyType, setKeyType] = useState<'personal' | 'workspace'>(defaultKeyType)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const createApiKeyMutation = useCreateApiKey()

  /**
   * The form is seeded when the modal OPENS, not when this component mounts.
   *
   * It mounts with its host page, and on the settings page `defaultKeyType` is
   * computed from a permission-group policy that is still loading at that
   * moment — so it starts as the fail-closed `'workspace'` and only becomes
   * `'personal'` once the query answers. Seeding once at mount left a non-admin
   * holding `'workspace'`, which they may not create, with no type selector
   * rendered to change it and Create permanently disabled.
   *
   * Adjusting during render off the previous `open` rather than in an effect:
   * there is no external system to synchronize with, only a prop transition.
   */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setKeyName('')
      setKeyType(defaultKeyType)
      setCreateError(null)
    }
  }

  const canCreateKeyType =
    keyType === 'personal' ? allowPersonalApiKeys : canManageWorkspaceKeys && Boolean(workspaceId)

  const handleCreateKey = async () => {
    const trimmedName = keyName.trim()
    if (!trimmedName || !canCreateKeyType || createApiKeyMutation.isPending) return

    const isDuplicate = existingKeyNames.some(
      (name) => name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (isDuplicate) {
      setCreateError(
        keyType === 'workspace'
          ? t('duplicateWorkspace', { name: trimmedName })
          : t('duplicatePersonal', { name: trimmedName })
      )
      return
    }

    setCreateError(null)
    try {
      if (keyType === 'workspace' && !workspaceId) return
      const data = await createApiKeyMutation.mutateAsync(
        keyType === 'workspace' && workspaceId
          ? {
              workspaceId,
              name: trimmedName,
              keyType,
              source,
            }
          : { keyType: 'personal', name: trimmedName, source }
      )

      setNewKey(data.key)
      setShowNewKeyDialog(true)
      onOpenChange(false)
      onKeyCreated?.(data.key)
    } catch (error: unknown) {
      logger.error('API key creation failed:', { error })
      const errorMessage = getErrorMessage(error, t('createFailed'))
      if (errorMessage.toLowerCase().includes('already exists')) {
        setCreateError(errorMessage)
      } else {
        setCreateError(t('createFailedConnection'))
      }
    }
  }

  const handleClose = () => {
    if (!createApiKeyMutation.isPending) onOpenChange(false)
  }

  return (
    <>
      <ChipModal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!createApiKeyMutation.isPending) onOpenChange(nextOpen)
        }}
        dismissDisabled={createApiKeyMutation.isPending}
        srTitle={t('title')}
      >
        <ChipModalHeader onClose={handleClose}>{t('title')}</ChipModalHeader>
        <ChipModalBody>
          {canManageWorkspaceKeys && (
            <ChipModalField type='custom' title={t('keyType')}>
              <ChipButtonGroup
                value={keyType}
                onValueChange={(value) => {
                  setKeyType(value as 'personal' | 'workspace')
                  if (createError) setCreateError(null)
                }}
              >
                <ChipButtonGroupItem value='personal' disabled={!allowPersonalApiKeys}>
                  {t('personal')}
                </ChipButtonGroupItem>
                <ChipButtonGroupItem value='workspace'>{t('workspace')}</ChipButtonGroupItem>
              </ChipButtonGroup>
            </ChipModalField>
          )}
          <ChipModalField
            type='input'
            title={t('name')}
            value={keyName}
            onChange={(value) => {
              setKeyName(value)
              if (createError) setCreateError(null)
            }}
            placeholder={t('namePlaceholder')}
            autoComplete='off'
            required
          />
          {/* Hidden decoy fields to prevent browser autofill */}
          <input
            type='text'
            name='fakeusernameremembered'
            autoComplete='username'
            aria-hidden='true'
            className='-left-[9999px] pointer-events-none absolute opacity-0'
            tabIndex={-1}
            readOnly
          />
          <ChipModalError>{createError}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={handleClose}
          primaryAction={{
            label: createApiKeyMutation.isPending ? tShared('creating') : tShared('create'),
            onClick: handleCreateKey,
            disabled: !keyName.trim() || createApiKeyMutation.isPending || !canCreateKeyType,
          }}
        />
      </ChipModal>

      <ChipModal
        open={showNewKeyDialog}
        onOpenChange={(dialogOpen: boolean) => {
          setShowNewKeyDialog(dialogOpen)
          if (!dialogOpen) {
            setNewKey(null)
          }
        }}
        srTitle={t('createdTitle')}
      >
        <ChipModalHeader onClose={() => setShowNewKeyDialog(false)}>
          {t('createdTitle')}
        </ChipModalHeader>
        <ChipModalBody>
          <ChipModalField type='custom' title={t('copyNow')}>
            {newKey && <SecretReveal value={newKey.key} />}
          </ChipModalField>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => setShowNewKeyDialog(false)}
          primaryAction={{ label: tShared('done'), onClick: () => setShowNewKeyDialog(false) }}
        />
      </ChipModal>
    </>
  )
}
