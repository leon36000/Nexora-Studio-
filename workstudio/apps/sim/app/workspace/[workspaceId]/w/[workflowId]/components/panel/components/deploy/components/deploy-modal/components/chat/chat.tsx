'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipConfirmModal,
  ChipEmailsInput,
  ChipInput,
  cn,
  Input,
  Label,
  Loader,
  Skeleton,
  Switch,
  Textarea,
  Tooltip,
} from '@sim/emcn'
import { Check, TriangleAlert } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { GeneratedPasswordInput } from '@/components/ui'
import { buildChatDeploymentUrl } from '@/lib/chat-deployments/urls'
import { useDeploymentShape } from '@/lib/core/config/deployment-shape'
import { validateAllowlistEntry } from '@/lib/messaging/email/validation'
import { formatInternalOutputSelector } from '@/lib/workflows/streaming/output-selector'
import { OutputSelect } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/chat/components/output-select/output-select'
import {
  type AuthType,
  type ChatFormData,
  useCreateChat,
  useDeleteChat,
  useRevealChatPassword,
  useUpdateChat,
} from '@/hooks/queries/chats'
import type { ChatDetail } from '@/hooks/queries/deployments'
import { usePermissionConfig } from '@/hooks/use-permission-config'
import { useIdentifierValidation } from './hooks'
import {
  getPasswordHelperTextKey,
  getPasswordPlaceholderKey,
  hasExistingPassword,
  isPasswordRequired,
  isWhitespaceOnlyPassword,
  shouldConfirmPasswordChange,
} from './utils'

const logger = createLogger('ChatDeploy')

const IDENTIFIER_PATTERN = /^[a-z0-9-]+$/

interface ChatDeployProps {
  workflowId: string
  existingChat: ExistingChat | null
  isLoadingChat: boolean
  onRefetchChat: () => Promise<void> // i18n-ignore: type signature
  chatSubmitting: boolean
  setChatSubmitting: (submitting: boolean) => void
  canRevealPassword: boolean
  onValidationChange?: (isValid: boolean) => void
  showDeleteConfirmation?: boolean
  setShowDeleteConfirmation?: (show: boolean) => void
  onDeploymentComplete?: () => void
  onDeployed?: () => void
  onVersionActivated?: () => void
}

export type ExistingChat = ChatDetail

interface FormErrors {
  identifier?: string
  title?: string
  password?: string
  emails?: string
  outputBlocks?: string
  general?: string
}

const INITIAL_FORM_DATA: Omit<ChatFormData, 'welcomeMessage'> = {
  identifier: '',
  title: '',
  description: '',
  authType: 'public',
  password: '',
  emails: [],
  selectedOutputBlocks: [],
  includeThinking: false,
  includeToolCalls: false,
}

export function ChatDeploy({
  workflowId,
  existingChat,
  isLoadingChat,
  onRefetchChat,
  chatSubmitting,
  setChatSubmitting,
  canRevealPassword,
  onValidationChange,
  showDeleteConfirmation: externalShowDeleteConfirmation,
  setShowDeleteConfirmation: externalSetShowDeleteConfirmation,
  onDeploymentComplete,
  onDeployed,
  onVersionActivated,
}: ChatDeployProps) {
  const t = useTranslations('editor.deploy.chat')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [internalShowDeleteConfirmation, setInternalShowDeleteConfirmation] = useState(false)
  const [showPasswordChangeConfirmation, setShowPasswordChangeConfirmation] = useState(false)

  const showDeleteConfirmation =
    externalShowDeleteConfirmation !== undefined
      ? externalShowDeleteConfirmation
      : internalShowDeleteConfirmation

  const setShowDeleteConfirmation =
    externalSetShowDeleteConfirmation || setInternalShowDeleteConfirmation

  const [formData, setFormData] = useState<ChatFormData>(() => ({
    ...INITIAL_FORM_DATA,
    welcomeMessage: t('defaultWelcomeMessage'),
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const [formInitCounter, setFormInitCounter] = useState(0)

  const createChatMutation = useCreateChat()
  const updateChatMutation = useUpdateChat()
  const deleteChatMutation = useDeleteChat()
  const [isIdentifierValid, setIsIdentifierValid] = useState(false)
  const hasInitializedFormRef = useRef(false)
  const existingPassword = hasExistingPassword(existingChat)

  const updateField = <K extends keyof ChatFormData>(field: K, value: ChatFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const setError = (field: keyof FormErrors, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.identifier.trim()) {
      newErrors.identifier = t('errors.identifierRequired')
    } else if (!IDENTIFIER_PATTERN.test(formData.identifier)) {
      newErrors.identifier = t('identifier.invalidPattern')
    }

    if (!formData.title.trim()) {
      newErrors.title = t('errors.titleRequired')
    }

    if (isPasswordRequired(formData.authType, formData.password, existingPassword)) {
      newErrors.password = t('errors.passwordRequired')
    } else if (formData.authType === 'password' && isWhitespaceOnlyPassword(formData.password)) {
      newErrors.password = t('errors.passwordWhitespace')
    }

    if (
      (formData.authType === 'email' || formData.authType === 'sso') &&
      formData.emails.length === 0
    ) {
      newErrors.emails =
        formData.authType === 'sso' ? t('errors.emailsRequiredSso') : t('errors.emailsRequired')
    }

    if (formData.selectedOutputBlocks.length === 0) {
      newErrors.outputBlocks = t('errors.outputRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid =
    isIdentifierValid &&
    Boolean(formData.title.trim()) &&
    formData.selectedOutputBlocks.length > 0 &&
    !isPasswordRequired(formData.authType, formData.password, existingPassword) &&
    (formData.authType !== 'password' || !isWhitespaceOnlyPassword(formData.password)) &&
    ((formData.authType !== 'email' && formData.authType !== 'sso') || formData.emails.length > 0)

  useEffect(() => {
    onValidationChange?.(isFormValid)
  }, [isFormValid, onValidationChange])

  useEffect(() => {
    if (existingChat && !hasInitializedFormRef.current) {
      setFormData({
        identifier: existingChat.identifier || '',
        title: existingChat.title || '',
        description: existingChat.description || '',
        authType: existingChat.authType || 'public',
        password: '',
        emails: Array.isArray(existingChat.allowedEmails) ? [...existingChat.allowedEmails] : [],
        welcomeMessage: existingChat.customizations?.welcomeMessage || t('defaultWelcomeMessage'),
        selectedOutputBlocks: Array.isArray(existingChat.outputConfigs)
          ? existingChat.outputConfigs.map(
              (config: { workflowId?: string; blockId: string; path: string }) =>
                formatInternalOutputSelector(config.blockId, config.path, config.workflowId)
            )
          : [],
        includeThinking: existingChat.includeThinking ?? false,
        includeToolCalls: existingChat.includeToolCalls ?? false,
      })

      if (existingChat.customizations?.imageUrl) {
        setImageUrl(existingChat.customizations.imageUrl)
      }

      hasInitializedFormRef.current = true
    } else if (!existingChat && !isLoadingChat) {
      setFormData({ ...INITIAL_FORM_DATA, welcomeMessage: t('defaultWelcomeMessage') })
      setImageUrl(null)
      hasInitializedFormRef.current = false
    }
  }, [existingChat, isLoadingChat, t])

  const submitChat = async (passwordChangeConfirmed = false) => {
    if (chatSubmitting) return

    setChatSubmitting(true)

    const isNewChat = !existingChat?.id

    const newTab = isNewChat ? window.open('', '_blank') : null

    try {
      if (!validateForm()) {
        newTab?.close()
        return
      }

      if (!isIdentifierValid && formData.identifier !== existingChat?.identifier) {
        newTab?.close()
        setError('identifier', t('errors.identifierPending'))
        return
      }

      if (
        !passwordChangeConfirmed &&
        shouldConfirmPasswordChange(existingPassword, formData.authType, formData.password)
      ) {
        setShowPasswordChangeConfirmation(true)
        return
      }

      let chatUrl: string

      if (existingChat?.id) {
        const result = await updateChatMutation.mutateAsync({
          chatId: existingChat.id,
          workflowId,
          formData,
          imageUrl,
        })
        chatUrl = result.chatUrl
      } else {
        const result = await createChatMutation.mutateAsync({
          workflowId,
          formData,
          imageUrl,
        })
        chatUrl = result.chatUrl
      }

      onDeployed?.()
      onVersionActivated?.()

      if (newTab && chatUrl) {
        newTab.opener = null
        newTab.location.href = chatUrl
      } else if (newTab) {
        newTab.close()
      }

      hasInitializedFormRef.current = false
      await onRefetchChat()
      setFormInitCounter((c) => c + 1)
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      newTab?.close()
      if (message.includes('identifier')) {
        setError('identifier', message)
      } else {
        setError('general', message)
      }
    } finally {
      setChatSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await submitChat()
  }

  const handleDelete = async () => {
    if (!existingChat || !existingChat.id) return

    try {
      await deleteChatMutation.mutateAsync({
        chatId: existingChat.id,
        workflowId,
      })

      setImageUrl(null)
      hasInitializedFormRef.current = false
      setFormInitCounter((c) => c + 1)
      await onRefetchChat()

      onDeploymentComplete?.()
    } catch (error: unknown) {
      logger.error('Failed to delete chat:', error)
      setError('general', getErrorMessage(error) || t('errors.deleteFailed'))
    } finally {
      setShowDeleteConfirmation(false)
    }
  }

  const handleConfirmPasswordChange = async () => {
    setShowPasswordChangeConfirmation(false)
    await submitChat(true)
  }

  if (isLoadingChat) {
    return <LoadingSkeleton />
  }

  return (
    <>
      <form
        id='chat-deploy-form'
        ref={formRef}
        onSubmit={handleSubmit}
        className='-mx-1 space-y-4 px-1'
      >
        {errors.general && (
          <div className='flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--text-error)_20%,transparent)] bg-[color-mix(in_srgb,var(--text-error)_10%,transparent)] px-3 py-2 text-[var(--text-error)] text-small'>
            <TriangleAlert className='size-4 shrink-0' />
            <span>{errors.general}</span>
          </div>
        )}

        <div className='space-y-3'>
          <IdentifierInput
            value={formData.identifier}
            onChange={(value) => updateField('identifier', value)}
            originalIdentifier={existingChat?.identifier || undefined}
            disabled={chatSubmitting}
            onValidationChange={setIsIdentifierValid}
            isEditingExisting={!!existingChat}
          />

          <div>
            <Label htmlFor='title' className='mb-[6.5px] block pl-0.5 text-small'>
              {t('title')}
            </Label>
            <ChipInput
              id='title'
              placeholder={t('titlePlaceholder')}
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
              disabled={chatSubmitting}
            />
            {errors.title && (
              <p className='mt-[6.5px] text-[var(--text-error)] text-caption'>{errors.title}</p>
            )}
          </div>

          <div>
            <Label className='mb-[6.5px] block pl-0.5 text-small'>{t('output')}</Label>
            <OutputSelect
              workflowId={workflowId}
              selectedOutputs={formData.selectedOutputBlocks}
              onOutputSelect={(values) => updateField('selectedOutputBlocks', values)}
              placeholder={t('outputPlaceholder')}
              disabled={chatSubmitting}
              size='md'
              variant='chip'
              className='w-full'
              disablePortal
            />
            {errors.outputBlocks && (
              <p className='mt-[6.5px] text-[var(--text-error)] text-caption'>
                {errors.outputBlocks}
              </p>
            )}
          </div>

          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <Label className='block pl-0.5 text-small'>{t('includeThinking')}</Label>
            </div>
            <Switch
              checked={formData.includeThinking}
              disabled={chatSubmitting}
              onCheckedChange={(checked) => updateField('includeThinking', checked)}
              aria-label={t('includeThinking')}
            />
          </div>

          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <Label className='block pl-0.5 text-small'>{t('includeToolCalls')}</Label>
            </div>
            <Switch
              checked={formData.includeToolCalls}
              disabled={chatSubmitting}
              onCheckedChange={(checked) => updateField('includeToolCalls', checked)}
              aria-label={t('includeToolCalls')}
            />
          </div>

          <AuthSelector
            key={`${existingChat?.id ?? 'new'}-${formInitCounter}`}
            chatId={existingChat?.id ?? null}
            canRevealPassword={canRevealPassword}
            authType={formData.authType}
            savedAuthType={existingChat?.authType as AuthType | undefined}
            password={formData.password}
            emails={formData.emails}
            onAuthTypeChange={(type) => updateField('authType', type)}
            onPasswordChange={(password) => updateField('password', password)}
            onEmailsChange={(emails) => updateField('emails', emails)}
            disabled={chatSubmitting}
            hasExistingPassword={existingPassword}
            error={errors.password || errors.emails}
          />
          <div>
            <Label htmlFor='welcomeMessage' className='mb-[6.5px] block pl-0.5 text-small'>
              {t('welcomeMessage')}
            </Label>
            <Textarea
              id='welcomeMessage'
              placeholder={t('welcomeMessagePlaceholder')}
              value={formData.welcomeMessage}
              onChange={(e) => updateField('welcomeMessage', e.target.value)}
              rows={3}
              disabled={chatSubmitting}
              className='min-h-[80px] resize-none'
            />
            <p className='mt-[6.5px] text-[var(--text-secondary)] text-xs'>
              {t('welcomeMessageHint')}
            </p>
          </div>

          <button
            type='button'
            data-delete-trigger
            onClick={() => setShowDeleteConfirmation(true)}
            className='hidden'
          />
        </div>
      </form>

      <ChipConfirmModal
        open={showPasswordChangeConfirmation}
        onOpenChange={setShowPasswordChangeConfirmation}
        srTitle={t('passwordChange.srTitle')}
        title={t('passwordChange.title')}
        text={t('passwordChange.text')}
        confirm={{
          label: t('passwordChange.confirm'),
          onClick: handleConfirmPasswordChange,
          variant: 'primary',
          pending: chatSubmitting,
          pendingLabel: t('passwordChange.pending'),
        }}
      />

      <ChipConfirmModal
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        srTitle={t('deleteConfirm.title')}
        title={t('deleteConfirm.title')}
        text={[
          t('deleteConfirm.prefix'),
          { text: existingChat?.title || t('deleteConfirm.fallbackName'), bold: true },
          t('deleteConfirm.suffix'),
          {
            text: t('deleteConfirm.warning', {
              url: buildChatDeploymentUrl(existingChat?.identifier ?? '').replace(
                /^https?:\/\//,
                ''
              ),
            }),
            error: true,
          },
          t('deleteConfirm.irreversible'),
        ]}
        confirm={{
          label: t('deleteConfirm.confirm'),
          onClick: handleDelete,
          pending: deleteChatMutation.isPending,
          pendingLabel: t('deleteConfirm.pending'),
        }}
      />
    </>
  )
}

function LoadingSkeleton() {
  return (
    <div className='-mx-1 space-y-4 px-1'>
      <div className='space-y-3'>
        <div>
          <Skeleton className='mb-[6.5px] h-[16px] w-[26px]' />
          <Skeleton className='h-[34px] w-full rounded-sm' />
          <Skeleton className='mt-[6.5px] h-[14px] w-[320px]' />
        </div>
        <div>
          <Skeleton className='mb-[6.5px] h-[16px] w-[30px]' />
          <Skeleton className='h-[34px] w-full rounded-sm' />
        </div>
        <div>
          <Skeleton className='mb-[6.5px] h-[16px] w-[46px]' />
          <Skeleton className='h-[34px] w-full rounded-sm' />
        </div>
        <div>
          <Skeleton className='mb-[6.5px] h-[16px] w-[95px]' />
          <Skeleton className='h-[28px] w-[170px] rounded-sm' />
        </div>
        <div>
          <Skeleton className='mb-[6.5px] h-[16px] w-[115px]' />
          <Skeleton className='h-[80px] w-full rounded-sm' />
          <Skeleton className='mt-[6.5px] h-[14px] w-[340px]' />
        </div>
      </div>
    </div>
  )
}

interface IdentifierInputProps {
  value: string
  onChange: (value: string) => void
  originalIdentifier?: string
  disabled?: boolean
  onValidationChange?: (isValid: boolean) => void
  isEditingExisting?: boolean
}

const getDomainPrefix = (() => {
  const prefix = buildChatDeploymentUrl('').replace(/^https?:\/\//, '')
  return () => prefix
})()

function IdentifierInput({
  value,
  onChange,
  originalIdentifier,
  disabled = false,
  onValidationChange,
  isEditingExisting = false,
}: IdentifierInputProps) {
  const t = useTranslations('editor.deploy.chat.identifier')
  const { isChecking, error, isValid } = useIdentifierValidation(
    value,
    originalIdentifier,
    isEditingExisting
  )

  useEffect(() => {
    onValidationChange?.(isValid)
  }, [isValid, onValidationChange])

  const handleChange = (newValue: string) => {
    const lowercaseValue = newValue.toLowerCase()
    onChange(lowercaseValue)
  }

  const fullUrl = buildChatDeploymentUrl(value)
  const displayUrl = fullUrl.replace(/^https?:\/\//, '')

  return (
    <div>
      <Label htmlFor='chat-url' className='mb-[6.5px] block pl-0.5 text-small'>
        URL
      </Label>
      <div
        className={cn(
          'relative flex items-stretch overflow-hidden rounded-sm border border-[var(--border-1)] bg-[var(--surface-5)]',
          error && 'border-[var(--text-error)]'
        )}
      >
        <div className='flex items-center whitespace-nowrap bg-[var(--surface-5)] pr-1.5 pl-2 text-[var(--text-secondary)] text-sm'>
          {getDomainPrefix()}
        </div>
        <div className='relative flex-1'>
          <Input
            id='chat-url'
            placeholder='my-chat'
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            required
            disabled={disabled}
            className={cn(
              'rounded-none border-0 bg-transparent pl-0 shadow-none disabled:bg-transparent disabled:opacity-100',
              (isChecking || (isValid && value)) && 'pr-8'
            )}
          />
          {isChecking ? (
            <div className='-translate-y-1/2 absolute top-1/2 right-2'>
              <Loader className='size-4 text-[var(--text-tertiary)]' animate />
            </div>
          ) : (
            isValid &&
            value &&
            value !== originalIdentifier && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className='-translate-y-1/2 absolute top-1/2 right-2'>
                    <Check className='size-4 text-[var(--brand-accent)]' />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <span>{t('available')}</span>
                </Tooltip.Content>
              </Tooltip.Root>
            )
          )}
        </div>
      </div>
      {error && <p className='mt-[6.5px] text-[var(--text-error)] text-caption'>{error}</p>}
      <p className='mt-[6.5px] truncate text-[var(--text-secondary)] text-xs'>
        {isEditingExisting && value ? (
          <>
            {t('liveAt')}{' '}
            <a
              href={fullUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='text-[var(--text-primary)] hover-hover:underline'
            >
              {displayUrl}
            </a>
          </>
        ) : (
          t('hint')
        )}
      </p>
    </div>
  )
}

interface AuthSelectorProps {
  chatId: string | null
  canRevealPassword: boolean
  authType: AuthType
  /** The persisted mode of an existing chat, kept selectable even if newly disallowed. */
  savedAuthType?: AuthType
  password: string
  emails: string[]
  onAuthTypeChange: (type: AuthType) => void
  onPasswordChange: (password: string) => void
  onEmailsChange: (emails: string[]) => void
  disabled?: boolean
  hasExistingPassword?: boolean
  error?: string
}

function AuthSelector({
  chatId,
  canRevealPassword,
  authType,
  savedAuthType,
  password,
  emails,
  onAuthTypeChange,
  onPasswordChange,
  onEmailsChange,
  disabled = false,
  hasExistingPassword = false,
  error,
}: AuthSelectorProps) {
  const t = useTranslations('editor.deploy.chat.auth')
  const revealPasswordMutation = useRevealChatPassword()
  const { features } = useDeploymentShape()

  /**
   * Editing or regenerating the password clears a failed reveal. The mutation
   * only drops its error on the next attempt, so it would otherwise keep
   * reporting a stale failure over a field the admin has already moved on from.
   */
  const handlePasswordChange = (value: string) => {
    if (revealPasswordMutation.isError) revealPasswordMutation.reset()
    onPasswordChange(value)
  }

  const { config: permissionConfig } = usePermissionConfig()
  const allowedAuthTypes = permissionConfig.allowedChatDeployAuthTypes

  const ssoAvailable =
    features.sso || savedAuthType === 'sso' || (allowedAuthTypes?.includes('sso') ?? false)
  // Nexora edition: « Membres de l'espace » first — the safe choice for an internal agent.
  const baseAuthOptions: AuthType[] = ssoAvailable
    ? ['workspace', 'public', 'password', 'email', 'sso']
    : ['workspace', 'public', 'password', 'email']

  const authOptions = baseAuthOptions.filter(
    (type) =>
      allowedAuthTypes === null ||
      // Members only is stricter than any mode a permission group can allow.
      type === 'workspace' ||
      allowedAuthTypes.some((allowed) => allowed === type) ||
      type === savedAuthType
  )

  useEffect(() => {
    if (authOptions.length > 0 && !authOptions.includes(authType)) {
      onAuthTypeChange(authOptions[0])
    }
  }, [authOptions, authType, onAuthTypeChange])

  return (
    <div className='space-y-4'>
      <div>
        <Label className='mb-[6.5px] block pl-0.5 text-small'>{t('accessControl')}</Label>
        <ChipButtonGroup
          value={authType}
          onValueChange={(val) => onAuthTypeChange(val as AuthType)}
          disabled={disabled}
        >
          {authOptions.map((type) => (
            <ChipButtonGroupItem key={type} value={type}>
              {t(`types.${type}`)}
            </ChipButtonGroupItem>
          ))}
        </ChipButtonGroup>
      </div>

      {authType === 'password' && (
        <div>
          <Label className='mb-[6.5px] block pl-0.5 text-small'>{t('password')}</Label>
          <GeneratedPasswordInput
            value={password}
            onChange={handlePasswordChange}
            disabled={disabled}
            placeholder={hasExistingPassword ? '' : t(getPasswordPlaceholderKey(false))}
            required={!hasExistingPassword}
            fetchCurrentPassword={
              canRevealPassword && chatId && hasExistingPassword
                ? () => revealPasswordMutation.mutateAsync({ chatId })
                : undefined
            }
          />
          {canRevealPassword && revealPasswordMutation.isError && (
            <p className='mt-[6.5px] text-[var(--text-error)] text-caption'>{t('revealFailed')}</p>
          )}
          <p className='mt-[6.5px] text-[var(--text-secondary)] text-xs'>
            {t(getPasswordHelperTextKey(hasExistingPassword))}
          </p>
        </div>
      )}

      {(authType === 'email' || authType === 'sso') && (
        <div>
          <Label className='mb-[6.5px] block pl-0.5 text-small'>
            {authType === 'email' ? t('allowedEmails') : t('allowedSsoEmails')}
          </Label>
          <ChipEmailsInput
            value={emails}
            onChange={onEmailsChange}
            validate={validateAllowlistEntry}
            allowDomains
            placeholder={t('emailsPlaceholder')}
            placeholderWithTags={t('emailsPlaceholderWithTags')}
            disabled={disabled}
          />
        </div>
      )}

      {error && <p className='mt-[6.5px] text-[var(--text-error)] text-caption'>{error}</p>}
    </div>
  )
}
