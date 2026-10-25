import { cn } from '@sim/emcn'
import { diffPromptContent } from '@/lib/nexora/prompts/diff'

interface VersionDiffProps {
  before: string
  after: string
}

const LINE_CLASS = {
  added: 'bg-[var(--badge-success-bg)] text-[var(--text-primary)]',
  removed: 'bg-[var(--badge-error-bg)] text-[var(--text-primary)]',
  same: 'text-[var(--text-secondary)]',
} as const

const SIGN = { added: '+', removed: '−', same: ' ' } as const

/** Line-by-line differences between two versions of a prompt. */
export function VersionDiff({ before, after }: VersionDiffProps) {
  const seen = new Map<string, number>()
  const lines = diffPromptContent(before, after).map((line) => {
    const base = `${line.kind}:${line.text}`
    const occurrence = (seen.get(base) ?? 0) + 1
    seen.set(base, occurrence)
    return { ...line, key: `${base}:${occurrence}` }
  })
  return (
    <pre className='overflow-x-auto rounded-lg border border-[var(--border)] py-2 font-mono text-small'>
      {lines.map((line) => (
        <div
          key={line.key}
          className={cn('flex gap-2 whitespace-pre-wrap px-3', LINE_CLASS[line.kind])}
        >
          <span aria-hidden='true' className='w-3 shrink-0 select-none text-center'>
            {SIGN[line.kind]}
          </span>
          <span className='min-w-0 break-words'>{line.text || ' '}</span>
        </div>
      ))}
    </pre>
  )
}
