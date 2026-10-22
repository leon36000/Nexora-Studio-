import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

export async function GET() {
  const baseUrl = getBaseUrl()
  const { supportEmail } = getBrandConfig()

  const expiresDate = new Date()
  expiresDate.setFullYear(expiresDate.getFullYear() + 1)
  const expires = expiresDate.toISOString()

  const securityTxt = `# Security Policy for Nexora
# https://securitytxt.org/
# RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html

# Required: Contact information for security reports
Contact: mailto:${supportEmail}

# Required: When this file expires (ISO 8601 format, within 1 year)
Expires: ${expires}

# Preferred languages for security reports
Preferred-Languages: fr, en

# Canonical URL for this security.txt file
Canonical: ${baseUrl}/.well-known/security.txt


# Acknowledgments page for security researchers
# Acknowledgments: ${baseUrl}/security/thanks

# If you discover a security vulnerability, please report it responsibly.
# We appreciate your help in keeping Nexora and our users secure.
`

  return new Response(securityTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
