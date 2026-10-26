import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import type { JudgeRun } from '@/lib/nexora/evaluations/judge'
import type { CampaignRecord, ItemRecord, ItemResult } from '@/lib/nexora/evaluations/repository'
import type { TargetContext, TargetResult } from '@/lib/nexora/evaluations/targets'
import {
  type CampaignStatus,
  type EvalTarget,
  type JudgeConfig,
  type JudgeSubject,
  MAX_CAMPAIGN_CONCURRENCY,
} from '@/lib/nexora/evaluations/types'

const logger = createLogger('NexoraEvaluationRunner')

/** A new item waits at most this long for an interactive run (the Assistant, a chat) to finish. */
export const INTERACTIVE_WAIT_MAX_MS = 30_000
const INTERACTIVE_POLL_MS = 2_000

export interface Limiter {
  /** Resolves with a release function once a slot is free; rejects if `signal` aborts first. */
  acquire: (signal?: AbortSignal) => Promise<() => void>
}

/** A first-in first-out counting semaphore: the instance-wide cap on campaign model calls. */
export function createLimiter(max: number): Limiter {
  let active = 0
  const waiting: { grant: () => void }[] = []
  const release = () => {
    const next = waiting.shift()
    if (next) next.grant()
    else active -= 1
  }
  return {
    acquire(signal) {
      if (signal?.aborted) return Promise.reject(new Error('aborted'))
      if (active < max) {
        active += 1
        return Promise.resolve(release)
      }
      return new Promise((resolve, reject) => {
        const entry = { grant: () => resolve(release) }
        waiting.push(entry)
        signal?.addEventListener(
          'abort',
          () => {
            const index = waiting.indexOf(entry)
            if (index !== -1) {
              waiting.splice(index, 1)
              reject(new Error('aborted'))
            }
          },
          { once: true }
        )
      })
    },
  }
}

/** The part of the repository the runner uses (an in-memory copy stands in for it in tests). */
export interface RunnerStore {
  acquireCampaign: (
    campaignId: string,
    owner: string,
    now: Date,
    leaseUntil: Date
  ) => Promise<{ campaign: CampaignRecord; resumed: boolean } | null>
  heartbeat: (campaignId: string, owner: string, leaseUntil: Date) => Promise<boolean>
  claimNextItem: (campaignId: string, now: Date) => Promise<ItemRecord | null>
  completeItem: (itemId: string, attempt: number, result: ItemResult, now: Date) => Promise<void>
  failItem: (
    itemId: string,
    attempt: number,
    error: string,
    latencyMs: number | null,
    now: Date
  ) => Promise<void>
  releaseItem: (itemId: string, attempt: number) => Promise<void>
  finishCampaign: (
    campaignId: string,
    owner: string,
    status: 'completed' | 'interrupted' | 'failed',
    error?: string | null
  ) => Promise<boolean>
  readCampaignStatus: (campaignId: string) => Promise<CampaignStatus | null>
  countOpenItems: (campaignId: string) => Promise<number>
  getJudge: (workspaceId: string, judgeId: string) => Promise<{ config: JudgeConfig } | null>
}

export interface RunnerDeps {
  store: RunnerStore
  /** Identifies this process as the campaign's runner (its lease). */
  owner: string
  leaseMs: number
  now: () => Date
  sleep: (ms: number) => Promise<void>
  /** Calls `run` every `ms` until the returned function is called: keeps the lease alive. */
  every: (ms: number, run: () => Promise<void>) => () => void
  runTarget: (
    target: EvalTarget,
    row: { input: string },
    context: TargetContext
  ) => Promise<TargetResult>
  runJudge: (
    config: JudgeConfig,
    subject: JudgeSubject,
    context: TargetContext
  ) => Promise<JudgeRun>
  co2: (model: string | null, tokens: number) => Promise<number | null>
  checkBudget: (workspaceId: string) => Promise<{ allowed: boolean; message?: string }>
  interactiveBusy: () => Promise<boolean>
  /** Called once when the campaign ended on its own (not cancelled): raises the alerts. */
  onFinished: (
    campaign: CampaignRecord,
    status: 'completed' | 'interrupted' | 'failed'
  ) => Promise<void>
  limiter: Limiter
  /** Aborts every in-flight call (the process is cancelling the campaign). */
  externalSignal?: AbortSignal
}

export type RunOutcome = 'completed' | 'cancelled' | 'interrupted' | 'failed' | 'skipped'

const HEARTBEAT_EVERY_MS = 30_000

function targetModel(target: EvalTarget): string | null {
  return target.kind === 'agent' ? null : target.model.replace(/^vllm\//, '')
}

function isBudgetRefusal(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'monthly_budget_reached'
  )
}

/**
 * Runs a campaign to its end in this process: takes its lease, then `concurrency` workers (at
 * most {@link MAX_CAMPAIGN_CONCURRENCY}, and never more calls at once than the shared limiter
 * allows) claim items one at a time, ask the target, have the judge decide, and store the result.
 * Before each item a worker yields to interactive runs (up to {@link INTERACTIVE_WAIT_MAX_MS}) and
 * checks the monthly budget; between items it renews the lease and notices a cancellation, which
 * also aborts the calls in flight. Resumes a campaign whose previous process died: the store puts
 * its in-flight items back in the queue when the lease is taken over.
 */
export async function runCampaign(campaignId: string, deps: RunnerDeps): Promise<RunOutcome> {
  const { store } = deps
  const leaseUntil = () => new Date(deps.now().getTime() + deps.leaseMs)
  const acquired = await store.acquireCampaign(campaignId, deps.owner, deps.now(), leaseUntil())
  if (!acquired) return 'skipped'
  const { campaign } = acquired

  const controller = new AbortController()
  deps.externalSignal?.addEventListener('abort', () => controller.abort(), { once: true })
  const state = { stop: false, cancelled: false, lost: false, budgetMessage: null as string | null }
  const context: TargetContext = {
    workspaceId: campaign.workspaceId,
    userId: campaign.createdBy,
    campaignName: campaign.name,
    signal: controller.signal,
  }

  /** Renews the lease; when it cannot, finds out whether the campaign was cancelled or taken over. */
  const renewLease = async (): Promise<boolean> => {
    if (await store.heartbeat(campaignId, deps.owner, leaseUntil())) return true
    const status = await store.readCampaignStatus(campaignId)
    if (status === 'cancelled') state.cancelled = true
    else state.lost = true
    state.stop = true
    controller.abort()
    return false
  }
  const stopHeartbeat = deps.every(HEARTBEAT_EVERY_MS, async () => {
    if (!state.stop) await renewLease()
  })

  try {
    const judge = await store.getJudge(campaign.workspaceId, campaign.judgeId)
    if (!judge) {
      const message = 'Le juge de cette campagne n’existe plus.'
      await store.finishCampaign(campaignId, deps.owner, 'failed', message)
      await deps.onFinished(campaign, 'failed')
      return 'failed'
    }

    const waitForInteractiveIdle = async () => {
      let waited = 0
      while (waited < INTERACTIVE_WAIT_MAX_MS && !state.stop && (await deps.interactiveBusy())) {
        await deps.sleep(INTERACTIVE_POLL_MS)
        waited += INTERACTIVE_POLL_MS
      }
    }

    const processItem = async (item: ItemRecord) => {
      const target = campaign.targets.find((candidate) => candidate.key === item.targetKey)
      if (!target) {
        await store.failItem(item.id, item.attempt, 'Cible introuvable dans la campagne.', null, deps.now())
        return
      }
      let result: TargetResult
      try {
        result = await deps.runTarget(target, { input: item.input }, context)
      } catch (error) {
        if (controller.signal.aborted) {
          await store.releaseItem(item.id, item.attempt)
        } else if (isBudgetRefusal(error)) {
          state.budgetMessage ??= getErrorMessage(error, 'Budget mensuel atteint.')
          state.stop = true
          await store.releaseItem(item.id, item.attempt)
        } else {
          await store.failItem(
            item.id,
            item.attempt,
            getErrorMessage(error, 'Échec de la cible.'),
            null,
            deps.now()
          )
        }
        return
      }
      const judged = await deps.runJudge(
        judge.config,
        {
          input: item.input,
          answer: result.answer,
          expected: item.expected,
          guidance: item.guidance,
        },
        context
      )
      if (controller.signal.aborted) {
        await store.releaseItem(item.id, item.attempt)
        return
      }
      const kgCo2eq = await deps
        .co2(targetModel(target), result.usage.promptTokens + result.usage.completionTokens)
        .catch(() => null)
      await store.completeItem(
        item.id,
        item.attempt,
        {
          answer: result.answer,
          verdict: judged.verdict,
          score: judged.score,
          judgeNote: judged.note,
          latencyMs: result.latencyMs,
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
          kgCo2eq,
          executionId: result.executionId,
        },
        deps.now()
      )
    }

    const worker = async () => {
      while (!state.stop) {
        if (!(await renewLease())) break
        const budget = await deps.checkBudget(campaign.workspaceId)
        if (!budget.allowed) {
          state.budgetMessage ??= budget.message ?? 'Budget mensuel atteint.'
          state.stop = true
          break
        }
        let release: (() => void) | null = null
        try {
          release = await deps.limiter.acquire(controller.signal)
        } catch {
          break
        }
        try {
          if (state.stop) break
          const item = await store.claimNextItem(campaignId, deps.now())
          if (!item) break
          // Waiting happens once an item is in hand, so a worker that finds the queue empty never waits.
          await waitForInteractiveIdle()
          if (state.stop) {
            await store.releaseItem(item.id, item.attempt)
            break
          }
          await processItem(item)
        } finally {
          release()
        }
      }
    }

    const workers = Math.max(1, Math.min(campaign.concurrency, MAX_CAMPAIGN_CONCURRENCY))
    await Promise.all(Array.from({ length: workers }, worker))

    if (state.cancelled) return 'cancelled'
    if (state.lost) return 'interrupted'
    if (state.budgetMessage) {
      await store.finishCampaign(campaignId, deps.owner, 'interrupted', state.budgetMessage)
      await deps.onFinished(campaign, 'interrupted')
      return 'interrupted'
    }
    if ((await store.countOpenItems(campaignId)) > 0) {
      await store.finishCampaign(
        campaignId,
        deps.owner,
        'interrupted',
        'Des éléments sont restés sans résultat.'
      )
      return 'interrupted'
    }
    if (!(await store.finishCampaign(campaignId, deps.owner, 'completed'))) return 'cancelled'
    await deps.onFinished(campaign, 'completed')
    return 'completed'
  } catch (error) {
    logger.error('Evaluation campaign failed', { campaignId, error: getErrorMessage(error) })
    await store
      .finishCampaign(
        campaignId,
        deps.owner,
        'failed',
        getErrorMessage(error, 'Échec de la campagne.')
      )
      .catch(() => false)
    return 'failed'
  } finally {
    stopHeartbeat()
  }
}
