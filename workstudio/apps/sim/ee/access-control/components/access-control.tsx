// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import type { ReactNode } from 'react'

interface Props {
  organizationId: string
  isOrganizationAdmin: boolean
  requestsHref: string
}

/** Disabled in this edition: renders nothing. */
export function AccessControl(_props: Props): ReactNode {
  return null
}
