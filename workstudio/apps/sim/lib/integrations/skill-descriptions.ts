import { SKILL_DESCRIPTIONS_FR } from '@/lib/integrations/skill-descriptions.fr'
import type { SuggestedSkill } from '@/blocks/types'

/** 32-bit FNV-1a over UTF-16 code units: a short, stable key for a skill's name and English description. */
function skillDescriptionKey(name: string, description: string): string {
  const text = `${name}\u0000${description}`
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * The description of a skill an integration suggests, in the person's language. The skills are
 * written in English in each block's metadata; French readers get the translation, and any skill
 * without one keeps its English description.
 */
export function localizedSkillDescription(
  skill: Pick<SuggestedSkill, 'name' | 'description'>,
  locale: string
): string {
  if (!locale.startsWith('fr')) return skill.description
  return (
    SKILL_DESCRIPTIONS_FR[skillDescriptionKey(skill.name, skill.description)] ?? skill.description
  )
}
