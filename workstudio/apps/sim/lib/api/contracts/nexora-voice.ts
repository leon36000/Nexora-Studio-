import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { MAX_LEXICON_CHARACTERS, MAX_LEXICON_TERMS } from '@/lib/nexora/voice/lexicon'
import { SPEECH_CHUNK_CHARACTERS } from '@/lib/nexora/voice/speech-text'

/**
 * Nexora edition: the company's lexicon (names Whisper must spell right), set by the instance
 * administrators in Réglages › Modèles. Terms beyond the limits are dropped by the server, so the
 * answer is the list as it will be used.
 */
const lexiconSchema = z.object({
  lexicon: z
    .array(z.string().max(MAX_LEXICON_CHARACTERS, 'A term is at most 800 characters'))
    .max(MAX_LEXICON_TERMS * 2, 'At most 100 terms'),
})

export const getNexoraVoiceLexiconContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/voice/lexicon',
  response: { mode: 'json', schema: lexiconSchema },
})

export const updateNexoraVoiceLexiconContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/voice/lexicon',
  body: lexiconSchema,
  response: { mode: 'json', schema: lexiconSchema },
})

/**
 * The Assistant reads an answer aloud, one piece at a time: the text of a piece (a few sentences),
 * the audio comes back as the body.
 */
export const assistantSpeakContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/voice/speak',
  body: z.object({
    workspaceId: z.string().min(1, 'workspaceId is required'),
    text: z
      .string()
      .trim()
      .min(1, 'There is no text to read aloud')
      .max(SPEECH_CHUNK_CHARACTERS * 2, 'This text is too long to read in one go'),
  }),
  response: { mode: 'stream' },
})

/** The Assistant's dictation: a recording (multipart `file`, `workspaceId`, `language`) becomes text. */
export const assistantDictateContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/voice/dictate',
  response: { mode: 'json', schema: z.object({ text: z.string() }) },
})
