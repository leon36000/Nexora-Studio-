// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

export const setForkSyncDefault = disabledUseCase<{ excludeNewWorkflows: boolean; changedWorkspaces: any[] }>(
  ops.syncDefault,
  'Workspace forking'
)
