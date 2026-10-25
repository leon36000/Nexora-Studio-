/**
 * Nexora edition: invoking a skill of the workspace with `@` in an Assistant message
 * (`@ton-entreprise`). The message is stored as typed; the question sent to the agent starts with
 * the instructions of the skills it names.
 */

export interface MentionableSkill {
  id: string
  name: string
  description: string
  content: string
}

/** Skill names are kebab-case; an `@` glued to a word (an e-mail address) is not a mention. */
const MENTION = /(^|[\s(])@([a-z0-9]+(?:-[a-z0-9]+)*)(?![\w-])/gi
const MAX_SKILL_CHARS = 6_000

/** The skills a message names, once each, in the order it names them. */
export function findMentionedSkills<T extends MentionableSkill>(
  text: string,
  skills: readonly T[]
): T[] {
  const byName = new Map(skills.map((skill) => [skill.name.toLowerCase(), skill]))
  const found: T[] = []
  for (const match of text.matchAll(MENTION)) {
    const skill = byName.get(match[2].toLowerCase())
    if (skill && !found.includes(skill)) found.push(skill)
  }
  return found
}

/** The question for the agent: the instructions of the skills the message names, then the message. */
export function withSkillInstructions(text: string, skills: readonly MentionableSkill[]): string {
  const mentioned = findMentionedSkills(text, skills)
  if (mentioned.length === 0) return text
  const instructions = mentioned.map(
    (skill) =>
      `Compétence « ${skill.name} » à appliquer à votre réponse :\n${skill.content.slice(0, MAX_SKILL_CHARS)}`
  )
  return `${instructions.join('\n\n')}\n\n---\n\n${text}`
}

interface ActiveMention {
  /** Index of the `@`. */
  start: number
  /** What was typed after it. */
  query: string
}

/** The `@word` the caret is in, `null` when it is in none. */
export function activeMention(text: string, caret: number): ActiveMention | null {
  const before = text.slice(0, caret)
  const match = /(^|[\s(])@([a-z0-9-]*)$/i.exec(before)
  if (!match) return null
  return { start: caret - match[2].length - 1, query: match[2] }
}

/** The text with the typed `@word` completed to `@name` and one space after it. */
export function completeMention(
  text: string,
  mention: ActiveMention,
  name: string
): { text: string; caret: number } {
  const end = mention.start + 1 + mention.query.length
  const rest = text.slice(end)
  const spaced = /^\s/.test(rest) ? rest : ` ${rest}`
  const head = `${text.slice(0, mention.start)}@${name}`
  return { text: `${head}${spaced}`, caret: head.length + 1 }
}
