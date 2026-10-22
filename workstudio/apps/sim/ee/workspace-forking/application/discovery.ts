// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { z } from 'zod'
import type { v2ForkLineageNodeSchema } from '@/lib/api/contracts/v2/workspace-fork'
import { constantUseCase, disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

/** One direct child, as the core children route presents it (`createdAt` is ISO 8601). */
type ForkChild = z.output<typeof v2ForkLineageNodeSchema> & { createdAt: string }

export const getWorkspaceForkLineage = disabledUseCase(ops.discover, 'Workspace forking')
export const getWorkspaceForkMappings = disabledUseCase(ops.mappingsRead, 'Workspace forking')
export const listWorkspaceForkResources = disabledUseCase(ops.discover, 'Workspace forking')

export const listWorkspaceForkChildren = disabledUseCase<{
  items: ForkChild[]
  nextCursor: string | null
}>(ops.discover, 'Workspace forking')

/** Availability is answered (not refused) so the sidebar and prefetch simply hide forks. */
export const getWorkspaceForkAvailability = constantUseCase(ops.discover, () => ({
  available: false,
}))
