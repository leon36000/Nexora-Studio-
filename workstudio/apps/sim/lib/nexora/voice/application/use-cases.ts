import { defineAuthorizedOrganizationUseCase } from '@/lib/core/application/authorized-organization-use-case'
import { nexoraVoiceOperations } from '@/lib/nexora/voice/application/operations'
import { readVoiceLexiconOf, saveVoiceLexicon } from '@/lib/nexora/voice/lexicon-store'

export const readNexoraVoiceLexicon = defineAuthorizedOrganizationUseCase({
  operation: nexoraVoiceOperations.readLexicon,
  execute: async ({ input }: { input: { organizationId: string } }) => ({
    lexicon: await readVoiceLexiconOf(input.organizationId),
  }),
})

export const updateNexoraVoiceLexicon = defineAuthorizedOrganizationUseCase({
  operation: nexoraVoiceOperations.updateLexicon,
  execute: async ({ input }: { input: { organizationId: string; lexicon: string[] } }) => ({
    lexicon: await saveVoiceLexicon(input.organizationId, input.lexicon),
  }),
})
