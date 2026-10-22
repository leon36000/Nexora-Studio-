// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import type { ReactNode } from 'react'

/** SSO-protected chat deployments are not available in this edition. */
export default function SSOAuth(_props: { identifier?: string }): ReactNode {
  return null
}
