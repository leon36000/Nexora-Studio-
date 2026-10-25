import { describe, expect, it } from 'vitest'
import { diffPromptContent } from '@/lib/nexora/prompts/diff'

describe('diffPromptContent', () => {
  it('marks each line as kept, removed or added, in reading order', () => {
    expect(
      diffPromptContent(
        'Tu es poli.\nRéponds en une phrase.\nSigne Nexora.',
        'Tu es poli.\nRéponds en deux phrases.\nSigne Nexora.'
      )
    ).toEqual([
      { kind: 'same', text: 'Tu es poli.' },
      { kind: 'removed', text: 'Réponds en une phrase.' },
      { kind: 'added', text: 'Réponds en deux phrases.' },
      { kind: 'same', text: 'Signe Nexora.' },
    ])
  })

  it('compares a last line without a line break like any other line', () => {
    expect(diffPromptContent('a\nb', 'a\nb\n')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'same', text: 'b' },
    ])
  })

  it('reports an empty text as no line', () => {
    expect(diffPromptContent('', 'Bonjour')).toEqual([{ kind: 'added', text: 'Bonjour' }])
  })
})
