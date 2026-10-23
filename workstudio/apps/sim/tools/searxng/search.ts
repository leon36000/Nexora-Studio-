import type { SearxngSearchParams, SearxngSearchResponse } from '@/tools/searxng/types'
import type { ToolConfig } from '@/tools/types'

const DEFAULT_MAX_RESULTS = 10

function buildSearxngBaseUrl(params: SearxngSearchParams): string {
  if (!params.baseUrl) {
    throw new Error('Web search is not configured on this instance (SEARXNG_URL).')
  }
  return params.baseUrl.replace(/\/+$/, '')
}

/**
 * Nexora edition: web search through the deployment's own SearXNG meta-search engine (no API
 * key, no per-query cost). Queries leave the instance towards public search engines, so the
 * service is off until the administrator enables it.
 */
export const searxngSearchTool: ToolConfig<SearxngSearchParams, SearxngSearchResponse> = {
  id: 'searxng_search',
  name: 'Web Search',
  description:
    'Search the web through the instance SearXNG meta-search engine. Returns the title, link and snippet of each result.',
  version: '1.0.0',

  params: {
    query: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'The search query to execute',
    },
    maxResults: {
      type: 'number',
      required: false,
      visibility: 'user-only',
      description: `Maximum number of results to return (default: ${DEFAULT_MAX_RESULTS})`,
    },
    baseUrl: {
      type: 'string',
      required: false,
      visibility: 'hidden',
      description: 'SearXNG address, filled by the block from the instance configuration',
    },
    language: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Search language code (default: fr)',
    },
  },

  request: {
    url: (params) => {
      const baseUrl = buildSearxngBaseUrl(params)
      const search = new URLSearchParams({
        q: params.query,
        format: 'json',
        language: params.language || 'fr',
      })
      return `${baseUrl}/search?${search.toString()}`
    },
    method: 'GET',
    headers: () => ({ Accept: 'application/json' }),
  },

  transformResponse: async (response: Response, params) => {
    const data = (await response.json()) as {
      results?: { title?: string; url?: string; content?: string }[]
    }
    const limit =
      params?.maxResults && params.maxResults > 0 ? params.maxResults : DEFAULT_MAX_RESULTS
    return {
      success: true,
      output: {
        results: (data.results ?? []).slice(0, limit).map((result) => ({
          title: result.title ?? '',
          url: result.url ?? '',
          snippet: result.content ?? '',
        })),
      },
    }
  },

  outputs: {
    results: {
      type: 'array',
      description: 'Search results with title, url and snippet',
    },
  },
}
