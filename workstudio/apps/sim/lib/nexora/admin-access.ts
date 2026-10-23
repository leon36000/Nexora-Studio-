import { isOrgAdminRole } from '@sim/platform-authz/workspace'
import { getSession } from '@/lib/auth'
import { getUserOrganization } from '@/lib/billing/organizations/membership'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: instance-wide settings (model consumption, the models themselves) belong to
 * organization owners and admins — of the instance organization when the instance has one, since
 * every user belongs to it and nobody can found another. Changes that affect every user
 * (`requireInstanceOrganization`, e.g. the models) need that instance organization: without
 * one, any user could found an organization and become its owner.
 */
export async function authorizeInstanceAdmin({
  requireInstanceOrganization = false,
}: {
  requireInstanceOrganization?: boolean
} = {}): Promise<
  | { ok: true; userId: string; organizationId: string; role: string }
  | { ok: false; status: 401 | 403 }
> {
  const session = await getSession()
  if (!session?.user?.id) return { ok: false, status: 401 }
  const [membership, instanceOrganizationId] = await Promise.all([
    getUserOrganization(session.user.id),
    getInstanceOrganizationId(),
  ])
  if (
    !membership ||
    !isOrgAdminRole(membership.role) ||
    (requireInstanceOrganization && !instanceOrganizationId) ||
    (instanceOrganizationId && membership.organizationId !== instanceOrganizationId)
  ) {
    return { ok: false, status: 403 }
  }
  return {
    ok: true,
    userId: session.user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  }
}
