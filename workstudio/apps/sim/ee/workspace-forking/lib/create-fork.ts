// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

/** Result shape read by the core receipts and project fixtures. */
export interface CreateForkResult {
  operation?: unknown
  replayed?: boolean
  workspace: { id: string }
}

export async function createFork(_args: unknown): Promise<CreateForkResult> {
  throw new FeatureDisabledError('Workspace forking')
}
