// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

export async function loadSourceDeployedStates(_sourceWorkspaceId: string): Promise<any> {
  throw new FeatureDisabledError('Workspace forking')
}
