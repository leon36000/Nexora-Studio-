import { describe, expect, it } from 'vitest'
import { validateDeploymentCredentials } from '@/lib/core/security/deployment-credentials'

const resource = { id: 'chat-1', authType: 'workspace' }

function check(context: {
  sessionPresent?: boolean
  sessionEmail?: string
  workspaceMember?: boolean
}) {
  return validateDeploymentCredentials(
    'req-1',
    resource,
    { method: 'POST', ...context },
    { input: 'Bonjour' },
    'chat'
  )
}

describe('workspace-members deployments (Nexora edition)', () => {
  it('asks to sign in when there is no session', async () => {
    expect(await check({ sessionPresent: false })).toEqual({
      authorized: false,
      error: 'auth_required_workspace',
    })
  })

  it('refuses a signed-in person who is not a member of the workspace', async () => {
    expect(
      await check({
        sessionPresent: true,
        sessionEmail: 'externe@ailleurs.fr',
        workspaceMember: false,
      })
    ).toMatchObject({
      authorized: false,
    })
  })

  it('lets a member of the workspace in, identified by their e-mail', async () => {
    expect(
      await check({ sessionPresent: true, sessionEmail: 'Camille@PME.fr', workspaceMember: true })
    ).toEqual({
      authorized: true,
      authenticatedEmail: 'camille@pme.fr',
    })
  })
})
