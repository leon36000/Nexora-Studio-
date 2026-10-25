// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import {
  permissionGroupsResolveMock,
  permissionGroupsResolveMockFns,
} from '@sim/testing/mocks/permission-groups-resolve.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRouterResolver } = vi.hoisted(() => ({ mockRouterResolver: vi.fn() }))

vi.mock('@/lib/permission-groups/resolve.server', () => permissionGroupsResolveMock)
vi.mock('@/lib/nexora/developer-api/upstream', () => ({ routerResolver: mockRouterResolver }))

import {
  assertPermissionsAllowed,
  ModelNotAllowedError,
  validateModelProvider,
} from '@/ee/access-control/utils/permission-check'

const comptabilite = {
  allowedModelProviders: null,
  deniedModels: ['vllm/cloud-glm-5-3'],
}

/** Nexora API's names and aliases: `nexora-default` and `Assistant` both designate GLM 5.3. */
const aliases: Record<string, string> = {
  'cloud-glm-5-3': 'cloud-glm-5-3',
  'nexora-default': 'cloud-glm-5-3',
  assistant: 'cloud-glm-5-3',
  'qwen2.5:7b': 'qwen2.5:7b',
}

describe('model gate of an access group', () => {
  beforeEach(() => {
    permissionGroupsResolveMockFns.mockGetUserPermissionConfig.mockResolvedValue(comptabilite)
    mockRouterResolver.mockResolvedValue(
      (name: string) => aliases[name.trim().toLowerCase()] ?? null
    )
  })

  it('refuses the model the group denies, in a block', async () => {
    await expect(validateModelProvider('u-1', 'ws-1', 'vllm/cloud-glm-5-3')).rejects.toBeInstanceOf(
      ModelNotAllowedError
    )
  })

  it('refuses it under any alias too: nexora-default is GLM 5.3 on this instance', async () => {
    for (const alias of ['vllm/nexora-default', 'vllm/Assistant', 'nexora-default']) {
      await expect(validateModelProvider('u-1', 'ws-1', alias)).rejects.toBeInstanceOf(
        ModelNotAllowedError
      )
    }
  })

  it('lets the group use the models it does not deny', async () => {
    await expect(validateModelProvider('u-1', 'ws-1', 'vllm/qwen2.5:7b')).resolves.toBeUndefined()
  })

  it('refuses through the executor gate as well', async () => {
    await expect(
      assertPermissionsAllowed({ userId: 'u-1', workspaceId: 'ws-1', model: 'vllm/nexora-default' })
    ).rejects.toBeInstanceOf(ModelNotAllowedError)
  })

  it('does not ask Nexora API anything when the group denies no model', async () => {
    permissionGroupsResolveMockFns.mockGetUserPermissionConfig.mockResolvedValue({
      allowedModelProviders: null,
      deniedModels: [],
    })
    await validateModelProvider('u-1', 'ws-1', 'vllm/nexora-default')
    expect(mockRouterResolver).not.toHaveBeenCalled()
  })

  it('refuses the bare name too: the Playground and table batches pass it without vllm/', async () => {
    for (const bare of ['cloud-glm-5-3', 'Cloud-GLM-5-3']) {
      await expect(validateModelProvider('u-1', 'ws-1', bare)).rejects.toBeInstanceOf(
        ModelNotAllowedError
      )
    }
    await expect(
      assertPermissionsAllowed({ userId: 'u-1', workspaceId: 'ws-1', model: 'cloud-glm-5-3' })
    ).rejects.toBeInstanceOf(ModelNotAllowedError)
  })

  it('refuses the bare name even when the router answers its own name', async () => {
    mockRouterResolver.mockResolvedValue((name: string) => name)
    await expect(validateModelProvider('u-1', 'ws-1', 'cloud-glm-5-3')).rejects.toBeInstanceOf(
      ModelNotAllowedError
    )
  })

  it('lets a bare name the group does not deny through', async () => {
    await expect(validateModelProvider('u-1', 'ws-1', 'qwen2.5:7b')).resolves.toBeUndefined()
  })

  it('fails closed when the alias list cannot be read: names that could be an alias are refused', async () => {
    mockRouterResolver.mockRejectedValue(new Error('Nexora API unreachable'))
    for (const name of [
      'vllm/cloud-glm-5-3',
      'cloud-glm-5-3',
      'vllm/nexora-default',
      'nexora-default',
      'vllm/qwen2.5:7b',
    ]) {
      await expect(validateModelProvider('u-1', 'ws-1', name)).rejects.toBeInstanceOf(
        ModelNotAllowedError
      )
    }
  })

  it('keeps the models that are not Nexora names when the alias list cannot be read', async () => {
    mockRouterResolver.mockRejectedValue(new Error('Nexora API unreachable'))
    await expect(validateModelProvider('u-1', 'ws-1', 'gpt-4o')).resolves.toBeUndefined()
    await expect(validateModelProvider('u-1', 'ws-1', 'openai/gpt-4o')).resolves.toBeUndefined()
  })

  it('governs no one when the caller has no group', async () => {
    permissionGroupsResolveMockFns.mockGetUserPermissionConfig.mockResolvedValue(null)
    await expect(
      validateModelProvider('u-1', 'ws-1', 'vllm/cloud-glm-5-3')
    ).resolves.toBeUndefined()
  })
})
