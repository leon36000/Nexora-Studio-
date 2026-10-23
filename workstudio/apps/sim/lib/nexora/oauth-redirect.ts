import { isIpLiteral, isPrivateIpHost, unwrapIpv6Brackets } from '@sim/security/ssrf'

const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal'] as const

/**
 * Whether a provider can send the person back to Nexora Connect's OAuth callback. A loopback,
 * private or link-local address, a single-label name (`nexora-connect`) or a `.local` /
 * `.localhost` / `.internal` name is reachable only from the instance's own network, so OAuth is
 * shown as unavailable until `NEXORA_CONNECT_PUBLIC_URL` gives Connect a public address.
 */
export function isPublicOAuthRedirect(uri: string | null | undefined): boolean {
  if (!uri) return false
  let host: string
  try {
    host = unwrapIpv6Brackets(new URL(uri).hostname.toLowerCase())
  } catch {
    return false
  }
  if (!host) return false
  if (isIpLiteral(host)) return !isPrivateIpHost(host)
  if (host === 'localhost' || !host.includes('.')) return false
  return !PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))
}
