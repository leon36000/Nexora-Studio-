// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

export const rollbackWorkspaceFork = disabledUseCase(ops.rollback, 'Workspace forking')
export const unlinkWorkspaceFork = disabledUseCase(ops.unlink, 'Workspace forking')
export const updateWorkspaceForkExclusions = disabledUseCase(ops.exclusions, 'Workspace forking')
export const updateWorkspaceForkMappings = disabledUseCase(ops.mappingsUpdate, 'Workspace forking')
