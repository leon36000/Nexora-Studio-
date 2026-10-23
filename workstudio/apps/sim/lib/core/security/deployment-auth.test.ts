import { authMockFns, createSession } from '@sim/testing'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)

import { validateDeploymentAuth } from '@/lib/core/security/deployment-auth'

const resource = { id: 'chat-1', authType: 'workspace', workspaceId: 'ws-1' }

function post() {
  return new NextRequest('http://localhost/api/chat/agent', { method: 'POST' })
}

describe('validateDeploymentAuth for workspace-members deployments', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'u-1', email: 'camille@pme.fr', name: 'Camille' })
    )
  })

  it('lets in a member of the deployment’s workspace', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    expect(
      await validateDeploymentAuth('r', resource, post(), { input: 'x' }, 'chat')
    ).toMatchObject({
      authorized: true,
    })
    expect(permissionsMockFns.mockGetUserEntityPermissions).toHaveBeenCalledWith(
      'u-1',
      'workspace',
      'ws-1'
    )
  })

  it('names the member by user id, so a members-only chat can keep their memory apart', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    expect(
      await validateDeploymentAuth('r', resource, post(), { input: 'x' }, 'chat')
    ).toMatchObject({ authorized: true, authenticatedUserId: 'u-1' })
  })

  it('refuses a signed-in user of another workspace', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue(null)
    expect(
      await validateDeploymentAuth('r', resource, post(), { input: 'x' }, 'chat')
    ).toMatchObject({
      authorized: false,
    })
  })

  it('refuses when the deployment’s workspace is unknown', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('admin')
    expect(
      await validateDeploymentAuth(
        'r',
        { ...resource, workspaceId: null },
        post(),
        { input: 'x' },
        'chat'
      )
    ).toMatchObject({ authorized: false })
  })
})
