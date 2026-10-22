'use client'

import { useState } from 'react'
import {
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSwitch,
  Label,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useInboxConfig, useToggleInbox } from '@/hooks/queries/inbox'

export function InboxEnableToggle() {
  const t = useTranslations('settings.inbox.enableToggle')
  const inboxOptions = [
    { value: 'enabled', label: t('on') },
    { value: 'disabled', label: t('off') },
  ] as const
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const { data: config } = useInboxConfig(workspaceId)
  const toggleInbox = useToggleInbox()

  const [isEnableOpen, setIsEnableOpen] = useState(false)
  const [isDisableOpen, setIsDisableOpen] = useState(false)
  const [enableUsername, setEnableUsername] = useState('')

  function handleToggle(checked: boolean) {
    toggleInbox.reset()
    if (checked) {
      setIsEnableOpen(true)
    } else {
      setIsDisableOpen(true)
    }
  }

  function handleEnableOpenChange(open: boolean) {
    if (!toggleInbox.isPending) setIsEnableOpen(open)
  }

  function handleDisable() {
    toggleInbox.mutate(
      { workspaceId, enabled: false },
      { onSuccess: () => setIsDisableOpen(false) }
    )
  }

  function handleEnable() {
    toggleInbox.mutate(
      { workspaceId, enabled: true, username: enableUsername.trim() || undefined },
      {
        onSuccess: () => {
          setIsEnableOpen(false)
          setEnableUsername('')
        },
      }
    )
  }

  const error = toggleInbox.error ? getErrorMessage(toggleInbox.error, t('updateFailed')) : null

  return (
    <>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col gap-1'>
          <Label>{t('enableTitle')}</Label>
          <p className='text-[var(--text-muted)] text-caption'>{t('enableDescription')}</p>
        </div>
        <ChipSwitch
          aria-label={t('enableTitle')}
          options={inboxOptions}
          value={config?.enabled ? 'enabled' : 'disabled'}
          onChange={(value) => handleToggle(value === 'enabled')}
          disabled={toggleInbox.isPending}
        />
      </div>

      <ChipModal
        open={isEnableOpen}
        onOpenChange={handleEnableOpenChange}
        srTitle={t('enableTitle')}
      >
        <ChipModalHeader onClose={() => handleEnableOpenChange(false)}>
          {t('enableTitle')}
        </ChipModalHeader>
        <ChipModalBody>
          <p className='px-2 text-[var(--text-secondary)] text-sm'>{t('enableModalDescription')}</p>
          <ChipModalField
            type='input'
            title={t('emailPrefix')}
            value={enableUsername}
            onChange={setEnableUsername}
            placeholder={t('emailPrefixPlaceholder')}
          />
          <p className='px-2 text-[var(--text-muted)] text-sm'>{t('emailPrefixHint')}</p>
          <ChipModalError>{error}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => handleEnableOpenChange(false)}
          cancelDisabled={toggleInbox.isPending}
          primaryAction={{
            label: toggleInbox.isPending ? t('enabling') : t('enable'),
            onClick: handleEnable,
            disabled: toggleInbox.isPending,
          }}
        />
      </ChipModal>

      <ChipConfirmModal
        open={isDisableOpen}
        onOpenChange={setIsDisableOpen}
        srTitle={t('disableTitle')}
        title={t('disableTitle')}
        text={
          config?.address
            ? [
                t('disableConfirmPrefix'),
                { text: config.address, bold: true },
                t('disableConfirmSuffix'),
              ]
            : t('disableConfirmNoAddress')
        }
        confirm={{
          label: t('disableInbox'),
          onClick: handleDisable,
          pending: toggleInbox.isPending,
          pendingLabel: t('disabling'),
        }}
      >
        <p className='px-2 text-[var(--text-secondary)] text-sm'>{t('historyPreserved')}</p>
        <ChipModalError>{error}</ChipModalError>
      </ChipConfirmModal>
    </>
  )
}
