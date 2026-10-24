import { selectModelBoundFileInputPaths } from '@/lib/uploads/utils/model-input'
import type { InternalToolConfig, ToolResponse } from '@/tools/types'

interface NexoraExtractParams {
  file: unknown
  /** The fields to extract: `{ name, type, description?, example?, required? }`. */
  fields: unknown[]
  instructions?: string
  /** A Vision / OCR model of Réglages › Modèles; empty for the first one. */
  visionModel?: string
  /** The chat model that fills the schema; empty for the instance's default model. */
  model?: string
  pages?: number[]
}

interface NexoraExtractResponse extends ToolResponse {
  output: {
    data: Record<string, unknown>
    toVerify: boolean
    issues: string[]
    row: Record<string, unknown>
    markdown: string
    model: string
    visionModel: string
  }
}

/**
 * « Extraire des données »: Nexora API reads a PDF (even scanned) or an image and a chat model of
 * the instance fills the fields; the values are checked and flagged « à vérifier » when doubtful.
 */
export const nexoraExtractTool: InternalToolConfig<NexoraExtractParams, NexoraExtractResponse> = {
  id: 'nexora_extract',
  name: 'Nexora Extract Data',
  description:
    'Extract structured fields (invoice, quote, purchase order, expense report or your own schema) from a PDF or an image with the models of Nexora API, with a « to check » flag when a value is doubtful.',
  version: '1.0.0',

  params: {
    file: {
      type: 'file',
      required: true,
      visibility: 'user-only',
      description: 'PDF (digital or scanned) or image to read',
    },
    fields: {
      type: 'array',
      required: true,
      visibility: 'user-only',
      description: 'Fields to extract: name, type, description',
    },
    instructions: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'Extra instructions for the extraction',
    },
    visionModel: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Nexora Vision / OCR model that reads scans (empty: the first one)',
    },
    model: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Nexora chat model that fills the fields (empty: the default model)',
    },
    pages: {
      type: 'array',
      required: false,
      visibility: 'user-only',
      description: 'Pages to read, from 0 (all when empty)',
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
        fields: params.fields,
        instructions: params.instructions?.trim() || null,
        visionModel: params.visionModel?.trim() || null,
        model: params.model?.trim() || null,
        ...(params.pages?.length ? { pages: params.pages } : {}),
      }
    },
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()
    if (!data?.success) throw new Error(data?.error || 'Nexora data extraction failed')
    return { success: true, output: data.output }
  },

  outputs: {
    data: { type: 'json', description: 'Extracted values, one per field (null when absent)' },
    toVerify: { type: 'boolean', description: 'A value is missing, unreadable or inconsistent' },
    issues: { type: 'array', description: 'Why the document is to be checked' },
    row: { type: 'json', description: 'The values plus a_verifier and motifs, for a table' },
    markdown: { type: 'string', description: 'The document as read, in Markdown' },
    model: { type: 'string', description: 'Chat model that filled the fields' },
    visionModel: { type: 'string', description: 'Vision / OCR model of the request' },
  },
}
