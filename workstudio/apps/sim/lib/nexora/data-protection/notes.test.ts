import { beforeEach, describe, expect, it } from 'vitest'
import {
  noteExecutionProtection,
  resetExecutionProtection,
  takeExecutionProtection,
} from '@/lib/nexora/data-protection/notes'

describe('execution protection notes', () => {
  beforeEach(() => resetExecutionProtection())

  it('hands over what was done for an execution, once', () => {
    noteExecutionProtection('exec-1', {
      mode: 'mask',
      model: 'vllm/cloud-glm-5-3',
      found: { IBAN_CODE: 1 },
      masked: 1,
    })
    expect(takeExecutionProtection('exec-1')).toEqual([
      { mode: 'mask', model: 'vllm/cloud-glm-5-3', found: { IBAN_CODE: 1 }, masked: 1 },
    ])
    expect(takeExecutionProtection('exec-1')).toEqual([])
  })

  it('does not count again what every turn of an agent resends: the largest count per type wins', () => {
    const base = { mode: 'mask' as const, model: 'vllm/cloud-glm-5-3' }
    noteExecutionProtection('exec-1', { ...base, found: { IBAN_CODE: 1 }, masked: 1 })
    noteExecutionProtection('exec-1', {
      ...base,
      found: { IBAN_CODE: 1, EMAIL_ADDRESS: 1 },
      masked: 2,
    })
    noteExecutionProtection('exec-1', {
      ...base,
      found: { IBAN_CODE: 1, EMAIL_ADDRESS: 1 },
      masked: 2,
    })
    expect(takeExecutionProtection('exec-1')).toEqual([
      { ...base, found: { IBAN_CODE: 1, EMAIL_ADDRESS: 1 }, masked: 2 },
    ])
  })

  it('keeps one note per model', () => {
    noteExecutionProtection('exec-1', { mode: 'mask', model: 'a', found: { PERSON: 1 }, masked: 1 })
    noteExecutionProtection('exec-1', { mode: 'mask', model: 'b', found: { PERSON: 2 }, masked: 2 })
    expect(takeExecutionProtection('exec-1').map((note) => note.model)).toEqual(['a', 'b'])
  })

  it('keeps the executions apart and forgets an unknown one', () => {
    noteExecutionProtection('exec-1', { mode: 'mask', model: 'a', found: { PERSON: 1 }, masked: 1 })
    expect(takeExecutionProtection('exec-2')).toEqual([])
    expect(takeExecutionProtection('exec-1')).toHaveLength(1)
  })
})
