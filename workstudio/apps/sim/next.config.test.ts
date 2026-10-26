import { describe, expect, it } from 'vitest'
import nextConfig from '@/next.config'

describe('Next.js server dependency packaging', () => {
  it('keeps pdfjs external to the production server bundle', () => {
    expect(nextConfig.serverExternalPackages).toContain('pdfjs-dist')
    expect(nextConfig.serverExternalPackages).toContain('@napi-rs/canvas')
  })
})

async function headersOf(source: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? []
  const rule = rules.find((candidate) => candidate.source === source)
  return Object.fromEntries(
    (rule?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value])
  )
}

describe('Embedding on other sites', () => {
  it('serves the embed script to every site, cacheable and loadable under cross-origin isolation', async () => {
    const headers = await headersOf('/embed.js')
    expect(headers['access-control-allow-origin']).toBe('*')
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(headers['cache-control']).toMatch(/^public, max-age=\d+/)
    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  it('leaves the chat CSP to the proxy, which reads NEXORA_EMBED_ORIGINS at request time', async () => {
    const headers = await headersOf('/chat/:path*')
    expect(headers['content-security-policy']).toBeUndefined()
    expect(headers['x-content-type-options']).toBe('nosniff')
  })
})
