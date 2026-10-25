import { describe, expect, it } from 'vitest'
import { buildDelegationTool, DELEGATE_TOOL_ID } from '@/lib/nexora/delegation/tool'

const target = {
  workflowId: 'wf-tarifs',
  name: 'Agent tarifs',
  description: 'Connaît nos prix et nos conditions de vente.',
}

describe('delegation tool of one called agent', () => {
  it('is one tool per agent, named after the agent so the model can choose', () => {
    const tool = buildDelegationTool({ target, mode: 'reply', conversationId: 'conv-1' })
    expect(tool.id).toBe(DELEGATE_TOOL_ID)
    expect(tool.description).toContain('« Agent tarifs »')
    expect(tool.description).toContain('Connaît nos prix')
    expect(tool.parameters.required).toEqual(['question'])
    expect(Object.keys(tool.parameters.properties)).toEqual(['question'])
  })

  it('fixes the agent, the mode and the conversation outside the model’s reach', () => {
    const tool = buildDelegationTool({ target, mode: 'transfer', conversationId: 'conv-1' })
    expect(tool.params).toEqual({
      agentId: 'wf-tarifs',
      mode: 'transfer',
      conversationId: 'conv-1',
    })
    expect([...(tool.modelBlockedParams ?? [])].sort()).toEqual(
      ['agentId', 'conversationId', 'mode'].sort()
    )
  })

  it('leaves the conversation out of a run that has none', () => {
    const tool = buildDelegationTool({ target, mode: 'reply', conversationId: undefined })
    expect(tool.params).toEqual({ agentId: 'wf-tarifs', mode: 'reply' })
  })

  it('tells the model what happens next in each mode', () => {
    const reply = buildDelegationTool({ target, mode: 'reply', conversationId: undefined })
    const transfer = buildDelegationTool({ target, mode: 'transfer', conversationId: undefined })
    expect(reply.description).toContain('vous reprenez')
    expect(transfer.description).toContain('poursuit la conversation')
  })

  it('works for an agent without description', () => {
    const tool = buildDelegationTool({
      target: { ...target, description: null },
      mode: 'reply',
      conversationId: undefined,
    })
    expect(tool.description).toContain('« Agent tarifs »')
    expect(tool.description).not.toContain('null')
  })
})
