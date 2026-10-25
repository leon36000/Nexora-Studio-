import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type DelegationDeps,
  type DelegationFrame,
  type DelegationInput,
  runDelegation,
} from '@/lib/nexora/delegation/run'

const agents = [
  { workflowId: 'wf-assistant', name: 'Assistant général', description: null, published: true },
  {
    workflowId: 'wf-tarifs',
    name: 'Agent tarifs',
    description: 'Prix et conditions',
    published: true,
  },
  { workflowId: 'wf-sav', name: 'Agent SAV', description: null, published: true },
  { workflowId: 'wf-brouillon', name: 'Agent brouillon', description: null, published: false },
]

const childAnswer = {
  success: true,
  output: {
    success: true,
    childWorkflowName: 'Agent tarifs',
    childWorkflowId: 'wf-tarifs',
    result: {
      content: 'La baguette coûte 1,20 euro [1].',
      sources: [{ index: 1, title: 'Tarifs 2026.pdf' }],
    },
    childTraceSpans: [{ id: 'span-1' }],
  },
}

let frames: DelegationFrame[]
let deps: DelegationDeps
let runChild: ReturnType<typeof vi.fn>
let rememberTransfer: ReturnType<typeof vi.fn>

const input: DelegationInput = {
  agentId: 'wf-tarifs',
  mode: 'reply',
  question: 'Combien coûte la baguette ?',
  conversationId: 'conv-1',
  workspaceId: 'ws-1',
  callerWorkflowId: 'wf-assistant',
  callChain: ['wf-assistant'],
  executionId: 'exec-1',
}

beforeEach(() => {
  frames = []
  runChild = vi.fn(async () => childAnswer)
  rememberTransfer = vi.fn(async () => undefined)
  deps = {
    loadAgents: async (_workspaceId, ids) =>
      agents.filter((agent) => ids.includes(agent.workflowId)),
    runChild,
    emit: (frame) => frames.push(frame),
    rememberTransfer,
    maxDepth: 3,
  }
})

describe('delegating a request to a published agent', () => {
  it('runs the called agent and gives its answer back, with its sources named', async () => {
    const response = await runDelegation(input, deps)
    expect(response.success).toBe(true)
    expect(response.output).toMatchObject({
      agent: 'Agent tarifs',
      mode: 'reply',
      answer: 'La baguette coûte 1,20 euro (source : Tarifs 2026.pdf).',
      childWorkflowId: 'wf-tarifs',
      childWorkflowName: 'Agent tarifs',
    })
    expect(JSON.stringify(response.output)).not.toContain('childTraceSpans')
  })

  it('runs the called agent with its own thread, the question, and the chain that led to it', async () => {
    await runDelegation(input, deps)
    expect(runChild).toHaveBeenCalledWith({
      workflowId: 'wf-tarifs',
      inputMapping: {
        input: 'Combien coûte la baguette ?',
        conversationId: 'conv-1:wf-tarifs',
      },
      callChain: ['wf-assistant'],
    })
  })

  it('puts the calling agent at the head of a chain that does not hold it yet', async () => {
    await runDelegation({ ...input, callChain: undefined }, deps)
    expect(runChild.mock.calls[0][0].callChain).toEqual(['wf-assistant'])
  })

  it('gives the called agent a thread of this run when the calling agent has no conversation', async () => {
    await runDelegation({ ...input, conversationId: undefined }, deps)
    expect(runChild.mock.calls[0][0].inputMapping.conversationId).toBe(
      'delegation:exec-1:wf-tarifs'
    )
  })

  it('tells the person who the called agent is, when it starts and when it ends', async () => {
    await runDelegation(input, deps)
    expect(frames.map((frame) => frame.data.phase)).toEqual(['start', 'end'])
    expect(frames[0].data).toMatchObject({
      agent: 'Agent tarifs',
      agentId: 'wf-tarifs',
      mode: 'reply',
    })
    expect(frames[1].data).toMatchObject({ ok: true, id: frames[0].data.id })
  })

  it('does not remember a conversation handed over in « reply » mode', async () => {
    await runDelegation(input, deps)
    expect(rememberTransfer).not.toHaveBeenCalled()
  })

  it('remembers the conversation handed over in « transfer » mode, for the next messages', async () => {
    const response = await runDelegation({ ...input, mode: 'transfer' }, deps)
    expect(rememberTransfer).toHaveBeenCalledWith('wf-tarifs', 'conv-1')
    expect(response.output).toMatchObject({ mode: 'transfer' })
  })

  it('does not remember a hand-over that failed', async () => {
    runChild.mockResolvedValueOnce({ success: false, output: {}, error: 'boom' })
    await runDelegation({ ...input, mode: 'transfer' }, deps)
    expect(rememberTransfer).not.toHaveBeenCalled()
  })

  it('answers « reply » for a hand-over in a run without a conversation to hand over', async () => {
    const response = await runDelegation(
      { ...input, mode: 'transfer', conversationId: undefined },
      deps
    )
    expect(response.success).toBe(true)
    expect(rememberTransfer).not.toHaveBeenCalled()
    expect(response.output).toMatchObject({ mode: 'reply' })
  })
})

describe('stopping a delegation that must not run', () => {
  it('stops a loop A → B → A with the French message, without running anyone', async () => {
    const response = await runDelegation(
      {
        ...input,
        agentId: 'wf-assistant',
        callerWorkflowId: 'wf-tarifs',
        callChain: ['wf-assistant', 'wf-tarifs'],
      },
      deps
    )
    expect(response.success).toBe(false)
    expect(response.error).toBe(
      'Boucle de délégation : « Assistant général » a déjà été sollicité dans cette conversation (Assistant général → Agent tarifs → Assistant général). La demande n’a pas été transmise.'
    )
    expect(runChild).not.toHaveBeenCalled()
    expect(frames.at(-1)?.data).toMatchObject({ phase: 'end', ok: false })
  })

  it('stops an agent that hands a request to itself', async () => {
    const response = await runDelegation({ ...input, agentId: 'wf-assistant' }, deps)
    expect(response.success).toBe(false)
    expect(response.error).toContain('Boucle de délégation')
    expect(runChild).not.toHaveBeenCalled()
  })

  it('stops at the depth limit with the French message', async () => {
    const response = await runDelegation(
      {
        ...input,
        agentId: 'wf-sav',
        callerWorkflowId: 'wf-tarifs',
        callChain: ['wf-x', 'wf-y', 'wf-tarifs'],
      },
      { ...deps, maxDepth: 2 }
    )
    expect(response.success).toBe(false)
    expect(response.error).toContain('Limite de délégation atteinte (2 niveaux)')
    expect(runChild).not.toHaveBeenCalled()
  })

  it('refuses an agent that is no longer published, and says so', async () => {
    const response = await runDelegation({ ...input, agentId: 'wf-brouillon' }, deps)
    expect(response.success).toBe(false)
    expect(response.error).toBe(
      'L’agent « Agent brouillon » n’est plus publié : la demande n’a pas été transmise.'
    )
    expect(runChild).not.toHaveBeenCalled()
  })

  it('refuses an agent that does not exist in the workspace', async () => {
    const response = await runDelegation({ ...input, agentId: 'wf-inconnu' }, deps)
    expect(response.success).toBe(false)
    expect(response.error).toContain('n’existe plus')
    expect(runChild).not.toHaveBeenCalled()
  })

  it('refuses an empty request', async () => {
    const response = await runDelegation({ ...input, question: '   ' }, deps)
    expect(response.success).toBe(false)
    expect(response.error).toContain('vide')
    expect(runChild).not.toHaveBeenCalled()
  })
})

describe('when the called agent fails', () => {
  it('reports the failure to the calling agent without throwing', async () => {
    runChild.mockResolvedValueOnce({
      success: false,
      output: { executionId: 'child-exec' },
      error: 'Le modèle ne répond pas',
    })
    const response = await runDelegation(input, deps)
    expect(response.success).toBe(false)
    expect(response.error).toBe(
      'L’agent « Agent tarifs » n’a pas pu répondre : Le modèle ne répond pas'
    )
    expect(frames.at(-1)?.data).toMatchObject({ phase: 'end', ok: false })
  })

  it('reports a thrown error the same way', async () => {
    runChild.mockRejectedValueOnce(new Error('connexion perdue'))
    const response = await runDelegation(input, deps)
    expect(response.success).toBe(false)
    expect(response.error).toContain('n’a pas pu répondre')
    expect(frames.at(-1)?.data).toMatchObject({ phase: 'end', ok: false })
  })

  it('does not take an answer-less child run for an answer', async () => {
    runChild.mockResolvedValueOnce({ success: true, output: { result: { content: '  ' } } })
    const response = await runDelegation(input, deps)
    expect(response.success).toBe(false)
    expect(response.error).toContain('aucune réponse')
  })
})
