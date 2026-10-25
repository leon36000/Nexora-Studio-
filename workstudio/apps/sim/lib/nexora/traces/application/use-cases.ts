import { AuditAction, AuditResourceType } from '@sim/audit'
import { requirePrincipalSubjectUserId } from '@sim/auth/principal'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application'
import {
  defineAuthorizedOrganizationUseCase,
  type OrganizationUseCaseContext,
} from '@/lib/core/application/authorized-organization-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { nexoraTraceOperations } from '@/lib/nexora/traces/application/operations'
import { lastExportStatus, sendTestSpan } from '@/lib/nexora/traces/otlp'
import { purgeConversations, purgeTraces } from '@/lib/nexora/traces/purge'
import {
  getTraceWithSpans,
  listFacets,
  listTraces,
  type TraceFilters,
  type TraceScope,
} from '@/lib/nexora/traces/repository'
import {
  loadTraceSettings,
  readTraceSettings,
  saveTraceSettings,
  type TraceSettingsChange,
  TraceSettingsError,
} from '@/lib/nexora/traces/settings'
import { resolveTraceViewer } from '@/lib/nexora/traces/viewer'
import { canReadTrace } from '@/lib/nexora/traces/visibility'
import { loadActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

async function resolveWorkspace(workspaceId: string) {
  const context = await loadActiveWorkspaceApplicationContext(workspaceId)
  if (!context) throw new OrchestrationError('not_found', 'Workspace not found')
  return context
}

const authorizationOptions = {}

interface WorkspaceInput {
  workspaceId: string
}

type WorkspaceTraceFilters = Omit<TraceFilters, 'workspaceId'>

/** What the reader may see of the workspace: shared traces, their own, and all if they administer it. */
async function workspaceScope(userId: string, workspaceId: string): Promise<TraceScope> {
  const viewer = await resolveTraceViewer(userId, workspaceId)
  return { userId, seesPrivate: viewer.workspacePermission === 'admin' }
}

/** A trace of another workspace, one the reader may not read, and a missing one answer alike. */
function traceNotFound(): never {
  throw new OrchestrationError('not_found', 'Trace not found')
}

export const listWorkspaceTraces = defineAuthorizedWorkspaceUseCase({
  operation: nexoraTraceOperations.listWorkspace,
  resolveContext: ({ input }: { input: WorkspaceInput & { filters: WorkspaceTraceFilters } }) =>
    resolveWorkspace(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) =>
    listTraces(
      { ...input.filters, workspaceId: context.workspaceId },
      await workspaceScope(requirePrincipalSubjectUserId(principal), context.workspaceId)
    ),
})

export const getWorkspaceTrace = defineAuthorizedWorkspaceUseCase({
  operation: nexoraTraceOperations.readWorkspace,
  resolveContext: ({ input }: { input: WorkspaceInput & { traceId: string } }) =>
    resolveWorkspace(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    const userId = requirePrincipalSubjectUserId(principal)
    const found = await getTraceWithSpans(input.traceId)
    if (!found || found.trace.workspaceId !== context.workspaceId) traceNotFound()
    const viewer = await resolveTraceViewer(userId, context.workspaceId)
    if (!canReadTrace(viewer, found.trace as Parameters<typeof canReadTrace>[1])) traceNotFound()
    return found
  },
})

export const listWorkspaceTraceFacets = defineAuthorizedWorkspaceUseCase({
  operation: nexoraTraceOperations.facetsWorkspace,
  resolveContext: ({ input }: { input: WorkspaceInput }) => resolveWorkspace(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, principal }) =>
    listFacets(
      context.workspaceId,
      await workspaceScope(requirePrincipalSubjectUserId(principal), context.workspaceId)
    ),
})

interface InstanceInput {
  /** The instance organization, whose owners and admins govern instance-wide traces and settings. */
  organizationId: string
}

export const listInstanceTraces = defineAuthorizedOrganizationUseCase({
  operation: nexoraTraceOperations.listInstance,
  execute: ({
    input,
    principal,
  }: OrganizationUseCaseContext<InstanceInput & { filters: WorkspaceTraceFilters }>) =>
    listTraces(
      { ...input.filters, workspaceId: null },
      { userId: requirePrincipalSubjectUserId(principal), seesPrivate: true }
    ),
})

export const getInstanceTrace = defineAuthorizedOrganizationUseCase({
  operation: nexoraTraceOperations.readInstance,
  execute: async ({ input }: OrganizationUseCaseContext<InstanceInput & { traceId: string }>) => {
    const found = await getTraceWithSpans(input.traceId)
    if (!found || found.trace.workspaceId !== null) traceNotFound()
    return found
  },
})

async function settingsOverview() {
  return { settings: await readTraceSettings(), lastExport: lastExportStatus() }
}

export const readTraceSettingsUseCase = defineAuthorizedOrganizationUseCase({
  operation: nexoraTraceOperations.readSettings,
  execute: (_args: OrganizationUseCaseContext<InstanceInput>) => settingsOverview(),
})

/** The change as the audit keeps it: header names, never their values. */
function auditedChange(change: TraceSettingsChange) {
  const { otlp, ...rest } = change
  return {
    ...rest,
    ...(otlp
      ? {
          otlp: {
            enabled: otlp.enabled,
            endpoint: otlp.endpoint,
            headerNames: otlp.headers?.map((header) => header.name),
          },
        }
      : {}),
  }
}

export const updateTraceSettings = defineAuthorizedOrganizationUseCase({
  operation: nexoraTraceOperations.updateSettings,
  execute: async ({
    input,
  }: OrganizationUseCaseContext<InstanceInput & { change: TraceSettingsChange }>) => {
    try {
      await saveTraceSettings(input.change)
    } catch (error) {
      if (error instanceof TraceSettingsError) {
        throw new OrchestrationError('validation', error.message)
      }
      throw error
    }
    return settingsOverview()
  },
  projectAudit: ({ input }) => ({
    action: AuditAction.NEXORA_TRACE_SETTINGS_UPDATED,
    resourceType: AuditResourceType.ORGANIZATION,
    resourceId: input.organizationId,
    description: 'Updated trace settings',
    metadata: { change: auditedChange(input.change) },
  }),
})

/** Sends one test span to the collector as saved. */
export const testTraceExport = defineAuthorizedOrganizationUseCase({
  operation: nexoraTraceOperations.testExport,
  execute: async (_args: OrganizationUseCaseContext<InstanceInput>) => {
    const settings = await loadTraceSettings()
    return sendTestSpan(settings.otlp)
  },
})

export const purgeNexoraTraces = defineAuthorizedOrganizationUseCase({
  operation: nexoraTraceOperations.purge,
  execute: async ({
    input,
  }: OrganizationUseCaseContext<InstanceInput & { workspaceId?: string; asOf?: Date }>) => {
    const settings = await loadTraceSettings()
    const now = input.asOf ?? new Date()
    const traces = await purgeTraces({
      now,
      retentionDays: settings.retentionDays,
      workspaceId: input.workspaceId,
    })
    const conversations =
      input.workspaceId || settings.conversationRetentionDays === null
        ? { deleted: 0 }
        : await purgeConversations({ now, retentionDays: settings.conversationRetentionDays })
    return {
      deletedTraces: traces.deleted,
      deletedConversations: conversations.deleted,
      retentionDays: settings.retentionDays,
    }
  },
  projectAudit: ({ input, result }) => ({
    action: AuditAction.NEXORA_TRACES_PURGED,
    resourceType: AuditResourceType.ORGANIZATION,
    resourceId: input.organizationId,
    description: 'Purged traces',
    metadata: {
      workspaceId: input.workspaceId ?? null,
      asOf: input.asOf?.toISOString() ?? null,
      deletedTraces: result.deletedTraces,
      deletedConversations: result.deletedConversations,
    },
  }),
})
