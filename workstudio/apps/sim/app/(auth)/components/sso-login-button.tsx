'use client'
import { Chip, cn } from '@sim/emcn'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { isSsoEnabled } from '@/lib/core/config/env-flags'
import { AUTH_BUTTON_CLASS } from '@/app/(auth)/components/constants'

interface SSOLoginButtonProps {
  callbackURL?: string
  className?: string
  variant?: 'primary' | 'outline'
}

export function SSOLoginButton({
  callbackURL,
  className,
  variant = 'outline',
}: SSOLoginButtonProps) {
  const router = useRouter()
  const t = useTranslations('auth.sso')

  if (!isSsoEnabled) {
    return null
  }

  const handleSSOClick = () => {
    const ssoUrl = `/sso${callbackURL ? `?callbackUrl=${encodeURIComponent(callbackURL)}` : ''}`
    router.push(ssoUrl)
  }

  return (
    <Chip
      variant={variant === 'primary' ? 'primary' : undefined}
      fullWidth
      onClick={handleSSOClick}
      className={cn(
        AUTH_BUTTON_CLASS,
        variant === 'outline' && 'border border-[var(--border-1)]',
        className
      )}
    >
      {t('signIn')}
    </Chip>
  )
}
