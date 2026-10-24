import { toError } from '@sim/utils/errors'
import { DocumentIcon } from '@/components/icons'
import { docsUrl } from '@/lib/branding/docs-url'
import {
  EXTRACTION_TEMPLATE_IDS,
  EXTRACTION_TEMPLATES,
  type ExtractionTemplateId,
  toExtractionFields,
} from '@/lib/nexora/document-ai/fields'
import type { BlockConfig } from '@/blocks/types'
import { normalizeFileInput } from '@/blocks/utils'

const TEMPLATE_LABELS: Record<ExtractionTemplateId, string> = {
  invoice: 'Invoice',
  quote: 'Quote',
  purchase_order: 'Purchase order',
  expense_report: 'Expense report',
}

function isTemplate(value: unknown): value is ExtractionTemplateId {
  return (EXTRACTION_TEMPLATE_IDS as readonly unknown[]).includes(value)
}

function parsePages(pages: unknown): number[] | undefined {
  if (typeof pages !== 'string' || !pages.trim()) return undefined
  const parsed = pages
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const page = Number.parseInt(part, 10)
      if (Number.isNaN(page) || page < 0) throw new Error(`Invalid page number: ${part}`)
      return page
    })
  return parsed.length ? parsed : undefined
}

/**
 * Nexora edition: « Extraire des données ». Reads a PDF (digital or scanned) or an image with
 * the models of Nexora API and returns the fields of a ready template or of a visual schema,
 * checked, with a « to check » flag; its `row` output feeds a Table block.
 */
export const NexoraExtractBlock: BlockConfig = {
  type: 'nexora_extract',
  name: 'Extract Data',
  description: 'Extract the fields of an invoice, a quote or any document',
  longDescription:
    'Reads a PDF (even scanned) or an image with the models of your instance and returns the fields of an invoice, a quote, a purchase order, an expense report or your own schema as checked JSON. A value that is missing, unreadable or inconsistent sets « to check ».',
  docsLink: docsUrl('/guide/documents-et-voix'),
  category: 'blocks',
  bgColor: '#0F766E',
  icon: DocumentIcon,
  canvasPresentation: {
    defaultTitle: 'Extract Data',
    sentences: {
      default: [
        'Extract the fields',
        { text: 'of', field: 'template' },
        { text: 'from', field: ['fileUpload', 'fileReference'] },
      ],
    },
  },
  subBlocks: [
    {
      id: 'fileUpload',
      title: 'Document',
      type: 'file-upload',
      canonicalParamId: 'file',
      acceptedTypes: 'application/pdf,image/png,image/jpeg,image/webp',
      placeholder: 'Upload a PDF or an image',
      mode: 'basic',
      maxSize: 50,
      required: true,
    },
    {
      id: 'fileReference',
      title: 'File Reference',
      type: 'short-input',
      canonicalParamId: 'file',
      placeholder: 'File reference from previous block',
      mode: 'advanced',
      required: true,
    },
    {
      id: 'template',
      title: 'Fields to extract',
      type: 'dropdown',
      options: [
        ...EXTRACTION_TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATE_LABELS[id] })),
        { id: 'custom', label: 'My own fields' },
      ],
      value: () => 'invoice',
    },
    {
      id: 'fields',
      title: 'Fields',
      type: 'input-format',
      description:
        'One row per field: its name (letters, digits and _), its type and what it is. Value: an optional example.',
      condition: { field: 'template', value: 'custom' },
    },
    {
      id: 'instructions',
      title: 'Instructions',
      type: 'long-input',
      placeholder: 'Optional: what to know about these documents (currency, supplier names…)',
    },
    {
      id: 'nexoraModel',
      title: 'Reading model',
      type: 'short-input',
      placeholder: 'First Vision / OCR model',
      description:
        'A Vision / OCR model from Settings › Models that reads scans and images. Leave empty to use the first one.',
      mode: 'advanced',
    },
    {
      id: 'model',
      title: 'Extraction model',
      type: 'short-input',
      placeholder: 'Default model',
      description:
        'A chat model from Settings › Models that fills the fields. Leave empty to use the default model.',
      mode: 'advanced',
    },
    {
      id: 'pages',
      title: 'Pages',
      type: 'short-input',
      placeholder: 'e.g. 0,1 (leave empty for all pages; at most 10 scanned pages)',
      mode: 'advanced',
    },
  ],
  tools: {
    access: ['nexora_extract'],
    config: {
      tool: () => 'nexora_extract',
      params: (params) => {
        const file = normalizeFileInput(params.file, { single: true })
        if (!file) throw new Error('A document is required')
        const fields = isTemplate(params.template)
          ? EXTRACTION_TEMPLATES[params.template]
          : toExtractionFields(params.fields)
        if (fields.length === 0) throw new Error('Add at least one field to extract')
        let pages: number[] | undefined
        try {
          pages = parsePages(params.pages)
        } catch (error) {
          throw new Error(`Page number format error: ${toError(error).message}`)
        }
        return {
          file,
          fields,
          instructions: params.instructions,
          visionModel: params.nexoraModel,
          model: params.model,
          ...(pages ? { pages } : {}),
        }
      },
    },
  },
  inputs: {
    file: { type: 'json', description: 'Document (file upload or file reference)' },
    template: { type: 'string', description: 'Ready template, or custom for your own fields' },
    fields: { type: 'json', description: 'Your own fields (name, type, description)' },
    instructions: { type: 'string', description: 'Extra instructions' },
    nexoraModel: { type: 'string', description: 'Vision / OCR model' },
    model: { type: 'string', description: 'Chat model that fills the fields' },
    pages: { type: 'string', description: 'Pages to read' },
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
