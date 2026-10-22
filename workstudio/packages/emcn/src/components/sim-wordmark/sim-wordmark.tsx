import { WORDMARK_PATHS, WORDMARK_VIEW_BOX } from '@sim/emcn'

const WORDMARK_FILLS = {
  body: 'var(--text-body)',
  'brand-muted': 'var(--text-tertiary)',
  inherit: 'currentColor',
  'muted-inverse': 'var(--text-muted-inverse)',
} as const

/** The mark is x-height only, so it sits shorter than a logotype with ascenders. */
const WORDMARK_SIZES = {
  nav: { width: 81, height: 14, className: 'h-[14px] w-auto' },
  tag: { width: 46, height: 8, className: 'h-[8px] w-auto' },
  loading: { width: 144, height: 25, className: 'h-[25px] w-auto' },
} as const

export interface SimWordmarkProps {
  /** Navbar, compact 20px ChipTag, or centered application loading mark. */
  size?: keyof typeof WORDMARK_SIZES
  /** Body ink, inherited foreground, muted brand ink, or light ink for inverse surfaces. */
  tone?: keyof typeof WORDMARK_FILLS
}

/** Canonical Nexora logotype, shared by browser and bundled desktop pages. */
export function SimWordmark({ size = 'nav', tone = 'body' }: SimWordmarkProps) {
  const { width, height, className } = WORDMARK_SIZES[size]
  const fill = WORDMARK_FILLS[tone]

  return (
    <svg
      viewBox={`0 0 ${WORDMARK_VIEW_BOX.width} ${WORDMARK_VIEW_BOX.height}`}
      width={width}
      height={height}
      fill='none'
      aria-hidden='true'
      className={className}
    >
      <g fill={fill}>
        {WORDMARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}
