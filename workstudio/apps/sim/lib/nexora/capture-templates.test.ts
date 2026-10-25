import { describe, expect, it } from 'vitest'
import {
  availableCaptureKinds,
  buildCaptureWorkflow,
  buildExtractionWorkflow,
  EXTRACTION_TABLE_NAMES,
  extractionTableColumns,
  READER_KINDS,
  type ReaderKind,
} from '@/lib/nexora/capture-templates'
import { EXTRACTION_TEMPLATE_IDS, EXTRACTION_TEMPLATES } from '@/lib/nexora/document-ai/fields'
import { COLUMN_TYPES } from '@/lib/table/column-types/types'
import { NAME_PATTERN } from '@/lib/table/constants'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'
import { MistralParseV3Block } from '@/blocks/blocks/mistral_parse'
import { NexoraExtractBlock } from '@/blocks/blocks/nexora_extract'
import { SttV2Block } from '@/blocks/blocks/stt'
import { TableV2Block } from '@/blocks/blocks/table_v2'
import type { BlockConfig } from '@/blocks/types'

const READER_CONFIG: Record<ReaderKind, BlockConfig> = {
  document: MistralParseV3Block,
  transcription: SttV2Block,
}

function readerOf(kind: ReaderKind) {
  const state = buildCaptureWorkflow(kind)
  const blocks = Object.values(state.blocks)
  const start = blocks.find((block) => block.type === 'start_trigger')
  const reader = blocks.find((block) => block.type !== 'start_trigger')
  if (!start || !reader) throw new Error(`${kind}: missing block`)
  return { state, start, reader }
}

describe('Nexora capture templates', () => {
  it.each(READER_KINDS.map((kind) => [kind]))(
    '%s builds a Start → reader workflow the import parser accepts',
    (kind) => {
      const { state, start, reader } = readerOf(kind)
      const { data, errors } = parseWorkflowJson(JSON.stringify(state))
      expect(errors).toEqual([])
      expect(data).not.toBeNull()
      expect(Object.keys(state.blocks)).toHaveLength(2)
      expect(state.edges.map((edge) => [edge.source, edge.target])).toEqual([[start.id, reader.id]])
    }
  )

  it.each(READER_KINDS.map((kind) => [kind]))(
    '%s reads the file the Start block asks for, with the Nexora provider',
    (kind) => {
      const { start, reader } = readerOf(kind)
      const fields = start.subBlocks.inputFormat.value as { name: string; type: string }[]
      expect(fields).toHaveLength(1)
      expect(fields[0].type).toBe('file[]')
      expect(reader.subBlocks.provider.value).toBe('nexora')
      const references = Object.values(reader.subBlocks)
        .map((subBlock) => subBlock.value)
        .filter((value): value is string => typeof value === 'string' && value.startsWith('<'))
      expect(references).toEqual([`<start.${fields[0].name}>`])
    }
  )

  it.each(READER_KINDS.map((kind) => [kind]))(
    '%s only sets sub-blocks the block declares, with their declared type',
    (kind) => {
      const { reader } = readerOf(kind)
      const config = READER_CONFIG[kind]
      expect(reader.type).toBe(config.type)
      const declared = new Map(config.subBlocks.map((subBlock) => [subBlock.id, subBlock.type]))
      for (const [id, subBlock] of Object.entries(reader.subBlocks)) {
        expect(declared.get(id), `${kind}.${id}`).toBe(subBlock.type)
      }
    }
  )
})

describe('availableCaptureKinds', () => {
  it('offers nothing while the model usages are unknown or none has a model', () => {
    expect(availableCaptureKinds(null)).toEqual([])
    expect(
      availableCaptureKinds({ chat: true, vision: false, transcription: false, speech: false })
    ).toEqual([])
  })

  it('offers a card only for a usage that has a model', () => {
    expect(
      availableCaptureKinds({ chat: false, vision: true, transcription: false, speech: false })
    ).toEqual(['document'])
    expect(
      availableCaptureKinds({ chat: false, vision: false, transcription: true, speech: false })
    ).toEqual(['transcription'])
    expect(
      availableCaptureKinds({ chat: true, vision: true, transcription: true, speech: false })
    ).toEqual(['document', 'transcription', 'extraction'])
  })

  it('offers the extraction only with both a vision and a chat model', () => {
    expect(
      availableCaptureKinds({ chat: false, vision: true, transcription: false, speech: false })
    ).toEqual(['document'])
    expect(
      availableCaptureKinds({ chat: true, vision: true, transcription: false, speech: false })
    ).toEqual(['document', 'extraction'])
  })
})

function declaredTypes(config: BlockConfig) {
  return new Map(config.subBlocks.map((subBlock) => [subBlock.id, subBlock.type]))
}

describe('buildExtractionWorkflow', () => {
  it.each(EXTRACTION_TEMPLATE_IDS.map((template) => [template]))(
    '%s: Start → Extraction → Table, accepted by the import parser',
    (template) => {
      const state = buildExtractionWorkflow(template, 'table-1')
      const { data, errors } = parseWorkflowJson(JSON.stringify(state))
      expect(errors).toEqual([])
      expect(data).not.toBeNull()
      const blocks = Object.values(state.blocks)
      const start = blocks.find((block) => block.type === 'start_trigger')
      const extraction = blocks.find((block) => block.type === 'nexora_extract')
      const table = blocks.find((block) => block.type === 'table_v2')
      if (!start || !extraction || !table) throw new Error('missing block')
      expect(state.edges.map((edge) => [edge.source, edge.target])).toEqual([
        [start.id, extraction.id],
        [extraction.id, table.id],
      ])
      expect(extraction.subBlocks.template.value).toBe(template)
      expect(extraction.subBlocks.fileReference.value).toBe('<start.document>')
      expect(table.subBlocks.operation.value).toBe('insert_row')
      expect(table.subBlocks.tableSelector.value).toBe('table-1')
      // The Table block reads the row by the extraction block's reference name.
      expect(table.subBlocks.data.value).toBe(`<${extraction.name.toLowerCase()}.row>`)
      for (const [config, block] of [
        [NexoraExtractBlock, extraction],
        [TableV2Block, table],
      ] as const) {
        const declared = declaredTypes(config)
        for (const [id, subBlock] of Object.entries(block.subBlocks)) {
          expect(declared.get(id), `${config.type}.${id}`).toBe(subBlock.type)
        }
      }
    }
  )

  it('stops at the extraction without a table', () => {
    const state = buildExtractionWorkflow('invoice', null)
    expect(Object.values(state.blocks).map((block) => block.type)).toEqual([
      'start_trigger',
      'nexora_extract',
    ])
    expect(state.edges).toHaveLength(1)
  })
})

describe('extractionTableColumns', () => {
  it.each(EXTRACTION_TEMPLATE_IDS.map((template) => [template]))(
    '%s: one typed column per field, then a_verifier and motifs, with valid names',
    (template) => {
      const columns = extractionTableColumns(template)
      expect(columns.map((column) => column.name)).toEqual([
        ...EXTRACTION_TEMPLATES[template].map((field) => field.name),
        'a_verifier',
        'motifs',
      ])
      for (const column of columns) {
        expect(column.name).toMatch(NAME_PATTERN)
        expect(COLUMN_TYPES).toContain(column.type)
      }
      expect(columns.find((column) => column.name === 'a_verifier')?.type).toBe('boolean')
      expect(EXTRACTION_TABLE_NAMES[template]).toMatch(NAME_PATTERN)
    }
  )

  it('types amounts as numbers and dates as dates', () => {
    const columns = new Map(extractionTableColumns('invoice').map((c) => [c.name, c.type]))
    expect(columns.get('total_ttc')).toBe('number')
    expect(columns.get('date')).toBe('date')
    expect(columns.get('numero')).toBe('string')
  })
})
