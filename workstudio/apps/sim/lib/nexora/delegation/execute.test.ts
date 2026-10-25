import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeDelegation } from '@/lib/nexora/delegation/execute'
import { registerConfirmationSink } from '@/lib/nexora/tool-confirmation/sinks'

const { runWorkflowTool, loadDelegationAgents } = vi.hoisted(() => ({
  runWorkflowTool: vi.fn(),
  loadDelegationAgents: vi.fn(),
}))

vi.mock('@/executor/handlers/workflow/tool-runner', () => ({ runWorkflowTool }))
vi.mock('@/lib/nexora/delegation/targets', () => ({ loadDelegationAgents }))

const scope = {
  workspaceId: 'ws-1',
  workflowId: 'wf-assistant',
  userId: 'user-1',
  executionId: 'exec-1',
  callChain: ['wf-assistant'],
}

beforeEach(() => {
  loadDelegationAgents.mockResolvedValue([
    { workflowId: 'wf-assistant', name: 'Assistant général', description: null, published: true },
    { workflowId: 'wf-tarifs', name: 'Agent tarifs', description: null, published: true },
  ])
  runWorkflowTool.mockResolvedValue({
    success: true,
    output: { result: { content: 'La baguette coûte 1,20 euro.' } },
  })
})

describe('delegation tool as the executor runs it', () => {
  it('runs the deployed version of the called agent even when the caller is a draft under test', async () => {
    await executeDelegation(
      { agentId: 'wf-tarifs', mode: 'reply', question: 'Prix ?', conversationId: 'conv-1' },
      { ...scope },
      { environmentVariables: { CLE: 'valeur' } }
    )
    const [params, options] = runWorkflowTool.mock.calls[0]
    expect(params._context).toMatchObject({
      workspaceId: 'ws-1',
      workflowId: 'wf-assistant',
      executionId: 'exec-1',
      isDeployedContext: true,
      callChain: ['wf-assistant'],
    })
    expect(params.workflowId).toBe('wf-tarifs')
    expect(options.environmentVariables).toEqual({ CLE: 'valeur' })
  })

  it('hands the called agent a copy of the environment, not the caller’s map', async () => {
    const environment = { CLE: 'valeur' }
    await executeDelegation({ agentId: 'wf-tarifs', mode: 'reply', question: 'Prix ?' }, scope, {
      environmentVariables: environment,
    })
    expect(runWorkflowTool.mock.calls[0][1].environmentVariables).not.toBe(environment)
  })

  it('refuses outside a workspace, without running anyone', async () => {
    const response = await executeDelegation(
      { agentId: 'wf-tarifs', question: 'Prix ?' },
      { ...scope, workspaceId: undefined },
      {}
    )
    expect(response.success).toBe(false)
    expect(runWorkflowTool).not.toHaveBeenCalled()
  })

  it('shows the person following the run who answers, through the run’s stream', async () => {
    const frames: unknown[] = []
    const unregister = registerConfirmationSink('exec-1', (frame) => frames.push(frame))
    try {
      await executeDelegation(
        { agentId: 'wf-tarifs', mode: 'reply', question: 'Prix ?' },
        scope,
        {}
      )
    } finally {
      unregister()
    }
    expect(frames).toHaveLength(2)
    expect(frames[0]).toMatchObject({
      event: 'delegation',
      data: { agent: 'Agent tarifs', phase: 'start' },
    })
  })

  it('does not fail a run nobody follows (no stream to tell)', async () => {
    const response = await executeDelegation(
      { agentId: 'wf-tarifs', mode: 'reply', question: 'Prix ?' },
      { ...scope, executionId: 'exec-sans-flux' },
      {}
    )
    expect(response.success).toBe(true)
  })

  it('takes the instance’s depth limit from NEXORA_DELEGATION_MAX_DEPTH', async () => {
    vi.stubEnv('NEXORA_DELEGATION_MAX_DEPTH', '1')
    const response = await executeDelegation(
      { agentId: 'wf-tarifs', mode: 'reply', question: 'Prix ?' },
      { ...scope, callChain: ['wf-racine', 'wf-assistant'] },
      {}
    )
    expect(response.error).toContain('Limite de délégation atteinte (1 niveau)')
  })
})
