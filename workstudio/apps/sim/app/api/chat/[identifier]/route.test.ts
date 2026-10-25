/**
 * Tests for chat identifier API route
 */

import {
  dbChainMockFns,
  encryptionMock,
  executionPreprocessingMock,
  executionPreprocessingMockFns,
  loggingSessionMock,
  loggingSessionMockFns,
  workflowsApiUtilsMock,
  workflowsApiUtilsMockFns,
} from '@sim/testing'
import { createRouteContext } from '@sim/testing/helpers/http'
import {
  executeWorkflowMock,
  executeWorkflowMockFns,
} from '@sim/testing/mocks/execute-workflow.mock'
import { rateLimiterMock, rateLimiterMockFns } from '@sim/testing/mocks/rate-limiter.mock'
import { uploadsMock, uploadsMockFns } from '@sim/testing/mocks/uploads.mock'
import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Creates a mock NextRequest with cookies support for testing.
 */
function createMockNextRequest(
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
  url = 'http://localhost:3000/api/test'
): any {
  const headersObj = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  })

  const parsedUrl = new URL(url)

  return {
    method,
    headers: headersObj,
    nextUrl: parsedUrl,
    signal: AbortSignal.timeout(60_000),
    cookies: {
      get: vi.fn().mockReturnValue(undefined),
    },
    json:
      body !== undefined
        ? vi.fn().mockResolvedValue(body)
        : vi.fn().mockRejectedValue(new Error('No body')),
    url,
  }
}

const createMockStream = () => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('data: {"blockId":"agent-1","chunk":"Hello"}\n\n')
      )
      controller.enqueue(
        new TextEncoder().encode('data: {"blockId":"agent-1","chunk":" world"}\n\n')
      )
      controller.enqueue(
        new TextEncoder().encode('data: {"event":"final","data":{"success":true}}\n\n')
      )
      controller.close()
    },
  })
}

const { mockValidateChatAuth, mockSetChatAuthCookie, mockPrepareAssistantInput } = vi.hoisted(
  () => ({
    mockValidateChatAuth: vi.fn().mockResolvedValue({ authorized: true }),
    mockSetChatAuthCookie: vi.fn(),
    mockPrepareAssistantInput: vi.fn(),
  })
)

vi.mock('@/lib/nexora/assistant/prepare-input', () => ({
  prepareAssistantInput: mockPrepareAssistantInput,
}))

const mockCreateCodedErrorResponse = workflowsApiUtilsMockFns.mockCreateCodedErrorResponse
const mockCreateSuccessResponse = workflowsApiUtilsMockFns.mockCreateSuccessResponse

vi.mock('@/app/api/chat/utils', () => ({
  validateChatAuth: mockValidateChatAuth,
  setChatAuthCookie: mockSetChatAuthCookie,
}))

vi.mock('@/app/api/workflows/utils', () => workflowsApiUtilsMock)

vi.mock('@/lib/execution/preprocessing', () => executionPreprocessingMock)

vi.mock('@/lib/logs/execution/logging-session', () => loggingSessionMock)

vi.mock('@/lib/uploads', () => uploadsMock)

vi.mock('@/lib/workflows/streaming/streaming', () => ({
  createStreamingResponse: vi.fn().mockImplementation(async () => createMockStream()),
  agentStreamProtocolResponseHeaders: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/workflows/executor/execute-workflow', () => executeWorkflowMock)

vi.mock('@/lib/core/utils/sse', () => ({
  SSE_HEADERS: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  },
}))

vi.mock('@/lib/core/security/encryption', () => encryptionMock)

vi.mock('@/lib/core/rate-limiter', () => rateLimiterMock)

import { RATE_LIMITS } from '@/lib/core/rate-limiter/types'
import { preprocessExecution } from '@/lib/execution/preprocessing'
import { resolveActingMember } from '@/lib/nexora/acting-member'
import { executeWorkflow } from '@/lib/workflows/executor/execute-workflow'
import { createStreamingResponse } from '@/lib/workflows/streaming/streaming'
import { POST } from '@/app/api/chat/[identifier]/route'

executeWorkflowMockFns.mockExecuteWorkflow.mockResolvedValue({ success: true, output: {} })

const mockEnforceIpRateLimit = rateLimiterMockFns.mockEnforceIpRateLimitWithIndependentBackstop
const mockEnforceResourceRateLimit = rateLimiterMockFns.mockEnforceResourceRateLimit
const mockProcessChatFiles = uploadsMockFns.mockProcessChatFiles

describe('Chat Identifier API Route', () => {
  const mockChatResult = [
    {
      id: 'chat-id',
      workflowId: 'workflow-id',
      userId: 'user-id',
      isActive: true,
      authType: 'public',
      title: 'Test Chat',
      description: 'Test chat description',
      customizations: {
        welcomeMessage: 'Welcome to the test chat',
        primaryColor: '#000000',
      },
      outputConfigs: [{ blockId: 'block-1', path: 'output' }],
      includeThinking: false,
      includeToolCalls: false,
    },
  ]

  const mockWorkflowResult = [
    {
      isDeployed: true,
      state: {
        blocks: {},
        edges: [],
        loops: {},
        parallels: {},
      },
      deployedState: {
        blocks: {},
        edges: [],
        loops: {},
        parallels: {},
      },
    },
  ]

  beforeEach(() => {
    mockPrepareAssistantInput.mockImplementation(async ({ text }: { text: string }) => ({
      text,
      commit: vi.fn(),
    }))
    executionPreprocessingMockFns.mockPreprocessExecution.mockResolvedValue({
      success: true,
      actorUserId: 'test-user-id',
      billingAttribution: {
        actorUserId: 'test-user-id',
        workspaceId: 'test-workspace-id',
        billingEntity: { type: 'organization', id: 'test-organization-id' },
        payerSubscription: null,
      },
      workflowRecord: {
        id: 'test-workflow-id',
        userId: 'test-user-id',
        isDeployed: true,
        workspaceId: 'test-workspace-id',
        variables: {},
      },
    })

    mockValidateChatAuth.mockResolvedValue({ authorized: true })
    mockEnforceIpRateLimit.mockResolvedValue(null)
    mockEnforceResourceRateLimit.mockResolvedValue(null)
    mockProcessChatFiles.mockResolvedValue([])
    mockCreateCodedErrorResponse.mockImplementation(
      (message: string, status: number, code?: string) => {
        return new Response(
          JSON.stringify({
            error: code || 'Error',
            message,
          }),
          { status }
        )
      }
    )
    mockCreateSuccessResponse.mockImplementation((data: unknown) => {
      return new Response(JSON.stringify(data), { status: 200 })
    })

    dbChainMockFns.select.mockImplementation((fields: Record<string, unknown>) => {
      if (fields && fields.isDeployed !== undefined) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue(mockWorkflowResult),
            }),
          }),
        }
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(mockChatResult),
          }),
        }),
      }
    })
  })

  describe('POST endpoint', () => {
    describe('execution rate limit', () => {
      it.each([
        ['per-IP', mockEnforceIpRateLimit],
        ['per-deployment', mockEnforceResourceRateLimit],
      ])("refuses on the %s bucket before the owner's budget is reserved", async (_, bucket) => {
        bucket.mockResolvedValue(
          NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        )
        const req = createMockNextRequest('POST', { input: 'drain the wallet' })

        const response = await POST(req, createRouteContext({ identifier: 'test-chat' }))

        expect(response.status).toBe(429)
        expect(preprocessExecution).not.toHaveBeenCalled()
        expect(createStreamingResponse).not.toHaveBeenCalled()
        expect(mockProcessChatFiles).not.toHaveBeenCalled()
      })

      it('debits buckets keyed on the deployment, not the workflow', async () => {
        const req = createMockNextRequest('POST', { input: 'hello' })

        await POST(req, createRouteContext({ identifier: 'test-chat' }))

        expect(mockEnforceIpRateLimit).toHaveBeenCalledWith(
          'chat-execute',
          req,
          expect.objectContaining({ refillIntervalMs: 60_000 }),
          'chat-id'
        )
        expect(mockEnforceResourceRateLimit).toHaveBeenCalledWith(
          'chat-execute',
          'chat-id',
          expect.objectContaining({ refillIntervalMs: 60_000 })
        )
      })

      /**
       * The invariant the ceiling exists to hold. A chat execution debits the
       * workspace `sync` counter the owner's API, webhook and scheduled runs
       * share, so a ceiling at or above a plan's own rate never refuses before
       * that shared counter is drained — the availability half of the attack.
       * Asserted against every plan, including free, and on burst as well as
       * sustained rate, since either one reaching the plan bucket first is the
       * same hole.
       */
      it.each(Object.keys(RATE_LIMITS))(
        'stays under the %s plan sync budget it debits',
        async (plan) => {
          const req = createMockNextRequest('POST', { input: 'hello' })

          await POST(req, createRouteContext({ identifier: 'test-chat' }))

          const planBucket = RATE_LIMITS[plan as keyof typeof RATE_LIMITS].sync
          const [, , config] = mockEnforceResourceRateLimit.mock.calls[0]
          expect(config.refillRate).toBeLessThan(planBucket.refillRate)
          expect(config.maxTokens).toBeLessThan(planBucket.maxTokens)
        }
      )

      /** One host must not be able to take the whole deployment's allowance. */
      it('holds the per-IP bucket under the per-deployment one', async () => {
        const req = createMockNextRequest('POST', { input: 'hello' })

        await POST(req, createRouteContext({ identifier: 'test-chat' }))

        const [, , ipConfig] = mockEnforceIpRateLimit.mock.calls[0]
        const [, , deploymentConfig] = mockEnforceResourceRateLimit.mock.calls[0]
        expect(ipConfig.refillRate).toBeLessThan(deploymentConfig.refillRate)
      })
    })

    it('should return 403 for an inactive chat without loading the workflow or writing a log', async () => {
      dbChainMockFns.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([{ ...mockChatResult[0], isActive: false }]),
          }),
        }),
      }))
      const req = createMockNextRequest('POST', { input: 'x' })

      const response = await POST(req, createRouteContext({ identifier: 'paused-chat' }))

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data).toHaveProperty('message', 'This chat is currently unavailable')
      expect(dbChainMockFns.select).toHaveBeenCalledTimes(1)
      expect(loggingSessionMockFns.mockSafeStart).not.toHaveBeenCalled()
      expect(loggingSessionMockFns.mockSafeCompleteWithError).not.toHaveBeenCalled()
      expect(mockValidateChatAuth).not.toHaveBeenCalled()
    })

    it('should return 401 for unauthorized access', async () => {
      mockValidateChatAuth.mockResolvedValueOnce({
        authorized: false,
        error: 'Authentication required',
      })

      const req = createMockNextRequest('POST', { input: 'Hello' })
      const params = Promise.resolve({ identifier: 'protected-chat' })

      const response = await POST(req, { params })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('message', 'Authentication required')
    })

    it('executes with the email proven by the chat authentication gate', async () => {
      mockValidateChatAuth.mockResolvedValueOnce({
        authorized: true,
        authenticatedEmail: 'person@example.com',
      })
      const req = createMockNextRequest('POST', { input: 'Hello world' })

      const response = await POST(req, createRouteContext({ identifier: 'test-chat' }))
      expect(response.status).toBe(200)

      const streamOptions = vi.mocked(createStreamingResponse).mock.calls[0][0]
      await streamOptions.executeFn({
        onStream: vi.fn(),
        emitFrame: vi.fn(),
        onBlockComplete: vi.fn(),
        abortSignal: new AbortController().signal,
      })

      expect(vi.mocked(executeWorkflow).mock.calls[0][4]).toMatchObject({
        principal: {
          kind: 'system',
          serviceId: 'chat',
          workspaceId: 'test-workspace-id',
          workflowId: 'workflow-id',
          subject: {
            kind: 'authenticated_email',
            email: 'person@example.com',
          },
        },
      })
    }, 10000)

    describe('members-only chat memory', () => {
      async function runWith(authType: string, conversationId: string) {
        dbChainMockFns.select.mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue([{ ...mockChatResult[0], authType }]),
            }),
          }),
        }))
        mockValidateChatAuth.mockResolvedValueOnce({
          authorized: true,
          authenticatedEmail: 'b@pme.fr',
          ...(authType === 'workspace' ? { authenticatedUserId: 'member-b' } : {}),
        })
        const req = createMockNextRequest('POST', { input: 'Bonjour', conversationId })
        const response = await POST(req, createRouteContext({ identifier: 'test-chat' }))
        expect(response.status).toBe(200)
        const streamOptions = vi.mocked(createStreamingResponse).mock.calls[0][0]
        await streamOptions.executeFn({
          onStream: vi.fn(),
          emitFrame: vi.fn(),
          onBlockComplete: vi.fn(),
          abortSignal: new AbortController().signal,
        })
        return vi.mocked(executeWorkflow).mock.calls[0]
      }

      it("keeps another member from reaching a conversation's memory by sending its id", async () => {
        const [, , input] = await runWith('workspace', 'conversation-of-a')

        expect(input).toMatchObject({ conversationId: 'member-b:conversation-of-a' })
      })

      it('names the member on the run so its log stays theirs', async () => {
        const [, , , , options] = await runWith('workspace', 'conversation-of-b')

        expect(options).toMatchObject({ memberChatUserId: 'member-b' })
      })

      it('lets the run’s tool calls act as the member while it runs, and no longer afterwards', async () => {
        const noDeps = {
          taskOwner: async () => null,
          executionTrigger: async () => null,
          activeDeployer: async () => null,
        }
        let actingDuring: string | null = null
        vi.mocked(executeWorkflow).mockImplementationOnce(async (...args: unknown[]) => {
          actingDuring = await resolveActingMember(
            { executionId: String(args[5]), workspaceId: 'workspace-1' },
            noDeps
          )
          return { success: true, output: {} } as never
        })
        const [, , , , , executionId] = await runWith('workspace', 'conversation-of-b')

        expect(actingDuring).toBe('member-b')
        await expect(
          resolveActingMember(
            { executionId: String(executionId), workspaceId: 'workspace-1' },
            noDeps
          )
        ).resolves.toBeNull()
      })

      it('gives the agent the question prepared for the member, and records the context once the run succeeded', async () => {
        const commit = vi.fn()
        mockPrepareAssistantInput.mockResolvedValueOnce({ text: 'CONTEXTE\n\nBonjour', commit })
        vi.mocked(executeWorkflow).mockResolvedValueOnce({ success: true, output: {} } as never)
        const [, , input] = await runWith('workspace', 'conversation-of-b')

        expect(mockPrepareAssistantInput).toHaveBeenCalledWith({
          workspaceId: 'test-workspace-id',
          userId: 'member-b',
          conversationId: 'conversation-of-b',
          text: 'Bonjour',
        })
        expect(input).toMatchObject({ input: 'CONTEXTE\n\nBonjour' })
        expect(commit).toHaveBeenCalledTimes(1)
      })

      it('does not record the context of a run that failed', async () => {
        const commit = vi.fn()
        mockPrepareAssistantInput.mockResolvedValueOnce({ text: 'CONTEXTE\n\nBonjour', commit })
        vi.mocked(executeWorkflow).mockResolvedValueOnce({ success: false, output: {} } as never)
        await runWith('workspace', 'conversation-of-b')

        expect(commit).not.toHaveBeenCalled()
      })

      it('prepares nothing for a public chat’s visitor', async () => {
        const [, , input] = await runWith('public', 'visitor-conversation')

        expect(mockPrepareAssistantInput).not.toHaveBeenCalled()
        expect(input).toMatchObject({ input: 'Bonjour' })
      })

      it('leaves the conversation id of a public chat as the visitor sent it', async () => {
        const [, , input, , options] = await runWith('public', 'visitor-conversation')

        expect(input).toMatchObject({ conversationId: 'visitor-conversation' })
        expect(options).not.toHaveProperty('memberChatUserId')
      })
    })

    describe('reasoning frames', () => {
      async function streamConfigFor(
        authType: string,
        auth: Record<string, unknown>,
        includeThinking = false
      ) {
        dbChainMockFns.select.mockImplementationOnce(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue([{ ...mockChatResult[0], authType, includeThinking }]),
            }),
          }),
        }))
        mockValidateChatAuth.mockResolvedValueOnce({ authorized: true, ...auth })
        const req = createMockNextRequest(
          'POST',
          { input: 'Bonjour' },
          { 'X-Sim-Stream-Protocol': 'agent-events-v1' }
        )
        const response = await POST(req, createRouteContext({ identifier: 'test-chat' }))
        expect(response.status).toBe(200)
        const options = vi.mocked(createStreamingResponse).mock.calls[0][0]
        await options.executeFn({
          onStream: vi.fn(),
          emitFrame: vi.fn(),
          onBlockComplete: vi.fn(),
          abortSignal: new AbortController().signal,
        })
        return {
          stream: options.streamConfig,
          execute: vi.mocked(executeWorkflow).mock.calls[0][4],
        }
      }

      it('never reach an anonymous visitor of a public chat, even with the protocol header', async () => {
        const { stream, execute } = await streamConfigFor('public', {})

        expect(stream).toMatchObject({ includeThinking: false })
        expect(execute).toMatchObject({ includeThinking: false })
      })

      it('never reach a password or email visitor without the owner opting in', async () => {
        for (const authType of ['password', 'email']) {
          vi.mocked(createStreamingResponse).mockClear()
          vi.mocked(executeWorkflow).mockClear()
          const { stream } = await streamConfigFor(authType, { authenticatedEmail: 'a@pme.fr' })
          expect(stream).toMatchObject({ includeThinking: false })
        }
      })

      it('reach an authenticated member of a members-only chat (the Assistant)', async () => {
        const { stream, execute } = await streamConfigFor('workspace', {
          authenticatedUserId: 'member-a',
          authenticatedEmail: 'a@pme.fr',
        })

        expect(stream).toMatchObject({ includeThinking: true })
        expect(execute).toMatchObject({ includeThinking: true, agentEvents: true })
      })
    })

    /** Thinking and tool calls are independent policies: thinking must not drag tool frames along. */
    it('keeps tool calls off when only thinking is enabled', async () => {
      const thinkingChatResult = [
        { ...mockChatResult[0], includeThinking: true, includeToolCalls: false },
      ]
      dbChainMockFns.select.mockImplementation((fields: Record<string, unknown>) => {
        if (fields && fields.isDeployed !== undefined) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue(mockWorkflowResult),
              }),
            }),
          }
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue(thinkingChatResult),
            }),
          }),
        }
      })

      const req = createMockNextRequest(
        'POST',
        { input: 'Hello world' },
        { 'X-Sim-Stream-Protocol': 'agent-events-v1' }
      )
      const response = await POST(req, createRouteContext({ identifier: 'test-chat' }))
      expect(response.status).toBe(200)

      const options = vi.mocked(createStreamingResponse).mock.calls[0][0]
      expect(options.streamConfig).toMatchObject({
        includeThinking: true,
        includeToolCalls: false,
      })

      await options.executeFn({
        onStream: vi.fn(),
        emitFrame: vi.fn(),
        onBlockComplete: vi.fn(),
        abortSignal: new AbortController().signal,
      })
      const executeOptions = vi.mocked(executeWorkflow).mock.calls[0][4]
      expect(executeOptions).toMatchObject({
        includeThinking: true,
        includeToolCalls: false,
        agentEvents: true,
      })
    }, 10000)
  })
})
