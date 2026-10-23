/**
 * What a 7B model writes instead of the step language, and that normalization must fix before
 * validation: French names with spaces and accents, type synonyms, loose times, references and
 * branch lists naming the steps as written. A valid plan must come out unchanged.
 */
import { describe, expect, it } from 'vitest'
import { normalizePlanCandidate } from '@/lib/nexora/copilot/normalize-plan'
import { copilotPlanSchema } from '@/lib/nexora/copilot/plan'

describe('normalizePlanCandidate', () => {
  it('turns names into snake_case and rewrites every reference to them', () => {
    const plan = normalizePlanCandidate({
      title: 'Tri',
      trigger: { kind: 'manuel', fields: [{ name: 'E-mail reçu', description: '' }] },
      steps: [
        {
          kind: 'agent',
          name: 'Tri des e-mails',
          instructions: 'Vous triez.',
          message: 'Classez : {{ declencheur.E-mail reçu }}',
          output: { fields: [{ name: 'Urgence élevée', type: 'Booléen' }] },
        },
        {
          kind: 'condition',
          name: '2e vérification',
          if: { ref: 'Tri des e-mails.Urgence élevée', operator: 'egal', value: 'true' },
          then: ['Alerte équipe'],
          else: [],
        },
        {
          kind: 'agent',
          name: 'Alerte équipe',
          instructions: 'Vous alertez.',
          message: 'Urgent : {{Tri des e-mails.Urgence élevée}} pour {{declencheur.E-mail reçu}}',
        },
      ],
    })

    const [tri, check, alert] = (plan as { steps: Record<string, unknown>[] }).steps
    expect(tri.name).toBe('tri_des_e_mails')
    expect(tri.message).toBe('Classez : {{declencheur.e_mail_recu}}')
    expect(tri.output).toEqual({ fields: [{ name: 'urgence_elevee', type: 'boolean' }] })
    expect(check.name).toBe('e_2e_verification')
    expect(check.if).toMatchObject({ ref: 'tri_des_e_mails.urgence_elevee' })
    expect(check.then).toEqual(['alerte_equipe'])
    expect(alert.message).toBe(
      'Urgent : {{tri_des_e_mails.urgence_elevee}} pour {{declencheur.e_mail_recu}}'
    )
    expect(copilotPlanSchema.safeParse(plan).success).toBe(true)
  })

  it('keeps step names unique and away from reserved names', () => {
    const plan = normalizePlanCandidate({
      title: 'Doublons',
      trigger: { kind: 'chat' },
      steps: [
        { kind: 'agent', name: 'Résumé', instructions: 'a', message: 'b' },
        { kind: 'agent', name: 'résumé', instructions: 'a', message: '{{Résumé.content}}' },
        { kind: 'attente', name: 'Start', seconds: 5 },
      ],
    }) as { steps: { name: string; message?: string }[] }

    expect(plan.steps.map((step) => step.name)).toEqual(['resume', 'resume_2', 'start_2'])
    expect(plan.steps[1].message).toBe('{{resume.content}}')
  })

  it.each([
    ['texte', 'string'],
    ['str', 'string'],
    ['Chaîne', 'string'],
    ['integer', 'number'],
    ['nombre', 'number'],
    ['float', 'number'],
    ['bool', 'boolean'],
    ['liste', 'string'],
    ['objet', 'string'],
  ])('reads the output type %s as %s', (written, expected) => {
    const plan = normalizePlanCandidate({
      title: 'Types',
      trigger: { kind: 'chat' },
      steps: [
        {
          kind: 'agent',
          name: 'a',
          instructions: 'a',
          message: 'b',
          output: { fields: [{ name: 'x', type: written }] },
        },
      ],
    }) as { steps: { output: { fields: { type: string }[] } }[] }

    expect(plan.steps[0].output.fields[0].type).toBe(expected)
  })

  it.each([
    ['9h', '09:00'],
    ['9 h 30', '09:30'],
    ['9:00', '09:00'],
    ['18H45', '18:45'],
    ['09:00', '09:00'],
  ])('writes the schedule time %s as %s', (written, expected) => {
    const plan = normalizePlanCandidate({
      title: 'Planifié',
      trigger: { kind: 'planification', frequency: 'jour', time: written },
      steps: [{ kind: 'attente', name: 'pause', seconds: 5 }],
    }) as { trigger: { time: string } }

    expect(plan.trigger.time).toBe(expected)
  })

  it('leaves an http address for validation to refuse', () => {
    const plan = normalizePlanCandidate({
      title: 'API',
      trigger: { kind: 'chat' },
      steps: [{ kind: 'api', name: 'appel', method: 'GET', url: 'http://exemple.fr' }],
    }) as { steps: { url: string }[] }

    expect(plan.steps[0].url).toBe('http://exemple.fr')
  })

  it('returns a valid plan unchanged', () => {
    const valid = {
      title: 'Tri urgent',
      trigger: { kind: 'webhook' },
      steps: [
        {
          kind: 'agent',
          name: 'tri',
          instructions: 'Vous classez.',
          message: 'Classez : {{declencheur.email}}',
          output: { fields: [{ name: 'urgence', type: 'string' }] },
        },
        {
          kind: 'condition',
          name: 'est_urgent',
          if: { ref: '{{tri.urgence}}', operator: 'egal', value: 'haute' },
          then: ['alerte'],
          else: [],
        },
        { kind: 'agent', name: 'alerte', instructions: 'Alertez.', message: '{{tri.urgence}}' },
      ],
    }

    expect(normalizePlanCandidate(structuredClone(valid))).toEqual(valid)
  })
})
