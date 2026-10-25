import { diffLines } from 'diff'

export interface PromptDiffLine {
  kind: 'same' | 'added' | 'removed'
  text: string
}

function linesOf(value: string): string[] {
  if (value === '') return []
  const lines = value.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** The line-by-line comparison of two versions of a prompt, as the Prompts page shows it. */
export function diffPromptContent(before: string, after: string): PromptDiffLine[] {
  const normalize = (value: string) => (value === '' || value.endsWith('\n') ? value : `${value}\n`)
  return diffLines(normalize(before), normalize(after)).flatMap((change) =>
    linesOf(change.value).map((text) => ({
      kind: change.added
        ? ('added' as const)
        : change.removed
          ? ('removed' as const)
          : ('same' as const),
      text,
    }))
  )
}
