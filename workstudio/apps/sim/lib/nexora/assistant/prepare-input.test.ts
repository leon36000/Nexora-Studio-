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
    loadSkills: vi.fn(async () => []),
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

describe('prepareAssistantInput — projects', () => {
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

describe('prepareAssistantInput — @skills', () => {
  const devis = { name: 'redaction-devis', content: 'Un devis comporte HT, TVA et TTC.' }

  it('adds the content of the skills the message names, once each', async () => {
    const d = deps({ loadSkills: vi.fn(async () => [devis]) })
    const prepared = await prepareAssistantInput(
      input({
        conversationId: undefined,
        text: '@redaction-devis fais le devis, puis @redaction-devis encore',
      }),
      d
    )
    expect(d.loadSkills).toHaveBeenCalledWith(WS, ['redaction-devis'])
    expect(prepared.text.match(/Un devis comporte HT/g)).toHaveLength(1)
    expect(prepared.text).toContain('@redaction-devis fais le devis')
  })

  it('leaves an unknown mention and an e-mail address alone', async () => {
    const d = deps({ loadSkills: vi.fn(async () => []) })
    const prepared = await prepareAssistantInput(
      input({ conversationId: undefined, text: 'écris à paul@pme.fr et @inconnu' }),
      d
    )
    expect(prepared.text).toBe('écris à paul@pme.fr et @inconnu')
    expect(d.loadSkills).toHaveBeenCalledWith(WS, ['inconnu'])
  })

  it('asks for the skills of the chat’s workspace only, and for at most three', async () => {
    const d = deps({ loadSkills: vi.fn(async () => []) })
    await prepareAssistantInput(
      input({ conversationId: undefined, text: '@a1 @b2 @c3 @d4 @e5' }),
      d
    )
    expect(d.loadSkills).toHaveBeenCalledWith(WS, ['a1', 'b2', 'c3'])
  })

  it('does not look up skills when the message mentions none', async () => {
    const d = deps()
    await prepareAssistantInput(input({ conversationId: undefined }), d)
    expect(d.loadSkills).not.toHaveBeenCalled()
  })

  it('still adds skills for a conversation that is not the caller’s, but never its project', async () => {
    const d = deps({
      loadConversation: vi.fn(async () => ({
        id: 'conversation-1',
        workspaceId: WS,
        userId: 'bob',
        projectId: 'project-1',
        projectVersion: null,
      })),
      loadSkills: vi.fn(async () => [devis]),
    })
    const prepared = await prepareAssistantInput(input({ text: '@redaction-devis vite' }), d)
    expect(prepared.text).toContain('Un devis comporte HT')
    expect(prepared.text).not.toContain('Toujours vouvoyer')
  })
})
