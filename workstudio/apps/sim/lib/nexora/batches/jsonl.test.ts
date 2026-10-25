import { describe, expect, it } from 'vitest'
import {
  errorLine,
  outputLine,
  parseBatchInput,
  parseCompletionWindow,
} from '@/lib/nexora/batches/jsonl'

const chat = '/v1/chat/completions' as const

function line(customId: string, body: Record<string, unknown> = {}, extra = {}) {
  return JSON.stringify({
    custom_id: customId,
    method: 'POST',
    url: chat,
    body: { model: 'qwen2.5:7b', messages: [{ role: 'user', content: 'Bonjour' }], ...body },
    ...extra,
  })
}

function errorsOf(text: string, options = {}) {
  const parsed = parseBatchInput(text, chat, options)
  if (parsed.ok) throw new Error('expected a refusal')
  return parsed.errors
}

describe('parseBatchInput', () => {
  it('reads one request per line, in order, with the model they share', () => {
    const parsed = parseBatchInput(`${line('a')}\n\n${line('b')}\n`, chat)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.model).toBe('qwen2.5:7b')
    expect(parsed.lines.map((entry) => [entry.position, entry.customId])).toEqual([
      [0, 'a'],
      [1, 'b'],
    ])
  })

  it('accepts the shorter Mistral form without method and url', () => {
    const text = JSON.stringify({ custom_id: '0', body: { model: 'm', messages: [] } })
    expect(parseBatchInput(text, chat).ok).toBe(true)
  })

  it('refuses an empty file', () => {
    expect(errorsOf('  \n\n')[0]).toMatchObject({ code: 'empty_file', line: null })
  })

  it('names the line that is not JSON', () => {
    const errors = errorsOf(`${line('a')}\n{pas du json\n${line('c')}`)
    expect(errors).toEqual([expect.objectContaining({ code: 'invalid_json_line', line: 2 })])
    expect(errors[0].message).toContain('Ligne 2')
  })

  it('refuses a custom_id used twice and names both lines', () => {
    const errors = errorsOf(`${line('a')}\n${line('b')}\n${line('a')}`)
    expect(errors[0]).toMatchObject({ code: 'duplicate_custom_id', line: 3 })
    expect(errors[0].message).toContain('ligne 1')
  })

  it('refuses a missing custom_id', () => {
    const text = JSON.stringify({ body: { model: 'm', messages: [] } })
    expect(errorsOf(text)[0]).toMatchObject({ code: 'invalid_request', line: 1 })
  })

  it('refuses a method other than POST or an url of another endpoint', () => {
    expect(errorsOf(line('a', {}, { method: 'GET' }))[0].code).toBe('invalid_url')
    expect(errorsOf(line('a', {}, { url: '/v1/embeddings' }))[0].code).toBe('invalid_url')
  })

  it('refuses requests that name different models', () => {
    const errors = errorsOf(`${line('a')}\n${line('b', { model: 'glm' })}`)
    expect(errors[0]).toMatchObject({ code: 'model_mismatch', line: 2 })
  })

  it('refuses a request without a model', () => {
    const text = JSON.stringify({ custom_id: 'a', body: { messages: [] } })
    expect(errorsOf(text)[0]).toMatchObject({ code: 'model_required', line: 1 })
  })

  it('refuses a streamed request', () => {
    expect(errorsOf(line('a', { stream: true }))[0]).toMatchObject({
      code: 'invalid_request',
      line: 1,
    })
  })

  it('refuses an agent as the model of a batch', () => {
    expect(errorsOf(line('a', { model: 'agent:Facturation' }))[0].code).toBe('invalid_request')
  })

  it('refuses a file with more lines than allowed, once', () => {
    const lines = Array.from({ length: 4 }, (_, index) => line(String(index))).join('\n')
    expect(errorsOf(lines, { maxLines: 3 })).toEqual([
      expect.objectContaining({ code: 'too_many_tasks', line: null }),
    ])
  })

  it('refuses a line that is too long', () => {
    const long = line('a', { messages: [{ role: 'user', content: 'x'.repeat(300) }] })
    expect(errorsOf(long, { maxLineBytes: 200 })[0]).toMatchObject({
      code: 'line_too_long',
      line: 1,
    })
  })

  it('reports at most twenty problems', () => {
    const text = Array.from({ length: 50 }, () => '{').join('\n')
    expect(errorsOf(text)).toHaveLength(20)
  })
})

describe('parseCompletionWindow', () => {
  it('defaults to 24 hours', () => {
    expect(parseCompletionWindow(undefined)).toEqual({ ok: true, hours: 24 })
  })

  it.each([
    ['24h', 24],
    ['1h', 1],
    ['168h', 168],
    ['7d', 168],
    ['2d', 48],
  ])('reads %s', (value, hours) => {
    expect(parseCompletionWindow(value)).toEqual({ ok: true, hours })
  })

  it.each(['0h', '169h', '8d', 'abc', '24', '1.5h', 24, null])('refuses %s', (value) => {
    expect(parseCompletionWindow(value).ok).toBe(false)
  })
})

describe('result lines', () => {
  it('writes a successful request in the OpenAI output form', () => {
    const parsed = JSON.parse(
      outputLine({
        id: 'item1',
        customId: 'a',
        response: { status_code: 200, request_id: 'req_1', body: { id: 'chatcmpl-1' } },
      })
    )
    expect(parsed).toEqual({
      id: 'batch_req_item1',
      custom_id: 'a',
      response: { status_code: 200, request_id: 'req_1', body: { id: 'chatcmpl-1' } },
      error: null,
    })
  })

  it('writes a failed request with its code and message and no response when the model never answered', () => {
    const parsed = JSON.parse(
      errorLine({
        id: 'item2',
        customId: 'b',
        response: null,
        error: { code: 'batch_cancelled', message: 'Lot annulé.' },
      })
    )
    expect(parsed).toEqual({
      id: 'batch_req_item2',
      custom_id: 'b',
      response: null,
      error: { code: 'batch_cancelled', message: 'Lot annulé.' },
    })
  })
})
