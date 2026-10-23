import { describe, expect, it } from 'vitest'
import {
  type AgentConfig,
  buildAgentWorkflow,
  diffAgentConfigs,
  readAgentWorkflow,
} from '@/lib/nexora/agents'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'

const base: AgentConfig = {
  name: 'Assistant devis',
  description: 'Répond aux questions sur nos tarifs',
  instructions: 'Vous aidez les clients de la Boulangerie Martin. Vouvoyez.',
  model: 'vllm/nexora-default',
  tools: [],
  knowledgeBaseIds: [],
  memory: false,
  welcomeMessage: 'Bonjour, que puis-je pour vous ?',
}

const mcpTool = {
  type: 'mcp',
  title: 'brevo_send_email',
  toolId: 'mcp-1',
  params: { serverId: 'srv-1', toolName: 'brevo_send_email', serverName: 'Nexora Connect' },
  isExpanded: false,
  usageControl: 'auto' as const,
}

describe('agent workflows', () => {
  it('round-trips a configuration through the workflow it builds', () => {
    for (const config of [
      base,
      { ...base, memory: true, tools: [mcpTool], knowledgeBaseIds: ['kb-1', 'kb-2'] },
    ]) {
      expect(readAgentWorkflow(buildAgentWorkflow(config))).toEqual(config)
    }
  })

  it('builds a workflow the importer accepts, the chat message reaching the agent through Start', () => {
    const state = buildAgentWorkflow({ ...base, memory: true })
    const { data, errors } = parseWorkflowJson(JSON.stringify({ version: '1.0', state }))
    expect(errors).toEqual([])
    expect(data).not.toBeNull()
    expect(Object.values(state.blocks).map((b) => [b.type, b.name])).toEqual([
      ['start_trigger', 'Start'],
      ['agent', 'Agent'],
    ])
    const agent = Object.values(state.blocks).find((b) => b.type === 'agent')
    expect(JSON.stringify(agent?.subBlocks.messages.value)).toContain('<start.input>')
    expect(agent?.subBlocks.conversationId?.value).toBe('<start.conversationId>')
  })

  it('refuses a workflow edited beyond the agent shape', () => {
    const state = buildAgentWorkflow(base)
    const extraBlock = structuredClone(state)
    extraBlock.blocks.extra = { ...Object.values(state.blocks)[0], id: 'extra', name: 'Autre' }
    const noEdge = { ...structuredClone(state), edges: [] }
    for (const edited of [extraBlock, noEdge, null, 'x', { blocks: {} }]) {
      expect(readAgentWorkflow(edited)).toBeNull()
    }
  })

  it('keeps the ids of the agent it rewrites, so the published chat still reads the same block', () => {
    const saved = buildAgentWorkflow(base)
    const rewritten = buildAgentWorkflow({ ...base, instructions: 'Tutoyez.' }, saved)
    expect(Object.keys(rewritten.blocks)).toEqual(Object.keys(saved.blocks))
    expect(rewritten.edges.map((e) => [e.id, e.source, e.target])).toEqual(
      saved.edges.map((e) => [e.id, e.source, e.target])
    )
    expect(readAgentWorkflow(rewritten)?.instructions).toBe('Tutoyez.')

    const edited = { ...structuredClone(saved), edges: [] }
    const fresh = buildAgentWorkflow(base, edited)
    expect(Object.keys(fresh.blocks)).not.toEqual(Object.keys(saved.blocks))
    expect(readAgentWorkflow(fresh)).toEqual(base)
  })

  it('lists only the fields that changed between two versions', () => {
    expect(diffAgentConfigs(base, { ...base, instructions: 'Tutoyez.', memory: true })).toEqual([
      { field: 'instructions', before: base.instructions, after: 'Tutoyez.' },
      { field: 'memory', before: 'false', after: 'true' },
    ])
    expect(diffAgentConfigs(base, base)).toEqual([])
  })
})
