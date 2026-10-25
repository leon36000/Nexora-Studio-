import { describe, expect, it } from 'vitest'
import { protectionLines } from '@/app/workspace/[workspaceId]/traces/utils/protection'

const span = (attributes: Record<string, unknown>) => ({ attributes })

describe('protectionLines', () => {
  it('lists what the personal-data policy did, in the order the types were found', () => {
    const lines = protectionLines([
      span({}),
      span({
        dataProtection: [
          {
            mode: 'mask',
            model: 'vllm/cloud-glm-5-3',
            found: { IBAN_CODE: 1, PERSON: 2 },
            masked: 3,
          },
        ],
      }),
    ])
    expect(lines).toEqual([
      {
        mode: 'mask',
        model: 'vllm/cloud-glm-5-3',
        found: [
          { entity: 'IBAN_CODE', count: 1 },
          { entity: 'PERSON', count: 2 },
        ],
        masked: 3,
      },
    ])
  })

  it('shows a refusal as such', () => {
    expect(
      protectionLines([
        span({
          dataProtection: [{ mode: 'refuse', model: 'm', found: { EMAIL_ADDRESS: 1 }, masked: 1 }],
        }),
      ])[0].mode
    ).toBe('refuse')
  })

  it('says nothing for a trace that went through no policy', () => {
    expect(protectionLines([span({}), span({ reasoning: 'x' })])).toEqual([])
  })

  it('ignores a value it does not understand rather than break the screen', () => {
    expect(
      protectionLines([
        span({ dataProtection: 'oui' }),
        span({ dataProtection: [null, { mode: 'peut-être', model: 'm', found: {}, masked: 1 }] }),
        span({
          dataProtection: [
            { mode: 'mask', model: 'm', found: { IBAN_CODE: 'beaucoup' }, masked: 'x' },
          ],
        }),
      ])
    ).toEqual([{ mode: 'mask', model: 'm', found: [], masked: 0 }])
  })
})
