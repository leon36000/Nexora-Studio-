import { compileLinearRegex } from '@/lib/core/security/linear-regex'
import type { JudgeOutcome, JudgeSubject, RuleJudgeConfig } from '@/lib/nexora/evaluations/types'

const MAX_PATTERN_LENGTH = 500
const MAX_CONTAINS_LENGTH = 2_000
const MAX_REQUIRED_KEYS = 50

const REGEX_UNSUPPORTED =
  'Ce motif n’est pas pris en charge : les assertions (lookahead/lookbehind) et les références arrière sont exclues, pour que la vérification reste rapide.'

/**
 * The reason a rule's settings cannot be used, in French, or `null` when they can. Regular
 * expressions run on an engine that cannot backtrack (RE2), so a pattern cannot stall the server.
 */
export function validateRuleConfig(config: RuleJudgeConfig): string | null {
  switch (config.kind) {
    case 'contains':
      if (config.value === null) return null
      if (config.value.trim().length === 0) return 'Le texte à chercher ne peut pas être vide.'
      return config.value.length > MAX_CONTAINS_LENGTH
        ? `Le texte à chercher fait au plus ${MAX_CONTAINS_LENGTH} caractères.`
        : null
    case 'regex':
      if (config.pattern.length === 0) return 'Le motif ne peut pas être vide.'
      if (config.pattern.length > MAX_PATTERN_LENGTH) {
        return `Le motif fait au plus ${MAX_PATTERN_LENGTH} caractères.`
      }
      return compileLinearRegex(config.pattern, { ignoreCase: !config.caseSensitive })
        ? null
        : REGEX_UNSUPPORTED
    case 'json_valid':
      return config.requiredKeys.length > MAX_REQUIRED_KEYS
        ? `Au plus ${MAX_REQUIRED_KEYS} clés obligatoires.`
        : null
  }
}

const pass = (note: string): JudgeOutcome => ({ verdict: 'pass', score: null, note })
const fail = (note: string): JudgeOutcome => ({ verdict: 'fail', score: null, note })
const error = (note: string): JudgeOutcome => ({ verdict: 'error', score: null, note })

function evaluateContains(
  config: Extract<RuleJudgeConfig, { kind: 'contains' }>,
  subject: JudgeSubject
): JudgeOutcome {
  const needle = config.value ?? subject.expected
  if (needle === null || needle.trim().length === 0) {
    return error('Aucune réponse attendue dans cette ligne pour la règle « contient ».')
  }
  const found = config.caseSensitive
    ? subject.answer.includes(needle)
    : subject.answer.toLowerCase().includes(needle.toLowerCase())
  return found ? pass(`Contient « ${needle} ».`) : fail(`Ne contient pas « ${needle} ».`)
}

function evaluateRegex(
  config: Extract<RuleJudgeConfig, { kind: 'regex' }>,
  subject: JudgeSubject
): JudgeOutcome {
  const matcher = compileLinearRegex(config.pattern, { ignoreCase: !config.caseSensitive })
  if (!matcher) return error(REGEX_UNSUPPORTED)
  return matcher.test(subject.answer)
    ? pass('Le motif correspond.')
    : fail('Le motif ne correspond pas.')
}

/** A reply that wraps its JSON in a Markdown fence is still JSON. */
function stripFence(text: string): string {
  const fenced = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/i.exec(text)
  return (fenced ? fenced[1] : text).trim()
}

function evaluateJson(
  config: Extract<RuleJudgeConfig, { kind: 'json_valid' }>,
  subject: JudgeSubject
): JudgeOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripFence(subject.answer))
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'syntaxe invalide'
    return fail(`JSON invalide : ${detail}`)
  }
  if (config.requiredKeys.length === 0) return pass('JSON valide.')
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return fail('Le JSON n’est pas un objet : les clés obligatoires ne peuvent pas être vérifiées.')
  }
  const missing = config.requiredKeys.filter((key) => !(key in parsed))
  return missing.length === 0
    ? pass('JSON valide avec toutes les clés obligatoires.')
    : fail(`Clés manquantes : ${missing.join(', ')}.`)
}

/** Judges one answer with a rule: no model call, no randomness. */
export function evaluateRule(config: RuleJudgeConfig, subject: JudgeSubject): JudgeOutcome {
  switch (config.kind) {
    case 'contains':
      return evaluateContains(config, subject)
    case 'regex':
      return evaluateRegex(config, subject)
    case 'json_valid':
      return evaluateJson(config, subject)
  }
}
