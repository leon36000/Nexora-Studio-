import { createTranslator, type Messages } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTimeCell } from '@/app/workspace/[workspaceId]/components/resource/components/time-cell'
import frShell from '@/messages/fr/shell.json'

const NOW = new Date('2026-10-23T10:00:00Z')
const frenchMessages: Messages = { shell: frShell }
const french = createTranslator({
  locale: 'fr',
  messages: frenchMessages,
  namespace: 'shell.timeCell',
})

describe('resource list dates', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows dates in the interface language, not in English', () => {
    expect(formatTimeCell(NOW.toISOString(), french, 'fr').label).toBe('Maintenant')
    expect(formatTimeCell(new Date(NOW.getTime() - 5 * 60_000), french, 'fr').label).toBe(
      'Il y a 5 minutes'
    )
    expect(formatTimeCell('2026-03-04T12:00:00Z', french, 'fr').label).toBe('4 mars 2026')
  })

  it('shows nothing for a missing date', () => {
    expect(formatTimeCell(null, french, 'fr').label).toBeNull()
  })
})
