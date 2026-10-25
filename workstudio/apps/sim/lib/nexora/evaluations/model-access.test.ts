/**
 * @vitest-environment node
 */
import {
  permissionGroupsResolveMock,
  permissionGroupsResolveMockFns,
} from '@sim/testing/mocks/permission-groups-resolve.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrchestrationError } from '@/lib/core/orchestration/types'

const { mockRouterResolver } = vi.hoisted(() => ({ mockRouterResolver: vi.fn() }))

vi.mock('@/lib/permission-groups/resolve.server', () => permissionGroupsResolveMock)
vi.mock('@/lib/nexora/developer-api/upstream', () => ({ routerResolver: mockRouterResolver }))

import { requireEvaluationModelsAllowed } from '@/lib/nexora/evaluations/model-access'

const access = { userId: 'user-1', workspaceId: 'ws-1' }

/** La vraie porte des modèles tourne ici : seuls le groupe et la liste de Nexora API sont simulés. */
describe('modèles d’une évaluation face au groupe d’accès', () => {
  beforeEach(() => {
    permissionGroupsResolveMockFns.mockGetUserPermissionConfig.mockResolvedValue({
      allowedModelProviders: null,
      deniedModels: ['vllm/cloud-glm-5-3'],
    })
    mockRouterResolver.mockResolvedValue((name: string) =>
      ['cloud-glm-5-3', 'nexora-default'].includes(name.toLowerCase()) ? 'cloud-glm-5-3' : name
    )
  })

  it('refuse le modèle interdit, sous son nom, nu ou par alias, en le nommant', async () => {
    for (const model of ['vllm/cloud-glm-5-3', 'cloud-glm-5-3', 'nexora-default']) {
      await expect(requireEvaluationModelsAllowed(access, [model])).rejects.toMatchObject({
        code: 'forbidden',
        message: expect.stringContaining('groupe d’accès'),
      })
    }
  })

  it('refuse dès qu’un seul des modèles est interdit', async () => {
    await expect(
      requireEvaluationModelsAllowed(access, ['vllm/qwen2.5:7b', 'cloud-glm-5-3'])
    ).rejects.toBeInstanceOf(OrchestrationError)
  })

  it('laisse passer les modèles que le groupe n’interdit pas', async () => {
    await expect(
      requireEvaluationModelsAllowed(access, ['vllm/qwen2.5:7b', 'qwen2.5:7b'])
    ).resolves.toBeUndefined()
  })

  it('ne gouverne personne quand le lanceur est inconnu (auteur d’une planification supprimé)', async () => {
    permissionGroupsResolveMockFns.mockGetUserPermissionConfig.mockResolvedValue(null)
    await expect(
      requireEvaluationModelsAllowed({ userId: null, workspaceId: 'ws-1' }, ['cloud-glm-5-3'])
    ).resolves.toBeUndefined()
  })
})
