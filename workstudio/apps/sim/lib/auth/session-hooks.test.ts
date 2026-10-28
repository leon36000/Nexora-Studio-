import { db } from '@sim/db'
import { resetEnvFlagsMock, setEnvFlags } from '@sim/testing'
import type { Session } from 'better-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { isBlocked } = vi.hoisted(() => ({ isBlocked: vi.fn() }))

vi.mock('@/lib/auth/access-control', () => ({
  getAccessControlConfig: async () => ({ blockedEmails: [], blockedSignupDomains: [] }),
  isEmailBlockedByAccessControl: isBlocked,
}))

import { SSO_REQUIRED_MESSAGE } from '@/lib/auth/constants'
import { runWithAuthDatabase } from '@/lib/auth/database-context'
import { prepareSessionForCreation } from '@/lib/auth/session-hooks'
import { invalidateSessionPolicyCache } from '@/lib/auth/session-policy'
import type { DbOrTx } from '@/lib/db/types'
import { NEXORA_SSO_REQUIRED } from '@/lib/nexora/auth-refusals'

const createdAt = new Date('2026-09-08T00:00:00Z')
const session: Session = {
  id: 'session-1',
  userId: 'user-1',
  token: 'session-token',
  createdAt,
  updatedAt: createdAt,
  expiresAt: new Date('2026-10-08T00:00:00Z'),
}

function transactionExecutor() {
  const limit = vi.fn()
  return {
    limit,
    executor: {
      ...db,
      select: vi.fn().mockReturnValue({
        from: () => ({
          where: () => ({ limit }),
          innerJoin: () => ({ where: () => ({ limit }) }),
          leftJoin: () => ({ where: () => ({ limit }) }),
        }),
      }),
    },
  }
}

describe('prepareSessionForCreation', () => {
  beforeEach(() => {
    setEnvFlags({ isBillingEnabled: true, isHosted: true, isAccessControlEnabled: false })
    invalidateSessionPolicyCache('org-1')
    isBlocked.mockReturnValue(false)
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('Global database read inside the auth transaction')
    })
  })

  afterEach(() => {
    resetEnvFlagsMock()
  })

  it('reads an uncommitted signup account without checking out another connection', async () => {
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'new@example.com', suspendedAt: null }])
    limit.mockResolvedValueOnce([])

    await expect(
      runWithAuthDatabase(executor, () => prepareSessionForCreation(session))
    ).resolves.toEqual({ data: session })
    expect(db.select).not.toHaveBeenCalled()
  })

  it('clamps a member session using transaction-scoped policy, billing block, and plan reads', async () => {
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: null }])
    limit.mockResolvedValueOnce([{ organizationId: 'org-1' }])
    limit.mockResolvedValueOnce([{ settings: { maxSessionHours: 24 } }])
    limit.mockResolvedValueOnce([{ billingBlocked: false, billingBlockedReason: null }])
    limit.mockResolvedValueOnce([{ plan: 'enterprise', status: 'active' }])

    await expect(
      runWithAuthDatabase(executor, () => prepareSessionForCreation(session))
    ).resolves.toEqual({
      data: {
        ...session,
        activeOrganizationId: 'org-1',
        expiresAt: new Date('2026-09-09T00:00:00Z'),
      },
    })
    expect(limit).toHaveBeenCalledTimes(5)
    expect(db.select).not.toHaveBeenCalled()
  })

  it('refuses a member signing in with a password when the organization requires SSO', async () => {
    setEnvFlags({ isBillingEnabled: false, isSsoEnabled: true })
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: null }])
    limit.mockResolvedValueOnce([{ organizationId: 'org-1', role: 'member' }])
    limit.mockResolvedValueOnce([{ requireSso: true }])
    limit.mockResolvedValueOnce([{ id: 'provider-1' }])

    await expect(
      runWithAuthDatabase(executor, () =>
        prepareSessionForCreation(session, { path: '/sign-in/email' })
      )
    ).rejects.toThrow(SSO_REQUIRED_MESSAGE)
  })

  it('still signs in through the identity provider when the membership read fails', async () => {
    setEnvFlags({ isBillingEnabled: false, isSsoEnabled: true })
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: null }])
    limit.mockRejectedValueOnce(new Error('connection reset'))

    /** A database blip must not cost a sign-in the requirement would have allowed anyway. */
    await expect(
      runWithAuthDatabase(executor, () =>
        prepareSessionForCreation(session, { path: '/sso/callback/okta' })
      )
    ).resolves.toEqual({ data: session })
  })

  it('refuses a password sign-in when the membership itself cannot be read', async () => {
    setEnvFlags({ isBillingEnabled: false, isSsoEnabled: true })
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: null }])
    limit.mockRejectedValueOnce(new Error('connection reset'))

    /** An unknown membership cannot be read as "no organization requires SSO of this person". */
    await expect(
      runWithAuthDatabase(executor, () =>
        prepareSessionForCreation(session, { path: '/sign-in/email' })
      )
    ).rejects.toThrow('connection reset')
  })

  it('refuses the sign-in when the requirement itself cannot be read', async () => {
    setEnvFlags({ isBillingEnabled: false, isSsoEnabled: true })
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: null }])
    limit.mockResolvedValueOnce([{ organizationId: 'org-1', role: 'member' }])
    limit.mockRejectedValueOnce(new Error('connection reset'))

    /** Failing open here would make a transient database error a way around the requirement. */
    await expect(
      runWithAuthDatabase(executor, () =>
        prepareSessionForCreation(session, { path: '/sign-in/email' })
      )
    ).rejects.toThrow('connection reset')
  })

  it('admits the same member through the identity provider', async () => {
    setEnvFlags({ isBillingEnabled: false, isSsoEnabled: true })
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: null }])
    limit.mockResolvedValueOnce([{ organizationId: 'org-1', role: 'member' }])
    limit.mockResolvedValueOnce([{ settings: null }])

    await expect(
      runWithAuthDatabase(executor, () =>
        prepareSessionForCreation(session, { path: '/sso/callback/okta' })
      )
    ).resolves.toMatchObject({ data: { activeOrganizationId: 'org-1' } })
  })

  it('refuses a suspended account before it can receive a session', async () => {
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'member@example.com', suspendedAt: createdAt }])

    await expect(
      runWithAuthDatabase(executor, () => prepareSessionForCreation(session))
    ).rejects.toMatchObject({ status: 'FORBIDDEN' })
    expect(limit).toHaveBeenCalledTimes(1)
    expect(db.select).not.toHaveBeenCalled()
  })

  it('keeps the blocked-email gate outside the optional membership lookup', async () => {
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'blocked@example.com', suspendedAt: null }])
    isBlocked.mockReturnValue(true)

    await expect(
      runWithAuthDatabase(executor, () => prepareSessionForCreation(session))
    ).rejects.toMatchObject({ status: 'FORBIDDEN' })
    expect(limit).toHaveBeenCalledTimes(1)
  })
})

describe('prepareSessionForCreation with Nexora single sign-on required', () => {
  beforeEach(() => {
    setEnvFlags({ isNexoraOidcEnabled: true, isNexoraOidcRequired: true })
    isBlocked.mockReturnValue(false)
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('Global database read inside the auth transaction')
    })
  })

  afterEach(() => {
    resetEnvFlagsMock()
  })

  function memberWithRole(role: string | null): DbOrTx {
    const { executor, limit } = transactionExecutor()
    limit.mockResolvedValueOnce([{ email: 'person@pme.fr', suspendedAt: null }])
    limit.mockResolvedValueOnce(role ? [{ organizationId: 'org-1', role }] : [])
    limit.mockResolvedValue([{ settings: null }])
    return executor as unknown as DbOrTx
  }

  it.each(['/sign-in/email', '/sign-up/email', '/email-otp/verify-email', '/verify-email'])(
    'refuses a member a session opened by %s',
    async (path) => {
      await expect(
        runWithAuthDatabase(memberWithRole('member'), () =>
          prepareSessionForCreation(session, { path })
        )
      ).rejects.toThrow(NEXORA_SSO_REQUIRED)
    }
  )

  it('refuses an account outside the instance organization a password session', async () => {
    await expect(
      runWithAuthDatabase(memberWithRole(null), () =>
        prepareSessionForCreation(session, { path: '/sign-up/email' })
      )
    ).rejects.toThrow(NEXORA_SSO_REQUIRED)
  })

  it.each(['owner', 'admin'])('keeps the password of an %s as a fallback', async (role) => {
    await expect(
      runWithAuthDatabase(memberWithRole(role), () =>
        prepareSessionForCreation(session, { path: '/sign-in/email' })
      )
    ).resolves.toMatchObject({ data: { activeOrganizationId: 'org-1' } })
  })

  it('admits a member through the company identity provider', async () => {
    await expect(
      runWithAuthDatabase(memberWithRole('member'), () =>
        prepareSessionForCreation(session, { path: '/callback/nexora-oidc' })
      )
    ).resolves.toMatchObject({ data: { activeOrganizationId: 'org-1' } })
  })

  it('does not hold members to it while single sign-on is optional', async () => {
    setEnvFlags({ isNexoraOidcRequired: false })
    await expect(
      runWithAuthDatabase(memberWithRole('member'), () =>
        prepareSessionForCreation(session, { path: '/sign-up/email' })
      )
    ).resolves.toMatchObject({ data: { activeOrganizationId: 'org-1' } })
  })
})
