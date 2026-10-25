import { toNumberOrNull, toStringOrNull } from '@sim/utils/coerce'
import { isRecordLike } from '@sim/utils/object'

/** What the personal-data policy did to the messages of one model, as the trace screen words it. */
export interface ProtectionLine {
  mode: 'mask' | 'refuse'
  model: string
  found: Array<{ entity: string; count: number }>
  masked: number
}

/** The `dataProtection` attribute of every span, read defensively: a trace may be older or odd. */
export function protectionLines(spans: ReadonlyArray<{ attributes: Record<string, unknown> }>) {
  const lines: ProtectionLine[] = []
  for (const span of spans) {
    const notes = span.attributes.dataProtection
    if (!Array.isArray(notes)) continue
    for (const note of notes) {
      if (!isRecordLike(note) || (note.mode !== 'mask' && note.mode !== 'refuse')) continue
      const found = isRecordLike(note.found)
        ? Object.entries(note.found).flatMap(([entity, count]) => {
            const n = toNumberOrNull(count)
            return n !== null && n > 0 ? [{ entity, count: n }] : []
          })
        : []
      lines.push({
        mode: note.mode,
        model: toStringOrNull(note.model) ?? '',
        found,
        masked: toNumberOrNull(note.masked) ?? 0,
      })
    }
  }
  return lines
}
