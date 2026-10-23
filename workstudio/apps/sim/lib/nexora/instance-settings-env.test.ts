import { describe, expect, it } from 'vitest'
import {
  applyStoredSettingsToEnv,
  deriveInstanceOrganizationSlug,
  envOverrides,
} from '@/lib/nexora/instance-settings-env'

const decrypt = async (value: string) => value.replace(/^enc\((.*)\)$/, '$1')

const stored = {
  revision: 4,
  sso: {
    issuer: 'https://sso.pme.fr/realms/pme',
    clientId: 'workstudio',
    clientSecret: 'enc(s3cret)',
    buttonName: 'PME',
    required: true,
  },
  smtp: { host: 'smtp.pme.fr', port: 587, user: 'nexora', password: 'enc(mdp)', from: 'n@pme.fr' },
  allowedDomains: ['pme.fr', 'filiale.fr'],
}

describe('applying stored instance settings at startup', () => {
  it('fills single sign-on, e-mail and sign-up domains, decrypting the secrets', async () => {
    const env: Record<string, string | undefined> = {}
    const result = await applyStoredSettingsToEnv(env, stored, decrypt)
    expect(result).toEqual({ applied: ['sso', 'smtp', 'domains'], failed: [] })
    expect(env).toMatchObject({
      NEXORA_OIDC_ISSUER: 'https://sso.pme.fr/realms/pme',
      NEXORA_OIDC_CLIENT_ID: 'workstudio',
      NEXORA_OIDC_CLIENT_SECRET: 's3cret',
      NEXT_PUBLIC_NEXORA_OIDC_NAME: 'PME',
      NEXORA_OIDC_REQUIRED: 'true',
      SMTP_HOST: 'smtp.pme.fr',
      SMTP_PORT: '587',
      SMTP_USER: 'nexora',
      SMTP_PASS: 'mdp',
      FROM_EMAIL_ADDRESS: 'n@pme.fr',
      ALLOWED_LOGIN_DOMAINS: 'pme.fr,filiale.fr',
      NEXORA_SETTINGS_FROM_DB: 'sso,smtp,domains',
      NEXORA_SETTINGS_REVISION: '4',
    })
  })

  it('leaves a whole group to deploy/.env when it sets it, never mixing the two sources', async () => {
    const env: Record<string, string | undefined> = {
      NEXORA_OIDC_ISSUER: 'https://env.pme.fr',
      SMTP_HOST: 'smtp.env.fr',
      ALLOWED_LOGIN_DOMAINS: 'env.fr',
      FROM_EMAIL_ADDRESS: 'env@pme.fr',
    }
    const result = await applyStoredSettingsToEnv(env, stored, decrypt)
    expect(result.applied).toEqual([])
    expect(env.NEXORA_OIDC_CLIENT_SECRET).toBeUndefined()
    expect(env.NEXT_PUBLIC_NEXORA_OIDC_NAME).toBeUndefined()
    expect(env.SMTP_PASS).toBeUndefined()
    expect(env.SMTP_HOST).toBe('smtp.env.fr')
    expect(env.ALLOWED_LOGIN_DOMAINS).toBe('env.fr')
  })

  it('treats the empty values docker compose passes for unset variables as unset', async () => {
    const env: Record<string, string | undefined> = {
      NEXORA_OIDC_ISSUER: '',
      NEXT_PUBLIC_NEXORA_OIDC_NAME: '',
      SMTP_HOST: ' ',
      SMTP_PORT: '',
      ALLOWED_LOGIN_DOMAINS: '',
      FROM_EMAIL_ADDRESS: 'env@pme.fr',
    }
    const result = await applyStoredSettingsToEnv(env, stored, decrypt)
    expect(result.applied).toEqual(['sso', 'smtp', 'domains'])
    expect(env.NEXT_PUBLIC_NEXORA_OIDC_NAME).toBe('PME')
    expect(env.SMTP_PORT).toBe('587')
    expect(env.FROM_EMAIL_ADDRESS).toBe('n@pme.fr')
  })

  it('takes a group applied from the interface entirely from it, even past stray deploy/.env values', async () => {
    const env: Record<string, string | undefined> = {
      SMTP_USER: 'env-user',
      SMTP_PASS: 'env-password',
      FROM_EMAIL_ADDRESS: 'env@pme.fr',
      NEXORA_OIDC_REQUIRED: 'false',
      NEXORA_OIDC_CLIENT_SECRET: 'env-secret',
    }
    await applyStoredSettingsToEnv(
      env,
      { ...stored, smtp: { host: 'smtp.pme.fr', port: 587 } },
      decrypt
    )
    expect(env.SMTP_HOST).toBe('smtp.pme.fr')
    expect(env.SMTP_USER).toBeUndefined()
    expect(env.SMTP_PASS).toBeUndefined()
    expect(env.FROM_EMAIL_ADDRESS).toBeUndefined()
    expect(env.NEXORA_OIDC_REQUIRED).toBe('true')
    expect(env.NEXORA_OIDC_CLIENT_SECRET).toBe('s3cret')
  })

  it('skips an incomplete single sign-on, which would show a button nobody can use', async () => {
    const env: Record<string, string | undefined> = {}
    const result = await applyStoredSettingsToEnv(
      env,
      { sso: { issuer: 'https://sso.pme.fr', clientId: 'ws', clientSecret: 'enc(s)' } },
      decrypt
    )
    expect(result.applied).toEqual([])
    expect(env.NEXORA_OIDC_ISSUER).toBeUndefined()
  })

  it('boots without a group whose secret no longer decrypts, and says which one', async () => {
    const env: Record<string, string | undefined> = {}
    const failing = async (value: string) => {
      if (value === 'enc(s3cret)') throw new Error('bad key')
      return decrypt(value)
    }
    const result = await applyStoredSettingsToEnv(env, stored, failing)
    expect(result).toEqual({ applied: ['smtp', 'domains'], failed: ['sso'] })
    expect(env.NEXORA_OIDC_ISSUER).toBeUndefined()
    expect(env.SMTP_PASS).toBe('mdp')
  })

  it('reports as deploy/.env only what the startup did not fill from the interface settings', async () => {
    const env: Record<string, string | undefined> = { SMTP_HOST: 'smtp.env.fr' }
    await applyStoredSettingsToEnv(env, stored, decrypt)
    expect(envOverrides(env)).toEqual({ sso: false, smtp: true, domains: false })
    expect(envOverrides({ ALLOWED_LOGIN_DOMAINS: 'pme.fr' })).toEqual({
      sso: false,
      smtp: false,
      domains: true,
    })
  })
})

describe('instance organization slug', () => {
  it('folds accents and prefers the explicit slug, like the instance organization itself', () => {
    expect(deriveInstanceOrganizationSlug({ INSTANCE_ORG_NAME: 'Société Générale' })).toBe(
      'societe-generale'
    )
    expect(
      deriveInstanceOrganizationSlug({ INSTANCE_ORG_NAME: 'PME', INSTANCE_ORG_SLUG: ' pme-fr ' })
    ).toBe('pme-fr')
    expect(deriveInstanceOrganizationSlug({ INSTANCE_ORG_NAME: '  ' })).toBeNull()
  })
})
