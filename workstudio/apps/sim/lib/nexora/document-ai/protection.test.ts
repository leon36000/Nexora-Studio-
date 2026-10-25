/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  PersonalDataServiceError,
  PersonalDataUnsupportedError,
} from '@/lib/nexora/data-protection/errors'
import type { GuardDeps } from '@/lib/nexora/data-protection/guard'
import type { DataProtectionPolicy } from '@/lib/nexora/data-protection/policy'
import { assertDocumentCallNeedsNoProtection } from '@/lib/nexora/document-ai/protection'

const allow: DataProtectionPolicy = { defaultMode: 'allow', workspaceModes: {} }
const mask: DataProtectionPolicy = { defaultMode: 'mask', workspaceModes: { 'ws-open': 'allow' } }
const refuse: DataProtectionPolicy = { defaultMode: 'refuse', workspaceModes: {} }

function setup(policy: DataProtectionPolicy, offInstance: (model: string) => boolean) {
  const isOffInstance = vi.fn(async (model: string) => offInstance(model))
  const deps: GuardDeps = {
    loadPolicy: async () => policy,
    isOffInstance,
    protect: vi.fn(),
  }
  return { deps, isOffInstance }
}

const resolving = (model: string) => vi.fn(async () => model)

describe('assertDocumentCallNeedsNoProtection', () => {
  it('lets everything through, without even resolving the models, when the policy allows', async () => {
    const { deps } = setup(allow, () => true)
    const vision = resolving('mistral-ocr')
    await assertDocumentCallNeedsNoProtection({ workspaceId: 'ws-1', models: [vision] }, deps)
    expect(vision).not.toHaveBeenCalled()
  })

  it('applies the mode of the workspace: one that allows reads its documents with any model', async () => {
    const { deps } = setup(mask, () => true)
    await expect(
      assertDocumentCallNeedsNoProtection(
        { workspaceId: 'ws-open', models: [resolving('mistral-ocr')] },
        deps
      )
    ).resolves.toBeUndefined()
  })

  it.each([
    ['mask', mask],
    ['refuse', refuse],
  ])(
    'stops a document sent to a model off the instance when the policy says « %s »',
    async (_name, policy) => {
      const { deps } = setup(policy, (model) => model === 'mistral-ocr')
      await expect(
        assertDocumentCallNeedsNoProtection(
          { workspaceId: 'ws-1', models: [resolving('mistral-ocr')] },
          deps
        )
      ).rejects.toBeInstanceOf(PersonalDataUnsupportedError)
    }
  )

  it('lets a document read by a model on this server through', async () => {
    const { deps } = setup(refuse, () => false)
    await expect(
      assertDocumentCallNeedsNoProtection(
        { workspaceId: 'ws-1', models: [resolving('glm-ocr')] },
        deps
      )
    ).resolves.toBeUndefined()
  })

  it('stops the call when any one of its models, the vision one or the chat one, is off the instance', async () => {
    const { deps } = setup(refuse, (model) => model === 'cloud-glm-5-3')
    await expect(
      assertDocumentCallNeedsNoProtection(
        { workspaceId: 'ws-1', models: [resolving('glm-ocr'), resolving('cloud-glm-5-3')] },
        deps
      )
    ).rejects.toBeInstanceOf(PersonalDataUnsupportedError)
  })

  it('applies the instance default to a call that names no workspace', async () => {
    const { deps } = setup(refuse, () => true)
    await expect(
      assertDocumentCallNeedsNoProtection(
        { workspaceId: undefined, models: [resolving('m')] },
        deps
      )
    ).rejects.toBeInstanceOf(PersonalDataUnsupportedError)
  })

  it('stops, rather than send unprotected, when the policy cannot be read', async () => {
    const { deps } = setup(mask, () => true)
    deps.loadPolicy = async () => {
      throw new Error('database down')
    }
    await expect(
      assertDocumentCallNeedsNoProtection({ workspaceId: 'ws-1', models: [resolving('m')] }, deps)
    ).rejects.toBeInstanceOf(PersonalDataServiceError)
  })
})
