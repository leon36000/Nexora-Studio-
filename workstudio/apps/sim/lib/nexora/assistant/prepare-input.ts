import { db } from '@sim/db'
import { nexoraAssistantConversation, skill } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, eq, inArray } from 'drizzle-orm'
import { loadProjectContext, type ProjectContext } from '@/lib/nexora/assistant/projects/repository'
import { loadConversation } from '@/lib/nexora/assistant/repository'

const logger = createLogger('NexoraAssistantInput')

/** What a project may put in front of the agent with one question (about 4 000 tokens of French). */
export const PROJECT_CONTEXT_MAX_CHARS = 16_000
const SKILL_MAX_CHARS = 8_000
const MAX_SKILLS = 3

/** `@name` of a skill: kebab-case, not the end of a word or of an address (`paul@pme.fr`). */
const SKILL_MENTION = /(?<![\w.@-])@([a-z0-9]+(?:-[a-z0-9]+)*)/g

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
  loadSkills: (
    workspaceId: string,
    names: string[]
  ) => Promise<{ name: string; content: string }[]>
  markProjectVersion: (conversationId: string, version: number) => Promise<void>
}

const databaseDependencies: PrepareInputDependencies = {
  loadConversation,
  loadProjectContext,
  loadSkills: (workspaceId, names) =>
    db
      .select({ name: skill.name, content: skill.content })
      .from(skill)
      .where(and(eq(skill.workspaceId, workspaceId), inArray(skill.name, names))),
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

function mentionedSkills(text: string): string[] {
  const names = new Set<string>()
  for (const match of text.matchAll(SKILL_MENTION)) {
    names.add(match[1])
    if (names.size === MAX_SKILLS) break
  }
  return [...names]
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

function skillBlock(found: { name: string; content: string }): string {
  return [
    `[Compétence « ${found.name} » : suivez ces instructions pour ce message]`,
    found.content.slice(0, SKILL_MAX_CHARS),
    '[Fin de la compétence]',
  ].join('\n')
}

/**
 * Nexora edition: what the Assistant places before a question sent to its agent — the project's
 * instructions and files (only to its own conversation, the first time and again after the
 * project changed) and the skills the message names with `@`. A conversation of someone else, or
 * of another workspace, shares nothing: its project is never read.
 */
export async function prepareAssistantInput(
  input: PrepareInput,
  deps: PrepareInputDependencies = databaseDependencies
): Promise<PreparedInput> {
  const blocks: string[] = []
  let versionToRecord: { conversationId: string; version: number } | null = null

  const conversation = input.conversationId ? await deps.loadConversation(input.conversationId) : null
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

  const names = mentionedSkills(input.text)
  if (names.length > 0) {
    const found = await deps.loadSkills(input.workspaceId, names)
    for (const name of names) {
      const match = found.find((candidate) => candidate.name === name)
      if (match) blocks.push(skillBlock(match))
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
