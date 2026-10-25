import { db } from '@sim/db'
import { memory, nexoraAssistantConversation, nexoraAssistantMessage } from '@sim/db/schema'
import { generateId } from '@sim/utils/id'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { type AssistantCard, assistantCardSchema } from '@/lib/api/contracts/nexora-assistant'
import { lockMemoryConversationInTx } from '@/lib/memory/locks'
import { memberMemoryKey } from '@/lib/nexora/member-memory'

const CONVERSATION_LIST_LIMIT = 50
/** A conversation reads back at most its latest messages. */
const CONVERSATION_MESSAGE_LIMIT = 1000

type AssistantMessageRole = 'user' | 'assistant'

interface AssistantMessageFile {
  name: string
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
  /** The project whose instructions and files the conversation shares, when it is in one. */
  projectId: string | null
  /** The project version last placed in front of the agent. */
  projectVersion: number | null
  createdAt: Date
  updatedAt: Date
}

/** A card the thread shows in place of text (a workflow run, a task just created). */
export type AssistantMessageCard = AssistantCard

export interface AssistantMessageRecord {
  id: string
  conversationId: string
  role: AssistantMessageRole
  content: string
  files: AssistantMessageFile[] | null
  usage: AssistantMessageUsage | null
  interrupted: boolean
  card: AssistantMessageCard | null
  createdAt: Date
}

export interface NewAssistantMessage {
  role: AssistantMessageRole
  content: string
  usage?: AssistantMessageUsage
  interrupted?: boolean
  files?: AssistantMessageFile[]
  card?: AssistantMessageCard
}

const conversationColumns = {
  id: nexoraAssistantConversation.id,
  workspaceId: nexoraAssistantConversation.workspaceId,
  userId: nexoraAssistantConversation.userId,
  workflowId: nexoraAssistantConversation.workflowId,
  title: nexoraAssistantConversation.title,
  projectId: nexoraAssistantConversation.projectId,
  projectVersion: nexoraAssistantConversation.projectVersion,
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
  const { kind, payload, ...rest } = row
  // A stored card that no longer fits its schema is shown as no card rather than failing the read.
  const parsed = assistantCardSchema.safeParse({ kind, payload })
  return { ...rest, role: row.role, card: parsed.success ? parsed.data : null }
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
  projectId?: string
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

/**
 * Its messages go with it (foreign-key cascade), and so does the agent's memory of it: the
 * member's key, and the bare conversation id older conversations were remembered under. `false`
 * when it no longer exists.
 */
export async function deleteConversation(
  conversation: Pick<AssistantConversationRecord, 'id' | 'workspaceId' | 'userId'>
): Promise<boolean> {
  const memoryKeys = [memberMemoryKey(conversation.userId, conversation.id), conversation.id]
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(nexoraAssistantConversation)
      .where(eq(nexoraAssistantConversation.id, conversation.id))
      .returning({ id: nexoraAssistantConversation.id })
    if (deleted.length === 0) return false
    for (const key of memoryKeys) {
      await lockMemoryConversationInTx(tx, conversation.workspaceId, key)
    }
    await tx
      .delete(memory)
      .where(and(eq(memory.workspaceId, conversation.workspaceId), inArray(memory.key, memoryKeys)))
    return true
  })
}

/**
 * Replaces the card of a message of the conversation, when that message already is a card of the
 * same kind (a run waiting for a validation, once answered). `null` when it is not.
 */
export async function updateMessageCard(
  conversationId: string,
  messageId: string,
  card: AssistantMessageCard
): Promise<AssistantMessageRecord | null> {
  const [row] = await db
    .update(nexoraAssistantMessage)
    .set({ payload: card.payload })
    .where(
      and(
        eq(nexoraAssistantMessage.id, messageId),
        eq(nexoraAssistantMessage.conversationId, conversationId),
        eq(nexoraAssistantMessage.kind, card.kind)
      )
    )
    .returning()
  return row ? toMessageRecord(row) : null
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
        // The column's type still names a storage key: older rows hold one, new ones none.
        files: (message.files ?? null) as StoredMessageRow['files'],
        usage: message.usage ?? null,
        interrupted: message.interrupted ?? false,
        kind: message.card?.kind ?? null,
        payload: message.card?.payload ?? null,
        createdAt: now,
      })
      .returning()
    if (!row) throw new Error('Failed to store the Assistant message')
    return toMessageRecord(row)
  })
}
