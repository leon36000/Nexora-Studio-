import { z } from 'zod'
import { workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

const PROJECT_NAME_MAX_LENGTH = 120
const PROJECT_INSTRUCTIONS_MAX_LENGTH = 8_000
/** A data URL of a file of at most 5 MB (base64 adds a third). */
const PROJECT_FILE_DATA_MAX_LENGTH = 7_200_000

const projectParamsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(128, 'Project ID is too long'),
})

const projectNameSchema = z
  .string()
  .trim()
  .min(1, 'name cannot be empty')
  .max(PROJECT_NAME_MAX_LENGTH, `name cannot exceed ${PROJECT_NAME_MAX_LENGTH} characters`)

const instructionsSchema = z
  .string()
  .max(
    PROJECT_INSTRUCTIONS_MAX_LENGTH,
    `instructions cannot exceed ${PROJECT_INSTRUCTIONS_MAX_LENGTH} characters`
  )

const assistantProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  instructions: z.string(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const assistantProjectSummarySchema = assistantProjectSchema.extend({
  fileCount: z.number().int(),
})

const assistantProjectFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number().int(),
  createdAt: z.string(),
})
export type AssistantProjectFile = z.output<typeof assistantProjectFileSchema>
export type AssistantProjectSummary = z.output<typeof assistantProjectSummarySchema>

/** The error `code` a file the project cannot take answers with (see `AssistantProjectRefusedError`). */
export const ASSISTANT_PROJECT_REFUSAL_CODES = [
  'unsupported',
  'unreadable',
  'empty',
  'too-large',
  'project-full',
] as const

export const listAssistantProjectsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/projects',
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: {
    mode: 'json',
    schema: z.object({ projects: z.array(assistantProjectSummarySchema) }),
  },
})

export const createAssistantProjectContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/projects',
  body: z.object({
    workspaceId: workspaceIdSchema,
    name: projectNameSchema,
    instructions: instructionsSchema.optional(),
  }),
  response: {
    mode: 'json',
    schema: z.object({ project: assistantProjectSchema }),
    status: 201,
  },
})

export const getAssistantProjectContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/projects/[projectId]',
  params: projectParamsSchema,
  response: {
    mode: 'json',
    schema: z.object({
      project: assistantProjectSchema,
      files: z.array(assistantProjectFileSchema),
    }),
  },
})

export const updateAssistantProjectContract = defineRouteContract({
  method: 'PATCH',
  path: '/api/nexora/assistant/projects/[projectId]',
  params: projectParamsSchema,
  body: z
    .object({ name: projectNameSchema.optional(), instructions: instructionsSchema.optional() })
    .refine((body) => body.name !== undefined || body.instructions !== undefined, {
      message: 'name or instructions is required',
    }),
  response: { mode: 'json', schema: z.object({ project: assistantProjectSchema }) },
})

export const deleteAssistantProjectContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/assistant/projects/[projectId]',
  params: projectParamsSchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const addAssistantProjectFileContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/projects/[projectId]/files',
  params: projectParamsSchema,
  body: z.object({
    name: z.string().trim().min(1, 'name is required').max(255, 'name is too long'),
    type: z.string().max(255, 'type is too long'),
    /** The file as a data URL (or base64), at most 5 MB; its text is what the project keeps. */
    data: z
      .string()
      .min(1, 'data is required')
      .max(PROJECT_FILE_DATA_MAX_LENGTH, 'the file is too large'),
  }),
  response: {
    mode: 'json',
    schema: z.object({ file: assistantProjectFileSchema }),
    status: 201,
  },
})

export const deleteAssistantProjectFileContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/assistant/projects/[projectId]/files/[fileId]',
  params: projectParamsSchema.extend({
    fileId: z.string().min(1, 'File ID is required').max(128, 'File ID is too long'),
  }),
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})
