import { createDeferred } from '@sim/testing/helpers/deferred'
import { describe, expect, it } from 'vitest'
import {
  type EngineDeps,
  type EngineStore,
  type ItemOutcome,
  runBatch,
} from '@/lib/nexora/batches/engine'
import type {
  BatchOutcome,
  BatchRecord,
  ItemRecord,
  ItemSuccess,
} from '@/lib/nexora/batches/repository'
import type { BatchProblem, BatchStatus } from '@/lib/nexora/batches/types'
import { createLimiter, INTERACTIVE_WAIT_MAX_MS } from '@/lib/nexora/evaluations/runner'

const T0 = Date.parse('2026-10-25T10:00:00Z')

const done: ItemOutcome = {
  kind: 'done',
  result: {
    response: { status_code: 200, request_id: 'r', body: {} },
    answer: 'ok',
    promptTokens: 1,
    completionTokens: 1,
    latencyMs: 1,
  } satisfies ItemSuccess,
}

const retryable: ItemOutcome = {
  kind: 'error',
  retryable: true,
  problem: { code: 'model_busy', message: 'Occupé' },
  response: null,
  latencyMs: null,
}

interface FakeItem extends ItemRecord {
  state: 'pending' | 'running' | 'done' | 'error'
  problem?: BatchProblem
}

function fakeBatch(overrides: Partial<BatchRecord> = {}): BatchRecord {
  return {
    id: 'b1',
    workspaceId: 'w',
    apiKeyId: null,
    createdBy: null,
    source: 'api',
    name: null,
    endpoint: '/v1/chat/completions',
    model: 'm',
    status: 'in_progress',
    inputFileId: null,
    outputFileId: null,
    errorFileId: null,
    metadata: null,
    config: null,
    tableId: null,
    concurrency: 2,
    total: 0,
    completed: 0,
    failed: 0,
    promptTokens: 0,
    completionTokens: 0,
    errors: null,
    leaseOwner: null,
    leaseUntil: null,
    expiresAt: new Date(T0 + 24 * 3_600_000),
    createdAt: new Date(T0),
    startedAt: null,
    finishedAt: null,
    cancelRequestedAt: null,
    ...overrides,
  }
}

function setup(count: number, batchOverrides: Partial<BatchRecord> = {}) {
  const items: FakeItem[] = Array.from({ length: count }, (_, position) => ({
    id: `i${position}`,
    batchId: 'b1',
    position,
    customId: `c${position}`,
    request: {},
    rowRef: null,
    attempt: 0,
    state: 'pending',
  }))
  const world = {
    clock: T0,
    status: 'in_progress' as BatchStatus,
    owned: true,
    finished: null as { outcome: BatchOutcome; errors?: unknown } | null,
    sleeps: [] as number[],
    batch: fakeBatch(batchOverrides),
  }
  const store: EngineStore = {
    acquireBatch: async () => ({ batch: { ...world.batch, status: world.status }, resumed: false }),
    heartbeat: async () => (world.owned ? world.status : null),
    claimNextItem: async () => {
      const next = items.find((item) => item.state === 'pending')
      if (!next) return null
      next.state = 'running'
      next.attempt += 1
      return { ...next }
    },
    completeItem: async (id) => {
      const item = items.find((entry) => entry.id === id)
      if (item?.state !== 'running') return false
      item.state = 'done'
      return true
    },
    failItem: async (id, problem) => {
      const item = items.find((entry) => entry.id === id)
      if (item?.state !== 'running') return false
      item.state = 'error'
      item.problem = problem
      return true
    },
    releaseItem: async (id, attempted = false) => {
      const item = items.find((entry) => entry.id === id)
      if (item?.state !== 'running') return
      item.state = 'pending'
      if (!attempted) item.attempt -= 1
    },
    countOpenItems: async () =>
      items.filter((item) => item.state === 'pending' || item.state === 'running').length,
    finishBatch: async (_id, _owner, outcome, _now, errors) => {
      if (!world.owned) return false
      world.finished = { outcome, errors }
      for (const item of items) {
        if (item.state === 'pending' || item.state === 'running') item.state = 'error'
      }
      return true
    },
  }
  const baseDeps = {
    store,
    owner: 'p1',
    leaseMs: 90_000,
    now: () => new Date(world.clock),
    sleep: async (ms: number) => {
      world.sleeps.push(ms)
      world.clock += ms
    },
    every: () => () => {},
    limiter: createLimiter(8),
    interactiveBusy: async () => false,
    executeItem: async (): Promise<ItemOutcome> => done,
  }
  const run = (overrides: Partial<EngineDeps> = {}) => runBatch('b1', { ...baseDeps, ...overrides })
  return { items, world, run, store }
}

const states = (items: FakeItem[]) => items.map((item) => item.state)

describe('runBatch', () => {
  it('answers every request and completes the batch', async () => {
    const { items, world, run } = setup(5)
    expect(await run()).toBe('completed')
    expect(states(items)).toEqual(Array(5).fill('done'))
    expect(world.finished?.outcome).toBe('completed')
  })

  it('does not run a batch somebody else holds', async () => {
    const { run, store } = setup(1)
    store.acquireBatch = async () => null
    expect(await run()).toBe('skipped')
  })

  it('never runs more calls at once than the batch concurrency', async () => {
    const { run } = setup(8, { concurrency: 2 })
    let active = 0
    let peak = 0
    const outcome = await run({
      executeItem: async () => {
        active += 1
        peak = Math.max(peak, active)
        await Promise.resolve()
        await Promise.resolve()
        active -= 1
        return done
      },
    })
    expect(outcome).toBe('completed')
    expect(peak).toBe(2)
  })

  it('shares the instance limiter between batches', async () => {
    const limiter = createLimiter(2)
    const first = setup(6, { concurrency: 4 })
    const second = setup(6, { concurrency: 4 })
    let active = 0
    let peak = 0
    const executeItem = async (): Promise<ItemOutcome> => {
      active += 1
      peak = Math.max(peak, active)
      await Promise.resolve()
      await Promise.resolve()
      active -= 1
      return done
    }
    await Promise.all([first.run({ limiter, executeItem }), second.run({ limiter, executeItem })])
    expect(peak).toBe(2)
  })

  it('waits for the interactive load at most thirty seconds per request, then goes on', async () => {
    const { run, world } = setup(1)
    expect(await run({ interactiveBusy: async () => true })).toBe('completed')
    expect(world.sleeps.reduce((total, ms) => total + ms, 0)).toBe(INTERACTIVE_WAIT_MAX_MS)
  })

  it('does not wait for the interactive load when the queue is empty', async () => {
    const { run, world } = setup(1, { concurrency: 3 })
    await run({ interactiveBusy: async () => true })
    expect(world.sleeps.reduce((total, ms) => total + ms, 0)).toBe(INTERACTIVE_WAIT_MAX_MS)
  })

  it('goes on at once when nobody is waiting', async () => {
    const { run, world } = setup(4)
    await run({ interactiveBusy: async () => false })
    expect(world.sleeps).toEqual([])
  })

  it('stops, aborts the calls in flight and cancels when the batch is cancelled', async () => {
    const { items, world, run } = setup(4, { concurrency: 1 })
    const started = createDeferred<void>()
    let aborted = false
    const outcome = run({
      executeItem: async (_batch, _item, signal) => {
        started.resolve()
        await new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => {
            aborted = true
            resolve()
          })
        )
        return { kind: 'aborted' }
      },
      every: (_ms, tick) => {
        void started.promise.then(() => {
          world.status = 'cancelling'
          void tick()
        })
        return () => {}
      },
    })
    expect(await outcome).toBe('cancelled')
    expect(aborted).toBe(true)
    expect(world.finished?.outcome).toBe('cancelled')
    expect(states(items).every((state) => state === 'error')).toBe(true)
  })

  it('finishes at once, without a call, a batch that was asked to cancel before it started', async () => {
    const { run, world, store } = setup(3)
    world.status = 'cancelling'
    let calls = 0
    expect(
      await run({
        store,
        executeItem: async () => {
          calls += 1
          return done
        },
      })
    ).toBe('cancelled')
    expect(calls).toBe(0)
  })

  it('expires a batch whose time is up, keeping what was answered', async () => {
    const { items, world, run } = setup(4, { concurrency: 1 })
    let calls = 0
    const outcome = await run({
      executeItem: async () => {
        calls += 1
        world.clock = world.batch.expiresAt.getTime() + 1
        return done
      },
    })
    expect(outcome).toBe('expired')
    expect(calls).toBe(1)
    expect(items[0].state).toBe('done')
    expect(world.finished?.outcome).toBe('expired')
  })

  it('does not run a batch whose time is already up', async () => {
    const { run, world } = setup(2, { expiresAt: new Date(T0 - 1) })
    let calls = 0
    expect(
      await run({
        executeItem: async () => {
          calls += 1
          return done
        },
      })
    ).toBe('expired')
    expect(calls).toBe(0)
    expect(world.finished?.outcome).toBe('expired')
  })

  it('tries a transient error again, then succeeds', async () => {
    const { items, run } = setup(1)
    let calls = 0
    const outcome = await run({
      executeItem: async () => {
        calls += 1
        return calls < 3 ? retryable : done
      },
    })
    expect(outcome).toBe('completed')
    expect(calls).toBe(3)
    expect(items[0].state).toBe('done')
  })

  it('gives up on a transient error after three attempts', async () => {
    const { items, run } = setup(1)
    let calls = 0
    await run({
      executeItem: async () => {
        calls += 1
        return retryable
      },
    })
    expect(calls).toBe(3)
    expect(items[0]).toMatchObject({ state: 'error', problem: { code: 'model_busy' } })
  })

  it('does not try a definitive error again', async () => {
    const { items, run } = setup(2)
    let calls = 0
    await run({
      executeItem: async (_batch, item) => {
        calls += 1
        return item.position === 0
          ? { ...retryable, retryable: false, problem: { code: 'invalid_request', message: 'x' } }
          : done
      },
    })
    expect(calls).toBe(2)
    expect(states(items)).toEqual(['error', 'done'])
  })

  it('records a request whose execution threw and goes on with the others', async () => {
    const { items, run } = setup(3)
    const outcome = await run({
      executeItem: async (_batch, item) => {
        if (item.position === 1) throw new Error('boom')
        return done
      },
    })
    expect(outcome).toBe('completed')
    expect(states(items)).toEqual(['done', 'error', 'done'])
    expect(items[1].problem?.code).toBe('internal_error')
  })

  it('leaves the batch to the next process when it lost its lease', async () => {
    const { items, world, run } = setup(3, { concurrency: 1 })
    const outcome = await run({
      executeItem: async () => {
        world.owned = false
        return done
      },
    })
    expect(outcome).toBe('interrupted')
    expect(world.finished).toBeNull()
    expect(states(items).filter((state) => state === 'pending').length).toBe(2)
  })

  it('stops the batch when an item asks for it (monthly budget), releasing that request', async () => {
    const { items, world, run } = setup(3, { concurrency: 1 })
    const outcome = await run({
      executeItem: async (_batch, item) =>
        item.position === 1
          ? { kind: 'stop', code: 'monthly_budget_reached', message: 'Budget atteint.' }
          : done,
    })
    expect(outcome).toBe('failed')
    expect(world.finished).toMatchObject({
      outcome: 'failed',
      errors: [{ code: 'monthly_budget_reached', message: 'Budget atteint.', line: null }],
    })
    expect(items[0].state).toBe('done')
  })

  it('puts a request back in the queue when the server shuts down under it', async () => {
    const { items, run } = setup(2, { concurrency: 1 })
    const controller = new AbortController()
    const outcome = await run({
      externalSignal: controller.signal,
      executeItem: async () => {
        controller.abort()
        return { kind: 'aborted' }
      },
    })
    expect(outcome).toBe('interrupted')
    expect(states(items)).toEqual(['pending', 'pending'])
  })
})
