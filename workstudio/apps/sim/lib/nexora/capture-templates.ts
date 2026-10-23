import { generateId } from '@sim/utils/id'
import type { NexoraModelUsage, NexoraModelUsages } from '@/lib/nexora/model-ids'
import { NEXORA_BLOCK_PROVIDER } from '@/lib/nexora/models'

/**
 * Nexora edition: the home page's « Capturer » cards, each a two-block workflow that reads the file
 * given to its Start block with a model of the instance: a document or image through « Analyse de
 * document (OCR) », a recording through « Transcription ».
 */
export const CAPTURE_KINDS = ['document', 'transcription'] as const
export type CaptureKind = (typeof CAPTURE_KINDS)[number]

const CAPTURE_USAGE: Record<CaptureKind, NexoraModelUsage> = {
  document: 'vision',
  transcription: 'transcription',
}

/** The cards to offer: one per kind whose model usage has a model, none while that is unknown. */
export function availableCaptureKinds(usages: NexoraModelUsages | null | undefined): CaptureKind[] {
  if (!usages) return []
  return CAPTURE_KINDS.filter((kind) => usages[CAPTURE_USAGE[kind]])
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

const READERS: Record<CaptureKind, CaptureReader> = {
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

/** Workflow state (Start with one file field → reader on the Nexora provider) for the importer. */
export function buildCaptureWorkflow(kind: CaptureKind): CaptureWorkflowState {
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
      [startId]: {
        id: startId,
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
                name: reader.field,
                type: 'file[]',
                value: '',
                description: reader.fieldDescription,
                collapsed: false,
              },
            ],
          },
        },
        outputs: {},
      },
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
    edges: [
      {
        id: generateId(),
        source: startId,
        target: readerId,
        sourceHandle: 'source',
        targetHandle: 'target',
      },
    ],
    loops: {},
    parallels: {},
  }
}
