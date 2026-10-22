'use client'

import { Chip } from '@sim/emcn'
import { Check } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import {
  OAUTH_API_READ_SCOPE,
  OAUTH_API_WRITE_SCOPE,
  OAUTH_SEARCH_READ_SCOPE,
  type OAuthScope,
  SIM_CLI_CLIENT_ID,
  visibleOAuthScopes,
} from '@/lib/auth/oauth-provider'
import {
  AuthFormMessage,
  AuthHeader,
  AuthSubmitButton,
  AuthTextLink,
} from '@/app/(auth)/components'
import { AUTH_BUTTON_CLASS } from '@/app/(auth)/components/constants'
import { OAuthConsentLoading } from '@/app/(auth)/oauth/consent/loading'
import {
  useOAuthConsent,
  useOAuthPublicClient,
  useOAuthSwitchAccount,
} from '@/hooks/queries/oauth-provider'

export type OAuthConsentRefusal = 'expired' | 'missing' | 'tampered' | 'unsigned'

/** The `oauthConsent.scopes` message describing each scope on the consent page. */
const SCOPE_MESSAGE_KEYS = {
  offline_access: 'offlineAccess',
  [OAUTH_API_READ_SCOPE]: 'apiRead',
  [OAUTH_API_WRITE_SCOPE]: 'apiWrite',
  [OAUTH_SEARCH_READ_SCOPE]: 'searchRead',
} as const satisfies Record<OAuthScope, string>

interface OAuthConsentViewProps {
  /** Set when the page already knows the request is not a real one. */
  refusal: OAuthConsentRefusal | null
  clientId: string | null
  /** Isolates cached client metadata to every parameter in this signed request. */
  authorizationRequestKey: string | null
  scope: string | null
  /** Where the code will be sent, shown so a lookalike app is visible as one. */
  redirectUri: string | null
  /** The signed-in account the grant will belong to. */
  email: string
}

/**
 * Shows the redirect host beside the app name to help identify impersonation;
 * loopback callbacks are named as this computer.
 */
function describeDestination(
  redirectUri: string | null
): { hostname: string; isLoopback: boolean } | null {
  if (!redirectUri) return null
  try {
    const { hostname } = new URL(redirectUri)
    return {
      hostname,
      isLoopback: hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1',
    }
  } catch {
    return null
  }
}

/**
 * Always names the app and account, including for the CLI, so users can
 * recognize relayed authorization attempts.
 */
export function OAuthConsentView({
  refusal,
  clientId,
  authorizationRequestKey,
  scope,
  redirectUri,
  email,
}: OAuthConsentViewProps) {
  const t = useTranslations('auth.oauthConsent')
  const client = useOAuthPublicClient(clientId ?? undefined, authorizationRequestKey ?? undefined)
  const consent = useOAuthConsent()
  const switchAccount = useOAuthSwitchAccount()

  /** Refuses clients Sim cannot name because URL metadata alone is untrusted. */
  const reason: OAuthConsentRefusal | null = refusal ?? (clientId ? null : 'missing')
  if (reason || client.isError) {
    return (
      <AuthHeader
        title={t('unableToConnect')}
        description={
          reason ? t(`refusals.${reason}`) : getErrorMessage(client.error, t('unidentifiedClient'))
        }
      />
    )
  }

  if (client.isPending) return <OAuthConsentLoading />

  const isCli = clientId === SIM_CLI_CLIENT_ID
  /** Uses only the server-registered name; the client ID comes from the URL. */
  const appName = client.data?.name?.trim()
  if (!appName) {
    return <AuthHeader title={t('unableToConnect')} description={t('unnamedClient')} />
  }
  const scopes = visibleOAuthScopes((scope ?? '').split(' ').filter(Boolean))
  const destination = describeDestination(redirectUri)
  const isPending =
    consent.isPending || consent.isSuccess || switchAccount.isPending || switchAccount.isSuccess

  const decide = (accept: boolean) => {
    switchAccount.reset()
    consent.mutate(accept, {
      onSuccess: (url) => {
        window.location.assign(url)
      },
    })
  }

  const changeAccount = () => {
    consent.reset()
    switchAccount.mutate(undefined, {
      onSuccess: () => {
        const params = new URLSearchParams(window.location.search)
        params.set('prompt', 'login consent')
        window.location.assign(`/oauth/sign-in?${params.toString()}`)
      },
    })
  }

  return (
    <div className='space-y-6'>
      <AuthHeader
        title={t('title', { appName })}
        description={isCli ? undefined : t('description')}
      />
      <div className='space-y-4'>
        {scopes.length > 0 && (
          <ul className='space-y-2 px-2'>
            {scopes.map((item) => (
              <li key={item} className='flex items-start gap-2 text-[var(--text-body)] text-sm'>
                <Check
                  aria-hidden='true'
                  className='mt-[3px] size-[14px] shrink-0 text-[var(--text-icon)]'
                />
                <span>{t(`scopes.${SCOPE_MESSAGE_KEYS[item]}`)}</span>
              </li>
            ))}
          </ul>
        )}
        <AuthSubmitButton
          type='button'
          loading={consent.isPending && consent.variables === true}
          disabled={isPending}
          loadingLabel={t('authorizing')}
          onClick={() => decide(true)}
        >
          {t('allow')}
        </AuthSubmitButton>
        <Chip
          type='button'
          variant='border'
          fullWidth
          disabled={isPending}
          className={AUTH_BUTTON_CLASS}
          onClick={() => decide(false)}
        >
          {consent.isPending && consent.variables === false ? t('declining') : t('deny')}
        </Chip>
        {!isCli && destination && (
          <p className='break-words text-center text-[var(--text-muted)] text-caption'>
            {t('returnsTo', {
              destination: destination.isLoopback ? t('thisComputer') : destination.hostname,
            })}
          </p>
        )}
        {(consent.isError || switchAccount.isError) && (
          <div role='alert'>
            <AuthFormMessage type='error' align='center'>
              {getErrorMessage(consent.error ?? switchAccount.error, t('genericError'))}
            </AuthFormMessage>
          </div>
        )}
        <p className='break-words text-center text-[var(--text-muted)] text-caption'>
          {t('continuingAs', { email })}{' '}
          <AuthTextLink onClick={changeAccount} disabled={isPending}>
            {switchAccount.isPending ? t('signingOut') : t('useAnotherAccount')}
          </AuthTextLink>
        </p>
      </div>
    </div>
  )
}
