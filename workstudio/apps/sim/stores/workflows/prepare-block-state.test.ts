import { describe, expect, it, vi } from 'vitest'
import { EvaluatorBlock } from '@/blocks/blocks/evaluator'
import { RouterV2Block } from '@/blocks/blocks/router'
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
