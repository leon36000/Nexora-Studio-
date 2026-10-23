import type { ReactNode } from 'react'

interface ConnectorsPageFrameProps {
  title: string
  /** Leads the header, above the title (a back link). */
  leading?: ReactNode
  /** Pinned to the right of the title. */
  actions?: ReactNode
  children?: ReactNode
}

/** The scrolling column the connectors pages share: a header, then the page body. */
export function ConnectorsPageFrame({
  title,
  leading,
  actions,
  children,
}: ConnectorsPageFrameProps) {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-7 py-10'>
        <header className='flex flex-col gap-3'>
          {leading}
          <div className='flex items-center justify-between gap-4'>
            <h1 className='min-w-0 font-medium text-[var(--text-body)] text-lg'>{title}</h1>
            {actions && <div className='flex shrink-0 items-center gap-1'>{actions}</div>}
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
