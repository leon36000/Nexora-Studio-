'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import {
  getNexoraVoiceLexiconContract,
  updateNexoraVoiceLexiconContract,
} from '@/lib/api/contracts/nexora-voice'

const NEXORA_VOICE_STALE_TIME = 30 * 1000

const nexoraVoiceKeys = {
  all: ['nexora-voice'] as const,
  lexicon: () => [...nexoraVoiceKeys.all, 'lexicon'] as const,
}

/** The company's lexicon. Instance admins only. */
export function useNexoraVoiceLexicon() {
  return useQuery({
    queryKey: nexoraVoiceKeys.lexicon(),
    queryFn: ({ signal }) => requestJson(getNexoraVoiceLexiconContract, { signal }),
    staleTime: NEXORA_VOICE_STALE_TIME,
  })
}

export function useUpdateNexoraVoiceLexicon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lexicon: string[]) =>
      requestJson(updateNexoraVoiceLexiconContract, { body: { lexicon } }),
    onSuccess: (saved) => queryClient.setQueryData(nexoraVoiceKeys.lexicon(), saved),
  })
}
