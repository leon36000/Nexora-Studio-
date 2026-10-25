/**
 * Nexora edition: « Demander avant d'agir ». An agent's MCP tool can be flagged so the person is
 * asked before it runs. For Nexora Connect, whose `execute_action` runs any action of its catalogue,
 * only actions that write or destroy ask; reading does not.
 */

const NEXORA_CONNECT_SERVER_NAME = 'Nexora Connect'
const EXECUTE_ACTION_TOOL = 'execute_action'

/** Nexora Connect's tools that only read: the form does not offer the switch for them. */
export const CONNECT_READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  'list_apps',
  'list_connections',
  'search_actions',
  'get_action_guide',
])

/**
 * Whether a newly added MCP tool starts with « Demander avant d'agir » on: every tool but
 * Nexora Connect's read-only ones. The person can turn it off for a tool they trust.
 */
export function asksByDefault(serverName: string | undefined, toolName: string): boolean {
  return !(serverName === NEXORA_CONNECT_SERVER_NAME && CONNECT_READ_ONLY_TOOLS.has(toolName))
}

export interface ToolConfirmationSpec {
  required: boolean
  serverName?: string
  toolName: string
  title: string
}

type OperationType = 'read' | 'write' | 'destructive'

/** What Nexora Connect says an action does, `null` when it does not know the action. */
export type ActionOperationLookup = (actionId: string) => Promise<OperationType | null>

export interface ConfirmationDecision {
  needed: boolean
  /** What the person is asked to allow: the action when Connect runs one, else the tool. */
  title?: string
}

export async function needsConfirmation(
  spec: ToolConfirmationSpec,
  args: Record<string, unknown>,
  lookupOperation: ActionOperationLookup
): Promise<ConfirmationDecision> {
  if (!spec.required) return { needed: false }
  const isConnectAction =
    spec.serverName === NEXORA_CONNECT_SERVER_NAME && spec.toolName === EXECUTE_ACTION_TOOL
  if (!isConnectAction) return { needed: true, title: spec.title }

  const actionId = typeof args.actionId === 'string' ? args.actionId.trim() : ''
  if (!actionId) return { needed: true, title: spec.title }
  let operation: OperationType | null = null
  try {
    operation = await lookupOperation(actionId)
  } catch {
    operation = null
  }
  if (operation === 'read') return { needed: false }
  return { needed: true, title: actionId }
}
