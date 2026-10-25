import { describe, expect, it } from 'vitest'
import { handoffsToRows, rowsToHandoffs } from '@/lib/nexora/delegation/handoffs'

describe('« Peut confier à » rows', () => {
  it('round-trips handoffs through the table rows the Agent block stores', () => {
    const handoffs = [
      { agentId: 'wf-tarifs', mode: 'reply' as const },
      { agentId: 'wf-sav', mode: 'transfer' as const },
    ]
    const rows = handoffsToRows(handoffs)
    expect(rows).toEqual([
      { id: expect.any(String), cells: { Agent: 'wf-tarifs', Mode: 'reply' } },
      { id: expect.any(String), cells: { Agent: 'wf-sav', Mode: 'transfer' } },
    ])
    expect(rowsToHandoffs(rows)).toEqual(handoffs)
  })

  it('reads a missing value as no handoff, and ignores blank rows', () => {
    expect(rowsToHandoffs(undefined)).toEqual([])
    expect(rowsToHandoffs(null)).toEqual([])
    expect(rowsToHandoffs([{ id: '1', cells: { Agent: ' ', Mode: 'reply' } }])).toEqual([])
  })

  it('reads an empty mode as « reply » (a row typed in the editor)', () => {
    expect(rowsToHandoffs([{ id: '1', cells: { Agent: 'wf-1', Mode: '' } }])).toEqual([
      { agentId: 'wf-1', mode: 'reply' },
    ])
  })

  it('keeps the first row when an agent is listed twice', () => {
    const rows = [
      { id: '1', cells: { Agent: 'wf-1', Mode: 'transfer' } },
      { id: '2', cells: { Agent: 'wf-1', Mode: 'reply' } },
    ]
    expect(rowsToHandoffs(rows)).toEqual([{ agentId: 'wf-1', mode: 'transfer' }])
  })

  it('cannot read what the form cannot show: unknown mode, a reference, a non-list', () => {
    expect(rowsToHandoffs([{ id: '1', cells: { Agent: 'wf-1', Mode: 'broadcast' } }])).toBeNull()
    expect(
      rowsToHandoffs([{ id: '1', cells: { Agent: '<start.agent>', Mode: 'reply' } }])
    ).toBeNull()
    expect(rowsToHandoffs('wf-1')).toBeNull()
    expect(rowsToHandoffs([{ id: '1', cells: { Agent: 3, Mode: 'reply' } }])).toBeNull()
  })
})
