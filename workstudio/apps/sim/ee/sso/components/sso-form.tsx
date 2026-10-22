// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import type { ReactNode } from 'react'

/** The /sso page is unreachable while the core flag isSsoEnabled is false. */
export default function SSOForm(_props: { registrationDisabled?: boolean }): ReactNode {
  return null
}
