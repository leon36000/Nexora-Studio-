// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase, constantUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

export const getWorkspaceForkLineage = disabledUseCase(ops.discover, 'Workspace forking')
export const getWorkspaceForkMappings = disabledUseCase(ops.mappingsRead, 'Workspace forking')
export const listWorkspaceForkResources = disabledUseCase(ops.discover, 'Workspace forking')

export const listWorkspaceForkChildren = disabledUseCase<{ items: any[]; nextCursor: string | null }>(
  ops.discover,
  'Workspace forking'
)

/** Availability is answered (not refused) so the sidebar and prefetch simply hide forks. */
export const getWorkspaceForkAvailability = constantUseCase(ops.discover, () => ({ available: false }))
