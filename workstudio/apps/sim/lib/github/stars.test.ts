/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { getGitHubStars } from '@/lib/github/stars'

describe('getGitHubStars (Nexora edition)', () => {
  it('never calls GitHub: an instance makes no third-party call by default', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await getGitHubStars()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
