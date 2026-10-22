// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** SCIM is disabled in this edition: every SCIM route answers 404 through the core builder. */
export function isScimDeploymentEnabled(): boolean {
  return false
}

export async function isScimEntitledForOrganization(
  _organizationId: string,
  _executor?: unknown
): Promise<boolean> {
  return false
}
