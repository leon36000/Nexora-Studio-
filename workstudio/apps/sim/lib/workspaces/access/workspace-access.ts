import { permissions, workspace } from '@sim/db/schema'
import { resolveEffectiveWorkspacePermission } from '@sim/platform-authz/workspace'
import { and, eq, inArray } from 'drizzle-orm'
import { revokeWorkspaceCredentialMembershipsTx } from '@/lib/credentials/access'
import type { DbTransaction } from '@/lib/db/types'
import {
  findWorkspacesWithLiveRunsTx,
  type StoppedRun,
  stopLiveRunsTx,
} from '@/lib/mothership/async-runs/repository'
import { lockProjectsForResourceDepartureTx } from '@/lib/projects/resource-handoff'
import { removeWorkspaceSkillMembershipsTx } from '@/lib/skills/access'
import { reassignSharedResourceOwnershipForWorkspaceMemberRemovalTx } from '@/lib/workspaces/resource-handoff'
import { transferWorkspaceOwnershipToBilledAccountForMemberRemovalTx } from '@/lib/workspaces/utils'

export type RevokeWorkspaceAccessResult =
  /**
   * `ownershipTransferred` is true when the departing user owned the workspace and it moved to
   * the billed account. `stoppedRuns` are the user's Chat runs there, stopped in this
   * transaction when no access remains (see {@link stopRunsWithoutWorkspaceAccessTx}); deliver
   * them with `deliverRunStops` after commit.
   */
  | { revoked: true; ownershipTransferred: boolean; stoppedRuns: StoppedRun[] }
  /** Workspace IDs whose shared resources or ownership lack a successor; access remains unchanged. */
  | { revoked: false; reason: 'unresolved-workflows'; unresolvedWorkspaceIds: string[] }
  /** The requested membership no longer exists; a replacement grant must remain untouched. */
  | { revoked: false; reason: 'membership-changed' }

/** Reassigns shared resources and workspace ownership before revoking access in the same transaction. */
export async function revokeWorkspaceAccessTx(
  tx: DbTransaction,
  params: {
    workspaceId: string
    userId: string
    expectedPermissionId?: string
    /**
     * Leaves the user's runs to a caller that changes more access in this transaction and
     * stops runs once that access is final; `stoppedRuns` is then empty.
     */
    deferRunStops?: boolean
  }
): Promise<RevokeWorkspaceAccessResult> {
  await lockProjectsForResourceDepartureTx(tx, [params.workspaceId])
  if (params.expectedPermissionId !== undefined) {
    /** Match the handoff's workspace-before-grant lock order before validating the selected row. */
    await tx
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.id, params.workspaceId))
      .for('no key update')
    const [selectedGrant] = await tx
      .select({ id: permissions.id })
      .from(permissions)
      .where(
        and(
          eq(permissions.id, params.expectedPermissionId),
          eq(permissions.userId, params.userId),
          eq(permissions.entityType, 'workspace'),
          eq(permissions.entityId, params.workspaceId)
        )
      )
      .for('update')
    if (!selectedGrant) return { revoked: false, reason: 'membership-changed' }
  }

  const reassignment = await reassignSharedResourceOwnershipForWorkspaceMemberRemovalTx({
    tx,
    workspaceIds: [params.workspaceId],
    departingUserId: params.userId,
  })
  if (reassignment.unresolved.length > 0) {
    return {
      revoked: false,
      reason: 'unresolved-workflows',
      unresolvedWorkspaceIds: reassignment.unresolved,
    }
  }

  // The handoff above already refused an owner without a successor, under the workspace row lock.
  const ownershipTransferred = await transferWorkspaceOwnershipToBilledAccountForMemberRemovalTx({
    tx,
    workspaceId: params.workspaceId,
    departingUserId: params.userId,
  })

  await tx
    .delete(permissions)
    .where(
      and(
        eq(permissions.userId, params.userId),
        eq(permissions.entityType, 'workspace'),
        eq(permissions.entityId, params.workspaceId),
        params.expectedPermissionId !== undefined
          ? eq(permissions.id, params.expectedPermissionId)
          : undefined
      )
    )

  await revokeWorkspaceCredentialMembershipsTx(tx, params.workspaceId, params.userId)
  await removeWorkspaceSkillMembershipsTx(tx, params.workspaceId, params.userId)
  const stoppedRuns = params.deferRunStops
    ? []
    : await stopRunsWithoutWorkspaceAccessTx(tx, params.userId, [params.workspaceId])

  return { revoked: true, ownershipTransferred, stoppedRuns }
}

/**
 * Stops the user's live Chat runs in each of these workspaces where they hold no effective
 * access any more. An organization admin keeps derived access without an explicit grant, so
 * withdrawing a grant or a role ends runs only where access actually ended.
 */
export async function stopRunsWithoutWorkspaceAccessTx(
  tx: DbTransaction,
  userId: string,
  workspaceIds: string[]
): Promise<StoppedRun[]> {
  /** Access is checked only where a run could be ended, not across a whole organization. */
  const withRuns = await findWorkspacesWithLiveRunsTx(tx, userId, workspaceIds)
  if (withRuns.length === 0) return []
  const owners = await tx
    .select({ id: workspace.id, organizationId: workspace.organizationId })
    .from(workspace)
    .where(inArray(workspace.id, withRuns))
  const lost: string[] = []
  for (const { id, organizationId } of owners) {
    if (!(await resolveEffectiveWorkspacePermission(userId, id, organizationId, tx))) lost.push(id)
  }
  return stopLiveRunsTx(tx, { userId, workspaceIds: lost })
}
