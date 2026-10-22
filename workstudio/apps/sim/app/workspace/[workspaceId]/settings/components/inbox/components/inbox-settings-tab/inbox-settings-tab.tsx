'use client'

import { useCallback, useState } from 'react'
import {
  Badge,
  Chip,
  ChipInput,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSelect,
  Label,
  Tooltip,
  useCopyToClipboard,
} from '@sim/emcn'
import { Check, Clipboard, Pencil, Plus, Trash } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  useAddInboxSender,
  useInboxConfig,
  useInboxSenders,
  useRemoveInboxSender,
  useUpdateInboxAddress,
  useUpdateInboxSecretPolicy,
} from '@/hooks/queries/inbox'
import { useRawMountableSecretOptions } from '@/hooks/queries/secret-mount-options'

const DROPDOWN_TRIGGER_CLASS = 'w-[240px] shrink-0'

export function InboxSettingsTab() {
  const t = useTranslations('settings.inbox.settingsTab')
  const tShared = useTranslations('settings.shared')
  const secretScopeOptions = [
    { value: 'all', label: t('secretScopes.all') },
    { value: 'selected', label: t('secretScopes.selected') },
  ]
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const { data: config } = useInboxConfig(workspaceId)
  const { data: sendersData, isLoading: sendersLoading } = useInboxSenders(workspaceId)
  const updateAddress = useUpdateInboxAddress()
  const updateSecretPolicy = useUpdateInboxSecretPolicy()
  const addSender = useAddInboxSender()
  const removeSender = useRemoveInboxSender()

  const [isAddSenderOpen, setIsAddSenderOpen] = useState(false)
  const [newSenderEmail, setNewSenderEmail] = useState('')
  const [newSenderLabel, setNewSenderLabel] = useState('')
  const [addSenderError, setAddSenderError] = useState<string | null>(null)

  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [editAddressError, setEditAddressError] = useState<string | null>(null)

  const [removeSenderError, setRemoveSenderError] = useState<string | null>(null)
  const { copied: copiedAddress, copy } = useCopyToClipboard()
  const { options: secretOptions, isPending: secretOptionsPending } =
    useRawMountableSecretOptions(workspaceId)

  const secretScope = config?.secretScope ?? 'all'
  const mountedSecrets = config?.mountedSecrets ?? []

  const handleCopyAddress = useCallback(() => {
    if (config?.address) void copy(config.address)
  }, [config?.address, copy])

  const handleEditAddress = useCallback(async () => {
    if (!newUsername.trim()) return
    setEditAddressError(null)
    try {
      await updateAddress.mutateAsync({ workspaceId, username: newUsername.trim() })
      setIsEditAddressOpen(false)
      setNewUsername('')
    } catch (error) {
      setEditAddressError(getErrorMessage(error, t('updateAddressFailed')))
    }
  }, [workspaceId, newUsername, updateAddress.mutateAsync, t])

  const handleAddSender = useCallback(async () => {
    if (!newSenderEmail.trim()) return
    setAddSenderError(null)
    try {
      await addSender.mutateAsync({
        workspaceId,
        email: newSenderEmail.trim(),
        label: newSenderLabel.trim() || undefined,
      })
      setIsAddSenderOpen(false)
      setNewSenderEmail('')
      setNewSenderLabel('')
    } catch (error) {
      setAddSenderError(getErrorMessage(error, t('addSenderFailed')))
    }
  }, [workspaceId, newSenderEmail, newSenderLabel, addSender.mutateAsync, t])

  const handleRemoveSender = useCallback(
    async (senderId: string) => {
      setRemoveSenderError(null)
      try {
        await removeSender.mutateAsync({ workspaceId, senderId })
      } catch (error) {
        setRemoveSenderError(getErrorMessage(error, t('removeSenderFailed')))
      }
    },
    [workspaceId, removeSender.mutateAsync, t]
  )

  return (
    <>
      <div className='flex flex-col gap-7'>
        {config?.address && (
          <SettingsSection label={t('addressLabel')}>
            <div className='flex flex-col gap-1.5'>
              <div className='flex items-center justify-between'>
                <p className='text-[var(--text-muted)] text-caption'>{t('addressHint')}</p>
                <div className='flex items-center gap-1.5'>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type='button'
                        onClick={handleCopyAddress}
                        className='-my-1 flex size-5 items-center justify-center'
                        aria-label={t('copyAddress')}
                      >
                        {copiedAddress ? (
                          <Check className='size-[14px] text-[var(--text-success)]' />
                        ) : (
                          <Clipboard className='size-[14px] text-[var(--text-icon)]' />
                        )}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top'>
                      <p>{copiedAddress ? t('copiedExclamation') : tShared('copy')}</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type='button'
                        onClick={() => {
                          setNewUsername('')
                          setEditAddressError(null)
                          setIsEditAddressOpen(true)
                        }}
                        className='-my-1 flex size-5 items-center justify-center'
                        aria-label={t('editAddress')}
                      >
                        <Pencil className='size-[14px] text-[var(--text-icon)]' />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top'>
                      <p>{tShared('edit')}</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </div>
              <ChipInput
                value={config.address}
                readOnly
                inputClassName='cursor-default font-mono text-small'
              />
            </div>
          </SettingsSection>
        )}

        <SettingsSection label={t('allowedSenders')}>
          <div className='flex flex-col gap-1.5'>
            <p className='text-[var(--text-muted)] text-caption'>{t('allowedSendersHint')}</p>

            <div className='mt-1 flex flex-col gap-[1px] overflow-hidden rounded-lg border border-[var(--border)]'>
              {sendersLoading ? null : (
                <>
                  {sendersData?.workspaceMembers.map((member) => (
                    <div
                      key={member.email}
                      className='flex items-center justify-between border-[var(--border)] border-b px-3 py-2.5 last:border-b-0'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='text-[var(--text-body)] text-sm'>{member.email}</span>
                        <Badge variant='gray' size='sm'>
                          {t('memberBadge')}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {sendersData?.senders.map((sender) => (
                    <div
                      key={sender.id}
                      className='flex items-center justify-between border-[var(--border)] border-b px-3 py-2.5 last:border-b-0'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='text-[var(--text-body)] text-sm'>{sender.email}</span>
                        {sender.label && (
                          <span className='text-[var(--text-muted)] text-caption'>
                            ({sender.label})
                          </span>
                        )}
                      </div>
                      <Chip
                        leftIcon={Trash}
                        aria-label={t('removeSender')}
                        onClick={() => handleRemoveSender(sender.id)}
                      />
                    </div>
                  ))}

                  {sendersData?.workspaceMembers.length === 0 &&
                    sendersData?.senders.length === 0 && (
                      <div className='px-3 py-2.5 text-[var(--text-muted)] text-caption'>
                        {t('noSenders')}
                      </div>
                    )}
                </>
              )}
            </div>

            {removeSenderError && (
              <p className='px-3 text-[var(--text-error)] text-caption leading-tight'>
                {removeSenderError}
              </p>
            )}

            <Chip
              className='mt-1 w-fit'
              leftIcon={Plus}
              onClick={() => {
                setNewSenderEmail('')
                setNewSenderLabel('')
                setAddSenderError(null)
                setIsAddSenderOpen(true)
              }}
            >
              {t('addSender')}
            </Chip>
          </div>
        </SettingsSection>

        <SettingsSection label={t('secrets')}>
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <Label>{t('secretAccess')}</Label>
              <div className={DROPDOWN_TRIGGER_CLASS}>
                <ChipSelect
                  aria-label={t('secretAccess')}
                  align='start'
                  fullWidth
                  dropdownWidth='trigger'
                  value={secretScope}
                  onChange={(value) =>
                    updateSecretPolicy.mutate({
                      workspaceId,
                      secretScope: value === 'selected' ? 'selected' : 'all',
                      mountedSecrets,
                    })
                  }
                  options={secretScopeOptions}
                  disabled={updateSecretPolicy.isPending}
                />
              </div>
            </div>

            {secretScope === 'selected' && (
              <div className='flex items-center justify-between gap-4'>
                <Label>{t('secrets')}</Label>
                <div className={DROPDOWN_TRIGGER_CLASS}>
                  <ChipSelect
                    aria-label={t('secrets')}
                    align='start'
                    fullWidth
                    dropdownWidth='trigger'
                    multiSelect
                    searchable
                    searchPlaceholder={t('searchSecrets')}
                    placeholder={t('selectSecrets')}
                    options={secretOptions}
                    multiSelectValues={mountedSecrets}
                    onMultiSelectChange={(values) =>
                      updateSecretPolicy.mutate({
                        workspaceId,
                        secretScope: 'selected',
                        mountedSecrets: values,
                      })
                    }
                    disabled={secretOptionsPending || updateSecretPolicy.isPending}
                  />
                </div>
              </div>
            )}
            {updateSecretPolicy.error && (
              <p role='alert' className='text-[var(--text-error)] text-caption'>
                {getErrorMessage(updateSecretPolicy.error, t('updateSecretAccessFailed'))}
              </p>
            )}
          </div>
        </SettingsSection>
      </div>

      <ChipModal
        open={isAddSenderOpen}
        onOpenChange={setIsAddSenderOpen}
        srTitle={t('addSenderModalTitle')}
      >
        <ChipModalHeader onClose={() => setIsAddSenderOpen(false)}>
          {t('addSenderModalTitle')}
        </ChipModalHeader>
        <ChipModalBody>
          <ChipModalField
            type='email'
            title={t('emailAddress')}
            value={newSenderEmail}
            onChange={(v) => {
              setNewSenderEmail(v)
              if (addSenderError) setAddSenderError(null)
            }}
            required
            placeholder='user@example.com'
          />
          <ChipModalField
            type='input'
            title={t('label')}
            value={newSenderLabel}
            onChange={setNewSenderLabel}
            placeholder={t('labelPlaceholder')}
          />
          <ChipModalError>{addSenderError}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => setIsAddSenderOpen(false)}
          primaryAction={{
            label: tShared('add'),
            onClick: handleAddSender,
            disabled: !newSenderEmail.trim() || addSender.isPending,
          }}
        />
      </ChipModal>

      <ChipModal
        open={isEditAddressOpen}
        onOpenChange={setIsEditAddressOpen}
        srTitle={t('changeAddressTitle')}
      >
        <ChipModalHeader onClose={() => setIsEditAddressOpen(false)}>
          {t('changeAddressTitle')}
        </ChipModalHeader>
        <ChipModalBody>
          <p className='px-2 text-[var(--text-secondary)] text-sm'>
            {t('changeAddressWarning')}{' '}
            <span className='text-[var(--text-primary)]'>{t('changeAddressWarningEmphasis')}</span>
          </p>
          <ChipModalField
            type='input'
            title={t('newEmailPrefix')}
            value={newUsername}
            onChange={(value) => {
              setNewUsername(value)
              if (editAddressError) setEditAddressError(null)
            }}
            placeholder={t('newEmailPrefixPlaceholder')}
            error={editAddressError}
          />
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => setIsEditAddressOpen(false)}
          cancelDisabled={updateAddress.isPending}
          defaultAction='none'
          primaryAction={{
            label: updateAddress.isPending ? t('updating') : t('changeAddress'),
            onClick: handleEditAddress,
            disabled: !newUsername.trim() || updateAddress.isPending,
            variant: 'destructive',
          }}
        />
      </ChipModal>
    </>
  )
}
