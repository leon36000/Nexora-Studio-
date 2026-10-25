/**
 * Nexora edition: the `{{variables}}` of a stored prompt. Rendering is plain substitution: a
 * prompt's text never goes through the environment-variable resolution blocks apply to their
 * own fields, so a prompt cannot pull a workspace secret into a model request.
 */

/** Labels a version can carry. The first version gets both; later ones are promoted by hand. */
export const PROMPT_LABELS = ['production', 'test'] as const
export type PromptLabel = (typeof PROMPT_LABELS)[number]

/** What an agent asks for: a label, or the latest version. */
export const PROMPT_SELECTORS = [...PROMPT_LABELS, 'latest'] as const
export type PromptSelector = (typeof PROMPT_SELECTORS)[number]

export const PROMPT_VARIABLE_TYPES = ['text', 'number', 'boolean'] as const
type PromptVariableType = (typeof PROMPT_VARIABLE_TYPES)[number]

export interface PromptVariable {
  name: string
  type: PromptVariableType
  description?: string
  defaultValue?: string
}

/** A refusal to render, in French: shown in the run's error and the agent's test panel. */
export class PromptRenderError extends Error {
  constructor(
    message: string,
    readonly variable: string
  ) {
    super(message)
    this.name = 'PromptRenderError'
  }
}

const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g
const TRUE_WORDS = new Set(['true', 'oui', '1', 'vrai', 'yes'])
const FALSE_WORDS = new Set(['false', 'non', '0', 'faux', 'no'])

/** The variables a text uses, each once, in order of appearance. */
export function extractVariableNames(content: string): string[] {
  const names = new Set<string>()
  for (const match of content.matchAll(PLACEHOLDER)) names.add(match[1])
  return [...names]
}

/**
 * The declarations of a version's variables: one per placeholder of the text, keeping what was
 * declared for it; a new placeholder is a text variable, a declaration without a placeholder goes.
 */
export function reconcileVariables(content: string, declared: PromptVariable[]): PromptVariable[] {
  const byName = new Map<string, PromptVariable>()
  for (const variable of declared) {
    if (!byName.has(variable.name)) byName.set(variable.name, variable)
  }
  return extractVariableNames(content).map(
    (name) => byName.get(name) ?? { name, type: 'text' as const }
  )
}

function asText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() ? value : null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function typedValue(variable: PromptVariable, raw: string): string {
  if (variable.type === 'number') {
    const trimmed = raw.trim()
    if (!Number.isFinite(Number(trimmed.replace(',', '.'))) || trimmed === '') {
      throw new PromptRenderError(
        `La variable « ${variable.name} » attend un nombre, reçu « ${raw} ».`,
        variable.name
      )
    }
    return trimmed
  }
  if (variable.type === 'boolean') {
    const word = raw.trim().toLowerCase()
    if (TRUE_WORDS.has(word)) return 'oui'
    if (FALSE_WORDS.has(word)) return 'non'
    throw new PromptRenderError(
      `La variable « ${variable.name} » attend oui ou non, reçu « ${raw} ».`,
      variable.name
    )
  }
  return raw
}

/**
 * The text of a version with its variables filled: the given value, else the declared default.
 * Every value is checked against its type before anything is substituted, and substituted once:
 * a value holding braces stays as typed.
 */
export function renderPrompt(
  content: string,
  variables: PromptVariable[],
  values: Record<string, unknown>
): string {
  const filled = new Map<string, string>()
  for (const variable of reconcileVariables(content, variables)) {
    const raw = asText(values[variable.name]) ?? asText(variable.defaultValue)
    if (raw === null) {
      throw new PromptRenderError(
        `La variable « ${variable.name} » du prompt n'a pas de valeur.`,
        variable.name
      )
    }
    filled.set(variable.name, typedValue(variable, raw))
  }
  return content.replace(
    PLACEHOLDER,
    (placeholder, name: string) => filled.get(name) ?? placeholder
  )
}
