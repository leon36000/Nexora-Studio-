import { isRecordLike } from '@sim/utils/object'

/**
 * Nexora edition: masking of personal data before a trace is stored or exported. Pure TypeScript,
 * best-effort (regular expressions plus the checks that keep false positives down): a safety net,
 * not a guarantee. `standard` masks e-mails, IBANs, card and phone numbers and secrets; `strict`
 * masks the same and additionally keeps no content at all (the collector drops it); `none` stores
 * what it is given.
 */
export type RedactionMode = 'standard' | 'strict' | 'none'

const SECRET_MARK = '[SECRET]'

export interface RedactedText {
  text: string
  masked: number
}

export interface RedactedValue<T> {
  value: T
  masked: number
}

const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g
const API_KEY = /\bsk-[A-Za-z0-9_-]{20,}/g
const EMAIL = /[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9-]{1,63}\.){1,8}[A-Za-z]{2,24}/g
const IBAN_CANDIDATE = /(?<![A-Z0-9])[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?/g
const CARD_CANDIDATE = /(?<![\d-])(?:\d[ -]?){12,18}\d(?!\d)/g
const PHONE_INTERNATIONAL = /(?<![\d+])(?:\+|00)\d{1,3}(?:[ .-]?\(?\d{1,4}\)?){2,5}(?!\d)/g
const PHONE_FRENCH = /(?<![\d+])0[1-9](?:[ .-]?\d{2}){4}(?!\d)/g

const CARD_PREFIX =
  /^(?:4\d{12,18}|5[1-5]\d{14}|2(?:2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720)\d{12}|3[47]\d{13}|6(?:011|5\d\d)\d{12,15})$/

const SENSITIVE_KEY =
  /^(?:pass(?:word|wd)?|authorization|api[-_]?key|secret|client[-_]?secret|(?:access|refresh|id)[-_]?token|token|private[-_]?key|cookie)$/i

const MIN_PHONE_DIGITS = 9
const MAX_PHONE_DIGITS = 15

/** ISO 13616 check: the rearranged number, read as an integer, leaves 1 modulo 97. */
function isValidIban(compact: string): boolean {
  if (compact.length < 15 || compact.length > 34) return false
  const rearranged = compact.slice(4) + compact.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const code = char.charCodeAt(0)
    const digits = code >= 65 ? String(code - 55) : char
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

function passesLuhn(digits: string): boolean {
  let sum = 0
  let double = false
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

/** Replaces each match `accept` approves with `mark`; others are left as they were. */
function replaceMatches(
  text: string,
  pattern: RegExp,
  mark: string,
  accept: (match: string) => boolean = () => true
): RedactedText {
  let masked = 0
  const result = text.replace(pattern, (match) => {
    if (!accept(match)) return match
    masked += 1
    return mark
  })
  return { text: result, masked }
}

function maskIbans(text: string): RedactedText {
  let masked = 0
  const result = text.replace(IBAN_CANDIDATE, (match) => {
    const groups = match.split(' ')
    // A trailing word in capitals ("… 189 MERCI") is not part of the number.
    while (groups.length > 1 && /^[A-Z]+$/.test(groups[groups.length - 1])) groups.pop()
    const number = groups.join(' ')
    if (!isValidIban(number.replace(/ /g, ''))) return match
    masked += 1
    return `[IBAN]${match.slice(number.length)}`
  })
  return { text: result, masked }
}

function isPaymentCard(match: string): boolean {
  const digits = match.replace(/[ -]/g, '')
  return CARD_PREFIX.test(digits) && passesLuhn(digits)
}

function isPhone(match: string): boolean {
  const digits = match.replace(/\D/g, '').replace(/^00/, '')
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS
}

const PASSES: Array<(text: string) => RedactedText> = [
  (text) => replaceMatches(text, BEARER, SECRET_MARK),
  (text) => replaceMatches(text, JWT, SECRET_MARK),
  (text) => replaceMatches(text, API_KEY, SECRET_MARK),
  (text) => replaceMatches(text, EMAIL, '[E-MAIL]'),
  maskIbans,
  (text) => replaceMatches(text, CARD_CANDIDATE, '[CARTE]', isPaymentCard),
  (text) => replaceMatches(text, PHONE_INTERNATIONAL, '[TÉLÉPHONE]', isPhone),
  (text) => replaceMatches(text, PHONE_FRENCH, '[TÉLÉPHONE]'),
]

export function redactText(text: string, mode: RedactionMode): RedactedText {
  if (mode === 'none' || typeof text !== 'string' || text === '') return { text, masked: 0 }
  let current = text
  let masked = 0
  for (const pass of PASSES) {
    const outcome = pass(current)
    current = outcome.text
    masked += outcome.masked
  }
  return { text: current, masked }
}

/**
 * The same masking over every string of a JSON-like value, on a copy: the value of a key named
 * like a secret (`password`, `authorization`, `apiKey`…) is masked whatever it holds.
 */
export function redactValue<T>(value: T, mode: RedactionMode): RedactedValue<T> {
  if (mode === 'none') return { value, masked: 0 }
  let masked = 0
  const copies = new Map<object, unknown>()

  const visit = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const outcome = redactText(node, mode)
      masked += outcome.masked
      return outcome.text
    }
    if (Array.isArray(node)) {
      const known = copies.get(node)
      if (known) return known
      const copy: unknown[] = []
      copies.set(node, copy)
      for (const item of node) copy.push(visit(item))
      return copy
    }
    if (isRecordLike(node)) {
      const known = copies.get(node)
      if (known) return known
      const copy: Record<string, unknown> = {}
      copies.set(node, copy)
      for (const [key, entry] of Object.entries(node)) {
        const hasContent = entry !== null && entry !== undefined && entry !== ''
        if (SENSITIVE_KEY.test(key) && hasContent) {
          masked += 1
          copy[key] = SECRET_MARK
        } else {
          copy[key] = visit(entry)
        }
      }
      return copy
    }
    return node
  }

  return { value: visit(value) as T, masked }
}
