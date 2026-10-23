import type { ComponentType } from 'react'
import { OverflowText } from '@sim/emcn'
import Link from 'next/link'

const CARD_CLASS =
  'flex min-h-[52px] w-full items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-left transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--selection)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

/** Responsive grid the home page lays its cards out in. */
export const HOME_CARD_GRID = 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'

interface HomeCardProps {
  icon: ComponentType<{ className?: string }>
  label: string
  /** A link card when set, a button card otherwise. */
  href?: string
  onClick?: () => void
  disabled?: boolean
}

/** One clickable tile of the home page: an icon and a label. */
export function HomeCard({ icon: Icon, label, href, onClick, disabled }: HomeCardProps) {
  const content = (
    <>
      <Icon className='size-[16px] shrink-0 text-[var(--text-icon)]' />
      <OverflowText
        label={label}
        focusTarget='nearest-interactive'
        className='flex-1 text-[var(--text-body)] text-sm'
      />
    </>
  )
  if (href) {
    return (
      <Link href={href} className={CARD_CLASS}>
        {content}
      </Link>
    )
  }
  return (
    <button type='button' onClick={onClick} disabled={disabled} className={CARD_CLASS}>
      {content}
    </button>
  )
}
