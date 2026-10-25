import { AuditAction, AuditResourceType } from '@sim/audit'
import { requirePrincipalSubjectUserId } from '@sim/auth/principal'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { nexoraBatchOperations } from '@/lib/nexora/batches/application/operations'
import { batchCsvStream } from '@/lib/nexora/batches/csv'
import { abortBatch, launchTableBatch, startBatch } from '@/lib/nexora/batches/live'
import { presentBatch, presentResult } from '@/lib/nexora/batches/present'
import * as repository from '@/lib/nexora/batches/repository'
import { TERMINAL_BATCH_STATUSES } from '@/lib/nexora/batches/types'
import type { TargetInput } from '@/lib/nexora/evaluations/launch'
import { listTables } from '@/lib/table/service'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'
import {
  ModelNotAllowedError,
  validateModelProvider,
} from '@/ee/access-control/utils/permission-check'

const authorizationOptions = {}
const OP = nexoraBatchOperations
const batchAudit = { resourceType: AuditResourceType.BATCH } as const
const BATCH_LIST_LIMIT = 100

interface WorkspaceInput {
  workspaceId: string
}

function resolveWorkspace({ input }: { input: WorkspaceInput }) {
  return resolveActiveWorkspaceApplicationContext(input.workspaceId)
}

function scopeOf(workspaceId: string): repository.BatchScope {
  return { workspaceId }
}

async function requireBatch(workspaceId: string, batchId: string) {
  const batch = await repository.getBatch(scopeOf(workspaceId), batchId)
  if (!batch) throw new OrchestrationError('not_found', 'Lot introuvable')
  return batch
}

export const listBatchesUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listBatches,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: async ({ context }) => {
    const page = await repository.listBatches(scopeOf(context.workspaceId), {
      limit: BATCH_LIST_LIMIT,
    })
    return page.batches.map(presentBatch)
  },
})

export const readBatchUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.readBatch,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & { batchId: string; after: number; limit: number }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const batch = await requireBatch(context.workspaceId, input.batchId)
    const rows = await repository.listResults(batch.id, 'all', input.after, input.limit)
    return { batch: presentBatch(batch), results: rows.map(presentResult) }
  },
})

export const exportBatchUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.exportBatch,
  resolveContext: ({ input }: { input: WorkspaceInput & { batchId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const batch = await requireBatch(context.workspaceId, input.batchId)
    return {
      filename: `lot-${batch.id}.csv`,
      stream: batchCsvStream((after, limit) =>
        repository.listResults(batch.id, 'all', after, limit)
      ),
    }
  },
})

/** The workspace's tables with their column names: what a batch can process. */
export const listSourcesUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listSources,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: async ({ context }) => {
    const tables = await listTables(context.workspaceId)
    return tables.map((table) => ({
      id: table.id,
      name: table.name,
      rowCount: table.rowCount,
      columns: table.schema.columns.map((column) => column.name),
    }))
  },
})

/** Refuses a model the person's access group does not allow (as the Playground does). */
async function requireModelAllowed(userId: string, workspaceId: string, model: string) {
  const name = model.replace(/^vllm\//, '')
  try {
    await validateModelProvider(userId, workspaceId, name)
  } catch (error) {
    if (error instanceof ModelNotAllowedError) {
      throw new OrchestrationError(
        'forbidden',
        `Votre groupe d’accès ne vous autorise pas le modèle « ${name} ».`
      )
    }
    throw error
  }
}

export const launchBatchUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.launchBatch,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & {
      name: string
      tableId: string
      target: TargetInput
      template: string
      outputColumnName: string
      maxTokens?: number | null
      concurrency: number
      expiresInHours: number
    }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    const userId = requirePrincipalSubjectUserId(principal)
    if (input.target.kind !== 'agent') {
      await requireModelAllowed(userId, context.workspaceId, input.target.model)
    }
    const batch = await launchTableBatch({
      workspaceId: context.workspaceId,
      userId,
      tableId: input.tableId,
      name: input.name,
      target: input.target,
      template: input.template,
      outputColumnName: input.outputColumnName,
      maxTokens: input.maxTokens ?? null,
      concurrency: input.concurrency,
      expiresInHours: input.expiresInHours,
    })
    return presentBatch(batch)
  },
  projectAudit: ({ result }) => ({
    ...batchAudit,
    action: AuditAction.BATCH_LAUNCHED,
    resourceId: result.id,
    resourceName: result.name ?? result.id,
    description: `Launched batch "${result.name ?? result.id}"`,
    metadata: { requests: result.total, model: result.model, table: result.tableId },
  }),
})

export const cancelBatchUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.cancelBatch,
  resolveContext: ({ input }: { input: WorkspaceInput & { batchId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const current = await requireBatch(context.workspaceId, input.batchId)
    if (TERMINAL_BATCH_STATUSES.includes(current.status)) {
      throw new OrchestrationError('conflict', 'Ce lot est déjà terminé.')
    }
    const cancelling = await repository.requestCancel(
      scopeOf(context.workspaceId),
      current.id,
      new Date()
    )
    if (!cancelling) throw new OrchestrationError('not_found', 'Lot introuvable')
    abortBatch(current.id)
    // A batch nobody runs (its server stopped) is adopted here so that it can end.
    startBatch(current.id)
    return presentBatch(cancelling)
  },
  projectAudit: ({ result }) => ({
    ...batchAudit,
    action: AuditAction.BATCH_CANCELLED,
    resourceId: result.id,
    resourceName: result.name ?? result.id,
    description: `Cancelled batch "${result.name ?? result.id}"`,
  }),
})

export const deleteBatchUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.deleteBatch,
  resolveContext: ({ input }: { input: WorkspaceInput & { batchId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const batch = await requireBatch(context.workspaceId, input.batchId)
    if (!TERMINAL_BATCH_STATUSES.includes(batch.status)) {
      throw new OrchestrationError('conflict', 'Annulez ce lot avant de le supprimer.')
    }
    if (!(await repository.deleteBatch(scopeOf(context.workspaceId), batch.id))) {
      throw new OrchestrationError('not_found', 'Lot introuvable')
    }
    return { id: batch.id, name: batch.name }
  },
  projectAudit: ({ result }) => ({
    ...batchAudit,
    action: AuditAction.BATCH_DELETED,
    resourceId: result.id,
    resourceName: result.name ?? result.id,
    description: `Deleted batch "${result.name ?? result.id}"`,
  }),
})
