/** The person asking to read traces, as their rights in the workspace and on the instance stand. */
export interface TraceViewer {
  userId: string
  isInstanceAdmin: boolean
  workspacePermission: 'read' | 'write' | 'admin' | null
}

interface TraceOwnership {
  visibility: 'workspace' | 'private'
  userId: string | null
  workspaceId: string | null
}

/**
 * Nexora edition: who reads a trace. A workspace trace belongs to every member of the workspace;
 * a private one (the Assistant's members-only chats, the Playground, the Copilot) to its author
 * and the workspace's administrators — the same rule as the execution logs of a members-only
 * chat. A trace of no workspace (an instance key's call) belongs to the instance administrators.
 */
export function canReadTrace(viewer: TraceViewer, trace: TraceOwnership): boolean {
  if (trace.workspaceId === null) return viewer.isInstanceAdmin
  if (viewer.workspacePermission === null) return false
  if (trace.visibility === 'workspace') return true
  return (
    viewer.workspacePermission === 'admin' ||
    (trace.userId !== null && trace.userId === viewer.userId)
  )
}
