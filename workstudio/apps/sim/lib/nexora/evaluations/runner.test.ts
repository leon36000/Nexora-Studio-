/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import type { CampaignRecord, ItemRecord, ItemResult } from '@/lib/nexora/evaluations/repository'
import {
  createLimiter,
  INTERACTIVE_WAIT_MAX_MS,
  type RunnerDeps,
  type RunnerStore,
  runCampaign,
} from '@/lib/nexora/evaluations/runner'
import type { EvalTarget, JudgeConfig, JudgeVerdict } from '@/lib/nexora/evaluations/types'

const targets: EvalTarget[] = [
  { key: 't1', label: 'Modèle A', kind: 'model', model: 'a', system: null },
  { key: 't2', label: 'Agent', kind: 'agent', workflowId: 'wf-1' },
]

const judgeConfig: JudgeConfig = { kind: 'contains', value: 'oui', caseSensitive: false }

class FakeStore implements RunnerStore {
  status: CampaignRecord['status'] = 'pending'
  heartbeatAlive = true
  items: ItemRecord[]
  finished: { status: string; error: string | null }[] = []
  completed = new Map<string, ItemResult>()
  failed = new Map<string, string>()
  released: string[] = []
  writtenAttempts = new Map<string, number>()
  campaign: CampaignRecord

  constructor(itemCount: number, overrides: Partial<CampaignRecord> = {}) {
    this.campaign = {
      id: 'camp-1',
      workspaceId: 'ws-1',
      name: 'FAQ tarifs',
      datasetId: 'ds-1',
      judgeId: 'judge-1',
      targets,
      concurrency: 2,
      alertThreshold: null,
      status: 'pending',
      error: null,
      scheduleId: null,
      itemTotal: itemCount,
      createdBy: 'user-1',
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      ...overrides,
    }
    this.items = Array.from({ length: itemCount }, (_, index) => ({
      id: `item-${index}`,
      campaignId: 'camp-1',
      rowId: `row-${Math.floor(index / 2)}`,
      targetKey: targets[index % 2].key,
      position: index,
      status: 'pending',
      attempt: 0,
      input: `Question ${index}`,
      expected: null,
      guidance: null,
      answer: null,
      verdict: null,
      score: null,
      judgeNote: null,
      error: null,
      latencyMs: null,
      inputTokens: 0,
      outputTokens: 0,
      kgCo2eq: null,
      executionId: null,
    }))
  }

  async acquireCampaign() {
    if (this.status !== 'pending') return null
    this.status = 'running'
    return { campaign: { ...this.campaign, status: 'running' as const }, resumed: false }
  }
  async heartbeat() {
    return this.heartbeatAlive && this.status === 'running'
  }
  async claimNextItem() {
    const item = this.items.find((candidate) => candidate.status === 'pending')
    if (!item) return null
    item.status = 'running'
    item.attempt += 1
    return { ...item }
  }
  async completeItem(itemId: string, attempt: number, result: ItemResult) {
    this.writtenAttempts.set(itemId, attempt)
    const item = this.items.find((candidate) => candidate.id === itemId)
    if (item) item.status = result.verdict === 'error' ? 'error' : 'done'
    this.completed.set(itemId, result)
  }
  async failItem(itemId: string, attempt: number, error: string) {
    this.writtenAttempts.set(itemId, attempt)
    const item = this.items.find((candidate) => candidate.id === itemId)
    if (item) item.status = 'error'
    this.failed.set(itemId, error)
  }
  async releaseItem(itemId: string, attempt: number) {
    this.writtenAttempts.set(itemId, attempt)
    const item = this.items.find((candidate) => candidate.id === itemId)
    if (item) item.status = 'pending'
    this.released.push(itemId)
  }
  async finishCampaign(
    _id: string,
    _owner: string,
    status: 'completed' | 'interrupted' | 'failed',
    error: string | null = null
  ) {
    if (this.status !== 'running') return false
    this.status = status
    this.finished.push({ status, error })
    return true
  }
  async readCampaignStatus() {
    return this.status
  }
  async countOpenItems() {
    return this.items.filter((item) => item.status === 'pending' || item.status === 'running')
      .length
  }
  async getJudge(): Promise<{ config: JudgeConfig } | null> {
    return { config: judgeConfig }
  }
}

interface Harness {
  deps: RunnerDeps
  heartbeatTick: () => Promise<void>
  sleeps: number[]
}

function harness(store: FakeStore, overrides: Partial<RunnerDeps> = {}): Harness {
  const sleeps: number[] = []
  let tick: () => Promise<void> = async () => {}
  const deps: RunnerDeps = {
    store,
    owner: 'process-1',
    leaseMs: 60_000,
    now: () => new Date('2026-11-01T02:00:00Z'),
    sleep: async (ms) => {
      sleeps.push(ms)
    },
    every: (_ms, run) => {
      tick = async () => {
        await run()
      }
      return () => {}
    },
    runTarget: async (_target, row) => ({
      answer: 'oui',
      latencyMs: 40,
      usage: { promptTokens: 10, completionTokens: 2 },
      executionId: null,
      ...(row.input ? {} : {}),
    }),
    runJudge: async (_config, subject) => ({
      verdict: subject.answer.includes('oui') ? ('pass' as const) : ('fail' as const),
      score: null,
      note: 'noté',
      usage: null,
    }),
    co2: async (model) => (model ? 0.001 : null),
    checkBudget: async () => ({ allowed: true }),
    interactiveBusy: async () => false,
    onFinished: async () => {},
    limiter: createLimiter(4),
    externalSignal: undefined,
    ...overrides,
  }
  return { deps, heartbeatTick: () => tick(), sleeps }
}

function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('concurrence', () => {
  it('ne dépasse jamais la concurrence de la campagne', async () => {
    const store = new FakeStore(10, { concurrency: 2 })
    let inFlight = 0
    let peak = 0
    const { deps } = harness(store, {
      runTarget: async () => {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await Promise.resolve()
        await Promise.resolve()
        inFlight -= 1
        return {
          answer: 'oui',
          latencyMs: 1,
          usage: { promptTokens: 1, completionTokens: 1 },
          executionId: null,
        }
      },
    })
    await expect(runCampaign('camp-1', deps)).resolves.toBe('completed')
    expect(peak).toBe(2)
    expect(store.completed.size).toBe(10)
  })

  it('partage une limite globale entre les campagnes', async () => {
    const limiter = createLimiter(3)
    let inFlight = 0
    let peak = 0
    const slow = async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setImmediate(resolve))
      inFlight -= 1
      return {
        answer: 'oui',
        latencyMs: 1,
        usage: { promptTokens: 1, completionTokens: 1 },
        executionId: null,
      }
    }
    const first = harness(new FakeStore(8, { concurrency: 4 }), { runTarget: slow, limiter })
    const second = harness(new FakeStore(8, { concurrency: 4 }), { runTarget: slow, limiter })
    await Promise.all([runCampaign('camp-1', first.deps), runCampaign('camp-1', second.deps)])
    expect(peak).toBe(3)
  })

  it('borne la concurrence demandée', async () => {
    const store = new FakeStore(20, { concurrency: 50 })
    let inFlight = 0
    let peak = 0
    const { deps } = harness(store, {
      limiter: createLimiter(100),
      runTarget: async () => {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await new Promise((resolve) => setImmediate(resolve))
        inFlight -= 1
        return {
          answer: 'oui',
          latencyMs: 1,
          usage: { promptTokens: 1, completionTokens: 1 },
          executionId: null,
        }
      },
    })
    await runCampaign('camp-1', deps)
    expect(peak).toBe(8)
  })
})

describe('résultat d’un élément', () => {
  it('enregistre la réponse, le verdict, la latence, les jetons et le CO2 du modèle', async () => {
    const store = new FakeStore(2)
    const { deps } = harness(store)
    await runCampaign('camp-1', deps)
    const modelItem = store.completed.get('item-0')
    expect(modelItem).toMatchObject({
      answer: 'oui',
      verdict: 'pass',
      latencyMs: 40,
      inputTokens: 10,
      outputTokens: 2,
      kgCo2eq: 0.001,
    })
    expect(store.completed.get('item-1')?.kgCo2eq).toBeNull()
  })

  it('écrit chaque issue avec la tentative réclamée, pour qu’un exécutant périmé soit ignoré', async () => {
    const store = new FakeStore(3)
    store.items[0].attempt = 1
    const { deps } = harness(store, {
      runTarget: async (target) => {
        if (target.key === 't2') throw new Error('Délai dépassé')
        return {
          answer: 'oui',
          latencyMs: 5,
          usage: { promptTokens: 1, completionTokens: 1 },
          executionId: null,
        }
      },
    })
    await runCampaign('camp-1', deps)
    expect(store.writtenAttempts.get('item-0')).toBe(2)
    expect(store.writtenAttempts.get('item-1')).toBe(1)
    expect(store.writtenAttempts.get('item-2')).toBe(1)
  })

  it('marque un élément en erreur quand la cible échoue, et continue', async () => {
    const store = new FakeStore(4)
    const { deps } = harness(store, {
      runTarget: async (target) => {
        if (target.key === 't2') throw new Error('Délai dépassé')
        return {
          answer: 'oui',
          latencyMs: 5,
          usage: { promptTokens: 1, completionTokens: 1 },
          executionId: null,
        }
      },
    })
    await expect(runCampaign('camp-1', deps)).resolves.toBe('completed')
    expect([...store.failed.values()]).toEqual(['Délai dépassé', 'Délai dépassé'])
    expect(store.completed.size).toBe(2)
  })

  it('garde le verdict « erreur » d’un juge qui n’a pas su décider', async () => {
    const store = new FakeStore(2)
    const { deps } = harness(store, {
      runJudge: async () => ({
        verdict: 'error' as JudgeVerdict,
        score: null,
        note: 'Format illisible',
        usage: null,
      }),
    })
    await runCampaign('camp-1', deps)
    expect(store.completed.get('item-0')).toMatchObject({
      verdict: 'error',
      judgeNote: 'Format illisible',
    })
  })
})

describe('annulation', () => {
  it('ne démarre plus aucun élément et laisse la campagne annulée', async () => {
    const store = new FakeStore(10, { concurrency: 1 })
    let calls = 0
    const { deps } = harness(store, {
      runTarget: async () => {
        calls += 1
        if (calls === 3) store.status = 'cancelled'
        return {
          answer: 'oui',
          latencyMs: 1,
          usage: { promptTokens: 1, completionTokens: 1 },
          executionId: null,
        }
      },
    })
    await expect(runCampaign('camp-1', deps)).resolves.toBe('cancelled')
    expect(calls).toBe(3)
    expect(store.finished).toEqual([])
    expect(store.status).toBe('cancelled')
  })

  it('interrompt les appels en vol et remet leurs éléments en file', async () => {
    const store = new FakeStore(4, { concurrency: 2 })
    const started = deferred()
    let startedCount = 0
    const { deps, heartbeatTick } = harness(store, {
      runTarget: (_target, _row, context) =>
        new Promise((_resolve, reject) => {
          startedCount += 1
          if (startedCount === 2) started.resolve()
          context.signal.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    })
    const run = runCampaign('camp-1', deps)
    await started.promise
    store.status = 'cancelled'
    await heartbeatTick()
    await expect(run).resolves.toBe('cancelled')
    expect(store.released.sort()).toEqual(['item-0', 'item-1'])
    expect(store.failed.size).toBe(0)
  })
})

describe('budget mensuel', () => {
  it('arrête la campagne proprement : interrompue, sans élément en échec', async () => {
    const store = new FakeStore(10, { concurrency: 1 })
    let checks = 0
    const { deps } = harness(store, {
      checkBudget: async () => {
        checks += 1
        return checks > 3
          ? { allowed: false, message: 'Budget mensuel atteint pour cet espace.' }
          : { allowed: true }
      },
    })
    await expect(runCampaign('camp-1', deps)).resolves.toBe('interrupted')
    expect(store.finished).toEqual([
      { status: 'interrupted', error: 'Budget mensuel atteint pour cet espace.' },
    ])
    expect(store.completed.size).toBe(3)
    expect(store.failed.size).toBe(0)
    expect(store.items.filter((item) => item.status === 'pending')).toHaveLength(7)
  })

  it('traite un refus de budget de la cible comme un arrêt, pas comme un échec de qualité', async () => {
    const store = new FakeStore(6, { concurrency: 1 })
    const { deps } = harness(store, {
      runTarget: async () => {
        throw Object.assign(new Error('Budget mensuel atteint'), { code: 'monthly_budget_reached' })
      },
    })
    await expect(runCampaign('camp-1', deps)).resolves.toBe('interrupted')
    expect(store.failed.size).toBe(0)
    expect(store.released).toEqual(['item-0'])
  })
})

describe('priorité à l’interactif', () => {
  it('attend tant qu’une exécution interactive est en cours, puis passe', async () => {
    const store = new FakeStore(1, { concurrency: 1 })
    let polls = 0
    const { deps, sleeps } = harness(store, {
      interactiveBusy: async () => {
        polls += 1
        return polls <= 3
      },
    })
    await runCampaign('camp-1', deps)
    expect(sleeps).toEqual([2_000, 2_000, 2_000])
    expect(store.completed.size).toBe(1)
  })

  it('n’attend jamais plus de 30 secondes par élément', async () => {
    const store = new FakeStore(1, { concurrency: 1 })
    const { deps, sleeps } = harness(store, { interactiveBusy: async () => true })
    await runCampaign('camp-1', deps)
    expect(sleeps.reduce((total, ms) => total + ms, 0)).toBe(INTERACTIVE_WAIT_MAX_MS)
    expect(store.completed.size).toBe(1)
  })
})

describe('bail', () => {
  it('s’arrête sans rien écrire quand le bail est perdu', async () => {
    const store = new FakeStore(6, { concurrency: 1 })
    let calls = 0
    const { deps } = harness(store, {
      runTarget: async () => {
        calls += 1
        if (calls === 2) store.heartbeatAlive = false
        return {
          answer: 'oui',
          latencyMs: 1,
          usage: { promptTokens: 1, completionTokens: 1 },
          executionId: null,
        }
      },
    })
    await expect(runCampaign('camp-1', deps)).resolves.toBe('interrupted')
    expect(store.finished).toEqual([])
    expect(calls).toBe(2)
  })

  it('ne prend pas une campagne déjà prise par un autre processus', async () => {
    const store = new FakeStore(2)
    store.status = 'running'
    const { deps } = harness(store)
    await expect(runCampaign('camp-1', deps)).resolves.toBe('skipped')
    expect(store.completed.size).toBe(0)
  })
})

describe('clôture', () => {
  it('termine la campagne et prévient une seule fois', async () => {
    const store = new FakeStore(4)
    const onFinished = vi.fn(async () => {})
    const { deps } = harness(store, { onFinished })
    await runCampaign('camp-1', deps)
    expect(store.finished).toEqual([{ status: 'completed', error: null }])
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ id: 'camp-1' }), 'completed')
  })

  it('échoue la campagne quand son juge a disparu', async () => {
    const store = new FakeStore(2)
    store.getJudge = async () => null
    const { deps } = harness(store)
    await expect(runCampaign('camp-1', deps)).resolves.toBe('failed')
    expect(store.finished[0]).toMatchObject({ status: 'failed' })
    expect(store.finished[0].error).toMatch(/juge/i)
  })
})
