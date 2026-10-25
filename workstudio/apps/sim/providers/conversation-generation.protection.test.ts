import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import {
  nexoraDataProtectionMock,
  nexoraDataProtectionMockFns,
} from '@sim/testing/mocks/nexora-data-protection.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonalDataRefusedError } from '@/lib/nexora/data-protection/errors'
import { resetProtectionCache } from '@/lib/nexora/data-protection/masking'
import { isOffInstanceModel } from '@/lib/nexora/data-protection/model-location'
import {
  resetExecutionProtection,
  takeExecutionProtection,
} from '@/lib/nexora/data-protection/notes'
import { prepareConversationGeneration } from '@/providers/conversation-generation'
import type { ProviderRequest } from '@/providers/types'

vi.mock('@/lib/nexora/data-protection/policy', () => nexoraDataProtectionMock)
vi.mock('@/lib/nexora/data-protection/model-location', () => ({
  isOffInstanceModel: vi.fn(async () => true),
}))

const IBAN = 'FR76 3000 6000 0112 3456 7890 189'

function request(overrides: Partial<ProviderRequest> = {}): ProviderRequest {
  return { model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1', executionId: 'exec-1', ...overrides }
}

function turn(...results: string[]) {
  return {
    model: 'cloud-glm-5-3',
    messages: [
      { role: 'user', content: `Mon IBAN est ${IBAN}` },
      ...results.map((content, index) => ({ role: 'tool', tool_call_id: `c${index}`, content })),
    ],
  }
}

describe('prepareConversationGeneration under a personal-data policy', () => {
  beforeEach(() => {
    mockEnvObject.PII_URL = undefined
    resetProtectionCache()
    resetExecutionProtection()
    vi.mocked(isOffInstanceModel).mockResolvedValue(true)
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockResolvedValue({
      defaultMode: 'mask',
      workspaceModes: { 'ws-compta': 'refuse' },
    })
  })

  it('masks the whole conversation at each turn of the tool loop, e-mail of a tool result included', async () => {
    const first = await prepareConversationGeneration(request(), 'chat-completions', turn())
    const second = await prepareConversationGeneration(
      request(),
      'chat-completions',
      turn('Client trouvé : marie@exemple.fr')
    )
    expect(JSON.stringify(first)).not.toContain('FR76')
    expect(JSON.stringify(second)).not.toContain('FR76')
    expect(JSON.stringify(second)).not.toContain('marie@exemple.fr')
    expect(second.messages[1].content).toBe('Client trouvé : [E-MAIL]')
    expect(takeExecutionProtection('exec-1')).toEqual([
      {
        mode: 'mask',
        model: 'vllm/cloud-glm-5-3',
        found: { IBAN_CODE: 1, EMAIL_ADDRESS: 1 },
        masked: 2,
      },
    ])
  })

  it('sends a model on this server the conversation as it is', async () => {
    vi.mocked(isOffInstanceModel).mockResolvedValue(false)
    const payload = turn()
    expect(await prepareConversationGeneration(request(), 'chat-completions', payload)).toBe(
      payload
    )
  })

  it('refuses the turn of a workspace that forbids personal data, before anything is sent', async () => {
    await expect(
      prepareConversationGeneration(
        request({ workspaceId: 'ws-compta' }),
        'chat-completions',
        turn()
      )
    ).rejects.toBeInstanceOf(PersonalDataRefusedError)
  })
})
