import { describe, expect, it } from 'vitest'
import { formFieldsFromState } from '@/lib/nexora/assistant/workflows/fields'

function startState(inputFormat: unknown, type = 'start_trigger') {
  return {
    blocks: {
      'agent-1': { type: 'agent', subBlocks: {} },
      'start-1': { type, subBlocks: { inputFormat: { id: 'inputFormat', value: inputFormat } } },
    },
    edges: [],
  }
}

describe('formFieldsFromState', () => {
  it('turns the Start block’s fields into form fields, in their order', () => {
    const { fields, needsFiles } = formFieldsFromState(
      startState([
        {
          name: 'client',
          type: 'string',
          description: 'Nom et coordonnées du client',
          value: 'Boulangerie Martin',
        },
        { name: 'quantite', type: 'number', description: '', value: '' },
        { name: 'urgent', type: 'boolean', description: 'Urgent ?', required: true },
      ])
    )
    expect(fields).toEqual([
      {
        name: 'client',
        label: 'Nom et coordonnées du client',
        type: 'string',
        required: false,
        example: 'Boulangerie Martin',
      },
      { name: 'quantite', label: 'quantite', type: 'number', required: false, example: '' },
      { name: 'urgent', label: 'Urgent ?', type: 'boolean', required: true, example: '' },
    ])
    expect(needsFiles).toBe(false)
  })

  it('reads objects and arrays as JSON text', () => {
    const { fields } = formFieldsFromState(
      startState([
        { name: 'lignes', type: 'array' },
        { name: 'options', type: 'object' },
      ])
    )
    expect(fields.map((field) => field.type)).toEqual(['json', 'json'])
  })

  it('flags a workflow that asks for files, which the form cannot send', () => {
    const { fields, needsFiles } = formFieldsFromState(
      startState([
        { name: 'facture', type: 'file[]' },
        { name: 'client', type: 'string' },
      ])
    )
    expect(needsFiles).toBe(true)
    expect(fields.map((field) => field.name)).toEqual(['client'])
  })

  it('ignores fields without a name and a workflow without a Start block or fields', () => {
    expect(
      formFieldsFromState(startState([{ type: 'string' }, { name: '  ', type: 'string' }])).fields
    ).toEqual([])
    expect(formFieldsFromState({ blocks: { a: { type: 'agent', subBlocks: {} } } }).fields).toEqual(
      []
    )
    expect(formFieldsFromState(null).fields).toEqual([])
    expect(formFieldsFromState(startState('not a list')).fields).toEqual([])
  })

  it('also reads the legacy starter block', () => {
    const { fields } = formFieldsFromState(startState([{ name: 'q', type: 'string' }], 'starter'))
    expect(fields.map((field) => field.name)).toEqual(['q'])
  })
})
