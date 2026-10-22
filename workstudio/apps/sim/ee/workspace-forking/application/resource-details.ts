// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { GetForkResourcesResponse } from '@/lib/api/contracts/workspace-fork'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

export const getWorkspaceForkResourceDetails = disabledUseCase<GetForkResourcesResponse>(
  ops.discover,
  'Workspace forking'
)
