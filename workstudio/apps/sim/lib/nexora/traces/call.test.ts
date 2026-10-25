/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { beginCallTrace } from '@/lib/nexora/traces/call'
import type { TraceDraft } from '@/lib/nexora/traces/types'

const context = {
  source: 'playground' as const,
  workspaceId: 'ws-1',
  userId: 'user-1',
  name: 'Playground',
}
const messages = [{ role: 'user', content: 'Bonjour' }]

function setup(times: number[]) {
  const recorded: TraceDraft[] = []
  const clock = vi.fn(() => times.shift() ?? 0)
  return {
    recorded,
    begin: () =>
      beginCallTrace(context, 'nexora-default', messages, {
        now: clock,
        record: async (draft) => {
          recorded.push(draft)
        },
      }),
  }
}

describe('beginCallTrace — données personnelles', () => {
  it('porte sur le span modèle ce que la barrière a masqué avant l’envoi', () => {
    const recorded: TraceDraft[] = []
    const note = {
      mode: 'mask' as const,
      model: 'cloud-glm-5-3',
      found: { IBAN_CODE: 1 },
      masked: 1,
    }
    beginCallTrace({ ...context, protection: note }, 'cloud-glm-5-3', messages, {
      now: () => 0,
      record: async (draft) => {
        recorded.push(draft)
      },
    }).finish({ answer: 'ok', usage: null, error: null })
    expect(recorded[0].spans[0].attributes.dataProtection).toEqual([note])
  })

  it('n’ajoute rien quand rien n’a été masqué', () => {
    const recorded: TraceDraft[] = []
    beginCallTrace(context, 'cloud-glm-5-3', messages, {
      now: () => 0,
      record: async (draft) => {
        recorded.push(draft)
      },
    }).finish({ answer: 'ok', usage: null, error: null })
    expect(recorded[0].spans[0].attributes).not.toHaveProperty('dataProtection')
  })
})

describe('beginCallTrace', () => {
  it('enregistre la durée entre le début et la fin, la réponse et les jetons', () => {
    const { recorded, begin } = setup([1000, 3500])
    begin().finish({
      answer: 'Salut',
      usage: { promptTokens: 4, completionTokens: 2 },
      error: null,
    })
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({
      source: 'playground',
      durationMs: 2500,
      output: 'Salut',
      inputTokens: 4,
      outputTokens: 2,
      status: 'ok',
      workspaceId: 'ws-1',
      userId: 'user-1',
    })
    expect(recorded[0].startedAt.getTime()).toBe(1000)
  })

  it('n’enregistre qu’une fois, même si la fin est signalée deux fois (flux terminé puis coupé)', () => {
    const { recorded, begin } = setup([0, 10, 20])
    const trace = begin()
    trace.finish({ answer: 'a', usage: null, error: null })
    trace.finish({ answer: null, usage: null, error: 'Annulé' })
    expect(recorded).toHaveLength(1)
    expect(recorded[0].output).toBe('a')
  })

  it('enregistre une erreur et une interruption', () => {
    const failed = setup([0, 5])
    failed.begin().finish({ answer: null, usage: null, error: 'Le modèle a refusé la demande' })
    expect(failed.recorded[0]).toMatchObject({
      status: 'error',
      error: 'Le modèle a refusé la demande',
    })

    const stopped = setup([0, 5])
    stopped.begin().finish({ answer: 'début', usage: null, error: null, interrupted: true })
    expect(stopped.recorded[0].spans[0].attributes.interrupted).toBe(true)
  })

  it('ne lève jamais quand l’enregistrement échoue', () => {
    const trace = beginCallTrace(context, 'm', messages, {
      now: () => 0,
      record: async () => {
        throw new Error('base indisponible')
      },
    })
    expect(() => trace.finish({ answer: 'x', usage: null, error: null })).not.toThrow()
  })
})
