/**
 * What a 7B model writes instead of the step language, and that normalization must fix before
 * validation: French names with spaces and accents, type synonyms, loose times, references and
 * branch lists naming the steps as written. A valid plan must come out unchanged.
 */
import { describe, expect, it } from 'vitest'
import { type CompileContext, compilePlan } from '@/lib/nexora/copilot/compile'
import {
  AGENT_FIELD_WITHOUT_OUTPUT,
  CHAT_FIELDS_AND_KIND_REFERENCE,
  SCHEDULE_READING_TRIGGER,
  STEPS_INSIDE_BRANCHES,
  STEPS_READ_THROUGH_TRIGGER,
  VALIDATION_WITH_DECLARED_OUTPUT,
} from '@/lib/nexora/copilot/model-answers.fixtures'
import { normalizePlanCandidate } from '@/lib/nexora/copilot/normalize-plan'
import { copilotPlanSchema } from '@/lib/nexora/copilot/plan'

const context: CompileContext = {
  model: 'vllm/nexora-default',
  knowledgeBases: [{ id: 'kb-faq', name: 'FAQ clients' }],
  connect: { serverId: 'srv-connect', services: ['gmail'] },
}

type Step = Record<string, unknown> & { name: string }

/** The normalized plan, validated and compiled: what the Copilot would show and create. */
function normalizeAndCompile(candidate: Record<string, unknown>) {
  const { plan, warnings } = normalizePlanCandidate(structuredClone(candidate))
  const parsed = copilotPlanSchema.parse(plan)
  return {
    plan: parsed,
    steps: parsed.steps as Step[],
    warnings,
    compiled: compilePlan(parsed, context),
  }
}

describe('normalizePlanCandidate', () => {
  it('turns names into snake_case and rewrites every reference to them', () => {
    const { plan } = normalizePlanCandidate({
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
    }).plan as { steps: { name: string; message?: string }[] }

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
    }).plan as { steps: { output: { fields: { type: string }[] } }[] }

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
    }).plan as { trigger: { time: string } }

    expect(plan.trigger.time).toBe(expected)
  })

  it('leaves an http address for validation to refuse', () => {
    const plan = normalizePlanCandidate({
      title: 'API',
      trigger: { kind: 'chat' },
      steps: [{ kind: 'api', name: 'appel', method: 'GET', url: 'http://exemple.fr' }],
    }).plan as { steps: { url: string }[] }

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

    expect(normalizePlanCandidate(structuredClone(valid))).toEqual({ plan: valid, warnings: [] })
  })

  describe('repairs what qwen2.5:7b wrote on pc6', () => {
    it('moves steps written inside then/else after their condition and branches to them by name', () => {
      const { steps } = normalizeAndCompile(STEPS_INSIDE_BRANCHES)

      expect(steps.map((step) => step.name)).toEqual([
        'tri_email',
        'est_urgent',
        'alerte_urgent',
        'accuse_reception',
      ])
      expect(steps[1]).toMatchObject({ then: ['alerte_urgent'], else: ['accuse_reception'] })
    })

    it('keeps each branch in order, the then steps before the else steps', () => {
      const { steps } = normalizeAndCompile(CHAT_FIELDS_AND_KIND_REFERENCE)

      expect(steps.map((step) => step.name)).toEqual([
        'recherche_faq',
        'reponse_trouvee',
        'envoyer_reponse',
        'demander_confirmation',
        'confirmation_reponse_personnalisee',
        'envoyer_reponse_personnalisee',
      ])
      expect(steps[1]).toMatchObject({
        then: ['envoyer_reponse'],
        else: [
          'demander_confirmation',
          'confirmation_reponse_personnalisee',
          'envoyer_reponse_personnalisee',
        ],
      })
    })

    it('reads a step named by its kind as the only step of that kind', () => {
      const { steps } = normalizeAndCompile(CHAT_FIELDS_AND_KIND_REFERENCE)

      expect(steps[5]).toMatchObject({
        fields: [
          {
            name: 'reponse',
            value:
              'Réponse personnalisée : {{confirmation_reponse_personnalisee.submission.response}}',
          },
        ],
      })
    })

    it('reads any field of a chat trigger as its message, {{declencheur.input}}', () => {
      const { steps } = normalizeAndCompile(CHAT_FIELDS_AND_KIND_REFERENCE)

      expect(steps[0].message).toBe('{{declencheur.input}}')
      expect(steps[3].message).toBe('Aucune réponse trouvée dans la FAQ : {{declencheur.input}}')
    })

    it('drops trigger references from a schedule, which carries no data, and says so', () => {
      const { steps, warnings } = normalizeAndCompile(SCHEDULE_READING_TRIGGER)

      expect(steps[0].message).toBe('Rédigez une relance pour la facture impayée')
      expect(steps[1]).toMatchObject({
        fields: [{ name: 'contenu', value: '{{relance_facture.relance}}' }],
      })
      expect(warnings).toHaveLength(2)
      expect(warnings[0]).toContain('relance_facture')
      expect(warnings[0]).toContain('{{declencheur.email}}')
    })

    it('gives a scheduled agent a message when its message was only trigger data', () => {
      const scheduled = structuredClone(SCHEDULE_READING_TRIGGER)
      scheduled.steps[0].message = '{{declencheur.email}}'

      const { steps } = normalizeAndCompile(scheduled)

      expect(String(steps[0].message).length).toBeGreaterThan(0)
      expect(steps[0].message).not.toContain('{{')
    })

    it('reads a step written under declencheur as that step, not as trigger data', () => {
      const { steps, warnings } = normalizeAndCompile(STEPS_READ_THROUGH_TRIGGER)

      expect(steps.map((step) => step.message)).toEqual([
        'Trouvez les factures impayées depuis plus de 30 jours.',
        '{{recherche_factures_impaye.content}}',
        'Rédigez une relance pour la facture {{recherche_resultat.facture_impaye}} :',
        '{{relerce.relance}}',
      ])
      expect(warnings).toEqual([])
    })

    it('reads any field of an agent without output as its answer, content', () => {
      const { steps } = normalizeAndCompile(AGENT_FIELD_WITHOUT_OUTPUT)

      expect(steps[1]).toMatchObject({ if: { ref: 'recherche_faq.content' } })
      expect(steps[2].message).toBe('Voici la réponse à votre question : {{recherche_faq.content}}')
    })

    it('reads the outputs declared on a human validation as its approval form', () => {
      const { steps } = normalizeAndCompile(VALIDATION_WITH_DECLARED_OUTPUT)

      expect(steps.map((step) => step.name)).toEqual([
        'rediger_compte_rendu',
        'valider_compte_rendu',
        'valider_ou_non',
        'envoyer_compte_rendu',
      ])
      expect(steps[2]).toMatchObject({
        if: { ref: 'valider_compte_rendu.approuve' },
        then: ['envoyer_compte_rendu'],
      })
    })

    it('branches to a listed step written again inside a branch instead of duplicating it', () => {
      const plan = structuredClone(STEPS_INSIDE_BRANCHES)
      const [, condition] = plan.steps as Record<string, unknown>[]
      const alert = (condition.then as Record<string, unknown>[])[0]
      plan.steps.push(structuredClone(alert) as (typeof plan.steps)[number])

      const { steps } = normalizeAndCompile(plan)

      expect(steps.map((step) => step.name)).toEqual([
        'tri_email',
        'est_urgent',
        'accuse_reception',
        'alerte_urgent',
      ])
      expect(steps[1]).toMatchObject({ then: ['alerte_urgent'], else: ['accuse_reception'] })
    })

    it('drops a branch target naming no step, with a warning, while another target remains', () => {
      const { steps, warnings } = normalizeAndCompile({
        title: 'Tri',
        trigger: { kind: 'webhook' },
        steps: [
          {
            kind: 'condition',
            name: 'est_urgent',
            if: { ref: '{{declencheur.urgence}}', operator: 'egal', value: 'haute' },
            then: ['Alerte'],
            else: ['accuse_de_reception'],
          },
          { kind: 'agent', name: 'alerte', instructions: 'a', message: 'b' },
        ],
      })

      expect(steps[0]).toMatchObject({ then: ['alerte'], else: [] })
      expect(warnings).toEqual([expect.stringContaining('accuse_de_reception')])
    })

    it('leaves branch targets naming no step for validation when none would remain', () => {
      const { plan } = normalizePlanCandidate({
        title: 'Tri',
        trigger: { kind: 'webhook' },
        steps: [
          {
            kind: 'condition',
            name: 'est_urgent',
            if: { ref: '{{declencheur.urgence}}', operator: 'egal', value: 'haute' },
            then: ['alerte'],
            else: [],
          },
          { kind: 'agent', name: 'tri', instructions: 'a', message: 'b' },
        ],
      })
      const parsed = copilotPlanSchema.parse(plan)

      expect(() => compilePlan(parsed, context)).toThrow(/alerte/)
    })

    it('still refuses more than 12 steps once the branch steps are moved out', () => {
      const listed = Array.from({ length: 10 }, (_, index) => ({
        kind: 'attente',
        name: `pause_${index}`,
        seconds: 5,
      }))
      const inline = (name: string) => ({ kind: 'attente', name, seconds: 5 })
      const { plan } = normalizePlanCandidate({
        title: 'Trop long',
        trigger: { kind: 'webhook' },
        steps: [
          {
            kind: 'condition',
            name: 'choix',
            if: { ref: '{{declencheur.x}}', operator: 'vide' },
            then: [inline('a'), inline('b')],
            else: [inline('c')],
          },
          ...listed,
        ],
      })

      expect((plan.steps as unknown[]).length).toBe(14)
      expect(copilotPlanSchema.safeParse(plan).success).toBe(false)
    })
  })
})
