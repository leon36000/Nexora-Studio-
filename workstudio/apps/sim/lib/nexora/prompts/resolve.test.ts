import { describe, expect, it, vi } from 'vitest'
import type { PromptVersionRecord } from '@/lib/nexora/prompts/repository'
import { createPromptResolver, PromptResolutionError } from '@/lib/nexora/prompts/resolve'

function version(number: number, content: string): PromptVersionRecord {
  return {
    id: `v${number}`,
    promptId: 'p1',
    version: number,
    content,
    variables: [{ name: 'client', type: 'text', defaultValue: 'cher client' }],
    note: '',
    createdByName: null,
    createdAt: new Date(0),
  }
}

function setup() {
  const labels: Record<string, PromptVersionRecord | null> = {
    production: version(1, 'Bonjour {{client}}, réponds par POMME.'),
    test: null,
  }
  const loadPrompt = vi.fn(async (workspaceId: string, promptId: string) =>
    workspaceId === 'ws1' && promptId === 'p1' ? { id: 'p1', name: 'Support' } : null
  )
  const loadVersion = vi.fn(async (_promptId: string, selector: string) => labels[selector] ?? null)
  const resolver = createPromptResolver({ loadPrompt, loadVersion })
  return { labels, loadPrompt, loadVersion, resolver }
}

const reference = { promptId: 'p1', selector: 'production' as const, values: {} }

describe('createPromptResolver', () => {
  it('renders the labelled version and names what it used', async () => {
    const { resolver } = setup()

    const resolved = await resolver.resolve('ws1', { ...reference, values: { client: 'Martin' } })

    expect(resolved).toEqual({
      id: 'p1',
      name: 'Support',
      version: 1,
      label: 'production',
      text: 'Bonjour Martin, réponds par POMME.',
    })
  })

  it('reads the label once while it is cached, then again once invalidated', async () => {
    const { labels, loadVersion, resolver } = setup()
    await resolver.resolve('ws1', reference)
    await resolver.resolve('ws1', reference)
    expect(loadVersion).toHaveBeenCalledTimes(1)

    labels.production = version(2, 'Réponds par CERISE.')
    resolver.invalidate('p1')

    expect((await resolver.resolve('ws1', reference)).text).toBe('Réponds par CERISE.')
    expect(loadVersion).toHaveBeenCalledTimes(2)
  })

  it('keeps the cache of one workspace away from another', async () => {
    const { resolver } = setup()
    await resolver.resolve('ws1', reference)

    await expect(resolver.resolve('ws2', reference)).rejects.toThrow(PromptResolutionError)
  })

  it('refuses a label the prompt does not carry, naming the prompt and the label', async () => {
    const { resolver } = setup()

    await expect(resolver.resolve('ws1', { ...reference, selector: 'test' })).rejects.toThrow(
      /« Support ».*« test »/
    )
  })

  it('refuses a prompt that no longer exists', async () => {
    const { resolver } = setup()

    await expect(resolver.resolve('ws1', { ...reference, promptId: 'gone' })).rejects.toThrow(
      /n'existe plus/
    )
  })

  it('does not cache a failed read', async () => {
    const { loadVersion, resolver } = setup()
    loadVersion.mockRejectedValueOnce(new Error('connection reset'))

    await expect(resolver.resolve('ws1', reference)).rejects.toThrow('connection reset')
    expect((await resolver.resolve('ws1', reference)).version).toBe(1)
  })

  it('reports a missing variable with the prompt and its version', async () => {
    const { labels, resolver } = setup()
    labels.production = { ...version(3, 'Pour {{societe}}'), variables: [] }

    await expect(resolver.resolve('ws1', reference)).rejects.toThrow(
      /« Support » \(version 3\).*« societe »/
    )
  })
})
