import { OrchestrationError } from '@/lib/core/orchestration/types'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Admits only the instance organization's owners and admins, before the request is parsed: the
 * figures cover every user of the instance, and a budget binds every workspace. The use case then
 * re-checks the role through the organization authorization funnel.
 */
export async function requireInstanceAdmin(): Promise<void> {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) {
    throw new OrchestrationError(access.status === 401 ? 'unauthorized' : 'forbidden', 'Forbidden')
  }
}

/** The instance organization, which {@link requireInstanceAdmin} has established exists. */
export async function instanceOrganizationInput(): Promise<{ organizationId: string }> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) throw new OrchestrationError('forbidden', 'Forbidden')
  return { organizationId }
}
