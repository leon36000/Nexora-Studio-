/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { evaluateRule, validateRuleConfig } from '@/lib/nexora/evaluations/rules'
import type { RuleJudgeConfig } from '@/lib/nexora/evaluations/types'

const subject = (answer: string, expected: string | null = null) => ({
  input: 'Quelle est la question ?',
  answer,
  expected,
  guidance: null,
})

describe('règle « contient »', () => {
  it('cherche le texte sans tenir compte de la casse par défaut', () => {
    const config = { kind: 'contains', value: '49 €', caseSensitive: false } as const
    expect(evaluateRule(config, subject('Le forfait coûte 49 € par mois.')).verdict).toBe('pass')
    expect(evaluateRule(config, subject('Le forfait coûte 59 € par mois.')).verdict).toBe('fail')
  })

  it('respecte la casse quand on la demande', () => {
    const config = { kind: 'contains', value: 'Pro', caseSensitive: true } as const
    expect(evaluateRule(config, subject('formule pro')).verdict).toBe('fail')
    expect(evaluateRule(config, subject('formule Pro')).verdict).toBe('pass')
  })

  it('cherche la réponse attendue de la ligne quand aucune valeur n’est fixée', () => {
    const config = { kind: 'contains', value: null, caseSensitive: false } as const
    expect(evaluateRule(config, subject('c’est 12 jours', '12 jours')).verdict).toBe('pass')
    expect(evaluateRule(config, subject('c’est 15 jours', '12 jours')).verdict).toBe('fail')
  })

  it('ne devine pas : sans valeur ni réponse attendue, c’est une erreur du juge', () => {
    const config = { kind: 'contains', value: null, caseSensitive: false } as const
    const outcome = evaluateRule(config, subject('quelque chose', null))
    expect(outcome.verdict).toBe('error')
    expect(outcome.note).toMatch(/réponse attendue/)
  })
})

describe('règle « expression régulière »', () => {
  it('reconnaît un motif', () => {
    const config = { kind: 'regex', pattern: '\\d+ ?€', caseSensitive: false } as const
    expect(evaluateRule(config, subject('Compte 120 € par an')).verdict).toBe('pass')
    expect(evaluateRule(config, subject('Gratuit')).verdict).toBe('fail')
  })

  it('traite un motif catastrophique en temps linéaire', () => {
    const config = { kind: 'regex', pattern: '(a+)+b', caseSensitive: true } as const
    const started = Date.now()
    const outcome = evaluateRule(config, subject('a'.repeat(30_000)))
    expect(outcome.verdict).toBe('fail')
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('refuse un motif que le moteur linéaire ne sait pas lire', () => {
    expect(
      validateRuleConfig({ kind: 'regex', pattern: '(?<=prix )\\d+', caseSensitive: false })
    ).toMatch(/assertions|références/)
    const outcome = evaluateRule(
      { kind: 'regex', pattern: '(?<=prix )\\d+', caseSensitive: false },
      subject('prix 12')
    )
    expect(outcome.verdict).toBe('error')
  })
})

describe('règle « JSON valide »', () => {
  const plain: RuleJudgeConfig = { kind: 'json_valid', requiredKeys: [] }

  it('accepte un objet, un tableau et un JSON entouré d’une clôture', () => {
    expect(evaluateRule(plain, subject('{"a": 1}')).verdict).toBe('pass')
    expect(evaluateRule(plain, subject('[1, 2]')).verdict).toBe('pass')
    expect(evaluateRule(plain, subject('```json\n{"a": 1}\n```')).verdict).toBe('pass')
  })

  it('refuse un JSON invalide en disant pourquoi', () => {
    const outcome = evaluateRule(plain, subject('{"a": 1,}'))
    expect(outcome.verdict).toBe('fail')
    expect(outcome.note).toMatch(/JSON/)
  })

  it('exige les clés demandées sur un objet', () => {
    const config: RuleJudgeConfig = { kind: 'json_valid', requiredKeys: ['prix', 'devise'] }
    expect(evaluateRule(config, subject('{"prix": 3, "devise": "EUR"}')).verdict).toBe('pass')
    const missing = evaluateRule(config, subject('{"prix": 3}'))
    expect(missing.verdict).toBe('fail')
    expect(missing.note).toContain('devise')
    expect(evaluateRule(config, subject('[1]')).verdict).toBe('fail')
  })
})

describe('validation des réglages d’une règle', () => {
  it('accepte des réglages corrects', () => {
    expect(validateRuleConfig({ kind: 'contains', value: 'x', caseSensitive: false })).toBeNull()
    expect(validateRuleConfig({ kind: 'json_valid', requiredKeys: ['a'] })).toBeNull()
  })

  it('refuse un motif vide ou trop long', () => {
    expect(validateRuleConfig({ kind: 'regex', pattern: '', caseSensitive: false })).not.toBeNull()
    expect(
      validateRuleConfig({ kind: 'regex', pattern: 'a'.repeat(501), caseSensitive: false })
    ).not.toBeNull()
  })

  it('refuse un texte à chercher vide', () => {
    expect(
      validateRuleConfig({ kind: 'contains', value: '  ', caseSensitive: false })
    ).not.toBeNull()
  })
})
