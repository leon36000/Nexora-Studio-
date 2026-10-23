import { vi } from 'vitest'

/**
 * Controllable mock functions for `@/lib/workflows/operations/import-workflow` — the workflow
 * importer (validation, folder checks, persistence). All defaults are bare `vi.fn()`; configure
 * the import result per test.
 *
 * @example
 * ```ts
 * import { importWorkflowMockFns } from '@sim/testing/mocks/import-workflow.mock'
 *
 * importWorkflowMockFns.mockImportWorkflowIntoWorkspaceTransition.mockResolvedValue({
 *   success: true,
 *   workflow,
 *   warnings: [],
 * })
 * ```
 */
export const importWorkflowMockFns = {
  mockDescribeStrippedWorkspaceBindings: vi.fn(),
  mockResolveImportedMetadata: vi.fn(),
  mockImportWorkflowIntoWorkspace: vi.fn(),
  mockImportWorkflowIntoWorkspaceTransition: vi.fn(),
}

/**
 * Static mock module for `@/lib/workflows/operations/import-workflow`.
 *
 * @example
 * ```ts
 * vi.mock('@/lib/workflows/operations/import-workflow', () => importWorkflowMock)
 * ```
 */
export const importWorkflowMock = {
  MAX_IMPORT_BODY_BYTES: 10 * 1024 * 1024,
  describeStrippedWorkspaceBindings: importWorkflowMockFns.mockDescribeStrippedWorkspaceBindings,
  resolveImportedMetadata: importWorkflowMockFns.mockResolveImportedMetadata,
  importWorkflowIntoWorkspace: importWorkflowMockFns.mockImportWorkflowIntoWorkspace,
  importWorkflowIntoWorkspaceTransition:
    importWorkflowMockFns.mockImportWorkflowIntoWorkspaceTransition,
}
