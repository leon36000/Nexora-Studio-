import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { FunctionBlock } from '@/blocks/blocks/function'

function languageIds(): string[] {
  const language = FunctionBlock.subBlocks.find((subBlock) => subBlock.id === 'language')
  const options = typeof language?.options === 'function' ? language.options() : language?.options
  return (options ?? []).map((option) => option.id)
}

function noticeShownFor(language: string): boolean {
  const notice = FunctionBlock.subBlocks.find((subBlock) => subBlock.id === 'sandboxNotice')
  const condition =
    typeof notice?.condition === 'function' ? notice.condition({ language }) : notice?.condition
  if (!condition) return false
  const values = Array.isArray(condition.value) ? condition.value : [condition.value]
  return values.includes(language)
}

describe('Function block without a remote sandbox', () => {
  afterEach(() => {
    mockEnvObject.NEXT_PUBLIC_SANDBOXES_ENABLED = undefined
  })

  it('offers JavaScript only and explains why Python and Shell are missing', () => {
    mockEnvObject.NEXT_PUBLIC_SANDBOXES_ENABLED = undefined
    expect(languageIds()).toEqual(['javascript'])
    expect(noticeShownFor('python')).toBe(true)
    expect(noticeShownFor('javascript')).toBe(false)
  })

  it('offers Python again and hides the notice once a sandbox is configured', () => {
    mockEnvObject.NEXT_PUBLIC_SANDBOXES_ENABLED = 'true'
    expect(languageIds()).toContain('python')
    expect(noticeShownFor('python')).toBe(false)
  })
})
