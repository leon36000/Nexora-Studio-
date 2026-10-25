import { describe, expect, it } from 'vitest'
import { formatDate, getLogWorkflowLabel, resolveLogWorkflowId } from './utils'

describe('resolveLogWorkflowId', () => {
  it('returns null for Nexora agent jobs even when a workflow id exists', () => {
    expect(
      resolveLogWorkflowId({
        trigger: 'mothership',
        workflowId: 'wf-3',
        workflow: { id: 'wf-3' },
      })
    ).toBeNull()
  })

  it('returns null for an archived workflow that still carries its id', () => {
    expect(
      resolveLogWorkflowId({
        trigger: 'manual',
        workflowId: 'wf-1',
        workflow: { id: 'wf-1', archivedAt: '2026-01-01T00:00:00.000Z' },
      })
    ).toBeNull()
  })
})

describe('getLogWorkflowLabel', () => {
  it('keeps an archived workflow named', () => {
    expect(
      getLogWorkflowLabel({
        trigger: 'manual',
        workflowId: 'wf-1',
        workflow: { id: 'wf-1', name: 'Nightly sync', archivedAt: '2026-01-01T00:00:00.000Z' },
      })
    ).toBe('Nightly sync')
  })

  it('labels a hard-deleted workflow, which leaves no workflow id, as deleted', () => {
    expect(getLogWorkflowLabel({ trigger: 'manual', workflowId: null, workflow: null })).toBe(
      'Deleted Workflow'
    )
  })
})

describe('formatDate', () => {
  /** Noon UTC stays on the 24th in every time zone a developer machine uses. */
  const NOON = '2026-10-24T12:00:00Z'

  it('writes the list date in French: day before month, 24-hour time', () => {
    const french = formatDate(NOON, 'fr')
    expect(french.compactDate).toBe('24 OCT.')
    expect(french.compactTime).toMatch(/^\d{2}:\d{2}$/)
    expect(french.full).toContain('24 oct. 2026')
    expect(french.full).not.toMatch(/Oct|AM|PM/)
  })

  it('keeps the original English list date', () => {
    const english = formatDate(NOON)
    expect(english.compactDate).toBe('OCT 24')
    expect(english.compactTime).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
    expect(formatDate(NOON, 'en')).toEqual(english)
  })
})
