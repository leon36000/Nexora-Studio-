import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Shared parsing/validation for a custom tool's OpenAI function-calling JSON
 * schema. Used by both custom-tool editing surfaces (the canvas modal and the
 * Settings > Custom Tools detail page) so they agree on what a valid schema is.
 */

export interface SchemaParameter {
  name: string
  type: string
  description: string
  required: boolean
}

type SchemaErrorCode =
  | 'missingType'
  | 'missingFunctionName'
  | 'missingParameters'
  | 'missingParametersType'
  | 'missingProperties'
  | 'propertiesNotObject'
  | 'invalidJson'

interface SchemaValidation {
  isValid: boolean
  error: string | null
  /** Message key under `shell.customTool.schemaErrors`; see {@link useCustomToolCopy}. */
  errorCode: SchemaErrorCode | null
}

function invalid(errorCode: SchemaErrorCode, error: string): SchemaValidation {
  return { isValid: false, error, errorCode }
}

export const SCHEMA_PLACEHOLDER = `{
  "type": "function",
  "function": {
    "name": "addItemToOrder",
    "description": "Add one quantity of a food item to the order.",
    "parameters": {
      "type": "object",
      "properties": {
        "itemName": {
          "type": "string",
          "description": "The name of the food item to add to order"
        }
      },
      "required": ["itemName"]
    }
  }
}`

export const CODE_PLACEHOLDER = 'return schemaVariable + {{environmentVariable}}'

/** Shown when the server rejects a rename — `function.name` is immutable after creation. */
export const FUNCTION_NAME_LOCKED =
  'Function name cannot be changed after creation. To use a different name, delete this tool and create a new one.'

/** Delete-confirmation copy, shared by both editing surfaces. */
export const CUSTOM_TOOL_DELETE_CONFIRM_TEXT = [
  {
    text: 'This will permanently delete the tool and remove it from any workflows that are using it.',
    error: true,
  },
  ' This action cannot be undone.',
] as const

/** Validates the shape the executor and providers expect. */
export function validateCustomToolSchema(schema: string): SchemaValidation {
  if (!schema) return { isValid: false, error: null, errorCode: null }

  try {
    const parsed = JSON.parse(schema)

    if (!parsed.type || parsed.type !== 'function') {
      return invalid('missingType', 'Missing "type": "function"')
    }
    if (!parsed.function || !parsed.function.name) {
      return invalid('missingFunctionName', 'Missing function.name field')
    }
    if (!parsed.function.parameters) {
      return invalid('missingParameters', 'Missing function.parameters object')
    }
    if (!parsed.function.parameters.type) {
      return invalid('missingParametersType', 'Missing parameters.type field')
    }
    if (parsed.function.parameters.properties === undefined) {
      return invalid('missingProperties', 'Missing parameters.properties field')
    }
    if (
      typeof parsed.function.parameters.properties !== 'object' ||
      parsed.function.parameters.properties === null
    ) {
      return invalid('propertiesNotObject', 'parameters.properties must be an object')
    }

    return { isValid: true, error: null, errorCode: null }
  } catch {
    return invalid('invalidJson', 'Invalid JSON format')
  }
}

/**
 * The tool's identity as declared inside its schema. Name and description have
 * no separate storage — `schema.function.name` IS the tool's title (the save
 * path derives it), so surfaces read them back out rather than offering a second
 * place to edit them.
 */
export function extractSchemaIdentity(jsonSchema: string): {
  name: string | null
  description: string | null
} {
  try {
    const fn = JSON.parse(jsonSchema)?.function
    return {
      name: typeof fn?.name === 'string' && fn.name ? fn.name : null,
      description: typeof fn?.description === 'string' && fn.description ? fn.description : null,
    }
  } catch {
    return { name: null, description: null }
  }
}

/** Flattens a schema's properties into the parameter list the code editor autocompletes against. */
export function extractSchemaParameters(jsonSchema: string): SchemaParameter[] {
  try {
    if (!jsonSchema) return []
    const parsed = JSON.parse(jsonSchema)
    const properties = parsed?.function?.parameters?.properties
    if (!properties) return []

    const required = new Set<string>(parsed?.function?.parameters?.required ?? [])
    return Object.keys(properties).map((key) => ({
      name: key,
      type: properties[key].type || 'any',
      description: properties[key].description || '',
      required: required.has(key),
    }))
  } catch {
    return []
  }
}

/**
 * Translated custom-tool copy for client components: the immutable-name notice, the
 * delete confirmation, and the message for a {@link validateCustomToolSchema} result.
 */
export function useCustomToolCopy() {
  const t = useTranslations('shell.customTool')
  return useMemo(
    () => ({
      functionNameLocked: t('functionNameLocked'),
      deleteConfirmText: [{ text: t('deleteWarning'), error: true }, ` ${t('irreversible')}`],
      schemaError: (validation: SchemaValidation): string | null =>
        validation.errorCode ? t(`schemaErrors.${validation.errorCode}`) : null,
    }),
    [t]
  )
}
