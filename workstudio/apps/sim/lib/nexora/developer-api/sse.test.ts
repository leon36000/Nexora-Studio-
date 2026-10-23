/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { type RelayedUsage, relayWithUsage } from '@/lib/nexora/developer-api/sse'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function streamOf(parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part))
      controller.close()
    },
  })
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text
    text += decoder.decode(value, { stream: true })
  }
}

const chunk = (content: string) =>
  `data: ${JSON.stringify({ model: 'cloud-glm-5-3', choices: [{ delta: { content } }] })}\n\n`
const usageChunk = `data: ${JSON.stringify({ model: 'cloud-glm-5-3', choices: [], usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 } })}\n\n`

describe('relayWithUsage', () => {
  it('relays the bytes unchanged and reports the final usage chunk', async () => {
    const onDone = vi.fn<(usage: RelayedUsage) => void>()
    const source = [chunk('Bon'), chunk('jour'), usageChunk, 'data: [DONE]\n\n']
    const text = await drain(relayWithUsage(streamOf(source), onDone))
    expect(text).toBe(source.join(''))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith({
      promptTokens: 12,
      completionTokens: 7,
      model: 'cloud-glm-5-3',
      estimated: false,
    })
  })

  it('reads lines split across network chunks', async () => {
    const onDone = vi.fn<(usage: RelayedUsage) => void>()
    const whole = `${chunk('Salut')}${usageChunk}data: [DONE]\n\n`
    const parts = [whole.slice(0, 17), whole.slice(17, 80), whole.slice(80, 81), whole.slice(81)]
    await drain(relayWithUsage(streamOf(parts), onDone))
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ promptTokens: 12, completionTokens: 7, estimated: false })
    )
  })

  it('estimates the completion when the stream ends without a usage chunk', async () => {
    const onDone = vi.fn<(usage: RelayedUsage) => void>()
    await drain(relayWithUsage(streamOf([chunk('12345678'), 'data: [DONE]\n\n']), onDone))
    expect(onDone).toHaveBeenCalledWith({
      promptTokens: 0,
      completionTokens: 2,
      model: 'cloud-glm-5-3',
      estimated: true,
    })
  })

  it('still reports once when the client cancels mid-stream', async () => {
    const onDone = vi.fn<(usage: RelayedUsage) => void>()
    let upstreamCancelled = false
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(chunk('abcd')))
      },
      cancel() {
        upstreamCancelled = true
      },
    })
    const reader = relayWithUsage(upstream, onDone).getReader()
    await reader.read()
    await reader.cancel('client gone')
    expect(upstreamCancelled).toBe(true)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ completionTokens: 1, estimated: true })
    )
  })

  it('ignores comments, error events and malformed lines', async () => {
    const onDone = vi.fn<(usage: RelayedUsage) => void>()
    await drain(
      relayWithUsage(
        streamOf([
          ': keepalive\n\n',
          'data: {not json\n\n',
          'event: error\ndata: {"error":"x"}\n\n',
        ]),
        onDone
      )
    )
    expect(onDone).toHaveBeenCalledWith({
      promptTokens: 0,
      completionTokens: 0,
      model: null,
      estimated: true,
    })
  })
})
