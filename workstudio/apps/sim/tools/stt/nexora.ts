import type { UserFile } from '@/executor/types'
import {
  applyProjectedSttAudioFileNameModelInput,
  selectSttAudioFileNameModelInput,
} from '@/tools/stt/model-input'
import type { SttResponse } from '@/tools/stt/types'
import type { InternalToolConfig, ToolConfig } from '@/tools/types'

interface NexoraSttParams {
  /** A Transcription model of Réglages › Modèles; empty for the first one. */
  model?: string
  audioFile?: UserFile | UserFile[]
  audioFileReference?: UserFile | UserFile[]
  language?: string
  prompt?: string
}

const params: InternalToolConfig<NexoraSttParams>['params'] = {
  model: {
    type: 'string',
    required: false,
    visibility: 'user-only',
    description: 'Nexora transcription model to use (empty: the first Transcription model)',
  },
  audioFile: {
    type: 'file',
    required: false,
    visibility: 'user-only',
    description: 'Audio or video file to transcribe (e.g., MP3, WAV, M4A, WEBM)',
  },
  audioFileReference: {
    type: 'file',
    required: false,
    visibility: 'user-only',
    description: 'Reference to audio/video file from previous blocks',
  },
  language: {
    type: 'string',
    required: false,
    visibility: 'user-or-llm',
    description: 'Language code (e.g., "fr", "en") or "auto" for auto-detection',
  },
  prompt: {
    type: 'string',
    required: false,
    visibility: 'user-or-llm',
    description: 'Optional text to guide the transcription (names, vocabulary).',
  },
}

const transformResponse: ToolConfig<NexoraSttParams, SttResponse>['transformResponse'] = async (
  response: Response
) => {
  const data = await response.json()
  if (!response.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Transcription failed',
      output: { transcript: '' },
    }
  }
  return { success: true, output: data.output }
}

/**
 * Speech-to-Text with the « Nexora » provider: a transcription model served by Nexora API (the
 * local Whisper service, Voxtral…). Recordings longer than ten minutes are transcribed piece by
 * piece; past three hours they are refused.
 */
export const nexoraSttTool: InternalToolConfig<NexoraSttParams, SttResponse> = {
  id: 'stt_nexora',
  name: 'Nexora Speech-to-Text',
  description:
    'Transcribe audio to text with a transcription model served by Nexora API (Réglages › Modèles, usage Transcription).',
  version: '1.0.0',
  params,

  operation: {
    modelInput: {
      mode: 'project',
      select: (selected) => ({
        language: selected.language,
        prompt: selected.prompt,
        ...selectSttAudioFileNameModelInput(selected),
      }),
      applyProjected: (selected, projected) => ({
        language: projected.language,
        prompt: projected.prompt,
        ...applyProjectedSttAudioFileNameModelInput(selected, projected),
      }),
    },
    input: (input) => ({
      model: input.model?.trim() || null,
      audioFile: input.audioFile,
      audioFileReference: input.audioFileReference,
      language: input.language || 'auto',
      prompt: input.prompt,
    }),
  },

  transformResponse,
  outputs: {
    transcript: { type: 'string', description: 'Full transcribed text' },
    language: { type: 'string', description: 'Specified language', optional: true },
    duration: { type: 'number', description: 'Audio duration in seconds', optional: true },
  },
}

export const nexoraSttV2Tool: InternalToolConfig<NexoraSttParams, SttResponse> = {
  ...nexoraSttTool,
  id: 'stt_nexora_v2',
}
