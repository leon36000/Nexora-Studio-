// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

/** The core sync-default route counts `changedWorkspaces`; its tests read each member's `id`. */
export const setForkSyncDefault = disabledUseCase<{
  excludeNewWorkflows: boolean
  changedWorkspaces: { id: string }[]
}>(ops.syncDefault, 'Workspace forking')
