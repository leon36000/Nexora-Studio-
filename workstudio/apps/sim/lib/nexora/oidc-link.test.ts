import { db } from '@sim/db'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runWithAuthDatabase } from '@/lib/auth/database-context'
import type { DbOrTx } from '@/lib/db/types'
import { NEXORA_SSO_LINK_REFUSED } from '@/lib/nexora/auth-refusals'
import { assertNexoraOidcLinkAllowed } from '@/lib/nexora/oidc-link'

/** The adapter's transaction: existing accounts of the user, then their address and role. */
function existingUser(person: { email: string; role: string | null } | null) {
  const limit = vi.fn()
  limit.mockResolvedValueOnce(person ? [{ id: 'credential-account' }] : [])
  if (person) limit.mockResolvedValueOnce([person])
  const chain = {
    from: () => chain,
    where: () => chain,
    leftJoin: () => chain,
    innerJoin: () => chain,
    limit,
  }
  const select = vi.fn(() => chain)
  return { select, executor: { ...db, select } as unknown as DbOrTx }
}

interface OAuthState {
  callbackURL: string
  link?: { email: string; userId: string }
}
const SIGN_IN_STATE: OAuthState = { callbackURL: '/workspace' }
const LINK_STATE: OAuthState = {
  callbackURL: '/workspace',
  link: { email: 'owner@pme.fr', userId: 'user-1' },
}
const SIGN_IN = { loadOAuthState: async () => SIGN_IN_STATE }
const LINK_FROM_SESSION = { loadOAuthState: async () => LINK_STATE }
const IDP_ACCOUNT = { userId: 'user-1', providerId: 'nexora-oidc' }

function link(user: ReturnType<typeof existingUser>, flow = SIGN_IN) {
  return runWithAuthDatabase(user.executor, () => assertNexoraOidcLinkAllowed(IDP_ACCOUNT, flow))
}

describe('linking the company identity provider to an account', () => {
  beforeEach(() => {
    setEnv({
      NEXORA_OIDC_ISSUER: 'https://idp.example.com/realms/pme',
      NEXORA_SETTINGS_FROM_DB: 'sso',
      ALLOWED_LOGIN_DOMAINS: 'pme.fr',
    })
  })

  afterEach(() => {
    resetEnvMock()
  })

  it('lets the provider create a new account (the sign-up policy already ran)', async () => {
    await expect(link(existingUser(null))).resolves.toBeUndefined()
  })

  it.each(['owner', 'admin'])(
    'never links an existing %s account on sign-in, even in an allowed domain',
    async (role) => {
      await expect(link(existingUser({ email: 'boss@pme.fr', role }))).rejects.toThrow(
        NEXORA_SSO_LINK_REFUSED
      )
    }
  )

  it('links an owner who asked for it from their own session', async () => {
    await expect(
      link(existingUser({ email: 'owner@pme.fr', role: 'owner' }), LINK_FROM_SESSION)
    ).resolves.toBeUndefined()
  })

  it('links a member of an allowed domain on their first sign-in', async () => {
    await expect(
      link(existingUser({ email: 'Marie@PME.fr', role: 'member' }))
    ).resolves.toBeUndefined()
  })

  it('refuses a member outside the allowed domains', async () => {
    await expect(link(existingUser({ email: 'victim@gmail.com', role: 'member' }))).rejects.toThrow(
      NEXORA_SSO_LINK_REFUSED
    )
  })

  it('without allowed domains, links only when deploy/.env names the provider', async () => {
    setEnv({ ALLOWED_LOGIN_DOMAINS: '' })
    await expect(link(existingUser({ email: 'victim@gmail.com', role: 'member' }))).rejects.toThrow(
      NEXORA_SSO_LINK_REFUSED
    )

    setEnv({ NEXORA_SETTINGS_FROM_DB: '' })
    await expect(
      link(existingUser({ email: 'marie@gmail.com', role: 'member' }))
    ).resolves.toBeUndefined()
  })

  it('leaves every other provider alone', async () => {
    const owner = existingUser({ email: 'boss@pme.fr', role: 'owner' })
    await expect(
      runWithAuthDatabase(owner.executor, () =>
        assertNexoraOidcLinkAllowed({ userId: 'user-1', providerId: 'github' }, SIGN_IN)
      )
    ).resolves.toBeUndefined()
    expect(owner.select).not.toHaveBeenCalled()
  })
})
