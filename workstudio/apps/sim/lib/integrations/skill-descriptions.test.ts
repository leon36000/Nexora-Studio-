import { describe, expect, it, vi } from 'vitest'
import { localizedSkillDescription } from '@/lib/integrations/skill-descriptions'
import { SKILL_DESCRIPTIONS_FR } from '@/lib/integrations/skill-descriptions.fr'

/** The real metadata: the registry is mocked for every test, its maps are not. */
const { BLOCK_META_REGISTRY } =
  await vi.importActual<typeof import('@/blocks/registry-maps')>('@/blocks/registry-maps')
const suggestedSkills = Object.values(BLOCK_META_REGISTRY).flatMap((meta) => meta.skills ?? [])

describe('localizedSkillDescription', () => {
  it('has a French description for every skill an integration suggests', () => {
    const untranslated = suggestedSkills
      .filter((skill) => localizedSkillDescription(skill, 'fr') === skill.description)
      .map((skill) => `${skill.name}: ${skill.description}`)
    expect(untranslated).toEqual([])
  })

  it('keeps no French description for a skill that no longer exists', () => {
    const translated = suggestedSkills.filter(
      (skill) => localizedSkillDescription(skill, 'fr') !== skill.description
    )
    const distinct = new Set(translated.map((skill) => `${skill.name}\u0000${skill.description}`))
    expect(Object.keys(SKILL_DESCRIPTIONS_FR)).toHaveLength(distinct.size)
  })

  it('leaves the English description to every other language', () => {
    const skill = suggestedSkills[0]
    expect(localizedSkillDescription(skill, 'en')).toBe(skill.description)
  })

  it('falls back to the English description for a skill it does not know', () => {
    expect(
      localizedSkillDescription({ name: 'brand-new-skill', description: 'Do a new thing.' }, 'fr')
    ).toBe('Do a new thing.')
  })

  it('keeps the product names and identifiers the English description quotes', () => {
    const slack = suggestedSkills.find((skill) => skill.name === 'daily-standup-summary')
    expect(localizedSkillDescription(slack ?? suggestedSkills[0], 'fr')).toContain('stand-up')
  })
})
