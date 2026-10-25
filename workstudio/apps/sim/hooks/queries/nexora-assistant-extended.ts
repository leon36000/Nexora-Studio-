'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import {
  ASSISTANT_TASK_ERROR_CODES,
  createAssistantTaskContract,
  deleteAssistantTaskContract,
  listAssistantTaskRunsContract,
  listAssistantTasksContract,
  listAssistantWorkflowsContract,
  listPublishableAssistantWorkflowsContract,
  planAssistantTaskContract,
  publishAssistantWorkflowContract,
  setAssistantTaskEnabledContract,
  unpublishAssistantWorkflowContract,
} from '@/lib/api/contracts/nexora-assistant-extras'
import {
  ASSISTANT_PROJECT_REFUSAL_CODES,
  addAssistantProjectFileContract,
  createAssistantProjectContract,
  deleteAssistantProjectContract,
  deleteAssistantProjectFileContract,
  getAssistantProjectContract,
  listAssistantProjectsContract,
  updateAssistantProjectContract,
} from '@/lib/api/contracts/nexora-assistant-projects'
import { getWorkspacePermissionsContract } from '@/lib/api/contracts/workspaces'
import { readRunResult } from '@/lib/nexora/assistant/workflow-run'
import type { CopilotPlan } from '@/lib/nexora/copilot/plan'

const ASSISTANT_PROJECTS_STALE_TIME = 30 * 1000
const ASSISTANT_TASKS_STALE_TIME = 30 * 1000
const ASSISTANT_TASK_RUNS_STALE_TIME = 15 * 1000
const ASSISTANT_WORKFLOWS_STALE_TIME = 30 * 1000
const ASSISTANT_PERMISSION_STALE_TIME = 60 * 1000

const extendedKeys = {
  all: ['nexora-assistant-extended'] as const,
  projectLists: () => [...extendedKeys.all, 'projects'] as const,
  projects: (workspaceId?: string) => [...extendedKeys.projectLists(), workspaceId ?? ''] as const,
  projectDetails: () => [...extendedKeys.all, 'project'] as const,
  project: (projectId?: string) => [...extendedKeys.projectDetails(), projectId ?? ''] as const,
  permission: (workspaceId?: string) =>
    [...extendedKeys.all, 'permission', workspaceId ?? ''] as const,
  taskLists: () => [...extendedKeys.all, 'tasks'] as const,
  tasks: (workspaceId?: string) => [...extendedKeys.taskLists(), workspaceId ?? ''] as const,
  taskRuns: (taskId?: string) => [...extendedKeys.all, 'task-runs', taskId ?? ''] as const,
  workflowLists: () => [...extendedKeys.all, 'workflows'] as const,
  workflows: (workspaceId?: string) =>
    [...extendedKeys.workflowLists(), 'published', workspaceId ?? ''] as const,
  publishable: (workspaceId?: string) =>
    [...extendedKeys.workflowLists(), 'publishable', workspaceId ?? ''] as const,
}

type ProjectRefusalCode = (typeof ASSISTANT_PROJECT_REFUSAL_CODES)[number]
type TaskErrorCode = (typeof ASSISTANT_TASK_ERROR_CODES)[number] | CopilotPlanErrorCode
type CopilotPlanErrorCode = 'plan-invalid' | 'rejected' | 'unavailable'

const COPILOT_PLAN_ERROR_CODES: readonly CopilotPlanErrorCode[] = [
  'plan-invalid',
  'rejected',
  'unavailable',
]

/** Why a project could not take a file, when the server named a reason. */
export function getProjectRefusalCode(error: unknown): ProjectRefusalCode | null {
  if (!isApiClientError(error)) return null
  return ASSISTANT_PROJECT_REFUSAL_CODES.find((code) => code === error.code) ?? null
}

/** Why a task could not be planned or created, when the server named a reason. */
export function getTaskErrorCode(error: unknown): TaskErrorCode | null {
  if (!isApiClientError(error)) return null
  return (
    ASSISTANT_TASK_ERROR_CODES.find((code) => code === error.code) ??
    COPILOT_PLAN_ERROR_CODES.find((code) => code === error.code) ??
    null
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Whether the signed-in member can write in the workspace (schedule tasks, answer validations,
 * manage published workflows). Reads the permission the server resolved for the viewer; `false`
 * until it is known.
 */
export function useAssistantCanEdit(workspaceId?: string): boolean {
  const { data } = useQuery({
    queryKey: extendedKeys.permission(workspaceId),
    queryFn: async ({ signal }) => {
      const permissions = await requestJson(getWorkspacePermissionsContract, {
        params: { id: workspaceId as string },
        signal,
      })
      const permission = permissions.viewer?.permissionType
      return permission === 'write' || permission === 'admin'
    },
    enabled: Boolean(workspaceId),
    staleTime: ASSISTANT_PERMISSION_STALE_TIME,
  })
  return data === true
}

/** The caller's own projects in the workspace, most recently changed first. */
export function useAssistantProjects(workspaceId?: string) {
  return useQuery({
    queryKey: extendedKeys.projects(workspaceId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listAssistantProjectsContract, {
        query: { workspaceId: workspaceId as string },
        signal,
      })
      return data.projects
    },
    enabled: Boolean(workspaceId),
    staleTime: ASSISTANT_PROJECTS_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

/** One project with its files. */
export function useAssistantProject(projectId?: string) {
  return useQuery({
    queryKey: extendedKeys.project(projectId),
    queryFn: ({ signal }) =>
      requestJson(getAssistantProjectContract, {
        params: { projectId: projectId as string },
        signal,
      }),
    enabled: Boolean(projectId),
    staleTime: ASSISTANT_PROJECTS_STALE_TIME,
  })
}

export function useCreateAssistantProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { workspaceId: string; name: string; instructions?: string }) => {
      const data = await requestJson(createAssistantProjectContract, { body })
      return data.project
    },
    onSuccess: (project) =>
      queryClient.invalidateQueries({ queryKey: extendedKeys.projects(project.workspaceId) }),
  })
}

export function useUpdateAssistantProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      projectId,
      ...body
    }: {
      projectId: string
      name?: string
      instructions?: string
    }) => {
      const data = await requestJson(updateAssistantProjectContract, {
        params: { projectId },
        body,
      })
      return data.project
    },
    onSuccess: (project) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: extendedKeys.projects(project.workspaceId) }),
        queryClient.invalidateQueries({ queryKey: extendedKeys.project(project.id) }),
      ]),
  })
}

export function useDeleteAssistantProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) =>
      requestJson(deleteAssistantProjectContract, { params: { projectId } }),
    onSuccess: (_data, projectId) => {
      queryClient.removeQueries({ queryKey: extendedKeys.project(projectId) })
      return queryClient.invalidateQueries({ queryKey: extendedKeys.projectLists() })
    },
  })
}

/** Reads the file in the browser and sends it; the project keeps its text, not the file. */
export function useAddAssistantProjectFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const data = await readAsDataUrl(file)
      const created = await requestJson(addAssistantProjectFileContract, {
        params: { projectId },
        body: { name: file.name, type: file.type, data },
      })
      return created.file
    },
    onSuccess: (_file, { projectId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: extendedKeys.project(projectId) }),
        queryClient.invalidateQueries({ queryKey: extendedKeys.projectLists() }),
      ]),
  })
}

export function useDeleteAssistantProjectFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, fileId }: { projectId: string; fileId: string }) =>
      requestJson(deleteAssistantProjectFileContract, { params: { projectId, fileId } }),
    onSuccess: (_data, { projectId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: extendedKeys.project(projectId) }),
        queryClient.invalidateQueries({ queryKey: extendedKeys.projectLists() }),
      ]),
  })
}

/** The caller's own scheduled tasks, newest first, with their schedules. */
export function useAssistantTasks(workspaceId?: string, enabled = true) {
  return useQuery({
    queryKey: extendedKeys.tasks(workspaceId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listAssistantTasksContract, {
        query: { workspaceId: workspaceId as string },
        signal,
      })
      return data.tasks
    },
    enabled: Boolean(workspaceId) && enabled,
    staleTime: ASSISTANT_TASKS_STALE_TIME,
  })
}

/** A task's last runs with their results. */
export function useAssistantTaskRuns(taskId?: string) {
  return useQuery({
    queryKey: extendedKeys.taskRuns(taskId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listAssistantTaskRunsContract, {
        params: { taskId: taskId as string },
        signal,
      })
      return data.runs
    },
    enabled: Boolean(taskId),
    staleTime: ASSISTANT_TASK_RUNS_STALE_TIME,
  })
}

/** Drafts a task's plan from what the member said; nothing is created. */
export function usePlanAssistantTask() {
  return useMutation({
    mutationFn: ({
      workspaceId,
      request,
      signal,
    }: {
      workspaceId: string
      request: string
      signal?: AbortSignal
    }) => requestJson(planAssistantTaskContract, { body: { workspaceId, request }, signal }),
  })
}

export function useCreateAssistantTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { workspaceId: string; request: string; plan: CopilotPlan }) =>
      requestJson(createAssistantTaskContract, { body }),
    onSuccess: (_data, { workspaceId }) =>
      queryClient.invalidateQueries({ queryKey: extendedKeys.tasks(workspaceId) }),
  })
}

export function useSetAssistantTaskEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, enabled }: { taskId: string; enabled: boolean }) => {
      const data = await requestJson(setAssistantTaskEnabledContract, {
        params: { taskId },
        body: { enabled },
      })
      return data.task
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: extendedKeys.taskLists() }),
  })
}

export function useDeleteAssistantTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      requestJson(deleteAssistantTaskContract, { params: { taskId } }),
    onSuccess: (_data, taskId) => {
      queryClient.removeQueries({ queryKey: extendedKeys.taskRuns(taskId) })
      return queryClient.invalidateQueries({ queryKey: extendedKeys.taskLists() })
    },
  })
}

/** The workflows a writer published for the Assistant, with their forms. */
export function useAssistantWorkflows(workspaceId?: string, enabled = true) {
  return useQuery({
    queryKey: extendedKeys.workflows(workspaceId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listAssistantWorkflowsContract, {
        query: { workspaceId: workspaceId as string },
        signal,
      })
      return data.workflows
    },
    enabled: Boolean(workspaceId) && enabled,
    staleTime: ASSISTANT_WORKFLOWS_STALE_TIME,
  })
}

/** What a writer may publish (writers only: the server refuses anyone else). */
export function usePublishableAssistantWorkflows(workspaceId?: string, enabled = true) {
  return useQuery({
    queryKey: extendedKeys.publishable(workspaceId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listPublishableAssistantWorkflowsContract, {
        query: { workspaceId: workspaceId as string },
        signal,
      })
      return data.workflows
    },
    enabled: Boolean(workspaceId) && enabled,
    staleTime: ASSISTANT_WORKFLOWS_STALE_TIME,
  })
}

/** Publishes (deploying first when needed) or withdraws a workflow for the Assistant. */
export function useSetAssistantWorkflowPublished() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId,
      workflowId,
      published,
    }: {
      workspaceId: string
      workflowId: string
      published: boolean
    }) =>
      published
        ? requestJson(publishAssistantWorkflowContract, {
            params: { workflowId },
            body: { workspaceId },
          })
        : requestJson(unpublishAssistantWorkflowContract, {
            params: { workflowId },
            query: { workspaceId },
          }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: extendedKeys.workflowLists() }),
  })
}

/** Answers the validation a paused run waits for, on the resume address the run itself gave. */
export function useResumeAssistantWorkflow() {
  return useMutation({
    mutationFn: async ({
      resumePath,
      submission,
      signal,
    }: {
      resumePath: string
      submission: { input: { submission: Record<string, unknown> } }
      signal?: AbortSignal
    }) => {
      // boundary-raw-fetch: the resume API takes a free-form body that its contract does not describe
      const response = await fetch(resumePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
        signal,
      })
      const payload: unknown = await response.json().catch(() => null)
      const record =
        typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
      if (!response.ok) {
        throw new Error(typeof record.error === 'string' ? record.error : 'The answer was refused')
      }
      return readRunResult({
        success: record.success !== false,
        executionId: typeof record.executionId === 'string' ? record.executionId : undefined,
        output: record.output,
        error: typeof record.error === 'string' ? record.error : undefined,
      })
    },
  })
}
