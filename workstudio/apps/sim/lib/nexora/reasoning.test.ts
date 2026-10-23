import { describe, expect, it } from 'vitest'
import {
  createThinkTagSplitter,
  isReasoningEffortRejection,
  type ReasoningPiece,
  readDeltaReasoning,
  readMessageReasoning,
  splitInlineThinking,
} from '@/lib/nexora/reasoning'

function streamThrough(chunks: string[]) {
  const splitter = createThinkTagSplitter()
  const pieces: ReasoningPiece[] = [...chunks.flatMap((chunk) => splitter.push(chunk))]
  pieces.push(...splitter.flush())
  return {
    reasoning: pieces
      .filter((p) => p.kind === 'reasoning')
      .map((p) => p.text)
      .join(''),
    content: pieces
      .filter((p) => p.kind === 'content')
      .map((p) => p.text)
      .join(''),
  }
}

describe('splitInlineThinking', () => {
  it('separates a leading think block from the answer', () => {
    expect(splitInlineThinking('<think>Je réfléchis.</think>\n\nBonjour !')).toEqual({
      reasoning: 'Je réfléchis.',
      content: 'Bonjour !',
    })
  })

  it('tolerates whitespace before the opening tag', () => {
    expect(splitInlineThinking('\n  <think>plan</think>Réponse')).toEqual({
      reasoning: 'plan',
      content: 'Réponse',
    })
  })

  it('treats an unclosed think block as reasoning only (output cut by max_tokens)', () => {
    expect(splitInlineThinking('<think>Je commence à réfléchir et')).toEqual({
      reasoning: 'Je commence à réfléchir et',
      content: '',
    })
  })

  it('leaves the word think and a mid-answer tag alone', () => {
    expect(splitInlineThinking('I think so.')).toEqual({ reasoning: '', content: 'I think so.' })
    const text = 'Utilisez la balise <think>…</think> pour réfléchir.'
    expect(splitInlineThinking(text)).toEqual({ reasoning: '', content: text })
  })
})

describe('readMessageReasoning', () => {
  it('reads reasoning_content beside the answer', () => {
    expect(
      readMessageReasoning({ content: '{"ok":true}', reasoning_content: 'Je vérifie.' })
    ).toEqual({ content: '{"ok":true}', reasoning: 'Je vérifie.' })
  })

  it('reads a reasoning string or a reasoning object', () => {
    expect(readMessageReasoning({ content: 'A', reasoning: 'r1' })).toEqual({
      content: 'A',
      reasoning: 'r1',
    })
    expect(readMessageReasoning({ content: 'B', reasoning: { text: 'r2' } })).toEqual({
      content: 'B',
      reasoning: 'r2',
    })
  })

  it('reads inline think tags in the content', () => {
    expect(readMessageReasoning({ content: '<think>r3</think>C' })).toEqual({
      content: 'C',
      reasoning: 'r3',
    })
  })

  it('reports an empty answer when the model only reasoned', () => {
    expect(readMessageReasoning({ content: null, reasoning_content: 'longue réflexion' })).toEqual({
      content: '',
      reasoning: 'longue réflexion',
    })
  })

  it('tolerates anything that is not a message', () => {
    expect(readMessageReasoning(undefined)).toEqual({ content: '', reasoning: '' })
    expect(readMessageReasoning({ content: 42 })).toEqual({ content: '', reasoning: '' })
  })
})

describe('readDeltaReasoning', () => {
  it('reads each reasoning field of a stream delta, without duplicating them', () => {
    expect(readDeltaReasoning({ reasoning_content: 'a', reasoning: 'a', content: '' })).toBe('a')
    expect(readDeltaReasoning({ reasoning: 'b' })).toBe('b')
    expect(readDeltaReasoning({ reasoning: { text: 'c' } })).toBe('c')
    expect(readDeltaReasoning({ content: 'réponse' })).toBe('')
    expect(readDeltaReasoning(null)).toBe('')
  })
})

describe('createThinkTagSplitter', () => {
  it('splits a think block streamed in pieces', () => {
    expect(streamThrough(['<think>', 'je pense', '</think>', 'Bonjour'])).toEqual({
      reasoning: 'je pense',
      content: 'Bonjour',
    })
  })

  it('never leaks a tag cut across chunks', () => {
    expect(streamThrough(['<thi', 'nk>ré', 'flexion</th', 'ink>Répon', 'se'])).toEqual({
      reasoning: 'réflexion',
      content: 'Réponse',
    })
    expect(streamThrough(['<', 't', 'h', 'i', 'n', 'k', '>x<', '/', 'think', '>y'])).toEqual({
      reasoning: 'x',
      content: 'y',
    })
  })

  it('streams an answer without tags as it comes', () => {
    const splitter = createThinkTagSplitter()
    expect(splitter.push('Bon')).toEqual([{ kind: 'content', text: 'Bon' }])
    expect(splitter.push('jour')).toEqual([{ kind: 'content', text: 'jour' }])
    expect(splitter.flush()).toEqual([])
  })

  it('gives back a lone < that turned out not to open a tag', () => {
    expect(streamThrough(['<', 'b>gras'])).toEqual({ reasoning: '', content: '<b>gras' })
    expect(streamThrough(['<th'])).toEqual({ reasoning: '', content: '<th' })
  })

  it('keeps an unclosed think block as reasoning', () => {
    expect(streamThrough(['<think>coupé en plein', ' milieu</thi'])).toEqual({
      reasoning: 'coupé en plein milieu</thi',
      content: '',
    })
  })

  it('does not treat a mid-answer tag as reasoning', () => {
    expect(streamThrough(['Voici ', '<think>x</think>'])).toEqual({
      reasoning: '',
      content: 'Voici <think>x</think>',
    })
  })
})

describe('isReasoningEffortRejection', () => {
  it('recognizes a refusal of reasoning_effort only', () => {
    expect(
      isReasoningEffortRejection(
        400,
        "litellm.UnsupportedParamsError: openrouter does not support parameters: ['reasoning_effort']"
      )
    ).toBe(true)
    expect(isReasoningEffortRejection(400, 'max_tokens is too large')).toBe(false)
    expect(isReasoningEffortRejection(500, 'reasoning_effort')).toBe(false)
  })
})
