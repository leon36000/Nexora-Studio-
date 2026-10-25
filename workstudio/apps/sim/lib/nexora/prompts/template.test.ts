import { describe, expect, it } from 'vitest'
import {
  extractVariableNames,
  PromptRenderError,
  type PromptVariable,
  reconcileVariables,
  renderPrompt,
} from '@/lib/nexora/prompts/template'

const text = (name: string, extra: Partial<PromptVariable> = {}): PromptVariable => ({
  name,
  type: 'text',
  ...extra,
})

describe('extractVariableNames', () => {
  it('lists each placeholder once, in order of appearance, spaces inside the braces allowed', () => {
    expect(
      extractVariableNames('Bonjour {{ client }}, ta facture {{numero}} ({{client}})')
    ).toEqual(['client', 'numero'])
  })

  it('ignores braces that do not hold a variable name', () => {
    expect(extractVariableNames('{{1abc}} {{ a-b }} {{}} {{ ok_2 }} {single}')).toEqual(['ok_2'])
  })
})

describe('reconcileVariables', () => {
  it('keeps the declaration of a variable still in the text, adds new ones as text, drops gone ones', () => {
    const declared: PromptVariable[] = [
      { name: 'montant', type: 'number', defaultValue: '10' },
      { name: 'ancienne', type: 'boolean' },
    ]
    expect(reconcileVariables('{{client}} doit {{montant}} €', declared)).toEqual([
      { name: 'client', type: 'text' },
      { name: 'montant', type: 'number', defaultValue: '10' },
    ])
  })
})

describe('renderPrompt', () => {
  it('returns a text without variables unchanged', () => {
    expect(renderPrompt('Réponds en français.', [], {})).toBe('Réponds en français.')
  })

  it('replaces every occurrence with the given value, else the default', () => {
    const variables = [text('client'), text('ton', { defaultValue: 'poli' })]
    expect(
      renderPrompt('{{client}}, ton {{ ton }} ; {{client}}', variables, { client: 'Durand' })
    ).toBe('Durand, ton poli ; Durand')
  })

  it('uses the default when the given value is blank', () => {
    expect(renderPrompt('{{ton}}', [text('ton', { defaultValue: 'poli' })], { ton: '  ' })).toBe(
      'poli'
    )
  })

  it('refuses a variable with neither value nor default, naming it in French', () => {
    const render = () => renderPrompt('Client : {{client}}', [text('client')], {})
    expect(render).toThrow(PromptRenderError)
    expect(render).toThrow(/« client »/)
  })

  it('accepts a decimal comma in a number and refuses what is not a number', () => {
    const variables: PromptVariable[] = [{ name: 'taux', type: 'number' }]
    expect(renderPrompt('{{taux}} %', variables, { taux: '1,5' })).toBe('1,5 %')
    expect(renderPrompt('{{taux}} %', variables, { taux: 2 })).toBe('2 %')
    expect(() => renderPrompt('{{taux}}', variables, { taux: 'beaucoup' })).toThrow(/nombre/)
  })

  it('writes a boolean as oui or non and refuses anything else', () => {
    const variables: PromptVariable[] = [{ name: 'vip', type: 'boolean' }]
    expect(renderPrompt('VIP : {{vip}}', variables, { vip: 'oui' })).toBe('VIP : oui')
    expect(renderPrompt('VIP : {{vip}}', variables, { vip: 'true' })).toBe('VIP : oui')
    expect(renderPrompt('VIP : {{vip}}', variables, { vip: '0' })).toBe('VIP : non')
    expect(renderPrompt('VIP : {{vip}}', variables, { vip: false })).toBe('VIP : non')
    expect(() => renderPrompt('{{vip}}', variables, { vip: 'peut-être' })).toThrow(/oui ou non/)
  })

  it('inserts a value holding braces as plain text, never resolving it again', () => {
    expect(renderPrompt('{{a}}', [text('a')], { a: '{{OPENAI_API_KEY}} {{b}}' })).toBe(
      '{{OPENAI_API_KEY}} {{b}}'
    )
  })

  it('treats a placeholder the declarations omit as a text variable', () => {
    expect(renderPrompt('{{client}}', [], { client: 'Martin' })).toBe('Martin')
    expect(() => renderPrompt('{{client}}', [], {})).toThrow(PromptRenderError)
  })

  it('reads an object value as JSON text', () => {
    expect(renderPrompt('{{data}}', [text('data')], { data: { a: 1 } })).toBe('{"a":1}')
  })
})
