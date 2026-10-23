import type { ReactNode } from 'react'
import { ChipLink, OverflowText } from '@sim/emcn'
import { ArrowLeft } from '@sim/emcn/icons'

interface AgentPageHeaderProps {
  workspaceId: string
  backLabel: string
  title: string
  /** Actions pinned to the right of the title. */
  children?: ReactNode
}

/** The agent page's header: back to the agent list, the agent's name, its actions. */
export function AgentPageHeader({ workspaceId, backLabel, title, children }: AgentPageHeaderProps) {
  return (
    <header className='flex flex-col gap-3'>
      <ChipLink
        href={`/workspace/${workspaceId}/agents`}
        leftIcon={ArrowLeft}
        className='self-start'
      >
        {backLabel}
      </ChipLink>
      <div className='flex items-center justify-between gap-4'>
        <OverflowText label={title} className='font-medium text-[var(--text-body)] text-lg' />
        {children && <div className='flex shrink-0 flex-wrap items-center gap-1'>{children}</div>}
      </div>
    </header>
  )
}
