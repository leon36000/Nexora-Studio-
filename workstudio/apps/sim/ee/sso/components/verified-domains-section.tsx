// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import type { ReactNode } from 'react'

interface Props {
  organizationId: string
  active?: boolean
}

/** Disabled in this edition: renders nothing. */
export function VerifiedDomainsSection(_props: Props): ReactNode {
  return null
}
