import {
  createSessionPrincipal,
  createWorkspaceApiKeyPrincipal,
} from '@sim/testing/factories/principal.factory'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import {
  workspaceContextMock,
  workspaceContextMockFns,
} from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repo, invalidate } = vi.hoisted(() => ({
  repo: {
    findPromptRow: vi.fn(),
    insertPromptVersion: vi.fn(),
    movePromptLabel: vi.fn(),
    insertPromptWithFirstVersion: vi.fn(),
  },
  invalidate: vi.fn(),
}))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/prompts/repository', () => ({
  ...repo,
  deletePrompt: vi.fn(),
  getPromptDetail: vi.fn(),
  getPromptVersion: vi.fn(),
  listPrompts: vi.fn(),
}))
vi.mock('@/lib/nexora/prompts/resolve', () => ({ invalidatePromptResolution: invalidate }))

import {
  createPromptUseCase,
  createPromptVersionUseCase,
  movePromptLabelUseCase,
} from '@/lib/nexora/prompts/application/use-cases'

const WORKSPACE = 'workspace-1'
const row = { id: 'prompt-1', workspaceId: WORKSPACE, name: 'Support client' }
const record = {
  ...row,
  description: '',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  labels: { production: 2, test: 1 },
  latestVersion: 2,
}

describe('prompt use cases', () => {
  beforeEach(() => {
    workspaceContextMockFns.mockResolveActiveWorkspaceApplicationContext.mockResolvedValue({
      workspaceId: WORKSPACE,
      workspaceOrganizationId: null,
      allowPersonalApiKeys: true,
      billedAccountUserId: 'owner-1',
    })
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('write')
    repo.findPromptRow.mockResolvedValue(row)
  })

  it('refuses a new version to a member who may only read the workspace', async () => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')

    await expect(
      createPromptVersionUseCase.execute({
        principal: createSessionPrincipal({ userId: 'reader' }),
        input: {
          workspaceId: WORKSPACE,
          promptRef: 'prompt-1',
          content: 'x',
          variables: [],
          note: '',
        },
      })
    ).rejects.toMatchObject({ name: expect.stringMatching(/Permission|Forbidden/) })
    expect(repo.insertPromptVersion).not.toHaveBeenCalled()
  })

  it('records a label move in the audit log with the prompt, the label and both versions', async () => {
    repo.movePromptLabel.mockResolvedValue({
      prompt: record,
      previousVersion: 1,
      version: 2,
      changed: true,
    })

    await movePromptLabelUseCase.execute({
      principal: createSessionPrincipal({ userId: 'editor' }),
      input: {
        workspaceId: WORKSPACE,
        promptRef: 'Support client',
        label: 'production',
        version: 2,
      },
    })

    expect(repo.movePromptLabel).toHaveBeenCalledWith(
      expect.objectContaining({ promptId: 'prompt-1', label: 'production', version: 2 })
    )
    expect(auditMockFns.mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'prompt.label_moved',
        resourceType: 'prompt',
        resourceId: 'prompt-1',
        resourceName: 'Support client',
        metadata: expect.objectContaining({ label: 'production', fromVersion: 1, toVersion: 2 }),
      })
    )
    expect(invalidate).toHaveBeenCalledWith('prompt-1')
  })

  it('records nothing when the label already pointed at the version', async () => {
    repo.movePromptLabel.mockResolvedValue({
      prompt: record,
      previousVersion: 2,
      version: 2,
      changed: false,
    })

    await movePromptLabelUseCase.execute({
      principal: createSessionPrincipal({ userId: 'editor' }),
      input: { workspaceId: WORKSPACE, promptRef: 'prompt-1', label: 'production', version: 2 },
    })

    expect(auditMockFns.mockRecordAudit).not.toHaveBeenCalled()
  })

  it('answers not found for a prompt the workspace does not hold', async () => {
    repo.findPromptRow.mockResolvedValue(null)

    await expect(
      movePromptLabelUseCase.execute({
        principal: createSessionPrincipal({ userId: 'editor' }),
        input: { workspaceId: WORKSPACE, promptRef: 'other', label: 'test', version: 1 },
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('stores the variables the text uses, attributes a workspace key to no member', async () => {
    repo.insertPromptVersion.mockResolvedValue({
      prompt: record,
      version: { version: 3, note: 'CI' },
    })

    await createPromptVersionUseCase.execute({
      principal: createWorkspaceApiKeyPrincipal({ workspaceId: WORKSPACE }),
      input: {
        workspaceId: WORKSPACE,
        promptRef: 'prompt-1',
        content: 'Bonjour {{client}}, ton {{ton}}',
        variables: [
          { name: 'ton', type: 'text', defaultValue: 'poli' },
          { name: 'gone', type: 'number' },
        ],
        note: 'CI',
      },
    })

    expect(repo.insertPromptVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        promptId: 'prompt-1',
        createdBy: null,
        variables: [
          { name: 'client', type: 'text' },
          { name: 'ton', type: 'text', defaultValue: 'poli' },
        ],
      })
    )
    expect(auditMockFns.mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'prompt.version_created',
        metadata: expect.objectContaining({ version: 3 }),
      })
    )
  })

  it('lets a database failure through rather than answering not found', async () => {
    repo.insertPromptWithFirstVersion.mockRejectedValue(new Error('connection reset'))

    await expect(
      createPromptUseCase.execute({
        principal: createSessionPrincipal({ userId: 'editor' }),
        input: {
          workspaceId: WORKSPACE,
          name: 'A',
          description: '',
          content: 'x',
          variables: [],
          note: '',
        },
      })
    ).rejects.toThrow('connection reset')
  })
})
