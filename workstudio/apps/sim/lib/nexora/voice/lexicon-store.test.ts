import { dbChainMockFns, queueTableRows, resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readVoiceLexicon,
  resetVoiceLexiconCache,
  saveVoiceLexicon,
} from '@/lib/nexora/voice/lexicon-store'

vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)

beforeEach(() => {
  resetDbChainMock()
  resetVoiceLexiconCache()
  instanceOrgMockFns.mockGetInstanceOrganizationId.mockReset()
  instanceOrgMockFns.mockGetInstanceOrganizationId.mockResolvedValue('org-instance')
})

describe('readVoiceLexicon', () => {
  it('reads the terms the administrators set, cleaned', async () => {
    queueTableRows(schemaMock.organization, [
      { metadata: { nexoraVoice: { lexicon: ['Nexora', ' nexora ', 'Garage Durand'] } } },
    ])
    expect(await readVoiceLexicon()).toEqual(['Nexora', 'Garage Durand'])
  })

  it('is empty when nothing was set', async () => {
    queueTableRows(schemaMock.organization, [{ metadata: { nexoraBudgets: {} } }])
    expect(await readVoiceLexicon()).toEqual([])
  })

  it('serves the next read from memory, so a transcription costs no extra query', async () => {
    queueTableRows(schemaMock.organization, [{ metadata: { nexoraVoice: { lexicon: ['Nexora'] } } }])
    await readVoiceLexicon()
    dbChainMockFns.limit.mockClear()
    expect(await readVoiceLexicon()).toEqual(['Nexora'])
    expect(dbChainMockFns.limit).not.toHaveBeenCalled()
  })

  it('never blocks a transcription: a failed read gives no lexicon, and is read again next time', async () => {
    instanceOrgMockFns.mockGetInstanceOrganizationId.mockRejectedValueOnce(new Error('db down'))
    expect(await readVoiceLexicon()).toEqual([])
    queueTableRows(schemaMock.organization, [{ metadata: { nexoraVoice: { lexicon: ['Nexora'] } } }])
    expect(await readVoiceLexicon()).toEqual(['Nexora'])
  })
})

describe('saveVoiceLexicon', () => {
  it('keeps every other metadata key and the next read sees the new terms at once', async () => {
    queueTableRows(schemaMock.organization, [{ metadata: { nexoraBudgets: { alertThreshold: 0.8 } } }])

    const saved = await saveVoiceLexicon('org-instance', ['Nexora', 'Nexora', 'Boulangerie Martin'])

    expect(saved).toEqual(['Nexora', 'Boulangerie Martin'])
    const written = (dbChainMockFns.set.mock.calls.at(-1)?.[0] as { metadata: Record<string, unknown> })
      .metadata
    expect(written.nexoraBudgets).toEqual({ alertThreshold: 0.8 })
    expect(written.nexoraVoice).toEqual({ lexicon: ['Nexora', 'Boulangerie Martin'] })
    dbChainMockFns.limit.mockClear()
    expect(await readVoiceLexicon()).toEqual(['Nexora', 'Boulangerie Martin'])
    expect(dbChainMockFns.limit).not.toHaveBeenCalled()
  })
})
