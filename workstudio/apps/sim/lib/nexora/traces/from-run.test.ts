/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import type { WorkflowExecutionLog } from '@/lib/logs/types'
import { type RunTraceDeps, recordRunTrace } from '@/lib/nexora/traces/from-run'
import type { TraceDraft } from '@/lib/nexora/traces/types'

function log(
  over: Partial<WorkflowExecutionLog['executionData']> = {},
  trigger = 'chat'
): WorkflowExecutionLog {
  return {
    id: 'log-1',
    workflowId: 'wf-1',
    executionId: 'exec-1',
    stateSnapshotId: 'snap',
    level: 'info',
    trigger: trigger as WorkflowExecutionLog['trigger'],
    startedAt: '2026-10-25T10:00:00.000Z',
    endedAt: '2026-10-25T10:00:02.000Z',
    totalDurationMs: 2000,
    executionData: {
      trigger: {
        type: 'chat',
        source: 'chat',
        timestamp: '2026-10-25T10:00:00.000Z',
        data: { memberChatUserId: 'member-1' },
      },
      traceSpans: [],
      tokens: { input: 10, output: 5 },
      finalOutput: { content: 'Réponse' },
      workflowInput: { input: 'Question' },
      ...over,
    } as WorkflowExecutionLog['executionData'],
    cost: undefined as unknown as WorkflowExecutionLog['cost'],
    createdAt: '2026-10-25T10:00:00.000Z',
  }
}

function deps(over: Partial<RunTraceDeps> = {}) {
  const recorded: TraceDraft[] = []
  const all: RunTraceDeps = {
    workflowName: async () => 'Assistant général',
    record: vi.fn(async (draft: TraceDraft) => {
      recorded.push(draft)
    }),
    takeOrigin: () => undefined,
    takeProtection: () => [],
    actingMember: async () => null,
    ...over,
  }
  return { all, recorded }
}

const input = (over: Partial<Parameters<typeof recordRunTrace>[0]> = {}) => ({
  log: log(),
  workspaceId: 'ws-1',
  status: 'completed' as const,
  actorUserId: 'actor-1',
  ...over,
})

describe('recordRunTrace', () => {
  it('enregistre la trace d’une exécution terminée : conversation, jetons, membre du chat réservé', async () => {
    const { all, recorded } = deps()
    await recordRunTrace(input(), all)
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({
      workspaceId: 'ws-1',
      executionId: 'exec-1',
      name: 'Assistant général',
      source: 'assistant',
      visibility: 'private',
      userId: 'member-1',
      status: 'ok',
      inputTokens: 10,
      outputTokens: 5,
      durationMs: 2000,
      input: 'Question',
      output: 'Réponse',
    })
  })

  it('réserve au propriétaire la trace d’une tâche planifiée qui agit pour lui', async () => {
    const acting = vi.fn(async () => 'owner-1')
    const { all, recorded } = deps({ actingMember: acting })
    await recordRunTrace(
      input({ log: log({ trigger: { type: 'schedule', source: 'schedule', timestamp: 'x' } }, 'schedule') }),
      all
    )
    expect(acting).toHaveBeenCalledWith({
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      actorUserId: 'actor-1',
    })
    expect(recorded[0]).toMatchObject({
      source: 'workflow',
      visibility: 'private',
      userId: 'owner-1',
    })
  })

  it('laisse visible de l’espace la trace d’un workflow qui n’agit pour personne', async () => {
    const { all, recorded } = deps()
    await recordRunTrace(
      input({ log: log({ trigger: { type: 'schedule', source: 'schedule', timestamp: 'x' } }, 'schedule') }),
      all
    )
    expect(recorded[0]).toMatchObject({ visibility: 'workspace', userId: 'actor-1' })
  })

  it('n’enregistre pas une trace dont on ne sait pas si elle est personnelle', async () => {
    const { all } = deps({
      actingMember: async () => {
        throw new Error('base indisponible')
      },
    })
    await recordRunTrace(
      input({ log: log({ trigger: { type: 'schedule', source: 'schedule', timestamp: 'x' } }, 'schedule') }),
      all
    )
    expect(all.record).not.toHaveBeenCalled()
  })

  it('porte sur la trace ce que la barrière a masqué pendant l’exécution', async () => {
    const note = {
      mode: 'mask' as const,
      model: 'vllm/cloud-glm-5-3',
      found: { IBAN_CODE: 1 },
      masked: 1,
    }
    const taken = vi.fn(() => [note])
    const { all, recorded } = deps({ takeProtection: taken })
    await recordRunTrace(input(), all)
    expect(taken).toHaveBeenCalledWith('exec-1')
    expect(recorded[0].spans[0].attributes.dataProtection).toEqual([note])
  })

  it('garde la note d’une exécution en pause pour sa reprise', async () => {
    const taken = vi.fn(() => [])
    const { all } = deps({ takeProtection: taken })
    await recordRunTrace(input({ status: 'pending' }), all)
    expect(taken).not.toHaveBeenCalled()
  })

  it('n’enregistre pas une exécution en pause : la reprise la complétera', async () => {
    const { all } = deps()
    await recordRunTrace(input({ status: 'pending' }), all)
    expect(all.record).not.toHaveBeenCalled()
  })

  it('n’enregistre rien sans espace', async () => {
    const { all } = deps()
    await recordRunTrace(input({ workspaceId: null }), all)
    expect(all.record).not.toHaveBeenCalled()
  })

  it('une exécution en échec ou annulée donne une trace en erreur avec son motif', async () => {
    const failed = deps()
    await recordRunTrace(
      input({ status: 'failed', log: log({ error: 'Modèle indisponible' }) }),
      failed.all
    )
    expect(failed.recorded[0]).toMatchObject({ status: 'error', error: 'Modèle indisponible' })

    const cancelled = deps()
    await recordRunTrace(input({ status: 'cancelled' }), cancelled.all)
    expect(cancelled.recorded[0]).toMatchObject({ status: 'error', error: 'Exécution annulée' })
  })

  it('rattache la clé d’API notée par la passerelle', async () => {
    const { all, recorded } = deps({ takeOrigin: () => ({ source: 'api_key', apiKeyId: 'key-1' }) })
    await recordRunTrace(
      input({ log: log({ trigger: { type: 'api', source: 'api', timestamp: 'x' } }, 'api') }),
      all
    )
    expect(recorded[0]).toMatchObject({
      source: 'api_key',
      apiKeyId: 'key-1',
      visibility: 'workspace',
    })
  })

  it('nomme la trace d’après l’identifiant quand le workflow est introuvable', async () => {
    const { all, recorded } = deps({ workflowName: async () => null })
    await recordRunTrace(input(), all)
    expect(recorded[0].name).toBe('wf-1')
  })

  it('ne rejette jamais, même si la recherche du nom ou l’enregistrement échouent', async () => {
    const { all } = deps({
      workflowName: async () => {
        throw new Error('base indisponible')
      },
    })
    await expect(recordRunTrace(input(), all)).resolves.toBeUndefined()
    const failing = deps({
      record: async () => {
        throw new Error('écriture impossible')
      },
    })
    await expect(recordRunTrace(input(), failing.all)).resolves.toBeUndefined()
  })
})
