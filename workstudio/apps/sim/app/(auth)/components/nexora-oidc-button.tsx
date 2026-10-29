'use client'

import { useState } from 'react'
import { Chip, cn } from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { client } from '@/lib/auth/client'
import { NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'
import { getNexoraOidcName } from '@/lib/nexora/oidc-name'
import { DEFAULT_POST_AUTH_ROUTE } from '@/app/(auth)/auth-redirect'
import { AUTH_BUTTON_CLASS } from '@/app/(auth)/components/constants'

const logger = createLogger('NexoraOidcButton')

interface NexoraOidcButtonProps {
  callbackURL?: string
  /** `primary` when the sign-in is the page's main action, `outline` beside a password form. */
  variant?: 'primary' | 'outline'
}

/** Nexora edition: "Sign in with <company SSO>" through the configured OpenID Connect provider. */
export function NexoraOidcButton({
  callbackURL = DEFAULT_POST_AUTH_ROUTE,
  variant = 'outline',
}: NexoraOidcButtonProps) {
  const t = useTranslations('auth.nexoraOidc')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const name = getNexoraOidcName()
  if (!name) return null

  const handleClick = async () => {
    setIsRedirecting(true)
    try {
      await client.signIn.social({ provider: NEXORA_OIDC_PROVIDER_ID, callbackURL })
    } catch (error) {
      logger.error('Company sign-in failed', { error: getErrorMessage(error) })
      setIsRedirecting(false)
    }
  }

  return (
    <Chip
      fullWidth
      variant={variant === 'primary' ? 'primary' : undefined}
      disabled={isRedirecting}
      onClick={() => void handleClick()}
      className={cn(AUTH_BUTTON_CLASS, variant === 'outline' && 'border border-[var(--border)]')}
    >
      {isRedirecting ? t('redirecting') : t('signIn', { name })}
    </Chip>
  )
}
