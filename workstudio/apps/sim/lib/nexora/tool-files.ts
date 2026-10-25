import { isRecordLike, toRecordOrNull } from '@sim/utils/object'
import { isUserFileWithMetadata } from '@/lib/core/utils/user-file'
import type { UserFile } from '@/executor/types'

/**
 * Nexora edition: the files an agent's tools produced during its run (the interpreter's charts and
 * workbooks), as one list for the agent block's `files` output, so a chat or the Assistant can
 * show them next to the answer.
 */
export function collectProducedFiles(toolCalls: unknown): UserFile[] {
  if (!Array.isArray(toolCalls)) return []
  const files = new Map<string, UserFile>()
  for (const call of toolCalls) {
    if (!isRecordLike(call)) continue
    const outcome = isRecordLike(call.result) ? call.result : toRecordOrNull(call.output)
    if (!outcome || !Array.isArray(outcome.files)) continue
    for (const candidate of outcome.files) {
      if (isUserFileWithMetadata(candidate) && !files.has(candidate.id)) {
        files.set(candidate.id, candidate)
      }
    }
  }
  return [...files.values()]
}
