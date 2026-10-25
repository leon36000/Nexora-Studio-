import type { NexoraEvalJudgeConfig } from '@/lib/api/contracts/nexora-evaluations'

/** A share between 0 and 1 as « 67 % »; « — » when there is none yet. */
export function formatRate(rate: number | null, locale: string): string {
  if (rate === null) return '—'
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(rate * 100)} %`
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatScore(score: number | null, locale: string): string {
  if (score === null) return '—'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(score)
}

/** The judge kinds in the order the creation window offers them. */
export const JUDGE_KINDS = [
  'llm_class',
  'llm_score',
  'contains',
  'regex',
  'json_valid',
  'semantic',
] as const

export type JudgeKind = (typeof JUDGE_KINDS)[number]

export function isJudgeKind(value: string): value is JudgeKind {
  return JUDGE_KINDS.some((kind) => kind === value)
}

/** The model a judge asks, if it uses one. */
export function judgeModel(config: NexoraEvalJudgeConfig): string | null {
  return config.kind === 'llm_class' || config.kind === 'llm_score' || config.kind === 'semantic'
    ? config.model
    : null
}

/** Today's default judge settings for a kind. */
export function defaultJudgeConfig(kind: JudgeKind, model: string): NexoraEvalJudgeConfig {
  switch (kind) {
    case 'llm_class':
      return {
        kind,
        model,
        instructions: '',
        labels: ['correct', 'incorrect'],
        passLabels: ['correct'],
      }
    case 'llm_score':
      return { kind, model, instructions: '', min: 1, max: 10, passAt: 7 }
    case 'contains':
      return { kind, value: null, caseSensitive: false }
    case 'regex':
      return { kind, pattern: '', caseSensitive: false }
    case 'json_valid':
      return { kind, requiredKeys: [] }
    case 'semantic':
      return { kind, model: 'bge-m3', passAt: 0.8 }
  }
}
