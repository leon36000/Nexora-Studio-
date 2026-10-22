// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export interface SurfacedBackgroundWorkRow {
  id: string
  workspaceId: string
  workflowId: string | null
  kind: string
  status: string
  message: string | null
  error: string | null
  metadata: Record<string, unknown> | null
  startedAt: Date
  completedAt: Date | null
}

export async function listSurfacedBackgroundWork(
  _db: unknown,
  _workspaceId: string,
  _page: { cursor?: string | null; limit?: number }
): Promise<{ rows: SurfacedBackgroundWorkRow[]; nextCursor: string | null }> {
  return { rows: [], nextCursor: null }
}

/** No fork leases exist, so nothing is ever reaped. */
export async function reapStaleBackgroundWork(_db: unknown): Promise<number> {
  return 0
}
