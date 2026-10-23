import { authMockFns } from '@sim/testing/mocks/auth.mock'
import { encryptionMock, encryptionMockFns } from '@sim/testing/mocks/encryption.mock'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  applied: vi.fn(),
  sendTestEmail: vi.fn(),
  checkOidcDiscovery: vi.fn(),
  supervised: vi.fn(),
  restart: vi.fn(),
}))

vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)

vi.mock('@/lib/nexora/instance-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/nexora/instance-settings')>()
  return {
    ...actual,
    readInstanceSettings: store.read,
    saveInstanceSettings: store.save,
    recordSettingsApplied: store.applied,
  }
})

vi.mock('@/lib/nexora/settings-checks', () => ({
  sendTestEmail: store.sendTestEmail,
  checkOidcDiscovery: store.checkOidcDiscovery,
}))

vi.mock('@/lib/nexora/restart', () => ({
  isRestartSupervised: store.supervised,
  scheduleGracefulRestart: store.restart,
}))

vi.mock('@/lib/core/security/encryption', () => encryptionMock)
encryptionMockFns.mockDecryptSecret.mockImplementation(async (value: string) => ({
  decrypted: value.replace(/^enc\((.*)\)$/, '$1'),
}))

import { POST as APPLY } from '@/app/api/nexora/settings/apply/route'
import { GET, PUT } from '@/app/api/nexora/settings/route'
import { POST as TEST_EMAIL } from '@/app/api/nexora/settings/test-email/route'
import { POST as TEST_SSO } from '@/app/api/nexora/settings/test-sso/route'

const authorize = nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin

const stored = {
  revision: 3,
  sso: {
    issuer: 'https://sso.pme.fr/realms/pme',
    clientId: 'workstudio',
    clientSecret: 'enc(oidc-secret)',
    buttonName: 'PME',
  },
  smtp: { host: 'smtp.pme.fr', port: 587, user: 'nexora', password: 'enc(smtp-secret)' },
  allowedDomains: ['pme.fr'],
}

function request(method: string, path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Nexora instance settings routes', () => {
  beforeEach(() => {
    authorize.mockResolvedValue({ ok: true, userId: 'u-admin', organizationId: 'org-1' })
    authMockFns.mockGetSession.mockResolvedValue({ user: { id: 'u-admin', email: 'admin@pme.fr' } })
    store.read.mockResolvedValue(stored)
    store.save.mockImplementation(async () => ({ ...stored, revision: 4 }))
    store.supervised.mockReturnValue(true)
  })

  afterEach(() => {
    resetEnvMock()
  })

  it('serves, saves, sends and restarts nothing for a non-admin', async () => {
    authorize.mockResolvedValue({ ok: false, status: 403 })
    const responses = [
      await GET(request('GET', '/api/nexora/settings'), {}),
      await PUT(request('PUT', '/api/nexora/settings', { allowedDomains: ['x.fr'] }), {}),
      await TEST_EMAIL(request('POST', '/api/nexora/settings/test-email', {}), {}),
      await TEST_SSO(request('POST', '/api/nexora/settings/test-sso', {}), {}),
      await APPLY(request('POST', '/api/nexora/settings/apply'), {}),
    ]
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403])
    for (const call of authorize.mock.calls) {
      expect(call[0]).toEqual({ requireInstanceOrganization: true })
    }
    for (const fn of [store.read, store.save, store.sendTestEmail, store.restart]) {
      expect(fn).not.toHaveBeenCalled()
    }
  })

  it('never returns a secret, only that one is set', async () => {
    const response = await GET(request('GET', '/api/nexora/settings'), {})
    const text = await response.text()
    expect(text).not.toContain('secret')
    const body = JSON.parse(text)
    expect(body.sso).toMatchObject({ clientId: 'workstudio', hasSecret: true })
    expect(body.smtp).toMatchObject({ host: 'smtp.pme.fr', hasPassword: true })
    expect(body.redirectUri).toMatch(/\/api\/auth\/oauth2\/callback\/nexora-oidc$/)

    const saved = await PUT(
      request('PUT', '/api/nexora/settings', {
        smtp: { host: 'smtp.pme.fr', port: 465, password: 'new-smtp-secret' },
      }),
      {}
    )
    expect(saved.status).toBe(200)
    expect(await saved.text()).not.toContain('secret')
  })

  it('reports what deploy/.env sets and refuses to shadow it', async () => {
    setEnv({ SMTP_HOST: 'smtp.env.fr' })
    const body = await (await GET(request('GET', '/api/nexora/settings'), {})).json()
    expect(body.envOverrides).toEqual({ sso: false, smtp: true, domains: false })

    const refused = await PUT(
      request('PUT', '/api/nexora/settings', { smtp: { host: 'smtp.pme.fr', port: 587 } }),
      {}
    )
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: 'env-override' })
    expect(store.save).not.toHaveBeenCalled()
  })

  it('does not count values the startup copied from the interface as deploy/.env', async () => {
    setEnv({
      SMTP_HOST: 'smtp.pme.fr',
      NEXORA_SETTINGS_FROM_DB: 'smtp',
      NEXORA_SETTINGS_REVISION: '2',
    })
    const body = await (await GET(request('GET', '/api/nexora/settings'), {})).json()
    expect(body.envOverrides.smtp).toBe(false)
    expect(body.pendingApply).toBe(true)
  })

  it('refuses a malformed change before saving anything', async () => {
    for (const change of [
      { sso: { issuer: 'file:///etc/passwd', clientId: 'c', buttonName: 'PME' } },
      { smtp: { host: 'smtp pme', port: 587 } },
      { allowedDomains: ['not a domain'] },
    ]) {
      expect((await PUT(request('PUT', '/api/nexora/settings', change), {})).status).toBe(400)
    }
    expect(store.save).not.toHaveBeenCalled()
  })

  it('sends the test e-mail to the administrator with the draft, reusing the stored password', async () => {
    store.sendTestEmail.mockResolvedValue({ ok: true })
    const response = await TEST_EMAIL(
      request('POST', '/api/nexora/settings/test-email', {
        smtp: { host: 'smtp2.pme.fr', port: 465, user: 'nexora' },
      }),
      {}
    )
    expect(await response.json()).toEqual({ ok: true, sentTo: 'admin@pme.fr' })
    expect(store.sendTestEmail.mock.calls[0][0]).toMatchObject({
      host: 'smtp2.pme.fr',
      port: 465,
      password: 'smtp-secret',
    })
    expect(store.sendTestEmail.mock.calls[0][1]).toBe('admin@pme.fr')
    expect(store.save).not.toHaveBeenCalled()
  })

  it('answers a failed SMTP test with its cause and never echoes the password', async () => {
    store.sendTestEmail.mockResolvedValue({ ok: false, reason: 'auth', detail: '535 bad login' })
    const response = await TEST_EMAIL(request('POST', '/api/nexora/settings/test-email', {}), {})
    const text = await response.text()
    expect(JSON.parse(text)).toEqual({ ok: false, reason: 'auth', detail: '535 bad login' })
    expect(text).not.toContain('smtp-secret')

    store.read.mockResolvedValue({})
    const none = await TEST_EMAIL(request('POST', '/api/nexora/settings/test-email', {}), {})
    expect(await none.json()).toMatchObject({ ok: false, reason: 'not-configured' })
  })

  it('tests the issuer on screen, else the stored one', async () => {
    store.checkOidcDiscovery.mockResolvedValue({ ok: false, reason: 'unreachable' })
    await TEST_SSO(
      request('POST', '/api/nexora/settings/test-sso', { issuer: 'https://kc.pme.fr/realms/x' }),
      {}
    )
    await TEST_SSO(request('POST', '/api/nexora/settings/test-sso', {}), {})
    expect(store.checkOidcDiscovery.mock.calls.map((c) => c[0])).toEqual([
      'https://kc.pme.fr/realms/x',
      'https://sso.pme.fr/realms/pme',
    ])
  })

  it('restarts only a supervised server, after recording who applied', async () => {
    store.supervised.mockReturnValue(false)
    const refused = await APPLY(request('POST', '/api/nexora/settings/apply'), {})
    expect([refused.status, (await refused.json()).error]).toEqual([409, 'not-supervised'])
    expect(store.restart).not.toHaveBeenCalled()

    store.supervised.mockReturnValue(true)
    const response = await APPLY(request('POST', '/api/nexora/settings/apply'), {})
    expect(await response.json()).toEqual({ restarting: true })
    expect(store.applied).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u-admin', organizationId: 'org-1' }),
      3
    )
    expect(store.restart).toHaveBeenCalledTimes(1)
  })
})
