import type { CopilotStep } from '@/lib/nexora/copilot/plan'

const TRIGGER_TYPES = ['manuel', 'planification', 'webhook', 'chat'] as const
const STEP_TYPES = [
  'agent',
  'condition',
  'api',
  'attente',
  'validation_humaine',
  'reponse',
] as const

type PreviewTriggerType = (typeof TRIGGER_TYPES)[number]
type PreviewStepType = (typeof STEP_TYPES)[number]

/** What a preview row shows its icon and label for; `unknown` for a kind this page does not know. */
export type PreviewRowType = PreviewTriggerType | PreviewStepType | 'unknown'

interface PlanPreviewRow {
  key: string
  type: PreviewRowType
  /** The step's name in the plan; `null` for the trigger. */
  name: string | null
  /** What the row does, in French; `null` when the summary cannot be matched to the steps. */
  sentence: string | null
}

interface PreviewablePlan {
  trigger: { kind: string }
  steps: ReadonlyArray<{ kind: string; name: string }>
}

function typeOf<T extends string>(kind: string, known: readonly T[]): T | 'unknown' {
  return (known as readonly string[]).includes(kind) ? (kind as T) : 'unknown'
}

/**
 * The plan as readable rows: the trigger, then each step, each with the summary's sentence for it.
 * The summary is the trigger's sentence then one per step; when its length does not match, no row
 * gets a sentence rather than risking one describing another step.
 */
export function buildPlanPreview(
  plan: PreviewablePlan,
  summary: readonly string[]
): PlanPreviewRow[] {
  const aligned = summary.length === plan.steps.length + 1
  return [
    {
      key: 'trigger',
      type: typeOf(plan.trigger.kind, TRIGGER_TYPES),
      name: null,
      sentence: aligned ? summary[0] : null,
    },
    ...plan.steps.map((step, index) => ({
      key: `step:${step.name}`,
      type: typeOf(step.kind, STEP_TYPES),
      name: step.name,
      sentence: aligned ? summary[index + 1] : null,
    })),
  ]
}

/** A detail's label key in `copilot.dialog.details`. */
type StepDetailKey =
  | 'instructions'
  | 'message'
  | 'services'
  | 'knowledgeBases'
  | 'output'
  | 'request'
  | 'body'
  | 'fields'

interface StepDetail {
  key: StepDetailKey
  value: string
}

/**
 * What a step does in full, for the person to check before « Créer » (the summary cuts long
 * instructions, messages and addresses). Condition and wait steps have nothing the summary leaves
 * out, so they have no details.
 */
export function stepDetails(step: CopilotStep): StepDetail[] {
  switch (step.kind) {
    case 'agent': {
      const details: StepDetail[] = [
        { key: 'instructions', value: step.instructions },
        { key: 'message', value: step.message },
      ]
      if (step.services.length > 0)
        details.push({ key: 'services', value: step.services.join(', ') })
      if (step.knowledgeBases.length > 0) {
        details.push({ key: 'knowledgeBases', value: step.knowledgeBases.join(', ') })
      }
      if (step.output) {
        details.push({
          key: 'output',
          value: step.output.fields.map((field) => `${field.name} (${field.type})`).join(', '),
        })
      }
      return details
    }
    case 'api':
      return [
        { key: 'request', value: `${step.method} ${step.url}` },
        ...(step.body ? [{ key: 'body' as const, value: step.body }] : []),
      ]
    case 'validation_humaine':
      return [{ key: 'message', value: step.message }]
    case 'reponse':
      return [
        {
          key: 'fields',
          value: step.fields.map((field) => `${field.name} = ${field.value}`).join('\n'),
        },
      ]
    case 'condition':
    case 'attente':
      return []
  }
}
