import { db } from '@sim/db'
import { skill } from '@sim/db/schema'
import { asc, eq } from 'drizzle-orm'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

/** The skills of the workspace the Assistant offers behind `@` (more than this are not offered). */
const SKILL_LIST_LIMIT = 200

/**
 * The workspace's skills, by name and description, for the `@` picker of the Assistant. Read-only
 * and without their content: a skill's text only reaches an agent when a message names it.
 */
export const listAssistantSkills = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listSkills,
  resolveContext: ({ input }: { input: { workspaceId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ context }) => {
    const rows = await db
      .select({ name: skill.name, description: skill.description })
      .from(skill)
      .where(eq(skill.workspaceId, context.workspaceId))
      .orderBy(asc(skill.name))
      .limit(SKILL_LIST_LIMIT)
    return { skills: rows.map(({ name, description }) => ({ name, description })) }
  },
})
