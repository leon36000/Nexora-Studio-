/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  buildTranscriptionPrompt,
  MAX_LEXICON_CHARACTERS,
  MAX_LEXICON_TERMS,
  normalizeLexicon,
} from '@/lib/nexora/voice/lexicon'

describe('normalizeLexicon', () => {
  it('trims, collapses spaces and drops empty and repeated terms (any case)', () => {
    expect(
      normalizeLexicon(['  Nexora ', 'Boulangerie   Martin', '', 'nexora', 'Garage Durand', '   '])
    ).toEqual(['Nexora', 'Boulangerie Martin', 'Garage Durand'])
  })

  it('ignores what is not a list of strings', () => {
    expect(normalizeLexicon('Nexora')).toEqual([])
    expect(normalizeLexicon(null)).toEqual([])
    expect(normalizeLexicon(['Nexora', 3, null, { a: 1 }])).toEqual(['Nexora'])
  })

  it('keeps at most 100 terms', () => {
    const terms = Array.from({ length: 150 }, (_, index) => `t${index}`)
    expect(normalizeLexicon(terms)).toHaveLength(MAX_LEXICON_TERMS)
  })

  it('keeps the terms that fit in 800 characters and drops the rest, never cutting a term', () => {
    const terms = Array.from({ length: 60 }, (_, index) => `${'x'.repeat(18)}${index}`)
    const kept = normalizeLexicon(terms)
    expect(kept.join(', ').length).toBeLessThanOrEqual(MAX_LEXICON_CHARACTERS)
    expect(kept.every((term) => terms.includes(term))).toBe(true)
    expect(kept.length).toBeLessThan(terms.length)
  })

  it('cuts a single absurdly long term instead of keeping the whole of it', () => {
    const [term] = normalizeLexicon(['y'.repeat(2000)])
    expect(term.length).toBeLessThanOrEqual(MAX_LEXICON_CHARACTERS)
  })
})

describe('buildTranscriptionPrompt', () => {
  it('writes the lexicon as a sentence Whisper can use as context', () => {
    expect(buildTranscriptionPrompt(['Nexora', 'Boulangerie Martin'])).toBe(
      'Vocabulaire : Nexora, Boulangerie Martin.'
    )
  })

  it('puts the lexicon before the prompt of the block, which is kept whole', () => {
    expect(buildTranscriptionPrompt(['Nexora'], 'Réunion de lancement.')).toBe(
      'Vocabulaire : Nexora. Réunion de lancement.'
    )
  })

  it('is the prompt alone without a lexicon, and nothing at all without either', () => {
    expect(buildTranscriptionPrompt([], '  Réunion. ')).toBe('Réunion.')
    expect(buildTranscriptionPrompt([], undefined)).toBeUndefined()
    expect(buildTranscriptionPrompt([], '   ')).toBeUndefined()
  })
})
