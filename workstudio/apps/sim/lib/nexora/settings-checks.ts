import { toStringOrNull } from '@sim/utils/coerce'
import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import nodemailer from 'nodemailer'
import { getSmtpEhloName } from '@/lib/messaging/email/ehlo'
import { getFromEmailAddress } from '@/lib/messaging/email/utils'

/**
 * Nexora edition: the « Envoyer un e-mail de test » and « Tester la configuration » checks of
 * Réglages › E-mail and › Sécurité. Each failure is a code the screen words in French; the raw
 * server message stays in `detail` for the administrator.
 */
export type SmtpTestFailure = 'auth' | 'connection' | 'timeout' | 'tls' | 'rejected' | 'unknown'

export type OidcCheckFailure =
  | 'invalid-issuer'
  | 'unreachable'
  | 'timeout'
  | 'not-found'
  | 'invalid'

const SMTP_TIMEOUT_MS = 10_000
const DISCOVERY_TIMEOUT_MS = 8_000

const CONNECTION_CODES = new Set([
  'ECONNECTION',
  'ESOCKET',
  'EDNS',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ECONNRESET',
])

export function classifySmtpError(error: unknown): SmtpTestFailure {
  if (!(error instanceof Error)) return 'unknown'
  const fields = toRecord(error)
  const code = toStringOrNull(fields.code)
  if (code === 'EAUTH') return 'auth'
  if (code === 'ETIMEDOUT' || code === 'ETIMEOUT') return 'timeout'
  if (code === 'ETLS' || /ssl|tls|wrong version number|certificate/i.test(error.message)) {
    return 'tls'
  }
  if (code === 'EENVELOPE' || code === 'EMESSAGE') return 'rejected'
  if (code && CONNECTION_CODES.has(code)) return 'connection'
  return 'unknown'
}

interface SmtpServer {
  host: string
  port: number
  user?: string
  password?: string
  from?: string
}

interface TestMessage {
  subject: string
  text: string
}

/** Sends one message through `smtp` directly, whatever transport the running mailer uses. */
export async function sendTestEmail(
  smtp: SmtpServer,
  to: string,
  message: TestMessage
): Promise<{ ok: true } | { ok: false; reason: SmtpTestFailure; detail: string }> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user && smtp.password ? { user: smtp.user, pass: smtp.password } : undefined,
    name: getSmtpEhloName(),
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  })
  try {
    await transporter.sendMail({
      from: smtp.from || getFromEmailAddress(),
      to,
      subject: message.subject,
      text: message.text,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: classifySmtpError(error), detail: getErrorMessage(error, '') }
  } finally {
    transporter.close()
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

/**
 * Reads `<issuer>/.well-known/openid-configuration`, as Better Auth will at startup. A provider
 * that announces another issuer address still works, but the browser is sent to the address it
 * announces, so the screen warns (`issuerMatches: false`).
 */
export async function checkOidcDiscovery(
  issuer: string,
  fetchImpl: FetchLike = fetch
): Promise<
  | { ok: true; issuer: string; authorizationEndpoint: string; issuerMatches: boolean }
  | { ok: false; reason: OidcCheckFailure }
> {
  const base = issuer.trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s/]+/i.test(base)) return { ok: false, reason: 'invalid-issuer' }

  let response: Response
  try {
    response = await fetchImpl(`${base}/.well-known/openid-configuration`, {
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
    })
  } catch (error) {
    const name = error instanceof Error || error instanceof DOMException ? error.name : ''
    return { ok: false, reason: name === 'TimeoutError' ? 'timeout' : 'unreachable' }
  }
  if (!response.ok) return { ok: false, reason: 'not-found' }

  let document: Record<string, unknown>
  try {
    document = toRecord(await response.json())
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  const announced = toStringOrNull(document.issuer)
  const authorizationEndpoint = toStringOrNull(document.authorization_endpoint)
  if (!announced || !authorizationEndpoint || !toStringOrNull(document.token_endpoint)) {
    return { ok: false, reason: 'invalid' }
  }
  return {
    ok: true,
    issuer: announced,
    authorizationEndpoint,
    issuerMatches: announced.replace(/\/+$/, '') === base,
  }
}
