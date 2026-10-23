import { describe, expect, it } from 'vitest'
import { isPasswordSignInAllowed, isSignUpAllowed } from '@/lib/nexora/auth-policy'

const policy = { allowedDomains: ['pme.fr'], allowedEmails: [], ownerEmail: null }

describe('who may create an account', () => {
  it('refuses an outside address without an invitation', () => {
    expect(isSignUpAllowed({ ...policy, email: 'intrus@gmail.com', invited: false })).toBe(false)
  })

  it('lets an invited outside address in, as the setting promises', () => {
    expect(isSignUpAllowed({ ...policy, email: 'consultant@gmail.com', invited: true })).toBe(true)
  })

  it('lets an address of an allowed domain sign up alone, whatever its case', () => {
    expect(isSignUpAllowed({ ...policy, email: 'Marie@PME.fr', invited: false })).toBe(true)
    expect(isSignUpAllowed({ ...policy, email: 'marie@pme.fr.evil.com', invited: false })).toBe(
      false
    )
  })

  it('never locks out the owner named in deploy/.env', () => {
    expect(
      isSignUpAllowed({
        ...policy,
        ownerEmail: 'Patron@Gmail.com',
        email: 'patron@gmail.com',
        invited: false,
      })
    ).toBe(true)
  })

  it('leaves sign-up open when no domain or address is listed', () => {
    expect(
      isSignUpAllowed({
        allowedDomains: [],
        allowedEmails: [],
        ownerEmail: null,
        email: 'a@b.fr',
        invited: false,
      })
    ).toBe(true)
  })
})

describe('password sign-in when single sign-on is required', () => {
  it('keeps the password for owners and admins, as a fallback when the provider fails', () => {
    expect(isPasswordSignInAllowed({ ssoRequired: true, role: 'owner' })).toBe(true)
    expect(isPasswordSignInAllowed({ ssoRequired: true, role: 'admin' })).toBe(true)
  })

  it('sends members and unknown addresses to the identity provider', () => {
    expect(isPasswordSignInAllowed({ ssoRequired: true, role: 'member' })).toBe(false)
    expect(isPasswordSignInAllowed({ ssoRequired: true, role: null })).toBe(false)
    expect(isPasswordSignInAllowed({ ssoRequired: false, role: 'member' })).toBe(true)
  })
})
