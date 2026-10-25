/**
 * The Assistant's extended storage against the disposable TEST_DATABASE_URL database: projects
 * (limits, versions, detaching), scheduled tasks (listing, schedule switch), published workflows,
 * cards in messages, and the lookups that decide whom a tool call acts for. The SQL runs for real.
 */
import { readTestDatabaseUrl } from '@sim/db/testing/test-infrastructure'
import { generateId } from '@sim/utils/id'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveActingMember } from '@/lib/nexora/acting-member'
import {
  addProjectFile,
  deleteProject,
  insertProject,
  listProjectFiles,
  listProjects,
  loadProject,
  loadProjectContext,
  updateProject,
} from '@/lib/nexora/assistant/projects/repository'
import {
  insertConversation,
  insertMessage,
  listMessages,
  updateMessageCard,
} from '@/lib/nexora/assistant/repository'
import {
  deleteTask,
  insertTask,
  listTasks,
  loadSchedule,
  setScheduleEnabled,
} from '@/lib/nexora/assistant/tasks/repository'
import {
  listPublishableWorkflows,
  listPublishedWorkflows,
  publishWorkflow,
  unpublishWorkflow,
} from '@/lib/nexora/assistant/workflows/repository'

const control = postgres(readTestDatabaseUrl(), { max: 2, onnotice: () => {} })

const ownerId = generateId()
const colleagueId = generateId()
const workspaceId = generateId()
const taskWorkflowId = generateId()
const agentWorkflowId = generateId()
const archivedWorkflowId = generateId()
const agentsFolderId = generateId()
const snapshotId = generateId()
const scheduleId = generateId()

describe('Assistant extended storage', () => {
  beforeAll(async () => {
    await control.begin(async (tx) => {
      for (const id of [ownerId, colleagueId]) {
        await tx`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (${id}, 'Test k6', ${`${id}@example.test`}, true, now(), now())`
      }
      await tx`INSERT INTO project (id, name, owner_id) VALUES (${workspaceId}, 'Test k6', ${ownerId})`
      await tx`INSERT INTO workspace (id, project_id, name, owner_id, billed_account_user_id)
        VALUES (${workspaceId}, ${workspaceId}, 'Test k6', ${ownerId}, ${ownerId})`
      await tx`INSERT INTO folder (id, name, user_id, workspace_id, resource_type)
        VALUES (${agentsFolderId}, 'Agents', ${ownerId}, ${workspaceId}, 'workflow')`
      await tx`INSERT INTO workflow (id, user_id, workspace_id, name, is_deployed, created_at, updated_at, last_synced)
        VALUES (${taskWorkflowId}, ${ownerId}, ${workspaceId}, 'Devis client', true, now(), now(), now())`
      await tx`INSERT INTO workflow (id, user_id, workspace_id, folder_id, name, created_at, updated_at, last_synced)
        VALUES (${agentWorkflowId}, ${ownerId}, ${workspaceId}, ${agentsFolderId}, 'Assistant général', now(), now(), now())`
      await tx`INSERT INTO workflow (id, user_id, workspace_id, name, archived_at, created_at, updated_at, last_synced)
        VALUES (${archivedWorkflowId}, ${ownerId}, ${workspaceId}, 'Archivé', now(), now(), now(), now())`
      await tx`INSERT INTO workflow_deployment_version (id, workflow_id, version, state, is_active)
        VALUES (${generateId()}, ${taskWorkflowId}, 1, ${control.json({ blocks: {} })}, true)`
      await tx`INSERT INTO workflow_schedule (id, workflow_id, trigger_type, cron_expression, timezone, status, next_run_at)
        VALUES (${scheduleId}, ${taskWorkflowId}, 'schedule', '0 8 * * *', 'Europe/Paris', 'active', now())`
      await tx`INSERT INTO workflow_execution_snapshots (id, workflow_id, state_hash, state_data)
        VALUES (${snapshotId}, ${taskWorkflowId}, ${generateId()}, ${control.json({})})`
    })
  })

  afterAll(async () => {
    try {
      await control.begin(async (tx) => {
        await tx`DELETE FROM workspace WHERE id = ${workspaceId}`
        await tx`DELETE FROM workflow_execution_snapshots WHERE id = ${snapshotId}`
        await tx`DELETE FROM project WHERE id = ${workspaceId}`
        await tx`DELETE FROM "user" WHERE id IN (${ownerId}, ${colleagueId})`
      })
    } finally {
      await control.end()
    }
  })

  describe('projects', () => {
    it('keeps a project to its author, counts its files and moves its version on with each change', async () => {
      const project = await insertProject({
        workspaceId,
        userId: ownerId,
        name: 'Offre Lyon',
        instructions: 'Vouvoyer.',
      })
      expect(project.version).toBe(1)
      expect((await listProjects(workspaceId, colleagueId)).map((p) => p.id)).not.toContain(
        project.id
      )

      const added = await addProjectFile(project.id, {
        name: 'conditions.txt',
        type: 'text/plain',
        size: 12,
        text: 'Livraison offerte',
      })
      expect(added.status).toBe('added')
      expect((await loadProject(project.id))?.version).toBe(2)
      expect(
        (await listProjects(workspaceId, ownerId)).find((p) => p.id === project.id)
      ).toMatchObject({ fileCount: 1 })

      await updateProject(project.id, { instructions: 'Tutoyer.' })
      expect((await loadProject(project.id))?.version).toBe(3)
      const context = await loadProjectContext(project.id)
      expect(context).toMatchObject({
        version: 3,
        instructions: 'Tutoyer.',
        files: [{ name: 'conditions.txt', text: 'Livraison offerte' }],
      })
    })

    it('refuses an eleventh file and a file that would exceed the text limit', async () => {
      const crowded = await insertProject({
        workspaceId,
        userId: ownerId,
        name: 'Plein',
        instructions: '',
      })
      for (let index = 0; index < 10; index++) {
        const outcome = await addProjectFile(crowded.id, {
          name: `f${index}.txt`,
          type: 'text/plain',
          size: 1,
          text: 'x',
        })
        expect(outcome.status).toBe('added')
      }
      expect(
        (
          await addProjectFile(crowded.id, {
            name: 'de-trop.txt',
            type: 'text/plain',
            size: 1,
            text: 'x',
          })
        ).status
      ).toBe('full')
      expect(await listProjectFiles(crowded.id)).toHaveLength(10)

      const heavy = await insertProject({
        workspaceId,
        userId: ownerId,
        name: 'Lourd',
        instructions: '',
      })
      const big = (name: string, length: number) => ({
        name,
        type: 'text/plain',
        size: length,
        text: 'a'.repeat(length),
      })
      expect((await addProjectFile(heavy.id, big('a.txt', 100_000))).status).toBe('added')
      expect((await addProjectFile(heavy.id, big('b.txt', 100_000))).status).toBe('added')
      expect((await addProjectFile(heavy.id, big('c.txt', 1))).status).toBe('full')
    })

    it('answers gone for a project deleted meanwhile, and detaches the conversations of a deleted one', async () => {
      const project = await insertProject({
        workspaceId,
        userId: ownerId,
        name: 'À supprimer',
        instructions: '',
      })
      const conversation = await insertConversation({
        workspaceId,
        userId: ownerId,
        workflowId: agentWorkflowId,
        title: 'Dans le projet',
        projectId: project.id,
      })
      expect(conversation.projectId).toBe(project.id)

      expect(await deleteProject(project.id)).toBe(true)
      const [row] =
        await control`SELECT project_id FROM nexora_assistant_conversation WHERE id = ${conversation.id}`
      expect(row.project_id).toBeNull()
      expect(await deleteProject(project.id)).toBe(false)
      expect(
        (
          await addProjectFile(project.id, {
            name: 'x.txt',
            type: 'text/plain',
            size: 1,
            text: 'x',
          })
        ).status
      ).toBe('gone')
    })
  })

  describe('scheduled tasks', () => {
    it('lists a member’s tasks with their schedules, and hides a task whose workflow was archived', async () => {
      const task = await insertTask({
        workspaceId,
        userId: ownerId,
        workflowId: taskWorkflowId,
        title: 'Résumé des e-mails',
        request: 'tous les matins à 8 h, résume mes e-mails',
      })
      const archived = await insertTask({
        workspaceId,
        userId: ownerId,
        workflowId: archivedWorkflowId,
        title: 'Archivée',
        request: 'chaque lundi',
      })
      const listed = await listTasks(workspaceId, ownerId)
      expect(listed.map((t) => t.id)).toContain(task.id)
      expect(listed.map((t) => t.id)).not.toContain(archived.id)
      expect(listed.find((t) => t.id === task.id)?.schedule).toMatchObject({
        status: 'active',
        cronExpression: '0 8 * * *',
        timezone: 'Europe/Paris',
      })
      expect(await listTasks(workspaceId, colleagueId)).toEqual([])
    })

    it('turns the schedule off, then on again with a next run in the future', async () => {
      const off = await setScheduleEnabled(taskWorkflowId, false)
      expect(off).toMatchObject({ status: 'disabled', nextRunAt: null })
      const on = await setScheduleEnabled(taskWorkflowId, true)
      expect(on?.status).toBe('active')
      expect(on?.nextRunAt && on.nextRunAt.getTime() > Date.now()).toBe(true)
      expect(await loadSchedule(taskWorkflowId)).toMatchObject({ status: 'active' })
      expect(await setScheduleEnabled(agentWorkflowId, false)).toBeNull()
    })

    it('says whom a tool call acts for: the owner for the planner, nobody for another member', async () => {
      const executionId = generateId()
      await control`INSERT INTO workflow_execution_logs (id, workflow_id, workspace_id, execution_id, state_snapshot_id, level, trigger, started_at)
        VALUES (${generateId()}, ${taskWorkflowId}, ${workspaceId}, ${executionId}, ${snapshotId}, 'info', 'schedule', now())`
      const manual = generateId()
      await control`INSERT INTO workflow_execution_logs (id, workflow_id, workspace_id, execution_id, state_snapshot_id, level, trigger, started_at)
        VALUES (${generateId()}, ${taskWorkflowId}, ${workspaceId}, ${manual}, ${snapshotId}, 'info', 'manual', now())`

      const scheduled = await resolveActingMember({
        executionId,
        workflowId: taskWorkflowId,
        workspaceId,
        actorUserId: colleagueId,
      })
      expect(scheduled).toBe(ownerId)
      const byColleague = await resolveActingMember({
        executionId: manual,
        workflowId: taskWorkflowId,
        workspaceId,
        actorUserId: colleagueId,
      })
      expect(byColleague).toBeNull()
      const byOwner = await resolveActingMember({
        executionId: manual,
        workflowId: taskWorkflowId,
        workspaceId,
        actorUserId: ownerId,
      })
      expect(byOwner).toBe(ownerId)
    })

    it('forgets a task', async () => {
      const [task] = await listTasks(workspaceId, ownerId)
      expect(await deleteTask(task.id)).toBe(true)
      expect(await deleteTask(task.id)).toBe(false)
    })
  })

  describe('published workflows', () => {
    it('offers to publish the workspace’s workflows but not the agents, and lists only what is published and deployed', async () => {
      const publishable = await listPublishableWorkflows(workspaceId)
      expect(publishable.map((w) => w.workflowId)).toContain(taskWorkflowId)
      expect(publishable.map((w) => w.workflowId)).not.toContain(agentWorkflowId)
      expect(publishable.map((w) => w.workflowId)).not.toContain(archivedWorkflowId)
      expect(publishable.find((w) => w.workflowId === taskWorkflowId)).toMatchObject({
        published: false,
        isDeployed: true,
      })
      expect(await listPublishedWorkflows(workspaceId)).toEqual([])

      await publishWorkflow(workspaceId, taskWorkflowId, ownerId)
      await publishWorkflow(workspaceId, taskWorkflowId, ownerId)
      const published = await listPublishedWorkflows(workspaceId)
      expect(published).toMatchObject([{ workflowId: taskWorkflowId, name: 'Devis client' }])
      expect(
        (await listPublishableWorkflows(workspaceId)).find((w) => w.workflowId === taskWorkflowId)
          ?.published
      ).toBe(true)

      await unpublishWorkflow(workspaceId, taskWorkflowId)
      expect(await listPublishedWorkflows(workspaceId)).toEqual([])
    })
  })

  describe('cards in messages', () => {
    it('stores a card with its answer, reads it back, and changes it only as a card of the same kind', async () => {
      const conversation = await insertConversation({
        workspaceId,
        userId: ownerId,
        workflowId: agentWorkflowId,
        title: 'Cartes',
      })
      const payload = {
        workflowId: taskWorkflowId,
        name: 'Devis client',
        executionId: 'execution-1',
        status: 'completed' as const,
        output: 'Devis prêt',
        error: null,
      }
      const stored = await insertMessage(conversation.id, {
        role: 'assistant',
        content: 'Devis client : terminé',
        card: { kind: 'workflow_run', payload },
      })
      expect(stored?.card).toEqual({ kind: 'workflow_run', payload })
      const text = await insertMessage(conversation.id, { role: 'user', content: 'Bonjour' })

      const read = await listMessages(conversation.id)
      expect(read.map((m) => m.card?.kind ?? null)).toEqual(['workflow_run', null])

      const changed = await updateMessageCard(conversation.id, stored?.id ?? '', {
        kind: 'workflow_run',
        payload: { ...payload, output: 'Devis validé' },
      })
      expect(changed?.card?.payload).toMatchObject({ output: 'Devis validé' })
      expect(
        await updateMessageCard(conversation.id, stored?.id ?? '', {
          kind: 'task',
          payload: { taskId: 't', title: 'x', schedule: 'y', request: 'z' },
        })
      ).toBeNull()
      expect(
        await updateMessageCard(conversation.id, text?.id ?? '', { kind: 'workflow_run', payload })
      ).toBeNull()
    })
  })
})
