import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PersonalDataRefusedError,
  PersonalDataUnsupportedError,
} from '@/lib/nexora/data-protection/errors'
import type { GuardDeps } from '@/lib/nexora/data-protection/guard'
import {
  resetExecutionProtection,
  takeExecutionProtection,
} from '@/lib/nexora/data-protection/notes'
import type { DataProtectionPolicy } from '@/lib/nexora/data-protection/policy'
import { protectProviderPayload } from '@/lib/nexora/data-protection/provider-payload'

const IBAN = 'FR76 3000 6000 0112 3456 7890 189'

function deps(policy: DataProtectionPolicy, offInstance = true): GuardDeps {
  return {
    loadPolicy: async () => policy,
    isOffInstance: async () => offInstance,
    protect: async (texts) => {
      const found: Record<string, number> = {}
      return {
        texts: texts.map((text) => {
          if (!text.includes(IBAN)) return text
          found.IBAN_CODE = (found.IBAN_CODE ?? 0) + 1
          return text.replaceAll(IBAN, '[IBAN]')
        }),
        found,
      }
    },
  }
}

const mask: DataProtectionPolicy = { defaultMode: 'mask', workspaceModes: {} }
const request = { model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1', executionId: 'exec-1' }

function payload() {
  return {
    model: 'cloud-glm-5-3',
    temperature: 0.2,
    tools: [{ type: 'function', function: { name: 'lookup' } }],
    messages: [
      { role: 'system', content: 'Tu aides.' },
      { role: 'user', content: `Mon IBAN est ${IBAN}` },
      { role: 'assistant', content: null, tool_calls: [{ id: 'c1' }] },
      { role: 'tool', tool_call_id: 'c1', content: `Compte ${IBAN} trouvé` },
    ],
  }
}

describe('protectProviderPayload', () => {
  beforeEach(() => resetExecutionProtection())

  it('masks every turn of an agent, tool results included, and leaves the rest of the payload alone', async () => {
    const original = payload()
    const result = await protectProviderPayload(request, 'chat-completions', original, deps(mask))
    expect(result).not.toBe(original)
    expect(result.messages[1].content).toBe('Mon IBAN est [IBAN]')
    expect(result.messages[3].content).toBe('Compte [IBAN] trouvé')
    expect(result.tools).toBe(original.tools)
    expect(result.temperature).toBe(0.2)
    expect(original.messages[1].content).toContain(IBAN)
  })

  it('notes what it did for the execution, once however many turns resend the same text', async () => {
    await protectProviderPayload(request, 'chat-completions', payload(), deps(mask))
    await protectProviderPayload(request, 'chat-completions', payload(), deps(mask))
    expect(takeExecutionProtection('exec-1')).toEqual([
      { mode: 'mask', model: 'vllm/cloud-glm-5-3', found: { IBAN_CODE: 2 }, masked: 2 },
    ])
  })

  it('returns the very same payload when the policy allows or the model is on this server', async () => {
    const original = payload()
    expect(
      await protectProviderPayload(
        request,
        'chat-completions',
        original,
        deps({ defaultMode: 'allow', workspaceModes: {} })
      )
    ).toBe(original)
    expect(
      await protectProviderPayload(request, 'chat-completions', original, deps(mask, false))
    ).toBe(original)
    expect(takeExecutionProtection('exec-1')).toEqual([])
  })

  it('stops the turn and notes the refusal when the workspace says « refuser »', async () => {
    const refuse: DataProtectionPolicy = {
      defaultMode: 'allow',
      workspaceModes: { 'ws-1': 'refuse' },
    }
    await expect(
      protectProviderPayload(request, 'chat-completions', payload(), deps(refuse))
    ).rejects.toBeInstanceOf(PersonalDataRefusedError)
    expect(takeExecutionProtection('exec-1')).toEqual([
      { mode: 'refuse', model: 'vllm/cloud-glm-5-3', found: { IBAN_CODE: 2 }, masked: 2 },
    ])
  })

  it('works for a call that belongs to no execution', async () => {
    const result = await protectProviderPayload(
      { model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      'chat-completions',
      payload(),
      deps(mask)
    )
    expect(result.messages[1].content).toBe('Mon IBAN est [IBAN]')
  })

  it('does not pretend to mask a provider whose messages it cannot read', async () => {
    const native = { model: 'gpt-4o', input: [{ role: 'user', content: 'x' }] }
    await expect(
      protectProviderPayload({ ...request, model: 'gpt-4o' }, 'responses', native, deps(mask))
    ).rejects.toBeInstanceOf(PersonalDataUnsupportedError)
    expect(
      await protectProviderPayload(
        request,
        'responses',
        native,
        deps({ defaultMode: 'allow', workspaceModes: {} })
      )
    ).toBe(native)
    expect(await protectProviderPayload(request, 'responses', native, deps(mask, false))).toBe(
      native
    )
  })

  it('leaves a payload without a message list to the provider', async () => {
    const odd = { model: 'x' }
    const guardSpy = vi.fn()
    const result = await protectProviderPayload(request, 'chat-completions', odd, {
      ...deps(mask),
      protect: guardSpy,
    })
    expect(result).toBe(odd)
    expect(guardSpy).not.toHaveBeenCalled()
  })
})
