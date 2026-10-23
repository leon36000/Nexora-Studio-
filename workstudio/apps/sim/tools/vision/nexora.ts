import { selectModelBoundFileInputPaths } from '@/lib/uploads/utils/model-input'
import type { UserFile } from '@/executor/types'
import type { InternalToolConfig } from '@/tools/types'
import { visionTool } from '@/tools/vision/tool'
import type { VisionResponse } from '@/tools/vision/types'

interface VisionNexoraParams {
  imageFile: UserFile
  /** A Vision / OCR model of Réglages › Modèles; empty for the first one. */
  model?: string
  prompt?: string
}

/** Vision with the « Nexora » provider: a vision model served by Nexora API, no key to enter. */
export const visionNexoraTool: InternalToolConfig<VisionNexoraParams, VisionResponse> = {
  id: 'vision_nexora',
  name: 'Nexora Vision',
  description:
    'Analyze an image with a vision model served by Nexora API (Réglages › Modèles, usage Vision / OCR).',
  version: '1.0.0',

  params: {
    imageFile: {
      type: 'file',
      required: true,
      visibility: 'user-only',
      description: 'Image file to analyze',
    },
    model: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Nexora vision model to use (empty: the first Vision / OCR model)',
    },
    prompt: visionTool.params.prompt,
  },

  operation: {
    modelInput: {
      mode: 'project',
      select: (params) => ({ prompt: params.prompt }),
      privateInputPaths: (params) =>
        selectModelBoundFileInputPaths(params.imageFile, ['imageFile'], {
          includeInlineBase64: true,
        }),
    },
    input: (params) => ({
      imageFile: params.imageFile,
      model: params.model?.trim() || null,
      prompt: params.prompt || null,
    }),
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to analyze image')
    return { success: true, output: data.output }
  },
  outputs: {
    content: visionTool.outputs?.content ?? { type: 'string', description: 'Analysis result' },
    model: { type: 'string', description: 'The Nexora model that analyzed the image' },
  },
}
