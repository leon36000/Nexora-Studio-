import { useTranslations } from 'next-intl'
import { AuthTextLink } from '@/app/(auth)/components/auth-text-link'
import { useBrandConfig } from '@/ee/whitelabeling'

interface AuthLegalFooterProps {
  /** The consent action the fine print names. */
  action: 'signingIn' | 'creatingAccount'
}

function httpUrl(value: string | undefined): string | null {
  const url = value?.trim()
  return url && /^https?:\/\//i.test(url) ? url : null
}

/**
 * The "By {action}, you agree to our Terms / Privacy" fine print shared by the
 * login and signup pages. Restyled to muted light tokens with the legal links
 * routed through {@link AuthTextLink}, so the consent copy has one source.
 */
export function AuthLegalFooter({ action }: AuthLegalFooterProps) {
  const t = useTranslations('auth.legalFooter')
  const brand = useBrandConfig()
  const termsUrl = httpUrl(brand.termsUrl)
  const privacyUrl = httpUrl(brand.privacyUrl)
  // The marketing pages that /terms and /privacy used to point at do not exist in this edition: the
  // operator publishes its own, or the sentence is left out rather than linking to a dead end.
  if (!termsUrl || !privacyUrl) return null
  return (
    <p className='text-center text-[var(--text-muted)] text-caption leading-relaxed'>
      {t.rich(action, {
        terms: (chunks) => (
          <AuthTextLink href={termsUrl} external>
            {chunks}
          </AuthTextLink>
        ),
        privacy: (chunks) => (
          <AuthTextLink href={privacyUrl} external>
            {chunks}
          </AuthTextLink>
        ),
      })}
    </p>
  )
}
