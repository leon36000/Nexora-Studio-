/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockComplete } = vi.hoisted(() => ({ mockComplete: vi.fn() }))

vi.mock('@/lib/nexora/wand', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/wand')>()),
  isNexoraWandAvailable: () => true,
  nexoraWandComplete: mockComplete,
}))

import type { CompileContext } from '@/lib/nexora/copilot/compile'
import { generatePlan } from '@/lib/nexora/copilot/generate'

const context: CompileContext = {
  model: 'vllm/nexora-default',
  knowledgeBases: [],
  connect: { serverId: 'srv', services: [] },
}

const plan = {
  title: 'Relance',
  trigger: { kind: 'manuel', fields: [] },
  steps: [
    {
      kind: 'agent',
      name: 'relance',
      instructions: 'Vous relancez les factures.',
      message: 'Relancez.',
    },
  ],
}

describe('generatePlan — trace', () => {
  beforeEach(() => {
    mockComplete.mockResolvedValue({ text: JSON.stringify(plan), usage: { promptTokens: 1, completionTokens: 1 } })
  })

  it('passe à chaque appel du modèle le contexte de trace du Copilote', async () => {
    const trace = { source: 'copilot' as const, workspaceId: 'ws-1', userId: 'user-1', name: 'Copilote' }
    await generatePlan({ description: 'Relancer les factures', context, trace })
    expect(mockComplete).toHaveBeenCalledWith(expect.objectContaining({ trace }))
  })

  it('ne trace rien quand aucun contexte n’est donné', async () => {
    await generatePlan({ description: 'Relancer les factures', context })
    expect(mockComplete.mock.calls[0][0].trace).toBeUndefined()
  })
})
