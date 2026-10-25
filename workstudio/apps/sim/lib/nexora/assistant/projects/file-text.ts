import { createLogger } from '@sim/logger'
import { isSupportedFileType, parseBuffer } from '@/lib/file-parsers'
import { getFileExtension } from '@/lib/uploads/utils/file'

const logger = createLogger('NexoraAssistantProjectFile')

/** A project file is read once, when it is added: its text is what the conversations share. */
export const PROJECT_FILE_MAX_BYTES = 5 * 1024 * 1024
export const PROJECT_FILE_MAX_CHARS = 100_000

export type ProjectFileRefusal = 'too-large' | 'unsupported' | 'unreadable' | 'empty'

type ProjectFileReading = { ok: true; text: string; size: number } | { ok: false; reason: ProjectFileRefusal }

const DATA_URL_PREFIX = /^data:[^,]*;base64,/

/**
 * The text of a file sent as a data URL (or bare base64). Nothing is stored for a refused file:
 * a format no parser reads, an empty file, a file whose bytes are not what its name says, or one
 * over the size or text limit.
 */
export async function readProjectFile(input: {
  name: string
  type: string
  data: string
}): Promise<ProjectFileReading> {
  const encoded = input.data.replace(DATA_URL_PREFIX, '')
  // base64 holds 3 bytes per 4 characters: refuse before decoding something huge.
  if (Math.floor((encoded.length * 3) / 4) > PROJECT_FILE_MAX_BYTES) {
    return { ok: false, reason: 'too-large' }
  }
  const buffer = Buffer.from(encoded, 'base64')
  if (buffer.length === 0) return { ok: false, reason: 'empty' }
  if (buffer.length > PROJECT_FILE_MAX_BYTES) return { ok: false, reason: 'too-large' }
  const extension = getFileExtension(input.name)
  if (!isSupportedFileType(extension)) return { ok: false, reason: 'unsupported' }
  try {
    const parsed = await parseBuffer(buffer, extension)
    const text = parsed.content.trim()
    if (text.length === 0) return { ok: false, reason: 'empty' }
    if (text.length > PROJECT_FILE_MAX_CHARS) return { ok: false, reason: 'too-large' }
    return { ok: true, text, size: buffer.length }
  } catch (error) {
    logger.info('A project file could not be read', {
      extension,
      error: error instanceof Error ? error.name : 'unknown',
    })
    return { ok: false, reason: 'unreadable' }
  }
}
