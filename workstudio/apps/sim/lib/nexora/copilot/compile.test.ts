import { describe, expect, it } from 'vitest'
import { type CompileContext, CopilotPlanError, compilePlan } from '@/lib/nexora/copilot/compile'
import { copilotPlanSchema } from '@/lib/nexora/copilot/plan'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'

const context: CompileContext = {
  model: 'vllm/nexora-default',
  knowledgeBases: [{ id: 'kb-tarifs', name: 'Tarifs 2026' }],
  connect: { serverId: 'srv-connect', services: ['Brevo', 'Google Sheets'] },
}

function compile(input: unknown, ctx: CompileContext = context) {
  return compilePlan(copilotPlanSchema.parse(input), ctx)
}

type Compiled = ReturnType<typeof compile>['state']

function block(state: Compiled, name: string) {
  const found = Object.values(state.blocks).find((b) => b.name === name)
  if (!found) throw new Error(`no block named ${name}`)
  return found
}

function value(state: Compiled, name: string, subBlockId: string): unknown {
  return block(state, name).subBlocks[subBlockId]?.value
}

/** Edges as `source name -> target name` (with the handle when it is not the default). */
function wiring(state: Compiled): string[] {
  const nameOf = (id: string) => state.blocks[id]?.name
  return state.edges.map((edge) => {
    const handle = edge.sourceHandle === 'source' ? '' : ` [${edge.sourceHandle}]`
    return `${nameOf(edge.source)} -> ${nameOf(edge.target)}${handle}`
  })
}

function expectPlanError(run: () => unknown, code: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(CopilotPlanError)
    expect((error as CopilotPlanError).code).toBe(code)
    expect((error as CopilotPlanError).detail.length).toBeGreaterThan(0)
    return
  }
  throw new Error(`expected CopilotPlanError(${code})`)
}

const agent = (name: string, message: string, extra: Record<string, unknown> = {}) => ({
  kind: 'agent',
  name,
  instructions: 'Vous aidez une PME.',
  message,
  ...extra,
})

const manualPlan = (
  steps: unknown[],
  fields = [{ name: 'email', description: 'E-mail reçu' }]
) => ({
  title: 'Tri des e-mails',
  trigger: { kind: 'manuel', fields },
  steps,
})

const conditionPlan = {
  title: 'Tri urgent',
  trigger: { kind: 'webhook' },
  steps: [
    agent('tri', 'Classez : {{declencheur.email}}', {
      output: { fields: [{ name: 'urgence', type: 'string' }] },
    }),
    {
      kind: 'condition',
      name: 'est_urgent',
      if: { ref: '{{tri.urgence}}', operator: 'egal', value: 'haute' },
      then: ['alerte'],
      else: ['brouillon'],
    },
    agent('alerte', 'Rédigez une alerte : {{tri.urgence}}'),
    agent('brouillon', 'Rédigez un brouillon pour {{declencheur.email}}'),
    { kind: 'reponse', name: 'retour', fields: [{ name: 'urgence', value: '{{tri.urgence}}' }] },
  ],
}

describe('compilePlan triggers', () => {
  it('turns a manual trigger into the Start block with its input fields', () => {
    const { state } = compile(manualPlan([agent('resume', 'Résumez : {{declencheur.email}}')]))
    const start = block(state, 'Start')
    expect(start.type).toBe('start_trigger')
    expect(value(state, 'Start', 'inputFormat')).toEqual([
      expect.objectContaining({ name: 'email', type: 'string', description: 'E-mail reçu' }),
    ])
    expect(value(state, 'resume', 'messages')).toEqual([
      { role: 'system', content: 'Vous aidez une PME.' },
      { role: 'user', content: 'Résumez : <start.email>' },
    ])
    expect(wiring(state)).toEqual(['Start -> resume'])
  })

  it('turns a chat trigger into the Start block whose message is <start.input>', () => {
    const { state } = compile({
      title: 'Questions clients',
      trigger: { kind: 'chat' },
      steps: [agent('reponse_client', '{{declencheur.input}}')],
    })
    expect(block(state, 'Start').type).toBe('start_trigger')
    expect(value(state, 'reponse_client', 'messages')).toEqual([
      expect.anything(),
      { role: 'user', content: '<start.input>' },
    ])
  })

  it('turns a webhook trigger into a generic webhook with authentication on and a token', () => {
    const { state } = compile({
      title: 'Webhook',
      trigger: { kind: 'webhook' },
      steps: [agent('lecture', 'Objet : {{declencheur.email.subject}}')],
    })
    expect(block(state, 'Webhook').type).toBe('generic_webhook')
    expect(value(state, 'Webhook', 'requireAuth')).toBe(true)
    expect(value(state, 'Webhook', 'token')).toEqual(expect.stringMatching(/.{16,}/))
    expect(value(state, 'lecture', 'messages')).toEqual([
      expect.anything(),
      { role: 'user', content: 'Objet : <webhook.email.subject>' },
    ])
  })

  it.each([
    [
      { frequency: 'minutes', interval: 15 },
      { scheduleType: 'minutes', minutesInterval: '15' },
    ],
    [
      { frequency: 'heure', time: '08:30' },
      { scheduleType: 'hourly', hourlyMinute: '30' },
    ],
    [
      { frequency: 'heure', interval: 2 },
      { scheduleType: 'custom', cronExpression: '0 */2 * * *' },
    ],
    [
      { frequency: 'jour', time: '07:45' },
      { scheduleType: 'daily', dailyTime: '07:45' },
    ],
    [
      { frequency: 'semaine', weekday: 'lundi', time: '09:00' },
      { scheduleType: 'weekly', weeklyDay: 'MON', weeklyDayTime: '09:00' },
    ],
    [
      { frequency: 'mois', dayOfMonth: 5, time: '10:15' },
      { scheduleType: 'monthly', monthlyDay: '5', monthlyTime: '10:15' },
    ],
  ])('schedules %o as the schedule block expects', (trigger, expected) => {
    const { state } = compile({
      title: 'Relances',
      trigger: { kind: 'planification', ...trigger },
      steps: [agent('relance', 'Préparez les relances de la semaine.')],
    })
    expect(block(state, 'Planification').type).toBe('schedule')
    for (const [id, expectedValue] of Object.entries(expected)) {
      expect(value(state, 'Planification', id), id).toBe(expectedValue)
    }
    expect(value(state, 'Planification', 'timezone')).toBe('Europe/Paris')
  })

  it('refuses a reference to the trigger of a schedule, which carries no data', () => {
    expectPlanError(
      () =>
        compile({
          title: 'Relances',
          trigger: { kind: 'planification', frequency: 'jour' },
          steps: [agent('relance', 'Relancez {{declencheur.client}}')],
        }),
      'reference-unknown'
    )
  })
})

describe('compilePlan steps', () => {
  it('gives an agent the Nexora Connect tools and its knowledge bases, by name', () => {
    const { state, warnings } = compile(
      manualPlan([
        agent('envoi', 'Envoyez {{declencheur.email}}', {
          services: ['brevo'],
          knowledgeBases: ['tarifs 2026'],
        }),
      ])
    )
    expect(warnings).toEqual([])
    const tools = value(state, 'envoi', 'tools') as Array<Record<string, unknown>>
    const mcp = tools.filter((tool) => tool.type === 'mcp')
    expect(mcp.map((tool) => (tool.params as Record<string, string>).toolName)).toEqual([
      'search_actions',
      'get_action_guide',
      'execute_action',
    ])
    for (const tool of mcp) {
      expect(tool.params).toEqual(
        expect.objectContaining({ serverId: 'srv-connect', serverName: 'Nexora Connect' })
      )
    }
    expect(tools.find((tool) => tool.type === 'knowledge')?.params).toEqual({
      knowledgeBaseSelector: 'kb-tarifs',
    })
    const [system] = value(state, 'envoi', 'messages') as Array<{ content: string }>
    expect(system.content).toContain('Brevo')
    expect(system.content).toContain('Tarifs 2026')
  })

  it('ignores unknown services and knowledge bases with a warning instead of failing', () => {
    const { state, warnings } = compile(
      manualPlan([
        agent('envoi', 'Envoyez {{declencheur.email}}', {
          services: ['Salesforce'],
          knowledgeBases: ['Catalogue'],
        }),
      ])
    )
    expect(value(state, 'envoi', 'tools') ?? []).toEqual([])
    expect(warnings).toHaveLength(2)
    expect(warnings.join('\n')).toContain('Salesforce')
    expect(warnings.join('\n')).toContain('Catalogue')

    const withoutConnect = compile(
      manualPlan([agent('envoi', 'Envoyez {{declencheur.email}}', { services: ['Brevo'] })]),
      { model: context.model, knowledgeBases: [] }
    )
    expect(withoutConnect.warnings).toHaveLength(1)
    expect(value(withoutConnect.state, 'envoi', 'tools') ?? []).toEqual([])
  })

  it('asks an agent with an output for those fields, and lets later steps read them', () => {
    const { state } = compile(conditionPlan)
    const format = JSON.parse(String(value(state, 'tri', 'responseFormat')))
    expect(format.schema).toEqual({
      type: 'object',
      properties: { urgence: { type: 'string' } },
      required: ['urgence'],
      additionalProperties: false,
    })
    expect(JSON.stringify(value(state, 'alerte', 'messages'))).toContain('<tri.urgence>')
  })

  it('refuses <content> on an agent whose output is structured, since it no longer exists', () => {
    expectPlanError(
      () =>
        compile(
          manualPlan([
            agent('tri', 'Classez {{declencheur.email}}', {
              output: { fields: [{ name: 'categorie', type: 'string' }] },
            }),
            agent('suite', 'Catégorie : {{tri.content}}'),
          ])
        ),
      'reference-unknown'
    )
  })

  it('compiles api, wait, human validation and response steps', () => {
    const { state } = compile(
      manualPlan([
        {
          kind: 'api',
          name: 'meteo',
          method: 'POST',
          url: 'https://api.exemple.fr/v1/{{declencheur.email}}',
          body: { ville: 'Lyon' },
        },
        { kind: 'attente', name: 'pause', seconds: 30 },
        { kind: 'attente', name: 'nuit', seconds: 7200 },
        { kind: 'validation_humaine', name: 'accord', message: 'Valider {{meteo.data}} ?' },
        {
          kind: 'reponse',
          name: 'retour',
          fields: [
            { name: 'meteo', value: '{{meteo.data.temperature}}' },
            { name: 'avis', value: '{{accord.submission.commentaire}}' },
          ],
        },
      ])
    )
    expect(block(state, 'meteo').type).toBe('api')
    expect(value(state, 'meteo', 'method')).toBe('POST')
    expect(value(state, 'meteo', 'url')).toBe('https://api.exemple.fr/v1/<start.email>')
    expect(JSON.parse(String(value(state, 'meteo', 'body')))).toEqual({ ville: 'Lyon' })

    expect(block(state, 'pause').type).toBe('wait')
    expect([value(state, 'pause', 'timeValue'), value(state, 'pause', 'timeUnit')]).toEqual([
      '30',
      'seconds',
    ])
    expect(value(state, 'pause', 'async')).toBe(false)
    expect(value(state, 'nuit', 'async')).toBe(true)
    expect([value(state, 'nuit', 'timeValue'), value(state, 'nuit', 'timeUnitLong')]).toEqual([
      '2',
      'hours',
    ])

    expect(block(state, 'accord').type).toBe('human_in_the_loop_v2')
    expect(value(state, 'accord', 'builderData')).toEqual([
      expect.objectContaining({ name: 'message', value: 'Valider <meteo.data> ?' }),
    ])

    expect(block(state, 'retour').type).toBe('response')
    expect(value(state, 'retour', 'dataMode')).toBe('structured')
    expect(value(state, 'retour', 'builderData')).toEqual([
      expect.objectContaining({ name: 'meteo', value: '<meteo.data.temperature>' }),
      expect.objectContaining({ name: 'avis', value: '<accord.submission.commentaire>' }),
    ])
    expect(wiring(state)).toEqual([
      'Start -> meteo',
      'meteo -> pause',
      'pause -> nuit',
      'nuit -> accord',
      'accord -> retour',
    ])
  })
})

describe('compilePlan conditions', () => {
  it('wires each branch to the handle the editor stores and joins them at the next step', () => {
    const { state } = compile(conditionPlan)
    const condition = block(state, 'est_urgent')
    expect(condition.type).toBe('condition')
    const branches = JSON.parse(String(value(state, 'est_urgent', 'conditions')))
    expect(branches.map((b: { id: string; title: string }) => [b.id, b.title])).toEqual([
      [`${condition.id}-if`, 'if'],
      [`${condition.id}-else`, 'else'],
    ])
    expect(branches[0].value).toContain('<tri.urgence>')
    expect(wiring(state).sort()).toEqual(
      [
        'Webhook -> tri',
        'tri -> est_urgent',
        `est_urgent -> alerte [condition-${condition.id}-if]`,
        `est_urgent -> brouillon [condition-${condition.id}-else]`,
        'alerte -> retour',
        'brouillon -> retour',
      ].sort()
    )
  })

  it('sends an empty branch straight to the step after the condition', () => {
    const { state } = compile({
      ...conditionPlan,
      steps: conditionPlan.steps
        .filter((step) => step.name !== 'brouillon')
        .map((step) => (step.kind === 'condition' ? { ...step, else: [] } : step)),
    })
    const condition = block(state, 'est_urgent')
    expect(wiring(state)).toContain(`est_urgent -> retour [condition-${condition.id}-else]`)
  })

  it.each([
    ['contient', 'urgent', (e: string) => e.includes('<tri.urgence>') && e.includes('"urgent"')],
    ['superieur', '3', (e: string) => e.includes('Number(<tri.urgence>) > 3')],
    ['vide', undefined, (e: string) => e.includes('<tri.urgence>') && e.includes("=== ''")],
  ])('writes the %s rule as an expression on the referenced output', (operator, ruleValue, ok) => {
    const steps = conditionPlan.steps.map((step) =>
      step.kind === 'condition'
        ? { ...step, if: { ref: 'tri.urgence', operator, value: ruleValue } }
        : step
    )
    const { state } = compile({ ...conditionPlan, steps })
    const [rule] = JSON.parse(String(value(state, 'est_urgent', 'conditions')))
    expect(ok(rule.value), rule.value).toBe(true)
  })

  it('branches on the approval the person gave in a human validation', () => {
    const { state } = compile(
      manualPlan([
        agent('compte_rendu', 'Rédigez le compte rendu de {{declencheur.email}}'),
        {
          kind: 'validation_humaine',
          name: 'accord',
          message: 'Valider {{compte_rendu.content}} ?',
        },
        {
          kind: 'condition',
          name: 'est_valide',
          if: { ref: 'accord.approuve', operator: 'egal', value: true },
          then: ['envoi'],
          else: [],
        },
        {
          kind: 'reponse',
          name: 'envoi',
          fields: [
            { name: 'texte', value: '{{compte_rendu.content}}' },
            { name: 'avis', value: '{{accord.commentaire}}' },
          ],
        },
      ])
    )
    const [rule] = JSON.parse(String(value(state, 'est_valide', 'conditions')))
    expect(rule.value).toContain('<accord.approuve>')
    expect(value(state, 'envoi', 'builderData')).toContainEqual(
      expect.objectContaining({ name: 'avis', value: '<accord.commentaire>' })
    )
  })

  it('keeps a quote in the compared value from breaking out of the expression', () => {
    const steps = conditionPlan.steps.map((step) =>
      step.kind === 'condition'
        ? { ...step, if: { ref: 'tri.urgence', operator: 'contient', value: '") || true || ("' } }
        : step
    )
    const { state } = compile({ ...conditionPlan, steps })
    const [rule] = JSON.parse(String(value(state, 'est_urgent', 'conditions')))
    expect(rule.value).toContain(JSON.stringify('") || true || ("'.toLowerCase()))
  })

  it.each([
    ['branch-unknown', { then: ['inexistante'] }],
    ['branch-cycle', { then: ['tri'] }],
    ['branch-invalid', { then: ['alerte'], else: ['alerte'] }],
  ])('refuses a %s branch', (code, branches) => {
    const steps = conditionPlan.steps.map((step) =>
      step.kind === 'condition' ? { ...step, ...branches } : step
    )
    expectPlanError(() => compile({ ...conditionPlan, steps }), code)
  })
})

describe('compilePlan references', () => {
  it.each([
    ['a step that does not exist', 'Voici {{etape_inconnue.content}}', 'reference-unknown'],
    ['a field the trigger does not declare', 'Voici {{declencheur.adresse}}', 'reference-unknown'],
    ['an environment secret', 'Clé : {{OPENAI_API_KEY}}', 'reference-unknown'],
    ['a step that runs later', 'Voici {{apres.content}}', 'reference-unreachable'],
  ])('refuses %s', (_case, message, code) => {
    expectPlanError(
      () => compile(manualPlan([agent('avant', message), agent('apres', 'Bonjour')])),
      code
    )
  })

  it('refuses a step that reads the other branch of a condition, which never ran', () => {
    const steps = conditionPlan.steps.map((step) =>
      step.name === 'brouillon' ? agent('brouillon', 'Reprenez {{alerte.content}}') : step
    )
    expectPlanError(() => compile({ ...conditionPlan, steps }), 'reference-unreachable')
  })

  it('refuses a step after the join that reads a branch which may not have run', () => {
    const steps = conditionPlan.steps
      .filter((step) => step.name !== 'brouillon')
      .map((step) => {
        if (step.kind === 'condition') return { ...step, then: ['alerte'], else: [] }
        if (step.name === 'retour') {
          return { ...step, fields: [{ name: 'alerte', value: '{{alerte.content}}' }] }
        }
        return step
      })
    try {
      compile({ ...conditionPlan, steps })
    } catch (error) {
      expect(error).toBeInstanceOf(CopilotPlanError)
      expect((error as CopilotPlanError).code).toBe('reference-unreachable')
      expect((error as CopilotPlanError).detail).toContain("« alerte » ne s'exécute pas toujours")
      return
    }
    throw new Error('expected the join to refuse {{alerte.content}}')
  })

  it('lets a step after the join read a step both branches ran after', () => {
    const steps = conditionPlan.steps.map((step) =>
      step.name === 'retour'
        ? { ...step, fields: [{ name: 'urgence', value: '{{tri.urgence}}' }] }
        : step
    )
    expect(() => compile({ ...conditionPlan, steps })).not.toThrow()
  })

  it('refuses a condition on an output that does not exist', () => {
    const steps = conditionPlan.steps.map((step) =>
      step.kind === 'condition'
        ? { ...step, if: { ref: 'tri.priorite', operator: 'non_vide' } }
        : step
    )
    expectPlanError(() => compile({ ...conditionPlan, steps }), 'reference-unknown')
  })
})

describe('compilePlan output', () => {
  it.each([
    ['manual', manualPlan([agent('resume', '{{declencheur.email}}')])],
    ['branching', conditionPlan],
  ])('builds a %s workflow the importer accepts, with branch handles kept in step', (_n, plan) => {
    const { state } = compile(plan)
    const { data, errors } = parseWorkflowJson(JSON.stringify({ version: '1.0', state }))
    expect(errors).toEqual([])
    if (!data) throw new Error('not imported')
    expect(Object.keys(data.blocks)).toHaveLength(Object.keys(state.blocks).length)
    expect(data.edges).toHaveLength(state.edges.length)
    for (const edge of data.edges) {
      expect(data.blocks[edge.source]).toBeDefined()
      expect(data.blocks[edge.target]).toBeDefined()
      if (edge.sourceHandle?.startsWith('condition-')) {
        const conditions = JSON.parse(String(data.blocks[edge.source].subBlocks.conditions.value))
        const ids = conditions.map((c: { id: string }) => `condition-${c.id}`)
        expect(ids).toContain(edge.sourceHandle)
      }
    }
  })

  it('lays the steps out left to right, branches on separate rows', () => {
    const { state } = compile(conditionPlan)
    const x = (name: string) => block(state, name).position.x
    const y = (name: string) => block(state, name).position.y
    expect(x('Webhook')).toBeLessThan(x('tri'))
    expect(x('tri')).toBeLessThan(x('est_urgent'))
    expect(x('est_urgent')).toBeLessThan(x('alerte'))
    expect(x('alerte')).toBe(x('brouillon'))
    expect(y('alerte')).not.toBe(y('brouillon'))
    expect(x('alerte')).toBeLessThan(x('retour'))
  })
})
