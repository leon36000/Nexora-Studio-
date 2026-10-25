import { createLogger } from '@sim/logger'
import { loggerMock, resetDbChainMock } from '@sim/testing'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSkillsSystemPromptSection,
  INLINE_SKILL_MAX_CHARS,
  INLINE_SKILLS_TOTAL_MAX_CHARS,
  resolveSkillContent,
  skillNamesToLoad,
} from '@/executor/handlers/agent/skills-resolver'

const mockSkillsLogger = vi.mocked(loggerMock.createLogger).mock.results[
  vi.mocked(createLogger).mock.calls.findIndex(([name]) => name === 'SkillsResolver')
].value

// resolveSkillContent is the shared resolver invoked when a workflow agent
// block calls load_skill. Skill editors gate editing only — resolution never
// blocks on the acting user.
beforeEach(() => {
  resetDbChainMock()
})

afterAll(() => {
  resetDbChainMock()
})

describe('buildSkillsSystemPromptSection', () => {
  const skills = [
    {
      name: 'ton-entreprise',
      description: 'À appliquer à toute réponse : ton <chaleureux> & bref',
    },
  ]

  it('tells the model to load a matching skill before it answers, then lists the skills', () => {
    const section = buildSkillsSystemPromptSection(skills)
    expect(section).toContain('load_skill')
    expect(section).toMatch(/avant de répondre/i)
    expect(section).toContain('<skill name="ton-entreprise">')
  })

  it('writes a description that holds markup as text', () => {
    expect(buildSkillsSystemPromptSection(skills)).toContain(
      'ton &lt;chaleureux&gt; &amp; bref</description>'
    )
  })

  it('adds nothing when the agent has no skill', () => {
    expect(buildSkillsSystemPromptSection([])).toBe('')
  })
})

describe('short skills written into the system prompt', () => {
  const short = {
    name: 'ton-entreprise',
    description: 'Ton de l’entreprise',
    content: 'Vouvoyez toujours. Terminez par « Bien cordialement ».',
  }
  const long = {
    name: 'procedure-longue',
    description: 'Une procédure détaillée',
    content: 'x'.repeat(INLINE_SKILL_MAX_CHARS + 1),
  }

  it('gives the instructions of a short skill to the model, so it need not decide to load them', () => {
    const section = buildSkillsSystemPromptSection([short])
    expect(section).toContain(
      '<instructions>Vouvoyez toujours. Terminez par « Bien cordialement ».</instructions>'
    )
    expect(skillNamesToLoad([short])).toEqual([])
  })

  it('leaves a long skill to the load_skill tool', () => {
    const section = buildSkillsSystemPromptSection([short, long])
    expect(section).not.toContain('x'.repeat(50))
    expect(skillNamesToLoad([short, long])).toEqual(['procedure-longue'])
    expect(section).toContain('load_skill')
  })

  it('does not mention the tool when every skill is written in', () => {
    expect(buildSkillsSystemPromptSection([short])).not.toContain('load_skill')
  })

  it('keeps the prompt from growing past the total allowance', () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      name: `competence-${index}`,
      description: 'Une compétence',
      content: 'y'.repeat(INLINE_SKILL_MAX_CHARS - 10),
    }))
    const inlined = many.length - skillNamesToLoad(many).length
    expect(inlined * (INLINE_SKILL_MAX_CHARS - 10)).toBeLessThanOrEqual(
      INLINE_SKILLS_TOTAL_MAX_CHARS
    )
    expect(inlined).toBeGreaterThan(0)
    expect(skillNamesToLoad(many).length).toBeGreaterThan(0)
  })

  it('keeps loading a skill whose instructions were not read', () => {
    expect(skillNamesToLoad([{ name: 'sans-contenu', description: 'x' }])).toEqual(['sans-contenu'])
  })

  it('writes instructions that hold markup as text', () => {
    const section = buildSkillsSystemPromptSection([
      { ...short, content: 'Écrivez <b>gras</b> & court' },
    ])
    expect(section).toContain('Écrivez &lt;b&gt;gras&lt;/b&gt; &amp; court')
  })
})

describe('resolveSkillContent', () => {
  it('does not log a resolved secret or runtime alias from a missing skill name', async () => {
    const skillName = 'skill-secret __var_API_KEY __sim_code_0_binding_0'

    expect(await resolveSkillContent(skillName, 'ws-1')).toBeNull()

    const logged = JSON.stringify(mockSkillsLogger.warn.mock.calls)
    expect(logged).not.toContain('skill-secret')
    expect(logged).not.toContain('__var_')
    expect(logged).not.toContain('__sim_')
    expect(mockSkillsLogger.warn).toHaveBeenCalledWith('Skill not found', {
      hasSkillName: true,
      workspaceId: 'ws-1',
    })
  })
})
