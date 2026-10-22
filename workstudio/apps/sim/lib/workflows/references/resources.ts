import {
  credential,
  customBlock,
  customTools,
  document,
  knowledgeBase,
  mcpServers,
  skill,
  userTableDefinitions,
  workflow,
  workspace,
  workspaceEnvironment,
  workspaceFiles,
  workspaceSandbox,
} from '@sim/db/schema'
import { and, asc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { DbOrTx } from '@/lib/db/types'
import { MAX_FOLDERS_PER_WORKSPACE } from '@/lib/folders/constants'
import { parseFolderPath, ROOT_FOLDER_PATH } from '@/lib/folders/paths'
import { loadActiveFolderPathIndex } from '@/lib/folders/queries'
import type { ForkRemapKind } from '@/lib/workflows/references/remap-references'
import { activeWorkspaceFileConditions } from '@/lib/workspace-files/query-scope'

interface ForkResourceCandidate {
  id: string
  label: string
  providerId?: string
}

const CANDIDATE_LIMIT = 1000

/** The set of env-var keys defined in a workspace (for resolver identity + gating). */
export async function getWorkspaceEnvKeys(
  executor: DbOrTx,
  workspaceId: string
): Promise<Set<string>> {
  const [row] = await executor
    .select({ variables: workspaceEnvironment.variables })
    .from(workspaceEnvironment)
    .where(eq(workspaceEnvironment.workspaceId, workspaceId))
    .limit(1)
  const variables = row?.variables
  if (!variables || typeof variables !== 'object') return new Set()
  return new Set(Object.keys(variables as Record<string, unknown>))
}

// Shared `{ id, label }` candidate queries for the content resource kinds that BOTH the
// mapping-target picker and the fork-copy picker list - one source of the archived/deleted
// filters so the two pickers can never drift apart, and one optional `ids` filter so the picker
// path (unfiltered, capped) and the existence/label path (exact ids) share a single definition
// per kind. When `ids` is given the query is filtered to those exact ids and is NOT capped, so a
// valid target sitting past the candidate cap is never wrongly dropped. Credentials, env vars
// (mapping-only), and files-with-folder (copy-only) keep their own helpers below.
const tableCandidatesQuery = (
  executor: DbOrTx,
  workspaceId: string,
  ids?: string[],
  page?: { after?: string; limit: number }
) => {
  const query = executor
    .select({ id: userTableDefinitions.id, label: userTableDefinitions.name })
    .from(userTableDefinitions)
    .where(
      and(
        eq(userTableDefinitions.workspaceId, workspaceId),
        isNull(userTableDefinitions.archivedAt),
        page?.after ? gt(userTableDefinitions.id, page.after) : undefined,
        ids ? inArray(userTableDefinitions.id, ids) : undefined
      )
    )
  return page
    ? query.orderBy(asc(userTableDefinitions.id)).limit(page.limit + 1)
    : ids
      ? query
      : query.limit(CANDIDATE_LIMIT)
}

const knowledgeBaseCandidatesQuery = (
  executor: DbOrTx,
  workspaceId: string,
  ids?: string[],
  page?: { after?: string; limit: number }
) => {
  const query = executor
    .select({ id: knowledgeBase.id, label: knowledgeBase.name })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.workspaceId, workspaceId),
        isNull(knowledgeBase.deletedAt),
        page?.after ? gt(knowledgeBase.id, page.after) : undefined,
        ids ? inArray(knowledgeBase.id, ids) : undefined
      )
    )
  return page
    ? query.orderBy(asc(knowledgeBase.id)).limit(page.limit + 1)
    : ids
      ? query
      : query.limit(CANDIDATE_LIMIT)
}

const customToolCandidatesQuery = (
  executor: DbOrTx,
  workspaceId: string,
  ids?: string[],
  page?: { after?: string; limit: number }
) => {
  const query = executor
    .select({ id: customTools.id, label: customTools.title })
    .from(customTools)
    .where(
      and(
        eq(customTools.workspaceId, workspaceId),
        page?.after ? gt(customTools.id, page.after) : undefined,
        ids ? inArray(customTools.id, ids) : undefined
      )
    )
  return page
    ? query.orderBy(asc(customTools.id)).limit(page.limit + 1)
    : ids
      ? query
      : query.limit(CANDIDATE_LIMIT)
}

const skillCandidatesQuery = (
  executor: DbOrTx,
  workspaceId: string,
  ids?: string[],
  page?: { after?: string; limit: number }
) => {
  const query = executor
    .select({ id: skill.id, label: skill.name })
    .from(skill)
    .where(
      and(
        eq(skill.workspaceId, workspaceId),
        page?.after ? gt(skill.id, page.after) : undefined,
        ids ? inArray(skill.id, ids) : undefined
      )
    )
  return page
    ? query.orderBy(asc(skill.id)).limit(page.limit + 1)
    : ids
      ? query
      : query.limit(CANDIDATE_LIMIT)
}

/**
 * Custom-block mapping candidates, keyed by BLOCK TYPE (`custom_block_<slug>`), not
 * `custom_block.id` — a placed block references the type, and every kind keys by whatever
 * the workflow references (`file` by storage key, `env-var` by name).
 *
 * The ONLY candidate query scoped by ORGANIZATION rather than workspace: `custom_block` is
 * keyed `(organization_id, type)` and binds a workflow in the PUBLISHER's workspace, so the
 * blocks a workspace may place are its org's, not its own. A fork inherits its parent's
 * organization, so both sides of an edge see the SAME candidate set — which is exactly why
 * an environment must be told which of them to bind. Two environments' blocks usually share
 * a name, so the label carries the source workspace to make that choice legible.
 *
 * Disabled blocks are excluded: `getCustomBlockAuthority` refuses them at execution, so
 * mapping onto one would produce a block that fails every run with `unavailable`.
 */
const customBlockCandidatesQuery = async (
  executor: DbOrTx,
  workspaceId: string,
  types?: string[]
): Promise<ForkResourceCandidate[]> => {
  const [consumerWorkspace] = await executor
    .select({ organizationId: workspace.organizationId })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1)
  if (!consumerWorkspace?.organizationId) return []

  const sourceWorkspace = alias(workspace, 'custom_block_source_workspace')
  const query = executor
    .select({
      id: customBlock.type,
      name: customBlock.name,
      sourceWorkspaceName: sourceWorkspace.name,
    })
    .from(customBlock)
    .innerJoin(workflow, eq(workflow.id, customBlock.workflowId))
    .leftJoin(sourceWorkspace, eq(sourceWorkspace.id, workflow.workspaceId))
    .where(
      and(
        eq(customBlock.organizationId, consumerWorkspace.organizationId),
        eq(customBlock.enabled, true),
        types ? inArray(customBlock.type, types) : undefined
      )
    )
  const rows = await (types ? query : query.limit(CANDIDATE_LIMIT))
  return rows.map((row) => ({
    id: row.id,
    label: row.sourceWorkspaceName ? `${row.name} (${row.sourceWorkspaceName})` : row.name,
  }))
}

const mcpServerCandidatesQuery = (
  executor: DbOrTx,
  workspaceId: string,
  ids?: string[],
  page?: { after?: string; limit: number }
) => {
  const query = executor
    .select({ id: mcpServers.id, label: mcpServers.name })
    .from(mcpServers)
    .where(
      and(
        eq(mcpServers.workspaceId, workspaceId),
        isNull(mcpServers.deletedAt),
        page?.after ? gt(mcpServers.id, page.after) : undefined,
        ids ? inArray(mcpServers.id, ids) : undefined
      )
    )
  return page
    ? query.orderBy(asc(mcpServers.id)).limit(page.limit + 1)
    : ids
      ? query
      : query.limit(CANDIDATE_LIMIT)
}

// Workspace-file mapping candidates are keyed by STORAGE KEY (not `workspace_files.id`): a
// `file-upload` reference stores the storage key, so a mapping target must be a key too. Only
// durable, non-deleted `workspace` files are mappable (chat/copilot uploads are session-scoped).
// An optional `keys` filter shares this definition between the mapping picker (unfiltered, capped)
// and the cap-free existence check.
const fileCandidatesQuery = (executor: DbOrTx, workspaceId: string, keys?: string[]) => {
  const query = executor
    .select({
      id: workspaceFiles.key,
      label: sql<string>`coalesce(${workspaceFiles.displayName}, ${workspaceFiles.originalName})`,
    })
    .from(workspaceFiles)
    .where(
      and(
        ...activeWorkspaceFileConditions([workspaceId]),
        keys ? inArray(workspaceFiles.key, keys) : undefined
      )
    )
  return keys ? query : query.limit(CANDIDATE_LIMIT)
}

/** Workspace file-folder candidates keyed by their canonical path, matching workflow storage. */
const fileFolderCandidatesQuery = async (
  executor: DbOrTx,
  workspaceId: string,
  paths?: string[]
): Promise<ForkResourceCandidate[]> => {
  const index = await loadActiveFolderPathIndex(workspaceId, 'file', executor, {
    maxRows: MAX_FOLDERS_PER_WORKSPACE,
  })
  const requested = paths ? new Set(paths) : null
  const candidates = [ROOT_FOLDER_PATH, ...index.idByPath.keys()]
    .filter((path) => !requested || requested.has(path))
    .map((path) => ({
      id: path,
      label: path === ROOT_FOLDER_PATH ? 'Workspace root' : parseFolderPath(path).join(' / '),
    }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  if (paths) return candidates
  const root = candidates.find((candidate) => candidate.id === ROOT_FOLDER_PATH)
  const folders = candidates.filter((candidate) => candidate.id !== ROOT_FOLDER_PATH)
  return root ? [root, ...folders.slice(0, CANDIDATE_LIMIT - 1)] : folders.slice(0, CANDIDATE_LIMIT)
}

/**
 * List the resources in a workspace that can serve as mapping targets, grouped by
 * remap kind. Used to populate the mapping UI's target pickers and to label the
 * source resources being mapped. `knowledge-document` is intentionally left empty:
 * documents are not a standalone mappable kind - they are dependent fields of their
 * knowledge base, re-picked in the per-KB reconfigure flow (and auto-remapped when
 * their KB is copied). `file` candidates are keyed by storage key and `file-folder`
 * candidates by canonical path.
 */
async function sandboxCandidatesQuery(executor: DbOrTx, workspaceId: string, ids?: string[]) {
  const query = executor
    .select({ id: workspaceSandbox.id, label: workspaceSandbox.name })
    .from(workspaceSandbox)
    .where(
      and(
        eq(workspaceSandbox.workspaceId, workspaceId),
        ids ? inArray(workspaceSandbox.id, ids) : undefined
      )
    )
  return ids ? query : query.limit(CANDIDATE_LIMIT)
}

/** One live resource, by exact id. `label` is absent for kinds looked up by id only. */
interface ForkResourceRow {
  id: string
  label?: string
}

/**
 * Look up the given ids, grouped by kind, in one workspace and return the rows that still EXIST
 * (same archived/deleted filters as `listForkResourceCandidates`). Queries the exact ids - NOT
 * the capped candidate list - so a resource sitting past `CANDIDATE_LIMIT` is never mistaken for
 * a missing one. Only the DB-backed kinds are checked: env-var existence is handled by the
 * resolver's `targetEnvKeys`, and `workflow` is resolved by another path.
 *
 * Backs both {@link filterExistingForkTargets} (existence) and {@link loadForkResourceLabels}
 * (display names), so the two can never disagree about what "exists" means.
 */
async function loadForkResourceRows(
  executor: DbOrTx,
  workspaceId: string,
  idsByKind: Partial<Record<ForkRemapKind, Set<string>>>
): Promise<Partial<Record<ForkRemapKind, ForkResourceRow[]>>> {
  const ids = (kind: ForkRemapKind): string[] => {
    const set = idsByKind[kind]
    return set && set.size > 0 ? Array.from(set) : []
  }
  const credIds = ids('credential')
  const tableIds = ids('table')
  const kbIds = ids('knowledge-base')
  const docIds = ids('knowledge-document')
  const mcpIds = ids('mcp-server')
  const toolIds = ids('custom-tool')
  const skillIds = ids('skill')
  const customBlockIds = ids('custom-block')
  const sandboxIds = ids('sandbox')
  // Files are identified by storage key (not `workspace_files.id`); a copied file's mapping
  // target is its child storage key, so existence is checked by key in the target workspace.
  const fileKeys = ids('file')
  const fileFolderPaths = ids('file-folder')

  const [
    creds,
    tables,
    kbs,
    docs,
    servers,
    tools,
    skills,
    files,
    fileFolders,
    customBlocks,
    sandboxes,
  ] = await Promise.all([
    credIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : executor
          .select({ id: credential.id, label: credential.displayName })
          .from(credential)
          .where(
            and(
              eq(credential.workspaceId, workspaceId),
              inArray(credential.type, ['oauth', 'service_account']),
              inArray(credential.id, credIds)
            )
          ),
    tableIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : tableCandidatesQuery(executor, workspaceId, tableIds),
    kbIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : knowledgeBaseCandidatesQuery(executor, workspaceId, kbIds),
    // Documents are validated through a KB join (they are not a standalone candidate kind), so
    // this existence check stays inline rather than sharing a per-kind candidate query.
    docIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : executor
          .select({ id: document.id })
          .from(document)
          .innerJoin(knowledgeBase, eq(document.knowledgeBaseId, knowledgeBase.id))
          .where(
            and(
              eq(knowledgeBase.workspaceId, workspaceId),
              isNull(knowledgeBase.deletedAt),
              isNull(document.deletedAt),
              isNull(document.archivedAt),
              inArray(document.id, docIds)
            )
          ),
    mcpIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : mcpServerCandidatesQuery(executor, workspaceId, mcpIds),
    toolIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : customToolCandidatesQuery(executor, workspaceId, toolIds),
    skillIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : skillCandidatesQuery(executor, workspaceId, skillIds),
    fileKeys.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : fileCandidatesQuery(executor, workspaceId, fileKeys),
    fileFolderPaths.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : fileFolderCandidatesQuery(executor, workspaceId, fileFolderPaths),
    customBlockIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : customBlockCandidatesQuery(executor, workspaceId, customBlockIds),
    sandboxIds.length === 0
      ? Promise.resolve([] as ForkResourceRow[])
      : sandboxCandidatesQuery(executor, workspaceId, sandboxIds),
  ])

  const result: Partial<Record<ForkRemapKind, ForkResourceRow[]>> = {}
  if (credIds.length > 0) result.credential = creds
  if (tableIds.length > 0) result.table = tables
  if (kbIds.length > 0) result['knowledge-base'] = kbs
  if (docIds.length > 0) result['knowledge-document'] = docs
  if (mcpIds.length > 0) result['mcp-server'] = servers
  if (toolIds.length > 0) result['custom-tool'] = tools
  if (skillIds.length > 0) result.skill = skills
  if (sandboxIds.length > 0) result.sandbox = sandboxes
  // `fileCandidatesQuery` exposes the storage key under `id`, so file rows key by `r.id`.
  if (fileKeys.length > 0) result.file = files
  if (fileFolderPaths.length > 0) result['file-folder'] = fileFolders
  // Resolved through the workspace's ORGANIZATION, so a block published from a sibling
  // workspace still counts as existing here - which is the normal case for an environment.
  if (customBlockIds.length > 0) result['custom-block'] = customBlocks
  return result
}

/**
 * Given mapped target ids grouped by kind, return the subset that still EXISTS in the target
 * workspace. Used at promote time so a mapping whose target was deleted after it was saved
 * resolves as unmapped (surfaced/cleared) instead of writing a dead id into the promoted
 * workflow, and by the cleared-ref collector pointed at the SOURCE workspace to flag a
 * reference whose resource is gone.
 */
export async function filterExistingForkTargets(
  executor: DbOrTx,
  workspaceId: string,
  idsByKind: Partial<Record<ForkRemapKind, Set<string>>>
): Promise<Partial<Record<ForkRemapKind, Set<string>>>> {
  const rows = await loadForkResourceRows(executor, workspaceId, idsByKind)
  const result: Partial<Record<ForkRemapKind, Set<string>>> = {}
  for (const [kind, kindRows] of Object.entries(rows) as Array<
    [ForkRemapKind, ForkResourceRow[]]
  >) {
    result[kind] = new Set(kindRows.map((row) => row.id))
  }
  return result
}

/**
 * Provider id for each given credential id in a workspace, looked up by exact id (no
 * candidate cap). Presence in the returned map means the credential exists in the
 * workspace, so this doubles as a cap-free existence + provider check for validation.
 */
export async function getCredentialProvidersByIds(
  executor: DbOrTx,
  workspaceId: string,
  ids: string[]
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map()
  const rows = await executor
    .select({ id: credential.id, providerId: credential.providerId })
    .from(credential)
    .where(
      and(
        eq(credential.workspaceId, workspaceId),
        inArray(credential.type, ['oauth', 'service_account']),
        inArray(credential.id, ids)
      )
    )
  return new Map(rows.map((row) => [row.id, row.providerId ?? null]))
}

/** A copyable workspace file plus its folder grouping (null folder = workspace root). */
export interface ForkCopyableFileResource extends ForkResourceCandidate {
  folderId: string | null
  folderName: string | null
}
