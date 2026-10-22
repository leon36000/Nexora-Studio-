// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { GetForkDiffResponse } from '@/lib/api/contracts/workspace-fork'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

export const getWorkspaceSyncDetails = disabledUseCase<GetForkDiffResponse>(
  ops.syncPreview,
  'Workspace forking'
)
