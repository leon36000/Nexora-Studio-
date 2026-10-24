/**
 * @vitest-environment node
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const { relayTranscription } = vi.hoisted(() => ({
  relayTranscription: vi.fn(async () => Response.json({ text: 'Bonjour' })),
}))

vi.mock('@/lib/nexora/developer-api/gateway', () => ({
  authenticateGatewayCall: async () => ({ key: { id: 'key-1' }, headers: {} }),
}))
vi.mock('@/lib/nexora/developer-api/models', () => ({ relayTranscription }))

import { POST } from '@/app/api/nexora/v1/audio/transcriptions/route'

const URL = 'http://localhost/api/nexora/v1/audio/transcriptions'
const MB = 1024 * 1024
const context = createRouteContext({})

function upload(headers: Record<string, string>, body: ReadableStream<Uint8Array> | ArrayBuffer) {
  return new NextRequest(URL, { method: 'POST', headers, body, duplex: 'half' })
}

/** A multipart body streamed without a length, as a chunked upload arrives. */
function streamedUpload(bytes: number): ReadableStream<Uint8Array> {
  let sent = 0
  return new ReadableStream({
    pull(controller) {
      if (sent >= bytes) return controller.close()
      const size = Math.min(MB, bytes - sent)
      sent += size
      controller.enqueue(new Uint8Array(size))
    },
  })
}

describe('POST /v1/audio/transcriptions', () => {
  it('refuses a declared upload above 25 MB with an OpenAI-shaped 413 naming the limit', async () => {
    const response = await POST(
      createMockRequest({
        method: 'POST',
        url: URL,
        headers: {
          'content-type': 'multipart/form-data; boundary=x',
          'content-length': String(40 * MB),
        },
        rawBody: '--x--',
      }),
      context
    )

    expect(response.status).toBe(413)
    const body = await response.json()
    expect(body.error).toMatchObject({ code: 'file_too_large', type: 'invalid_request_error' })
    expect(body.error.message).toContain('25 Mo')
    expect(relayTranscription).not.toHaveBeenCalled()
  })

  it('refuses a streamed upload once it passes the limit', async () => {
    const response = await POST(
      upload({ 'content-type': 'multipart/form-data; boundary=x' }, streamedUpload(27 * MB)),
      context
    )

    expect(response.status).toBe(413)
    expect(relayTranscription).not.toHaveBeenCalled()
  })

  it('relays a file within the limit', async () => {
    const form = new FormData()
    form.set('model', 'whisper')
    form.set('file', new File([new Uint8Array(1024)], 'note.wav', { type: 'audio/wav' }))
    const multipart = new Request(URL, { method: 'POST', body: form })

    const response = await POST(
      upload(
        { 'content-type': multipart.headers.get('content-type') ?? '' },
        await multipart.arrayBuffer()
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(relayTranscription).toHaveBeenCalledTimes(1)
  })
})
