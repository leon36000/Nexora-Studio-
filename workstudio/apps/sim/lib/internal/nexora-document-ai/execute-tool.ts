import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import type { z } from 'zod'
import { DEFAULT_MAX_JSON_BODY_BYTES } from '@/lib/api/server/validation'
import { extractAudioFromVideo, isVideoFile } from '@/lib/audio/extractor'
import { validateOpaqueModelInputProvenance } from '@/lib/execution/model-input-provenance'
import {
  nexoraExtractInputSchema,
  nexoraOcrInputSchema,
  nexoraSttInputSchema,
  nexoraVisionInputSchema,
} from '@/lib/internal/nexora-document-ai/schema'
import type { InternalToolOperationHandler } from '@/lib/internal/tool-operations/types'
import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import { extractDocumentData } from '@/lib/nexora/document-ai/extraction'
import { ocrDocument } from '@/lib/nexora/document-ai/ocr'
import {
  transcribeMeetingWithNexora,
  transcribeWithNexora,
} from '@/lib/nexora/document-ai/transcription'
import { describeImage } from '@/lib/nexora/document-ai/vision'
import {
  isModelSafeWorkspaceFileKey,
  MODEL_UNSAFE_WORKSPACE_FILE_ERROR_MESSAGE,
} from '@/lib/uploads/contexts/workspace/file-secret-provenance'
import { getMimeTypeFromExtension, processSingleFileToUserFile } from '@/lib/uploads/utils/file'
import { downloadFileFromStorage } from '@/lib/uploads/utils/file.server'
import type { RawFileInput } from '@/lib/uploads/utils/file-schemas'
import { MAX_FILE_SIZE } from '@/lib/uploads/utils/validation'
import { assertToolFileAccess } from '@/app/api/files/authorization'

const logger = createLogger('NexoraDocumentAiTool')

/** The « Nexora » provider of the Vision, OCR and Speech-to-Text blocks, and « Extraire des données ». */
const NEXORA_DOCUMENT_AI_TOOL_IDS = [
  'vision_nexora',
  'ocr_nexora',
  'nexora_extract',
  'stt_nexora',
  'stt_nexora_v2',
] as const

class FileRefusedError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'FileRefusedError'
  }
}

interface ResolvedFile {
  buffer: Buffer
  mimeType: string
  name: string
}

/** A workspace file the caller may read and send to a model, as bytes. */
async function readToolFile(
  input: RawFileInput | RawFileInput[],
  userId: string,
  requestId: string,
  signal?: AbortSignal
): Promise<ResolvedFile> {
  const raw = Array.isArray(input) ? input[0] : input
  let file
  try {
    file = processSingleFileToUserFile(raw, requestId, logger)
  } catch (error) {
    throw new FileRefusedError(getErrorMessage(error, 'Failed to process file'), 400)
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = file.type || getMimeTypeFromExtension(extension)
  if (file.base64) {
    const base64 = file.base64.replace(/^data:[^,]*,/, '')
    return { buffer: Buffer.from(base64, 'base64'), mimeType, name: file.name }
  }
  const denied = await assertToolFileAccess(file.key, userId, requestId, logger)
  signal?.throwIfAborted()
  if (denied) throw new FileRefusedError('File not found', denied.status)
  if (!(await isModelSafeWorkspaceFileKey(file.key))) {
    throw new FileRefusedError(MODEL_UNSAFE_WORKSPACE_FILE_ERROR_MESSAGE, 400)
  }
  const buffer = await downloadFileFromStorage(file, requestId, logger, {
    maxBytes: MAX_FILE_SIZE,
    signal,
  })
  signal?.throwIfAborted()
  return { buffer, mimeType, name: file.name }
}

function invalid(error: z.ZodError): Response {
  return Response.json(
    { success: false, error: error.issues[0]?.message || 'Invalid request data' },
    { status: 400 }
  )
}

export const executeNexoraDocumentAiTool: InternalToolOperationHandler = async (request) => {
  request.signal?.throwIfAborted()
  const toolId = request.toolId
  if (!(NEXORA_DOCUMENT_AI_TOOL_IDS as readonly string[]).includes(toolId)) {
    return Response.json({ success: false, error: `Unsupported tool: ${toolId}` }, { status: 500 })
  }
  const userId = request.context.userId
  if (!userId) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const serialized = JSON.stringify(request.input) ?? ''
  if (Buffer.byteLength(serialized, 'utf8') > DEFAULT_MAX_JSON_BODY_BYTES) {
    return Response.json({ success: false, error: 'Request body is too large' }, { status: 413 })
  }
  const provenance = validateOpaqueModelInputProvenance({
    headers: request.headers,
    payload: request.input,
    isInternalRequest: true,
  })
  if (!provenance.success) {
    return Response.json({ success: false, error: provenance.error }, { status: provenance.status })
  }
  const { requestId, signal } = request

  try {
    if (toolId === 'vision_nexora') {
      const parsed = nexoraVisionInputSchema.safeParse(request.input)
      if (!parsed.success) return invalid(parsed.error)
      const image = await readToolFile(parsed.data.imageFile, userId, requestId, signal)
      const output = await describeImage(
        {
          image: image.buffer,
          model: parsed.data.model,
          prompt:
            parsed.data.prompt?.trim() ||
            'Please analyze this image and describe what you see in detail.',
        },
        { signal }
      )
      return Response.json({ success: true, output })
    }

    if (toolId === 'ocr_nexora') {
      const parsed = nexoraOcrInputSchema.safeParse(request.input)
      if (!parsed.success) return invalid(parsed.error)
      const document = await readToolFile(parsed.data.file, userId, requestId, signal)
      const output = await ocrDocument(
        {
          file: document.buffer,
          mimeType: document.mimeType,
          model: parsed.data.model,
          pages: parsed.data.pages,
        },
        { signal }
      )
      return Response.json({ success: true, output })
    }

    if (toolId === 'nexora_extract') {
      const parsed = nexoraExtractInputSchema.safeParse(request.input)
      if (!parsed.success) return invalid(parsed.error)
      const document = await readToolFile(parsed.data.file, userId, requestId, signal)
      const output = await extractDocumentData(
        {
          file: document.buffer,
          mimeType: document.mimeType,
          fields: parsed.data.fields,
          instructions: parsed.data.instructions,
          visionModel: parsed.data.visionModel,
          model: parsed.data.model,
          pages: parsed.data.pages,
        },
        { signal }
      )
      return Response.json({ success: true, output })
    }

    const parsed = nexoraSttInputSchema.safeParse(request.input)
    if (!parsed.success) return invalid(parsed.error)
    const source = parsed.data.audioFile ?? parsed.data.audioFileReference
    if (!source) {
      return Response.json({ success: false, error: 'An audio file is required' }, { status: 400 })
    }
    const audio = await readToolFile(source, userId, requestId, signal)
    let { buffer, mimeType, name } = audio
    if (isVideoFile(mimeType)) {
      const extracted = await extractAudioFromVideo(buffer, mimeType, {
        outputFormat: 'mp3',
        sampleRate: 16000,
        channels: 1,
        signal,
      })
      buffer = extracted.buffer
      mimeType = 'audio/mpeg'
      name = name.replace(/\.[^.]+$/, '.mp3')
    }
    if (parsed.data.diarization) {
      const meeting = await transcribeMeetingWithNexora(
        {
          audio: buffer,
          mimeType,
          fileName: name,
          model: parsed.data.model,
          language: parsed.data.language,
          prompt: parsed.data.prompt,
          numSpeakers: parsed.data.numSpeakers,
        },
        { signal }
      )
      return Response.json({
        success: true,
        output: {
          transcript: meeting.transcript,
          transcriptBySpeaker: meeting.transcriptBySpeaker,
          speakers: meeting.speakers,
          segments: meeting.segments,
          ...(meeting.warning ? { warning: meeting.warning } : {}),
          ...(parsed.data.language && parsed.data.language !== 'auto'
            ? { language: parsed.data.language }
            : {}),
          ...(meeting.duration !== undefined ? { duration: meeting.duration } : {}),
        },
      })
    }
    const result = await transcribeWithNexora(
      {
        audio: buffer,
        mimeType,
        fileName: name,
        model: parsed.data.model,
        language: parsed.data.language,
        prompt: parsed.data.prompt,
      },
      { signal }
    )
    return Response.json({
      success: true,
      output: {
        transcript: result.transcript,
        ...(parsed.data.language && parsed.data.language !== 'auto'
          ? { language: parsed.data.language }
          : {}),
        ...(result.duration !== undefined ? { duration: result.duration } : {}),
      },
    })
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof NexoraDocumentAiError || error instanceof FileRefusedError) {
      return Response.json({ success: false, error: error.message }, { status: error.status })
    }
    const message = getErrorMessage(error, 'Unknown error')
    logger.error('Nexora document AI operation failed', { error: message, requestId, toolId })
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
