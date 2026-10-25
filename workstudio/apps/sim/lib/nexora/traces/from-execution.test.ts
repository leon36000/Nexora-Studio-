/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import type { TraceSpan } from '@/lib/logs/types'
import { draftFromExecution } from '@/lib/nexora/traces/from-execution'

const T0 = '2026-10-25T00:23:55.339Z'

function span(over: Partial<TraceSpan> & { id: string; name: string; type: string }): TraceSpan {
  return {
    duration: 10,
    startTime: T0,
    endTime: T0,
    status: 'success',
    ...over,
  }
}

/** Agent block: model asks for a knowledge search, the tool answers, the model concludes. */
function agentRun(): TraceSpan[] {
  return [
    span({
      id: 'root',
      name: 'Workflow Execution',
      type: 'workflow',
      duration: 2400,
      children: [
        span({ id: 'start', name: 'Start', type: 'start_trigger', blockId: 'b0', duration: 1 }),
        span({
          id: 'agent',
          name: 'Agent',
          type: 'agent',
          blockId: 'b1',
          duration: 2300,
          model: 'vllm/nexora-default',
          input: {
            model: 'vllm/nexora-default',
            messages: [
              { role: 'system', content: 'Vous êtes l’assistant.' },
              { role: 'user', content: 'Quand livrez-vous ?' },
            ],
          },
          output: { content: 'Le samedi.' },
          tokens: { input: 900, output: 60, total: 960 },
          children: [
            span({
              id: 'm1',
              name: 'vllm/nexora-default',
              type: 'model',
              duration: 800,
              model: 'vllm/nexora-default',
              tokens: { input: 400, output: 20, total: 420 },
              output: { content: '' },
              modelToolCalls: [
                { id: 'call-1', name: 'knowledge_search', arguments: { query: 'livraison' } },
              ],
            }),
            span({
              id: 't1',
              name: 'knowledge_search',
              type: 'tool',
              duration: 300,
              toolCallId: 'call-1',
              input: { query: 'livraison' },
              output: { results: [{ content: 'Le samedi de 8 h à 18 h.' }] },
            }),
            span({
              id: 'm2',
              name: 'vllm/nexora-default',
              type: 'model',
              duration: 1100,
              model: 'vllm/nexora-default',
              tokens: { input: 500, output: 40, total: 540 },
              output: { content: 'Le samedi.' },
            }),
          ],
        }),
      ],
    }),
  ]
}

const base = {
  executionId: 'exec-1',
  workspaceId: 'ws-1',
  workflow: { id: 'wf-1', name: 'Assistant général' },
  trigger: 'chat',
  memberChatUserId: null as string | null,
  actorUserId: 'actor-1' as string | null,
  status: 'ok' as const,
  durationMs: 2400,
  startedAt: new Date(T0),
  error: null as string | null,
  workflowInput: { input: 'Quand livrez-vous ?', conversationId: 'c1' } as unknown,
  finalOutput: { content: 'Le samedi.' } as unknown,
  tokens: { input: 900, output: 60 },
}

describe('draftFromExecution', () => {
  it('rend l’arbre modèle → outil → modèle sous le bloc agent, avec leurs genres', () => {
    const draft = draftFromExecution({ ...base, traceSpans: agentRun() })
    const names = draft.spans.map((s) => `${s.kind}:${s.name}`)
    expect(names).toEqual([
      'step:Assistant général',
      'step:Start',
      'step:Agent',
      'model:nexora-default',
      'knowledge:knowledge_search',
      'model:nexora-default',
    ])
    const [root, start, agent, m1, tool, m2] = draft.spans
    expect(root.parentId).toBeNull()
    expect([start.parentId, agent.parentId]).toEqual([root.id, root.id])
    expect([m1.parentId, tool.parentId, m2.parentId]).toEqual([agent.id, agent.id, agent.id])
    expect(draft.spans.every((s) => /^[0-9a-f]{16}$/.test(s.id))).toBe(true)
    expect(new Set(draft.spans.map((s) => s.id)).size).toBe(6)
  })

  it('porte les jetons, la durée et le modèle sans préfixe de fournisseur', () => {
    const draft = draftFromExecution({ ...base, traceSpans: agentRun() })
    const [, , , m1, , m2] = draft.spans
    expect(m1).toMatchObject({
      model: 'nexora-default',
      inputTokens: 400,
      outputTokens: 20,
      durationMs: 800,
    })
    expect(m2).toMatchObject({ inputTokens: 500, outputTokens: 40, output: 'Le samedi.' })
    expect(draft).toMatchObject({ inputTokens: 900, outputTokens: 60, durationMs: 2400 })
    expect(draft.name).toBe('Assistant général')
    expect(draft.agentId).toBe('wf-1')
    expect(draft.agentName).toBe('Assistant général')
  })

  it('donne à la première réponse du modèle les messages de l’agent comme entrée, lisibles', () => {
    const draft = draftFromExecution({ ...base, traceSpans: agentRun() })
    expect(draft.spans[3].input).toBe('system: Vous êtes l’assistant.\nuser: Quand livrez-vous ?')
    expect(draft.spans[5].input).toBeNull()
    expect(draft.spans[4].input).toContain('livraison')
    expect(draft.spans[4].output).toContain('samedi')
  })

  it('lit la conversation (question et réponse) dans l’entrée et la sortie du workflow', () => {
    const draft = draftFromExecution({ ...base, traceSpans: agentRun() })
    expect(draft.input).toBe('Quand livrez-vous ?')
    expect(draft.output).toBe('Le samedi.')
  })

  it('classe un outil quelconque « tool » et un sous-workflow « delegation »', () => {
    const spans = [
      span({
        id: 'root',
        name: 'Workflow Execution',
        type: 'workflow',
        children: [
          span({
            id: 'agent',
            name: 'Agent',
            type: 'agent',
            blockId: 'b1',
            children: [
              span({ id: 't', name: 'gmail_send', type: 'tool' }),
              span({
                id: 'w',
                name: 'Relances',
                type: 'workflow',
                blockId: 'b2',
                childWorkflowId: 'wf-2',
              }),
            ],
          }),
        ],
      }),
    ]
    const draft = draftFromExecution({ ...base, traceSpans: spans })
    expect(draft.spans.map((s) => s.kind)).toEqual(['step', 'step', 'tool', 'delegation'])
  })

  it('montre un appel de l’outil de délégation comme une délégation à l’agent appelé', () => {
    const delegatedSpan = (id: string, name: string, extra: Partial<TraceSpan> = {}) =>
      span({
        id,
        name,
        type: 'tool',
        input: { question: 'Combien coûte la baguette ?' },
        output: {
          agent: 'Agent tarifs',
          answer: 'La baguette coûte 1,20 euro.',
          childWorkflowName: 'Agent tarifs',
        },
        ...extra,
      })
    const spans = [
      span({
        id: 'root',
        name: 'Workflow Execution',
        type: 'workflow',
        children: [
          span({
            id: 'agent',
            name: 'Agent',
            type: 'agent',
            blockId: 'b1',
            children: [
              delegatedSpan('d1', 'delegate_to_agent'),
              delegatedSpan('d2', 'delegate_to_agent__2'),
              delegatedSpan('d3', 'delegate_to_agent', {
                status: 'error',
                output: { error: 'Boucle de délégation : « A » a déjà été sollicité.' },
              }),
            ],
          }),
        ],
      }),
    ]
    const draft = draftFromExecution({ ...base, traceSpans: spans })
    const delegations = draft.spans.filter((s) => s.kind === 'delegation')
    expect(delegations.map((s) => s.name)).toEqual([
      'Délégation → Agent tarifs',
      'Délégation → Agent tarifs',
      'Délégation',
    ])
    expect(delegations[0]).toMatchObject({
      input: expect.stringContaining('Combien coûte la baguette ?'),
      output: 'La baguette coûte 1,20 euro.',
    })
    expect(delegations[2].status).toBe('error')
    expect(delegations[2].output).toContain('Boucle de délégation')
  })

  it('un trace sans aucun span garde un span racine', () => {
    const draft = draftFromExecution({ ...base, traceSpans: [] })
    expect(draft.spans).toHaveLength(1)
    expect(draft.spans[0]).toMatchObject({
      parentId: null,
      name: 'Assistant général',
      durationMs: 2400,
    })
  })

  it('une erreur gérée par un chemin d’erreur n’est pas une erreur ; une erreur non gérée l’est', () => {
    const handled = [
      span({
        id: 'root',
        name: 'Workflow Execution',
        type: 'workflow',
        children: [
          span({
            id: 'a',
            name: 'Api',
            type: 'api',
            blockId: 'b',
            status: 'error',
            errorHandled: true,
          }),
        ],
      }),
    ]
    const draft = draftFromExecution({ ...base, traceSpans: handled })
    expect(draft.spans[1].status).toBe('ok')
    expect(draft.status).toBe('ok')

    const failed = [
      span({
        id: 'root',
        name: 'Workflow Execution',
        type: 'workflow',
        status: 'error',
        children: [
          span({
            id: 'a',
            name: 'Agent',
            type: 'agent',
            blockId: 'b',
            status: 'error',
            errorMessage: 'Modèle indisponible',
          }),
        ],
      }),
    ]
    const bad = draftFromExecution({
      ...base,
      status: 'error',
      error: 'Modèle indisponible',
      traceSpans: failed,
    })
    expect(bad.status).toBe('error')
    expect(bad.error).toBe('Modèle indisponible')
    expect(bad.spans[1].status).toBe('error')
  })

  describe('source et visibilité', () => {
    it('un chat réservé aux membres est « assistant », privé, et appartient au membre', () => {
      const draft = draftFromExecution({ ...base, memberChatUserId: 'member-1', traceSpans: [] })
      expect(draft).toMatchObject({
        source: 'assistant',
        visibility: 'private',
        userId: 'member-1',
      })
    })

    it('un chat public est « agent », visible de l’espace', () => {
      const draft = draftFromExecution({ ...base, traceSpans: [] })
      expect(draft).toMatchObject({ source: 'agent', visibility: 'workspace', userId: 'actor-1' })
    })

    it('un autre déclencheur est « workflow »', () => {
      const draft = draftFromExecution({ ...base, trigger: 'schedule', traceSpans: [] })
      expect(draft).toMatchObject({ source: 'workflow', visibility: 'workspace' })
    })

    it('l’indice d’une clé d’API donne la source « api_key » et la clé', () => {
      const draft = draftFromExecution({
        ...base,
        trigger: 'api',
        actorUserId: null,
        hint: { source: 'api_key', apiKeyId: 'key-1' },
        traceSpans: [],
      })
      expect(draft).toMatchObject({ source: 'api_key', apiKeyId: 'key-1', visibility: 'workspace' })
    })

    it('un membre de chat privé prime sur un indice', () => {
      const draft = draftFromExecution({
        ...base,
        memberChatUserId: 'member-1',
        hint: { source: 'api_key', apiKeyId: 'key-1' },
        traceSpans: [],
      })
      expect(draft.visibility).toBe('private')
    })
  })

  it('identifie la trace par l’exécution pour qu’une complétion rejouée ne la double pas', () => {
    expect(draftFromExecution({ ...base, traceSpans: [] }).executionId).toBe('exec-1')
  })

  it('tolère des spans incomplets (durées absentes ou négatives, dates invalides)', () => {
    const spans = [
      span({
        id: 'root',
        name: 'Workflow Execution',
        type: 'workflow',
        children: [
          {
            id: 'x',
            name: 'Bloc',
            type: 'function',
            startTime: 'pas une date',
          } as unknown as TraceSpan,
          span({ id: 'y', name: 'Autre', type: 'function', duration: -5 }),
        ],
      }),
    ]
    const draft = draftFromExecution({ ...base, traceSpans: spans })
    expect(draft.spans).toHaveLength(3)
    expect(draft.spans.every((s) => Number.isFinite(s.durationMs) && s.durationMs >= 0)).toBe(true)
    expect(draft.spans.every((s) => !Number.isNaN(s.startedAt.getTime()))).toBe(true)
  })
})
