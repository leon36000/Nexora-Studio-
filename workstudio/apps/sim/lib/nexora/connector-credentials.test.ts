/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  type ConnectorCredentialField,
  readCredentialValues,
} from '@/lib/nexora/connector-credentials'

function field(
  key: string,
  overrides: Partial<ConnectorCredentialField> = {}
): ConnectorCredentialField {
  return { key, label: key, inputType: 'text', required: true, secret: false, ...overrides }
}

describe('readCredentialValues', () => {
  it('flags a required field left empty or holding only spaces', () => {
    const result = readCredentialValues([field('apiKey'), field('domain')], {
      apiKey: '   ',
    })
    expect(result.errors).toEqual({ apiKey: 'required', domain: 'required' })
  })

  it('trims pasted values and leaves empty optional fields out', () => {
    const result = readCredentialValues(
      [field('apiKey', { secret: true }), field('region', { required: false })],
      { apiKey: '  sk-123\n', region: '' }
    )
    expect(result).toEqual({ values: { apiKey: 'sk-123' }, errors: {} })
  })

  it('refuses a JSON field that does not parse, and keeps one that does', () => {
    const fields = [field('serviceAccount', { inputType: 'json' })]
    expect(readCredentialValues(fields, { serviceAccount: '{"type": ' }).errors).toEqual({
      serviceAccount: 'json',
    })
    expect(readCredentialValues(fields, { serviceAccount: ' {"type":"x"} ' })).toEqual({
      values: { serviceAccount: '{"type":"x"}' },
      errors: {},
    })
  })

  it('checks an optional JSON field only when it is filled', () => {
    const fields = [field('extra', { inputType: 'json', required: false })]
    expect(readCredentialValues(fields, { extra: 'nope' }).errors).toEqual({ extra: 'json' })
    expect(readCredentialValues(fields, {})).toEqual({ values: {}, errors: {} })
  })

  it('sends only the fields the service asks for', () => {
    const result = readCredentialValues([field('apiKey')], {
      apiKey: 'k',
      __proto__: 'x',
      injected: 'y',
    })
    expect(result.values).toEqual({ apiKey: 'k' })
  })
})
