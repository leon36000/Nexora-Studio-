import { describe, expect, it } from 'vitest'
import {
  buildTemplateWorkflow,
  NEXORA_TEMPLATES,
  resolveTemplateModel,
} from '@/lib/nexora/templates'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'

describe('Nexora SME workflow templates', () => {
  it('ships the thirty SME templates, the five original ones first', () => {
    const slugs = NEXORA_TEMPLATES.map((t) => t.slug)
    expect(slugs.slice(0, 5)).toEqual([
      'devis',
      'relance-facture',
      'support-faq',
      'tri-emails',
      'compte-rendu',
    ])
    expect(slugs).toHaveLength(30)
    expect(new Set(slugs).size).toBe(30)
    expect(new Set(NEXORA_TEMPLATES.map((t) => t.name)).size).toBe(30)
  })

  it.each(NEXORA_TEMPLATES.map((t) => [t.slug, t] as const))(
    '%s builds a workflow the import parser accepts',
    (_slug, template) => {
      const state = buildTemplateWorkflow(template, 'vllm/nexora-default')
      const { data, errors } = parseWorkflowJson(JSON.stringify(state))
      expect(errors).toEqual([])
      expect(data).not.toBeNull()
      const blocks = Object.values(state.blocks)
      expect(blocks.filter((b) => b.type === 'start_trigger')).toHaveLength(1)
      expect(blocks.filter((b) => b.type === 'agent').length).toBeGreaterThanOrEqual(1)
      expect(state.edges).toHaveLength(blocks.length - 1)
    }
  )

  it('gives every agent the Nexora model and wires each step to the previous one', () => {
    const state = buildTemplateWorkflow(NEXORA_TEMPLATES[3], 'vllm/nexora-qwen')
    const agents = Object.values(state.blocks).filter((b) => b.type === 'agent')
    for (const agent of agents) expect(agent.subBlocks.model.value).toBe('vllm/nexora-qwen')
    const ids = Object.keys(state.blocks)
    expect(state.edges.map((e) => [e.source, e.target])).toEqual(
      ids.slice(1).map((id, index) => [ids[index], id])
    )
  })

  it('gives every text input an example value, so a first run works without typing', () => {
    for (const template of NEXORA_TEMPLATES) {
      for (const input of template.inputs.filter((candidate) => candidate.type !== 'file')) {
        expect(input.example.trim(), `${template.slug}.${input.name}`).not.toBe('')
      }
    }
  })

  it('fills the start fields with their example so a test runs without typing, except addresses', () => {
    for (const template of NEXORA_TEMPLATES) {
      const state = buildTemplateWorkflow(template, 'vllm/nexora-default')
      const start = Object.values(state.blocks).find((block) => block.type === 'start_trigger')
      const fields = start?.subBlocks.inputFormat.value as { name: string; value: string }[]
      for (const input of template.inputs.filter((candidate) => candidate.type !== 'file')) {
        const field = fields.find((candidate) => candidate.name === input.name)
        const isAddress = /^\S+@\S+$/.test(input.example)
        expect(field?.value, `${template.slug}.${input.name}`).toBe(isAddress ? '' : input.example)
      }
    }
  })

  it('only references inputs the start block declares', () => {
    for (const template of NEXORA_TEMPLATES) {
      const declared = new Set(template.inputs.map((input) => input.name))
      const prompts = template.steps
        .flatMap((step) => (step.kind === undefined ? [step.system, step.user] : []))
        .join('\n')
      for (const [, name] of prompts.matchAll(/<start\.([a-z_]+)>/g)) {
        expect(declared.has(name)).toBe(true)
      }
    }
  })

  it('uses the configured default model, falling back to nexora-default', () => {
    expect(resolveTemplateModel(undefined)).toBe('vllm/nexora-default')
    expect(resolveTemplateModel('nexora-qwen')).toBe('vllm/nexora-qwen')
    expect(resolveTemplateModel('vllm/large')).toBe('vllm/large')
  })
})

describe('Compte rendu de réunion', () => {
  const meeting = NEXORA_TEMPLATES.find((template) => template.slug === 'compte-rendu')
  if (!meeting) throw new Error('the meeting template is missing')
  const state = buildTemplateWorkflow(meeting, 'vllm/nexora-default')
  const blocks = Object.values(state.blocks)
  const byType = (type: string) => blocks.filter((block) => block.type === type)
  const sub = (type: string, id: string) => byType(type)[0].subBlocks[id]

  it('goes from the recording to the e-mail: transcription by speaker, summary, validation, e-mail', () => {
    expect(blocks.map((block) => block.type)).toEqual([
      'start_trigger',
      'stt_v2',
      'agent',
      'human_in_the_loop_v2',
      'condition',
      'smtp',
    ])
    expect(state.edges.map((edge) => [edge.source, edge.target])).toEqual(
      blocks.slice(1).map((block, index) => [blocks[index].id, block.id])
    )
  })

  it('sends the e-mail only when the person approved: a refusal ends the workflow', () => {
    const [condition] = byType('condition')
    const branches = JSON.parse(String(condition.subBlocks.conditions.value)) as {
      id: string
      title: string
      value: string
    }[]
    expect(branches.map((branch) => branch.title)).toEqual(['if', 'else'])
    expect(branches[0].value).toContain('<validation.approuve>')
    expect(branches[0].value).toContain('=== "true"')
    expect(branches[1].value).toBe('')
    const toEmail = state.edges.find((edge) => edge.target === byType('smtp')[0].id)
    expect(toEmail?.source).toBe(condition.id)
    expect(toEmail?.sourceHandle).toBe(`condition-${condition.id}-if`)
    expect(state.edges.filter((edge) => edge.source === condition.id)).toHaveLength(1)
  })

  it('asks for the recording as a file, and for the people it concerns', () => {
    const fields = sub('start_trigger', 'inputFormat').value as { name: string; type: string }[]
    expect(fields.map((field) => [field.name, field.type])).toEqual([
      ['enregistrement', 'file[]'],
      ['participants', 'string'],
      ['destinataire', 'string'],
    ])
  })

  it('transcribes with the local model, in French, telling the speakers apart', () => {
    expect(sub('stt_v2', 'provider').value).toBe('nexora')
    expect(sub('stt_v2', 'language').value).toBe('fr')
    expect(sub('stt_v2', 'diarization').value).toBe(true)
    expect(sub('stt_v2', 'audioFileReference').value).toBe('<start.enregistrement>')
    expect(byType('stt_v2')[0].data).toEqual({ canonicalModes: { audioFile: 'advanced' } })
  })

  it('writes the minutes from the transcript by speaker and the participants', () => {
    const messages = sub('agent', 'messages').value as { role: string; content: string }[]
    const prompt = messages.map((message) => message.content).join('\n')
    expect(prompt).toContain('<transcription.transcriptBySpeaker>')
    expect(prompt).toContain('<start.participants>')
    expect(prompt).toMatch(/Intervenant/)
    expect(sub('agent', 'model').value).toBe('vllm/nexora-default')
  })

  it('shows the minutes to a person who approves before anything is sent', () => {
    const shown = sub('human_in_the_loop_v2', 'builderData').value as {
      name: string
      value: string
    }[]
    expect(shown).toEqual([
      expect.objectContaining({ name: 'compteRendu', value: '<compterendu.content>' }),
    ])
    const form = sub('human_in_the_loop_v2', 'inputFormat').value as {
      name: string
      type: string
      required?: boolean
    }[]
    expect(form[0]).toMatchObject({ name: 'approuve', type: 'boolean', required: true })
  })

  it('e-mails the minutes to the recipient, with the server left to fill in', () => {
    expect(sub('smtp', 'to').value).toBe('<start.destinataire>')
    expect(sub('smtp', 'body').value).toBe('<compterendu.content>')
    expect(String(sub('smtp', 'subject').value)).toMatch(/Compte rendu/)
    expect(sub('smtp', 'smtpHost').value).toBe('')
  })

  it('only references blocks that come before the reference', () => {
    const order = blocks.map((block) => block.name.toLowerCase())
    const references = [...JSON.stringify(state).matchAll(/<([a-z]+)\.[a-zA-Z]+>/g)].map(
      (match) => match[1]
    )
    expect(references.length).toBeGreaterThan(4)
    for (const reference of references) expect(order).toContain(reference)
  })

  it('leaves the templates made of agent steps only as plain Start → Agent workflows', () => {
    const plain = NEXORA_TEMPLATES.filter((candidate) =>
      candidate.steps.every((step) => step.kind === undefined)
    )
    expect(plain.length).toBeGreaterThanOrEqual(15)
    for (const template of plain) {
      const types = Object.values(buildTemplateWorkflow(template, 'vllm/x').blocks).map(
        (block) => block.type
      )
      expect(new Set(types)).toEqual(new Set(['start_trigger', 'agent']))
    }
  })

  it('sends a reply to the customer only after a person approved it', () => {
    const reply = NEXORA_TEMPLATES.find((candidate) => candidate.slug === 'reponse-validee')
    if (!reply) throw new Error('the validated-reply template is missing')
    const state = buildTemplateWorkflow(reply, 'vllm/nexora-default')
    expect(Object.values(state.blocks).map((block) => block.type)).toEqual([
      'start_trigger',
      'agent',
      'human_in_the_loop_v2',
      'condition',
      'smtp',
    ])
  })
})

const READY_TO_RUN_SLUGS = [
  'tri-sinistres',
  'conformite-documents',
  'factures-fournisseurs',
  'qualification-prospects',
  'synthese-projet-hebdo',
  'veille-concurrentielle',
  'reponse-appel-offres',
  'accueil-employe',
  'revue-contrat',
  'rapport-ventes-mensuel',
] as const

type Template = (typeof NEXORA_TEMPLATES)[number]

function bySlug(slug: string): Template {
  const found = NEXORA_TEMPLATES.find((template) => template.slug === slug)
  if (!found) throw new Error(`the ${slug} template is missing`)
  return found
}

/** Every string of a step in which a `<block.field>` reference may appear. */
function stepTexts(step: Template['steps'][number]): string[] {
  switch (step.kind) {
    case 'transcription':
      return []
    case 'approval':
      return step.shows.map((shown) => shown.value)
    case 'gate':
      return [step.approved]
    case 'email':
      return [step.to, step.subject, step.body]
    default:
      return [step.system, step.user]
  }
}

describe('Every SME template, original or ready to run', () => {
  it('has a lowercase ASCII slug made of words separated by hyphens', () => {
    for (const template of NEXORA_TEMPLATES) {
      expect(template.slug, template.slug).toMatch(/^[a-z]+(-[a-z]+)*$/)
    }
  })

  it('names its steps in ASCII, each name used once (references ignore the case)', () => {
    for (const template of NEXORA_TEMPLATES) {
      const names = template.steps.map((step) => step.name)
      for (const name of names)
        expect(name, `${template.slug}.${name}`).toMatch(/^[A-Za-z][A-Za-z0-9]*$/)
      expect(new Set(names.map((name) => name.toLowerCase())).size, template.slug).toBe(
        names.length
      )
      expect(
        names.map((name) => name.toLowerCase()),
        template.slug
      ).not.toContain('start')
    }
  })

  it('only references a Start field, or a step that comes before the reference', () => {
    for (const template of NEXORA_TEMPLATES) {
      const inputs = new Set(template.inputs.map((input) => input.name))
      const earlier = new Set<string>()
      for (const step of template.steps) {
        for (const text of stepTexts(step)) {
          for (const [, block, field] of text.matchAll(/<([a-z][a-z0-9]*)\.([A-Za-z_]+)>/g)) {
            const where = `${template.slug}/${step.name}: <${block}.${field}>`
            if (block === 'start') expect(inputs.has(field), where).toBe(true)
            else expect(earlier.has(block), where).toBe(true)
          }
        }
        if (step.kind === 'transcription')
          expect(inputs.has(step.recording), template.slug).toBe(true)
        earlier.add(step.name.toLowerCase())
      }
    }
  })

  it('asks a person to approve, then lets the workflow go on only if approved, before any e-mail', () => {
    for (const template of NEXORA_TEMPLATES) {
      template.steps.forEach((step, index) => {
        if (step.kind !== 'email') return
        const gate = template.steps[index - 1]
        const approval = template.steps[index - 2]
        expect(gate?.kind, `${template.slug}: gate before e-mail`).toBe('gate')
        expect(approval?.kind, `${template.slug}: approval before gate`).toBe('approval')
        if (gate?.kind === 'gate' && approval?.kind === 'approval') {
          expect(gate.approved).toBe(`<${approval.name.toLowerCase()}.approuve>`)
        }
      })
    }
  })

  it('tells every agent to flag missing data between square brackets', () => {
    for (const template of NEXORA_TEMPLATES) {
      for (const step of template.steps) {
        if (step.kind === undefined)
          expect(step.system, `${template.slug}/${step.name}`).toContain('entre crochets')
      }
    }
  })
})

describe('Ready-to-run SME templates', () => {
  it('adds the ten new ones after the twenty that were already there', () => {
    const slugs = NEXORA_TEMPLATES.map((template) => template.slug)
    expect(slugs.slice(20)).toEqual([...READY_TO_RUN_SLUGS])
  })

  it.each(READY_TO_RUN_SLUGS.map((slug) => [slug] as const))(
    '%s has two to five steps, one to four inputs and a short description',
    (slug) => {
      const template = bySlug(slug)
      expect(template.steps.length).toBeGreaterThanOrEqual(2)
      expect(template.steps.length).toBeLessThanOrEqual(5)
      expect(template.inputs.length).toBeGreaterThanOrEqual(1)
      expect(template.inputs.length).toBeLessThanOrEqual(4)
      expect(template.name.trim()).not.toBe('')
      const sentences = template.description.match(/[.!?](\s|$)/g) ?? []
      expect(sentences.length).toBeGreaterThanOrEqual(1)
      expect(sentences.length).toBeLessThanOrEqual(2)
      for (const input of template.inputs) {
        expect(input.name, `${slug}.${input.name}`).toMatch(/^[a-z_]+$/)
        expect(input.description.trim(), `${slug}.${input.name}`).not.toBe('')
        if (input.type === 'file') expect(input.example).toBe('')
        else expect(input.example.trim().length, `${slug}.${input.name}`).toBeGreaterThan(10)
      }
    }
  )

  it.each(READY_TO_RUN_SLUGS.map((slug) => [slug] as const))(
    '%s builds a workflow with every step wired in a line',
    (slug) => {
      const template = bySlug(slug)
      const state = buildTemplateWorkflow(template, 'vllm/nexora-default')
      const blocks = Object.values(state.blocks)
      expect(blocks).toHaveLength(template.steps.length + 1)
      expect(blocks.filter((block) => block.type === 'agent').length).toBeGreaterThanOrEqual(1)
      expect(state.edges).toHaveLength(blocks.length - 1)
    }
  )

  it.each([
    ['conformite-documents', ['agent', 'human_in_the_loop_v2', 'condition', 'smtp']],
    ['synthese-projet-hebdo', ['agent', 'human_in_the_loop_v2', 'condition', 'smtp']],
    ['revue-contrat', ['agent', 'human_in_the_loop_v2', 'condition', 'smtp']],
  ] as const)('%s sends nothing before a person has approved', (slug, types) => {
    const state = buildTemplateWorkflow(bySlug(slug), 'vllm/nexora-default')
    expect(
      Object.values(state.blocks)
        .slice(1)
        .map((block) => block.type)
    ).toEqual([...types])
  })

  it('checks a document against the list of controls it is given, and cites nothing else', () => {
    const template = bySlug('conformite-documents')
    expect(template.inputs.map((input) => input.name)).toEqual(
      expect.arrayContaining(['document', 'controles'])
    )
    const prompt = template.steps.flatMap(stepTexts).join('\n')
    expect(prompt).toContain('<start.controles>')
    expect(prompt).toContain('<start.document>')
  })

  it('extracts the invoice fields as JSON and checks the totals add up', () => {
    const template = bySlug('factures-fournisseurs')
    expect(template.inputs.some((input) => input.type === 'file')).toBe(true)
    const prompt = template.steps.flatMap(stepTexts).join('\n')
    for (const key of [
      'fournisseur',
      'numero',
      'date',
      'total_ht',
      'tva',
      'total_ttc',
      'echeance',
    ]) {
      expect(prompt, key).toContain(key)
    }
    expect(prompt).toMatch(/JSON/)
    expect(prompt).toMatch(/total HT \+ TVA = total TTC|HT \+ TVA/)
  })

  it('does not invent anything in the competitive watch: it cites the extracts', () => {
    const prompt = bySlug('veille-concurrentielle').steps.flatMap(stepTexts).join('\n')
    expect(prompt).toMatch(/extrait/)
    expect(prompt).toMatch(/N’inventez rien|n’inventez rien/)
    expect(prompt).toMatch(/signaux faibles/i)
  })

  it('lists the requirements of the tender that the answer does not cover', () => {
    const prompt = bySlug('reponse-appel-offres').steps.flatMap(stepTexts).join('\n')
    expect(prompt).toMatch(/exigences non couvertes/i)
  })

  it('says that the contract review is not legal advice, in the agent and in the e-mail', () => {
    const template = bySlug('revue-contrat')
    const agent = template.steps.find((step) => step.kind === undefined)
    const email = template.steps.find((step) => step.kind === 'email')
    if (!agent || agent.kind !== undefined || !email || email.kind !== 'email') {
      throw new Error('the contract review needs an agent step and an e-mail step')
    }
    expect(agent.user).toMatch(/avis juridique/)
    expect(email.body).toMatch(/avis juridique/)
  })

  it('e-mails the weekly project summary to the person named in the inputs', () => {
    const template = bySlug('synthese-projet-hebdo')
    const email = template.steps.find((step) => step.kind === 'email')
    if (email?.kind !== 'email') throw new Error('the weekly summary has no e-mail step')
    expect(email.to).toMatch(/^<start\.[a-z_]+>$/)
    expect(email.body).toMatch(/^<[a-z]+\.content>/)
  })
})
