import { describe, expect, it } from 'vitest'
import {
  type ConfirmationItem,
  confirmationsReducer,
} from '@/lib/nexora/tool-confirmation/client-state'

const request = {
  id: 'r1',
  token: 't'.repeat(40),
  title: 'postmark.send_email',
  toolName: 'execute_action',
  summary: '{"to":"a@b.fr"}',
  expiresAt: '2026-10-24T10:00:00.000Z',
}

function apply(...actions: Parameters<typeof confirmationsReducer>[1][]): ConfirmationItem[] {
  return actions.reduce(confirmationsReducer, [] as ConfirmationItem[])
}

describe('confirmationsReducer', () => {
  it('shows a request as pending, once however many times the stream repeats it', () => {
    const items = apply({ type: 'asked', request }, { type: 'asked', request })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'r1', state: 'pending', busy: false, problem: null })
  })

  it('marks the card busy while the answer is sent, then closes it on the server’s end frame', () => {
    const busy = apply({ type: 'asked', request }, { type: 'sending', id: 'r1' })
    expect(busy[0]).toMatchObject({ state: 'pending', busy: true })
    const done = confirmationsReducer(busy, { type: 'ended', end: { id: 'r1', decision: 'deny' } })
    expect(done[0]).toMatchObject({ state: 'denied', busy: false })
  })

  it('reports a failed send and lets the person try again', () => {
    const failed = apply(
      { type: 'asked', request },
      { type: 'sending', id: 'r1' },
      { type: 'problem', id: 'r1', problem: 'failed' }
    )
    expect(failed[0]).toMatchObject({ state: 'pending', busy: false, problem: 'failed' })
    expect(confirmationsReducer(failed, { type: 'sending', id: 'r1' })[0].problem).toBeNull()
  })

  it('maps an expired request to a closed card and leaves the others alone', () => {
    const items = apply(
      { type: 'asked', request },
      { type: 'asked', request: { ...request, id: 'r2' } },
      { type: 'ended', end: { id: 'r1', decision: 'expired' } }
    )
    expect(items.map((item) => [item.id, item.state])).toEqual([
      ['r1', 'expired'],
      ['r2', 'pending'],
    ])
  })

  it('ignores an end frame for a request it never showed', () => {
    expect(apply({ type: 'ended', end: { id: 'inconnue', decision: 'allow' } })).toEqual([])
  })

  it('forgets the cards of a finished answer', () => {
    expect(apply({ type: 'asked', request }, { type: 'cleared' })).toEqual([])
  })
})
