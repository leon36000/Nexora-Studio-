'use client'

import { useEffect, useState } from 'react'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { normalizeEmail } from '@sim/utils/string'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import { acceptInvitationContract } from '@/lib/api/contracts/invitations'
import { client, useSession } from '@/lib/auth/client'
import { APP_ENTRY_PATH } from '@/lib/navigation/paths'
import { buildAuthCrossLink } from '@/app/(auth)/auth-redirect'
import { InvitationDisclosure, InviteLayout, InviteStatusCard } from '@/app/invite/components'
import { useInvitationDetails } from '@/hooks/queries/invitations'
import { organizationKeys } from '@/hooks/queries/organization'
import { refreshSessionQuery } from '@/hooks/queries/session'
import { subscriptionKeys } from '@/hooks/queries/utils/subscription-keys'
import { workspaceKeys } from '@/hooks/queries/workspace'
import { clearUserData } from '@/stores'

const logger = createLogger('InviteById')

/** Workspace names listed in the invitation title before collapsing into an "and N more" tail. */
const MAX_LISTED_WORKSPACE_NAMES = 3

/** A document navigation, so the marketing surface initializes its own theme store. */
function returnHome(): void {
  window.location.href = '/'
}

/**
 * Goes through the shared builder so the invite page cannot drift from the
 * cross-link shape the auth pages use.
 */
function inviteAuthLink(
  path: '/login' | '/signup',
  callbackUrl: string,
  isNewUser = false
): string {
  return buildAuthCrossLink(path, { callbackUrl, isInviteFlow: true, isNewUser })
}

interface InviteAction {
  label: string
  onClick: () => void
}

type InviteTranslate = (key: string) => string

interface SignedOutPromptParams {
  t: InviteTranslate
  registrationDisabled: boolean
  isNewUser: boolean
  callbackUrl: string
  navigate: (href: string) => void
}

/**
 * What a signed-out visitor is offered, as one branch so the copy and the
 * buttons under it can never disagree about what they may do.
 *
 * Under DISABLE_REGISTRATION only signing in is possible — `/signup` rejects
 * the visitor server-side, so offering it would be a dead end.
 */
function signedOutPrompt({
  t,
  registrationDisabled,
  isNewUser,
  callbackUrl,
  navigate,
}: SignedOutPromptParams): { description: string; actions: InviteAction[] } {
  const signIn: InviteAction = {
    label: t('signIn'),
    onClick: () => navigate(inviteAuthLink('/login', callbackUrl)),
  }

  if (registrationDisabled) {
    return {
      description: t('registrationDisabled'),
      actions: [signIn],
    }
  }

  if (isNewUser) {
    return {
      description: t('createToJoin'),
      actions: [
        {
          label: t('createAccount'),
          onClick: () => navigate(inviteAuthLink('/signup', callbackUrl)),
        },
        { ...signIn, label: t('alreadyHaveAccount') },
      ],
    }
  }

  return {
    description: t('signInToAccept'),
    actions: [
      signIn,
      {
        label: t('createAccount'),
        onClick: () => navigate(inviteAuthLink('/signup', callbackUrl, true)),
      },
    ],
  }
}

type CacheRefresh = () => Promise<unknown> // i18n-ignore: TypeScript type, not copy

function runBestEffortCacheRefresh(cache: string, refresh: CacheRefresh): void {
  void Promise.resolve()
    .then(refresh)
    .catch((refreshError) => {
      logger.warn('Post-acceptance cache refresh failed', {
        cache,
        error: getErrorMessage(refreshError),
      })
    })
}

type InviteErrorCode =
  | 'missing-token'
  | 'invalid-token'
  | 'expired'
  | 'already-processed'
  | 'email-mismatch'
  | 'workspace-not-found'
  | 'disclosure-outdated'
  | 'user-not-found'
  | 'already-member'
  | 'already-in-organization'
  | 'no-seats-available'
  | 'upgrade-required'
  | 'external-requires-paid-plan'
  | 'invalid-invitation'
  | 'missing-invitation-id'
  | 'server-error'
  | 'unauthorized'
  | 'forbidden'
  | 'network-error'
  | 'unknown'

/** Message key under `auth.invite.errors` for each error code. */
type InviteErrorMessageKey =
  | 'missingToken'
  | 'invalidToken'
  | 'expired'
  | 'alreadyProcessed'
  | 'emailMismatch'
  | 'workspaceNotFound'
  | 'disclosureOutdated'
  | 'userNotFound'
  | 'alreadyMember'
  | 'alreadyInOrganization'
  | 'noSeatsAvailable'
  | 'upgradeRequired'
  | 'externalRequiresPaidPlan'
  | 'invalidInvitation'
  | 'serverError'
  | 'unauthorized'
  | 'forbidden'
  | 'networkError'
  | 'unknown'

interface InviteError {
  code: InviteErrorCode
  messageKey: InviteErrorMessageKey
  /** A server-provided explanation shown instead of the generic message. */
  serverMessage?: string
  requiresAuth?: boolean
  canRetry?: boolean
}

const INVITE_ERRORS: Record<string, InviteError> = {
  'missing-token': { code: 'missing-token', messageKey: 'missingToken' },
  'invalid-token': { code: 'invalid-token', messageKey: 'invalidToken' },
  expired: { code: 'expired', messageKey: 'expired' },
  'already-processed': { code: 'already-processed', messageKey: 'alreadyProcessed' },
  'email-mismatch': { code: 'email-mismatch', messageKey: 'emailMismatch', requiresAuth: true },
  'workspace-not-found': { code: 'workspace-not-found', messageKey: 'workspaceNotFound' },
  'disclosure-outdated': {
    code: 'disclosure-outdated',
    messageKey: 'disclosureOutdated',
    canRetry: true,
  },
  'user-not-found': { code: 'user-not-found', messageKey: 'userNotFound', requiresAuth: true },
  'already-member': { code: 'already-member', messageKey: 'alreadyMember' },
  'already-in-organization': {
    code: 'already-in-organization',
    messageKey: 'alreadyInOrganization',
  },
  'no-seats-available': {
    code: 'no-seats-available',
    messageKey: 'noSeatsAvailable',
    canRetry: true,
  },
  'upgrade-required': { code: 'upgrade-required', messageKey: 'upgradeRequired', canRetry: true },
  'external-requires-paid-plan': {
    code: 'external-requires-paid-plan',
    messageKey: 'externalRequiresPaidPlan',
    canRetry: true,
  },
  'invalid-invitation': { code: 'invalid-invitation', messageKey: 'invalidInvitation' },
  'not-found': { code: 'invalid-invitation', messageKey: 'invalidInvitation' },
  'server-error': { code: 'server-error', messageKey: 'serverError', canRetry: true },
  unauthorized: { code: 'unauthorized', messageKey: 'unauthorized', requiresAuth: true },
  forbidden: { code: 'forbidden', messageKey: 'forbidden', requiresAuth: true },
  'network-error': { code: 'network-error', messageKey: 'networkError', canRetry: true },
}

const UNKNOWN_INVITE_ERROR: InviteError = { code: 'unknown', messageKey: 'unknown', canRetry: true }

function getInviteError(code: string): InviteError {
  return INVITE_ERRORS[code] || UNKNOWN_INVITE_ERROR
}

function codeFromStatus(status: number): InviteErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'invalid-invitation'
  if (status === 409) return 'already-in-organization'
  if (status >= 500) return 'server-error'
  return 'unknown'
}

function codeFromApiClientError(error: ApiClientError): string {
  if (error.code && getInviteError(error.code).code !== 'unknown') return error.code

  if (error.body && typeof error.body === 'object') {
    const code = (error.body as { error?: unknown }).error
    if (typeof code === 'string' && getInviteError(code).code !== 'unknown') return code
  }

  return codeFromStatus(error.status)
}

interface InviteProps {
  /** DISABLE_REGISTRATION. See {@link signedOutPrompt}. */
  registrationDisabled: boolean
}

export default function Invite({ registrationDisabled }: InviteProps) {
  const t = useTranslations('auth.invite')
  const router = useRouter()
  const params = useParams()
  const inviteId = params.id as string
  const inviteTokenStorageKey = `inviteToken:${inviteId}`
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<InviteError | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  /** `undefined` until the effect reads storage; `null` once read and empty. */
  const [storedToken, setStoredToken] = useState<string | null | undefined>(undefined)

  const isNewUser = searchParams.get('new') === 'true'
  const errorReason = searchParams.get('error')
  const urlError = errorReason ? getInviteError(errorReason) : null
  /** `|| null` so an empty `?token=` falls back to storage rather than querying with ''. */
  const tokenFromQuery = searchParams.get('token') || null
  /**
   * Derived during render so the invitation query key is correct on the first
   * commit; an effect-set token refetches under a second key whenever the
   * session cache is already warm at mount.
   */
  const token = tokenFromQuery ?? storedToken ?? null
  const isTokenResolved = tokenFromQuery !== null || storedToken !== undefined

  useEffect(() => {
    if (tokenFromQuery) {
      sessionStorage.setItem(inviteTokenStorageKey, tokenFromQuery)
      return
    }
    setStoredToken(sessionStorage.getItem(inviteTokenStorageKey))
  }, [tokenFromQuery, inviteTokenStorageKey])

  const invitationQuery = useInvitationDetails(inviteId, token, session?.user?.id ?? null, {
    enabled: Boolean(session?.user) && isTokenResolved,
  })
  const invitation = invitationQuery.data?.invitation ?? null
  const joinPreview = invitationQuery.data?.joinPreview ?? null
  const isWrongAccount = Boolean(
    invitation &&
      session?.user &&
      normalizeEmail(session.user.email || '') !== normalizeEmail(invitation.email)
  )
  const isDisclosureMissing = invitation?.membershipIntent === 'internal' && !joinPreview
  const isLoading = Boolean(session?.user) && (!isTokenResolved || invitationQuery.isPending)

  const fetchError = invitationQuery.error
    ? getInviteError(
        invitationQuery.error instanceof ApiClientError
          ? codeFromApiClientError(invitationQuery.error)
          : 'network-error'
      )
    : null
  /**
   * Action errors (accept failures) outrank fetch errors; the URL error param
   * only shows until the invitation loads successfully.
   */
  const error =
    actionError ??
    fetchError ??
    (isWrongAccount ? getInviteError('email-mismatch') : null) ??
    (invitationQuery.data ? null : urlError)

  const handleAcceptInvitation = async () => {
    if (!session?.user || !invitation || isWrongAccount || isDisclosureMissing || isAccepting)
      return
    setIsAccepting(true)

    try {
      const data = await requestJson(acceptInvitationContract, {
        params: { id: inviteId },
        body: {
          token: token ?? undefined,
          /**
           * Disclosure token: acceptance rejects with disclosure-outdated if
           * the sweep set no longer matches what this screen showed. Sent
           * whenever a preview rendered — a no-join preview means the user
           * was shown that nothing moves (an empty disclosed set), which
           * must also conflict if acceptance would sweep anything.
           */
          disclosedWorkspaceIds: joinPreview ? joinPreview.workspaceIdsToMove : undefined,
          disclosedOutcome: joinPreview?.outcome,
        },
      })

      setAccepted(true)
      setIsAccepting(false)
      setTimeout(() => router.push(data.redirectPath), 1200)

      runBestEffortCacheRefresh('session', () => refreshSessionQuery(queryClient))
      runBestEffortCacheRefresh('subscription', () =>
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.all })
      )
      runBestEffortCacheRefresh('organization', () =>
        queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      )
      /**
       * Acceptance can attach the invitee's owned workspaces into the org —
       * the workspace list must not keep serving the stale personal set.
       */
      runBestEffortCacheRefresh('workspaces', () =>
        queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      )
    } catch (acceptError) {
      logger.error('Error accepting invitation:', acceptError)
      const code =
        acceptError instanceof ApiClientError
          ? codeFromApiClientError(acceptError)
          : 'network-error'
      const serverMessage =
        acceptError instanceof ApiClientError &&
        acceptError.body &&
        typeof acceptError.body === 'object' &&
        typeof (acceptError.body as { message?: unknown }).message === 'string'
          ? ((acceptError.body as { message: string }).message as string)
          : null
      const baseError = getInviteError(code)
      setActionError(
        code === 'server-error' && serverMessage ? { ...baseError, serverMessage } : baseError
      )
      setIsAccepting(false)
    }
  }

  const getCallbackUrl = () => {
    const effectiveToken =
      token || sessionStorage.getItem(inviteTokenStorageKey) || searchParams.get('token')
    return `/invite/${inviteId}${effectiveToken ? `?token=${effectiveToken}` : ''}`
  }

  if (!session?.user && !isPending) {
    const prompt = signedOutPrompt({
      t,
      registrationDisabled,
      isNewUser,
      callbackUrl: getCallbackUrl(),
      navigate: router.push,
    })

    return (
      <InviteLayout>
        <InviteStatusCard
          type='login'
          title={t('invitedTitle')}
          description={prompt.description}
          icon='userPlus'
          actions={[...prompt.actions, { label: t('returnHome'), onClick: returnHome }]}
        />
      </InviteLayout>
    )
  }

  if (isLoading || isPending) {
    return (
      <InviteLayout>
        <InviteStatusCard type='loading' title='' description={t('loading')} />
      </InviteLayout>
    )
  }

  if (error) {
    const callbackUrl = getCallbackUrl()
    const errorMessage = error.serverMessage ?? t(`errors.${error.messageKey}`)

    if (error.code === 'email-mismatch') {
      return (
        <InviteLayout>
          <InviteStatusCard
            type='warning'
            title={t('wrongAccount')}
            description={errorMessage}
            icon='userPlus'
            actions={[
              {
                label: t('signInDifferent'),
                onClick: async () => {
                  const loginUrl = inviteAuthLink('/login', callbackUrl)
                  let canNavigateInApp = false
                  try {
                    const [, inMemoryResetSucceeded] = await Promise.all([
                      client.signOut(),
                      clearUserData(),
                    ])
                    canNavigateInApp = inMemoryResetSucceeded
                  } catch (error) {
                    logger.error('Error signing out:', { error })
                  }
                  if (canNavigateInApp) router.push(loginUrl)
                  else window.location.assign(loginUrl)
                },
              },
              { label: t('returnHome'), onClick: returnHome },
            ]}
          />
        </InviteLayout>
      )
    }

    if (error.code === 'already-in-organization') {
      return (
        <InviteLayout>
          <InviteStatusCard
            type='warning'
            title={t('alreadyInTeam')}
            description={errorMessage}
            icon='users'
            actions={[
              { label: t('manageTeamSettings'), onClick: () => router.push(APP_ENTRY_PATH) },
              { label: t('returnHome'), onClick: returnHome },
            ]}
          />
        </InviteLayout>
      )
    }

    if (error.requiresAuth) {
      return (
        <InviteLayout>
          <InviteStatusCard
            type='warning'
            title={t('authRequired')}
            description={errorMessage}
            icon='userPlus'
            actions={[
              {
                label: t('signInToContinue'),
                onClick: () => router.push(inviteAuthLink('/login', callbackUrl)),
              },
              ...(registrationDisabled
                ? []
                : [
                    {
                      label: t('createAccount'),
                      onClick: () => router.push(inviteAuthLink('/signup', callbackUrl)),
                    },
                  ]),
              { label: t('returnHome'), onClick: returnHome },
            ]}
          />
        </InviteLayout>
      )
    }

    const actions: Array<{ label: string; onClick: () => void }> = []
    if (error.canRetry) {
      actions.push({ label: t('tryAgain'), onClick: () => window.location.reload() })
    }
    actions.push({ label: t('returnHome'), onClick: returnHome })

    return (
      <InviteLayout>
        <InviteStatusCard
          type='error'
          title={t('invitationError')}
          description={errorMessage}
          icon='error'
          isExpiredError={error.code === 'expired'}
          actions={actions}
        />
      </InviteLayout>
    )
  }

  /**
   * Names every granted workspace, not just the primary one — an invitation can
   * span several, and the email already lists them all.
   */
  const formatNameList = (names: string[]) => {
    const listed = names
      .slice(0, MAX_LISTED_WORKSPACE_NAMES)
      .map((name) => `"${name}"`)
      .join(', ')
    const overflow = names.length - MAX_LISTED_WORKSPACE_NAMES
    return overflow > 0 ? t('nameListMore', { names: listed, count: overflow }) : listed
  }
  const grantedWorkspaceNames =
    invitation?.grants
      .map((grant) => grant.workspaceName)
      .filter((name): name is string => Boolean(name)) ?? []
  const displayName =
    invitation?.kind === 'workspace'
      ? grantedWorkspaceNames.length > 0
        ? formatNameList(grantedWorkspaceNames)
        : t('aWorkspace')
      : invitation?.organizationName || t('anOrganization')

  if (accepted) {
    return (
      <InviteLayout>
        <InviteStatusCard
          type='success'
          title={t('welcome')}
          description={t('joined', { name: displayName })}
          icon='success'
          actions={[{ label: t('returnHome'), onClick: returnHome }]}
        />
      </InviteLayout>
    )
  }

  const isOrg = invitation?.kind === 'organization'

  return (
    <InviteLayout>
      <InviteStatusCard
        type='invitation'
        title={isOrg ? t('organizationInvitation') : t('workspaceInvitation')}
        description={t('invitedToJoin', { name: displayName })}
        details={
          invitation && <InvitationDisclosure invitation={invitation} joinPreview={joinPreview} />
        }
        icon={isOrg ? 'users' : 'mail'}
        actions={[
          {
            label: t('accept'),
            onClick: handleAcceptInvitation,
            disabled: isAccepting || isDisclosureMissing,
            loading: isAccepting,
          },
          ...(isDisclosureMissing
            ? [
                {
                  label: t('refresh'),
                  onClick: () => void invitationQuery.refetch(),
                  disabled: invitationQuery.isFetching,
                },
              ]
            : []),
          { label: t('returnHome'), onClick: returnHome },
        ]}
      />
    </InviteLayout>
  )
}
