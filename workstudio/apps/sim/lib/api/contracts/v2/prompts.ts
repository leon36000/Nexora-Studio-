import { z } from 'zod'
import {
  MAX_PROMPT_VARIABLES,
  promptContentSchema,
  promptDescriptionSchema,
  promptLabelSchema,
  promptNameSchema,
  promptNoteSchema,
  promptVariableSchema,
} from '@/lib/api/contracts/nexora-prompts'
import {
  noInputSchema,
  nonEmptyIdSchema,
  withMissingFieldMessage,
  workspaceIdSchema,
} from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'
import {
  v2CursorListResponse,
  v2DataResponse,
  v2PaginationFields,
  v2SearchSchema,
  v2SortFields,
  v2TimestampSchema,
} from '@/lib/api/contracts/v2/shared'

/**
 * v2 prompt contracts (Nexora edition).
 *
 * A prompt is versioned text with typed `{{variables}}`; the `production` and `test` labels each
 * point at one version, and agents that use a label read it at run time. The list returns
 * summaries; one prompt is read with the version a label points at, a given version, or
 * `production` when neither is asked. Field validation is the internal contract's own, so both
 * surfaces accept exactly the same prompt. Moving a label stays in the interface.
 */

const v2PromptVariableSchema = z
  .object({
    name: promptVariableSchema.shape.name.describe('Name used in the text as `{{name}}`.'),
    type: promptVariableSchema.shape.type.describe(
      'Expected value: `text`, `number` (a decimal comma is accepted) or `boolean` (written `oui` or `non`).'
    ),
    description: promptVariableSchema.shape.description.describe('What the value is for.'),
    defaultValue: promptVariableSchema.shape.defaultValue.describe(
      'Value used when an agent gives none.'
    ),
  })
  .strict()
  .describe('A `{{name}}` placeholder of the text.')

const v2PromptVariablesSchema = z
  .array(v2PromptVariableSchema)
  .max(MAX_PROMPT_VARIABLES, `At most ${MAX_PROMPT_VARIABLES} variables`)

const v2PromptLabelsSchema = z
  .object({
    production: z
      .number()
      .int()
      .nullable()
      .describe('Version the `production` label points at, or `null`.'),
    test: z.number().int().nullable().describe('Version the `test` label points at, or `null`.'),
  })
  .describe('Where each label points.')

export const v2PromptSummarySchema = z
  .object({
    id: z.string().describe('Unique prompt identifier.'),
    name: z.string().describe('Name, unique within the workspace regardless of case.'),
    description: z.string().describe('What the prompt is for.'),
    labels: v2PromptLabelsSchema,
    latestVersion: z.number().int().describe('Number of the most recent version.'),
    createdAt: v2TimestampSchema.describe('ISO 8601 timestamp when the prompt was created.'),
    updatedAt: v2TimestampSchema.describe(
      'ISO 8601 timestamp of the last new version or label move.'
    ),
  })
  .meta({
    id: 'V2PromptSummary',
    title: 'Prompt summary',
    description: 'A versioned workspace prompt, without its text.',
  })
export type V2PromptSummary = z.output<typeof v2PromptSummarySchema>

export const v2PromptSchema = v2PromptSummarySchema
  .extend({
    version: z
      .object({
        number: z.number().int().describe('Version number, from 1.'),
        content: z.string().describe('Text of the version, with its `{{variables}}`.'),
        variables: z.array(v2PromptVariableSchema).describe('Variables the text uses.'),
        note: z.string().describe('What changed in this version.'),
        createdAt: v2TimestampSchema.describe('ISO 8601 timestamp when the version was saved.'),
      })
      .describe('The version selected by the request.'),
  })
  .meta({
    id: 'V2Prompt',
    title: 'Prompt',
    description: 'A versioned workspace prompt with the text of one of its versions.',
  })
export type V2Prompt = z.output<typeof v2PromptSchema>

const v2PromptParamsSchema = z.object({
  promptId: nonEmptyIdSchema.describe('Prompt identifier, or its name.'),
})

export const v2PromptSortFields = ['name', 'createdAt', 'updatedAt'] as const
export type V2PromptSortBy = (typeof v2PromptSortFields)[number]

export const v2ListPromptsQuerySchema = z
  .object({
    workspaceId: workspaceIdSchema.describe('Workspace that owns the prompts.'),
    search: v2SearchSchema.describe('Case-insensitive substring match against the prompt name.'),
    ...v2SortFields(v2PromptSortFields, { sortBy: 'name', sortOrder: 'asc' }),
    ...v2PaginationFields({ description: 'Maximum prompts to return per page.' }),
  })
  .strict()

const v2GetPromptQuerySchema = z
  .object({
    workspaceId: workspaceIdSchema.describe('Workspace that owns the prompt.'),
    label: promptLabelSchema
      .optional()
      .describe('Return the version this label points at. Defaults to `production`.'),
    version: z.coerce
      .number({ error: 'version must be a whole number' })
      .int('version must be a whole number')
      .min(1, 'version must be at least 1')
      .optional()
      .describe('Return this version number instead of a labelled one.'),
  })
  .strict()
  .superRefine((query, ctx) => {
    if (query.label !== undefined && query.version !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['version'],
        message: 'Pass either label or version, not both',
      })
    }
  })

const v2CreatePromptBodySchema = z
  .object({
    workspaceId: workspaceIdSchema.describe('Workspace in which to create the prompt.'),
    name: withMissingFieldMessage(promptNameSchema, 'Prompt name is required').describe(
      'Name, unique within the workspace regardless of case.'
    ),
    description: promptDescriptionSchema.default('').describe('What the prompt is for.'),
    content: withMissingFieldMessage(promptContentSchema, 'Content is required').describe(
      'Text of version 1, with `{{variables}}`.'
    ),
    variables: v2PromptVariablesSchema
      .default([])
      .describe(
        'Declarations of the variables. A placeholder without one is a `text` variable; a declaration without a placeholder is dropped.'
      ),
    note: promptNoteSchema.default('').describe('Note of version 1.'),
  })
  .strict()
export type V2CreatePromptBody = z.input<typeof v2CreatePromptBodySchema>

const v2CreatePromptVersionBodySchema = z
  .object({
    workspaceId: workspaceIdSchema.describe('Workspace that owns the prompt.'),
    content: withMissingFieldMessage(promptContentSchema, 'Content is required').describe(
      'Text of the new version, with `{{variables}}`.'
    ),
    variables: v2PromptVariablesSchema
      .default([])
      .describe(
        'Declarations of the variables. A placeholder without one is a `text` variable; a declaration without a placeholder is dropped.'
      ),
    note: promptNoteSchema.default('').describe('What changed in this version.'),
  })
  .strict()
export type V2CreatePromptVersionBody = z.input<typeof v2CreatePromptVersionBodySchema>

export const v2ListPromptsContract = defineRouteContract({
  method: 'GET',
  path: '/api/v2/prompts',
  query: v2ListPromptsQuerySchema,
  response: { mode: 'json', schema: v2CursorListResponse(v2PromptSummarySchema) },
})

export const v2CreatePromptContract = defineRouteContract({
  method: 'POST',
  path: '/api/v2/prompts',
  query: noInputSchema,
  body: v2CreatePromptBodySchema,
  response: { mode: 'json', schema: v2DataResponse(v2PromptSchema), status: 201 },
})

export const v2GetPromptContract = defineRouteContract({
  method: 'GET',
  path: '/api/v2/prompts/[promptId]',
  params: v2PromptParamsSchema,
  query: v2GetPromptQuerySchema,
  response: { mode: 'json', schema: v2DataResponse(v2PromptSchema) },
})

export const v2CreatePromptVersionContract = defineRouteContract({
  method: 'POST',
  path: '/api/v2/prompts/[promptId]/versions',
  params: v2PromptParamsSchema,
  query: noInputSchema,
  body: v2CreatePromptVersionBodySchema,
  response: { mode: 'json', schema: v2DataResponse(v2PromptSchema), status: 201 },
})
