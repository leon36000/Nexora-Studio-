import { describe, expect, it } from 'vitest'
import {
  buildTemplateWorkflow,
  NEXORA_TEMPLATES,
  resolveTemplateModel,
} from '@/lib/nexora/templates'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'

describe('Nexora SME workflow templates', () => {
  it('ships the five SME templates', () => {
    expect(NEXORA_TEMPLATES.map((t) => t.slug)).toEqual([
      'devis',
      'relance-facture',
      'support-faq',
      'tri-emails',
      'compte-rendu',
    ])
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
    const shown = sub('human_in_the_loop_v2', 'builderData').value as { name: string; value: string }[]
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

  it('leaves the four other templates as plain Start → Agent workflows', () => {
    for (const template of NEXORA_TEMPLATES.filter((candidate) => candidate !== meeting)) {
      const types = Object.values(buildTemplateWorkflow(template, 'vllm/x').blocks).map(
        (block) => block.type
      )
      expect(new Set(types)).toEqual(new Set(['start_trigger', 'agent']))
    }
  })
})
