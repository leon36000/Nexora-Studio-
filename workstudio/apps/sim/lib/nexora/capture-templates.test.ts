import { describe, expect, it } from 'vitest'
import {
  availableCaptureKinds,
  buildCaptureWorkflow,
  CAPTURE_KINDS,
  type CaptureKind,
} from '@/lib/nexora/capture-templates'
import { parseWorkflowJson } from '@/lib/workflows/operations/import-export'
import { MistralParseV3Block } from '@/blocks/blocks/mistral_parse'
import { SttV2Block } from '@/blocks/blocks/stt'
import type { BlockConfig } from '@/blocks/types'

const READER_CONFIG: Record<CaptureKind, BlockConfig> = {
  document: MistralParseV3Block,
  transcription: SttV2Block,
}

function readerOf(kind: CaptureKind) {
  const state = buildCaptureWorkflow(kind)
  const blocks = Object.values(state.blocks)
  const start = blocks.find((block) => block.type === 'start_trigger')
  const reader = blocks.find((block) => block.type !== 'start_trigger')
  if (!start || !reader) throw new Error(`${kind}: missing block`)
  return { state, start, reader }
}

describe('Nexora capture templates', () => {
  it.each(CAPTURE_KINDS.map((kind) => [kind]))(
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

  it.each(CAPTURE_KINDS.map((kind) => [kind]))(
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

  it.each(CAPTURE_KINDS.map((kind) => [kind]))(
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
    expect(availableCaptureKinds({ chat: true, vision: false, transcription: false })).toEqual([])
  })

  it('offers a card only for a usage that has a model', () => {
    expect(availableCaptureKinds({ chat: true, vision: true, transcription: false })).toEqual([
      'document',
    ])
    expect(availableCaptureKinds({ chat: false, vision: false, transcription: true })).toEqual([
      'transcription',
    ])
    expect(availableCaptureKinds({ chat: true, vision: true, transcription: true })).toEqual([
      'document',
      'transcription',
    ])
  })
})
