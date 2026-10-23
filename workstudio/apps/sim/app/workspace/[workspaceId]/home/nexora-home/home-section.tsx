import { type ReactNode, useId } from 'react'

interface HomeSectionProps {
  title: string
  children: ReactNode
}

/**
 * One section of the home page: the settings sections' muted title and divider, with the title
 * as a real heading so screen readers can jump between sections.
 */
export function HomeSection({ title, children }: HomeSectionProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className='flex flex-col'>
      <h2 id={titleId} className='pl-0.5 font-normal text-[var(--text-muted)] text-small'>
        {title}
      </h2>
      <div className='mt-[9px] mb-3 h-px bg-[var(--border)]' />
      {children}
    </section>
  )
}
