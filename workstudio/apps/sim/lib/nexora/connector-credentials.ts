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

/** The part of a `connectors` translator the field labels need. */
interface FieldLabelTranslator {
  has(key: string): boolean
  raw(key: string): unknown
}

/**
 * The label to show for a field of a Connect setup. Connect writes labels in English, so the
 * common ones (`API Key`, `Client ID`, `Subdomain`…) have a French message under
 * `detail.form.fieldLabels.<letters and digits of the label>`; any other label is shown as is.
 */
export function credentialFieldLabel(label: string, t: FieldLabelTranslator): string {
  const key = `detail.form.fieldLabels.${label.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  const translated = t.has(key) ? t.raw(key) : undefined
  return typeof translated === 'string' ? translated : label
}

/** A placeholder worth showing: a sample value (`sk_live_…`, a URL), never English instructions. */
export function credentialFieldPlaceholder(placeholder: string | undefined): string | undefined {
  return placeholder && !/\s/.test(placeholder.trim()) ? placeholder : undefined
}
