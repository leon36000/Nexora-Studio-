import { db } from '@sim/db'
import { member, user } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { sleep } from '@sim/utils/helpers'
import { generateShortId } from '@sim/utils/id'
import { and, eq, inArray } from 'drizzle-orm'
import { hasEmailService, sendEmail } from '@/lib/messaging/email/mailer'
import { instanceLimiter, interactiveBusy } from '@/lib/nexora/background-load'
import { checkBudget } from '@/lib/nexora/consumption/budgets'
import { collectAgentAnswer } from '@/lib/nexora/developer-api/agent-format'
import { answerBlockId, launchAgentRun, listApiAgents } from '@/lib/nexora/developer-api/agents'
import { type AlertDeps, raiseCampaignAlerts } from '@/lib/nexora/evaluations/alerts'
import { runJudge } from '@/lib/nexora/evaluations/judge'
import {
  type LaunchDeps,
  type LaunchInput,
  launchCampaign,
  targetsToInputs,
} from '@/lib/nexora/evaluations/launch'
import { requireEvaluationModelsAllowed } from '@/lib/nexora/evaluations/model-access'
import * as repository from '@/lib/nexora/evaluations/repository'
import {
  countOpenItems,
  failItem,
  readCampaignStatus,
  releaseItem,
} from '@/lib/nexora/evaluations/repository'
import { type RunnerDeps, type RunnerStore, runCampaign } from '@/lib/nexora/evaluations/runner'
import { runDueSchedules } from '@/lib/nexora/evaluations/schedule'
import { embedTexts } from '@/lib/nexora/evaluations/semantic'
import type { SummaryItem } from '@/lib/nexora/evaluations/stats'
import { runTarget, type TargetDeps } from '@/lib/nexora/evaluations/targets'
import type { JudgeConfig, JudgeSubject } from '@/lib/nexora/evaluations/types'
import { findPromptRow, getPromptVersion } from '@/lib/nexora/prompts/repository'
import { co2ForSpans } from '@/lib/nexora/traces/co2'
import { nexoraWandComplete } from '@/lib/nexora/wand'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

const logger = createLogger('NexoraEvaluations')

/** A running campaign renews its lease this often; a stopped server loses it after `LEASE_MS`. */
const LEASE_MS = 120_000

const running = new Map<string, AbortController>()
const owner = `${process.pid}-${generateShortId(8)}`

export const targetDeps: TargetDeps = {
  complete: (input) =>
    nexoraWandComplete({
      messages: input.messages,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      signal: input.signal,
      trace: input.trace,
    }),
  loadPromptVersion: async (workspaceId, promptId, version) => {
    const prompt = await findPromptRow(workspaceId, promptId)
    if (!prompt) return null
    const found = await getPromptVersion(prompt.id, { version })
    return found ? { name: prompt.name, content: found.content, variables: found.variables } : null
  },
  runAgent: async (workflowId, workspaceId, text, signal) => {
    const agent = (await listApiAgents(workspaceId)).find(
      (entry) => entry.workflowId === workflowId
    )
    if (!agent) throw new Error('Cet agent n’est plus publié.')
    const launch = await launchAgentRun({
      agent,
      workspaceId,
      blockId: await answerBlockId(agent, workspaceId),
      text,
      signal,
      origin: null,
      record: async () => {},
    })
    const answer = await collectAgentAnswer(launch.simStream)
    const usage = await launch.settleUsage()
    if (answer.error !== null) throw new Error(answer.error)
    return { content: answer.content, usage, executionId: launch.executionId }
  },
  now: Date.now,
}

async function loadSeries(campaignId: string): Promise<Map<string, SummaryItem[]>> {
  const items = await repository.listItems(campaignId, { answerPreview: 0 })
  const series = new Map<string, SummaryItem[]>()
  for (const item of items) {
    const list = series.get(item.targetKey) ?? []
    list.push(item)
    series.set(item.targetKey, list)
  }
  return series
}

/** The author of the campaign and the instance's owners and administrators. */
async function alertRecipients(campaign: { createdBy: string | null }): Promise<string[]> {
  const organizationId = await getInstanceOrganizationId()
  const [admins, authors] = await Promise.all([
    organizationId
      ? db
          .select({ email: user.email })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(
            and(eq(member.organizationId, organizationId), inArray(member.role, ['owner', 'admin']))
          )
      : [],
    campaign.createdBy
      ? db.select({ email: user.email }).from(user).where(eq(user.id, campaign.createdBy))
      : [],
  ])
  return [...new Set([...admins, ...authors].map((entry) => entry.email).filter(Boolean))]
}

const alertDeps: AlertDeps = {
  loadSeries,
  insertAlerts: repository.insertAlerts,
  recipients: alertRecipients,
  hasEmailService,
  sendEmail: (message) => sendEmail({ ...message, emailType: 'notifications' }),
}

/** Judges one answer with the instance's models: LLM judges are traced under the campaign's name. */
export function judgeLive(
  config: JudgeConfig,
  subject: JudgeSubject,
  context: { workspaceId: string; userId: string | null; campaignName: string; signal: AbortSignal }
) {
  return runJudge(config, subject, {
    complete: (input) =>
      nexoraWandComplete({
        messages: input.messages,
        model: input.model.replace(/^vllm\//, ''),
        temperature: input.temperature,
        signal: input.signal,
        trace: {
          source: 'playground',
          workspaceId: context.workspaceId,
          userId: context.userId,
          name: `Évaluation (juge) : ${context.campaignName}`,
        },
      }),
    embed: embedTexts,
    signal: context.signal,
  })
}

const runnerStore: RunnerStore = {
  acquireCampaign: repository.acquireCampaign,
  heartbeat: repository.heartbeat,
  claimNextItem: repository.claimNextItem,
  completeItem: repository.completeItem,
  failItem,
  releaseItem,
  finishCampaign: repository.finishCampaign,
  readCampaignStatus,
  countOpenItems,
  getJudge: repository.getJudge,
}

function runnerDeps(signal: AbortSignal): RunnerDeps {
  return {
    store: runnerStore,
    owner,
    leaseMs: LEASE_MS,
    now: () => new Date(),
    sleep,
    every: (ms, run) => {
      const timer = setInterval(() => void run().catch(() => undefined), ms)
      timer.unref?.()
      return () => clearInterval(timer)
    },
    runTarget: (target, row, context) => runTarget(target, row, context, targetDeps),
    runJudge: judgeLive,
    co2: async (model, tokens) => (await co2ForSpans([{ model, tokens }]))[0] ?? null,
    checkBudget: async (workspaceId) => {
      const check = await checkBudget(workspaceId, null)
      return check.allowed ? { allowed: true } : { allowed: false, message: check.message }
    },
    interactiveBusy,
    onFinished: async (campaign, status) => {
      await raiseCampaignAlerts(campaign, status, alertDeps).catch((error) =>
        logger.error('Evaluation alerts failed', { error: getErrorMessage(error) })
      )
    },
    limiter: instanceLimiter,
    externalSignal: signal,
  }
}

/** Starts a campaign in the background of this process, once; the cron adopts it if this one dies. */
function startCampaign(campaignId: string): void {
  if (running.has(campaignId)) return
  const controller = new AbortController()
  running.set(campaignId, controller)
  void runCampaign(campaignId, runnerDeps(controller.signal))
    .then((outcome) => logger.info('Evaluation campaign ended', { campaignId, outcome }))
    .catch((error) =>
      logger.error('Evaluation campaign crashed', { campaignId, error: getErrorMessage(error) })
    )
    .finally(() => running.delete(campaignId))
}

/** Stops the calls this process has in flight for a campaign (the status itself is cancelled by the caller). */
export function abortCampaign(campaignId: string): void {
  running.get(campaignId)?.abort()
}

/** Takes over the campaigns nobody runs (their server stopped, or they never started). */
async function resumeCampaigns(now: Date): Promise<string[]> {
  const adoptable = (await repository.listAdoptableCampaignIds(now)).filter(
    (id) => !running.has(id)
  )
  for (const id of adoptable) startCampaign(id)
  return adoptable
}

export const liveLaunchDeps: LaunchDeps = {
  getDataset: repository.getDataset,
  listAllRows: (datasetId) => repository.listRows(datasetId, { limit: 10_000, offset: 0 }),
  getJudge: repository.getJudge,
  findPrompt: async (workspaceId, ref) => {
    const prompt = await findPromptRow(workspaceId, ref)
    return prompt ? { id: prompt.id, name: prompt.name } : null
  },
  resolvePromptVersion: async (promptId, pick) => {
    const found = await getPromptVersion(
      promptId,
      'version' in pick ? { version: pick.version } : { selector: pick.selector }
    )
    return found ? { version: found.version } : null
  },
  listAgents: async (workspaceId) =>
    (await listApiAgents(workspaceId)).map(({ workflowId, name }) => ({ workflowId, name })),
  insertCampaign: repository.insertCampaignWithItems,
  start: startCampaign,
  requireModelsAllowed: requireEvaluationModelsAllowed,
}

export function launchEvaluationCampaign(input: LaunchInput) {
  return launchCampaign(input, liveLaunchDeps)
}

/**
 * What the cron does each minute: starts the campaigns of the due schedules, then adopts the
 * campaigns left without a runner. `now` is the real time unless a test supplies another.
 */
export async function tickEvaluations(now: Date): Promise<{
  started: string[]
  failed: string[]
  resumed: string[]
}> {
  const scheduled = await runDueSchedules(now, {
    claim: repository.claimDueSchedules,
    launch: (schedule) =>
      launchEvaluationCampaign({
        workspaceId: schedule.workspaceId,
        name: `${schedule.name} · ${new Intl.DateTimeFormat('fr-FR', { timeZone: schedule.timezone, dateStyle: 'short', timeStyle: 'short' }).format(now)}`,
        datasetId: schedule.datasetId,
        judgeId: schedule.judgeId,
        targets: targetsToInputs(schedule.targets),
        concurrency: schedule.concurrency,
        alertThreshold: schedule.alertThreshold,
        scheduleId: schedule.id,
        createdBy: schedule.createdBy,
      }),
    onLaunchFailed: async (schedule, reason) => {
      const campaign = await repository.insertFailedCampaign(
        {
          workspaceId: schedule.workspaceId,
          name: `${schedule.name} — échec du lancement`,
          datasetId: schedule.datasetId,
          judgeId: schedule.judgeId,
          targets: schedule.targets,
          concurrency: schedule.concurrency,
          alertThreshold: schedule.alertThreshold ?? 0,
          scheduleId: schedule.id,
          createdBy: schedule.createdBy,
        },
        reason
      )
      await raiseCampaignAlerts(
        { ...campaign, alertThreshold: schedule.alertThreshold ?? 0 },
        'failed',
        alertDeps
      )
    },
    setLastCampaign: repository.setScheduleLastCampaign,
  })
  const resumed = await resumeCampaigns(now)
  return { ...scheduled, resumed }
}
