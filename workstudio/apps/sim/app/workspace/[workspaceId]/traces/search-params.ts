import { parseAsString, parseAsStringLiteral } from 'nuqs/server'
import {
  DURATION_CHOICES,
  PERIOD_CHOICES,
} from '@/app/workspace/[workspaceId]/traces/utils/span-tree'

const STATUS_CHOICES = ['ok', 'error'] as const
const SOURCE_CHOICES = [
  'assistant',
  'agent',
  'playground',
  'copilot',
  'wand',
  'workflow',
  'api_key',
] as const

/**
 * The Traces screen's URL state: the filters, the free-text search (written debounced) and the
 * trace open in the detail panel. The literal filters are deliberately nullable: `null` is « no
 * filter », which no literal of their set can stand for.
 */
export const tracesParsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(STATUS_CHOICES),
  source: parseAsStringLiteral(SOURCE_CHOICES),
  model: parseAsString.withDefault(''),
  agent: parseAsString.withDefault(''),
  key: parseAsString.withDefault(''),
  duration: parseAsStringLiteral(DURATION_CHOICES),
  period: parseAsStringLiteral(PERIOD_CHOICES),
  trace: parseAsString.withDefault(''),
  instance: parseAsStringLiteral(['1'] as const),
} as const

/** Filter/search view-state: clean URLs, no back-stack churn. */
export const tracesUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const
