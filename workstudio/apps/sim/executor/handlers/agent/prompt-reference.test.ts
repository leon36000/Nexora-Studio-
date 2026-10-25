import { describe, expect, it } from 'vitest'
import {
  applyResolvedPrompt,
  promptVariableInputPaths,
  readPromptReference,
  withPromptOutput,
} from '@/executor/handlers/agent/prompt-reference'
import type { AgentInputs } from '@/executor/handlers/agent/types'
import type { StreamingExecution } from '@/executor/types'

const resolved = {
  id: 'p1',
  name: 'Support',
  version: 2,
  label: 'production' as const,
  text: 'Réponds par CERISE.',
}

describe('readPromptReference', () => {
  it('reads nothing when the block uses its own instructions', () => {
    expect(readPromptReference({ promptId: '  ' })).toBeNull()
    expect(readPromptReference({})).toBeNull()
  })

  it('reads the prompt, its label and the variable table, production by default', () => {
    expect(
      readPromptReference({
        promptId: 'p1',
        promptVariables: [
          { id: 'r1', cells: { Key: 'client', Value: 'Martin' } },
          { id: 'r2', cells: { Key: '', Value: 'ignored' } },
        ],
      } as AgentInputs)
    ).toEqual({ promptId: 'p1', selector: 'production', values: { client: 'Martin' } })
    expect(readPromptReference({ promptId: 'p1', promptLabel: 'test' })?.selector).toBe('test')
    expect(readPromptReference({ promptId: 'p1', promptLabel: 'latest' })?.selector).toBe('latest')
    expect(readPromptReference({ promptId: 'p1', promptLabel: 'staging' })?.selector).toBe(
      'production'
    )
  })

  it('accepts the variables as an object', () => {
    expect(
      readPromptReference({ promptId: 'p1', promptVariables: { client: 'Durand' } } as AgentInputs)
        ?.values
    ).toEqual({ client: 'Durand' })
  })
})

describe('promptVariableInputPaths', () => {
  it('names the input path of every variable value, for the secret guard', () => {
    expect(
      promptVariableInputPaths({
        promptVariables: [
          { id: 'r1', cells: { Key: 'a', Value: '{{SECRET}}' } },
          { id: 'r2', cells: { Key: 'b', Value: 'x' } },
        ],
      } as AgentInputs)
    ).toEqual([
      ['promptVariables', '0', 'cells', 'Value'],
      ['promptVariables', '1', 'cells', 'Value'],
    ])
    expect(promptVariableInputPaths({ promptVariables: { a: 'x' } } as AgentInputs)).toEqual([
      ['promptVariables', 'a'],
    ])
  })
})

describe('applyResolvedPrompt', () => {
  it('replaces the first system message and keeps the others', () => {
    const inputs: AgentInputs = {
      messages: [
        { role: 'system', content: 'Ancien texte' },
        { role: 'user', content: '<start.input>' },
        { role: 'system', content: 'Second système' },
      ],
    }

    expect(applyResolvedPrompt(inputs, resolved).messages).toEqual([
      { role: 'system', content: 'Réponds par CERISE.' },
      { role: 'user', content: '<start.input>' },
      { role: 'system', content: 'Second système' },
    ])
    expect(inputs.messages?.[0].content).toBe('Ancien texte')
  })

  it('adds a system message first when the block has none', () => {
    expect(
      applyResolvedPrompt({ messages: [{ role: 'user', content: 'Bonjour' }] }, resolved).messages
    ).toEqual([
      { role: 'system', content: 'Réponds par CERISE.' },
      { role: 'user', content: 'Bonjour' },
    ])
    expect(applyResolvedPrompt({ systemPrompt: 'legacy' }, resolved).systemPrompt).toBe(
      'Réponds par CERISE.'
    )
  })
})

describe('withPromptOutput', () => {
  it('records the prompt version used in a plain output', () => {
    expect(withPromptOutput({ content: 'CERISE' }, resolved)).toEqual({
      content: 'CERISE',
      prompt: { id: 'p1', name: 'Support', version: 2, label: 'production' },
    })
  })

  it('records it in the output of a streamed execution', () => {
    const streamed = {
      stream: new ReadableStream(),
      execution: { success: true, output: { content: '' }, logs: [] },
    } as unknown as StreamingExecution

    const result = withPromptOutput(streamed, resolved) as StreamingExecution

    expect(result.execution.output).toMatchObject({
      prompt: { id: 'p1', name: 'Support', version: 2, label: 'production' },
    })
  })
})
