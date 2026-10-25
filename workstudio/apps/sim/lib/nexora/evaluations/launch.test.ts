/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import {
  type LaunchDeps,
  type LaunchInput,
  launchCampaign,
  targetsToInputs,
} from '@/lib/nexora/evaluations/launch'
import type { CampaignRecord, RowRecord } from '@/lib/nexora/evaluations/repository'
import { type EvalTarget, MAX_CAMPAIGN_ITEMS } from '@/lib/nexora/evaluations/types'

function rows(count: number): RowRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    datasetId: 'ds-1',
    position: index,
    input: `Question ${index}`,
    expected: null,
    guidance: null,
    candidate: null,
    humanVerdict: null,
    humanNote: null,
    sourceRef: null,
  }))
}

function deps(overrides: Partial<LaunchDeps> = {}): LaunchDeps {
  return {
    getDataset: vi.fn(async () => ({ id: 'ds-1' })),
    listAllRows: vi.fn(async () => rows(3)),
    getJudge: vi.fn(async () => ({
      id: 'judge-1',
      config: { kind: 'contains' as const, value: null, caseSensitive: false },
    })),
    requireModelsAllowed: vi.fn(async () => {}),
    findPrompt: vi.fn(async () => ({ id: 'prompt-1', name: 'FAQ tarifs' })),
    resolvePromptVersion: vi.fn(async (_promptId, pick) =>
      'version' in pick ? { version: pick.version } : { version: pick.selector === 'test' ? 3 : 2 }
    ),
    listAgents: vi.fn(async () => [{ workflowId: 'wf-1', name: 'Support' }]),
    insertCampaign: vi.fn(
      async (input) => ({ id: 'camp-1', status: 'pending', ...input }) as unknown as CampaignRecord
    ),
    start: vi.fn(),
    ...overrides,
  }
}

const base: LaunchInput = {
  workspaceId: 'ws-1',
  name: 'FAQ tarifs',
  datasetId: 'ds-1',
  judgeId: 'judge-1',
  targets: [{ kind: 'model', model: 'vllm/qwen2.5:7b' }],
  createdBy: 'user-1',
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return error instanceof OrchestrationError ? error.code : 'autre'
  }
}

describe('cibles', () => {
  it('numérote les cibles et les nomme pour qu’on les reconnaisse dans les tableaux', async () => {
    const dependencies = deps()
    await launchCampaign(
      {
        ...base,
        targets: [
          { kind: 'model', model: 'vllm/qwen2.5:7b' },
          { kind: 'model', model: 'cloud-glm-5-3', system: 'Réponds en une phrase.' },
          { kind: 'prompt', model: 'cloud-glm-5-3', promptId: 'prompt-1', selector: 'production' },
          { kind: 'agent', workflowId: 'wf-1' },
        ],
      },
      dependencies
    )
    const created = vi.mocked(dependencies.insertCampaign).mock.calls[0][0]
    expect(created.targets.map((target) => [target.key, target.label])).toEqual([
      ['t1', 'qwen2.5:7b'],
      ['t2', 'cloud-glm-5-3 + consignes'],
      ['t3', '« FAQ tarifs » v2 · cloud-glm-5-3'],
      ['t4', 'Agent « Support »'],
    ])
  })

  it('épingle la version que l’étiquette désigne au lancement', async () => {
    const dependencies = deps()
    await launchCampaign(
      {
        ...base,
        targets: [
          { kind: 'prompt', model: 'm', promptId: 'prompt-1', selector: 'test' },
          { kind: 'prompt', model: 'm', promptId: 'prompt-1', version: 1 },
        ],
      },
      dependencies
    )
    const [first, second] = vi.mocked(dependencies.insertCampaign).mock.calls[0][0].targets
    expect(first).toMatchObject({ kind: 'prompt', version: 3, selector: 'test' })
    expect(second).toMatchObject({ kind: 'prompt', version: 1, selector: null })
  })

  it('distingue deux cibles de même nom', async () => {
    const dependencies = deps()
    await launchCampaign(
      {
        ...base,
        targets: [
          { kind: 'model', model: 'a' },
          { kind: 'model', model: 'a' },
        ],
      },
      dependencies
    )
    expect(
      vi.mocked(dependencies.insertCampaign).mock.calls[0][0].targets.map((t) => t.label)
    ).toEqual(['a', 'a #2'])
  })

  it('refuse un prompt ou une version qui n’existe pas', async () => {
    expect(
      await codeOf(
        launchCampaign(
          {
            ...base,
            targets: [{ kind: 'prompt', model: 'm', promptId: 'x', selector: 'production' }],
          },
          deps({ findPrompt: vi.fn(async () => null) })
        )
      )
    ).toBe('validation')
    expect(
      await codeOf(
        launchCampaign(
          { ...base, targets: [{ kind: 'prompt', model: 'm', promptId: 'p', version: 9 }] },
          deps({ resolvePromptVersion: vi.fn(async () => null) })
        )
      )
    ).toBe('validation')
  })

  it('refuse un agent qui n’est pas publié dans l’espace', async () => {
    const dependencies = deps()
    expect(
      await codeOf(
        launchCampaign(
          { ...base, targets: [{ kind: 'agent', workflowId: 'inconnu' }] },
          dependencies
        )
      )
    ).toBe('validation')
    expect(dependencies.insertCampaign).not.toHaveBeenCalled()
  })

  it('veut entre une et huit cibles', async () => {
    expect(await codeOf(launchCampaign({ ...base, targets: [] }, deps()))).toBe('validation')
    const nine = Array.from({ length: 9 }, () => ({ kind: 'model' as const, model: 'a' }))
    expect(await codeOf(launchCampaign({ ...base, targets: nine }, deps()))).toBe('validation')
  })
})

describe('volume', () => {
  it('refuse un jeu vide', async () => {
    expect(await codeOf(launchCampaign(base, deps({ listAllRows: vi.fn(async () => []) })))).toBe(
      'validation'
    )
  })

  it('refuse plus de 5 000 éléments (lignes × cibles) en le disant', async () => {
    const dependencies = deps({ listAllRows: vi.fn(async () => rows(2_501)) })
    const outcome = launchCampaign(
      {
        ...base,
        targets: [
          { kind: 'model', model: 'a' },
          { kind: 'model', model: 'b' },
        ],
      },
      dependencies
    )
    await expect(outcome).rejects.toThrow(/5 000/)
    expect(dependencies.insertCampaign).not.toHaveBeenCalled()
  })

  it('accepte exactement 5 000 éléments', async () => {
    const dependencies = deps({ listAllRows: vi.fn(async () => rows(MAX_CAMPAIGN_ITEMS)) })
    await launchCampaign(base, dependencies)
    expect(dependencies.insertCampaign).toHaveBeenCalledTimes(1)
  })
})

describe('lancement', () => {
  it('refuse un jeu ou un juge d’un autre espace', async () => {
    expect(await codeOf(launchCampaign(base, deps({ getDataset: vi.fn(async () => null) })))).toBe(
      'not_found'
    )
    expect(await codeOf(launchCampaign(base, deps({ getJudge: vi.fn(async () => null) })))).toBe(
      'not_found'
    )
  })

  it('prend 2 de concurrence par défaut et borne la demande entre 1 et 8', async () => {
    const dependencies = deps()
    await launchCampaign(base, dependencies)
    await launchCampaign({ ...base, concurrency: 99 }, dependencies)
    await launchCampaign({ ...base, concurrency: 0 }, dependencies)
    expect(
      vi.mocked(dependencies.insertCampaign).mock.calls.map(([call]) => call.concurrency)
    ).toEqual([2, 8, 1])
  })

  it('démarre la campagne une fois créée', async () => {
    const dependencies = deps()
    const campaign = await launchCampaign(base, dependencies)
    expect(dependencies.start).toHaveBeenCalledWith(campaign.id)
  })
})

describe('groupe d’accès', () => {
  const llmJudge = {
    id: 'judge-1',
    config: {
      kind: 'llm_class' as const,
      model: 'vllm/cloud-glm-5-3',
      instructions: '',
      labels: ['bon', 'mauvais'],
      passLabels: ['bon'],
    },
  }

  it('demande si le groupe du lanceur autorise les modèles des cibles et celui du juge', async () => {
    const dependencies = deps({ getJudge: vi.fn(async () => llmJudge) })
    await launchCampaign(
      {
        ...base,
        targets: [
          { kind: 'model', model: 'vllm/qwen2.5:7b' },
          { kind: 'prompt', model: 'qwen2.5:7b', promptId: 'prompt-1', selector: 'production' },
          { kind: 'agent', workflowId: 'wf-1' },
        ],
      },
      dependencies
    )
    expect(dependencies.requireModelsAllowed).toHaveBeenCalledWith(
      { userId: 'user-1', workspaceId: 'ws-1' },
      ['vllm/qwen2.5:7b', 'qwen2.5:7b', 'vllm/cloud-glm-5-3']
    )
  })

  it('ne demande rien pour un juge à règle et un agent seul', async () => {
    const dependencies = deps()
    await launchCampaign(
      { ...base, targets: [{ kind: 'agent', workflowId: 'wf-1' }] },
      dependencies
    )
    expect(dependencies.requireModelsAllowed).toHaveBeenCalledWith(
      { userId: 'user-1', workspaceId: 'ws-1' },
      []
    )
  })

  it('ne crée ni ne démarre rien quand un modèle est interdit', async () => {
    const dependencies = deps({
      requireModelsAllowed: vi.fn(async () => {
        throw new OrchestrationError('forbidden', 'modèle interdit')
      }),
    })
    expect(await codeOf(launchCampaign(base, dependencies))).toBe('forbidden')
    expect(dependencies.insertCampaign).not.toHaveBeenCalled()
    expect(dependencies.start).not.toHaveBeenCalled()
  })
})

describe('cibles d’une planification', () => {
  it('retrouve les demandes d’origine : l’étiquette est relue à chaque lancement', () => {
    const targets: EvalTarget[] = [
      { key: 't1', label: 'a', kind: 'model', model: 'a', system: null },
      {
        key: 't2',
        label: 'p',
        kind: 'prompt',
        model: 'm',
        promptId: 'prompt-1',
        promptName: 'FAQ',
        version: 2,
        selector: 'production',
        variables: { x: '1' },
      },
      {
        key: 't3',
        label: 'q',
        kind: 'prompt',
        model: 'm',
        promptId: 'prompt-1',
        promptName: 'FAQ',
        version: 1,
        selector: null,
        variables: {},
      },
    ]
    expect(targetsToInputs(targets)).toEqual([
      { kind: 'model', model: 'a', system: null },
      {
        kind: 'prompt',
        model: 'm',
        promptId: 'prompt-1',
        selector: 'production',
        version: null,
        variables: { x: '1' },
      },
      {
        kind: 'prompt',
        model: 'm',
        promptId: 'prompt-1',
        selector: null,
        version: 1,
        variables: {},
      },
    ])
  })
})
