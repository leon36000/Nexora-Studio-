import {
  assertCallNeedsNoProtection,
  defaultGuardDeps,
  type GuardDeps,
} from '@/lib/nexora/data-protection/guard'

/**
 * For a document sent to a model (OCR, vision, data extraction, transcription): the policy cannot
 * mask a scan or a recording, so the call is stopped, with `PersonalDataUnsupportedError`, when the
 * workspace protects personal data and any model the call uses is off this server. The models are
 * resolved only once the policy asks for them: a workspace that allows personal data pays nothing.
 */
export async function assertDocumentCallNeedsNoProtection(
  input: {
    workspaceId: string | null | undefined
    /** `null`: the call uses no model of that kind, so nothing leaves for it. */
    models: ReadonlyArray<() => Promise<string | null>>
  },
  deps: GuardDeps = defaultGuardDeps
): Promise<void> {
  await assertCallNeedsNoProtection(
    { model: 'document-ai', workspaceId: input.workspaceId ?? null },
    {
      ...deps,
      isOffInstance: async () => {
        for (const resolveModel of input.models) {
          const model = await resolveModel()
          if (model !== null && (await deps.isOffInstance(model))) return true
        }
        return false
      },
    }
  )
}
