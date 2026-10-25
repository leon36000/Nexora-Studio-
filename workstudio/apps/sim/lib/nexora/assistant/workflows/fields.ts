import { isRecordLike, toRecord } from '@sim/utils/object'

export interface AssistantFormField {
  /** The Start field's name: the key the workflow reads (`<start.name>`). */
  name: string
  /** What the person sees: the field's description, else its name. */
  label: string
  /** `json` is an object or an array, typed as JSON text. */
  type: 'string' | 'number' | 'boolean' | 'json'
  required: boolean
  /** The value the workflow author left in the field, as an example. */
  example: string
}

const START_BLOCK_TYPES = new Set(['start_trigger', 'starter'])

function fieldType(declared: unknown): AssistantFormField['type'] | 'file' {
  if (declared === 'number') return 'number'
  if (declared === 'boolean') return 'boolean'
  if (declared === 'object' || declared === 'array') return 'json'
  if (typeof declared === 'string' && declared.startsWith('file')) return 'file'
  return 'string'
}

/**
 * The form of a workflow published in the Assistant: the fields its Start block declares, in
 * order. A workflow that asks for files cannot be launched from the form (`needsFiles`), the
 * files themselves being left out of `fields`.
 */
export function formFieldsFromState(state: unknown): {
  fields: AssistantFormField[]
  needsFiles: boolean
} {
  const blocks = Object.values(toRecord(toRecord(state).blocks))
  const start = blocks.find((block) => START_BLOCK_TYPES.has(String(toRecord(block).type)))
  const declared = toRecord(toRecord(toRecord(toRecord(start).subBlocks).inputFormat)).value
  const fields: AssistantFormField[] = []
  let needsFiles = false
  if (!Array.isArray(declared)) return { fields, needsFiles }
  for (const entry of declared) {
    if (!isRecordLike(entry)) continue
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    if (!name) continue
    const type = fieldType(entry.type)
    if (type === 'file') {
      needsFiles = true
      continue
    }
    const description = typeof entry.description === 'string' ? entry.description.trim() : ''
    fields.push({
      name,
      label: description || name,
      type,
      required: entry.required === true,
      example: typeof entry.value === 'string' ? entry.value : '',
    })
  }
  return { fields, needsFiles }
}
