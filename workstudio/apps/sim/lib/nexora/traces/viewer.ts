import { isOrgAdminRole } from '@sim/platform-authz/workspace'
import { getUserOrganization } from '@/lib/billing/organizations/membership'
import type { TraceViewer } from '@/lib/nexora/traces/visibility'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'
import { getUserEntityPermissions } from '@/lib/workspaces/permissions/utils'

/** Whether the person owns or administers the instance organization. */
async function isInstanceAdminUser(userId: string): Promise<boolean> {
  const [membership, instanceOrganizationId] = await Promise.all([
    getUserOrganization(userId),
    getInstanceOrganizationId(),
  ])
  return Boolean(
    membership &&
      isOrgAdminRole(membership.role) &&
      (!instanceOrganizationId || membership.organizationId === instanceOrganizationId)
  )
}

/** What the person may read of a workspace's traces (`workspaceId` null: the instance's own). */
export async function resolveTraceViewer(
  userId: string,
  workspaceId: string | null
): Promise<TraceViewer> {
  const [permission, isInstanceAdmin] = await Promise.all([
    workspaceId ? getUserEntityPermissions(userId, 'workspace', workspaceId) : null,
    isInstanceAdminUser(userId),
  ])
  return { userId, isInstanceAdmin, workspacePermission: permission }
}
