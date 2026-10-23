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

  it('gives every input an example value, so a first run works without typing', () => {
    for (const template of NEXORA_TEMPLATES) {
      for (const input of template.inputs) {
        expect(input.example.trim(), `${template.slug}.${input.name}`).not.toBe('')
      }
    }
  })

  it('only references inputs the start block declares', () => {
    for (const template of NEXORA_TEMPLATES) {
      const declared = new Set(template.inputs.map((input) => input.name))
      const prompts = template.steps.flatMap((step) => [step.system, step.user]).join('\n')
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
