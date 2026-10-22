'use client'

import { Suspense, useState } from 'react'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { requestJson } from '@/lib/api/client/request'
import { resetPasswordContract } from '@/lib/api/contracts'
import { AuthHeader, AuthNavPrompt } from '@/app/(auth)/components'
import { SetNewPasswordForm } from '@/app/(auth)/reset-password/reset-password-form'

const logger = createLogger('ResetPasswordPage')

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth.resetPassword')
  const token = searchParams.get('token')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | null
    text: string
  }>({
    type: null,
    text: '',
  })

  const tokenError = !token ? t('invalidToken') : null

  const handleResetPassword = async (password: string) => {
    if (!token) return
    try {
      setIsSubmitting(true)
      setStatusMessage({ type: null, text: '' })

      await requestJson(resetPasswordContract, {
        body: {
          token,
          newPassword: password,
        },
      })

      setStatusMessage({
        type: 'success',
        text: t('success'),
      })

      setTimeout(() => {
        router.push('/login?resetSuccess=true')
      }, 1500)
    } catch (error) {
      logger.error('Error resetting password:', { error })
      setStatusMessage({
        type: 'error',
        text: getErrorMessage(error, t('failed')),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <AuthHeader title={t('title')} description={t('description')} />

      <SetNewPasswordForm
        token={token}
        onSubmit={handleResetPassword}
        isSubmitting={isSubmitting}
        statusType={tokenError ? 'error' : statusMessage.type}
        statusMessage={tokenError ?? statusMessage.text}
      />

      <AuthNavPrompt href='/login' linkLabel={t('backToLogin')} />
    </div>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword')
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[320px] items-center justify-center'>{t('loading')}</div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
