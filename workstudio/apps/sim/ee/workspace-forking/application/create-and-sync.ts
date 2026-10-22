// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { V2ForkPreviewData, V2SyncPreviewData } from '@/lib/api/contracts/v2/workspace-fork'
import type { ForkWorkspaceResponse, PromoteForkResponse } from '@/lib/api/contracts/workspace-fork'
import type { WorkspaceOperationReport } from '@/lib/workspaces/operations/receipts'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { forkOperations as ops } from '@/ee/workspace-forking/application/operations'

const F = 'Workspace forking'

/**
 * Result types are the ones the core routes present: the internal routes render the contract
 * body, and the v2 routes render the receipt in `operation`.
 */
export const forkWorkspace = disabledUseCase<
  ForkWorkspaceResponse & { operation?: WorkspaceOperationReport }
>(ops.create, F)
export const previewWorkspaceFork = disabledUseCase<V2ForkPreviewData>(ops.preview, F)
export const previewWorkspaceSync = disabledUseCase<V2SyncPreviewData>(ops.syncPreview, F)
export const syncWorkspace = disabledUseCase<
  PromoteForkResponse & { operation?: WorkspaceOperationReport }
>(ops.sync, F)
