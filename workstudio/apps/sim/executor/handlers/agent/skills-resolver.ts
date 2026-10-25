import { db } from '@sim/db'
import { skill } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { toError } from '@sim/utils/errors'
import { and, eq, inArray } from 'drizzle-orm'
import { getBuiltinSkillById, getBuiltinSkillByName } from '@/lib/workflows/skills/builtin-skills'
import type { SkillInput } from '@/executor/handlers/agent/types'

const logger = createLogger('SkillsResolver')

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface SkillMetadata {
  name: string
  description: string
  /** Nexora edition: the skill's instructions, written into the prompt when short (see below). */
  content?: string
}

/**
 * Nexora edition: a model told to "load a skill when relevant" often answers without loading it
 * (a company tone skill then changes nothing), so the instructions of short skills are written
 * into the system prompt, within a total allowance; longer ones keep `load_skill`.
 */
export const INLINE_SKILL_MAX_CHARS = 2_000
export const INLINE_SKILLS_TOTAL_MAX_CHARS = 6_000

function inlinedSkills(skills: SkillMetadata[]): Set<SkillMetadata> {
  const inlined = new Set<SkillMetadata>()
  let used = 0
  for (const skill of skills) {
    const length = skill.content?.length ?? 0
    if (length === 0 || length > INLINE_SKILL_MAX_CHARS) continue
    if (used + length > INLINE_SKILLS_TOTAL_MAX_CHARS) continue
    inlined.add(skill)
    used += length
  }
  return inlined
}

/** The skills the model must still load with `load_skill`: those whose instructions are not in the prompt. */
export function skillNamesToLoad(skills: SkillMetadata[]): string[] {
  const inlined = inlinedSkills(skills)
  return skills.filter((skill) => !inlined.has(skill)).map((skill) => skill.name)
}

/**
 * Fetch skill metadata (name + description) for system prompt injection.
 * Only returns lightweight data so the LLM knows what skills are available.
 */
export async function resolveSkillMetadata(
  skillInputs: SkillInput[],
  workspaceId: string
): Promise<SkillMetadata[]> {
  if (!skillInputs.length || !workspaceId) return []

  const metadata: SkillMetadata[] = []
  const dbSkillIds: string[] = []
  for (const input of skillInputs) {
    const builtin = getBuiltinSkillById(input.skillId)
    if (builtin) {
      metadata.push({
        name: builtin.name,
        description: builtin.description,
        content: builtin.content,
      })
    } else {
      dbSkillIds.push(input.skillId)
    }
  }

  if (dbSkillIds.length === 0) return metadata

  try {
    const rows = await db
      .select({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        content: skill.content,
      })
      .from(skill)
      .where(and(eq(skill.workspaceId, workspaceId), inArray(skill.id, dbSkillIds)))

    return [
      ...metadata,
      ...rows.map((row) => ({
        name: row.name,
        description: row.description,
        content: row.content,
      })),
    ]
  } catch (error) {
    logger.error('Failed to resolve skill metadata', {
      errorName: toError(error).name,
      requestedSkillCount: dbSkillIds.length,
      workspaceId,
    })
    return metadata
  }
}

/**
 * Fetch full skill content for a load_skill tool response.
 * Called when the LLM decides a skill is relevant and invokes load_skill.
 */
export async function resolveSkillContent(
  skillName: string,
  workspaceId: string
): Promise<string | null> {
  if (!skillName || !workspaceId) return null

  const builtin = getBuiltinSkillByName(skillName)
  if (builtin) return builtin.content

  try {
    const rows = await db
      .select({ content: skill.content })
      .from(skill)
      .where(and(eq(skill.workspaceId, workspaceId), eq(skill.name, skillName)))
      .limit(1)

    if (rows.length === 0) {
      logger.warn('Skill not found', { hasSkillName: skillName.length > 0, workspaceId })
      return null
    }

    return rows[0].content
  } catch (error) {
    logger.error('Failed to resolve skill content', {
      errorName: toError(error).name,
      hasSkillName: skillName.length > 0,
      workspaceId,
    })
    return null
  }
}

export async function resolveSkillContentById(
  skillId: string,
  workspaceId: string
): Promise<{ name: string; content: string } | null> {
  if (!skillId || !workspaceId) return null

  const builtin = getBuiltinSkillById(skillId)
  if (builtin) return { name: builtin.name, content: builtin.content }

  try {
    const rows = await db
      .select({ content: skill.content, name: skill.name })
      .from(skill)
      .where(and(eq(skill.workspaceId, workspaceId), eq(skill.id, skillId)))
      .limit(1)

    if (rows.length === 0) {
      logger.warn('Skill not found', { hasSkillId: skillId.length > 0, workspaceId })
      return null
    }

    return { name: rows[0].name, content: rows[0].content }
  } catch (error) {
    logger.error('Failed to resolve skill content', {
      errorName: toError(error).name,
      hasSkillId: skillId.length > 0,
      workspaceId,
    })
    return null
  }
}

/**
 * Build the system prompt section that lists available skills.
 * Uses XML format per the agentskills.io integration guide.
 */
export function buildSkillsSystemPromptSection(skills: SkillMetadata[]): string {
  if (!skills.length) return ''

  const inlined = inlinedSkills(skills)
  const skillEntries = skills
    .map((s) => {
      const instructions = inlined.has(s)
        ? `\n    <instructions>${escapeXml(s.content ?? '')}</instructions>`
        : ''
      return `  <skill name="${escapeXml(s.name)}">\n    <description>${escapeXml(s.description)}</description>${instructions}\n  </skill>`
    })
    .join('\n')

  // Nexora edition: a model left to "use a skill when relevant" often answers without loading one.
  const lines = [
    '',
    'Vous disposez des compétences ci-dessous. Quand la description d’une compétence correspond à la demande, ou dit de s’appliquer à toute réponse, suivez ses instructions dans votre réponse, sans mentionner la compétence.',
  ]
  if (inlined.size < skills.length) {
    lines.push(
      'Avant de répondre, si une compétence sans instructions ci-dessous correspond à la demande, appelez d’abord l’outil load_skill pour la charger, puis suivez ses instructions.'
    )
  }
  lines.push('', '<available_skills>', skillEntries, '</available_skills>')
  return lines.join('\n')
}

/**
 * Build the load_skill tool definition for injection into the tools array.
 * Returns a ProviderToolConfig-compatible object so all providers can process it.
 */
export function buildLoadSkillTool(skillNames: string[]) {
  return {
    id: 'load_skill',
    description: `Load a skill to get specialized instructions. Available skills: ${skillNames.join(', ')}`,
    params: {},
    parameters: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          description: 'Name of the skill to load',
          enum: skillNames,
        },
      },
      required: ['skill_name'],
    },
  }
}
