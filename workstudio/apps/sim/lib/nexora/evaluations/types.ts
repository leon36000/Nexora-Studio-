/**
 * Nexora edition: the vocabulary of evaluations. A test set is crossed with targets (a model, a
 * prompt version, a published agent); a judge gives each answer a verdict.
 */

export type JudgeVerdict = 'pass' | 'fail' | 'error'

/** What a judge decided about one answer: `error` means the judge could not decide. */
export interface JudgeOutcome {
  verdict: JudgeVerdict
  /** A grade for scoring judges, `null` for rules and classifications. */
  score: number | null
  note: string
}

/** What a judge looks at: the question, the target's answer, the expected answer and the guidance. */
export interface JudgeSubject {
  input: string
  answer: string
  expected: string | null
  guidance: string | null
}

interface ContainsRuleConfig {
  kind: 'contains'
  /** The text to find, or `null` to look for the row's expected answer. */
  value: string | null
  caseSensitive: boolean
}

interface RegexRuleConfig {
  kind: 'regex'
  pattern: string
  caseSensitive: boolean
}

interface JsonValidRuleConfig {
  kind: 'json_valid'
  /** Keys the JSON object must have; none asks only for valid JSON. */
  requiredKeys: string[]
}

export type RuleJudgeConfig = ContainsRuleConfig | RegexRuleConfig | JsonValidRuleConfig

/** An LLM picks one label among `labels`; the labels in `passLabels` mean the answer is good. */
export interface LlmClassJudgeConfig {
  kind: 'llm_class'
  model: string
  instructions: string
  labels: string[]
  passLabels: string[]
}

/** An LLM grades from `min` to `max`; a grade of at least `passAt` is a pass. */
export interface LlmScoreJudgeConfig {
  kind: 'llm_score'
  model: string
  instructions: string
  min: number
  max: number
  passAt: number
}

export type LlmJudgeConfig = LlmClassJudgeConfig | LlmScoreJudgeConfig

/** The answer must be close to the expected one (cosine of their embeddings, at least `passAt`). */
export interface SemanticJudgeConfig {
  kind: 'semantic'
  model: string
  passAt: number
}

export type JudgeConfig = RuleJudgeConfig | LlmJudgeConfig | SemanticJudgeConfig

export type JudgeKind = JudgeConfig['kind']

interface TargetBase {
  /** Stable within a campaign (`t1`, `t2`…): rows and statistics refer to it. */
  key: string
  label: string
}

export interface ModelTarget extends TargetBase {
  kind: 'model'
  model: string
  /** Instructions sent as the system message, if any. */
  system: string | null
}

/**
 * A K9 prompt run on a model, pinned to one version: the one `selector` pointed at when the
 * campaign started (`null`: a version chosen by number). A schedule keeps its selector and pins
 * the version again each time it runs.
 */
export interface PromptTarget extends TargetBase {
  kind: 'prompt'
  model: string
  promptId: string
  promptName: string
  version: number
  selector: 'production' | 'test' | 'latest' | null
  variables: Record<string, string>
}

export interface AgentTarget extends TargetBase {
  kind: 'agent'
  workflowId: string
}

export type EvalTarget = ModelTarget | PromptTarget | AgentTarget

export type ItemStatus = 'pending' | 'running' | 'done' | 'error'

export type CampaignStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'interrupted'
  | 'failed'

/** The most rows of a test set, and the most items (rows x targets) of a campaign. */
export const MAX_DATASET_ROWS = 10_000
export const MAX_CAMPAIGN_ITEMS = 5_000
export const MAX_CAMPAIGN_CONCURRENCY = 8
export const DEFAULT_CAMPAIGN_CONCURRENCY = 2
/** An answer is kept up to this many characters. */
export const MAX_ANSWER_CHARACTERS = 20_000
