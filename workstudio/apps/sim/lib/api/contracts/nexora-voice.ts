import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { MAX_LEXICON_CHARACTERS, MAX_LEXICON_TERMS } from '@/lib/nexora/voice/lexicon'

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
