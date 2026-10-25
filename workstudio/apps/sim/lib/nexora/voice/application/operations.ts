import { defineOrganizationOperation } from '@/lib/core/application/organization-operation'

const policy = {
  minimumRole: 'admin',
  principalKinds: ['session'],
} as const

/** Nexora edition: the company's voice lexicon, read and set by the instance organization's owners and admins. */
export const nexoraVoiceOperations = Object.freeze({
  // permission-group-exempt: the lexicon is an instance-wide setting of the instance administrators.
  readLexicon: defineOrganizationOperation({
    id: 'organization.nexora_voice_lexicon.read',
    ...policy,
    capability: 'none',
  }),
  // permission-group-exempt: the lexicon is an instance-wide setting of the instance administrators.
  updateLexicon: defineOrganizationOperation({
    id: 'organization.nexora_voice_lexicon.update',
    ...policy,
    capability: 'none',
  }),
})
