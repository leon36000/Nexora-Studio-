import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/desktop/components/desktop-handoff-shell', () => ({
  DesktopHandoffShell: () => null,
}))

import OAuthErrorPage from '@/app/oauth-error/page'

async function descriptionFor(error?: string) {
  const element = await OAuthErrorPage({
    searchParams: Promise.resolve(error ? { error } : {}),
  })
  return element.props.description as string
}

describe('OAuthErrorPage', () => {
  it('names the way out of each routine single sign-on refusal', async () => {
    expect(await descriptionFor('signup_disabled')).toContain('Account creation is disabled')
    expect(await descriptionFor('account_not_linked')).toContain('verify your address')
    expect(await descriptionFor('issuer_mismatch')).toContain('expected identity provider')
  })

  it('falls back to a retry message for unknown or prototype-shaped codes', async () => {
    expect(await descriptionFor('toString')).toContain('Please try again')
    expect(await descriptionFor()).toContain('return to Nexora')
  })
})
