/** Skills offered at once behind `@`. */
const MAX_OFFERED = 6

/** The `@name` being typed at the end of the text: after the start or a space, kebab-case so far. */
const OPEN_MENTION = /(?:^|\s)@([a-z0-9-]*)$/

export function activeSkillMention(text: string): { query: string } | null {
  const match = OPEN_MENTION.exec(text)
  return match ? { query: match[1] } : null
}

/** The text with the mention being typed completed to `@name `; unchanged when none is open. */
export function completeSkillMention(text: string, name: string): string {
  return text.replace(OPEN_MENTION, (whole) => `${whole.startsWith('@') ? '' : whole[0]}@${name} `)
}

interface SkillOption {
  name: string
  description: string
}

/** The skills whose name or description holds the query: those named by it first, at most six. */
export function matchingSkills<T extends SkillOption>(skills: T[], query: string): T[] {
  const needle = query.toLowerCase()
  if (needle === '') return skills.slice(0, MAX_OFFERED)
  const byName = skills.filter((skill) => skill.name.includes(needle))
  const byDescription = skills.filter(
    (skill) => !skill.name.includes(needle) && skill.description.toLowerCase().includes(needle)
  )
  return [...byName, ...byDescription].slice(0, MAX_OFFERED)
}
