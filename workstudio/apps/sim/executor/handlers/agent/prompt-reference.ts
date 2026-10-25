import { isRecordLike, toRecordOrNull } from '@sim/utils/object'
import type { PromptReference, ResolvedPrompt } from '@/lib/nexora/prompts/resolve'
import { PROMPT_SELECTORS, type PromptSelector } from '@/lib/nexora/prompts/template'
import type { BlockOutput } from '@/blocks/types'
import type { AgentInputs, Message } from '@/executor/handlers/agent/types'
import type { StreamingExecution } from '@/executor/types'
import type { ResolvedSecretInputPath } from '@/executor/utils/resolved-secret-trace-registry'

/**
 * Nexora edition: an Agent block whose instructions come from a versioned prompt of its
 * workspace (`promptId`, `promptLabel`, `promptVariables`). The prompt is resolved at the start
 * of every run, so moving its `production` label changes a published agent without republishing.
 */

function isSelector(value: unknown): value is PromptSelector {
  return typeof value === 'string' && (PROMPT_SELECTORS as readonly string[]).includes(value)
}

/** The variable rows of the block, as the table sub-block stores them, with their position. */
function variableRows(inputs: AgentInputs): { key: string; value: unknown; path: string[] }[] {
  const table = inputs.promptVariables
  if (Array.isArray(table)) {
    return table.flatMap((row, index) => {
      const cells = toRecordOrNull(toRecordOrNull(row)?.cells)
      const key = typeof cells?.Key === 'string' ? cells.Key.trim() : ''
      return cells && key
        ? [{ key, value: cells.Value, path: ['promptVariables', String(index), 'cells', 'Value'] }]
        : []
    })
  }
  if (isRecordLike(table)) {
    return Object.entries(table).map(([key, value]) => ({
      key,
      value,
      path: ['promptVariables', key],
    }))
  }
  return []
}

/** The prompt the block asks for, or `null` when it uses its own instructions. */
export function readPromptReference(inputs: AgentInputs): PromptReference | null {
  const promptId = typeof inputs.promptId === 'string' ? inputs.promptId.trim() : ''
  if (!promptId) return null
  const values: Record<string, unknown> = {}
  for (const row of variableRows(inputs)) values[row.key] = row.value
  return {
    promptId,
    selector: isSelector(inputs.promptLabel) ? inputs.promptLabel : 'production',
    values,
  }
}

/** Where each variable value sits in the block inputs: a value resolved from a secret is refused. */
export function promptVariableInputPaths(inputs: AgentInputs): ResolvedSecretInputPath[] {
  return variableRows(inputs).map((row) => row.path)
}

/** The block inputs with the prompt's text as their system message. */
export function applyResolvedPrompt(inputs: AgentInputs, prompt: ResolvedPrompt): AgentInputs {
  if (!inputs.messages) return { ...inputs, systemPrompt: prompt.text }
  const messages: Message[] = [...inputs.messages]
  const systemIndex = messages.findIndex((message) => message.role === 'system')
  if (systemIndex === -1) messages.unshift({ role: 'system', content: prompt.text })
  else messages[systemIndex] = { ...messages[systemIndex], content: prompt.text }
  return { ...inputs, messages }
}

function isStreamingExecution(output: unknown): output is StreamingExecution {
  return isRecordLike(output) && 'stream' in output && 'execution' in output
}

/** The block's output with the prompt version it ran with: shown in the run's logs. */
export function withPromptOutput(
  output: BlockOutput | StreamingExecution,
  prompt: ResolvedPrompt
): BlockOutput | StreamingExecution {
  const used = { id: prompt.id, name: prompt.name, version: prompt.version, label: prompt.label }
  if (isStreamingExecution(output)) {
    output.execution.output = { ...output.execution.output, prompt: used }
    return output
  }
  return isRecordLike(output) ? { ...output, prompt: used } : output
}
