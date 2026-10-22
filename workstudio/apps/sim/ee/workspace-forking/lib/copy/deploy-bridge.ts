// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

/** Deployed source states, keyed by source workflow id to the deployment version they pin. */
export async function loadSourceDeployedStates(
  _sourceWorkspaceId: string
): Promise<{ sourceVersionIds: Map<string, { id: string }> }> {
  throw new FeatureDisabledError('Workspace forking')
}
