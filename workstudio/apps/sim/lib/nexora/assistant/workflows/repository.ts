import { db } from '@sim/db'
import {
  folder,
  nexoraAssistantWorkflow,
  workflow,
  workflowDeploymentVersion,
} from '@sim/db/schema'
import { and, asc, eq, isNull, notInArray, or } from 'drizzle-orm'
import { AGENTS_FOLDER } from '@/lib/nexora/agents'
import { TASKS_FOLDER } from '@/lib/nexora/assistant/tasks/folder'

const PUBLISHABLE_LIMIT = 300

export interface PublishedWorkflowRow {
  workflowId: string
  name: string
  description: string | null
  /** The active deployment's state, from which the form is read. */
  state: unknown
}

export interface PublishableWorkflowRow {
  workflowId: string
  name: string
  isDeployed: boolean
  published: boolean
}

export interface WorkflowFacts {
  id: string
  workspaceId: string | null
  name: string
  isDeployed: boolean
}

/** The workflows a writer made available, still deployed and not archived, by name. */
export async function listPublishedWorkflows(workspaceId: string): Promise<PublishedWorkflowRow[]> {
  return db
    .select({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      state: workflowDeploymentVersion.state,
    })
    .from(nexoraAssistantWorkflow)
    .innerJoin(workflow, eq(workflow.id, nexoraAssistantWorkflow.workflowId))
    .innerJoin(
      workflowDeploymentVersion,
      and(
        eq(workflowDeploymentVersion.workflowId, workflow.id),
        eq(workflowDeploymentVersion.isActive, true)
      )
    )
    .where(
      and(
        eq(nexoraAssistantWorkflow.workspaceId, workspaceId),
        eq(workflow.workspaceId, workspaceId),
        eq(workflow.isDeployed, true),
        isNull(workflow.archivedAt)
      )
    )
    .orderBy(asc(workflow.name))
}

/**
 * The workspace's workflows a writer may make available, published or not. The agents and the
 * members' scheduled tasks are not workflows to launch by form.
 */
export async function listPublishableWorkflows(
  workspaceId: string
): Promise<PublishableWorkflowRow[]> {
  const rows = await db
    .select({
      workflowId: workflow.id,
      name: workflow.name,
      isDeployed: workflow.isDeployed,
      publishedId: nexoraAssistantWorkflow.workflowId,
      folderName: folder.name,
    })
    .from(workflow)
    .leftJoin(folder, eq(folder.id, workflow.folderId))
    .leftJoin(
      nexoraAssistantWorkflow,
      and(
        eq(nexoraAssistantWorkflow.workflowId, workflow.id),
        eq(nexoraAssistantWorkflow.workspaceId, workspaceId)
      )
    )
    .where(
      and(
        eq(workflow.workspaceId, workspaceId),
        isNull(workflow.archivedAt),
        or(isNull(folder.name), notInArray(folder.name, [AGENTS_FOLDER, TASKS_FOLDER]))
      )
    )
    .orderBy(asc(workflow.name))
    .limit(PUBLISHABLE_LIMIT)
  return rows.map((row) => ({
    workflowId: row.workflowId,
    name: row.name,
    isDeployed: row.isDeployed,
    published: row.publishedId !== null,
  }))
}

export async function loadWorkflowFacts(workflowId: string): Promise<WorkflowFacts | null> {
  const [row] = await db
    .select({
      id: workflow.id,
      workspaceId: workflow.workspaceId,
      name: workflow.name,
      isDeployed: workflow.isDeployed,
    })
    .from(workflow)
    .where(and(eq(workflow.id, workflowId), isNull(workflow.archivedAt)))
    .limit(1)
  return row ?? null
}

export async function publishWorkflow(
  workspaceId: string,
  workflowId: string,
  userId: string
): Promise<void> {
  await db
    .insert(nexoraAssistantWorkflow)
    .values({ workspaceId, workflowId, publishedBy: userId })
    .onConflictDoNothing()
}

export async function unpublishWorkflow(workspaceId: string, workflowId: string): Promise<void> {
  await db
    .delete(nexoraAssistantWorkflow)
    .where(
      and(
        eq(nexoraAssistantWorkflow.workspaceId, workspaceId),
        eq(nexoraAssistantWorkflow.workflowId, workflowId)
      )
    )
}
