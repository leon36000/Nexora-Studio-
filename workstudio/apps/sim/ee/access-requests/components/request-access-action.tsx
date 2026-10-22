// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import type { ReactNode } from 'react'
import type { AccessRequestScope, AccessRequestTarget } from '@/lib/api/contracts/access-requests'

interface Props {
  scope: AccessRequestScope
  target: AccessRequestTarget
  label: string
  onClose: () => void
}

/** Disabled in this edition: renders nothing. */
export function RequestAccessModal(_props: Props): ReactNode {
  return null
}
