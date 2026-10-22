// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

/** Minimal result shape; only referenced in core receipt types. */
export interface CreateForkResult {
  operation?: unknown
  replayed?: boolean
  [key: string]: any
}

export async function createFork(_args: unknown): Promise<CreateForkResult> {
  throw new FeatureDisabledError('Workspace forking')
}
