'use client'

import type { ReactNode } from 'react'
import { Loader } from '@sim/emcn/icons'

interface ListStateProps {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  errorMessage: string
  emptyMessage: string
  children: ReactNode
}

/** What a list shows while it loads, when it failed, when it is empty, and otherwise its rows. */
export function ListState({
  isLoading,
  isError,
  isEmpty,
  errorMessage,
  emptyMessage,
  children,
}: ListStateProps) {
  if (isLoading) return <Loader className='size-[16px] text-[var(--text-muted)]' animate />
  if (isError) return <p className='text-[var(--text-error)] text-small'>{errorMessage}</p>
  if (isEmpty) return <p className='text-[var(--text-muted)] text-small'>{emptyMessage}</p>
  return <>{children}</>
}

/** The bordered, divided list every tab of the page uses. */
export function RowList({ children }: { children: ReactNode }) {
  return (
    <ul className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
      {children}
    </ul>
  )
}
