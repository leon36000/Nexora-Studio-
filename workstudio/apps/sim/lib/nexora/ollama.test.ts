import { collectStream } from '@sim/testing/helpers/async'
import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import {
  deleteLocalModel,
  listLocalModels,
  OLLAMA_CATALOG,
  OllamaUnavailableError,
  pullLocalModel,
} from '@/lib/nexora/ollama'

const baseUrl = 'http://ollama:11434'

function ndjson(lines: object[]): Response {
  return new Response(lines.map((line) => `${JSON.stringify(line)}\n`).join(''), { status: 200 })
}

async function events(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  const text = (await collectStream(stream))
    .map((chunk) => decoder.decode(chunk, { stream: true }))
    .join('')
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, '')))
}

describe('catalog', () => {
  it('recommends French-capable models with their usage, disk and memory needs', () => {
    expect(OLLAMA_CATALOG.map((m) => [m.name, m.usage])).toEqual([
      ['qwen2.5:3b', 'chat'],
      ['qwen2.5:7b', 'chat'],
      ['qwen2.5:14b', 'chat'],
      ['mistral:7b', 'chat'],
      ['mistral-nemo:12b', 'chat'],
      ['llama3.1:8b', 'chat'],
      ['gemma2:9b', 'chat'],
      ['qwen2.5vl:3b', 'vision'],
      ['qwen2.5vl:7b', 'vision'],
    ])
    for (const model of OLLAMA_CATALOG) {
      expect(model.memoryGb).toBeGreaterThan(model.diskGb)
    }
  })
})

describe('listLocalModels', () => {
  it('lists the models present in the bundled Ollama', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ models: [{ name: 'qwen2.5:7b' }, { name: 'bge-m3:latest' }] })
      )
    expect(await listLocalModels({ baseUrl, fetchFn })).toEqual(['qwen2.5:7b', 'bge-m3:latest'])
  })

  it('reports Ollama as unavailable when it cannot be reached', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(listLocalModels({ baseUrl, fetchFn })).rejects.toBeInstanceOf(
      OllamaUnavailableError
    )
  })
})

describe('pullLocalModel', () => {
  it('refuses a hostile model name before calling Ollama', async () => {
    const fetchFn = vi.fn()
    for (const name of ['../x', 'qwen 7b', 'a;rm', '']) {
      await expect(pullLocalModel(name, { baseUrl, fetchFn })).rejects.toThrow()
    }
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('relays the download progress, caps the threads at half the cores, then ends', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        ndjson([
          { status: 'pulling manifest' },
          { status: 'pulling abc', total: 100, completed: 40 },
          { status: 'success' },
        ])
      )
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))
    const stream = await pullLocalModel('qwen2.5:3b', { baseUrl, fetchFn, cores: 12 })
    expect(await events(stream)).toEqual([
      { status: 'pulling manifest' },
      { status: 'pulling abc', total: 100, completed: 40 },
      { status: 'success' },
      { done: true },
    ])
    const create = JSON.parse(fetchFn.mock.calls[1][1].body)
    expect(fetchFn.mock.calls[1][0]).toBe(`${baseUrl}/api/create`)
    expect(create).toEqual({
      model: 'qwen2.5:3b',
      from: 'qwen2.5:3b',
      parameters: { num_thread: 6 },
      stream: false,
    })
  })

  it('keeps at least one thread on a single-core machine', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(ndjson([{ status: 'success' }]))
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))
    await events(await pullLocalModel('qwen2.5:3b', { baseUrl, fetchFn, cores: 1 }))
    expect(JSON.parse(fetchFn.mock.calls[1][1].body).parameters).toEqual({ num_thread: 1 })
  })

  it('ends with an error event when Ollama reports one, without tuning the model', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        ndjson([{ status: 'pulling manifest' }, { error: 'file does not exist' }])
      )
    expect(await events(await pullLocalModel('nope:1b', { baseUrl, fetchFn, cores: 4 }))).toEqual([
      { status: 'pulling manifest' },
      { error: 'file does not exist', done: true },
    ])
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('reports Ollama as unavailable when the download cannot start', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('down', { status: 502 }))
    await expect(pullLocalModel('qwen2.5:3b', { baseUrl, fetchFn })).rejects.toBeInstanceOf(
      OllamaUnavailableError
    )
  })
})

describe('deleteLocalModel', () => {
  it('never deletes the embedding model the knowledge bases need', async () => {
    const fetchFn = vi.fn()
    await expect(deleteLocalModel('bge-m3', { baseUrl, fetchFn })).rejects.toThrow()
    await expect(deleteLocalModel('bge-m3:latest', { baseUrl, fetchFn })).rejects.toThrow()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('deletes another local model', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    await deleteLocalModel('qwen2.5:3b', { baseUrl, fetchFn })
    expect(fetchFn.mock.calls[0][0]).toBe(`${baseUrl}/api/delete`)
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ model: 'qwen2.5:3b' })
  })
})
