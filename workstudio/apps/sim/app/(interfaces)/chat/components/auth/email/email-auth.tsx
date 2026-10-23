'use client'

import { useEffect, useState } from 'react'
import { cn, Input, InputOTP, InputOTPGroup, InputOTPSlot, Label } from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { toError } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { AuthSubmitButton, AuthTextLink } from '@/app/(auth)/components'
import { useEmailFieldValidation } from '@/app/(auth)/components/use-email-field-validation'
import { useChatEmailOtpRequest, useChatEmailOtpVerify } from '@/hooks/queries/chats'

const logger = createLogger('EmailAuth')

interface EmailAuthProps {
  identifier: string
}

export default function EmailAuth({ identifier }: EmailAuthProps) {
  const t = useTranslations('interfaces.chat.email')
  const validateEmailField = useEmailFieldValidation()
  const [email, setEmail] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [emailErrors, setEmailErrors] = useState<string[]>([])
  const hasEmailError = emailErrors.length > 0

  const [showOtpVerification, setShowOtpVerification] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [countdown, setCountdown] = useState(0)

  const requestOtp = useChatEmailOtpRequest(identifier)
  const verifyOtp = useChatEmailOtpVerify(identifier)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    setEmailErrors([])
  }

  const handleSendOtp = async () => {
    const emailValidationErrors = validateEmailField(email)
    setEmailErrors(emailValidationErrors)

    if (emailValidationErrors.length > 0) {
      return
    }

    setAuthError(null)

    try {
      await requestOtp.mutateAsync({ email })
      setShowOtpVerification(true)
    } catch (error) {
      logger.error('Error sending OTP:', error)
      setEmailErrors([toError(error).message || t('sendFailed')])
    }
  }

  const handleVerifyOtp = async (otp?: string) => {
    const codeToVerify = otp || otpValue

    if (!codeToVerify || codeToVerify.length !== 6) {
      return
    }

    setAuthError(null)

    try {
      await verifyOtp.mutateAsync({ email, otp: codeToVerify })
    } catch (error) {
      logger.error('Error verifying OTP:', error)
      setAuthError(toError(error).message || t('invalidCode'))
    }
  }

  const handleResendOtp = async () => {
    setAuthError(null)
    setCountdown(30)

    try {
      await requestOtp.mutateAsync({ email })
      setOtpValue('')
    } catch (error) {
      logger.error('Error resending OTP:', error)
      setAuthError(toError(error).message || t('resendFailed'))
      setCountdown(0)
    }
  }

  return (
    <div className='flex flex-1 items-center justify-center px-4 py-16'>
      <div className='w-full max-w-[410px]'>
        <div className='flex flex-col items-center justify-center'>
          <div className='space-y-1 text-center'>
            <h1 className='text-balance text-[40px] text-[var(--text-primary)] leading-[110%] tracking-[-0.02em]'>
              {showOtpVerification ? t('titleVerify') : t('title')}
            </h1>
            <p className='text-[color-mix(in_srgb,var(--text-muted)_60%,transparent)] text-lg leading-[125%] tracking-[0.02em]'>
              {showOtpVerification ? t('codeSent', { email }) : t('description')}
            </p>
          </div>

          <div className='mt-8 w-full max-w-[410px]'>
            {!showOtpVerification ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendOtp()
                }}
                className='space-y-6'
              >
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor='email'>{t('label')}</Label>
                  </div>
                  <Input
                    id='email'
                    name='email'
                    placeholder={t('placeholder')}
                    required
                    autoCapitalize='none'
                    autoComplete='email'
                    autoCorrect='off'
                    value={email}
                    onChange={handleEmailChange}
                    className={cn(
                      hasEmailError && 'border-[var(--text-error)] focus:border-[var(--text-error)]'
                    )}
                  />
                  {hasEmailError && (
                    <div className='mt-1 space-y-1 text-[var(--text-error)] text-xs'>
                      {emailErrors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  )}
                </div>

                <AuthSubmitButton
                  type='submit'
                  loading={requestOtp.isPending}
                  loadingLabel={t('sending')}
                >
                  {t('submit')}
                </AuthSubmitButton>
              </form>
            ) : (
              <div className='space-y-6'>
                <p className='text-center text-[var(--text-muted)] text-sm'>{t('enterCode')}</p>

                <div className='flex justify-center'>
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(value) => {
                      setOtpValue(value)
                      if (value.length === 6) {
                        handleVerifyOtp(value)
                      }
                    }}
                    disabled={verifyOtp.isPending}
                    className={cn('gap-2', authError && 'otp-error')}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className={cn(authError && 'border-[var(--text-error)]')}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {authError && (
                  <div className='mt-1 space-y-1 text-center text-[var(--text-error)] text-xs'>
                    <p>{authError}</p>
                  </div>
                )}

                <AuthSubmitButton
                  onClick={() => handleVerifyOtp()}
                  disabled={otpValue.length !== 6}
                  loading={verifyOtp.isPending}
                  loadingLabel={t('verifying')}
                >
                  {t('verify')}
                </AuthSubmitButton>

                <div className='text-center'>
                  <p className='text-[var(--text-muted)] text-sm'>
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
                      <AuthTextLink
                        onClick={handleResendOtp}
                        disabled={verifyOtp.isPending || requestOtp.isPending}
                      >
                        {t('resend')}
                      </AuthTextLink>
                    )}
                  </p>
                </div>

                <div className='text-center font-light text-sm'>
                  <AuthTextLink
                    onClick={() => {
                      setShowOtpVerification(false)
                      setOtpValue('')
                      setAuthError(null)
                    }}
                  >
                    {t('changeEmail')}
                  </AuthTextLink>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
