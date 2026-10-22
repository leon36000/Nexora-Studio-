'use client'

import { useState } from 'react'
import { cn } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  AuthField,
  AuthFormMessage,
  AuthSubmitButton,
  PasswordInput,
} from '@/app/(auth)/components'

interface SetNewPasswordFormProps {
  token: string | null
  onSubmit: (password: string) => Promise<void> // i18n-ignore: type signature
  isSubmitting: boolean
  statusType: 'success' | 'error' | null
  statusMessage: string
  className?: string
}

export function SetNewPasswordForm({
  token,
  onSubmit,
  isSubmitting,
  statusType,
  statusMessage,
  className,
}: SetNewPasswordFormProps) {
  const t = useTranslations('auth.resetPassword.form')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationMessages, setValidationMessages] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: string[] = []

    if (password.length < 8) {
      errors.push(t('rules.minLength'))
    }

    if (password.length > 100) {
      errors.push(t('rules.maxLength'))
    }

    if (!/[A-Z]/.test(password)) {
      errors.push(t('rules.uppercase'))
    }

    if (!/[a-z]/.test(password)) {
      errors.push(t('rules.lowercase'))
    }

    if (!/[0-9]/.test(password)) {
      errors.push(t('rules.number'))
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push(t('rules.special'))
    }

    if (password !== confirmPassword) {
      errors.push(t('rules.mismatch'))
    }

    if (errors.length > 0) {
      setValidationMessages(errors)
      return
    }

    setValidationMessages([])
    onSubmit(password)
  }

  const hasValidationErrors = validationMessages.length > 0

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      <div className='space-y-5'>
        <AuthField htmlFor='password' label={t('newPasswordLabel')}>
          <PasswordInput
            id='password'
            autoCapitalize='none'
            autoComplete='new-password'
            autoCorrect='off'
            disabled={isSubmitting || !token}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('newPasswordPlaceholder')}
            error={hasValidationErrors}
          />
        </AuthField>
        <AuthField htmlFor='confirmPassword' label={t('confirmLabel')}>
          <PasswordInput
            id='confirmPassword'
            autoCapitalize='none'
            autoComplete='new-password'
            autoCorrect='off'
            disabled={isSubmitting || !token}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder={t('confirmPlaceholder')}
            error={hasValidationErrors}
          />
        </AuthField>

        {hasValidationErrors && (
          <AuthFormMessage type='error'>
            {validationMessages.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </AuthFormMessage>
        )}

        {statusType && statusMessage && (
          <AuthFormMessage type={statusType === 'success' ? 'success' : 'error'}>
            <p>{statusMessage}</p>
          </AuthFormMessage>
        )}
      </div>

      <AuthSubmitButton
        loading={isSubmitting}
        loadingLabel={t('submitting')}
        disabled={!token || password.length === 0 || confirmPassword.length === 0}
      >
        {t('submit')}
      </AuthSubmitButton>
    </form>
  )
}
