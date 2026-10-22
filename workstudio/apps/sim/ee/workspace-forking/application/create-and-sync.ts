// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

export const forkWorkspace = disabledUseCase(ops.create, 'Workspace forking')
export const previewWorkspaceFork = disabledUseCase(ops.preview, 'Workspace forking')
export const previewWorkspaceSync = disabledUseCase(ops.syncPreview, 'Workspace forking')
export const syncWorkspace = disabledUseCase(ops.sync, 'Workspace forking')
