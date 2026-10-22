// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export async function unlinkForkEdge(_edge: {
  parentWorkspaceId: string
  childWorkspaceId: string
}): Promise<{ unlinked: boolean }> {
  return { unlinked: false }
}
