import { z } from 'zod'
import { workflowIdSchema, workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

/**
 * The error `code` an append or a creation answers with when the conversation's agent is no
 * longer a published agent of the workspace (workflow deleted, moved out of the `Agents` folder,
 * undeployed, or its chat deactivated). The conversation itself stays readable.
 */
export const ASSISTANT_AGENT_UNPUBLISHED_CODE = 'agent-unpublished'

/** Longest message the Assistant stores (an agent answer included). */
const ASSISTANT_MESSAGE_MAX_LENGTH = 100_000
const TITLE_MAX_LENGTH = 200
const MAX_ATTACHED_FILES = 20

const workspaceQuerySchema = z.object({ workspaceId: workspaceIdSchema })

const conversationParamsSchema = z.object({
  id: z.string().min(1, 'Conversation ID is required').max(128, 'Conversation ID is too long'),
})

const assistantAgentSchema = z.object({
  workflowId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** The deployed chat the page sends messages to (`/api/chat/[identifier]`). */
  chatIdentifier: z.string(),
  welcomeMessage: z.string().nullable(),
})
export type AssistantAgent = z.output<typeof assistantAgentSchema>

const assistantConversationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  /** `null` once the agent's workflow was deleted. */
  workflowId: z.string().nullable(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const assistantMessageRoleSchema = z.enum(['user', 'assistant'])

/**
 * What the conversation shows of an attached file. The file itself goes to the agent with the
 * question and is not kept by the Assistant, so no storage key is accepted or returned (unknown
 * fields, such as a page-sent `key`, are dropped).
 */
const assistantMessageFileSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255, 'File name is too long'),
  type: z.string().max(255, 'File type is too long'),
  size: z.number().int().min(0, 'File size cannot be negative'),
})
export type AssistantMessageFile = z.output<typeof assistantMessageFileSchema>

const assistantMessageUsageSchema = z.object({
  promptTokens: z.number().int().min(0, 'promptTokens cannot be negative'),
  completionTokens: z.number().int().min(0, 'completionTokens cannot be negative'),
})

const assistantMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: assistantMessageRoleSchema,
  content: z.string(),
  files: z.array(assistantMessageFileSchema),
  usage: assistantMessageUsageSchema.nullable(),
  interrupted: z.boolean(),
  createdAt: z.string(),
})
export type AssistantMessage = z.output<typeof assistantMessageSchema>

/** The published agents of a workspace the Assistant can talk to. */
export const listAssistantAgentsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/agents',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ agents: z.array(assistantAgentSchema) }) },
})

/** The caller's own conversations in a workspace, most recently active first (at most 50). */
export const listAssistantConversationsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/conversations',
  query: workspaceQuerySchema,
  response: {
    mode: 'json',
    schema: z.object({ conversations: z.array(assistantConversationSchema) }),
  },
})

const createAssistantConversationBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  workflowId: workflowIdSchema,
  /** Only names the conversation; the page appends the question itself once it is sent. */
  firstMessage: z
    .string()
    .trim()
    .min(1, 'firstMessage cannot be empty')
    .max(ASSISTANT_MESSAGE_MAX_LENGTH, 'firstMessage is too long'),
})
export type CreateAssistantConversationBody = z.input<typeof createAssistantConversationBodySchema>

export const createAssistantConversationContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/conversations',
  body: createAssistantConversationBodySchema,
  response: {
    mode: 'json',
    schema: z.object({ conversation: assistantConversationSchema }),
    status: 201,
  },
})

const assistantConversationDetailSchema = z.object({
  conversation: assistantConversationSchema,
  messages: z.array(assistantMessageSchema),
  /** `null` when the agent is no longer published: the conversation is read-only. */
  agent: assistantAgentSchema.nullable(),
})

export const getAssistantConversationContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/conversations/[id]',
  params: conversationParamsSchema,
  response: { mode: 'json', schema: assistantConversationDetailSchema },
})

const renameAssistantConversationBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title cannot be empty')
    .max(TITLE_MAX_LENGTH, `title cannot exceed ${TITLE_MAX_LENGTH} characters`),
})
export type RenameAssistantConversationBody = z.input<typeof renameAssistantConversationBodySchema>

export const renameAssistantConversationContract = defineRouteContract({
  method: 'PATCH',
  path: '/api/nexora/assistant/conversations/[id]',
  params: conversationParamsSchema,
  body: renameAssistantConversationBodySchema,
  response: { mode: 'json', schema: z.object({ conversation: assistantConversationSchema }) },
})

export const deleteAssistantConversationContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/assistant/conversations/[id]',
  params: conversationParamsSchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

const appendAssistantMessageBodySchema = z
  .object({
    role: assistantMessageRoleSchema,
    /** May be empty only for an answer cut before its first word. */
    content: z
      .string()
      .max(
        ASSISTANT_MESSAGE_MAX_LENGTH,
        `content cannot exceed ${ASSISTANT_MESSAGE_MAX_LENGTH} characters`
      ),
    usage: assistantMessageUsageSchema.optional(),
    /** The answer stopped before its end (stream cut, error). */
    interrupted: z.boolean().optional(),
    files: z
      .array(assistantMessageFileSchema)
      .max(MAX_ATTACHED_FILES, `files cannot exceed ${MAX_ATTACHED_FILES} items`)
      .optional(),
  })
  .superRefine((body, ctx) => {
    if (body.role === 'user' && body.content.trim() === '') {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'A question cannot be empty' })
    }
  })
export type AppendAssistantMessageBody = z.input<typeof appendAssistantMessageBodySchema>

export const appendAssistantMessageContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/conversations/[id]/messages',
  params: conversationParamsSchema,
  body: appendAssistantMessageBodySchema,
  response: {
    mode: 'json',
    schema: z.object({ message: assistantMessageSchema }),
    status: 201,
  },
})
