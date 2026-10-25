import { parseAsStringLiteral } from 'nuqs/server'

export const EVALUATION_TABS = ['campaigns', 'datasets', 'judges', 'schedules'] as const

/** The Evaluations page's URL state: the open tab. */
export const evaluationsParsers = {
  tab: parseAsStringLiteral(EVALUATION_TABS).withDefault('campaigns'),
} as const

export const evaluationsUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const
