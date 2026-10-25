/**
 * Failure modes owned here (the Assistant's private-project boundary):
 * - another member's project is answered as not found, before the workspace is authorized and
 *   before anything is read, written or deleted (read, update, delete, add and remove a file);
 * - a file the project cannot take (unreadable, too large, or the project is full) is refused
 *   with a reason, and nothing is stored;
 * - a workspace the caller has no access to is refused as forbidden;
 * - a project belongs to the member who creates it, in the workspace they name.
 */

import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  loadProject: vi.fn(),
  listProjects: vi.fn(),
  insertProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  listProjectFiles: vi.fn(),
  addProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
}))
const fileText = vi.hoisted(() => ({ readProjectFile: vi.fn() }))

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/assistant/projects/repository', () => repository)
vi.mock('@/lib/nexora/assistant/projects/file-text', () => fileText)

import { OrchestrationError } from '@/lib/core/orchestration/types'
import {
  AssistantProjectRefusedError,
  addAssistantProjectFile,
  createAssistantProject,
  deleteAssistantProject,
  deleteAssistantProjectFile,
  getAssistantProject,
  listAssistantProjects,
  updateAssistantProject,
} from '@/lib/nexora/assistant/projects/use-cases'

const WORKSPACE_ID = 'workspace-1'
const owner = createSessionPrincipal({ userId: 'owner', sessionId: 'session-owner' })
const colleague = createSessionPrincipal({ userId: 'colleague', sessionId: 'session-colleague' })

const projectRow = {
  id: 'project-1',
  workspaceId: WORKSPACE_ID,
  userId: 'owner',
  name: 'Offre Lyon',
  instructions: 'Toujours vouvoyer.',
  version: 3,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-01T10:05:00.000Z'),
}

beforeEach(() => {
  workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
  repository.loadProject.mockResolvedValue(projectRow)
  repository.listProjectFiles.mockResolvedValue([])
})

describe('project ownership', () => {
  const attempts: [string, () => Promise<unknown>][] = [
    [
      'read',
      () =>
        getAssistantProject.execute({ principal: colleague, input: { projectId: 'project-1' } }),
    ],
    [
      'update',
      () =>
        updateAssistantProject.execute({
          principal: colleague,
          input: { projectId: 'project-1', instructions: 'Volé' },
        }),
    ],
    [
      'delete',
      () =>
        deleteAssistantProject.execute({ principal: colleague, input: { projectId: 'project-1' } }),
    ],
    [
      'add a file',
      () =>
        addAssistantProjectFile.execute({
          principal: colleague,
          input: {
            projectId: 'project-1',
            file: { name: 'a.txt', type: 'text/plain', data: 'YQ==' },
          },
        }),
    ],
    [
      'remove a file',
      () =>
        deleteAssistantProjectFile.execute({
          principal: colleague,
          input: { projectId: 'project-1', fileId: 'file-1' },
        }),
    ],
  ]

  it.each(attempts)(
    'answers not found to another member who tries to %s',
    async (_name, attempt) => {
      await expect(attempt()).rejects.toMatchObject({ code: 'not_found' })
      expect(workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission).not.toHaveBeenCalled()
      expect(repository.updateProject).not.toHaveBeenCalled()
      expect(repository.deleteProject).not.toHaveBeenCalled()
      expect(repository.addProjectFile).not.toHaveBeenCalled()
      expect(repository.deleteProjectFile).not.toHaveBeenCalled()
      expect(fileText.readProjectFile).not.toHaveBeenCalled()
    }
  )

  it('answers not found for a project that does not exist', async () => {
    repository.loadProject.mockResolvedValue(null)
    await expect(
      getAssistantProject.execute({ principal: owner, input: { projectId: 'missing' } })
    ).rejects.toBeInstanceOf(OrchestrationError)
  })
})

describe('project use cases', () => {
  it('lists only the caller’s projects of the workspace', async () => {
    repository.listProjects.mockResolvedValue([{ ...projectRow, fileCount: 2 }])
    const { projects } = await listAssistantProjects.execute({
      principal: owner,
      input: { workspaceId: WORKSPACE_ID },
    })
    expect(repository.listProjects).toHaveBeenCalledWith(WORKSPACE_ID, 'owner')
    expect(projects).toHaveLength(1)
  })

  it('refuses a workspace the caller cannot reach', async () => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue(null)
    await expect(
      listAssistantProjects.execute({ principal: owner, input: { workspaceId: WORKSPACE_ID } })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(repository.listProjects).not.toHaveBeenCalled()
  })

  it('creates a project for the caller, in the named workspace', async () => {
    repository.insertProject.mockResolvedValue(projectRow)
    await createAssistantProject.execute({
      principal: owner,
      input: { workspaceId: WORKSPACE_ID, name: 'Offre Lyon', instructions: 'Toujours vouvoyer.' },
    })
    expect(repository.insertProject).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      userId: 'owner',
      name: 'Offre Lyon',
      instructions: 'Toujours vouvoyer.',
    })
  })

  it('reads the project with its files', async () => {
    repository.listProjectFiles.mockResolvedValue([{ id: 'file-1', name: 'a.txt' }])
    const { project, files } = await getAssistantProject.execute({
      principal: owner,
      input: { projectId: 'project-1' },
    })
    expect(project.id).toBe('project-1')
    expect(files).toEqual([{ id: 'file-1', name: 'a.txt' }])
  })
})

describe('project files', () => {
  const input = {
    projectId: 'project-1',
    file: { name: 'conditions.txt', type: 'text/plain', data: 'YQ==' },
  }

  it('stores the text of a readable file', async () => {
    fileText.readProjectFile.mockResolvedValue({ ok: true, text: 'Livraison offerte', size: 17 })
    repository.addProjectFile.mockResolvedValue({
      status: 'added',
      file: { id: 'file-1', projectId: 'project-1', name: 'conditions.txt' },
    })
    await addAssistantProjectFile.execute({ principal: owner, input })
    expect(repository.addProjectFile).toHaveBeenCalledWith('project-1', {
      name: 'conditions.txt',
      type: 'text/plain',
      size: 17,
      text: 'Livraison offerte',
    })
  })

  it.each(['unsupported', 'unreadable', 'empty', 'too-large'])(
    'refuses a %s file with its reason and stores nothing',
    async (reason) => {
      fileText.readProjectFile.mockResolvedValue({ ok: false, reason })
      await expect(
        addAssistantProjectFile.execute({ principal: owner, input })
      ).rejects.toMatchObject({
        reason,
      })
      expect(repository.addProjectFile).not.toHaveBeenCalled()
    }
  )

  it('refuses a file when the project is full', async () => {
    fileText.readProjectFile.mockResolvedValue({ ok: true, text: 'x', size: 1 })
    repository.addProjectFile.mockResolvedValue({ status: 'full' })
    const refusal = await addAssistantProjectFile
      .execute({ principal: owner, input })
      .catch((error: unknown) => error)
    expect(refusal).toBeInstanceOf(AssistantProjectRefusedError)
    expect(refusal).toMatchObject({ reason: 'project-full' })
  })

  it('answers not found when the project disappeared while the file was read', async () => {
    fileText.readProjectFile.mockResolvedValue({ ok: true, text: 'x', size: 1 })
    repository.addProjectFile.mockResolvedValue({ status: 'gone' })
    await expect(
      addAssistantProjectFile.execute({ principal: owner, input })
    ).rejects.toMatchObject({
      code: 'not_found',
    })
  })
})
