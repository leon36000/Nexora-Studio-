'use client'

import { lazy, Suspense, useState } from 'react'
import type { CopilotDialogProps } from '@/app/workspace/[workspaceId]/components/copilot-dialog/copilot-dialog'

const CopilotDialog = lazy(() =>
  import('@/app/workspace/[workspaceId]/components/copilot-dialog/copilot-dialog').then((m) => ({
    default: m.CopilotDialog,
  }))
)

/**
 * The Copilot dialog, loaded the first time it opens so its code stays out of the page that offers
 * it, and started afresh at each opening.
 */
export function LazyCopilotDialog(props: CopilotDialogProps) {
  const [opening, setOpening] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)

  if (props.open !== wasOpen) {
    setWasOpen(props.open)
    if (props.open) setOpening((count) => count + 1)
  }

  if (opening === 0) return null
  return (
    <Suspense fallback={null}>
      <CopilotDialog key={opening} {...props} />
    </Suspense>
  )
}
