import { db } from '@sim/db'
import { nexoraAssistantConversation } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { eq } from 'drizzle-orm'
import { loadProjectContext, type ProjectContext } from '@/lib/nexora/assistant/projects/repository'
import { loadConversation } from '@/lib/nexora/assistant/repository'

const logger = createLogger('NexoraAssistantInput')

/** What a project may put in front of the agent with one question (about 4 000 tokens of French). */
export const PROJECT_CONTEXT_MAX_CHARS = 16_000

interface ConversationFacts {
  id: string
  workspaceId: string
  userId: string
  projectId: string | null
  projectVersion: number | null
}

export interface PrepareInputDependencies {
  loadConversation: (conversationId: string) => Promise<ConversationFacts | null>
  loadProjectContext: (projectId: string) => Promise<ProjectContext | null>
  markProjectVersion: (conversationId: string, version: number) => Promise<void>
}

const databaseDependencies: PrepareInputDependencies = {
  loadConversation,
  loadProjectContext,
  markProjectVersion: async (conversationId, version) => {
    await db
      .update(nexoraAssistantConversation)
      .set({ projectVersion: version })
      .where(eq(nexoraAssistantConversation.id, conversationId))
  },
}

interface PrepareInput {
  workspaceId: string
  userId: string
  /** The Assistant conversation the question belongs to, as the page sent it. */
  conversationId?: string
  text: string
}

interface PreparedInput {
  /** What the agent receives: the question, preceded by what the conversation shares with it. */
  text: string
  /** Call once the answer succeeded, so a failed answer gives the same context again. */
  commit: () => Promise<void>
}

function projectBlock(context: ProjectContext): string {
  const lines = ['[Contexte du projet : consignes et documents communs à cette conversation]']
  let room = PROJECT_CONTEXT_MAX_CHARS
  if (context.instructions.trim()) {
    const instructions = context.instructions.slice(0, room)
    lines.push('Consignes :', instructions)
    room -= instructions.length
  }
  for (const file of context.files) {
    if (room <= 0) {
      lines.push(`--- ${file.name} --- (non transmis : contexte plein)`)
      continue
    }
    const text = file.text.slice(0, room)
    room -= text.length
    lines.push(`--- ${file.name} ---`, text)
    if (text.length < file.text.length) lines.push('[document tronqué]')
  }
  lines.push('[Fin du contexte du projet]')
  return lines.join('\n')
}

/**
 * Nexora edition: what the Assistant places before a question sent to its agent — the project's
 * instructions and files (only to its own conversation, the first time and again after the
 * project changed; the skills named with `@` are added by the page). A conversation of someone else, or
 * of another workspace, shares nothing: its project is never read.
 */
export async function prepareAssistantInput(
  input: PrepareInput,
  deps: PrepareInputDependencies = databaseDependencies
): Promise<PreparedInput> {
  const blocks: string[] = []
  let versionToRecord: { conversationId: string; version: number } | null = null

  const conversation = input.conversationId
    ? await deps.loadConversation(input.conversationId)
    : null
  const own =
    conversation !== null &&
    conversation.userId === input.userId &&
    conversation.workspaceId === input.workspaceId
  if (own && conversation.projectId) {
    const context = await deps.loadProjectContext(conversation.projectId)
    if (context && context.version !== conversation.projectVersion) {
      blocks.push(projectBlock(context))
      versionToRecord = { conversationId: conversation.id, version: context.version }
    }
  }

  const text = blocks.length > 0 ? `${blocks.join('\n\n')}\n\n${input.text}` : input.text
  return {
    text,
    commit: async () => {
      if (!versionToRecord) return
      try {
        await deps.markProjectVersion(versionToRecord.conversationId, versionToRecord.version)
      } catch (error) {
        logger.warn('The project version given to the agent was not recorded', {
          conversationId: versionToRecord.conversationId,
          error,
        })
      }
    },
  }
}
