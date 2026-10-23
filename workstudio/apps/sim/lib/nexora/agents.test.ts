import { describe, expect, it } from 'vitest'
import {
  type AgentConfig,
  agentChangedSince,
  buildAgentWorkflow,
  diffAgentConfigs,
  diffAgentVersions,
  hasUnsavedAgentChanges,
  persistedAgentConfig,
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
  reasoningEffort: 'auto',
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

type AgentState = ReturnType<typeof buildAgentWorkflow>

function agentBlock(state: AgentState) {
  const agent = Object.values(state.blocks).find((block) => block.type === 'agent')
  if (!agent) throw new Error('no agent block')
  return agent
}

function readOrFail(state: unknown): AgentConfig {
  const config = readAgentWorkflow(state)
  if (!config) throw new Error('not in the agent shape')
  return config
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

  it('carries the reasoning effort to the agent block, « auto » for an agent saved before it', () => {
    const state = buildAgentWorkflow({ ...base, reasoningEffort: 'high' })
    expect(agentBlock(state).subBlocks.reasoningEffort.value).toBe('high')
    expect(readAgentWorkflow(state)?.reasoningEffort).toBe('high')

    const older = buildAgentWorkflow(base)
    const { reasoningEffort: _effort, ...withoutEffort } = agentBlock(older).subBlocks
    agentBlock(older).subBlocks = withoutEffort
    expect(readAgentWorkflow(older)?.reasoningEffort).toBe('auto')
  })

  it('refuses an effort the form cannot show, and counts an effort change as a change', () => {
    const state = buildAgentWorkflow(base)
    agentBlock(state).subBlocks.reasoningEffort.value = '<start.effort>'
    expect(readAgentWorkflow(state)).toBeNull()
    const changed = { ...base, reasoningEffort: 'low' as const }
    expect(hasUnsavedAgentChanges(base, changed)).toBe(true)
    expect(diffAgentVersions(base, changed).map((c) => c.field)).toEqual(['reasoningEffort'])
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

  it('passes the files attached to a chat message to the agent', () => {
    // The Assistant and a published chat send attachments with the message; Start exposes them
    // as `<start.files>`, which the agent reads through its file reference.
    const state = buildAgentWorkflow(base)
    const agent = Object.values(state.blocks).find((b) => b.type === 'agent')
    expect(agent?.subBlocks.files?.value).toBe('<start.files>')
    const canonicalModes = agent?.data?.canonicalModes as Record<string, string> | undefined
    expect(canonicalModes?.files).toBe('advanced')
    expect(readAgentWorkflow(state)).not.toBeNull()
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

  it('keeps the editor settings the form does not show when the form saves', () => {
    const saved = buildAgentWorkflow({ ...base, tools: [mcpTool], knowledgeBaseIds: ['kb-1'] })
    const edited = structuredClone(saved)
    const [startId, agentId] = Object.keys(edited.blocks)
    const agent = edited.blocks[agentId]
    agent.position = { x: 512, y: 96 }
    agent.subBlocks.temperature = { id: 'temperature', type: 'slider', value: 0.9 }
    agent.subBlocks.maxTokens = { id: 'maxTokens', type: 'short-input', value: '800' }
    agent.subBlocks.responseFormat = { id: 'responseFormat', type: 'code', value: '{"a":1}' }
    agent.subBlocks.reasoningEffort = { id: 'reasoningEffort', type: 'dropdown', value: 'high' }
    edited.blocks[startId].subBlocks.runMetadata = {
      id: 'runMetadata',
      type: 'switch',
      value: true,
    }
    const tools = agent.subBlocks.tools.value as Record<string, unknown>[]
    tools[0] = { ...tools[0], params: { ...mcpTool.params, extra: 'kept' } }
    tools[1] = {
      ...tools[1],
      usageControl: 'force',
      params: { knowledgeBaseSelector: 'kb-1', topK: '3' },
    }

    const config = readOrFail(edited)
    const rewritten = buildAgentWorkflow({ ...config, instructions: 'Tutoyez.' }, edited)

    const rewrittenAgent = rewritten.blocks[agentId]
    expect(rewrittenAgent.position).toEqual({ x: 512, y: 96 })
    expect(rewrittenAgent.subBlocks.temperature.value).toBe(0.9)
    expect(rewrittenAgent.subBlocks.maxTokens.value).toBe('800')
    expect(rewrittenAgent.subBlocks.responseFormat.value).toBe('{"a":1}')
    expect(rewrittenAgent.subBlocks.reasoningEffort.value).toBe('high')
    expect(rewritten.blocks[startId].subBlocks.runMetadata.value).toBe(true)
    expect(rewrittenAgent.subBlocks.tools.value).toEqual(tools)
    expect(readAgentWorkflow(rewritten)?.instructions).toBe('Tutoyez.')
  })

  it('keeps a knowledge search the form cannot show as one of its bases', () => {
    const state = buildAgentWorkflow(base)
    const withoutBase = { type: 'knowledge', toolId: 'knowledge_search', params: {} }
    agentBlock(state).subBlocks.tools.value = [withoutBase]
    const config = readOrFail(state)
    expect(config.tools).toEqual([withoutBase])
    expect(agentBlock(buildAgentWorkflow(config, state)).subBlocks.tools.value).toEqual([
      withoutBase,
    ])
  })

  it('reads an agent whose tools were cleared in the editor as having none', () => {
    const state = buildAgentWorkflow(base)
    agentBlock(state).subBlocks.tools.value = null
    expect(readAgentWorkflow(state)).toEqual(base)
  })

  it('refuses settings the form cannot show faithfully', () => {
    const disabled = buildAgentWorkflow(base)
    Object.values(disabled.blocks)[1].enabled = false
    const slidingWindow = buildAgentWorkflow(base)
    Object.values(slidingWindow.blocks)[1].subBlocks.memoryType.value = 'sliding_window'
    const startInputs = buildAgentWorkflow(base)
    Object.values(startInputs.blocks)[0].subBlocks.inputFormat.value = [
      { id: 'f-1', name: 'client', type: 'string', value: '' },
    ]
    for (const edited of [disabled, slidingWindow, startInputs]) {
      expect(readAgentWorkflow(edited)).toBeNull()
    }

    const blankStartField = buildAgentWorkflow(base)
    Object.values(blankStartField.blocks)[0].subBlocks.inputFormat.value = [
      { id: 'f-1', name: '', type: 'string', value: '' },
    ]
    expect(readAgentWorkflow(blankStartField)).toEqual(base)
  })

  it('lists only the fields that changed between two versions', () => {
    expect(diffAgentConfigs(base, { ...base, instructions: 'Tutoyez.', memory: true })).toEqual([
      { field: 'instructions', before: base.instructions, after: 'Tutoyez.' },
      { field: 'memory', before: 'false', after: 'true' },
    ])
    expect(diffAgentConfigs(base, base)).toEqual([])
  })

  it('compares versions on what a version holds, not on the name, description or welcome message', () => {
    const renamed = { ...base, name: 'Autre', description: '', welcomeMessage: '' }
    expect(diffAgentVersions(base, renamed)).toEqual([])
    expect(
      diffAgentVersions(base, { ...renamed, model: 'vllm/autre' }).map((c) => c.field)
    ).toEqual(['model'])
  })

  it('tells a save that the stored agent changed since the form loaded it', () => {
    const stored = buildAgentWorkflow(base)
    expect(agentChangedSince(base, stored)).toBe(false)
    expect(agentChangedSince({ ...base, name: 'Renommé', welcomeMessage: '' }, stored)).toBe(false)

    const withTemperature = structuredClone(stored)
    agentBlock(withTemperature).subBlocks.temperature = {
      id: 'temperature',
      type: 'slider',
      value: 0.3,
    }
    expect(agentChangedSince(base, withTemperature)).toBe(false)

    expect(agentChangedSince(base, buildAgentWorkflow({ ...base, instructions: 'Tutoyez.' }))).toBe(
      true
    )
    expect(
      agentChangedSince(base, buildAgentWorkflow({ ...base, knowledgeBaseIds: ['kb-1'] }))
    ).toBe(true)
    expect(agentChangedSince(base, { ...structuredClone(stored), edges: [] })).toBe(true)
  })

  it('does not count spaces around the name, or the welcome message, as unsaved changes', () => {
    expect(hasUnsavedAgentChanges(base, { ...base, name: `${base.name}  ` })).toBe(false)
    expect(hasUnsavedAgentChanges(base, { ...base, welcomeMessage: 'Salut' })).toBe(false)
    expect(hasUnsavedAgentChanges(base, { ...base, name: 'Autre ' })).toBe(true)
    expect(hasUnsavedAgentChanges(base, { ...base, memory: true })).toBe(true)
  })
})

/**
 * What PostgreSQL hands back for a `jsonb` column: object keys reordered (shorter first, then
 * byte order), `undefined` properties gone. Sub-block values are stored that way.
 */
function asStoredJsonb(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(asStoredJsonb)
  if (value === null || typeof value !== 'object') return value
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
  entries.sort(([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
  return Object.fromEntries(entries.map(([key, entry]) => [key, asStoredJsonb(entry)]))
}

/** The draft as `GET /api/workflows/[id]` returns it after `PUT /state` wrote `written`. */
function storedAfterWrite(written: AgentState): AgentState {
  const blocks = Object.fromEntries(
    Object.entries(written.blocks).map(([id, block]) => [
      id,
      { ...block, subBlocks: asStoredJsonb(block.subBlocks) as typeof block.subBlocks },
    ])
  )
  return { ...written, blocks }
}

/** An MCP tool exactly as the agent form's tool picker builds it (Nexora Connect). */
const pickedMcpTool = {
  type: 'mcp',
  title: 'search_actions',
  toolId: 'mcp-srv-1-search_actions',
  params: {
    serverId: 'mcp-srv-1',
    serverUrl: 'http://connect.example.invalid/mcp',
    toolName: 'search_actions',
    serverName: 'Nexora Connect',
  },
  isExpanded: true,
  usageControl: 'auto' as const,
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Texte recherché.' },
      service: { type: 'string', description: 'Service du fournisseur.' },
      limit: {
        type: 'integer',
        description: 'Nombre maximal.',
        minimum: 1,
        maximum: 50,
        default: 10,
      },
    },
    description: 'Recherche des actions du catalogue.',
  },
}

/** The agent block's tools as the pc6 database held them after the form saved `pickedMcpTool`. */
const storedToolsFixture = [
  {
    type: 'mcp',
    title: 'search_actions',
    params: {
      serverId: 'mcp-srv-1',
      toolName: 'search_actions',
      serverUrl: 'http://connect.example.invalid/mcp',
      serverName: 'Nexora Connect',
    },
    schema: {
      type: 'object',
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      properties: {
        limit: {
          type: 'integer',
          default: 10,
          maximum: 50,
          minimum: 1,
          description: 'Nombre maximal.',
        },
        query: { type: 'string', description: 'Texte recherché.' },
        service: { type: 'string', description: 'Service du fournisseur.' },
      },
      description: 'Recherche des actions du catalogue.',
    },
    toolId: 'mcp-srv-1-search_actions',
    isExpanded: true,
    usageControl: 'auto',
  },
  {
    type: 'knowledge',
    title: 'Knowledge',
    params: { knowledgeBaseSelector: 'kb-1' },
    toolId: 'knowledge_search',
    operation: 'search',
    isExpanded: false,
    usageControl: 'auto',
  },
]

describe('saving an agent over what the database stores', () => {
  const configured: AgentConfig = {
    ...base,
    memory: true,
    tools: [pickedMcpTool],
    knowledgeBaseIds: ['kb-1'],
  }

  it('reads the stored state back as the configuration that produced it', () => {
    const stored = storedAfterWrite(buildAgentWorkflow(configured))
    expect(agentBlock(stored).subBlocks.tools.value).toEqual(storedToolsFixture)
    expect(JSON.stringify(agentBlock(stored).subBlocks.tools.value)).toBe(
      JSON.stringify(storedToolsFixture)
    )
    expect(agentChangedSince(configured, stored)).toBe(false)
    expect(hasUnsavedAgentChanges(readOrFail(stored), configured)).toBe(false)
  })

  it('takes the configuration actually written as the next baseline', () => {
    const written = buildAgentWorkflow(configured)
    const persisted = persistedAgentConfig(configured, written)
    expect(persisted).toEqual(configured)
    expect(agentChangedSince(persisted, storedAfterWrite(written))).toBe(false)
  })

  it('publishes an edit after save, test and publish without calling it a change made elsewhere', () => {
    let stored = storedAfterWrite(buildAgentWorkflow({ ...base, memory: true }))
    const save = (baseline: AgentConfig, config: AgentConfig): AgentConfig => {
      if (agentChangedSince(baseline, stored)) throw new Error('changed elsewhere')
      const written = buildAgentWorkflow(config, stored)
      stored = storedAfterWrite(written)
      return persistedAgentConfig(config, written)
    }

    let saved = readOrFail(stored)
    saved = save(saved, configured)
    // « Tester » then « Publier »: nothing left to save.
    expect(hasUnsavedAgentChanges(saved, configured)).toBe(false)

    const edited = { ...configured, instructions: `${configured.instructions} Soyez bref.` }
    expect(hasUnsavedAgentChanges(saved, edited)).toBe(true)
    saved = save(saved, edited)
    expect(readOrFail(stored).instructions).toBe(edited.instructions)
    expect(hasUnsavedAgentChanges(saved, edited)).toBe(false)
  })

  it('still refuses when the stored instructions really changed elsewhere', () => {
    const written = buildAgentWorkflow(configured)
    const baseline = persistedAgentConfig(configured, written)
    const elsewhere = storedAfterWrite(
      buildAgentWorkflow({ ...configured, instructions: 'Tutoyez.' }, written)
    )
    expect(agentChangedSince(baseline, elsewhere)).toBe(true)
  })
})
