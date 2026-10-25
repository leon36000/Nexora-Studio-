import { describe, expect, it } from 'vitest'
import {
  activeSkillMention,
  completeSkillMention,
  matchingSkills,
} from '@/app/workspace/[workspaceId]/assistant/skill-mention'

describe('activeSkillMention', () => {
  it.each([
    ['@', ''],
    ['@red', 'red'],
    ['Rédige ceci avec @redaction-de', 'redaction-de'],
    ['ligne 1\n@dev', 'dev'],
  ])('finds the mention being typed at the end of « %s »', (text, query) => {
    expect(activeSkillMention(text)).toEqual({ query })
  })

  it.each(['Bonjour', 'écris à paul@pme.fr', '@devis terminé ', '@Devis', 'mon @ seul '])(
    'finds none in « %s »',
    (text) => {
      expect(activeSkillMention(text)).toBeNull()
    }
  )
})

describe('completeSkillMention', () => {
  it('replaces the mention being typed by the chosen skill and a space', () => {
    expect(completeSkillMention('Fais le @red', 'redaction-devis')).toBe(
      'Fais le @redaction-devis '
    )
    expect(completeSkillMention('@', 'devis')).toBe('@devis ')
  })

  it('leaves the text alone when no mention is being typed', () => {
    expect(completeSkillMention('Bonjour', 'devis')).toBe('Bonjour')
  })
})

describe('matchingSkills', () => {
  const skills = [
    { name: 'redaction-devis', description: 'Rédiger un devis' },
    { name: 'relance-facture', description: 'Relancer une facture' },
    { name: 'traduction', description: 'Traduire un texte devis' },
  ]

  it('keeps the skills whose name or description holds the query, names first', () => {
    expect(matchingSkills(skills, 'devis').map((skill) => skill.name)).toEqual([
      'redaction-devis',
      'traduction',
    ])
    expect(matchingSkills(skills, 'rel').map((skill) => skill.name)).toEqual(['relance-facture'])
  })

  it('lists the first few for an empty query', () => {
    expect(matchingSkills(skills, '')).toHaveLength(3)
    expect(
      matchingSkills(
        Array.from({ length: 20 }, (_, i) => ({ name: `s${i}`, description: '' })),
        ''
      )
    ).toHaveLength(6)
  })
})
