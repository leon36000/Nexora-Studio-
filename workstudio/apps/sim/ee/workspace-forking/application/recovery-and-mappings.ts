// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type {
  RollbackForkResponse,
  UnlinkForkResponse,
  UpdateForkExcludedWorkflowsResponse,
} from '@/lib/api/contracts/workspace-fork'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

const F = 'Workspace forking'

export const rollbackWorkspaceFork = disabledUseCase<RollbackForkResponse>(ops.rollback, F)
export const unlinkWorkspaceFork = disabledUseCase<UnlinkForkResponse>(ops.unlink, F)
export const updateWorkspaceForkExclusions = disabledUseCase<UpdateForkExcludedWorkflowsResponse>(
  ops.exclusions,
  F
)
/** The core mapping routes render `{ success: true, ...result }` and `{ data: result }`. */
export const updateWorkspaceForkMappings = disabledUseCase<{ updated: number }>(
  ops.mappingsUpdate,
  F
)
