import { useTranslations } from 'next-intl'
import { AuthTextLink } from '@/app/(auth)/components/auth-text-link'

interface AuthLegalFooterProps {
  /** The consent action the fine print names. */
  action: 'signingIn' | 'creatingAccount'
}

/**
 * The "By {action}, you agree to our Terms / Privacy" fine print shared by the
 * login and signup pages. Restyled to muted light tokens with the legal links
 * routed through {@link AuthTextLink}, so the consent copy has one source.
 */
export function AuthLegalFooter({ action }: AuthLegalFooterProps) {
  const t = useTranslations('auth.legalFooter')
  return (
    <p className='text-center text-[var(--text-muted)] text-caption leading-relaxed'>
      {t.rich(action, {
        terms: (chunks) => (
          <AuthTextLink href='/terms' external>
            {chunks}
          </AuthTextLink>
        ),
        privacy: (chunks) => (
          <AuthTextLink href='/privacy' external>
            {chunks}
          </AuthTextLink>
        ),
      })}
    </p>
  )
}
