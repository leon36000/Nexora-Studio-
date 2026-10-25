/**
 * Nexora edition: a knowledge document with no readable text goes through the instance's own
 * models — a scanned PDF or an image through the first Vision / OCR model, a recording through
 * the first Transcription model — and a long scan is read in batches that survive a restart.
 */

import { jsonResponse } from '@sim/testing/helpers/http'
import { dbChainMockFns } from '@sim/testing/mocks/database.mock'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { fileParsersMock, fileParsersMockFns } from '@sim/testing/mocks/file-parsers.mock'
import {
  fileUtilsServerMock,
  fileUtilsServerMockFns,
} from '@sim/testing/mocks/file-utils-server.mock'
import { storageServiceMock, storageServiceMockFns } from '@sim/testing/mocks/storage-service.mock'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAudioMetadata, mockRunExecutable } = vi.hoisted(() => ({
  mockGetAudioMetadata: vi.fn(async (): Promise<{ duration: number }> => {
    throw new Error('not measurable')
  }),
  mockRunExecutable: vi.fn(async (_binary: string, args: string[]) => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(args[args.length - 1], Buffer.from('ID3 piece'))
    return { stdout: '', stderr: '' }
  }),
}))

vi.mock('@/lib/audio/extractor', () => ({ getAudioMetadata: mockGetAudioMetadata }))
vi.mock('@/lib/media/ffmpeg-process', () => ({
  FFMPEG_BASE_ARGS: ['-y', '-nostdin'],
  resolveExecutable: () => '/usr/bin/ffmpeg',
  runExecutable: mockRunExecutable,
}))
vi.mock('@/lib/uploads/core/storage-service', () => storageServiceMock)
vi.mock('@/lib/file-parsers', () => fileParsersMock)
// Nexora API calls go through a long-wait fetch; the test answers them with its stubbed global fetch.
vi.mock('@/lib/nexora/long-fetch.server', () => ({
  nexoraLongFetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
}))
vi.mock('@/lib/uploads/utils/file.server', () => fileUtilsServerMock)

import { ProviderCapacityDeferredError } from '@/lib/core/rate-limiter/provider-capacity-error'
import {
  NEXORA_OCR_BATCH_BUDGET_MS,
  runWithinSlice,
} from '@/lib/knowledge/documents/nexora-extraction'
import { PermanentDocumentProcessingError } from '@/lib/knowledge/documents/processing-error'
import {
  createProcessingProgressStore,
  type ProcessingProgressRecord,
  type ProcessingProgressStore,
} from '@/lib/knowledge/documents/processing-progress'
import { processDocument } from '@/lib/knowledge/documents/processor'
import { runWithKnowledgeModelInputProvenance } from '@/lib/knowledge/model-input-provenance'
import {
  NO_OCR_MODEL_MESSAGE,
  NO_TRANSCRIPTION_MODEL_MESSAGE,
  PIECE_TOO_LONG_MESSAGE,
} from '@/lib/nexora/knowledge-errors'

const NEXORA_API = 'http://nexora-api:8000/v1'
const pass = { knowledgeBaseId: 'kb-1', documentId: 'doc-1', indexingPassId: 'pass-1' }
const typeset = 'The Supplier shall provide the Services described herein. '.repeat(60)

interface ApiOptions {
  vision?: boolean
  transcription?: boolean
  modelsStatus?: number
  /** Simulated time one page takes to read. */
  pageMs?: number
  /** Status Nexora API answers every OCR or transcription request with. */
  readStatus?: number
}

/** Nexora API as the knowledge base sees it, with a vision model that reads images only. */
function fakeNexoraApi(options: ApiOptions = {}) {
  const requests: { path: string; type?: string }[] = []
  const transcribedPieces: unknown[] = []
  let page = 0
  const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input).replace(NEXORA_API, '')
    if (path === '/models') {
      requests.push({ path })
      if (options.modelsStatus) return jsonResponse({}, options.modelsStatus)
      return jsonResponse({
        data: [
          { id: 'qwen2.5:7b', type: 'text-generation', aliases: ['nexora-default'] },
          ...(options.vision === false ? [] : [{ id: 'qwen2.5vl:3b', type: 'image-to-text' }]),
          ...(options.transcription === false
            ? []
            : [{ id: 'whisper-small', type: 'automatic-speech-recognition' }]),
        ],
      })
    }
    if (path === '/ocr') {
      const body = JSON.parse(String(init?.body))
      requests.push({ path, type: body.document.type })
      if (options.readStatus) return jsonResponse({ detail: 'refused' }, options.readStatus)
      if (body.document.type === 'document_url') {
        return jsonResponse({ detail: 'this vision model reads images only' }, 422)
      }
      if (options.pageMs) vi.setSystemTime(Date.now() + options.pageMs)
      page += 1
      return jsonResponse({ pages: [{ index: 0, markdown: `Texte lu page ${page}` }] })
    }
    if (path === '/audio/transcriptions') {
      requests.push({ path })
      transcribedPieces.push(init?.body instanceof FormData ? init.body.get('file') : null)
      if (options.readStatus) return jsonResponse({ detail: 'refused' }, options.readStatus)
      return jsonResponse({ text: 'Bonjour, ceci est le compte rendu de la réunion.' })
    }
    return jsonResponse({}, 404)
  })
  vi.stubGlobal('fetch', fetchFn)
  return {
    requests,
    transcribedPieces,
    ocrRequests: () => requests.filter((request) => request.path === '/ocr'),
  }
}

function whiteImage(): Promise<Buffer> {
  return sharp({ create: { width: 40, height: 30, channels: 3, background: 'white' } })
    .png()
    .toBuffer()
}

async function scannedPdf(pages: number): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < pages; i++) pdf.addPage([200, 260])
  return Buffer.from(await pdf.save())
}

/** A document's progress record, kept in memory the way the document row keeps it. */
function memoryProgress(passId = pass.indexingPassId) {
  const saved: { record: ProcessingProgressRecord | null } = { record: null }
  const open = (): ProcessingProgressStore =>
    createProcessingProgressStore(
      passId,
      async () => saved.record,
      async (record) => {
        saved.record = structuredClone(record)
      }
    )
  return { saved, open }
}

function processUpload(
  filename: string,
  mimeType: string,
  access: {
    ocrCheckpoint?: typeof pass
    processingDeadlineAt?: number
    progress?: ProcessingProgressStore
  } = {}
) {
  return runWithKnowledgeModelInputProvenance(
    undefined,
    () =>
      processDocument(`https://files.local/${filename}`, filename, mimeType, 1024, 0, 1, {
        userId: 'user-1',
        ...access,
      }),
    { opaqueInputSafe: true }
  )
}

const indexedText = (result: Awaited<ReturnType<typeof processUpload>>) =>
  result.chunks.map((chunk) => chunk.text).join('\n')

describe('Nexora reading of knowledge documents', () => {
  let objects: Map<string, Buffer>
  let cleanupRows: Map<string, { id: string; status: string }>

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-23T08:00:00Z'))
    resetEnvMock()
    setEnv({
      VLLM_BASE_URL: NEXORA_API,
      VLLM_API_KEY: 'workstudio-key',
      OCR_PROVIDER: undefined,
      MISTRAL_API_KEY: undefined,
    })
    objects = new Map()
    cleanupRows = new Map()
    dbChainMockFns.insert.mockImplementation(() => ({
      values: (row: { id: string }) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (cleanupRows.has(row.id)) return []
            const stored = { ...row, status: 'pending' }
            cleanupRows.set(row.id, stored)
            return [stored]
          },
        }),
      }),
    }))
    dbChainMockFns.select.mockImplementation(() => ({
      from: () => ({ where: () => ({ limit: async () => [...cleanupRows.values()] }) }),
    }))
    storageServiceMockFns.mockHeadObject.mockImplementation(async (key: string) => {
      const value = objects.get(key)
      return value ? { size: value.length } : null
    })
    storageServiceMockFns.mockDownloadFile.mockImplementation(async ({ key }: { key: string }) =>
      objects.get(key)
    )
    storageServiceMockFns.mockUploadFile.mockImplementation(
      async ({ customKey, file }: { customKey: string; file: Buffer }) => {
        objects.set(customKey, Buffer.from(file))
      }
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    resetEnvMock()
  })

  it('reads a scanned PDF page by page with the first Vision / OCR model, in page order', async () => {
    const api = fakeNexoraApi()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(3))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 3 },
    })

    const result = await processUpload('scan.pdf', 'application/pdf')

    const text = indexedText(result)
    expect(text.indexOf('Texte lu page 1')).toBeLessThan(text.indexOf('Texte lu page 2'))
    expect(text.indexOf('Texte lu page 2')).toBeLessThan(text.indexOf('Texte lu page 3'))
    expect(result.metadata.processingMethod).toBe('nexora-ocr')
    expect(api.ocrRequests().filter((request) => request.type === 'document_url')).toHaveLength(1)
  })

  it('reads a PDF whose text layer is only a stamp or header, and trusts a typeset one', async () => {
    const api = fakeNexoraApi()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(3))
    fileParsersMockFns.mockParseBuffer.mockResolvedValueOnce({
      content: 'ACME SA — copie numérisée',
      metadata: { pageCount: 3 },
    })
    const scanned = await processUpload('stamped.pdf', 'application/pdf')
    expect(indexedText(scanned)).toContain('Texte lu page 3')

    api.requests.length = 0
    fileParsersMockFns.mockParseBuffer.mockResolvedValueOnce({
      content: typeset,
      metadata: { pageCount: 1 },
    })
    const typesetResult = await processUpload('contract.pdf', 'application/pdf')
    expect(indexedText(typesetResult)).toContain('The Supplier shall provide')
    expect(api.requests).toHaveLength(0)
  })

  it('reads an image with the Vision / OCR model', async () => {
    const api = fakeNexoraApi()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(
      await sharp({ create: { width: 40, height: 30, channels: 3, background: 'white' } })
        .png()
        .toBuffer()
    )

    const result = await processUpload('receipt.png', 'image/png')

    expect(indexedText(result)).toContain('Texte lu page 1')
    expect(api.ocrRequests()).toEqual([{ path: '/ocr', type: 'image_url' }])
  })

  it('fails a scan or an image with the setup reason when no Vision / OCR model exists', async () => {
    const api = fakeNexoraApi({ vision: false })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(2))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 2 },
    })
    await expect(processUpload('scan.pdf', 'application/pdf')).rejects.toMatchObject({
      name: 'PermanentDocumentProcessingError',
      message: NO_OCR_MODEL_MESSAGE,
    })

    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(
      await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } })
        .jpeg()
        .toBuffer()
    )
    await expect(processUpload('photo.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      PermanentDocumentProcessingError
    )
    expect(api.ocrRequests()).toHaveLength(0)
  })

  it('keeps indexing the little text a PDF holds when no Vision / OCR model exists', async () => {
    fakeNexoraApi({ vision: false })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(3))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: 'ACME SA — copie numérisée',
      metadata: { pageCount: 3 },
    })

    const result = await processUpload('stamped.pdf', 'application/pdf')

    expect(indexedText(result)).toBe('ACME SA — copie numérisée')
  })

  it('transcribes a recording with the first Transcription model, then indexes the text', async () => {
    const api = fakeNexoraApi()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(Buffer.from('ID3 audio'))

    const result = await processUpload('reunion.mp3', 'audio/mpeg')

    expect(indexedText(result)).toContain('compte rendu de la réunion')
    expect(result.metadata.processingMethod).toBe('nexora-transcription')
    expect(api.requests.filter((request) => request.path === '/audio/transcriptions')).toHaveLength(
      1
    )
  })

  it('fails a recording with the setup reason when no Transcription model exists', async () => {
    fakeNexoraApi({ transcription: false })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(Buffer.from('ID3 audio'))

    await expect(processUpload('reunion.m4a', 'audio/mp4')).rejects.toMatchObject({
      name: 'PermanentDocumentProcessingError',
      message: NO_TRANSCRIPTION_MODEL_MESSAGE,
    })
  })

  it('waits for Nexora API rather than failing the document when it does not answer', async () => {
    fakeNexoraApi({ modelsStatus: 503 })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(2))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 2 },
    })

    await expect(processUpload('scan.pdf', 'application/pdf')).rejects.toBeInstanceOf(
      ProviderCapacityDeferredError
    )
  })

  it('fails fast with the no-model reason when the model has no provider behind it', async () => {
    fakeNexoraApi({ readStatus: 404 })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await whiteImage())
    await expect(processUpload('receipt.png', 'image/png')).rejects.toMatchObject({
      name: 'PermanentDocumentProcessingError',
      message: NO_OCR_MODEL_MESSAGE,
    })

    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(Buffer.from('ID3 audio'))
    await expect(processUpload('reunion.mp3', 'audio/mpeg')).rejects.toMatchObject({
      name: 'PermanentDocumentProcessingError',
      message: NO_TRANSCRIPTION_MODEL_MESSAGE,
    })
  })

  it('waits out a rejected key or a rate limit instead of failing the file as unreadable', async () => {
    for (const status of [401, 429]) {
      fakeNexoraApi({ readStatus: status })
      fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await whiteImage())
      await expect(processUpload('receipt.png', 'image/png')).rejects.toBeInstanceOf(
        ProviderCapacityDeferredError
      )
    }
  })

  it('transcribes an Ogg recording sent as application/ogg', async () => {
    const api = fakeNexoraApi()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(Buffer.from('OggS audio'))

    const result = await processUpload('message.ogg', 'application/ogg')

    expect(result.metadata.processingMethod).toBe('nexora-transcription')
    expect(api.requests.some((request) => request.path === '/audio/transcriptions')).toBe(true)
  })

  it('reads an image or a scan uploaded without a precise type, by its name or its content', async () => {
    const api = fakeNexoraApi()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await whiteImage())
    const image = await processUpload('receipt.png', 'application/octet-stream')
    expect(image.metadata.processingMethod).toBe('nexora-ocr')

    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(1))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 1 },
    })
    const scan = await processUpload('scan.pdf', 'application/octet-stream')
    expect(scan.metadata.processingMethod).toBe('nexora-ocr')

    api.requests.length = 0
    const unnamed = await processUpload('numérisation', 'application/octet-stream')
    expect(unnamed.metadata.processingMethod).toBe('nexora-ocr')
    expect(api.ocrRequests().length).toBeGreaterThan(0)
  })

  it('remembers across slices that the model reads images only and that the scan has no text layer', async () => {
    const api = fakeNexoraApi({ pageMs: 60_000 })
    const progress = memoryProgress()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(4))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 4 },
    })

    await expect(
      processUpload('archive.pdf', 'application/pdf', {
        ocrCheckpoint: pass,
        progress: progress.open(),
        processingDeadlineAt: Date.now() + NEXORA_OCR_BATCH_BUDGET_MS + 140_000,
      })
    ).rejects.toMatchObject({ reason: 'processing_budget' })
    expect(progress.saved.record).toMatchObject({ imagesOnly: true, noTextLayer: true })
    const parsedFirst = fileParsersMockFns.mockParseBuffer.mock.calls.length

    api.requests.length = 0
    await processUpload('archive.pdf', 'application/pdf', {
      ocrCheckpoint: pass,
      progress: progress.open(),
      processingDeadlineAt: Date.now() + 24 * 60 * 60 * 1000,
    })
    expect(api.ocrRequests().filter((request) => request.type === 'document_url')).toHaveLength(0)
    expect(fileParsersMockFns.mockParseBuffer.mock.calls.length).toBe(parsedFirst)
  })

  it('reads a scan one page per request and records the pages read out of the total', async () => {
    const api = fakeNexoraApi({ pageMs: 60_000 })
    const progress = memoryProgress()
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(5))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 5 },
    })

    await expect(
      processUpload('archive.pdf', 'application/pdf', {
        ocrCheckpoint: pass,
        progress: progress.open(),
        processingDeadlineAt: Date.now() + NEXORA_OCR_BATCH_BUDGET_MS + 140_000,
      })
    ).rejects.toMatchObject({ reason: 'processing_budget' })

    const pagesRead = api.ocrRequests().filter((request) => request.type === 'image_url').length
    expect(pagesRead).toBeGreaterThan(0)
    expect(objects.size).toBe(pagesRead)
    expect(progress.saved.record).toMatchObject({ unit: 'pages', done: pagesRead, total: 5 })
  })

  it('fails a page that outran two slices with the reason, without reading it again', async () => {
    const api = fakeNexoraApi()
    const progress = memoryProgress()
    await progress.open().update({ imagesOnly: true, overrun: { position: 0, count: 2 } })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(2))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 2 },
    })

    await expect(
      processUpload('dense.pdf', 'application/pdf', {
        ocrCheckpoint: pass,
        progress: progress.open(),
        processingDeadlineAt: Date.now() + 24 * 60 * 60 * 1000,
      })
    ).rejects.toMatchObject({
      name: 'PermanentDocumentProcessingError',
      message: PIECE_TOO_LONG_MESSAGE,
    })
    expect(api.ocrRequests()).toHaveLength(0)
  })

  it('transcribes a long recording in pieces of three minutes at most, counting them', async () => {
    const api = fakeNexoraApi()
    const progress = memoryProgress()
    mockGetAudioMetadata.mockResolvedValueOnce({ duration: 20 * 60 })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(Buffer.from('ID3 audio'))

    await processUpload('reunion.mp3', 'audio/mpeg', {
      ocrCheckpoint: pass,
      progress: progress.open(),
      processingDeadlineAt: Date.now() + 24 * 60 * 60 * 1000,
    })

    const durations = mockRunExecutable.mock.calls.map(([, args]) =>
      Number(args[args.indexOf('-t') + 1])
    )
    expect(Math.max(...durations)).toBeLessThanOrEqual(180)
    expect(api.transcribedPieces).toHaveLength(durations.length)
    expect(progress.saved.record).toMatchObject({
      unit: 'pieces',
      done: durations.length,
      total: durations.length,
    })
  })

  it('reads a long scan page by page, yields when the run is out of time and resumes after the saved pages', async () => {
    const api = fakeNexoraApi({ pageMs: 60_000 })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(await scannedPdf(6))
    fileParsersMockFns.mockParseBuffer.mockResolvedValue({
      content: '',
      metadata: { pageCount: 6 },
    })

    const firstRun = processUpload('archive.pdf', 'application/pdf', {
      ocrCheckpoint: pass,
      processingDeadlineAt: Date.now() + NEXORA_OCR_BATCH_BUDGET_MS + 100_000,
    })
    await expect(firstRun).rejects.toMatchObject({
      name: 'ProviderCapacityDeferredError',
      reason: 'processing_budget',
    })
    const pagesReadFirst = api.ocrRequests().filter((request) => request.type === 'image_url')
    expect(pagesReadFirst).toHaveLength(1)
    expect(objects.size).toBe(1)

    api.requests.length = 0
    const resumed = await processUpload('archive.pdf', 'application/pdf', {
      ocrCheckpoint: pass,
      processingDeadlineAt: Date.now() + 24 * 60 * 60 * 1000,
    })
    const pagesReadAfter = api.ocrRequests().filter((request) => request.type === 'image_url')
    expect(pagesReadAfter).toHaveLength(5)
    const text = indexedText(resumed)
    for (let pageNumber = 1; pageNumber <= 6; pageNumber++) {
      expect(text).toContain(`Texte lu page ${pageNumber}`)
    }
    expect(text.indexOf('Texte lu page 1')).toBeLessThan(text.indexOf('Texte lu page 6'))
  })
})

describe('a page or a piece longer than its processing slice', () => {
  const hangs = (signal?: AbortSignal) =>
    new Promise<string>((_, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-23T08:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops it before the slice ends, so the next slice reads it again from its start', async () => {
    const progress = memoryProgress()
    const run = runWithinSlice(
      { deadlineAt: Date.now() + 300_000, progress: progress.open() },
      7,
      hangs
    )
    const outcome = expect(run).rejects.toMatchObject({ reason: 'processing_budget' })
    await vi.advanceTimersByTimeAsync(300_000)
    await outcome
    expect(progress.saved.record?.overrun).toEqual({ position: 7, count: 1 })
  })

  it('fails with the reason when the same page outruns a second slice', async () => {
    const progress = memoryProgress()
    await progress.open().update({ overrun: { position: 7, count: 1 } })
    const run = runWithinSlice(
      { deadlineAt: Date.now() + 500_000, progress: progress.open() },
      7,
      hangs
    )
    const outcome = expect(run).rejects.toMatchObject({
      name: 'PermanentDocumentProcessingError',
      message: PIECE_TOO_LONG_MESSAGE,
    })
    await vi.advanceTimersByTimeAsync(500_000)
    await outcome
  })

  it('forgets an overrun once the page is read, and counts another page afresh', async () => {
    const progress = memoryProgress()
    await progress.open().update({ overrun: { position: 7, count: 1 } })
    await expect(
      runWithinSlice(
        { deadlineAt: Date.now() + 500_000, progress: progress.open() },
        7,
        async () => 'lu'
      )
    ).resolves.toBe('lu')
    expect(progress.saved.record?.overrun).toBeUndefined()

    const other = runWithinSlice(
      { deadlineAt: Date.now() + 300_000, progress: progress.open() },
      8,
      hangs
    )
    const outcome = expect(other).rejects.toMatchObject({ reason: 'processing_budget' })
    await vi.advanceTimersByTimeAsync(300_000)
    await outcome
    expect(progress.saved.record?.overrun).toEqual({ position: 8, count: 1 })
  })
})
