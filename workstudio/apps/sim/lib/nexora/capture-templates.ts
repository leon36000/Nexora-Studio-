import { generateId } from '@sim/utils/id'
import {
  EXTRACTION_TEMPLATES,
  type ExtractionFieldType,
  type ExtractionTemplateId,
} from '@/lib/nexora/document-ai/fields'
import type { NexoraModelUsage, NexoraModelUsages } from '@/lib/nexora/model-ids'
import { NEXORA_BLOCK_PROVIDER } from '@/lib/nexora/models'
import type { ColumnType } from '@/lib/table/column-types/types'

/**
 * Nexora edition: the home page's « Capturer » cards, each a ready workflow that reads the file
 * given to its Start block with models of the instance: a document or image through « Analyse de
 * document (OCR) », a recording through « Transcription », and the fields of an invoice, a quote…
 * through « Extraire des données », saved as a row of a table.
 */
const CAPTURE_KINDS = ['document', 'transcription', 'extraction'] as const
export type CaptureKind = (typeof CAPTURE_KINDS)[number]

/** The cards that build a Start → reader workflow. */
export const READER_KINDS = ['document', 'transcription'] as const
export type ReaderKind = (typeof READER_KINDS)[number]

const CAPTURE_USAGES: Record<CaptureKind, readonly NexoraModelUsage[]> = {
  document: ['vision'],
  transcription: ['transcription'],
  extraction: ['vision', 'chat'],
}

/** The cards to offer: one per kind whose model usages all have a model, none while unknown. */
export function availableCaptureKinds(usages: NexoraModelUsages | null | undefined): CaptureKind[] {
  if (!usages) return []
  return CAPTURE_KINDS.filter((kind) => CAPTURE_USAGES[kind].every((usage) => usages[usage]))
}

interface CaptureReader {
  type: string
  name: string
  /** The Start block's file field, also the reader's reference name (`<start.field>`). */
  field: string
  fieldDescription: string
  /** The reader's advanced (reference) member of its file pair. */
  referenceSubBlock: string
  canonicalParamId: string
  extraSubBlocks: Record<string, { type: string; value: unknown }>
}

const READERS: Record<ReaderKind, CaptureReader> = {
  document: {
    type: 'mistral_parse_v3',
    name: 'Lecture',
    field: 'document',
    fieldDescription: 'PDF (même scanné) ou image à lire',
    referenceSubBlock: 'fileReference',
    canonicalParamId: 'file',
    extraSubBlocks: { resultType: { type: 'dropdown', value: 'markdown' } },
  },
  transcription: {
    type: 'stt_v2',
    name: 'Transcription',
    field: 'enregistrement',
    fieldDescription: 'Fichier audio ou vidéo à transcrire',
    referenceSubBlock: 'audioFileReference',
    canonicalParamId: 'audioFile',
    extraSubBlocks: { language: { type: 'dropdown', value: 'fr' } },
  },
}

interface CaptureBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  enabled: boolean
  subBlocks: Record<string, { id: string; type: string; value: unknown }>
  outputs: Record<string, never>
  data?: { canonicalModes: Record<string, 'basic' | 'advanced'> }
}

interface CaptureWorkflowState {
  blocks: Record<string, CaptureBlock>
  edges: {
    id: string
    source: string
    target: string
    sourceHandle: string
    targetHandle: string
  }[]
  loops: Record<string, never>
  parallels: Record<string, never>
}

function startBlock(id: string, field: string, description: string): CaptureBlock {
  return {
    id,
    type: 'start_trigger',
    name: 'Start',
    position: { x: 0, y: 0 },
    enabled: true,
    subBlocks: {
      inputFormat: {
        id: 'inputFormat',
        type: 'input-format',
        value: [
          {
            id: generateId(),
            name: field,
            type: 'file[]',
            value: '',
            description,
            collapsed: false,
          },
        ],
      },
    },
    outputs: {},
  }
}

function edge(source: string, target: string): CaptureWorkflowState['edges'][number] {
  return { id: generateId(), source, target, sourceHandle: 'source', targetHandle: 'target' }
}

/** Workflow state (Start with one file field → reader on the Nexora provider) for the importer. */
export function buildCaptureWorkflow(kind: ReaderKind): CaptureWorkflowState {
  const reader = READERS[kind]
  const startId = generateId()
  const readerId = generateId()
  const subBlocks: CaptureBlock['subBlocks'] = {
    provider: { id: 'provider', type: 'dropdown', value: NEXORA_BLOCK_PROVIDER },
    [reader.referenceSubBlock]: {
      id: reader.referenceSubBlock,
      type: 'short-input',
      value: `<start.${reader.field}>`,
    },
  }
  for (const [id, subBlock] of Object.entries(reader.extraSubBlocks)) {
    subBlocks[id] = { id, ...subBlock }
  }
  return {
    blocks: {
      [startId]: startBlock(startId, reader.field, reader.fieldDescription),
      [readerId]: {
        id: readerId,
        type: reader.type,
        name: reader.name,
        position: { x: 420, y: 0 },
        enabled: true,
        subBlocks,
        outputs: {},
        data: { canonicalModes: { [reader.canonicalParamId]: 'advanced' } },
      },
    },
    edges: [edge(startId, readerId)],
    loops: {},
    parallels: {},
  }
}

/** The table a « Extraire des données » card fills, per template (valid table names). */
export const EXTRACTION_TABLE_NAMES: Record<ExtractionTemplateId, string> = {
  invoice: 'Factures',
  quote: 'Devis',
  purchase_order: 'Bons_de_commande',
  expense_report: 'Notes_de_frais',
}

const COLUMN_TYPE_OF: Record<ExtractionFieldType, ColumnType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  array: 'json',
  object: 'json',
}

/** The table's columns: one per field of the template, then the « à vérifier » flag and its reasons. */
export function extractionTableColumns(
  template: ExtractionTemplateId
): { name: string; type: ColumnType }[] {
  return [
    ...EXTRACTION_TEMPLATES[template].map((field) => ({
      name: field.name,
      type: COLUMN_TYPE_OF[field.type],
    })),
    { name: 'a_verifier', type: 'boolean' },
    { name: 'motifs', type: 'string' },
  ]
}

/** The extraction block's name; its reference name (`<extraction.row>`) is the lower-cased name. */
const EXTRACTION_BLOCK_NAME = 'Extraction'

/**
 * Workflow state for the importer: Start (a `document` file) → « Extraire des données » on the
 * template → Table « insérer une ligne » with the checked row, when a table is given.
 */
export function buildExtractionWorkflow(
  template: ExtractionTemplateId,
  tableId: string | null
): CaptureWorkflowState {
  const startId = generateId()
  const extractionId = generateId()
  const sub = (id: string, type: string, value: unknown) => ({ id, type, value })
  const blocks: CaptureWorkflowState['blocks'] = {
    [startId]: startBlock(startId, 'document', 'Facture, devis ou justificatif : PDF ou image'),
    [extractionId]: {
      id: extractionId,
      type: 'nexora_extract',
      name: EXTRACTION_BLOCK_NAME,
      position: { x: 420, y: 0 },
      enabled: true,
      subBlocks: {
        fileReference: sub('fileReference', 'short-input', '<start.document>'),
        template: sub('template', 'dropdown', template),
      },
      outputs: {},
      data: { canonicalModes: { file: 'advanced' } },
    },
  }
  const edges: CaptureWorkflowState['edges'] = [edge(startId, extractionId)]
  if (tableId) {
    const tableBlockId = generateId()
    blocks[tableBlockId] = {
      id: tableBlockId,
      type: 'table_v2',
      name: 'Enregistrement',
      position: { x: 840, y: 0 },
      enabled: true,
      subBlocks: {
        operation: sub('operation', 'dropdown', 'insert_row'),
        tableSelector: sub('tableSelector', 'table-selector', tableId),
        data: sub('data', 'code', `<${EXTRACTION_BLOCK_NAME.toLowerCase()}.row>`),
      },
      outputs: {},
      data: { canonicalModes: { tableId: 'basic' } },
    }
    edges.push(edge(extractionId, tableBlockId))
  }
  return { blocks, edges, loops: {}, parallels: {} }
}
