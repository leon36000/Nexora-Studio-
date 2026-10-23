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
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { normalizeEmail } from '@sim/utils/string'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { requestJson } from '@/lib/api/client/request'
import { forgetPasswordContract } from '@/lib/api/contracts'
import { client } from '@/lib/auth/client'
import { getEnv, isFalsy } from '@/lib/core/config/env'
import { isSsoEnabled } from '@/lib/core/config/env-flags'
import { validateCallbackUrl } from '@/lib/core/security/input-validation'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { quickValidateEmail } from '@/lib/messaging/email/validation'
import { NEXORA_SSO_REQUIRED } from '@/lib/nexora/auth-refusals'
import { buildAuthCrossLink, DEFAULT_POST_AUTH_ROUTE } from '@/app/(auth)/auth-redirect'
import {
  AuthDivider,
  AuthField,
  AuthFormMessage,
  AuthHeader,
  AuthInput,
  AuthLegalFooter,
  AuthNavPrompt,
  AuthSubmitButton,
  AuthTextLink,
  getNexoraOidcName,
  NexoraOidcButton,
  PasswordInput,
  SocialLoginButtons,
  SSOLoginButton,
} from '@/app/(auth)/components'
import { useEmailFieldValidation } from '@/app/(auth)/components/use-email-field-validation'
import { useCaptureWhenReady } from '@/hooks/use-capture-when-ready'

const logger = createLogger('LoginForm')

/** Message key of the first rule the password breaks, or null when it passes. */
function findPasswordProblem(passwordValue: string): 'passwordRequired' | 'passwordEmpty' | null {
  if (!passwordValue) return 'passwordRequired'
  if (passwordValue.trim().length === 0) return 'passwordEmpty'
  return null
}

export default function LoginPage({
  githubAvailable,
  googleAvailable,
  microsoftAvailable,
  registrationDisabled,
}: {
  githubAvailable: boolean
  googleAvailable: boolean
  microsoftAvailable: boolean
  /** DISABLE_REGISTRATION. Hides the signup cross-link, which `/signup` blocks. */
  registrationDisabled: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const validateEmailField = useEmailFieldValidation()
  const validatePassword = (passwordValue: string): string[] => {
    const problem = findPasswordProblem(passwordValue)
    return problem ? [t(`login.${problem}`)] : []
  }
  useCaptureWhenReady('login_page_viewed', {})
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showValidationError, setShowValidationError] = useState(false)
  /** A refusal that is about the account or its organization, not the credentials typed in. */
  const [policyError, setPolicyError] = useState<string | null>(null)
  const callbackUrlParam = searchParams?.get('callbackUrl')
  const isValidCallbackUrl = callbackUrlParam ? validateCallbackUrl(callbackUrlParam) : false
  const invalidCallbackRef = useRef(false)
  if (callbackUrlParam && !isValidCallbackUrl && !invalidCallbackRef.current) {
    invalidCallbackRef.current = true
    logger.warn('Invalid callback URL detected and blocked:', { url: callbackUrlParam })
  }
  const callbackUrl = isValidCallbackUrl ? callbackUrlParam! : DEFAULT_POST_AUTH_ROUTE
  const isInviteFlow = searchParams?.get('invite_flow') === 'true'
  const signupHref = buildAuthCrossLink('/signup', {
    callbackUrl: isValidCallbackUrl ? callbackUrl : null,
    isInviteFlow,
  })

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [isSubmittingReset, setIsSubmittingReset] = useState(false)
  const [resetStatus, setResetStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const [email, setEmail] = useState('')
  const [emailErrors, setEmailErrors] = useState<string[]>([])
  const [showEmailValidationError, setShowEmailValidationError] = useState(false)
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(() =>
    searchParams?.get('resetSuccess') === 'true' ? t('login.resetSuccess') : null
  )

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)

    const errors = validateEmailField(newEmail)
    setEmailErrors(errors)
    setShowEmailValidationError(false)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)

    const errors = validatePassword(newPassword)
    setPasswordErrors(errors)
    setShowValidationError(false)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setPolicyError(null)

    const redirectToVerify = (emailToVerify: string) => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('verificationEmail', emailToVerify)
      }
      router.push('/verify')
    }

    const formData = new FormData(e.currentTarget)
    const emailRaw = formData.get('email') as string
    const email = normalizeEmail(emailRaw)

    const emailValidationErrors = validateEmailField(email)
    setEmailErrors(emailValidationErrors)
    setShowEmailValidationError(emailValidationErrors.length > 0)

    const passwordValidationErrors = validatePassword(password)
    setPasswordErrors(passwordValidationErrors)
    setShowValidationError(passwordValidationErrors.length > 0)

    if (emailValidationErrors.length > 0 || passwordValidationErrors.length > 0) {
      setIsLoading(false)
      return
    }

    try {
      const safeCallbackUrl = callbackUrl
      let errorHandled = false

      const result = await client.signIn.email(
        {
          email,
          password,
          callbackURL: safeCallbackUrl,
        },
        {
          onError: (ctx: any) => {
            logger.error('Login error:', ctx.error)

            if (ctx.error.code?.includes('EMAIL_NOT_VERIFIED')) {
              errorHandled = true
              redirectToVerify(email)
              return
            }

            /**
             * A policy refusal explains itself — an organization requiring single sign-on, or a
             * suspended account. It belongs in the form-level slot: the password is not what is
             * wrong, so marking that field would send the person to reset a password that is fine.
             */
            if (ctx.error.status === 403 && ctx.error.message) {
              errorHandled = true
              setResetSuccessMessage(null)
              setPasswordErrors([])
              setShowValidationError(false)
              setPolicyError(
                ctx.error.message === NEXORA_SSO_REQUIRED
                  ? t('login.errors.ssoRequired')
                  : ctx.error.message
              )
              return
            }

            errorHandled = true
            const errorMessage: string[] = [t('login.errors.invalidCredentials')]

            if (
              ctx.error.code?.includes('BAD_REQUEST') ||
              ctx.error.message?.includes('Email and password sign in is not enabled')
            ) {
              errorMessage.push(t('login.errors.emailSignInDisabled'))
            } else if (
              ctx.error.code?.includes('INVALID_CREDENTIALS') ||
              ctx.error.message?.includes('invalid password')
            ) {
              errorMessage.push(t('login.errors.invalidCredentialsRetry'))
            } else if (
              ctx.error.code?.includes('USER_NOT_FOUND') ||
              ctx.error.message?.includes('not found')
            ) {
              errorMessage.push(t('login.errors.userNotFound'))
            } else if (ctx.error.code?.includes('MISSING_CREDENTIALS')) {
              errorMessage.push(t('login.errors.missingCredentials'))
            } else if (ctx.error.code?.includes('EMAIL_PASSWORD_DISABLED')) {
              errorMessage.push(t('login.errors.emailPasswordDisabled'))
            } else if (ctx.error.code?.includes('FAILED_TO_CREATE_SESSION')) {
              errorMessage.push(t('login.errors.sessionFailed'))
            } else if (ctx.error.code?.includes('too many attempts')) {
              errorMessage.push(t('login.errors.tooManyAttempts'))
            } else if (ctx.error.code?.includes('account locked')) {
              errorMessage.push(t('login.errors.accountLocked'))
            } else if (ctx.error.code?.includes('network')) {
              errorMessage.push(t('errors.network'))
            } else if (ctx.error.message?.includes('rate limit')) {
              errorMessage.push(t('errors.rateLimited'))
            }

            setResetSuccessMessage(null)
            setPasswordErrors(errorMessage)
            setShowValidationError(true)
          },
        }
      )

      if (!result || result.error) {
        // Show error if not already handled by onError callback
        if (!errorHandled) {
          setResetSuccessMessage(null)
          const errorMessage = result?.error?.message || t('login.errors.loginFailed')
          setPasswordErrors([errorMessage])
          setShowValidationError(true)
        }
        setIsLoading(false)
        return
      }

      // Clear reset success message on successful login
      setResetSuccessMessage(null)

      /** Fallback when better-auth does not redirect: a document navigation, like signup's, so the workspace shell initializes its own theme store. */
      window.location.href = safeCallbackUrl
    } catch (err: any) {
      if (err.message?.includes('not verified') || err.code?.includes('EMAIL_NOT_VERIFIED')) {
        redirectToVerify(email)
        return
      }

      logger.error('Uncaught login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setResetStatus({
        type: 'error',
        message: t('login.forgotPasswordModal.emailRequired'),
      })
      return
    }

    const emailValidation = quickValidateEmail(normalizeEmail(forgotPasswordEmail))
    if (!emailValidation.isValid) {
      setResetStatus({
        type: 'error',
        message: t('login.forgotPasswordModal.emailInvalid'),
      })
      return
    }

    try {
      setIsSubmittingReset(true)
      setResetStatus({ type: null, message: '' })

      try {
        await requestJson(forgetPasswordContract, {
          body: {
            email: forgotPasswordEmail,
            redirectTo: `${getBaseUrl()}/reset-password`,
          },
        })
      } catch (requestError) {
        let errorMessage = getErrorMessage(
          requestError,
          t('login.forgotPasswordModal.requestFailed')
        )

        if (
          errorMessage.includes('Invalid body parameters') ||
          errorMessage.includes('invalid email')
        ) {
          errorMessage = t('login.forgotPasswordModal.emailInvalid')
        } else if (errorMessage.includes('Email is required')) {
          errorMessage = t('login.forgotPasswordModal.emailRequired')
        } else if (
          errorMessage.includes('user not found') ||
          errorMessage.includes('User not found')
        ) {
          errorMessage = t('login.forgotPasswordModal.userNotFound')
        }

        throw new Error(errorMessage)
      }

      setResetStatus({
        type: 'success',
        message: t('login.forgotPasswordModal.linkSent'),
      })

      setTimeout(() => {
        setForgotPasswordOpen(false)
        setResetStatus({ type: null, message: '' })
      }, 2000)
    } catch (error) {
      logger.error('Error requesting password reset:', { error })
      setResetStatus({
        type: 'error',
        message: getErrorMessage(error, t('login.forgotPasswordModal.requestFailed')),
      })
    } finally {
      setIsSubmittingReset(false)
    }
  }

  const ssoEnabled = isSsoEnabled
  const emailEnabled = !isFalsy(getEnv('NEXT_PUBLIC_EMAIL_PASSWORD_SIGNUP_ENABLED'))
  const hasNexoraOidc = getNexoraOidcName() !== null
  const hasSocial = githubAvailable || googleAvailable || microsoftAvailable || hasNexoraOidc
  const hasOnlySSO = ssoEnabled && !emailEnabled && !hasSocial
  const showTopSSO = hasOnlySSO
  const showBottomSection = hasSocial || (ssoEnabled && !hasOnlySSO)
  const showDivider = (emailEnabled || showTopSSO) && showBottomSection

  const emailFieldErrors = showEmailValidationError && emailErrors.length > 0 ? emailErrors : []
  const passwordFieldErrors = showValidationError && passwordErrors.length > 0 ? passwordErrors : []
  const canSubmit = email.trim().length > 0 && password.length > 0

  return (
    <>
      <div className='space-y-6'>
        <AuthHeader title={t('login.title')} description={t('login.description')} />

        {showTopSSO && <SSOLoginButton callbackURL={callbackUrl} variant='primary' />}

        {emailEnabled && (
          <form onSubmit={onSubmit} className='space-y-6'>
            <div className='space-y-5'>
              <AuthField htmlFor='email' label={t('login.emailLabel')} errors={emailFieldErrors}>
                <AuthInput
                  id='email'
                  name='email'
                  placeholder={t('login.emailPlaceholder')}
                  required
                  autoCapitalize='none'
                  autoComplete='email'
                  autoCorrect='off'
                  value={email}
                  onChange={handleEmailChange}
                  error={emailFieldErrors.length > 0}
                />
              </AuthField>
              <AuthField
                htmlFor='password'
                label={t('login.passwordLabel')}
                errors={passwordFieldErrors}
                action={
                  <AuthTextLink
                    onClick={() => setForgotPasswordOpen(true)}
                    className='text-caption'
                  >
                    {t('login.forgotPassword')}
                  </AuthTextLink>
                }
              >
                <PasswordInput
                  id='password'
                  name='password'
                  required
                  autoCapitalize='none'
                  autoComplete='current-password'
                  autoCorrect='off'
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={handlePasswordChange}
                  error={passwordFieldErrors.length > 0}
                />
              </AuthField>
            </div>

            {policyError && (
              <AuthFormMessage type='error'>
                <p>{policyError}</p>
              </AuthFormMessage>
            )}

            {resetSuccessMessage && (
              <AuthFormMessage type='success'>
                <p>{resetSuccessMessage}</p>
              </AuthFormMessage>
            )}

            <AuthSubmitButton
              loading={isLoading}
              loadingLabel={t('login.submitting')}
              disabled={!canSubmit}
            >
              {t('login.submit')}
            </AuthSubmitButton>
          </form>
        )}

        {showDivider && <AuthDivider label={t('divider.orContinueWith')} />}

        {showBottomSection && (
          <SocialLoginButtons
            view='login'
            googleAvailable={googleAvailable}
            githubAvailable={githubAvailable}
            microsoftAvailable={microsoftAvailable}
            callbackURL={callbackUrl}
          >
            <NexoraOidcButton callbackURL={callbackUrl} />
            {ssoEnabled && !hasOnlySSO && (
              <SSOLoginButton callbackURL={callbackUrl} variant='outline' />
            )}
          </SocialLoginButtons>
        )}

        {emailEnabled && !registrationDisabled && (
          <AuthNavPrompt
            prompt={t('login.noAccount')}
            href={signupHref}
            linkLabel={t('login.signUp')}
          />
        )}

        <AuthLegalFooter action='signingIn' />
      </div>

      <ChipModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        srTitle={t('login.forgotPasswordModal.title')}
      >
        <ChipModalHeader onClose={() => setForgotPasswordOpen(false)}>
          {t('login.forgotPasswordModal.title')}
        </ChipModalHeader>
        <ChipModalBody>
          <p className='px-2 text-[var(--text-secondary)] text-sm'>
            {t('login.forgotPasswordModal.description')}
          </p>
          <ChipModalField
            type='email'
            title={t('login.forgotPasswordModal.emailLabel')}
            value={forgotPasswordEmail}
            onChange={(value) => setForgotPasswordEmail(value)}
            required
            placeholder={t('login.forgotPasswordModal.emailPlaceholder')}
          />
          {resetStatus.type === 'success' && (
            <p className='px-2 text-[var(--text-secondary)] text-sm'>{resetStatus.message}</p>
          )}
          <ChipModalError>
            {resetStatus.type === 'error' ? resetStatus.message : null}
          </ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={() => setForgotPasswordOpen(false)}
          cancelDisabled={isSubmittingReset}
          primaryAction={{
            label: isSubmittingReset
              ? t('login.forgotPasswordModal.sending')
              : t('login.forgotPasswordModal.send'),
            onClick: handleForgotPassword,
            disabled: !forgotPasswordEmail || isSubmittingReset,
          }}
        />
      </ChipModal>
    </>
  )
}
