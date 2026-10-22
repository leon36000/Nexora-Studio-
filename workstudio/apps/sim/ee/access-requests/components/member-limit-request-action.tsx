// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import type { ReactNode } from 'react'
import type { AccessRequestScope } from '@/lib/api/contracts/access-requests'

interface Props {
  scope: AccessRequestScope
}

/** Disabled in this edition: renders nothing. */
export function MemberLimitRequestAction(_props: Props): ReactNode {
  return null
}
