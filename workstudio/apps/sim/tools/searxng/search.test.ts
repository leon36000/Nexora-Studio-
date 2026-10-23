import { describe, expect, it } from 'vitest'
import { searxngSearchTool } from '@/tools/searxng/search'

describe('searxng_search', () => {
  it('queries the deployment SearXNG in JSON, in French by default', () => {
    const buildUrl = searxngSearchTool.request.url as (p: {
      query: string
      baseUrl?: string
    }) => string
    const url = new URL(buildUrl({ query: 'PME Lyon', baseUrl: 'http://searxng:8080/' }))
    expect(`${url.origin}${url.pathname}`).toBe('http://searxng:8080/search')
    expect(url.searchParams.get('q')).toBe('PME Lyon')
    expect(url.searchParams.get('format')).toBe('json')
    expect(url.searchParams.get('language')).toBe('fr')
  })

  it('refuses to run without a configured SearXNG address', () => {
    const buildUrl = searxngSearchTool.request.url as (p: { query: string }) => string
    expect(() => buildUrl({ query: 'PME' })).toThrow(/not configured/)
  })

  it('keeps the title, link and snippet of each result, capped at the requested count', async () => {
    const response = Response.json({
      results: [
        { title: 'Boulangerie', url: 'https://a.fr', content: 'Pain bio', engine: 'x' },
        { title: 'Garage', url: 'https://b.fr', content: 'Réparations' },
        { title: 'Fleuriste', url: 'https://c.fr' },
      ],
    })
    const result = await searxngSearchTool.transformResponse?.(response, {
      query: 'commerces',
      maxResults: 2,
    })
    expect(result).toEqual({
      success: true,
      output: {
        results: [
          { title: 'Boulangerie', url: 'https://a.fr', snippet: 'Pain bio' },
          { title: 'Garage', url: 'https://b.fr', snippet: 'Réparations' },
        ],
      },
    })
  })
})
