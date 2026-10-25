import { LRUCache } from 'lru-cache'
import type { FoundPersonalData } from '@/lib/nexora/data-protection/errors'

/** What the guard did for a model call, to show on its trace. */
export interface ProtectionNote {
  mode: 'mask' | 'refuse'
  /** The model the data was not sent to as it was. */
  model: string
  found: FoundPersonalData
  /** How many pieces of personal data were replaced. */
  masked: number
}

/** Runs finish within minutes; a note nobody takes (a run killed midway) goes after this. */
const NOTE_TTL_MS = 30 * 60 * 1000

const notes = new LRUCache<string, ProtectionNote[]>({ max: 5_000, ttl: NOTE_TTL_MS })

/**
 * Records what the guard did for one turn of an execution. An agent resends its whole conversation
 * at every turn, so the same IBAN is found again each time: per model, the largest count of each
 * type is kept, not the sum.
 */
export function noteExecutionProtection(executionId: string, note: ProtectionNote): void {
  const current = notes.get(executionId) ?? []
  const index = current.findIndex((entry) => entry.model === note.model)
  if (index === -1) {
    notes.set(executionId, [...current, { ...note, found: { ...note.found } }])
    return
  }
  const found = { ...current[index].found }
  for (const [entity, count] of Object.entries(note.found)) {
    found[entity] = Math.max(found[entity] ?? 0, count)
  }
  const next = [...current]
  next[index] = {
    ...current[index],
    found,
    masked: Math.max(current[index].masked, note.masked),
  }
  notes.set(executionId, next)
}

/** The notes of an execution, which are then forgotten. */
export function takeExecutionProtection(executionId: string): ProtectionNote[] {
  const taken = notes.get(executionId) ?? []
  notes.delete(executionId)
  return taken
}

/** Test seam. */
export function resetExecutionProtection(): void {
  notes.clear()
}
