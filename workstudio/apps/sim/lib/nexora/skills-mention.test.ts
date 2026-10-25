import { describe, expect, it } from 'vitest'
import {
  activeMention,
  completeMention,
  findMentionedSkills,
  withSkillInstructions,
} from '@/lib/nexora/skills-mention'

const ton = {
  id: 's1',
  name: 'ton-entreprise',
  description: 'Ton de l’entreprise',
  content: 'Vouvoyez toujours. Soyez chaleureux et bref.',
}
const devis = {
  id: 's2',
  name: 'devis-client',
  description: 'Rédiger un devis',
  content: 'Présentez le devis en tableau.',
}
const skills = [ton, devis]

describe('skills invoked with @ in a message', () => {
  it('finds the skills a message names, once each, in the order named', () => {
    expect(
      findMentionedSkills('Rédige @devis-client avec @ton-entreprise puis @devis-client', skills)
    ).toEqual([devis, ton])
  })

  it('finds a skill named at the start, after a line break, or in parentheses', () => {
    expect(findMentionedSkills('@ton-entreprise bonjour', skills)).toEqual([ton])
    expect(findMentionedSkills('Bonjour\n@ton-entreprise', skills)).toEqual([ton])
    expect(findMentionedSkills('Merci (@ton-entreprise)', skills)).toEqual([ton])
  })

  it('ignores an e-mail address, an unknown skill and a longer name that only starts like one', () => {
    expect(findMentionedSkills('Écris à jean@ton-entreprise.fr', skills)).toEqual([])
    expect(findMentionedSkills('Utilise @inconnu', skills)).toEqual([])
    expect(findMentionedSkills('Utilise @ton-entreprise-longue', skills)).toEqual([])
    expect(findMentionedSkills('Utilise @devis-client_v2', skills)).toEqual([])
  })

  it('writes the instructions of the named skills before the question, the question untouched', () => {
    const input = withSkillInstructions('Réponds à Mme Martin avec @ton-entreprise', skills)
    expect(input.endsWith('Réponds à Mme Martin avec @ton-entreprise')).toBe(true)
    expect(input).toContain('« ton-entreprise »')
    expect(input).toContain('Vouvoyez toujours. Soyez chaleureux et bref.')
    expect(input).not.toContain('Présentez le devis en tableau.')
  })

  it('sends a message that names no skill as it is', () => {
    expect(withSkillInstructions('Bonjour', skills)).toBe('Bonjour')
  })

  it('keeps a very long skill from taking the whole message', () => {
    const long = { ...ton, content: 'x'.repeat(50_000) }
    const input = withSkillInstructions('Va @ton-entreprise', [long])
    expect(input.length).toBeLessThan(10_000)
    expect(input.endsWith('Va @ton-entreprise')).toBe(true)
  })
})

describe('the @ being typed', () => {
  it('finds the word under the caret and what was typed of it', () => {
    expect(activeMention('Écris avec @ton', 15)).toEqual({ start: 11, query: 'ton' })
    expect(activeMention('@', 1)).toEqual({ start: 0, query: '' })
  })

  it('finds nothing when the caret is not in a mention', () => {
    expect(activeMention('Écris avec @ton bonjour', 23)).toBeNull()
    expect(activeMention('jean@ton', 8)).toBeNull()
    expect(activeMention('Bonjour', 7)).toBeNull()
  })

  it('completes the typed word with the skill name and one space after it', () => {
    expect(
      completeMention('Écris avec @to demain', { start: 11, query: 'to' }, 'ton-entreprise')
    ).toEqual({ text: 'Écris avec @ton-entreprise demain', caret: 27 })
    expect(completeMention('Écris avec @to', { start: 11, query: 'to' }, 'ton-entreprise')).toEqual(
      {
        text: 'Écris avec @ton-entreprise ',
        caret: 27,
      }
    )
  })
})
