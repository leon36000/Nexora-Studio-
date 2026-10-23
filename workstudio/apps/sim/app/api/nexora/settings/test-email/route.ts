import { type NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { testNexoraEmailContract } from '@/lib/api/contracts/nexora-settings'
import { parseRequest } from '@/lib/api/server'
import { getSession } from '@/lib/auth'
import { decryptSecret } from '@/lib/core/security/encryption'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import {
  readInstanceSettings,
  resolveSmtp,
  settingsEnvironment,
} from '@/lib/nexora/instance-settings'
import { deniedResponse } from '@/lib/nexora/model-responses'
import { sendTestEmail } from '@/lib/nexora/settings-checks'

export const dynamic = 'force-dynamic'

/**
 * Sends a test e-mail to the administrator's own address through the SMTP server on screen (a
 * blank password reuses the stored one), the stored one, or the one deploy/.env sets. A failure
 * is a result, not an error: the screen words its cause in French. Nothing is saved.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(testNexoraEmailContract, request, {})
  if (!parsed.success) return parsed.response

  const [stored, session] = await Promise.all([readInstanceSettings(), getSession()])
  const to = session?.user?.email
  if (!to) return deniedResponse(401)
  const smtp = await resolveSmtp(
    settingsEnvironment(),
    stored ?? {},
    async (value) => (await decryptSecret(value)).decrypted,
    parsed.data.body.smtp
  )
  if (!smtp) return NextResponse.json({ ok: false, reason: 'not-configured', detail: '' })

  const t = await getTranslations('settings.instanceEmail.testMessage')
  const result = await sendTestEmail(smtp, to, { subject: t('subject'), text: t('text') })
  return NextResponse.json(result.ok ? { ok: true, sentTo: to } : result)
})
