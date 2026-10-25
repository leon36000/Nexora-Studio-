import { db } from '@sim/db'
import {
  nexoraAssistantConversation,
  nexoraAssistantProject,
  nexoraAssistantProjectFile,
} from '@sim/db/schema'
import { generateId } from '@sim/utils/id'
import { and, asc, count, desc, eq, sql } from 'drizzle-orm'

/** A project holds at most this many files and this much text altogether. */
export const PROJECT_MAX_FILES = 10
export const PROJECT_MAX_TEXT_CHARS = 200_000
const PROJECT_LIST_LIMIT = 100

export interface ProjectRecord {
  id: string
  workspaceId: string
  userId: string
  name: string
  instructions: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSummary extends ProjectRecord {
  fileCount: number
}

export interface ProjectFileRecord {
  id: string
  projectId: string
  name: string
  type: string
  size: number
  createdAt: Date
}

/** What a conversation of the project shares with the agent. */
export interface ProjectContext {
  version: number
  instructions: string
  files: { name: string; text: string }[]
}

const projectColumns = {
  id: nexoraAssistantProject.id,
  workspaceId: nexoraAssistantProject.workspaceId,
  userId: nexoraAssistantProject.userId,
  name: nexoraAssistantProject.name,
  instructions: nexoraAssistantProject.instructions,
  version: nexoraAssistantProject.version,
  createdAt: nexoraAssistantProject.createdAt,
  updatedAt: nexoraAssistantProject.updatedAt,
}

const fileColumns = {
  id: nexoraAssistantProjectFile.id,
  projectId: nexoraAssistantProjectFile.projectId,
  name: nexoraAssistantProjectFile.name,
  type: nexoraAssistantProjectFile.type,
  size: nexoraAssistantProjectFile.size,
  createdAt: nexoraAssistantProjectFile.createdAt,
}

export async function loadProject(projectId: string): Promise<ProjectRecord | null> {
  const [row] = await db
    .select(projectColumns)
    .from(nexoraAssistantProject)
    .where(eq(nexoraAssistantProject.id, projectId))
    .limit(1)
  return row ?? null
}

/** One member's projects of one workspace, most recently changed first, with their file counts. */
export async function listProjects(
  workspaceId: string,
  userId: string
): Promise<ProjectSummary[]> {
  const rows = await db
    .select({
      ...projectColumns,
      fileCount: sql<number>`(select count(*)::int from ${nexoraAssistantProjectFile} where ${nexoraAssistantProjectFile.projectId} = ${nexoraAssistantProject.id})`,
    })
    .from(nexoraAssistantProject)
    .where(
      and(
        eq(nexoraAssistantProject.workspaceId, workspaceId),
        eq(nexoraAssistantProject.userId, userId)
      )
    )
    .orderBy(desc(nexoraAssistantProject.updatedAt))
    .limit(PROJECT_LIST_LIMIT)
  return rows
}

export async function insertProject(values: {
  workspaceId: string
  userId: string
  name: string
  instructions: string
}): Promise<ProjectRecord> {
  const now = new Date()
  const [row] = await db
    .insert(nexoraAssistantProject)
    .values({ id: generateId(), ...values, version: 1, createdAt: now, updatedAt: now })
    .returning(projectColumns)
  if (!row) throw new Error('Failed to create the Assistant project')
  return row
}

/** `null` when the project no longer exists. A change of text moves the version on. */
export async function updateProject(
  projectId: string,
  changes: { name?: string; instructions?: string }
): Promise<ProjectRecord | null> {
  const [row] = await db
    .update(nexoraAssistantProject)
    .set({
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.instructions === undefined ? {} : { instructions: changes.instructions }),
      version: sql`${nexoraAssistantProject.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(nexoraAssistantProject.id, projectId))
    .returning(projectColumns)
  return row ?? null
}

/** The project's files go with it; its conversations stay, detached. `false` when it is gone. */
export async function deleteProject(projectId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx
      .update(nexoraAssistantConversation)
      .set({ projectId: null, projectVersion: null })
      .where(eq(nexoraAssistantConversation.projectId, projectId))
    const deleted = await tx
      .delete(nexoraAssistantProject)
      .where(eq(nexoraAssistantProject.id, projectId))
      .returning({ id: nexoraAssistantProject.id })
    return deleted.length > 0
  })
}

export async function listProjectFiles(projectId: string): Promise<ProjectFileRecord[]> {
  return db
    .select(fileColumns)
    .from(nexoraAssistantProjectFile)
    .where(eq(nexoraAssistantProjectFile.projectId, projectId))
    .orderBy(asc(nexoraAssistantProjectFile.createdAt))
}

export type AddProjectFileOutcome =
  | { status: 'added'; file: ProjectFileRecord }
  | { status: 'full' }
  | { status: 'gone' }

/**
 * Adds a file unless the project is full (too many files, or too much text altogether), and
 * moves the project's version on, atomically: the project row is locked so two additions cannot
 * both pass the limit.
 */
export async function addProjectFile(
  projectId: string,
  file: { name: string; type: string; size: number; text: string }
): Promise<AddProjectFileOutcome> {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: nexoraAssistantProject.id })
      .from(nexoraAssistantProject)
      .where(eq(nexoraAssistantProject.id, projectId))
      .for('update')
    if (!locked) return { status: 'gone' }
    const [totals] = await tx
      .select({
        files: count(),
        chars: sql<number>`coalesce(sum(length(${nexoraAssistantProjectFile.text})), 0)::int`,
      })
      .from(nexoraAssistantProjectFile)
      .where(eq(nexoraAssistantProjectFile.projectId, projectId))
    if (
      (totals?.files ?? 0) >= PROJECT_MAX_FILES ||
      (totals?.chars ?? 0) + file.text.length > PROJECT_MAX_TEXT_CHARS
    ) {
      return { status: 'full' }
    }
    const [row] = await tx
      .insert(nexoraAssistantProjectFile)
      .values({ id: generateId(), projectId, ...file })
      .returning(fileColumns)
    if (!row) throw new Error('Failed to store the project file')
    await tx
      .update(nexoraAssistantProject)
      .set({ version: sql`${nexoraAssistantProject.version} + 1`, updatedAt: new Date() })
      .where(eq(nexoraAssistantProject.id, projectId))
    return { status: 'added', file: row }
  })
}

/** `false` when the file is not (or no longer) one of the project's. */
export async function deleteProjectFile(projectId: string, fileId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(nexoraAssistantProjectFile)
      .where(
        and(
          eq(nexoraAssistantProjectFile.id, fileId),
          eq(nexoraAssistantProjectFile.projectId, projectId)
        )
      )
      .returning({ id: nexoraAssistantProjectFile.id })
    if (deleted.length === 0) return false
    await tx
      .update(nexoraAssistantProject)
      .set({ version: sql`${nexoraAssistantProject.version} + 1`, updatedAt: new Date() })
      .where(eq(nexoraAssistantProject.id, projectId))
    return true
  })
}

/** The instructions and file texts a project shares, with the version they are at. */
export async function loadProjectContext(projectId: string): Promise<ProjectContext | null> {
  const project = await loadProject(projectId)
  if (!project) return null
  const files = await db
    .select({ name: nexoraAssistantProjectFile.name, text: nexoraAssistantProjectFile.text })
    .from(nexoraAssistantProjectFile)
    .where(eq(nexoraAssistantProjectFile.projectId, projectId))
    .orderBy(asc(nexoraAssistantProjectFile.createdAt))
  return { version: project.version, instructions: project.instructions, files }
}
