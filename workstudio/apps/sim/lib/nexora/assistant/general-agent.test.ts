/**
 * Failure modes owned here (the « Assistant général » every workspace gets on first use):
 * - a second call creates another folder, workflow or chat once the assistant is published;
 * - a half-provided assistant (created, then deploy failed) is duplicated instead of reused;
 * - a concurrent request creates a second assistant while one is being created;
 * - the assistant misses some of the workspace's knowledge bases, or reads deleted ones;
 * - its chat is published publicly instead of for the workspace's members;
 * - its chat shows something other than the Agent block's answer;
 * - a publishing failure passes silently, or leaves the creation lock held;
 * - the creation is audited without the acting member, or for a no-op;
 * - a workspace the caller has no access to gets an assistant;
 * - an assistant published before agents read attached files keeps ignoring them;
 * - its upgrade is saved but not deployed, and never retried while the live version ignores files;
 * - the upgrade overwrites the chat settings an administrator chose (access, title, welcome);
 * - the upgrade puts back a files field an administrator changed or cleared.
 */

import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import {
  dbChainMockFns,
  hasMockCondition,
  queueTableRows,
  resetDbChainMock,
} from '@sim/testing/mocks/database.mock'
import {
  foldersOrchestrationMock,
  foldersOrchestrationMockFns,
} from '@sim/testing/mocks/folders-orchestration.mock'
import { importWorkflowMock, importWorkflowMockFns } from '@sim/testing/mocks/import-workflow.mock'
import { redisConfigMockFns } from '@sim/testing/mocks/redis-config.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import {
  workflowsOrchestrationMock,
  workflowsOrchestrationMockFns,
} from '@sim/testing/mocks/workflows-orchestration.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/audit', () => auditMock)
vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/folders/orchestration', () => foldersOrchestrationMock)
vi.mock('@/lib/workflows/orchestration', () => workflowsOrchestrationMock)
vi.mock('@/lib/workflows/operations/import-workflow', () => importWorkflowMock)

import { AGENTS_FOLDER, readAgentWorkflow } from '@/lib/nexora/agents'
import {
  ensureGeneralAssistantAgent,
  GENERAL_ASSISTANT_NAME,
  GENERAL_ASSISTANT_WELCOME,
} from '@/lib/nexora/assistant/general-agent'

const resolvePermission = workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission
const mockImportWorkflow = importWorkflowMockFns.mockImportWorkflowIntoWorkspaceTransition
const createFolder = foldersOrchestrationMockFns.mockCreateFolder
const deployChat = workflowsOrchestrationMockFns.mockPerformChatDeploy
const recordAudit = auditMockFns.mockRecordAudit
const acquireLock = redisConfigMockFns.mockAcquireLock
const releaseLock = redisConfigMockFns.mockReleaseLock

const WORKSPACE_ID = 'workspace-1'
const member = createSessionPrincipal({ userId: 'member' })

function ensure() {
  return ensureGeneralAssistantAgent.execute({
    principal: member,
    input: { workspaceId: WORKSPACE_ID },
  })
}

/** The rows one look-up of the assistant reads (it runs once more under the creation lock). */
function queueLookup(rows: { folder?: unknown[]; workflow?: unknown[]; chat?: unknown[] }) {
  queueTableRows(schemaMock.folder, rows.folder ?? [])
  queueTableRows(schemaMock.workflow, rows.workflow ?? [])
  queueTableRows(schemaMock.chat, rows.chat ?? [])
}

/** The active deployed version, whose Agent block has these sub-blocks. */
function queueActiveVersion(
  agentSubBlocks: Record<string, unknown>,
  data: Record<string, unknown> = CURRENT_REVISION
) {
  queueTableRows(schemaMock.workflowDeploymentVersion, [
    {
      state: {
        blocks: {
          start: { id: 'start', type: 'start_trigger', subBlocks: {} },
          'agent-block': { id: 'agent-block', type: 'agent', subBlocks: agentSubBlocks, data },
        },
      },
    },
  ])
}

/** The mark of an Assistant already offered the interpreter: files upgrades are tested apart from it. */
const CURRENT_REVISION = { nexoraAssistantRevision: 2 }
const LEGACY_SUB_BLOCKS = { model: { id: 'model', type: 'combobox', value: 'vllm/nexora-default' } }
const MESSAGE_FILES_SUB_BLOCK = { id: 'files', type: 'short-input', value: '<start.files>' }

const publishedRows = {
  folder: [{ id: 'folder-agents' }],
  workflow: [{ id: 'general-workflow', isDeployed: true }],
  chat: [
    {
      id: 'general-chat',
      identifier: 'assistant-1a2b3c4d',
      isActive: true,
      title: 'Assistant RH',
      authType: 'email',
    },
  ],
}

beforeEach(() => {
  resetDbChainMock()
  resolvePermission.mockReset()
  resolvePermission.mockResolvedValue('read')
  createFolder.mockReset()
  createFolder.mockResolvedValue({ success: true, folder: { id: 'folder-agents' } })
  mockImportWorkflow.mockReset()
  mockImportWorkflow.mockResolvedValue({
    success: true,
    workflow: {
      id: 'general-workflow',
      name: GENERAL_ASSISTANT_NAME,
      blocks: [
        { id: 'imported-start', type: 'start_trigger', name: 'Start' },
        { id: 'imported-agent', type: 'agent', name: 'Agent' },
      ],
    },
    warnings: [],
  })
  deployChat.mockReset()
  deployChat.mockResolvedValue({ success: true, chatId: 'general-chat' })
})

describe('ensureGeneralAssistantAgent', () => {
  it('refuses a workspace the caller has no access to', async () => {
    resolvePermission.mockResolvedValue(null)

    await expect(ensure()).rejects.toMatchObject({ code: 'forbidden' })
    expect(dbChainMockFns.select).not.toHaveBeenCalled()
    expect(createFolder).not.toHaveBeenCalled()
  })

  it('creates the Agents folder, the assistant and its members-only chat on first use', async () => {
    queueTableRows(schemaMock.knowledgeBase, [{ id: 'kb-rh' }, { id: 'kb-ventes' }])

    const result = await ensure()

    expect(createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'workflow',
        workspaceId: WORKSPACE_ID,
        userId: 'member',
        name: AGENTS_FOLDER,
      })
    )

    const [importParams] = mockImportWorkflow.mock.calls[0]
    expect(importParams).toMatchObject({
      workspaceId: WORKSPACE_ID,
      folderId: 'folder-agents',
      name: GENERAL_ASSISTANT_NAME,
      userId: 'member',
      capabilityUserId: 'member',
    })
    const config = readAgentWorkflow(JSON.parse(importParams.workflow))
    expect(config).toMatchObject({
      name: GENERAL_ASSISTANT_NAME,
      model: 'vllm/nexora-default',
      tools: [],
      knowledgeBaseIds: ['kb-rh', 'kb-ventes'],
      codeInterpreter: true,
      webSearch: false,
      memory: true,
      welcomeMessage: GENERAL_ASSISTANT_WELCOME,
    })
    expect(config?.instructions).toMatch(/vouvo/i)

    expect(deployChat).toHaveBeenCalledTimes(1)
    const [deployParams] = deployChat.mock.calls[0]
    expect(deployParams).toMatchObject({
      workflowId: 'general-workflow',
      userId: 'member',
      title: GENERAL_ASSISTANT_NAME,
      authType: 'workspace',
      customizations: { welcomeMessage: GENERAL_ASSISTANT_WELCOME },
      outputConfigs: [
        { blockId: 'imported-agent', path: 'content' },
        { blockId: 'imported-agent', path: 'files' },
        { blockId: 'imported-agent', path: 'sources' },
      ],
      includeThinking: false,
      workspaceId: WORKSPACE_ID,
      actor: { kind: 'session', userId: 'member' },
      projectLegacyAudit: false,
    })
    expect(deployParams.identifier).toMatch(/^assistant-[0-9a-f]{8}$/)

    expect(result).toEqual({
      workflowId: 'general-workflow',
      chatId: 'general-chat',
      chatIdentifier: deployParams.identifier,
      createdWorkflow: true,
      publishedChat: true,
      authType: 'workspace',
    })
    expect(releaseLock).toHaveBeenCalledTimes(1)

    const audited = recordAudit.mock.calls.map(([entry]) => entry)
    expect(audited).toEqual([
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        actorId: 'member',
        action: 'workflow.created',
        resourceId: 'general-workflow',
      }),
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        actorId: 'member',
        action: 'chat.deployed',
        resourceId: 'general-chat',
        metadata: expect.objectContaining({ authType: 'workspace' }),
      }),
    ])
  })

  it('reads only the live knowledge bases of the workspace', async () => {
    await ensure()

    const where = dbChainMockFns.where.mock.calls.map(([condition]) => condition)
    const eq = (column: unknown, value: unknown) => (node: Record<string, unknown>) =>
      node.type === 'eq' && node.left === column && node.right === value
    const isNull = (column: unknown) => (node: Record<string, unknown>) =>
      node.type === 'isNull' && node.column === column
    const knowledgeQuery = where.find((condition) =>
      hasMockCondition(condition, eq(schemaMock.knowledgeBase.workspaceId, WORKSPACE_ID))
    )
    expect(knowledgeQuery).toBeDefined()
    expect(hasMockCondition(knowledgeQuery, isNull(schemaMock.knowledgeBase.deletedAt))).toBe(true)
  })

  it.each([
    ['reads message files', '<start.files>'],
    ['had its files field cleared by an administrator', ''],
  ])('creates nothing once the published assistant %s', async (_case, files) => {
    queueLookup(publishedRows)
    queueActiveVersion({
      ...LEGACY_SUB_BLOCKS,
      files: { ...MESSAGE_FILES_SUB_BLOCK, value: files },
    })

    const result = await ensure()

    expect(result).toEqual({
      workflowId: 'general-workflow',
      chatId: 'general-chat',
      chatIdentifier: 'assistant-1a2b3c4d',
      createdWorkflow: false,
      publishedChat: false,
      authType: 'email',
    })
    expect(createFolder).not.toHaveBeenCalled()
    expect(mockImportWorkflow).not.toHaveBeenCalled()
    expect(deployChat).not.toHaveBeenCalled()
    expect(acquireLock).not.toHaveBeenCalled()
    expect(recordAudit).not.toHaveBeenCalled()
  })

  it('upgrades an assistant published before agents read attached files, then republishes it', async () => {
    const legacyBlock = {
      id: 'agent-block',
      subBlocks: LEGACY_SUB_BLOCKS,
      data: { canonicalModes: { tools: 'basic' }, ...CURRENT_REVISION },
    }
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueTableRows(schemaMock.workflowBlocks, [legacyBlock])

    const result = await ensure()

    expect(dbChainMockFns.update).toHaveBeenCalledWith(schemaMock.workflowBlocks)
    const [stored] = dbChainMockFns.set.mock.calls.map(([values]) => values)
    expect(stored.subBlocks).toEqual({ ...LEGACY_SUB_BLOCKS, files: MESSAGE_FILES_SUB_BLOCK })
    expect(stored.data).toEqual({
      canonicalModes: { tools: 'basic', files: 'advanced' },
      ...CURRENT_REVISION,
    })
    expect(deployChat).toHaveBeenCalledTimes(1)
    const [deployParams] = deployChat.mock.calls[0]
    expect(deployParams).toMatchObject({
      workflowId: 'general-workflow',
      identifier: 'assistant-1a2b3c4d',
      title: 'Assistant RH',
      workspaceId: WORKSPACE_ID,
    })
    for (const chatSetting of [
      'authType',
      'description',
      'customizations',
      'outputConfigs',
      'allowedEmails',
      'password',
    ]) {
      expect(deployParams).not.toHaveProperty(chatSetting)
    }
    expect(result).toMatchObject({ createdWorkflow: false, publishedChat: true })
    expect(recordAudit.mock.calls.map(([entry]) => entry.metadata?.authType)).toEqual(['email'])
    expect(releaseLock).toHaveBeenCalledTimes(1)
  })

  it('offers the interpreter to an assistant published before it, and publishes its files and sources', async () => {
    const readsFiles = { ...LEGACY_SUB_BLOCKS, files: MESSAGE_FILES_SUB_BLOCK }
    const block = { id: 'agent-block', subBlocks: readsFiles, data: { canonicalModes: {} } }
    queueLookup(publishedRows)
    queueActiveVersion(readsFiles, {})
    queueLookup(publishedRows)
    queueActiveVersion(readsFiles, {})
    queueTableRows(schemaMock.workflowBlocks, [block])

    const result = await ensure()

    const [stored] = dbChainMockFns.set.mock.calls.map(([values]) => values)
    const tools = stored.subBlocks.tools.value as Array<Record<string, unknown>>
    expect(tools).toHaveLength(1)
    expect(tools[0]).toMatchObject({ toolId: 'function_execute', params: { language: 'python' } })
    expect(stored.data).toEqual({ canonicalModes: {}, ...CURRENT_REVISION })
    const [deployParams] = deployChat.mock.calls[0]
    expect(deployParams).toMatchObject({
      identifier: 'assistant-1a2b3c4d',
      title: 'Assistant RH',
      outputConfigs: [
        { blockId: 'agent-block', path: 'content' },
        { blockId: 'agent-block', path: 'files' },
        { blockId: 'agent-block', path: 'sources' },
      ],
    })
    expect(deployParams).not.toHaveProperty('authType')
    expect(result).toMatchObject({ publishedChat: true })
  })

  it('does not offer the interpreter again to an assistant whose administrator removed it', async () => {
    const readsFiles = { ...LEGACY_SUB_BLOCKS, files: MESSAGE_FILES_SUB_BLOCK }
    queueLookup(publishedRows)
    queueActiveVersion(readsFiles, CURRENT_REVISION)

    await ensure()

    expect(deployChat).not.toHaveBeenCalled()
    expect(dbChainMockFns.update).not.toHaveBeenCalled()
  })

  it('redeploys an upgrade that was saved but whose deployment failed', async () => {
    const legacyBlock = { id: 'agent-block', subBlocks: LEGACY_SUB_BLOCKS, data: CURRENT_REVISION }
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueTableRows(schemaMock.workflowBlocks, [legacyBlock])
    deployChat.mockResolvedValueOnce({ success: false, error: 'Deployment failed' })

    await expect(ensure()).rejects.toThrow('Deployment failed')
    expect(dbChainMockFns.update).toHaveBeenCalledTimes(1)

    const upgradedDraft = {
      id: 'agent-block',
      subBlocks: { ...LEGACY_SUB_BLOCKS, files: MESSAGE_FILES_SUB_BLOCK },
      data: { canonicalModes: { files: 'advanced' }, ...CURRENT_REVISION },
    }
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueTableRows(schemaMock.workflowBlocks, [upgradedDraft])

    const retried = await ensure()

    expect(deployChat).toHaveBeenCalledTimes(2)
    expect(dbChainMockFns.update).toHaveBeenCalledTimes(1)
    expect(retried).toMatchObject({ publishedChat: true })
  })

  it('leaves an agent whose files field an administrator set otherwise', async () => {
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueLookup(publishedRows)
    queueActiveVersion(LEGACY_SUB_BLOCKS)
    queueTableRows(schemaMock.workflowBlocks, [
      {
        id: 'agent-block',
        subBlocks: { ...LEGACY_SUB_BLOCKS, files: { ...MESSAGE_FILES_SUB_BLOCK, value: '' } },
        data: CURRENT_REVISION,
      },
    ])

    const result = await ensure()

    expect(dbChainMockFns.update).not.toHaveBeenCalled()
    expect(deployChat).not.toHaveBeenCalled()
    expect(result).toMatchObject({ workflowId: 'general-workflow', publishedChat: false })
  })

  it('publishes an existing unpublished assistant instead of creating a second one', async () => {
    const unpublished = {
      folder: [{ id: 'folder-agents' }],
      workflow: [{ id: 'general-workflow', isDeployed: false }],
      chat: [],
    }
    queueLookup(unpublished)
    queueLookup(unpublished)
    queueTableRows(schemaMock.workflowBlocks, [{ id: 'agent-block' }])

    const result = await ensure()

    expect(createFolder).not.toHaveBeenCalled()
    expect(mockImportWorkflow).not.toHaveBeenCalled()
    expect(deployChat).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'general-workflow',
        authType: 'workspace',
        outputConfigs: [
          { blockId: 'agent-block', path: 'content' },
          { blockId: 'agent-block', path: 'files' },
          { blockId: 'agent-block', path: 'sources' },
        ],
      })
    )
    expect(result).toMatchObject({ createdWorkflow: false, publishedChat: true })
    expect(recordAudit.mock.calls.map(([entry]) => entry.action)).toEqual(['chat.deployed'])
  })

  it('keeps the chat address of an assistant whose workflow was undeployed', async () => {
    const undeployed = {
      folder: [{ id: 'folder-agents' }],
      workflow: [{ id: 'general-workflow', isDeployed: false }],
      chat: [{ id: 'general-chat', identifier: 'assistant-1a2b3c4d', isActive: true }],
    }
    queueLookup(undeployed)
    queueLookup(undeployed)

    await ensure()

    expect(deployChat).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'assistant-1a2b3c4d', authType: 'workspace' })
    )
  })

  it('leaves the creation to a concurrent request that holds the lock', async () => {
    acquireLock.mockResolvedValueOnce(false)

    await expect(ensure()).resolves.toBeNull()
    expect(createFolder).not.toHaveBeenCalled()
    expect(mockImportWorkflow).not.toHaveBeenCalled()
    expect(deployChat).not.toHaveBeenCalled()
    expect(releaseLock).not.toHaveBeenCalled()
  })

  it('fails when the chat cannot be published, and releases the lock', async () => {
    deployChat.mockResolvedValueOnce({
      success: false,
      error: 'Workflow deployment failed',
      errorCode: 'internal',
    })

    await expect(ensure()).rejects.toThrow('Workflow deployment failed')
    expect(releaseLock).toHaveBeenCalledTimes(1)
    expect(recordAudit).not.toHaveBeenCalled()
  })

  it('fails when the assistant workflow cannot be created', async () => {
    mockImportWorkflow.mockResolvedValueOnce({ success: false, status: 500, error: 'save failed' })

    await expect(ensure()).rejects.toThrow('save failed')
    expect(deployChat).not.toHaveBeenCalled()
    expect(releaseLock).toHaveBeenCalledTimes(1)
  })
})
