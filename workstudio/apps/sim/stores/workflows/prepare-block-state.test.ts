import { describe, expect, it, vi } from 'vitest'
import { EvaluatorBlock } from '@/blocks/blocks/evaluator'
import { MistralParseV3Block } from '@/blocks/blocks/mistral_parse'
import { RouterV2Block } from '@/blocks/blocks/router'
import { SttV2Block } from '@/blocks/blocks/stt'
import { VisionV2Block } from '@/blocks/blocks/vision'
import * as blockRegistry from '@/blocks/registry'
import { prepareBlockState } from '@/stores/workflows/prepare-block-state'

const base = { id: 'b1', name: 'Bloc', position: { x: 0, y: 0 } }

describe('prepareBlockState default model', () => {
  it('gives new Router and Evaluator blocks the deployment default instead of a hidden model', () => {
    for (const config of [RouterV2Block, EvaluatorBlock]) {
      vi.spyOn(blockRegistry, 'getBlock').mockReturnValue(config)
      const block = prepareBlockState({
        ...base,
        type: config.type,
        agentDefaultModel: 'vllm/nexora-default',
      })
      expect(block.subBlocks.model?.value).toBe('vllm/nexora-default')
    }
  })

  it('keeps the declared default when no deployment default is known', () => {
    vi.spyOn(blockRegistry, 'getBlock').mockReturnValue(EvaluatorBlock)
    const block = prepareBlockState({ ...base, type: 'evaluator' })
    expect(block.subBlocks.model?.value).toBe('claude-sonnet-5-5')
  })
})

describe('prepareBlockState Nexora provider', () => {
  const documentBlocks = [VisionV2Block, SttV2Block, MistralParseV3Block]

  it('starts the Vision, OCR and Speech-to-Text blocks on Nexora in the Nexora edition', () => {
    for (const config of documentBlocks) {
      vi.spyOn(blockRegistry, 'getBlock').mockReturnValue(config)
      const block = prepareBlockState({
        ...base,
        type: config.type,
        agentDefaultModel: 'vllm/nexora-default',
      })
      expect([config.type, block.subBlocks.provider?.value]).toEqual([config.type, 'nexora'])
    }
  })

  it('keeps their upstream provider elsewhere', () => {
    for (const config of documentBlocks) {
      vi.spyOn(blockRegistry, 'getBlock').mockReturnValue(config)
      const block = prepareBlockState({ ...base, type: config.type, agentDefaultModel: 'gpt-4o' })
      expect(block.subBlocks.provider?.value).not.toBe('nexora')
    }
  })
})
