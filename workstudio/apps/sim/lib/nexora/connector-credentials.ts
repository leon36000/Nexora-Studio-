/** One field of a Nexora Connect API-key or custom-credential setup. */
export interface ConnectorCredentialField {
  key: string
  label: string
  inputType: string
  required: boolean
  secret: boolean
  placeholder?: string
  description?: string
}

/** Why a credential field cannot be sent. */
export type CredentialFieldError = 'required' | 'json'

/**
 * The values to send for a credential form: only the service's fields, trimmed (pasted keys
 * often carry a newline), empty optional ones left out. A required field left empty, or a JSON
 * field that does not parse, is reported instead.
 */
export function readCredentialValues(
  fields: readonly ConnectorCredentialField[],
  input: Readonly<Record<string, string>>
): { values: Record<string, string>; errors: Record<string, CredentialFieldError> } {
  const values: Record<string, string> = {}
  const errors: Record<string, CredentialFieldError> = {}
  for (const field of fields) {
    const value = Object.hasOwn(input, field.key) ? (input[field.key] ?? '').trim() : ''
    if (!value) {
      if (field.required) errors[field.key] = 'required'
      continue
    }
    if (field.inputType === 'json' && !parsesAsJson(value)) {
      errors[field.key] = 'json'
      continue
    }
    values[field.key] = value
  }
  return { values, errors }
}

function parsesAsJson(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
