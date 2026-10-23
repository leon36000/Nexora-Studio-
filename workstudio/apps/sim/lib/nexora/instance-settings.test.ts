import { describe, expect, it } from 'vitest'
import {
  applySettingsChange,
  isSsoRequiredAfterApply,
  publicSettings,
  resolveSmtp,
} from '@/lib/nexora/instance-settings'

const encrypt = async (secret: string) => `enc(${secret})`
const decrypt = async (value: string) => value.replace(/^enc\((.*)\)$/, '$1')

describe('instance settings', () => {
  it('encrypts secrets, keeps them when left empty, and clears them on request', async () => {
    const first = await applySettingsChange(
      {},
      {
        smtp: {
          host: 'smtp.pme.fr',
          port: 587,
          user: 'nexora',
          password: 'mdp',
          from: 'nexora@pme.fr',
        },
      },
      encrypt
    )
    expect(first.smtp?.password).toBe('enc(mdp)')
    const kept = await applySettingsChange(
      first,
      { smtp: { host: 'smtp.pme.fr', port: 465, user: 'nexora' } },
      encrypt
    )
    expect(kept.smtp).toMatchObject({ host: 'smtp.pme.fr', port: 465, password: 'enc(mdp)' })
    const cleared = await applySettingsChange(kept, { smtp: null }, encrypt)
    expect(cleared.smtp).toBeUndefined()
  })

  it('never shows a secret, only that one is set, and says when deploy/.env wins', () => {
    const view = publicSettings(
      {
        sso: { issuer: 'https://sso.pme.fr/realms/pme', clientId: 'ws', clientSecret: 'enc(s)' },
        smtp: { host: 'h', port: 25, password: 'enc(p)' },
      },
      { SMTP_HOST: 'smtp.env' }
    )
    expect(JSON.stringify(view)).not.toContain('enc(')
    expect(view.sso).toMatchObject({ clientId: 'ws', hasSecret: true })
    expect(view.smtp).toMatchObject({ hasPassword: true })
    expect(view.envOverrides).toEqual({ sso: false, smtp: true, domains: false })
  })

  it('reads SMTP from deploy/.env first, then from the interface settings', async () => {
    const stored = {
      smtp: { host: 'smtp.pme.fr', port: 587, user: 'u', password: 'enc(p)', from: 'n@pme.fr' },
    }
    expect(await resolveSmtp({}, stored, decrypt)).toEqual({
      host: 'smtp.pme.fr',
      port: 587,
      user: 'u',
      password: 'p',
      from: 'n@pme.fr',
    })
    expect(
      await resolveSmtp({ SMTP_HOST: 'smtp.env', SMTP_PORT: 25 }, stored, decrypt)
    ).toMatchObject({ host: 'smtp.env', port: 25 })
    expect(await resolveSmtp({}, {}, decrypt)).toBeNull()
  })

  it('counts a revision per change, so the screen knows what the running instance has not applied', async () => {
    const first = await applySettingsChange({}, { allowedDomains: ['pme.fr'] }, encrypt)
    const second = await applySettingsChange(first, { smtp: null }, encrypt)
    expect([first.revision, second.revision]).toEqual([1, 2])
  })

  it('normalizes allowed sign-up domains and refuses nothing silently', async () => {
    const next = await applySettingsChange(
      {},
      { allowedDomains: [' PME.fr ', '@filiale.fr', '', 'pme.fr'] },
      encrypt
    )
    expect(next.allowedDomains).toEqual(['pme.fr', 'filiale.fr'])
  })

  it('tests a draft SMTP with the stored password when the draft leaves it empty', async () => {
    const stored = { smtp: { host: 'smtp.pme.fr', port: 587, user: 'u', password: 'enc(p)' } }
    expect(
      await resolveSmtp({}, stored, decrypt, { host: 'smtp.pme.fr', port: 465, user: 'u' })
    ).toEqual({ host: 'smtp.pme.fr', port: 465, user: 'u', password: 'p' })
    expect(
      await resolveSmtp({}, stored, decrypt, { host: 'smtp.other.fr', port: 465, user: 'u' })
    ).toEqual({ host: 'smtp.other.fr', port: 465, user: 'u' })
    expect(
      await resolveSmtp({}, stored, decrypt, { host: 'h', port: 25, password: 'new' })
    ).toMatchObject({ password: 'new' })
  })

  it('treats values the startup copied from the interface settings as the interface, not deploy/.env', async () => {
    const stored = { smtp: { host: 'smtp.new.fr', port: 587 } }
    const environment = { SMTP_HOST: 'smtp.old.fr', NEXORA_SETTINGS_FROM_DB: 'smtp' }
    expect(publicSettings(stored, environment).envOverrides.smtp).toBe(false)
    expect(await resolveSmtp(environment, stored, decrypt)).toMatchObject({ host: 'smtp.new.fr' })
  })

  it('drops a stored secret when the server or account it belongs to changes', async () => {
    const stored = await applySettingsChange(
      {},
      {
        sso: {
          issuer: 'https://sso.pme.fr/realms/pme',
          clientId: 'workstudio',
          clientSecret: 'oidc',
          buttonName: 'PME',
        },
        smtp: { host: 'smtp.pme.fr', port: 587, user: 'nexora', password: 'mdp' },
      },
      encrypt
    )
    const sameProvider = await applySettingsChange(
      stored,
      { sso: { issuer: 'https://sso.pme.fr/realms/pme', clientId: 'workstudio', buttonName: 'X' } },
      encrypt
    )
    expect(sameProvider.sso?.clientSecret).toBe('enc(oidc)')

    for (const sso of [
      { issuer: 'https://idp.attacker.example', clientId: 'workstudio', buttonName: 'PME' },
      { issuer: 'https://sso.pme.fr/realms/pme', clientId: 'other', buttonName: 'PME' },
    ]) {
      expect(
        (await applySettingsChange(stored, { sso }, encrypt)).sso?.clientSecret
      ).toBeUndefined()
    }
    for (const smtp of [
      { host: 'smtp.attacker.example', port: 587, user: 'nexora' },
      { host: 'smtp.pme.fr', port: 587, user: 'other' },
    ]) {
      expect((await applySettingsChange(stored, { smtp }, encrypt)).smtp?.password).toBeUndefined()
    }
  })

  it('says when a Resend key in deploy/.env sends the e-mail instead of the SMTP server', () => {
    const stored = { smtp: { host: 'smtp.pme.fr', port: 587 } }
    expect(publicSettings(stored, {}).resendTakesPrecedence).toBe(false)
    expect(publicSettings(stored, { RESEND_API_KEY: 're_123' }).resendTakesPrecedence).toBe(true)
    expect(JSON.stringify(publicSettings(stored, { RESEND_API_KEY: 're_123' }))).not.toContain(
      're_'
    )
  })

  it('knows whether single sign-on will be required once the saved settings apply', () => {
    const sso = {
      issuer: 'https://sso.pme.fr/realms/pme',
      clientId: 'ws',
      clientSecret: 'enc(s)',
      buttonName: 'PME',
      required: true,
    }
    expect(isSsoRequiredAfterApply({ sso }, {})).toBe(true)
    expect(isSsoRequiredAfterApply({ sso: { ...sso, required: false } }, {})).toBe(false)
    expect(isSsoRequiredAfterApply({ sso: { ...sso, buttonName: undefined } }, {})).toBe(false)
    expect(isSsoRequiredAfterApply({ sso }, { NEXORA_OIDC_ISSUER: 'https://env.pme.fr' })).toBe(
      false
    )
    expect(
      isSsoRequiredAfterApply(
        {},
        { NEXORA_OIDC_ISSUER: 'https://env.pme.fr', NEXORA_OIDC_REQUIRED: 'true' }
      )
    ).toBe(true)
  })
})
