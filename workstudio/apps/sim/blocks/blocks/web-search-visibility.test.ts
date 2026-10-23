import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { SearchBlock } from '@/blocks/blocks/search'
import { SearxngBlock } from '@/blocks/blocks/searxng'

describe('web search blocks', () => {
  afterEach(() => {
    mockEnvObject.NEXT_PUBLIC_WEB_SEARCH_ENABLED = undefined
    mockEnvObject.NEXT_PUBLIC_EXA_SEARCH_ENABLED = undefined
  })

  it('hides both when the instance has no search service', () => {
    expect(SearchBlock.hideFromToolbar).toBe(true)
    expect(SearxngBlock.hideFromToolbar).toBe(true)
  })

  it('shows the sovereign web search once the administrator enables it', () => {
    mockEnvObject.NEXT_PUBLIC_WEB_SEARCH_ENABLED = 'true'
    expect(SearxngBlock.hideFromToolbar).toBe(false)
  })

  it('shows the paid Exa search only when its key is configured', () => {
    mockEnvObject.NEXT_PUBLIC_EXA_SEARCH_ENABLED = 'true'
    expect(SearchBlock.hideFromToolbar).toBe(false)
  })
})
