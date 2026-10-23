import { describe, expect, it } from 'vitest'
import { copilotPlanSchema } from '@/lib/nexora/copilot/plan'

const agentStep = (name: string) => ({
  kind: 'agent',
  name,
  instructions: 'Vous résumez.',
  message: 'Résumez : {{declencheur.texte}}',
})

const plan = (steps: unknown[]) => ({
  title: 'Résumé',
  trigger: { kind: 'manuel', fields: [{ name: 'texte', description: 'Texte à résumer' }] },
  steps,
})

describe('copilot plan language', () => {
  it('refuses a plan longer than twelve steps', () => {
    const steps = Array.from({ length: 50 }, (_, index) => agentStep(`etape_${index}`))
    expect(copilotPlanSchema.safeParse(plan(steps)).success).toBe(false)
    expect(copilotPlanSchema.safeParse(plan(steps.slice(0, 13))).success).toBe(false)
    expect(copilotPlanSchema.safeParse(plan(steps.slice(0, 12))).success).toBe(true)
  })

  it.each([
    ['two steps with the same name', [agentStep('resume'), agentStep('resume')]],
    ['a name the trigger reference uses', [agentStep('declencheur')]],
    ['a name a trigger block takes', [agentStep('start')]],
    ['a name the executor reserves', [agentStep('loop')]],
    ['a name that is not snake_case ascii', [agentStep('Résumé final')]],
  ])('refuses %s, which would make block references ambiguous', (_case, steps) => {
    expect(copilotPlanSchema.safeParse(plan(steps)).success).toBe(false)
  })

  it('refuses a comparison that needs a value without one, and a numeric comparison on text', () => {
    const condition = (rule: Record<string, unknown>) =>
      plan([agentStep('tri'), { kind: 'condition', name: 'urgent', if: rule, then: [], else: [] }])
    expect(
      copilotPlanSchema.safeParse(condition({ ref: 'tri.content', operator: 'contient' })).success
    ).toBe(false)
    expect(
      copilotPlanSchema.safeParse(
        condition({ ref: 'tri.content', operator: 'superieur', value: 'beaucoup' })
      ).success
    ).toBe(false)
    expect(
      copilotPlanSchema.safeParse(
        condition({ ref: 'tri.content', operator: 'superieur', value: 3 })
      ).success
    ).toBe(true)
  })

  it('refuses a trigger field that hides one the Start block always provides', () => {
    const shadowing = {
      ...plan([agentStep('resume')]),
      trigger: { kind: 'manuel', fields: [{ name: 'input', description: 'Entrée' }] },
    }
    expect(copilotPlanSchema.safeParse(shadowing).success).toBe(false)
  })
})
