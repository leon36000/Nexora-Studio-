import { describe, expect, it } from 'vitest'
import { toRunStatus } from '@/app/workspace/[workspaceId]/home/nexora-home/run-status'

describe('toRunStatus', () => {
  it('shows a completed run as succeeded', () => {
    expect(toRunStatus('completed')).toBe('success')
  })

  it('shows a failed run as failed', () => {
    expect(toRunStatus('failed')).toBe('error')
  })

  it('shows a cancelled run as cancelled', () => {
    expect(toRunStatus('cancelled')).toBe('cancelled')
  })

  it.each(['pending', 'running', 'redacting', 'cancelling'])(
    'shows %s as in progress',
    (status) => {
      expect(toRunStatus(status)).toBe('running')
    }
  )

  it('shows a run waiting on a resume as paused, not succeeded', () => {
    expect(toRunStatus('paused')).toBe('paused')
  })

  it.each([null, 'something-new'])('never claims success for an unknown status (%s)', (status) => {
    expect(toRunStatus(status)).toBe('unknown')
  })
})
