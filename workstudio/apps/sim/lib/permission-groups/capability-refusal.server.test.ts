import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { runWithRequestLocale } from '@/lib/i18n/request-locale.server'
import { capabilityRefusal } from '@/lib/permission-groups/capability-refusal.server'

const FRENCH =
  'Non autorisé par le groupe d’accès de votre organisation : modification des workflows.'
const ENGLISH = "Editing workflows is not available under your organization's permission group"

async function refusalFor(headers: Record<string, string>): Promise<string> {
  const route = withRouteHandler(async () =>
    Response.json({ message: capabilityRefusal('workflows.edit') })
  )
  const response = await route(new NextRequest('http://localhost/api/test', { headers }), {})
  const body = (await response.json()) as { message: string }
  return body.message
}

describe('capability refusal', () => {
  it('is worded in the instance default language outside any request', () => {
    expect(capabilityRefusal('workflows.edit')).toBe(FRENCH)
  })

  it('is worded in the language of the request it answers', () => {
    expect(runWithRequestLocale('en', () => capabilityRefusal('workflows.edit'))).toBe(ENGLISH)
  })

  it("follows the member's saved language, then the browser's", async () => {
    expect(await refusalFor({ cookie: 'NEXORA_LOCALE=en', 'accept-language': 'fr' })).toBe(ENGLISH)
    expect(await refusalFor({ 'accept-language': 'en-GB,en;q=0.8' })).toBe(ENGLISH)
    expect(await refusalFor({})).toBe(FRENCH)
  })
})
