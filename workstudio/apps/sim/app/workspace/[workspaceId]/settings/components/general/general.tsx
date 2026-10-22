'use client'

import { useEffect, useRef, useState } from 'react'
import { ANONYMOUS_USER_ID } from '@sim/auth/principal'
import {
  Button,
  Chip,
  ChipCombobox,
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalFooter,
  ChipModalHeader,
  ChipSelect,
  cn,
  Input,
  Label,
  Switch,
  Tooltip,
  toast,
} from '@sim/emcn'
import { Camera, Check, CircleInfo, Pencil } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryState } from 'nuqs'
import { useSession } from '@/lib/auth/client'
import { signOutAndRedirect } from '@/lib/auth/sign-out'
import { useDeploymentShape } from '@/lib/core/config/deployment-shape'
import { getBrowserTimezone, getTimezoneOptions } from '@/lib/core/utils/timezone'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { DeleteAccountModal } from '@/app/workspace/[workspaceId]/settings/components/general/components/delete-account-modal'
import { LanguageSelect } from '@/app/workspace/[workspaceId]/settings/components/general/components/language-select'
import { PrivacyView } from '@/app/workspace/[workspaceId]/settings/components/general/components/privacy-view'
import {
  generalViewParam,
  generalViewUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/components/general/search-params'
import {
  getTimezonePickerPresentation,
  timezonePreferenceFromPickerValue,
} from '@/app/workspace/[workspaceId]/settings/components/general/timezone-picker'
import type { SettingsAction } from '@/app/workspace/[workspaceId]/settings/components/settings-header/settings-header'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useProfilePictureUpload } from '@/app/workspace/[workspaceId]/settings/hooks/use-profile-picture-upload'
import { useBrandConfig } from '@/ee/whitelabeling'
import { useGeneralSettings, useUpdateGeneralSetting } from '@/hooks/queries/general-settings'
import {
  useResetPassword,
  useSignOutOtherDevices,
  useUpdateUserProfile,
  useUserProfile,
} from '@/hooks/queries/user-profile'

/** `loading` gives the view its own boundary; the section page has none to suspend into. */
const AuthorizedApps = dynamic(
  () =>
    import(
      '@/app/workspace/[workspaceId]/settings/components/authorized-apps/authorized-apps'
    ).then((module) => module.AuthorizedApps),
  { loading: () => null }
)

const logger = createLogger('General')

/** Human-friendly timezone options for the picker, common zones first. */
const TIMEZONE_OPTIONS = getTimezoneOptions()

/**
 * Shared trigger width for the three appearance dropdowns (Theme, Timezone, Snap
 * to grid) so they line up as one column instead of three differently-sized
 * pills. Wide enough for the longest common timezone label.
 */
const DROPDOWN_TRIGGER_CLASS = 'w-full shrink-0 md:w-[240px]'

/**
 * Extracts initials from a user's name.
 * @param name - The user's full name
 * @returns Up to 2 characters: first letters of first and last name, or just the first letter
 */
function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return ''
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

export function General() {
  const t = useTranslations('settings.general')
  const tSettings = useTranslations('settings')
  const router = useRouter()
  const brandConfig = useBrandConfig()
  const { data: session } = useSession()
  const { hosted } = useDeploymentShape()

  const { data: profile, isLoading: isProfileLoading } = useUserProfile()
  const updateProfile = useUpdateUserProfile()

  const { data: settings, isLoading: isSettingsLoading } = useGeneralSettings()
  const updateSetting = useUpdateGeneralSetting()

  const isLoading = isProfileLoading || isSettingsLoading

  const isAuthDisabled = session?.user?.id === ANONYMOUS_USER_ID

  const [name, setName] = useState(profile?.name || '')
  const [isEditingName, setIsEditingName] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevProfileNameRef = useRef<string | undefined>(profile?.name)

  if (profile?.name && profile.name !== prevProfileNameRef.current) {
    prevProfileNameRef.current = profile.name
    setName(profile.name)
  }

  const [view, setView] = useQueryState(generalViewParam.key, {
    ...generalViewParam.parser,
    ...generalViewUrlKeys,
  })
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const resetPassword = useResetPassword()
  const [showSignOutOtherDevicesModal, setShowSignOutOtherDevicesModal] = useState(false)
  const signOutOtherDevices = useSignOutOtherDevices()

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)

  const [uploadError, setUploadError] = useState<string | null>(null)

  const snapToGridValue = settings?.snapToGridSize ?? 0

  const {
    previewUrl: profilePictureUrl,
    fileInputRef: profilePictureInputRef,
    handleThumbnailClick: handleProfilePictureClick,
    handleFileChange: handleProfilePictureChange,
    isUploading: isUploadingProfilePicture,
  } = useProfilePictureUpload({
    currentImage: profile?.image || null,
    onUpload: (url: string | null) => {
      updateProfile
        .mutateAsync({ image: url })
        .then(() => {
          setUploadError(null)
        })
        .catch(() => {
          setUploadError(url ? t('profile.updatePictureFailed') : t('profile.removePictureFailed'))
        })
    },
    onError: (error: string) => {
      setUploadError(error)
      setTimeout(() => setUploadError(null), 5000)
    },
  })

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  const handleUpdateName = async () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    if (trimmedName === profile?.name) {
      setIsEditingName(false)
      return
    }

    try {
      await updateProfile.mutateAsync({ name: trimmedName })
      setIsEditingName(false)
    } catch (error) {
      logger.error('Error updating name:', error)
      setName(profile?.name || '')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleUpdateName()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    setName(profile?.name || '')
  }

  const handleInputBlur = () => {
    handleUpdateName()
  }

  const handleResetPasswordConfirm = async () => {
    if (!profile?.email) return

    resetPassword.mutate(
      {
        email: profile.email,
        redirectTo: `${getBaseUrl()}/reset-password`,
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            setShowResetPasswordModal(false)
            resetPassword.reset()
          }, 1500)
        },
        onError: (error) => {
          logger.error('Error resetting password:', error)
          setTimeout(() => resetPassword.reset(), 5000)
        },
      }
    )
  }

  const confirmSignOutOtherDevices = () => {
    signOutOtherDevices.mutate(undefined, {
      onSuccess: () => toast.success(t('signOutOthersModal.success')),
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setShowSignOutOtherDevicesModal(false),
    })
  }

  const handleThemeChange = async (value: string) => {
    await updateSetting.mutateAsync({ key: 'theme', value: value as 'system' | 'light' | 'dark' })
  }

  const handleTimezoneChange = async (value: string) => {
    const timezone = timezonePreferenceFromPickerValue(value)
    if (timezone === undefined) return
    await updateSetting.mutateAsync({
      key: 'timezone',
      value: timezone,
    })
  }

  const handleAutoConnectChange = async (checked: boolean) => {
    if (checked !== settings?.autoConnect && !updateSetting.isPending) {
      await updateSetting.mutateAsync({ key: 'autoConnect', value: checked })
    }
  }

  const handleAutoFocusOnClickChange = async (checked: boolean) => {
    if (checked !== settings?.autoFocusOnClick && !updateSetting.isPending) {
      await updateSetting.mutateAsync({ key: 'autoFocusOnClick', value: checked })
    }
  }

  const handleSnapToGridChange = async (value: string) => {
    const newValue = Number.parseInt(value, 10)
    if (newValue !== settings?.snapToGridSize && !updateSetting.isPending) {
      await updateSetting.mutateAsync({ key: 'snapToGridSize', value: newValue })
    }
  }

  const handleShowActionBarChange = async (checked: boolean) => {
    if (checked !== settings?.showActionBar && !updateSetting.isPending) {
      await updateSetting.mutateAsync({ key: 'showActionBar', value: checked })
    }
  }

  const handleErrorNotificationsChange = async (checked: boolean) => {
    if (checked !== settings?.errorNotificationsEnabled && !updateSetting.isPending) {
      await updateSetting.mutateAsync({ key: 'errorNotificationsEnabled', value: checked })
    }
  }

  const imageUrl = profilePictureUrl || profile?.image || brandConfig.logoUrl

  if (view === 'privacy') {
    return <PrivacyView onBack={() => setView(null, { history: 'replace' })} />
  }

  if (view === 'authorized-apps' && !isAuthDisabled) {
    return <AuthorizedApps onBack={() => setView(null, { history: 'replace' })} />
  }

  const actions: SettingsAction[] = [
    ...(hosted
      ? [
          {
            id: 'home-page',
            text: t('actions.homePage'),
            onSelect: () => window.open('/?home', '_blank', 'noopener,noreferrer'),
          },
        ]
      : []),
    ...(session?.user?.id && !isAuthDisabled
      ? [
          {
            id: 'sign-out',
            text: t('actions.signOut'),
            onSelect: () => signOutAndRedirect(router.push),
          },
          {
            id: 'sign-out-other-devices',
            text: t('actions.signOutOtherDevices'),
            onSelect: () => setShowSignOutOtherDevicesModal(true),
          },
          {
            id: 'reset-password',
            text: t('actions.resetPassword'),
            onSelect: () => setShowResetPasswordModal(true),
            disabled: !profile?.email,
          },
        ]
      : []),
  ]

  if (isLoading) {
    return <SettingsPanel actions={actions} />
  }

  const browserTimezone = getBrowserTimezone()
  const savedTimezone = settings?.timezone ?? null
  const timezonePicker = getTimezonePickerPresentation(
    savedTimezone,
    browserTimezone,
    TIMEZONE_OPTIONS,
    {
      auto: (timezone) => t('preferences.timezoneAuto', { timezone }),
      invalid: (timezone) => t('preferences.timezoneInvalid', { timezone }),
      empty: t('preferences.timezoneEmpty'),
    }
  )

  return (
    <>
      <SettingsPanel actions={actions}>
        <SettingsSection label={t('sections.profile')}>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3'>
              <div className='relative'>
                <button
                  type='button'
                  aria-label={t('profile.changePicture')}
                  className={cn(
                    'group relative flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-colors hover-hover:bg-[var(--bg)]',
                    !imageUrl && 'border border-[var(--border)]'
                  )}
                  onClick={handleProfilePictureClick}
                >
                  {(() => {
                    if (imageUrl) {
                      return (
                        <Image
                          src={imageUrl}
                          alt={profile?.name || t('profile.pictureAlt')}
                          width={36}
                          height={36}
                          unoptimized
                          className={`size-full object-cover transition-opacity duration-300 ${
                            isUploadingProfilePicture ? 'opacity-50' : 'opacity-100'
                          }`}
                        />
                      )
                    }
                    return (
                      <span className='text-[var(--text-primary)] text-base'>
                        {getInitials(profile?.name) || ''}
                      </span>
                    )
                  })()}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/50 transition-opacity ${
                      isUploadingProfilePicture
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isUploadingProfilePicture ? (
                      <div className='size-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                    ) : (
                      <Camera className='size-4 text-white' />
                    )}
                  </div>
                </button>
                <Input
                  type='file'
                  accept='image/png,image/jpeg,image/jpg'
                  className='hidden'
                  ref={profilePictureInputRef}
                  onChange={handleProfilePictureChange}
                  disabled={isUploadingProfilePicture}
                />
              </div>
              <div className='flex flex-1 flex-col justify-center gap-[1px]'>
                <div className='flex items-center gap-2'>
                  {isEditingName ? (
                    <>
                      <div className='relative inline-flex'>
                        <span className='invisible whitespace-pre text-base' aria-hidden='true'>
                          {name || ' '}
                        </span>
                        <input
                          ref={inputRef}
                          aria-label={t('profile.yourName')}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleInputBlur}
                          className='absolute top-0 left-0 size-full border-0 bg-transparent p-0 text-base outline-hidden focus:outline-hidden focus:ring-0 focus-visible:outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0'
                          maxLength={100}
                          disabled={updateProfile.isPending}
                          autoComplete='off'
                          autoCorrect='off'
                          autoCapitalize='off'
                          spellCheck='false'
                        />
                      </div>
                      <Button
                        variant='ghost'
                        className='size-[12px] shrink-0 p-0'
                        onClick={handleUpdateName}
                        disabled={updateProfile.isPending}
                        aria-label={t('profile.saveName')}
                      >
                        <Check className='size-[12px]' />
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className='text-base'>{profile?.name || ''}</h3>
                      <Button
                        variant='ghost'
                        className='size-[10.5px] shrink-0 p-0'
                        onClick={() => setIsEditingName(true)}
                        aria-label={t('profile.editName')}
                      >
                        <Pencil className='size-[10.5px]' />
                      </Button>
                    </>
                  )}
                </div>
                <p className='text-[var(--text-tertiary)] text-sm'>{profile?.email || ''}</p>
              </div>
            </div>
            {uploadError && <p className='text-[var(--text-error)] text-sm'>{uploadError}</p>}
          </div>
        </SettingsSection>

        <SettingsSection label={t('sections.preferences')}>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <Label>{t('language')}</Label>
              <div className={DROPDOWN_TRIGGER_CLASS}>
                <LanguageSelect ariaLabel={t('language')} />
              </div>
            </div>

            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <Label>{t('preferences.theme')}</Label>
              <div className={DROPDOWN_TRIGGER_CLASS}>
                <ChipSelect
                  aria-label={t('preferences.theme')}
                  align='start'
                  fullWidth
                  dropdownWidth='trigger'
                  value={settings?.theme}
                  onChange={handleThemeChange}
                  placeholder={t('preferences.selectTheme')}
                  options={[
                    { label: t('preferences.themes.system'), value: 'system' },
                    { label: t('preferences.themes.light'), value: 'light' },
                    { label: t('preferences.themes.dark'), value: 'dark' },
                  ]}
                />
              </div>
            </div>

            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4'>
              <Label>{t('preferences.timezone')}</Label>
              <div className={DROPDOWN_TRIGGER_CLASS}>
                <ChipCombobox
                  align='start'
                  dropdownWidth={240}
                  searchable
                  searchPlaceholder={t('preferences.searchTimezones')}
                  value={timezonePicker.value}
                  onChange={handleTimezoneChange}
                  placeholder={t('preferences.selectTimezone')}
                  options={timezonePicker.options}
                />
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <Label htmlFor='auto-connect'>{t('preferences.autoConnect')}</Label>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type='button'
                      aria-label={t('preferences.autoConnectAbout')}
                      className='inline-flex cursor-default text-[var(--text-muted)]'
                    >
                      <CircleInfo className='size-[14px]' />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom' align='start'>
                    <p>{t('preferences.autoConnectTooltip')}</p>
                    <Tooltip.Preview
                      src='/tooltips/auto-connect-on-drop.mp4'
                      alt={t('preferences.autoConnectExample')}
                      loop={true}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
              <Switch
                id='auto-connect'
                checked={settings?.autoConnect ?? true}
                onCheckedChange={handleAutoConnectChange}
              />
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <Label htmlFor='auto-focus-on-click'>{t('preferences.autoFocus')}</Label>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type='button'
                      aria-label={t('preferences.autoFocusAbout')}
                      className='inline-flex cursor-default text-[var(--text-muted)]'
                    >
                      <CircleInfo className='size-[14px]' />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom' align='start'>
                    <p>{t('preferences.autoFocusTooltip')}</p>
                    <Tooltip.Preview
                      src='/tooltips/auto-focus-on-click.mp4'
                      alt={t('preferences.autoFocusExample')}
                      loop={true}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
              <Switch
                id='auto-focus-on-click'
                checked={settings?.autoFocusOnClick ?? true}
                onCheckedChange={handleAutoFocusOnClickChange}
              />
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <Label htmlFor='error-notifications'>{t('preferences.errorNotifications')}</Label>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type='button'
                      aria-label={t('preferences.errorNotificationsAbout')}
                      className='inline-flex cursor-default text-[var(--text-muted)]'
                    >
                      <CircleInfo className='size-[14px]' />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom' align='start'>
                    <p>{t('preferences.errorNotificationsTooltip')}</p>
                    <Tooltip.Preview
                      src='/tooltips/canvas-error-notification.mp4'
                      alt={t('preferences.errorNotificationsExample')}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
              <Switch
                id='error-notifications'
                checked={settings?.errorNotificationsEnabled ?? true}
                onCheckedChange={handleErrorNotificationsChange}
              />
            </div>

            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <Label>{t('preferences.snapToGrid')}</Label>
              <div className={DROPDOWN_TRIGGER_CLASS}>
                <ChipSelect
                  aria-label={t('preferences.snapToGrid')}
                  align='start'
                  fullWidth
                  dropdownWidth='trigger'
                  value={String(snapToGridValue)}
                  onChange={handleSnapToGridChange}
                  placeholder={t('preferences.selectSize')}
                  options={[
                    { label: t('preferences.snapOff'), value: '0' },
                    { label: '10px', value: '10' },
                    { label: '20px', value: '20' },
                    { label: '30px', value: '30' },
                    { label: '40px', value: '40' },
                    { label: '50px', value: '50' },
                  ]}
                />
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <Label htmlFor='show-action-bar'>{t('preferences.showCanvasControls')}</Label>
              <Switch
                id='show-action-bar'
                checked={settings?.showActionBar ?? true}
                onCheckedChange={handleShowActionBarChange}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection label={t('sections.privacy')}>
          <div className='flex items-center justify-between'>
            <Label>{t('privacySettings')}</Label>
            <Chip onClick={() => setView('privacy')}>{t('manage')}</Chip>
          </div>
        </SettingsSection>

        {!isAuthDisabled && (
          <SettingsSection label={t('sections.account')}>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <Label>{t('authorizedApps')}</Label>
                <Chip onClick={() => setView('authorized-apps')}>{t('manage')}</Chip>
              </div>
              <div className='flex items-center justify-between'>
                <Label>{t('deleteAccountLabel')}</Label>
                <Chip onClick={() => setShowDeleteAccountModal(true)}>
                  {tSettings('shared.delete')}
                </Chip>
              </div>
            </div>
          </SettingsSection>
        )}
      </SettingsPanel>

      <ChipModal
        open={showResetPasswordModal}
        onOpenChange={setShowResetPasswordModal}
        srTitle={t('resetPasswordModal.title')}
      >
        <ChipModalHeader onClose={() => setShowResetPasswordModal(false)}>
          {t('resetPasswordModal.title')}
        </ChipModalHeader>
        <ChipModalBody>
          <p className='px-2 text-[var(--text-secondary)] text-sm'>
            {t.rich('resetPasswordModal.body', {
              email: profile?.email ?? '',
              b: (chunks) => <span className='text-[var(--text-primary)]'>{chunks}</span>,
            })}
          </p>
          <ChipModalError>{resetPassword.error?.message}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => setShowResetPasswordModal(false)}
          cancelDisabled={resetPassword.isPending || resetPassword.isSuccess}
          primaryAction={{
            label: resetPassword.isPending
              ? t('resetPasswordModal.sending')
              : resetPassword.isSuccess
                ? t('resetPasswordModal.sent')
                : t('resetPasswordModal.send'),
            onClick: handleResetPasswordConfirm,
            disabled: resetPassword.isPending || resetPassword.isSuccess,
          }}
        />
      </ChipModal>

      <ChipConfirmModal
        open={showSignOutOtherDevicesModal}
        onOpenChange={setShowSignOutOtherDevicesModal}
        title={t('signOutOthersModal.title')}
        text={t('signOutOthersModal.text')}
        confirm={{
          label: t('signOutOthersModal.confirm'),
          onClick: confirmSignOutOtherDevices,
          pending: signOutOtherDevices.isPending,
          pendingLabel: t('signOutOthersModal.pending'),
        }}
      />

      <DeleteAccountModal
        open={showDeleteAccountModal}
        onOpenChange={setShowDeleteAccountModal}
        email={profile?.email || ''}
      />
    </>
  )
}
