// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import type { ReactNode } from 'react'

/**
 * Access requests are disabled, so the boundary is transparent: it renders its children
 * (the page it guards) and nothing else.
 */
export function PermissionAccessBoundary({
  children,
}: {
  configKey?: string
  children?: ReactNode
}): ReactNode {
  return children ?? null
}

export function useWorkspaceAccessRequestFeatures() {
  return {
    data: { enabled: false } as { enabled: boolean } | undefined,
    isLoading: false,
    isSuccess: true,
  }
}
