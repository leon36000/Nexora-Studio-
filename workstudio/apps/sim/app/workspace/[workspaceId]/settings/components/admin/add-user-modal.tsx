'use client'

import { useRef, useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { isValidEmailSyntax } from '@sim/utils/string'
import { useTranslations } from 'next-intl'
import { type AdminUser, useAddUser } from '@/hooks/queries/admin-users'

const EMAIL_STATUSES = ['verified', 'unverified'] as const

const PASSWORD_MODES = ['set', 'email'] as const

type PasswordMode = (typeof PASSWORD_MODES)[number]

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The account was created. `resetEmailError` is set when its provisioning
   * reset email could not be sent — the account still exists, so the host is
   * expected to surface the user (and report this) rather than treat it as a
   * failed create.
   */
  onCreated: (user: AdminUser, resetEmailError?: string) => void
}

export function AddUserModal({ open, onOpenChange, onCreated }: AddUserModalProps) {
  const t = useTranslations('settings.admin.addUserModal')
  const addUser = useAddUser()
  const submissionInFlightRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('set')
  const [password, setPassword] = useState('')
  const [emailVerified, setEmailVerified] = useState(true)

  const setsPassword = passwordMode === 'set'
  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  const nameError = name.length > 0 && !normalizedName ? t('nameRequired') : undefined
  const emailError =
    email.length > 0 && !isValidEmailSyntax(normalizedEmail) ? t('invalidEmail') : undefined
  const passwordError =
    password.length < 8 && password.length > 0 ? t('passwordTooShort') : undefined
  const isSubmissionPending = isSubmitting || addUser.isPending
  const canSubmit =
    normalizedName.length > 0 &&
    isValidEmailSyntax(normalizedEmail) &&
    (!setsPassword || password.length >= 8) &&
    !isSubmissionPending

  const reset = () => {
    setName('')
    setEmail('')
    setPasswordMode('set')
    setPassword('')
    setEmailVerified(true)
    addUser.reset()
  }

  const handleClose = () => {
    if (submissionInFlightRef.current || isSubmissionPending) return
    reset()
    onOpenChange(false)
  }

  const handleAddUser = () => {
    if (!canSubmit || submissionInFlightRef.current) return
    submissionInFlightRef.current = true
    setIsSubmitting(true)
    addUser.reset()
    addUser.mutate(
      {
        name: normalizedName,
        email: normalizedEmail,
        emailVerified,
        ...(setsPassword ? { password } : {}),
      },
      {
        onSuccess: ({ user, resetEmailError }) => {
          reset()
          onOpenChange(false)
          onCreated(user, resetEmailError)
        },
        onSettled: () => {
          submissionInFlightRef.current = false
          setIsSubmitting(false)
        },
      }
    )
  }

  return (
    <ChipModal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose()
      }}
      srTitle={t('title')}
    >
      <ChipModalHeader onClose={handleClose} closeDisabled={isSubmissionPending}>
        {t('title')}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={(value) => {
            setName(value)
            addUser.reset()
          }}
          error={nameError}
          placeholder={t('namePlaceholder')}
          maxLength={100}
          autoComplete='off'
          disabled={isSubmissionPending}
          required
        />
        <ChipModalField
          type='email'
          title={t('email')}
          value={email}
          onChange={(value) => {
            setEmail(value)
            addUser.reset()
          }}
          error={emailError}
          placeholder='writer@synthetics.example.com'
          autoComplete='off'
          disabled={isSubmissionPending}
          required
        />
        <ChipModalField
          type='dropdown'
          title={t('credentials')}
          value={passwordMode}
          onChange={(value) => {
            setPasswordMode(value as PasswordMode)
            addUser.reset()
          }}
          options={PASSWORD_MODES.map((value) => ({ value, label: t(`passwordModes.${value}`) }))}
          align='start'
          hint={setsPassword ? undefined : t('resetLinkHint')}
          disabled={isSubmissionPending}
          required
        />
        {setsPassword && (
          <ChipModalField
            type='input'
            inputType='password'
            title={t('password')}
            value={password}
            onChange={(value) => {
              setPassword(value)
              addUser.reset()
            }}
            error={passwordError}
            placeholder={t('passwordPlaceholder')}
            autoComplete='new-password'
            disabled={isSubmissionPending}
            required
          />
        )}
        <ChipModalField
          type='dropdown'
          title={t('emailStatus')}
          value={emailVerified ? 'verified' : 'unverified'}
          onChange={(value) => {
            setEmailVerified(value === 'verified')
            addUser.reset()
          }}
          options={EMAIL_STATUSES.map((value) => ({ value, label: t(`emailStatuses.${value}`) }))}
          align='start'
          hint={t('verifiedHint')}
          disabled={isSubmissionPending}
          required
        />
        <ChipModalError>
          {addUser.error ? getErrorMessage(addUser.error, t('addFailed')) : null}
        </ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={handleClose}
        cancelDisabled={isSubmissionPending}
        primaryAction={{
          label: isSubmissionPending ? t('adding') : t('submit'),
          onClick: handleAddUser,
          disabled: !canSubmit,
        }}
      />
    </ChipModal>
  )
}
