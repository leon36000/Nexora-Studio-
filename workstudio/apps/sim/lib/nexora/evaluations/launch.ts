import { OrchestrationError } from '@/lib/core/orchestration/types'
import type { CampaignRecord, RowRecord } from '@/lib/nexora/evaluations/repository'
import {
  DEFAULT_CAMPAIGN_CONCURRENCY,
  type EvalTarget,
  MAX_CAMPAIGN_CONCURRENCY,
  MAX_CAMPAIGN_ITEMS,
} from '@/lib/nexora/evaluations/types'

const MAX_TARGETS = 8

type PromptSelector = 'production' | 'test' | 'latest'

/** What a person asks to evaluate; the campaign turns each into an {@link EvalTarget}. */
export type TargetInput =
  | { kind: 'model'; model: string; system?: string | null }
  | {
      kind: 'prompt'
      model: string
      promptId: string
      /** The version this label points at when the campaign starts. */
      selector?: PromptSelector | null
      /** Or a version by number (when no selector is given). */
      version?: number | null
      variables?: Record<string, string>
    }
  | { kind: 'agent'; workflowId: string }

export interface LaunchInput {
  workspaceId: string
  name: string
  datasetId: string
  judgeId: string
  targets: readonly TargetInput[]
  concurrency?: number
  alertThreshold?: number | null
  scheduleId?: string | null
  createdBy: string | null
}

export interface LaunchDeps {
  getDataset: (workspaceId: string, datasetId: string) => Promise<{ id: string } | null>
  listAllRows: (datasetId: string) => Promise<RowRecord[]>
  getJudge: (workspaceId: string, judgeId: string) => Promise<{ id: string } | null>
  findPrompt: (
    workspaceId: string,
    promptRef: string
  ) => Promise<{ id: string; name: string } | null>
  resolvePromptVersion: (
    promptId: string,
    pick: { selector: PromptSelector } | { version: number }
  ) => Promise<{ version: number } | null>
  listAgents: (workspaceId: string) => Promise<{ workflowId: string; name: string }[]>
  insertCampaign: (input: {
    workspaceId: string
    name: string
    datasetId: string
    judgeId: string
    targets: EvalTarget[]
    concurrency: number
    alertThreshold: number | null
    scheduleId: string | null
    createdBy: string | null
    rows: readonly RowRecord[]
  }) => Promise<CampaignRecord>
  /** Starts the background run of a created campaign (does not wait for it). */
  start: (campaignId: string) => void
}

function invalid(message: string): never {
  throw new OrchestrationError('validation', message)
}

function modelLabel(model: string): string {
  return model.replace(/^vllm\//, '')
}

/** Gives each target its key (`t1`…) and the name the tables show; checks what it refers to. */
async function resolveTargets(
  workspaceId: string,
  inputs: readonly TargetInput[],
  deps: LaunchDeps
): Promise<EvalTarget[]> {
  if (inputs.length === 0) invalid('Choisissez au moins une cible à évaluer.')
  if (inputs.length > MAX_TARGETS) invalid(`Une campagne compare au plus ${MAX_TARGETS} cibles.`)
  let agents: Awaited<ReturnType<LaunchDeps['listAgents']>> | null = null
  const resolved: EvalTarget[] = []
  for (const [index, input] of inputs.entries()) {
    const key = `t${index + 1}`
    if (input.kind === 'model') {
      const system = input.system?.trim() ? input.system : null
      resolved.push({
        key,
        kind: 'model',
        model: input.model,
        system,
        label: `${modelLabel(input.model)}${system ? ' + consignes' : ''}`,
      })
    } else if (input.kind === 'prompt') {
      const prompt = await deps.findPrompt(workspaceId, input.promptId)
      if (!prompt) invalid('Un des prompts choisis n’existe pas dans cet espace.')
      const selector = input.selector ?? null
      const found = await deps.resolvePromptVersion(
        prompt.id,
        selector ? { selector } : { version: input.version ?? 0 }
      )
      if (!found) {
        invalid(
          selector
            ? `Le prompt « ${prompt.name} » n’a pas de version étiquetée « ${selector} ».`
            : `Le prompt « ${prompt.name} » n’a pas de version ${input.version}.`
        )
      }
      resolved.push({
        key,
        kind: 'prompt',
        model: input.model,
        promptId: prompt.id,
        promptName: prompt.name,
        version: found.version,
        selector,
        variables: input.variables ?? {},
        label: `« ${prompt.name} » v${found.version} · ${modelLabel(input.model)}`,
      })
    } else {
      agents ??= await deps.listAgents(workspaceId)
      const agent = agents.find((candidate) => candidate.workflowId === input.workflowId)
      if (!agent) invalid('Un des agents choisis n’est pas publié dans cet espace.')
      resolved.push({
        key,
        kind: 'agent',
        workflowId: agent.workflowId,
        label: `Agent « ${agent.name} »`,
      })
    }
  }
  const seen = new Map<string, number>()
  return resolved.map((target) => {
    const count = (seen.get(target.label) ?? 0) + 1
    seen.set(target.label, count)
    return count === 1 ? target : { ...target, label: `${target.label} #${count}` }
  })
}

/** The requests a stored list of targets stands for: a schedule asks for them again each time. */
export function targetsToInputs(targets: readonly EvalTarget[]): TargetInput[] {
  return targets.map((target): TargetInput => {
    if (target.kind === 'model')
      return { kind: 'model', model: target.model, system: target.system }
    if (target.kind === 'agent') return { kind: 'agent', workflowId: target.workflowId }
    return {
      kind: 'prompt',
      model: target.model,
      promptId: target.promptId,
      selector: target.selector,
      version: target.selector ? null : target.version,
      variables: target.variables,
    }
  })
}

/**
 * Creates a campaign over a test set and starts it in the background. Checks that the test set,
 * the judge and what is evaluated exist in the workspace, pins prompt versions, and refuses a
 * campaign of more than {@link MAX_CAMPAIGN_ITEMS} items.
 */
export async function launchCampaign(
  input: LaunchInput,
  deps: LaunchDeps
): Promise<CampaignRecord> {
  const [dataset, judge] = await Promise.all([
    deps.getDataset(input.workspaceId, input.datasetId),
    deps.getJudge(input.workspaceId, input.judgeId),
  ])
  if (!dataset) throw new OrchestrationError('not_found', 'Jeu de tests introuvable')
  if (!judge) throw new OrchestrationError('not_found', 'Juge introuvable')
  const targets = await resolveTargets(input.workspaceId, input.targets, deps)
  const rows = await deps.listAllRows(dataset.id)
  if (rows.length === 0) invalid('Ce jeu de tests est vide : ajoutez-y des lignes.')
  const items = rows.length * targets.length
  if (items > MAX_CAMPAIGN_ITEMS) {
    invalid(
      `Cette campagne ferait ${items} éléments (${rows.length} lignes × ${targets.length} cibles) : le maximum est 5 000. Réduisez le jeu ou le nombre de cibles.`
    )
  }
  const campaign = await deps.insertCampaign({
    workspaceId: input.workspaceId,
    name: input.name,
    datasetId: dataset.id,
    judgeId: judge.id,
    targets,
    concurrency: Math.min(
      Math.max(Math.trunc(input.concurrency ?? DEFAULT_CAMPAIGN_CONCURRENCY), 1),
      MAX_CAMPAIGN_CONCURRENCY
    ),
    alertThreshold: input.alertThreshold ?? null,
    scheduleId: input.scheduleId ?? null,
    createdBy: input.createdBy,
    rows,
  })
  deps.start(campaign.id)
  return campaign
}
