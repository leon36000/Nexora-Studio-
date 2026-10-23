/**
 * What a 7B model writes instead of the step language, and that normalization must fix before
 * validation: French names with spaces and accents, type synonyms, loose times, references and
 * branch lists naming the steps as written. A valid plan must come out unchanged.
 */
import { describe, expect, it } from 'vitest'
import { type CompileContext, CopilotPlanError, compilePlan } from '@/lib/nexora/copilot/compile'
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

/** The normalized plan, validated: what compilation receives. */
function normalizeAndParse(candidate: Record<string, unknown>) {
  const { plan, warnings } = normalizePlanCandidate(structuredClone(candidate))
  const parsed = copilotPlanSchema.parse(plan)
  return { plan: parsed, steps: parsed.steps as Step[], warnings }
}

/** The normalized plan, validated and compiled: what the Copilot would show and create. */
function normalizeAndCompile(candidate: Record<string, unknown>) {
  const normalized = normalizeAndParse(candidate)
  return { ...normalized, compiled: compilePlan(normalized.plan, context) }
}

/** Why compilation refuses the normalized plan, which the retry sends back to the model. */
function refusal(candidate: Record<string, unknown>): string {
  const { plan } = normalizeAndParse(candidate)
  try {
    compilePlan(plan, context)
  } catch (error) {
    expect(error).toBeInstanceOf(CopilotPlanError)
    return (error as CopilotPlanError).detail
  }
  throw new Error('expected compilation to refuse the plan')
}

/** Edges of the compiled workflow as `source -> target [handle]`. */
function wiring(compiled: ReturnType<typeof compilePlan>): string[] {
  const nameOf = (id: string) => compiled.state.blocks[id]?.name
  return compiled.state.edges.map((edge) => {
    const handle = edge.sourceHandle === 'source' ? '' : ` [${edge.sourceHandle.split('-').pop()}]`
    return `${nameOf(edge.source)} -> ${nameOf(edge.target)}${handle}`
  })
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

    expect(plan.steps.map((step) => step.name)).toEqual(['resume_2', 'resume_3', 'start_2'])
    expect(plan.steps[1].message).toBe('{{resume_2.content}}')
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
      const { steps } = normalizeAndParse(CHAT_FIELDS_AND_KIND_REFERENCE)

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

    it('reads a step named by its kind as the only step of that kind, and says so', () => {
      const answer = structuredClone(CHAT_FIELDS_AND_KIND_REFERENCE)
      const branch = answer.steps[1].else as Record<string, unknown>[]
      branch[2].fields = [{ name: 'avis', value: '{{validation_humaine.commentaire}}' }]

      const { steps, warnings } = normalizeAndCompile(answer)

      expect(steps[5]).toMatchObject({
        fields: [{ name: 'avis', value: '{{confirmation_reponse_personnalisee.commentaire}}' }],
      })
      expect(warnings).toContainEqual(
        expect.stringContaining('« confirmation_reponse_personnalisee »')
      )
    })

    it('refuses submission.response, which the approval form never fills, instead of reading it empty', () => {
      const detail = refusal(CHAT_FIELDS_AND_KIND_REFERENCE)

      expect(detail).toContain('submission.response')
      expect(detail).toContain('« approuve »')
    })

    it('reads any field of a chat trigger as its message, {{declencheur.input}}, and says so', () => {
      const { steps, warnings } = normalizeAndParse(CHAT_FIELDS_AND_KIND_REFERENCE)

      expect(steps[0].message).toBe('{{declencheur.input}}')
      expect(steps[3].message).toBe('Aucune réponse trouvée dans la FAQ : {{declencheur.input}}')
      expect(warnings).toContainEqual(expect.stringContaining('{{declencheur.message_client}}'))
    })

    it('drops trigger references from a schedule, which carries no data, and names the dropped field', () => {
      const { steps, warnings } = normalizeAndCompile(SCHEDULE_READING_TRIGGER)

      expect(steps[0].message).toBe('Rédigez une relance pour la facture impayée')
      expect(steps[1]).toMatchObject({
        fields: [{ name: 'contenu', value: '{{relance_facture.relance}}' }],
      })
      expect(warnings[0]).toContain('relance_facture')
      expect(warnings[0]).toContain('{{declencheur.email}}')
      expect(warnings).toContainEqual(expect.stringMatching(/« envoyer_relance ».*champ « email »/))
    })

    it('gives a scheduled agent a message when its message was only trigger data', () => {
      const scheduled = structuredClone(SCHEDULE_READING_TRIGGER)
      scheduled.steps[0].message = '{{declencheur.email}}'

      const { steps } = normalizeAndCompile(scheduled)

      expect(String(steps[0].message).length).toBeGreaterThan(0)
      expect(steps[0].message).not.toContain('{{')
    })

    it('keeps a scheduled response whose every field was trigger data for compilation to refuse', () => {
      const scheduled = structuredClone(SCHEDULE_READING_TRIGGER)
      scheduled.steps[1].fields = [{ name: 'email', value: '{{declencheur.email}}' }]

      expect(refusal(scheduled)).toMatch(/planification/)
    })

    it('reads a step written under declencheur as that step under a schedule, and says so', () => {
      const { steps, warnings } = normalizeAndCompile(STEPS_READ_THROUGH_TRIGGER)

      expect(steps.map((step) => step.message)).toEqual([
        'Trouvez les factures impayées depuis plus de 30 jours.',
        '{{recherche_factures_impaye.content}}',
        'Rédigez une relance pour la facture {{recherche_resultat.facture_impaye}} :',
        '{{relerce.relance}}',
      ])
      expect(warnings).toHaveLength(3)
      expect(warnings).toContainEqual(expect.stringContaining('{{declencheur.relerce.relance}}'))
    })

    it('gives an agent without output the field later steps read, instead of its whole answer', () => {
      const { steps, warnings } = normalizeAndCompile(AGENT_FIELD_WITHOUT_OUTPUT)

      expect(steps[0]).toMatchObject({ output: { fields: [{ name: 'resultat', type: 'string' }] } })
      expect(steps[1]).toMatchObject({ if: { ref: 'recherche_faq.resultat' } })
      expect(steps[2].message).toBe(
        'Voici la réponse à votre question : {{recherche_faq.resultat}}'
      )
      expect(warnings).toEqual([expect.stringMatching(/« recherche_faq ».*« resultat »/)])
    })

    it('reads a yes/no declared on a human validation as its approval, and says so', () => {
      const { steps, warnings } = normalizeAndCompile(VALIDATION_WITH_DECLARED_OUTPUT)

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
      expect(warnings).toEqual([expect.stringContaining('valider_compte_rendu.validation')])
    })

    it('branches to a listed step written again inside a branch instead of duplicating it', () => {
      const plan = structuredClone(STEPS_INSIDE_BRANCHES)
      const [, condition] = plan.steps as Record<string, unknown>[]
      const alert = (condition.then as Record<string, unknown>[])[0]
      plan.steps.push(structuredClone(alert) as (typeof plan.steps)[number])

      const { steps, warnings } = normalizeAndCompile(plan)

      expect(steps.map((step) => step.name)).toEqual([
        'tri_email',
        'est_urgent',
        'accuse_reception',
        'alerte_urgent',
      ])
      expect(steps[1]).toMatchObject({ then: ['alerte_urgent'], else: ['accuse_reception'] })
      expect(warnings).toEqual([])
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

  describe('never changes what the workflow does', () => {
    const approvalPlan = (then: string[]) => ({
      title: 'Compte rendu',
      trigger: { kind: 'manuel', fields: [{ name: 'notes' }] },
      steps: [
        { kind: 'validation_humaine', name: 'valider', message: 'Valider ?' },
        {
          kind: 'condition',
          name: 'ok',
          if: { ref: 'valider.approuve', operator: 'egal', value: 'true' },
          then,
          else: ['archiver'],
        },
        {
          kind: 'agent',
          name: 'envoyer_email',
          instructions: 'Envoyez',
          message: '{{declencheur.notes}}',
          services: ['gmail'],
        },
        { kind: 'agent', name: 'archiver', instructions: 'a', message: 'b' },
      ],
    })

    it('refuses a branch target naming no step instead of running that step on every path', () => {
      const answer = {
        title: 'Paiement',
        trigger: { kind: 'webhook' },
        steps: [
          {
            kind: 'condition',
            name: 'gros_montant',
            if: { ref: 'declencheur.montant', operator: 'superieur', value: 1000 },
            then: ['validation'],
            else: ['paiement_auto'],
          },
          { kind: 'validation_humaine', name: 'validation', message: 'Valider le paiement ?' },
          { kind: 'api', name: 'payer_auto', method: 'POST', url: 'https://banque.example/payer' },
        ],
      }

      expect(normalizeAndParse(answer).steps[0]).toMatchObject({ else: ['paiement_auto'] })
      expect(refusal(answer)).toContain('paiement_auto')
    })

    it('reads a misspelled branch target as the one step it nearly names, and says so', () => {
      const { compiled, warnings } = normalizeAndCompile(approvalPlan(['envoyer_mail']))

      expect(wiring(compiled)).toEqual([
        'Start -> valider',
        'valider -> ok',
        'ok -> envoyer_email [if]',
        'ok -> archiver [else]',
      ])
      expect(warnings).toEqual([expect.stringMatching(/envoyer_mail.*envoyer_email/)])
    })

    it('does not guess between two steps a branch target nearly names', () => {
      const answer = approvalPlan(['envoyer_mail'])
      answer.steps.push({ ...answer.steps[2], name: 'envoyer_mails' })

      expect(refusal(answer)).toContain('envoyer_mail')
    })

    it('leaves a string field of a human validation unmapped unless its name says comment', () => {
      const answer = {
        title: 'V',
        trigger: { kind: 'manuel', fields: [{ name: 'notes' }] },
        steps: [
          {
            kind: 'validation_humaine',
            name: 'valider',
            message: 'Valider ?',
            output: {
              fields: [
                { name: 'decision', type: 'string' },
                { name: 'remarque', type: 'string' },
              ],
            },
          },
          {
            kind: 'condition',
            name: 'ok',
            if: { ref: 'valider.decision', operator: 'different', value: 'refuse' },
            then: ['envoyer'],
            else: [],
          },
          {
            kind: 'agent',
            name: 'envoyer',
            instructions: 'Envoyez',
            message: '{{declencheur.notes}} ({{valider.remarque}})',
          },
        ],
      }

      expect(normalizeAndParse(answer).steps[2].message).toBe(
        '{{declencheur.notes}} ({{valider.commentaire}})'
      )
      expect(refusal(answer)).toContain('valider.decision')
    })

    it('reads « oui » in a condition on the approval as true, and says so', () => {
      const answer = approvalPlan(['envoyer_email'])
      Object.assign(answer.steps[0], { output: { fields: [{ name: 'approuve', type: 'string' }] } })
      Object.assign(answer.steps[1], {
        if: { ref: 'valider.approuve', operator: 'egal', value: 'Oui' },
      })

      const { steps, compiled, warnings } = normalizeAndCompile(answer)

      expect(steps[1]).toMatchObject({ if: { value: 'true' } })
      const condition = Object.values(compiled.state.blocks).find((b) => b.name === 'ok')
      expect(String(condition?.subBlocks.conditions.value)).toContain('=== \\"true\\"')
      expect(warnings).toEqual([expect.stringMatching(/« Oui ».*true/)])
    })

    it('gives an agent without output the field a condition tests, instead of testing its whole answer', () => {
      const { steps, compiled, warnings } = normalizeAndCompile({
        title: 'A',
        trigger: { kind: 'chat' },
        steps: [
          { kind: 'agent', name: 'tri', instructions: 'a', message: '{{declencheur.input}}' },
          {
            kind: 'condition',
            name: 'urgent',
            if: { ref: 'tri.urgence', operator: 'egal', value: 'haute' },
            then: ['alerte'],
            else: [],
          },
          { kind: 'agent', name: 'alerte', instructions: 'a', message: 'b' },
        ],
      })

      expect(steps[0]).toMatchObject({ output: { fields: [{ name: 'urgence', type: 'string' }] } })
      const condition = Object.values(compiled.state.blocks).find((b) => b.name === 'urgent')
      expect(String(condition?.subBlocks.conditions.value)).toContain('<tri.urgence>')
      expect(warnings).toEqual([expect.stringMatching(/« tri ».*« urgence »/)])
    })

    it('refuses rather than guesses when an agent is read both as its whole answer and as a field', () => {
      const detail = refusal({
        title: 'A',
        trigger: { kind: 'chat' },
        steps: [
          { kind: 'agent', name: 'tri', instructions: 'a', message: '{{declencheur.input}}' },
          {
            kind: 'condition',
            name: 'urgent',
            if: { ref: 'tri.urgence', operator: 'egal', value: 'haute' },
            then: [],
            else: [],
          },
          {
            kind: 'reponse',
            name: 'retour',
            fields: [{ name: 'texte', value: '{{tri.content}}' }],
          },
        ],
      })

      expect(detail).toContain('tri.urgence')
    })

    it('keeps trigger data in an API address under a schedule for compilation to refuse', () => {
      const answer = {
        title: 'S',
        trigger: { kind: 'planification', frequency: 'jour', time: '09:00' },
        steps: [
          {
            kind: 'api',
            name: 'supprimer',
            method: 'DELETE',
            url: 'https://api.example/clients/{{declencheur.client_id}}',
            body: { client: '{{declencheur.client_id}}' },
          },
        ],
      }

      expect(normalizeAndParse(answer).steps[0]).toMatchObject({
        url: 'https://api.example/clients/{{declencheur.client_id}}',
      })
      expect(refusal(answer)).toMatch(/planification/)
    })

    it('does not read {{declencheur.x}} of a manual trigger as the step x', () => {
      const answer = {
        title: 'M',
        trigger: { kind: 'manuel', fields: [] },
        steps: [
          { kind: 'agent', name: 'email', instructions: 'Écrivez un e-mail', message: 'b' },
          {
            kind: 'agent',
            name: 'envoi',
            instructions: 'Envoyez',
            message: '{{declencheur.email}}',
          },
        ],
      }

      expect(normalizeAndParse(answer).steps[1].message).toBe('{{declencheur.email}}')
      expect(refusal(answer)).toContain('declencheur.email')
    })

    it('reads {{declencheur.step.field}} of a manual trigger as that step, and says so', () => {
      const { steps, warnings } = normalizeAndCompile({
        title: 'M',
        trigger: { kind: 'manuel', fields: [] },
        steps: [
          { kind: 'agent', name: 'email', instructions: 'Écrivez un e-mail', message: 'b' },
          {
            kind: 'agent',
            name: 'envoi',
            instructions: 'Envoyez',
            message: '{{declencheur.email.content}}',
          },
        ],
      })

      expect(steps[1].message).toBe('{{email.content}}')
      expect(warnings).toEqual([expect.stringContaining('{{declencheur.email.content}}')])
    })

    it('keeps a branch step named like another kind of step, under a new name', () => {
      const { steps, compiled, warnings } = normalizeAndCompile({
        title: 'T',
        trigger: { kind: 'webhook' },
        steps: [
          {
            kind: 'condition',
            name: 'c',
            if: { ref: 'declencheur.x', operator: 'vide' },
            then: [{ kind: 'api', name: 'notifier', method: 'POST', url: 'https://a.example' }],
            else: [],
          },
          { kind: 'agent', name: 'Notifier', instructions: 'a', message: 'b' },
        ],
      })

      expect(steps.map((step) => [step.kind, step.name])).toEqual([
        ['condition', 'c'],
        ['api', 'notifier_2'],
        ['agent', 'notifier'],
      ])
      expect(wiring(compiled)).toContain('c -> notifier_2 [if]')
      expect(warnings).toEqual([expect.stringContaining('notifier_2')])
    })

    it('says so when a step written again inside a branch differs from the listed one', () => {
      const plan = structuredClone(STEPS_INSIDE_BRANCHES)
      const [, condition] = plan.steps as Record<string, unknown>[]
      const alert = structuredClone((condition.then as Record<string, unknown>[])[0])
      plan.steps.push({ ...alert, message: 'Autre message' } as (typeof plan.steps)[number])

      const { steps, warnings } = normalizeAndCompile(plan)

      expect(steps.find((step) => step.name === 'alerte_urgent')?.message).toBe('Autre message')
      expect(warnings).toEqual([expect.stringContaining('alerte_urgent')])
    })

    it('binds each reference to the step it named when two names fold to the same snake_case', () => {
      const { steps } = normalizeAndCompile({
        title: 'C',
        trigger: { kind: 'webhook' },
        steps: [
          { kind: 'agent', name: 'Résumé', instructions: 'a', message: 'b' },
          { kind: 'agent', name: 'resume', instructions: 'a', message: 'c' },
          {
            kind: 'condition',
            name: 'choix',
            if: { ref: 'resume.content', operator: 'vide' },
            then: ['resume_court'],
            else: [],
          },
          { kind: 'agent', name: 'resume_court', instructions: 'a', message: '{{Résumé.content}}' },
          { kind: 'agent', name: 'x'.repeat(50), instructions: 'a', message: 'd' },
          { kind: 'agent', name: 'x'.repeat(51), instructions: 'a', message: 'e' },
          {
            kind: 'reponse',
            name: 'fin',
            fields: [{ name: 'texte', value: `{{${'x'.repeat(51)}.content}}` }],
          },
        ],
      })
      const named = (index: number) => steps[index].name

      expect(steps[2]).toMatchObject({ if: { ref: `${named(1)}.content` } })
      expect(steps[3].message).toBe(`{{${named(0)}.content}}`)
      expect(named(0)).not.toBe(named(1))
      expect(steps[6]).toMatchObject({ fields: [{ value: `{{${named(5)}.content}}` }] })
      expect(named(4)).not.toBe(named(5))
    })

    it('refuses a reference that two step names fold to, without picking one', () => {
      const detail = refusal({
        title: 'C',
        trigger: { kind: 'webhook' },
        steps: [
          { kind: 'agent', name: 'Résumé', instructions: 'a', message: 'b' },
          { kind: 'agent', name: 'RÉSUMÉ', instructions: 'a', message: 'c' },
          { kind: 'agent', name: 'suite', instructions: 'a', message: '{{resume.content}}' },
        ],
      })

      expect(detail).toContain('resume.content')
    })

    it('refuses two steps written with the same name instead of renaming one', () => {
      const { plan } = normalizePlanCandidate({
        title: 'D',
        trigger: { kind: 'webhook' },
        steps: [
          { kind: 'agent', name: 'alerte', instructions: 'a', message: 'b' },
          { kind: 'agent', name: 'alerte', instructions: 'a', message: 'c' },
          { kind: 'agent', name: 'suite', instructions: 'a', message: '{{alerte.content}}' },
        ],
      })

      expect(copilotPlanSchema.safeParse(plan).success).toBe(false)
    })
  })
})
