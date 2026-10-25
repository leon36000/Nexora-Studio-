/**
 * @vitest-environment node
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuth, mockCreateFile, mockCreateBatch, mockReadContent } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCreateFile: vi.fn(),
  mockCreateBatch: vi.fn(),
  mockReadContent: vi.fn(),
}))

vi.mock('@/lib/nexora/developer-api/gateway', () => ({ authenticateGatewayCall: mockAuth }))
vi.mock('@/lib/nexora/batches/live', () => ({ liveBatchApiDeps: { marker: 'deps' } }))
vi.mock('@/lib/nexora/batches/openai', () => ({
  createFile: mockCreateFile,
  listFiles: vi.fn(),
  createBatch: mockCreateBatch,
  listBatches: vi.fn(),
  readFileContent: mockReadContent,
}))

import { GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { POST as postBatch } from '@/app/api/nexora/v1/batches/route'
import { GET as getContent } from '@/app/api/nexora/v1/files/[fileId]/content/route'
import { POST as postFile } from '@/app/api/nexora/v1/files/route'

const call = { key: { id: 'k1' }, headers: { 'x-ratelimit-limit-requests': '60' } }

function upload(fields: Record<string, string | File>) {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.set(name, value)
  return new NextRequest('http://localhost/api/nexora/v1/files', {
    method: 'POST',
    headers: { authorization: 'Bearer sk-nexora-x' },
    body: form,
  })
}

describe('POST /v1/files', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(call)
    mockCreateFile.mockResolvedValue({ id: 'file-1', object: 'file' })
  })

  it('passes the JSONL text, the file name and the purpose to the service', async () => {
    const jsonl = '{"custom_id":"a"}\n'
    const response = await postFile(
      upload({ purpose: 'batch', file: new File([jsonl], 'avis.jsonl') }),
      createRouteContext({})
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'file-1', object: 'file' })
    expect(mockCreateFile).toHaveBeenCalledWith(
      call,
      { filename: 'avis.jsonl', text: jsonl, purpose: 'batch' },
      { marker: 'deps' }
    )
    expect(response.headers.get('x-ratelimit-limit-requests')).toBe('60')
  })

  it('answers in OpenAI’s error shape, in French, when the file or the purpose is missing', async () => {
    const response = await postFile(upload({ purpose: 'batch' }), createRouteContext({}))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatchObject({ type: 'invalid_request_error', code: 'invalid_request' })
    expect(body.error.message).toContain('multipart/form-data')
    expect(mockCreateFile).not.toHaveBeenCalled()
  })

  it('refuses a call without a valid key before reading anything', async () => {
    mockAuth.mockRejectedValue(gatewayErrors.invalidKey())
    const response = await postFile(upload({}), createRouteContext({}))
    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('invalid_api_key')
    expect(mockCreateFile).not.toHaveBeenCalled()
  })

  it('relays a refusal of the service with its status', async () => {
    mockCreateFile.mockRejectedValue(
      new GatewayError(400, 'invalid_request', 'Seulement « batch ».')
    )
    const response = await postFile(
      upload({ purpose: 'assistants', file: new File(['x'], 'a.jsonl') }),
      createRouteContext({})
    )
    expect(response.status).toBe(400)
  })
})

describe('POST /v1/batches', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(call)
  })

  it('creates the batch from the JSON body', async () => {
    mockCreateBatch.mockResolvedValue({ id: 'batch_1', object: 'batch' })
    const response = await postBatch(
      new NextRequest('http://localhost/api/nexora/v1/batches', {
        method: 'POST',
        headers: { authorization: 'Bearer sk-nexora-x', 'content-type': 'application/json' },
        body: JSON.stringify({ input_file_id: 'file-1', endpoint: '/v1/chat/completions' }),
      }),
      createRouteContext({})
    )
    expect(response.status).toBe(200)
    expect(mockCreateBatch).toHaveBeenCalledWith(
      call,
      expect.objectContaining({ input_file_id: 'file-1', endpoint: '/v1/chat/completions' }),
      { marker: 'deps' }
    )
  })

  it('refuses a body without input_file_id in OpenAI’s error shape', async () => {
    const response = await postBatch(
      new NextRequest('http://localhost/api/nexora/v1/batches', {
        method: 'POST',
        headers: { authorization: 'Bearer sk-nexora-x', 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: '/v1/chat/completions' }),
      }),
      createRouteContext({})
    )
    expect(response.status).toBe(400)
    expect((await response.json()).error.type).toBe('invalid_request_error')
    expect(mockCreateBatch).not.toHaveBeenCalled()
  })
})

describe('GET /v1/files/{id}/content', () => {
  it('streams the JSONL with its content type', async () => {
    mockAuth.mockResolvedValue(call)
    mockReadContent.mockResolvedValue({ body: '{"a":1}\n', contentType: 'application/jsonl' })
    const response = await getContent(
      new NextRequest('http://localhost/api/nexora/v1/files/file-1/content', {
        headers: { authorization: 'Bearer sk-nexora-x' },
      }),
      createRouteContext({ fileId: 'file-1' })
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/jsonl')
    expect(await response.text()).toBe('{"a":1}\n')
  })

  it('answers 404 in OpenAI’s shape for a file the key cannot see', async () => {
    mockAuth.mockResolvedValue(call)
    mockReadContent.mockRejectedValue(gatewayErrors.fileNotFound('file-2'))
    const response = await getContent(
      new NextRequest('http://localhost/api/nexora/v1/files/file-2/content'),
      createRouteContext({ fileId: 'file-2' })
    )
    expect(response.status).toBe(404)
    expect((await response.json()).error.code).toBe('file_not_found')
  })
})
