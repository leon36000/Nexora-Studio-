import { mistralParserV2Tool, mistralParserV3Tool } from '@/tools/mistral/parser'
import { selectModelBoundFileInputPaths } from '@/lib/uploads/utils/model-input'
import type { MistralParserV2Input, MistralParserV2Output } from '@/tools/mistral/types'
import type { InternalToolConfig } from '@/tools/types'

type OcrNexoraParams = Pick<MistralParserV2Input, 'file' | 'pages'> & {
  /** A Vision / OCR model of Réglages › Modèles; empty for the first one. */
  model?: string
}

/**
 * Document parsing with the « Nexora » provider: OCR by a model served by Nexora API (Mistral OCR,
 * or a local vision model that reads a PDF page by page), with the Mistral Parser's outputs.
 */
export const ocrNexoraTool: InternalToolConfig<OcrNexoraParams, MistralParserV2Output> = {
  id: 'ocr_nexora',
  name: 'Nexora OCR',
  description:
    'Extract the text of a PDF or an image with an OCR or vision model served by Nexora API (Réglages › Modèles, usage Vision / OCR).',
  version: '1.0.0',

  params: {
    file: mistralParserV3Tool.params.file,
    pages: mistralParserV3Tool.params.pages,
    model: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Nexora OCR model to use (empty: the first Vision / OCR model)',
    },
  },

  operation: {
    modelInput: {
      mode: 'private-provenance',
      inputPaths: (params) =>
        selectModelBoundFileInputPaths(params.file, ['file'], { includeInlineBase64: true }),
    },
    input: (params) => {
      if (!params.file || typeof params.file !== 'object') {
        throw new Error('File input is required: provide a file upload or file reference')
      }
      return {
        file: params.file,
        model: params.model?.trim() || null,
        ...(params.pages?.length ? { pages: params.pages } : {}),
      }
    },
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()
    if (!data?.success) throw new Error(data?.error || 'Nexora OCR failed')
    const output = data.output ?? {}
    return {
      success: true,
      output: {
        pages: output.pages ?? [],
        model: output.model ?? '',
        usage_info: output.usage_info ?? { pages_processed: 0, doc_size_bytes: null },
        document_annotation: output.document_annotation ?? null,
      },
    }
  },
  outputs: mistralParserV2Tool.outputs,
}
