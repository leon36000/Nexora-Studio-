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
