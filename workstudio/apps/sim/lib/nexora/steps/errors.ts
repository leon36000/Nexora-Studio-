/** An execution error in plain French: a key under `steps.errors`, with the values it names. */
interface StepErrorExplanation {
  key: StepErrorKey
  values?: Record<string, string>
}

type StepErrorKey =
  | 'missingFields'
  | 'budget'
  | 'modelNotFound'
  | 'timeout'
  | 'egress'
  | 'auth'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'network'
  | 'json'
  | 'reference'
  | 'smtp'
  | 'unknown'

const MISSING_FIELDS = /^(.+?) is missing required fields?:?\s*(.*)$/i

/** First match wins: the specific causes come before the general ones (a timeout before a 5xx). */
const RULES: readonly { key: StepErrorKey; test: RegExp }[] = [
  { key: 'budget', test: /budget mensuel|\b402\b|monthly (token )?budget/i },
  { key: 'modelNotFound', test: /model\b.{0,60}\b(not found|does not exist|unknown)|unknown model|no such model/i },
  { key: 'timeout', test: /timed? ?out|timeout|ETIMEDOUT|aborted/i },
  { key: 'egress', test: /egress|not allowed|private (address|network)|blocked/i },
  { key: 'smtp', test: /smtp|EAUTH|\b535\b/i },
  { key: 'auth', test: /\b40[13]\b|unauthori[sz]ed|forbidden|invalid api key|permission denied/i },
  { key: 'notFound', test: /\b404\b|not found/i },
  { key: 'rateLimit', test: /\b429\b|too many requests|rate limit/i },
  { key: 'server', test: /\b5\d\d\b|internal server error|bad gateway|service unavailable/i },
  { key: 'network', test: /ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|fetch failed|network error|getaddrinfo/i },
  { key: 'json', test: /unexpected token|invalid json|JSON\.parse|json at position/i },
  { key: 'reference', test: /cannot read propert|is not defined|undefined \(reading|unresolved|invalid reference/i },
]

/**
 * Says in plain French what an execution error means for the person who built the step. The
 * original message is always kept in `values.message` so nothing is hidden, and an error that no
 * rule knows is shown as it came rather than guessed at.
 */
export function explainStepError(message: string): StepErrorExplanation {
  const text = message.trim()
  const missing = MISSING_FIELDS.exec(text)
  if (missing) {
    return { key: 'missingFields', values: { block: missing[1], fields: missing[2] || '—' } }
  }
  const rule = RULES.find((candidate) => candidate.test.test(text))
  if (rule) return { key: rule.key, values: { message: text } }
  return { key: 'unknown', values: { message: text } }
}
