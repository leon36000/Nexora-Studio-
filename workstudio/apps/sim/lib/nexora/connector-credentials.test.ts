/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  type ConnectorCredentialField,
  credentialFieldLabel,
  credentialFieldPlaceholder,
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

describe('credential field labels', () => {
  const t = {
    has: (key: string) => key === 'detail.form.fieldLabels.apikey',
    raw: (key: string) => (key === 'detail.form.fieldLabels.apikey' ? 'Clé d’API' : key),
  }

  it('shows the French label of a field Connect names in English, whatever its spelling', () => {
    expect(credentialFieldLabel('API Key', t)).toBe('Clé d’API')
    expect(credentialFieldLabel('api_key', t)).toBe('Clé d’API')
  })

  it('keeps a label it has no translation for', () => {
    expect(credentialFieldLabel('Skio', t)).toBe('Skio')
  })

  it('shows a placeholder only when it is a sample value, not English instructions', () => {
    expect(credentialFieldPlaceholder('sk_live_...')).toBe('sk_live_...')
    expect(credentialFieldPlaceholder('https://example.zendesk.com')).toBe(
      'https://example.zendesk.com'
    )
    expect(credentialFieldPlaceholder('Enter your API key')).toBeUndefined()
  })
})
