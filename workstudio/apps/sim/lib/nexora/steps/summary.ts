import { isRecordLike, toArray, toRecord } from '@sim/utils/object'
import { truncate } from '@sim/utils/string'
import { catalogEntryOf, subBlockValues } from '@/lib/nexora/steps/catalog'

/** A card's one-line summary: a key under `steps.summary` and the values it names. */
interface StepSummary {
  key: string
  values: Record<string, string>
}

const SUMMARY_LENGTH = 100

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The rules `compilePlan` writes (`conditionExpression`), read back as a rule in words. */
const RULE_FORMS: readonly { key: string; test: RegExp; withValue: boolean }[] = [
  {
    key: 'condition.contient',
    test: /^String\((<[^>]+>) \?\? ''\)\.trim\(\)\.toLowerCase\(\)\.includes\("(.*)"\)$/,
    withValue: true,
  },
  {
    key: 'condition.egal',
    test: /^String\((<[^>]+>) \?\? ''\)\.trim\(\)\.toLowerCase\(\) === "(.*)"$/,
    withValue: true,
  },
  {
    key: 'condition.different',
    test: /^String\((<[^>]+>) \?\? ''\)\.trim\(\)\.toLowerCase\(\) !== "(.*)"$/,
    withValue: true,
  },
  { key: 'condition.superieur', test: /^Number\((<[^>]+>)\) > (-?[\d.]+)$/, withValue: true },
  { key: 'condition.inferieur', test: /^Number\((<[^>]+>)\) < (-?[\d.]+)$/, withValue: true },
  {
    key: 'condition.vide',
    test: /^String\((<[^>]+>) \?\? ''\)\.trim\(\)\.toLowerCase\(\) === ''$/,
    withValue: false,
  },
  {
    key: 'condition.non_vide',
    test: /^String\((<[^>]+>) \?\? ''\)\.trim\(\)\.toLowerCase\(\) !== ''$/,
    withValue: false,
  },
]

function summarizeCondition(values: Record<string, unknown>): StepSummary | null {
  let rules: unknown
  try {
    rules = JSON.parse(text(values.conditions))
  } catch {
    return null
  }
  const first = toRecord(toArray(rules)[0])
  const expression = text(first.value).trim()
  if (!expression) return null
  for (const form of RULE_FORMS) {
    const match = form.test.exec(expression)
    if (!match) continue
    const ref = match[1].slice(1, -1)
    return { key: form.key, values: form.withValue ? { ref, value: match[2] } : { ref } }
  }
  return {
    key: 'condition.custom',
    values: { expression: truncate(expression, SUMMARY_LENGTH, '…') },
  }
}

function userMessage(values: Record<string, unknown>): string {
  const messages = toArray(values.messages).filter(isRecordLike)
  const user = [...messages].reverse().find((message) => message.role === 'user')
  return text(user?.content).trim()
}

function fieldNames(value: unknown): string {
  return toArray(value)
    .filter(isRecordLike)
    .map((field) => text(field.name))
    .filter(Boolean)
    .join(', ')
}

/** One sentence about what a step does, from its settings; `null` when it has nothing to say. */
export function summarizeStep(block: { type: string; subBlocks?: unknown }): StepSummary | null {
  const entry = catalogEntryOf(block)
  if (!entry) return null
  const values = subBlockValues(block)
  switch (entry.id) {
    case 'agent': {
      const request = userMessage(values)
      return request
        ? { key: 'agent', values: { request: truncate(request, SUMMARY_LENGTH, '…') } }
        : null
    }
    case 'condition':
      return summarizeCondition(values)
    case 'api-get':
    case 'api-send': {
      const url = text(values.url).trim()
      return url
        ? {
            key: 'api',
            values: {
              method: text(values.method) || 'GET',
              url: truncate(url, SUMMARY_LENGTH, '…'),
            },
          }
        : null
    }
    case 'wait': {
      const amount = text(values.timeValue).trim()
      const unit = values.async === true ? text(values.timeUnitLong) : text(values.timeUnit)
      return amount ? { key: 'wait', values: { amount, unit: unit || 'seconds' } } : null
    }
    case 'human': {
      const message = fieldNames(values.builderData)
      return message ? { key: 'human', values: { shown: message } } : null
    }
    case 'response': {
      const fields = fieldNames(values.builderData)
      return fields ? { key: 'response', values: { fields } } : null
    }
    case 'email': {
      const to = text(values.to).trim()
      return to
        ? { key: 'email', values: { to, subject: truncate(text(values.subject), 60, '…') } }
        : null
    }
    default:
      return null
  }
}
