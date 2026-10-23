import { db } from '@sim/db'
import { nexoraAssistantConversation, nexoraAssistantMessage } from '@sim/db/schema'
import { generateId } from '@sim/utils/id'
import { and, desc, eq } from 'drizzle-orm'

const CONVERSATION_LIST_LIMIT = 50
/** A conversation reads back at most its latest messages. */
const CONVERSATION_MESSAGE_LIMIT = 1000

type AssistantMessageRole = 'user' | 'assistant'

interface AssistantMessageFile {
  name: string
  key: string
  type: string
  size: number
}

interface AssistantMessageUsage {
  promptTokens: number
  completionTokens: number
}

export interface AssistantConversationRecord {
  id: string
  workspaceId: string
  userId: string
  workflowId: string | null
  title: string
  createdAt: Date
  updatedAt: Date
}

export interface AssistantMessageRecord {
  id: string
  conversationId: string
  role: AssistantMessageRole
  content: string
  files: AssistantMessageFile[] | null
  usage: AssistantMessageUsage | null
  interrupted: boolean
  createdAt: Date
}

export interface NewAssistantMessage {
  role: AssistantMessageRole
  content: string
  usage?: AssistantMessageUsage
  interrupted?: boolean
  files?: AssistantMessageFile[]
}

const conversationColumns = {
  id: nexoraAssistantConversation.id,
  workspaceId: nexoraAssistantConversation.workspaceId,
  userId: nexoraAssistantConversation.userId,
  workflowId: nexoraAssistantConversation.workflowId,
  title: nexoraAssistantConversation.title,
  createdAt: nexoraAssistantConversation.createdAt,
  updatedAt: nexoraAssistantConversation.updatedAt,
}

export async function loadConversation(
  conversationId: string
): Promise<AssistantConversationRecord | null> {
  const [row] = await db
    .select(conversationColumns)
    .from(nexoraAssistantConversation)
    .where(eq(nexoraAssistantConversation.id, conversationId))
    .limit(1)
  return row ?? null
}

type StoredMessageRow = typeof nexoraAssistantMessage.$inferSelect

function toMessageRecord(row: StoredMessageRow): AssistantMessageRecord {
  if (row.role !== 'user' && row.role !== 'assistant') {
    throw new Error(`Assistant message ${row.id} has an unknown role`)
  }
  return { ...row, role: row.role }
}

/** One member's conversations of one workspace, most recently active first. */
export async function listConversations(
  workspaceId: string,
  userId: string
): Promise<AssistantConversationRecord[]> {
  return db
    .select(conversationColumns)
    .from(nexoraAssistantConversation)
    .where(
      and(
        eq(nexoraAssistantConversation.workspaceId, workspaceId),
        eq(nexoraAssistantConversation.userId, userId)
      )
    )
    .orderBy(desc(nexoraAssistantConversation.updatedAt))
    .limit(CONVERSATION_LIST_LIMIT)
}

export async function insertConversation(values: {
  workspaceId: string
  userId: string
  workflowId: string
  title: string
}): Promise<AssistantConversationRecord> {
  const now = new Date()
  const [row] = await db
    .insert(nexoraAssistantConversation)
    .values({ id: generateId(), ...values, createdAt: now, updatedAt: now })
    .returning(conversationColumns)
  if (!row) throw new Error('Failed to create the Assistant conversation')
  return row
}

/** The conversation's latest messages, oldest first. */
export async function listMessages(conversationId: string): Promise<AssistantMessageRecord[]> {
  const rows = await db
    .select()
    .from(nexoraAssistantMessage)
    .where(eq(nexoraAssistantMessage.conversationId, conversationId))
    .orderBy(desc(nexoraAssistantMessage.createdAt), desc(nexoraAssistantMessage.id))
    .limit(CONVERSATION_MESSAGE_LIMIT)
  return rows.map(toMessageRecord).reverse()
}

/** `null` when the conversation no longer exists. */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<AssistantConversationRecord | null> {
  const [row] = await db
    .update(nexoraAssistantConversation)
    .set({ title })
    .where(eq(nexoraAssistantConversation.id, conversationId))
    .returning(conversationColumns)
  return row ?? null
}

/** Its messages go with it (foreign-key cascade). `false` when it no longer exists. */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const deleted = await db
    .delete(nexoraAssistantConversation)
    .where(eq(nexoraAssistantConversation.id, conversationId))
    .returning({ id: nexoraAssistantConversation.id })
  return deleted.length > 0
}

/**
 * Stores one message and marks the conversation active, atomically. `null` when the
 * conversation was deleted meanwhile: nothing is stored.
 */
export async function insertMessage(
  conversationId: string,
  message: NewAssistantMessage
): Promise<AssistantMessageRecord | null> {
  return db.transaction(async (tx) => {
    const now = new Date()
    const [bumped] = await tx
      .update(nexoraAssistantConversation)
      .set({ updatedAt: now })
      .where(eq(nexoraAssistantConversation.id, conversationId))
      .returning({ id: nexoraAssistantConversation.id })
    if (!bumped) return null
    const [row] = await tx
      .insert(nexoraAssistantMessage)
      .values({
        id: generateId(),
        conversationId,
        role: message.role,
        content: message.content,
        files: message.files ?? null,
        usage: message.usage ?? null,
        interrupted: message.interrupted ?? false,
        createdAt: now,
      })
      .returning()
    if (!row) throw new Error('Failed to store the Assistant message')
    return toMessageRecord(row)
  })
}
