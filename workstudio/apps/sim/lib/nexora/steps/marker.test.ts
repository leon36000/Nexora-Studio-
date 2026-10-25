/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { compilePlan } from '@/lib/nexora/copilot/compile'
import { FIVE_PLANS_CONTEXT, fivePlans } from '@/lib/nexora/steps/five-plans.fixtures'
import { hasStepsMarker, resolveEditorMode } from '@/lib/nexora/steps/mode'
import { readSteps } from '@/lib/nexora/steps/read'
import { buildTemplateWorkflow, NEXORA_TEMPLATES } from '@/lib/nexora/templates'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'

describe('ce que le Copilote et les modèles PME ouvrent en Étapes', () => {
  it.each(fivePlans().map((plan) => [plan.title, plan] as const))(
    '« %s » : repère posé, forme reconnue, ouverture en Étapes',
    (_title, plan) => {
      const { state } = compilePlan(plan, FIVE_PLANS_CONTEXT)
      expect(hasStepsMarker(state)).toBe(true)
      const recognized = readSteps(state).recognized
      expect(recognized).toBe(true)
      expect(resolveEditorMode({ preference: null, marked: true, recognized })).toBe('steps')
    }
  )

  it('le repère survit à l’import du workflow', () => {
    const { state } = compilePlan(fivePlans()[0], FIVE_PLANS_CONTEXT)
    const { data, errors } = parseWorkflowJson(JSON.stringify(state))
    expect(errors).toEqual([])
    expect(hasStepsMarker(data)).toBe(true)
  })

  it.each(NEXORA_TEMPLATES.map((template) => [template.slug, template] as const))(
    'le modèle PME « %s » est reconnu et ouvert en Étapes',
    (_slug, template) => {
      const state = buildTemplateWorkflow(template, 'vllm/nexora-default')
      expect(hasStepsMarker(state)).toBe(true)
      const reading = readSteps(state)
      expect(reading.recognized, reading.recognized ? '' : reading.reasons.join(',')).toBe(true)
    }
  )
})
