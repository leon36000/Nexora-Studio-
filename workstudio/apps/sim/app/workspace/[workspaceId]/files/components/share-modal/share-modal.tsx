'use client'

import { useState } from 'react'
import {
  Chip,
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  toast,
  useCopyToClipboard,
} from '@sim/emcn'
import { Check, Link, Send } from '@sim/emcn/icons'
import { generateShortId } from '@sim/utils/id'
import { useTranslations } from 'next-intl'
import { GeneratedPasswordInput } from '@/components/ui'
import type { ShareAuthType, ShareRecord } from '@/lib/api/contracts/public-shares'
import { useDeploymentShape } from '@/lib/core/config/deployment-shape'
import { validateAllowlistEntry } from '@/lib/messaging/email/validation'
import { useFileShare, useUpsertFileShare } from '@/hooks/queries/public-shares'
import { usePermissionConfig } from '@/hooks/use-permission-config'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  fileId: string
  fileName: string
  /** Share state already known from the file row, used as the initial value to avoid flicker. */
  initialShare?: ShareRecord | null
}

/** Message keys under `files.share`. */
const PRIMARY_ACTION_LABEL_KEYS = {
  share: { idle: 'actions.share', pending: 'actions.sharing' },
  update: { idle: 'actions.update', pending: 'actions.updating' },
  unshare: { idle: 'actions.unshare', pending: 'actions.unsharing' },
} as const

/** Stable identity so the emails field's reconcile effect no-ops while unset. */
const EMPTY_EMAILS: string[] = []

function savedMode(share: ShareRecord | null): ShareAuthType {
  return share?.authType ?? 'public'
}

export function ShareModal({
  open,
  onOpenChange,
  workspaceId,
  fileId,
  fileName,
  initialShare,
}: ShareModalProps) {
  const t = useTranslations('files.share')
  const {
    data: share,
    isError: isShareError,
    isFetchedAfterMount,
  } = useFileShare(workspaceId, fileId, { enabled: open })
  const { config: permissionConfig } = usePermissionConfig()
  const upsertShare = useUpsertFileShare()
  const { copied, copy } = useCopyToClipboard({ resetMs: 1500 })
  const { features } = useDeploymentShape()

  const shareReadReady = isFetchedAfterMount && !isShareError
  const saved = shareReadReady ? (share ?? null) : (share ?? initialShare ?? null)
  const savedAccessMode = savedMode(saved)

  const [draftMode, setDraftMode] = useState<ShareAuthType | null>(null)
  const [draftPassword, setDraftPassword] = useState('')
  const [draftEmails, setDraftEmails] = useState<string[] | null>(null)
  const [unshareConfirmOpen, setUnshareConfirmOpen] = useState(false)
  const effectiveMode = draftMode ?? savedAccessMode
  const effectiveEmails = draftEmails ?? saved?.allowedEmails ?? EMPTY_EMAILS

  const allowedAuthTypes = permissionConfig.allowedFileShareAuthTypes
  const isAuthTypeAllowed = (mode: ShareAuthType) =>
    allowedAuthTypes === null || allowedAuthTypes.includes(mode)

  const ssoEnabled = features.sso || savedAccessMode === 'sso'
  const candidateAuthTypes: ShareAuthType[] = [
    'public',
    'password',
    'email',
    ...(ssoEnabled ? (['sso'] as const) : []),
  ]
  const accessModes = candidateAuthTypes.filter(
    (mode) => isAuthTypeAllowed(mode) || mode === savedAccessMode
  )

  const modeDisallowed = !isAuthTypeAllowed(effectiveMode)
  const enableBlockedByPolicy =
    (permissionConfig.disablePublicFileSharing && !saved?.isActive) || modeDisallowed

  const passwordMissing =
    effectiveMode === 'password' && !saved?.hasPassword && draftPassword.trim().length === 0
  const emailsMissing =
    (effectiveMode === 'email' || effectiveMode === 'sso') && effectiveEmails.length === 0

  const emailsDirty =
    draftEmails !== null &&
    JSON.stringify(draftEmails) !== JSON.stringify(saved?.allowedEmails ?? [])
  const isDirty =
    (draftMode !== null && draftMode !== savedAccessMode) ||
    (effectiveMode === 'password' && draftPassword.length > 0) ||
    ((effectiveMode === 'email' || effectiveMode === 'sso') && emailsDirty)
  const primaryAction = saved?.isActive ? (isDirty ? 'update' : 'unshare') : 'share'
  const isUnshareAction = primaryAction === 'unshare'
  const primaryActionPending = upsertShare.isPending || (isUnshareAction && unshareConfirmOpen)
  const primaryLabel = t(
    PRIMARY_ACTION_LABEL_KEYS[primaryAction][primaryActionPending ? 'pending' : 'idle']
  )

  const resetDraft = () => {
    setDraftMode(null)
    setDraftPassword('')
    setDraftEmails(null)
  }

  const handleClose = () => {
    setUnshareConfirmOpen(false)
    resetDraft()
    onOpenChange(false)
  }

  const submitPrimaryAction = () => {
    if (!shareReadReady || upsertShare.isPending) return

    const base = { workspaceId, fileId, token: saved ? undefined : generateShortId() }
    const vars = isUnshareAction
      ? { ...base, isActive: false as const }
      : effectiveMode === 'password'
        ? {
            ...base,
            isActive: true as const,
            authType: 'password' as const,
            password: draftPassword.trim() || undefined,
          }
        : effectiveMode === 'email' || effectiveMode === 'sso'
          ? {
              ...base,
              isActive: true as const,
              authType: effectiveMode,
              allowedEmails: effectiveEmails,
            }
          : { ...base, isActive: true as const, authType: 'public' as const }

    upsertShare.mutate(vars, {
      onSuccess: () => {
        toast.success(t(`success.${primaryAction}`))
        setUnshareConfirmOpen(false)
        resetDraft()
      },
    })
  }

  const handlePrimaryAction = () => {
    if (isUnshareAction) {
      setUnshareConfirmOpen(true)
      return
    }
    submitPrimaryAction()
  }

  const accessHint = (() => {
    if (isShareError) return t('hints.loadError')
    if (modeDisallowed) return t('hints.modeDisallowed')
    if (enableBlockedByPolicy) return t('hints.publicDisabled')
    if (effectiveMode === 'password') return t('hints.password')
    if (effectiveMode === 'email') return t('hints.email')
    if (effectiveMode === 'sso') return t('hints.sso')
    if (saved?.isActive && !isDirty) return t('hints.publicActive')
    return saved?.isActive ? t('hints.publicUpdate') : t('hints.publicShare')
  })()

  return (
    <>
      <ChipModal
        open={open}
        onOpenChange={handleClose}
        size='sm'
        srTitle={t('srTitle', { name: fileName })}
        dismissDisabled={upsertShare.isPending}
      >
        <ChipModalHeader icon={Send} onClose={handleClose}>
          {t('title')}
        </ChipModalHeader>
        <ChipModalBody>
          <ChipModalField type='custom' title={t('accessTitle')} hint={accessHint}>
            <ChipButtonGroup
              value={effectiveMode}
              onValueChange={(value) => setDraftMode(value as ShareAuthType)}
              aria-label={t('accessAriaLabel')}
              disabled={upsertShare.isPending}
            >
              {accessModes.map((mode) => (
                <ChipButtonGroupItem key={mode} value={mode}>
                  {t(`access.${mode}`)}
                </ChipButtonGroupItem>
              ))}
            </ChipButtonGroup>
          </ChipModalField>
          {effectiveMode === 'password' ? (
            <ChipModalField
              type='custom'
              title={t('passwordTitle')}
              hint={saved?.hasPassword ? t('passwordKeepHint') : t('passwordRequiredHint')}
            >
              <GeneratedPasswordInput
                value={draftPassword}
                onChange={setDraftPassword}
                placeholder={saved?.hasPassword ? '••••••••' : t('passwordPlaceholder')}
                disabled={upsertShare.isPending}
              />
            </ChipModalField>
          ) : null}
          {effectiveMode === 'email' || effectiveMode === 'sso' ? (
            <ChipModalField
              type='emails'
              title={t('emailsTitle')}
              value={effectiveEmails}
              onChange={setDraftEmails}
              validate={validateAllowlistEntry}
              allowDomains
              placeholder={t('emailsPlaceholder')}
              placeholderWithTags={t('emailsPlaceholderWithTags')}
              disabled={upsertShare.isPending}
            />
          ) : null}
        </ChipModalBody>
        <ChipModalFooter
          onCancel={handleClose}
          defaultAction={isUnshareAction ? 'none' : 'primary'}
          secondaryActions={
            saved?.isActive && saved.url
              ? [
                  {
                    custom: (
                      <Chip leftIcon={copied ? Check : Link} onClick={() => copy(saved.url)}>
                        {copied ? t('copied') : t('copyLink')}
                      </Chip>
                    ),
                  },
                ]
              : undefined
          }
          primaryAction={{
            label: primaryLabel,
            onClick: handlePrimaryAction,
            variant: isUnshareAction ? 'destructive' : 'primary',
            disabled:
              upsertShare.isPending ||
              !shareReadReady ||
              (!isUnshareAction && (passwordMissing || emailsMissing || enableBlockedByPolicy)),
          }}
        />
      </ChipModal>
      <ChipConfirmModal
        open={open && unshareConfirmOpen}
        onOpenChange={setUnshareConfirmOpen}
        title={t('unshareConfirm.title')}
        text={t('unshareConfirm.text')}
        confirm={{
          label: t('actions.unshare'),
          onClick: submitPrimaryAction,
          pending: upsertShare.isPending,
          pendingLabel: t('actions.unsharing'),
        }}
      />
    </>
  )
}
