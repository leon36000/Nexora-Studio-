import { validateAttachmentFileType } from '@/lib/uploads/utils/validation'

/** Largest file the deployed chat accepts once base64-encoded (14 MB of text). */
export const ASSISTANT_MAX_FILE_BYTES = 10 * 1024 * 1024

/** Files one message may carry. */
export const ASSISTANT_MAX_FILES = 5

type AttachmentRefusalReason = 'too-large' | 'empty' | 'unsupported' | 'duplicate' | 'too-many'

export interface AttachmentRefusal {
  name: string
  reason: AttachmentRefusalReason
}

interface NamedSized {
  name: string
  size: number
}

/**
 * Splits a selection into the files a message can carry and the ones refused, each with its
 * reason, before anything is uploaded or sent: size, emptiness, type (documents, code, images,
 * audio and video; never executables or archives), duplicates and the per-message count.
 */
export function admitAttachments<T extends NamedSized>(
  current: readonly NamedSized[],
  incoming: readonly T[]
): { admitted: T[]; refused: AttachmentRefusal[] } {
  const admitted: T[] = []
  const refused: AttachmentRefusal[] = []
  const seen = new Set(current.map((file) => `${file.name}:${file.size}`))

  for (const file of incoming) {
    const identity = `${file.name}:${file.size}`
    let reason: AttachmentRefusalReason | null = null
    if (file.size === 0) reason = 'empty'
    else if (file.size > ASSISTANT_MAX_FILE_BYTES) reason = 'too-large'
    else if (validateAttachmentFileType(file.name)) reason = 'unsupported'
    else if (seen.has(identity)) reason = 'duplicate'
    else if (current.length + admitted.length >= ASSISTANT_MAX_FILES) reason = 'too-many'

    if (reason) {
      refused.push({ name: file.name, reason })
      continue
    }
    seen.add(identity)
    admitted.push(file)
  }

  return { admitted, refused }
}
