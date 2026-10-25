import {
  getNexoraVoiceLexiconContract,
  updateNexoraVoiceLexiconContract,
} from '@/lib/api/contracts/nexora-voice'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  readNexoraVoiceLexicon,
  updateNexoraVoiceLexicon,
} from '@/lib/nexora/voice/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

const rateLimit = internalRateLimits.none({
  reason: 'Instance-admin setting, read and saved by hand from the models settings page',
})

/** Réglages › Modèles: the company's lexicon, given to Whisper as its initial prompt. */
export const GET = defineInternalJsonRoute({
  contract: getNexoraVoiceLexiconContract,
  operation: readNexoraVoiceLexicon.operation,
  auth: internalSessionAuth,
  rateLimit,
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: () => instanceOrganizationInput(),
  useCase: readNexoraVoiceLexicon,
})

export const PUT = defineInternalJsonRoute({
  contract: updateNexoraVoiceLexiconContract,
  operation: updateNexoraVoiceLexicon.operation,
  auth: internalSessionAuth,
  rateLimit,
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ body }) => ({
    ...(await instanceOrganizationInput()),
    lexicon: body.lexicon,
  }),
  useCase: updateNexoraVoiceLexicon,
})
