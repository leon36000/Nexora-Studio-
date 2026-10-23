import { jsonResponse } from '@sim/testing/helpers/http'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import {
  NexoraDocumentAiError,
  nexoraTranscribe,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'
import { ocrDocument } from '@/lib/nexora/document-ai/ocr'
import { planAudioChunks, transcribeAudio } from '@/lib/nexora/document-ai/transcription'
import { describeImage } from '@/lib/nexora/document-ai/vision'

const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }

const served = {
  data: [
    { id: 'qwen2.5:7b', type: 'text-generation', aliases: ['nexora-default'] },
    { id: 'qwen2.5vl:3b', type: 'image-to-text', aliases: [] },
    { id: 'mistral-ocr-latest', type: 'image-to-text', aliases: [] },
    { id: 'whisper-small', type: 'automatic-speech-recognition', aliases: [] },
  ],
}

interface OcrBody {
  model: string
  document: { type: string; image_url: string; document_url: string }
  document_annotation_prompt?: string
}

interface Call {
  url: string
  auth: string | null
  body: OcrBody
  form?: FormData
}

/** Nexora API as blocks see it: `/models`, `/ocr` (a vision model or Mistral OCR), `/audio/transcriptions`. */
function fakeNexoraApi(options: { visionReadsPdf?: boolean; models?: object } = {}) {
  const calls: Call[] = []
  const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const auth = new Headers(init?.headers).get('Authorization')
    const form = init?.body instanceof FormData ? init.body : undefined
    const body: OcrBody = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ url, auth, body, form })
    if (url.endsWith('/models')) return jsonResponse(options.models ?? served)
    if (url.endsWith('/ocr')) {
      const document = body.document
      const isPdf =
        document.type === 'document_url' && !document.document_url.startsWith('data:image/')
      if (isPdf && !options.visionReadsPdf) {
        return jsonResponse(
          {
            detail: [{ msg: 'this vision model reads images only: send one image per page' }],
          },
          422
        )
      }
      if (isPdf) {
        return jsonResponse({
          model: body.model,
          pages: [
            { index: 0, images: [], markdown: 'page A' },
            { index: 1, images: [], markdown: 'page B' },
          ],
          usage_info: { pages_processed: 2, doc_size_bytes: 10 },
        })
      }
      const annotation = body.document_annotation_prompt
        ? `Réponse : ${body.document_annotation_prompt}`
        : null
      return jsonResponse({
        id: 'ocr-1',
        model: body.model,
        pages: [{ index: 0, images: [], markdown: annotation ?? `texte ${calls.length}` }],
        document_annotation: annotation,
        usage_info: { pages_processed: 1 },
      })
    }
    if (url.endsWith('/audio/transcriptions')) {
      return jsonResponse({ text: ` morceau ${String(form?.get('model'))} ` })
    }
    return jsonResponse({ detail: 'not found' }, 404)
  })
  return { calls, options: { config, fetchFn: fetchFn as unknown as typeof fetch } }
}

async function pdfOfPages(count: number): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < count; i++) {
    doc.addPage([595, 842]).drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 36, font })
  }
  return Buffer.from(await doc.save())
}

async function dataUriSize(dataUri: string) {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1)
  const { width, height } = await sharp(Buffer.from(base64, 'base64')).metadata()
  return { width, height }
}

describe('resolveUsageModel', () => {
  it('picks the first model of the usage, or the one asked for, with or without vllm/', async () => {
    const { options } = fakeNexoraApi()
    expect(await resolveUsageModel('vision', undefined, options)).toBe('qwen2.5vl:3b')
    expect(await resolveUsageModel('vision', 'vllm/mistral-ocr-latest', options)).toBe(
      'mistral-ocr-latest'
    )
    expect(await resolveUsageModel('transcription', ' ', options)).toBe('whisper-small')
  })

  it('refuses a model of another usage and explains when no model serves the usage', async () => {
    const { options } = fakeNexoraApi({ models: { data: [served.data[0]] } })
    await expect(resolveUsageModel('vision', 'qwen2.5:7b', options)).rejects.toMatchObject({
      code: 'unknown-model',
    })
    await expect(resolveUsageModel('transcription', undefined, options)).rejects.toMatchObject({
      code: 'no-model',
    })
  })

  it('reports a deployment without Nexora API', async () => {
    const { options } = fakeNexoraApi()
    await expect(
      resolveUsageModel('vision', undefined, { ...options, config: { baseUrl: '', apiKey: '' } })
    ).rejects.toBeInstanceOf(NexoraDocumentAiError)
  })
})

describe('describeImage', () => {
  it('asks the vision model the block prompt and returns its answer', async () => {
    const { calls, options } = fakeNexoraApi()
    const image = await sharp({
      create: { width: 40, height: 20, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer()
    const result = await describeImage({ image, prompt: 'Que montre l’image ?' }, options)
    const ocr = calls.find((call) => call.url.endsWith('/ocr'))
    expect(ocr).toMatchObject({
      url: 'http://nexora-api:8000/v1/ocr',
      auth: 'Bearer workstudio-key',
      body: {
        model: 'qwen2.5vl:3b',
        document_annotation_prompt: 'Que montre l’image ?',
        document: { type: 'image_url' },
      },
    })
    expect(ocr?.body.document.image_url).toMatch(/^data:image\/png;base64,/)
    expect(result).toEqual({ content: 'Réponse : Que montre l’image ?', model: 'qwen2.5vl:3b' })
  })

  it('shrinks an image larger than the model limit before sending it', async () => {
    const { calls, options } = fakeNexoraApi()
    const image = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: '#ccc' },
    })
      .jpeg()
      .toBuffer()
    await describeImage({ image, prompt: 'Décris' }, options)
    const sent = calls.find((call) => call.url.endsWith('/ocr'))?.body.document.image_url
    const { width, height } = await dataUriSize(sent ?? '')
    expect(Math.max(width ?? 0, height ?? 0)).toBeLessThanOrEqual(1568)
  })
})

describe('ocrDocument', () => {
  it('sends a PDF whole to an OCR model that reads documents, with the chosen pages', async () => {
    const { calls, options } = fakeNexoraApi({ visionReadsPdf: true })
    const result = await ocrDocument(
      { file: await pdfOfPages(2), mimeType: 'application/pdf', model: 'mistral-ocr-latest' },
      options
    )
    const ocr = calls.filter((call) => call.url.endsWith('/ocr'))
    expect(ocr).toHaveLength(1)
    expect(ocr[0].body.document.type).toBe('document_url')
    expect(ocr[0].body.document.document_url).toMatch(/^data:application\/pdf;base64,/)
    expect(result.pages.map((page) => page.markdown)).toEqual(['page A', 'page B'])
    expect(result.model).toBe('mistral-ocr-latest')
    expect(result.usage_info.pages_processed).toBe(2)
  })

  it('reads a PDF page by page, as images, with a vision model that reads images only', async () => {
    const { calls, options } = fakeNexoraApi()
    const result = await ocrDocument(
      { file: await pdfOfPages(3), mimeType: 'application/pdf', pages: [0, 2] },
      options
    )
    const images = calls.filter(
      (call) => call.url.endsWith('/ocr') && call.body.document.type === 'image_url'
    )
    expect(images).toHaveLength(2)
    for (const call of images) {
      const { width, height } = await dataUriSize(call.body.document.image_url)
      expect(Math.max(width ?? 0, height ?? 0)).toBeLessThanOrEqual(1568)
    }
    expect(result.pages.map((page) => page.index)).toEqual([0, 2])
    expect(result.usage_info.pages_processed).toBe(2)
  })

  it('refuses a scanned PDF too long for one block run before reading it', async () => {
    const { calls, options } = fakeNexoraApi()
    await expect(
      ocrDocument({ file: await pdfOfPages(3), mimeType: 'application/pdf', maxPages: 2 }, options)
    ).rejects.toMatchObject({ code: 'too-many-pages' })
    expect(calls.filter((call) => call.body?.document?.type === 'image_url')).toHaveLength(0)
  })
})

describe('nexoraTranscribe', () => {
  it('posts the audio as a form with the model and the language', async () => {
    const { calls, options } = fakeNexoraApi()
    const text = await nexoraTranscribe(
      {
        audio: Buffer.from('ID3-audio'),
        fileName: 'reunion.mp3',
        mimeType: 'audio/mpeg',
        model: 'whisper-small',
        language: 'fr',
      },
      options
    )
    const call = calls.find((c) => c.url.endsWith('/audio/transcriptions'))
    const form = call?.form as FormData
    expect(call?.url).toBe('http://nexora-api:8000/v1/audio/transcriptions')
    expect(call?.auth).toBe('Bearer workstudio-key')
    expect([form.get('model'), form.get('language'), form.get('response_format')]).toEqual([
      'whisper-small',
      'fr',
      'json',
    ])
    const file = form.get('file') as File
    expect([file.name, file.type]).toEqual(['reunion.mp3', 'audio/mpeg'])
    expect(text).toBe('morceau whisper-small')
  })

  it('lets the model detect the language when asked to', async () => {
    const { calls, options } = fakeNexoraApi()
    await nexoraTranscribe(
      {
        audio: Buffer.from('a'),
        fileName: 'a.wav',
        mimeType: 'audio/wav',
        model: 'w',
        language: 'auto',
      },
      options
    )
    expect(calls[0].form?.has('language')).toBe(false)
  })
})

describe('long audio', () => {
  it('cuts a recording into ten-minute pieces', () => {
    expect(planAudioChunks(1500, 600)).toEqual([
      { start: 0, duration: 600 },
      { start: 600, duration: 600 },
      { start: 1200, duration: 300 },
    ])
    expect(planAudioChunks(90, 600)).toEqual([{ start: 0, duration: 90 }])
  })

  it('transcribes an hour-long recording piece by piece, in order', async () => {
    const pieces: number[] = []
    const transcribe = vi.fn(async ({ audio }: { audio: Buffer }) => `partie ${audio.toString()}`)
    const result = await transcribeAudio(
      { audio: Buffer.from('whole'), mimeType: 'audio/mpeg', fileName: 'r.mp3' },
      {
        measure: async () => 3600,
        cut: async (_audio, chunk) => {
          pieces.push(chunk.start)
          return Buffer.from(String(chunk.start / 600 + 1))
        },
        transcribe,
      }
    )
    expect(pieces).toEqual([0, 600, 1200, 1800, 2400, 3000])
    expect(result).toEqual({
      transcript: 'partie 1 partie 2 partie 3 partie 4 partie 5 partie 6',
      duration: 3600,
    })
  })

  it('resumes a long recording from the pieces an interrupted run kept, in order', async () => {
    const kept = new Map([
      [0, 'partie 1'],
      [1, 'partie 2'],
    ])
    const cut = vi.fn(async (_audio: unknown, chunk: { start: number }) =>
      Buffer.from(String(chunk.start / 600 + 1))
    )
    const transcribe = vi.fn(async ({ audio }: { audio: Buffer }) => `partie ${audio.toString()}`)
    const remember = vi.fn(async (position: number, text: string) => {
      kept.set(position, text)
    })
    const result = await transcribeAudio(
      { audio: Buffer.from('whole'), mimeType: 'audio/mpeg', fileName: 'r.mp3' },
      {
        measure: async () => 1800,
        cut,
        transcribe,
        recall: async (position) => kept.get(position) ?? null,
        remember,
      }
    )
    expect(transcribe).toHaveBeenCalledTimes(1)
    expect(cut.mock.calls.map(([, chunk]) => chunk.start)).toEqual([1200])
    expect(remember).toHaveBeenCalledWith(2, 'partie 3')
    expect(result.transcript).toBe('partie 1 partie 2 partie 3')
  })

  it('stops before a new piece when the run is out of time, keeping the pieces already done', async () => {
    const kept = new Map<number, string>()
    let budget = 1
    const outOfTime = new Error('out of time')
    const run = () =>
      transcribeAudio(
        { audio: Buffer.from('whole'), mimeType: 'audio/mpeg', fileName: 'r.mp3' },
        {
          measure: async () => 1800,
          cut: async (_audio, chunk) => Buffer.from(String(chunk.start / 600 + 1)),
          transcribe: async ({ audio }) => `partie ${audio.toString()}`,
          recall: async (position) => kept.get(position) ?? null,
          remember: async (position, text) => {
            kept.set(position, text)
          },
          beforePiece: () => {
            if (budget-- <= 0) throw outOfTime
          },
        }
      )
    await expect(run()).rejects.toBe(outOfTime)
    expect([...kept.keys()]).toEqual([0])
    budget = Number.POSITIVE_INFINITY
    await expect(run()).resolves.toMatchObject({ transcript: 'partie 1 partie 2 partie 3' })
  })

  it('sends a short recording as is', async () => {
    const cut = vi.fn()
    const transcribe = vi.fn(async () => 'bonjour')
    const result = await transcribeAudio(
      { audio: Buffer.from('x'), mimeType: 'audio/wav', fileName: 'x.wav' },
      { measure: async () => 30, cut, transcribe }
    )
    expect(cut).not.toHaveBeenCalled()
    expect(result.transcript).toBe('bonjour')
  })

  it('refuses clearly, before transcribing anything, a recording too long or that cannot be measured', async () => {
    const transcribe = vi.fn()
    await expect(
      transcribeAudio(
        { audio: Buffer.from('x'), mimeType: 'audio/mpeg', fileName: 'x.mp3' },
        { measure: async () => 5 * 3600, cut: vi.fn(), transcribe }
      )
    ).rejects.toMatchObject({ code: 'too-long' })
    await expect(
      transcribeAudio(
        { audio: Buffer.alloc(30 * 1024 * 1024), mimeType: 'audio/mpeg', fileName: 'x.mp3' },
        { measure: async () => null, cut: vi.fn(), transcribe }
      )
    ).rejects.toMatchObject({ code: 'too-long' })
    expect(transcribe).not.toHaveBeenCalled()
  })
})
