import type { ToolResponse } from '@/tools/types'

export interface SearxngSearchParams {
  query: string
  maxResults?: number
  language?: string
  baseUrl?: string
}

interface SearxngSearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearxngSearchResponse extends ToolResponse {
  output: {
    results: SearxngSearchResult[]
  }
}
