import type { NexoraTtsParams, TtsBlockResponse } from '@/tools/tts/types'
import type { InternalToolConfig } from '@/tools/types'

/**
 * Text-to-Speech with the « Nexora » provider: a Speech synthesis model served by Nexora API
 * (the local French voice, or any OpenAI-compatible voice service). No key, nothing leaves the
 * instance with a local voice.
 */
export const nexoraTtsTool: InternalToolConfig<NexoraTtsParams, TtsBlockResponse> = {
  id: 'tts_nexora',
  name: 'Nexora Text-to-Speech',
  description:
    'Convert text to speech with a Speech synthesis model served by Nexora API (Réglages › Modèles, usage Synthèse vocale).',
  version: '1.0.0',

  params: {
    text: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'The text to read aloud (4 096 characters at most)',
    },
    model: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Nexora speech model to use (empty: the first Speech synthesis model)',
    },
    voice: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'Voice of the model (empty: its default voice)',
    },
    responseFormat: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Audio format (wav or mp3)',
    },
    speed: {
      type: 'number',
      required: false,
      visibility: 'user-or-llm',
      description: 'Speed multiplier from 0.25 to 4.0 (1.0 is normal)',
    },
  },

  operation: {
    modelInput: {
      mode: 'project',
      select: (params) => ({ text: params.text }),
    },
    input: (params) => ({
      text: params.text,
      model: params.model?.trim() || null,
      voice: params.voice?.trim() || undefined,
      responseFormat: params.responseFormat || 'wav',
      speed: params.speed || 1.0,
    }),
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()
    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error || 'Speech synthesis failed',
        output: { audioUrl: '' },
      }
    }
    return {
      success: true,
      output: {
        audioUrl: data.audioUrl,
        audioFile: data.audioFile,
        duration: data.duration,
        characterCount: data.characterCount,
        format: data.format,
        provider: data.provider,
      },
    }
  },

  outputs: {
    audioUrl: { type: 'string', description: 'URL to the generated audio file' },
    audioFile: { type: 'file', description: 'Generated audio file object' },
    duration: { type: 'number', description: 'Audio duration in seconds' },
    characterCount: { type: 'number', description: 'Number of characters processed' },
    format: { type: 'string', description: 'Audio format' },
    provider: { type: 'string', description: 'TTS provider used' },
  },
}
