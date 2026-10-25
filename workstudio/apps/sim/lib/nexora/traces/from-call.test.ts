/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { draftFromCall } from '@/lib/nexora/traces/from-call'

const base = {
  source: 'playground' as const,
  workspaceId: 'ws-1',
  userId: 'user-1',
  apiKeyId: null,
  name: 'Playground',
  model: 'cloud-glm-5-3',
  startedAt: new Date('2026-10-25T10:00:00Z'),
  durationMs: 1234,
  messages: [
    { role: 'system', content: 'Tu es utile.' },
    { role: 'user', content: 'Bonjour' },
  ],
  answer: 'Salut !',
  usage: { promptTokens: 12, completionTokens: 3 },
  error: null,
}

describe('draftFromCall', () => {
  it('fait un span modèle racine avec la conversation, les jetons et la durée', () => {
    const draft = draftFromCall(base)
    expect(draft.spans).toHaveLength(1)
    expect(draft.spans[0]).toMatchObject({
      parentId: null,
      kind: 'model',
      model: 'cloud-glm-5-3',
      durationMs: 1234,
      inputTokens: 12,
      outputTokens: 3,
      status: 'ok',
      output: 'Salut !',
    })
    expect(draft.spans[0].input).toBe('system: Tu es utile.\nuser: Bonjour')
    expect(draft).toMatchObject({
      source: 'playground',
      visibility: 'private',
      userId: 'user-1',
      workspaceId: 'ws-1',
      status: 'ok',
      inputTokens: 12,
      outputTokens: 3,
      input: 'Bonjour',
      output: 'Salut !',
      truncated: false,
    })
    expect(draft.id).toMatch(/^[0-9a-f]{32}$/)
    expect(draft.spans[0].id).toMatch(/^[0-9a-f]{16}$/)
  })

  it.each(['playground', 'copilot', 'wand'] as const)('une trace « %s » est privée', (source) => {
    expect(draftFromCall({ ...base, source }).visibility).toBe('private')
  })

  it('une trace d’appel par clé est visible de l’espace et porte la clé', () => {
    const draft = draftFromCall({ ...base, source: 'api_key', userId: null, apiKeyId: 'key-1' })
    expect(draft.visibility).toBe('workspace')
    expect(draft.apiKeyId).toBe('key-1')
  })

  it('une erreur donne une trace en erreur, sans jetons inventés', () => {
    const draft = draftFromCall({ ...base, answer: null, usage: null, error: 'Le modèle a refusé' })
    expect(draft.status).toBe('error')
    expect(draft.error).toBe('Le modèle a refusé')
    expect(draft.spans[0].status).toBe('error')
    expect(draft.inputTokens + draft.outputTokens).toBe(0)
    expect(draft.output).toBeNull()
  })

  it('accepte un contenu de message en morceaux (texte et image) et un message sans contenu', () => {
    const draft = draftFromCall({
      ...base,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Décris' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
          ],
        },
        { role: 'assistant' },
      ],
    })
    expect(draft.spans[0].input).toContain('Décris')
    expect(draft.spans[0].input).not.toContain('AAAA')
    expect(draft.input).toBe('Décris')
  })

  it('range la réflexion du modèle en attribut', () => {
    const draft = draftFromCall({ ...base, reasoning: 'Je réfléchis…' })
    expect(draft.spans[0].attributes.reasoning).toBe('Je réfléchis…')
  })

  it('note qu’une réponse a été interrompue en cours de route', () => {
    const draft = draftFromCall({ ...base, interrupted: true })
    expect(draft.spans[0].attributes.interrupted).toBe(true)
    expect(draft.status).toBe('ok')
  })

  it('tolère des messages qui ne sont pas une liste', () => {
    expect(draftFromCall({ ...base, messages: 'n’importe quoi' }).spans[0].input).toBeNull()
  })
})
