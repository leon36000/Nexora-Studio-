/**
 * The realtime server cannot resolve permission groups itself (they live in the app, behind the
 * billing and access-control graph), so it asks the app over internal HTTP. A wrong answer here
 * either lets a « Lecture seule » member write over the socket or blocks every editor, so the
 * wire contract and its failure modes are pinned.
 */
import { jsonResponse } from '@sim/testing/helpers/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { isWorkflowEditingWithheld } from '@/middleware/workflow-edit-access'

const fetchMock = vi.fn<typeof fetch>()

describe('isWorkflowEditingWithheld', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  it('asks the app with the internal key and reads its answer', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ withheld: true }))

    await expect(isWorkflowEditingWithheld('member-1', 'workflow-1')).resolves.toBe(true)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${env.NEXT_PUBLIC_APP_URL}/api/internal/workflow-edit-access`)
    expect(new Headers(init?.headers).get('x-api-key')).toBe(env.INTERNAL_API_SECRET)
    expect(JSON.parse(String(init?.body))).toEqual({
      workflowId: 'workflow-1',
      userId: 'member-1',
    })
  })

  it('asks the app at its internal address when one is configured', async () => {
    const publicOnly = env.INTERNAL_API_BASE_URL
    env.INTERNAL_API_BASE_URL = 'http://workstudio:3000/'
    try {
      fetchMock.mockResolvedValue(jsonResponse({ withheld: false }))

      await isWorkflowEditingWithheld('member-1', 'workflow-1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://workstudio:3000/api/internal/workflow-edit-access'
      )
    } finally {
      env.INTERNAL_API_BASE_URL = publicOnly
    }
  })

  it('reports editing allowed when the app says so', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ withheld: false }))

    await expect(isWorkflowEditingWithheld('member-1', 'workflow-1')).resolves.toBe(false)
  })

  it('throws rather than guessing when the app refuses or fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401))
    await expect(isWorkflowEditingWithheld('member-1', 'workflow-1')).rejects.toThrow()

    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, 500))
    await expect(isWorkflowEditingWithheld('member-1', 'workflow-1')).rejects.toThrow()
  })

  it('throws on an answer that does not say whether editing is withheld', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ withheld: 'yes' }))

    await expect(isWorkflowEditingWithheld('member-1', 'workflow-1')).rejects.toThrow()
  })
})
