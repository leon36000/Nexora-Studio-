import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildAgentDelegationTools,
  lastQuestion,
  readHandoffInputs,
  runTransferredTurn,
} from '@/lib/nexora/delegation/agent-block'

const { loadDelegationTargets, resolveTransferTarget, executeDelegation } = vi.hoisted(() => ({
  loadDelegationTargets: vi.fn(),
  resolveTransferTarget: vi.fn(),
  executeDelegation: vi.fn(),
}))

vi.mock('@/lib/nexora/delegation/targets', () => ({ loadDelegationTargets }))
vi.mock('@/lib/nexora/delegation/transfer', () => ({ resolveTransferTarget }))
vi.mock('@/lib/nexora/delegation/execute', () => ({ executeDelegation }))

const tarifs = { workflowId: 'wf-tarifs', name: 'Agent tarifs', description: null }
const rows = (...entries: Array<[string, string]>) =>
  entries.map(([Agent, Mode], index) => ({ id: String(index), cells: { Agent, Mode } }))

const context = {
  workspaceId: 'ws-1',
  workflowId: 'wf-assistant',
  userId: 'user-1',
  executionId: 'exec-1',
  callChain: ['wf-assistant'],
  environmentVariables: {},
  metadata: { duration: 0 },
}

beforeEach(() => {
  loadDelegationTargets.mockResolvedValue([])
  resolveTransferTarget.mockResolvedValue(null)
})

describe('handoffs of an Agent block', () => {
  it('reads the table rows the block stores, and nothing from a value it cannot read', () => {
    expect(readHandoffInputs({ handoffs: rows(['wf-tarifs', 'transfer']) })).toEqual([
      { agentId: 'wf-tarifs', mode: 'transfer' },
    ])
    expect(readHandoffInputs({ handoffs: rows(['wf-tarifs', 'broadcast']) })).toEqual([])
    expect(readHandoffInputs({})).toEqual([])
  })

  it('offers the model one tool per agent that is still published', async () => {
    loadDelegationTargets.mockResolvedValueOnce([
      { target: tarifs, handoff: { agentId: 'wf-tarifs', mode: 'reply' } },
    ])
    const tools = await buildAgentDelegationTools({
      workspaceId: 'ws-1',
      handoffs: [
        { agentId: 'wf-tarifs', mode: 'reply' },
        { agentId: 'wf-retire', mode: 'reply' },
      ],
      conversationId: 'conv-1',
    })
    expect(tools).toHaveLength(1)
    expect(tools[0].params).toEqual({
      agentId: 'wf-tarifs',
      mode: 'reply',
      conversationId: 'conv-1',
    })
  })

  it('offers nothing without handoffs, and does not look anything up', async () => {
    expect(
      await buildAgentDelegationTools({
        workspaceId: 'ws-1',
        handoffs: [],
        conversationId: undefined,
      })
    ).toEqual([])
    expect(loadDelegationTargets).not.toHaveBeenCalled()
  })
})

describe('the question of a turn', () => {
  it('is the last user message, or the user prompt', () => {
    expect(
      lastQuestion({
        messages: [
          { role: 'system', content: 'Consignes' },
          { role: 'user', content: 'Bonjour' },
          { role: 'assistant', content: 'Bonjour !' },
          { role: 'user', content: 'Quel est le prix ?' },
          { role: 'assistant', content: 'Pour quel produit ?' },
        ],
      })
    ).toBe('Quel est le prix ?')
    expect(lastQuestion({ userPrompt: 'Prix ?' })).toBe('Prix ?')
    expect(lastQuestion({})).toBe('')
  })
})

describe('a conversation handed to another agent', () => {
  const inputs = {
    handoffs: rows(['wf-tarifs', 'transfer']),
    conversationId: 'conv-1',
    messages: [{ role: 'user', content: 'Et pour 50 baguettes ?' }],
  }

  it('lets the main agent answer when the conversation was not handed over', async () => {
    expect(await runTransferredTurn(inputs, context as never)).toBeNull()
    expect(executeDelegation).not.toHaveBeenCalled()
  })

  it('lets the main agent answer a run without conversation (nothing was handed over)', async () => {
    expect(
      await runTransferredTurn({ ...inputs, conversationId: undefined }, context as never)
    ).toBeNull()
    expect(resolveTransferTarget).not.toHaveBeenCalled()
  })

  it('answers with the agent the conversation was handed to, showing the delegation in the trace', async () => {
    resolveTransferTarget.mockResolvedValueOnce({ agentId: 'wf-tarifs', mode: 'transfer' })
    executeDelegation.mockResolvedValueOnce({
      success: true,
      output: {
        agent: 'Agent tarifs',
        mode: 'transfer',
        answer: '60 euros.',
        childWorkflowId: 'wf-tarifs',
      },
    })
    const output = await runTransferredTurn(inputs, context as never)
    expect(executeDelegation).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'wf-tarifs',
        mode: 'transfer',
        question: 'Et pour 50 baguettes ?',
        conversationId: 'conv-1',
      }),
      expect.objectContaining({ workspaceId: 'ws-1', workflowId: 'wf-assistant' }),
      expect.anything()
    )
    expect(output).toMatchObject({
      content: '60 euros.',
      delegation: { agent: 'Agent tarifs', agentId: 'wf-tarifs' },
      toolCalls: { count: 1 },
    })
    expect(output?.toolCalls?.list[0]).toMatchObject({
      name: 'delegate_to_agent',
      arguments: { question: 'Et pour 50 baguettes ?' },
      result: { agent: 'Agent tarifs', childWorkflowId: 'wf-tarifs' },
    })
  })

  it('lets the main agent answer when the agent the conversation was handed to fails', async () => {
    resolveTransferTarget.mockResolvedValueOnce({ agentId: 'wf-tarifs', mode: 'transfer' })
    executeDelegation.mockResolvedValueOnce({
      success: false,
      output: {},
      error: 'n’est plus publié',
    })
    expect(await runTransferredTurn(inputs, context as never)).toBeNull()
  })
})
