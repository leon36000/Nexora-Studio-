'use client'

import { Suspense, useRef, useState } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { createLogger } from '@sim/logger'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePostHog } from 'posthog-js/react'
import { trackFreebuffConversion } from '@/lib/analytics/freebuff'
import { trackGoogleEvent } from '@/lib/analytics/google'
import { client, useSession } from '@/lib/auth/client'
import { useTrackingConsent } from '@/lib/consent/tracking-consent'
import { getEnv, isFalsy } from '@/lib/core/config/env'
import { isSsoEnabled } from '@/lib/core/config/env-flags'
import { validateCallbackUrl } from '@/lib/core/security/input-validation'
import { NEXORA_SIGN_UP_REFUSED } from '@/lib/nexora/auth-refusals'
import { captureEvent } from '@/lib/posthog/client'
import {
  buildAuthCrossLink,
  DEFAULT_POST_AUTH_ROUTE,
  POST_AUTH_REDIRECT_STORAGE_KEY,
  resolveAuthRedirect,
  resolvePostSignupDestination,
  VERIFY_FROM_SIGNUP_ROUTE,
} from '@/app/(auth)/auth-redirect'
import {
  AuthDivider,
  AuthField,
  AuthFormMessage,
  AuthHeader,
  AuthInput,
  AuthLegalFooter,
  AuthNavPrompt,
  AuthSubmitButton,
  getNexoraOidcName,
  NexoraOidcButton,
  PasswordInput,
  SocialLoginButtons,
  SSOLoginButton,
} from '@/app/(auth)/components'
import { useEmailFieldValidation } from '@/app/(auth)/components/use-email-field-validation'
import { usePrehydrationValues } from '@/app/(auth)/components/use-prehydration-values'
import { useCaptureWhenReady } from '@/hooks/use-capture-when-ready'

const logger = createLogger('SignupForm')

/** Each password rule with the `signup.passwordRules` message shown when it fails, in display order. */
const PASSWORD_RULES = [
  { regex: /.{8,}/, messageKey: 'minLength' },
  { regex: /(?=.*?[A-Z])/, messageKey: 'uppercase' },
  { regex: /(?=.*?[a-z])/, messageKey: 'lowercase' },
  { regex: /(?=.*?[0-9])/, messageKey: 'number' },
  { regex: /(?=.*?[#?!@$%^&*-])/, messageKey: 'special' },
] as const

const NAME_VALID_CHARACTERS = /^[\p{L}\s\-']+$/u
const NAME_NO_CONSECUTIVE_SPACES = /^(?!.*\s\s).*$/

interface SignupFormProps {
  githubAvailable: boolean
  googleAvailable: boolean
  microsoftAvailable: boolean
  emailSignupEnabled: boolean
  /** Server-derived: verification is enabled AND a mail provider is configured. */
  emailVerificationEnabled: boolean
}

function SignupFormContent({
  githubAvailable,
  googleAvailable,
  microsoftAvailable,
  emailSignupEnabled,
  emailVerificationEnabled,
}: SignupFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const validateEmailField = useEmailFieldValidation()
  const { refetch: refetchSession } = useSession()
  const posthog = usePostHog()
  const { measurement, marketing } = useTrackingConsent()
  useCaptureWhenReady('signup_page_viewed', {})
  const [isLoading, setIsLoading] = useState(false)

  const [password, setPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showValidationError, setShowValidationError] = useState(false)
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [emailError, setEmailError] = useState('')
  const [emailErrors, setEmailErrors] = useState<string[]>([])
  const [showEmailValidationError, setShowEmailValidationError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const [turnstileSiteKey] = useState(() => getEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY'))
  const { rawCallbackUrl: rawRedirectUrl, isInviteFlow } = resolveAuthRedirect({
    redirect: searchParams.get('redirect'),
    callbackUrl: searchParams.get('callbackUrl'),
    inviteFlow: searchParams.get('invite_flow'),
  })
  const isValidRedirectUrl = rawRedirectUrl ? validateCallbackUrl(rawRedirectUrl) : false
  const invalidCallbackRef = useRef(false)
  if (rawRedirectUrl && !isValidRedirectUrl && !invalidCallbackRef.current) {
    invalidCallbackRef.current = true
    logger.warn('Invalid callback URL detected and blocked:', { url: rawRedirectUrl })
  }
  const redirectUrl = isValidRedirectUrl ? rawRedirectUrl : ''

  const [name, setName] = useState('')
  const [nameErrors, setNameErrors] = useState<string[]>([])
  usePrehydrationValues({ name: setName, email: setEmail, password: setPassword })
  const [showNameValidationError, setShowNameValidationError] = useState(false)

  const validatePassword = (passwordValue: string): string[] =>
    PASSWORD_RULES.filter(({ regex }) => !regex.test(passwordValue)).map(({ messageKey }) =>
      t(`signup.passwordRules.${messageKey}`)
    )

  const validateName = (nameValue: string): string[] => {
    if (!nameValue) return [t('signup.nameRules.required')]
    if (nameValue.trim().length === 0) return [t('signup.nameRules.notEmpty')]

    const errors: string[] = []
    if (!NAME_VALID_CHARACTERS.test(nameValue.trim())) {
      errors.push(t('signup.nameRules.validCharacters'))
    }
    if (!NAME_NO_CONSECUTIVE_SPACES.test(nameValue)) {
      errors.push(t('signup.nameRules.noConsecutiveSpaces'))
    }
    return errors
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)

    const errors = validatePassword(newPassword)
    setPasswordErrors(errors)
    setShowValidationError(false)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setName(rawValue)

    const errors = validateName(rawValue)
    setNameErrors(errors)
    setShowNameValidationError(false)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)

    const errors = validateEmailField(newEmail)
    setEmailErrors(errors)
    setShowEmailValidationError(false)

    if (emailError) {
      setEmailError('')
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const emailValueRaw = formData.get('email') as string
    const emailValue = emailValueRaw.trim().toLowerCase()
    const passwordValue = formData.get('password') as string
    const nameValue = formData.get('name') as string

    const trimmedName = nameValue.trim()

    const nameValidationErrors = validateName(trimmedName)
    setNameErrors(nameValidationErrors)
    setShowNameValidationError(nameValidationErrors.length > 0)

    const emailValidationErrors = validateEmailField(emailValue)
    setEmailErrors(emailValidationErrors)
    setShowEmailValidationError(emailValidationErrors.length > 0)

    const errors = validatePassword(passwordValue)
    setPasswordErrors(errors)

    setShowValidationError(errors.length > 0)

    try {
      if (
        nameValidationErrors.length > 0 ||
        emailValidationErrors.length > 0 ||
        errors.length > 0
      ) {
        setIsLoading(false)
        return
      }

      if (trimmedName.length > 100) {
        setNameErrors([t('signup.nameRules.tooLong')])
        setShowNameValidationError(true)
        setIsLoading(false)
        return
      }

      let token: string | undefined
      const widget = turnstileRef.current
      if (turnstileSiteKey && widget) {
        try {
          widget.reset()
          widget.execute()
          token = await widget.getResponsePromise()
        } catch {
          captureEvent(posthog, 'signup_failed', {
            error_code: 'captcha_client_failure',
          })
          setFormError(t('signup.errors.captchaFailed'))
          setIsLoading(false)
          return
        }
      }

      setFormError(null)
      const response = await client.signUp.email(
        {
          email: emailValue,
          password: passwordValue,
          name: trimmedName,
        },
        {
          headers: {
            ...(token ? { 'x-captcha-response': token } : {}),
          },
          onError: (ctx) => {
            logger.warn('Signup error:', ctx.error)
            const errorMessage: string[] = [t('signup.errors.createFailed')]

            let errorCode = 'unknown'
            if (ctx.error.message === NEXORA_SIGN_UP_REFUSED) {
              errorCode = 'invitation_required'
              setEmailError(t('signup.errors.invitationRequired'))
            } else if (ctx.error.code?.includes('USER_ALREADY_EXISTS')) {
              errorCode = 'user_already_exists'
              setEmailError(t('signup.errors.userExists'))
            } else if (
              ctx.error.code?.includes('BAD_REQUEST') ||
              ctx.error.message?.includes('Email and password sign up is not enabled')
            ) {
              errorCode = 'signup_disabled'
              errorMessage.push(t('signup.errors.signupDisabled'))
              setEmailError(errorMessage[0])
            } else if (ctx.error.code?.includes('INVALID_EMAIL')) {
              errorCode = 'invalid_email'
              errorMessage.push(t('emailValidation.invalid'))
              setEmailError(errorMessage[0])
            } else if (ctx.error.code?.includes('PASSWORD_TOO_SHORT')) {
              errorCode = 'password_too_short'
              errorMessage.push(t('signup.passwordRules.minLength'))
              setPasswordErrors(errorMessage)
              setShowValidationError(true)
            } else if (ctx.error.code?.includes('PASSWORD_TOO_LONG')) {
              errorCode = 'password_too_long'
              errorMessage.push(t('signup.errors.passwordTooLong'))
              setPasswordErrors(errorMessage)
              setShowValidationError(true)
            } else if (ctx.error.code?.includes('network')) {
              errorCode = 'network_error'
              errorMessage.push(t('errors.network'))
              setPasswordErrors(errorMessage)
              setShowValidationError(true)
            } else if (ctx.error.code?.includes('rate limit')) {
              errorCode = 'rate_limited'
              errorMessage.push(t('errors.rateLimited'))
              setPasswordErrors(errorMessage)
              setShowValidationError(true)
            } else {
              setPasswordErrors(errorMessage)
              setShowValidationError(true)
            }

            captureEvent(posthog, 'signup_failed', { error_code: errorCode })
          },
        }
      )

      if (!response || response.error) {
        setIsLoading(false)
        return
      }

      if (measurement) trackGoogleEvent('sign_up', { method: 'email' })
      if (marketing) trackFreebuffConversion('signup_completed', response.data.user.id)

      try {
        await refetchSession()
        logger.info('Session refreshed after successful signup')
      } catch (sessionError) {
        logger.error('Failed to refresh session after signup:', sessionError)
      }

      const destination = resolvePostSignupDestination({ emailVerificationEnabled, redirectUrl })

      if (typeof window !== 'undefined') {
        // Clear any leftover from an earlier signup in this tab — otherwise a
        // signup with no callbackUrl inherits the previous CLI/invite destination.
        sessionStorage.removeItem('verificationEmail')
        sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY)

        if (destination.kind === 'verify') {
          sessionStorage.setItem('verificationEmail', emailValue)
          if (redirectUrl) sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, redirectUrl)
        }
      }

      if (destination.kind === 'verify') {
        router.push(VERIFY_FROM_SIGNUP_ROUTE)
      } else {
        /** Match login/verification: refresh session-bound shells and their theme default. */
        window.location.href =
          destination.kind === 'redirect' ? destination.url : DEFAULT_POST_AUTH_ROUTE
      }
    } catch (error) {
      logger.error('Signup error:', error)
      setIsLoading(false)
    }
  }

  const ssoEnabled = isSsoEnabled
  const emailEnabled =
    !isFalsy(getEnv('NEXT_PUBLIC_EMAIL_PASSWORD_SIGNUP_ENABLED')) && emailSignupEnabled
  const hasNexoraOidc = getNexoraOidcName() !== null
  const hasSocial = githubAvailable || googleAvailable || microsoftAvailable || hasNexoraOidc
  const hasOnlySSO = ssoEnabled && !emailEnabled && !hasSocial
  const showBottomSection = hasSocial || (ssoEnabled && !hasOnlySSO)
  const showDivider = (emailEnabled || hasOnlySSO) && showBottomSection

  const nameFieldErrors = showNameValidationError && nameErrors.length > 0 ? nameErrors : []
  const emailHasError = Boolean(emailError) || (showEmailValidationError && emailErrors.length > 0)
  const emailFieldErrors =
    showEmailValidationError && emailErrors.length > 0
      ? emailErrors
      : emailError && !showEmailValidationError
        ? [emailError]
        : []
  const passwordFieldErrors = showValidationError && passwordErrors.length > 0 ? passwordErrors : []
  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length > 0

  return (
    <div className='space-y-6'>
      <AuthHeader title={t('signup.title')} description={t('signup.description')} />

      {hasOnlySSO && (
        <SSOLoginButton callbackURL={redirectUrl || DEFAULT_POST_AUTH_ROUTE} variant='primary' />
      )}

      {emailEnabled && (
        <form onSubmit={onSubmit} className='space-y-6'>
          <div className='space-y-5'>
            <AuthField htmlFor='name' label={t('signup.nameLabel')} errors={nameFieldErrors}>
              <AuthInput
                id='name'
                name='name'
                placeholder={t('signup.namePlaceholder')}
                type='text'
                autoCapitalize='words'
                autoComplete='name'
                title={t('signup.nameTitle')}
                value={name}
                onChange={handleNameChange}
                error={nameFieldErrors.length > 0}
              />
            </AuthField>
            <AuthField htmlFor='email' label={t('signup.emailLabel')} errors={emailFieldErrors}>
              <AuthInput
                id='email'
                name='email'
                placeholder={t('signup.emailPlaceholder')}
                autoCapitalize='none'
                autoComplete='email'
                autoCorrect='off'
                value={email}
                onChange={handleEmailChange}
                error={emailHasError}
              />
            </AuthField>
            <AuthField
              htmlFor='password'
              label={t('signup.passwordLabel')}
              errors={passwordFieldErrors}
            >
              <PasswordInput
                id='password'
                name='password'
                autoCapitalize='none'
                autoComplete='new-password'
                placeholder={t('signup.passwordPlaceholder')}
                autoCorrect='off'
                value={password}
                onChange={handlePasswordChange}
                error={passwordFieldErrors.length > 0}
              />
            </AuthField>
          </div>

          {turnstileSiteKey && (
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              options={{ execution: 'execute', appearance: 'execute' }}
            />
          )}

          {formError && (
            <AuthFormMessage type='error'>
              <p>{formError}</p>
            </AuthFormMessage>
          )}

          <AuthSubmitButton
            loading={isLoading}
            loadingLabel={t('signup.submitting')}
            disabled={!canSubmit}
          >
            {t('signup.submit')}
          </AuthSubmitButton>
        </form>
      )}

      {showDivider && <AuthDivider label={t('divider.orContinueWith')} />}

      {showBottomSection && (
        <SocialLoginButtons
          view='signup'
          githubAvailable={githubAvailable}
          googleAvailable={googleAvailable}
          microsoftAvailable={microsoftAvailable}
          callbackURL={redirectUrl || DEFAULT_POST_AUTH_ROUTE}
        >
          <NexoraOidcButton callbackURL={redirectUrl || DEFAULT_POST_AUTH_ROUTE} />
          {ssoEnabled && !hasOnlySSO && (
            <SSOLoginButton
              callbackURL={redirectUrl || DEFAULT_POST_AUTH_ROUTE}
              variant='outline'
            />
          )}
        </SocialLoginButtons>
      )}

      <AuthNavPrompt
        prompt={t('signup.haveAccount')}
        href={buildAuthCrossLink('/login', { callbackUrl: redirectUrl || null, isInviteFlow })}
        linkLabel={t('signup.signIn')}
      />

      <AuthLegalFooter action='creatingAccount' />
    </div>
  )
}

export default function SignupPage({
  githubAvailable,
  googleAvailable,
  microsoftAvailable,
  emailSignupEnabled,
  emailVerificationEnabled,
}: SignupFormProps) {
  const t = useTranslations('auth.signup')
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[320px] items-center justify-center'>{t('loading')}</div>
      }
    >
      <SignupFormContent
        githubAvailable={githubAvailable}
        googleAvailable={googleAvailable}
        microsoftAvailable={microsoftAvailable}
        emailSignupEnabled={emailSignupEnabled}
        emailVerificationEnabled={emailVerificationEnabled}
      />
    </Suspense>
  )
}
