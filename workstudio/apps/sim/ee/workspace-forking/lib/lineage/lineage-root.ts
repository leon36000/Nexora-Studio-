// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export async function resolveForkLineageRootId(
  workspaceId: string,
  ..._args: unknown[]
): Promise<string> {
  return workspaceId
}
export async function resolveForkLineageWorkspaceIds(
  workspaceId: string,
  ..._args: unknown[]
): Promise<string[]> {
  return [workspaceId]
}
