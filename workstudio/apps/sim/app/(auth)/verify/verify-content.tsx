'use client'

import { Suspense, useEffect, useState } from 'react'
import { cn, InputOTP, InputOTPGroup, InputOTPSlot } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { POST_AUTH_REDIRECT_STORAGE_KEY } from '@/app/(auth)/auth-redirect'
import {
  AuthFormMessage,
  AuthHeader,
  AuthNavPrompt,
  AuthSubmitButton,
  AuthTextLink,
} from '@/app/(auth)/components'
import { useVerification } from '@/app/(auth)/verify/use-verification'

interface VerifyContentProps {
  hasEmailService: boolean
  isProduction: boolean
  isEmailVerificationEnabled: boolean
}

const OTP_SLOTS = [0, 1, 2, 3, 4, 5] as const

function VerificationForm({
  hasEmailService,
  isProduction,
  isEmailVerificationEnabled,
}: {
  hasEmailService: boolean
  isProduction: boolean
  isEmailVerificationEnabled: boolean
}) {
  const {
    otp,
    email,
    status,
    isResending,
    errorMessage,
    isOtpComplete,
    verifyCode,
    resendCode,
    handleOtpChange,
  } = useVerification({ hasEmailService, isProduction, isEmailVerificationEnabled })
  const t = useTranslations('auth.verify')

  const isVerified = status === 'verified'
  const isLoading = status === 'verifying' || isResending
  const isInvalidOtp = status === 'error'

  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleResend = () => {
    resendCode()
    setCountdown(30)
  }

  return (
    <div className='space-y-6'>
      <AuthHeader
        title={isVerified ? t('titleVerified') : t('title')}
        description={
          isVerified
            ? t('verifiedDescription')
            : !isEmailVerificationEnabled
              ? t('disabledDescription')
              : hasEmailService
                ? email
                  ? t('codeSentTo', { email })
                  : t('codeSentToYourEmail')
                : !isProduction
                  ? t('devMode')
                  : t('noEmailService')
        }
      />

      {!isVerified && isEmailVerificationEnabled && (
        <div className='space-y-6'>
          <div className='space-y-5'>
            <p className='text-center text-[var(--text-muted)] text-sm'>
              {hasEmailService ? t('enterCodeWithSpamHint') : t('enterCode')}
            </p>

            <div className='flex justify-center'>
              <InputOTP maxLength={6} value={otp} onChange={handleOtpChange} disabled={isLoading}>
                <InputOTPGroup>
                  {OTP_SLOTS.map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={cn(isInvalidOtp && 'border-[var(--text-error)]')}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {errorMessage && (
              <AuthFormMessage type='error' align='center'>
                <p>{errorMessage}</p>
              </AuthFormMessage>
            )}
          </div>

          <AuthSubmitButton
            type='button'
            onClick={verifyCode}
            loading={isLoading}
            loadingLabel={t('submitting')}
            disabled={!isOtpComplete}
          >
            {t('submit')}
          </AuthSubmitButton>

          {hasEmailService && (
            <p className='text-center text-[var(--text-muted)] text-sm'>
              {t('noCode')}{' '}
              {countdown > 0 ? (
                <span>
                  {t.rich('resendIn', {
                    seconds: countdown,
                    highlight: (chunks) => (
                      <span className='text-[var(--text-primary)]'>{chunks}</span>
                    ),
                  })}
                </span>
              ) : (
                <AuthTextLink onClick={handleResend} disabled={isLoading}>
                  {t('resend')}
                </AuthTextLink>
              )}
            </p>
          )}

          <AuthNavPrompt
            href='/signup'
            linkLabel={t('backToSignup')}
            onNavigate={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('verificationEmail')
                sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

function VerificationFormFallback() {
  return (
    <div className='text-center'>
      <div className='animate-pulse'>
        <div className='mx-auto mb-4 h-8 w-48 rounded bg-[var(--surface-4)]' />
        <div className='mx-auto h-4 w-64 rounded bg-[var(--surface-4)]' />
      </div>
    </div>
  )
}

export function VerifyContent({
  hasEmailService,
  isProduction,
  isEmailVerificationEnabled,
}: VerifyContentProps) {
  return (
    <Suspense fallback={<VerificationFormFallback />}>
      <VerificationForm
        hasEmailService={hasEmailService}
        isProduction={isProduction}
        isEmailVerificationEnabled={isEmailVerificationEnabled}
      />
    </Suspense>
  )
}
