/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { runTarget, type TargetContext, type TargetDeps } from '@/lib/nexora/evaluations/targets'
import {
  type AgentTarget,
  MAX_ANSWER_CHARACTERS,
  type ModelTarget,
  type PromptTarget,
} from '@/lib/nexora/evaluations/types'

const context: TargetContext = {
  workspaceId: 'ws-1',
  userId: 'user-1',
  campaignName: 'FAQ tarifs',
  signal: new AbortController().signal,
}

function deps(overrides: Partial<TargetDeps> = {}): TargetDeps {
  let clock = 1_000
  return {
    complete: vi.fn(async () => ({
      text: 'La réponse.',
      usage: { promptTokens: 30, completionTokens: 5 },
    })),
    loadPromptVersion: vi.fn(async () => ({
      name: 'FAQ tarifs',
      content: 'Tu réponds sur les tarifs de {{societe}}.',
      variables: [{ name: 'societe', type: 'text' as const }],
    })),
    runAgent: vi.fn(async () => ({
      content: 'Réponse de l’agent',
      usage: { promptTokens: 80, completionTokens: 12 },
      executionId: 'exec-1',
    })),
    now: () => {
      clock += 250
      return clock
    },
    ...overrides,
  }
}

const modelTarget: ModelTarget = {
  key: 't1',
  label: 'qwen2.5:7b',
  kind: 'model',
  model: 'vllm/qwen2.5:7b',
  system: 'Réponds en une phrase.',
}

describe('cible « modèle »', () => {
  it('envoie les consignes et la question au modèle, sans le préfixe du fournisseur, et le trace', async () => {
    const dependencies = deps()
    const result = await runTarget(
      modelTarget,
      { input: 'Prix du forfait Pro ?' },
      context,
      dependencies
    )
    expect(dependencies.complete).toHaveBeenCalledWith({
      messages: [
        { role: 'system', content: 'Réponds en une phrase.' },
        { role: 'user', content: 'Prix du forfait Pro ?' },
      ],
      model: 'qwen2.5:7b',
      temperature: 0,
      signal: context.signal,
      trace: {
        source: 'playground',
        workspaceId: 'ws-1',
        userId: 'user-1',
        name: 'Évaluation : FAQ tarifs',
      },
    })
    expect(result).toMatchObject({
      answer: 'La réponse.',
      usage: { promptTokens: 30, completionTokens: 5 },
      executionId: null,
    })
    expect(result.latencyMs).toBe(250)
  })

  it('n’ajoute pas de message système vide', async () => {
    const dependencies = deps()
    await runTarget({ ...modelTarget, system: null }, { input: 'Q' }, context, dependencies)
    expect(vi.mocked(dependencies.complete).mock.calls[0][0].messages).toEqual([
      { role: 'user', content: 'Q' },
    ])
  })

  it('coupe une réponse trop longue', async () => {
    const dependencies = deps({
      complete: vi.fn(async () => ({
        text: 'a'.repeat(MAX_ANSWER_CHARACTERS + 500),
        usage: { promptTokens: 1, completionTokens: 1 },
      })),
    })
    const result = await runTarget(modelTarget, { input: 'Q' }, context, dependencies)
    expect(result.answer).toHaveLength(MAX_ANSWER_CHARACTERS)
  })

  it('laisse l’erreur du modèle remonter : il n’y a pas de réponse à juger', async () => {
    const dependencies = deps({
      complete: vi.fn(async () => {
        throw new Error('Nexora API indisponible')
      }),
    })
    await expect(runTarget(modelTarget, { input: 'Q' }, context, dependencies)).rejects.toThrow(
      'Nexora API indisponible'
    )
  })
})

describe('cible « prompt »', () => {
  const promptTarget: PromptTarget = {
    key: 't2',
    label: 'Prompt « FAQ tarifs » v2',
    kind: 'prompt',
    model: 'nexora-default',
    promptId: 'prompt-1',
    promptName: 'FAQ tarifs',
    version: 2,
    selector: 'production',
    variables: { societe: 'Acme' },
  }

  it('lit la version épinglée (pas l’étiquette) et en fait le message système', async () => {
    const dependencies = deps()
    await runTarget(promptTarget, { input: 'Q' }, context, dependencies)
    expect(dependencies.loadPromptVersion).toHaveBeenCalledWith('ws-1', 'prompt-1', 2)
    expect(vi.mocked(dependencies.complete).mock.calls[0][0]).toMatchObject({
      model: 'nexora-default',
      messages: [
        { role: 'system', content: 'Tu réponds sur les tarifs de Acme.' },
        { role: 'user', content: 'Q' },
      ],
    })
  })

  it('échoue clairement quand une variable manque', async () => {
    const dependencies = deps()
    await expect(
      runTarget({ ...promptTarget, variables: {} }, { input: 'Q' }, context, dependencies)
    ).rejects.toThrow(/societe/)
    expect(dependencies.complete).not.toHaveBeenCalled()
  })

  it('échoue clairement quand le prompt ou sa version a disparu', async () => {
    const dependencies = deps({ loadPromptVersion: vi.fn(async () => null) })
    await expect(runTarget(promptTarget, { input: 'Q' }, context, dependencies)).rejects.toThrow(
      /version 2/
    )
  })
})

describe('cible « agent »', () => {
  const agentTarget: AgentTarget = {
    key: 't3',
    label: 'Agent Support',
    kind: 'agent',
    workflowId: 'wf-1',
  }

  it('exécute l’agent publié et rend sa réponse, ses jetons et l’exécution', async () => {
    const dependencies = deps()
    const result = await runTarget(agentTarget, { input: 'Q' }, context, dependencies)
    expect(dependencies.runAgent).toHaveBeenCalledWith('wf-1', 'ws-1', 'Q', context.signal)
    expect(result).toMatchObject({
      answer: 'Réponse de l’agent',
      usage: { promptTokens: 80, completionTokens: 12 },
      executionId: 'exec-1',
    })
    expect(dependencies.complete).not.toHaveBeenCalled()
  })
})
