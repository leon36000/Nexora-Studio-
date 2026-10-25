import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PROJECT_CONTEXT_MAX_CHARS,
  type PrepareInputDependencies,
  prepareAssistantInput,
} from '@/lib/nexora/assistant/prepare-input'

const WS = 'workspace-1'

function deps(overrides: Partial<PrepareInputDependencies> = {}): PrepareInputDependencies {
  return {
    loadConversation: vi.fn(async () => ({
      id: 'conversation-1',
      workspaceId: WS,
      userId: 'alice',
      projectId: 'project-1',
      projectVersion: null,
    })),
    loadProjectContext: vi.fn(async () => ({
      version: 3,
      instructions: 'Toujours vouvoyer le client.',
      files: [{ name: 'conditions.txt', text: 'Livraison offerte dès 80 euros.' }],
    })),
    markProjectVersion: vi.fn(async () => undefined),
    ...overrides,
  }
}

const input = (overrides: Record<string, unknown> = {}) => ({
  workspaceId: WS,
  userId: 'alice',
  conversationId: 'conversation-1',
  text: 'Rédige la réponse au client.',
  ...overrides,
})

describe('prepareAssistantInput', () => {
  let d: PrepareInputDependencies
  beforeEach(() => {
    d = deps()
  })

  it('puts the project’s instructions and files before the question the first time', async () => {
    const prepared = await prepareAssistantInput(input(), d)
    expect(prepared.text).toContain('Toujours vouvoyer le client.')
    expect(prepared.text).toContain('conditions.txt')
    expect(prepared.text).toContain('Livraison offerte dès 80 euros.')
    expect(prepared.text.endsWith('Rédige la réponse au client.')).toBe(true)
  })

  it('marks the version as given to the agent only once the answer succeeded', async () => {
    const prepared = await prepareAssistantInput(input(), d)
    expect(d.markProjectVersion).not.toHaveBeenCalled()
    await prepared.commit()
    expect(d.markProjectVersion).toHaveBeenCalledWith('conversation-1', 3)
  })

  it('does not repeat a context the agent already has', async () => {
    d = deps({
      loadConversation: vi.fn(async () => ({
        id: 'conversation-1',
        workspaceId: WS,
        userId: 'alice',
        projectId: 'project-1',
        projectVersion: 3,
      })),
    })
    const prepared = await prepareAssistantInput(input(), d)
    expect(prepared.text).toBe('Rédige la réponse au client.')
    await prepared.commit()
    expect(d.markProjectVersion).not.toHaveBeenCalled()
  })

  it('gives the context again after the project changed', async () => {
    d = deps({
      loadConversation: vi.fn(async () => ({
        id: 'conversation-1',
        workspaceId: WS,
        userId: 'alice',
        projectId: 'project-1',
        projectVersion: 2,
      })),
    })
    const prepared = await prepareAssistantInput(input(), d)
    expect(prepared.text).toContain('Toujours vouvoyer le client.')
  })

  it('shares nothing from a conversation of someone else, or of another workspace', async () => {
    for (const other of [{ userId: 'bob' }, { workspaceId: 'workspace-2' }]) {
      d = deps({
        loadConversation: vi.fn(async () => ({
          id: 'conversation-1',
          workspaceId: WS,
          userId: 'alice',
          projectId: 'project-1',
          projectVersion: null,
          ...other,
        })),
      })
      const prepared = await prepareAssistantInput(input(), d)
      expect(prepared.text).toBe('Rédige la réponse au client.')
      expect(d.loadProjectContext).not.toHaveBeenCalled()
    }
  })

  it('shares nothing without a conversation, or for a conversation outside any project', async () => {
    expect((await prepareAssistantInput(input({ conversationId: undefined }), d)).text).toBe(
      'Rédige la réponse au client.'
    )
    d = deps({
      loadConversation: vi.fn(async () => ({
        id: 'conversation-1',
        workspaceId: WS,
        userId: 'alice',
        projectId: null,
        projectVersion: null,
      })),
    })
    expect((await prepareAssistantInput(input(), d)).text).toBe('Rédige la réponse au client.')
    expect(d.loadProjectContext).not.toHaveBeenCalled()
  })

  it('caps what a project shares, and says so', async () => {
    d = deps({
      loadProjectContext: vi.fn(async () => ({
        version: 1,
        instructions: 'Consigne.',
        files: [
          { name: 'a.txt', text: 'a'.repeat(PROJECT_CONTEXT_MAX_CHARS) },
          { name: 'b.txt', text: 'b'.repeat(500) },
        ],
      })),
    })
    const prepared = await prepareAssistantInput(input(), d)
    expect(prepared.text.length).toBeLessThan(PROJECT_CONTEXT_MAX_CHARS + 1_500)
    expect(prepared.text).toContain('tronqué')
    expect(prepared.text).not.toContain('b'.repeat(100))
  })

  it('does not fail the answer when the version cannot be recorded', async () => {
    d = deps({
      markProjectVersion: vi.fn(async () => {
        throw new Error('database unavailable')
      }),
    })
    const prepared = await prepareAssistantInput(input(), d)
    await expect(prepared.commit()).resolves.toBeUndefined()
  })
})
