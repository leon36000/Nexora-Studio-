/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { chunkForSpeech, speechText } from '@/lib/nexora/voice/speech-text'

describe('speechText', () => {
  it('reads titles, emphasis and lists as plain sentences', () => {
    const markdown = '## Résumé\n\nLe budget est **validé** à *12 000 euros*.\n\n- Paul appelle\n- Anne prépare'
    expect(speechText(markdown)).toBe('Résumé.\n\nLe budget est validé à 12 000 euros.\n\nPaul appelle.\nAnne prépare.')
  })

  it('keeps the words of a link and drops its address, and says nothing of an image', () => {
    expect(speechText('Voir [le guide](https://exemple.fr/guide) et ![logo](https://exemple.fr/l.png) ici.')).toBe(
      'Voir le guide et ici.'
    )
  })

  it('does not read code blocks aloud, but keeps inline code words', () => {
    expect(speechText('Lancez `nexora update` :\n\n```bash\nnexora update\n```\n\nPuis attendez.')).toBe(
      'Lancez nexora update :\n\nPuis attendez.'
    )
  })

  it('reads a table row by row, cells separated by commas', () => {
    expect(speechText('| Action | Responsable |\n|---|---|\n| Devis | Paul |')).toBe(
      'Action, Responsable.\nDevis, Paul.'
    )
  })

  it('is empty for a message with nothing to say', () => {
    expect(speechText('```\ncode\n```\n\n---')).toBe('')
    expect(speechText('   ')).toBe('')
  })
})

describe('chunkForSpeech', () => {
  it('keeps a short text whole', () => {
    expect(chunkForSpeech('Bonjour à tous.')).toEqual(['Bonjour à tous.'])
  })

  it('cuts a long text at sentence ends so each piece fits, losing no word', () => {
    const sentence = 'Ceci est une phrase assez longue pour remplir le morceau. '
    const text = sentence.repeat(60).trim()
    const chunks = chunkForSpeech(text, 500)
    expect(chunks.length).toBeGreaterThan(5)
    expect(chunks.every((chunk) => chunk.length <= 500)).toBe(true)
    expect(chunks.every((chunk) => chunk.endsWith('.'))).toBe(true)
    expect(chunks.join(' ')).toBe(text)
  })

  it('cuts a sentence longer than the limit at a space rather than in a word', () => {
    const text = Array.from({ length: 200 }, () => 'mot').join(' ')
    const chunks = chunkForSpeech(text, 100)
    expect(chunks.every((chunk) => chunk.length <= 100 && !chunk.startsWith(' '))).toBe(true)
    expect(chunks.join(' ')).toBe(text)
  })

  it('gives nothing for an empty text', () => {
    expect(chunkForSpeech('  ')).toEqual([])
  })
})
