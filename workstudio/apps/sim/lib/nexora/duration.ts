import { formatDuration } from '@sim/utils/formatting'

const NBSP = ' '
const FRENCH_UNITS: Readonly<Record<string, string>> = {
  ms: 'ms',
  s: 's',
  m: 'min',
  h: 'h',
  d: 'j',
}

/**
 * `formatDuration`, with the French typography of the rest of the interface (« 2,62 s », « 1 min 5 s »):
 * the shared formatter writes « 2.62s » whatever the language.
 */
export function formatLogDuration(
  duration: number | string | undefined | null,
  locale: string,
  options?: { precision?: number }
): string | null {
  const text = formatDuration(duration, { precision: 2, ...options })
  if (text === null || !locale.startsWith('fr')) return text
  return text.replace(/(\d+(?:\.\d+)?)(ms|s|m|h|d)\b/g, (_, amount: string, unit: string) => {
    return `${amount.replace('.', ',')}${NBSP}${FRENCH_UNITS[unit]}`
  })
}
