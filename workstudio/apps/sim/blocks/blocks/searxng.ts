import { SearchIcon } from '@/components/icons'
import { docsUrl } from '@/lib/branding/docs-url'
import { env, getEnv, isTruthy } from '@/lib/core/config/env'
import type { BlockConfig, BlockMeta } from '@/blocks/types'
import { IntegrationType } from '@/blocks/types'

/**
 * Nexora edition: sovereign web search through the instance's SearXNG. Shown only once the
 * administrator enables web search (queries then leave the instance towards public engines).
 */
export const SearxngBlock: BlockConfig = {
  type: 'searxng',
  name: 'Web Search',
  description: 'Search the web without an API key',
  longDescription:
    'Search the web through the meta-search engine installed with Nexora. No API key and no per-query cost; queries are sent to public search engines.',
  docsLink: docsUrl('/integrations/search'),
  category: 'tools',
  integrationType: IntegrationType.Search,
  bgColor: '#3B82F6',
  icon: SearchIcon,
  get hideFromToolbar() {
    return !isTruthy(getEnv('NEXT_PUBLIC_WEB_SEARCH_ENABLED'))
  },
  canvasPresentation: {
    defaultTitle: 'Web Search',
    sentences: {
      default: [{ text: 'Search the web for', field: 'query', core: true }],
    },
  },
  subBlocks: [
    {
      id: 'query',
      title: 'Search Query',
      type: 'long-input',
      placeholder: 'Enter your search query...',
      required: true,
    },
    {
      id: 'maxResults',
      title: 'Maximum Results',
      type: 'short-input',
      placeholder: '10',
      mode: 'advanced',
    },
  ],
  tools: {
    access: ['searxng_search'],
    config: {
      tool: () => 'searxng_search',
      params: (params) => ({
        ...params,
        baseUrl: env.SEARXNG_URL,
        maxResults: params.maxResults ? Number(params.maxResults) : undefined,
      }),
    },
  },
  inputs: {
    query: { type: 'string', description: 'Search query terms' },
    maxResults: { type: 'number', description: 'Maximum number of results' },
  },
  outputs: {
    results: { type: 'json', description: 'Results with title, url and snippet' },
  },
}

export const SearxngBlockMeta: BlockMeta = {
  tags: ['web-scraping'],
  url: 'https://docs.searxng.org',
  templates: [],
}
