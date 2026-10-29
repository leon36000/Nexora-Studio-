'use client'

import { cn } from '@sim/emcn'

interface SettingsUpgradeNoticeProps {
  /** Names the unavailable surface, e.g. `Sandboxes are not available on this instance`. */
  title: string
  /** One sentence on what to do about it. */
  description: string
  /**
   * Tightens the vertical rhythm for a modal, where the full-height centering a
   * settings page wants would leave the dialog mostly empty.
   */
  compact?: boolean
}

/**
 * Nexora edition: the wall for a surface this instance does not offer. There is no plan to move to
 * here (plan and wallet live on the Nexora AI site), so it states the fact and names no button.
 */
export function SettingsUpgradeNotice({
  title,
  description,
  compact = false,
}: SettingsUpgradeNoticeProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4', compact ? 'py-10' : 'py-20')}
    >
      <div className='text-center'>
        <h3 className='text-[var(--text-primary)] text-md'>{title}</h3>
        <p className='mt-1.5 text-[var(--text-muted)] text-sm'>{description}</p>
      </div>
    </div>
  )
}
