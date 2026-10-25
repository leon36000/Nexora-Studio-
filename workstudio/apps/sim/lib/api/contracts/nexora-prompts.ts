import { z } from 'zod'
import { nonEmptyIdSchema, workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'
import {
  PROMPT_LABELS,
  PROMPT_SELECTORS,
  PROMPT_VARIABLE_TYPES,
} from '@/lib/nexora/prompts/template'

/** A prompt's text: long enough for detailed instructions, bounded like a skill body. */
const MAX_PROMPT_CONTENT = 50_000
export const MAX_PROMPT_VARIABLES = 50

export const promptNameSchema = z
  .string()
  .trim()
  .min(1, 'A prompt needs a name')
  .max(100, 'A prompt name is at most 100 characters')
export const promptDescriptionSchema = z
  .string()
  .trim()
  .max(500, 'A description is at most 500 characters')
export const promptContentSchema = z
  .string()
  .refine((value) => value.trim().length > 0, 'The prompt text cannot be empty')
  .refine(
    (value) => value.length <= MAX_PROMPT_CONTENT,
    `The prompt text is at most ${MAX_PROMPT_CONTENT} characters`
  )
export const promptNoteSchema = z
  .string()
  .trim()
  .max(500, 'A version note is at most 500 characters')
export const promptLabelSchema = z.enum(PROMPT_LABELS, {
  error: `label: expected one of ${PROMPT_LABELS.map((label) => `"${label}"`).join(' | ')}`,
})
export const promptSelectorSchema = z.enum(PROMPT_SELECTORS)

export const promptVariableSchema = z
  .object({
    name: z
      .string()
      .regex(
        /^[A-Za-z_][A-Za-z0-9_]*$/,
        'A variable name is letters, digits and underscores, not starting with a digit'
      )
      .max(64),
    type: z.enum(PROMPT_VARIABLE_TYPES),
    description: z.string().trim().max(300).optional(),
    defaultValue: z.string().max(2000).optional(),
  })
  .strict()
export const promptVariablesSchema = z
  .array(promptVariableSchema)
  .max(MAX_PROMPT_VARIABLES, `At most ${MAX_PROMPT_VARIABLES} variables`)

const promptLabelsSchema = z.object({
  production: z.number().int().nullable(),
  test: z.number().int().nullable(),
})

const promptSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  labels: promptLabelsSchema,
  latestVersion: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type NexoraPromptSummary = z.output<typeof promptSummarySchema>

const promptVersionSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  content: z.string(),
  variables: z.array(promptVariableSchema),
  note: z.string(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
})
export type NexoraPromptVersion = z.output<typeof promptVersionSchema>

const promptDetailSchema = promptSummarySchema.extend({ versions: z.array(promptVersionSchema) })
export type NexoraPromptDetail = z.output<typeof promptDetailSchema>

const workspaceQuerySchema = z.object({ workspaceId: workspaceIdSchema })
const promptParamsSchema = z.object({ promptId: nonEmptyIdSchema })

const versionBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  content: promptContentSchema,
  variables: promptVariablesSchema.default([]),
  note: promptNoteSchema.default(''),
})

const createPromptBodySchema = versionBodySchema.extend({
  name: promptNameSchema,
  description: promptDescriptionSchema.default(''),
})
export type CreateNexoraPromptBody = z.input<typeof createPromptBodySchema>
export type CreateNexoraPromptVersionBody = z.input<typeof versionBodySchema>

const moveLabelBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  label: promptLabelSchema,
  version: z.number().int().min(1),
})

export const listNexoraPromptsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/prompts',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ prompts: z.array(promptSummarySchema) }) },
})

export const createNexoraPromptContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/prompts',
  body: createPromptBodySchema,
  response: { mode: 'json', schema: z.object({ prompt: promptSummarySchema }) },
})

export const getNexoraPromptContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/prompts/[promptId]',
  params: promptParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ prompt: promptDetailSchema }) },
})

export const deleteNexoraPromptContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/prompts/[promptId]',
  params: promptParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const createNexoraPromptVersionContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/prompts/[promptId]/versions',
  params: promptParamsSchema,
  body: versionBodySchema,
  response: {
    mode: 'json',
    schema: z.object({ prompt: promptSummarySchema, version: promptVersionSchema }),
  },
})

export const moveNexoraPromptLabelContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/prompts/[promptId]/labels',
  params: promptParamsSchema,
  body: moveLabelBodySchema,
  response: { mode: 'json', schema: z.object({ prompt: promptSummarySchema }) },
})
